#!/usr/bin/env python3
"""
Script de génération de données de test pour le CRM Alforis
Usage: docker exec -i v1--api-1 python3 /app/scripts/seed_local_db.py
"""

import os
import sys

# Ajouter le chemin parent pour importer les modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import random
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.security import get_password_hash
from models.organisation import Organisation, OrganisationCategory, OrganisationType

# Import des modèles
from models.person import Person, PersonOrganizationLink, PersonRole
from models.task import Task, TaskCategory, TaskPriority, TaskStatus
from models.user import User

# Configuration DB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crm_user:crm_password@postgres:5432/crm_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Données de test
ORGANISATIONS_DATA = [
    {
        "name": "BNP Paribas Wealth Management",
        "category": OrganisationCategory.WHOLESALE,
        "country_code": "FR",
        "language": "fr",
        "city": "Paris",
        "aum_millions": 5000,
        "website": "https://wealthmanagement.bnpparibas",
        "is_active": True,
    },
    {
        "name": "Amundi Asset Management",
        "category": OrganisationCategory.INSTITUTION,
        "country_code": "FR",
        "language": "fr",
        "city": "Paris",
        "aum_millions": 15000,
        "website": "https://www.amundi.com",
        "is_active": True,
    },
    {
        "name": "Pictet & Cie",
        "category": OrganisationCategory.SDG,
        "country_code": "CH",
        "language": "fr",
        "city": "Genève",
        "aum_millions": 8000,
        "website": "https://www.pictet.com",
        "is_active": True,
    },
    {
        "name": "UBS Wealth Management",
        "category": OrganisationCategory.SDG,
        "country_code": "CH",
        "language": "en",
        "city": "Zurich",
        "aum_millions": 12000,
        "website": "https://www.ubs.com",
        "is_active": True,
    },
    {
        "name": "Lombard Odier",
        "category": OrganisationCategory.SDG,
        "country_code": "CH",
        "language": "fr",
        "city": "Genève",
        "aum_millions": 3500,
        "website": "https://www.lombardodier.com",
        "is_active": True,
    },
    {
        "name": "Oddo BHF",
        "category": OrganisationCategory.WHOLESALE,
        "country_code": "FR",
        "language": "fr",
        "city": "Paris",
        "aum_millions": 2000,
        "website": "https://www.oddo-bhf.com",
        "is_active": True,
    },
    {
        "name": "Carmignac Gestion",
        "category": OrganisationCategory.INSTITUTION,
        "country_code": "FR",
        "language": "fr",
        "city": "Paris",
        "aum_millions": 4500,
        "website": "https://www.carmignac.fr",
        "is_active": True,
    },
    {
        "name": "Edmond de Rothschild",
        "category": OrganisationCategory.SDG,
        "country_code": "CH",
        "language": "fr",
        "city": "Genève",
        "aum_millions": 6000,
        "website": "https://www.edmond-de-rothschild.com",
        "is_active": True,
    },
    {
        "name": "La Française AM",
        "category": OrganisationCategory.INSTITUTION,
        "country_code": "FR",
        "language": "fr",
        "city": "Paris",
        "aum_millions": 1500,
        "website": "https://www.la-francaise.com",
        "is_active": True,
    },
    {
        "name": "Julius Baer",
        "category": OrganisationCategory.SDG,
        "country_code": "CH",
        "language": "en",
        "city": "Zurich",
        "aum_millions": 7500,
        "website": "https://www.juliusbaer.com",
        "is_active": True,
    },
]

PEOPLE_DATA = [
    {"first_name": "Sophie", "last_name": "Dubois", "role": "Directrice Distribution", "country_code": "FR", "language": "fr"},
    {"first_name": "Jean", "last_name": "Martin", "role": "Responsable Partenariats", "country_code": "FR", "language": "fr"},
    {"first_name": "Marie", "last_name": "Bernard", "role": "Analyste Senior", "country_code": "FR", "language": "fr"},
    {"first_name": "Pierre", "last_name": "Leroy", "role": "Directeur Clientèle", "country_code": "FR", "language": "fr"},
    {"first_name": "Thomas", "last_name": "Müller", "role": "Portfolio Manager", "country_code": "CH", "language": "de"},
    {"first_name": "Anna", "last_name": "Schmidt", "role": "Head of Sales", "country_code": "CH", "language": "de"},
    {"first_name": "Luca", "last_name": "Rossi", "role": "Investment Director", "country_code": "CH", "language": "it"},
    {"first_name": "Emma", "last_name": "Johnson", "role": "Chief Investment Officer", "country_code": "CH", "language": "en"},
    {"first_name": "François", "last_name": "Moreau", "role": "Gérant de fonds", "country_code": "FR", "language": "fr"},
    {"first_name": "Claire", "last_name": "Lefebvre", "role": "Directrice Commerciale", "country_code": "FR", "language": "fr"},
    {"first_name": "Nicolas", "last_name": "Petit", "role": "Responsable Produits", "country_code": "FR", "language": "fr"},
    {"first_name": "Julie", "last_name": "Roux", "role": "Chargée d'affaires", "country_code": "FR", "language": "fr"},
    {"first_name": "Laurent", "last_name": "Garcia", "role": "Directeur Général Adjoint", "country_code": "FR", "language": "fr"},
    {"first_name": "Isabelle", "last_name": "Blanc", "role": "Responsable Conformité", "country_code": "FR", "language": "fr"},
    {"first_name": "David", "last_name": "Meyer", "role": "Senior Relationship Manager", "country_code": "CH", "language": "en"},
]

TASKS_DATA = [
    {
        "title": "Relancer BNP Paribas pour présentation fonds",
        "description": "Envoyer une relance pour organiser une présentation du nouveau fonds actions européennes",
        "category": TaskCategory.RELANCE,
        "priority": TaskPriority.HAUTE,
        "status": TaskStatus.TODO,
        "due_date": datetime.now() + timedelta(days=2),
    },
    {
        "title": "Préparer pitch deck Amundi",
        "description": "Créer une présentation personnalisée pour Amundi sur nos stratégies thématiques",
        "category": TaskCategory.PITCH,
        "priority": TaskPriority.HAUTE,
        "status": TaskStatus.DOING,
        "due_date": datetime.now() + timedelta(days=5),
    },
    {
        "title": "Appel de suivi avec Pictet",
        "description": "Faire le point sur l'avancement de la due diligence",
        "category": TaskCategory.DUE_DILIGENCE,
        "priority": TaskPriority.MOYENNE,
        "status": TaskStatus.TODO,
        "due_date": datetime.now() + timedelta(days=3),
    },
    {
        "title": "Envoyer documentation réglementaire à UBS",
        "description": "Transmettre les derniers documents KIID et prospectus mis à jour",
        "category": TaskCategory.ADMIN,
        "priority": TaskPriority.HAUTE,
        "status": TaskStatus.TODO,
        "due_date": datetime.now() + timedelta(days=1),
    },
    {
        "title": "RDV Lombard Odier - Présentation Q1",
        "description": "Rendez-vous trimestriel pour présenter les performances Q1",
        "category": TaskCategory.RDV,
        "priority": TaskPriority.HAUTE,
        "status": TaskStatus.TODO,
        "due_date": datetime.now() + timedelta(days=7),
    },
]


def create_user(db):
    """Créer un utilisateur admin si n'existe pas"""
    existing = db.query(User).filter(User.email == "admin@alforis.fr").first()
    if existing:
        print("✅ User admin@alforis.fr existe déjà")
        return existing

    user = User(
        email="admin@alforis.fr",
        full_name="Admin Alforis",
        hashed_password=get_password_hash("admin123"),
        is_active=True,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print("✅ User créé: admin@alforis.fr / admin123")
    return user


def seed_organisations(db):
    """Créer des organisations de test"""
    print("\n📊 Création des organisations...")
    orgs = []

    for data in ORGANISATIONS_DATA:
        org = Organisation(**data)
        db.add(org)
        orgs.append(org)

    db.commit()
    for org in orgs:
        db.refresh(org)

    print(f"✅ {len(orgs)} organisations créées")
    return orgs


def seed_people(db, organisations):
    """Créer des personnes de test et les rattacher aux organisations"""
    print("\n👥 Création des personnes...")
    people = []

    for i, data in enumerate(PEOPLE_DATA):
        # Créer la personne
        email = f"{data['first_name'].lower()}.{data['last_name'].lower()}@example.com"
        person = Person(
            first_name=data["first_name"],
            last_name=data["last_name"],
            personal_email=email,
            personal_phone=f"+33 6 {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
            role=data["role"],
            country_code=data["country_code"],
            language=data["language"],
            is_active=True,
        )
        db.add(person)
        people.append(person)

    db.commit()

    # Rafraîchir pour avoir les IDs
    for person in people:
        db.refresh(person)

    # Rattacher chaque personne à 1-2 organisations aléatoires
    print("\n🔗 Création des rattachements personnes-organisations...")
    links_created = 0

    for person in people:
        # Sélectionner 1-2 organisations aléatoires
        num_orgs = random.randint(1, 2)
        selected_orgs = random.sample(organisations, num_orgs)

        for idx, org in enumerate(selected_orgs):
            link = PersonOrganizationLink(
                person_id=person.id,
                organisation_id=org.id,
                organization_type=org.category.value if hasattr(org.category, 'value') else OrganisationType.CLIENT,
                role=PersonRole.CONTACT_PRINCIPAL if idx == 0 else PersonRole.CONTACT_SECONDAIRE,
                is_primary=(idx == 0),
                job_title=person.role,
                work_email=f"{person.first_name.lower()}.{person.last_name.lower()}@{org.name.lower().replace(' ', '')}.com",
                work_phone=f"+33 1 {random.randint(40, 49)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
            )
            db.add(link)
            links_created += 1

    db.commit()
    print(f"✅ {len(people)} personnes créées")
    print(f"✅ {links_created} rattachements créés")
    return people


def seed_tasks(db, organisations, people, user):
    """Créer des tâches de test"""
    print("\n📋 Création des tâches...")
    tasks = []

    for i, data in enumerate(TASKS_DATA):
        task = Task(
            title=data["title"],
            description=data["description"],
            category=data["category"],
            priority=data["priority"],
            status=data["status"],
            due_date=data["due_date"],
            assigned_to_id=user.id,
            organisation_id=organisations[i % len(organisations)].id if i % 2 == 0 else None,
            person_id=people[i % len(people)].id if i % 2 == 1 else None,
        )
        db.add(task)
        tasks.append(task)

    db.commit()
    for task in tasks:
        db.refresh(task)

    print(f"✅ {len(tasks)} tâches créées")
    return tasks


def main():
    """Point d'entrée principal"""
    print("=" * 60)
    print("🌱 SEED DATABASE - CRM ALFORIS")
    print("=" * 60)

    db = SessionLocal()

    try:
        # 1. Créer un utilisateur admin
        user = create_user(db)

        # 2. Créer des organisations
        organisations = seed_organisations(db)

        # 3. Créer des personnes et les rattacher
        people = seed_people(db, organisations)

        # 4. Créer des tâches
        tasks = seed_tasks(db, organisations, people, user)

        print("\n" + "=" * 60)
        print("✅ BASE DE DONNÉES PEUPLÉE AVEC SUCCÈS !")
        print("=" * 60)
        print(f"\n📊 Résumé:")
        print(f"   - Organisations: {len(organisations)}")
        print(f"   - Personnes: {len(people)}")
        print(f"   - Tâches: {len(tasks)}")
        print(f"   - User: admin@alforis.fr / admin123")
        print("\n🚀 Vous pouvez maintenant tester l'application:")
        print(f"   - Frontend: http://localhost:3010")
        print(f"   - API: http://localhost:8000/docs")

    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
