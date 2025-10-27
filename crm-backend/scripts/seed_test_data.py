#!/usr/bin/env python3
"""
Script de seed pour générer des données de test
Usage: docker exec v1-api-1 python3 scripts/seed_test_data.py
"""

import random
import sys
from datetime import datetime, timedelta

# Ajouter le path pour les imports
sys.path.insert(0, '/app')

from sqlalchemy.orm import Session

from core.database import SessionLocal, engine
from core.security import hash_password
from models.organisation import Organisation, OrganisationCategory, OrganisationType
from models.permission import Permission
from models.person import Person, PersonOrganizationLink, PersonRole
from models.role import Role
from models.task import Task, TaskPriority, TaskStatus
from models.team import Team
from models.user import User

# Données de test françaises
FIRST_NAMES = [
    "Jean", "Marie", "Pierre", "Sophie", "Laurent", "Isabelle", "Michel", "Catherine",
    "Philippe", "Nathalie", "Alain", "Françoise", "Bernard", "Martine", "François",
    "Christine", "Patrick", "Monique", "Nicolas", "Sylvie", "Daniel", "Brigitte",
    "André", "Annie", "Jacques", "Jacqueline", "René", "Jeanne", "Georges", "Nicole",
    "Paul", "Hélène", "Claude", "Danielle", "Christian", "Michèle", "Marc", "Céline",
    "Thierry", "Valérie", "Stéphane", "Sandrine", "Olivier", "Caroline", "Éric", "Patricia",
    "Christophe", "Véronique", "Didier", "Dominique", "Bruno", "Chantal", "Frédéric", "Florence",
    "Pascal", "Anne", "Gérard", "Karine"
]

LAST_NAMES = [
    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand",
    "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David",
    "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Lefevre",
    "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand", "Garnier",
    "Faure", "Rousseau", "Blanc", "Guerin", "Muller", "Henry", "Roussel", "Nicolas",
    "Perrin", "Morin", "Mathieu", "Clement", "Gauthier", "Dumont", "Lopez", "Fontaine",
    "Chevalier", "Robin", "Masson", "Sanchez", "Gerard", "Nguyen", "Boyer", "Denis"
]

COMPANIES = [
    "Investissements France", "Capital Gestion", "Patrimoine Conseil", "Finance Plus",
    "Épargne Solutions", "Actifs Management", "Horizon Finance", "Stratégie Capital",
    "Optimum Gestion", "Rendement Associés", "Sécurité Patrimoine", "Vision Finance",
    "Performance Capital", "Équilibre Gestion", "Croissance Investissements", "Prospérité Finance",
    "Excellence Patrimoine", "Dynamics Capital", "Innovation Finance", "Stabilité Gestion",
    "Alpha Investissements", "Beta Finance", "Gamma Capital", "Delta Patrimoine"
]

DOMAINS = ["gmail.com", "outlook.fr", "orange.fr", "free.fr", "wanadoo.fr", "hotmail.fr"]

CITIES = [
    ("Paris", "FR"), ("Lyon", "FR"), ("Marseille", "FR"), ("Toulouse", "FR"),
    ("Nice", "FR"), ("Nantes", "FR"), ("Bordeaux", "FR"), ("Lille", "FR"),
    ("Strasbourg", "FR"), ("Rennes", "FR"), ("Genève", "CH"), ("Lausanne", "CH"),
    ("Zurich", "CH"), ("Bruxelles", "BE"), ("Luxembourg", "LU")
]

def generate_phone():
    """Génère un numéro de téléphone français"""
    return f"+336{''.join([str(random.randint(0, 9)) for _ in range(8)])}"

def generate_email(first_name, last_name):
    """Génère un email"""
    domain = random.choice(DOMAINS)
    return f"{first_name.lower()}.{last_name.lower()}@{domain}"

def seed_database():
    """Remplit la base avec des données de test"""
    db = SessionLocal()
    
    try:
        print("🌱 Début du seed des données de test...")
        print("=" * 60)
        
        # 1. Créer des organisations
        print("\n📊 Création des organisations...")
        organisations = []
        for i, company in enumerate(COMPANIES):
            city, country = random.choice(CITIES)
            org = Organisation(
                name=company,
                type=random.choice([OrganisationType.INVESTOR, OrganisationType.FOURNISSEUR, OrganisationType.CLIENT]),
                category=random.choice([
                    OrganisationCategory.INSTITUTION,
                    OrganisationCategory.WHOLESALE,
                    OrganisationCategory.SDG,
                    OrganisationCategory.CGPI,
                    OrganisationCategory.CORPORATION
                ]),
                country_code=country,
                city=city,
                language="fr" if country in ["FR", "BE", "LU"] else "en",
                is_active=random.choice([True, True, True, False]),  # 75% actifs
                website=f"https://www.{company.lower().replace(' ', '-')}.fr" if country == "FR" else f"https://www.{company.lower().replace(' ', '-')}.com",
                phone=generate_phone() if random.random() > 0.3 else None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
            )
            db.add(org)
            organisations.append(org)
        
        db.commit()
        print(f"✅ {len(organisations)} organisations créées")
        
        # 2. Créer des personnes (contacts)
        print("\n👥 Création des personnes...")
        people = []
        for i in range(60):  # 60 personnes pour être sûr d'avoir 56+ après filtrage
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            _, country = random.choice(CITIES)  # On garde juste le pays

            person = Person(
                first_name=first_name,
                last_name=last_name,
                personal_email=generate_email(first_name, last_name),
                personal_phone=generate_phone() if random.random() > 0.4 else None,
                country_code=country,
                language="fr" if country in ["FR", "BE", "LU"] else "en",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
            )
            db.add(person)
            people.append(person)
        
        db.commit()
        print(f"✅ {len(people)} personnes créées")
        
        # 3. Créer des liens personnes-organisations
        print("\n🔗 Création des liens personnes-organisations...")
        links_count = 0
        for person in people:
            # Chaque personne est liée à 1-3 organisations
            num_orgs = random.randint(1, 3)
            selected_orgs = random.sample(organisations, min(num_orgs, len(organisations)))
            
            for org in selected_orgs:
                link = PersonOrganizationLink(
                    person_id=person.id,
                    organisation_id=org.id,
                    role=random.choice([
                        PersonRole.CONTACT_PRINCIPAL,
                        PersonRole.CONTACT_SECONDAIRE,
                        PersonRole.DECIDEUR,
                        PersonRole.TECHNIQUE,
                        PersonRole.ADMINISTRATIF
                    ]),
                    is_primary=links_count == 0,  # Premier lien = principal
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 200))
                )
                db.add(link)
                links_count += 1
        
        db.commit()
        print(f"✅ {links_count} liens créés")
        
        # 4. Créer quelques tâches
        print("\n📋 Création des tâches...")
        admin_user = db.query(User).filter(User.email == "admin@alforis.com").first()
        
        tasks = []
        for i in range(15):
            person = random.choice(people)
            task = Task(
                title=random.choice([
                    f"Relance {person.full_name}",
                    f"Rendez-vous avec {person.full_name}",
                    f"Proposition commerciale pour {person.full_name}",
                    f"Suivi dossier {person.full_name}",
                    f"Validation contrat {person.full_name}"
                ]),
                description=f"Tâche de suivi pour {person.full_name}",
                status=random.choice([TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE]),
                priority=random.choice([TaskPriority.BASSE, TaskPriority.MOYENNE, TaskPriority.HAUTE, TaskPriority.CRITIQUE]),
                due_date=datetime.utcnow() + timedelta(days=random.randint(-10, 30)),
                person_id=person.id,
                assigned_to=admin_user.id if admin_user else None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
            )
            db.add(task)
            tasks.append(task)
        
        db.commit()
        print(f"✅ {len(tasks)} tâches créées")
        
        # 5. Statistiques finales
        print("\n" + "=" * 60)
        print("📊 STATISTIQUES FINALES:")
        print(f"   👥 Personnes: {db.query(Person).count()}")
        print(f"   🏢 Organisations: {db.query(Organisation).count()}")
        print(f"   🔗 Liens P-O: {db.query(PersonOrganizationLink).count()}")
        print(f"   📋 Tâches: {db.query(Task).count()}")
        print(f"   👤 Utilisateurs: {db.query(User).count()}")
        print("=" * 60)
        print("✅ Seed terminé avec succès!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du seed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)
