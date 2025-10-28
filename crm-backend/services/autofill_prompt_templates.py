"""
Prompt templates for the Autofill LLM pipeline.

This module centralises the long-form prompts shared by the product team so
they can be versioned alongside the codebase. The helper `build_autofill_prompt`
returns both the system and user messages ready to be sent to the LLM.
"""

from __future__ import annotations

from dataclasses import dataclass
from textwrap import dedent
from typing import Dict

SYSTEM_PROMPT_AUTOFILL = dedent(
    """
    Tu es un extracteur d’entités B2B ultra-fiable pour un CRM.
    Contraintes impératives:
    - Réponds UNIQUEMENT en JSON valide UTF-8, sans texte autour.
    - Pas d’invention: si une donnée n’est pas certaine, mets null et baisse la confidence.
    - Ne fais AUCUNE requête web. Si une recherche web améliorerait la précision, indique needs_web_enrichment=true et dis exactement quoi chercher.
    - N’inclus JAMAIS de PII non demandée.
    - Suis le schéma strict ci-dessous.
    """.strip()
)

USER_PROMPT_AUTOFILL_TEMPLATE = """\
# CONTEXTE
- Produit: Autofill contacts & organisations (B2B/finance)
- Objectif: Créer/relier Person & Organisation, suggérer une Interaction, proposer un site web probable à partir du domaine email, sans fantasmer.

# ENTRÉE
raw_snippet: |
{RAW_SNIPPET}

primary_email: "{PRIMARY_EMAIL}"
name_hint: {NAME_HINT}
phone_hint: {PHONE_HINT}
organisation_hint: {ORG_HINT}

# INSTRUCTIONS D’EXTRACTION
1) Normalise l’email et sépare: local_part, domain.
2) Déduis un **nom probable** depuis local_part s’il n’est pas fourni (ex: "clacroix" -> last_name="Lacroix", first_name initial="C").
3) Déduis l’**organisation** à partir du **domaine**: "hmgfinance.com" -> name probable "HMG Finance".
4) **Website**: propose `website_guess` basé sur le domaine (ex: "https://hmgfinance.com"). Ne crée pas d’URL longue; homepage only.
5) Adresse/ville/pays: si absents et non certains, laisse null. Suggère web enrichment si utile.
6) Interaction: propose un type ("email"|"call"|"meeting"|"note"|"share_material"), un titre court, un résumé <= 140 caractères, occurred_at = maintenant en ISO 8601 (UTC), channel.
7) Scores: calcule un `confidence` entre 0 et 1 pour chaque bloc (person, organisation, website_guess), et donne des `evidence` lisibles (["email_local_part","email_domain","raw_text","hint"]).
8) Ne retourne que le JSON suivant.

# SCHÉMA DE SORTIE (STRICT)
{{
  "persons": [
    {{
      "email": "string|null",
      "first_name": "string|null",
      "last_name": "string|null",
      "job_title": "string|null",
      "phone": "string|null",
      "confidence": 0.0,
      "evidence": ["email_exact"|"name_hint"|"local_part"|"raw_text"|"phone_hint"]
    }}
  ],
  "organisations": [
    {{
      "name": "string|null",
      "domain": "string|null",
      "website_guess": "string|null",
      "address": "string|null",
      "city": "string|null",
      "country": "string|null",
      "phone": "string|null",
      "confidence": 0.0,
      "evidence": ["email_domain"|"org_hint"|"raw_text"]
    }}
  ],
  "interaction_suggestion": {{
    "type": "email|call|meeting|note|share_material",
    "title": "string",
    "occurred_at": "ISO-8601-UTC",
    "channel": "email|phone|video|other",
    "summary": "string|null",
    "participants": [
      {{"role":"external","email":"string|null"}},
      {{"role":"owner","email":null}}
    ]
  }},
  "recommendation": "apply|preview|create_new|quick_add",
  "needs_web_enrichment": true|false,
  "web_enrichment_todo": ["string", "..."],
  "meta": {{
    "email_domain": "string|null",
    "evidence_hash": "sha256-hex-of-normalized-input"
  }}
}}

# RÈGLES DE DÉCISION
- Si email exact présent -> Person.confidence >= 0.9, recommendation >= preview.
- Si domaine lisible -> Organisation.confidence >= 0.6, website_guess = "https://{{domain}}".
- Si seulement email perso (gmail/outlook) -> organisation = null, recommendation = quick_add.
- Ne mets pas d’adresse/ville/pays si non certaines (préférer null + needs_web_enrichment=true).

# SORTIE
Retourne UNIQUEMENT l’objet JSON.
"""


@dataclass(frozen=True)
class AutofillPrompt:
    system: str
    user: str


def build_autofill_prompt(
    *,
    raw_snippet: str,
    primary_email: str,
    name_hint: str | None = None,
    phone_hint: str | None = None,
    organisation_hint: str | None = None,
) -> AutofillPrompt:
    """
    Replace the placeholders in the user template with the actual values.

    Parameters
    ----------
    raw_snippet:
        Free-form textual evidence collected upstream (email body, note, etc.).
    primary_email:
        Email address that should seed the extraction.
    name_hint / phone_hint / organisation_hint:
        Optional hints collected earlier in the pipeline.
    """

    def _wrap(value: str | None) -> str:
        if value is None or value == "":
            return "null"
        escaped = value.replace('"', '\\"')
        return f'"{escaped}"'

    mapping = {
        "{RAW_SNIPPET}": raw_snippet.rstrip(),
        "{PRIMARY_EMAIL}": primary_email or "",
        "{NAME_HINT}": _wrap(name_hint),
        "{PHONE_HINT}": _wrap(phone_hint),
        "{ORG_HINT}": _wrap(organisation_hint),
    }

    user_prompt = USER_PROMPT_AUTOFILL_TEMPLATE
    for placeholder, value in mapping.items():
        user_prompt = user_prompt.replace(placeholder, value)

    return AutofillPrompt(system=SYSTEM_PROMPT_AUTOFILL, user=user_prompt.strip())


def build_llm_payload(
    *,
    raw_snippet: str,
    primary_email: str,
    name_hint: str | None = None,
    phone_hint: str | None = None,
    organisation_hint: str | None = None,
) -> Dict[str, str]:
    """
    Helper to produce a ready-to-send payload for chat completion APIs.

    Returns a dict with a `messages` field that callers can serialise to JSON.
    """
    prompt = build_autofill_prompt(
        raw_snippet=raw_snippet,
        primary_email=primary_email,
        name_hint=name_hint,
        phone_hint=phone_hint,
        organisation_hint=organisation_hint,
    )

    return {
        "messages": [
            {"role": "system", "content": prompt.system},
            {"role": "user", "content": prompt.user},
        ]
    }


__all__ = [
    "AutofillPrompt",
    "SYSTEM_PROMPT_AUTOFILL",
    "USER_PROMPT_AUTOFILL_TEMPLATE",
    "build_autofill_prompt",
    "build_llm_payload",
]
