"""
Module Publish - Helpers pour publier des événements WebSocket

Ce module fournit des fonctions helpers pour publier des événements
métier via WebSocket de manière ciblée (org, user, resource).

Usage:
    from core.publish import notify_lead_updated, notify_task_assigned

    await notify_lead_updated(
        org_id=42,
        lead_id=123,
        payload={"status": "QUALIFIED", "by": user.id}
    )
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from core.notifications import manager

# ============================================
# Helpers de publication d'événements
# ============================================


async def notify_lead_updated(org_id: int, lead_id: int, payload: Dict[str, Any]):
    """
    Notifie qu'un lead a été modifié

    Args:
        org_id: ID de l'organisation
        lead_id: ID du lead
        payload: Données de la modification
    """
    await manager.send_to_room(
        f"org:{org_id}:resource:lead:{lead_id}",
        {
            "type": "lead.updated",
            "orgId": org_id,
            "entityType": "lead",
            "entityId": lead_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        },
    )


async def notify_contact_updated(org_id: int, contact_id: int, payload: Dict[str, Any]):
    """Notifie qu'un contact a été modifié"""
    await manager.send_to_room(
        f"org:{org_id}:resource:contact:{contact_id}",
        {
            "type": "contact.updated",
            "orgId": org_id,
            "entityType": "contact",
            "entityId": contact_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        },
    )


async def notify_task_assigned(org_id: int, user_id: int, task_id: int, payload: Dict[str, Any]):
    """
    Notifie qu'une tâche a été assignée à un utilisateur

    Args:
        org_id: ID de l'organisation
        user_id: ID de l'utilisateur assigné
        task_id: ID de la tâche
        payload: Données de la tâche
    """
    await manager.send_to_user(
        org_id,
        user_id,
        {
            "type": "task.assigned",
            "orgId": org_id,
            "userId": user_id,
            "entityType": "task",
            "entityId": task_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        },
    )


async def notify_job_progress(
    org_id: int,
    job_id: str,
    progress: int,
    status: str,
    message: Optional[str] = None,
    errors: Optional[list] = None,
):
    """
    Notifie de la progression d'un job asynchrone (import, export, etc.)

    Args:
        org_id: ID de l'organisation
        job_id: ID du job
        progress: Pourcentage de progression (0-100)
        status: Statut (pending, running, completed, failed)
        message: Message optionnel
        errors: Liste d'erreurs optionnelle
    """
    await manager.send_to_room(
        f"org:{org_id}:job:{job_id}",
        {
            "type": "job.progress",
            "orgId": org_id,
            "jobId": job_id,
            "progress": progress,
            "status": status,
            "message": message,
            "errors": errors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def notify_presence(
    org_id: int,
    resource_type: str,
    resource_id: int,
    user_id: int,
    action: str,  # "viewing", "editing", "left"
    username: Optional[str] = None,
):
    """
    Notifie de la présence d'un utilisateur sur une ressource

    Args:
        org_id: ID de l'organisation
        resource_type: Type de ressource (contact, lead, etc.)
        resource_id: ID de la ressource
        user_id: ID de l'utilisateur
        action: Action (viewing, editing, left)
        username: Nom de l'utilisateur (optionnel)
    """
    await manager.send_to_room(
        f"org:{org_id}:resource:{resource_type}:{resource_id}:presence",
        {
            "type": "presence",
            "orgId": org_id,
            "resourceType": resource_type,
            "resourceId": resource_id,
            "userId": user_id,
            "username": username,
            "action": action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def notify_activity_feed(
    org_id: int,
    activity_type: str,
    entity_type: str,
    entity_id: int,
    user_id: int,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
):
    """
    Notifie d'une nouvelle activité dans le feed d'audit

    Args:
        org_id: ID de l'organisation
        activity_type: Type d'activité (created, updated, deleted, etc.)
        entity_type: Type d'entité (contact, lead, task, etc.)
        entity_id: ID de l'entité
        user_id: ID de l'utilisateur qui a fait l'action
        message: Message descriptif
        metadata: Métadonnées additionnelles
    """
    await manager.broadcast_org(
        org_id,
        {
            "type": "activity.feed",
            "orgId": org_id,
            "activityType": activity_type,
            "entityType": entity_type,
            "entityId": entity_id,
            "userId": user_id,
            "message": message,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def notify_workflow_execution(
    org_id: int, workflow_id: int, run_id: str, step: str, status: str, payload: Dict[str, Any]
):
    """
    Notifie de l'exécution d'un workflow

    Args:
        org_id: ID de l'organisation
        workflow_id: ID du workflow
        run_id: ID de l'exécution
        step: Étape en cours
        status: Statut (running, completed, failed)
        payload: Données de l'étape
    """
    await manager.send_to_room(
        f"org:{org_id}:workflow:{workflow_id}:run:{run_id}",
        {
            "type": "workflow.execution",
            "orgId": org_id,
            "workflowId": workflow_id,
            "runId": run_id,
            "step": step,
            "status": status,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def notify_kpi_update(org_id: int, dashboard_id: str, kpis: Dict[str, Any]):
    """
    Notifie de la mise à jour de KPIs en temps réel

    Args:
        org_id: ID de l'organisation
        dashboard_id: ID du dashboard
        kpis: Dictionnaire des KPIs mis à jour
    """
    await manager.send_to_room(
        f"org:{org_id}:kpi:dashboard:{dashboard_id}",
        {
            "type": "kpi.update",
            "orgId": org_id,
            "dashboardId": dashboard_id,
            "kpis": kpis,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
