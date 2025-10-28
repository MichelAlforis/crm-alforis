"""
MatchingScorer - Score de matching multi-indices pour autofill V1.5

Critères de scoring (priorité décroissante):
1. Email exact → +100
2. Nom + Société → +75
3. Domaine email match société → +40
4. Téléphone match → +50
5. Titre (CIO, Head of...) match → +20
6. Ville/zone match → +10

Décision:
- score ≥ 100 → Match automatique (apply)
- 60 ≤ score < 100 → Validation humaine (preview)
- score < 60 → Création nouvelle fiche (create_new)
"""
import re
from typing import Dict, List, Optional, Tuple
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from difflib import SequenceMatcher

from models.person import Person
from models.organisation import Organisation


def normalize_string(s: str) -> str:
    """Normalise une chaîne pour comparaison fuzzy"""
    if not s:
        return ""
    return re.sub(r'[^a-z0-9]', '', s.lower().strip())


def fuzzy_match(s1: str, s2: str, threshold: float = 0.85) -> bool:
    """Comparaison fuzzy entre deux chaînes"""
    if not s1 or not s2:
        return False

    norm1 = normalize_string(s1)
    norm2 = normalize_string(s2)

    if not norm1 or not norm2:
        return False

    ratio = SequenceMatcher(None, norm1, norm2).ratio()
    return ratio >= threshold


class MatchingScorer:
    """
    Scorer pour matching multi-indices Person/Organisation
    """

    def __init__(self, db: Session):
        self.db = db

    def score_person_match(
        self,
        draft: Dict,
        candidate: Person
    ) -> Dict:
        """
        Score un candidat Person contre les données draft

        Returns:
            {
                "score": int,
                "details": {criterion: points},
                "action": "apply" | "preview" | "create_new",
                "candidate": Person (serialized)
            }
        """
        score = 0
        details = {}

        # 1. Email exact (+100)
        draft_email = draft.get("personal_email", "").lower().strip()
        candidate_email = (candidate.personal_email or "").lower().strip()

        if draft_email and candidate_email and draft_email == candidate_email:
            score += 100
            details["email_exact"] = 100

        # 2. Domaine email match société (+40)
        if not details.get("email_exact") and draft_email and candidate_email:
            draft_domain = self._extract_domain(draft_email)
            candidate_domain = self._extract_domain(candidate_email)

            if draft_domain and candidate_domain and draft_domain == candidate_domain:
                score += 40
                details["email_domain"] = 40

        # 3. Nom + Prénom match (+75 si exact, +50 si fuzzy)
        draft_first = draft.get("first_name", "")
        draft_last = draft.get("last_name", "")
        candidate_first = candidate.first_name or ""
        candidate_last = candidate.last_name or ""

        if draft_first and draft_last:
            # Match exact nom+prénom
            if (normalize_string(draft_first) == normalize_string(candidate_first) and
                normalize_string(draft_last) == normalize_string(candidate_last)):
                score += 75
                details["name_exact"] = 75
            # Fuzzy match nom+prénom
            elif (fuzzy_match(draft_first, candidate_first, 0.8) and
                  fuzzy_match(draft_last, candidate_last, 0.8)):
                score += 50
                details["name_fuzzy"] = 50

        # 4. Téléphone match (+50)
        draft_phone = self._normalize_phone(draft.get("phone"))
        candidate_phone = self._normalize_phone(candidate.phone)

        if draft_phone and candidate_phone and draft_phone == candidate_phone:
            score += 50
            details["phone"] = 50

        # 5. Titre/Poste match (+20)
        draft_title = draft.get("title") or draft.get("job_title") or ""
        candidate_title = candidate.job_title or ""

        if draft_title and candidate_title and fuzzy_match(draft_title, candidate_title, 0.7):
            score += 20
            details["job_title"] = 20

        # Décision
        if score >= 100:
            action = "apply"
        elif score >= 60:
            action = "preview"
        else:
            action = "create_new"

        return {
            "score": score,
            "details": details,
            "action": action,
            "candidate": candidate.to_dict() if hasattr(candidate, 'to_dict') else {
                "id": candidate.id,
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "personal_email": candidate.personal_email,
                "phone": candidate.phone,
                "job_title": candidate.job_title,
                "company_name": getattr(candidate, 'company_name', None),
            }
        }

    def find_person_candidates(
        self,
        draft: Dict,
        limit: int = 5
    ) -> List[Dict]:
        """
        Trouve les candidats Person potentiels et les score

        Returns:
            Liste de matches triés par score décroissant
        """
        candidates = []

        # Recherche par email
        email = draft.get("personal_email", "").strip()
        if email:
            by_email = self.db.query(Person).filter(
                func.lower(Person.personal_email) == email.lower()
            ).all()
            candidates.extend(by_email)

        # Recherche par nom+prénom
        first_name = draft.get("first_name", "").strip()
        last_name = draft.get("last_name", "").strip()

        if first_name and last_name:
            by_name = self.db.query(Person).filter(
                or_(
                    func.lower(Person.first_name) == first_name.lower(),
                    func.lower(Person.last_name) == last_name.lower()
                )
            ).limit(10).all()
            candidates.extend(by_name)

        # Recherche par téléphone
        phone = self._normalize_phone(draft.get("phone"))
        if phone:
            # Chercher avec LIKE car formats peuvent varier
            phone_pattern = f"%{phone[-8:]}%"  # 8 derniers chiffres
            by_phone = self.db.query(Person).filter(
                Person.phone.like(phone_pattern)
            ).limit(5).all()
            candidates.extend(by_phone)

        # Dédupliquer par ID
        unique_candidates = {c.id: c for c in candidates}.values()

        # Scorer chaque candidat
        scored = []
        for candidate in unique_candidates:
            match_result = self.score_person_match(draft, candidate)
            scored.append(match_result)

        # Trier par score décroissant
        scored.sort(key=lambda x: x["score"], reverse=True)

        return scored[:limit]

    def score_organisation_match(
        self,
        draft: Dict,
        candidate: Organisation
    ) -> Dict:
        """
        Score un candidat Organisation

        Returns:
            {
                "score": int,
                "details": {criterion: points},
                "action": "apply" | "preview" | "create_new",
                "candidate": Organisation (serialized)
            }
        """
        score = 0
        details = {}

        # 1. Email exact (+100)
        draft_email = draft.get("email", "").lower().strip()
        candidate_email = (candidate.email or "").lower().strip()

        if draft_email and candidate_email and draft_email == candidate_email:
            score += 100
            details["email_exact"] = 100

        # 2. Domaine email match (+40)
        if not details.get("email_exact") and draft_email:
            draft_domain = self._extract_domain(draft_email)
            candidate_domain = self._extract_domain(candidate_email) if candidate_email else None

            if draft_domain and candidate_domain and draft_domain == candidate_domain:
                score += 40
                details["email_domain"] = 40

        # 3. Nom société match (+75 si exact, +50 si fuzzy)
        draft_name = draft.get("nom") or draft.get("name") or ""
        candidate_name = candidate.name or ""

        if draft_name and candidate_name:
            if normalize_string(draft_name) == normalize_string(candidate_name):
                score += 75
                details["name_exact"] = 75
            elif fuzzy_match(draft_name, candidate_name, 0.8):
                score += 50
                details["name_fuzzy"] = 50

        # 4. Site web match (+30)
        draft_website = draft.get("website", "").lower().strip()
        candidate_website = (candidate.website or "").lower().strip()

        if draft_website and candidate_website:
            # Normaliser URLs (retirer http://, https://, www.)
            draft_clean = re.sub(r'https?://(www\.)?', '', draft_website).strip('/')
            candidate_clean = re.sub(r'https?://(www\.)?', '', candidate_website).strip('/')

            if draft_clean == candidate_clean:
                score += 30
                details["website"] = 30

        # 5. Téléphone match (+50)
        draft_phone = self._normalize_phone(draft.get("phone"))
        candidate_phone = self._normalize_phone(candidate.phone)

        if draft_phone and candidate_phone and draft_phone == candidate_phone:
            score += 50
            details["phone"] = 50

        # Décision
        if score >= 100:
            action = "apply"
        elif score >= 60:
            action = "preview"
        else:
            action = "create_new"

        return {
            "score": score,
            "details": details,
            "action": action,
            "candidate": candidate.to_dict() if hasattr(candidate, 'to_dict') else {
                "id": candidate.id,
                "nom": candidate.nom,
                "email": candidate.email,
                "phone": candidate.phone,
                "website": candidate.website,
            }
        }

    def find_organisation_candidates(
        self,
        draft: Dict,
        limit: int = 5
    ) -> List[Dict]:
        """
        Trouve les candidats Organisation potentiels et les score

        Returns:
            Liste de matches triés par score décroissant
        """
        candidates = []

        # Recherche par email
        email = draft.get("email", "").strip()
        if email:
            by_email = self.db.query(Organisation).filter(
                func.lower(Organisation.email) == email.lower()
            ).all()
            candidates.extend(by_email)

        # Recherche par nom
        nom = draft.get("nom") or draft.get("name") or ""
        nom = nom.strip()
        if nom:
            by_name = self.db.query(Organisation).filter(
                func.lower(Organisation.name).like(f"%{nom.lower()}%")
            ).limit(10).all()
            candidates.extend(by_name)

        # Recherche par domaine email (via known_companies)
        if email:
            domain = self._extract_domain(email)
            if domain:
                by_domain = self.db.query(Organisation).filter(
                    func.lower(Organisation.email).like(f"%@{domain}")
                ).limit(5).all()
                candidates.extend(by_domain)

        # Dédupliquer
        unique_candidates = {c.id: c for c in candidates}.values()

        # Scorer
        scored = []
        for candidate in unique_candidates:
            match_result = self.score_organisation_match(draft, candidate)
            scored.append(match_result)

        # Trier par score
        scored.sort(key=lambda x: x["score"], reverse=True)

        return scored[:limit]

    # ========== Helpers ==========

    def _extract_domain(self, email: str) -> Optional[str]:
        """Extrait le domaine d'un email"""
        if not email or '@' not in email:
            return None
        try:
            domain = email.split('@')[1].strip().lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except IndexError:
            return None

    def _normalize_phone(self, phone: Optional[str]) -> Optional[str]:
        """Normalise un numéro de téléphone (garde que les chiffres)"""
        if not phone:
            return None
        return re.sub(r'\D', '', phone)
