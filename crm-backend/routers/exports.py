"""
Routes API - Exports (CSV, Excel, PDF)

Endpoints:
- GET /exports/organisations/csv : Export CSV organisations
- GET /exports/organisations/excel : Export Excel avec graphiques
- GET /exports/organisations/pdf : Export PDF rapport
- GET /exports/mandats/csv : Export CSV mandats
- GET /exports/mandats/pdf : Export PDF mandats
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db
from core.auth import get_current_user
from core.exports import ExportService
from core.permissions import filter_query_by_team
from models.user import User
from models.organisation import Organisation, OrganisationCategory
from models.mandat import Mandat, MandatType, MandatStatus
from models.person import Person

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/organisations/csv")
async def export_organisations_csv(
    category: Optional[OrganisationCategory] = Query(None, description="Filtrer par catégorie"),
    city: Optional[str] = Query(None, description="Filtrer par ville"),
    is_active: Optional[bool] = Query(None, description="Filtrer actives/inactives"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV organisations avec filtres

    **Exemples:**
    - `/exports/organisations/csv`
    - `/exports/organisations/csv?category=institution&city=Paris`
    - `/exports/organisations/csv?is_active=true`

    **Returns:** Fichier CSV téléchargeable
    """
    # Query avec permissions
    query = db.query(Organisation)
    query = filter_query_by_team(query, current_user, Organisation)

    # Filtres
    if category:
        query = query.filter(Organisation.category == category)
    if city:
        query = query.filter(Organisation.city == city)
    if is_active is not None:
        query = query.filter(Organisation.is_active == is_active)

    organisations = query.all()

    if not organisations:
        raise HTTPException(404, "Aucune organisation à exporter")

    # Export CSV with explicit columns
    headers = [
        "id", "name", "type", "category", "pipeline_stage",
        "email", "main_phone", "website", "address", "city",
        "country_code", "language", "annual_revenue", "employee_count",
        "created_at", "is_active"
    ]

    buffer = ExportService.export_csv(
        data=organisations,
        filename="organisations.csv",
        headers=headers,
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=organisations.csv"
        }
    )


@router.get("/organisations/excel")
async def export_organisations_excel(
    category: Optional[OrganisationCategory] = Query(None),
    city: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    include_charts: bool = Query(True, description="Inclure graphiques statistiques"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export Excel organisations avec graphiques

    **Fonctionnalités:**
    - Feuille "Données" avec styling professionnel
    - Feuille "Statistiques" avec graphiques (BarChart, PieChart)
    - Couleurs Alforis (#366092)
    - Colonnes auto-ajustées

    **Exemples:**
    - `/exports/organisations/excel`
    - `/exports/organisations/excel?include_charts=false` (plus rapide)
    - `/exports/organisations/excel?category=startup&is_active=true`

    **Returns:** Fichier Excel (.xlsx) téléchargeable
    """
    # Query avec permissions
    query = db.query(Organisation)
    query = filter_query_by_team(query, current_user, Organisation)

    # Filtres
    if category:
        query = query.filter(Organisation.category == category)
    if city:
        query = query.filter(Organisation.city == city)
    if is_active is not None:
        query = query.filter(Organisation.is_active == is_active)

    organisations = query.all()

    if not organisations:
        raise HTTPException(404, "Aucune organisation à exporter")

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
        headers={
            "Content-Disposition": "attachment; filename=organisations.xlsx"
        }
    )


@router.get("/organisations/pdf")
async def export_organisations_pdf(
    category: Optional[OrganisationCategory] = Query(None),
    city: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export PDF rapport organisations

    **Fonctionnalités:**
    - Table formatée avec bordures
    - Couleurs alternées (blanc/gris)
    - En-tête avec titre
    - Pied de page avec date

    **Exemples:**
    - `/exports/organisations/pdf`
    - `/exports/organisations/pdf?category=institution`

    **Returns:** Fichier PDF téléchargeable
    """
    # Query avec permissions
    query = db.query(Organisation)
    query = filter_query_by_team(query, current_user, Organisation)

    # Filtres
    if category:
        query = query.filter(Organisation.category == category)
    if city:
        query = query.filter(Organisation.city == city)
    if is_active is not None:
        query = query.filter(Organisation.is_active == is_active)

    organisations = query.all()

    if not organisations:
        raise HTTPException(404, "Aucune organisation à exporter")

    # Export PDF
    buffer = ExportService.export_organisations_pdf(
        organisations=organisations,
        filename="organisations.pdf",
        title="Rapport Organisations",
        author=f"{current_user.username} - CRM Alforis",
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=organisations.pdf"
        }
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

    if not mandats:
        raise HTTPException(404, "Aucun mandat à exporter")

    # Export CSV with explicit columns
    headers = [
        "id", "numero_mandat", "type", "status",
        "date_debut", "date_fin", "organisation_id",
        "created_at", "updated_at"
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
        headers={
            "Content-Disposition": "attachment; filename=mandats.csv"
        }
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

    if not mandats:
        raise HTTPException(404, "Aucun mandat à exporter")

    # Export PDF
    buffer = ExportService.export_mandats_pdf(
        mandats=mandats,
        filename="mandats.pdf",
    )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=mandats.pdf"
        }
    )


@router.get("/people/csv")
async def export_people_csv(
    role: Optional[str] = Query(None, description="Filtrer par rôle"),
    country_code: Optional[str] = Query(None, description="Filtrer par pays"),
    language: Optional[str] = Query(None, description="Filtrer par langue"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export CSV personnes physiques

    **Exemples:**
    - `/exports/people/csv`
    - `/exports/people/csv?role=Directeur&country_code=FR`
    - `/exports/people/csv?language=fr`

    **Returns:** Fichier CSV téléchargeable
    """
    # Query avec permissions
    query = db.query(Person)
    query = filter_query_by_team(query, current_user, Person)

    # Filtres
    if role:
        query = query.filter(Person.role.ilike(f"%{role}%"))
    if country_code:
        query = query.filter(Person.country_code == country_code)
    if language:
        query = query.filter(Person.language == language)

    people = query.all()

    if not people:
        raise HTTPException(404, "Aucune personne à exporter")

    # Export CSV with explicit columns
    headers = [
        "id", "first_name", "last_name", "role",
        "personal_email", "personal_phone",
        "country_code", "language", "address",
        "created_at", "updated_at"
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
        headers={
            "Content-Disposition": "attachment; filename=people.csv"
        }
    )


@router.get("/people/excel")
async def export_people_excel(
    role: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export Excel personnes physiques

    **Fonctionnalités:**
    - Feuille "Personnes" avec styling professionnel
    - Colonnes auto-ajustées
    - En-têtes avec couleurs Alforis

    **Exemples:**
    - `/exports/people/excel`
    - `/exports/people/excel?country_code=FR`

    **Returns:** Fichier Excel (.xlsx) téléchargeable
    """
    # Query avec permissions
    query = db.query(Person)
    query = filter_query_by_team(query, current_user, Person)

    # Filtres
    if role:
        query = query.filter(Person.role.ilike(f"%{role}%"))
    if country_code:
        query = query.filter(Person.country_code == country_code)
    if language:
        query = query.filter(Person.language == language)

    people = query.all()

    if not people:
        raise HTTPException(404, "Aucune personne à exporter")

    # Export Excel with explicit columns
    headers = [
        "id", "first_name", "last_name", "role",
        "personal_email", "personal_phone",
        "country_code", "language", "address",
        "created_at"
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
        headers={
            "Content-Disposition": "attachment; filename=people.xlsx"
        }
    )


@router.get("/people/pdf")
async def export_people_pdf(
    role: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export PDF rapport personnes physiques

    **Fonctionnalités:**
    - Table formatée avec bordures
    - Couleurs alternées (blanc/gris)
    - En-tête avec titre
    - Résumé statistique

    **Exemples:**
    - `/exports/people/pdf`
    - `/exports/people/pdf?role=Directeur`

    **Returns:** Fichier PDF téléchargeable
    """
    # Query avec permissions
    query = db.query(Person)
    query = filter_query_by_team(query, current_user, Person)

    # Filtres
    if role:
        query = query.filter(Person.role.ilike(f"%{role}%"))
    if country_code:
        query = query.filter(Person.country_code == country_code)
    if language:
        query = query.filter(Person.language == language)

    people = query.all()

    if not people:
        raise HTTPException(404, "Aucune personne à exporter")

    # Préparer les données pour le PDF (format similaire à export_organisations_pdf)
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from datetime import datetime

    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    story = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=30,
        alignment=1,
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#34495E'),
        spaceAfter=12,
    )

    # Titre
    story.append(Paragraph("Rapport Personnes Physiques", title_style))
    story.append(Paragraph(
        f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
        styles['Normal']
    ))
    story.append(Spacer(1, 20))

    # Résumé
    story.append(Paragraph("Résumé Exécutif", heading_style))
    story.append(Paragraph(
        f"Nombre total de personnes: <b>{len(people)}</b>",
        styles['Normal']
    ))
    story.append(Spacer(1, 20))

    # Table des personnes
    story.append(Paragraph("Liste des Personnes", heading_style))

    # Préparer données table
    table_data = [['Nom', 'Prénom', 'Rôle', 'Email', 'Pays']]

    for person in people[:50]:  # Limiter à 50 pour PDF
        country = getattr(person, 'country_code', '') or ''
        table_data.append([
            (getattr(person, 'last_name', '') or '')[:20],
            (getattr(person, 'first_name', '') or '')[:20],
            (getattr(person, 'role', '') or '')[:25],
            (getattr(person, 'personal_email', '') or '')[:30],
            country,
        ])

    # Créer table
    table = Table(table_data, colWidths=[1.5*inch, 1.5*inch, 1.8*inch, 2*inch, 0.8*inch])
    table.setStyle(TableStyle([
        # En-tête
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

        # Corps
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),

        # Bordures
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ECF0F1')]),
    ]))

    story.append(table)

    if len(people) > 50:
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            f"<i>Note: Seules les 50 premières personnes sont affichées. Total: {len(people)}</i>",
            styles['Normal']
        ))

    # Générer PDF
    doc.build(story)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=people.pdf"
        }
    )
