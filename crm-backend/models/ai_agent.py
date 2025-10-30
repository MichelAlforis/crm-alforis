"""
Modèles de base de données pour l'Agent IA

Ce module contient les modèles pour:
- AI Suggestions: Suggestions de l'IA (déduplication, enrichissement, corrections)
- AI Execution Logs: Historique des exécutions de l'agent IA
- AI Configuration: Configuration et règles de l'agent IA
"""

import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel

# ======================
# Enums
# ======================


class AISuggestionType(str, enum.Enum):
    """Types de suggestions de l'IA"""

    DUPLICATE_DETECTION = "duplicate_detection"  # Détection de doublons
    DATA_ENRICHMENT = "data_enrichment"  # Enrichissement de données
    DATA_QUALITY = "data_quality"  # Contrôle qualité
    DATA_CORRECTION = "data_correction"  # Correction de données
    WORKFLOW_SUGGESTION = "workflow_suggestion"  # Suggestion de workflow
    CATEGORIZATION = "categorization"  # Catégorisation automatique
    CONTACT_EXTRACTION = "contact_extraction"  # Extraction de contacts


class AISuggestionStatus(str, enum.Enum):
    """Statut d'une suggestion"""

    PENDING = "pending"  # En attente de validation
    APPROVED = "approved"  # Approuvée par l'utilisateur
    REJECTED = "rejected"  # Rejetée par l'utilisateur
    APPLIED = "applied"  # Appliquée automatiquement
    EXPIRED = "expired"  # Expirée (non traitée dans les délais)


class AIExecutionStatus(str, enum.Enum):
    """Statut d'exécution de l'agent IA"""

    PENDING = "pending"  # En file d'attente
    RUNNING = "running"  # En cours d'exécution
    SUCCESS = "success"  # Succès
    FAILED = "failed"  # Échec
    PARTIAL = "partial"  # Partiel (certaines tâches ont échoué)
    CANCELLED = "cancelled"  # Annulé


class AITaskType(str, enum.Enum):
    """Types de tâches IA"""

    DUPLICATE_SCAN = "duplicate_scan"  # Scan de doublons
    BULK_ENRICHMENT = "bulk_enrichment"  # Enrichissement en masse
    QUALITY_CHECK = "quality_check"  # Vérification qualité
    AUTO_CATEGORIZE = "auto_categorize"  # Catégorisation auto
    CONTACT_EXTRACTION = "contact_extraction"  # Extraction contacts


class AIProvider(str, enum.Enum):
    """Fournisseurs d'API IA"""

    CLAUDE = "claude"  # Anthropic Claude
    OPENAI = "openai"  # OpenAI GPT
    OLLAMA = "ollama"  # Ollama (local)
    CUSTOM = "custom"  # Personnalisé


# ======================
# Modèles
# ======================


class AISuggestion(BaseModel):
    """
    Suggestions générées par l'agent IA

    Stocke toutes les suggestions faites par l'IA qui nécessitent
    une validation manuelle ou qui ont été appliquées automatiquement.
    """

    __tablename__ = "ai_suggestions"

    # Type et statut
    type = Column(SQLEnum(AISuggestionType), nullable=False, index=True)
    status = Column(
        SQLEnum(AISuggestionStatus), nullable=False, default=AISuggestionStatus.PENDING, index=True
    )

    # Entité concernée
    entity_type = Column(String(50), nullable=False, index=True)  # organisation, person, etc.
    entity_id = Column(Integer, nullable=False, index=True)

    # Contenu de la suggestion
    title = Column(String(255), nullable=False)  # Titre court
    description = Column(Text, nullable=True)  # Description détaillée
    suggestion_data = Column(JSON, nullable=False)  # Données structurées de la suggestion

    # Métadonnées IA
    confidence_score = Column(Float, nullable=True)  # Score de confiance 0-1
    ai_provider = Column(SQLEnum(AIProvider), nullable=False, default=AIProvider.CLAUDE)
    ai_model = Column(String(100), nullable=True)  # ex: "claude-3-5-sonnet-20241022"
    prompt_tokens = Column(Integer, nullable=True)  # Tokens utilisés (prompt)
    completion_tokens = Column(Integer, nullable=True)  # Tokens utilisés (completion)

    # Validation
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)

    # Auto-application
    auto_applied = Column(Boolean, default=False)  # Appliquée automatiquement
    applied_at = Column(DateTime, nullable=True)

    # Expiration
    expires_at = Column(DateTime, nullable=True)  # Date d'expiration

    # Relations
    execution_id = Column(Integer, ForeignKey("ai_executions.id"), nullable=True)
    execution = relationship("AIExecution", back_populates="suggestions")

    def __repr__(self):
        return f"<AISuggestion(id={self.id}, type={self.type}, status={self.status})>"


class AIExecution(BaseModel):
    """
    Logs d'exécution de l'agent IA

    Historise chaque exécution de l'agent IA avec:
    - Métadonnées d'exécution
    - Résultats et métriques
    - Erreurs éventuelles
    """

    __tablename__ = "ai_executions"

    # Type de tâche
    task_type = Column(SQLEnum(AITaskType), nullable=False, index=True)
    status = Column(
        SQLEnum(AIExecutionStatus), nullable=False, default=AIExecutionStatus.PENDING, index=True
    )

    # Configuration
    config = Column(JSON, nullable=True)  # Configuration utilisée pour l'exécution
    ai_provider = Column(SQLEnum(AIProvider), nullable=False, default=AIProvider.CLAUDE)
    ai_model = Column(String(100), nullable=True)

    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Résultats
    total_items_processed = Column(Integer, default=0)
    total_suggestions_created = Column(Integer, default=0)
    total_suggestions_applied = Column(Integer, default=0)

    # Métriques IA
    total_prompt_tokens = Column(Integer, default=0)
    total_completion_tokens = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, nullable=True)

    # Logs et erreurs
    execution_logs = Column(JSON, nullable=True)  # Array de logs
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)

    # Utilisateur
    triggered_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relations
    suggestions = relationship("AISuggestion", back_populates="execution")

    def __repr__(self):
        return f"<AIExecution(id={self.id}, task_type={self.task_type}, status={self.status})>"

    def calculate_duration(self):
        """Calcule la durée d'exécution"""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = delta.total_seconds()


class AIConfiguration(BaseModel):
    """
    Configuration de l'agent IA

    Stocke les paramètres et règles de l'agent IA:
    - Seuils de confiance
    - Règles d'auto-application
    - Préférences utilisateur
    """

    __tablename__ = "ai_configurations"

    # Identification
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Activation
    is_active = Column(Boolean, default=True, index=True)

    # Fournisseur IA
    ai_provider = Column(SQLEnum(AIProvider), nullable=False, default=AIProvider.CLAUDE)
    ai_model = Column(String(100), nullable=True)
    api_key_name = Column(String(100), nullable=True)  # Nom de la variable d'env

    # Règles d'auto-application
    auto_apply_enabled = Column(Boolean, default=False)
    auto_apply_confidence_threshold = Column(
        Float, default=0.95
    )  # Seuil de confiance pour auto-appliquer

    # Seuils de détection
    duplicate_similarity_threshold = Column(Float, default=0.85)  # Similarité pour doublons
    quality_score_threshold = Column(Float, default=0.70)  # Score qualité minimum

    # Limites
    max_suggestions_per_execution = Column(Integer, default=100)
    max_tokens_per_request = Column(Integer, default=4000)
    rate_limit_requests_per_minute = Column(Integer, default=10)

    # Budget
    daily_budget_usd = Column(Float, nullable=True)  # Budget quotidien max
    monthly_budget_usd = Column(Float, nullable=True)  # Budget mensuel max

    # Notifications
    notify_on_suggestions = Column(Boolean, default=True)
    notify_on_errors = Column(Boolean, default=True)
    notification_user_ids = Column(JSON, nullable=True)  # Liste d'IDs utilisateurs

    # Configuration avancée
    custom_prompts = Column(JSON, nullable=True)  # Prompts personnalisés par type
    rules = Column(JSON, nullable=True)  # Règles métier personnalisées

    # Statistiques d'utilisation
    total_executions = Column(Integer, default=0)
    total_suggestions = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    last_execution_at = Column(DateTime, nullable=True)

    # API Keys chiffrées (depuis frontend)
    encrypted_anthropic_key = Column(Text, nullable=True)  # Clé Anthropic chiffrée
    encrypted_openai_key = Column(Text, nullable=True)  # Clé OpenAI chiffrée
    encrypted_mistral_key = Column(Text, nullable=True)  # Clé Mistral AI chiffrée (EU - RGPD)
    encrypted_ollama_url = Column(Text, nullable=True)  # URL Ollama custom chiffrée
    api_keys_updated_at = Column(DateTime, nullable=True)
    api_keys_updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    def __repr__(self):
        return f"<AIConfiguration(id={self.id}, name={self.name}, is_active={self.is_active})>"


class AICache(BaseModel):
    """
    Cache des résultats IA pour optimiser les coûts

    Stocke les résultats d'appels IA fréquents pour éviter
    de réinterroger l'API pour les mêmes requêtes.
    """

    __tablename__ = "ai_cache"

    # Clé de cache (hash de la requête)
    cache_key = Column(String(64), nullable=False, unique=True, index=True)

    # Type de requête
    request_type = Column(String(50), nullable=False, index=True)

    # Requête et résultat
    request_data = Column(JSON, nullable=False)
    response_data = Column(JSON, nullable=False)

    # Métadonnées
    ai_provider = Column(SQLEnum(AIProvider), nullable=False)
    ai_model = Column(String(100), nullable=True)
    confidence_score = Column(Float, nullable=True)

    # Cache management
    hit_count = Column(Integer, default=0)  # Nombre de fois utilisé
    last_hit_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)  # Expiration du cache

    def __repr__(self):
        return f"<AICache(id={self.id}, cache_key={self.cache_key}, hit_count={self.hit_count})>"

    def increment_hit(self):
        """Incrémente le compteur d'utilisation"""
        self.hit_count += 1
        self.last_hit_at = datetime.utcnow()
