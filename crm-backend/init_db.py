#!/usr/bin/env python3
"""
Script d'initialisation de la base de données
- Crée toutes les tables
- Crée un utilisateur admin par défaut
"""

# Import tous les models pour éviter les problèmes de dépendances circulaires
from models.user import User
from models.organisation import Organisation
from models.contact import Contact
from models.activity import Activity
from models.task import Task
from models.email import Email
from models.campaign import Campaign
from models.workflow import Workflow
from models.tag import Tag
from models.note import Note
from models.document import Document
from models.custom_field import CustomField
from models.role import Role, Permission, RolePermission
from models.organisation_activity import OrganisationActivity

from core.database import Base, engine, SessionLocal
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
        existing_admin = db.query(User).filter(User.email == "admin@alforis.fr").first()

        if existing_admin:
            print("ℹ️  L'utilisateur admin existe déjà")
            print(f"   📧 Email: {existing_admin.email}")
        else:
            # Créer l'admin
            admin = User(
                email="admin@alforis.fr",
                username="admin",
                first_name="Admin",
                last_name="Alforis",
                password=pwd_context.hash("Alforis2025!"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Utilisateur admin créé avec succès")
            print(f"   📧 Email: admin@alforis.fr")
            print(f"   🔑 Mot de passe: Alforis2025!")
            print(f"   ⚠️  CHANGEZ CE MOT DE PASSE après la première connexion!")

        # Statistiques
        print("\n📊 Statistiques de la base de données:")
        user_count = db.query(User).count()
        org_count = db.query(Organisation).count()
        contact_count = db.query(Contact).count()

        print(f"   👤 Utilisateurs: {user_count}")
        print(f"   🏢 Organisations: {org_count}")
        print(f"   👥 Contacts: {contact_count}")

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
        print("   https://crm.alforis.fr")
        print("   Email: admin@alforis.fr")
        print("   Password: Alforis2025!")
    else:
        print("\n❌ Échec de l'initialisation")
        exit(1)
