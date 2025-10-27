"""
Tests pour les workflows et automatisations

Couvre:
- Création de workflows
- Exécution de workflows
- Déclencheurs (triggers)
- Actions conditionnelles
"""

import pytest
from datetime import datetime, timezone
from models.workflow import (
    Workflow,
    WorkflowExecution,
    WorkflowTriggerType,
    WorkflowActionType,
    WorkflowStatus,
    WorkflowExecutionStatus,
)
from models.organisation import Organisation, OrganisationType
from models.task import Task, TaskStatus, TaskPriority


class TestWorkflowCreation:
    """Tests de création de workflows"""

    def test_create_simple_workflow(self, client, auth_headers):
        """Test création d'un workflow simple"""
        workflow_data = {
            "name": "Relance automatique prospects",
            "description": "Crée une tâche de relance 7 jours après la création",
            "trigger_type": "organisation_created",
            "trigger_config": {"organisation_type": "prospect"},
            "actions": [
                {
                    "type": "create_task",
                    "config": {
                        "title": "Relance prospect {{organisation.name}}",
                        "description": "Contacter le prospect",
                        "delay_days": 7,
                        "priority": "high",
                    },
                }
            ],
            "is_active": True,
        }

        response = client.post("/api/v1/workflows", json=workflow_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == workflow_data["name"]
        assert data["trigger_type"] == workflow_data["trigger_type"]
        assert data["is_active"] is True
        assert len(data["actions"]) == 1

    def test_create_workflow_with_conditions(self, client, auth_headers):
        """Test workflow avec conditions"""
        workflow_data = {
            "name": "Alerte fournisseur gros mandat",
            "description": "Notifie si montant > 100k",
            "trigger_type": "mandat_updated",
            "trigger_config": {},
            "conditions": [{"field": "amount", "operator": "gt", "value": 100000}],
            "actions": [
                {
                    "type": "send_notification",
                    "config": {
                        "title": "Gros mandat détecté",
                        "message": "Montant: {{mandat.amount}}",
                        "priority": "urgent",
                    },
                }
            ],
            "is_active": True,
        }

        response = client.post("/api/v1/workflows", json=workflow_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert len(data["conditions"]) == 1
        assert data["conditions"][0]["operator"] == "gt"

    def test_create_workflow_missing_required_fields(self, client, auth_headers):
        """Test validation des champs requis"""
        workflow_data = {
            "name": "Test incomplet",
            # Missing trigger_type and actions
        }

        response = client.post("/api/v1/workflows", json=workflow_data, headers=auth_headers)
        assert response.status_code == 422  # Validation error


class TestWorkflowExecution:
    """Tests d'exécution de workflows"""

    def test_workflow_triggers_on_organisation_creation(
        self, client, test_db, auth_headers, test_user
    ):
        """Test déclenchement workflow à la création d'organisation"""
        # Créer un workflow actif
        workflow = Workflow(
            name="Test trigger",
            trigger_type=WorkflowTriggerType.ORGANISATION_CREATED,
            trigger_config={"organisation_type": "prospect"},
            actions=[
                {
                    "type": "create_task",
                    "config": {
                        "title": "Contacter {{organisation.name}}",
                        "priority": "high",
                    },
                }
            ],
            is_active=True,
            created_by_id=test_user.id,
        )
        test_db.add(workflow)
        test_db.commit()

        # Créer une organisation (devrait déclencher le workflow)
        org_data = {
            "name": "Nouveau Prospect SARL",
            "organisation_type": "prospect",
        }

        response = client.post("/api/v1/organisations", json=org_data, headers=auth_headers)
        assert response.status_code == 201

        # Vérifier qu'une exécution a été créée
        execution = (
            test_db.query(WorkflowExecution)
            .filter(WorkflowExecution.workflow_id == workflow.id)
            .first()
        )
        assert execution is not None
        assert execution.status in [
            WorkflowExecutionStatus.PENDING,
            WorkflowExecutionStatus.COMPLETED,
        ]

    def test_workflow_creates_task(self, client, test_db, auth_headers, test_user):
        """Test qu'un workflow crée bien une tâche"""
        # Créer workflow
        workflow = Workflow(
            name="Créer tâche auto",
            trigger_type=WorkflowTriggerType.MANUAL,
            actions=[
                {
                    "type": "create_task",
                    "config": {"title": "Tâche auto", "priority": "normal"},
                }
            ],
            is_active=True,
            created_by_id=test_user.id,
        )
        test_db.add(workflow)
        test_db.commit()

        # Exécuter manuellement
        response = client.post(
            f"/api/v1/workflows/{workflow.id}/execute", headers=auth_headers
        )
        assert response.status_code == 200

        # Vérifier qu'une tâche a été créée
        task = test_db.query(Task).filter(Task.title == "Tâche auto").first()
        assert task is not None
        assert task.priority == TaskPriority.NORMAL

    def test_workflow_with_failing_action(self, client, test_db, auth_headers, test_user):
        """Test gestion d'erreur dans une action"""
        # Workflow avec action invalide
        workflow = Workflow(
            name="Workflow avec erreur",
            trigger_type=WorkflowTriggerType.MANUAL,
            actions=[
                {
                    "type": "invalid_action_type",  # Type invalide
                    "config": {},
                }
            ],
            is_active=True,
            created_by_id=test_user.id,
        )
        test_db.add(workflow)
        test_db.commit()

        # Exécuter
        response = client.post(
            f"/api/v1/workflows/{workflow.id}/execute", headers=auth_headers
        )

        # Vérifier que l'exécution est marquée comme failed
        execution = (
            test_db.query(WorkflowExecution)
            .filter(WorkflowExecution.workflow_id == workflow.id)
            .first()
        )
        assert execution is not None
        assert execution.status == WorkflowExecutionStatus.FAILED
        assert execution.error_message is not None


class TestWorkflowManagement:
    """Tests de gestion des workflows"""

    def test_list_workflows(self, client, test_db, auth_headers, test_user):
        """Test liste des workflows"""
        # Créer plusieurs workflows
        for i in range(3):
            workflow = Workflow(
                name=f"Workflow {i}",
                trigger_type=WorkflowTriggerType.MANUAL,
                actions=[],
                is_active=i % 2 == 0,  # Alterner actif/inactif
                created_by_id=test_user.id,
            )
            test_db.add(workflow)
        test_db.commit()

        response = client.get("/api/v1/workflows", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3

    def test_filter_active_workflows(self, client, test_db, auth_headers, test_user):
        """Test filtre workflows actifs uniquement"""
        # Créer workflows actifs et inactifs
        for i in range(5):
            workflow = Workflow(
                name=f"Workflow {i}",
                trigger_type=WorkflowTriggerType.MANUAL,
                actions=[],
                is_active=i < 3,  # 3 actifs, 2 inactifs
                created_by_id=test_user.id,
            )
            test_db.add(workflow)
        test_db.commit()

        response = client.get("/api/v1/workflows?is_active=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3

    def test_deactivate_workflow(self, client, test_db, auth_headers, test_user):
        """Test désactivation d'un workflow"""
        workflow = Workflow(
            name="Test désactivation",
            trigger_type=WorkflowTriggerType.MANUAL,
            actions=[],
            is_active=True,
            created_by_id=test_user.id,
        )
        test_db.add(workflow)
        test_db.commit()

        response = client.patch(
            f"/api/v1/workflows/{workflow.id}",
            json={"is_active": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    def test_delete_workflow(self, client, test_db, auth_headers, test_user):
        """Test suppression d'un workflow"""
        workflow = Workflow(
            name="À supprimer",
            trigger_type=WorkflowTriggerType.MANUAL,
            actions=[],
            is_active=False,
            created_by_id=test_user.id,
        )
        test_db.add(workflow)
        test_db.commit()
        workflow_id = workflow.id

        response = client.delete(f"/api/v1/workflows/{workflow_id}", headers=auth_headers)
        assert response.status_code == 204

        # Vérifier suppression
        deleted = test_db.query(Workflow).filter(Workflow.id == workflow_id).first()
        assert deleted is None


class TestWorkflowConditions:
    """Tests des conditions de workflows"""

    def test_condition_equals(self, client, test_db, auth_headers, test_user):
        """Test condition égalité"""
        # Workflow avec condition
        workflow = Workflow(
            name="Test condition =",
            trigger_type=WorkflowTriggerType.ORGANISATION_UPDATED,
            conditions=[{"field": "organisation_type", "operator": "eq", "value": "client"}],
            actions=[{"type": "create_task", "config": {"title": "Client détecté"}}],
            is_active=True,
            created_by_id=test_user.id,
        )
        test_db.add(workflow)
        test_db.commit()

        # Tester avec un client (devrait matcher)
        org = Organisation(
            name="Test Client",
            organisation_type=OrganisationType.CLIENT,
            created_by_id=test_user.id,
        )
        test_db.add(org)
        test_db.commit()

        # Simuler update qui déclenche workflow
        response = client.patch(
            f"/api/v1/organisations/{org.id}",
            json={"description": "Updated"},
            headers=auth_headers,
        )

        # Vérifier exécution si les conditions sont remplies
        # (nécessite implémentation du moteur de workflow)

    def test_condition_greater_than(self, client, test_db, auth_headers):
        """Test condition supérieur à"""
        workflow_data = {
            "name": "Alerte gros montant",
            "trigger_type": "mandat_created",
            "conditions": [{"field": "amount", "operator": "gt", "value": 50000}],
            "actions": [{"type": "send_notification", "config": {"title": "Alerte"}}],
            "is_active": True,
        }

        response = client.post("/api/v1/workflows", json=workflow_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["conditions"][0]["operator"] == "gt"
        assert data["conditions"][0]["value"] == 50000
