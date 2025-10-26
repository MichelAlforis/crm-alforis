#!/usr/bin/env python3
"""
Script pour créer l'utilisateur administrateur
"""
import sys
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import get_db
from core.security import get_password_hash
from models.email import EmailTemplate
from models.kpi import DashboardKPI
from models.mandat import Mandat
from models.notification import Notification

# Importer TOUS les modèles pour initialiser les relations
from models.organisation import Organisation
from models.permission import Permission
from models.person import Person
from models.role import Role
from models.task import Task
from models.user import User
from models.webhook import Webhook
from models.workflow import Workflow


def create_admin():
    """Créer l'utilisateur admin"""
    print("👤 Création de l'utilisateur admin...")

    db = next(get_db())

    try:
        # Vérifier si l'admin existe déjà
        existing_admin = db.query(User).filter_by(username="admin").first()
        if existing_admin:
            print("⚠️  L'utilisateur admin existe déjà")
            return True

        # Créer l'admin
        admin = User(
            username="admin",
            email="admin@alforis.com",
            full_name="Administrateur",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_superuser=True
        )
        db.add(admin)
        db.commit()

        print("✅ Admin créé avec succès !")
        print(f"   Username : admin")
        print(f"   Password : admin123")
        print(f"   Email    : admin@alforis.com")

        return True

    except Exception as e:
        print(f"❌ Erreur lors de la création de l'admin : {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_admin()
    sys.exit(0 if success else 1)
