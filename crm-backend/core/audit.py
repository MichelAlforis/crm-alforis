"""
Audit Trail - Traçabilité automatique des modifications

Decorator et helpers pour logger automatiquement les changements critiques
"""

import json
import logging
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, Optional

from fastapi import Request
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ============================================================================
# Création d'entrée d'audit
# ============================================================================


def create_audit_log(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    user_id: Optional[int] = None,
    field_name: Optional[str] = None,
    old_value: Any = None,
    new_value: Any = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Crée une entrée d'audit dans la DB

    Args:
        db: Session SQLAlchemy
        entity_type: Type d'entité ("person", "organisation", "user", etc.)
        entity_id: ID de l'entité
        action: Type d'action ("create", "update", "delete")
        user_id: ID de l'utilisateur qui fait l'action
        field_name: Nom du champ modifié (pour update)
        old_value: Ancienne valeur
        new_value: Nouvelle valeur
        ip_address: Adresse IP du client
        user_agent: User-Agent du client
    """
    from models.audit_log import AuditLog

    # Convertir les valeurs en JSON si c'est un dict/list
    old_str = _serialize_value(old_value)
    new_str = _serialize_value(new_value)

    audit = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        field_name=field_name,
        old_value=old_str,
        new_value=new_str,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow(),
    )

    db.add(audit)
    db.commit()

    logger.info(
        "audit_log_created",
        extra={
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "user_id": user_id,
            "field": field_name,
        },
    )


def _serialize_value(value: Any) -> Optional[str]:
    """Convertit une valeur en string pour stockage"""
    if value is None:
        return None

    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str)

    return str(value)


# ============================================================================
# Extraction des changements
# ============================================================================


def detect_changes(old_obj: Any, new_data: Dict[str, Any]) -> Dict[str, tuple]:
    """
    Détecte les changements entre un objet existant et de nouvelles données

    Args:
        old_obj: Objet SQLAlchemy existant
        new_data: Dict des nouvelles valeurs

    Returns:
        Dict {field_name: (old_value, new_value)}
    """
    changes = {}

    for field, new_value in new_data.items():
        if hasattr(old_obj, field):
            old_value = getattr(old_obj, field)

            # Comparer (gérer les types différents)
            if old_value != new_value:
                changes[field] = (old_value, new_value)

    return changes


# ============================================================================
# Decorator pour audit automatique
# ============================================================================


def audit_changes(entity_type: str, action: str = "update"):
    """
    Decorator pour auditer automatiquement les modifications

    Usage:
        @router.put("/people/{person_id}")
        @audit_changes("person", action="update")
        async def update_person(
            person_id: int,
            data: PersonUpdate,
            request: Request,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)
        ):
            person = db.query(Person).get(person_id)
            # ... update logic ...
            return person

    Le decorator va automatiquement:
    1. Capturer l'état AVANT
    2. Laisser la fonction s'exécuter
    3. Capturer l'état APRÈS
    4. Logger les différences dans audit_logs
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extraire request, db, current_user des kwargs
            request: Optional[Request] = kwargs.get("request")
            db: Optional[Session] = kwargs.get("db")
            current_user = kwargs.get("current_user")

            # Extraire entity_id (premier arg ou dans kwargs)
            entity_id = args[0] if args else kwargs.get("id") or kwargs.get(f"{entity_type}_id")

            # Capturer état AVANT (si update/delete)
            old_obj = None
            if action in ("update", "delete") and db and entity_id:
                old_obj = _get_entity(db, entity_type, entity_id)

            # Exécuter la fonction
            result = await func(*args, **kwargs)

            # Logger l'audit APRÈS
            if db and entity_id:
                user_id = current_user.id if current_user else None
                ip_address = request.client.host if request else None
                user_agent = request.headers.get("User-Agent") if request else None

                if action == "create":
                    # Create: logger juste l'action
                    create_audit_log(
                        db=db,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        action="create",
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )

                elif action == "update" and old_obj:
                    # Update: logger chaque champ modifié
                    new_data = kwargs.get("data")
                    if hasattr(new_data, "dict"):
                        new_data = new_data.dict(exclude_unset=True)

                    if new_data:
                        changes = detect_changes(old_obj, new_data)

                        for field, (old_val, new_val) in changes.items():
                            create_audit_log(
                                db=db,
                                entity_type=entity_type,
                                entity_id=entity_id,
                                action="update",
                                field_name=field,
                                old_value=old_val,
                                new_value=new_val,
                                user_id=user_id,
                                ip_address=ip_address,
                                user_agent=user_agent,
                            )

                elif action == "delete":
                    # Delete: logger l'action
                    create_audit_log(
                        db=db,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        action="delete",
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )

            return result

        return wrapper

    return decorator


def _get_entity(db: Session, entity_type: str, entity_id: int):
    """Helper pour récupérer une entité par type"""
    from models.email import EmailCampaign
    from models.organisation import Organisation
    from models.person import Person
    from models.user import User

    entity_map = {
        "person": Person,
        "organisation": Organisation,
        "user": User,
        "campaign": EmailCampaign,
    }

    model = entity_map.get(entity_type)
    if not model:
        return None

    return db.query(model).filter(model.id == entity_id).first()


# ============================================================================
# Helpers pour consulter l'audit trail
# ============================================================================


def get_audit_history(db: Session, entity_type: str, entity_id: int, limit: int = 100):
    """
    Récupère l'historique d'audit pour une entité

    Args:
        db: Session SQLAlchemy
        entity_type: Type d'entité
        entity_id: ID de l'entité
        limit: Nombre max d'entrées

    Returns:
        Liste d'AuditLog triée par date DESC
    """
    from models.audit_log import AuditLog

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return logs


def get_user_activity(db: Session, user_id: int, limit: int = 100):
    """
    Récupère l'activité d'un utilisateur

    Args:
        db: Session SQLAlchemy
        user_id: ID de l'utilisateur
        limit: Nombre max d'entrées

    Returns:
        Liste d'AuditLog triée par date DESC
    """
    from models.audit_log import AuditLog

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return logs


# ============================================================================
# Exemples d'utilisation
# ============================================================================

"""
# Dans les routes (api/routes/people.py)

from core.audit import audit_changes

@router.put("/people/{person_id}")
@audit_changes("person", action="update")
async def update_person(
    person_id: int,
    data: PersonUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(404, "Person not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(person, field, value)

    db.commit()
    db.refresh(person)

    return person


# Consulter l'audit trail

from core.audit import get_audit_history, get_user_activity

@router.get("/audit/{entity_type}/{entity_id}")
async def get_entity_audit(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logs = get_audit_history(db, entity_type, entity_id)
    return logs


@router.get("/audit/users/{user_id}")
async def get_user_audit(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logs = get_user_activity(db, user_id)
    return logs
"""
