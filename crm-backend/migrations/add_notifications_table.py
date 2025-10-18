"""
Migration Alembic - Création de la table notifications

Cette migration ajoute la table `notifications` utilisée par
le système de notifications temps réel (WebSocket + Redis).
"""

from alembic import op
import sqlalchemy as sa


revision = "add_notifications_table"
down_revision = "add_roles_permissions"
branch_labels = None
depends_on = None

notification_type_enum = sa.Enum(
    "task_due",
    "task_assigned",
    "task_completed",
    "interaction_new",
    "interaction_assigned",
    "mandat_signed",
    "mandat_expired",
    "mandat_expiring_soon",
    "organisation_created",
    "organisation_updated",
    "organisation_assigned",
    "pipeline_moved",
    "pipeline_stuck",
    "mention",
    "comment_reply",
    "system",
    "export_ready",
    "import_completed",
    name="notificationtype",
    create_type=False,
)

notification_priority_enum = sa.Enum(
    "low",
    "normal",
    "high",
    "urgent",
    name="notificationpriority",
    create_type=False,
)


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        notification_type_enum.create(bind, checkfirst=True)
        notification_priority_enum.create(bind, checkfirst=True)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("type", notification_type_enum, nullable=False),
        sa.Column(
            "priority",
            notification_priority_enum,
            nullable=False,
            server_default=sa.text("'normal'"),
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("resource_type", sa.String(length=50), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_notifications_user_id",
            ondelete="CASCADE",
        ),
    )

    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])
    op.create_index("ix_notifications_priority", "notifications", ["priority"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index(
        "ix_notifications_is_archived",
        "notifications",
        ["is_archived"],
    )
    op.create_index(
        "ix_notifications_resource_type",
        "notifications",
        ["resource_type"],
    )
    op.create_index(
        "ix_notifications_resource_id",
        "notifications",
        ["resource_id"],
    )
    op.create_index(
        "ix_notifications_created_at",
        "notifications",
        ["created_at"],
    )
    op.create_index(
        "ix_notifications_expires_at",
        "notifications",
        ["expires_at"],
    )
    op.create_index(
        "ix_notifications_user_read",
        "notifications",
        ["user_id", "is_read"],
    )
    op.create_index(
        "ix_notifications_user_archived",
        "notifications",
        ["user_id", "is_archived"],
    )


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.drop_index(
        "ix_notifications_user_archived", table_name="notifications"
    )
    op.drop_index("ix_notifications_user_read", table_name="notifications")
    op.drop_index("ix_notifications_expires_at", table_name="notifications")
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_resource_id", table_name="notifications")
    op.drop_index("ix_notifications_resource_type", table_name="notifications")
    op.drop_index("ix_notifications_is_archived", table_name="notifications")
    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_priority", table_name="notifications")
    op.drop_index("ix_notifications_type", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")

    op.drop_table("notifications")

    if dialect == "postgresql":
        notification_priority_enum.drop(bind, checkfirst=True)
        notification_type_enum.drop(bind, checkfirst=True)
