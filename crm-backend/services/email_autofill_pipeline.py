"""
Email Autofill Pipeline Service
Orchestrate batch email processing: sync → parse → detect intent → auto-apply
"""
import asyncio
import logging
import os
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
    AIMemory,
    EmailBlacklist
)
from services.signature_parser_service import SignatureParserService
from services.intent_detection_service import IntentDetectionService
from services.web_enrichment_service import get_enrichment_service

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

    # Blacklist statique pour patterns courants
    STATIC_BLACKLIST = [
        'noreply@', 'no-reply@', 'donotreply@', 'do-not-reply@',
        'automated@', 'notification@', 'notifications@',
        'support@', 'help@', 'info@',
        'newsletter@', 'marketing@', 'campaigns@',
        '@mailchimp.com', '@sendgrid.net', '@sendinblue.com',
        'abuse@hetzner.com', 'mailer-daemon@'
    ]

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

        # Cache blacklist DB pour éviter requêtes répétées
        self.blacklist_cache: Optional[List[EmailBlacklist]] = None

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
            "blacklisted": 0,
            "web_enriched": 0,
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

        # Get emails without suggestions
        emails = self.db.query(EmailMessage).outerjoin(
            AutofillSuggestion,
            EmailMessage.id == AutofillSuggestion.email_id
        ).filter(
            EmailMessage.team_id == team_id,
            EmailMessage.received_at >= since_date,
            func.coalesce(EmailMessage.body_text, EmailMessage.body_html).isnot(None),
            func.length(func.coalesce(EmailMessage.body_text, EmailMessage.body_html)) > 50,
            # No suggestion yet
            AutofillSuggestion.id.is_(None)
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

    def _is_blacklisted(self, sender_email: str, team_id: int) -> bool:
        """
        Vérifie si l'expéditeur est blacklisté (statique + DB)

        Returns:
            True si l'email doit être ignoré
        """
        if not sender_email:
            return False

        sender_lower = sender_email.lower()

        # 1. Check static blacklist
        for pattern in self.STATIC_BLACKLIST:
            pattern_lower = pattern.lower()
            if pattern_lower.startswith('@'):
                # Domain pattern
                if sender_lower.endswith(pattern_lower):
                    logger.debug(f"⛔ Blacklisted (static domain): {sender_email}")
                    return True
            else:
                # Prefix pattern
                if sender_lower.startswith(pattern_lower):
                    logger.debug(f"⛔ Blacklisted (static prefix): {sender_email}")
                    return True

        # 2. Check DB blacklist (with cache)
        if self.blacklist_cache is None:
            self.blacklist_cache = self.db.query(EmailBlacklist).filter(
                EmailBlacklist.team_id == team_id
            ).all()

        for blacklist_entry in self.blacklist_cache:
            if blacklist_entry.matches(sender_email):
                logger.debug(f"⛔ Blacklisted (DB {blacklist_entry.pattern_type}): {sender_email}")
                return True

        return False

    async def _parse_signature(self, email: EmailMessage, email_body: str, team_id: int):
        """Parse email signature and create/apply suggestions"""

        # Check blacklist
        if self._is_blacklisted(email.sender_email, team_id):
            logger.info(f"⛔ Skipping blacklisted sender: {email.sender_email}")
            self.metrics["blacklisted"] += 1
            return

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

            # 🌐 Web enrichment (Acte V) - Enrich organisation data if company found
            if data.get("company"):
                await self._enrich_organisation_data(data)

            # Define field categories
            PERSON_FIELDS = {'first_name', 'last_name', 'name', 'email', 'phone', 'mobile', 'job_title', 'linkedin'}
            ORG_FIELDS = {'company', 'website', 'address'}

            # Find or match person by email
            person = None
            if data.get("email"):
                person_query = self.db.query(Person).filter(
                    Person.email == data["email"]
                )
                if hasattr(Person, "team_id"):
                    person_query = person_query.filter(Person.team_id == team_id)
                person = person_query.first()

            # Find or match organisation by company name
            # NOTE: Organisation model doesn't have team_id (legacy model)
            # For now, we'll create suggestions without linking to existing organisations
            organisation = None
            # if data.get("company"):
            #     organisation = self.db.query(Organisation).filter(
            #         Organisation.name.ilike(f"%{data['company']}%")
            #     ).first()

            # Create one suggestion per field extracted
            suggestions_created = []
            for field_name, suggested_value in data.items():
                if not suggested_value:
                    continue  # Skip empty fields

                # Determine if this is a Person or Organisation field
                is_person_field = field_name in PERSON_FIELDS
                is_org_field = field_name in ORG_FIELDS

                # Get current value from person or organisation
                current_value = None
                suggestion_person_id = None
                suggestion_org_id = None

                if is_person_field and person:
                    current_value = getattr(person, field_name, None)
                    suggestion_person_id = person.id
                elif is_org_field and organisation:
                    # Map company -> name for Organisation model
                    org_field_name = 'name' if field_name == 'company' else field_name
                    current_value = getattr(organisation, org_field_name, None)
                    suggestion_org_id = organisation.id

                # Create suggestion
                suggestion = AutofillSuggestion(
                    team_id=team_id,
                    person_id=suggestion_person_id,
                    organisation_id=suggestion_org_id,
                    email_id=email.id,
                    suggestion_type="signature_parse",
                    field_name=field_name,
                    current_value=str(current_value) if current_value else None,
                    suggested_value=str(suggested_value),
                    confidence_score=confidence,
                    source_model=result.get("model_used", "unknown"),
                    status="pending",
                    auto_applied=False,
                    created_at=datetime.now(timezone.utc)
                )

                self.db.add(suggestion)
                suggestions_created.append(suggestion)
                self.metrics["suggestions_created"] += 1

            self.db.flush()

            # Auto-apply if high confidence + safe fields
            if confidence >= self.auto_apply_threshold:
                await self._auto_apply_suggestions(suggestions_created, data, email, team_id)
                self.metrics["auto_applied"] += len(suggestions_created)
            else:
                self.metrics["manual_review"] += len(suggestions_created)
                # Commit suggestions for manual review
                self.db.commit()

        except Exception as e:
            logger.error(f"❌ Error parsing signature for email {email.id}: {e}")
            self.metrics["errors"] += 1

    async def _detect_intent(self, email: EmailMessage, email_body: str, team_id: int):
        """Detect email intent and update interaction

        NOTE: Intent detection temporarily disabled - Interaction model doesn't have 'intent' field
        TODO: Add intent field to Interaction model or store in AIMemory only
        """
        # Disabled until intent field is added to Interaction model
        logger.debug(f"⏭️  Intent detection skipped for email {email.id} (feature disabled)")
        return

    async def _auto_apply_suggestions(
        self,
        suggestions: List[AutofillSuggestion],
        data: Dict,
        email: EmailMessage,
        team_id: int
    ):
        """Auto-apply high-confidence suggestions to database"""

        try:
            email_addr = data.get("email")

            if not email_addr:
                return

            # Find or create Person
            person = self.db.query(Person).filter(
                Person.email == email_addr,
                Person.team_id == team_id
            ).first()

            if not person:
                # Create new person
                person = Person(
                    team_id=team_id,
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
                    Organisation.team_id == team_id
                ).first()

                if not org:
                    org = Organisation(
                        team_id=team_id,
                        name=company_name,
                        website=data.get("website"),
                        created_at=datetime.now(timezone.utc),
                        created_by="ai_autofill_pipeline"
                    )
                    self.db.add(org)
                    self.db.flush()
                    logger.info(f"✅ Auto-created Organisation: {company_name}")

                # Link person to organisation
                if person and not person.organisation_id:
                    person.organisation_id = org.id

            # Mark all suggestions as auto_applied
            for suggestion in suggestions:
                suggestion.status = "auto_applied"
                suggestion.auto_applied = True
                suggestion.auto_applied_reason = f"confidence={suggestion.confidence_score:.2f} >= {self.auto_apply_threshold}"
                suggestion.reviewed_at = datetime.now(timezone.utc)

            self.db.commit()

        except Exception as e:
            logger.error(f"❌ Error auto-applying suggestions: {e}")
            self.db.rollback()
            raise

    def _generate_summary(self) -> str:
        """Generate human-readable summary"""

        m = self.metrics

        summary = f"""
📊 Batch Autofill Pipeline - Summary

📧 Emails processed: {m['emails_processed']}
⛔ Blacklisted (skipped): {m['blacklisted']}
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
