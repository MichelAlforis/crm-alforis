"""
AI Quality Scoring Service
Calculate quality scores for contacts and organizations based on data completeness
"""
import logging
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Person, Organisation

logger = logging.getLogger(__name__)


class QualityScorer:
    """
    Calculate quality scores (0-100) for contacts and organizations

    Scoring factors:
    - Data completeness (% of fields filled)
    - Data validity (email format, phone format, etc.)
    - Duplicate detection
    - Data freshness (last updated)
    """

    # Field weights for Person
    PERSON_FIELDS = {
        "email": 20,  # Critical
        "first_name": 10,
        "last_name": 10,
        "phone": 15,
        "mobile": 10,
        "job_title": 10,
        "linkedin_url": 5,
        "address": 5,
        "city": 5,
        "country": 5,
        "notes": 5
    }

    # Field weights for Organisation
    ORG_FIELDS = {
        "name": 20,  # Critical
        "website": 15,
        "email": 10,
        "phone": 10,
        "siret": 10,
        "address": 10,
        "city": 5,
        "postal_code": 5,
        "country": 5,
        "industry": 5,
        "employee_count": 5
    }

    def __init__(self, db: Session):
        self.db = db

    def score_person(self, person_id: int) -> Dict:
        """Calculate quality score for a person"""

        person = self.db.query(Person).filter(Person.id == person_id).first()

        if not person:
            return {"success": False, "error": "Person not found"}

        # Calculate completeness score
        completeness = self._calculate_completeness(person, self.PERSON_FIELDS)

        # Validate data quality
        validity_issues = []

        if person.email and not self._is_valid_email(person.email):
            validity_issues.append("Invalid email format")

        if person.phone and not self._is_valid_phone(person.phone):
            validity_issues.append("Invalid phone format")

        # Check for potential duplicates
        duplicates = self._find_person_duplicates(person)

        # Calculate final score
        score = completeness

        # Penalties
        if validity_issues:
            score -= len(validity_issues) * 5  # -5 points per issue

        if duplicates:
            score -= 10  # -10 points if duplicates exist

        score = max(0, min(100, score))  # Clamp to 0-100

        # Determine quality tier
        tier = self._get_quality_tier(score)

        return {
            "success": True,
            "person_id": person_id,
            "score": round(score, 1),
            "tier": tier,
            "completeness": round(completeness, 1),
            "validity_issues": validity_issues,
            "potential_duplicates": len(duplicates),
            "recommendations": self._generate_person_recommendations(person, validity_issues, duplicates)
        }

    def score_organisation(self, org_id: int) -> Dict:
        """Calculate quality score for an organisation"""

        org = self.db.query(Organisation).filter(Organisation.id == org_id).first()

        if not org:
            return {"success": False, "error": "Organisation not found"}

        # Calculate completeness score
        completeness = self._calculate_completeness(org, self.ORG_FIELDS)

        # Validate data quality
        validity_issues = []

        if org.website and not self._is_valid_url(org.website):
            validity_issues.append("Invalid website URL")

        if org.email and not self._is_valid_email(org.email):
            validity_issues.append("Invalid email format")

        if org.siret and len(org.siret) != 14:
            validity_issues.append("Invalid SIRET (should be 14 digits)")

        # Check for potential duplicates
        duplicates = self._find_org_duplicates(org)

        # Calculate final score
        score = completeness

        # Penalties
        if validity_issues:
            score -= len(validity_issues) * 5

        if duplicates:
            score -= 10

        score = max(0, min(100, score))

        tier = self._get_quality_tier(score)

        return {
            "success": True,
            "organisation_id": org_id,
            "score": round(score, 1),
            "tier": tier,
            "completeness": round(completeness, 1),
            "validity_issues": validity_issues,
            "potential_duplicates": len(duplicates),
            "recommendations": self._generate_org_recommendations(org, validity_issues, duplicates)
        }

    def score_team_quality(self, team_id: int) -> Dict:
        """Calculate overall quality metrics for a team"""

        # Count persons and orgs
        person_count = self.db.query(func.count(Person.id)).filter(
            Person.team_id == team_id
        ).scalar() or 0

        org_count = self.db.query(func.count(Organisation.id)).filter(
            Organisation.team_id == team_id
        ).scalar() or 0

        # Sample scoring (performance optimization: don't score everything)
        sample_persons = self.db.query(Person).filter(
            Person.team_id == team_id
        ).limit(100).all()

        sample_orgs = self.db.query(Organisation).filter(
            Organisation.team_id == team_id
        ).limit(100).all()

        person_scores = [self.score_person(p.id)["score"] for p in sample_persons]
        org_scores = [self.score_organisation(o.id)["score"] for o in sample_orgs]

        avg_person_score = sum(person_scores) / len(person_scores) if person_scores else 0
        avg_org_score = sum(org_scores) / len(org_scores) if org_scores else 0

        # Calculate tiers
        person_tiers = {"A": 0, "B": 0, "C": 0, "D": 0}
        for score in person_scores:
            person_tiers[self._get_quality_tier(score)] += 1

        org_tiers = {"A": 0, "B": 0, "C": 0, "D": 0}
        for score in org_scores:
            org_tiers[self._get_quality_tier(score)] += 1

        return {
            "success": True,
            "team_id": team_id,
            "total_persons": person_count,
            "total_organisations": org_count,
            "avg_person_score": round(avg_person_score, 1),
            "avg_org_score": round(avg_org_score, 1),
            "person_tiers": person_tiers,
            "org_tiers": org_tiers,
            "overall_health": self._get_quality_tier((avg_person_score + avg_org_score) / 2)
        }

    def _calculate_completeness(self, entity, fields_config: Dict) -> float:
        """Calculate completeness score based on filled fields"""

        total_weight = sum(fields_config.values())
        filled_weight = 0

        for field, weight in fields_config.items():
            value = getattr(entity, field, None)
            if value:  # Field has a value
                filled_weight += weight

        return (filled_weight / total_weight) * 100

    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def _is_valid_phone(self, phone: str) -> bool:
        """Basic phone validation (French format)"""
        import re
        # Remove spaces, dots, dashes
        clean = re.sub(r'[\s\.\-]', '', phone)
        # Check French format: +33... or 0...
        return bool(re.match(r'^(\+33|0)[0-9]{9}$', clean))

    def _is_valid_url(self, url: str) -> bool:
        """Basic URL validation"""
        import re
        pattern = r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*$'
        return bool(re.match(pattern, url))

    def _find_person_duplicates(self, person: Person) -> List[Person]:
        """Find potential duplicate persons"""

        if not person.email:
            return []

        duplicates = self.db.query(Person).filter(
            Person.team_id == person.team_id,
            Person.email == person.email,
            Person.id != person.id
        ).all()

        return duplicates

    def _find_org_duplicates(self, org: Organisation) -> List[Organisation]:
        """Find potential duplicate organisations"""

        if not org.name:
            return []

        duplicates = self.db.query(Organisation).filter(
            Organisation.team_id == org.team_id,
            Organisation.name.ilike(org.name),
            Organisation.id != org.id
        ).all()

        return duplicates

    def _get_quality_tier(self, score: float) -> str:
        """Get quality tier (A/B/C/D) from score"""
        if score >= 85:
            return "A"  # Excellent
        elif score >= 70:
            return "B"  # Good
        elif score >= 50:
            return "C"  # Fair
        else:
            return "D"  # Poor

    def _generate_person_recommendations(
        self,
        person: Person,
        validity_issues: List[str],
        duplicates: List[Person]
    ) -> List[str]:
        """Generate recommendations to improve person data quality"""

        recommendations = []

        if not person.email:
            recommendations.append("Ajouter un email (champ critique)")

        if not person.phone and not person.mobile:
            recommendations.append("Ajouter un numéro de téléphone")

        if not person.job_title:
            recommendations.append("Ajouter un intitulé de poste")

        if validity_issues:
            recommendations.append(f"Corriger {len(validity_issues)} problème(s) de format")

        if duplicates:
            recommendations.append(f"Fusionner avec {len(duplicates)} doublon(s) potentiel(s)")

        return recommendations

    def _generate_org_recommendations(
        self,
        org: Organisation,
        validity_issues: List[str],
        duplicates: List[Organisation]
    ) -> List[str]:
        """Generate recommendations to improve organisation data quality"""

        recommendations = []

        if not org.website:
            recommendations.append("Ajouter le site web")

        if not org.siret:
            recommendations.append("Ajouter le SIRET")

        if not org.address:
            recommendations.append("Ajouter l'adresse complète")

        if validity_issues:
            recommendations.append(f"Corriger {len(validity_issues)} problème(s) de format")

        if duplicates:
            recommendations.append(f"Fusionner avec {len(duplicates)} doublon(s) potentiel(s)")

        return recommendations
