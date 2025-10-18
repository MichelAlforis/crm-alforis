"""
Migration Alembic - Création des tables RBAC (roles, permissions, role_permissions)

Cette migration crée les tables nécessaires au système de permissions
granulaires ainsi que l'association many-to-many entre rôles et permissions.
"""

from alembic import op
import sqlalchemy as sa


# Identifiants de révision Alembic
revision = "add_roles_permissions"
down_revision = "add_fulltext_search"
branch_labels = None
depends_on = None

# Types ENUM utilisés par les permissions
permission_resource_enum = sa.Enum(
    "organisations",
    "people",
    "mandats",
    "interactions",
    "tasks",
    "documents",
    "users",
    "roles",
    "permissions",
    "teams",
    "settings",
    "reports",
    name="permissionresource",
    create_type=False,
)

permission_action_enum = sa.Enum(
    "create",
    "read",
    "update",
    "delete",
    "export",
    "import",
    "manage",
    name="permissionaction",
    create_type=False,
)


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    # Créer explicitement les types ENUM sur PostgreSQL
    if dialect == "postgresql":
        permission_resource_enum.create(bind, checkfirst=True)
        permission_action_enum.create(bind, checkfirst=True)

    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource", permission_resource_enum, nullable=False),
        sa.Column("action", permission_action_enum, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("TRUE"),
        ),
        sa.Column(
            "is_system",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
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
            server_onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("name", name="uq_permissions_name"),
    )

    op.create_index("ix_permissions_resource", "permissions", ["resource"])
    op.create_index("ix_permissions_action", "permissions", ["action"])
    op.create_index("ix_permissions_is_active", "permissions", ["is_active"])
    op.create_index("ix_permissions_created_at", "permissions", ["created_at"])

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "level",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("TRUE"),
        ),
        sa.Column(
            "is_system",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
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
            server_onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )

    op.create_index("ix_roles_name", "roles", ["name"])
    op.create_index("ix_roles_level", "roles", ["level"])
    op.create_index("ix_roles_is_active", "roles", ["is_active"])

    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("role_id", "permission_id", name="pk_role_permissions"),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            name="fk_role_permissions_role_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            name="fk_role_permissions_permission_id",
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        "ix_role_permissions_role_id", "role_permissions", ["role_id"]
    )
    op.create_index(
        "ix_role_permissions_permission_id",
        "role_permissions",
        ["permission_id"],
    )


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.drop_index(
        "ix_role_permissions_permission_id",
        table_name="role_permissions",
    )
    op.drop_index("ix_role_permissions_role_id", table_name="role_permissions")
    op.drop_table("role_permissions")

    op.drop_index("ix_roles_is_active", table_name="roles")
    op.drop_index("ix_roles_level", table_name="roles")
    op.drop_index("ix_roles_name", table_name="roles")
    op.drop_table("roles")

    op.drop_index("ix_permissions_created_at", table_name="permissions")
    op.drop_index("ix_permissions_is_active", table_name="permissions")
    op.drop_index("ix_permissions_action", table_name="permissions")
    op.drop_index("ix_permissions_resource", table_name="permissions")
    op.drop_table("permissions")

    if dialect == "postgresql":
        permission_action_enum.drop(bind, checkfirst=True)
        permission_resource_enum.drop(bind, checkfirst=True)
