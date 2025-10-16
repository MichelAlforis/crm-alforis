# ============= IMPORTS ROUTER =============
# Bulk import investors & fournisseurs en 1 transaction
# Endpoints:
#   POST /api/v1/imports/investors/bulk
#   POST /api/v1/imports/fournisseurs/bulk

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any, Set
import logging

# ---- Dépendances / modèles / schémas
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


def _collect_nonempty_emails(items: List[dict], key: str = "email") -> Set[str]:
    emails: Set[str] = set()
    for it in items:
        e = _normalize_email(it.get(key))
        if e:
            emails.add(e)
    return emails


# ============= BULK CREATE INVESTORS =============

@router.post("/investors/bulk")
async def bulk_create_investors(
    investors: List[InvestorCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Créer plusieurs investisseurs en une seule requête.
    """

    total = len(investors)
    result: Dict[str, Any] = {
        "total": total,
        "created": [],
        "failed": 0,
        "errors": []
    }

    if total == 0:
        return result

    # -------- Déduplication payload --------
    seen_emails: Set[str] = set()
    for idx, inv in enumerate(investors):
        norm_email = _normalize_email(inv.email)
        if norm_email:
            if norm_email in seen_emails:
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Doublon dans le payload pour l'email: {norm_email}"
                })
            else:
                seen_emails.add(norm_email)

    if result["failed"] == total:
        return result

    # -------- Précharger emails existants en base --------
    payload_dicts = [inv.dict() for inv in investors]
    for p in payload_dicts:
        p["email"] = _normalize_email(p.get("email"))

    payload_emails = {p["email"] for p in payload_dicts if p.get("email")}
    existing_emails = set()
    if payload_emails:
        existing_emails = {
            e[0] for e in db.query(Investor.email).filter(Investor.email.in_(payload_emails)).all()
        }

    try:
        for idx, payload in enumerate(payload_dicts):
            try:
                # Skip si doublon payload déjà détecté
                if any(e["index"] == idx for e in result["errors"]):
                    continue

                # Doublon base
                email = payload.get("email")
                if email and email in existing_emails:
                    result["failed"] += 1
                    result["errors"].append({
                        "index": idx,
                        "row": _index_to_row(idx),
                        "error": f"Email déjà existant en base: {email}"
                    })
                    continue

                new_inv = Investor(**payload)
                db.add(new_inv)
                db.flush()  # récupère l'ID sans commit
                result["created"].append(new_inv.id)

            except IntegrityError as ie:
                db.rollback()  # nécessaire après IntegrityError
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Contrainte d'intégrité: {getattr(ie, 'orig', ie)}"
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
        logger.exception("Erreur lors du bulk_create_investors")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )

    return result


# ============= BULK CREATE FOURNISSEURS =============

@router.post("/fournisseurs/bulk")
async def bulk_create_fournisseurs(
    fournisseurs: List[FournisseurCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Créer plusieurs fournisseurs en une seule requête.
    """

    total = len(fournisseurs)
    result: Dict[str, Any] = {
        "total": total,
        "created": [],
        "failed": 0,
        "errors": []
    }

    if total == 0:
        return result

    # -------- Déduplication payload --------
    seen_emails: Set[str] = set()
    for idx, f in enumerate(fournisseurs):
        norm_email = _normalize_email(f.email)
        if norm_email:
            if norm_email in seen_emails:
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Doublon dans le payload pour l'email: {norm_email}"
                })
            else:
                seen_emails.add(norm_email)

    if result["failed"] == total:
        return result

    # -------- Précharger emails existants en base --------
    payload_dicts = [f.dict() for f in fournisseurs]
    for p in payload_dicts:
        p["email"] = _normalize_email(p.get("email"))

    payload_emails = {p["email"] for p in payload_dicts if p.get("email")}
    existing_emails = set()
    if payload_emails:
        existing_emails = {
            e[0] for e in db.query(Fournisseur.email).filter(Fournisseur.email.in_(payload_emails)).all()
        }

    try:
        for idx, payload in enumerate(payload_dicts):
            try:
                # Skip si doublon payload déjà détecté
                if any(e["index"] == idx for e in result["errors"]):
                    continue

                # Doublon base
                email = payload.get("email")
                if email and email in existing_emails:
                    result["failed"] += 1
                    result["errors"].append({
                        "index": idx,
                        "row": _index_to_row(idx),
                        "error": f"Email déjà existant en base: {email}"
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
                    "error": f"Contrainte d'intégrité: {getattr(ie, 'orig', ie)}"
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
