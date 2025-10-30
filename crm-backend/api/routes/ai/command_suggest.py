"""
AI Command Suggestions for Command Palette
Provides intelligent suggestions based on user input
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Literal
import re
from datetime import datetime, timedelta

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.person import Person
from models.organisation import Organisation
from models.interaction import Interaction

router = APIRouter(prefix="/ai/command", tags=["ai-command"])


class CommandSuggestion(BaseModel):
    """AI-generated command suggestion"""
    type: Literal["person", "organisation", "task", "interaction", "navigation", "quick_action"]
    action: str  # "create", "view", "edit", "search"
    label: str
    description: str
    confidence: float  # 0.0 to 1.0
    metadata: Optional[dict] = None
    icon: str = "✨"


class CommandSuggestResponse(BaseModel):
    """Response with AI suggestions"""
    query: str
    suggestions: List[CommandSuggestion]
    intent: Optional[str] = None
    entities: Optional[dict] = None


def detect_intent(query: str) -> tuple[str, dict]:
    """
    Detect user intent from natural language query
    Returns (intent, entities)
    """
    query_lower = query.lower().strip()
    entities = {}

    # Task creation patterns
    if any(word in query_lower for word in ["créer", "ajouter", "nouvelle", "nouveau"]):
        if any(word in query_lower for word in ["tâche", "task", "todo", "appel", "rappel"]):
            entities["subject"] = query_lower.split("tâche")[-1].strip() if "tâche" in query_lower else ""
            return "create_task", entities
        elif any(word in query_lower for word in ["personne", "contact", "client"]):
            return "create_person", entities
        elif any(word in query_lower for word in ["organisation", "entreprise", "société"]):
            return "create_organisation", entities
        elif any(word in query_lower for word in ["interaction", "note", "rendez-vous"]):
            return "create_interaction", entities

    # Search patterns
    if query_lower.startswith(("chercher", "rechercher", "trouver", "find", "search")):
        entities["search_term"] = query_lower.split(maxsplit=1)[1] if " " in query_lower else ""
        return "search", entities

    # Email patterns
    if any(word in query_lower for word in ["email", "mail", "envoyer message"]):
        return "email", entities

    # Call patterns
    if any(word in query_lower for word in ["appeler", "appel", "téléphoner", "call"]):
        return "call", entities

    # Navigation patterns
    if any(word in query_lower for word in ["aller", "ouvrir", "voir", "go to", "navigate"]):
        if "dashboard" in query_lower:
            return "navigate_dashboard", entities
        elif any(word in query_lower for word in ["personne", "contact", "client"]):
            return "navigate_people", entities
        elif any(word in query_lower for word in ["organisation", "entreprise"]):
            return "navigate_organisations", entities
        return "navigate", entities

    # Default to search if query is not empty
    if query_lower:
        entities["search_term"] = query_lower
        return "search", entities

    return "unknown", entities


def generate_suggestions_from_intent(
    intent: str,
    entities: dict,
    query: str,
    db: Session,
    current_user: User
) -> List[CommandSuggestion]:
    """Generate suggestions based on detected intent"""
    suggestions = []

    # Task creation
    if intent == "create_task":
        subject = entities.get("subject", "").strip()
        suggestions.append(CommandSuggestion(
            type="task",
            action="create",
            label=f"Créer tâche{': ' + subject if subject else ''}",
            description="Nouvelle tâche avec priorité et échéance",
            confidence=0.95 if subject else 0.85,
            icon="✅",
            metadata={"subject": subject} if subject else None
        ))

    # Person creation
    elif intent == "create_person":
        suggestions.append(CommandSuggestion(
            type="person",
            action="create",
            label="Créer nouvelle personne",
            description="Ajouter un nouveau contact",
            confidence=0.90,
            icon="👤"
        ))

    # Organisation creation
    elif intent == "create_organisation":
        suggestions.append(CommandSuggestion(
            type="organisation",
            action="create",
            label="Créer nouvelle organisation",
            description="Ajouter une nouvelle entreprise",
            confidence=0.90,
            icon="🏢"
        ))

    # Search - find matching entities
    elif intent == "search":
        search_term = entities.get("search_term", query).strip()
        if search_term:
            # Search people (Person model doesn't have team_id isolation)
            people = db.query(Person).filter(
                (Person.first_name.ilike(f"%{search_term}%") |
                 Person.last_name.ilike(f"%{search_term}%") |
                 Person.personal_email.ilike(f"%{search_term}%"))
            ).limit(5).all()

            for person in people:
                suggestions.append(CommandSuggestion(
                    type="person",
                    action="view",
                    label=f"{person.first_name} {person.last_name}",
                    description=person.personal_email or person.role or "Voir le contact",
                    confidence=0.88,
                    icon="👤",
                    metadata={"person_id": person.id}
                ))

            # Search organisations (no team isolation in current schema)
            orgs = db.query(Organisation).filter(
                Organisation.name.ilike(f"%{search_term}%")
            ).limit(5).all()

            for org in orgs:
                suggestions.append(CommandSuggestion(
                    type="organisation",
                    action="view",
                    label=org.name,
                    description=org.sector or "Voir l'organisation",
                    confidence=0.88,
                    icon="🏢",
                    metadata={"organisation_id": org.id}
                ))

    # Navigation
    elif intent.startswith("navigate"):
        if intent == "navigate_dashboard":
            suggestions.append(CommandSuggestion(
                type="navigation",
                action="navigate",
                label="Aller au Dashboard",
                description="Vue d'ensemble et statistiques",
                confidence=0.95,
                icon="📊",
                metadata={"url": "/dashboard"}
            ))
        elif intent == "navigate_people":
            suggestions.append(CommandSuggestion(
                type="navigation",
                action="navigate",
                label="Aller aux Personnes",
                description="Liste de tous les contacts",
                confidence=0.95,
                icon="👥",
                metadata={"url": "/dashboard/people"}
            ))
        elif intent == "navigate_organisations":
            suggestions.append(CommandSuggestion(
                type="navigation",
                action="navigate",
                label="Aller aux Organisations",
                description="Liste de toutes les entreprises",
                confidence=0.95,
                icon="🏢",
                metadata={"url": "/dashboard/organisations"}
            ))

    # Email
    elif intent == "email":
        suggestions.append(CommandSuggestion(
            type="quick_action",
            action="email",
            label="Envoyer un email",
            description="Composer un nouveau message",
            confidence=0.80,
            icon="📧",
            metadata={"action": "compose_email"}
        ))

    # Call
    elif intent == "call":
        suggestions.append(CommandSuggestion(
            type="task",
            action="create",
            label="Créer tâche d'appel",
            description="Planifier un appel téléphonique",
            confidence=0.85,
            icon="📞",
            metadata={"task_type": "call"}
        ))

    return suggestions


@router.get("/suggest", response_model=CommandSuggestResponse)
async def get_command_suggestions(
    q: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-powered command suggestions based on user query

    Examples:
    - "créer tâche appeler john" → Suggests creating a call task
    - "nouvelle personne" → Suggests creating a person
    - "john doe" → Searches for matching people/orgs
    - "aller au dashboard" → Suggests navigation to dashboard
    """
    if not q or len(q.strip()) < 2:
        return CommandSuggestResponse(
            query=q,
            suggestions=[],
            intent=None
        )

    # Detect intent
    intent, entities = detect_intent(q)

    # Generate suggestions
    suggestions = generate_suggestions_from_intent(
        intent=intent,
        entities=entities,
        query=q,
        db=db,
        current_user=current_user
    )

    # Sort by confidence and limit
    suggestions.sort(key=lambda s: s.confidence, reverse=True)
    suggestions = suggestions[:limit]

    return CommandSuggestResponse(
        query=q,
        suggestions=suggestions,
        intent=intent,
        entities=entities
    )


@router.get("/recent", response_model=List[CommandSuggestion])
async def get_recent_suggestions(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get recent/popular suggestions based on user activity
    """
    suggestions = []

    # Recent interactions (no team isolation)
    recent_interactions = db.query(Interaction).order_by(
        Interaction.interaction_date.desc()
    ).limit(5).all()

    for interaction in recent_interactions:
        if interaction.person_id:
            person = db.query(Person).filter(Person.id == interaction.person_id).first()
            if person:
                suggestions.append(CommandSuggestion(
                    type="person",
                    action="view",
                    label=f"{person.first_name} {person.last_name}",
                    description="Contact récent",
                    confidence=0.75,
                    icon="🕐",
                    metadata={"person_id": person.id}
                ))

    return suggestions[:limit]
