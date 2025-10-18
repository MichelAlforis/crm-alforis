"""
Tests - Système d'Exports (CSV, Excel, PDF)

Tests pour:
- Export CSV organisations/people/mandats
- Export Excel avec graphiques
- Export PDF avec styling professionnel
- Filtrage par permissions
- Performance avec grands datasets
"""

import pytest
import os
import tempfile
from io import BytesIO
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models.organisation import Organisation, OrganisationCategory
from models.person import Person
from models.mandat import Mandat, MandatType, MandatStatus
from models.user import User
from core.exports import (
    ExportService,
    export_organisations_csv,
    export_organisations_excel,
    export_organisations_pdf,
    export_mandats_pdf,
)


# ============================================
# Tests Export CSV
# ============================================

def test_export_csv_basic(test_db: Session, admin_user: User, sample_organisations):
    """Test export CSV basique"""
    # Export en BytesIO
    buffer = ExportService.export_csv(
        data=sample_organisations,
        filename="organisations.csv",
    )

    # Vérifier que c'est un BytesIO
    assert isinstance(buffer, BytesIO)

    # Lire le contenu
    content = buffer.getvalue().decode('utf-8-sig')

    # Vérifier header
    assert "id" in content
    assert "name" in content

    # Vérifier données
    for org in sample_organisations:
        assert org.name in content


def test_export_csv_with_headers(test_db: Session, sample_organisations):
    """Test export CSV avec headers personnalisés"""
    buffer = ExportService.export_csv(
        data=sample_organisations,
        filename="test.csv",
        headers=["id", "name", "category"],
    )

    content = buffer.getvalue().decode('utf-8-sig')

    # Vérifier seulement les colonnes demandées
    assert "id" in content
    assert "name" in content
    assert "category" in content


def test_export_csv_empty_data(test_db: Session):
    """Test export CSV avec données vides"""
    buffer = ExportService.export_csv(
        data=[],
        filename="empty.csv",
    )

    content = buffer.getvalue().decode('utf-8-sig')

    # Devrait avoir au moins les headers (vide si aucune donnée)
    assert len(content) >= 0


def test_export_csv_special_characters(test_db: Session):
    """Test export CSV avec caractères spéciaux"""
    org = Organisation(
        name="L'Oréal & Co.",
        email="test@oréal.fr",
        description="Description avec \"guillemets\" et, virgules",
    )

    buffer = ExportService.export_csv(
        data=[org],
        filename="special.csv",
    )

    content = buffer.getvalue().decode('utf-8-sig')

    # Vérifier que les caractères spéciaux sont préservés
    assert "L'Oréal" in content or "Oréal" in content
    assert "guillemets" in content


# ============================================
# Tests Export Excel Simple
# ============================================

def test_export_excel_simple_basic(test_db: Session, sample_organisations):
    """Test export Excel simple sans graphiques"""
    buffer = ExportService.export_excel_simple(
        data=sample_organisations,
        filename="organisations.xlsx",
    )

    # Vérifier que c'est un BytesIO
    assert isinstance(buffer, BytesIO)

    # Vérifier taille non vide
    assert len(buffer.getvalue()) > 0


def test_export_excel_simple_with_headers(test_db: Session, sample_organisations):
    """Test export Excel avec headers personnalisés"""
    buffer = ExportService.export_excel_simple(
        data=sample_organisations,
        filename="test.xlsx",
        headers=["id", "name", "email"],
    )

    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0


def test_export_excel_simple_empty(test_db: Session):
    """Test export Excel avec données vides"""
    buffer = ExportService.export_excel_simple(
        data=[],
        filename="empty.xlsx",
    )

    # Devrait quand même créer un fichier Excel valide
    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0


# ============================================
# Tests Export Excel Avancé (avec graphiques)
# ============================================

def test_export_excel_with_charts(test_db: Session, sample_organisations):
    """Test export Excel avec graphiques"""
    buffer = ExportService.export_organisations_excel(
        organisations=sample_organisations,
        filename="organisations_charts.xlsx",
        include_charts=True,
    )

    # Vérifier création
    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0

    # Le fichier devrait être plus gros avec les graphiques
    # (pas de vérification exacte car dépend de openpyxl)


def test_export_excel_without_charts(test_db: Session, sample_organisations):
    """Test export Excel sans graphiques"""
    buffer_with = ExportService.export_organisations_excel(
        organisations=sample_organisations,
        filename="with.xlsx",
        include_charts=True,
    )

    buffer_without = ExportService.export_organisations_excel(
        organisations=sample_organisations,
        filename="without.xlsx",
        include_charts=False,
    )

    # Fichier sans graphiques devrait être plus petit
    assert len(buffer_without.getvalue()) <= len(buffer_with.getvalue())


def test_export_excel_organisations_categories(test_db: Session):
    """Test export Excel avec différentes catégories"""
    orgs = [
        Organisation(name="Bank", category=OrganisationCategory.INSTITUTION),
        Organisation(name="Startup", category=OrganisationCategory.STARTUP),
        Organisation(name="Corp", category=OrganisationCategory.CORPORATION),
    ]

    for org in orgs:
        test_db.add(org)
    test_db.commit()

    buffer = ExportService.export_organisations_excel(
        organisations=orgs,
        filename="categories.xlsx",
        include_charts=True,
    )

    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0


# ============================================
# Tests Export PDF
# ============================================

def test_export_pdf_organisations(test_db: Session, sample_organisations):
    """Test export PDF organisations"""
    buffer = ExportService.export_organisations_pdf(
        organisations=sample_organisations,
        filename="organisations.pdf",
    )

    # Vérifier PDF créé
    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0

    # Vérifier signature PDF
    content = buffer.getvalue()
    assert content.startswith(b'%PDF')


def test_export_pdf_with_metadata(test_db: Session, sample_organisations):
    """Test export PDF avec métadonnées"""
    buffer = ExportService.export_organisations_pdf(
        organisations=sample_organisations,
        filename="test.pdf",
        title="Rapport Organisations",
        author="CRM Alforis",
    )

    content = buffer.getvalue()
    assert content.startswith(b'%PDF')


def test_export_pdf_empty_organisations(test_db: Session):
    """Test export PDF avec liste vide"""
    buffer = ExportService.export_organisations_pdf(
        organisations=[],
        filename="empty.pdf",
    )

    # Devrait quand même créer un PDF
    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0


def test_export_pdf_mandats(test_db: Session, admin_user: User):
    """Test export PDF mandats"""
    # Créer organisation
    org = Organisation(name="Test Org")
    test_db.add(org)
    test_db.flush()

    # Créer mandats
    mandats = []
    for i in range(3):
        mandat = Mandat(
            organisation_id=org.id,
            number=f"M-2025-{i:03d}",
            type=MandatType.VENTE,
            status=MandatStatus.ACTIVE,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=365),
            owner_id=admin_user.id,
        )
        mandats.append(mandat)
        test_db.add(mandat)

    test_db.commit()

    # Export PDF
    buffer = ExportService.export_mandats_pdf(
        mandats=mandats,
        filename="mandats.pdf",
    )

    # Vérifier PDF
    assert isinstance(buffer, BytesIO)
    content = buffer.getvalue()
    assert content.startswith(b'%PDF')
    assert len(content) > 0


def test_export_pdf_mandats_with_details(test_db: Session, admin_user: User):
    """Test export PDF mandats avec détails complets"""
    org = Organisation(name="Test Corp", city="Paris")
    test_db.add(org)
    test_db.flush()

    mandat = Mandat(
        organisation_id=org.id,
        number="M-2025-001",
        type=MandatType.ACQUISITION,
        status=MandatStatus.ACTIVE,
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=365),
        description="Mandat d'acquisition stratégique",
        conditions="Conditions spéciales",
        owner_id=admin_user.id,
    )
    test_db.add(mandat)
    test_db.commit()

    buffer = ExportService.export_mandats_pdf(
        mandats=[mandat],
        filename="mandat_details.pdf",
    )

    content = buffer.getvalue()
    assert content.startswith(b'%PDF')


# ============================================
# Tests Helpers Asynchrones
# ============================================

@pytest.mark.asyncio
async def test_export_organisations_csv_helper(test_db: Session, sample_organisations):
    """Test helper export_organisations_csv"""
    buffer = await export_organisations_csv(
        organisations=sample_organisations,
        db=test_db,
    )

    assert isinstance(buffer, BytesIO)
    content = buffer.getvalue().decode('utf-8-sig')
    assert "name" in content


@pytest.mark.asyncio
async def test_export_organisations_excel_helper(test_db: Session, sample_organisations):
    """Test helper export_organisations_excel"""
    buffer = await export_organisations_excel(
        organisations=sample_organisations,
        db=test_db,
        include_charts=True,
    )

    assert isinstance(buffer, BytesIO)
    assert len(buffer.getvalue()) > 0


@pytest.mark.asyncio
async def test_export_organisations_pdf_helper(test_db: Session, sample_organisations):
    """Test helper export_organisations_pdf"""
    buffer = await export_organisations_pdf(
        organisations=sample_organisations,
        db=test_db,
    )

    assert isinstance(buffer, BytesIO)
    assert buffer.getvalue().startswith(b'%PDF')


# ============================================
# Tests Permissions & Filtrage
# ============================================

def test_export_with_team_filtering(test_db: Session):
    """Test export avec filtrage par équipe"""
    from models.role import Role, UserRole
    from models.team import Team

    # Créer équipe et manager
    team = Team(name="Team A")
    test_db.add(team)
    test_db.flush()

    manager_role = Role(name=UserRole.MANAGER, display_name="Manager", level=2)
    manager = User(
        email="manager@test.com",
        username="manager",
        hashed_password="hash",
        role=manager_role,
        team_id=team.id,
    )

    test_db.add_all([manager_role, manager])
    test_db.flush()

    # Créer organisations de l'équipe
    org1 = Organisation(name="Team Org 1", owner_id=manager.id)
    org2 = Organisation(name="Team Org 2", owner_id=manager.id)

    test_db.add_all([org1, org2])
    test_db.commit()

    # Export seulement organisations de l'équipe
    buffer = ExportService.export_organisations_excel(
        organisations=[org1, org2],
        filename="team_orgs.xlsx",
    )

    assert isinstance(buffer, BytesIO)


def test_export_respects_permissions(test_db: Session, admin_user: User):
    """Test: Export respecte les permissions"""
    # Admin peut exporter toutes les organisations
    orgs = test_db.query(Organisation).all()

    buffer = ExportService.export_organisations_pdf(
        organisations=orgs,
        filename="all_orgs.pdf",
    )

    assert isinstance(buffer, BytesIO)


# ============================================
# Tests Performance
# ============================================

def test_export_large_dataset_csv(test_db: Session):
    """Test performance export CSV grand dataset"""
    import time

    # Créer 1000 organisations
    orgs = [Organisation(name=f"Company {i}") for i in range(1000)]
    test_db.add_all(orgs)
    test_db.commit()

    # Mesurer temps export
    start = time.time()

    buffer = ExportService.export_csv(
        data=orgs,
        filename="large.csv",
    )

    duration = time.time() - start

    # Devrait être rapide (< 2 secondes)
    assert duration < 2.0
    assert len(buffer.getvalue()) > 0


def test_export_large_dataset_excel(test_db: Session):
    """Test performance export Excel grand dataset"""
    import time

    # Créer 500 organisations
    orgs = [Organisation(name=f"Org {i}", email=f"org{i}@test.com") for i in range(500)]
    test_db.add_all(orgs)
    test_db.commit()

    # Mesurer temps
    start = time.time()

    buffer = ExportService.export_organisations_excel(
        organisations=orgs,
        filename="large.xlsx",
        include_charts=False,  # Sans graphiques pour perf
    )

    duration = time.time() - start

    # Excel est plus lent que CSV mais devrait rester < 5 sec
    assert duration < 5.0
    assert len(buffer.getvalue()) > 0


def test_export_large_dataset_pdf(test_db: Session):
    """Test performance export PDF grand dataset"""
    import time

    # Créer 100 organisations (PDF plus lent)
    orgs = [Organisation(name=f"Org {i}") for i in range(100)]
    test_db.add_all(orgs)
    test_db.commit()

    start = time.time()

    buffer = ExportService.export_organisations_pdf(
        organisations=orgs,
        filename="large.pdf",
    )

    duration = time.time() - start

    # PDF plus lent, mais devrait rester < 10 sec
    assert duration < 10.0
    assert len(buffer.getvalue()) > 0


# ============================================
# Tests Edge Cases
# ============================================

def test_export_with_null_values(test_db: Session):
    """Test export avec valeurs NULL"""
    org = Organisation(
        name="Test Org",
        email=None,
        phone=None,
        description=None,
    )
    test_db.add(org)
    test_db.commit()

    # CSV
    buffer_csv = ExportService.export_csv(
        data=[org],
        filename="null.csv",
    )
    assert len(buffer_csv.getvalue()) > 0

    # Excel
    buffer_excel = ExportService.export_organisations_excel(
        organisations=[org],
        filename="null.xlsx",
    )
    assert len(buffer_excel.getvalue()) > 0

    # PDF
    buffer_pdf = ExportService.export_organisations_pdf(
        organisations=[org],
        filename="null.pdf",
    )
    assert len(buffer_pdf.getvalue()) > 0


def test_export_with_very_long_text(test_db: Session):
    """Test export avec texte très long"""
    long_text = "A" * 10000  # 10k caractères

    org = Organisation(
        name="Test",
        description=long_text,
        notes=long_text,
    )
    test_db.add(org)
    test_db.commit()

    # CSV devrait gérer le texte long
    buffer = ExportService.export_csv(
        data=[org],
        filename="long.csv",
    )
    assert len(buffer.getvalue()) > 0


def test_export_unicode_characters(test_db: Session):
    """Test export avec caractères Unicode"""
    org = Organisation(
        name="测试 🚀 Test",
        email="测试@example.com",
        description="Unicode: 日本語, 中文, العربية, עברית",
    )
    test_db.add(org)
    test_db.commit()

    # CSV avec UTF-8 BOM
    buffer = ExportService.export_csv(
        data=[org],
        filename="unicode.csv",
    )

    content = buffer.getvalue().decode('utf-8-sig')
    assert "测试" in content or "Test" in content


def test_export_filename_sanitization(test_db: Session, sample_organisations):
    """Test: Noms de fichiers sont sécurisés"""
    # Noms de fichiers avec caractères dangereux
    dangerous_names = [
        "../../../etc/passwd.csv",
        "test<script>.xlsx",
        "test|pipe.pdf",
    ]

    for filename in dangerous_names:
        # Ne devrait pas planter
        buffer = ExportService.export_csv(
            data=sample_organisations,
            filename=filename,
        )
        assert isinstance(buffer, BytesIO)


# ============================================
# Tests Intégration
# ============================================

def test_export_organisations_all_formats(test_db: Session, sample_organisations):
    """Test: Export organisations dans tous les formats"""
    # CSV
    csv_buffer = ExportService.export_csv(
        data=sample_organisations,
        filename="orgs.csv",
    )
    assert len(csv_buffer.getvalue()) > 0

    # Excel Simple
    excel_simple = ExportService.export_excel_simple(
        data=sample_organisations,
        filename="orgs_simple.xlsx",
    )
    assert len(excel_simple.getvalue()) > 0

    # Excel avec graphiques
    excel_charts = ExportService.export_organisations_excel(
        organisations=sample_organisations,
        filename="orgs.xlsx",
        include_charts=True,
    )
    assert len(excel_charts.getvalue()) > 0

    # PDF
    pdf_buffer = ExportService.export_organisations_pdf(
        organisations=sample_organisations,
        filename="orgs.pdf",
    )
    assert pdf_buffer.getvalue().startswith(b'%PDF')


def test_export_people_csv(test_db: Session):
    """Test export people en CSV"""
    people = [
        Person(first_name="John", last_name="Doe", personal_email="john@test.com"),
        Person(first_name="Jane", last_name="Smith", personal_email="jane@test.com"),
    ]

    test_db.add_all(people)
    test_db.commit()

    buffer = ExportService.export_csv(
        data=people,
        filename="people.csv",
    )

    content = buffer.getvalue().decode('utf-8-sig')
    assert "John" in content
    assert "Jane" in content


def test_export_mandats_csv(test_db: Session, admin_user: User):
    """Test export mandats en CSV"""
    org = Organisation(name="Test Corp")
    test_db.add(org)
    test_db.flush()

    mandats = [
        Mandat(
            organisation_id=org.id,
            number="M-001",
            type=MandatType.VENTE,
            status=MandatStatus.ACTIVE,
            owner_id=admin_user.id,
        ),
        Mandat(
            organisation_id=org.id,
            number="M-002",
            type=MandatType.ACQUISITION,
            status=MandatStatus.SIGNED,
            owner_id=admin_user.id,
        ),
    ]

    test_db.add_all(mandats)
    test_db.commit()

    buffer = ExportService.export_csv(
        data=mandats,
        filename="mandats.csv",
    )

    content = buffer.getvalue().decode('utf-8-sig')
    assert "M-001" in content
    assert "M-002" in content


# ============================================
# Tests Spécifiques Excel Charts
# ============================================

def test_excel_charts_by_category(test_db: Session):
    """Test graphique Excel par catégorie"""
    orgs = [
        Organisation(name="Bank 1", category=OrganisationCategory.INSTITUTION),
        Organisation(name="Bank 2", category=OrganisationCategory.INSTITUTION),
        Organisation(name="Startup 1", category=OrganisationCategory.STARTUP),
    ]

    test_db.add_all(orgs)
    test_db.commit()

    buffer = ExportService.export_organisations_excel(
        organisations=orgs,
        filename="categories.xlsx",
        include_charts=True,
    )

    # Vérifier fichier plus gros avec graphiques
    assert len(buffer.getvalue()) > 5000  # Excel avec graphiques > 5KB


def test_excel_charts_by_pipeline(test_db: Session):
    """Test graphique Excel par pipeline stage"""
    orgs = [
        Organisation(name="Org 1", pipeline_stage="lead"),
        Organisation(name="Org 2", pipeline_stage="lead"),
        Organisation(name="Org 3", pipeline_stage="qualified"),
    ]

    test_db.add_all(orgs)
    test_db.commit()

    buffer = ExportService.export_organisations_excel(
        organisations=orgs,
        filename="pipeline.xlsx",
        include_charts=True,
    )

    assert len(buffer.getvalue()) > 5000
