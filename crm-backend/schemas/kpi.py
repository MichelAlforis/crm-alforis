from pydantic import Field
from typing import Optional
from schemas.base import TimestampedSchema, BaseSchema

class KPICreate(BaseSchema):
    """Création d'un KPI"""
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    rdv_count: int = Field(default=0, ge=0)
    pitchs: int = Field(default=0, ge=0)
    due_diligences: int = Field(default=0, ge=0)
    closings: int = Field(default=0, ge=0)
    revenue: Optional[float] = Field(None, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    auto_generated: Optional[bool] = False
    source: Optional[str] = None

class KPIUpdate(BaseSchema):
    """Mise à jour d'un KPI"""
    rdv_count: Optional[int] = Field(None, ge=0)
    pitchs: Optional[int] = Field(None, ge=0)
    due_diligences: Optional[int] = Field(None, ge=0)
    closings: Optional[int] = Field(None, ge=0)
    revenue: Optional[float] = Field(None, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    auto_generated: Optional[bool] = None
    source: Optional[str] = None

class KPIResponse(TimestampedSchema):
    """Réponse KPI"""
    investor_id: int
    year: int
    month: int
    rdv_count: int
    pitchs: int
    due_diligences: int
    closings: int
    revenue: float
    commission_rate: float
    notes: Optional[str]

class KPISummary(BaseSchema):
    """Résumé des KPIs"""
    total_rdv: int
    total_pitchs: int
    total_due_diligences: int
    total_closings: int
    total_revenue: float
    average_commission_rate: float
    month: str  # Format YYYY-MM

class KPIFilterParams(BaseSchema):
    """Paramètres de filtrage pour les KPIs"""
    investor_id: Optional[int] = None
    year: Optional[int] = None
    month: Optional[int] = Field(None, ge=1, le=12)
    skip: int = 0
    limit: int = 100
