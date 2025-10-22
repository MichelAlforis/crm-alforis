"""
Service de cryptage/décryptage pour les clés API

Utilise Fernet (cryptage symétrique) pour sécuriser les clés API en base de données
"""

from cryptography.fernet import Fernet
from core.config import settings
import base64
import hashlib


class CryptoService:
    """Service de cryptage/décryptage"""

    def __init__(self):
        # Générer une clé de cryptage à partir de SECRET_KEY
        # En production, utilisez une vraie clé dédiée stockée de manière sécurisée
        key = hashlib.sha256(settings.secret_key.encode()).digest()
        self.fernet = Fernet(base64.urlsafe_b64encode(key))

    def encrypt(self, plaintext: str) -> str:
        """
        Crypte une chaîne de caractères

        Args:
            plaintext: Texte en clair à crypter

        Returns:
            Texte crypté (base64)
        """
        if not plaintext:
            return ""

        encrypted_bytes = self.fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()

    def decrypt(self, ciphertext: str) -> str:
        """
        Décrypte une chaîne de caractères

        Args:
            ciphertext: Texte crypté (base64)

        Returns:
            Texte en clair
        """
        if not ciphertext:
            return ""

        try:
            decrypted_bytes = self.fernet.decrypt(ciphertext.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            raise ValueError(f"Erreur de décryptage: {str(e)}")


# Instance globale
crypto_service = CryptoService()
