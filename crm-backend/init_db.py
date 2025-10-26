#!/usr/bin/env python3
"""
Script d'initialisation de la base de données
- Crée toutes les tables
- Crée un utilisateur admin par défaut
"""

from core.database import Base, SessionLocal, engine
from core.security import hash_password
from models.ai_agent import AICache, AIConfiguration, AIExecution, AISuggestion
from models.email import (
    CampaignSubscription,
    EmailCampaign,
    EmailCampaignStep,
    EmailEvent,
    EmailSend,
    EmailTemplate,
)
from models.email_config import EmailConfiguration
from models.help_analytics import HelpAnalyticsEvent
from models.kpi import DashboardKPI
from models.mailing_list import MailingList
from models.mandat import Mandat
from models.notification import Notification
from models.organisation import Organisation
from models.organisation_activity import OrganisationActivity
from models.permission import Permission
from models.person import Person, PersonOrganizationLink
from models.role import Role
from models.task import Task
from models.team import Team

# Import tous les models pour éviter les problèmes de dépendances circulaires
from models.user import User
from models.webhook import Webhook
from models.workflow import Workflow, WorkflowExecution


def init_database():
    """Initialise la base de données"""
    print("🔨 Initialisation de la base de données")
    print("=" * 50)
    print()

    # Créer toutes les tables
    print("1️⃣ Création des tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables créées avec succès")
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables: {e}")
        return False

    # Créer utilisateur admin
    print("\n2️⃣ Création de l'utilisateur administrateur...")
    db = SessionLocal()

    try:
        # Vérifier si l'admin existe déjà
        existing_admin = db.query(User).filter(User.email == "admin@alforis.com").first()

        if existing_admin:
            print("ℹ️  L'utilisateur admin existe déjà")
            print(f"   📧 Email: {existing_admin.email}")
        else:
            # Créer l'admin (champs correspondant au modèle actuel)
            admin = User(
                email="admin@alforis.com",
                username="admin",
                full_name="Admin Alforis",
                hashed_password=hash_password("Alforis2025!"),
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            db.commit()
            print("✅ Utilisateur admin créé avec succès")
            print(f"   📧 Email: admin@alforis.com")
            print(f"   🔑 Mot de passe: Alforis2025!")
            print(f"   ⚠️  CHANGEZ CE MOT DE PASSE après la première connexion!")

        # Statistiques
        print("\n📊 Statistiques de la base de données:")
        user_count = db.query(User).count()
        org_count = db.query(Organisation).count()
        person_count = db.query(Person).count()

        print(f"   👤 Utilisateurs: {user_count}")
        print(f"   🏢 Organisations: {org_count}")
        print(f"   👥 Personnes: {person_count}")

        return True

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = init_database()

    if success:
        print("\n✅ Initialisation terminée avec succès")
        print("\n🌐 Vous pouvez maintenant vous connecter à:")
        print("   http://localhost:3010")
        print("   Email: admin@alforis.com")
        print("   Password: Alforis2025!")
    else:
        print("\n❌ Échec de l'initialisation")
        exit(1)
