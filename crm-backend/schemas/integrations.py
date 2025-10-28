"""
Schemas Pydantic pour les intégrations externes

Schémas de validation pour:
- Autofill V2 (multi-sources)
- Outlook OAuth et synchronisation
- LinkedIn/Google (Phase 2+)
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ======================
# Enums
# ======================


class BudgetMode(str, Enum):
    """Mode de budget pour l'autofill (contrôle utilisation LLM)"""

    NORMAL = "normal"  # Utilise toutes les sources y compris LLM
    LOW = "low"  # Limite l'usage LLM, privilégie patterns/DB
    EMERGENCY = "emergency"  # Pas de LLM, rules + DB uniquement


class AutofillSourceType(str, Enum):
    """Source d'une suggestion d'autofill"""

    RULES = "rules"  # Règles déterministes (TLD→pays, phone E.164)
    DB_PATTERN = "db_pattern"  # Patterns email existants
    OUTLOOK = "outlook"  # Signatures emails Outlook
    LINKEDIN = "linkedin"  # Profils LinkedIn (Phase 2)
    GOOGLE = "google"  # Google Search/Places (Phase 2)
    LLM = "llm"  # LLM fallback


class TaskPriority(str, Enum):
    """Priorité des tâches générées"""

    HIGH = "high"  # Urgent (J+7 sans réponse)
    MEDIUM = "medium"  # Important (J+3 sans réponse)
    LOW = "low"  # Routine


# ======================
# Autofill V2 Request/Response
# ======================


class AutofillV2Request(BaseModel):
    """
    Requête pour l'autofill prédictif V2

    Envoie un brouillon partiel et reçoit des suggestions multi-sources
    avec scores de confiance et preuves.
    """

    entity_type: str = Field(..., description="Type d'entité: 'person' ou 'organisation'")
    draft: Dict[str, Any] = Field(..., description="Données partielles saisies")
    context: Optional[Dict[str, Any]] = Field(
        default=None, description="Contexte: outlook_enabled, budget_mode, etc."
    )

    @field_validator("entity_type")
    @classmethod
    def validate_entity_type(cls, v: str) -> str:
        if v not in ["person", "organisation"]:
            raise ValueError("entity_type doit être 'person' ou 'organisation'")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "entity_type": "person",
                "draft": {
                    "first_name": "Jean",
                    "last_name": "Dupont",
                    "email": "j.dupont@acme.fr",
                },
                "context": {"budget_mode": "normal", "outlook_enabled": True},
            }
        }


class AutofillSuggestion(BaseModel):
    """Une suggestion d'autofill avec métadonnées"""

    field: str = Field(..., description="Nom du champ (ex: 'country', 'phone')")
    value: Any = Field(..., description="Valeur suggérée")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance 0-1")
    source: AutofillSourceType = Field(..., description="Source de la suggestion")
    evidence: Optional[str] = Field(None, description="Preuve/contexte de la suggestion")
    auto_apply: bool = Field(
        default=False, description="True si confiance ≥ seuil pour auto-application"
    )


class AutofillTask(BaseModel):
    """Tâche générée par l'autofill (ex: relances emails)"""

    title: str = Field(..., description="Titre de la tâche")
    description: Optional[str] = Field(None, description="Description détaillée")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: Optional[datetime] = Field(None, description="Date d'échéance")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Métadonnées additionnelles")


class AutofillV2Response(BaseModel):
    """
    Réponse de l'autofill V2 avec suggestions multi-sources

    Retourne:
    - autofill: dict de suggestions par champ
    - tasks: liste de tâches générées (relances, etc.)
    - meta: métadonnées d'exécution (temps, sources utilisées)
    """

    autofill: Dict[str, AutofillSuggestion] = Field(
        ..., description="Suggestions par champ (clé = nom du champ)"
    )
    tasks: List[AutofillTask] = Field(default=[], description="Tâches générées")
    meta: Dict[str, Any] = Field(..., description="Métadonnées: temps, sources, coûts")

    class Config:
        json_schema_extra = {
            "example": {
                "autofill": {
                    "country": {
                        "field": "country",
                        "value": "France",
                        "confidence": 0.95,
                        "source": "rules",
                        "evidence": "TLD .fr détecté",
                        "auto_apply": True,
                    },
                    "phone": {
                        "field": "phone",
                        "value": "+33 6 12 34 56 78",
                        "confidence": 0.88,
                        "source": "outlook",
                        "evidence": "Signature email de Jean Dupont",
                        "auto_apply": True,
                    },
                },
                "tasks": [
                    {
                        "title": "Relancer Jean Dupont (J+3 sans réponse)",
                        "description": "Email envoyé le 20/10, aucune réponse",
                        "priority": "medium",
                    }
                ],
                "meta": {
                    "execution_time_ms": 67,
                    "sources_used": ["rules", "db_pattern", "outlook"],
                    "llm_used": False,
                },
            }
        }


# ======================
# Outlook OAuth
# ======================


class OutlookAuthorizeRequest(BaseModel):
    """Demande d'autorisation Outlook (optionnel, peut être GET)"""

    pass


class OutlookAuthorizeResponse(BaseModel):
    """URL d'autorisation OAuth Microsoft"""

    authorization_url: str = Field(..., description="URL de redirection OAuth")
    state: str = Field(..., description="Token CSRF pour validation callback")


class OutlookCallbackRequest(BaseModel):
    """Callback OAuth après autorisation utilisateur"""

    code: str = Field(..., description="Code d'autorisation Microsoft")
    state: str = Field(..., description="Token CSRF à vérifier")


class OutlookCallbackResponse(BaseModel):
    """Réponse après échange du code OAuth"""

    status: str = Field(..., description="Status de la connexion")
    message: str = Field(..., description="Message de confirmation")
    expires_in: Optional[int] = Field(None, description="Durée de validité du token (secondes)")


class OutlookSyncResponse(BaseModel):
    """Résultat de la synchronisation emails Outlook"""

    messages_count: int = Field(..., description="Nombre de messages récupérés")
    signatures_count: int = Field(..., description="Nombre de signatures extraites")
    signatures: List[Dict[str, Any]] = Field(..., description="Liste des signatures")


class OutlookSignaturesResponse(BaseModel):
    """Liste des signatures Outlook stockées"""

    signatures: List[Dict[str, Any]] = Field(..., description="Signatures persistées en DB")


# ======================
# Email Pattern Detection
# ======================


class EmailPatternInfo(BaseModel):
    """Information sur un pattern email détecté"""

    pattern: str = Field(..., description="Type de pattern (first.last, firstlast, f.last...)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance")
    evidence_count: int = Field(..., description="Nombre d'emails confirmant ce pattern")
    examples: List[str] = Field(default=[], description="Exemples d'emails avec ce pattern")


# ======================
# Phone Normalization
# ======================


class PhoneNormalizationRequest(BaseModel):
    """Requête de normalisation téléphone (E.164)"""

    phone: str = Field(..., description="Numéro de téléphone brut")
    country_code: Optional[str] = Field(
        None, description="Code pays ISO (FR, US...) pour détection contexte"
    )


class PhoneNormalizationResponse(BaseModel):
    """Téléphone normalisé en format E.164"""

    original: str = Field(..., description="Numéro original")
    normalized: str = Field(..., description="Numéro normalisé E.164")
    country_code: Optional[str] = Field(None, description="Code pays détecté")
    is_valid: bool = Field(..., description="True si numéro valide")


# ======================
# Autofill Preview (V1.5 Smart Resolver)
# ======================


class MatchAction(str, Enum):
    """Action recommandée pour un match"""

    APPLY = "apply"  # Auto-apply (score ≥ 100)
    PREVIEW = "preview"  # Validation humaine (60 ≤ score < 100)
    CREATE_NEW = "create_new"  # Créer nouvelle fiche (score < 60)


class MatchCandidate(BaseModel):
    """Un candidat potentiel pour matching"""

    score: int = Field(..., description="Score de matching total")
    action: MatchAction = Field(..., description="Action recommandée")
    details: Dict[str, int] = Field(
        ..., description="Détail des points par critère (email_exact, name_fuzzy, etc.)"
    )
    candidate: Dict[str, Any] = Field(..., description="Données du candidat (Person ou Organisation)")

    class Config:
        json_schema_extra = {
            "example": {
                "score": 140,
                "action": "apply",
                "details": {
                    "email_exact": 100,
                    "email_domain": 40
                },
                "candidate": {
                    "id": 42,
                    "first_name": "Jean",
                    "last_name": "Dupont",
                    "personal_email": "j.dupont@mandarine-gestion.com",
                    "company_name": "Mandarine Gestion"
                }
            }
        }


class AutofillPreviewRequest(BaseModel):
    """
    Requête de preview pour Smart Resolver V1.5

    Envoie un brouillon et reçoit les candidats potentiels scorés
    """

    entity_type: str = Field(..., description="Type d'entité: 'person' ou 'organisation'")
    draft: Dict[str, Any] = Field(..., description="Données partielles saisies")
    limit: int = Field(default=5, le=10, description="Nombre max de candidats à retourner")

    @field_validator("entity_type")
    @classmethod
    def validate_entity_type(cls, v: str) -> str:
        if v not in ["person", "organisation"]:
            raise ValueError("entity_type doit être 'person' ou 'organisation'")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "entity_type": "person",
                "draft": {
                    "first_name": "Jean",
                    "last_name": "Dupont",
                    "personal_email": "j.dupont@mandarine-gestion.com",
                    "phone": "01 23 45 67 89"
                },
                "limit": 5
            }
        }


class AutofillPreviewResponse(BaseModel):
    """
    Réponse du Smart Resolver avec candidats scorés

    Retourne:
    - matches: liste de candidats potentiels avec scores
    - recommendation: action globale recommandée (basée sur le meilleur match)
    - meta: métadonnées d'exécution
    """

    matches: List[MatchCandidate] = Field(..., description="Candidats potentiels triés par score")
    recommendation: MatchAction = Field(..., description="Action recommandée globale")
    meta: Dict[str, Any] = Field(
        default={},
        description="Métadonnées: temps d'exécution, critères utilisés, etc."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "matches": [
                    {
                        "score": 140,
                        "action": "apply",
                        "details": {"email_exact": 100, "email_domain": 40},
                        "candidate": {
                            "id": 42,
                            "first_name": "Jean",
                            "last_name": "Dupont",
                            "personal_email": "j.dupont@mandarine-gestion.com"
                        }
                    }
                ],
                "recommendation": "apply",
                "meta": {
                    "execution_time_ms": 15,
                    "candidates_searched": 3,
                    "criteria_used": ["email", "name", "phone"]
                }
            }
        }
