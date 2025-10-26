# ============= IMPORTS ROUTER =============
# Bulk import organisations (clients/fournisseurs) et personnes
# Endpoints:

#   POST /api/v1/imports/organisations/bulk (NEW: import unifié)
#   POST /api/v1/imports/people/bulk (NEW: import personnes physiques)

import logging
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

# ---- Dépendances / modèles / schémas
from core.database import get_db
from core.security import get_current_user_optional
from models.organisation import Organisation, OrganisationCategory, OrganisationType
from models.person import Person
from schemas.organisation import OrganisationCreate
from schemas.person import PersonCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/imports", tags=["imports"])


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


# ============= NEW: BULK CREATE ORGANISATIONS (UNIFIÉ) =============

def _resolve_org_type(raw: Any) -> OrganisationType:
    if isinstance(raw, OrganisationType):
        return raw
    if isinstance(raw, str):
        lowered = raw.strip().lower()
        # legacy aliases
        if lowered in {"client", "investor"}:
            return OrganisationType.CLIENT
        if lowered in {"fournisseur", "provider"}:
            return OrganisationType.FOURNISSEUR
        if lowered in {"distributeur", "distributor"}:
            return OrganisationType.DISTRIBUTEUR
        if lowered in {"emetteur", "issuer"}:
            return OrganisationType.EMETTEUR
        if lowered in {"autre", "other"}:
            return OrganisationType.AUTRE
    return OrganisationType.AUTRE


@router.post("/organisations/bulk")
async def bulk_create_organisations(
    organisations: List[OrganisationCreate],
    type_org: str = Query(..., description="Type d'organisation: client ou fournisseur"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:

    total = len(organisations)
    resolved_type = _resolve_org_type(type_org)
    result: Dict[str, Any] = {
        "total": total,
        "created": [],
        "failed": 0,
        "errors": [],
        "type": resolved_type.value,
    }

    if total == 0:
        return result

    # -------- Déduplication payload --------
    seen_names: Set[str] = set()
    for idx, org in enumerate(organisations):
        norm_name = org.name.strip().lower() if org.name else None
        if norm_name:
            if norm_name in seen_names:
                result["failed"] += 1
                result["errors"].append({
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Doublon dans le payload pour le nom: {org.name}"
                })
            else:
                seen_names.add(norm_name)

    if result["failed"] == total:
        return result

    # -------- Précharger noms existants en base --------
    payload_dicts = [org.model_dump() for org in organisations]
    payload_names = {p["name"].strip().lower() for p in payload_dicts if p.get("name")}
    existing_names = set()
    if payload_names:
        existing_names = {
            n[0].strip().lower()
            for n in db.query(Organisation.name).filter(
                func.lower(Organisation.name).in_(payload_names)
            ).all()
        }

    try:
        for idx, payload in enumerate(payload_dicts):
            try:
                # Skip si doublon payload déjà détecté
                if any(e["index"] == idx for e in result["errors"]):
                    continue

                # Doublon base
                name = payload.get("name")
                norm_name = name.strip().lower() if isinstance(name, str) else None
                if norm_name and norm_name in existing_names:
                    result["failed"] += 1
                    result["errors"].append({
                        "index": idx,
                        "row": _index_to_row(idx),
                        "error": f"Organisation déjà existante: {name}"
                    })
                    continue

                # Créer l'organisation avec le type spécifié
                # Note: Le type n'est pas dans OrganisationCreate, on doit gérer ça différemment
                # Pour l'instant, on utilise le payload tel quel
                payload.setdefault("type", resolved_type)
                new_org = Organisation(**payload)
                db.add(new_org)
                db.flush()
                result["created"].append(new_org.id)
                if norm_name:
                    existing_names.add(norm_name)

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
        logger.exception("Erreur lors du bulk_create_organisations")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )

    return result


# ============= NEW: BULK CREATE PEOPLE (PERSONNES PHYSIQUES) =============

def _detect_duplicate_emails(people: List[PersonCreate], result: Dict[str, Any]) -> Set[str]:
    """Détecte les doublons d'email dans le payload et met à jour result."""
    seen_emails: Set[str] = set()
    for idx, person in enumerate(people):
        norm_email = _normalize_email(person.personal_email)
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
    return seen_emails


def _normalize_people_payload(people: List[PersonCreate]) -> List[dict]:
    """Normalise les emails du payload."""
    payload_dicts = [p.dict() for p in people]
    for p in payload_dicts:
        p["personal_email"] = _normalize_email(p.get("personal_email"))
    return payload_dicts


def _get_existing_emails(db: Session, payload_dicts: List[dict]) -> Set[str]:
    """Récupère les emails déjà présents en base."""
    payload_emails = {p["personal_email"] for p in payload_dicts if p.get("personal_email")}
    if not payload_emails:
        return set()

    return {
        e[0] for e in db.query(Person.personal_email).filter(
            func.lower(Person.personal_email).in_(payload_emails)
        ).all()
    }


def _process_person_creation(
    idx: int,
    payload: dict,
    db: Session,
    existing_emails: Set[str],
    result: Dict[str, Any]
) -> None:
    """Traite la création d'une personne avec gestion d'erreurs."""
    # Skip si doublon payload déjà détecté
    if any(e["index"] == idx for e in result["errors"]):
        return

    # Vérifier doublon base
    email = payload.get("personal_email")
    if email and email in existing_emails:
        result["failed"] += 1
        result["errors"].append({
            "index": idx,
            "row": _index_to_row(idx),
            "error": f"Email déjà existant en base: {email}"
        })
        return

    try:
        new_person = Person(**payload)
        db.add(new_person)
        db.flush()
        result["created"].append(new_person.id)
        if email:
            existing_emails.add(email)

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


@router.post("/people/bulk")
async def bulk_create_people(
    people: List[PersonCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Créer plusieurs personnes physiques en une seule requête.

    Ce endpoint permet d'importer des personnes (contacts) sans les lier immédiatement
    à une organisation. Utilisez /links/bulk pour créer les liens ensuite.
    """
    total = len(people)
    result: Dict[str, Any] = {
        "total": total,
        "created": [],
        "failed": 0,
        "errors": []
    }

    if total == 0:
        return result

    # Déduplication payload
    _detect_duplicate_emails(people, result)
    if result["failed"] == total:
        return result

    # Normalisation et préchargement
    payload_dicts = _normalize_people_payload(people)
    existing_emails = _get_existing_emails(db, payload_dicts)

    try:
        for idx, payload in enumerate(payload_dicts):
            _process_person_creation(idx, payload, db, existing_emails, result)

        if result["created"]:
            db.commit()
        else:
            db.rollback()

    except Exception as e:
        db.rollback()
        logger.exception("Erreur lors du bulk_create_people")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )

    return result

