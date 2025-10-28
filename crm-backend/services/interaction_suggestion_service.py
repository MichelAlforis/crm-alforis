"""
Service de suggestion d'interactions depuis l'autofill

Déduit automatiquement le type, titre, date, channel et participants
d'une interaction à partir du contexte d'autofill (email, texte, métadonnées)
"""
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session


class InteractionSuggestionService:
    """
    Service de suggestion intelligente d'interactions

    Analyse le contexte d'autofill (email, texte, métadonnées) et suggère:
    - Type d'interaction (email, call, meeting, note, share_material)
    - Titre pertinent
    - Date/heure (occurred_at)
    - Channel (email, phone, video, in_person)
    - Participants avec leurs rôles
    """

    # Patterns pour détecter le type d'interaction
    EMAIL_PATTERNS = [r'\bre:', r'\bfwd:', r'\bmessage\b', r'\bemail\b', r'\bmail\b', r'@']
    CALL_PATTERNS = [r'\bcall\b', r'\bappel\b', r'\bt[eé]l[eé]phone\b', r'\bphone\b']
    MEETING_PATTERNS = [
        r'\brdv\b', r'\bmeeting\b', r'\br[ée]union\b', r'\brencontre\b',
        r'\bzoom\b', r'\bteams\b', r'\bmeet\b', r'\bvisio\b'
    ]
    MATERIAL_PATTERNS = [
        r'\bdeck\b', r'\bbrochure\b', r'\bdocument\b', r'\bpi[èe]ce jointe\b',
        r'\bpresentation\b', r'\bslides?\b', r'\bpdf\b'
    ]

    def __init__(self, db: Session):
        self.db = db

    def suggest_interaction(
        self,
        draft: Dict[str, Any],
        person_id: Optional[int],
        organisation_id: Optional[int],
        current_user_id: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Suggère une interaction à partir du draft et des entités résolues

        Args:
            draft: Données brutes d'autofill
            person_id: ID de la Person résolue
            organisation_id: ID de l'Organisation résolue
            current_user_id: ID de l'utilisateur courant (owner)
            context: Métadonnées additionnelles (email_subject, email_body, etc.)

        Returns:
            Dict avec type, title, occurred_at, channel, summary, participants, confidence
        """
        context = context or {}

        # Extraire le texte à analyser
        text_to_analyze = self._extract_text(draft, context)

        # Détecter le type et channel
        interaction_type = self._detect_type(text_to_analyze)
        channel = self._detect_channel(interaction_type, text_to_analyze)

        # Générer le titre
        title = self._generate_title(interaction_type, draft, context)

        # Extraire la date (ou utiliser now())
        occurred_at = self._extract_datetime(draft, context)

        # Générer un résumé
        summary = self._generate_summary(draft, context, text_to_analyze)

        # Construire les participants
        participants = self._build_participants(person_id, current_user_id)

        # Calculer la confiance
        confidence = self._calculate_confidence(interaction_type, text_to_analyze, context)

        # Raisons de la suggestion
        reasons = self._build_reasons(interaction_type, channel, context)

        return {
            "type": interaction_type,
            "title": title,
            "occurred_at": occurred_at,
            "channel": channel,
            "summary": summary,
            "participants": participants,
            "organisation_id": organisation_id,
            "confidence": confidence,
            "reasons": reasons,
        }

    def _extract_text(self, draft: Dict, context: Dict) -> str:
        """Extrait le texte complet à analyser depuis draft + context"""
        parts = []

        # Email subject/body
        if context.get("email_subject"):
            parts.append(context["email_subject"])
        if context.get("email_body"):
            parts.append(context["email_body"][:500])  # Limiter à 500 chars

        # Draft fields
        if draft.get("notes"):
            parts.append(draft["notes"])
        if draft.get("title"):
            parts.append(draft["title"])

        return " ".join(parts).lower()

    def _detect_type(self, text: str) -> str:
        """Détecte le type d'interaction depuis le texte"""
        # Email
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in self.EMAIL_PATTERNS):
            return "email"

        # Meeting
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in self.MEETING_PATTERNS):
            return "meeting"

        # Call
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in self.CALL_PATTERNS):
            return "call"

        # Material sharing
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in self.MATERIAL_PATTERNS):
            return "share_material"

        # Default: note
        return "note"

    def _detect_channel(self, interaction_type: str, text: str) -> str:
        """Déduit le channel depuis le type et le texte"""
        if interaction_type == "email":
            return "email"

        if interaction_type == "call":
            return "phone"

        # Visio keywords
        if any(kw in text for kw in ["zoom", "teams", "meet", "visio", "video"]):
            return "video"

        # Meeting physique
        if any(kw in text for kw in ["bureau", "office", "physique", "présentiel"]):
            return "in_person"

        # Default selon type
        return {
            "meeting": "video",
            "share_material": "email",
            "note": "other",
        }.get(interaction_type, "other")

    def _generate_title(self, interaction_type: str, draft: Dict, context: Dict) -> str:
        """Génère un titre pertinent pour l'interaction"""
        # Si email avec subject
        if interaction_type == "email" and context.get("email_subject"):
            subject = context["email_subject"]
            # Nettoyer les Re:/Fwd:
            subject = re.sub(r'^(re:|fwd:)\s*', '', subject, flags=re.IGNORECASE).strip()
            return f"Échange email: {subject}"

        # Si meeting
        if interaction_type == "meeting":
            if context.get("email_subject"):
                return f"Réunion: {context['email_subject']}"
            return "Réunion avec le contact"

        # Si call
        if interaction_type == "call":
            person_name = f"{draft.get('first_name', '')} {draft.get('last_name', '')}".strip()
            if person_name:
                return f"Appel avec {person_name}"
            return "Appel téléphonique"

        # Material
        if interaction_type == "share_material":
            return "Partage de documents"

        # Note générique
        if draft.get("first_name") and draft.get("last_name"):
            return f"Note: {draft['first_name']} {draft['last_name']}"

        return "Interaction CRM"

    def _extract_datetime(self, draft: Dict, context: Dict) -> str:
        """Extrait la date/heure de l'interaction (ou now())"""
        # Tenter d'extraire depuis context
        if context.get("email_date"):
            try:
                # Supposer ISO format
                dt = datetime.fromisoformat(context["email_date"].replace("Z", "+00:00"))
                return dt.isoformat()
            except:
                pass

        # Utiliser now() par défaut
        return datetime.now(timezone.utc).isoformat()

    def _generate_summary(self, draft: Dict, context: Dict, text: str) -> str:
        """Génère un résumé de l'interaction"""
        # Prendre les 200 premiers caractères de l'email body
        if context.get("email_body"):
            body = context["email_body"][:200].strip()
            if len(context["email_body"]) > 200:
                body += "..."
            return body

        # Sinon utiliser notes du draft
        if draft.get("notes"):
            return draft["notes"][:200]

        # Default
        return "Interaction automatiquement créée via autofill"

    def _build_participants(self, person_id: Optional[int], owner_id: int) -> List[Dict]:
        """Construit la liste des participants avec leurs rôles"""
        participants = []

        # Owner (utilisateur courant)
        participants.append({
            "person_id": owner_id,
            "role": "owner"
        })

        # External person (si résolu)
        if person_id:
            participants.append({
                "person_id": person_id,
                "role": "external"
            })

        return participants

    def _calculate_confidence(self, interaction_type: str, text: str, context: Dict) -> float:
        """Calcule un score de confiance pour la suggestion"""
        score = 0.5  # Base

        # Bonus si email avec subject + body
        if context.get("email_subject") and context.get("email_body"):
            score += 0.2

        # Bonus si type détecté avec forte confiance
        if interaction_type == "email" and "@" in text:
            score += 0.15

        # Bonus si date fournie
        if context.get("email_date"):
            score += 0.1

        # Cap à 1.0
        return min(score, 1.0)

    def _build_reasons(self, interaction_type: str, channel: str, context: Dict) -> List[str]:
        """Construit la liste des raisons de la suggestion"""
        reasons = []

        reasons.append(f"Type détecté: {interaction_type}")

        if context.get("email_subject"):
            reasons.append("Sujet d'email fourni")

        if context.get("email_body"):
            reasons.append("Corps d'email analysé")

        if channel != "other":
            reasons.append(f"Channel déduit: {channel}")

        return reasons
