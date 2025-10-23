from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from models.database import get_db
from schemas.email_campaign import (
    EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate,
    EmailCampaign, EmailCampaignCreate, EmailCampaignUpdate, EmailCampaignWithTemplate,
    EmailPreviewList, CampaignEmail, CampaignStatistics, EmailStatus, RecipientFilters
)
from services.email_campaign_service import EmailTemplateService, EmailCampaignService

router = APIRouter(prefix="/email-campaigns", tags=["Email Campaigns"])

# ============================================================
# EMAIL TEMPLATES
# ============================================================

@router.post("/templates", response_model=EmailTemplate)
def create_email_template(
    template: EmailTemplateCreate,
    db: Session = Depends(get_db)
):
    """Crée un nouveau template d'email"""
    return EmailTemplateService.create_template(db, template)

@router.get("/templates", response_model=List[EmailTemplate])
def list_email_templates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste tous les templates d'email"""
    return EmailTemplateService.list_templates(db, skip, limit)

@router.get("/templates/{template_id}", response_model=EmailTemplate)
def get_email_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """Récupère un template d'email par son ID"""
    template = EmailTemplateService.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/templates/{template_id}", response_model=EmailTemplate)
def update_email_template(
    template_id: int,
    template_update: EmailTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un template d'email"""
    template = EmailTemplateService.update_template(db, template_id, template_update)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.delete("/templates/{template_id}")
def delete_email_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """Supprime un template d'email"""
    success = EmailTemplateService.delete_template(db, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

@router.post("/templates/{template_id}/send-test")
def send_test_email_from_template(
    template_id: int,
    test_email: str,
    db: Session = Depends(get_db)
):
    """Envoie un email de test à partir d'un template"""
    from services.email_service import EmailService
    from models.email_campaign import EmailTemplate as EmailTemplateModel

    # Récupérer le template
    template = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
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
        # Envoyer l'email de test
        email_service = EmailService()
        email_service.send_email(
            to_email=test_email,
            subject=f"[TEST] {subject}",
            body_html=body_html,
            from_name="[TEST] ALFORIS Finance",
        )

        return {
            "message": "Test email sent successfully",
            "to_email": test_email,
            "template_id": template_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")

# ============================================================
# EMAIL CAMPAIGNS
# ============================================================

@router.post("/campaigns", response_model=EmailCampaign)
def create_email_campaign(
    campaign: EmailCampaignCreate,
    db: Session = Depends(get_db)
):
    """Crée une nouvelle campagne d'email"""
    try:
        return EmailCampaignService.create_campaign(db, campaign)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/campaigns", response_model=List[EmailCampaign])
def list_email_campaigns(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste toutes les campagnes d'email"""
    return EmailCampaignService.list_campaigns(db, skip, limit)

@router.get("/campaigns/{campaign_id}", response_model=EmailCampaignWithTemplate)
def get_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Récupère une campagne d'email par son ID"""
    campaign = EmailCampaignService.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/campaigns/{campaign_id}", response_model=EmailCampaign)
def update_email_campaign(
    campaign_id: int,
    campaign_update: EmailCampaignUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour une campagne d'email"""
    try:
        campaign = EmailCampaignService.update_campaign(db, campaign_id, campaign_update)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return campaign
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/campaigns/{campaign_id}/preview", response_model=EmailPreviewList)
def preview_email_campaign(
    campaign_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Prévisualise les emails d'une campagne avec pagination"""
    try:
        return EmailCampaignService.preview_campaign(db, campaign_id, page, page_size)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/campaigns/{campaign_id}/prepare")
def prepare_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Prépare tous les emails de la campagne (génère les CampaignEmail)"""
    try:
        count = EmailCampaignService.prepare_campaign_emails(db, campaign_id)
        return {
            "message": f"Campaign prepared successfully",
            "emails_prepared": count
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/campaigns/{campaign_id}/emails", response_model=List[CampaignEmail])
def get_campaign_emails(
    campaign_id: int,
    status: Optional[EmailStatus] = None,
    batch_number: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Récupère les emails d'une campagne"""
    return EmailCampaignService.get_campaign_emails(
        db, campaign_id, status, batch_number, skip, limit
    )

@router.get("/campaigns/{campaign_id}/statistics", response_model=CampaignStatistics)
def get_campaign_statistics(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Récupère les statistiques d'une campagne"""
    try:
        stats = EmailCampaignService.get_campaign_statistics(db, campaign_id)
        return stats
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/campaigns/{campaign_id}/start")
def start_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Démarre l'envoi d'une campagne"""
    try:
        from tasks.email_sending import start_campaign_sending

        # Vérifier que la campagne existe et est prête
        campaign = EmailCampaignService.get_campaign(db, campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Vérifier que des emails ont été préparés
        emails_count = db.query(CampaignEmail).filter(
            CampaignEmail.campaign_id == campaign_id
        ).count()

        if emails_count == 0:
            raise HTTPException(
                status_code=400,
                detail="No emails prepared. Please prepare the campaign first."
            )

        # Démarrer l'envoi
        start_campaign_sending(campaign_id)

        return {
            "message": "Campaign started successfully",
            "campaign_id": campaign_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/campaigns/{campaign_id}/pause")
def pause_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Met en pause une campagne en cours"""
    campaign = EmailCampaignService.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status != "sending":
        raise HTTPException(status_code=400, detail="Campaign is not currently sending")

    from models.email_campaign import EmailCampaign, CampaignStatus
    db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).update({
        "status": CampaignStatus.PAUSED
    })
    db.commit()

    return {"message": "Campaign paused successfully"}

@router.post("/recipients/count")
def count_recipients(
    filters: RecipientFilters,
    db: Session = Depends(get_db)
):
    """Compte le nombre de destinataires selon les filtres"""
    query = EmailCampaignService._build_recipient_query(db, filters)
    count = query.count()
    return {"count": count}

@router.post("/campaigns/{campaign_id}/send-test")
def send_test_email(
    campaign_id: int,
    test_email: str,
    db: Session = Depends(get_db)
):
    """Envoie un email de test à l'adresse spécifiée"""
    from services.email_service import EmailService
    from models.email_campaign import EmailCampaign as EmailCampaignModel

    # Récupérer la campagne
    campaign = db.query(EmailCampaignModel).filter(EmailCampaignModel.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Récupérer le template
    template = campaign.template
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Données de test
    test_data = {
        "first_name": "Test",
        "last_name": "User",
        "full_name": "Test User",
        "email": test_email,
        "organisation_name": "Organisation Test",
        "organisation_country": "France",
        "organisation_category": "Test Category",
    }

    # Remplacer les variables dans le sujet et le corps
    subject = template.subject
    body_html = template.body_html

    for key, value in test_data.items():
        subject = subject.replace(f"{{{{{key}}}}}", str(value))
        body_html = body_html.replace(f"{{{{{key}}}}}", str(value))

    try:
        # Envoyer l'email de test
        email_service = EmailService()
        email_service.send_email(
            to_email=test_email,
            subject=f"[TEST] {subject}",
            body_html=body_html,
            from_name=f"[TEST] {campaign.name}",
        )

        return {
            "message": "Test email sent successfully",
            "to_email": test_email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")
