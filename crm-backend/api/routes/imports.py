# ============= IMPORTS ROUTER =============
# Bulk import investors & fournisseurs en 1 transaction
# Endpoints:
#   POST /api/v1/imports/investors/bulk
#   POST /api/v1/imports/fournisseurs/bulk

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
import logging

# ---- Tes dépendances / modèles / schémas (adapter si chemins différents)
from core.database import get_db
from core.security import get_current_user_optional
from models.investor import Investor
from schemas.investor import InvestorCreate
from models.fournisseur import Fournisseur
from schemas.fournisseur import FournisseurCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/imports", tags=["imports"])


# ---------- Utils communs ----------

def _normalize_email(email: Optional[str]) -> Optional[str]:
    return email.strip().lower() if isinstance(email, str) else None


def _index_to_row(idx: int) -> int:
    # +1 (index 0) +1 (header CSV éventuel) => utile quand on importe depuis un CSV
    return idx + 2


# ============= BULK CREATE INVESTORS =============

@router.post("/investors/bulk")
async def bulk_create_investors(
    investors: List[InvestorCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Créer plusieurs investisseurs en une seule requête.

    Body (exemple):
    [
      {
        "name": "Client A",
        "email": "a@example.com",
        "phone": "+33123456789",
        "pipeline_stage": "prospect_froid",
        "client_type": "cgpi",
        "notes": "VIP"
      }
    ]

    Réponse:
    {
      "total": 3,
      "created": [1, 2, 3],
      "failed": 0,
      "errors": []
    }
    """

    total = len(investors)
    result = {
        "total": total,
        "created": [],
        "failed": 0,
        "errors": []
    }

    if total == 0:
        return result

    # Déduplication interne (dans le payload) par email normalisé
    seen_emails = set()
    for idx, inv in enumerate(investors):
        norm_email = _normalize_email(inv.email)
        if norm_email and norm_email in seen_emails:
            result["failed"] += 1
            result["errors"].append({
                "index": idx,
                "row": _index_to_row(idx),
                "error": f"Doublon dans le payload pour l'email: {norm_email}"
            })
        elif norm_email:
            seen_emails.add(norm_email)

    # Si tout est en doublon dans le payload, on évite la requête inutile
    if result["failed"] == total:
        return result

    try:
        for idx, inv in enumerate(investors):
            try:
                payload = inv.dict()
                payload["email"] = _normalize_email(payload.get("email"))

                # Skip si déjà marqué en doublon payload
                if any(e["index"] == idx for e in result["errors"]):
                    continue

                # Vérifier si l'investisseur existe déjà (par email)
                if payload.get("email"):
                    existing = db.query(Investor).filter(
                        Investor.email == payload["email"]
                    ).first()
                    if existing:
                        result["failed"] += 1
                        result["errors"].append({
                            "index": idx,
                            "row": _index_to_row(idx),
                            "error": f"Email déjà existant en base: {payload['email']}"
                        })
                        continue

                # Créer l'investisseur
                new_inv = Investor(**payload)
                db.add(new_inv)
                db.flush()  # récupère l'ID sans commit

                result["created"].append(new_inv.id)

            except IntegrityError as ie:
                db.rollback()  # rollback partiel nécessaire après IntegrityError
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Contrainte d'intégrité: {str(ie.orig) if hasattr(ie, 'orig') else str(ie)}"
                })
            except Exception as e:
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": str(e)
                })

        # Commit final
        if result["created"]:
            db.commit()
        else:
            db.rollback()

    except Exception as e:
        db.rollback()
        logger.exception("Erreur lors du bulk_create_investors")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )

    return result


# ============= BULK CREATE FOURNISSEURS =============
# Si tu n'as pas encore de schéma ou modèle strict, on accepte Dict.
# Sinon remplace `List[Dict[str, Any]]` par `List[FournisseurCreate]`
# et adapte l'import + l'instanciation modèle.

@router.post("/fournisseurs/bulk")
async def bulk_create_fournisseurs(
    fournisseurs: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Créer plusieurs fournisseurs en une seule requête.

    Body minimal attendu:
    [
      { "name": "Mandarine Gestion", "email": "contact@mandarinegestion.com", "activity": "Asset Management" }
    ]
    """

    # Import local pour éviter dépendances circulaires si ta structure le nécessite
    try:
        from models.fournisseur import Fournisseur
    except Exception:
        # Compat si ton modèle est ailleurs
        from app.models import Fournisseur  # type: ignore

    total = len(fournisseurs)
    result = {
        "total": total,
        "created": [],
        "failed": 0,
        "errors": []
    }

    if total == 0:
        return result

    # Déduplication interne (payload)
    seen_emails = set()
    for idx, f in enumerate(fournisseurs):
        norm_email = _normalize_email(f.get("email"))
        if norm_email and norm_email in seen_emails:
            result["failed"] += 1
            result["errors"].append({
                "index": idx,
                "row": _index_to_row(idx),
                "error": f"Doublon dans le payload pour l'email: {norm_email}"
            })
        elif norm_email:
            seen_emails.add(norm_email)

    if result["failed"] == total:
        return result

    try:
        for idx, f in enumerate(fournisseurs):
            try:
                payload = dict(f)  # shallow copy
                payload["email"] = _normalize_email(payload.get("email"))

                # Skip si doublon payload déjà signalé
                if any(e["index"] == idx for e in result["errors"]):
                    continue

                # Vérifier existence par email
                if payload.get("email"):
                    existing = db.query(Fournisseur).filter(
                        Fournisseur.email == payload["email"]
                    ).first()
                    if existing:
                        result["failed"] += 1
                        result["errors"].append({
                            "index": idx,
                            "row": _index_to_row(idx),
                            "error": f"Email déjà existant en base: {payload['email']}"
                        })
                        continue

                new_f = Fournisseur(**payload)
                db.add(new_f)
                db.flush()

                result["created"].append(new_f.id)

            except IntegrityError as ie:
                db.rollback()
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Contrainte d'intégrité: {str(ie.orig) if hasattr(ie, 'orig') else str(ie)}"
                })
            except Exception as e:
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": str(e)
                })

        if result["created"]:
            db.commit()
        else:
            db.rollback()

    except Exception as e:
        db.rollback()
        logger.exception("Erreur lors du bulk_create_fournisseurs")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )

    return result
