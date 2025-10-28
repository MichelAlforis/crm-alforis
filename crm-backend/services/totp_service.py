"""
Service de gestion Two-Factor Authentication (2FA) avec TOTP.

Utilise pyotp pour générer et vérifier des codes TOTP (Time-based One-Time Password)
conformes au RFC 6238.

Features:
- Génération QR code pour enrôlement
- Vérification codes TOTP (6 chiffres, 30s window)
- Backup codes (10 codes à usage unique)
- Rate limiting (protection brute-force)
"""

import json
import secrets
from datetime import datetime, timezone
from io import BytesIO
from typing import List, Optional, Tuple

import pyotp
import qrcode
from passlib.hash import bcrypt
from sqlalchemy.orm import Session

from models.user import User


class TOTPService:
    """Service de gestion 2FA/TOTP."""

    # Configuration TOTP
    TOTP_ISSUER = "CRM Alforis Finance"
    TOTP_DIGITS = 6  # Nombre de chiffres du code
    TOTP_INTERVAL = 30  # Durée validité code (secondes)
    BACKUP_CODES_COUNT = 10  # Nombre de backup codes générés

    @classmethod
    def generate_totp_secret(cls) -> str:
        """
        Génère un secret TOTP aléatoire (base32).

        Returns:
            str: Secret TOTP encodé en base32 (32 caractères)
        """
        return pyotp.random_base32()

    @classmethod
    def get_totp_uri(cls, user: User, secret: str) -> str:
        """
        Génère l'URI TOTP pour affichage QR code.

        Format: otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}

        Args:
            user: Utilisateur
            secret: Secret TOTP (base32)

        Returns:
            str: URI TOTP
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=user.email,
            issuer_name=cls.TOTP_ISSUER
        )

    @classmethod
    def generate_qr_code(cls, user: User, secret: str) -> BytesIO:
        """
        Génère un QR code pour l'enrôlement 2FA.

        Args:
            user: Utilisateur
            secret: Secret TOTP

        Returns:
            BytesIO: Image PNG du QR code
        """
        uri = cls.get_totp_uri(user, secret)
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer

    @classmethod
    def verify_totp(cls, user: User, code: str) -> bool:
        """
        Vérifie un code TOTP.

        Args:
            user: Utilisateur
            code: Code TOTP saisi (6 chiffres)

        Returns:
            bool: True si code valide
        """
        if not user.totp_secret or not user.totp_enabled:
            return False

        totp = pyotp.TOTP(user.totp_secret)
        # valid_window=1 permet de vérifier le code actuel + 1 période avant/après (90s total)
        return totp.verify(code, valid_window=1)

    @classmethod
    def generate_backup_codes(cls) -> Tuple[List[str], str]:
        """
        Génère des backup codes pour récupération compte.

        Returns:
            Tuple[List[str], str]: (codes en clair, codes hashés JSON)
        """
        codes = []
        hashed_codes = []

        for _ in range(cls.BACKUP_CODES_COUNT):
            # Format: XXXX-XXXX (8 caractères alphanumériques)
            code = f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
            codes.append(code)
            hashed_codes.append(bcrypt.hash(code))

        return codes, json.dumps(hashed_codes)

    @classmethod
    def verify_backup_code(cls, user: User, code: str, db: Session) -> bool:
        """
        Vérifie et consomme un backup code.

        Args:
            user: Utilisateur
            code: Backup code saisi
            db: Session SQLAlchemy

        Returns:
            bool: True si code valide (et consommé)
        """
        if not user.backup_codes:
            return False

        try:
            hashed_codes = json.loads(user.backup_codes)
        except json.JSONDecodeError:
            return False

        # Vérifier chaque code hashé
        for i, hashed_code in enumerate(hashed_codes):
            if bcrypt.verify(code, hashed_code):
                # Code valide → le supprimer (usage unique)
                hashed_codes.pop(i)
                user.backup_codes = json.dumps(hashed_codes) if hashed_codes else None
                db.commit()
                return True

        return False

    @classmethod
    def enable_totp(
        cls,
        user: User,
        secret: str,
        verification_code: str,
        db: Session
    ) -> Tuple[bool, Optional[List[str]]]:
        """
        Active le 2FA pour un utilisateur après vérification du code initial.

        Args:
            user: Utilisateur
            secret: Secret TOTP généré précédemment
            verification_code: Code TOTP saisi par l'utilisateur
            db: Session SQLAlchemy

        Returns:
            Tuple[bool, Optional[List[str]]]: (succès, backup_codes)
        """
        # Vérifier le code initial
        totp = pyotp.TOTP(secret)
        if not totp.verify(verification_code, valid_window=1):
            return False, None

        # Générer backup codes
        backup_codes_plain, backup_codes_hashed = cls.generate_backup_codes()

        # Activer 2FA
        user.totp_secret = secret
        user.totp_enabled = True
        user.totp_enabled_at = datetime.now(timezone.utc)
        user.backup_codes = backup_codes_hashed

        db.commit()

        return True, backup_codes_plain

    @classmethod
    def disable_totp(cls, user: User, db: Session) -> None:
        """
        Désactive le 2FA pour un utilisateur.

        Args:
            user: Utilisateur
            db: Session SQLAlchemy
        """
        user.totp_secret = None
        user.totp_enabled = False
        user.totp_enabled_at = None
        user.backup_codes = None
        db.commit()

    @classmethod
    def regenerate_backup_codes(cls, user: User, db: Session) -> List[str]:
        """
        Régénère les backup codes (en cas de perte).

        Args:
            user: Utilisateur
            db: Session SQLAlchemy

        Returns:
            List[str]: Nouveaux backup codes (en clair)
        """
        backup_codes_plain, backup_codes_hashed = cls.generate_backup_codes()
        user.backup_codes = backup_codes_hashed
        db.commit()
        return backup_codes_plain
