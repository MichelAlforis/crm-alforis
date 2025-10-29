"""
SignatureParserService - AI Signature Extraction avec fallback intelligent

Architecture:
1. Ollama local (RGPD, gratuit) - mistral:7b-instruct
2. Mistral API EU (fallback payant mais RGPD)
3. OpenAI (fallback si Mistral down)
4. Claude (fallback ultime)

Confidence scoring:
- ≥ 0.92 + safe field (email/phone/website) → auto-apply
- < 0.92 → HITL validation required
"""

import hashlib
import json
import logging
import re
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from sqlalchemy.orm import Session

from core.config import settings
from models.ai_memory import AIMemory
from models.autofill_suggestion import AutofillSuggestion

logger = logging.getLogger("crm-api")


class SignatureParserService:
    """
    Service de parsing de signatures email avec IA multi-provider
    """

    # Regex pour validation des champs safe
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_REGEX = re.compile(r'^\+?[\d\s\.\-\(\)]{8,}$')
    URL_REGEX = re.compile(r'^https?://[^\s<>"{}|\\^`\[\]]+$')

    SAFE_FIELDS = {'email', 'phone', 'mobile', 'website', 'personal_email', 'personal_phone'}

    def __init__(self, db: Session):
        self.db = db

    async def parse_signature(
        self,
        email_body: str,
        team_id: int,
        email_id: Optional[int] = None,
        use_cache: bool = True
    ) -> Dict:
        """
        Parse signature from email body using AI with fallback chain.

        Returns:
        {
            "success": true,
            "data": {
                "name": "Jean Dupont",
                "first_name": "Jean",
                "last_name": "Dupont",
                "job_title": "Directeur Commercial",
                "company": "ACME Corp",
                "email": "jean@acme.fr",
                "phone": "+33 6 12 34 56 78",
                "website": "https://acme.fr"
            },
            "confidence": 0.95,
            "model_used": "ollama_mistral:7b-instruct",
            "processing_time_ms": 234
        }
        """
        start_time = time.time()

        # 1. Check cache
        if use_cache:
            cached = self._check_cache(email_body, team_id)
            if cached:
                logger.info(f"✅ Cache hit for signature parsing")
                return cached

        # 2. Extract signature zone (heuristic)
        signature_text = self._extract_signature_zone(email_body)

        if not signature_text or len(signature_text) < 10:
            return {
                "success": False,
                "error": "No signature found in email body",
                "model_used": "heuristic",
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }

        # 3. Try AI providers in order
        result = None

        # Try Ollama local first
        try:
            logger.info("🤖 Trying Ollama local...")
            result = await self._parse_with_ollama(signature_text)
            if result and result.get("success"):
                logger.info("✅ Ollama succeeded")
        except Exception as e:
            logger.warning(f"⚠️ Ollama failed: {e}")

        # Fallback to Mistral API (EU)
        if not result or not result.get("success"):
            try:
                logger.info("🤖 Fallback to Mistral API EU...")
                result = await self._parse_with_mistral(signature_text)
                if result and result.get("success"):
                    logger.info("✅ Mistral API succeeded")
            except Exception as e:
                logger.warning(f"⚠️ Mistral API failed: {e}")

        # Fallback to OpenAI
        if not result or not result.get("success"):
            try:
                logger.info("🤖 Fallback to OpenAI...")
                result = await self._parse_with_openai(signature_text)
                if result and result.get("success"):
                    logger.info("✅ OpenAI succeeded")
            except Exception as e:
                logger.warning(f"⚠️ OpenAI failed: {e}")

        # Fallback to Claude (ultimate)
        if not result or not result.get("success"):
            try:
                logger.info("🤖 Fallback to Claude...")
                result = await self._parse_with_claude(signature_text)
                if result and result.get("success"):
                    logger.info("✅ Claude succeeded")
            except Exception as e:
                logger.warning(f"❌ Claude failed: {e}")
                result = {
                    "success": False,
                    "error": "All AI providers failed",
                    "model_used": "none"
                }

        # 4. Validate and score confidence
        if result.get("success"):
            result["data"] = self._validate_fields(result.get("data", {}))
            result["confidence"] = self._calculate_confidence(result.get("data", {}), signature_text)

        # 5. Save to cache
        processing_time_ms = int((time.time() - start_time) * 1000)
        result["processing_time_ms"] = processing_time_ms

        self._save_to_cache(
            team_id=team_id,
            email_body=email_body,
            result=result,
            processing_time_ms=processing_time_ms,
            email_id=email_id
        )

        return result

    def _extract_signature_zone(self, email_body: str) -> str:
        """
        Heuristic to extract signature from email body.
        Looks for common patterns: "Cordialement", "Best regards", etc.
        """
        if not email_body:
            return ""

        # Common signature markers
        markers = [
            "cordialement", "bien cordialement", "sincèrement",
            "regards", "best regards", "kind regards",
            "À bientôt", "a bientot", "à très bientôt",
            "merci", "thanks", "thank you",
            "cdlt", "cdt"
        ]

        body_lower = email_body.lower()

        # Find last occurrence of any marker
        last_marker_pos = -1
        for marker in markers:
            pos = body_lower.rfind(marker)
            if pos > last_marker_pos:
                last_marker_pos = pos

        if last_marker_pos == -1:
            # No marker found, try to get last 500 chars
            return email_body[-500:] if len(email_body) > 500 else email_body

        # Extract from marker to end (usually signature is after marker)
        signature = email_body[last_marker_pos:]

        # Limit to reasonable size (signatures are usually < 500 chars)
        return signature[:500] if len(signature) > 500 else signature

    async def _parse_with_ollama(self, signature_text: str) -> Dict:
        """Parse with Ollama local (mistral:7b-instruct)"""
        try:
            import httpx

            prompt = self._build_prompt(signature_text)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": "mistral:7b-instruct",
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
                        "data": parsed,
                        "model_used": "ollama_mistral:7b-instruct",
                        "provider": "ollama"
                    }
                else:
                    return {"success": False, "error": f"Ollama returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _parse_with_mistral(self, signature_text: str) -> Dict:
        """Parse with Mistral API (EU hosted)"""
        try:
            import httpx

            mistral_api_key = getattr(settings, 'MISTRAL_API_KEY', None)
            if not mistral_api_key:
                return {"success": False, "error": "MISTRAL_API_KEY not configured"}

            prompt = self._build_prompt(signature_text)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {mistral_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "mistral-small-latest",
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)

                    return {
                        "success": True,
                        "data": parsed,
                        "model_used": "mistral_small",
                        "provider": "mistral_api"
                    }
                else:
                    return {"success": False, "error": f"Mistral API returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _parse_with_openai(self, signature_text: str) -> Dict:
        """Parse with OpenAI GPT-4"""
        try:
            import httpx

            openai_api_key = getattr(settings, 'OPENAI_API_KEY', None)
            if not openai_api_key:
                return {"success": False, "error": "OPENAI_API_KEY not configured"}

            prompt = self._build_prompt(signature_text)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)

                    return {
                        "success": True,
                        "data": parsed,
                        "model_used": "gpt-4o-mini",
                        "provider": "openai"
                    }
                else:
                    return {"success": False, "error": f"OpenAI returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _parse_with_claude(self, signature_text: str) -> Dict:
        """Parse with Claude (Anthropic)"""
        try:
            import httpx

            claude_api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
            if not claude_api_key:
                return {"success": False, "error": "ANTHROPIC_API_KEY not configured"}

            prompt = self._build_prompt(signature_text)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": claude_api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["content"][0]["text"]

                    # Extract JSON from Claude's response (might have markdown)
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        parsed = json.loads(json_match.group())
                    else:
                        parsed = json.loads(content)

                    return {
                        "success": True,
                        "data": parsed,
                        "model_used": "claude-3-haiku",
                        "provider": "anthropic"
                    }
                else:
                    return {"success": False, "error": f"Claude returned {response.status_code}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _build_prompt(self, signature_text: str) -> str:
        """Build prompt for AI models"""
        return f"""Extract contact information from this email signature.
Return ONLY valid JSON with these fields (set to null if not found):

{{
  "name": "Full name",
  "first_name": "First name",
  "last_name": "Last name",
  "job_title": "Job title",
  "company": "Company name",
  "email": "email@example.com",
  "phone": "phone number",
  "mobile": "mobile number",
  "website": "https://example.com"
}}

Signature text:
{signature_text}

JSON output:"""

    def _validate_fields(self, data: Dict) -> Dict:
        """Validate and clean extracted fields"""
        validated = {}

        # Email validation
        if data.get("email"):
            email = data["email"].strip()
            if self.EMAIL_REGEX.match(email):
                validated["email"] = email

        # Phone validation
        for field in ["phone", "mobile"]:
            if data.get(field):
                phone = data[field].strip()
                if self.PHONE_REGEX.match(phone):
                    validated[field] = phone

        # URL validation
        if data.get("website"):
            url = data["website"].strip()
            if self.URL_REGEX.match(url):
                validated["website"] = url

        # Text fields (no validation, just strip)
        text_fields = ["name", "first_name", "last_name", "job_title", "company"]
        for field in text_fields:
            if data.get(field):
                validated[field] = data[field].strip()

        return validated

    def _calculate_confidence(self, data: Dict, signature_text: str) -> float:
        """
        Calculate confidence score based on:
        - Number of fields found
        - Field validation success
        - Presence in original text
        """
        if not data:
            return 0.0

        score = 0.0
        max_score = 0.0

        # Weights per field
        weights = {
            "name": 0.15,
            "first_name": 0.10,
            "last_name": 0.10,
            "job_title": 0.15,
            "company": 0.15,
            "email": 0.20,
            "phone": 0.10,
            "mobile": 0.10,
            "website": 0.05
        }

        signature_lower = signature_text.lower()

        for field, weight in weights.items():
            max_score += weight

            if field in data and data[field]:
                value = str(data[field]).lower()

                # Check if value appears in signature
                if value in signature_lower:
                    score += weight
                else:
                    # Partial credit if not exact match
                    score += weight * 0.5

        confidence = score / max_score if max_score > 0 else 0.0
        return round(confidence, 3)

    def _check_cache(self, email_body: str, team_id: int) -> Optional[Dict]:
        """Check if we have a cached result for this prompt"""
        prompt_hash = hashlib.sha256(email_body.encode()).hexdigest()

        cached = self.db.query(AIMemory).filter(
            AIMemory.team_id == team_id,
            AIMemory.prompt_hash == prompt_hash,
            AIMemory.task_type == "signature_parse",
            AIMemory.success == True
        ).order_by(AIMemory.created_at.desc()).first()

        if cached:
            return {
                "success": True,
                "data": cached.response_json.get("data", {}),
                "confidence": cached.confidence_score,
                "model_used": f"{cached.model_used} (cached)",
                "processing_time_ms": 0,
                "from_cache": True
            }

        return None

    def _save_to_cache(
        self,
        team_id: int,
        email_body: str,
        result: Dict,
        processing_time_ms: int,
        email_id: Optional[int] = None
    ):
        """Save result to cache for future use"""
        try:
            prompt_hash = hashlib.sha256(email_body.encode()).hexdigest()

            memory = AIMemory(
                team_id=team_id,
                model_used=result.get("model_used", "unknown"),
                provider=result.get("provider", "unknown"),
                prompt_hash=prompt_hash,
                prompt_text=email_body[:1000],  # Truncate for storage
                response_json=result.get("data", {}),
                confidence_score=result.get("confidence"),
                processing_time_ms=processing_time_ms,
                success=result.get("success", False),
                error_message=result.get("error"),
                task_type="signature_parse",
                source_email_id=email_id
            )

            self.db.add(memory)
            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to save AI memory: {e}")
            self.db.rollback()
