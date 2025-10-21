"""
Schemas Pydantic pour l'Agent IA

Schémas de validation pour les requêtes et réponses API de l'agent IA.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ======================
# Enums
# ======================

class AISuggestionTypeEnum(str, Enum):
    DUPLICATE_DETECTION = "duplicate_detection"
    DATA_ENRICHMENT = "data_enrichment"
    DATA_QUALITY = "data_quality"
    DATA_CORRECTION = "data_correction"
    WORKFLOW_SUGGESTION = "workflow_suggestion"
    CATEGORIZATION = "categorization"
    CONTACT_EXTRACTION = "contact_extraction"


class AISuggestionStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    APPLIED = "applied"
    EXPIRED = "expired"


class AIExecutionStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class AITaskTypeEnum(str, Enum):
    DUPLICATE_SCAN = "duplicate_scan"
    BULK_ENRICHMENT = "bulk_enrichment"
    QUALITY_CHECK = "quality_check"
    AUTO_CATEGORIZE = "auto_categorize"
    CONTACT_EXTRACTION = "contact_extraction"


class AIProviderEnum(str, Enum):
    CLAUDE = "claude"
    OPENAI = "openai"
    OLLAMA = "ollama"
    CUSTOM = "custom"


# ======================
# Request Schemas
# ======================

class DetectDuplicatesRequest(BaseModel):
    entity_type: str = Field(default="organisation", description="Type d'entité à analyser")
    limit: Optional[int] = Field(None, ge=1, le=1000, description="Nombre max d'entités à analyser")

    class Config:
        json_schema_extra = {
            "example": {
                "entity_type": "organisation",
                "limit": 100
            }
        }


class EnrichOrganisationsRequest(BaseModel):
    organisation_ids: Optional[List[int]] = Field(None, description="IDs spécifiques à enrichir (vide = toutes)")

    class Config:
        json_schema_extra = {
            "example": {
                "organisation_ids": [1, 2, 3, 10]
            }
        }


class CheckDataQualityRequest(BaseModel):
    organisation_ids: Optional[List[int]] = Field(None, description="IDs à vérifier")

    class Config:
        json_schema_extra = {
            "example": {
                "organisation_ids": None
            }
        }


class ApproveSuggestionRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=1000, description="Notes de validation")

    class Config:
        json_schema_extra = {
            "example": {
                "notes": "Vérifié manuellement, fusion approuvée"
            }
        }


class RejectSuggestionRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=1000, description="Raison du rejet")

    class Config:
        json_schema_extra = {
            "example": {
                "notes": "Ce ne sont pas des doublons, entreprises différentes"
            }
        }


class BatchApproveSuggestionsRequest(BaseModel):
    suggestion_ids: List[int] = Field(..., min_length=1, description="Liste des IDs à approuver")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes communes")

    class Config:
        json_schema_extra = {
            "example": {
                "suggestion_ids": [1, 2, 3, 4, 5],
                "notes": "Vérifié en masse, tous corrects"
            }
        }


class BatchRejectSuggestionsRequest(BaseModel):
    suggestion_ids: List[int] = Field(..., min_length=1, description="Liste des IDs à rejeter")
    notes: Optional[str] = Field(None, max_length=1000, description="Raison commune du rejet")

    class Config:
        json_schema_extra = {
            "example": {
                "suggestion_ids": [10, 11, 12],
                "notes": "Faux positifs détectés"
            }
        }


class UpdateAIConfigurationRequest(BaseModel):
    ai_provider: Optional[AIProviderEnum] = None
    ai_model: Optional[str] = None
    auto_apply_enabled: Optional[bool] = None
    auto_apply_confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    duplicate_similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    quality_score_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_suggestions_per_execution: Optional[int] = Field(None, ge=1, le=1000)
    daily_budget_usd: Optional[float] = Field(None, ge=0.0)
    monthly_budget_usd: Optional[float] = Field(None, ge=0.0)

    class Config:
        json_schema_extra = {
            "example": {
                "auto_apply_enabled": True,
                "auto_apply_confidence_threshold": 0.95,
                "daily_budget_usd": 10.0
            }
        }


# ======================
# Response Schemas
# ======================

class AISuggestionResponse(BaseModel):
    id: int
    type: AISuggestionTypeEnum
    status: AISuggestionStatusEnum
    entity_type: str
    entity_id: int
    title: str
    description: Optional[str] = None
    suggestion_data: Dict[str, Any]
    confidence_score: Optional[float] = None
    ai_provider: AIProviderEnum
    ai_model: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    auto_applied: bool
    applied_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIExecutionResponse(BaseModel):
    id: int
    task_type: AITaskTypeEnum
    status: AIExecutionStatusEnum
    ai_provider: AIProviderEnum
    ai_model: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    total_items_processed: int
    total_suggestions_created: int
    total_suggestions_applied: int
    total_prompt_tokens: int
    total_completion_tokens: int
    estimated_cost_usd: Optional[float] = None
    execution_logs: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None
    triggered_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AIConfigurationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    ai_provider: AIProviderEnum
    ai_model: Optional[str] = None
    auto_apply_enabled: bool
    auto_apply_confidence_threshold: float
    duplicate_similarity_threshold: float
    quality_score_threshold: float
    max_suggestions_per_execution: int
    max_tokens_per_request: int
    rate_limit_requests_per_minute: int
    daily_budget_usd: Optional[float] = None
    monthly_budget_usd: Optional[float] = None
    notify_on_suggestions: bool
    notify_on_errors: bool
    total_executions: int
    total_suggestions: int
    total_cost_usd: float
    last_execution_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIStatisticsResponse(BaseModel):
    total_suggestions: int
    pending_suggestions: int
    approved_suggestions: int
    rejected_suggestions: int
    applied_suggestions: int
    total_executions: int
    success_executions: int
    failed_executions: int
    total_cost_usd: float
    total_tokens_used: int
    average_confidence_score: Optional[float] = None
    suggestions_by_type: Dict[str, int]
    executions_by_status: Dict[str, int]
    cost_by_provider: Dict[str, float]
    config: Dict[str, Any]

    class Config:
        json_schema_extra = {
            "example": {
                "total_suggestions": 247,
                "pending_suggestions": 12,
                "approved_suggestions": 198,
                "rejected_suggestions": 37,
                "applied_suggestions": 198,
                "total_executions": 45,
                "success_executions": 42,
                "failed_executions": 3,
                "total_cost_usd": 12.45,
                "total_tokens_used": 125000,
                "average_confidence_score": 0.87,
                "suggestions_by_type": {
                    "duplicate_detection": 45,
                    "data_enrichment": 150,
                    "data_quality": 52
                },
                "executions_by_status": {
                    "success": 42,
                    "failed": 3
                },
                "cost_by_provider": {
                    "claude": 12.45
                },
                "config": {
                    "provider": "claude",
                    "auto_apply_enabled": False
                }
            }
        }


class AITaskStatusResponse(BaseModel):
    task_id: int
    task_type: AITaskTypeEnum
    status: AIExecutionStatusEnum
    progress_percentage: Optional[float] = None
    items_processed: int
    items_total: int
    suggestions_created: int
    estimated_time_remaining_seconds: Optional[int] = None
    current_step: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": 123,
                "task_type": "duplicate_scan",
                "status": "running",
                "progress_percentage": 45.5,
                "items_processed": 91,
                "items_total": 200,
                "suggestions_created": 12,
                "estimated_time_remaining_seconds": 180,
                "current_step": "Analyse des organisations 91/200"
            }
        }


class BatchOperationResponse(BaseModel):
    total_requested: int
    successful: int
    failed: int
    skipped: int
    results: List[Dict[str, Any]]

    class Config:
        json_schema_extra = {
            "example": {
                "total_requested": 5,
                "successful": 4,
                "failed": 1,
                "skipped": 0,
                "results": [
                    {"suggestion_id": 1, "status": "success"},
                    {"suggestion_id": 2, "status": "success"},
                    {"suggestion_id": 3, "status": "failed", "error": "Already applied"},
                ]
            }
        }


class SuggestionPreviewResponse(BaseModel):
    suggestion_id: int
    entity_type: str
    entity_id: int
    current_data: Dict[str, Any]
    proposed_changes: Dict[str, Any]
    changes_summary: List[Dict[str, Any]]
    impact_assessment: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "suggestion_id": 123,
                "entity_type": "organisation",
                "entity_id": 45,
                "current_data": {
                    "nom": "BNP AM",
                    "website": None,
                    "email": None
                },
                "proposed_changes": {
                    "nom": "BNP Paribas Asset Management",
                    "website": "https://www.bnpparibas-am.com",
                    "email": "contact@bnpparibas-am.com"
                },
                "changes_summary": [
                    {"field": "nom", "from": "BNP AM", "to": "BNP Paribas Asset Management", "type": "update"},
                    {"field": "website", "from": None, "to": "https://www.bnpparibas-am.com", "type": "add"},
                    {"field": "email", "from": None, "to": "contact@bnpparibas-am.com", "type": "add"}
                ],
                "impact_assessment": "3 champs seront modifiés/ajoutés"
            }
        }
