"""
Service de chiffrement pour les données sensibles (API keys)

Utilise Fernet (AES-256) pour chiffrer/déchiffrer de manière symétrique.
La clé de chiffrement doit être stockée dans .env (ENCRYPTION_KEY).
"""

import os
from typing import Optional

from cryptography.fernet import Fernet


class EncryptionService:
    """
    Service de chiffrement symétrique pour protéger les API keys en base de données

    Usage:
        encryption = EncryptionService()
        encrypted = encryption.encrypt("sk-ant-api03-xxxxx")
        decrypted = encryption.decrypt(encrypted)
    """

    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialise le service avec une clé de chiffrement

        Args:
            encryption_key: Clé Fernet base64 (32 bytes). Si None, utilise ENCRYPTION_KEY depuis .env
        """
        if encryption_key is None:
            encryption_key = os.getenv("ENCRYPTION_KEY")

        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY non configurée. "
                "Générez-en une avec: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )

        try:
            self.cipher = Fernet(
                encryption_key.encode() if isinstance(encryption_key, str) else encryption_key
            )
        except Exception as e:
            raise ValueError(f"Clé de chiffrement invalide: {e}")

    def encrypt(self, plaintext: str) -> str:
        """
        Chiffre une chaîne de caractères

        Args:
            plaintext: Texte en clair (ex: "sk-ant-api03-xxxxx")

        Returns:
            Texte chiffré en base64 (ex: "gAAAAABl...")
        """
        if not plaintext:
            return ""

        try:
            encrypted_bytes = self.cipher.encrypt(plaintext.encode("utf-8"))
            return encrypted_bytes.decode("utf-8")
        except Exception as e:
            raise ValueError(f"Erreur lors du chiffrement: {e}")

    def decrypt(self, ciphertext: str) -> str:
        """
        Déchiffre une chaîne de caractères

        Args:
            ciphertext: Texte chiffré (ex: "gAAAAABl...")

        Returns:
            Texte en clair (ex: "sk-ant-api03-xxxxx")
        """
        if not ciphertext:
            return ""

        try:
            decrypted_bytes = self.cipher.decrypt(ciphertext.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            raise ValueError(f"Erreur lors du déchiffrement: {e}")

    def is_encrypted(self, text: str) -> bool:
        """
        Vérifie si une chaîne semble être chiffrée

        Args:
            text: Chaîne à vérifier

        Returns:
            True si le texte semble chiffré (commence par "gAAAAA")
        """
        if not text:
            return False
        # Les textes chiffrés Fernet commencent par "gAAAAA" en base64
        return text.startswith("gAAAAA")


def generate_encryption_key() -> str:
    """
    Génère une nouvelle clé de chiffrement Fernet

    Returns:
        Clé de chiffrement base64 (à stocker dans .env)

    Usage:
        python -c "from core.encryption import generate_encryption_key; print(generate_encryption_key())"
    """
    return Fernet.generate_key().decode()


# Instance globale (singleton pattern)
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """
    Retourne l'instance globale du service de chiffrement (singleton)

    Returns:
        Instance EncryptionService
    """
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service


def encrypt_value(plaintext: str) -> str:
    """
    Helper pour chiffrer une valeur (utilise le service global)

    Args:
        plaintext: Texte en clair

    Returns:
        Texte chiffré
    """
    return get_encryption_service().encrypt(plaintext)


def decrypt_value(ciphertext: str) -> str:
    """
    Helper pour déchiffrer une valeur (utilise le service global)

    Args:
        ciphertext: Texte chiffré

    Returns:
        Texte en clair
    """
    return get_encryption_service().decrypt(ciphertext)
