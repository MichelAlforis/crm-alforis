"""
Migration Alembic - Table organisation_activities (timeline unifiée)

Cette migration introduit la table utilisée par la timeline d'activités
par organisation (Phase 2 - Widget Activity). Elle stocke un flux
chronologique d'événements (interactions, tâches, mandats, emails, etc.).
"""

from alembic import op
import sqlalchemy as sa


revision = "add_organisation_activity"
down_revision = "seed_rbac_defaults"
branch_labels = None
depends_on = None

activity_type_enum = sa.Enum(
    "interaction_created",
    "interaction_updated",
    "task_created",
    "task_completed",
    "task_updated",
    "note_added",
    "document_added",
    "mandat_created",
    "mandat_status_changed",
    "mandat_updated",
    "organisation_created",
    "organisation_updated",
    "email_sent",
    "system_event",
    name="organisationactivitytype",
    create_type=False,
)


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        activity_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "organisation_activities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
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
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("type", activity_type_enum, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("preview", sa.Text(), nullable=True),
        sa.Column("actor_id", sa.String(length=64), nullable=True),
        sa.Column("actor_name", sa.String(length=255), nullable=True),
        sa.Column("actor_avatar_url", sa.String(length=512), nullable=True),
        sa.Column("resource_type", sa.String(length=64), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )

    op.create_index(
        "idx_org_activities_org_occurred",
        "organisation_activities",
        ["organisation_id", "occurred_at"],
    )
    op.create_index(
        "idx_org_activities_type",
        "organisation_activities",
        ["type"],
    )
    op.create_index(
        "idx_org_activities_resource",
        "organisation_activities",
        ["resource_type", "resource_id"],
    )
    op.create_index(
        "idx_org_activities_actor",
        "organisation_activities",
        ["actor_id"],
    )


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.drop_index("idx_org_activities_actor", table_name="organisation_activities")
    op.drop_index("idx_org_activities_resource", table_name="organisation_activities")
    op.drop_index("idx_org_activities_type", table_name="organisation_activities")
    op.drop_index("idx_org_activities_org_occurred", table_name="organisation_activities")

    op.drop_table("organisation_activities")

    if dialect == "postgresql":
        activity_type_enum.drop(bind, checkfirst=True)
