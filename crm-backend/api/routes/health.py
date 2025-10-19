"""
Health check endpoint pour monitoring et Docker healthcheck
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint

    Retourne le statut de l'API et de la base de données.
    Utilisé par Docker pour vérifier que l'API est opérationnelle.
    """
    try:
        # Vérifier la connexion DB
        db.execute("SELECT 1")

        return {
            "status": "healthy",
            "database": "connected",
            "service": "crm-api",
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
