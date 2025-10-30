"""
Routes API Email Accounts - Multi-mail configuration (multi-tenant)

Endpoints:
✅ GET    /email-accounts           - Liste comptes email de la team
✅ POST   /email-accounts           - Créer un compte
✅ PATCH  /email-accounts/{id}      - Modifier (activer/désactiver)
✅ DELETE /email-accounts/{id}      - Supprimer
✅ POST   /email-accounts/{id}/test - Tester connexion
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from models.user import User
from models.user_email_account import UserEmailAccount
from services.email_encryption import encrypt_password, decrypt_password

logger = logging.getLogger("crm-api")

router = APIRouter(prefix="/email-accounts", tags=["email-accounts"])


# ========== SCHEMAS ==========

class EmailAccountCreate(BaseModel):
    """Création compte email"""
    email: EmailStr
    provider: str  # ionos, gmail, outlook, exchange, ovh, generic
    password: str
    server: Optional[str] = None  # imap.ionos.fr
    port: Optional[str] = "993"
    display_name: Optional[str] = None


class EmailAccountUpdate(BaseModel):
    """Mise à jour compte"""
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None
    display_name: Optional[str] = None


class EmailAccountResponse(BaseModel):
    """Réponse API"""
    id: int
    email: str
    provider: str
    display_name: Optional[str]
    is_active: bool
    is_primary: bool
    server: Optional[str]
    last_sync: Optional[datetime]
    sync_status: Optional[str]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TestConnectionResponse(BaseModel):
    """Résultat test connexion"""
    success: bool
    message: str
    details: Optional[dict] = None


# ========== ENDPOINTS ==========

@router.get("", response_model=List[EmailAccountResponse])
async def list_email_accounts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Liste tous les comptes email de la team (multi-tenant)
    """
    team_id = current_user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=400, detail="No team_id in token")

    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id
    ).order_by(
        UserEmailAccount.is_primary.desc(),
        UserEmailAccount.created_at.desc()
    ).all()

    # Map to response (sans credentials!)
    result = []
    for account in accounts:
        result.append(EmailAccountResponse(
            id=account.id,
            email=account.email,
            provider=account.provider,
            display_name=account.display_name,
            is_active=account.is_active,
            is_primary=account.is_primary,
            server=account.server,
            last_sync=None,  # TODO: implémenter sync tracking
            sync_status=None,
            error_message=None,
            created_at=account.created_at,
        ))

    return result


@router.post("", response_model=EmailAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_email_account(
    data: EmailAccountCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer un nouveau compte email

    Le mot de passe est chiffré avec AES-256 avant stockage.
    """
    team_id = current_user.get("team_id")
    user_id = current_user.get("user_id")

    if not team_id:
        raise HTTPException(status_code=400, detail="No team_id in token")

    # Vérifier si email existe déjà pour cette team
    existing = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id,
        UserEmailAccount.email == data.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email account already exists for this team"
        )

    # Chiffrer le mot de passe
    encrypted_pwd = encrypt_password(data.password)

    # Créer le compte
    account = UserEmailAccount(
        team_id=team_id,
        user_id=user_id,
        email=data.email,
        provider=data.provider,
        display_name=data.display_name or data.email,
        server=data.server,
        protocol="imap" if data.provider in ["ionos", "ovh", "generic"] else None,
        encrypted_password=encrypted_pwd,
        is_active=True,
        is_primary=False,
        consent_given=True,
        consent_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    logger.info(f"Email account created: {data.email} (provider: {data.provider}) for team {team_id}")

    return EmailAccountResponse(
        id=account.id,
        email=account.email,
        provider=account.provider,
        display_name=account.display_name,
        is_active=account.is_active,
        is_primary=account.is_primary,
        server=account.server,
        last_sync=None,
        sync_status=None,
        error_message=None,
        created_at=account.created_at,
    )


@router.patch("/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(
    account_id: int,
    data: EmailAccountUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Modifier un compte email (activer/désactiver, changer nom)
    """
    team_id = current_user.get("team_id")

    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")

    # Update fields
    if data.is_active is not None:
        account.is_active = data.is_active

    if data.is_primary is not None:
        # Si on marque comme principal, démarquer les autres
        if data.is_primary:
            db.query(UserEmailAccount).filter(
                UserEmailAccount.team_id == team_id,
                UserEmailAccount.id != account_id
            ).update({"is_primary": False})
        account.is_primary = data.is_primary

    if data.display_name is not None:
        account.display_name = data.display_name

    account.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(account)

    logger.info(f"Email account updated: {account.email} (id: {account_id})")

    return EmailAccountResponse(
        id=account.id,
        email=account.email,
        provider=account.provider,
        display_name=account.display_name,
        is_active=account.is_active,
        is_primary=account.is_primary,
        server=account.server,
        last_sync=None,
        sync_status=None,
        error_message=None,
        created_at=account.created_at,
    )


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer un compte email
    """
    team_id = current_user.get("team_id")

    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")

    email = account.email
    db.delete(account)
    db.commit()

    logger.info(f"Email account deleted: {email} (id: {account_id}) for team {team_id}")

    return None


@router.post("/{account_id}/test", response_model=TestConnectionResponse)
async def test_email_connection(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Tester la connexion IMAP/SMTP d'un compte email
    """
    team_id = current_user.get("team_id")

    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")

    # Test selon le provider
    if account.provider in ["ionos", "ovh", "generic"]:
        # Test IMAP
        try:
            import imaplib

            password = decrypt_password(account.encrypted_password)

            mail = imaplib.IMAP4_SSL(account.server, 993)
            mail.login(account.email, password)
            mail.select("INBOX")
            mail.logout()

            return TestConnectionResponse(
                success=True,
                message=f"✅ Connexion IMAP réussie à {account.server}",
                details={
                    "server": account.server,
                    "email": account.email,
                    "protocol": "IMAP",
                }
            )

        except Exception as e:
            logger.error(f"IMAP test failed for {account.email}: {e}")
            return TestConnectionResponse(
                success=False,
                message=f"❌ Erreur de connexion: {str(e)}",
                details={
                    "error": str(e),
                    "server": account.server,
                }
            )

    elif account.provider == "gmail":
        return TestConnectionResponse(
            success=False,
            message="Gmail OAuth non implémenté (TODO)",
            details={"provider": "gmail", "status": "not_implemented"}
        )

    elif account.provider == "outlook":
        return TestConnectionResponse(
            success=False,
            message="Outlook OAuth non implémenté (TODO)",
            details={"provider": "outlook", "status": "not_implemented"}
        )

    else:
        return TestConnectionResponse(
            success=False,
            message=f"Provider {account.provider} non supporté",
            details={"provider": account.provider}
        )


# ========== SYNC ENDPOINTS ==========

class SyncRequest(BaseModel):
    """Requête de synchronisation"""
    since_days: Optional[int] = 7
    limit: Optional[int] = None


class SyncResponse(BaseModel):
    """Réponse synchronisation"""
    account_id: int
    account_email: str
    fetched: int
    created: int
    skipped: int
    errors: int
    error_details: List[dict] = []


@router.post("/{account_id}/sync", response_model=SyncResponse)
async def sync_email_account(
    account_id: int,
    request: SyncRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Synchronise manuellement un compte email IMAP.
    
    Récupère les emails depuis les X derniers jours et les crée comme interactions.
    """
    team_id = current_user.get("team_id")
    if not team_id:
        user_identifier = current_user.get("user_id") or current_user.get("sub") or current_user.get("email")
        user = None

        if user_identifier is not None:
            try:
                user_id = int(user_identifier)
                user = db.query(User).filter(User.id == user_id).first()
            except (TypeError, ValueError):
                user = db.query(User).filter(User.email == str(user_identifier)).first()

        if user and getattr(user, "team_id", None):
            team_id = user.team_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No team_id in token"
            )

    # Récupérer le compte
    account = (
        db.query(UserEmailAccount)
        .filter(
            UserEmailAccount.id == account_id,
            UserEmailAccount.team_id == team_id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account {account_id} not found"
        )

    if not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account {account.email} is not active"
        )

    # Importer le service de sync
    from services.email_sync_service import EmailSyncService

    try:
        sync_service = EmailSyncService(db)
        stats = sync_service.sync_account(
            account,
            since_days=request.since_days,
            limit=request.limit,
        )

        return SyncResponse(**stats)

    except Exception as e:
        logger.error(f"Sync failed for account {account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )


@router.post("/sync-all", response_model=List[SyncResponse])
async def sync_all_accounts(
    request: SyncRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Synchronise tous les comptes email actifs de la team.
    
    Utile pour déclencher une synchronisation globale.
    """
    team_id = current_user.get("team_id")
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No team_id in token"
        )

    # Importer le service de sync
    from services.email_sync_service import EmailSyncService

    try:
        sync_service = EmailSyncService(db)
        results = sync_service.sync_all_active_accounts(
            team_id=team_id,
            since_days=request.since_days,
        )

        return [SyncResponse(**stats) for stats in results]

    except Exception as e:
        logger.error(f"Sync all failed for team {team_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync all failed: {str(e)}"
        )
