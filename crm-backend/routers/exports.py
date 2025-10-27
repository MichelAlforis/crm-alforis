"""
Routes API - Exports (CSV, Excel, PDF)

Endpoints:
- GET /exports/organisations/csv : Export CSV organisations
- GET /exports/organisations/excel : Export Excel avec graphiques
- GET /exports/organisations/pdf : Export PDF rapport
- GET /exports/mandats/csv : Export CSV mandats
- GET /exports/mandats/pdf : Export PDF mandats
- GET /exports/campaigns/csv : Export CSV campagnes email
- GET /exports/mailing-lists/csv : Export CSV listes de diffusion
- GET /exports/email-sends/csv : Export CSV historique des envois
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from core.exports import ExportService
from models.email import EmailCampaign, EmailCampaignStatus, EmailSend, EmailSendStatus
from models.mailing_list import MailingList
from models.mandat import Mandat, MandatStatus, MandatType
from models.organisation import Organisation, OrganisationCategory
from models.person import Person
from models.user import User

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/organisations/csv")
async def export_organisations_csv(
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    type: Optional[str] = Query(None, description="Filtrer par type"),
    city: Optional[str] = Query(None, description="Filtrer par ville"),
    country_code: Optional[str] = Query(None, description="Filtrer par pays"),
    language: Optional[str] = Query(None, description="Filtrer par langue"),
    is_active: Optional[bool] = Query(None, description="Filtrer actives/inactives"),
    search: Optional[str] = Query(None, description="Recherche textuelle"),
    sort: Optional[str] = Query(None, description="Tri (created_at:desc par défaut)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV organisations avec filtres

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Exemples:**
    - `/exports/organisations/csv`
    - `/exports/organisations/csv?category=Institution&country_code=FR`
    - `/exports/organisations/csv?is_active=true&search=Bank`

    **Returns:** Fichier CSV téléchargeable
    """
    # Import local pour éviter circular import
    from api.routes.organisations import apply_organisation_filters

    # Construire les params exactement comme le viewer
    params = {
        "category": category,
        "type": type,
        "city": city,
        "country_code": country_code,
        "language": language,
        "is_active": is_active,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(Organisation)
    query = apply_organisation_filters(query, params, current_user)

    # Pas de pagination pour export
    organisations = query.all()

    # Export CSV with explicit columns (noms d'attributs Python, pas noms DB)
    headers = [
        "id",
        "name",
        "type",
        "category",
        "pipeline_stage",
        "email",
        "phone",
        "website",
        "address",
        "city",
        "country_code",
        "language",
        "aum",
        "domicile",
        "created_at",
        "is_active",
    ]

    # Permettre l'export même si vide (CSV avec seulement les headers)
    buffer = ExportService.export_csv(
        data=organisations,
        filename="organisations.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=organisations.csv"},
    )


@router.get("/organisations/excel")
async def export_organisations_excel(
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    include_charts: bool = Query(True, description="Inclure graphiques statistiques"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export Excel organisations avec graphiques

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Fonctionnalités:**
    - Feuille "Données" avec styling professionnel
    - Feuille "Statistiques" avec graphiques (BarChart, PieChart)
    - Couleurs Alforis (#366092)
    - Colonnes auto-ajustées

    **Exemples:**
    - `/exports/organisations/excel`
    - `/exports/organisations/excel?include_charts=false` (plus rapide)
    - `/exports/organisations/excel?category=Institution&is_active=true`

    **Returns:** Fichier Excel (.xlsx) téléchargeable
    """
    # Import local pour éviter circular import
    from api.routes.organisations import apply_organisation_filters

    # Construire les params exactement comme le viewer
    params = {
        "category": category,
        "type": type,
        "city": city,
        "country_code": country_code,
        "language": language,
        "is_active": is_active,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(Organisation)
    query = apply_organisation_filters(query, params, current_user)

    organisations = query.all()

    # Permettre l'export même si vide
    # Export Excel
    buffer = ExportService.export_organisations_excel(
        organisations=organisations,
        filename="organisations.xlsx",
        include_charts=include_charts,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=organisations.xlsx"},
    )


@router.get("/organisations/pdf")
async def export_organisations_pdf(
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export PDF rapport organisations

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Fonctionnalités:**
    - Table formatée avec bordures
    - Couleurs alternées (blanc/gris)
    - En-tête avec titre
    - Pied de page avec date

    **Exemples:**
    - `/exports/organisations/pdf`
    - `/exports/organisations/pdf?category=Institution`

    **Returns:** Fichier PDF téléchargeable
    """
    # Construire les params exactement comme le viewer
    params = {
        "category": category,
        "type": type,
        "city": city,
        "country_code": country_code,
        "language": language,
        "is_active": is_active,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(Organisation)
    query = apply_organisation_filters(query, params, current_user)

    organisations = query.all()

    # Permettre l'export même si vide
    # Gérer current_user comme dict ou objet pour l'auteur du PDF
    if isinstance(current_user, dict):
        author_name = current_user.get("username", current_user.get("email", "CRM User"))
    else:
        author_name = current_user.username

    # Export PDF
    buffer = ExportService.export_organisations_pdf(
        organisations=organisations,
        filename="organisations.pdf",
        title="Rapport Organisations",
        author=f"{author_name} - CRM Alforis",
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=organisations.pdf"},
    )


@router.get("/mandats/csv")
async def export_mandats_csv(
    type: Optional[MandatType] = Query(None, description="Filtrer par type"),
    status: Optional[MandatStatus] = Query(None, description="Filtrer par statut"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV mandats

    **Exemples:**
    - `/exports/mandats/csv`
    - `/exports/mandats/csv?type=vente&status=active`

    **Returns:** Fichier CSV téléchargeable
    """
    # Query avec permissions
    query = db.query(Mandat)
    query = filter_query_by_team(query, current_user, Mandat)

    # Filtres
    if type:
        query = query.filter(Mandat.type == type)
    if status:
        query = query.filter(Mandat.status == status)

    mandats = query.all()

    # Permettre l'export même si vide
    # Export CSV with explicit columns
    headers = [
        "id",
        "numero_mandat",
        "type",
        "status",
        "date_debut",
        "date_fin",
        "organisation_id",
        "created_at",
        "updated_at",
    ]

    buffer = ExportService.export_csv(
        data=mandats,
        filename="mandats.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mandats.csv"},
    )


@router.get("/mandats/pdf")
async def export_mandats_pdf(
    type: Optional[MandatType] = Query(None),
    status: Optional[MandatStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export PDF rapport mandats

    **Informations incluses:**
    - Numéro mandat
    - Type (Vente, Acquisition, etc.)
    - Statut (Actif, Signé, Expiré)
    - Organisation associée
    - Dates début/fin
    - Montant

    **Exemples:**
    - `/exports/mandats/pdf`
    - `/exports/mandats/pdf?type=acquisition&status=signed`

    **Returns:** Fichier PDF téléchargeable
    """
    # Query avec permissions
    query = db.query(Mandat)
    query = filter_query_by_team(query, current_user, Mandat)

    # Filtres
    if type:
        query = query.filter(Mandat.type == type)
    if status:
        query = query.filter(Mandat.status == status)

    mandats = query.all()

    # Permettre l'export même si vide
    # Export PDF
    buffer = ExportService.export_mandats_pdf(
        mandats=mandats,
        filename="mandats.pdf",
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=mandats.pdf"},
    )


@router.get("/people/csv")
async def export_people_csv(
    role: Optional[str] = Query(None, description="Filtrer par rôle"),
    country_code: Optional[str] = Query(None, description="Filtrer par pays"),
    language: Optional[str] = Query(None, description="Filtrer par langue"),
    is_active: Optional[bool] = Query(None, description="Filtrer actifs/inactifs"),
    search: Optional[str] = Query(None, description="Recherche textuelle"),
    sort: Optional[str] = Query(None, description="Tri"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV personnes physiques

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Exemples:**
    - `/exports/people/csv`
    - `/exports/people/csv?role=Directeur&country_code=FR`
    - `/exports/people/csv?language=FR&search=Martin`

    **Returns:** Fichier CSV téléchargeable
    """
    # Construire les params exactement comme le viewer
    params = {
        "role": role,
        "country_code": country_code,
        "language": language,
        "is_active": is_active,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(Person)
    query = apply_people_filters(query, params, current_user)

    people = query.all()

    # Permettre l'export même si vide
    # Export CSV with explicit columns (noms d'attributs Python)
    headers = [
        "id",
        "first_name",
        "last_name",
        "role",
        "job_title",
        "email",
        "personal_email",
        "phone",
        "personal_phone",
        "mobile",
        "country_code",
        "language",
        "linkedin_url",
        "created_at",
        "is_active",
    ]

    buffer = ExportService.export_csv(
        data=people,
        filename="people.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=people.csv"},
    )


@router.get("/people/excel")
async def export_people_excel(
    role: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export Excel personnes physiques

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Fonctionnalités:**
    - Feuille "Personnes" avec styling professionnel
    - Colonnes auto-ajustées
    - En-têtes avec couleurs Alforis

    **Exemples:**
    - `/exports/people/excel`
    - `/exports/people/excel?country_code=FR&search=Martin`

    **Returns:** Fichier Excel (.xlsx) téléchargeable
    """
    # Construire les params exactement comme le viewer
    params = {
        "role": role,
        "country_code": country_code,
        "language": language,
        "is_active": is_active,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(Person)
    query = apply_people_filters(query, params, current_user)

    people = query.all()

    # Permettre l'export même si vide
    # Export Excel with explicit columns (noms d'attributs Python)
    headers = [
        "id",
        "first_name",
        "last_name",
        "role",
        "job_title",
        "email",
        "personal_email",
        "phone",
        "mobile",
        "country_code",
        "language",
        "created_at",
        "is_active",
    ]

    buffer = ExportService.export_excel_simple(
        data=people,
        filename="people.xlsx",
        headers=headers,
        sheet_name="Personnes",
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=people.xlsx"},
    )


@router.get("/people/pdf")
async def export_people_pdf(
    role: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export PDF rapport personnes physiques

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Fonctionnalités:**
    - Table formatée avec bordures
    - Couleurs alternées (blanc/gris)
    - En-tête avec titre
    - Résumé statistique

    **Exemples:**
    - `/exports/people/pdf`
    - `/exports/people/pdf?role=Directeur&search=Martin`

    **Returns:** Fichier PDF téléchargeable
    """
    # Construire les params exactement comme le viewer
    params = {
        "role": role,
        "country_code": country_code,
        "language": language,
        "is_active": is_active,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(Person)
    query = apply_people_filters(query, params, current_user)

    people = query.all()

    # Permettre l'export même si vide
    # Préparer les données pour le PDF (format similaire à export_organisations_pdf)
    from datetime import datetime
    from io import BytesIO

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    story = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#2C3E50"),
        spaceAfter=30,
        alignment=1,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#34495E"),
        spaceAfter=12,
    )

    # Titre
    story.append(Paragraph("Rapport Personnes Physiques", title_style))
    story.append(
        Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", styles["Normal"])
    )
    story.append(Spacer(1, 20))

    # Résumé
    story.append(Paragraph("Résumé Exécutif", heading_style))
    story.append(Paragraph(f"Nombre total de personnes: <b>{len(people)}</b>", styles["Normal"]))
    story.append(Spacer(1, 20))

    # Table des personnes
    story.append(Paragraph("Liste des Personnes", heading_style))

    # Préparer données table
    table_data = [["Nom", "Prénom", "Rôle", "Email", "Pays"]]

    for person in people[:50]:  # Limiter à 50 pour PDF
        country = getattr(person, "country_code", "") or ""
        table_data.append(
            [
                (getattr(person, "last_name", "") or "")[:20],
                (getattr(person, "first_name", "") or "")[:20],
                (getattr(person, "role", "") or "")[:25],
                (getattr(person, "personal_email", "") or "")[:30],
                country,
            ]
        )

    # Créer table
    table = Table(table_data, colWidths=[1.5 * inch, 1.5 * inch, 1.8 * inch, 2 * inch, 0.8 * inch])
    table.setStyle(
        TableStyle(
            [
                # En-tête
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#34495E")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                # Corps
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                # Bordures
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#ECF0F1")]),
            ]
        )
    )

    story.append(table)

    if len(people) > 50:
        story.append(Spacer(1, 10))
        story.append(
            Paragraph(
                f"<i>Note: Seules les 50 premières personnes sont affichées. Total: {len(people)}</i>",
                styles["Normal"],
            )
        )

    # Générer PDF
    doc.build(story)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=people.pdf"},
    )


@router.get("/campaigns/csv")
async def export_campaigns_csv(
    status: Optional[EmailCampaignStatus] = Query(None, description="Filtrer par statut"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV campagnes email avec statistiques

    **Exemples:**
    - `/exports/campaigns/csv`
    - `/exports/campaigns/csv?status=completed`
    - `/exports/campaigns/csv?status=scheduled`

    **Returns:** Fichier CSV téléchargeable
    """
    # Query - Note: EmailCampaign doesn't have team filtering yet
    query = db.query(EmailCampaign)

    # Filtres
    if status:
        query = query.filter(EmailCampaign.status == status)

    campaigns = query.all()

    # Permettre l'export même si vide
    # Préparer les données pour l'export
    export_data = []
    for campaign in campaigns:
        # Formater les dates
        scheduled_at = campaign.scheduled_at.isoformat() if campaign.scheduled_at else ""
        created_at = campaign.created_at.isoformat() if campaign.created_at else ""
        last_sent_at = campaign.last_sent_at.isoformat() if campaign.last_sent_at else ""

        export_data.append(
            {
                "id": campaign.id,
                "name": campaign.name,
                "status": campaign.status.value if campaign.status else "",
                "scheduled_at": scheduled_at,
                "total_recipients": campaign.total_recipients or 0,
                "total_sent": campaign.total_sent or 0,
                "last_sent_at": last_sent_at,
                "from_email": campaign.from_email or "",
                "from_name": campaign.from_name or "",
                "created_at": created_at,
            }
        )

    # Export CSV avec headers explicites
    headers = [
        "id",
        "name",
        "status",
        "scheduled_at",
        "total_recipients",
        "total_sent",
        "last_sent_at",
        "from_email",
        "from_name",
        "created_at",
    ]

    buffer = ExportService.export_csv(
        data=export_data,
        filename="campaigns.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=campaigns.csv"},
    )


@router.get("/mailing-lists/csv")
async def export_mailing_lists_csv(
    only_active: Optional[bool] = Query(None, description="Filtrer actives/inactives"),
    only_mine: Optional[bool] = Query(None, description="Seulement mes listes"),
    target_type: Optional[str] = Query(None, description="Filtrer par type de destinataire"),
    search: Optional[str] = Query(None, description="Recherche textuelle"),
    sort: Optional[str] = Query(None, description="Tri (created_at:desc par défaut)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV listes de diffusion avec filtres

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Exemples:**
    - `/exports/mailing-lists/csv`
    - `/exports/mailing-lists/csv?only_active=true`
    - `/exports/mailing-lists/csv?only_mine=true&target_type=contacts`

    **Returns:** Fichier CSV téléchargeable
    """
    # Import local pour éviter circular import
    from api.routes.mailing_lists import apply_mailing_list_filters

    # Construire les params exactement comme le viewer
    params = {
        "only_active": only_active,
        "only_mine": only_mine,
        "target_type": target_type,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(MailingList)
    query = apply_mailing_list_filters(query, params, current_user)

    mailing_lists = query.all()

    # Préparer les données pour l'export
    export_data = []
    for mailing_list in mailing_lists:
        created_at = mailing_list.created_at.isoformat() if mailing_list.created_at else ""
        last_used_at = mailing_list.last_used_at.isoformat() if mailing_list.last_used_at else ""

        # Convertir filters JSON en string
        import json

        filters_str = json.dumps(mailing_list.filters) if mailing_list.filters else "{}"

        export_data.append(
            {
                "id": mailing_list.id,
                "name": mailing_list.name or "",
                "description": mailing_list.description or "",
                "target_type": mailing_list.target_type or "",
                "recipient_count": mailing_list.recipient_count or 0,
                "filters": filters_str,
                "is_active": mailing_list.is_active,
                "last_used_at": last_used_at,
                "created_at": created_at,
            }
        )

    # Export CSV avec headers explicites
    headers = [
        "id",
        "name",
        "description",
        "target_type",
        "recipient_count",
        "filters",
        "is_active",
        "last_used_at",
        "created_at",
    ]

    buffer = ExportService.export_csv(
        data=export_data,
        filename="mailing_lists.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mailing_lists.csv"},
    )


@router.get("/email-sends/csv")
async def export_email_sends_csv(
    campaign_id: Optional[int] = Query(None, description="Filtrer par campagne"),
    batch_id: Optional[int] = Query(None, description="Filtrer par batch"),
    status: Optional[EmailSendStatus] = Query(None, description="Filtrer par statut"),
    recipient_email: Optional[str] = Query(None, description="Filtrer par email destinataire"),
    search: Optional[str] = Query(None, description="Recherche textuelle"),
    sort: Optional[str] = Query(None, description="Tri (created_at:desc par défaut)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV historique des envois d'emails avec filtres

    **Utilise EXACTEMENT les mêmes filtres que le viewer**

    **Exemples:**
    - `/exports/email-sends/csv`
    - `/exports/email-sends/csv?campaign_id=1`
    - `/exports/email-sends/csv?status=delivered`
    - `/exports/email-sends/csv?batch_id=5&status=sent`

    **Returns:** Fichier CSV téléchargeable
    """
    # Import local pour éviter circular import
    from api.routes.email_campaigns import apply_email_send_filters

    # Construire les params exactement comme le viewer
    params = {
        "campaign_id": campaign_id,
        "batch_id": batch_id,
        "status": status,
        "recipient_email": recipient_email,
        "search": search,
        "sort": sort,
    }

    # Appliquer les mêmes filtres que le viewer
    query = db.query(EmailSend)
    query = apply_email_send_filters(query, params, current_user)

    email_sends = query.all()

    # Préparer les données pour l'export
    export_data = []
    for send in email_sends:
        created_at = send.created_at.isoformat() if send.created_at else ""
        sent_at = send.sent_at.isoformat() if send.sent_at else ""
        scheduled_at = send.scheduled_at.isoformat() if send.scheduled_at else ""

        export_data.append(
            {
                "id": send.id,
                "campaign_id": send.campaign_id or "",
                "batch_id": send.batch_id or "",
                "step_id": send.step_id or "",
                "recipient_email": send.recipient_email or "",
                "recipient_name": send.recipient_name or "",
                "status": send.status.value if send.status else "",
                "variant": send.variant.value if send.variant else "",
                "scheduled_at": scheduled_at,
                "sent_at": sent_at,
                "provider_message_id": send.provider_message_id or "",
                "error_message": send.error_message or "",
                "created_at": created_at,
            }
        )

    # Export CSV avec headers explicites
    headers = [
        "id",
        "campaign_id",
        "batch_id",
        "step_id",
        "recipient_email",
        "recipient_name",
        "status",
        "variant",
        "scheduled_at",
        "sent_at",
        "provider_message_id",
        "error_message",
        "created_at",
    ]

    buffer = ExportService.export_csv(
        data=export_data,
        filename="email_sends.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=email_sends.csv"},
    )
