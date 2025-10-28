"""
Service d'application des décisions d'autofill

Gère la création transactionnelle de Person, Organisation, Interaction
avec déduplication, journalisation et idempotence
"""
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from models.person import Person
from models.organisation import Organisation
from models.interaction import Interaction, InteractionParticipant
from models.autofill_decision_log import AutofillDecisionLog


class AutofillApplyService:
    """
    Service d'application transactionnelle des décisions d'autofill

    Fonctionnalités:
    - Idempotence via input_id
    - Upsert Person/Organisation
    - Création Interaction avec déduplication
    - Liaison InteractionParticipant
    - Journalisation AutofillDecisionLog
    """

    def __init__(self, db: Session):
        self.db = db

    def apply(
        self,
        input_id: str,
        person_decision: Dict,
        organisation_decision: Dict,
        interaction_data: Dict,
        dedupe: bool,
        current_user_id: int,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Applique les décisions d'autofill de manière transactionnelle

        Args:
            input_id: ID unique pour idempotence
            person_decision: {"id": 123, "apply": True, "data": {...}}
            organisation_decision: {"id": 456, "apply": True, "data": {...}}
            interaction_data: Données de l'interaction à créer
            dedupe: Activer déduplication d'interactions
            current_user_id: ID utilisateur effectuant l'action
            context: Métadonnées additionnelles

        Returns:
            Dict avec status, person_id, organisation_id, interaction_id, deduped, decision_log_id
        """
        # 1. Vérifier idempotence
        existing_log = self.db.query(AutofillDecisionLog).filter(
            AutofillDecisionLog.input_id == input_id
        ).first()

        if existing_log:
            return {
                "status": "already_applied",
                "person_id": existing_log.person_id,
                "organisation_id": existing_log.organisation_id,
                "interaction_id": existing_log.interaction_id,
                "deduped": bool(existing_log.was_deduped),
                "decision_log_id": existing_log.id,
                "message": "Cette décision a déjà été appliquée"
            }

        # 2. Upsert Person
        person_id = None
        if person_decision.get("apply"):
            person_id = person_decision.get("id")
            if not person_id and person_decision.get("data"):
                # Créer nouvelle Person
                person = Person(**person_decision["data"])
                self.db.add(person)
                self.db.flush()
                person_id = person.id

        # 3. Upsert Organisation
        organisation_id = None
        if organisation_decision.get("apply"):
            organisation_id = organisation_decision.get("id")
            if not organisation_id and organisation_decision.get("data"):
                # Créer nouvelle Organisation
                org = Organisation(**organisation_decision["data"])
                self.db.add(org)
                self.db.flush()
                organisation_id = org.id

        # 4. Créer/Dédupliquer Interaction
        interaction_id = None
        was_deduped = False

        if interaction_data:
            if dedupe and organisation_id:
                # Tenter de trouver une interaction existante similaire
                existing_interaction = self._find_duplicate_interaction(
                    organisation_id,
                    interaction_data["title"],
                    interaction_data["occurred_at"]
                )

                if existing_interaction:
                    interaction_id = existing_interaction.id
                    was_deduped = True

                    # Enrichir l'interaction existante si summary manquant
                    if not existing_interaction.summary and interaction_data.get("summary"):
                        existing_interaction.summary = interaction_data["summary"]

            # Si pas de doublon trouvé, créer nouvelle interaction
            if not interaction_id:
                interaction = Interaction(
                    type=interaction_data["type"],
                    title=interaction_data["title"],
                    occurred_at=datetime.fromisoformat(interaction_data["occurred_at"].replace("Z", "+00:00")),
                    channel=interaction_data.get("channel", "other"),
                    summary=interaction_data.get("summary"),
                    organisation_id=organisation_id,
                )
                self.db.add(interaction)
                self.db.flush()
                interaction_id = interaction.id

            # 5. Ajouter participants
            if interaction_id and interaction_data.get("participants"):
                self._ensure_participants(interaction_id, interaction_data["participants"])

        # 6. Journaliser la décision
        decision_log = AutofillDecisionLog(
            input_id=input_id,
            input_hash=self._hash_input(input_id, person_decision, organisation_decision),
            decision="applied",
            person_id=person_id,
            organisation_id=organisation_id,
            interaction_id=interaction_id,
            scores_json={
                "person": person_decision,
                "organisation": organisation_decision,
            },
            reason=f"Autofill appliqué: Person={person_id}, Org={organisation_id}, Interaction={interaction_id}",
            applied_by_user_id=current_user_id,
            was_deduped=1 if was_deduped else 0,
        )
        self.db.add(decision_log)
        self.db.commit()

        return {
            "status": "applied",
            "person_id": person_id,
            "organisation_id": organisation_id,
            "interaction_id": interaction_id,
            "deduped": was_deduped,
            "decision_log_id": decision_log.id,
            "message": "Autofill appliqué avec succès"
        }

    def _find_duplicate_interaction(
        self,
        organisation_id: int,
        title: str,
        occurred_at: str
    ) -> Optional[Interaction]:
        """
        Trouve une interaction similaire pour déduplication

        Critères:
        - Même organisation_id
        - Titre similaire (fuzzy ≥ 0.8)
        - Occurred_at ± 2 heures
        """
        try:
            target_dt = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
        except:
            return None

        # Fenêtre de ±2 heures
        time_window_start = target_dt - timedelta(hours=2)
        time_window_end = target_dt + timedelta(hours=2)

        # Rechercher interactions candidates
        candidates = self.db.query(Interaction).filter(
            and_(
                Interaction.organisation_id == organisation_id,
                Interaction.occurred_at >= time_window_start,
                Interaction.occurred_at <= time_window_end,
            )
        ).all()

        # Fuzzy matching sur le titre
        for candidate in candidates:
            if self._fuzzy_match_title(title, candidate.title):
                return candidate

        return None

    def _fuzzy_match_title(self, title1: str, title2: str, threshold: float = 0.8) -> bool:
        """Vérifie si deux titres sont similaires"""
        from difflib import SequenceMatcher

        if not title1 or not title2:
            return False

        # Normaliser
        t1 = title1.lower().strip()
        t2 = title2.lower().strip()

        ratio = SequenceMatcher(None, t1, t2).ratio()
        return ratio >= threshold

    def _ensure_participants(self, interaction_id: int, participants: list):
        """Ajoute les participants à l'interaction (idempotent)"""
        for participant_data in participants:
            person_id = participant_data.get("person_id")
            role = participant_data.get("role", "participant")

            # Vérifier si déjà existant
            existing = self.db.query(InteractionParticipant).filter(
                and_(
                    InteractionParticipant.interaction_id == interaction_id,
                    InteractionParticipant.person_id == person_id,
                )
            ).first()

            if not existing:
                participant = InteractionParticipant(
                    interaction_id=interaction_id,
                    person_id=person_id,
                    role=role,
                )
                self.db.add(participant)

    def _hash_input(self, input_id: str, person: Dict, organisation: Dict) -> str:
        """Génère un hash SHA256 du payload pour idempotence"""
        import json

        payload = {
            "input_id": input_id,
            "person": person,
            "organisation": organisation,
        }
        payload_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_str.encode()).hexdigest()
