"""
Autofill Jobs API
Launch and monitor batch email autofill jobs
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from services.email_autofill_pipeline import run_autofill_pipeline

router = APIRouter(prefix="/autofill-jobs", tags=["Autofill Jobs"])


# ============================================================
# 📋 Schemas
# ============================================================

class StartJobRequest(BaseModel):
    days_back: int = Field(7, ge=1, le=365, description="How many days back to fetch emails")
    max_emails: int = Field(100, ge=1, le=1000, description="Maximum emails to process")
    auto_apply_threshold: float = Field(0.92, ge=0.5, le=1.0, description="Confidence threshold for auto-apply")
    email_ids: Optional[List[int]] = Field(None, description="Optional: specific email IDs to process")


class JobMetrics(BaseModel):
    emails_processed: int
    signatures_parsed: int
    signatures_cached: int
    intents_detected: int
    intents_cached: int
    suggestions_created: int
    auto_applied: int
    manual_review: int
    errors: int
    processing_time_ms: int


class StartJobResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[str] = None


class JobStatusResponse(BaseModel):
    success: bool
    metrics: JobMetrics
    summary: str


# ============================================================
# 🚀 Endpoints
# ============================================================

@router.post("/start", response_model=StartJobResponse)
async def start_autofill_job(
    request: StartJobRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    🚀 Start a batch autofill job in the background

    The job will:
    1. Fetch unparsed emails from last N days
    2. Parse signatures with AI cascade
    3. Detect email intent
    4. Auto-apply suggestions with confidence ≥ threshold
    5. Create manual review tasks for low confidence

    **Parameters:**
    - `days_back`: How many days of emails to process (1-365)
    - `max_emails`: Maximum number of emails (1-1000)
    - `auto_apply_threshold`: Confidence threshold for auto-apply (0.5-1.0)
    - `email_ids`: Optional list of specific email IDs to process

    **Returns:**
    - Job ID for tracking (future: can poll status)
    - Message confirming job started
    """
    team_id = current_user.get("team_id", 1)

    # Generate job ID
    job_id = f"autofill_{team_id}_{int(datetime.now(timezone.utc).timestamp())}"

    # Run pipeline in background
    async def run_job():
        try:
            result = await run_autofill_pipeline(
                db=db,
                team_id=team_id,
                days_back=request.days_back,
                max_emails=request.max_emails,
                auto_apply_threshold=request.auto_apply_threshold
            )

            # TODO: Store result in database for later retrieval
            # For now, just log it
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"✅ Job {job_id} completed:\n{result.get('summary')}")

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ Job {job_id} failed: {e}", exc_info=True)

    background_tasks.add_task(run_job)

    return StartJobResponse(
        success=True,
        message=f"Autofill job started. Processing up to {request.max_emails} emails from last {request.days_back} days.",
        job_id=job_id
    )


@router.post("/run-now", response_model=JobStatusResponse)
async def run_autofill_job_now(
    request: StartJobRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    ⚡ Run autofill job synchronously (blocking)

    Use this for testing or small batches. For production, use `/start` instead.

    **Warning:** This endpoint will block until the job completes.
    For large batches (>50 emails), use `/start` to run in background.
    """
    team_id = current_user.get("team_id", 1)

    result = await run_autofill_pipeline(
        db=db,
        team_id=team_id,
        days_back=request.days_back,
        max_emails=request.max_emails,
        auto_apply_threshold=request.auto_apply_threshold
    )

    if not result.get("success"):
        return JobStatusResponse(
            success=False,
            metrics=JobMetrics(**result.get("metrics", {})),
            summary=result.get("error", "Unknown error")
        )

    return JobStatusResponse(
        success=True,
        metrics=JobMetrics(**result["metrics"]),
        summary=result["summary"]
    )


@router.get("/stats")
async def get_autofill_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    📊 Get overall autofill statistics

    Returns:
    - Total suggestions created
    - Auto-applied vs manual review breakdown
    - Average confidence scores
    - Recent activity
    """
    from models import AutofillSuggestion
    from sqlalchemy import func

    team_id = current_user.get("team_id", 1)

    # Total suggestions
    total = db.query(func.count(AutofillSuggestion.id)).filter(
        AutofillSuggestion.team_id == team_id
    ).scalar() or 0

    # Status breakdown
    status_breakdown = db.query(
        AutofillSuggestion.status,
        func.count(AutofillSuggestion.id).label('count')
    ).filter(
        AutofillSuggestion.team_id == team_id
    ).group_by(AutofillSuggestion.status).all()

    # Average confidence
    avg_confidence = db.query(
        func.avg(AutofillSuggestion.confidence_score)
    ).filter(
        AutofillSuggestion.team_id == team_id
    ).scalar() or 0.0

    # Recent suggestions (last 24h)
    from datetime import timedelta
    since_yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_count = db.query(func.count(AutofillSuggestion.id)).filter(
        AutofillSuggestion.team_id == team_id,
        AutofillSuggestion.created_at >= since_yesterday
    ).scalar() or 0

    return {
        "total_suggestions": total,
        "status_breakdown": {status: count for status, count in status_breakdown},
        "avg_confidence": round(avg_confidence, 3),
        "recent_24h": recent_count
    }
