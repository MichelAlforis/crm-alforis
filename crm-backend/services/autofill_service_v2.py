"""
Service d'Autofill Prédictif V2 - Pipeline Multi-Sources

Pipeline de décision:
1. Rules (10ms)        → Pays/langue via TLD, normalisation téléphone
2. DB Patterns (20ms)  → Patterns email confirmés (≥2 contacts)
3. Outlook (50ms)      → Signatures récentes
4. LLM Fallback (300ms)→ Si incertitude ET budget disponible

Seuils:
- auto_apply si confidence ≥ 0.85 et source fiable
- Pattern email : auto si confirmé par ≥2 contacts du domaine
"""

import hashlib
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from phonenumbers import format_number, is_possible_number
from phonenumbers import parse as pn_parse
from phonenumbers import PhoneNumberFormat
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.organisation import Organisation
from models.person import Person
from services.llm_router import LLMRouter
from services.outlook_integration import OutlookIntegration
from services.company_resolver import CompanyResolver

# Mapping TLD → Pays
TLD_TO_COUNTRY = {
    "fr": "FR",
    "de": "DE",
    "it": "IT",
    "es": "ES",
    "be": "BE",
    "ch": "CH",
    "lu": "LU",
    "nl": "NL",
    "uk": "GB",
    "co.uk": "GB",
    "com": None,  # Indéterminé
}

# Mapping Pays → Langue
COUNTRY_TO_LANGUAGE = {
    "FR": "fr",
    "DE": "de",
    "IT": "it",
    "ES": "es",
    "BE": "fr",
    "CH": "de",
    "LU": "fr",
    "NL": "nl",
    "GB": "en",
}


def slug(s: str) -> str:
    """Normalise une chaîne (minuscules, sans accents, sans espaces)"""
    return re.sub(r"[^a-z]", "", s.lower())


class AutofillServiceV2:
    """Service d'autofill prédictif V2 avec pipeline multi-sources"""

    def __init__(self, db: Session):
        self.db = db
        self.confidence_threshold = 0.85  # Seuil auto-apply

        # Company Resolver (résolution domaine → entreprise)
        self.company_resolver = CompanyResolver(db, http_timeout=5)

        # Outlook optionnel (nécessite config Microsoft)
        try:
            self.outlook_service = OutlookIntegration(db)
        except Exception as e:
            print(f"[AutofillV2] Outlook désactivé: {e}")
            self.outlook_service = None

        # LLM Router (préparation fallback Mistral → Fallback)
        try:
            self.llm_router = LLMRouter()
        except Exception as e:
            print(f"[AutofillV2] LLM router désactivé: {e}")
            self.llm_router = None

    async def autofill(
        self,
        entity_type: str,
        draft: Dict,
        context: Optional[Dict] = None,
        user_id: Optional[int] = None,
    ) -> Dict:
        """
        Autofill d'une entité avec pipeline multi-sources

        Args:
            entity_type: "person" ou "organisation"
            draft: Données partielles
            context: {
                "outlook_enabled": bool,
                "outlook_access_token": str,
                "linkedin_enabled": bool,
                "budget_mode": "normal"|"low"|"emergency"
            }

        Returns:
            {
                "autofill": {...},
                "tasks": [...],
                "meta": {...}
            }
        """
        context = context or {}
        budget_mode = context.get("budget_mode", "normal")

        suggestions = {}
        tasks = []
        meta = {
            "mode": "rules",
            "cache_hit": False,
            "latency_ms": 0,
            "llm_called": False,
            "model": None,
            "llm_budget_ms": self.llm_router.latency_budget_ms if getattr(self, "llm_router", None) else None,
            "llm_router_ready": bool(getattr(self, "llm_router", None)),
        }

        start_time = datetime.utcnow()

        # ==========================================
        # 1. RULES (10ms) - Priorité 1
        # ==========================================

        # Pays via TLD
        if not draft.get("country") and draft.get("domain"):
            country_suggestion = self._infer_country(draft["domain"])
            if country_suggestion:
                suggestions["country"] = country_suggestion

        # Langue via pays
        if not draft.get("language"):
            country = draft.get("country") or suggestions.get("country", {}).get("value")
            if country:
                language_suggestion = self._infer_language(country)
                if language_suggestion:
                    suggestions["language"] = language_suggestion

        # Normalisation téléphone (si fourni)
        if draft.get("phone"):
            phone_suggestion = self._normalize_phone(draft["phone"], draft.get("country"))
            if phone_suggestion:
                suggestions["phone"] = phone_suggestion

        # ==========================================
        # 1.5. COMPANY RESOLVER (30ms) - Entreprise depuis email
        # ==========================================

        # Résolution automatique company_name + company_website depuis l'email
        if entity_type == "person" and draft.get("personal_email"):
            company_info = self.company_resolver.resolve(draft["personal_email"])

            # Si domaine non-personnel ET résolution réussie
            if not company_info.get("skip_company_autofill") and company_info.get("company_name"):
                # Mapper la source du CompanyResolver vers AutofillSourceType valide
                resolver_source = company_info.get("source", "db_pattern")
                # known_companies_* → db_pattern, http_probe → db_pattern
                autofill_source = "db_pattern"  # Source générique pour company resolver

                # company_name
                if not draft.get("company_name") and company_info.get("company_name"):
                    suggestions["company_name"] = {
                        "field": "company_name",
                        "value": company_info["company_name"],
                        "confidence": company_info["confidence"],
                        "source": autofill_source,
                        "evidence": f"Résolu depuis {resolver_source}",
                        "auto_apply": company_info["confidence"] >= 0.7,
                    }

                # company_website
                if not draft.get("company_website") and company_info.get("company_website"):
                    suggestions["company_website"] = {
                        "field": "company_website",
                        "value": company_info["company_website"],
                        "confidence": company_info["confidence"],
                        "source": autofill_source,
                        "evidence": f"Résolu depuis {resolver_source}",
                        "auto_apply": company_info["confidence"] >= 0.7,
                    }

                # company_linkedin
                if not draft.get("company_linkedin") and company_info.get("company_linkedin"):
                    suggestions["company_linkedin"] = {
                        "field": "company_linkedin",
                        "value": company_info["company_linkedin"],
                        "confidence": company_info["confidence"],
                        "source": autofill_source,
                        "evidence": f"Résolu depuis {resolver_source}",
                        "auto_apply": company_info["confidence"] >= 0.7,
                    }

                meta["company_resolved"] = True
                meta["company_source"] = resolver_source

        # ==========================================
        # 2. DB PATTERNS (20ms) - Priorité 2
        # ==========================================

        if entity_type == "person" and draft.get("first_name") and draft.get("last_name"):
            domain = draft.get("domain") or self._extract_domain(draft.get("organisation"))

            if domain:
                email_suggestion = self._infer_email_from_db_patterns(
                    draft["first_name"], draft["last_name"], domain
                )
                if email_suggestion:
                    suggestions["email"] = email_suggestion
                    meta["mode"] = "rules+db"

        # ==========================================
        # 3. OUTLOOK (50ms) - Priorité 3
        # ==========================================

        if self.outlook_service and context.get("outlook_enabled") and budget_mode != "emergency":
            outlook_token = context.get("outlook_access_token")

            if outlook_token:
                # Enrichir depuis signatures Outlook
                outlook_suggestions = await self._enrich_from_outlook(
                    draft, outlook_token
                )

                for field, suggestion in outlook_suggestions.items():
                    # Priorité à Outlook (confidence 0.95)
                    if field not in suggestions or suggestion["confidence"] > suggestions[field]["confidence"]:
                        suggestions[field] = suggestion

                meta["mode"] = "rules+db+outlook"

                # Générer tâches depuis threads sans réponse
                outlook_tasks = await self._generate_outlook_tasks(outlook_token)
                tasks.extend(outlook_tasks)

        # ==========================================
        # 4. LLM FALLBACK (300ms) - Priorité 4
        # ==========================================

        # TODO: À implémenter si budget_mode == "normal" et incertitudes
        # if budget_mode == "normal" and has_uncertainties:
        #     llm_suggestions = await self._enrich_from_llm(draft, suggestions)
        #     meta["llm_called"] = True
        #     meta["model"] = "claude-3-5-sonnet-20241022"

        # ==========================================
        # Finalisation
        # ==========================================

        # Appliquer seuil auto-apply
        for field, suggestion in suggestions.items():
            suggestion["applied"] = suggestion["confidence"] >= self.confidence_threshold

        # Calculer latence
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        meta["latency_ms"] = int(duration)

        # Persister les logs RGPD si user_id fourni
        self._persist_autofill_logs(
            user_id=user_id,
            entity_type=entity_type,
            draft=draft,
            suggestions=suggestions,
            execution_time_ms=meta.get("latency_ms"),
        )

        return {"autofill": suggestions, "tasks": tasks, "meta": meta}

    # ==========================================
    # Règles (Priority 1)
    # ==========================================

    def _infer_country(self, domain: str) -> Optional[Dict]:
        """Infère le pays à partir du TLD"""
        tld = domain.split(".")[-1].lower()
        country = TLD_TO_COUNTRY.get(tld)

        if country:
            return {
                "value": country,
                "confidence": 0.90,
                "source": "tld_mapping",
                "rationale_short": f"TLD .{tld} → {country}",
                "alternatives": [],
            }

        return None

    def _infer_language(self, country: str) -> Optional[Dict]:
        """Infère la langue à partir du pays"""
        language = COUNTRY_TO_LANGUAGE.get(country)

        if language:
            return {
                "value": language,
                "confidence": 0.75,
                "source": "country_language_default",
                "rationale_short": f"Langue par défaut pour {country}",
                "alternatives": [],
            }

        return None

    def _normalize_phone(self, raw: str, country: str = None) -> Optional[Dict]:
        """Normalise un téléphone en E.164"""
        default_region = country or "FR"

        try:
            num = pn_parse(raw, default_region)
            if is_possible_number(num):
                value = format_number(num, PhoneNumberFormat.E164)

                return {
                    "value": value,
                    "confidence": 0.82,
                    "source": "e164_normalization",
                    "rationale_short": f"Téléphone {default_region} normalisé E.164",
                    "alternatives": [],
                }
        except Exception:
            pass

        return None

    # ==========================================
    # DB Patterns (Priority 2)
    # ==========================================

    def _infer_email_from_db_patterns(
        self, first_name: str, last_name: str, domain: str
    ) -> Optional[Dict]:
        """Infère l'email à partir des patterns existants dans la DB"""
        # Chercher emails existants du même domaine
        existing_emails = (
            self.db.query(Person.email)
            .filter(Person.email.like(f"%@{domain}"))
            .limit(50)
            .all()
        )

        existing_emails = [e[0] for e in existing_emails if e[0]]

        # Détecter pattern majoritaire
        if existing_emails:
            value, confidence, pattern_counts = self._detect_email_pattern(
                first_name, last_name, domain, existing_emails
            )

            alternatives = self._generate_email_alternatives(
                first_name, last_name, domain, exclude=value
            )

            return {
                "value": value,
                "confidence": confidence,
                "source": "domain_pattern",
                "rationale_short": f"pattern {len(existing_emails)} contact(s) {domain}",
                "alternatives": alternatives[:2],
            }

        # Fallback : pattern standard (prenom.nom)
        f, l = slug(first_name), slug(last_name)
        value = f"{f}.{l}@{domain}"

        return {
            "value": value,
            "confidence": 0.65,
            "source": "default_pattern",
            "rationale_short": "pattern standard prenom.nom",
            "alternatives": [f"{f[0]}{l}@{domain}", f"{f}{l}@{domain}"],
        }

    def _detect_email_pattern(
        self, first: str, last: str, domain: str, existing: List[str]
    ) -> Tuple[str, float, Counter]:
        """Détecte le pattern majoritaire d'emails"""
        patterns = []
        f, l = slug(first), slug(last)

        for email in existing:
            local = email.split("@")[0].lower()

            # Identifier le pattern
            if local == f"{f}.{l}":
                patterns.append("first.last")
            elif local == f"{f}{l}":
                patterns.append("firstlast")
            elif local == f"{f}_{l}":
                patterns.append("first_last")
            elif local == f"{f[0]}{l}":
                patterns.append("f_last")
            elif local == f"{f}":
                patterns.append("first")
            elif local == f"{l}":
                patterns.append("last")

        if not patterns:
            return f"{f}.{l}@{domain}", 0.65, Counter()

        # Pattern majoritaire
        counts = Counter(patterns)
        best_pattern, count = counts.most_common(1)[0]
        confidence = min(0.90, 0.70 + (count / len(patterns)) * 0.20)  # 0.70-0.90

        # Générer email selon pattern
        pattern_to_email = {
            "first.last": f"{f}.{l}@{domain}",
            "firstlast": f"{f}{l}@{domain}",
            "first_last": f"{f}_{l}@{domain}",
            "f_last": f"{f[0]}{l}@{domain}",
            "first": f"{f}@{domain}",
            "last": f"{l}@{domain}",
        }

        value = pattern_to_email.get(best_pattern, f"{f}.{l}@{domain}")

        return value, confidence, counts

    def _generate_email_alternatives(
        self, first: str, last: str, domain: str, exclude: str = None
    ) -> List[str]:
        """Génère 2-3 alternatives d'email"""
        f, l = slug(first), slug(last)
        candidates = [
            f"{f}.{l}@{domain}",
            f"{f[0]}{l}@{domain}",
            f"{f}{l}@{domain}",
            f"{f}_{l}@{domain}",
        ]

        if exclude:
            candidates = [c for c in candidates if c != exclude]

        return candidates[:2]

    # ==========================================
    # Outlook (Priority 3)
    # ==========================================

    async def _enrich_from_outlook(
        self, draft: Dict, access_token: str
    ) -> Dict[str, Dict]:
        """Enrichit les données depuis les signatures Outlook"""
        suggestions = {}

        try:
            # Récupérer messages récents
            messages = await self.outlook_service.get_recent_messages(
                access_token, limit=50, days=30
            )

            # Extraire signatures
            signatures = self.outlook_service.extract_signatures_from_messages(messages)

            # Chercher correspondance par nom/prénom
            first_name = draft.get("first_name", "").lower()
            last_name = draft.get("last_name", "").lower()

            for sig in signatures:
                # Vérifier si signature correspond au draft
                sig_email = sig.get("email", "").lower()

                # Si nom/prénom correspondent à l'email ou si même domaine
                if (first_name and first_name in sig_email) or (
                    last_name and last_name in sig_email
                ):
                    # Email
                    if sig.get("email"):
                        suggestions["email"] = {
                            "value": sig["email"],
                            "confidence": 0.95,
                            "source": "outlook_signature",
                            "rationale_short": f"signature mail du {sig.get('source_date', 'récent')}",
                            "evidence_hash": self._hash_evidence(sig),
                            "alternatives": [],
                        }

                    # Téléphone
                    if sig.get("phone"):
                        normalized = self.outlook_service.normalize_phone_from_signature(
                            sig["phone"], draft.get("country", "FR")
                        )
                        if normalized:
                            suggestions["phone"] = {
                                "value": normalized,
                                "confidence": 0.88,
                                "source": "outlook_signature",
                                "rationale_short": "normalisé E.164 depuis signature",
                                "evidence_hash": self._hash_evidence(sig),
                                "alternatives": [],
                            }

                    # Fonction
                    if sig.get("job_title"):
                        suggestions["job_title"] = {
                            "value": sig["job_title"],
                            "confidence": 0.85,
                            "source": "outlook_signature",
                            "rationale_short": "fonction depuis signature",
                            "evidence_hash": self._hash_evidence(sig),
                            "alternatives": [],
                        }

                    break  # Première correspondance trouvée

        except Exception as e:
            # Log error mais ne pas fail
            print(f"Outlook enrichment error: {e}")

        return suggestions

    async def _generate_outlook_tasks(self, access_token: str) -> List[Dict]:
        """Génère des tâches depuis threads Outlook sans réponse"""
        tasks = []

        try:
            # Détecter threads sans réponse J+7
            unanswered = await self.outlook_service.get_sent_messages_without_reply(
                access_token, older_than_days=7
            )

            for thread in unanswered[:3]:  # Max 3 tâches
                tasks.append({
                    "title": f"Relancer {thread['recipient']} sur {thread['subject']}",
                    "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                    "assignee": "current_user",
                    "confidence": 0.9,
                    "reason": "outlook_no_reply_7d",
                    "context_links": [f"outlook:thread={thread['thread_id']}"],
                    "tags": ["followup", "outlook"],
                    "estimated_minutes": 5,
                })

        except Exception as e:
            print(f"Outlook tasks generation error: {e}")

        return tasks

    # ==========================================
    # Helpers
    # ==========================================

    def _extract_domain(self, organisation: str) -> Optional[str]:
        """Extrait le domain à partir du nom d'organisation"""
        if organisation:
            org = (
                self.db.query(Organisation)
                .filter(Organisation.name.ilike(f"%{organisation}%"))
                .first()
            )

            if org and org.website:
                # Extraire domain du website
                domain = (
                    org.website.replace("http://", "")
                    .replace("https://", "")
                    .split("/")[0]
                )
                return domain

        return None

    def _hash_evidence(self, data: Dict) -> str:
        """Génère un hash SHA256 de l'évidence"""
        content = str(sorted(data.items()))
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    # ==========================================
    # Logging helpers
    # ==========================================

    def _persist_autofill_logs(
        self,
        user_id: Optional[int],
        entity_type: str,
        draft: Dict,
        suggestions: Dict[str, Dict],
        execution_time_ms: Optional[int],
    ) -> None:
        """Enregistre chaque suggestion dans autofill_logs pour audit/metrics."""
        if not user_id:
            return

        logs = []
        entity_id = self._extract_entity_id(entity_type, draft)

        for field, suggestion in suggestions.items():
            source = self._normalize_source(str(suggestion.get("source") or "unknown"))
            logs.append(
                AutofillLog(
                    user_id=user_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    field=field,
                    old_value=self._stringify_value(draft.get(field)),
                    new_value=self._stringify_value(suggestion.get("value")),
                    confidence=float(suggestion.get("confidence", 0.0)),
                    source=source,
                    applied=bool(suggestion.get("applied")),
                    evidence_hash=self._hash_log_evidence(field, suggestion),
                    execution_time_ms=execution_time_ms,
                )
            )

        if not logs:
            return

        try:
            self.db.add_all(logs)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            print(f"[AutofillV2] Unable to persist autofill logs: {exc}")

    def _stringify_value(self, value: Any) -> Optional[str]:
        """Convertit proprement les valeurs pour stockage texte."""
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return str(value)
        return str(value)

    def _hash_log_evidence(self, field: str, suggestion: Dict) -> Optional[str]:
        """Génère un hash stable pour faciliter l'audit sans stocker la donnée brute."""
        evidence = suggestion.get("evidence") or ""
        value = suggestion.get("value") or ""
        payload = f"{field}|{suggestion.get('source')}|{value}|{evidence}"
        digest = hashlib.sha256(payload.encode()).hexdigest()
        return digest[:32]

    def _extract_entity_id(self, entity_type: str, draft: Dict) -> Optional[int]:
        """Tente de retrouver l'ID d'entité si disponible dans le draft."""
        if not draft:
            return None
        if entity_type == "person":
            return draft.get("person_id") or draft.get("id")
        if entity_type == "organisation":
            return draft.get("organisation_id") or draft.get("id")
        return None

    def _normalize_source(self, raw_source: str) -> str:
        """Normalise la source pour rester dans les valeurs officielles."""
        mapping = {
            "tld_mapping": "rules",
            "country_language_default": "rules",
            "e164_normalization": "rules",
            "default_pattern": "rules",
            "domain_pattern": "db_pattern",
            "known_company": "db_pattern",
            "http_probe": "db_pattern",
            "outlook_signature": "outlook",
            "llm": "llm",
        }
        return mapping.get(raw_source, raw_source)
