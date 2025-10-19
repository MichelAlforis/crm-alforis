"""
Migration Alembic - Table dashboard_kpis (KPIs mensuels unifiés)

Cette migration introduit la table `dashboard_kpis` utilisée pour
stocker les indicateurs mensuels par organisation. Elle remplace les
anciennes tables KPI par investisseur/fournisseur.
"""

from alembic import op
import sqlalchemy as sa


revision = "add_dashboard_kpis_table"
down_revision = "add_organisation_activity"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "dashboard_kpis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "organisation_id",
            sa.Integer(),
            sa.ForeignKey("organisations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column(
            "rdv_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "pitchs",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "due_diligences",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "closings",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "revenue",
            sa.Float(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("commission_rate", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "auto_generated",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.Column("data_source", sa.String(length=255), nullable=True),
        sa.UniqueConstraint(
            "organisation_id",
            "year",
            "month",
            name="uq_dashboard_kpis_org_year_month",
        ),
    )

    op.create_index(
        "ix_dashboard_kpis_org",
        "dashboard_kpis",
        ["organisation_id"],
    )
    op.create_index(
        "ix_dashboard_kpis_period",
        "dashboard_kpis",
        ["year", "month"],
    )


def downgrade():
    op.drop_index("ix_dashboard_kpis_period", table_name="dashboard_kpis")
    op.drop_index("ix_dashboard_kpis_org", table_name="dashboard_kpis")
    op.drop_table("dashboard_kpis")
