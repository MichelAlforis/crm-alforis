#!/usr/bin/env python3
"""
Script pour initialiser une base de données propre avec l'architecture unifiée
"""
import sys
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import Base, engine
from models.email import EmailCampaign, EmailSend, EmailTemplate
from models.kpi import DashboardKPI
from models.mandat import Mandat
from models.notification import Notification

# Import de TOUS les modèles (architecture unifiée uniquement)
from models.organisation import (
    Organisation,
    OrganisationActivity,
    OrganisationContact,
    OrganisationInteraction,
)
from models.permission import Permission
from models.person import Person, PersonOrganizationLink
from models.role import Role
from models.task import Task
from models.user import User
from models.webhook import Webhook
from models.workflow import Workflow, WorkflowExecution


def init_database():
    """Créer toutes les tables"""
    print("🏗️  Création des tables (architecture unifiée)...")

    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables créées avec succès !")

        # Lister les tables créées
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        print(f"\n📊 {len(tables)} tables créées :")
        for table in sorted(tables):
            print(f"  ✅ {table}")

        return True

    except Exception as e:
        print(f"❌ Erreur lors de la création des tables : {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
