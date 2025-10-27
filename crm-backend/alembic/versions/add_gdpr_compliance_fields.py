"""add_gdpr_compliance_fields

Revision ID: gdpr_001
Revises: perf_indexes_001
Create Date: 2025-10-26 23:15:00.000000

Ajoute les champs RGPD pour la conformité GDPR:
- is_anonymized: Indique si les données ont été anonymisées
- gdpr_consent: Consentement explicite pour le traitement des données
- gdpr_consent_date: Date du consentement
- anonymized_at: Date d'anonymisation
- last_activity_date: Dernière activité (pour calcul d'inactivité)
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "gdpr_001"
down_revision = "perf_indexes_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Ajoute les champs RGPD aux tables people et organisations
    """

    # ========================================
    # Table: people
    # ========================================
    op.add_column(
        "people", sa.Column("is_anonymized", sa.Boolean(), nullable=False, server_default="false")
    )
    op.add_column("people", sa.Column("gdpr_consent", sa.Boolean(), nullable=True))
    op.add_column(
        "people", sa.Column("gdpr_consent_date", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("people", sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "people", sa.Column("last_activity_date", sa.DateTime(timezone=True), nullable=True)
    )

    # Indexes pour optimiser les requêtes d'anonymisation
    op.create_index("idx_people_anonymized", "people", ["is_anonymized"])
    op.create_index("idx_people_last_activity", "people", ["last_activity_date"])
    op.create_index("idx_people_gdpr_consent", "people", ["gdpr_consent"])

    # ========================================
    # Table: organisations
    # ========================================
    op.add_column(
        "organisations",
        sa.Column("is_anonymized", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("organisations", sa.Column("gdpr_consent", sa.Boolean(), nullable=True))
    op.add_column(
        "organisations", sa.Column("gdpr_consent_date", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "organisations", sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "organisations", sa.Column("last_activity_date", sa.DateTime(timezone=True), nullable=True)
    )

    # Indexes
    op.create_index("idx_organisations_anonymized", "organisations", ["is_anonymized"])
    op.create_index("idx_organisations_last_activity", "organisations", ["last_activity_date"])
    op.create_index("idx_organisations_gdpr_consent", "organisations", ["gdpr_consent"])

    # ========================================
    # Initialiser last_activity_date avec updated_at existant
    # ========================================
    op.execute(
        """
        UPDATE people
        SET last_activity_date = updated_at
        WHERE last_activity_date IS NULL AND updated_at IS NOT NULL
    """
    )

    op.execute(
        """
        UPDATE organisations
        SET last_activity_date = updated_at
        WHERE last_activity_date IS NULL AND updated_at IS NOT NULL
    """
    )


def downgrade() -> None:
    """
    Supprime les champs RGPD
    """

    # Supprimer les indexes
    op.drop_index("idx_people_gdpr_consent", table_name="people")
    op.drop_index("idx_people_last_activity", table_name="people")
    op.drop_index("idx_people_anonymized", table_name="people")

    op.drop_index("idx_organisations_gdpr_consent", table_name="organisations")
    op.drop_index("idx_organisations_last_activity", table_name="organisations")
    op.drop_index("idx_organisations_anonymized", table_name="organisations")

    # Supprimer les colonnes - people
    op.drop_column("people", "last_activity_date")
    op.drop_column("people", "anonymized_at")
    op.drop_column("people", "gdpr_consent_date")
    op.drop_column("people", "gdpr_consent")
    op.drop_column("people", "is_anonymized")

    # Supprimer les colonnes - organisations
    op.drop_column("organisations", "last_activity_date")
    op.drop_column("organisations", "anonymized_at")
    op.drop_column("organisations", "gdpr_consent_date")
    op.drop_column("organisations", "gdpr_consent")
    op.drop_column("organisations", "is_anonymized")
