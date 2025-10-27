"""Routes API pour les listes de diffusion."""

import io
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.query import Query as SQLAlchemyQuery

from core import get_current_user, get_db
from core.permissions import filter_query_by_team
from models.mailing_list import MailingList
from schemas.mailing_list import (
    MailingListCreate,
    MailingListListResponse,
    MailingListResponse,
    MailingListUpdate,
)
from services.mailing_list_service import MailingListService

try:  # pragma: no cover - optional dependency
    import pandas as pd  # type: ignore

    PANDAS_AVAILABLE = True
    PANDAS_EMPTY_DATA_ERROR = pd.errors.EmptyDataError
except ImportError:  # pragma: no cover - executed when pandas missing
    pd = None  # type: ignore
    PANDAS_AVAILABLE = False

    class _PandasEmptyDataError(Exception):
        pass

    PANDAS_EMPTY_DATA_ERROR = _PandasEmptyDataError

router = APIRouter(prefix="/mailing-lists", tags=["mailing-lists"])


def apply_mailing_list_filters(
    query: SQLAlchemyQuery,
    params: Dict[str, Any],
    current_user: dict,
) -> SQLAlchemyQuery:
    """
    Applique exactement les mêmes filtres que le viewer.
    Utilisé par la route LIST et les exports pour garantir la cohérence.
    """
    # 1) Permissions - pas de team filtering pour mailing lists (accessible à tous)
    # Les mailing lists ne sont pas liées à une équipe spécifique

    # 2) Boolean helper
    def _get_bool(name: str) -> Optional[bool]:
        v = params.get(name)
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "y", "oui")
        return None

    # 3) Extract params
    only_active = _get_bool("only_active")
    only_mine = _get_bool("only_mine")
    target_type = params.get("target_type")
    search = params.get("search")
    sort = params.get("sort") or "created_at:desc"

    # 4) Apply filters
    if only_active:
        query = query.filter(MailingList.is_active == True)

    if only_mine:
        # Filtrer par created_by = current user
        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            query = query.filter(MailingList.created_by == user_id)

    if target_type:
        query = query.filter(MailingList.target_type == target_type)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (MailingList.name.ilike(search_pattern))
            | (MailingList.description.ilike(search_pattern))
        )

    # 5) Sorting
    if sort == "created_at:desc":
        query = query.order_by(MailingList.created_at.desc())
    elif sort == "created_at:asc":
        query = query.order_by(MailingList.created_at.asc())
    elif sort == "name:asc":
        query = query.order_by(MailingList.name.asc())
    elif sort == "name:desc":
        query = query.order_by(MailingList.name.desc())
    elif sort == "recipient_count:desc":
        query = query.order_by(MailingList.recipient_count.desc())
    elif sort == "recipient_count:asc":
        query = query.order_by(MailingList.recipient_count.asc())
    else:
        query = query.order_by(MailingList.created_at.desc())

    return query


def _extract_user_id(current_user: dict) -> int | None:
    if not current_user:
        return None
    user_id = current_user.get("user_id")
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


@router.post("", response_model=MailingListResponse, status_code=status.HTTP_201_CREATED)
async def create_mailing_list(
    data: MailingListCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer une nouvelle liste de diffusion."""
    service = MailingListService(db)
    user_id = _extract_user_id(current_user)
    mailing_list = service.create(data, user_id=user_id)
    return mailing_list


@router.get("", response_model=MailingListListResponse)
async def list_mailing_lists(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    only_active: bool = Query(True),
    only_mine: bool = Query(False, description="Afficher seulement mes listes"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister les listes de diffusion."""
    service = MailingListService(db)
    user_id = _extract_user_id(current_user) if only_mine else None

    items, total = service.get_all(
        skip=skip,
        limit=limit,
        only_active=only_active,
        user_id=user_id,
    )

    page = (skip // limit) + 1 if limit > 0 else 1

    return MailingListListResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
    )


@router.get("/stats")
async def get_mailing_list_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir des statistiques sur les listes."""
    service = MailingListService(db)
    return service.get_stats()


@router.get("/{list_id}", response_model=MailingListResponse)
async def get_mailing_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer une liste par ID."""
    service = MailingListService(db)
    mailing_list = service.get_by_id(list_id)

    if not mailing_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Liste de diffusion introuvable"
        )

    return mailing_list


@router.put("/{list_id}", response_model=MailingListResponse)
async def update_mailing_list(
    list_id: int,
    data: MailingListUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour une liste."""
    service = MailingListService(db)
    mailing_list = service.update(list_id, data)

    if not mailing_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Liste de diffusion introuvable"
        )

    return mailing_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mailing_list(
    list_id: int,
    hard: bool = Query(False, description="Suppression définitive"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer une liste (soft delete par défaut)."""
    service = MailingListService(db)

    if hard:
        success = service.hard_delete(list_id)
    else:
        success = service.delete(list_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Liste de diffusion introuvable"
        )

    return None


@router.post("/{list_id}/mark-used", response_model=MailingListResponse)
async def mark_list_as_used(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Marquer une liste comme utilisée (met à jour last_used_at)."""
    service = MailingListService(db)
    mailing_list = service.mark_as_used(list_id)

    if not mailing_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Liste de diffusion introuvable"
        )

    return mailing_list


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_mailing_lists(
    file: UploadFile = File(...),
    update_existing: bool = Query(False, description="Mettre à jour les listes existantes par nom"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Importer des listes de diffusion depuis un fichier CSV ou Excel.

    Format attendu (CSV/Excel):
    - name (obligatoire): Nom de la liste
    - description (optionnel): Description
    - target_type (optionnel, défaut: 'contacts'): 'contacts' ou 'organisations'
    - filters (optionnel): JSON string des filtres
    - recipient_count (optionnel, défaut: 0): Nombre de destinataires
    - is_active (optionnel, défaut: true): true/false

    Exemple CSV:
    name,description,target_type,filters,recipient_count,is_active
    "Clients Premium","Clients premium actifs","contacts","{\"countries\": [\"FR\"]}",150,true
    "Prospects","Nouveaux prospects","contacts","{}",50,true
    """
    user_id = _extract_user_id(current_user)
    service = MailingListService(db)

    # Vérifier le type de fichier
    filename = file.filename.lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format de fichier non supporté. Utilisez CSV ou Excel (.xlsx, .xls)",
        )

    try:
        # Lire le contenu du fichier
        contents = await file.read()

        if not PANDAS_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Le support CSV/Excel est indisponible (pandas non installé).",
            )

        # Parser selon le format
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        # Vérifier que la colonne 'name' existe
        if "name" not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La colonne 'name' est obligatoire dans le fichier",
            )

        # Remplacer les NaN par des valeurs par défaut
        df = df.fillna(
            {
                "description": "",
                "target_type": "contacts",
                "filters": "{}",
                "recipient_count": 0,
                "is_active": True,
            }
        )

        results = {"created": [], "updated": [], "errors": [], "total_processed": 0}

        # Traiter chaque ligne
        for idx, row in df.iterrows():
            results["total_processed"] += 1

            try:
                # Parser filters si c'est une string
                filters_data = {}
                if isinstance(row.get("filters"), str):
                    try:
                        filters_data = json.loads(row["filters"]) if row["filters"] else {}
                    except json.JSONDecodeError:
                        filters_data = {}
                elif isinstance(row.get("filters"), dict):
                    filters_data = row["filters"]

                # Convertir is_active en boolean
                is_active = True
                if "is_active" in row:
                    is_active_val = str(row["is_active"]).lower()
                    is_active = is_active_val in ["true", "1", "yes", "oui", "t"]

                # Vérifier si la liste existe déjà (par nom)
                existing_list = None
                if update_existing:
                    from models.mailing_list import MailingList

                    existing_list = (
                        db.query(MailingList).filter(MailingList.name == row["name"]).first()
                    )

                if existing_list:
                    # Mise à jour
                    update_data = MailingListUpdate(
                        name=row["name"],
                        description=row.get("description", "") or None,
                        target_type=row.get("target_type", "contacts"),
                        filters=filters_data,
                        recipient_count=int(row.get("recipient_count", 0)),
                        is_active=is_active,
                    )
                    updated_list = service.update(existing_list.id, update_data)
                    results["updated"].append({"id": updated_list.id, "name": updated_list.name})
                else:
                    # Création
                    create_data = MailingListCreate(
                        name=row["name"],
                        description=row.get("description", "") or None,
                        target_type=row.get("target_type", "contacts"),
                        filters=filters_data,
                        recipient_count=int(row.get("recipient_count", 0)),
                        is_active=is_active,
                    )
                    new_list = service.create(create_data, user_id=user_id)
                    results["created"].append({"id": new_list.id, "name": new_list.name})

            except Exception as e:
                results["errors"].append(
                    {
                        "row": idx + 2,  # +2 car Excel commence à 1 et on a un header
                        "name": row.get("name", "N/A"),
                        "error": str(e),
                    }
                )

        return {
            "success": True,
            "message": f"Import terminé: {len(results['created'])} créées, {len(results['updated'])} mises à jour, {len(results['errors'])} erreurs",
            "results": results,
        }

    except PANDAS_EMPTY_DATA_ERROR:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le fichier est vide")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'import: {str(e)}",
        )
