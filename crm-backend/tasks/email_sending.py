"""
Tâches Celery pour l'envoi d'emails par lots
"""
import time
from typing import List
from sqlalchemy.orm import Session
from models.database import SessionLocal
from models.email_campaign import EmailCampaign, CampaignEmail, CampaignStatus, EmailStatus
from services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)

# Si Celery est disponible
try:
    from celery import Celery, Task

    celery_app = Celery(
        'email_tasks',
        broker='redis://redis:6379/0',
        backend='redis://redis:6379/0'
    )

    celery_app.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
    )

    @celery_app.task(bind=True, max_retries=3)
    def send_campaign_batch(self: Task, campaign_id: int, batch_number: int):
        """Envoie un lot d'emails pour une campagne"""
        db = SessionLocal()
        try:
            campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return

            # Récupérer les emails du batch
            emails = db.query(CampaignEmail).filter(
                CampaignEmail.campaign_id == campaign_id,
                CampaignEmail.batch_number == batch_number,
                CampaignEmail.status == EmailStatus.PENDING
            ).all()

            if not emails:
                logger.info(f"No pending emails in batch {batch_number} for campaign {campaign_id}")
                return

            logger.info(f"Sending batch {batch_number} for campaign {campaign_id} ({len(emails)} emails)")

            email_service = EmailService()

            for email in emails:
                try:
                    # Envoyer l'email
                    success = email_service.send_email(
                        to_email=email.recipient_email,
                        to_name=email.recipient_name,
                        subject=email.subject,
                        html_content=email.body_html,
                        text_content=email.body_text,
                        campaign_id=campaign_id,
                        email_id=email.id
                    )

                    if success:
                        email.status = EmailStatus.SENT
                        email.sent_at = db.func.now()
                        campaign.emails_sent += 1
                    else:
                        email.status = EmailStatus.FAILED
                        email.error_message = "Failed to send email"
                        campaign.emails_failed += 1

                    db.commit()

                    # Petit délai entre chaque email (rate limiting)
                    time.sleep(0.1)

                except Exception as e:
                    logger.error(f"Error sending email {email.id}: {str(e)}")
                    email.status = EmailStatus.FAILED
                    email.error_message = str(e)
                    campaign.emails_failed += 1
                    db.commit()

            logger.info(f"Batch {batch_number} completed for campaign {campaign_id}")

            # Vérifier si la campagne est terminée
            remaining = db.query(CampaignEmail).filter(
                CampaignEmail.campaign_id == campaign_id,
                CampaignEmail.status == EmailStatus.PENDING
            ).count()

            if remaining == 0:
                campaign.status = CampaignStatus.COMPLETED
                campaign.completed_at = db.func.now()
                db.commit()
                logger.info(f"Campaign {campaign_id} completed")

        except Exception as e:
            logger.error(f"Error in send_campaign_batch: {str(e)}")
            raise self.retry(exc=e, countdown=60)
        finally:
            db.close()

    @celery_app.task
    def start_campaign_sending(campaign_id: int):
        """Démarre l'envoi d'une campagne en planifiant tous les lots"""
        db = SessionLocal()
        try:
            campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return

            # Vérifier que la campagne est prête
            if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
                logger.error(f"Campaign {campaign_id} is not ready to send (status: {campaign.status})")
                return

            # Compter le nombre de lots
            max_batch = db.query(db.func.max(CampaignEmail.batch_number)).filter(
                CampaignEmail.campaign_id == campaign_id
            ).scalar() or 0

            num_batches = max_batch + 1

            logger.info(f"Starting campaign {campaign_id} with {num_batches} batches")

            # Marquer la campagne comme en cours
            campaign.status = CampaignStatus.SENDING
            campaign.started_at = db.func.now()
            db.commit()

            # Planifier l'envoi de chaque lot avec un délai
            for batch_num in range(num_batches):
                delay_seconds = batch_num * campaign.delay_between_batches
                send_campaign_batch.apply_async(
                    args=[campaign_id, batch_num],
                    countdown=delay_seconds
                )

            logger.info(f"Scheduled {num_batches} batches for campaign {campaign_id}")

        except Exception as e:
            logger.error(f"Error in start_campaign_sending: {str(e)}")
            raise
        finally:
            db.close()

except ImportError:
    # Celery n'est pas disponible, on fournit des fonctions synchrones de fallback
    logger.warning("Celery not available, using synchronous email sending")

    def send_campaign_batch(campaign_id: int, batch_number: int):
        """Version synchrone de l'envoi d'un lot"""
        db = SessionLocal()
        try:
            campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return

            emails = db.query(CampaignEmail).filter(
                CampaignEmail.campaign_id == campaign_id,
                CampaignEmail.batch_number == batch_number,
                CampaignEmail.status == EmailStatus.PENDING
            ).all()

            if not emails:
                return

            email_service = EmailService()

            for email in emails:
                try:
                    success = email_service.send_email(
                        to_email=email.recipient_email,
                        to_name=email.recipient_name,
                        subject=email.subject,
                        html_content=email.body_html,
                        text_content=email.body_text,
                        campaign_id=campaign_id,
                        email_id=email.id
                    )

                    if success:
                        email.status = EmailStatus.SENT
                        email.sent_at = db.func.now()
                        campaign.emails_sent += 1
                    else:
                        email.status = EmailStatus.FAILED
                        campaign.emails_failed += 1

                    db.commit()
                    time.sleep(0.1)

                except Exception as e:
                    logger.error(f"Error sending email {email.id}: {str(e)}")
                    email.status = EmailStatus.FAILED
                    email.error_message = str(e)
                    campaign.emails_failed += 1
                    db.commit()

            # Vérifier si terminé
            remaining = db.query(CampaignEmail).filter(
                CampaignEmail.campaign_id == campaign_id,
                CampaignEmail.status == EmailStatus.PENDING
            ).count()

            if remaining == 0:
                campaign.status = CampaignStatus.COMPLETED
                campaign.completed_at = db.func.now()
                db.commit()

        finally:
            db.close()

    def start_campaign_sending(campaign_id: int):
        """Version synchrone du démarrage de campagne"""
        db = SessionLocal()
        try:
            campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
            if not campaign:
                return

            if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
                return

            max_batch = db.query(db.func.max(CampaignEmail.batch_number)).filter(
                CampaignEmail.campaign_id == campaign_id
            ).scalar() or 0

            num_batches = max_batch + 1

            campaign.status = CampaignStatus.SENDING
            campaign.started_at = db.func.now()
            db.commit()

            # Envoyer tous les lots de manière synchrone (pas recommandé pour production)
            for batch_num in range(num_batches):
                send_campaign_batch(campaign_id, batch_num)
                if batch_num < num_batches - 1:
                    time.sleep(campaign.delay_between_batches)

        finally:
            db.close()


class EmailService:
    """Service d'envoi d'emails (à adapter selon votre provider)"""

    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: str = None,
        campaign_id: int = None,
        email_id: int = None
    ) -> bool:
        """
        Envoie un email via votre provider (SendGrid, AWS SES, etc.)

        À IMPLÉMENTER selon votre provider
        """
        try:
            # Exemple avec SendGrid (à décommenter et adapter)
            # from sendgrid import SendGridAPIClient
            # from sendgrid.helpers.mail import Mail
            #
            # message = Mail(
            #     from_email='noreply@votredomaine.com',
            #     to_emails=to_email,
            #     subject=subject,
            #     html_content=html_content,
            #     plain_text_content=text_content
            # )
            #
            # # Ajouter des custom args pour le tracking
            # if campaign_id:
            #     message.custom_args = {
            #         'campaign_id': str(campaign_id),
            #         'email_id': str(email_id)
            #     }
            #
            # sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            # response = sg.send(message)
            #
            # return response.status_code in [200, 201, 202]

            # Pour l'instant, on simule un envoi réussi
            logger.info(f"Sending email to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False
