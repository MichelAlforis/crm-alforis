from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Optional
import secrets
import hashlib

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import create_access_token, decode_token, get_password_hash, verify_password
from models.role import Role, UserRole
from models.user import User
from services.transactional_email_service import TransactionalEmailService

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# ============= RATE LIMITING =============
# Rate limiting simple en mémoire (pour prod: utiliser Redis)


class RateLimiter:
    """Rate limiter simple pour protéger /login contre le brute-force"""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds  # 5 minutes par défaut
        self.attempts: Dict[str, list] = defaultdict(list)

    def is_allowed(self, identifier: str) -> bool:
        """Vérifie si une nouvelle tentative est autorisée"""
        now = datetime.now()
        # Nettoyer les anciennes tentatives
        self.attempts[identifier] = [
            attempt
            for attempt in self.attempts[identifier]
            if (now - attempt).total_seconds() < self.window_seconds
        ]

        # Vérifier le nombre de tentatives
        if len(self.attempts[identifier]) >= self.max_attempts:
            return False

        # Enregistrer la nouvelle tentative
        self.attempts[identifier].append(now)
        return True

    def reset(self, identifier: str):
        """Réinitialiser le compteur après un succès"""
        if identifier in self.attempts:
            del self.attempts[identifier]


# Singleton rate limiter (5 tentatives par IP sur 5 minutes)
login_rate_limiter = RateLimiter(max_attempts=5, window_seconds=300)

# ============= SCHEMAS =============


class LoginRequest(BaseModel):
    """Requête de login"""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Réponse contenant le token"""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # en secondes


class OutlookIntegrationInfo(BaseModel):
    """Informations sur l'intégration Outlook"""
    outlook_connected: bool = False
    outlook_token_expires_at: Optional[str] = None


class UserInfo(BaseModel):
    """Informations utilisateur"""

    email: str
    is_admin: bool = False
    outlook_integration: Optional[OutlookIntegrationInfo] = None


class ChangePasswordRequest(BaseModel):
    """Requête de changement de mot de passe"""

    current_password: str = Field(..., description="Mot de passe actuel")
    new_password: str = Field(
        ..., min_length=6, max_length=100, description="Nouveau mot de passe (min 6 caractères)"
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


class ForgotPasswordRequest(BaseModel):
    """Requête de réinitialisation de mot de passe"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Requête de nouveau mot de passe avec token"""
    token: str = Field(..., description="Token de réinitialisation reçu par email")
    new_password: str = Field(
        ..., min_length=6, max_length=100, description="Nouveau mot de passe (min 6 caractères)"
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


# ============= UTILISATEURS DE TEST =============
# TODO: Remplacer par une vraie table User en BD

TEST_USERS = {
    "admin@tpmfinance.com": {
        "password": "admin123",
        "email": "admin@tpmfinance.com",
        "is_admin": True,
        "name": "Administrator",
    },
    "user@tpmfinance.com": {
        "password": "user123",
        "email": "user@tpmfinance.com",
        "is_admin": False,
        "name": "Regular User",
    },
}

# ============= ROUTES =============


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authentifier un utilisateur et retourner un token JWT

    **Protection:** Rate limiting (5 tentatives / 5 min par IP)

    **Utilisateurs de test:**
    - Email: `admin@tpmfinance.com` / Password: `admin123` (Admin)
    - Email: `user@tpmfinance.com` / Password: `user123` (User)

    **Réponse:**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 86400
    }
    ```

    **Utilisation:**
    ```bash
    # 1. Login pour obtenir le token
    TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@tpmfinance.com","password":"admin123"}' \
      | jq -r '.access_token')

    # 2. Utiliser le token pour les requêtes
    curl -H "Authorization: Bearer $TOKEN" \
         http://localhost:8000/api/v1/investors
    ```
    """

    # Rate limiting par IP
    client_ip = request.client.host if request.client else "unknown"
    if not login_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives de connexion. Veuillez réessayer dans 5 minutes.",
        )

    # FastAPI a déjà parsé le JSON et validé avec Pydantic via le paramètre credentials

    # Vérifier les credentials via la base
    normalized_email = credentials.email.lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if user is None and normalized_email in TEST_USERS:
        seed = TEST_USERS[normalized_email]
        if seed["password"] != credentials.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
                headers={"WWW-Authenticate": "Bearer"},
            )

        role = (
            db.query(Role)
            .filter(Role.name == (UserRole.ADMIN if seed.get("is_admin") else UserRole.USER))
            .first()
        )

        # Vérifier si username existe déjà
        username = seed.get("email").split("@")[0]
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            username = f"{username}_{normalized_email.split('@')[0]}"

        user = User(
            email=normalized_email,
            username=username,
            full_name=seed.get("name"),
            hashed_password=get_password_hash(seed["password"]),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Déterminer is_admin : utiliser le rôle si disponible, sinon is_superuser
    is_admin_flag = False
    if user.role and getattr(user.role, "name", None) in {
        UserRole.ADMIN,
        UserRole.ADMIN.value,
        "admin",
    }:
        is_admin_flag = True
    elif user.is_superuser:
        is_admin_flag = True
    elif normalized_email in TEST_USERS:
        is_admin_flag = bool(TEST_USERS[normalized_email].get("is_admin"))

    # Créer le token JWT
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_admin": is_admin_flag,
            "name": user.display_name,
            "role": (
                {
                    "name": user.role.name if user.role else None,
                    "level": user.role.level if user.role else 0,
                }
                if user.role
                else None
            ),
        },
        expires_delta=timedelta(hours=settings.jwt_expiration_hours),
    )

    # Login réussi: réinitialiser le rate limiter
    login_rate_limiter.reset(client_ip)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600,
    )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Récupérer les informations de l'utilisateur connecté

    **Header requis:**
    ```
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

    **Réponse:**
    ```json
    {
      "email": "admin@tpmfinance.com",
      "is_admin": true,
      "outlook_integration": {
        "outlook_connected": true,
        "outlook_token_expires_at": "2025-11-01T12:00:00Z"
      }
    }
    ```
    """
    try:
        payload = decode_token(credentials.credentials)
        email = payload.get("email", "")
        is_admin = payload.get("is_admin", False)

        # Récupérer infos Outlook depuis la DB
        from models.user import User
        user = db.query(User).filter(User.email == email).first()

        outlook_integration = None
        if user:
            outlook_integration = OutlookIntegrationInfo(
                outlook_connected=user.outlook_connected,
                outlook_token_expires_at=user.outlook_token_expires_at.isoformat() if user.outlook_token_expires_at else None
            )

        return UserInfo(
            email=email,
            is_admin=is_admin,
            outlook_integration=outlook_integration
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Rafraîchir un token JWT (même expiré)

    **Usage:**
    - Permet de renouveler un token sans redemander les credentials
    - Accepte les tokens expirés (si signature valide)
    - Vérifie que l'utilisateur existe toujours et est actif
    - Retourne un nouveau token avec date d'expiration actualisée

    **Header requis:**
    ```
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

    **Réponse:**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 86400
    }
    ```
    """
    try:
        # Décoder le token (IGNORE l'expiration pour permettre le refresh)
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False}  # ← Clé : ignore l'expiration
        )

        # Vérifier que l'utilisateur existe toujours et est actif
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide: user_id manquant"
            )

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilisateur non trouvé ou désactivé"
            )

        # Recréer le payload avec les données actuelles de l'utilisateur
        is_admin_flag = False
        if user.role and getattr(user.role, "name", None) in {
            UserRole.ADMIN,
            UserRole.ADMIN.value,
            "admin",
        }:
            is_admin_flag = True
        elif user.is_superuser:
            is_admin_flag = True

        # Créer un nouveau token avec expiration renouvelée
        new_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "is_admin": is_admin_flag,
                "name": user.display_name,
                "role": (
                    {
                        "name": user.role.name if user.role else None,
                        "level": user.role.level if user.role else 0,
                    }
                    if user.role
                    else None
                ),
            },
            expires_delta=timedelta(hours=settings.jwt_expiration_hours),
        )

        return TokenResponse(
            access_token=new_token,
            token_type="bearer",
            expires_in=settings.jwt_expiration_hours * 3600,
        )

    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erreur lors du refresh: {str(e)}"
        )


@router.post("/logout")
async def logout():
    """
    Logout (côté client: supprimer le token du localStorage)

    Le logout côté serveur n'est nécessaire que si vous utilisez
    une blacklist de tokens. Pour une simple JWT sans state,
    le client supprime juste le token.
    """
    return {"message": "Logged out successfully"}


@router.put("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Changer le mot de passe de l'utilisateur connecté

    **Header requis:**
    ```
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

    **Body:**
    ```json
    {
      "current_password": "ancien_mot_de_passe",
      "new_password": "nouveau_mot_de_passe"
    }
    ```

    **Réponse:**
    ```json
    {
      "message": "Mot de passe mis à jour avec succès"
    }
    ```
    """
    try:
        # Décoder le token pour obtenir l'ID utilisateur
        payload = decode_token(credentials.credentials)
        user_id = int(payload.get("sub"))

        # Récupérer l'utilisateur
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé"
            )

        # Vérifier l'ancien mot de passe
        if not verify_password(request.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Mot de passe actuel incorrect"
            )

        # Hasher et sauvegarder le nouveau mot de passe
        user.hashed_password = get_password_hash(request.new_password)
        db.commit()

        return {"message": "Mot de passe mis à jour avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du changement de mot de passe: {str(e)}",
        )


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Demander un lien de réinitialisation de mot de passe

    **Body:**
    ```json
    {
      "email": "user@example.com"
    }
    ```

    **Réponse:**
    ```json
    {
      "message": "Si cet email existe, un lien de réinitialisation a été envoyé"
    }
    ```

    **Sécurité:**
    - Retourne toujours le même message (empêche l'énumération d'emails)
    - Token valide 1 heure
    - Token hashé en base (sécurité)
    """
    try:
        # Normaliser l'email
        normalized_email = request.email.lower()

        # Chercher l'utilisateur
        user = db.query(User).filter(User.email == normalized_email).first()

        # IMPORTANT: Ne pas révéler si l'email existe ou non (sécurité)
        if user and user.is_active:
            # Générer un token sécurisé (32 bytes = 64 caractères hex)
            raw_token = secrets.token_urlsafe(32)

            # Hasher le token avant stockage (comme un mot de passe)
            hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()

            # Sauvegarder le token hashé et son expiration (1 heure)
            user.reset_token = hashed_token
            user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)
            db.commit()

            # Envoyer l'email avec le raw_token (non hashé)
            reset_url = f"{settings.frontend_url}/auth/reset-password?token={raw_token}"

            # Envoyer l'email via Resend
            email_service = TransactionalEmailService()
            email_sent = await email_service.send_password_reset_email(
                to_email=user.email,
                reset_url=reset_url,
                user_name=user.display_name
            )

            if email_sent:
                print(f"[INFO] Password reset email sent to {user.email}")
            else:
                print(f"[WARN] Failed to send email, but token created. Reset URL: {reset_url}")

        # Retourner toujours le même message (sécurité: pas d'énumération d'emails)
        return {
            "message": "Si cet email existe, un lien de réinitialisation a été envoyé"
        }

    except Exception as e:
        db.rollback()
        # Ne pas révéler d'informations sur l'erreur au client
        print(f"[ERROR] Forgot password error: {str(e)}")
        return {
            "message": "Si cet email existe, un lien de réinitialisation a été envoyé"
        }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Réinitialiser le mot de passe avec un token valide

    **Body:**
    ```json
    {
      "token": "token_reçu_par_email",
      "new_password": "nouveau_mot_de_passe"
    }
    ```

    **Réponse:**
    ```json
    {
      "message": "Mot de passe réinitialisé avec succès"
    }
    ```

    **Erreurs:**
    - 400: Token invalide ou expiré
    - 500: Erreur serveur
    """
    try:
        # Hasher le token reçu pour comparaison
        hashed_token = hashlib.sha256(request.token.encode()).hexdigest()

        # Chercher l'utilisateur avec ce token
        user = db.query(User).filter(
            User.reset_token == hashed_token,
            User.reset_token_expires_at > datetime.utcnow()  # Token non expiré
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token invalide ou expiré"
            )

        # Vérifier que l'utilisateur est actif
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compte utilisateur désactivé"
            )

        # Mettre à jour le mot de passe
        user.hashed_password = get_password_hash(request.new_password)

        # Invalider le token (usage unique)
        user.reset_token = None
        user.reset_token_expires_at = None

        db.commit()

        return {"message": "Mot de passe réinitialisé avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la réinitialisation: {str(e)}"
        )
