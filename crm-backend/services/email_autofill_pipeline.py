"""
Email Autofill Pipeline Service
Orchestrate batch email processing: sync → parse → detect intent → auto-apply
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models import (
    EmailMessage,
    AutofillSuggestion,
    Interaction,
    Person,
    Organisation,
    AIMemory
)
from services.signature_parser_service import SignatureParserService
from services.intent_detection_service import IntentDetectionService

logger = logging.getLogger(__name__)


class EmailAutofillPipeline:
    """
    Pipeline for batch email processing with AI autofill

    Workflow:
    1. Fetch unparsed emails from last N days
    2. Parse signatures → AutofillSuggestion
    3. Detect intent → Interaction.intent
    4. Auto-apply suggestions with confidence ≥ threshold
    5. Return metrics
    """

    def __init__(
        self,
        db: Session,
        auto_apply_threshold: float = 0.92,
        rate_limit_seconds: float = 2.0,
        max_emails: int = 100
    ):
        self.db = db
        self.auto_apply_threshold = auto_apply_threshold
        self.rate_limit_seconds = rate_limit_seconds
        self.max_emails = max_emails

        self.signature_parser = SignatureParserService(db)
        self.intent_detector = IntentDetectionService(db)

        # Metrics
        self.metrics = {
            "emails_processed": 0,
            "signatures_parsed": 0,
            "signatures_cached": 0,
            "intents_detected": 0,
            "intents_cached": 0,
            "suggestions_created": 0,
            "auto_applied": 0,
            "manual_review": 0,
            "errors": 0,
            "processing_time_ms": 0
        }

    async def run(
        self,
        team_id: int,
        days_back: int = 7,
        email_ids: Optional[List[int]] = None
    ) -> Dict:
        """
        Run the autofill pipeline

        Args:
            team_id: Team ID for multi-tenant filtering
            days_back: How many days back to fetch emails
            email_ids: Optional list of specific email IDs to process

        Returns:
            Dict with metrics and summary
        """
        start_time = datetime.now(timezone.utc)

        try:
            # 1. Fetch emails to process
            emails = self._fetch_emails(team_id, days_back, email_ids)
            logger.info(f"📧 Fetched {len(emails)} emails to process")

            # 2. Process each email
            for idx, email in enumerate(emails):
                try:
                    await self._process_email(email, team_id)

                    # Rate limiting (skip for cached results)
                    if idx < len(emails) - 1:
                        await asyncio.sleep(self.rate_limit_seconds)

                except Exception as e:
                    logger.error(f"❌ Error processing email {email.id}: {e}")
                    self.metrics["errors"] += 1

            # 3. Calculate final metrics
            end_time = datetime.now(timezone.utc)
            self.metrics["processing_time_ms"] = int((end_time - start_time).total_seconds() * 1000)

            return {
                "success": True,
                "metrics": self.metrics,
                "summary": self._generate_summary()
            }

        except Exception as e:
            logger.error(f"❌ Pipeline error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "metrics": self.metrics
            }

    def _fetch_emails(
        self,
        team_id: int,
        days_back: int,
        email_ids: Optional[List[int]]
    ) -> List[EmailMessage]:
        """Fetch emails to process (unparsed or specified IDs)"""

        if email_ids:
            # Specific emails requested
            return self.db.query(EmailMessage).filter(
                EmailMessage.id.in_(email_ids),
                EmailMessage.team_id == team_id
            ).limit(self.max_emails).all()

        # Fetch unparsed emails from last N days
        since_date = datetime.now(timezone.utc) - timedelta(days=days_back)

        # Get emails without suggestions OR without intent detection
        emails = self.db.query(EmailMessage).outerjoin(
            AutofillSuggestion,
            EmailMessage.id == AutofillSuggestion.email_id
        ).outerjoin(
            Interaction,
            and_(
                Interaction.external_source == 'email_sync',
                Interaction.external_id == func.cast(EmailMessage.id, func.Text())
            )
        ).filter(
            EmailMessage.team_id == team_id,
            EmailMessage.received_at >= since_date,
            func.coalesce(EmailMessage.body_text, EmailMessage.body_html).isnot(None),
            func.length(func.coalesce(EmailMessage.body_text, EmailMessage.body_html)) > 50,
            # Either no suggestion OR no intent detection
            func.or_(
                AutofillSuggestion.id.is_(None),
                Interaction.intent.is_(None)
            )
        ).order_by(EmailMessage.received_at.desc()).limit(self.max_emails).all()

        return emails

    async def _process_email(self, email: EmailMessage, team_id: int):
        """Process a single email: parse signature + detect intent"""

        self.metrics["emails_processed"] += 1

        email_body = email.body_text or email.body_html or ""

        # 1. Parse signature
        await self._parse_signature(email, email_body, team_id)

        # 2. Detect intent
        await self._detect_intent(email, email_body, team_id)

    async def _parse_signature(self, email: EmailMessage, email_body: str, team_id: int):
        """Parse email signature and create/apply suggestions"""

        # Check if already parsed
        existing = self.db.query(AutofillSuggestion).filter(
            AutofillSuggestion.email_id == email.id
        ).first()

        if existing:
            logger.debug(f"⏭️  Email {email.id} already has suggestion")
            return

        try:
            # Parse signature
            result = await self.signature_parser.parse_signature(
                email_body=email_body,
                team_id=team_id
            )

            if not result.get("success"):
                return

            # Track cache hit
            if result.get("from_cache"):
                self.metrics["signatures_cached"] += 1
            else:
                self.metrics["signatures_parsed"] += 1

            data = result.get("data", {})
            confidence = result.get("confidence", 0.0)

            # Create suggestion
            suggestion = AutofillSuggestion(
                email_id=email.id,
                team_id=team_id,
                suggested_data=data,
                confidence_score=confidence,
                model_used=result.get("model_used", "unknown"),
                processing_time_ms=result.get("processing_time_ms", 0),
                status="pending",
                created_at=datetime.now(timezone.utc)
            )

            self.db.add(suggestion)
            self.db.flush()

            self.metrics["suggestions_created"] += 1

            # Auto-apply if high confidence
            if confidence >= self.auto_apply_threshold:
                await self._auto_apply_suggestion(suggestion, data, email)
                self.metrics["auto_applied"] += 1
            else:
                self.metrics["manual_review"] += 1

        except Exception as e:
            logger.error(f"❌ Error parsing signature for email {email.id}: {e}")
            self.metrics["errors"] += 1

    async def _detect_intent(self, email: EmailMessage, email_body: str, team_id: int):
        """Detect email intent and update interaction"""

        # Find or create interaction
        interaction = self.db.query(Interaction).filter(
            Interaction.external_source == 'email_sync',
            Interaction.external_id == str(email.id)
        ).first()

        if interaction and interaction.intent:
            logger.debug(f"⏭️  Email {email.id} already has intent detected")
            return

        try:
            # Detect intent
            result = await self.intent_detector.detect_intent(
                email_body=email_body,
                subject=email.subject,
                interaction_id=interaction.id if interaction else None,
                team_id=team_id
            )

            if not result.get("success"):
                return

            # Track cache hit
            if result.get("from_cache"):
                self.metrics["intents_cached"] += 1
            else:
                self.metrics["intents_detected"] += 1

            # Update or create interaction
            if interaction:
                interaction.intent = result.get("intent")
                interaction.intent_confidence = result.get("confidence")
                interaction.intent_detected_at = datetime.now(timezone.utc)
            else:
                # Create minimal interaction for tracking
                interaction = Interaction(
                    team_id=team_id,
                    type="email_inbound",
                    direction="inbound",
                    status="completed",
                    external_source="email_sync",
                    external_id=str(email.id),
                    intent=result.get("intent"),
                    intent_confidence=result.get("confidence"),
                    intent_detected_at=datetime.now(timezone.utc),
                    occurred_at=email.received_at,
                    created_at=datetime.now(timezone.utc)
                )
                self.db.add(interaction)

            self.db.flush()

        except Exception as e:
            logger.error(f"❌ Error detecting intent for email {email.id}: {e}")
            self.metrics["errors"] += 1

    async def _auto_apply_suggestion(
        self,
        suggestion: AutofillSuggestion,
        data: Dict,
        email: EmailMessage
    ):
        """Auto-apply high-confidence suggestion to database"""

        try:
            email_addr = data.get("email")

            if not email_addr:
                return

            # Find or create Person
            person = self.db.query(Person).filter(
                Person.email == email_addr,
                Person.team_id == suggestion.team_id
            ).first()

            if not person:
                # Create new person
                person = Person(
                    team_id=suggestion.team_id,
                    first_name=data.get("first_name"),
                    last_name=data.get("last_name"),
                    email=email_addr,
                    phone=data.get("phone") or data.get("mobile"),
                    mobile=data.get("mobile"),
                    job_title=data.get("job_title"),
                    created_at=datetime.now(timezone.utc),
                    created_by="ai_autofill_pipeline"
                )
                self.db.add(person)
                self.db.flush()

                logger.info(f"✅ Auto-created Person: {email_addr}")
            else:
                # Update existing person (only if fields are empty)
                if not person.first_name and data.get("first_name"):
                    person.first_name = data.get("first_name")
                if not person.last_name and data.get("last_name"):
                    person.last_name = data.get("last_name")
                if not person.phone and data.get("phone"):
                    person.phone = data.get("phone")
                if not person.mobile and data.get("mobile"):
                    person.mobile = data.get("mobile")
                if not person.job_title and data.get("job_title"):
                    person.job_title = data.get("job_title")

                logger.info(f"✅ Auto-updated Person: {email_addr}")

            # Handle company if present
            company_name = data.get("company")
            if company_name:
                org = self.db.query(Organisation).filter(
                    Organisation.name.ilike(f"%{company_name}%"),
                    Organisation.team_id == suggestion.team_id
                ).first()

                if not org:
                    org = Organisation(
                        team_id=suggestion.team_id,
                        name=company_name,
                        website=data.get("website"),
                        created_at=datetime.now(timezone.utc),
                        created_by="ai_autofill_pipeline"
                    )
                    self.db.add(org)
                    self.db.flush()
                    logger.info(f"✅ Auto-created Organisation: {company_name}")

            # Mark suggestion as applied
            suggestion.status = "applied"
            suggestion.applied_at = datetime.now(timezone.utc)
            suggestion.applied_by = "ai_autofill_pipeline"

            self.db.commit()

        except Exception as e:
            logger.error(f"❌ Error auto-applying suggestion {suggestion.id}: {e}")
            self.db.rollback()
            raise

    def _generate_summary(self) -> str:
        """Generate human-readable summary"""

        m = self.metrics

        summary = f"""
📊 Batch Autofill Pipeline - Summary

📧 Emails processed: {m['emails_processed']}
✍️  Signatures parsed: {m['signatures_parsed']} (+ {m['signatures_cached']} cached)
🎯 Intents detected: {m['intents_detected']} (+ {m['intents_cached']} cached)
💡 Suggestions created: {m['suggestions_created']}
✅ Auto-applied: {m['auto_applied']} (≥{int(self.auto_apply_threshold * 100)}% confidence)
👤 Manual review: {m['manual_review']} (<{int(self.auto_apply_threshold * 100)}% confidence)
❌ Errors: {m['errors']}
⏱️  Total time: {m['processing_time_ms'] / 1000:.1f}s
"""

        return summary.strip()


async def run_autofill_pipeline(
    db: Session,
    team_id: int,
    days_back: int = 7,
    max_emails: int = 100,
    auto_apply_threshold: float = 0.92
) -> Dict:
    """
    Convenience function to run the pipeline

    Usage:
        result = await run_autofill_pipeline(db, team_id=1, days_back=7, max_emails=50)
        print(result['summary'])
    """
    pipeline = EmailAutofillPipeline(
        db=db,
        auto_apply_threshold=auto_apply_threshold,
        max_emails=max_emails
    )

    return await pipeline.run(team_id=team_id, days_back=days_back)
