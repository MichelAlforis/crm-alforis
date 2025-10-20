from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from datetime import date, timedelta, datetime, UTC

from models.task import Task, TaskStatus, TaskPriority  # TaskCategory n\'existe pas,
from schemas.task import TaskCreate, TaskUpdate, TaskFilterParams
from services.base import BaseService
from services.organisation_activity import OrganisationActivityService
from models.organisation_activity import OrganisationActivityType
from core.exceptions import ResourceNotFound, ValidationError
import logging

logger = logging.getLogger(__name__)


class TaskService(BaseService[Task, TaskCreate, TaskUpdate]):
    def __init__(self, db: Session):
        super().__init__(Task, db)

    @staticmethod
    def _extract_actor(actor: Optional[dict]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Normalise les informations acteur pour la timeline."""
        if not actor:
            return None, None, None

        actor_id = actor.get("user_id")
        if actor_id is not None:
            actor_id = str(actor_id)

        actor_name = (
            actor.get("full_name")
            or actor.get("name")
            or actor.get("email")
            or (str(actor.get("user_id")) if actor.get("user_id") is not None else None)
        )
        actor_avatar = actor.get("avatar_url")

        return actor_id, actor_name, actor_avatar

    @staticmethod
    def _task_metadata(task: Task) -> Dict[str, Any]:
        """Construit les métadonnées standard à stocker pour une tâche."""
        return {
            "task_id": task.id,
            "title": task.title,
            "status": task.status.value if task.status else None,
            "priority": task.priority.value if task.priority else None,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "is_auto_created": task.is_auto_created,
            "auto_rule": task.auto_creation_rule,
            "organisation_id": task.organisation_id,
            "organisation_name": getattr(getattr(task, "organisation", None), "name", None),
        }

    @staticmethod
    def _task_preview(task: Task, extra_parts: Optional[List[str]] = None) -> Optional[str]:
        """Génère un résumé texte court des informations de la tâche."""
        parts: List[str] = []
        if task.due_date:
            parts.append(f"Échéance {task.due_date.strftime('%d/%m/%Y')}")
        if task.priority:
            parts.append(f"Priorité {task.priority.value}")
        if task.status:
            parts.append(f"Statut {task.status.value}")
        if extra_parts:
            parts.extend([p for p in extra_parts if p])

        parts = [p for p in parts if p]
        return " • ".join(parts) if parts else None

    async def _record_task_activity(
        self,
        task: Task,
        activity_type: OrganisationActivityType,
        title: str,
        *,
        preview: Optional[str] = None,
        actor: Optional[dict] = None,
        occurred_at: Optional[datetime] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Persiste une activité dans la timeline si la tâche est liée à une organisation."""
        if not task.organisation_id:
            return

        actor_id, actor_name, actor_avatar = self._extract_actor(actor)
        metadata = self._task_metadata(task)
        if extra_metadata:
            metadata.update(extra_metadata)

        activity_service = OrganisationActivityService(self.db)
        await activity_service.record(
            organisation_id=task.organisation_id,
            activity_type=activity_type,
            title=title,
            occurred_at=occurred_at or datetime.now(UTC),
            preview=preview,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar_url=actor_avatar,
            resource_type="task",
            resource_id=task.id,
            metadata=metadata,
        )

    def _apply_basic_filters(self, query, filters: dict):
        """Applique les filtres basiques (status, priority, etc.)"""
        filter_map = {
            "status": self.model.status,
            "priority": self.model.priority,
            "category": self.model.category,
            "organisation_id": self.model.organisation_id,
            "person_id": self.model.person_id,
        }

        for key, column in filter_map.items():
            if key in filters and filters[key]:
                query = query.filter(column == filters[key])

        if "is_auto_created" in filters and filters["is_auto_created"] is not None:
            query = query.filter(self.model.is_auto_created == filters["is_auto_created"])

        return query

    def _apply_view_filter(self, query, view: str):
        """Applique les filtres de vue spéciale (overdue, today, next7)"""
        today = date.today()
        active_statuses = [TaskStatus.TODO, TaskStatus.DOING]

        view_conditions = {
            "overdue": and_(
                self.model.due_date < today,
                self.model.status.in_(active_statuses)
            ),
            "today": and_(
                self.model.due_date == today,
                self.model.status.in_(active_statuses)
            ),
            "next7": and_(
                self.model.due_date > today,
                self.model.due_date <= today + timedelta(days=7),
                self.model.status.in_(active_statuses)
            ),
        }

        if view in view_conditions:
            query = query.filter(view_conditions[view])

        return query

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
            joinedload(Task.organisation),
            joinedload(Task.person),
        )

        # Appliquer les filtres
        if filters:
            query = self._apply_basic_filters(query, filters)

            if "view" in filters:
                query = self._apply_view_filter(query, filters["view"])

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

    async def create(self, schema: TaskCreate, *, actor: Optional[dict] = None) -> Task:
        """Créer une tâche et enregistrer l'activité associée."""
        task = await super().create(schema)

        await self._record_task_activity(
            task,
            OrganisationActivityType.TASK_CREATED,
            title=f"Tâche créée • {task.title}",
            preview=self._task_preview(task),
            actor=actor,
            extra_metadata={
                "created_via": "automation" if schema.is_auto_created else "manual",
            },
        )
        return task

    async def get_task_with_relations(self, task_id: int) -> Task:
        """Récupérer une tâche avec toutes ses relations"""
        task = (
            self.db.query(self.model)
            .options(
                joinedload(Task.organisation),
                joinedload(Task.person),
            )
            .filter(self.model.id == task_id)
            .first()
        )

        if not task:
            raise ResourceNotFound("Task", task_id)

        return task

    async def update(
        self,
        task_id: int,
        schema: TaskUpdate,
        *,
        actor: Optional[dict] = None,
    ) -> Task:
        """Mettre à jour une tâche et tracer l'activité associée."""
        task = await self.get_by_id(task_id)

        update_data = schema.model_dump(exclude_unset=True)
        if not update_data:
            return task

        previous_status = task.status
        previous_due = task.due_date
        previous_priority = task.priority
        previous_title = task.title

        for key, value in update_data.items():
            setattr(task, key, value)

        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)

        if task.organisation_id:
            changes: List[str] = []
            if "title" in update_data and task.title != previous_title:
                changes.append("Titre mis à jour")
            if "due_date" in update_data and task.due_date != previous_due:
                changes.append(
                    f"Échéance {task.due_date.strftime('%d/%m/%Y')}"
                    if task.due_date
                    else "Échéance supprimée"
                )
            if "priority" in update_data and task.priority != previous_priority:
                changes.append(f"Priorité {task.priority.value}")
            if "status" in update_data and task.status != previous_status:
                changes.append(f"Statut {task.status.value}")

            activity_type = (
                OrganisationActivityType.TASK_COMPLETED
                if task.status == TaskStatus.DONE
                else OrganisationActivityType.TASK_UPDATED
            )

            await self._record_task_activity(
                task,
                activity_type,
                title=f"Tâche mise à jour • {task.title}",
                preview=" • ".join(changes) if changes else self._task_preview(task),
                actor=actor,
                extra_metadata={
                    "changed_fields": list(update_data.keys()),
                },
            )

        return task

    async def snooze_task(
        self,
        task_id: int,
        days: int,
        *,
        actor: Optional[dict] = None,
    ) -> Task:
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

        await self._record_task_activity(
            task,
            OrganisationActivityType.TASK_UPDATED,
            title=f"Tâche reportée • {task.title}",
            preview=f"Nouvelle échéance {task.due_date.strftime('%d/%m/%Y')}" if task.due_date else None,
            actor=actor,
            extra_metadata={"snoozed_days": days},
        )

        logger.info(f"Task {task_id} snoozed for {days} days until {task.due_date}")
        return task

    async def mark_done(
        self,
        task_id: int,
        *,
        actor: Optional[dict] = None,
    ) -> Task:
        """Marquer une tâche comme terminée et créer une interaction associée"""
        task = await self.get_task_with_relations(task_id)

        task.status = TaskStatus.DONE
        task.completed_at = date.today()

        # Générer automatiquement une interaction
        await self._create_interaction_from_task(task)

        self.db.commit()
        self.db.refresh(task)

        await self._record_task_activity(
            task,
            OrganisationActivityType.TASK_COMPLETED,
            title=f"Tâche terminée • {task.title}",
            preview=self._task_preview(task, ["Complétée"]),
            actor=actor,
            extra_metadata={"completed_at": task.completed_at.isoformat() if task.completed_at else None},
        )

        logger.info(f"Task {task_id} marked as done and interaction created")
        return task

    async def _create_interaction_from_task(self, task: Task) -> None:
        """Créer une interaction automatiquement depuis une tâche terminée"""
        # from services.interaction import InteractionService

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
            organisation_id=task.organisation_id,
            person_id=task.person_id,
        )

        interaction_service = InteractionService(self.db)
        interaction = await interaction_service.create(interaction_data)

        logger.info(f"Created interaction {interaction.id} from completed task {task.id}")
        return interaction

    async def quick_action(
        self,
        task_id: int,
        action: str,
        *,
        actor: Optional[dict] = None,
    ) -> Task:
        """Exécuter une action rapide sur une tâche"""
        actions_map = {
            "snooze_1d": lambda: self.snooze_task(task_id, 1, actor=actor),
            "snooze_1w": lambda: self.snooze_task(task_id, 7, actor=actor),
            "mark_done": lambda: self.mark_done(task_id, actor=actor),
            "next_day": lambda: self.snooze_task(task_id, 1, actor=actor),
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
        category: str,  # TaskCategory
        rule_name: str,
        organisation_id: Optional[int] = None,
        person_id: Optional[int] = None,
    ) -> Task:
        """Créer une tâche automatiquement (depuis un hook)"""
        task_data = TaskCreate(
            title=title,
            description=description,
            due_date=due_date,
            priority=priority,
            category=category,
            organisation_id=organisation_id,
            person_id=person_id,
            is_auto_created=True,
            auto_creation_rule=rule_name,
        )

        task = await self.create(
            task_data,
            actor={
                "user_id": "system",
                "full_name": "Automation Engine",
            },
        )
        logger.info(f"Auto-created task {task.id} with rule '{rule_name}'")
        return task
