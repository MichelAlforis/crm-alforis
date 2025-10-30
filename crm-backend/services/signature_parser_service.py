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
import os
import re
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from sqlalchemy.orm import Session

from core.config import settings
from models.ai_memory import AIMemory
from models.autofill_suggestion import AutofillSuggestion
from services.ai_config_loader import get_ai_config_loader

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
        self.config_loader = get_ai_config_loader(db)

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

        # 2.5. 🌐 Web enrichment (Acte V): Try to get company context
        web_context = None
        if os.getenv("AUTOFILL_USE_WEB_ENRICHMENT", "true").lower() == "true":
            try:
                web_context = await self._get_web_context(signature_text)
                if web_context and web_context.get("confidence", 0) > 0.5:
                    logger.info(f"🌐 Web context found with confidence {web_context.get('confidence'):.2f}")
            except Exception as e:
                logger.warning(f"⚠️ Web enrichment failed (non-blocking): {e}")

        # 3. Try AI providers in order
        result = None

        # Try Ollama local first
        try:
            logger.info("🤖 Trying Ollama local...")
            result = await self._parse_with_ollama(signature_text, web_context)
            if result and result.get("success"):
                logger.info("✅ Ollama succeeded")
        except Exception as e:
            logger.warning(f"⚠️ Ollama failed: {e}")

        # Fallback to Mistral API (EU)
        if not result or not result.get("success"):
            try:
                logger.info("🤖 Fallback to Mistral API EU...")
                result = await self._parse_with_mistral(signature_text, web_context)
                if result and result.get("success"):
                    logger.info("✅ Mistral API succeeded")
            except Exception as e:
                logger.warning(f"⚠️ Mistral API failed: {e}")

        # Fallback to OpenAI
        if not result or not result.get("success"):
            try:
                logger.info("🤖 Fallback to OpenAI...")
                result = await self._parse_with_openai(signature_text, web_context)
                if result and result.get("success"):
                    logger.info("✅ OpenAI succeeded")
            except Exception as e:
                logger.warning(f"⚠️ OpenAI failed: {e}")

        # Fallback to Claude (ultimate)
        if not result or not result.get("success"):
            try:
                logger.info("🤖 Fallback to Claude...")
                result = await self._parse_with_claude(signature_text, web_context)
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

    async def _get_web_context(self, signature_text: str) -> Optional[Dict]:
        """
        🌐 Get web enrichment context for the signature (Acte V).

        Tries to extract company name and enrich it via web search.
        Returns None if enrichment fails (graceful degradation).
        """
        try:
            # Extract potential company name using simple heuristics
            # Look for lines with multiple capital letters (likely company names)
            lines = signature_text.strip().split('\n')
            company_name = None

            for line in lines:
                line = line.strip()
                # Skip common signature markers
                if any(marker in line.lower() for marker in ['cordialement', 'regards', 'merci', 'thanks']):
                    continue
                # Look for words with capital letters (company names often capitalized)
                if len(line) > 3 and any(c.isupper() for c in line):
                    # Skip if it looks like a person name (First Last)
                    words = line.split()
                    if len(words) == 2 and all(w[0].isupper() and w[1:].islower() for w in words if w):
                        continue  # Likely a person name, not company
                    # This could be a company
                    company_name = line
                    break

            if not company_name:
                return None

            # Call enrichment service
            from services.web_enrichment_service import get_enrichment_service
            enrichment_service = get_enrichment_service()

            result = enrichment_service.enrich_organisation(
                name=company_name,
                country="FR",  # Default to France, could be smarter
                force_refresh=False
            )

            if result and result.get("confidence", 0) > 0.3:
                logger.info(f"🌐 Web context found for '{company_name}': {result.get('website')}")
                return result

            return None

        except Exception as e:
            logger.warning(f"⚠️ Failed to get web context: {e}")
            return None

    async def _parse_with_ollama(self, signature_text: str, web_context: Optional[Dict] = None) -> Dict:
        """Parse with Ollama local (mistral:7b-instruct)"""
        try:
            import httpx

            ollama_url = self.config_loader.get_ollama_url()
            if not ollama_url:
                return {"success": False, "error": "Ollama URL not configured"}

            prompt = self._build_prompt(signature_text, web_context)

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": "mistral",  # or "mistral:latest"
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

    async def _parse_with_mistral(self, signature_text: str, web_context: Optional[Dict] = None) -> Dict:
        """Parse with Mistral API (EU hosted)"""
        try:
            import httpx

            mistral_api_key = self.config_loader.get_mistral_key()
            if not mistral_api_key:
                return {"success": False, "error": "MISTRAL_API_KEY not configured"}

            prompt = self._build_prompt(signature_text, web_context)

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

    async def _parse_with_openai(self, signature_text: str, web_context: Optional[Dict] = None) -> Dict:
        """Parse with OpenAI GPT-4"""
        try:
            import httpx

            openai_api_key = self.config_loader.get_openai_key()
            if not openai_api_key:
                return {"success": False, "error": "OPENAI_API_KEY not configured"}

            prompt = self._build_prompt(signature_text, web_context)

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

    async def _parse_with_claude(self, signature_text: str, web_context: Optional[Dict] = None) -> Dict:
        """Parse with Claude (Anthropic)"""
        try:
            import httpx

            claude_api_key = self.config_loader.get_anthropic_key()
            if not claude_api_key:
                return {"success": False, "error": "ANTHROPIC_API_KEY not configured"}

            prompt = self._build_prompt(signature_text, web_context)

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
                    error_detail = response.text
                    logger.error(f"Claude API error {response.status_code}: {error_detail}")
                    return {"success": False, "error": f"Claude returned {response.status_code}: {error_detail[:100]}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _build_prompt(self, signature_text: str, web_context: Optional[Dict] = None) -> str:
        """
        Build prompt for AI models with optional web enrichment context.

        Args:
            signature_text: Email signature to parse
            web_context: Optional enrichment data from web search
        """

        # Base instruction
        prompt = """Extract contact information from this email signature.
Return ONLY valid JSON with these fields (set to null if not found):

{
  "name": "Full name",
  "first_name": "First name",
  "last_name": "Last name",
  "job_title": "Job title",
  "company": "Company name",
  "email": "email@example.com",
  "phone": "phone number",
  "mobile": "mobile number",
  "website": "https://example.com",
  "address": "Full address",
  "linkedin": "LinkedIn URL"
}

"""

        # Add web enrichment context if available (Acte V)
        if web_context and web_context.get("confidence", 0) > 0.5:
            prompt += f"""🌐 WEB ENRICHMENT CONTEXT (confidence: {web_context.get('confidence', 0):.2f}):
The following information was found about the company mentioned in the signature:
- Website: {web_context.get('website') or 'not found'}
- Address: {web_context.get('address') or 'not found'}
- Phone: {web_context.get('phone') or 'not found'}
- LinkedIn: {web_context.get('linkedin') or 'not found'}

Use this context to fill missing fields or validate your extraction.
If the signature is incomplete, use web context data when it makes sense.

"""

        # Few-shot examples (3 FR + 2 EN)
        prompt += """EXAMPLES:

Example 1 (French):
Signature: "Cordialement,\\nMarie Dubois\\nResponsable Marketing\\nTechCorp France\\n+33 1 23 45 67 89\\nmarie.dubois@techcorp.fr"
Output: {"name": "Marie Dubois", "first_name": "Marie", "last_name": "Dubois", "job_title": "Responsable Marketing", "company": "TechCorp France", "phone": "+33 1 23 45 67 89", "email": "marie.dubois@techcorp.fr"}

Example 2 (French):
Signature: "Bien à vous,\\nPierre Martin\\nDirecteur Général\\nACME SAS\\n06 12 34 56 78\\nwww.acme.fr"
Output: {"name": "Pierre Martin", "first_name": "Pierre", "last_name": "Martin", "job_title": "Directeur Général", "company": "ACME SAS", "mobile": "06 12 34 56 78", "website": "https://www.acme.fr"}

Example 3 (French with address):
Signature: "Cordialement,\\nSophie Laurent\\nChargée de clientèle\\nBanque Populaire\\n15 rue de Rivoli, 75001 Paris\\nsophie.laurent@bp.fr\\n01 42 86 00 00"
Output: {"name": "Sophie Laurent", "first_name": "Sophie", "last_name": "Laurent", "job_title": "Chargée de clientèle", "company": "Banque Populaire", "address": "15 rue de Rivoli, 75001 Paris", "email": "sophie.laurent@bp.fr", "phone": "01 42 86 00 00"}

Example 4 (English):
Signature: "Best regards,\\nJohn Smith\\nSales Manager\\nGlobal Solutions Inc.\\njohn.smith@globalsolutions.com\\n+1 555-123-4567"
Output: {"name": "John Smith", "first_name": "John", "last_name": "Smith", "job_title": "Sales Manager", "company": "Global Solutions Inc.", "email": "john.smith@globalsolutions.com", "phone": "+1 555-123-4567"}

Example 5 (English with LinkedIn):
Signature: "Kind regards,\\nEmily Johnson\\nCEO & Founder\\nStartup Ventures\\nlinkedin.com/in/emilyjohnson\\nemily@startupventures.io"
Output: {"name": "Emily Johnson", "first_name": "Emily", "last_name": "Johnson", "job_title": "CEO & Founder", "company": "Startup Ventures", "linkedin": "https://linkedin.com/in/emilyjohnson", "email": "emily@startupventures.io"}

"""

        # Actual signature to parse
        prompt += f"""Now extract from this signature:

Signature text:
{signature_text}

JSON output:"""

        return prompt

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

        # URL validation (website, linkedin)
        for field in ["website", "linkedin"]:
            if data.get(field):
                url = data[field].strip()
                # Add https:// if missing
                if not url.startswith("http"):
                    url = "https://" + url
                if self.URL_REGEX.match(url):
                    validated[field] = url

        # Text fields (no validation, just strip)
        text_fields = ["name", "first_name", "last_name", "job_title", "company", "address"]
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

        # Weights per field (Acte V: added address, linkedin)
        weights = {
            "name": 0.12,
            "first_name": 0.08,
            "last_name": 0.08,
            "job_title": 0.12,
            "company": 0.15,
            "email": 0.20,
            "phone": 0.08,
            "mobile": 0.08,
            "website": 0.04,
            "address": 0.03,
            "linkedin": 0.02
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
                "data": cached.response_json,  # response_json already contains the data dict
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
