"""Add interaction participants M-N table + external_participants

Revision ID: add_interaction_participants
Revises: add_interactions_v1
Create Date: 2025-10-24

Feature: Participants multiples pour réunions (internes + externes)

Changements:
1. Table interaction_participants (M-N avec people)
   - interaction_id, person_id (PK composite)
   - role varchar(80)
   - present boolean DEFAULT TRUE
   - Cascade DELETE sur suppression interaction/person

2. Colonne external_participants dans crm_interactions
   - Type JSONB
   - Default []
   - Contenu: [{ name, email, company }]
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_interaction_participants"
down_revision = "add_interactions_v1"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Ajouter la colonne external_participants dans crm_interactions
    op.add_column(
        "crm_interactions",
        sa.Column(
            "external_participants",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )

    # 2. Créer la table interaction_participants (M-N)
    op.create_table(
        "interaction_participants",
        sa.Column("interaction_id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=80), nullable=True),
        sa.Column("present", sa.Boolean(), nullable=False, server_default="true"),
        # PK composite
        sa.PrimaryKeyConstraint("interaction_id", "person_id"),
        # Foreign keys avec CASCADE DELETE
        sa.ForeignKeyConstraint(["interaction_id"], ["crm_interactions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        # Contrainte unicité (redondante avec PK mais explicite)
        sa.UniqueConstraint("interaction_id", "person_id", name="uq_interaction_person"),
    )

    # Index pour requêtes optimisées
    op.create_index(
        "idx_interaction_participants_interaction",
        "interaction_participants",
        ["interaction_id"],
    )
    op.create_index(
        "idx_interaction_participants_person",
        "interaction_participants",
        ["person_id"],
    )


def downgrade():
    # Drop index
    op.drop_index("idx_interaction_participants_person", table_name="interaction_participants")
    op.drop_index("idx_interaction_participants_interaction", table_name="interaction_participants")

    # Drop table
    op.drop_table("interaction_participants")

    # Drop column
    op.drop_column("crm_interactions", "external_participants")
