from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    EmailSendBatchResponse,
    EmailSendResponse,
    EmailTemplateCreate,
    EmailTemplateResponse,
    EmailTemplateUpdate,
    CampaignSubscriptionCreate,
    CampaignSubscriptionResponse,
    CampaignSubscriptionBulkCreate,
    CampaignSubscriptionBulkResponse,
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


@router.get("/templates/{template_id}", response_model=EmailTemplateResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = EmailTemplateService(db)
    template = await service.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
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


@router.get("/campaigns/{campaign_id}/batches", response_model=PaginatedResponse[EmailSendBatchResponse])
async def list_campaign_batches(
    campaign_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister les batches d'envois d'une campagne."""
    from models.email import EmailSendBatch

    query = db.query(EmailSendBatch).filter(EmailSendBatch.campaign_id == campaign_id)
    total = query.count()
    batches = (
        query.order_by(EmailSendBatch.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    items = [EmailSendBatchResponse.model_validate(batch) for batch in batches]
    return PaginatedResponse(total=total, skip=skip, limit=limit, items=items)


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


@router.get("/campaigns/{campaign_id}/sends/{send_id}", response_model=EmailSendBatchResponse)
async def get_campaign_send_batch(
    campaign_id: int,
    send_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer les détails d'un batch d'envoi spécifique."""
    from models.email import EmailSendBatch

    batch = db.query(EmailSendBatch).filter(
        EmailSendBatch.id == send_id,
        EmailSendBatch.campaign_id == campaign_id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch d'envoi introuvable")

    return EmailSendBatchResponse.model_validate(batch)


@router.get("/sends/{send_id}/details", response_model=PaginatedResponse[EmailSendResponse])
async def get_send_batch_details(
    send_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    status_filter: Optional[EmailSendStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister tous les envois individuels d'un batch (avec filtres et pagination)."""
    query = db.query(EmailSend).filter(EmailSend.batch_id == send_id)

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


# ============= CAMPAIGN SUBSCRIPTIONS =============


@router.post("/campaigns/{campaign_id}/subscriptions", response_model=CampaignSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_to_campaign(
    campaign_id: int,
    payload: CampaignSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Abonner une personne ou organisation à une campagne."""
    from models.email import EmailCampaign, CampaignSubscription
    from models.person import Person
    from models.organisation import Organisation
    from fastapi import HTTPException
    from datetime import datetime, UTC

    # Vérifier que la campagne existe
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    # Vérifier que l'entité existe
    entity_name = None
    entity_email = None
    if payload.person_id:
        person = db.query(Person).filter(Person.id == payload.person_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Personne introuvable")
        entity_name = f"{person.first_name} {person.last_name}"
        entity_email = person.email or person.personal_email
    elif payload.organisation_id:
        org = db.query(Organisation).filter(Organisation.id == payload.organisation_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organisation introuvable")
        entity_name = org.name
        entity_email = org.email

    # Vérifier si déjà abonné
    existing = db.query(CampaignSubscription).filter(
        CampaignSubscription.campaign_id == campaign_id,
        CampaignSubscription.person_id == payload.person_id,
        CampaignSubscription.organisation_id == payload.organisation_id,
    ).first()

    if existing:
        # Réactiver si désabonné
        if not existing.is_active:
            existing.is_active = True
            existing.unsubscribed_at = None
            db.commit()
            db.refresh(existing)

        response_data = CampaignSubscriptionResponse.model_validate(existing)
        response_data.campaign_name = campaign.name
        response_data.entity_name = entity_name
        response_data.entity_email = entity_email
        return response_data

    # Créer l'abonnement
    user_id = _extract_user_id(current_user)
    subscription = CampaignSubscription(
        campaign_id=campaign_id,
        person_id=payload.person_id,
        organisation_id=payload.organisation_id,
        subscribed_by=user_id,
        is_active=True,
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    await emit_event(
        EventType.EMAIL_CAMPAIGN_UPDATED,
        data={
            "campaign_id": campaign_id,
            "action": "subscription_added",
            "entity_type": "person" if payload.person_id else "organisation",
            "entity_id": payload.person_id or payload.organisation_id,
        },
        user_id=user_id,
    )

    response_data = CampaignSubscriptionResponse.model_validate(subscription)
    response_data.campaign_name = campaign.name
    response_data.entity_name = entity_name
    response_data.entity_email = entity_email
    return response_data


@router.delete("/campaigns/{campaign_id}/subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_from_campaign(
    campaign_id: int,
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Désabonner une entité d'une campagne."""
    from models.email import CampaignSubscription
    from fastapi import HTTPException
    from datetime import datetime, UTC

    subscription = db.query(CampaignSubscription).filter(
        CampaignSubscription.id == subscription_id,
        CampaignSubscription.campaign_id == campaign_id,
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Abonnement introuvable")

    subscription.is_active = False
    subscription.unsubscribed_at = datetime.now(UTC)
    db.commit()

    await emit_event(
        EventType.EMAIL_CAMPAIGN_UPDATED,
        data={
            "campaign_id": campaign_id,
            "action": "subscription_removed",
            "subscription_id": subscription_id,
        },
        user_id=_extract_user_id(current_user),
    )


@router.get("/campaigns/{campaign_id}/subscriptions", response_model=List[CampaignSubscriptionResponse])
async def list_campaign_subscriptions(
    campaign_id: int,
    only_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister les abonnements d'une campagne."""
    from models.email import CampaignSubscription, EmailCampaign
    from models.person import Person
    from models.organisation import Organisation
    from fastapi import HTTPException

    # Vérifier que la campagne existe
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    query = db.query(CampaignSubscription).filter(CampaignSubscription.campaign_id == campaign_id)

    if only_active:
        query = query.filter(CampaignSubscription.is_active == True)

    subscriptions = query.order_by(CampaignSubscription.created_at.desc()).all()

    result = []
    from models.email import UnsubscribedEmail

    for sub in subscriptions:
        response_data = CampaignSubscriptionResponse.model_validate(sub)
        response_data.campaign_name = campaign.name

        # Enrichir avec les infos de l'entité
        entity_email = None
        should_skip = False

        if sub.person_id:
            person = db.query(Person).filter(Person.id == sub.person_id).first()
            if person:
                response_data.entity_name = f"{person.first_name} {person.last_name}"
                entity_email = person.email or person.personal_email
                response_data.entity_email = entity_email

                # Vérifier si désabonné (colonne email_unsubscribed)
                if person.email_unsubscribed:
                    should_skip = True

        elif sub.organisation_id:
            org = db.query(Organisation).filter(Organisation.id == sub.organisation_id).first()
            if org:
                response_data.entity_name = org.name
                entity_email = org.email
                response_data.entity_email = entity_email

                # Vérifier si désabonné (colonne email_unsubscribed)
                if org.email_unsubscribed:
                    should_skip = True

        # Vérifier si l'email est dans la liste noire globale
        if entity_email and not should_skip:
            unsubscribed = db.query(UnsubscribedEmail).filter(
                UnsubscribedEmail.email == entity_email.lower()
            ).first()
            if unsubscribed:
                should_skip = True

        # N'ajouter que les emails non désabonnés ET qui ont un email valide
        if not should_skip and entity_email and entity_email.strip():
            result.append(response_data)

    return result


@router.get("/people/{person_id}/subscriptions", response_model=List[CampaignSubscriptionResponse])
async def list_person_subscriptions(
    person_id: int,
    only_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister les abonnements d'une personne."""
    from models.email import CampaignSubscription, EmailCampaign
    from models.person import Person
    from fastapi import HTTPException

    # Vérifier que la personne existe
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Personne introuvable")

    query = db.query(CampaignSubscription).filter(CampaignSubscription.person_id == person_id)

    if only_active:
        query = query.filter(CampaignSubscription.is_active == True)

    subscriptions = query.order_by(CampaignSubscription.created_at.desc()).all()

    result = []
    for sub in subscriptions:
        response_data = CampaignSubscriptionResponse.model_validate(sub)

        # Enrichir avec le nom de la campagne
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == sub.campaign_id).first()
        if campaign:
            response_data.campaign_name = campaign.name

        response_data.entity_name = f"{person.first_name} {person.last_name}"
        response_data.entity_email = person.email or person.personal_email

        result.append(response_data)

    return result


@router.get("/organisations/{organisation_id}/subscriptions", response_model=List[CampaignSubscriptionResponse])
async def list_organisation_subscriptions(
    organisation_id: int,
    only_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister les abonnements d'une organisation."""
    from models.email import CampaignSubscription, EmailCampaign
    from models.organisation import Organisation
    from fastapi import HTTPException

    # Vérifier que l'organisation existe
    org = db.query(Organisation).filter(Organisation.id == organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation introuvable")

    query = db.query(CampaignSubscription).filter(CampaignSubscription.organisation_id == organisation_id)

    if only_active:
        query = query.filter(CampaignSubscription.is_active == True)

    subscriptions = query.order_by(CampaignSubscription.created_at.desc()).all()

    result = []
    for sub in subscriptions:
        response_data = CampaignSubscriptionResponse.model_validate(sub)

        # Enrichir avec le nom de la campagne
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == sub.campaign_id).first()
        if campaign:
            response_data.campaign_name = campaign.name

        response_data.entity_name = org.name
        response_data.entity_email = org.email

        result.append(response_data)

    return result


@router.post("/campaigns/subscriptions/bulk", response_model=CampaignSubscriptionBulkResponse, status_code=status.HTTP_201_CREATED)
async def bulk_subscribe_to_campaign(
    payload: CampaignSubscriptionBulkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Abonner plusieurs personnes/organisations à une campagne en une fois."""
    from models.email import EmailCampaign, CampaignSubscription
    from models.person import Person
    from models.organisation import Organisation
    from fastapi import HTTPException

    # Vérifier que la campagne existe
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == payload.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    user_id = _extract_user_id(current_user)
    created = 0
    already_exists = 0
    errors = 0
    subscriptions = []

    # Abonner les personnes
    for person_id in payload.person_ids:
        try:
            # Vérifier si existe déjà
            existing = db.query(CampaignSubscription).filter(
                CampaignSubscription.campaign_id == payload.campaign_id,
                CampaignSubscription.person_id == person_id,
            ).first()

            if existing:
                if not existing.is_active:
                    existing.is_active = True
                    existing.unsubscribed_at = None
                    db.commit()
                    db.refresh(existing)
                    created += 1
                    subscriptions.append(CampaignSubscriptionResponse.model_validate(existing))
                else:
                    already_exists += 1
            else:
                # Créer nouvel abonnement
                subscription = CampaignSubscription(
                    campaign_id=payload.campaign_id,
                    person_id=person_id,
                    subscribed_by=user_id,
                    is_active=True,
                )
                db.add(subscription)
                db.commit()
                db.refresh(subscription)
                created += 1
                subscriptions.append(CampaignSubscriptionResponse.model_validate(subscription))
        except Exception as e:
            errors += 1
            db.rollback()

    # Abonner les organisations
    for org_id in payload.organisation_ids:
        try:
            # Vérifier si existe déjà
            existing = db.query(CampaignSubscription).filter(
                CampaignSubscription.campaign_id == payload.campaign_id,
                CampaignSubscription.organisation_id == org_id,
            ).first()

            if existing:
                if not existing.is_active:
                    existing.is_active = True
                    existing.unsubscribed_at = None
                    db.commit()
                    db.refresh(existing)
                    created += 1
                    subscriptions.append(CampaignSubscriptionResponse.model_validate(existing))
                else:
                    already_exists += 1
            else:
                # Créer nouvel abonnement
                subscription = CampaignSubscription(
                    campaign_id=payload.campaign_id,
                    organisation_id=org_id,
                    subscribed_by=user_id,
                    is_active=True,
                )
                db.add(subscription)
                db.commit()
                db.refresh(subscription)
                created += 1
                subscriptions.append(CampaignSubscriptionResponse.model_validate(subscription))
        except Exception as e:
            errors += 1
            db.rollback()

    await emit_event(
        EventType.EMAIL_CAMPAIGN_UPDATED,
        data={
            "campaign_id": payload.campaign_id,
            "action": "bulk_subscriptions_added",
            "created": created,
            "already_exists": already_exists,
            "errors": errors,
        },
        user_id=user_id,
    )

    return CampaignSubscriptionBulkResponse(
        created=created,
        already_exists=already_exists,
        errors=errors,
        subscriptions=subscriptions,
    )


# ============= TRACKING LEADS =============


class RecipientTrackingResponse(BaseModel):
    """Destinataire avec tracking détaillé pour suivi commercial."""

    id: int
    recipient: dict  # person_id, name, email, organisation, role
    tracking: dict   # sent_at, opened[], clicked[], bounced
    engagement_score: int  # Score 0-100 pour priorisation


@router.get(
    "/campaigns/{campaign_id}/batches/{batch_id}/recipients-tracking",
    response_model=List[RecipientTrackingResponse]
)
async def get_batch_recipients_with_tracking(
    campaign_id: int,
    batch_id: int,
    filter: Optional[str] = Query(None, description="Filter: clicked, opened, not_opened, bounced, all"),
    sort: Optional[str] = Query("engagement", description="Sort: engagement, name, date"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retourne la liste des destinataires d'un batch avec leur tracking détaillé.

    Cas d'usage commercial: Identifier les leads chauds à rappeler.

    Filtres:
    - clicked: Leads ayant cliqué (leads chauds 🔥)
    - opened: Leads ayant ouvert (leads tièdes)
    - not_opened: Leads n'ayant pas ouvert (à relancer)
    - bounced: Emails rebondis (invalides)
    - all: Tous les destinataires

    Tri:
    - engagement: Par score d'engagement (défaut)
    - name: Par nom alphabétique
    - date: Par date de dernier événement
    """
    from models.email import EmailEvent, EmailEventType, EmailSendBatch
    from models.person import Person
    from models.organisation import Organisation
    from sqlalchemy.orm import joinedload
    from datetime import datetime, timezone

    # Vérifier que le batch appartient bien à la campagne
    batch = db.query(EmailSendBatch).filter(
        and_(
            EmailSendBatch.id == batch_id,
            EmailSendBatch.campaign_id == campaign_id
        )
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found for campaign {campaign_id}"
        )

    # Query de base avec jointures
    query = (
        db.query(EmailSend)
        .filter(EmailSend.batch_id == batch_id)
        .options(
            joinedload(EmailSend.recipient_person),
            joinedload(EmailSend.organisation),
            joinedload(EmailSend.events)
        )
    )

    # Appliquer filtres
    if filter == 'clicked':
        # Sous-requête pour trouver les send_id avec événements CLICKED
        clicked_send_ids = (
            db.query(EmailEvent.send_id)
            .filter(EmailEvent.event_type == EmailEventType.CLICKED)
            .distinct()
        )
        query = query.filter(EmailSend.id.in_(clicked_send_ids))

    elif filter == 'opened':
        # Sous-requête pour trouver les send_id avec événements OPENED
        opened_send_ids = (
            db.query(EmailEvent.send_id)
            .filter(EmailEvent.event_type == EmailEventType.OPENED)
            .distinct()
        )
        query = query.filter(EmailSend.id.in_(opened_send_ids))

    elif filter == 'not_opened':
        # LEFT JOIN pour exclure ceux qui ont des events OPENED
        opened_send_ids = (
            db.query(EmailEvent.send_id)
            .filter(EmailEvent.event_type == EmailEventType.OPENED)
            .distinct()
        )
        query = query.filter(~EmailSend.id.in_(opened_send_ids))

    elif filter == 'bounced':
        # Sous-requête pour trouver les send_id avec événements BOUNCED
        bounced_send_ids = (
            db.query(EmailEvent.send_id)
            .filter(EmailEvent.event_type == EmailEventType.BOUNCED)
            .distinct()
        )
        query = query.filter(EmailSend.id.in_(bounced_send_ids))

    # Récupérer tous les sends
    sends = query.all()

    # Construire la réponse avec calcul du score d'engagement
    results = []
    for send in sends:
        # Extraire les événements par type
        opened_events = [
            {"event_at": e.event_at.isoformat(), "ip": e.ip_address}
            for e in send.events if e.event_type == EmailEventType.OPENED
        ]
        clicked_events = [
            {"event_at": e.event_at.isoformat(), "url": e.url, "ip": e.ip_address}
            for e in send.events if e.event_type == EmailEventType.CLICKED
        ]
        bounced = any(e.event_type == EmailEventType.BOUNCED for e in send.events)

        # Calcul du score d'engagement (0-100)
        score = 0
        score += len(clicked_events) * 20      # Clic = +20 points
        score += len(opened_events) * 10       # Ouverture = +10 points

        # Bonus si événement récent (< 24h)
        now = datetime.now(timezone.utc)
        if clicked_events:
            last_click = max(e["event_at"] for e in clicked_events)
            last_click_dt = datetime.fromisoformat(last_click.replace('Z', '+00:00'))
            hours_since_click = (now - last_click_dt).total_seconds() / 3600
            if hours_since_click < 24:
                score += 30  # Lead très chaud !
            elif hours_since_click < 48:
                score += 15

        # Bonus si plusieurs ouvertures (intérêt)
        if len(opened_events) > 3:
            score += 20

        # Pénalité si rebond
        if bounced:
            score = 0

        # Cap à 100
        score = min(score, 100)

        # Infos destinataire
        recipient = {
            "person_id": send.recipient_person_id,
            "name": send.recipient_name or "Nom inconnu",
            "email": send.recipient_email,
            "organisation": send.organisation.name if send.organisation else None,
            "role": send.recipient_person.role if send.recipient_person else None,
        }

        # Tracking
        tracking = {
            "sent_at": send.sent_at.isoformat() if send.sent_at else None,
            "opened": opened_events,
            "clicked": clicked_events,
            "bounced": bounced,
            "open_count": len(opened_events),
            "click_count": len(clicked_events),
        }

        results.append(RecipientTrackingResponse(
            id=send.id,
            recipient=recipient,
            tracking=tracking,
            engagement_score=score,
        ))

    # Tri
    if sort == 'engagement':
        results.sort(key=lambda x: x.engagement_score, reverse=True)
    elif sort == 'name':
        results.sort(key=lambda x: x.recipient['name'])
    elif sort == 'date':
        results.sort(key=lambda x: (
            max([e['event_at'] for e in x.tracking['clicked']], default='')
            or max([e['event_at'] for e in x.tracking['opened']], default='')
            or x.tracking['sent_at']
        ), reverse=True)

    return results
