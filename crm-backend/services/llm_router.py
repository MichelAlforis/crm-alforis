"""
LLM Router préparatoire pour l'autofill.

Objectif:
- Utiliser Mistral comme fournisseur principal
- Prévoir un fallback contrôlé (ex: Anthropic) si latence/erreur
- Garantir un budget de latence < 800 ms

La mise en production réelle des appels LLM se fera dans une itération
ultérieure : pour l'instant, cette classe agit comme un garde-fou et
centralise la config.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from core.config import settings
from services.autofill_prompt_templates import build_llm_payload


@dataclass
class LLMResult:
    provider: str
    model: str
    payload: Optional[Dict[str, Any]]
    latency_ms: int
    used_fallback: bool
    error: Optional[str] = None


class LLMRouter:
    """
    Routeur LLM (Mistral → Fallback) - squelette.

    L'implémentation réseau sera branchée plus tard; cette classe
    encapsule simplement la configuration et fournit une interface
    unique pour déclencher un enrichissement LLM.
    """

    def __init__(
        self,
        *,
        latency_budget_ms: int = settings.llm_latency_budget_ms,
        request_timeout_ms: int = settings.llm_request_timeout_ms,
    ) -> None:
        self.primary_provider = settings.llm_primary_provider
        self.primary_model = settings.llm_primary_model
        self.fallback_provider = settings.llm_fallback_provider
        self.fallback_model = settings.llm_fallback_model
        self.latency_budget_ms = latency_budget_ms
        self.request_timeout_ms = request_timeout_ms

    async def generate_autofill_context(
        self,
        draft: Dict[str, Any],
        suggestions: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> LLMResult:
        """
        Génère des enrichissements additionnels via LLM.

        Pour l'instant, renvoie un résultat vide : l'appel réseau sera
        implémenté une fois les métriques stabilisées.
        """
        payload = build_llm_payload(
            raw_snippet=draft.get("raw_snippet", ""),
            primary_email=draft.get("primary_email", ""),
            name_hint=draft.get("name_hint"),
            phone_hint=draft.get("phone_hint"),
            organisation_hint=draft.get("organisation_hint"),
        )

        return LLMResult(
            provider=self.primary_provider,
            model=self.primary_model,
            payload=payload,
            latency_ms=0,
            used_fallback=False,
            error="llm_not_configured",
        )

    def describe(self) -> Dict[str, Any]:
        """Expose la configuration courante (debug/UI)."""
        return {
            "primary": {"provider": self.primary_provider, "model": self.primary_model},
            "fallback": {"provider": self.fallback_provider, "model": self.fallback_model},
            "latency_budget_ms": self.latency_budget_ms,
            "request_timeout_ms": self.request_timeout_ms,
        }
