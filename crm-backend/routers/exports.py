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

    # Export CSV
    buffer = ExportService.export_csv(
        data=organisations,
        filename="organisations.csv",
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

    # Export CSV
    buffer = ExportService.export_csv(
        data=mandats,
        filename="mandats.csv",
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
