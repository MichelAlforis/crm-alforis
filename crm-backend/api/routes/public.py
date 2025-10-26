"""
Routes publiques - Accessibles sans authentification utilisateur.

Ces endpoints sont utilisés par le site public alforis.fr pour:
- Désinscription depuis les emails
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from core import get_db
from core.config import settings
from models.email import UnsubscribedEmail
from models.organisation import Organisation
from models.person import Person

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])


class UnsubscribePublicRequest(BaseModel):
    """Requête de désinscription depuis alforis.fr"""
    email: EmailStr
    send_id: int
    unsubscribed_at: Optional[datetime] = None
    source: str = "web"


class UnsubscribePublicResponse(BaseModel):
    """Réponse de désinscription"""
    success: bool
    message: str
    email: str


@router.post("/unsubscribe", response_model=UnsubscribePublicResponse)
async def public_unsubscribe(
    payload: UnsubscribePublicRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    """
    Endpoint public de désinscription appelé par alforis.fr.

    Authentification: Bearer token (webhook_secret)
    """
    try:
        # Vérifier le token Bearer
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid Authorization header"
            )

        token = authorization.replace("Bearer ", "")
        if token != settings.webhook_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        email_lower = payload.email.lower()
        unsubscribed_at = payload.unsubscribed_at or datetime.now(timezone.utc)

        # 1. Ajouter à la blacklist globale
        existing = db.query(UnsubscribedEmail).filter(
            UnsubscribedEmail.email == email_lower
        ).first()

        if not existing:
            unsubscribed = UnsubscribedEmail(
                email=email_lower,
                unsubscribed_at=unsubscribed_at,
                source=payload.source,
                reason="Désinscription depuis le site web",
            )
            db.add(unsubscribed)
            db.flush()

        # 2. Mettre à jour Person
        updated_people = db.query(Person).filter(
            Person.email == email_lower
        ).update(
            {"email_unsubscribed": True},
            synchronize_session=False
        )

        # 3. Mettre à jour Organisation
        updated_orgs = db.query(Organisation).filter(
            Organisation.email == email_lower
        ).update(
            {"email_unsubscribed": True},
            synchronize_session=False
        )

        db.commit()

        logger.info(
            "public_unsubscribe_success",
            extra={
                "email": email_lower,
                "send_id": payload.send_id,
                "source": payload.source,
                "updated_people": updated_people,
                "updated_orgs": updated_orgs,
            }
        )

        return UnsubscribePublicResponse(
            success=True,
            message="Vous êtes désabonné avec succès",
            email=email_lower
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("public_unsubscribe_error", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la désinscription: {str(e)}"
        )
