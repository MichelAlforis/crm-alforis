"""
Routeur LLM avec fallback multi-fournisseurs.

L'objectif est de sélectionner dynamiquement le premier fournisseur
disponible dans l'ordre défini par la configuration puis d'appliquer
une cascade de repli en cas d'erreur réseau, de timeout ou de quota.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence

import httpx
from anthropic import AsyncAnthropic, APIStatusError as AnthropicAPIStatusError
from openai import AsyncOpenAI

try:  # Compatibilité entre versions du SDK OpenAI
    from openai.error import APIError as OpenAIApiError
    from openai.error import RateLimitError as OpenAIRateLimitError
except Exception:  # pragma: no cover - fallback pour nouveau namespace
    from openai import APIError as OpenAIApiError  # type: ignore[attr-defined]
    from openai import RateLimitError as OpenAIRateLimitError  # type: ignore[attr-defined]

from core.config import settings
from services.autofill_prompt_templates import build_llm_payload


# =========================
# Exceptions / helpers
# =========================


class ProviderError(Exception):
    """Erreur générique côté fournisseur."""


class ProviderTransientError(ProviderError):
    """Erreur transitoire (timeout, 5xx, rate limit)."""


class ProviderHardError(ProviderError):
    """Erreur définitive (401, 403, mauvaise configuration)."""


def _json_dumps_sorted(value: Any) -> str:
    """Serialise un payload en JSON trié pour hashing."""
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


# =========================
# Dataclasses
# =========================


@dataclass
class ProviderResponse:
    provider: str
    model: str
    content: str
    latency_ms: int
    tokens_in: int = 0
    tokens_out: int = 0
    cost_eur: float = 0.0
    raw: Dict[str, Any] | None = None
    cached: bool = False


@dataclass
class LLMResult:
    provider: Optional[str]
    model: Optional[str]
    payload: Optional[Dict[str, Any]]
    content: Optional[str]
    latency_ms: int
    used_fallback: bool
    tokens_in: int = 0
    tokens_out: int = 0
    cost_eur: float = 0.0
    cached: bool = False
    error: Optional[str] = None
    retries: int = 0
    payload_hash: Optional[str] = None


@dataclass
class ProviderState:
    failures: int = 0
    blocked_until: float = 0.0

    def mark_failure(self, cooldown_seconds: int) -> None:
        self.failures += 1
        self.blocked_until = time.monotonic() + cooldown_seconds

    def reset(self) -> None:
        self.failures = 0
        self.blocked_until = 0.0

    def is_blocked(self) -> bool:
        return self.blocked_until > time.monotonic()


# =========================
# Provider clients
# =========================


class BaseProviderClient:
    name: str

    def __init__(self, *, timeout_ms: int) -> None:
        self.timeout_ms = timeout_ms

    def is_available(self) -> bool:
        raise NotImplementedError

    async def generate(self, payload: Dict[str, Any]) -> ProviderResponse:
        raise NotImplementedError


class MistralProviderClient(BaseProviderClient):
    name = "mistral"

    def __init__(self, *, timeout_ms: int):
        super().__init__(timeout_ms=timeout_ms)
        self.api_key = settings.mistral_api_key
        self.base_url = settings.mistral_api_base.rstrip("/")
        self.model = settings.llm_primary_model

    def is_available(self) -> bool:
        return bool(self.api_key) and bool(self.model)

    async def generate(self, payload: Dict[str, Any]) -> ProviderResponse:
        url = f"{self.base_url}/v1/chat/completions"
        timeout = httpx.Timeout(self.timeout_ms / 1000, connect=self.timeout_ms / 1000)
        started = time.monotonic()

        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={"model": self.model, **payload},
                )
            except httpx.TimeoutException as exc:
                raise ProviderTransientError("mistral_timeout") from exc
            except httpx.HTTPError as exc:
                raise ProviderTransientError("mistral_http_error") from exc

        if response.status_code == 401:
            raise ProviderHardError("mistral_unauthorized")
        if response.status_code == 403:
            raise ProviderHardError("mistral_forbidden")
        if response.status_code >= 500:
            raise ProviderTransientError(f"mistral_{response.status_code}")

        data = response.json()
        message = (data.get("choices") or [{}])[0].get("message", {})
        content = message.get("content", "")
        usage = data.get("usage", {})

        latency_ms = int((time.monotonic() - started) * 1000)
        return ProviderResponse(
            provider=self.name,
            model=self.model,
            content=content,
            latency_ms=latency_ms,
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
            raw=data,
        )


class OpenAIProviderClient(BaseProviderClient):
    name = "openai"

    def __init__(self, *, timeout_ms: int):
        super().__init__(timeout_ms=timeout_ms)
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.client: Optional[AsyncOpenAI] = None

    def is_available(self) -> bool:
        return bool(self.api_key) and bool(self.model)

    def _ensure_client(self) -> AsyncOpenAI:
        if self.client is None:
            self.client = AsyncOpenAI(api_key=self.api_key, timeout=self.timeout_ms / 1000)
        return self.client

    async def generate(self, payload: Dict[str, Any]) -> ProviderResponse:
        client = self._ensure_client()
        started = time.monotonic()

        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=payload["messages"],
                temperature=0.2,
                max_tokens=settings.openai_max_tokens,
            )
        except (OpenAIRateLimitError, OpenAIApiError) as exc:
            if getattr(exc, "status_code", 500) in (401, 403):
                raise ProviderHardError("openai_auth_error") from exc
            raise ProviderTransientError("openai_api_error") from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise ProviderTransientError("openai_unknown_error") from exc

        choice = (response.choices or [None])[0]
        content = ""
        if choice and choice.message:
            content = choice.message.content or ""

        usage = getattr(response, "usage", None) or {}
        latency_ms = int((time.monotonic() - started) * 1000)

        return ProviderResponse(
            provider=self.name,
            model=self.model,
            content=content,
            latency_ms=latency_ms,
            tokens_in=getattr(usage, "prompt_tokens", 0) or usage.get("prompt_tokens", 0),
            tokens_out=getattr(usage, "completion_tokens", 0)
            or usage.get("completion_tokens", 0),
            raw=response.model_dump() if hasattr(response, "model_dump") else response,  # type: ignore[arg-type]
        )


class AnthropicProviderClient(BaseProviderClient):
    name = "anthropic"

    def __init__(self, *, timeout_ms: int):
        super().__init__(timeout_ms=timeout_ms)
        self.api_key = settings.anthropic_api_key
        self.model = settings.anthropic_model
        self.client: Optional[AsyncAnthropic] = None

    def is_available(self) -> bool:
        return bool(self.api_key) and bool(self.model)

    def _ensure_client(self) -> AsyncAnthropic:
        if self.client is None:
            self.client = AsyncAnthropic(api_key=self.api_key, timeout=self.timeout_ms / 1000)
        return self.client

    async def generate(self, payload: Dict[str, Any]) -> ProviderResponse:
        client = self._ensure_client()
        started = time.monotonic()

        try:
            response = await client.messages.create(
                model=self.model,
                max_tokens=settings.anthropic_max_tokens,
                temperature=0.2,
                messages=payload["messages"],
            )
        except AnthropicAPIStatusError as exc:
            status = getattr(exc, "status_code", 500)
            if status in (401, 403):
                raise ProviderHardError("anthropic_auth_error") from exc
            if status in (429, 500, 502, 503):
                raise ProviderTransientError(f"anthropic_{status}") from exc
            raise ProviderTransientError("anthropic_api_error") from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise ProviderTransientError("anthropic_unknown_error") from exc

        latency_ms = int((time.monotonic() - started) * 1000)
        content = ""
        if response.content:
            first_block = response.content[0]
            content = getattr(first_block, "text", "") or first_block.get("text", "")

        usage = getattr(response, "usage", None) or {}
        tokens_in = getattr(usage, "input_tokens", 0) or usage.get("input_tokens", 0)
        tokens_out = getattr(usage, "output_tokens", 0) or usage.get("output_tokens", 0)

        return ProviderResponse(
            provider=self.name,
            model=self.model,
            content=content,
            latency_ms=latency_ms,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            raw=response.model_dump() if hasattr(response, "model_dump") else response,  # type: ignore[arg-type]
        )


class OllamaProviderClient(BaseProviderClient):
    name = "ollama"

    def __init__(self, *, timeout_ms: int):
        super().__init__(timeout_ms=timeout_ms)
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    def is_available(self) -> bool:
        return bool(self.base_url) and bool(self.model)

    async def generate(self, payload: Dict[str, Any]) -> ProviderResponse:
        url = f"{self.base_url}/api/chat"
        timeout = httpx.Timeout(self.timeout_ms / 1000, connect=self.timeout_ms / 1000)
        started = time.monotonic()

        formatted_messages = [
            {"role": msg["role"], "content": msg["content"]} for msg in payload["messages"]
        ]
        body = {"model": self.model, "messages": formatted_messages, "stream": False}

        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(url, json=body)
            except httpx.TimeoutException as exc:
                raise ProviderTransientError("ollama_timeout") from exc
            except httpx.HTTPError as exc:
                raise ProviderTransientError("ollama_http_error") from exc

        if response.status_code == 404:
            raise ProviderHardError("ollama_model_not_found")
        if response.status_code >= 500:
            raise ProviderTransientError(f"ollama_{response.status_code}")

        data = response.json()
        message = data.get("message", {}) if isinstance(data, dict) else {}
        content = message.get("content") if isinstance(message, dict) else ""
        latency_ms = int((time.monotonic() - started) * 1000)

        return ProviderResponse(
            provider=self.name,
            model=self.model,
            content=content or "",
            latency_ms=latency_ms,
            raw=data if isinstance(data, dict) else None,
        )


class NullProviderClient(BaseProviderClient):
    name = "other"

    def is_available(self) -> bool:
        return False

    async def generate(self, payload: Dict[str, Any]) -> ProviderResponse:
        raise ProviderHardError("no_custom_provider")


# =========================
# Router
# =========================


class LLMRouter:
    """Sélection et fallback automatique des fournisseurs LLM."""

    def __init__(
        self,
        *,
        latency_budget_ms: int = settings.llm_latency_budget_ms,
        request_timeout_ms: int = settings.llm_request_timeout_ms,
    ) -> None:
        self.latency_budget_ms = latency_budget_ms
        self.request_timeout_ms = request_timeout_ms
        self.providers = self._initialise_providers()
        self.provider_states: Dict[str, ProviderState] = {
            name: ProviderState() for name in self.providers
        }
        self.cache_ttl_seconds = settings.llm_cache_ttl_seconds
        self.cost_cap_eur = settings.llm_cost_cap_eur
        self.max_retries = settings.llm_max_retries
        self.circuit_break_threshold = settings.llm_circuit_breaker_threshold
        self.circuit_break_cooldown = settings.llm_circuit_breaker_cooldown_seconds
        self._cache: Dict[str, ProviderResponse] = {}

    # -------- Provider bootstrap --------

    def _initialise_providers(self) -> Dict[str, BaseProviderClient]:
        timeout_ms = settings.llm_timeout_ms or self.request_timeout_ms
        return {
            "mistral": MistralProviderClient(timeout_ms=timeout_ms),
            "openai": OpenAIProviderClient(timeout_ms=timeout_ms),
            "anthropic": AnthropicProviderClient(timeout_ms=timeout_ms),
            "ollama": OllamaProviderClient(timeout_ms=timeout_ms),
            "other": NullProviderClient(timeout_ms=timeout_ms),
        }

    def _provider_order(self) -> Sequence[str]:
        forced_primary = settings.llm_primary_provider or "auto"
        forced_secondary = settings.llm_secondary_provider or "auto"
        configured_order = [
            name.strip()
            for name in (settings.llm_provider_order or "").split(",")
            if name.strip()
        ]

        order: List[str] = []

        def append_if_valid(name: str) -> None:
            if name in self.providers and name not in order:
                order.append(name)

        if forced_primary != "auto":
            append_if_valid(forced_primary)
        if forced_secondary != "auto":
            append_if_valid(forced_secondary)

        for name in configured_order or ["mistral", "openai", "anthropic", "ollama", "other"]:
            append_if_valid(name)

        return order

    def describe(self) -> Dict[str, Any]:
        """Expose la configuration courante (debug/UI)."""
        return {
            "order": list(self._provider_order()),
            "latency_budget_ms": self.latency_budget_ms,
            "request_timeout_ms": self.request_timeout_ms,
            "cache_ttl_seconds": self.cache_ttl_seconds,
            "cost_cap_eur": self.cost_cap_eur,
            "max_retries": self.max_retries,
        }

    # -------- Cache helpers --------

    def _cache_key(self, payload: Dict[str, Any]) -> str:
        digest = hashlib.sha256(_json_dumps_sorted(payload).encode("utf-8")).hexdigest()
        return digest

    def _get_from_cache(self, key: str) -> Optional[ProviderResponse]:
        entry = self._cache.get(key)
        if not entry:
            return None
        ttl_expires = entry.raw.get("_cached_until") if isinstance(entry.raw, dict) else None
        if ttl_expires and ttl_expires < time.monotonic():
            self._cache.pop(key, None)
            return None
        return entry

    def _store_in_cache(self, key: str, response: ProviderResponse) -> None:
        if self.cache_ttl_seconds <= 0:
            return
        expiry = time.monotonic() + self.cache_ttl_seconds
        if isinstance(response.raw, dict):
            raw = dict(response.raw)
        else:
            raw = {}
        raw["_cached_until"] = expiry
        cached_response = ProviderResponse(
            provider=response.provider,
            model=response.model,
            content=response.content,
            latency_ms=response.latency_ms,
            tokens_in=response.tokens_in,
            tokens_out=response.tokens_out,
            cost_eur=response.cost_eur,
            raw=raw,
            cached=True,
        )
        self._cache[key] = cached_response

    # -------- Provider selection --------

    def _eligible_providers(self) -> Iterable[str]:
        for name in self._provider_order():
            provider = self.providers[name]
            state = self.provider_states[name]

            if state.is_blocked():
                continue
            if not provider.is_available():
                continue
            yield name

    def _register_failure(self, name: str) -> None:
        state = self.provider_states[name]
        state.mark_failure(self.circuit_break_cooldown)
        if state.failures >= self.circuit_break_threshold:
            state.blocked_until = time.monotonic() + self.circuit_break_cooldown

    def _register_success(self, name: str) -> None:
        self.provider_states[name].reset()

    # -------- Public API --------

    async def generate_autofill_context(
        self,
        draft: Dict[str, Any],
        suggestions: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> LLMResult:
        """
        Lance la génération LLM avec fallback automatique.
        """
        payload = build_llm_payload(
            raw_snippet=draft.get("raw_snippet", ""),
            primary_email=draft.get("primary_email", draft.get("email", "")),
            name_hint=draft.get("name_hint"),
            phone_hint=draft.get("phone_hint"),
            organisation_hint=draft.get("organisation_hint"),
        )

        cache_key = self._cache_key(payload)
        cached = self._get_from_cache(cache_key)
        if cached:
            return LLMResult(
                provider=cached.provider,
                model=cached.model,
                payload=payload,
                content=cached.content,
                latency_ms=cached.latency_ms,
                used_fallback=False,
                tokens_in=cached.tokens_in,
                tokens_out=cached.tokens_out,
                cost_eur=cached.cost_eur,
                cached=True,
                payload_hash=cache_key,
            )

        errors: List[str] = []
        retries = 0

        for provider_name in self._eligible_providers():
            provider = self.providers[provider_name]
            used_fallback = provider_name != next(iter(self._provider_order()), provider_name)

            for attempt in range(self.max_retries + 1):
                try:
                    response = await asyncio.wait_for(
                        provider.generate(payload),
                        timeout=self.request_timeout_ms / 1000,
                    )
                    if response.cost_eur > self.cost_cap_eur:
                        raise ProviderHardError("cost_cap_exceeded")

                    self._store_in_cache(cache_key, response)
                    self._register_success(provider_name)
                    return LLMResult(
                        provider=response.provider,
                        model=response.model,
                        payload=payload,
                        content=response.content,
                        latency_ms=response.latency_ms,
                        used_fallback=used_fallback,
                        tokens_in=response.tokens_in,
                        tokens_out=response.tokens_out,
                        cost_eur=response.cost_eur,
                        cached=response.cached,
                        retries=retries,
                        payload_hash=cache_key,
                    )
                except ProviderHardError as exc:
                    errors.append(f"{provider_name}:{exc}")
                    self._register_failure(provider_name)
                    break
                except ProviderTransientError as exc:
                    errors.append(f"{provider_name}:{exc}")
                    retries += 1
                    if attempt >= self.max_retries:
                        self._register_failure(provider_name)
                        break
                    await asyncio.sleep(0.1 * (attempt + 1))
                except asyncio.TimeoutError:
                    errors.append(f"{provider_name}:timeout")
                    self._register_failure(provider_name)
                    break

        return LLMResult(
            provider=None,
            model=None,
            payload=payload,
            content=None,
            latency_ms=self.latency_budget_ms,
            used_fallback=True,
            error=";".join(errors) if errors else "no_provider_available",
            retries=retries,
            payload_hash=cache_key,
        )


__all__ = ["LLMRouter", "LLMResult"]
