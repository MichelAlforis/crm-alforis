"""
Service de détection d'intention d'emails avec IA
Détecte automatiquement l'intention d'un email: meeting_request, info_request, follow_up, etc.
"""
import time
import hashlib
import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from models import AIMemory
from services.ai_config_loader import get_ai_config_loader

logger = logging.getLogger(__name__)


INTENT_CATEGORIES = {
    "meeting_request": "Demande de rendez-vous ou réunion",
    "info_request": "Demande d'information ou de documentation",
    "follow_up": "Relance ou suivi d'un échange précédent",
    "introduction": "Présentation initiale / premier contact",
    "quotation_request": "Demande de devis ou proposition commerciale",
    "closing": "Signature / conclusion d'affaire",
    "complaint": "Réclamation ou signalement de problème",
    "thank_you": "Remerciement",
    "unsubscribe": "Demande de désabonnement",
    "other": "Autre intention"
}


class IntentDetectionService:
    """
    Service de détection d'intention d'emails
    Utilise la cascade IA: Ollama → Mistral → OpenAI → Claude
    """

    def __init__(self, db: Session):
        self.db = db
        self.config_loader = get_ai_config_loader(db)

    async def detect_intent(
        self,
        email_body: str,
        subject: Optional[str] = None,
        interaction_id: Optional[int] = None,
        team_id: int = 1
    ) -> Dict:
        """
        Détecte l'intention d'un email

        Args:
            email_body: Corps de l'email
            subject: Sujet de l'email (optionnel)
            interaction_id: ID de l'interaction CRM (optionnel)
            team_id: ID de l'équipe

        Returns:
            {
                "success": True,
                "intent": "meeting_request",
                "confidence": 0.89,
                "model_used": "mistral_small",
                "processing_time_ms": 450,
                "reasoning": "Le message contient une demande explicite de rendez-vous",
                "from_cache": False
            }
        """
        start_time = time.time()

        # Check cache
        cached = self._check_cache(email_body, subject, team_id)
        if cached:
            return cached

        # Build prompt
        prompt = self._build_prompt(email_body, subject)

        # Try cascade: Ollama → Mistral → OpenAI → Claude
        logger.info("🎯 Detecting intent...")

        result = await self._detect_with_ollama(prompt)
        if not result.get("success"):
            logger.info("🎯 Fallback to Mistral API...")
            result = await self._detect_with_mistral(prompt)

        if not result.get("success"):
            logger.info("🎯 Fallback to OpenAI...")
            result = await self._detect_with_openai(prompt)

        if not result.get("success"):
            logger.info("🎯 Fallback to Claude...")
            result = await self._detect_with_claude(prompt)

        processing_time_ms = int((time.time() - start_time) * 1000)

        if result.get("success"):
            # Save to cache
            self._save_to_cache(
                team_id=team_id,
                email_body=email_body,
                subject=subject,
                result=result,
                processing_time_ms=processing_time_ms,
                interaction_id=interaction_id
            )

            return {
                **result,
                "processing_time_ms": processing_time_ms,
                "from_cache": False
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "All AI providers failed"),
                "processing_time_ms": processing_time_ms
            }

    def _build_prompt(self, email_body: str, subject: Optional[str] = None) -> str:
        """Build prompt for intent detection"""
        categories_list = "\n".join([f"- {k}: {v}" for k, v in INTENT_CATEGORIES.items()])

        return f"""Analyse cet email et détecte son intention principale.

{'Sujet: ' + subject if subject else ''}

Email:
{email_body}

Catégories d'intention possibles:
{categories_list}

Réponds UNIQUEMENT au format JSON (sans markdown):
{{
  "intent": "meeting_request",
  "confidence": 0.89,
  "reasoning": "Le message contient une demande explicite de rendez-vous avec mention de disponibilités"
}}

La confiance (confidence) doit être entre 0.0 et 1.0.
Si aucune intention claire n'est détectée, utilise "other" avec une confiance basse."""

    async def _detect_with_ollama(self, prompt: str) -> Dict:
        """Detect intent with Ollama local (mistral)"""
        try:
            import httpx
            import json

            ollama_url = self.config_loader.get_ollama_url()
            if not ollama_url:
                return {"success": False, "error": "Ollama URL not configured"}

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": "mistral",
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    parsed = json.loads(data.get("response", "{}"))

                    return {
                        "success": True,
                        "intent": parsed.get("intent"),
                        "confidence": parsed.get("confidence", 0.0),
                        "reasoning": parsed.get("reasoning", ""),
                        "model_used": "ollama_mistral",
                        "provider": "ollama"
                    }
                else:
                    return {"success": False, "error": f"Ollama returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _detect_with_mistral(self, prompt: str) -> Dict:
        """Detect intent with Mistral API (EU hosted)"""
        try:
            import httpx
            import json

            mistral_api_key = self.config_loader.get_mistral_key()
            if not mistral_api_key:
                return {"success": False, "error": "Mistral API key not configured"}

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {mistral_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "mistral-small-latest",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"}
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)

                    logger.info(f"✅ Mistral API succeeded")

                    return {
                        "success": True,
                        "intent": parsed.get("intent"),
                        "confidence": parsed.get("confidence", 0.0),
                        "reasoning": parsed.get("reasoning", ""),
                        "model_used": "mistral_small",
                        "provider": "mistral"
                    }
                else:
                    return {"success": False, "error": f"Mistral returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _detect_with_openai(self, prompt: str) -> Dict:
        """Detect intent with OpenAI (gpt-4o-mini)"""
        try:
            import httpx
            import json

            openai_api_key = self.config_loader.get_openai_key()
            if not openai_api_key:
                return {"success": False, "error": "OpenAI API key not configured"}

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"}
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)

                    return {
                        "success": True,
                        "intent": parsed.get("intent"),
                        "confidence": parsed.get("confidence", 0.0),
                        "reasoning": parsed.get("reasoning", ""),
                        "model_used": "gpt-4o-mini",
                        "provider": "openai"
                    }
                else:
                    return {"success": False, "error": f"OpenAI returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _detect_with_claude(self, prompt: str) -> Dict:
        """Detect intent with Claude (Anthropic)"""
        try:
            import httpx
            import json

            claude_api_key = self.config_loader.get_anthropic_key()
            if not claude_api_key:
                return {"success": False, "error": "Claude API key not configured"}

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": claude_api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "claude-3-5-sonnet-20241022",
                        "max_tokens": 500,
                        "temperature": 0.3,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["content"][0]["text"]
                    # Extract JSON from markdown code block if present
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()

                    parsed = json.loads(content)

                    return {
                        "success": True,
                        "intent": parsed.get("intent"),
                        "confidence": parsed.get("confidence", 0.0),
                        "reasoning": parsed.get("reasoning", ""),
                        "model_used": "claude-3.5-sonnet",
                        "provider": "anthropic"
                    }
                else:
                    error_detail = response.text
                    logger.error(f"Claude API error {response.status_code}: {error_detail}")
                    return {"success": False, "error": f"Claude returned {response.status_code}: {error_detail[:100]}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _check_cache(self, email_body: str, subject: Optional[str], team_id: int) -> Optional[Dict]:
        """Check if we have a cached intent detection for this email"""
        cache_input = f"{subject or ''}\n{email_body}"
        prompt_hash = hashlib.sha256(cache_input.encode()).hexdigest()

        cached = self.db.query(AIMemory).filter(
            AIMemory.team_id == team_id,
            AIMemory.prompt_hash == prompt_hash,
            AIMemory.task_type == "intent_detection",
            AIMemory.success == True
        ).order_by(AIMemory.created_at.desc()).first()

        if cached:
            return {
                "success": True,
                "intent": cached.response_json.get("intent"),
                "confidence": cached.confidence_score,
                "reasoning": cached.response_json.get("reasoning", ""),
                "model_used": f"{cached.model_used} (cached)",
                "processing_time_ms": 0,
                "from_cache": True
            }

        return None

    def _save_to_cache(
        self,
        team_id: int,
        email_body: str,
        subject: Optional[str],
        result: Dict,
        processing_time_ms: int,
        interaction_id: Optional[int] = None
    ):
        """Save intent detection result to cache"""
        try:
            cache_input = f"{subject or ''}\n{email_body}"
            prompt_hash = hashlib.sha256(cache_input.encode()).hexdigest()

            memory = AIMemory(
                team_id=team_id,
                model_used=result.get("model_used", "unknown"),
                provider=result.get("provider", "unknown"),
                prompt_hash=prompt_hash,
                prompt_text=cache_input[:1000],
                response_json={
                    "intent": result.get("intent"),
                    "reasoning": result.get("reasoning", "")
                },
                confidence_score=result.get("confidence"),
                processing_time_ms=processing_time_ms,
                success=result.get("success", False),
                error_message=result.get("error"),
                task_type="intent_detection",
                source_email_id=interaction_id
            )

            self.db.add(memory)
            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to save intent detection to cache: {e}")
            self.db.rollback()
