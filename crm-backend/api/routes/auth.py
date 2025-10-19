from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import timedelta
from sqlalchemy.orm import Session

from core.security import create_access_token, decode_token, verify_password, get_password_hash
from core.config import settings
from core.database import get_db
from models.user import User
from models.role import Role, UserRole

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

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

class UserInfo(BaseModel):
    """Informations utilisateur"""
    email: str
    is_admin: bool = False

# ============= UTILISATEURS DE TEST =============
# TODO: Remplacer par une vraie table User en BD

TEST_USERS = {
    "admin@tpmfinance.com": {
        "password": "admin123",
        "email": "admin@tpmfinance.com",
        "is_admin": True,
        "name": "Administrator"
    },
    "user@tpmfinance.com": {
        "password": "user123",
        "email": "user@tpmfinance.com",
        "is_admin": False,
        "name": "Regular User"
    }
}

# ============= ROUTES =============

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    email: EmailStr = Form(...),
    password: str = Form(...)
):
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return {
        "access_token": create_access_token(
            data={"sub": user.email, "is_admin": user.is_admin},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        ),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }
@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)):
    
    """
    Authentifier un utilisateur et retourner un token JWT

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
    
    payload = None
    try:
        payload = await request.json()
    except Exception:
        form = await request.form()
        payload = {
            "email": form.get("username") or form.get("email"),
            "password": form.get("password"),
        }

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing credentials",
        )

    credentials = LoginRequest(**payload)

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
            .filter(
                Role.name
                == (UserRole.ADMIN if seed.get("is_admin") else UserRole.USER)
            )
            .first()
        )
        user = User(
            email=normalized_email,
            username=seed.get("email").split("@")[0],
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

    is_admin_flag = bool(
        getattr(user.role, "name", None) in {UserRole.ADMIN, UserRole.ADMIN.value, "admin"}
    )
    if normalized_email in TEST_USERS:
        is_admin_flag = bool(TEST_USERS[normalized_email].get("is_admin"))

    # Créer le token JWT
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_admin": is_admin_flag,
            "name": user.display_name,
        },
        expires_delta=timedelta(hours=settings.jwt_expiration_hours)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600
    )

@router.get("/me", response_model=UserInfo)
async def get_current_user_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
      "is_admin": true
    }
    ```
    """
    try:
        payload = decode_token(credentials.credentials)
        return UserInfo(
            email=payload.get("email", ""),
            is_admin=payload.get("is_admin", False)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Rafraîchir un token JWT existant

    **Header requis:**
    ```
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

    **Retourne:** Un nouveau token avec le même contenu mais un nouveau `exp`
    """
    try:
        # Décoder le token actuel
        payload = decode_token(credentials.credentials)
        
        # Créer un nouveau token avec les mêmes données
        new_token = create_access_token(
            data={
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "is_admin": payload.get("is_admin", False),
                "name": payload.get("name", "")
            },
            expires_delta=timedelta(hours=settings.jwt_expiration_hours)
        )
        
        return TokenResponse(
            access_token=new_token,
            token_type="bearer",
            expires_in=settings.jwt_expiration_hours * 3600
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalide ou expiré: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
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
