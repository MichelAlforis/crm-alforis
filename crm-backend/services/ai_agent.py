"""
Service Agent IA pour le CRM

Ce service fournit des fonctionnalités d'IA pour:
- Détection de doublons intelligente
- Enrichissement automatique des données
- Contrôle qualité des données
- Suggestions de workflows
- Catégorisation automatique

Utilise les API Claude (Anthropic), OpenAI ou Ollama selon configuration.
"""

import asyncio
import hashlib
import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from core.config import settings
from core.notifications import NotificationManager
from models.ai_agent import (
    AICache,
    AIConfiguration,
    AIExecution,
    AIExecutionStatus,
    AIProvider,
    AISuggestion,
    AISuggestionStatus,
    AISuggestionType,
    AITaskType,
)
from models.organisation import Organisation
from models.person import Person


class AIAgentService:
    """
    Service principal de l'agent IA

    Responsabilités:
    1. Gérer les différents fournisseurs d'IA (Claude, OpenAI, Ollama)
    2. Exécuter les tâches IA (duplication, enrichissement, qualité)
    3. Créer et gérer les suggestions
    4. Gérer le cache pour optimiser les coûts
    5. Respecter les budgets et limites de taux
    """

    def __init__(self, db: Session):
        self.db = db
        self.notification_manager = NotificationManager(db)
        self.config = self._load_configuration()

    # ======================
    # Configuration
    # ======================

    def _load_configuration(self) -> Optional[AIConfiguration]:
        """Charge la configuration active de l'agent IA"""
        config = self.db.query(AIConfiguration).filter(AIConfiguration.is_active == True).first()

        if not config:
            # Créer une configuration par défaut
            config = AIConfiguration(
                name="default",
                description="Configuration par défaut de l'agent IA",
                is_active=True,
                ai_provider=AIProvider.CLAUDE,
                ai_model=settings.anthropic_model,
                auto_apply_enabled=settings.ai_auto_apply_enabled,
                auto_apply_confidence_threshold=settings.ai_auto_apply_threshold,
                duplicate_similarity_threshold=settings.ai_duplicate_threshold,
                quality_score_threshold=settings.ai_quality_threshold,
                max_suggestions_per_execution=settings.ai_max_suggestions_per_run,
                daily_budget_usd=settings.ai_daily_budget_usd,
                monthly_budget_usd=settings.ai_monthly_budget_usd,
            )
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)

        return config

    def get_config(self) -> Optional[AIConfiguration]:
        """Retourne la configuration active de l'agent IA"""
        return self.config

    def update_config(self, updates: Dict[str, Any]) -> AIConfiguration:
        """
        Met à jour la configuration de l'agent IA

        Args:
            updates: Dictionnaire des champs à mettre à jour

        Returns:
            Configuration mise à jour
        """
        if not self.config:
            raise ValueError("No active configuration found")

        # Mettre à jour les champs autorisés
        allowed_fields = {
            "name", "description", "is_active", "ai_provider", "ai_model",
            "api_key_name", "auto_apply_enabled", "auto_apply_confidence_threshold",
            "duplicate_similarity_threshold", "quality_score_threshold",
            "max_suggestions_per_execution", "max_tokens_per_request",
            "rate_limit_requests_per_minute", "daily_budget_usd", "monthly_budget_usd",
            "notify_on_suggestions", "notify_on_errors", "notification_user_ids",
            "custom_prompts", "rules"
        }

        for field, value in updates.items():
            if field in allowed_fields and hasattr(self.config, field):
                setattr(self.config, field, value)

        self.db.commit()
        self.db.refresh(self.config)
        return self.config

    # ======================
    # Intégration API IA
    # ======================

    async def _call_ai(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """
        Appelle l'API IA configurée

        Args:
            prompt: Le prompt utilisateur
            system_prompt: Le prompt système (optionnel)
            max_tokens: Nombre max de tokens
            temperature: Créativité (0-1)

        Returns:
            {
                "content": "Réponse de l'IA",
                "provider": "claude",
                "model": "claude-3-5-sonnet-20241022",
                "prompt_tokens": 150,
                "completion_tokens": 300,
                "cost_usd": 0.0045
            }
        """
        provider = self.config.ai_provider if self.config else AIProvider.CLAUDE

        if provider == AIProvider.CLAUDE:
            return await self._call_claude(prompt, system_prompt, max_tokens, temperature)
        elif provider == AIProvider.OPENAI:
            return await self._call_openai(prompt, system_prompt, max_tokens, temperature)
        elif provider == AIProvider.OLLAMA:
            return await self._call_ollama(prompt, system_prompt, max_tokens, temperature)
        else:
            raise ValueError(f"Fournisseur IA non supporté: {provider}")

    async def _call_claude(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Appel à l'API Anthropic Claude"""
        # Priorité: Clé chiffrée (frontend) > Clé .env
        api_key = None
        if self.config and self.config.encrypted_anthropic_key:
            from core.encryption import get_encryption_service

            encryption = get_encryption_service()
            try:
                api_key = encryption.decrypt(self.config.encrypted_anthropic_key)
            except Exception as e:
                # Fallback sur .env si déchiffrement échoue
                print(f"Erreur déchiffrement clé Anthropic: {e}")
                api_key = settings.anthropic_api_key
        else:
            api_key = settings.anthropic_api_key

        if not api_key:
            raise ValueError(
                "Aucune clé API Anthropic configurée. "
                "Configurez-la dans /dashboard/ai/config ou dans le fichier .env"
            )

        max_tokens = max_tokens or settings.anthropic_max_tokens
        model = self.config.ai_model or settings.anthropic_model

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "system": system_prompt
                    or "Tu es un assistant IA expert en gestion de données CRM.",
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()

            # Calcul du coût (tarifs Claude 3.5 Sonnet)
            # Input: $3/M tokens, Output: $15/M tokens
            prompt_tokens = data["usage"]["input_tokens"]
            completion_tokens = data["usage"]["output_tokens"]
            cost_usd = (prompt_tokens / 1_000_000 * 3) + (completion_tokens / 1_000_000 * 15)

            return {
                "content": data["content"][0]["text"],
                "provider": "claude",
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "cost_usd": round(cost_usd, 6),
            }

    async def _call_openai(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Appel à l'API OpenAI"""
        # Priorité: Clé chiffrée (frontend) > Clé .env
        api_key = None
        if self.config and self.config.encrypted_openai_key:
            from core.encryption import get_encryption_service

            encryption = get_encryption_service()
            try:
                api_key = encryption.decrypt(self.config.encrypted_openai_key)
            except Exception as e:
                print(f"Erreur déchiffrement clé OpenAI: {e}")
                api_key = settings.openai_api_key
        else:
            api_key = settings.openai_api_key

        if not api_key:
            raise ValueError(
                "Aucune clé API OpenAI configurée. "
                "Configurez-la dans /dashboard/ai/config ou dans le fichier .env"
            )

        max_tokens = max_tokens or settings.openai_max_tokens
        model = self.config.ai_model or settings.openai_model

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": [
                        {
                            "role": "system",
                            "content": system_prompt
                            or "Tu es un assistant IA expert en gestion de données CRM.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()

            # Calcul du coût (tarifs GPT-4o)
            # Input: $2.50/M tokens, Output: $10/M tokens
            prompt_tokens = data["usage"]["prompt_tokens"]
            completion_tokens = data["usage"]["completion_tokens"]
            cost_usd = (prompt_tokens / 1_000_000 * 2.5) + (completion_tokens / 1_000_000 * 10)

            return {
                "content": data["choices"][0]["message"]["content"],
                "provider": "openai",
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "cost_usd": round(cost_usd, 6),
            }

    async def _call_ollama(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Appel à Ollama (LLM local)"""
        model = self.config.ai_model or settings.ollama_model

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": f"{system_prompt}\n\n{prompt}" if system_prompt else prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens or 2048,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()

            return {
                "content": data["response"],
                "provider": "ollama",
                "model": model,
                "prompt_tokens": 0,  # Ollama ne fournit pas ces infos
                "completion_tokens": 0,
                "cost_usd": 0.0,  # Gratuit (local)
            }

    # ======================
    # Gestion du Cache
    # ======================

    def _get_cache_key(self, request_type: str, request_data: Dict[str, Any]) -> str:
        """Génère une clé de cache unique pour une requête"""
        data_str = json.dumps(request_data, sort_keys=True)
        return hashlib.sha256(f"{request_type}:{data_str}".encode()).hexdigest()

    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Récupère un résultat depuis le cache par clé

        Args:
            cache_key: Clé de cache

        Returns:
            Données du cache si trouvées et non expirées, None sinon
        """
        cached = (
            self.db.query(AICache)
            .filter(
                and_(
                    AICache.cache_key == cache_key,
                    AICache.expires_at > datetime.now(UTC),
                )
            )
            .first()
        )

        if cached:
            # Incrémenter le compteur de hits
            cached.hit_count += 1
            cached.last_accessed_at = datetime.now(UTC)
            self.db.commit()
            return cached.response_data

        return None

    def _save_to_cache(
        self,
        cache_key: str,
        request_type: str,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any],
        ttl_hours: int = 24,
    ) -> AICache:
        """
        Sauvegarde un résultat dans le cache

        Args:
            cache_key: Clé de cache
            request_type: Type de requête
            request_data: Données de la requête
            response_data: Données de la réponse
            ttl_hours: Durée de vie en heures

        Returns:
            Entrée de cache créée
        """
        cache_entry = AICache(
            cache_key=cache_key,
            request_type=request_type,
            request_data=request_data,
            response_data=response_data,
            hit_count=0,
            expires_at=datetime.now(UTC) + timedelta(hours=ttl_hours),
        )
        self.db.add(cache_entry)
        self.db.commit()
        self.db.refresh(cache_entry)
        return cache_entry

    async def _get_cached_result(
        self, request_type: str, request_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Récupère un résultat depuis le cache s'il existe et n'est pas expiré"""
        cache_key = self._get_cache_key(request_type, request_data)

        cached = (
            self.db.query(AICache)
            .filter(
                and_(
                    AICache.cache_key == cache_key,
                    AICache.expires_at > datetime.now(UTC),
                )
            )
            .first()
        )

        if cached:
            cached.increment_hit()
            self.db.commit()
            return cached.response_data

        return None

    async def _set_cache(
        self,
        request_type: str,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any],
        provider: AIProvider,
        model: str,
        ttl_hours: Optional[int] = None,
    ):
        """Stocke un résultat dans le cache"""
        cache_key = self._get_cache_key(request_type, request_data)
        ttl_hours = ttl_hours or settings.ai_cache_ttl_hours

        # Supprimer ancien cache si existe
        self.db.query(AICache).filter(AICache.cache_key == cache_key).delete()

        # Créer nouveau cache
        cache = AICache(
            cache_key=cache_key,
            request_type=request_type,
            request_data=request_data,
            response_data=response_data,
            ai_provider=provider,
            ai_model=model,
            expires_at=datetime.now(UTC) + timedelta(hours=ttl_hours),
        )
        self.db.add(cache)
        self.db.commit()

    # ======================
    # Détection de doublons
    # ======================

    async def detect_duplicates(
        self,
        entity_type: str = "organisation",
        limit: Optional[int] = None,
        triggered_by: Optional[int] = None,
    ) -> AIExecution:
        """
        Détecte les doublons dans les organisations ou contacts

        Args:
            entity_type: Type d'entité (organisation, person)
            limit: Nombre max d'entités à analyser
            triggered_by: ID utilisateur qui lance l'analyse

        Returns:
            AIExecution avec les suggestions de doublons détectés
        """
        # Créer l'exécution
        execution = AIExecution(
            task_type=AITaskType.DUPLICATE_SCAN,
            status=AIExecutionStatus.RUNNING,
            ai_provider=self.config.ai_provider,
            ai_model=self.config.ai_model,
            started_at=datetime.now(UTC),
            triggered_by=triggered_by,
            execution_logs=[],
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        try:
            if entity_type == "organisation":
                await self._detect_organisation_duplicates(execution, limit)
            elif entity_type == "person":
                await self._detect_person_duplicates(execution, limit)
            else:
                raise ValueError(f"Type d'entité non supporté: {entity_type}")

            execution.status = AIExecutionStatus.SUCCESS
            execution.completed_at = datetime.now(UTC)
            execution.calculate_duration()
            self.db.commit()

            return execution

        except Exception as e:
            execution.status = AIExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.now(UTC)
            self.db.commit()
            raise

    async def _detect_organisation_duplicates(self, execution: AIExecution, limit: Optional[int]):
        """Détecte les doublons d'organisations"""
        # Récupérer toutes les organisations actives
        query = self.db.query(Organisation).filter(Organisation.is_active == True)
        if limit:
            query = query.limit(limit)

        organisations = query.all()
        execution.total_items_processed = len(organisations)
        self._log_execution(execution, "info", f"{len(organisations)} organisations à analyser")

        # Grouper par similarité de nom et pays
        duplicates_found = []

        for i, org1 in enumerate(organisations):
            for org2 in organisations[i + 1 :]:
                # Vérifier cache
                cache_request = {
                    "org1_id": org1.id,
                    "org2_id": org2.id,
                    "org1_nom": org1.nom,
                    "org2_nom": org2.nom,
                }
                cached_result = await self._get_cached_result("duplicate_check", cache_request)

                if cached_result:
                    similarity = cached_result.get("similarity", 0.0)
                else:
                    # Appeler l'IA pour comparer
                    similarity = await self._compare_organisations(org1, org2, execution)

                    # Mettre en cache
                    await self._set_cache(
                        "duplicate_check",
                        cache_request,
                        {"similarity": similarity},
                        self.config.ai_provider,
                        self.config.ai_model,
                    )

                # Si similarité élevée, créer une suggestion
                if similarity >= self.config.duplicate_similarity_threshold:
                    duplicates_found.append((org1, org2, similarity))

        # Créer les suggestions
        for org1, org2, similarity in duplicates_found:
            suggestion = AISuggestion(
                type=AISuggestionType.DUPLICATE_DETECTION,
                status=AISuggestionStatus.PENDING,
                entity_type="organisation",
                entity_id=org1.id,
                title=f"Doublon potentiel détecté: {org1.nom} ↔ {org2.nom}",
                description=f"Ces deux organisations semblent être des doublons (similarité: {similarity:.1%})",
                suggestion_data={
                    "duplicate_id": org2.id,
                    "duplicate_nom": org2.nom,
                    "similarity_score": similarity,
                    "suggested_action": "merge",
                    "keep_id": org1.id if org1.created_at < org2.created_at else org2.id,
                    "merge_id": org2.id if org1.created_at < org2.created_at else org1.id,
                },
                confidence_score=similarity,
                ai_provider=self.config.ai_provider,
                ai_model=self.config.ai_model,
                execution_id=execution.id,
            )
            self.db.add(suggestion)
            execution.total_suggestions_created += 1

        self.db.commit()
        self._log_execution(
            execution, "info", f"{len(duplicates_found)} doublons potentiels détectés"
        )

    async def _compare_organisations(
        self, org1: Organisation, org2: Organisation, execution: AIExecution
    ) -> float:
        """
        Compare deux organisations avec l'IA pour détecter les doublons

        Returns:
            Score de similarité (0.0 à 1.0)
        """
        prompt = f"""Analyse ces deux organisations et détermine s'il s'agit de doublons.

Organisation 1:
- Nom: {org1.nom}
- Pays: {org1.country_code or 'N/A'}
- Site web: {org1.website or 'N/A'}
- Catégorie: {org1.category or 'N/A'}
- Email: {org1.general_email or 'N/A'}

Organisation 2:
- Nom: {org2.nom}
- Pays: {org2.country_code or 'N/A'}
- Site web: {org2.website or 'N/A'}
- Catégorie: {org2.category or 'N/A'}
- Email: {org2.general_email or 'N/A'}

Réponds UNIQUEMENT avec un score de similarité entre 0.0 et 1.0, sans explication.
Exemple: 0.95"""

        system_prompt = """Tu es un expert en détection de doublons dans les bases de données CRM.
Tu dois évaluer la probabilité que deux organisations soient la même entité.
Prends en compte: nom, variations orthographiques, site web, email, pays."""

        result = await self._call_ai(prompt, system_prompt, max_tokens=10, temperature=0.1)

        # Extraire le score
        try:
            score = float(result["content"].strip())
            score = max(0.0, min(1.0, score))  # Clamp entre 0 et 1
        except ValueError:
            score = 0.0

        # Mise à jour des métriques
        execution.total_prompt_tokens += result["prompt_tokens"]
        execution.total_completion_tokens += result["completion_tokens"]
        execution.estimated_cost_usd = (execution.estimated_cost_usd or 0.0) + result["cost_usd"]

        return score

    async def _detect_person_duplicates(self, execution: AIExecution, limit: Optional[int]):
        """Détecte les doublons de contacts (similaire à organisations)"""
        # TODO: Implémenter détection doublons pour les personnes
        self._log_execution(execution, "info", "Détection doublons personnes non implémentée")

    # ======================
    # Enrichissement automatique
    # ======================

    async def enrich_organisations(
        self,
        organisation_ids: Optional[List[int]] = None,
        triggered_by: Optional[int] = None,
    ) -> AIExecution:
        """
        Enrichit les organisations avec des données manquantes

        Args:
            organisation_ids: Liste d'IDs à enrichir (None = toutes)
            triggered_by: ID utilisateur

        Returns:
            AIExecution avec suggestions d'enrichissement
        """
        execution = AIExecution(
            task_type=AITaskType.BULK_ENRICHMENT,
            status=AIExecutionStatus.RUNNING,
            ai_provider=self.config.ai_provider,
            ai_model=self.config.ai_model,
            started_at=datetime.now(UTC),
            triggered_by=triggered_by,
            execution_logs=[],
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        try:
            # Récupérer organisations
            query = self.db.query(Organisation)
            if organisation_ids:
                query = query.filter(Organisation.id.in_(organisation_ids))

            organisations = query.all()
            execution.total_items_processed = len(organisations)

            for org in organisations:
                await self._enrich_organisation(org, execution)

            execution.status = AIExecutionStatus.SUCCESS
            execution.completed_at = datetime.now(UTC)
            execution.calculate_duration()
            self.db.commit()

            return execution

        except Exception as e:
            execution.status = AIExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.now(UTC)
            self.db.commit()
            raise

    async def _enrich_organisation(self, org: Organisation, execution: AIExecution):
        """Enrichit une organisation avec l'IA"""
        # Identifier les champs manquants
        missing_fields = []
        if not org.website:
            missing_fields.append("website")
        if not org.category:
            missing_fields.append("category")
        if not org.general_email:
            missing_fields.append("email")
        if not org.general_phone:
            missing_fields.append("phone")

        if not missing_fields:
            return  # Rien à enrichir

        # Prompt pour enrichissement
        prompt = f"""Enrichis cette organisation avec les informations manquantes.

Organisation: {org.nom}
Pays: {org.country_code or 'Non spécifié'}
Site web: {org.website or 'Manquant'}
Email: {org.general_email or 'Manquant'}

Champs manquants: {', '.join(missing_fields)}

Réponds en JSON avec uniquement les champs manquants que tu peux déterminer:
{{
  "website": "https://...",
  "category": "Institution|Wholesale|SDG|...",
  "email": "contact@...",
  "phone": "+33..."
}}"""

        system_prompt = """Tu es un expert en enrichissement de données d'entreprises financières.
Utilise tes connaissances pour compléter les informations manquantes.
Si tu ne peux pas déterminer une information avec certitude, ne l'inclus pas dans ta réponse."""

        result = await self._call_ai(prompt, system_prompt, max_tokens=500, temperature=0.3)

        # Parser la réponse JSON
        try:
            enrichment_data = json.loads(result["content"])

            # Créer une suggestion
            suggestion = AISuggestion(
                type=AISuggestionType.DATA_ENRICHMENT,
                status=AISuggestionStatus.PENDING,
                entity_type="organisation",
                entity_id=org.id,
                title=f"Enrichissement de {org.nom}",
                description=f"Données proposées pour compléter la fiche: {', '.join(enrichment_data.keys())}",
                suggestion_data=enrichment_data,
                confidence_score=0.80,  # Score modéré pour enrichissement
                ai_provider=self.config.ai_provider,
                ai_model=self.config.ai_model,
                prompt_tokens=result["prompt_tokens"],
                completion_tokens=result["completion_tokens"],
                execution_id=execution.id,
            )
            self.db.add(suggestion)
            execution.total_suggestions_created += 1

            # Mise à jour métriques
            execution.total_prompt_tokens += result["prompt_tokens"]
            execution.total_completion_tokens += result["completion_tokens"]
            execution.estimated_cost_usd = (execution.estimated_cost_usd or 0.0) + result[
                "cost_usd"
            ]

        except json.JSONDecodeError:
            self._log_execution(execution, "error", f"Erreur parsing JSON pour org {org.id}")

    # ======================
    # Contrôle qualité
    # ======================

    async def check_data_quality(
        self,
        organisation_ids: Optional[List[int]] = None,
        triggered_by: Optional[int] = None,
    ) -> AIExecution:
        """
        Vérifie la qualité des données et suggère des corrections

        Args:
            organisation_ids: Liste d'IDs à vérifier
            triggered_by: ID utilisateur

        Returns:
            AIExecution avec suggestions de corrections
        """
        execution = AIExecution(
            task_type=AITaskType.QUALITY_CHECK,
            status=AIExecutionStatus.RUNNING,
            ai_provider=self.config.ai_provider,
            ai_model=self.config.ai_model,
            started_at=datetime.now(UTC),
            triggered_by=triggered_by,
            execution_logs=[],
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        try:
            query = self.db.query(Organisation)
            if organisation_ids:
                query = query.filter(Organisation.id.in_(organisation_ids))

            organisations = query.all()
            execution.total_items_processed = len(organisations)

            for org in organisations:
                quality_score = await self._assess_data_quality(org, execution)

                if quality_score < self.config.quality_score_threshold:
                    # Créer suggestion de correction
                    suggestion = AISuggestion(
                        type=AISuggestionType.DATA_QUALITY,
                        status=AISuggestionStatus.PENDING,
                        entity_type="organisation",
                        entity_id=org.id,
                        title=f"Qualité faible détectée: {org.nom}",
                        description=f"Score qualité: {quality_score:.1%}. Vérification recommandée.",
                        suggestion_data={
                            "quality_score": quality_score,
                            "issues": "Données incomplètes ou incohérentes",
                        },
                        confidence_score=1.0 - quality_score,
                        ai_provider=self.config.ai_provider,
                        ai_model=self.config.ai_model,
                        execution_id=execution.id,
                    )
                    self.db.add(suggestion)
                    execution.total_suggestions_created += 1

            execution.status = AIExecutionStatus.SUCCESS
            execution.completed_at = datetime.now(UTC)
            execution.calculate_duration()
            self.db.commit()

            return execution

        except Exception as e:
            execution.status = AIExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.now(UTC)
            self.db.commit()
            raise

    async def _assess_data_quality(self, org: Organisation, execution: AIExecution) -> float:
        """Évalue la qualité des données d'une organisation (0.0 à 1.0)"""
        # Calcul simple de qualité basé sur complétude
        fields = ["nom", "website", "category", "country_code", "general_email", "general_phone"]
        filled = sum(1 for field in fields if getattr(org, field, None))
        quality_score = filled / len(fields)

        return quality_score

    # ======================
    # Gestion des suggestions
    # ======================

    def get_pending_suggestions(
        self,
        entity_type: Optional[str] = None,
        suggestion_type: Optional[AISuggestionType] = None,
        limit: int = 50,
    ) -> List[AISuggestion]:
        """Récupère les suggestions en attente de validation"""
        query = self.db.query(AISuggestion).filter(
            AISuggestion.status == AISuggestionStatus.PENDING
        )

        if entity_type:
            query = query.filter(AISuggestion.entity_type == entity_type)
        if suggestion_type:
            query = query.filter(AISuggestion.type == suggestion_type)

        return query.order_by(AISuggestion.confidence_score.desc()).limit(limit).all()

    def get_suggestions(
        self,
        status: Optional[AISuggestionStatus] = None,
        entity_type: Optional[str] = None,
        suggestion_type: Optional[AISuggestionType] = None,
        min_confidence: Optional[float] = None,
        limit: int = 100,
    ) -> List[AISuggestion]:
        """
        Récupère les suggestions avec filtres optionnels

        Args:
            status: Filtrer par statut
            entity_type: Filtrer par type d'entité
            suggestion_type: Filtrer par type de suggestion
            min_confidence: Score de confiance minimum
            limit: Nombre maximum de résultats

        Returns:
            Liste de suggestions
        """
        query = self.db.query(AISuggestion)

        if status:
            query = query.filter(AISuggestion.status == status)
        if entity_type:
            query = query.filter(AISuggestion.entity_type == entity_type)
        if suggestion_type:
            query = query.filter(AISuggestion.type == suggestion_type)
        if min_confidence is not None:
            query = query.filter(AISuggestion.confidence_score >= min_confidence)

        return query.order_by(AISuggestion.created_at.desc()).limit(limit).all()

    def _create_suggestion(
        self,
        suggestion_type: AISuggestionType,
        entity_type: str,
        entity_id: int,
        title: str,
        description: str,
        suggestion_data: Dict[str, Any],
        confidence_score: float,
        ai_provider: Optional[AIProvider] = None,
        ai_model: Optional[str] = None,
        execution_id: Optional[int] = None,
    ) -> AISuggestion:
        """
        Crée une nouvelle suggestion

        Args:
            suggestion_type: Type de suggestion
            entity_type: Type d'entité concernée
            entity_id: ID de l'entité
            title: Titre de la suggestion
            description: Description
            suggestion_data: Données de la suggestion
            confidence_score: Score de confiance (0.0 à 1.0)
            ai_provider: Fournisseur d'IA utilisé
            ai_model: Modèle utilisé
            execution_id: ID de l'exécution associée

        Returns:
            Suggestion créée
        """
        suggestion = AISuggestion(
            type=suggestion_type,
            status=AISuggestionStatus.PENDING,
            entity_type=entity_type,
            entity_id=entity_id,
            title=title,
            description=description,
            suggestion_data=suggestion_data,
            confidence_score=confidence_score,
            ai_provider=ai_provider or (self.config.ai_provider if self.config else None),
            ai_model=ai_model or (self.config.ai_model if self.config else None),
            execution_id=execution_id,
        )
        self.db.add(suggestion)
        self.db.commit()
        self.db.refresh(suggestion)
        return suggestion

    def approve_suggestion(self, suggestion_id: int, user_id: int, notes: Optional[str] = None):
        """Approuve et applique une suggestion"""
        suggestion = self.db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if not suggestion:
            raise ValueError("Suggestion non trouvée")

        suggestion.status = AISuggestionStatus.APPROVED
        suggestion.reviewed_by = user_id
        suggestion.reviewed_at = datetime.now(UTC)
        suggestion.review_notes = notes

        # Appliquer la suggestion
        self._apply_suggestion(suggestion)

        suggestion.status = AISuggestionStatus.APPLIED
        suggestion.applied_at = datetime.now(UTC)

        self.db.commit()

    def reject_suggestion(self, suggestion_id: int, user_id: int, notes: Optional[str] = None):
        """Rejette une suggestion"""
        suggestion = self.db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if not suggestion:
            raise ValueError("Suggestion non trouvée")

        suggestion.status = AISuggestionStatus.REJECTED
        suggestion.reviewed_by = user_id
        suggestion.reviewed_at = datetime.now(UTC)
        suggestion.review_notes = notes

        self.db.commit()

    # ======================
    # Batch Operations
    # ======================

    def batch_approve_suggestions(
        self, suggestion_ids: List[int], user_id: int, notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Approuve plusieurs suggestions en batch

        Args:
            suggestion_ids: Liste des IDs à approuver
            user_id: ID utilisateur
            notes: Notes communes

        Returns:
            {
                "total_requested": 5,
                "successful": 4,
                "failed": 1,
                "results": [...]
            }
        """
        results = []
        successful = 0
        failed = 0

        for suggestion_id in suggestion_ids:
            try:
                self.approve_suggestion(suggestion_id, user_id, notes)
                results.append({"suggestion_id": suggestion_id, "status": "success"})
                successful += 1
            except Exception as e:
                results.append(
                    {"suggestion_id": suggestion_id, "status": "failed", "error": str(e)}
                )
                failed += 1

        return {
            "total_requested": len(suggestion_ids),
            "successful": successful,
            "failed": failed,
            "skipped": 0,
            "results": results,
        }

    def batch_reject_suggestions(
        self, suggestion_ids: List[int], user_id: int, notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rejette plusieurs suggestions en batch

        Args:
            suggestion_ids: Liste des IDs à rejeter
            user_id: ID utilisateur
            notes: Raison commune

        Returns:
            Dict avec résultats de l'opération
        """
        results = []
        successful = 0
        failed = 0

        for suggestion_id in suggestion_ids:
            try:
                self.reject_suggestion(suggestion_id, user_id, notes)
                results.append({"suggestion_id": suggestion_id, "status": "success"})
                successful += 1
            except Exception as e:
                results.append(
                    {"suggestion_id": suggestion_id, "status": "failed", "error": str(e)}
                )
                failed += 1

        return {
            "total_requested": len(suggestion_ids),
            "successful": successful,
            "failed": failed,
            "skipped": 0,
            "results": results,
        }

    # ======================
    # Preview & Entity Queries
    # ======================

    def preview_suggestion(self, suggestion_id: int) -> Dict[str, Any]:
        """
        Génère un aperçu des changements avant application

        Args:
            suggestion_id: ID de la suggestion

        Returns:
            {
                "current_data": {...},
                "proposed_changes": {...},
                "changes_summary": [...]
            }
        """
        suggestion = self.db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if not suggestion:
            raise ValueError("Suggestion non trouvée")

        # Récupérer l'entité actuelle
        current_data = {}
        proposed_changes = suggestion.suggestion_data
        changes_summary = []

        if suggestion.entity_type == "organisation":
            org = (
                self.db.query(Organisation).filter(Organisation.id == suggestion.entity_id).first()
            )
            if org:
                # Données actuelles
                current_data = {
                    "nom": org.nom,
                    "website": org.website,
                    "category": org.category,
                    "general_email": org.general_email,
                    "general_phone": org.general_phone,
                }

                # Analyser les changements
                for field, new_value in proposed_changes.items():
                    if field in current_data:
                        old_value = current_data[field]
                        if old_value != new_value:
                            change_type = "update" if old_value else "add"
                            changes_summary.append(
                                {
                                    "field": field,
                                    "from": old_value,
                                    "to": new_value,
                                    "type": change_type,
                                }
                            )

        # Impact assessment
        impact = f"{len(changes_summary)} champ(s) seront modifié(s)"

        return {
            "suggestion_id": suggestion_id,
            "entity_type": suggestion.entity_type,
            "entity_id": suggestion.entity_id,
            "current_data": current_data,
            "proposed_changes": proposed_changes,
            "changes_summary": changes_summary,
            "impact_assessment": impact,
        }

    def get_suggestions_for_entity(
        self, entity_type: str, entity_id: int, status: Optional[AISuggestionStatus] = None
    ) -> List[AISuggestion]:
        """
        Récupère toutes les suggestions pour une entité spécifique

        Args:
            entity_type: Type d'entité (organisation, person)
            entity_id: ID de l'entité
            status: Filtrer par statut (optionnel)

        Returns:
            Liste des suggestions
        """
        query = self.db.query(AISuggestion).filter(
            AISuggestion.entity_type == entity_type, AISuggestion.entity_id == entity_id
        )

        if status:
            query = query.filter(AISuggestion.status == status)

        return query.order_by(AISuggestion.created_at.desc()).all()

    def _apply_suggestion(self, suggestion: AISuggestion):
        """Applique une suggestion approuvée"""
        if suggestion.type == AISuggestionType.DATA_ENRICHMENT:
            self._apply_enrichment(suggestion)
        elif suggestion.type == AISuggestionType.DUPLICATE_DETECTION:
            self._apply_merge(suggestion)
        # Ajouter autres types...

    def _apply_enrichment(self, suggestion: AISuggestion):
        """Applique un enrichissement de données"""
        if suggestion.entity_type == "organisation":
            org = (
                self.db.query(Organisation).filter(Organisation.id == suggestion.entity_id).first()
            )
            if org:
                for field, value in suggestion.suggestion_data.items():
                    if hasattr(org, field):
                        setattr(org, field, value)
                self.db.commit()

    def _apply_merge(self, suggestion: AISuggestion):
        """Fusionne deux organisations doublons"""
        # TODO: Implémenter logique de fusion
        pass

    # ======================
    # Utilitaires
    # ======================

    def _log_execution(self, execution: AIExecution, level: str, message: str):
        """Ajoute un log à l'exécution"""
        if execution.execution_logs is None:
            execution.execution_logs = []

        execution.execution_logs.append(
            {
                "timestamp": datetime.now(UTC).isoformat(),
                "level": level,
                "message": message,
            }
        )

    def _create_execution(
        self,
        task_type: AITaskType,
        configuration_snapshot: Optional[Dict[str, Any]] = None,
    ) -> AIExecution:
        """
        Crée une nouvelle exécution

        Args:
            task_type: Type de tâche à exécuter
            configuration_snapshot: Snapshot de la configuration

        Returns:
            Exécution créée
        """
        execution = AIExecution(
            task_type=task_type,
            status="running",
            started_at=datetime.now(UTC),
            configuration_snapshot=configuration_snapshot or {},
            total_items_processed=0,
            successful_items=0,
            failed_items=0,
            estimated_cost_usd=0.0,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def _update_execution(
        self,
        execution_id: int,
        status: Optional[str] = None,
        total_items_processed: Optional[int] = None,
        successful_items: Optional[int] = None,
        failed_items: Optional[int] = None,
        estimated_cost_usd: Optional[float] = None,
        actual_cost_usd: Optional[float] = None,
        error_message: Optional[str] = None,
    ) -> AIExecution:
        """
        Met à jour une exécution

        Args:
            execution_id: ID de l'exécution
            status: Nouveau statut
            total_items_processed: Nombre total d'éléments traités
            successful_items: Nombre d'éléments réussis
            failed_items: Nombre d'échecs
            estimated_cost_usd: Coût estimé
            actual_cost_usd: Coût réel
            error_message: Message d'erreur

        Returns:
            Exécution mise à jour
        """
        execution = self.db.query(AIExecution).filter(AIExecution.id == execution_id).first()
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        if status is not None:
            execution.status = status
        if total_items_processed is not None:
            execution.total_items_processed = total_items_processed
        if successful_items is not None:
            execution.successful_items = successful_items
        if failed_items is not None:
            execution.failed_items = failed_items
        if estimated_cost_usd is not None:
            execution.estimated_cost_usd = estimated_cost_usd
        if actual_cost_usd is not None:
            execution.actual_cost_usd = actual_cost_usd
        if error_message is not None:
            execution.error_message = error_message

        # Si statut terminal, marquer comme complété
        if status in ["success", "failed", "cancelled"]:
            execution.completed_at = datetime.now(UTC)

        self.db.commit()
        self.db.refresh(execution)
        return execution

    def get_statistics(self) -> Dict[str, Any]:
        """Retourne les statistiques globales de l'agent IA"""
        total_suggestions = self.db.query(func.count(AISuggestion.id)).scalar()
        pending_suggestions = (
            self.db.query(func.count(AISuggestion.id))
            .filter(AISuggestion.status == AISuggestionStatus.PENDING)
            .scalar()
        )

        total_executions = self.db.query(func.count(AIExecution.id)).scalar()
        total_cost = self.db.query(func.sum(AIExecution.estimated_cost_usd)).scalar() or 0.0

        return {
            "total_suggestions": total_suggestions,
            "pending_suggestions": pending_suggestions,
            "total_executions": total_executions,
            "total_cost_usd": round(total_cost, 2),
            "config": {
                "provider": self.config.ai_provider.value if self.config else "none",
                "auto_apply_enabled": self.config.auto_apply_enabled if self.config else False,
            },
        }
