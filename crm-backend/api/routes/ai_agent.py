"""
Routes API pour l'Agent IA

Endpoints pour:
- Lancer les tâches IA (détection doublons, enrichissement, qualité)
- Gérer les suggestions (approuver/rejeter)
- Consulter les statistiques et logs
- Configurer l'agent IA
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio

from core import get_db, get_current_user
from core.events import emit_event, EventType
from services.ai_agent import AIAgentService
from schemas.ai_agent import (
    DetectDuplicatesRequest,
    EnrichOrganisationsRequest,
    CheckDataQualityRequest,
    ApproveSuggestionRequest,
    RejectSuggestionRequest,
    BatchApproveSuggestionsRequest,
    BatchRejectSuggestionsRequest,
    UpdateAIConfigurationRequest,
    AISuggestionResponse,
    AIExecutionResponse,
    AIConfigurationResponse,
    AIStatisticsResponse,
    AITaskStatusResponse,
    BatchOperationResponse,
    SuggestionPreviewResponse,
    AISuggestionStatusEnum,
    AISuggestionTypeEnum,
)
from models.ai_agent import AISuggestion, AIExecution, AIConfiguration

router = APIRouter(prefix="/ai", tags=["AI Agent"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    """Convertit l'identifiant utilisateur en int si possible."""
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


# ======================
# Tâches IA
# ======================

@router.post("/duplicates/detect", response_model=AIExecutionResponse, status_code=202)
async def detect_duplicates(
    request: DetectDuplicatesRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lance la détection de doublons

    Analyse les organisations ou contacts pour détecter les doublons potentiels.
    Créé des suggestions qui peuvent être validées manuellement.

    **Tâche asynchrone**: Le traitement se fait en arrière-plan.
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    # Lancer la tâche en arrière-plan
    async def run_detection():
        execution = await ai_service.detect_duplicates(
            entity_type=request.entity_type,
            limit=request.limit,
            triggered_by=user_id,
        )
        # Émettre un événement
        emit_event(EventType.AI_TASK_COMPLETED, {
            "execution_id": execution.id,
            "task_type": "duplicate_scan",
            "user_id": user_id,
        })

    background_tasks.add_task(run_detection)

    # Créer une exécution "pending" immédiatement
    from models.ai_agent import AIExecution, AIExecutionStatus, AITaskType, AIProvider
    from datetime import datetime, UTC

    execution = AIExecution(
        task_type=AITaskType.DUPLICATE_SCAN,
        status=AIExecutionStatus.PENDING,
        ai_provider=ai_service.config.ai_provider if ai_service.config else AIProvider.CLAUDE,
        triggered_by=user_id,
        started_at=datetime.now(UTC),
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    return execution


@router.post("/enrich/organisations", response_model=AIExecutionResponse, status_code=202)
async def enrich_organisations(
    request: EnrichOrganisationsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lance l'enrichissement automatique des organisations

    L'IA complète les données manquantes (site web, email, téléphone, catégorie)
    en se basant sur les informations existantes et ses connaissances.

    **Tâche asynchrone**: Le traitement se fait en arrière-plan.
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    async def run_enrichment():
        execution = await ai_service.enrich_organisations(
            organisation_ids=request.organisation_ids,
            triggered_by=user_id,
        )
        emit_event(EventType.AI_TASK_COMPLETED, {
            "execution_id": execution.id,
            "task_type": "bulk_enrichment",
            "user_id": user_id,
        })

    background_tasks.add_task(run_enrichment)

    from models.ai_agent import AIExecution, AIExecutionStatus, AITaskType, AIProvider
    from datetime import datetime, UTC

    execution = AIExecution(
        task_type=AITaskType.BULK_ENRICHMENT,
        status=AIExecutionStatus.PENDING,
        ai_provider=ai_service.config.ai_provider if ai_service.config else AIProvider.CLAUDE,
        triggered_by=user_id,
        started_at=datetime.now(UTC),
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    return execution


@router.post("/quality/check", response_model=AIExecutionResponse, status_code=202)
async def check_data_quality(
    request: CheckDataQualityRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lance le contrôle qualité des données

    Analyse la complétude et cohérence des données.
    Créé des suggestions de corrections pour les problèmes détectés.

    **Tâche asynchrone**: Le traitement se fait en arrière-plan.
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    async def run_quality_check():
        execution = await ai_service.check_data_quality(
            organisation_ids=request.organisation_ids,
            triggered_by=user_id,
        )
        emit_event(EventType.AI_TASK_COMPLETED, {
            "execution_id": execution.id,
            "task_type": "quality_check",
            "user_id": user_id,
        })

    background_tasks.add_task(run_quality_check)

    from models.ai_agent import AIExecution, AIExecutionStatus, AITaskType, AIProvider
    from datetime import datetime, UTC

    execution = AIExecution(
        task_type=AITaskType.QUALITY_CHECK,
        status=AIExecutionStatus.PENDING,
        ai_provider=ai_service.config.ai_provider if ai_service.config else AIProvider.CLAUDE,
        triggered_by=user_id,
        started_at=datetime.now(UTC),
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    return execution


# ======================
# Gestion des suggestions
# ======================

@router.get("/suggestions", response_model=List[AISuggestionResponse])
async def list_suggestions(
    status: Optional[AISuggestionStatusEnum] = Query(None),
    type: Optional[AISuggestionTypeEnum] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Liste les suggestions de l'IA

    Filtres disponibles:
    - **status**: pending, approved, rejected, applied, expired
    - **type**: duplicate_detection, data_enrichment, data_quality, etc.
    - **entity_type**: organisation, person
    """
    ai_service = AIAgentService(db)

    query = db.query(AISuggestion)

    if status:
        query = query.filter(AISuggestion.status == status.value)
    if type:
        query = query.filter(AISuggestion.type == type.value)
    if entity_type:
        query = query.filter(AISuggestion.entity_type == entity_type)

    suggestions = query.order_by(
        AISuggestion.confidence_score.desc(),
        AISuggestion.created_at.desc()
    ).limit(limit).all()

    return suggestions


@router.get("/suggestions/{suggestion_id}", response_model=AISuggestionResponse)
async def get_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupère une suggestion spécifique"""
    suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion non trouvée")

    return suggestion


@router.post("/suggestions/{suggestion_id}/approve", response_model=AISuggestionResponse)
async def approve_suggestion(
    suggestion_id: int,
    request: ApproveSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Approuve et applique une suggestion

    La suggestion sera appliquée immédiatement aux données.
    **Action irréversible** (sauf doublon qui peut être dé-fusionné manuellement).
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    try:
        ai_service.approve_suggestion(suggestion_id, user_id, request.notes)

        suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()

        emit_event(EventType.AI_SUGGESTION_APPROVED, {
            "suggestion_id": suggestion_id,
            "type": suggestion.type.value,
            "entity_id": suggestion.entity_id,
            "user_id": user_id,
        })

        return suggestion

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'application: {str(e)}")


@router.post("/suggestions/{suggestion_id}/reject", response_model=AISuggestionResponse)
async def reject_suggestion(
    suggestion_id: int,
    request: RejectSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Rejette une suggestion

    La suggestion sera marquée comme rejetée et ne sera plus affichée.
    Les raisons du rejet peuvent aider à améliorer l'IA.
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    try:
        ai_service.reject_suggestion(suggestion_id, user_id, request.notes)

        suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()

        emit_event(EventType.AI_SUGGESTION_REJECTED, {
            "suggestion_id": suggestion_id,
            "type": suggestion.type.value,
            "entity_id": suggestion.entity_id,
            "user_id": user_id,
        })

        return suggestion

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/suggestions/batch/approve", response_model=BatchOperationResponse)
async def batch_approve_suggestions(
    request: BatchApproveSuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Approuve plusieurs suggestions en batch

    Permet d'approuver 10-20 suggestions en 1 seul appel au lieu de 10-20 appels.
    **Gain de temps énorme !**

    Exemple:
    ```json
    {
      "suggestion_ids": [1, 2, 3, 4, 5],
      "notes": "Vérifié en masse, tous corrects"
    }
    ```
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    result = ai_service.batch_approve_suggestions(
        suggestion_ids=request.suggestion_ids,
        user_id=user_id,
        notes=request.notes
    )

    # Émettre événements pour chaque succès
    for item in result["results"]:
        if item["status"] == "success":
            emit_event(EventType.AI_SUGGESTION_APPROVED, {
                "suggestion_id": item["suggestion_id"],
                "user_id": user_id,
                "batch": True,
            })

    return result


@router.post("/suggestions/batch/reject", response_model=BatchOperationResponse)
async def batch_reject_suggestions(
    request: BatchRejectSuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Rejette plusieurs suggestions en batch

    Permet de rejeter plusieurs faux positifs en une seule fois.

    Exemple:
    ```json
    {
      "suggestion_ids": [10, 11, 12],
      "notes": "Faux positifs détectés"
    }
    ```
    """
    user_id = _extract_user_id(current_user)
    ai_service = AIAgentService(db)

    result = ai_service.batch_reject_suggestions(
        suggestion_ids=request.suggestion_ids,
        user_id=user_id,
        notes=request.notes
    )

    # Émettre événements pour chaque succès
    for item in result["results"]:
        if item["status"] == "success":
            emit_event(EventType.AI_SUGGESTION_REJECTED, {
                "suggestion_id": item["suggestion_id"],
                "user_id": user_id,
                "batch": True,
            })

    return result


@router.get("/suggestions/{suggestion_id}/preview", response_model=SuggestionPreviewResponse)
async def preview_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Prévisualise les changements avant d'approuver une suggestion

    **Sécurité**: Voir exactement ce qui va être modifié avant application.

    Retourne:
    - Données actuelles
    - Données proposées
    - Résumé des changements (field by field)
    - Impact assessment

    Exemple response:
    ```json
    {
      "current_data": {"nom": "BNP AM"},
      "proposed_changes": {"nom": "BNP Paribas Asset Management"},
      "changes_summary": [
        {"field": "nom", "from": "BNP AM", "to": "BNP Paribas Asset Management", "type": "update"}
      ],
      "impact_assessment": "1 champ sera modifié"
    }
    ```
    """
    ai_service = AIAgentService(db)

    try:
        preview = ai_service.preview_suggestion(suggestion_id)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/suggestions/{entity_type}/{entity_id}", response_model=List[AISuggestionResponse])
async def get_suggestions_for_entity(
    entity_type: str,
    entity_id: int,
    status: Optional[AISuggestionStatusEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupère toutes les suggestions pour une entité spécifique

    **Utile pour:** Afficher toutes les suggestions d'une organisation dans sa fiche.

    Exemples:
    - `GET /api/v1/ai/suggestions/organisation/123` - Toutes suggestions pour org 123
    - `GET /api/v1/ai/suggestions/organisation/123?status=pending` - Seulement pending

    Args:
    - **entity_type**: organisation, person
    - **entity_id**: ID de l'entité
    - **status**: Filtrer par statut (optionnel)
    """
    ai_service = AIAgentService(db)

    from models.ai_agent import AISuggestionStatus

    status_filter = None
    if status:
        status_filter = AISuggestionStatus[status.value.upper()]

    suggestions = ai_service.get_suggestions_for_entity(
        entity_type=entity_type,
        entity_id=entity_id,
        status=status_filter
    )

    return suggestions


# ======================
# Exécutions et logs
# ======================

@router.get("/executions", response_model=List[AIExecutionResponse])
async def list_executions(
    limit: int = Query(20, ge=1, le=100),
    task_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Liste les exécutions de l'agent IA

    Historique des tâches lancées avec métriques et coûts.
    """
    query = db.query(AIExecution)

    if task_type:
        query = query.filter(AIExecution.task_type == task_type)

    executions = query.order_by(AIExecution.created_at.desc()).limit(limit).all()

    return executions


@router.get("/executions/{execution_id}", response_model=AIExecutionResponse)
async def get_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupère une exécution spécifique avec logs détaillés"""
    execution = db.query(AIExecution).filter(AIExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Exécution non trouvée")

    return execution


# ======================
# Configuration
# ======================

@router.get("/config", response_model=AIConfigurationResponse)
async def get_ai_configuration(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupère la configuration active de l'agent IA"""
    config = db.query(AIConfiguration).filter(AIConfiguration.is_active == True).first()

    if not config:
        raise HTTPException(status_code=404, detail="Aucune configuration active")

    return config


@router.patch("/config", response_model=AIConfigurationResponse)
async def update_ai_configuration(
    request: UpdateAIConfigurationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Met à jour la configuration de l'agent IA

    Permet de modifier:
    - Le fournisseur IA (Claude, OpenAI, Ollama)
    - Les seuils de confiance
    - Les budgets quotidiens/mensuels
    - L'auto-application des suggestions
    """
    config = db.query(AIConfiguration).filter(AIConfiguration.is_active == True).first()

    if not config:
        raise HTTPException(status_code=404, detail="Aucune configuration active")

    # Mettre à jour les champs fournis
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)

    emit_event(EventType.AI_CONFIG_UPDATED, {
        "config_id": config.id,
        "user_id": _extract_user_id(current_user),
        "updated_fields": list(update_data.keys()),
    })

    return config


# ======================
# Statistiques
# ======================

@router.get("/statistics", response_model=AIStatisticsResponse)
async def get_ai_statistics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupère les statistiques globales de l'agent IA

    Métriques:
    - Nombre total de suggestions par statut
    - Nombre d'exécutions par type
    - Coûts totaux par fournisseur
    - Score de confiance moyen
    - Tokens utilisés
    """
    from sqlalchemy import func
    from models.ai_agent import AISuggestionStatus, AIExecutionStatus

    # Suggestions totales
    total_suggestions = db.query(func.count(AISuggestion.id)).scalar() or 0
    pending_suggestions = db.query(func.count(AISuggestion.id)).filter(
        AISuggestion.status == AISuggestionStatus.PENDING
    ).scalar() or 0
    approved_suggestions = db.query(func.count(AISuggestion.id)).filter(
        AISuggestion.status == AISuggestionStatus.APPROVED
    ).scalar() or 0
    rejected_suggestions = db.query(func.count(AISuggestion.id)).filter(
        AISuggestion.status == AISuggestionStatus.REJECTED
    ).scalar() or 0
    applied_suggestions = db.query(func.count(AISuggestion.id)).filter(
        AISuggestion.status == AISuggestionStatus.APPLIED
    ).scalar() or 0

    # Exécutions
    total_executions = db.query(func.count(AIExecution.id)).scalar() or 0
    success_executions = db.query(func.count(AIExecution.id)).filter(
        AIExecution.status == AIExecutionStatus.SUCCESS
    ).scalar() or 0
    failed_executions = db.query(func.count(AIExecution.id)).filter(
        AIExecution.status == AIExecutionStatus.FAILED
    ).scalar() or 0

    # Coûts et tokens
    total_cost = db.query(func.sum(AIExecution.estimated_cost_usd)).scalar() or 0.0
    total_tokens = db.query(
        func.sum(AIExecution.total_prompt_tokens) + func.sum(AIExecution.total_completion_tokens)
    ).scalar() or 0

    # Score de confiance moyen
    avg_confidence = db.query(func.avg(AISuggestion.confidence_score)).filter(
        AISuggestion.confidence_score.isnot(None)
    ).scalar() or 0.0

    # Suggestions par type
    from models.ai_agent import AISuggestionType
    suggestions_by_type = {}
    for suggestion_type in AISuggestionType:
        count = db.query(func.count(AISuggestion.id)).filter(
            AISuggestion.type == suggestion_type
        ).scalar() or 0
        if count > 0:
            suggestions_by_type[suggestion_type.value] = count

    # Exécutions par statut
    executions_by_status = {
        "success": success_executions,
        "failed": failed_executions,
        "running": db.query(func.count(AIExecution.id)).filter(
            AIExecution.status == AIExecutionStatus.RUNNING
        ).scalar() or 0,
    }

    # Coûts par provider (simplifié)
    from models.ai_agent import AIProvider
    cost_by_provider = {}
    for provider in AIProvider:
        cost = db.query(func.sum(AIExecution.estimated_cost_usd)).filter(
            AIExecution.ai_provider == provider
        ).scalar() or 0.0
        if cost > 0:
            cost_by_provider[provider.value] = round(cost, 2)

    # Config
    ai_service = AIAgentService(db)
    config_data = {
        "provider": ai_service.config.ai_provider.value if ai_service.config else "none",
        "auto_apply_enabled": ai_service.config.auto_apply_enabled if ai_service.config else False,
    }

    return AIStatisticsResponse(
        total_suggestions=total_suggestions,
        pending_suggestions=pending_suggestions,
        approved_suggestions=approved_suggestions,
        rejected_suggestions=rejected_suggestions,
        applied_suggestions=applied_suggestions,
        total_executions=total_executions,
        success_executions=success_executions,
        failed_executions=failed_executions,
        total_cost_usd=round(total_cost, 2),
        total_tokens_used=int(total_tokens),
        average_confidence_score=round(avg_confidence, 2) if avg_confidence else None,
        suggestions_by_type=suggestions_by_type,
        executions_by_status=executions_by_status,
        cost_by_provider=cost_by_provider,
        config=config_data,
    )


# ============================================================================
# API KEYS MANAGEMENT (Frontend Configuration)
# ============================================================================

from pydantic import BaseModel, field_validator

class SaveAPIKeysRequest(BaseModel):
    """Requête pour sauvegarder les clés API depuis le frontend"""
    anthropic_key: Optional[str] = None
    openai_key: Optional[str] = None
    ollama_url: Optional[str] = None

    @field_validator('anthropic_key')
    @classmethod
    def validate_anthropic_key(cls, v):
        if v and not v.startswith('sk-ant-'):
            raise ValueError('Clé Anthropic invalide (doit commencer par sk-ant-)')
        return v

    @field_validator('openai_key')
    @classmethod
    def validate_openai_key(cls, v):
        if v and not v.startswith('sk-'):
            raise ValueError('Clé OpenAI invalide (doit commencer par sk-)')
        return v


class APIKeysStatusResponse(BaseModel):
    """Statut des clés API (sans exposer les clés)"""
    anthropic_configured: bool
    openai_configured: bool
    ollama_configured: bool
    last_updated_at: Optional[str] = None
    using_env_fallback: bool


@router.put("/config/api-keys")
async def save_api_keys(
    request: SaveAPIKeysRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sauvegarder les clés API depuis le frontend (chiffrées en BDD)

    **Sécurité:**
    - Clés chiffrées avec Fernet (AES-256)
    - Jamais exposées en GET
    - Stockées uniquement dans BDD (pas de logs)

    **Usage:**
    ```javascript
    await fetch('/api/v1/ai/config/api-keys', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        anthropic_key: 'sk-ant-api03-xxxxx',
        openai_key: 'sk-proj-xxxxx'
      })
    })
    ```
    """
    from core.encryption import get_encryption_service
    from datetime import datetime, UTC

    user_id = _extract_user_id(current_user)

    # Récupérer la configuration active
    config = db.query(AIConfiguration).filter(AIConfiguration.is_active == True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration IA non trouvée")

    encryption = get_encryption_service()

    # Chiffrer et sauvegarder les clés
    if request.anthropic_key:
        config.encrypted_anthropic_key = encryption.encrypt(request.anthropic_key)

    if request.openai_key:
        config.encrypted_openai_key = encryption.encrypt(request.openai_key)

    if request.ollama_url:
        config.encrypted_ollama_url = encryption.encrypt(request.ollama_url)

    config.api_keys_updated_at = datetime.now(UTC)
    config.api_keys_updated_by = user_id

    db.commit()

    return {
        "message": "Clés API sauvegardées avec succès",
        "status": {
            "anthropic_configured": bool(config.encrypted_anthropic_key),
            "openai_configured": bool(config.encrypted_openai_key),
            "ollama_configured": bool(config.encrypted_ollama_url),
        }
    }


@router.get("/config/api-keys/status", response_model=APIKeysStatusResponse)
async def get_api_keys_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Vérifier le statut des clés API (SANS les exposer)

    Retourne uniquement si les clés sont configurées ou non.
    Jamais les clés elles-mêmes pour des raisons de sécurité.

    **Réponse:**
    ```json
    {
      "anthropic_configured": true,
      "openai_configured": false,
      "ollama_configured": false,
      "last_updated_at": "2025-10-21T10:30:00Z",
      "using_env_fallback": false
    }
    ```
    """
    from core.config import settings

    config = db.query(AIConfiguration).filter(AIConfiguration.is_active == True).first()

    if not config:
        raise HTTPException(status_code=404, detail="Configuration IA non trouvée")

    return APIKeysStatusResponse(
        anthropic_configured=bool(config.encrypted_anthropic_key),
        openai_configured=bool(config.encrypted_openai_key),
        ollama_configured=bool(config.encrypted_ollama_url),
        last_updated_at=config.api_keys_updated_at.isoformat() if config.api_keys_updated_at else None,
        using_env_fallback=not any([
            config.encrypted_anthropic_key,
            config.encrypted_openai_key,
            config.encrypted_ollama_url
        ]),
    )


@router.delete("/config/api-keys/{provider}")
async def delete_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Supprimer une clé API spécifique

    **Providers disponibles:** `anthropic`, `openai`, `ollama`

    **Usage:**
    ```bash
    DELETE /api/v1/ai/config/api-keys/anthropic
    ```
    """
    from datetime import datetime, UTC

    user_id = _extract_user_id(current_user)

    config = db.query(AIConfiguration).filter(AIConfiguration.is_active == True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration IA non trouvée")

    if provider == "anthropic":
        config.encrypted_anthropic_key = None
    elif provider == "openai":
        config.encrypted_openai_key = None
    elif provider == "ollama":
        config.encrypted_ollama_url = None
    else:
        raise HTTPException(status_code=400, detail=f"Provider inconnu: {provider}")

    config.api_keys_updated_at = datetime.now(UTC)
    config.api_keys_updated_by = user_id

    db.commit()

    return {"message": f"Clé API {provider} supprimée avec succès"}
