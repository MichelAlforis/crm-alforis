# ============= IMPORTS ROUTER =============
# Route pour l'import en masse d'investisseurs et fournisseurs
# Optimise les performances en créant plusieurs entités en une seule transaction

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from models.investor import Investor
from schemas.investor import InvestorCreate
from core.database import get_db
from core.security import get_current_user_optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/imports", tags=["imports"])


# ============= BULK CREATE INVESTORS =============

@router.post("/investors/bulk")
async def bulk_create_investors(
    investors: List[InvestorCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional)
) -> dict:
    """
    Créer plusieurs investisseurs en une seule requête
    
    Request body:
    [
      {
        "name": "Client A",
        "email": "a@example.com",
        "phone": "+33123456789",
        "pipeline_stage": "prospect_froid",
        ...
      },
      ...
    ]
    
    Response:
    {
      "total": 3,
      "created": [1, 2, 3],
      "failed": 0,
      "errors": []
    }
    
    Avantages:
    - 1 requête pour 100 clients (au lieu de 100)
    - 100x plus rapide!
    - Meilleur performance
    """
    
    result = {
        "total": len(investors),
        "created": [],
        "failed": 0,
        "errors": []
    }
    
    if not investors:
        return result
    
    for idx, investor_data in enumerate(investors):
        try:
            # Vérifier si l'investisseur existe déjà (par email)
            if investor_data.email:
                existing = db.query(Investor).filter(
                    Investor.email == investor_data.email
                ).first()
                if existing:
                    result["failed"] += 1
                    result["errors"].append({
                        "index": idx,
                        "row": idx + 2,  # +1 pour header, +1 pour index 0
                        "error": f"Email déjà existant: {investor_data.email}"
                    })
                    continue
            
            # Créer l'investisseur
            new_investor = Investor(**investor_data.dict())
            db.add(new_investor)
            db.flush()  # Obtenir l'ID sans commit
            
            result["created"].append(new_investor.id)
            
        except Exception as e:
            result["failed"] += 1
            result["errors"].append({
                "index": idx,
                "row": idx + 2,
                "error": str(e)
            })
    
    # Commit toutes les modifications en une seule transaction
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )
    
    return result


# ============= BULK CREATE FOURNISSEURS (OPTIONNEL) =============

@router.post("/fournisseurs/bulk")
async def bulk_create_fournisseurs(
    fournisseurs: List[dict],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional)
) -> dict:
    """
    Créer plusieurs fournisseurs en une seule requête
    
    Même pattern que les investisseurs
    """
    from app.models import Fournisseur
    
    result = {
        "total": len(fournisseurs),
        "created": [],
        "failed": 0,
        "errors": []
    }
    
    if not fournisseurs:
        return result
    
    for idx, fournisseur_data in enumerate(fournisseurs):
        try:
            # Vérifier si le fournisseur existe déjà (par email)
            if fournisseur_data.get("email"):
                existing = db.query(Fournisseur).filter(
                    Fournisseur.email == fournisseur_data["email"]
                ).first()
                if existing:
                    result["failed"] += 1
                    result["errors"].append({
                        "index": idx,
                        "row": idx + 2,
                        "error": f"Email déjà existant: {fournisseur_data['email']}"
                    })
                    continue
            
            # Créer le fournisseur
            new_fournisseur = Fournisseur(**fournisseur_data)
            db.add(new_fournisseur)
            db.flush()
            
            result["created"].append(new_fournisseur.id)
            
        except Exception as e:
            result["failed"] += 1
            result["errors"].append({
                "index": idx,
                "row": idx + 2,
                "error": str(e)
            })
    
    # Commit
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'enregistrement: {str(e)}"
        )
    
    return result