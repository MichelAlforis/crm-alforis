import logging
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core import get_current_user, get_current_user_optional, get_db
from core.exceptions import ConflictError, ResourceNotFound
from models.person import PersonOrganizationLink
from schemas.person import (
    PersonOrganizationLinkCreate,
    PersonOrganizationLinkResponse,
    PersonOrganizationLinkUpdate,
)
from services.person import PersonOrganizationLinkService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/org-links", tags=["people"])


# -------- Utils communs --------


def _index_to_row(idx: int) -> int:
    """Convertir index (0-based) à numéro de ligne (1-based, +1 pour header)."""
    return idx + 2


# ============= BULK CREATE ORG-LINKS =============


@router.post("/bulk", status_code=status.HTTP_200_OK)
async def bulk_create_links(
    links: List[PersonOrganizationLinkCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Créer plusieurs liens personne ↔ organisation en une seule requête.

    Paramètres:
    - links: liste de PersonOrganizationLinkCreate avec person_id et organisation_id

    Résultat:
    - total: nombre total de liens à créer
    - created: liste des IDs de liens créés
    - failed: nombre de liens échoués
    - errors: liste détaillée des erreurs avec index, row, et message
    """

    total = len(links)
    result: Dict[str, Any] = {"total": total, "created": [], "failed": 0, "errors": []}

    if total == 0:
        return result

    # -------- Déduplication payload --------
    # Key: (person_id, organisation_id) pour détecter les doublons
    seen_pairs: Set[Tuple[int, int]] = set()
    for idx, link in enumerate(links):
        pair = (link.person_id, link.organisation_id)
        if pair in seen_pairs:
            result["failed"] += 1
            result["errors"].append(
                {
                    "index": idx,
                    "row": _index_to_row(idx),
                    "error": f"Doublon dans le payload: personne {link.person_id} déjà associée à organisation {link.organisation_id}",
                }
            )
        else:
            seen_pairs.add(pair)

    if result["failed"] == total:
        return result

    # -------- Précharger les liens existants en base --------
    payload_pairs = {(link.person_id, link.organisation_id) for link in links}
    existing_pairs: Set[Tuple[int, int]] = set()
    if payload_pairs:
        existing_links = (
            db.query(PersonOrganizationLink.person_id, PersonOrganizationLink.organisation_id)
            .filter(
                PersonOrganizationLink.person_id.in_({p[0] for p in payload_pairs}),
                PersonOrganizationLink.organisation_id.in_({p[1] for p in payload_pairs}),
            )
            .all()
        )
        existing_pairs = {(p[0], p[1]) for p in existing_links}

    try:
        service = PersonOrganizationLinkService(db)

        for idx, link_data in enumerate(links):
            try:
                # Skip si doublon payload déjà détecté
                if any(e["index"] == idx for e in result["errors"]):
                    continue

                pair = (link_data.person_id, link_data.organisation_id)

                # Vérifier si le lien existe déjà en base
                if pair in existing_pairs:
                    result["failed"] += 1
                    result["errors"].append(
                        {
                            "index": idx,
                            "row": _index_to_row(idx),
                            "error": f"Lien déjà existant: personne {link_data.person_id} ↔ organisation {link_data.organisation_id}",
                        }
                    )
                    continue

                # Créer le lien (la méthode vérifie l'existence de person et organisation)
                new_link = await service.create_link(link_data)
                result["created"].append(new_link.id)
                existing_pairs.add(pair)

            except ConflictError as ce:
                db.rollback()
                result["failed"] += 1
                result["errors"].append(
                    {"index": idx, "row": _index_to_row(idx), "error": f"Conflit: {str(ce)}"}
                )
            except ResourceNotFound as rnf:
                db.rollback()
                result["failed"] += 1
                result["errors"].append(
                    {
                        "index": idx,
                        "row": _index_to_row(idx),
                        "error": f"Ressource introuvable: {str(rnf)}",
                    }
                )
            except Exception as e:
                db.rollback()
                result["failed"] += 1
                result["errors"].append({"index": idx, "row": _index_to_row(idx), "error": str(e)})

        # Commit final (utile si create_link ne commit pas immédiatement)
        db.commit()

    except Exception as e:
        db.rollback()
        logger.exception("Erreur lors du bulk_create_links")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}",
        )

    return result


@router.post("", response_model=PersonOrganizationLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_link(
    payload: PersonOrganizationLinkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    link = await service.create_link(payload)
    responses = service.serialize_links([link])
    return responses[0]


@router.get("/{link_id}", response_model=PersonOrganizationLinkResponse)
async def get_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    link = await service.get_link(link_id)
    responses = service.serialize_links([link])
    return responses[0]


@router.put("/{link_id}", response_model=PersonOrganizationLinkResponse)
async def update_link(
    link_id: int,
    payload: PersonOrganizationLinkUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    link = await service.update_link(link_id, payload)
    responses = service.serialize_links([link])
    return responses[0]


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    await service.delete_link(link_id)
    return None
