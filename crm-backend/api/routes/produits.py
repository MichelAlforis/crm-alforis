from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from core import get_db, get_current_user
from schemas.base import PaginatedResponse
from schemas.organisation import (
    ProduitCreate,
    ProduitUpdate,
    ProduitResponse,
    ProduitDetailResponse,
    MandatProduitCreate,
    MandatProduitResponse,
)
from services.organisation import ProduitService, MandatProduitService

router = APIRouter(prefix="/produits", tags=["produits"])

# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[ProduitResponse])
def list_produits(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lister tous les produits avec pagination et filtres

    Filtres disponibles:
    - type: OPCVM, FCP, SICAV, ETF, Fonds Alternatif, Autre
    - status: actif, inactif, en_attente
    """
    service = ProduitService(db)

    filters = {}
    if type:
        filters["type"] = type
    if status:
        filters["status"] = status

    items, total = service.get_all(skip=skip, limit=limit, filters=filters)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[ProduitResponse.model_validate(item) for item in items]
    )


@router.get("/search", response_model=PaginatedResponse[ProduitResponse])
def search_produits(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rechercher des produits par nom, ISIN ou notes"""
    service = ProduitService(db)
    items, total = service.search(q, skip=skip, limit=limit)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[ProduitResponse.model_validate(item) for item in items]
    )


@router.get("/by-isin/{isin}", response_model=ProduitResponse)
def get_produit_by_isin(
    isin: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer un produit par son code ISIN"""
    service = ProduitService(db)
    produit = service.get_by_isin(isin)

    if not produit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produit avec ISIN {isin} non trouvé"
        )

    return ProduitResponse.model_validate(produit)


@router.get("/by-mandat/{mandat_id}", response_model=List[ProduitResponse])
def get_produits_by_mandat(
    mandat_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer tous les produits associés à un mandat"""
    service = ProduitService(db)
    produits = service.get_by_mandat(mandat_id)

    return [ProduitResponse.model_validate(produit) for produit in produits]


@router.get("/{produit_id}", response_model=ProduitDetailResponse)
def get_produit(
    produit_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer un produit avec ses mandats associés"""
    service = ProduitService(db)
    produit = service.get_by_id(produit_id)

    return ProduitDetailResponse.model_validate(produit)


# ============= POST ROUTES =============

@router.post("", response_model=ProduitResponse, status_code=status.HTTP_201_CREATED)
def create_produit(
    produit: ProduitCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer un nouveau produit

    Champs requis:
    - name: Nom commercial du produit
    - type: OPCVM, FCP, SICAV, ETF, Fonds Alternatif, Autre

    Champs optionnels:
    - isin: Code ISIN unique (12 caractères)
    - status: actif, inactif, en_attente (défaut: en_attente)
    - notes: Description, caractéristiques

    Note: Le produit ne sera disponible pour les interactions
    qu'après avoir été associé à un mandat actif
    """
    service = ProduitService(db)
    new_produit = service.create(produit)
    return ProduitResponse.model_validate(new_produit)


@router.post("/associate-to-mandat", response_model=MandatProduitResponse, status_code=status.HTTP_201_CREATED)
def associate_produit_to_mandat(
    association: MandatProduitCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Associer un produit à un mandat de distribution

    Champs requis:
    - mandat_id: ID du mandat de distribution
    - produit_id: ID du produit

    Champs optionnels:
    - date_ajout: Date d'ajout du produit au mandat
    - notes: Conditions spécifiques pour ce produit dans ce mandat

    Validation:
    - Le mandat doit être actif (signé ou actif)
    - Le produit et le mandat doivent exister
    - L'association ne doit pas déjà exister
    """
    service = MandatProduitService(db)
    new_association = service.create(association)
    return MandatProduitResponse.model_validate(new_association)


# ============= PUT ROUTES =============

@router.put("/{produit_id}", response_model=ProduitResponse)
def update_produit(
    produit_id: int,
    produit: ProduitUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour un produit"""
    service = ProduitService(db)
    updated_produit = service.update(produit_id, produit)
    return ProduitResponse.model_validate(updated_produit)


# ============= DELETE ROUTES =============

@router.delete("/{produit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_produit(
    produit_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer un produit

    Note: Supprimera également toutes les associations mandat-produit
    et les interactions liées (cascade delete)
    """
    service = ProduitService(db)
    service.delete(produit_id)
    return None


@router.delete("/association/{association_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mandat_produit_association(
    association_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer une association mandat-produit"""
    service = MandatProduitService(db)
    service.delete(association_id)
    return None
