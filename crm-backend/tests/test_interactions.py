"""
Tests pour les Interactions V2

Couvre:
- Création d'interactions
- Participants
- Rappels automatiques
- Statuts et types
"""

import pytest
from datetime import datetime, timedelta, timezone
from models.interaction import (
    Interaction,
    InteractionParticipant,
    InteractionType,
    InteractionStatus,
)
from models.person import Person
from models.organisation import Organisation, OrganisationType


class TestInteractionCreation:
    """Tests de création d'interactions"""

    def test_create_interaction_minimal(self, client, auth_headers):
        """Test création interaction avec champs minimaux"""
        interaction_data = {
            "type": "CALL",
            "status": "todo",
            "subject": "Appel de prospection",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        }

        response = client.post(
            "/api/v1/interactions", json=interaction_data, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "CALL"
        assert data["status"] == "todo"
        assert data["subject"] == interaction_data["subject"]

    def test_create_interaction_with_participants(self, client, test_db, auth_headers, test_user):
        """Test interaction avec participants"""
        # Créer une personne
        person = Person(
            first_name="Jean",
            last_name="Dupont",
            email="jean.dupont@example.com",
            created_by_id=test_user.id,
        )
        test_db.add(person)
        test_db.commit()

        interaction_data = {
            "type": "MEETING",
            "status": "todo",
            "subject": "Réunion avec Jean",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "participants": [{"person_id": person.id, "is_organizer": False}],
        }

        response = client.post(
            "/api/v1/interactions", json=interaction_data, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data.get("participants", [])) >= 1

    def test_create_interaction_with_reminder(self, client, auth_headers):
        """Test interaction avec rappel automatique"""
        next_action = datetime.now(timezone.utc) + timedelta(days=7)

        interaction_data = {
            "type": "EMAIL",
            "status": "todo",
            "subject": "Relance par email",
            "next_action_at": next_action.isoformat(),
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        }

        response = client.post(
            "/api/v1/interactions", json=interaction_data, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert "next_action_at" in data
        assert data["notified_at"] is None  # Pas encore notifié

    def test_create_interaction_with_body(self, client, auth_headers):
        """Test interaction avec contenu détaillé"""
        interaction_data = {
            "type": "MEETING",
            "status": "done",
            "subject": "Réunion de clôture",
            "body": "Discussion sur les points suivants:\n- Budget\n- Timeline\n- Ressources",
            "scheduled_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

        response = client.post(
            "/api/v1/interactions", json=interaction_data, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert "Budget" in data["body"]
        assert data["status"] == "done"
        assert data["completed_at"] is not None


class TestInteractionParticipants:
    """Tests de gestion des participants"""

    def test_add_participant_to_interaction(self, client, test_db, auth_headers, test_user):
        """Test ajout participant à une interaction"""
        # Créer interaction
        interaction = Interaction(
            type=InteractionType.MEETING,
            status=InteractionStatus.TODO,
            subject="Réunion test",
            scheduled_at=datetime.now(timezone.utc),
            created_by_id=test_user.id,
        )
        test_db.add(interaction)

        # Créer personne
        person = Person(
            first_name="Marie",
            last_name="Martin",
            email="marie.martin@example.com",
            created_by_id=test_user.id,
        )
        test_db.add(person)
        test_db.commit()

        # Ajouter participant
        response = client.post(
            f"/api/v1/interactions/{interaction.id}/participants",
            json={"person_id": person.id, "is_organizer": True},
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_list_participants(self, client, test_db, auth_headers, test_user):
        """Test liste des participants d'une interaction"""
        # Créer interaction avec participants
        interaction = Interaction(
            type=InteractionType.CALL,
            status=InteractionStatus.TODO,
            subject="Appel multi",
            scheduled_at=datetime.now(timezone.utc),
            created_by_id=test_user.id,
        )
        test_db.add(interaction)

        persons = []
        for i in range(3):
            person = Person(
                first_name=f"Personne{i}",
                last_name=f"Test{i}",
                email=f"p{i}@test.com",
                created_by_id=test_user.id,
            )
            test_db.add(person)
            persons.append(person)

        test_db.flush()

        for person in persons:
            participant = InteractionParticipant(
                interaction_id=interaction.id, person_id=person.id, is_organizer=False
            )
            test_db.add(participant)

        test_db.commit()

        response = client.get(
            f"/api/v1/interactions/{interaction.id}/participants", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_remove_participant(self, client, test_db, auth_headers, test_user):
        """Test suppression d'un participant"""
        interaction = Interaction(
            type=InteractionType.MEETING,
            status=InteractionStatus.TODO,
            subject="Test remove",
            scheduled_at=datetime.now(timezone.utc),
            created_by_id=test_user.id,
        )
        person = Person(
            first_name="ToRemove",
            last_name="Test",
            email="remove@test.com",
            created_by_id=test_user.id,
        )
        test_db.add_all([interaction, person])
        test_db.flush()

        participant = InteractionParticipant(
            interaction_id=interaction.id, person_id=person.id, is_organizer=False
        )
        test_db.add(participant)
        test_db.commit()

        response = client.delete(
            f"/api/v1/interactions/{interaction.id}/participants/{person.id}",
            headers=auth_headers,
        )
        assert response.status_code in [200, 204]


class TestInteractionReminders:
    """Tests des rappels automatiques"""

    def test_upcoming_reminders(self, client, test_db, auth_headers, test_user):
        """Test récupération des interactions avec rappel imminent"""
        # Créer interaction avec rappel dans le passé
        past_interaction = Interaction(
            type=InteractionType.CALL,
            status=InteractionStatus.TODO,
            subject="Rappel passé",
            scheduled_at=datetime.now(timezone.utc),
            next_action_at=datetime.now(timezone.utc) - timedelta(hours=1),
            created_by_id=test_user.id,
        )

        # Créer interaction avec rappel futur
        future_interaction = Interaction(
            type=InteractionType.EMAIL,
            status=InteractionStatus.TODO,
            subject="Rappel futur",
            scheduled_at=datetime.now(timezone.utc),
            next_action_at=datetime.now(timezone.utc) + timedelta(days=1),
            created_by_id=test_user.id,
        )

        test_db.add_all([past_interaction, future_interaction])
        test_db.commit()

        # Récupérer interactions avec rappel passé
        response = client.get("/api/v1/interactions?overdue=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # Devrait contenir l'interaction avec rappel passé
        overdue_ids = [item["id"] for item in data.get("items", [])]
        assert past_interaction.id in overdue_ids

    def test_mark_reminder_as_notified(self, client, test_db, auth_headers, test_user):
        """Test marquage d'un rappel comme notifié"""
        interaction = Interaction(
            type=InteractionType.MEETING,
            status=InteractionStatus.TODO,
            subject="À notifier",
            scheduled_at=datetime.now(timezone.utc),
            next_action_at=datetime.now(timezone.utc) - timedelta(hours=1),
            notified_at=None,
            created_by_id=test_user.id,
        )
        test_db.add(interaction)
        test_db.commit()

        # Marquer comme notifié
        response = client.patch(
            f"/api/v1/interactions/{interaction.id}",
            json={"notified_at": datetime.now(timezone.utc).isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notified_at"] is not None


class TestInteractionStatus:
    """Tests de gestion des statuts"""

    def test_update_status_to_in_progress(self, client, test_db, auth_headers, test_user):
        """Test passage en statut in_progress"""
        interaction = Interaction(
            type=InteractionType.TASK,
            status=InteractionStatus.TODO,
            subject="Tâche à commencer",
            scheduled_at=datetime.now(timezone.utc),
            created_by_id=test_user.id,
        )
        test_db.add(interaction)
        test_db.commit()

        response = client.patch(
            f"/api/v1/interactions/{interaction.id}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"

    def test_complete_interaction(self, client, test_db, auth_headers, test_user):
        """Test complétion d'une interaction"""
        interaction = Interaction(
            type=InteractionType.CALL,
            status=InteractionStatus.IN_PROGRESS,
            subject="Appel en cours",
            scheduled_at=datetime.now(timezone.utc),
            created_by_id=test_user.id,
        )
        test_db.add(interaction)
        test_db.commit()

        response = client.patch(
            f"/api/v1/interactions/{interaction.id}",
            json={"status": "done", "completed_at": datetime.now(timezone.utc).isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "done"
        assert data["completed_at"] is not None

    def test_cancel_interaction(self, client, test_db, auth_headers, test_user):
        """Test annulation d'une interaction"""
        interaction = Interaction(
            type=InteractionType.MEETING,
            status=InteractionStatus.TODO,
            subject="Réunion à annuler",
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
            created_by_id=test_user.id,
        )
        test_db.add(interaction)
        test_db.commit()

        response = client.patch(
            f"/api/v1/interactions/{interaction.id}",
            json={"status": "cancelled"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"


class TestInteractionFiltering:
    """Tests de filtrage des interactions"""

    def test_filter_by_type(self, client, test_db, auth_headers, test_user):
        """Test filtre par type d'interaction"""
        # Créer différents types
        types = [InteractionType.CALL, InteractionType.EMAIL, InteractionType.MEETING]
        for interaction_type in types:
            interaction = Interaction(
                type=interaction_type,
                status=InteractionStatus.TODO,
                subject=f"Test {interaction_type.value}",
                scheduled_at=datetime.now(timezone.utc),
                created_by_id=test_user.id,
            )
            test_db.add(interaction)
        test_db.commit()

        response = client.get("/api/v1/interactions?type=CALL", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["type"] == "CALL" for item in data.get("items", []))

    def test_filter_by_status(self, client, test_db, auth_headers, test_user):
        """Test filtre par statut"""
        statuses = [InteractionStatus.TODO, InteractionStatus.IN_PROGRESS, InteractionStatus.DONE]
        for status in statuses:
            interaction = Interaction(
                type=InteractionType.TASK,
                status=status,
                subject=f"Test {status.value}",
                scheduled_at=datetime.now(timezone.utc),
                created_by_id=test_user.id,
            )
            test_db.add(interaction)
        test_db.commit()

        response = client.get("/api/v1/interactions?status=done", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "done" for item in data.get("items", []))

    def test_filter_by_date_range(self, client, test_db, auth_headers, test_user):
        """Test filtre par plage de dates"""
        # Créer interactions à différentes dates
        today = datetime.now(timezone.utc)
        for days_offset in [-7, 0, 7]:
            interaction = Interaction(
                type=InteractionType.MEETING,
                status=InteractionStatus.TODO,
                subject=f"Meeting {days_offset}",
                scheduled_at=today + timedelta(days=days_offset),
                created_by_id=test_user.id,
            )
            test_db.add(interaction)
        test_db.commit()

        # Filtrer semaine prochaine
        start_date = today.isoformat()
        end_date = (today + timedelta(days=14)).isoformat()

        response = client.get(
            f"/api/v1/interactions?start_date={start_date}&end_date={end_date}",
            headers=auth_headers,
        )
        assert response.status_code == 200
