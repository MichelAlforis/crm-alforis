"""
Routes API pour Two-Factor Authentication (2FA).

Endpoints:
- POST /api/v1/auth/2fa/setup - Générer QR code pour enrôlement
- POST /api/v1/auth/2fa/enable - Activer 2FA après vérification code
- POST /api/v1/auth/2fa/disable - Désactiver 2FA
- POST /api/v1/auth/2fa/verify - Vérifier code TOTP lors du login
- POST /api/v1/auth/2fa/backup-codes/regenerate - Régénérer backup codes
- GET /api/v1/auth/2fa/status - Statut 2FA utilisateur
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.totp_service import TOTPService

router = APIRouter(prefix="/auth/2fa", tags=["2fa"])


# ============================================================
# Schemas Pydantic
# ============================================================

class TOTPSetupResponse(BaseModel):
    """Réponse endpoint setup."""
    secret: str = Field(..., description="Secret TOTP (base32) à conserver temporairement")
    qr_code_url: str = Field(..., description="URL pour récupérer le QR code")
    manual_entry_key: str = Field(..., description="Clé pour saisie manuelle (apps ne supportant pas QR)")


class TOTPEnableRequest(BaseModel):
    """Requête activation 2FA."""
    secret: str = Field(..., description="Secret TOTP reçu lors du setup")
    code: str = Field(..., min_length=6, max_length=6, description="Code TOTP à 6 chiffres")


class TOTPEnableResponse(BaseModel):
    """Réponse activation 2FA."""
    success: bool
    backup_codes: list[str] = Field(..., description="Backup codes à conserver précieusement")
    message: str


class TOTPVerifyRequest(BaseModel):
    """Requête vérification code TOTP."""
    code: str = Field(..., min_length=6, max_length=6, description="Code TOTP ou backup code")


class TOTPStatusResponse(BaseModel):
    """Statut 2FA utilisateur."""
    totp_enabled: bool
    totp_enabled_at: str | None
    backup_codes_remaining: int


# ============================================================
# Endpoints
# ============================================================

@router.post("/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Étape 1 : Génère un secret TOTP et un QR code pour l'enrôlement.

    L'utilisateur doit:
    1. Scanner le QR code avec une app (Google Authenticator, Authy, etc.)
    2. Appeler /enable avec le code affiché pour confirmer

    Returns:
        TOTPSetupResponse: Secret + URL QR code
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Si 2FA déjà actif, refuser setup
    if user.totp_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA déjà activé. Désactivez-le d'abord avec /disable."
        )

    # Générer secret TOTP
    secret = TOTPService.generate_totp_secret()

    return TOTPSetupResponse(
        secret=secret,
        qr_code_url=f"/api/v1/auth/2fa/qrcode?secret={secret}",
        manual_entry_key=secret  # Pour saisie manuelle
    )


@router.get("/qrcode")
async def get_qr_code(
    secret: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Génère l'image QR code pour enrôlement.

    Args:
        secret: Secret TOTP (reçu de /setup)

    Returns:
        StreamingResponse: Image PNG du QR code
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Générer QR code
    qr_buffer = TOTPService.generate_qr_code(user, secret)

    return StreamingResponse(
        qr_buffer,
        media_type="image/png",
        headers={"Content-Disposition": "inline; filename=totp_qrcode.png"}
    )


@router.post("/enable", response_model=TOTPEnableResponse)
async def enable_totp(
    request: TOTPEnableRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Étape 2 : Active le 2FA après vérification du code TOTP initial.

    Args:
        request: Secret + code TOTP

    Returns:
        TOTPEnableResponse: Backup codes (À CONSERVER ABSOLUMENT)
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA déjà activé")

    # Activer 2FA (vérifie le code automatiquement)
    success, backup_codes = TOTPService.enable_totp(
        user=user,
        secret=request.secret,
        verification_code=request.code,
        db=db
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Code TOTP invalide. Vérifiez l'heure de votre téléphone."
        )

    return TOTPEnableResponse(
        success=True,
        backup_codes=backup_codes,
        message="2FA activé avec succès. Conservez précieusement les backup codes."
    )


@router.post("/disable")
async def disable_totp(
    verify_request: TOTPVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Désactive le 2FA après vérification d'un code TOTP ou backup code.

    Args:
        verify_request: Code TOTP ou backup code

    Returns:
        dict: Confirmation désactivation
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA déjà désactivé")

    # Vérifier code TOTP ou backup code
    valid_totp = TOTPService.verify_totp(user, verify_request.code)
    valid_backup = TOTPService.verify_backup_code(user, verify_request.code, db) if not valid_totp else False

    if not (valid_totp or valid_backup):
        raise HTTPException(status_code=400, detail="Code invalide")

    # Désactiver 2FA
    TOTPService.disable_totp(user, db)

    return {"success": True, "message": "2FA désactivé avec succès"}


@router.post("/verify")
async def verify_totp_code(
    verify_request: TOTPVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Vérifie un code TOTP ou backup code (utilisé lors du login).

    Args:
        verify_request: Code TOTP ou backup code

    Returns:
        dict: Résultat vérification
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA non activé")

    # Vérifier TOTP
    valid_totp = TOTPService.verify_totp(user, verify_request.code)
    if valid_totp:
        return {"success": True, "method": "totp"}

    # Fallback: backup code
    valid_backup = TOTPService.verify_backup_code(user, verify_request.code, db)
    if valid_backup:
        return {
            "success": True,
            "method": "backup_code",
            "warning": "Backup code consommé. Régénérez-en si nécessaire."
        }

    raise HTTPException(status_code=400, detail="Code invalide")


@router.post("/backup-codes/regenerate")
async def regenerate_backup_codes(
    verify_request: TOTPVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Régénère les backup codes (en cas de perte).

    Nécessite un code TOTP valide pour confirmation.

    Args:
        verify_request: Code TOTP

    Returns:
        dict: Nouveaux backup codes
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA non activé")

    # Vérifier code TOTP
    if not TOTPService.verify_totp(user, verify_request.code):
        raise HTTPException(status_code=400, detail="Code TOTP invalide")

    # Régénérer backup codes
    new_codes = TOTPService.regenerate_backup_codes(user, db)

    return {
        "success": True,
        "backup_codes": new_codes,
        "message": "Nouveaux backup codes générés. Conservez-les précieusement."
    }


@router.get("/status", response_model=TOTPStatusResponse)
async def get_totp_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Récupère le statut 2FA de l'utilisateur connecté.

    Returns:
        TOTPStatusResponse: Statut 2FA
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Compter backup codes restants
    backup_codes_count = 0
    if user.backup_codes:
        try:
            import json
            backup_codes_count = len(json.loads(user.backup_codes))
        except:
            pass

    return TOTPStatusResponse(
        totp_enabled=user.totp_enabled,
        totp_enabled_at=user.totp_enabled_at.isoformat() if user.totp_enabled_at else None,
        backup_codes_remaining=backup_codes_count
    )
