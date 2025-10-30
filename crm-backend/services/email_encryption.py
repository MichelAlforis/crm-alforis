"""
Email Encryption Service - AES-256 pour passwords IMAP/SMTP

Utilise cryptography.fernet (AES-256-CBC avec HMAC)
La clé est dans .env: EMAIL_ENCRYPTION_KEY
"""

import os
import base64
from cryptography.fernet import Fernet


def get_encryption_key() -> bytes:
    """
    Récupère la clé de chiffrement depuis .env

    Si pas configurée, en génère une (DEV ONLY!)
    """
    key = os.getenv("EMAIL_ENCRYPTION_KEY")

    if not key:
        # DEV: génère une clé temporaire (warning!)
        print("⚠️  WARNING: EMAIL_ENCRYPTION_KEY not set! Generating temporary key (DEV ONLY)")
        return Fernet.generate_key()

    return key.encode()


def encrypt_password(plain_password: str) -> str:
    """
    Chiffre un mot de passe avec AES-256

    Returns: Base64 string (stockable en DB)
    """
    key = get_encryption_key()
    f = Fernet(key)

    encrypted = f.encrypt(plain_password.encode())
    return encrypted.decode()


def decrypt_password(encrypted_password: str) -> str:
    """
    Déchiffre un mot de passe

    Args:
        encrypted_password: Base64 string depuis DB

    Returns: Plain password
    """
    key = get_encryption_key()
    f = Fernet(key)

    decrypted = f.decrypt(encrypted_password.encode())
    return decrypted.decode()


# Usage:
# encrypted = encrypt_password("mon_password_ionos")
# plain = decrypt_password(encrypted)
