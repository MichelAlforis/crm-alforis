from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.events import EventType, emit_event
from models.email import EmailCampaignStatus, EmailProvider, EmailSend, EmailSendStatus
from schemas.base import PaginatedResponse
from schemas.email import (
    EmailCampaignCreate,
    EmailCampaignResponse,
    EmailCampaignScheduleRequest,
    EmailCampaignStatsResponse,
    EmailCampaignUpdate,
    EmailSendResponse,
    EmailTemplateCreate,
    EmailTemplateResponse,
    EmailTemplateUpdate,
)
from pydantic import BaseModel
from services.email_service import (
    EmailAnalyticsService,
    EmailCampaignService,
    EmailDeliveryService,
    EmailTemplateService,
)

router = APIRouter(prefix="/email", tags=["email"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    if not current_user:
        return None
    user_id = current_user.get("user_id")
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


@router.get("/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    only_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailTemplateService(db)
    templates = await service.get_library(only_active=only_active)
    return [EmailTemplateResponse.model_validate(tpl) for tpl in templates]


@router.post("/templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailTemplateService(db)
    template = await service.create(payload)
    await emit_event(
        EventType.EMAIL_TEMPLATE_CREATED,
        data={"template_id": template.id, "name": template.name},
        user_id=_extract_user_id(current_user),
    )
    return EmailTemplateResponse.model_validate(template)


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: int,
    payload: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailTemplateService(db)
    template = await service.update(template_id, payload)
    return EmailTemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer un template email"""
    from models.email import EmailTemplate
    from fastapi import HTTPException

    # Récupérer le template
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template introuvable")

    # Vérifier si utilisé dans des campagnes
    from models.email import EmailCampaign
    campaigns_using_template = db.query(EmailCampaign).filter(
        EmailCampaign.default_template_id == template_id
    ).count()

    if campaigns_using_template > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de supprimer ce template. Il est utilisé dans {campaigns_using_template} campagne(s)."
        )

    # Supprimer le template
    db.delete(template)
    db.commit()

    return None


@router.post("/templates/{template_id}/send-test")
async def send_test_email_from_template(
    template_id: int,
    test_email: str = Query(..., description="Email du destinataire de test"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Envoie un email de test à partir d'un template"""
    from models.email import EmailTemplate
    from fastapi import HTTPException

    # Récupérer le template
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Données de test
    test_data = {
        "first_name": "Test",
        "last_name": "User",
        "full_name": "Test User",
        "email": test_email,
        "organisation_name": "Organisation Test",
        "country": "France",
        "language": "fr",
    }

    # Remplacer les variables dans le sujet et le corps
    subject = template.subject
    body_html = template.html_content

    for key, value in test_data.items():
        subject = subject.replace(f"{{{{{key}}}}}", str(value))
        body_html = body_html.replace(f"{{{{{key}}}}}", str(value))

    try:
        # Récupérer la configuration email active
        from models.email_config import EmailConfiguration
        from services.email_config_service import EmailConfigurationService
        import os
        import requests

        email_config = db.query(EmailConfiguration).filter(
            EmailConfiguration.is_active == True
        ).first()

        if not email_config:
            raise HTTPException(
                status_code=400,
                detail="Aucune configuration email active. Veuillez configurer une API email dans les paramètres."
            )

        # Décrypter la clé API
        config_service = EmailConfigurationService(db)
        decrypted_config = config_service.get_decrypted_config(email_config)
        api_key = decrypted_config["api_key"]

        # Préparer le from_email
        from_email = email_config.from_email or "onboarding@resend.dev"
        from_name = email_config.from_name or "ALFORIS Finance"

        # Envoyer directement via l'API Resend
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": f"{from_name} <{from_email}>",
                "to": [test_email],
                "subject": f"[TEST] {subject}",
                "html": body_html,
            }
        )

        if response.status_code not in [200, 201]:
            raise Exception(f"Resend API error: {response.text}")

        return {
            "message": "Test email sent successfully",
            "to_email": test_email,
            "template_id": template_id,
            "resend_response": response.json()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")


# ============= RECIPIENT COUNT =============

class RecipientFilters(BaseModel):
    """Filtres pour sélectionner des destinataires"""
    target_type: str  # 'organisations' ou 'contacts'
    languages: Optional[List[str]] = None
    countries: Optional[List[str]] = None
    organisation_categories: Optional[List[str]] = None
    organisation_types: Optional[List[str]] = None  # INVESTOR, CLIENT, FOURNISSEUR
    cities: Optional[List[str]] = None  # Villes
    roles: Optional[List[str]] = None  # Fonction/rôle des personnes
    is_active: Optional[bool] = None  # Statut actif/inactif
    specific_ids: Optional[List[int]] = None
    exclude_ids: Optional[List[int]] = None


class RecipientCountResponse(BaseModel):
    """Réponse du comptage de destinataires"""
    count: int


@router.post("/campaigns/recipients/count", response_model=RecipientCountResponse)
async def count_recipients(
    filters: RecipientFilters,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Compter le nombre de destinataires correspondant aux filtres
    Utilisé pour prévisualiser le nombre de destinataires d'une campagne
    """
    from models.organisation import Organisation
    from models.person import Person, PersonOrganizationLink
    from sqlalchemy import and_

    if filters.target_type == 'organisations':
        query = db.query(Organisation).filter(Organisation.email.isnot(None))

        if filters.countries:
            query = query.filter(Organisation.country_code.in_(filters.countries))

        if filters.organisation_categories:
            query = query.filter(Organisation.category.in_(filters.organisation_categories))

        if filters.organisation_types:
            query = query.filter(Organisation.type.in_(filters.organisation_types))

        if filters.cities:
            query = query.filter(Organisation.ville.in_(filters.cities))

        if filters.is_active is not None:
            query = query.filter(Organisation.is_active == filters.is_active)

        if filters.specific_ids:
            query = query.filter(Organisation.id.in_(filters.specific_ids))

        if filters.exclude_ids:
            query = query.filter(~Organisation.id.in_(filters.exclude_ids))

        count = query.count()

    elif filters.target_type == 'contacts':
        # TOUS les contacts avec email (pas seulement les contacts principaux)
        from sqlalchemy import or_
        query = db.query(Person).filter(
            or_(Person.email.isnot(None), Person.personal_email.isnot(None))
        )

        if filters.languages:
            query = query.filter(Person.language.in_(filters.languages))

        if filters.countries:
            query = query.filter(Person.country_code.in_(filters.countries))

        if filters.roles:
            query = query.filter(or_(
                Person.job_title.in_(filters.roles),
                Person.role.in_(filters.roles)
            ))

        if filters.is_active is not None:
            query = query.filter(Person.is_active == filters.is_active)

        if filters.specific_ids:
            query = query.filter(Person.id.in_(filters.specific_ids))

        if filters.exclude_ids:
            query = query.filter(~Person.id.in_(filters.exclude_ids))

        count = query.distinct().count()

    else:
        count = 0

    return RecipientCountResponse(count=count)


@router.post("/campaigns/recipients/list")
async def list_recipients(
    filters: RecipientFilters,
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retourne la liste complète des destinataires selon les filtres"""
    from models.organisation import Organisation
    from models.person import Person, PersonOrganizationLink

    recipients = []

    if filters.target_type == 'organisations':
        query = db.query(Organisation).filter(Organisation.email.isnot(None))

        if filters.languages:
            query = query.filter(Organisation.language.in_(filters.languages))

        if filters.countries:
            query = query.filter(Organisation.country_code.in_(filters.countries))

        if filters.organisation_categories:
            query = query.filter(Organisation.category.in_(filters.organisation_categories))

        if filters.organisation_types:
            query = query.filter(Organisation.type.in_(filters.organisation_types))

        if filters.cities:
            query = query.filter(Organisation.ville.in_(filters.cities))

        if filters.is_active is not None:
            query = query.filter(Organisation.is_active == filters.is_active)

        if filters.specific_ids:
            query = query.filter(Organisation.id.in_(filters.specific_ids))

        if filters.exclude_ids:
            query = query.filter(~Organisation.id.in_(filters.exclude_ids))

        # Calculer le total AVANT la pagination
        total = query.count()

        orgs = query.offset(skip).limit(limit).all()

        for org in orgs:
            recipients.append({
                "id": org.id,
                "name": org.name,
                "email": org.email,
                "country": org.country_code,
                "language": org.language,
                "category": org.category,
            })

    elif filters.target_type == 'contacts':
        from sqlalchemy import or_
        # Récupérer TOUS les contacts avec email, pas seulement les contacts principaux
        # LEFT JOIN pour avoir l'organisation si elle existe
        query = db.query(Person, Organisation).outerjoin(
            PersonOrganizationLink,
            and_(
                PersonOrganizationLink.person_id == Person.id,
                PersonOrganizationLink.is_primary == True  # Prendre l'org principale si elle existe
            )
        ).outerjoin(
            Organisation,
            Organisation.id == PersonOrganizationLink.organisation_id
        ).filter(
            or_(Person.email.isnot(None), Person.personal_email.isnot(None))
        )

        if filters.languages:
            query = query.filter(Person.language.in_(filters.languages))

        if filters.countries:
            query = query.filter(Person.country_code.in_(filters.countries))

        if filters.roles:
            query = query.filter(or_(
                Person.job_title.in_(filters.roles),
                Person.role.in_(filters.roles)
            ))

        if filters.is_active is not None:
            query = query.filter(Person.is_active == filters.is_active)

        if filters.specific_ids:
            query = query.filter(Person.id.in_(filters.specific_ids))

        if filters.exclude_ids:
            query = query.filter(~Person.id.in_(filters.exclude_ids))

        # Calculer le total AVANT la pagination
        total = query.count()

        results = query.offset(skip).limit(limit).all()

        for person, org in results:
            email = person.email or person.personal_email
            recipients.append({
                "id": person.id,
                "name": person.full_name,
                "email": email,
                "organisation_name": org.name if org else None,
                "country": person.country_code,
                "language": person.language,
            })
    else:
        total = 0

    return {"recipients": recipients, "total": total}


# ============= CAMPAIGNS =============

@router.get("/campaigns", response_model=PaginatedResponse[EmailCampaignResponse])
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[EmailCampaignStatus] = Query(None, alias="status"),
    provider: Optional[EmailProvider] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailCampaignService(db)
    filters = {}
    if status_filter:
        filters["status"] = status_filter
    if provider:
        filters["provider"] = provider
    campaigns, total = await service.get_all(skip=skip, limit=limit, filters=filters)
    items = [EmailCampaignResponse.model_validate(campaign) for campaign in campaigns]
    return PaginatedResponse(total=total, skip=skip, limit=limit, items=items)


@router.post("/campaigns", response_model=EmailCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: EmailCampaignCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailCampaignService(db)
    campaign = await service.create(payload)
    await emit_event(
        EventType.EMAIL_CAMPAIGN_CREATED,
        data={"campaign_id": campaign.id, "name": campaign.name},
        user_id=_extract_user_id(current_user),
    )
    return EmailCampaignResponse.model_validate(campaign)


@router.get("/campaigns/{campaign_id}", response_model=EmailCampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailCampaignService(db)
    campaign = await service.get_by_id(campaign_id)
    return EmailCampaignResponse.model_validate(campaign)


@router.put("/campaigns/{campaign_id}", response_model=EmailCampaignResponse)
async def update_campaign(
    campaign_id: int,
    payload: EmailCampaignUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailCampaignService(db)
    campaign = await service.update(campaign_id, payload)
    return EmailCampaignResponse.model_validate(campaign)


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer une campagne (seulement si draft, paused, completed ou failed)"""
    from models.email import EmailCampaign, EmailCampaignStatus
    from fastapi import HTTPException

    # Récupérer la campagne
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    # Vérifier le statut - ne pas autoriser la suppression si sending ou scheduled
    if campaign.status in [EmailCampaignStatus.SENDING, EmailCampaignStatus.SCHEDULED]:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer une campagne en cours d'envoi ou programmée. Veuillez d'abord la mettre en pause."
        )

    # Supprimer la campagne
    db.delete(campaign)
    db.commit()

    await emit_event(
        EventType.EMAIL_CAMPAIGN_DELETED,
        data={"campaign_id": campaign_id, "name": campaign.name},
        user_id=_extract_user_id(current_user),
    )

    return None


@router.post("/campaigns/{campaign_id}/schedule", response_model=EmailCampaignResponse)
async def schedule_campaign(
    campaign_id: int,
    payload: EmailCampaignScheduleRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    delivery_service = EmailDeliveryService(db)
    campaign, sends = delivery_service.schedule_campaign(campaign_id, payload)

    # Dispatch immédiat pour les envois sans délai
    immediate_sends = [send for send in sends if send.status == EmailSendStatus.QUEUED]
    if immediate_sends:
        try:
            from tasks.email_tasks import send_email_send

            for send in immediate_sends:
                send_email_send.delay(send.id)
        except Exception:
            # Même si Celery indisponible, l'envoi pourra être repris manuellement
            pass
    await emit_event(
        EventType.EMAIL_CAMPAIGN_SCHEDULED,
        data={
            "campaign_id": campaign.id,
            "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
            "recipients": campaign.total_recipients,
        },
        user_id=_extract_user_id(current_user),
    )
    return EmailCampaignResponse.model_validate(campaign)


@router.get("/campaigns/{campaign_id}/stats", response_model=EmailCampaignStatsResponse)
async def campaign_stats(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    analytics = EmailAnalyticsService(db)
    stats = analytics.get_campaign_stats(campaign_id)
    return stats


@router.get("/campaigns/{campaign_id}/sends", response_model=PaginatedResponse[EmailSendResponse])
async def list_campaign_sends(
    campaign_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[EmailSendStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(EmailSend).filter(EmailSend.campaign_id == campaign_id)
    if status_filter:
        query = query.filter(EmailSend.status == status_filter)
    total = query.count()
    sends = (
        query.order_by(EmailSend.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    items = [EmailSendResponse.model_validate(send) for send in sends]
    return PaginatedResponse(total=total, skip=skip, limit=limit, items=items)
