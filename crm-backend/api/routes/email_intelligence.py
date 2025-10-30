"""
API Routes pour Email Intelligence Dashboard
Fournit les métriques et KPIs pour le dashboard IA
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, desc, case
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core import get_current_user, get_db
from models import EmailMessage, AIMemory, AutofillSuggestion, CRMInteraction

router = APIRouter(prefix="/email-intelligence", tags=["Email Intelligence"])


# ============= SCHEMAS =============

class EmailIntelligenceMetrics(BaseModel):
    """Métriques globales du dashboard"""
    # Totaux
    total_emails_processed: int
    total_signatures_parsed: int
    total_intents_detected: int
    total_suggestions_created: int
    total_auto_applied: int

    # Taux
    signature_success_rate: float
    intent_detection_rate: float
    auto_apply_rate: float
    cache_hit_rate: float

    # Moyennes
    avg_confidence_signature: float
    avg_confidence_intent: float
    avg_processing_time_ms: int


class IntentDistribution(BaseModel):
    """Répartition des intentions"""
    intent: str
    count: int
    percentage: float


class ModelUsage(BaseModel):
    """Utilisation des modèles IA"""
    model: str
    provider: str
    count: int
    avg_processing_time_ms: int


class TopSender(BaseModel):
    """Top expéditeur traité"""
    email: str
    count: int
    signatures_parsed: int
    intents_detected: int


class TimelineDataPoint(BaseModel):
    """Point de données pour timeline"""
    date: str
    signatures: int
    intents: int
    auto_applied: int


# ============= ENDPOINTS =============

@router.get("/metrics", response_model=EmailIntelligenceMetrics)
async def get_email_intelligence_metrics(
    days: int = Query(30, ge=1, le=365, description="Période en jours"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère les métriques globales d'intelligence email
    """
    team_id = current_user.get("team_id", 1)
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Total emails processed
    total_emails = db.query(func.count(EmailMessage.id)).filter(
        EmailMessage.team_id == team_id,
        EmailMessage.received_at >= since_date
    ).scalar() or 0

    # Signatures parsed (from AIMemory)
    sig_stats = db.query(
        func.count(AIMemory.id).label('total'),
        func.avg(AIMemory.confidence_score).label('avg_conf'),
        func.sum(case((AIMemory.success == True, 1), else_=0)).label('success'),
        func.avg(AIMemory.processing_time_ms).label('avg_time')
    ).filter(
        AIMemory.team_id == team_id,
        AIMemory.task_type == 'signature_parse',
        AIMemory.created_at >= since_date
    ).first()

    total_signatures = sig_stats.total or 0
    sig_success = sig_stats.success or 0
    avg_conf_sig = float(sig_stats.avg_conf or 0)

    # Intents detected
    intent_stats = db.query(
        func.count(AIMemory.id).label('total'),
        func.avg(AIMemory.confidence_score).label('avg_conf'),
        func.avg(AIMemory.processing_time_ms).label('avg_time')
    ).filter(
        AIMemory.team_id == team_id,
        AIMemory.task_type == 'intent_detection',
        AIMemory.created_at >= since_date
    ).first()

    total_intents = intent_stats.total or 0
    avg_conf_intent = float(intent_stats.avg_conf or 0)
    avg_processing = int((sig_stats.avg_time or 0) + (intent_stats.avg_time or 0)) // 2

    # Suggestions
    sugg_stats = db.query(
        func.count(AutofillSuggestion.id).label('total'),
        func.sum(case((AutofillSuggestion.status == 'auto_applied', 1), else_=0)).label('auto_applied')
    ).filter(
        AutofillSuggestion.team_id == team_id,
        AutofillSuggestion.created_at >= since_date
    ).first()

    total_suggestions = sugg_stats.total or 0
    total_auto_applied = sugg_stats.auto_applied or 0

    # Cache hit rate
    cache_hits = db.query(func.count(AIMemory.id)).filter(
        AIMemory.team_id == team_id,
        AIMemory.processing_time_ms == 0,
        AIMemory.created_at >= since_date
    ).scalar() or 0

    total_ai_calls = total_signatures + total_intents
    cache_hit_rate = (cache_hits / total_ai_calls) if total_ai_calls > 0 else 0

    # Rates
    sig_success_rate = (sig_success / total_signatures) if total_signatures > 0 else 0
    intent_rate = (total_intents / total_emails) if total_emails > 0 else 0
    auto_apply_rate = (total_auto_applied / total_suggestions) if total_suggestions > 0 else 0

    return EmailIntelligenceMetrics(
        total_emails_processed=total_emails,
        total_signatures_parsed=total_signatures,
        total_intents_detected=total_intents,
        total_suggestions_created=total_suggestions,
        total_auto_applied=total_auto_applied,
        signature_success_rate=sig_success_rate,
        intent_detection_rate=intent_rate,
        auto_apply_rate=auto_apply_rate,
        cache_hit_rate=cache_hit_rate,
        avg_confidence_signature=avg_conf_sig,
        avg_confidence_intent=avg_conf_intent,
        avg_processing_time_ms=avg_processing
    )


@router.get("/intents", response_model=List[IntentDistribution])
async def get_intent_distribution(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Répartition des intentions détectées
    """
    team_id = current_user.get("team_id", 1)
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    results = db.query(
        CRMInteraction.intent,
        func.count(CRMInteraction.id).label('count')
    ).filter(
        CRMInteraction.team_id == team_id,
        CRMInteraction.intent.isnot(None),
        CRMInteraction.created_at >= since_date
    ).group_by(CRMInteraction.intent).all()

    total = sum(r.count for r in results)

    return [
        IntentDistribution(
            intent=r.intent,
            count=r.count,
            percentage=(r.count / total * 100) if total > 0 else 0
        )
        for r in results
    ]


@router.get("/models", response_model=List[ModelUsage])
async def get_model_usage(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Utilisation des différents modèles IA
    """
    team_id = current_user.get("team_id", 1)
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    results = db.query(
        AIMemory.model_used,
        AIMemory.provider,
        func.count(AIMemory.id).label('count'),
        func.avg(AIMemory.processing_time_ms).label('avg_time')
    ).filter(
        AIMemory.team_id == team_id,
        AIMemory.created_at >= since_date,
        AIMemory.processing_time_ms > 0  # Exclude cache hits
    ).group_by(AIMemory.model_used, AIMemory.provider).all()

    return [
        ModelUsage(
            model=r.model_used or "unknown",
            provider=r.provider or "unknown",
            count=r.count,
            avg_processing_time_ms=int(r.avg_time or 0)
        )
        for r in results
    ]


@router.get("/top-senders", response_model=List[TopSender])
async def get_top_senders(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Top expéditeurs traités par l'IA
    """
    team_id = current_user.get("team_id", 1)
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    results = db.query(
        EmailMessage.sender_email,
        func.count(EmailMessage.id).label('count')
    ).filter(
        EmailMessage.team_id == team_id,
        EmailMessage.received_at >= since_date,
        EmailMessage.sender_email.isnot(None)
    ).group_by(EmailMessage.sender_email).order_by(desc('count')).limit(limit).all()

    top_senders = []
    for r in results:
        # Count signatures parsed for this sender
        sigs = db.query(func.count(AIMemory.id)).join(
            EmailMessage, AIMemory.source_email_id == EmailMessage.id
        ).filter(
            EmailMessage.sender_email == r.sender_email,
            AIMemory.task_type == 'signature_parse',
            AIMemory.created_at >= since_date
        ).scalar() or 0

        # Count intents detected
        intents = db.query(func.count(AIMemory.id)).join(
            EmailMessage, AIMemory.source_email_id == EmailMessage.id
        ).filter(
            EmailMessage.sender_email == r.sender_email,
            AIMemory.task_type == 'intent_detection',
            AIMemory.created_at >= since_date
        ).scalar() or 0

        top_senders.append(TopSender(
            email=r.sender_email,
            count=r.count,
            signatures_parsed=sigs,
            intents_detected=intents
        ))

    return top_senders


@router.get("/timeline", response_model=List[TimelineDataPoint])
async def get_activity_timeline(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Timeline d'activité IA (par jour)
    """
    team_id = current_user.get("team_id", 1)
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Signatures par jour
    sig_timeline = db.query(
        func.date(AIMemory.created_at).label('date'),
        func.count(AIMemory.id).label('count')
    ).filter(
        AIMemory.team_id == team_id,
        AIMemory.task_type == 'signature_parse',
        AIMemory.created_at >= since_date
    ).group_by(func.date(AIMemory.created_at)).all()

    # Intents par jour
    intent_timeline = db.query(
        func.date(AIMemory.created_at).label('date'),
        func.count(AIMemory.id).label('count')
    ).filter(
        AIMemory.team_id == team_id,
        AIMemory.task_type == 'intent_detection',
        AIMemory.created_at >= since_date
    ).group_by(func.date(AIMemory.created_at)).all()

    # Auto-applied par jour
    auto_timeline = db.query(
        func.date(AutofillSuggestion.applied_at).label('date'),
        func.count(AutofillSuggestion.id).label('count')
    ).filter(
        AutofillSuggestion.team_id == team_id,
        AutofillSuggestion.status == 'auto_applied',
        AutofillSuggestion.applied_at >= since_date
    ).group_by(func.date(AutofillSuggestion.applied_at)).all()

    # Merge timelines
    dates_map = {}

    for r in sig_timeline:
        date_str = r.date.isoformat()
        dates_map[date_str] = dates_map.get(date_str, {"signatures": 0, "intents": 0, "auto_applied": 0})
        dates_map[date_str]["signatures"] = r.count

    for r in intent_timeline:
        date_str = r.date.isoformat()
        dates_map[date_str] = dates_map.get(date_str, {"signatures": 0, "intents": 0, "auto_applied": 0})
        dates_map[date_str]["intents"] = r.count

    for r in auto_timeline:
        date_str = r.date.isoformat()
        dates_map[date_str] = dates_map.get(date_str, {"signatures": 0, "intents": 0, "auto_applied": 0})
        dates_map[date_str]["auto_applied"] = r.count

    timeline = [
        TimelineDataPoint(
            date=date_str,
            signatures=data["signatures"],
            intents=data["intents"],
            auto_applied=data["auto_applied"]
        )
        for date_str, data in sorted(dates_map.items())
    ]

    return timeline
