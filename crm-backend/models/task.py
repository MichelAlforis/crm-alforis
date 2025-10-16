from sqlalchemy import Column, String, Integer, Text, Enum, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship
from models.base import BaseModel
import enum
from datetime import date


class TaskPriority(str, enum.Enum):
    """Niveaux de priorité des tâches"""
    CRITIQUE = "critique"
    HAUTE = "haute"
    MOYENNE = "moyenne"
    BASSE = "basse"
    NON_PRIORITAIRE = "non_prioritaire"


class TaskStatus(str, enum.Enum):
    """Statuts des tâches (Kanban)"""
    TODO = "todo"
    DOING = "doing"
    DONE = "done"
    SNOOZED = "snoozed"


class TaskCategory(str, enum.Enum):
    """Catégories de tâches (extensible)"""
    RELANCE = "relance"
    RDV = "rdv"
    EMAIL = "email"
    DUE_DILIGENCE = "due_diligence"
    ADMIN = "admin"
    PITCH = "pitch"
    NEGOCIATION = "negociation"
    AUTRE = "autre"


class Task(BaseModel):
    """
    Modèle pour les tâches du CRM-Assistant

    Fonctionnalités:
        - Liens multiples optionnels (investor, fournisseur, person)
        - Système de priorités (CRITIQUE → NON_PRIORITAIRE)
        - Statuts Kanban (TODO, DOING, DONE, SNOOZED)
        - Catégories extensibles
        - Dates d'échéance et snooze
        - Auto-création depuis hooks pipeline
    """
    __tablename__ = "tasks"

    # Informations de base
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)

    # Dates
    due_date = Column(Date, nullable=False, index=True)  # Date d'échéance
    snoozed_until = Column(Date, nullable=True)  # Date de réveil après snooze
    completed_at = Column(Date, nullable=True)  # Date de complétion

    # Classification
    priority = Column(Enum(TaskPriority), default=TaskPriority.MOYENNE, index=True, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO, index=True, nullable=False)
    category = Column(Enum(TaskCategory), default=TaskCategory.AUTRE)

    # Relations optionnelles (liens multiples possibles)
    investor_id = Column(Integer, ForeignKey("investors.id", ondelete="CASCADE"), nullable=True, index=True)
    fournisseur_id = Column(Integer, ForeignKey("fournisseurs.id", ondelete="CASCADE"), nullable=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=True, index=True)

    # Métadonnées
    is_auto_created = Column(Boolean, default=False)  # Créée automatiquement par le système
    auto_creation_rule = Column(String(100), nullable=True)  # Ex: "prospect_chaud_j3"

    # Relations SQLAlchemy
    investor = relationship("Investor", foreign_keys=[investor_id])
    fournisseur = relationship("Fournisseur", foreign_keys=[fournisseur_id])
    person = relationship("Person", foreign_keys=[person_id])

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', priority={self.priority}, status={self.status})>"

    @property
    def is_overdue(self) -> bool:
        """Vérifie si la tâche est en retard"""
        if self.status in [TaskStatus.DONE, TaskStatus.SNOOZED]:
            return False
        return self.due_date < date.today()

    @property
    def is_today(self) -> bool:
        """Vérifie si la tâche est pour aujourd'hui"""
        if self.status in [TaskStatus.DONE, TaskStatus.SNOOZED]:
            return False
        return self.due_date == date.today()

    @property
    def is_next_7_days(self) -> bool:
        """Vérifie si la tâche est dans les 7 prochains jours"""
        if self.status in [TaskStatus.DONE, TaskStatus.SNOOZED]:
            return False
        from datetime import timedelta
        return date.today() < self.due_date <= (date.today() + timedelta(days=7))

    @property
    def days_until_due(self) -> int:
        """Nombre de jours avant échéance (négatif si en retard)"""
        return (self.due_date - date.today()).days

    def get_linked_entity_name(self) -> str:
        """Retourne le nom de l'entité liée (pour affichage)"""
        if self.investor:
            return f"📊 {self.investor.name}"
        if self.fournisseur:
            return f"🏢 {self.fournisseur.name}"
        if self.person:
            return f"👤 {self.person.name}"
        return "Sans lien"
