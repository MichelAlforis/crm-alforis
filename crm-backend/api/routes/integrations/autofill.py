"""
Routes API AI Autofill - Suggestions intelligentes d'interactions

Endpoints (3 au total):
✅ POST /v2      - Autofill V2 avec multi-sources (emails + IA)
✅ POST /preview - Preview des suggestions avant application
✅ POST /apply   - Application des suggestions avec logs
"""

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from models.autofill_decision_log import AutofillDecisionLog
from schemas.integrations import (
    AutofillApplyRequest,
    AutofillApplyResponse,
    AutofillPreviewRequest,
    AutofillPreviewResponse,
    AutofillV2Request,
    AutofillV2Response,
    InteractionSuggestion,
    MatchAction,
)
from services.autofill_apply_service import AutofillApplyService
from services.autofill_service_v2 import AutofillServiceV2
from services.interaction_suggestion_service import InteractionSuggestionService
from services.matching_scorer import MatchingScorer

router = APIRouter()

@router.post("/v2", response_model=AutofillV2Response)
async def autofill_v2(
    request: AutofillV2Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Autofill prédictif V2 avec pipeline multi-sources

    Pipeline:
    1. Rules (10ms) - Pays/langue/téléphone
    2. DB Patterns (20ms) - Patterns email existants
    3. Outlook (50ms) - Signatures emails
    4. LLM Fallback (300ms) - Si incertitude et budget

    Seuils:
    - auto_apply si confidence ≥ 0.85
    - Pattern email auto si ≥2 contacts confirmés
    """
    autofill_service = AutofillServiceV2(db)
    outlook_service = OutlookIntegration(db)

    # Récupérer user pour Outlook
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    # Préparer context
    context = request.context or {}

    # Ajouter Outlook si connecté
    if user and user.outlook_connected:
        try:
            context["outlook_access_token"] = await outlook_service.get_valid_access_token(user)
            context["outlook_enabled"] = True
        except HTTPException as exc:
            if exc.status_code in (400, 401):
                context.pop("outlook_access_token", None)
                context["outlook_enabled"] = False
            else:
                raise
    else:
        context.pop("outlook_access_token", None)
        context["outlook_enabled"] = False

    # Budget mode par défaut
    if "budget_mode" not in context:
        context["budget_mode"] = "normal"

    # Exécuter autofill
    result = await autofill_service.autofill(
        entity_type=request.entity_type,
        draft=request.draft,
        context=context,
        user_id=int(user_id) if user_id else None,
    )

    return result


# ==========================================
# Autofill Preview (V1.5 Smart Resolver)
# ==========================================


@router.post("/preview", response_model=AutofillPreviewResponse)
async def autofill_preview(
    request: AutofillPreviewRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Smart Resolver V1.5 - Preview de matching multi-critères

    Pipeline:
    1. Recherche candidats potentiels (email, nom, téléphone, domaine)
    2. Score chaque candidat selon critères pondérés:
       - Email exact: +100
       - Nom + Société: +75 (exact) / +50 (fuzzy)
       - Domaine email match: +40
       - Téléphone: +50
       - Titre/Poste: +20
       - Ville: +10
    3. Décision automatique:
       - score ≥ 100 → "apply" (auto-match)
       - 60 ≤ score < 100 → "preview" (validation humaine)
       - score < 60 → "create_new"

    Use cases:
    - Détection doublons avant création
    - Enrichissement contacts existants
    - Validation pré-import
    """
    import time

    start_time = time.time()

    # Initialiser scorer
    scorer = MatchingScorer(db)

    # Trouver et scorer candidats
    if request.entity_type == "person":
        matches = scorer.find_person_candidates(request.draft, limit=request.limit)
    elif request.entity_type == "organisation":
        matches = scorer.find_organisation_candidates(request.draft, limit=request.limit)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"entity_type invalide: {request.entity_type}",
        )

    # Déterminer recommandation globale (basée sur le meilleur match)
    if matches and len(matches) > 0:
        best_match = matches[0]
        recommendation = MatchAction(best_match["action"])
    else:
        recommendation = MatchAction.CREATE_NEW

    # Suggérer une interaction si entités résolues
    interaction_suggestion = None
    if matches and len(matches) > 0 and best_match["score"] >= 60:
        # Récupérer IDs des entités pour la suggestion
        person_id = None
        organisation_id = None

        if request.entity_type == "person" and best_match["score"] >= 60:
            person_id = best_match["candidate"]["id"]
            # Tenter de résoudre l'organisation depuis l'email
            if request.draft.get("personal_email"):
                org_matches = scorer.find_organisation_candidates(
                    {"email": request.draft["personal_email"]},
                    limit=1
                )
                if org_matches and org_matches[0]["score"] >= 60:
                    organisation_id = org_matches[0]["candidate"]["id"]
        elif request.entity_type == "organisation":
            organisation_id = best_match["candidate"]["id"]

        # Générer la suggestion d'interaction
        if person_id or organisation_id:
            suggestion_service = InteractionSuggestionService(db)
            user_id = current_user.get("user_id", 1)  # Fallback à 1 si pas d'user_id

            interaction_suggestion = suggestion_service.suggest_interaction(
                draft=request.draft,
                person_id=person_id,
                organisation_id=organisation_id,
                current_user_id=user_id,
                context={}
            )

    # Calculer métadonnées
    execution_time_ms = int((time.time() - start_time) * 1000)

    # Critères utilisés (déduits des détails du meilleur match)
    criteria_used = []
    if matches and len(matches) > 0:
        criteria_used = list(matches[0]["details"].keys())

    meta = {
        "execution_time_ms": execution_time_ms,
        "candidates_searched": len(matches),
        "criteria_used": criteria_used,
        "entity_type": request.entity_type,
        "interaction_suggested": interaction_suggestion is not None,
    }

    # Journaliser la décision de preview pour conformité RGPD
    user_id_raw = current_user.get("user_id") or current_user.get("sub")
    best_candidate = matches[0]["candidate"] if matches else {}

    person_id = None
    organisation_id = None
    if request.entity_type == "person":
        person_id = best_candidate.get("id")
    elif request.entity_type == "organisation":
        organisation_id = best_candidate.get("id")

    # Essayer d'enrichir avec l'interaction suggérée
    if interaction_suggestion:
        person_id = interaction_suggestion.get("person_id") or person_id
        organisation_id = interaction_suggestion.get("organisation_id") or organisation_id

    try:
        request_payload = (
            request.model_dump()  # type: ignore[attr-defined]
            if hasattr(request, "model_dump")
            else request.dict()
        )
        input_hash = hashlib.sha256(
            json.dumps(request_payload, sort_keys=True, default=str).encode()
        ).hexdigest()

        decision_log = AutofillDecisionLog(
            input_id=f"preview:{uuid4().hex}",
            input_hash=input_hash,
            decision=recommendation.value,
            person_id=person_id,
            organisation_id=organisation_id,
            interaction_id=None,
            scores_json={
                "matches": matches,
                "meta": meta,
            },
            reason=f"smart_resolver:{recommendation.value}",
            applied_by_user_id=int(user_id_raw) if user_id_raw else None,
            was_deduped=0,
        )
        db.add(decision_log)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[AutofillPreview] Unable to persist decision log: {exc}")

    return {
        "matches": matches,
        "recommendation": recommendation,
        "interaction_suggestion": interaction_suggestion,
        "meta": meta,
    }


# ==========================================
# Autofill Apply (V1.5+ - Création transactionnelle)
# ==========================================


@router.post("/apply", response_model=AutofillApplyResponse)
async def autofill_apply(
    request: AutofillApplyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Applique les décisions d'autofill de manière transactionnelle

    Crée/lie:
    - Person (si apply=True)
    - Organisation (si apply=True)
    - Interaction avec participants
    - AutofillDecisionLog pour traçabilité

    Fonctionnalités:
    - Idempotence via input_id (rejeu safe)
    - Déduplication d'interactions (même org + titre + heure ±2h)
    - Ajout automatique des participants
    - Journalisation complète avec scores

    Use cases:
    - Après clic "Créer l'interaction & lier" dans le modal
    - Workflow auto-apply (score ≥ 100)
    - Import batch avec suivi décision
    """
    try:
        # Récupérer user_id
        user_id = current_user.get("user_id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID manquant")

        # Initialiser service
        apply_service = AutofillApplyService(db)

        # Appliquer les décisions
        result = apply_service.apply(
            input_id=request.input_id,
            person_decision=request.person.dict(),
            organisation_decision=request.organisation.dict(),
            interaction_data=request.interaction.dict(),
            dedupe=request.dedupe,
            current_user_id=int(user_id),
            context=request.context
        )

        return AutofillApplyResponse(**result)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'application de l'autofill: {str(e)}"
        )


# ==========================================
# IMAP Direct Connection (Simple & Efficace)
# ==========================================

