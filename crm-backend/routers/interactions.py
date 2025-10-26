"""
Router API pour Interactions v2

Endpoints v1:
- POST /interactions : Créer une interaction
- PATCH /interactions/{id} : Modifier une interaction
- DELETE /interactions/{id} : Supprimer une interaction
- GET /interactions/recent : 5 dernières interactions (widget dashboard)
- GET /interactions/by-organisation/{org_id} : Interactions d'une organisation
- GET /interactions/by-person/{person_id} : Interactions d'une personne

Endpoints v2 (Inbox):
- GET /interactions/inbox : Inbox avec filtres (assignee, status, due)
- PATCH /interactions/{id}/status : Changer le statut
- PATCH /interactions/{id}/assignee : Changer l'assignee
- PATCH /interactions/{id}/next-action : Définir next_action_at

Permissions:
- Lecture : équipe (tout le monde)
- Écriture : créateur + rôles sales/admin
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from models.interaction import Interaction, InteractionParticipant, InteractionStatus
from schemas.interaction import (
    InteractionAssigneeUpdate,
    InteractionCreate,
    InteractionListResponse,
    InteractionNextActionUpdate,
    InteractionOut,
    InteractionStatusUpdate,
    InteractionUpdate,
    ParticipantIn,
)

router = APIRouter(prefix="/interactions", tags=["interactions"])


def _get_user_id(current_user: dict) -> int:
    """Extrait l'user_id du token JWT"""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID manquant dans le token"
        )
    try:
        return int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID invalide")


def _check_permissions_write(interaction: Interaction, user_id: int, user_roles: List[str]):
    """
    Vérifie les permissions d'écriture :
    - Créateur OU
    - Rôle sales OU
    - Rôle admin
    """
    is_creator = interaction.created_by == user_id
    is_sales = "sales" in user_roles
    is_admin = "admin" in user_roles

    if not (is_creator or is_sales or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes pour modifier cette interaction",
        )


def _build_interaction_out(interaction: Interaction) -> InteractionOut:
    """
    Construit InteractionOut depuis un modèle Interaction.

    Inclut les participants internes et externes (v1.1).
    """
    # Participants internes (M-N)
    participants_list = [
        ParticipantIn(
            person_id=p.person_id,
            role=p.role,
            present=p.present,
        )
        for p in (interaction.participants or [])
    ]

    # Convertir l'interaction en dict et ajouter les participants
    data = {
        "id": interaction.id,
        "org_id": interaction.org_id,
        "person_id": interaction.person_id,
        "type": interaction.type.value,
        "title": interaction.title,
        "body": interaction.body,
        "created_by": interaction.created_by,
        "created_at": interaction.created_at,
        "updated_at": interaction.updated_at,
        "attachments": interaction.attachments or [],
        "participants": participants_list,
        "external_participants": interaction.external_participants or [],
    }

    return InteractionOut(**data)


@router.post("", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    payload: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer une nouvelle interaction.

    Contrainte métier : au moins org_id OU person_id est requis.
    La validation Pydantic vérifie déjà cette contrainte.
    """
    user_id = _get_user_id(current_user)

    # Créer l'interaction
    interaction = Interaction(
        org_id=payload.org_id,
        person_id=payload.person_id,
        type=payload.type,
        title=payload.title,
        body=payload.body,  # Alias vers description en base
        created_by=user_id,
        attachments=[att.model_dump() for att in payload.attachments],
        external_participants=[ep.model_dump() for ep in (payload.external_participants or [])],
    )

    db.add(interaction)
    db.flush()  # Get ID before adding participants

    # v1.1: Ajouter les participants internes
    if payload.participants:
        for part in payload.participants:
            participant = InteractionParticipant(
                interaction_id=interaction.id,
                person_id=part.person_id,
                role=part.role,
                present=part.present,
            )
            db.add(participant)

    db.commit()
    db.refresh(interaction)

    # Construire la réponse avec participants
    return _build_interaction_out(interaction)


@router.patch("/{interaction_id}", response_model=InteractionOut)
async def update_interaction(
    interaction_id: int,
    payload: InteractionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Modifier une interaction existante.

    Permissions : créateur + sales + admin.
    """
    user_id = _get_user_id(current_user)
    user_roles = current_user.get("roles", [])

    # Récupérer l'interaction
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interaction {interaction_id} introuvable",
        )

    # Vérifier les permissions
    _check_permissions_write(interaction, user_id, user_roles)

    # Appliquer les modifications
    if payload.type is not None:
        interaction.type = payload.type
    if payload.title is not None:
        interaction.title = payload.title
    if payload.body is not None:
        interaction.body = payload.body
    if payload.attachments is not None:
        interaction.attachments = [att.model_dump() for att in payload.attachments]
    if payload.external_participants is not None:
        interaction.external_participants = [
            ep.model_dump() for ep in payload.external_participants
        ]

    # v1.1: Remplacer les participants (stratégie simple et sûre)
    if payload.participants is not None:
        # Supprimer tous les participants existants
        db.query(InteractionParticipant).filter(
            InteractionParticipant.interaction_id == interaction_id
        ).delete()

        # Ajouter les nouveaux
        for part in payload.participants:
            participant = InteractionParticipant(
                interaction_id=interaction_id,
                person_id=part.person_id,
                role=part.role,
                present=part.present,
            )
            db.add(participant)

    interaction.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(interaction)

    return _build_interaction_out(interaction)


@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer une interaction.

    Permissions : créateur + sales + admin.
    """
    user_id = _get_user_id(current_user)
    user_roles = current_user.get("roles", [])

    # Récupérer l'interaction
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interaction {interaction_id} introuvable",
        )

    # Vérifier les permissions
    _check_permissions_write(interaction, user_id, user_roles)

    db.delete(interaction)
    db.commit()


@router.get("/recent", response_model=List[InteractionOut])
async def get_recent_interactions(
    limit: int = Query(5, ge=1, le=20, description="Nombre d'interactions à retourner"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupérer les N dernières interactions (toutes organisations/personnes confondues).

    Utilisé par le widget Dashboard.
    """
    interactions = db.query(Interaction).order_by(desc(Interaction.created_at)).limit(limit).all()

    return [_build_interaction_out(it) for it in interactions]


@router.get("/by-organisation/{org_id}", response_model=InteractionListResponse)
async def list_by_organisation(
    org_id: int,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[int] = Query(None, description="ID de la dernière interaction (pagination)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lister les interactions d'une organisation (timeline).

    Pagination basée sur cursor (ID de la dernière interaction vue).
    """
    query = db.query(Interaction).filter(Interaction.org_id == org_id)

    # Pagination cursor-based
    if cursor:
        query = query.filter(Interaction.id < cursor)

    query = query.order_by(desc(Interaction.created_at))

    interactions = query.limit(limit).all()
    total = db.query(Interaction).filter(Interaction.org_id == org_id).count()

    # Calculer le nouveau cursor
    new_cursor = str(interactions[-1].id) if interactions else None

    return InteractionListResponse(
        items=[_build_interaction_out(it) for it in interactions],
        total=total,
        limit=limit,
        cursor=new_cursor,
    )


@router.get("/by-person/{person_id}", response_model=InteractionListResponse)
async def list_by_person(
    person_id: int,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[int] = Query(None, description="ID de la dernière interaction (pagination)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lister les interactions d'une personne (timeline).

    Pagination basée sur cursor (ID de la dernière interaction vue).
    """
    query = db.query(Interaction).filter(Interaction.person_id == person_id)

    # Pagination cursor-based
    if cursor:
        query = query.filter(Interaction.id < cursor)

    query = query.order_by(desc(Interaction.created_at))

    interactions = query.limit(limit).all()
    total = db.query(Interaction).filter(Interaction.person_id == person_id).count()

    # Calculer le nouveau cursor
    new_cursor = str(interactions[-1].id) if interactions else None

    return InteractionListResponse(
        items=[_build_interaction_out(it) for it in interactions],
        total=total,
        limit=limit,
        cursor=new_cursor,
    )


# ===== V2: Inbox Endpoints =====


@router.get("/inbox", response_model=InteractionListResponse)
async def get_inbox(
    assignee: Optional[str] = Query(
        None, description="Filter by assignee: 'me', user_id, or omit for all"
    ),
    status: Optional[str] = Query(
        None, description="Filter by status: 'todo', 'in_progress', 'done'"
    ),
    due: Optional[str] = Query(
        "all", description="Filter by due date: 'overdue', 'today', 'week', 'all'"
    ),
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    GET /interactions/inbox - Inbox des interactions à traiter

    Filtres:
    - assignee: 'me' (current user), user_id, or None (all)
    - status: 'todo', 'in_progress', 'done', or None (all non-done)
    - due: 'overdue' (next_action_at < now), 'today', 'week', 'all'

    Tri:
    - next_action_at ASC (NULLS LAST)
    - puis created_at DESC
    """
    user_id = _get_user_id(current_user)

    # Base query
    query = db.query(Interaction)

    # Filter by assignee
    if assignee == "me":
        query = query.filter(Interaction.assignee_id == user_id)
    elif assignee and assignee.isdigit():
        query = query.filter(Interaction.assignee_id == int(assignee))
    # If assignee is None, show all

    # Filter by status (default: non-done)
    if status:
        query = query.filter(Interaction.status == status)
    else:
        # Default: show todo + in_progress (exclude done)
        # Use string literals to match PostgreSQL ENUM values (lowercase)
        query = query.filter(Interaction.status.in_(["todo", "in_progress"]))

    # Filter by due date
    now = datetime.utcnow()
    if due == "overdue":
        query = query.filter(
            Interaction.next_action_at.isnot(None), Interaction.next_action_at < now
        )
    elif due == "today":
        from datetime import timedelta

        end_of_day = now.replace(hour=23, minute=59, second=59)
        query = query.filter(
            Interaction.next_action_at.isnot(None),
            Interaction.next_action_at.between(now, end_of_day),
        )
    elif due == "week":
        from datetime import timedelta

        end_of_week = now + timedelta(days=7)
        query = query.filter(
            Interaction.next_action_at.isnot(None),
            Interaction.next_action_at.between(now, end_of_week),
        )
    # If 'all', no due filter

    # Apply cursor pagination
    if cursor:
        try:
            cursor_id = int(cursor)
            query = query.filter(Interaction.id < cursor_id)
        except ValueError:
            pass

    # Sort: next_action_at ASC NULLS LAST, then created_at DESC
    query = query.order_by(
        Interaction.next_action_at.asc().nullslast(), desc(Interaction.created_at)
    )

    interactions = query.limit(limit).all()

    # Count total (with same filters, without cursor)
    count_query = db.query(Interaction)
    if assignee == "me":
        count_query = count_query.filter(Interaction.assignee_id == user_id)
    elif assignee and assignee.isdigit():
        count_query = count_query.filter(Interaction.assignee_id == int(assignee))
    if status:
        count_query = count_query.filter(Interaction.status == status)
    else:
        # Use string literals to match PostgreSQL ENUM values (lowercase)
        count_query = count_query.filter(Interaction.status.in_(["todo", "in_progress"]))
    total = count_query.count()

    new_cursor = str(interactions[-1].id) if interactions else None

    return InteractionListResponse(
        items=[_build_interaction_out(it) for it in interactions],
        total=total,
        limit=limit,
        cursor=new_cursor,
    )


@router.patch("/{interaction_id}/status", response_model=InteractionOut)
async def update_status(
    interaction_id: int,
    payload: InteractionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    PATCH /interactions/{id}/status - Changer le statut d'une interaction

    Statuts possibles: 'todo', 'in_progress', 'done'
    """
    user_id = _get_user_id(current_user)
    user_roles = current_user.get("roles", [])

    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction introuvable")

    # Check permissions
    _check_permissions_write(interaction, user_id, user_roles)

    # Update status
    interaction.status = InteractionStatus(payload.status)
    interaction.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(interaction)

    return _build_interaction_out(interaction)


@router.patch("/{interaction_id}/assignee", response_model=InteractionOut)
async def update_assignee(
    interaction_id: int,
    payload: InteractionAssigneeUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    PATCH /interactions/{id}/assignee - Assigner/désassigner une interaction

    assignee_id: user ID or null to unassign
    """
    user_id = _get_user_id(current_user)
    user_roles = current_user.get("roles", [])

    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction introuvable")

    # Check permissions
    _check_permissions_write(interaction, user_id, user_roles)

    # Update assignee
    interaction.assignee_id = payload.assignee_id
    interaction.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(interaction)

    return _build_interaction_out(interaction)


@router.patch("/{interaction_id}/next-action", response_model=InteractionOut)
async def update_next_action(
    interaction_id: int,
    payload: InteractionNextActionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    PATCH /interactions/{id}/next-action - Définir la date de prochaine action

    next_action_at: datetime or null to remove
    """
    user_id = _get_user_id(current_user)
    user_roles = current_user.get("roles", [])

    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction introuvable")

    # Check permissions
    _check_permissions_write(interaction, user_id, user_roles)

    # Update next_action_at
    interaction.next_action_at = payload.next_action_at
    interaction.updated_at = datetime.utcnow()

    # Reset notified_at when changing next_action_at
    if payload.next_action_at:
        interaction.notified_at = None

    db.commit()
    db.refresh(interaction)

    return _build_interaction_out(interaction)
