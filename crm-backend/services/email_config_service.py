"""
Service de gestion des configurations email

CRUD et gestion des clés API cryptées pour les providers d'email
"""

import json
import logging
from datetime import UTC, datetime
from typing import List, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from core.exceptions import ResourceNotFound, ValidationError
from models.email_config import EmailConfiguration, EmailProvider
from schemas.email_config import (
    EmailConfigurationCreate,
    EmailConfigurationTestRequest,
    EmailConfigurationTestResponse,
    EmailConfigurationUpdate,
)
from services.crypto import crypto_service

logger = logging.getLogger(__name__)


class EmailConfigurationService:
    """Service de gestion des configurations email"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[EmailConfiguration]:
        """Récupère toutes les configurations"""
        return self.db.query(EmailConfiguration).order_by(
            EmailConfiguration.is_active.desc(),
            EmailConfiguration.created_at.desc()
        ).all()

    def get_by_id(self, config_id: int) -> EmailConfiguration:
        """Récupère une configuration par ID"""
        config = self.db.query(EmailConfiguration).filter(
            EmailConfiguration.id == config_id
        ).first()
        if not config:
            raise ResourceNotFound("EmailConfiguration", config_id)
        return config

    def get_active(self) -> Optional[EmailConfiguration]:
        """Récupère la configuration active"""
        return self.db.query(EmailConfiguration).filter(
            EmailConfiguration.is_active == True
        ).first()

    def create(self, data: EmailConfigurationCreate, user_id: Optional[int] = None) -> EmailConfiguration:
        """
        Crée une nouvelle configuration

        Args:
            data: Données de création (avec api_key en clair)
            user_id: ID de l'utilisateur créateur

        Returns:
            EmailConfiguration créée
        """
        # Si is_active=True, désactiver les autres
        if data.is_active:
            self._deactivate_all()

        # Crypter la clé API
        api_key_encrypted = crypto_service.encrypt(data.api_key)

        # Crypter la config additionnelle si nécessaire
        provider_config_encrypted = None
        if data.provider == EmailProvider.MAILGUN and data.mailgun_domain:
            provider_config = {"domain": data.mailgun_domain}
            provider_config_encrypted = crypto_service.encrypt(json.dumps(provider_config))

        # Créer la configuration
        config = EmailConfiguration(
            name=data.name,
            description=data.description,
            provider=data.provider,
            api_key_encrypted=api_key_encrypted,
            provider_config=provider_config_encrypted,
            from_name=data.from_name,
            from_email=data.from_email,
            reply_to=data.reply_to,
            rate_limit_per_minute=data.rate_limit_per_minute,
            batch_size=data.batch_size,
            track_opens=data.track_opens,
            track_clicks=data.track_clicks,
            is_active=data.is_active,
            created_by=user_id,
        )

        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)

        logger.info(f"Email configuration created: {config.id} ({config.provider})")
        return config

    def update(
        self,
        config_id: int,
        data: EmailConfigurationUpdate,
        user_id: Optional[int] = None
    ) -> EmailConfiguration:
        """
        Met à jour une configuration

        Args:
            config_id: ID de la configuration
            data: Données de mise à jour
            user_id: ID de l'utilisateur

        Returns:
            EmailConfiguration mise à jour
        """
        config = self.get_by_id(config_id)

        # Si is_active=True, désactiver les autres
        if data.is_active and not config.is_active:
            self._deactivate_all()

        # Mettre à jour les champs simples
        update_fields = data.model_dump(exclude_unset=True, exclude={'api_key', 'mailgun_domain'})
        for key, value in update_fields.items():
            setattr(config, key, value)

        # Mettre à jour la clé API si fournie
        if data.api_key:
            config.api_key_encrypted = crypto_service.encrypt(data.api_key)

        # Mettre à jour la config provider si nécessaire
        if data.mailgun_domain and config.provider == EmailProvider.MAILGUN:
            provider_config = {"domain": data.mailgun_domain}
            config.provider_config = crypto_service.encrypt(json.dumps(provider_config))

        config.updated_by = user_id
        config.updated_at = datetime.now(UTC)

        self.db.commit()
        self.db.refresh(config)

        logger.info(f"Email configuration updated: {config.id}")
        return config

    def delete(self, config_id: int) -> None:
        """Supprime une configuration"""
        config = self.get_by_id(config_id)

        if config.is_active:
            raise ValidationError("Impossible de supprimer la configuration active")

        self.db.delete(config)
        self.db.commit()

        logger.info(f"Email configuration deleted: {config_id}")

    def activate(self, config_id: int) -> EmailConfiguration:
        """Active une configuration (et désactive les autres)"""
        config = self.get_by_id(config_id)

        self._deactivate_all()
        config.is_active = True

        self.db.commit()
        self.db.refresh(config)

        logger.info(f"Email configuration activated: {config_id}")
        return config

    def deactivate(self, config_id: int) -> EmailConfiguration:
        """Désactive une configuration"""
        config = self.get_by_id(config_id)
        config.is_active = False

        self.db.commit()
        self.db.refresh(config)

        logger.info(f"Email configuration deactivated: {config_id}")
        return config

    def test_connection(
        self,
        config_id: int,
        test_request: EmailConfigurationTestRequest
    ) -> EmailConfigurationTestResponse:
        """
        Teste une configuration en envoyant un email

        Args:
            config_id: ID de la configuration à tester
            test_request: Email de destination

        Returns:
            Résultat du test
        """
        config = self.get_by_id(config_id)

        # Décrypter la clé API
        api_key = crypto_service.decrypt(config.api_key_encrypted)

        # Décrypter la config provider si nécessaire
        provider_config = None
        if config.provider_config:
            provider_config_str = crypto_service.decrypt(config.provider_config)
            provider_config = json.loads(provider_config_str)

        # Tenter l'envoi d'un email de test
        try:
            if config.provider == EmailProvider.RESEND:
                success, error = self._test_resend(api_key, test_request.test_email, config)
            elif config.provider == EmailProvider.SENDGRID:
                success, error = self._test_sendgrid(api_key, test_request.test_email, config)
            elif config.provider == EmailProvider.MAILGUN:
                domain = provider_config.get("domain") if provider_config else None
                if not domain:
                    raise ValidationError("Mailgun domain manquant")
                success, error = self._test_mailgun(api_key, domain, test_request.test_email, config)
            else:
                raise ValidationError(f"Provider {config.provider} non supporté")

            # Mettre à jour le statut du test
            config.last_tested_at = datetime.now(UTC)
            config.test_status = "success" if success else "failed"
            config.test_error = error if not success else None
            self.db.commit()

            return EmailConfigurationTestResponse(
                success=success,
                message="Email de test envoyé avec succès" if success else "Échec de l'envoi",
                provider=config.provider,
                tested_at=config.last_tested_at,
                error=error if not success else None
            )

        except Exception as e:
            logger.exception(f"Test connection failed for config {config_id}: {e}")
            config.last_tested_at = datetime.now(UTC)
            config.test_status = "failed"
            config.test_error = str(e)
            self.db.commit()

            return EmailConfigurationTestResponse(
                success=False,
                message="Erreur lors du test",
                provider=config.provider,
                tested_at=config.last_tested_at,
                error=str(e)
            )

    def _deactivate_all(self) -> None:
        """Désactive toutes les configurations"""
        self.db.query(EmailConfiguration).update({"is_active": False})

    def _test_resend(self, api_key: str, test_email: str, config: EmailConfiguration) -> tuple[bool, Optional[str]]:
        """Teste Resend"""
        import requests

        try:
            # Format from_email selon Resend : "Name <email@domain.com>" ou juste "email@domain.com"
            from_email = config.from_email or 'onboarding@resend.dev'
            if config.from_name and from_email != 'onboarding@resend.dev':
                # Nom uniquement pour les domaines vérifiés
                from_field = f"{config.from_name} <{from_email}>"
            else:
                # Email seul pour onboarding@resend.dev
                from_field = from_email

            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_field,
                    "to": [test_email],
                    "subject": "[TEST] Configuration Resend - CRM",
                    "html": "<p>Ceci est un email de test de votre configuration Resend.</p><p><strong>Provider:</strong> Resend</p><p><strong>Configuration:</strong> " + config.name + "</p>"
                },
                timeout=10
            )
            response.raise_for_status()
            return True, None
        except requests.exceptions.HTTPError as e:
            # Capturer le détail de l'erreur Resend
            error_detail = e.response.text if e.response else str(e)
            return False, f"{e.response.status_code} {e.response.reason}: {error_detail}"
        except Exception as e:
            return False, str(e)

    def _test_sendgrid(self, api_key: str, test_email: str, config: EmailConfiguration) -> tuple[bool, Optional[str]]:
        """Teste SendGrid"""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            mail = Mail(
                from_email=(config.from_email or 'noreply@example.com', config.from_name or 'CRM'),
                to_emails=[test_email],
                subject="[TEST] Configuration SendGrid - CRM",
                html_content="<p>Ceci est un email de test de votre configuration SendGrid.</p>"
            )

            sg = SendGridAPIClient(api_key)
            response = sg.send(mail)
            return True, None
        except Exception as e:
            return False, str(e)

    def _test_mailgun(
        self,
        api_key: str,
        domain: str,
        test_email: str,
        config: EmailConfiguration
    ) -> tuple[bool, Optional[str]]:
        """Teste Mailgun"""
        import requests

        try:
            response = requests.post(
                f"https://api.mailgun.net/v3/{domain}/messages",
                auth=("api", api_key),
                data={
                    "from": f"{config.from_name or 'CRM'} <{config.from_email or 'noreply@example.com'}>",
                    "to": [test_email],
                    "subject": "[TEST] Configuration Mailgun - CRM",
                    "html": "<p>Ceci est un email de test de votre configuration Mailgun.</p>"
                },
                timeout=10
            )
            response.raise_for_status()
            return True, None
        except Exception as e:
            return False, str(e)


    def get_decrypted_config(self, config: EmailConfiguration) -> dict:
        """
        Retourne la configuration décryptée (usage interne seulement)

        Returns:
            dict avec api_key et provider_config décryptés
        """
        result = {
            "api_key": crypto_service.decrypt(config.api_key_encrypted),
            "provider_config": None
        }

        if config.provider_config:
            provider_config_str = crypto_service.decrypt(config.provider_config)
            result["provider_config"] = json.loads(provider_config_str)

        return result
