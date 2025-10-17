from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from datetime import date, timedelta, datetime

from models.task import Task, TaskStatus, TaskPriority, TaskCategory
from models.investor import InteractionType
from schemas.task import TaskCreate, TaskUpdate, TaskFilterParams
from schemas.interaction import InteractionCreate
from services.base import BaseService
from core.exceptions import ResourceNotFound, ValidationError
import logging

logger = logging.getLogger(__name__)


class TaskService(BaseService[Task, TaskCreate, TaskUpdate]):
    def __init__(self, db: Session):
        super().__init__(Task, db)

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict] = None,
        order_by: str = "due_date",
        order: str = "asc",
    ) -> Tuple[List[Task], int]:
        """Récupérer toutes les tâches avec filtres et pagination"""
        query = self.db.query(self.model).options(
            joinedload(Task.investor),
            joinedload(Task.fournisseur),
            joinedload(Task.organisation),
            joinedload(Task.person),
        )

        # Appliquer les filtres
        if filters:
            if "status" in filters and filters["status"]:
                query = query.filter(self.model.status == filters["status"])

            if "priority" in filters and filters["priority"]:
                query = query.filter(self.model.priority == filters["priority"])

            if "category" in filters and filters["category"]:
                query = query.filter(self.model.category == filters["category"])

            if "investor_id" in filters and filters["investor_id"]:
                query = query.filter(self.model.investor_id == filters["investor_id"])

            if "fournisseur_id" in filters and filters["fournisseur_id"]:
                query = query.filter(self.model.fournisseur_id == filters["fournisseur_id"])

            if "person_id" in filters and filters["person_id"]:
                query = query.filter(self.model.person_id == filters["person_id"])

            if "is_auto_created" in filters and filters["is_auto_created"] is not None:
                query = query.filter(self.model.is_auto_created == filters["is_auto_created"])

            # Vues spéciales
            if "view" in filters:
                view = filters["view"]
                today = date.today()

                if view == "overdue":
                    query = query.filter(
                        and_(
                            self.model.due_date < today,
                            self.model.status.in_([TaskStatus.TODO, TaskStatus.DOING]),
                        )
                    )
                elif view == "today":
                    query = query.filter(
                        and_(
                            self.model.due_date == today,
                            self.model.status.in_([TaskStatus.TODO, TaskStatus.DOING]),
                        )
                    )
                elif view == "next7":
                    next_7_days = today + timedelta(days=7)
                    query = query.filter(
                        and_(
                            self.model.due_date > today,
                            self.model.due_date <= next_7_days,
                            self.model.status.in_([TaskStatus.TODO, TaskStatus.DOING]),
                        )
                    )

        # Compter le total
        total = query.count()

        # Tri
        if hasattr(self.model, order_by):
            order_column = getattr(self.model, order_by)
            if order.lower() == "desc":
                order_column = order_column.desc()
            query = query.order_by(order_column)

        # Tri secondaire par priorité (critique en premier)
        priority_order = {
            TaskPriority.CRITIQUE: 0,
            TaskPriority.HAUTE: 1,
            TaskPriority.MOYENNE: 2,
            TaskPriority.BASSE: 3,
            TaskPriority.NON_PRIORITAIRE: 4,
        }
        # Note: Pour un tri complexe, on peut utiliser case() de SQLAlchemy
        # Ici on trie juste par due_date puis on laisse le client trier par priorité si besoin

        items = query.offset(skip).limit(limit).all()

        return items, total

    async def get_task_with_relations(self, task_id: int) -> Task:
        """Récupérer une tâche avec toutes ses relations"""
        task = (
            self.db.query(self.model)
            .options(
                joinedload(Task.investor),
                joinedload(Task.fournisseur),
                joinedload(Task.organisation),
                joinedload(Task.person),
            )
            .filter(self.model.id == task_id)
            .first()
        )

        if not task:
            raise ResourceNotFound("Task", task_id)

        return task

    async def snooze_task(self, task_id: int, days: int) -> Task:
        """Snoozer une tâche de X jours"""
        task = await self.get_by_id(task_id)

        if task.status == TaskStatus.DONE:
            raise ValidationError("Cannot snooze a completed task")

        # Calculer la nouvelle date
        task.due_date = date.today() + timedelta(days=days)
        task.snoozed_until = task.due_date
        task.status = TaskStatus.SNOOZED

        self.db.commit()
        self.db.refresh(task)

        logger.info(f"Task {task_id} snoozed for {days} days until {task.due_date}")
        return task

    async def mark_done(self, task_id: int) -> Task:
        """Marquer une tâche comme terminée et créer une interaction associée"""
        task = await self.get_task_with_relations(task_id)

        task.status = TaskStatus.DONE
        task.completed_at = date.today()

        # Générer automatiquement une interaction
        await self._create_interaction_from_task(task)

        self.db.commit()
        self.db.refresh(task)

        logger.info(f"Task {task_id} marked as done and interaction created")
        return task

    async def _create_interaction_from_task(self, task: Task) -> None:
        """Créer une interaction automatiquement depuis une tâche terminée"""
        from services.interaction import InteractionService

        # Déterminer le type d'interaction selon la catégorie de la tâche
        interaction_type_map = {
            TaskCategory.RELANCE: InteractionType.CALL,
            TaskCategory.RDV: InteractionType.MEETING,
            TaskCategory.EMAIL: InteractionType.EMAIL,
            TaskCategory.DUE_DILIGENCE: InteractionType.MEETING,
            TaskCategory.PITCH: InteractionType.MEETING,
            TaskCategory.NEGOCIATION: InteractionType.MEETING,
            TaskCategory.ADMIN: InteractionType.NOTE,
            TaskCategory.AUTRE: InteractionType.NOTE,
        }

        interaction_type = interaction_type_map.get(task.category, InteractionType.NOTE)

        # Construire le contenu de l'interaction
        notes = f"Tâche complétée: {task.title}"
        if task.description:
            notes += f"\n\nDétails: {task.description}"

        # Créer l'interaction
        interaction_data = InteractionCreate(
            type=interaction_type,
            date=datetime.now(),
            notes=notes,
            investor_id=task.investor_id,
            fournisseur_id=task.fournisseur_id,
            organisation_id=task.organisation_id,
            person_id=task.person_id,
        )

        interaction_service = InteractionService(self.db)
        interaction = await interaction_service.create(interaction_data)

        logger.info(f"Created interaction {interaction.id} from completed task {task.id}")
        return interaction

    async def quick_action(self, task_id: int, action: str) -> Task:
        """Exécuter une action rapide sur une tâche"""
        actions_map = {
            "snooze_1d": lambda: self.snooze_task(task_id, 1),
            "snooze_1w": lambda: self.snooze_task(task_id, 7),
            "mark_done": lambda: self.mark_done(task_id),
            "next_day": lambda: self.snooze_task(task_id, 1),
        }

        if action not in actions_map:
            raise ValidationError(f"Unknown action: {action}")

        return await actions_map[action]()

    async def get_statistics(self) -> dict:
        """Obtenir les statistiques des tâches"""
        today = date.today()
        next_7_days = today + timedelta(days=7)

        total = self.db.query(func.count(self.model.id)).scalar()

        overdue = (
            self.db.query(func.count(self.model.id))
            .filter(
                and_(
                    self.model.due_date < today,
                    self.model.status.in_([TaskStatus.TODO, TaskStatus.DOING]),
                )
            )
            .scalar()
        )

        today_count = (
            self.db.query(func.count(self.model.id))
            .filter(
                and_(
                    self.model.due_date == today,
                    self.model.status.in_([TaskStatus.TODO, TaskStatus.DOING]),
                )
            )
            .scalar()
        )

        next_7_count = (
            self.db.query(func.count(self.model.id))
            .filter(
                and_(
                    self.model.due_date > today,
                    self.model.due_date <= next_7_days,
                    self.model.status.in_([TaskStatus.TODO, TaskStatus.DOING]),
                )
            )
            .scalar()
        )

        # Stats par statut
        by_status = {}
        for status in TaskStatus:
            count = (
                self.db.query(func.count(self.model.id))
                .filter(self.model.status == status)
                .scalar()
            )
            by_status[status.value] = count

        # Stats par priorité
        by_priority = {}
        for priority in TaskPriority:
            count = (
                self.db.query(func.count(self.model.id))
                .filter(self.model.priority == priority)
                .scalar()
            )
            by_priority[priority.value] = count

        return {
            "total": total,
            "overdue": overdue,
            "today": today_count,
            "next_7_days": next_7_count,
            "by_status": by_status,
            "by_priority": by_priority,
        }

    async def create_auto_task(
        self,
        title: str,
        description: str,
        due_date: date,
        priority: TaskPriority,
        category: TaskCategory,
        rule_name: str,
        investor_id: Optional[int] = None,
        fournisseur_id: Optional[int] = None,
        person_id: Optional[int] = None,
    ) -> Task:
        """Créer une tâche automatiquement (depuis un hook)"""
        task_data = TaskCreate(
            title=title,
            description=description,
            due_date=due_date,
            priority=priority,
            category=category,
            investor_id=investor_id,
            fournisseur_id=fournisseur_id,
            person_id=person_id,
            is_auto_created=True,
            auto_creation_rule=rule_name,
        )

        task = await self.create(task_data)
        logger.info(f"Auto-created task {task.id} with rule '{rule_name}'")
        return task
