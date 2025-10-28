"""Add known_companies table for autofill

Revision ID: known_companies_v1
Revises: autofill_logs_v1
Create Date: 2025-10-28 08:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = 'known_companies_v1'
down_revision: Union[str, None] = 'autofill_logs_v1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Créer table known_companies
    op.create_table(
        'known_companies',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('domain', sa.String(255), nullable=False, unique=True, index=True,
                  comment='Domaine email sans www (ex: mandarine-gestion.com)'),
        sa.Column('company_name', sa.String(255), nullable=False,
                  comment='Nom commercial de l\'entreprise'),
        sa.Column('company_website', sa.String(500), nullable=True,
                  comment='Site web officiel (avec https://)'),
        sa.Column('company_linkedin', sa.String(500), nullable=True,
                  comment='Page LinkedIn entreprise'),
        sa.Column('industry', sa.String(100), nullable=True,
                  comment='Secteur d\'activité'),
        sa.Column('country_code', sa.String(2), nullable=True,
                  comment='Code pays ISO (FR, US, etc.)'),
        sa.Column('verified', sa.Boolean(), server_default='false', nullable=False,
                  comment='Données vérifiées manuellement'),
        sa.Column('confidence_score', sa.Float(), server_default='0.8', nullable=False,
                  comment='Score de confiance (0.0-1.0)'),
        sa.Column('source', sa.String(50), server_default='manual', nullable=False,
                  comment='Source: manual, linkedin, opencorporates, etc.'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False),
    )

    # Index pour recherches rapides
    op.create_index('idx_known_companies_domain', 'known_companies', ['domain'])
    op.create_index('idx_known_companies_verified', 'known_companies', ['verified'])
    op.create_index('idx_known_companies_industry', 'known_companies', ['industry'])

    # Seed avec sociétés de gestion françaises
    conn = op.get_bind()
    conn.execute(text("""
        INSERT INTO known_companies (domain, company_name, company_website, company_linkedin, industry, country_code, verified, confidence_score, source)
        VALUES
        -- Sociétés de gestion d''actifs majeures
        ('mandarine-gestion.com', 'Mandarine Gestion', 'https://www.mandarine-gestion.com/', 'https://www.linkedin.com/company/mandarine-gestion/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('sycomore-am.com', 'Sycomore Asset Management', 'https://www.sycomore-am.com/', 'https://www.linkedin.com/company/sycomore-asset-management/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('dnca-investments.com', 'DNCA Investments', 'https://www.dnca-investments.com/', 'https://www.linkedin.com/company/dnca-investments/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('keren-finance.com', 'Keren Finance', 'https://www.keren-finance.com/', 'https://www.linkedin.com/company/keren-finance/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('lfde.com', 'La Financière de l''Échiquier', 'https://www.lfde.com/', 'https://www.linkedin.com/company/la-financiere-de-l-echiquier/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('edram.fr', 'Edmond de Rothschild Asset Management', 'https://www.edram.fr/', 'https://www.linkedin.com/company/edmond-de-rothschild-asset-management/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('lazardfreresgestion.fr', 'Lazard Frères Gestion', 'https://www.lazardfreresgestion.fr/', 'https://www.linkedin.com/company/lazard-freres-gestion/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('carmignac.com', 'Carmignac', 'https://www.carmignac.com/', 'https://www.linkedin.com/company/carmignac/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('montpensier-finance.com', 'Montpensier Finance', 'https://www.montpensier-finance.com/', 'https://www.linkedin.com/company/montpensier-finance/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('amplegest.com', 'Amplegest', 'https://www.amplegest.com/', 'https://www.linkedin.com/company/amplegest/', 'Asset Management', 'FR', true, 1.0, 'manual'),

        -- CGP / Réseaux de distribution
        ('nortia.fr', 'Nortia', 'https://www.nortia.fr/', 'https://www.linkedin.com/company/nortia/', 'Wealth Management', 'FR', true, 1.0, 'manual'),
        ('france-valley.com', 'France Valley', 'https://www.france-valley.com/', 'https://www.linkedin.com/company/france-valley/', 'Wealth Management', 'FR', true, 1.0, 'manual'),
        ('altaprofits.com', 'Altaprofits', 'https://www.altaprofits.com/', 'https://www.linkedin.com/company/altaprofits/', 'Wealth Management', 'FR', true, 1.0, 'manual'),
        ('perennialfinance.fr', 'Perennial Finance', 'https://www.perennialfinance.fr/', 'https://www.linkedin.com/company/perennial-finance/', 'Wealth Management', 'FR', true, 1.0, 'manual'),
        ('fortuneo.fr', 'Fortuneo', 'https://www.fortuneo.fr/', 'https://www.linkedin.com/company/fortuneo/', 'Online Banking', 'FR', true, 1.0, 'manual'),

        -- Autres acteurs finance FR
        ('amundi.com', 'Amundi', 'https://www.amundi.com/', 'https://www.linkedin.com/company/amundi/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('axa-im.com', 'AXA Investment Managers', 'https://www.axa-im.com/', 'https://www.linkedin.com/company/axa-investment-managers/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('bnpparibas-am.com', 'BNP Paribas Asset Management', 'https://www.bnpparibas-am.com/', 'https://www.linkedin.com/company/bnp-paribas-asset-management/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('ostrum.com', 'Ostrum Asset Management', 'https://www.ostrum.com/', 'https://www.linkedin.com/company/ostrum-asset-management/', 'Asset Management', 'FR', true, 1.0, 'manual'),
        ('groupama-am.com', 'Groupama Asset Management', 'https://www.groupama-am.com/', 'https://www.linkedin.com/company/groupama-asset-management/', 'Asset Management', 'FR', true, 1.0, 'manual'),

        -- Domaines personnels à ignorer (confidence 0)
        ('gmail.com', 'Gmail', 'https://gmail.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual'),
        ('outlook.com', 'Outlook', 'https://outlook.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual'),
        ('hotmail.com', 'Hotmail', 'https://hotmail.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual'),
        ('yahoo.com', 'Yahoo', 'https://mail.yahoo.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual'),
        ('free.fr', 'Free', 'https://www.free.fr', NULL, 'ISP', 'FR', true, 0.0, 'manual'),
        ('orange.fr', 'Orange', 'https://www.orange.fr', NULL, 'ISP', 'FR', true, 0.0, 'manual'),
        ('wanadoo.fr', 'Wanadoo', 'https://www.wanadoo.fr', NULL, 'ISP', 'FR', true, 0.0, 'manual'),
        ('sfr.fr', 'SFR', 'https://www.sfr.fr', NULL, 'ISP', 'FR', true, 0.0, 'manual'),
        ('laposte.net', 'La Poste', 'https://www.laposte.net', NULL, 'ISP', 'FR', true, 0.0, 'manual'),
        ('live.com', 'Microsoft Live', 'https://www.live.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual'),
        ('me.com', 'Apple iCloud', 'https://www.icloud.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual'),
        ('icloud.com', 'Apple iCloud', 'https://www.icloud.com', NULL, 'Email Provider', 'US', true, 0.0, 'manual')
    """))


def downgrade() -> None:
    op.drop_index('idx_known_companies_industry', table_name='known_companies')
    op.drop_index('idx_known_companies_verified', table_name='known_companies')
    op.drop_index('idx_known_companies_domain', table_name='known_companies')
    op.drop_table('known_companies')
