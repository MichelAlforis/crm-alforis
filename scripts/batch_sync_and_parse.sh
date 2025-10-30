#!/bin/bash
###############################################################################
# Phase 2C - Batch Email Sync + AI Parsing at Scale
# Syncs 100-300 IONOS emails + parses signatures + detects intent
# Usage: ./scripts/batch_sync_and_parse.sh [email_count] [days_back]
# Example: ./scripts/batch_sync_and_parse.sh 200 30
###############################################################################

set -e

# Config
EMAIL_COUNT=${1:-100}
DAYS_BACK=${2:-30}
RATE_LIMIT_DELAY=2  # seconds between AI calls
CONFIDENCE_THRESHOLD=0.92

echo "=========================================="
echo "📧 Phase 2C - Email Sync at Scale"
echo "=========================================="
echo "Emails to sync: $EMAIL_COUNT"
echo "Time window: Last $DAYS_BACK days"
echo "Rate limit: ${RATE_LIMIT_DELAY}s between AI calls"
echo "Auto-apply threshold: ${CONFIDENCE_THRESHOLD}"
echo ""

# Create Python script for batch processing
cat > /tmp/batch_sync_parse.py << 'PYTHON_SCRIPT'
import sys
import os
import time
import asyncio
from datetime import datetime, timedelta, timezone

# Add /app to path for Docker
sys.path.insert(0, '/app')

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from models import EmailMessage, UserEmailAccount, CRMInteraction, Person, Organisation
from services.signature_parser_service import SignatureParserService
from services.intent_detection_service import IntentDetectionService
from models import AutofillSuggestion
from core.config import settings

# Config from env
EMAIL_COUNT = int(os.getenv('EMAIL_COUNT', 100))
DAYS_BACK = int(os.getenv('DAYS_BACK', 30))
RATE_LIMIT_DELAY = float(os.getenv('RATE_LIMIT_DELAY', 2))
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.92))

# Database
DATABASE_URL = settings.database_url
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Metrics
metrics = {
    "total_emails": 0,
    "skipped_short_body": 0,
    "skipped_duplicate_parse": 0,
    "signatures_parsed": 0,
    "signatures_cached": 0,
    "intents_detected": 0,
    "intents_cached": 0,
    "suggestions_created": 0,
    "suggestions_auto_applied": 0,
    "errors": 0,
    "processing_time_total_ms": 0
}

async def main():
    db = SessionLocal()

    try:
        # Get emails to process
        since_date = datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)

        emails = db.query(EmailMessage).filter(
            EmailMessage.received_at >= since_date,
            EmailMessage.body_text.isnot(None),
            EmailMessage.body_text != ""
        ).order_by(EmailMessage.received_at.desc()).limit(EMAIL_COUNT).all()

        metrics["total_emails"] = len(emails)

        print(f"📊 Found {len(emails)} emails to process")
        print("=" * 60)

        sig_parser = SignatureParserService(db)
        intent_detector = IntentDetectionService(db)

        for i, email in enumerate(emails, 1):
            print(f"\n[{i}/{len(emails)}] Email ID: {email.id}")
            print(f"  From: {email.sender_email}")
            print(f"  Subject: {(email.subject or 'N/A')[:50]}...")
            print(f"  Date: {email.received_at}")

            # Skip short bodies
            if len(email.body_text) < 50:
                print("  ⏭️  Body too short, skipping")
                metrics["skipped_short_body"] += 1
                continue

            start_time = time.time()

            # === 1. Parse Signature ===
            try:
                sig_result = await sig_parser.parse_signature(
                    email_body=email.body_text,
                    team_id=email.team_id,
                    email_id=email.id
                )

                elapsed_ms = int((time.time() - start_time) * 1000)

                if sig_result.get("from_cache"):
                    metrics["signatures_cached"] += 1
                    print(f"  💾 Signature (cached, {elapsed_ms}ms)")
                else:
                    metrics["signatures_parsed"] += 1
                    print(f"  ✅ Signature parsed ({elapsed_ms}ms)")

                if sig_result.get("success") and sig_result.get("data"):
                    data = sig_result["data"]
                    confidence = sig_result.get("confidence", 0)

                    print(f"     Confidence: {confidence:.1%}")
                    print(f"     Extracted: {', '.join(data.keys())}")

                    # Find person
                    person = None
                    if email.sender_email:
                        person = db.query(Person).filter(
                            Person.team_id == email.team_id,
                            Person.email_pro == email.sender_email
                        ).first()

                    # Create suggestions
                    for field_name, value in data.items():
                        if not value:
                            continue

                        suggestion_types = {
                            'name': 'name', 'first_name': 'first_name', 'last_name': 'last_name',
                            'email': 'email', 'phone': 'phone', 'mobile': 'mobile',
                            'company': 'company', 'job_title': 'job_title', 'website': 'website'
                        }

                        suggestion_type = suggestion_types.get(field_name)
                        if not suggestion_type:
                            continue

                        # Check if exists
                        existing = db.query(AutofillSuggestion).filter(
                            AutofillSuggestion.team_id == email.team_id,
                            AutofillSuggestion.source_email_id == email.id,
                            AutofillSuggestion.suggestion_type == suggestion_type
                        ).first()

                        if existing:
                            metrics["skipped_duplicate_parse"] += 1
                            continue

                        # Create suggestion
                        suggestion = AutofillSuggestion(
                            team_id=email.team_id,
                            person_id=person.id if person else None,
                            suggestion_type=suggestion_type,
                            suggested_value=str(value),
                            confidence_score=confidence,
                            status='pending',
                            source='ai_signature_parse',
                            source_email_id=email.id,
                            model_used=sig_result.get('model_used', 'unknown')
                        )

                        db.add(suggestion)
                        metrics["suggestions_created"] += 1

                        # Auto-apply if high confidence + safe field
                        safe_fields = ['email', 'phone', 'mobile', 'website']
                        if confidence >= CONFIDENCE_THRESHOLD and suggestion_type in safe_fields:
                            suggestion.status = 'auto_applied'
                            suggestion.applied_at = datetime.utcnow()
                            metrics["suggestions_auto_applied"] += 1
                            print(f"     🥇 Auto-applied: {suggestion_type}")

                    db.commit()

            except Exception as e:
                print(f"  ❌ Signature parse error: {str(e)[:100]}")
                metrics["errors"] += 1
                db.rollback()

            # === 2. Detect Intent ===
            try:
                start_time = time.time()

                intent_result = await intent_detector.detect_intent(
                    email_body=email.body_text,
                    subject=email.subject,
                    interaction_id=None,
                    team_id=email.team_id
                )

                elapsed_ms = int((time.time() - start_time) * 1000)

                if intent_result.get("from_cache"):
                    metrics["intents_cached"] += 1
                    print(f"  💾 Intent (cached, {elapsed_ms}ms)")
                else:
                    metrics["intents_detected"] += 1
                    print(f"  🎯 Intent detected ({elapsed_ms}ms)")

                if intent_result.get("success"):
                    intent = intent_result.get("intent")
                    confidence = intent_result.get("confidence", 0)
                    print(f"     Intent: {intent} ({confidence:.1%})")

                    # Update interaction if exists
                    interaction = db.query(CRMInteraction).filter(
                        CRMInteraction.external_source == 'email_sync',
                        CRMInteraction.external_id == str(email.id)
                    ).first()

                    if interaction:
                        interaction.intent = intent
                        interaction.intent_confidence = confidence
                        interaction.intent_detected_at = datetime.utcnow()
                        db.commit()
                        print(f"     ✅ Updated interaction #{interaction.id}")

            except Exception as e:
                print(f"  ❌ Intent detection error: {str(e)[:100]}")
                metrics["errors"] += 1
                db.rollback()

            # Rate limiting
            if i < len(emails):
                time.sleep(RATE_LIMIT_DELAY)

        # === Final Summary ===
        print("\n" + "=" * 60)
        print("📊 BATCH PROCESSING SUMMARY")
        print("=" * 60)
        print(f"Total emails processed:     {metrics['total_emails']}")
        print(f"Skipped (short body):       {metrics['skipped_short_body']}")
        print(f"Skipped (duplicate parse):  {metrics['skipped_duplicate_parse']}")
        print("")
        print(f"Signatures parsed:          {metrics['signatures_parsed']}")
        print(f"Signatures cached:          {metrics['signatures_cached']}")
        print(f"Intents detected:           {metrics['intents_detected']}")
        print(f"Intents cached:             {metrics['intents_cached']}")
        print("")
        print(f"Suggestions created:        {metrics['suggestions_created']}")
        print(f"Auto-applied (≥{CONFIDENCE_THRESHOLD:.0%}):    {metrics['suggestions_auto_applied']}")
        print("")
        print(f"Errors:                     {metrics['errors']}")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
PYTHON_SCRIPT

# Run the Python script in Docker
echo "🚀 Starting batch processing..."
echo ""

docker compose exec -T api bash -c "
    export EMAIL_COUNT=$EMAIL_COUNT
    export DAYS_BACK=$DAYS_BACK
    export RATE_LIMIT_DELAY=$RATE_LIMIT_DELAY
    export CONFIDENCE_THRESHOLD=$CONFIDENCE_THRESHOLD
    python /tmp/batch_sync_parse.py
"

echo ""
echo "✅ Batch processing complete!"
