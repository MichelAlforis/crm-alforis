"""
Dashboard V2 API - Advanced Analytics Endpoints
Provides data for all dashboard widgets
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case, and_, or_, extract
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel
from core.database import get_db
from models import (
    User, Organisation, Person, Task, Interaction,
    OrganisationActivity, EmailCampaign, EmailSend
)
from core.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ============= PYDANTIC MODELS =============

class KPIData(BaseModel):
    metric: str
    value: int | float
    previous_value: Optional[int | float] = None
    change_percent: Optional[float] = None
    trend: Optional[str] = None  # 'up' | 'down' | 'stable'


class RevenueDataPoint(BaseModel):
    period: str
    revenue: float
    target: Optional[float] = None
    growth: Optional[float] = None


class PipelineStage(BaseModel):
    stage: str
    count: int
    value: float
    conversion_rate: Optional[float] = None


class TeamMemberStats(BaseModel):
    user_id: int
    name: str
    avatar: Optional[str] = None
    deals_closed: int
    revenue: float
    activities: int
    conversion_rate: float


class AIInsight(BaseModel):
    type: str  # 'opportunity' | 'risk' | 'recommendation' | 'trend'
    title: str
    description: str
    confidence: float
    impact: str  # 'low' | 'medium' | 'high'
    action_url: Optional[str] = None
    created_at: datetime


class TopClient(BaseModel):
    organisation_id: int
    name: str
    revenue: float
    deals_count: int
    last_interaction: Optional[datetime] = None
    health_score: float


class ConversionMetric(BaseModel):
    stage_from: str
    stage_to: str
    rate: float
    count: int
    avg_time_days: float


class EmailPerformance(BaseModel):
    total_sent: int
    delivered: int
    opened: int
    clicked: int
    bounced: int
    delivery_rate: float
    open_rate: float
    click_rate: float


class ForecastDataPoint(BaseModel):
    period: str
    predicted: float
    lower_bound: float
    upper_bound: float
    actual: Optional[float] = None


# ============= HELPER FUNCTIONS =============

def get_period_dates(period: str) -> Tuple[datetime, datetime, datetime]:
    """
    Calculate date ranges for a given period.
    Returns (start_date, prev_start, prev_end)
    """
    now = datetime.utcnow()

    period_configs = {
        "today": (0, 1),
        "week": (7, 7),
        "month": (30, 30),
        "quarter": (90, 90),
        "year": (365, 365),
    }

    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        days_offset = 1
    else:
        days_current, days_previous = period_configs.get(period, (30, 30))
        start_date = now - timedelta(days=days_current)
        days_offset = days_previous

    prev_start = start_date - timedelta(days=days_offset)
    prev_end = start_date

    return start_date, prev_start, prev_end


def get_period_days(period: str) -> int:
    """Convert period string to number of days"""
    period_map = {
        "7days": 7,
        "30days": 30,
        "90days": 90,
        "12months": 365,
        "week": 7,
        "month": 30,
        "quarter": 90,
        "year": 365,
    }
    return period_map.get(period, 30)


def calculate_trend(current: float, previous: float) -> Tuple[float, str]:
    """
    Calculate percentage change and trend direction.
    Returns (change_percent, trend)
    """
    if previous == 0:
        return (100.0 if current > 0 else 0.0, 'up' if current > 0 else 'stable')

    change = ((current - previous) / previous) * 100
    trend = 'up' if change > 5 else ('down' if change < -5 else 'stable')

    return (round(change, 1), trend)


def count_entities_with_period(
    db: Session,
    model: Any,
    start_date: datetime,
    prev_start: datetime,
    prev_end: datetime,
    date_field: str = "created_at"
) -> Tuple[int, int]:
    """
    Count entities for current and previous periods.
    Returns (current_count, previous_count)
    """
    date_column = getattr(model, date_field)

    current_count = db.query(func.count(model.id)).filter(
        date_column >= start_date
    ).scalar() or 0

    previous_count = db.query(func.count(model.id)).filter(
        and_(date_column >= prev_start, date_column < prev_end)
    ).scalar() or 0

    return current_count, previous_count


def build_kpi_data(
    metric_name: str,
    current: int,
    previous: int
) -> KPIData:
    """Build KPIData object with trend calculation"""
    change, trend = calculate_trend(current, previous)

    return KPIData(
        metric=metric_name,
        value=current,
        previous_value=previous,
        change_percent=change,
        trend=trend,
    )


def calculate_health_score(
    interactions_count: int,
    last_interaction: Optional[datetime]
) -> float:
    """Calculate organisation health score (0-100)"""
    score = min(100, interactions_count * 10)

    if last_interaction:
        # Make datetime timezone-aware if it isn't already
        now = datetime.now(last_interaction.tzinfo) if last_interaction.tzinfo else datetime.utcnow()
        days_since = (now - last_interaction).days
        if days_since < 7:
            score += 20
        elif days_since < 30:
            score += 10

    return min(100, score)


# ============= KPI ENDPOINTS =============

@router.get("/kpis", response_model=Dict[str, KPIData])
async def get_all_kpis(
    period: str = Query("month", regex="^(today|week|month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all KPI metrics with period comparison"""

    start_date, prev_start, prev_end = get_period_dates(period)

    # Count entities for each metric
    orgs_current, orgs_previous = count_entities_with_period(
        db, Organisation, start_date, prev_start, prev_end
    )

    contacts_current, contacts_previous = count_entities_with_period(
        db, Person, start_date, prev_start, prev_end
    )

    tasks_current, tasks_previous = count_entities_with_period(
        db, Task, start_date, prev_start, prev_end
    )

    interactions_current, interactions_previous = count_entities_with_period(
        db, Interaction, start_date, prev_start, prev_end, date_field="created_at"
    )

    return {
        "organisations": build_kpi_data("organisations", orgs_current, orgs_previous),
        "contacts": build_kpi_data("contacts", contacts_current, contacts_previous),
        "tasks": build_kpi_data("tasks", tasks_current, tasks_previous),
        "interactions": build_kpi_data("interactions", interactions_current, interactions_previous),
    }


# ============= REVENUE ANALYTICS =============

@router.get("/revenue", response_model=List[RevenueDataPoint])
async def get_revenue_data(
    period: str = Query("30days", regex="^(7days|30days|90days|12months)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get revenue evolution over time"""

    now = datetime.utcnow()
    days = get_period_days(period)
    start_date = now - timedelta(days=days)

    # Determine grouping
    group_by = "month" if days >= 365 else ("week" if days >= 90 else "day")

    data = []

    if group_by == "day":
        for i in range(days):
            date = start_date + timedelta(days=i)
            data.append(RevenueDataPoint(
                period=date.strftime("%Y-%m-%d"),
                revenue=0.0,
                target=None,
                growth=None,
            ))
    elif group_by == "week":
        weeks = days // 7
        for i in range(weeks):
            date = start_date + timedelta(weeks=i)
            data.append(RevenueDataPoint(
                period=f"Week {date.isocalendar()[1]}",
                revenue=0.0,
                target=None,
                growth=None,
            ))
    else:  # month
        for i in range(12):
            date = (now.replace(day=1) - timedelta(days=30*i))
            data.append(RevenueDataPoint(
                period=date.strftime("%b %Y"),
                revenue=0.0,
                target=None,
                growth=None,
            ))
        data.reverse()

    return data


# ============= TOP CLIENTS =============

@router.get("/top-clients", response_model=List[TopClient])
async def get_top_clients(
    limit: int = Query(10, ge=1, le=50),
    sort_by: str = Query("revenue", regex="^(revenue|deals|health_score)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get top clients by revenue, deals, or health score"""

    # Get organisations with their last interaction
    orgs = db.query(
        Organisation.id,
        Organisation.name,
        func.count(Interaction.id).label('interactions_count'),
        func.max(Interaction.created_at).label('last_interaction'),
    ).outerjoin(Interaction, Organisation.id == Interaction.org_id)\
     .group_by(Organisation.id, Organisation.name)\
     .limit(limit).all()

    clients = [
        TopClient(
            organisation_id=org.id,
            name=org.name,
            revenue=0.0,  # TODO: Connect to actual revenue/deals model
            deals_count=0,
            last_interaction=org.last_interaction,
            health_score=calculate_health_score(org.interactions_count, org.last_interaction),
        )
        for org in orgs
    ]

    # Sort by requested field
    sort_keys = {
        "health_score": lambda x: x.health_score,
        "deals": lambda x: x.deals_count,
        "revenue": lambda x: x.revenue,
    }
    clients.sort(key=sort_keys[sort_by], reverse=True)

    return clients[:limit]


# ============= AI INSIGHTS =============

@router.get("/ai-insights", response_model=List[AIInsight])
async def get_ai_insights(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated insights and recommendations"""

    insights = []
    now = datetime.utcnow()

    # Insight 1: Organisations without recent interactions
    stale_orgs = db.query(func.count(Organisation.id)).outerjoin(
        Interaction,
        and_(
            Organisation.id == Interaction.org_id,
            Interaction.created_at >= now - timedelta(days=30)
        )
    ).filter(Interaction.id.is_(None)).scalar() or 0

    if stale_orgs > 0:
        insights.append(AIInsight(
            type="risk",
            title=f"{stale_orgs} organisations sans interaction depuis 30 jours",
            description="Ces clients risquent de se désengager. Planifiez des points de contact.",
            confidence=0.85,
            impact="high",
            action_url="/dashboard/organisations",
            created_at=now,
        ))

    # Insight 2: Tasks overdue
    overdue_tasks = db.query(func.count(Task.id)).filter(
        and_(Task.due_date < now, Task.status != "done")
    ).scalar() or 0

    if overdue_tasks > 0:
        insights.append(AIInsight(
            type="risk",
            title=f"{overdue_tasks} tâches en retard",
            description="Réorganisez vos priorités pour rattraper le retard.",
            confidence=1.0,
            impact="medium",
            action_url="/dashboard/tasks",
            created_at=now,
        ))

    # Insight 3: Growth opportunity
    new_orgs_last_week = db.query(func.count(Organisation.id)).filter(
        Organisation.created_at >= now - timedelta(days=7)
    ).scalar() or 0

    if new_orgs_last_week > 5:
        insights.append(AIInsight(
            type="opportunity",
            title=f"{new_orgs_last_week} nouvelles organisations cette semaine",
            description="Excellent momentum! Assurez un suivi rapide pour maximiser les conversions.",
            confidence=0.9,
            impact="high",
            action_url="/dashboard/organisations",
            created_at=now,
        ))

    # Insight 4: Email engagement trend
    recent_campaigns = db.query(EmailCampaign).filter(
        EmailCampaign.created_at >= now - timedelta(days=30)
    ).count()

    if recent_campaigns > 0:
        insights.append(AIInsight(
            type="trend",
            title="Activité email marketing stable",
            description=f"{recent_campaigns} campagnes envoyées ce mois. Analysez les performances pour optimiser.",
            confidence=0.75,
            impact="medium",
            action_url="/dashboard/email-campaigns",
            created_at=now,
        ))

    # Insight 5: Recommendation for engagement
    insights.append(AIInsight(
        type="recommendation",
        title="Optimisez votre pipeline de ventes",
        description="Créez des workflows automatisés pour suivre vos prospects plus efficacement.",
        confidence=0.8,
        impact="high",
        action_url="/dashboard/workflows",
        created_at=now,
    ))

    return insights[:limit]


# ============= EMAIL PERFORMANCE =============

@router.get("/email-performance", response_model=EmailPerformance)
async def get_email_performance(
    period: str = Query("30days", regex="^(7days|30days|90days)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get email campaign performance metrics"""

    days = get_period_days(period)
    start_date = datetime.utcnow() - timedelta(days=days)

    # Count emails by status
    total_sent = db.query(func.count(EmailSend.id)).filter(
        EmailSend.created_at >= start_date
    ).scalar() or 0

    delivered = db.query(func.count(EmailSend.id)).filter(
        and_(EmailSend.created_at >= start_date, EmailSend.status == "delivered")
    ).scalar() or 0

    opened = db.query(func.count(EmailSend.id)).filter(
        and_(EmailSend.created_at >= start_date, EmailSend.status == "opened")
    ).scalar() or 0

    clicked = db.query(func.count(EmailSend.id)).filter(
        and_(EmailSend.created_at >= start_date, EmailSend.status == "clicked")
    ).scalar() or 0

    bounced = db.query(func.count(EmailSend.id)).filter(
        and_(EmailSend.created_at >= start_date, EmailSend.status == "bounced")
    ).scalar() or 0

    # Calculate rates
    delivery_rate = (delivered / total_sent * 100) if total_sent > 0 else 0
    open_rate = (opened / delivered * 100) if delivered > 0 else 0
    click_rate = (clicked / delivered * 100) if delivered > 0 else 0

    return EmailPerformance(
        total_sent=total_sent,
        delivered=delivered,
        opened=opened,
        clicked=clicked,
        bounced=bounced,
        delivery_rate=round(delivery_rate, 2),
        open_rate=round(open_rate, 2),
        click_rate=round(click_rate, 2),
    )


# ============= TEAM PERFORMANCE =============

@router.get("/team-performance", response_model=List[TeamMemberStats])
async def get_team_performance(
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get team member performance statistics"""

    days = get_period_days(period)
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get all active users
    users = db.query(User).filter(User.is_active == True).all()

    team_stats = []
    for user in users:
        # Count activities
        activities = db.query(func.count(Interaction.id)).filter(
            and_(Interaction.created_by == user.id, Interaction.created_at >= start_date)
        ).scalar() or 0

        team_stats.append(TeamMemberStats(
            user_id=user.id,
            name=user.name or user.email,
            avatar=None,
            deals_closed=0,  # TODO: Connect to actual revenue/deals model
            revenue=0.0,
            activities=activities,
            conversion_rate=0.0,
        ))

    # Sort by activities
    team_stats.sort(key=lambda x: x.activities, reverse=True)

    return team_stats


# ============= ACTIVITY TIMELINE =============

@router.get("/activity-timeline")
async def get_activity_timeline(
    limit: int = Query(20, ge=1, le=100),
    types: Optional[str] = Query(None),  # comma-separated: interactions,tasks,emails
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent activity timeline across all entities"""

    # Get recent organisation activities (already has timeline data)
    activities = db.query(OrganisationActivity).order_by(
        desc(OrganisationActivity.occurred_at)
    ).limit(limit).all()

    return {
        "items": [
            {
                "id": activity.id,
                "type": activity.type,
                "title": activity.title,
                "preview": activity.preview,
                "occurred_at": activity.occurred_at,
                "actor_name": activity.actor_name,
                "organisation_id": activity.organisation_id,
                "organisation_name": activity.organisation.name if activity.organisation else None,
            }
            for activity in activities
        ],
        "total": len(activities),
    }
