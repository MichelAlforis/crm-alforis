import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from models.contact import Contact
from models.email_campaign import (
    CampaignEmail,
    CampaignStatus,
    EmailCampaign,
    EmailStatus,
    EmailTemplate,
)
from models.organisation import Organisation
from models.person import Person
from schemas.email_campaign import (
    EmailCampaignCreate,
    EmailCampaignUpdate,
    EmailPreview,
    EmailPreviewList,
    EmailPreviewRecipient,
    EmailTemplateCreate,
    EmailTemplateUpdate,
    RecipientFilters,
)


class EmailTemplateService:
    @staticmethod
    def create_template(db: Session, template: EmailTemplateCreate) -> EmailTemplate:
        # Extraire automatiquement les variables du template
        variables = set()
        for text in [template.subject, template.body_html]:
            # Recherche des variables au format {{variable}}
            found = re.findall(r"\{\{(\w+)\}\}", text)
            variables.update(found)

        db_template = EmailTemplate(
            name=template.name,
            subject=template.subject,
            body_html=template.body_html,
            body_text=template.body_text,
            variables=list(variables),
        )
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        return db_template

    @staticmethod
    def get_template(db: Session, template_id: int) -> Optional[EmailTemplate]:
        return db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()

    @staticmethod
    def list_templates(db: Session, skip: int = 0, limit: int = 100) -> List[EmailTemplate]:
        return db.query(EmailTemplate).offset(skip).limit(limit).all()

    @staticmethod
    def update_template(
        db: Session, template_id: int, template_update: EmailTemplateUpdate
    ) -> Optional[EmailTemplate]:
        db_template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
        if not db_template:
            return None

        update_data = template_update.model_dump(exclude_unset=True)

        # Recalculer les variables si le contenu change
        if "subject" in update_data or "body_html" in update_data:
            variables = set()
            subject = update_data.get("subject", db_template.subject)
            body_html = update_data.get("body_html", db_template.body_html)

            for text in [subject, body_html]:
                found = re.findall(r"\{\{(\w+)\}\}", text)
                variables.update(found)

            update_data["variables"] = list(variables)

        for key, value in update_data.items():
            setattr(db_template, key, value)

        db.commit()
        db.refresh(db_template)
        return db_template

    @staticmethod
    def delete_template(db: Session, template_id: int) -> bool:
        db_template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
        if not db_template:
            return False
        db.delete(db_template)
        db.commit()
        return True


class EmailCampaignService:
    @staticmethod
    def _build_recipient_query(db: Session, filters: RecipientFilters):
        """Construit la requête pour récupérer les destinataires selon les filtres"""

        if filters.target_type == "organisations":
            query = db.query(Organisation)

            conditions = []

            # Filtre par catégories
            if filters.organisation_categories:
                conditions.append(Organisation.category.in_(filters.organisation_categories))

            # Filtre par pays
            if filters.countries:
                conditions.append(Organisation.country.in_(filters.countries))

            # IDs spécifiques
            if filters.specific_ids:
                conditions.append(Organisation.id.in_(filters.specific_ids))

            # Exclusions
            if filters.exclude_ids:
                conditions.append(~Organisation.id.in_(filters.exclude_ids))

            # Email obligatoire
            conditions.append(Organisation.email.isnot(None))
            conditions.append(Organisation.email != "")

            if conditions:
                query = query.filter(and_(*conditions))

            return query

        else:  # contacts
            query = db.query(Person).join(Contact).join(Organisation)

            conditions = []

            # Filtre par langue
            if filters.languages:
                conditions.append(Person.language.in_(filters.languages))

            # Filtre par pays de l'organisation
            if filters.countries:
                conditions.append(Organisation.country.in_(filters.countries))

            # Filtre par catégories d'organisation
            if filters.organisation_categories:
                conditions.append(Organisation.category.in_(filters.organisation_categories))

            # IDs spécifiques
            if filters.specific_ids:
                conditions.append(Person.id.in_(filters.specific_ids))

            # Exclusions
            if filters.exclude_ids:
                conditions.append(~Person.id.in_(filters.exclude_ids))

            # Email obligatoire
            conditions.append(Person.email.isnot(None))
            conditions.append(Person.email != "")

            # Seulement les contacts principaux
            conditions.append(Contact.is_primary == True)

            if conditions:
                query = query.filter(and_(*conditions))

            return query

    @staticmethod
    def _get_personalization_data(
        recipient: Any, recipient_type: str, db: Session
    ) -> Dict[str, Any]:
        """Génère les données de personnalisation pour un destinataire"""

        if recipient_type == "organisations":
            return {
                "organisation_name": recipient.name or "",
                "organisation_email": recipient.email or "",
                "organisation_country": recipient.country or "",
                "organisation_city": recipient.city or "",
                "organisation_category": recipient.category or "",
            }
        else:  # contacts
            # Récupérer l'organisation du contact
            contact = db.query(Contact).filter(Contact.person_id == recipient.id).first()
            organisation = (
                db.query(Organisation).filter(Organisation.id == contact.organisation_id).first()
                if contact
                else None
            )

            return {
                "first_name": recipient.first_name or "",
                "last_name": recipient.last_name or "",
                "full_name": f"{recipient.first_name or ''} {recipient.last_name or ''}".strip(),
                "email": recipient.email or "",
                "language": recipient.language or "",
                "organisation_name": organisation.name if organisation else "",
                "organisation_country": organisation.country if organisation else "",
                "organisation_category": organisation.category if organisation else "",
            }

    @staticmethod
    def _personalize_content(content: str, data: Dict[str, Any]) -> str:
        """Remplace les variables dans le contenu par les données personnalisées"""
        result = content
        for key, value in data.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    @staticmethod
    def create_campaign(db: Session, campaign: EmailCampaignCreate) -> EmailCampaign:
        # Vérifier que le template existe
        template = db.query(EmailTemplate).filter(EmailTemplate.id == campaign.template_id).first()
        if not template:
            raise ValueError(f"Template {campaign.template_id} not found")

        # Compter les destinataires
        query = EmailCampaignService._build_recipient_query(db, campaign.recipient_filters)
        total_recipients = query.count()

        db_campaign = EmailCampaign(
            name=campaign.name,
            description=campaign.description,
            template_id=campaign.template_id,
            recipient_filters=campaign.recipient_filters.model_dump(),
            total_recipients=total_recipients,
            batch_size=campaign.batch_size,
            delay_between_batches=campaign.delay_between_batches,
            scheduled_at=campaign.scheduled_at,
            status=CampaignStatus.DRAFT,
        )
        db.add(db_campaign)
        db.commit()
        db.refresh(db_campaign)
        return db_campaign

    @staticmethod
    def get_campaign(db: Session, campaign_id: int) -> Optional[EmailCampaign]:
        return db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()

    @staticmethod
    def list_campaigns(db: Session, skip: int = 0, limit: int = 100) -> List[EmailCampaign]:
        return (
            db.query(EmailCampaign)
            .order_by(EmailCampaign.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_campaign(
        db: Session, campaign_id: int, campaign_update: EmailCampaignUpdate
    ) -> Optional[EmailCampaign]:
        db_campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not db_campaign:
            return None

        # Ne peut pas modifier une campagne en cours d'envoi
        if db_campaign.status in [CampaignStatus.SENDING, CampaignStatus.COMPLETED]:
            raise ValueError("Cannot modify campaign that is sending or completed")

        update_data = campaign_update.model_dump(exclude_unset=True)

        # Si les filtres changent, recalculer le nombre de destinataires
        if "recipient_filters" in update_data:
            filters = RecipientFilters(**update_data["recipient_filters"])
            query = EmailCampaignService._build_recipient_query(db, filters)
            update_data["total_recipients"] = query.count()
            update_data["recipient_filters"] = filters.model_dump()

        for key, value in update_data.items():
            setattr(db_campaign, key, value)

        db.commit()
        db.refresh(db_campaign)
        return db_campaign

    @staticmethod
    def preview_campaign(
        db: Session, campaign_id: int, page: int = 1, page_size: int = 10
    ) -> EmailPreviewList:
        """Génère une prévisualisation des emails pour la campagne"""

        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        template = db.query(EmailTemplate).filter(EmailTemplate.id == campaign.template_id).first()
        if not template:
            raise ValueError(f"Template {campaign.template_id} not found")

        # Construire la requête des destinataires
        filters = RecipientFilters(**campaign.recipient_filters)
        query = EmailCampaignService._build_recipient_query(db, filters)

        total = query.count()

        # Pagination
        offset = (page - 1) * page_size
        recipients = query.offset(offset).limit(page_size).all()

        # Générer les prévisualisations
        previews = []
        for recipient in recipients:
            recipient_type = filters.target_type.value.rstrip(
                "s"
            )  # "organisations" -> "organisation"

            # Données de personnalisation
            personalization_data = EmailCampaignService._get_personalization_data(
                recipient, filters.target_type.value, db
            )

            # Personnaliser le contenu
            subject = EmailCampaignService._personalize_content(
                template.subject, personalization_data
            )
            body_html = EmailCampaignService._personalize_content(
                template.body_html, personalization_data
            )
            body_text = (
                EmailCampaignService._personalize_content(template.body_text, personalization_data)
                if template.body_text
                else None
            )

            preview = EmailPreview(
                recipient=EmailPreviewRecipient(
                    id=recipient.id,
                    type=recipient_type,
                    name=(
                        recipient.name
                        if hasattr(recipient, "name")
                        else f"{recipient.first_name} {recipient.last_name}"
                    ),
                    email=recipient.email,
                    personalization_data=personalization_data,
                ),
                subject=subject,
                body_html=body_html,
                body_text=body_text,
            )
            previews.append(preview)

        total_pages = (total + page_size - 1) // page_size

        return EmailPreviewList(
            total=total, previews=previews, page=page, page_size=page_size, total_pages=total_pages
        )

    @staticmethod
    def prepare_campaign_emails(db: Session, campaign_id: int) -> int:
        """Prépare tous les emails de la campagne (génère les CampaignEmail)"""

        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        if campaign.status != CampaignStatus.DRAFT:
            raise ValueError("Can only prepare draft campaigns")

        template = db.query(EmailTemplate).filter(EmailTemplate.id == campaign.template_id).first()

        # Supprimer les emails existants (si on re-prépare)
        db.query(CampaignEmail).filter(CampaignEmail.campaign_id == campaign_id).delete()

        # Récupérer tous les destinataires
        filters = RecipientFilters(**campaign.recipient_filters)
        query = EmailCampaignService._build_recipient_query(db, filters)
        recipients = query.all()

        # Créer les CampaignEmail
        batch_number = 0
        emails_in_batch = 0

        for recipient in recipients:
            recipient_type = filters.target_type.value.rstrip("s")

            # Données de personnalisation
            personalization_data = EmailCampaignService._get_personalization_data(
                recipient, filters.target_type.value, db
            )

            # Personnaliser le contenu
            subject = EmailCampaignService._personalize_content(
                template.subject, personalization_data
            )
            body_html = EmailCampaignService._personalize_content(
                template.body_html, personalization_data
            )
            body_text = (
                EmailCampaignService._personalize_content(template.body_text, personalization_data)
                if template.body_text
                else None
            )

            recipient_name = (
                recipient.name
                if hasattr(recipient, "name")
                else f"{recipient.first_name} {recipient.last_name}"
            )

            campaign_email = CampaignEmail(
                campaign_id=campaign_id,
                recipient_type=recipient_type,
                recipient_id=recipient.id,
                recipient_email=recipient.email,
                recipient_name=recipient_name,
                subject=subject,
                body_html=body_html,
                body_text=body_text,
                personalization_data=personalization_data,
                status=EmailStatus.PENDING,
                batch_number=batch_number,
            )
            db.add(campaign_email)

            emails_in_batch += 1
            if emails_in_batch >= campaign.batch_size:
                batch_number += 1
                emails_in_batch = 0

        db.commit()

        return len(recipients)

    @staticmethod
    def get_campaign_emails(
        db: Session,
        campaign_id: int,
        status: Optional[EmailStatus] = None,
        batch_number: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CampaignEmail]:
        """Récupère les emails d'une campagne"""

        query = db.query(CampaignEmail).filter(CampaignEmail.campaign_id == campaign_id)

        if status:
            query = query.filter(CampaignEmail.status == status)

        if batch_number is not None:
            query = query.filter(CampaignEmail.batch_number == batch_number)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_campaign_statistics(db: Session, campaign_id: int) -> Dict[str, Any]:
        """Calcule les statistiques d'une campagne"""

        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        total = campaign.total_recipients
        sent = campaign.emails_sent
        failed = campaign.emails_failed
        opened = campaign.emails_opened
        clicked = campaign.emails_clicked

        return {
            "total_recipients": total,
            "emails_sent": sent,
            "emails_failed": failed,
            "emails_opened": opened,
            "emails_clicked": clicked,
            "open_rate": (opened / sent * 100) if sent > 0 else 0,
            "click_rate": (clicked / sent * 100) if sent > 0 else 0,
            "failure_rate": (failed / total * 100) if total > 0 else 0,
        }
