"""
Service d'envoi d'emails transactionnels (password reset, etc.)
Utilise Resend API
"""
import logging
from typing import Optional
import requests

from core.config import settings

logger = logging.getLogger(__name__)


class TransactionalEmailService:
    """Service pour envoyer des emails transactionnels via Resend"""

    def __init__(self):
        self.api_key = settings.resend_api_key
        self.api_url = "https://api.resend.com/emails"
        self.from_email = settings.default_email_from_address
        self.from_name = settings.default_email_from_name

    async def send_password_reset_email(
        self,
        to_email: str,
        reset_url: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Envoie un email de réinitialisation de mot de passe

        Args:
            to_email: Email du destinataire
            reset_url: URL de réinitialisation avec token
            user_name: Nom de l'utilisateur (optionnel)

        Returns:
            bool: True si envoyé, False sinon
        """
        if not self.api_key:
            logger.warning("Resend API key not configured, email not sent")
            return False

        try:
            # Générer le HTML de l'email
            html_content = self._generate_reset_email_html(reset_url, user_name)

            # Préparer la requête
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": [to_email],
                "subject": "Réinitialisation de votre mot de passe",
                "html": html_content,
            }

            # Envoyer via Resend
            response = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                logger.info(f"Password reset email sent to {to_email}")
                return True
            else:
                logger.error(
                    f"Failed to send password reset email: {response.status_code} - {response.text}"
                )
                return False

        except Exception as e:
            logger.exception(f"Error sending password reset email: {str(e)}")
            return False

    def _generate_reset_email_html(self, reset_url: str, user_name: Optional[str] = None) -> str:
        """Génère le HTML de l'email de réinitialisation"""
        greeting = f"Bonjour {user_name}" if user_name else "Bonjour"

        return f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <div style="width: 64px; height: 64px; margin: 0 auto; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                                <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" r="4" fill="white" opacity="0.95" />
                                    <circle cx="44" cy="20" r="4" fill="white" opacity="0.95" />
                                    <circle cx="32" cy="35" r="4" fill="white" opacity="0.95" />
                                    <circle cx="20" cy="48" r="4" fill="white" opacity="0.95" />
                                    <circle cx="44" cy="48" r="4" fill="white" opacity="0.95" />
                                    <line x1="20" y1="20" x2="32" y2="35" stroke="white" stroke-width="2.5" opacity="0.7" stroke-linecap="round" />
                                    <line x1="44" y1="20" x2="32" y2="35" stroke="white" stroke-width="2.5" opacity="0.7" stroke-linecap="round" />
                                    <line x1="32" y1="35" x2="20" y2="48" stroke="white" stroke-width="2.5" opacity="0.7" stroke-linecap="round" />
                                    <line x1="32" y1="35" x2="44" y2="48" stroke="white" stroke-width="2.5" opacity="0.7" stroke-linecap="round" />
                                </svg>
                            </div>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">
                                Réinitialisation de mot de passe
                            </h1>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                {greeting},
                            </p>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{reset_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
                                            Réinitialiser mon mot de passe
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                Ce lien est valide pendant <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
                            </p>

                            <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                            </p>
                            <p style="margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: #9ca3af; word-break: break-all;">
                                {reset_url}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9ca3af; text-align: center;">
                                Cet email a été envoyé par CRM Finance<br>
                                © 2025 Tous droits réservés
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
