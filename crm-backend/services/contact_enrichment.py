"""
Utilities for enriching organisations with contact information scraped from
their public “Contact” pages.

The implementation follows the heuristic pack shared by the product team:
pre-cleaning, window-based extraction, regex scoring and best-link discovery.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

SOCIAL_HOSTS = {
    "facebook.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "youtube.com",
    "t.me",
    "whatsapp.com",
    "weixin.qq.com",
}
FILE_EXT_BLOCK = (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar", ".7z")

# ---------------------------------------------------------------------------
# REGEX PACK
# ---------------------------------------------------------------------------

RE_TEL_E164 = re.compile(
    r"""
    (?<!\w)
    (?:\+|00)\d{6,15}
    (?!\w)
""",
    re.X,
)

RE_TEL_FR = re.compile(
    r"""
    (?<!\w)
    (?:\+33|0|\(0\)\s*|\+33\s*\(0\)\s*)
    \s*(?:[1-9])(?:[\s\.\-]?\d{2}){4}
    (?!\w)
""",
    re.X,
)

RE_TEL_LINK = re.compile(r"tel:\s*([+0-9\-\.\s\(\)]{6,25})", re.I)

RE_MAIL = re.compile(
    r"""
    (?<![\w\.\-])
    [A-Z0-9._%+\-]+
    @
    [A-Z0-9.\-]+\.[A-Z]{2,24}
    (?![\w\-])
""",
    re.I | re.X,
)
RE_MAILTO = re.compile(r"mailto:\s*([^?\s\"'>]+)", re.I)

RE_SIREN = re.compile(r"\b(\d{3}\s?\d{3}\s?\d{3})\b")
RE_SIRET = re.compile(r"\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b")
RE_VAT_FR = re.compile(r"\bFR[0-9A-Z]{2}\d{9}\b", re.I)
RE_RCS = re.compile(r"\bRCS\s+[A-ZÀ-ÖØ-Ý\- ]+\s+\d{3}\s?\d{3}\s?\d{3}\b", re.I)
RE_LEGAL_FORM = re.compile(r"\b(SASU?|SAS|SARL|SA|EURL|SCI|SC|GIE|SE|SCA|SNC)\b", re.I)

RE_STREET_FR = re.compile(
    r"""
    \b
    \d{1,4}\s*(?:bis|ter|quater)?\s+
    (?:avenue|av\.?|boulevard|bd\.?|rue|route|rt\.?|chemin|impasse|all(?:ée|ee)s?|place|quai|cours|faubourg|fg\.?|square|villa|passage|sentier|esplanade|parc|ZA|ZI|ZAC|RN|RD)
    [^\n,;<>]{5,80}
""",
    re.I | re.X,
)
RE_ZIP_FR = re.compile(r"\b\d{2}\s?\d{3}\b")
RE_CITY = re.compile(r"\b([A-Z][a-zÀ-ÖØ-öø-ÿ'\-]{2,}(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ'\-]{2,}){0,3})\b")
RE_COUNTRY = re.compile(
    r"\b(France|Belgique|Suisse|Luxembourg|Espagne|Portugal|Allemagne|Italie|Royaume[- ]Uni)\b", re.I
)

RE_URL = re.compile(r"https?://[A-Za-z0-9\.\-]+(?:/[^\s\"'<>)]*)?", re.I)

RE_LABEL_PHONE = re.compile(r"\b(tel|tél|téléphone|phone|standard|accueil|switchboard)\b", re.I)
RE_LABEL_FAX = re.compile(r"\bfax\b", re.I)
RE_LABEL_ADDR = re.compile(r"\b(adresse|address|siège|siege|head[\s-]?office)\b", re.I)
RE_CLASS_TEL = re.compile(r"\b(tel|phone|telephone)\b", re.I)
RE_CLASS_ADDR = re.compile(r"\b(addr|address|adr|street-address|locality|postal-code|country-name)\b", re.I)

# ---------------------------------------------------------------------------
# NORMALISATION HELPERS
# ---------------------------------------------------------------------------


def norm_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def normalize_fr_phone(raw: str) -> Optional[str]:
    digits = re.sub(r"[^\d+]", "", raw)
    digits = re.sub(r"^00", "+", digits)
    digits = digits.replace("(0)", "")
    if digits.startswith("0") and len(digits) == 10:
        digits = "+33" + digits[1:]
    if re.fullmatch(r"\+\d{6,15}", digits):
        return digits
    return None


def normalize_domain_to_homepage(domain: str) -> str:
    dom = domain.lower().strip()
    dom = re.sub(r"^https?://", "", dom)
    dom = dom.strip("/")
    return f"https://{dom}"


# ---------------------------------------------------------------------------
# CONTACT EXTRACTION
# ---------------------------------------------------------------------------


def windowed(lines: List[str], index: int, radius: int = 2) -> str:
    start = max(0, index - radius)
    end = min(len(lines), index + radius + 1)
    return "\n".join(lines[start:end])


@dataclass
class PhoneCandidate:
    score: float
    reasons: Set[str]


def extract_contacts(text: str) -> Dict[str, object]:
    """
    Extract emails, phone number and postal address from a cleaned HTML/text page.
    Returns a dictionary with confidences and evidence.
    """
    cleaned = text or ""
    lines = [norm_spaces(line) for line in cleaned.splitlines()]
    lines = [line for line in lines if line]

    emails: Set[str] = set()
    phone_candidates: Dict[str, PhoneCandidate] = {}
    street = zipcode = city = country = None
    address_block: Optional[str] = None

    def register_phone(number: str, base_score: float, reason: str, is_fax: bool) -> None:
        if not number:
            return
        score = max(0.1, base_score - 0.3 if is_fax else base_score)
        score = min(score, 0.95)
        candidate = phone_candidates.get(number)
        if candidate is None or score > candidate.score:
            phone_candidates[number] = PhoneCandidate(score=score, reasons={reason})
        else:
            candidate.reasons.add(reason)
            candidate.score = max(candidate.score, score)

    emails.update(m.lower() for m in RE_MAIL.findall(cleaned))
    emails.update(m.lower() for m in RE_MAILTO.findall(cleaned))

    for idx, line in enumerate(lines):
        ctx = windowed(lines, idx)
        has_phone_label = bool(RE_LABEL_PHONE.search(ctx) or RE_CLASS_TEL.search(ctx))
        is_fax_context = bool(RE_LABEL_FAX.search(ctx))

        for raw in RE_TEL_LINK.findall(ctx):
            phone = normalize_fr_phone(raw)
            if phone:
                register_phone(phone, 0.9 if has_phone_label else 0.7, "tel_href", is_fax_context)

        for raw in RE_TEL_FR.findall(ctx):
            phone = normalize_fr_phone(raw)
            if phone:
                register_phone(phone, 0.8 if has_phone_label else 0.7, "fr_format", is_fax_context)

        for raw in RE_TEL_E164.findall(ctx):
            phone = normalize_fr_phone(raw)
            if phone:
                register_phone(phone, 0.6 if has_phone_label else 0.5, "e164", is_fax_context)

        if RE_LABEL_ADDR.search(line) or RE_CLASS_ADDR.search(line):
            block = windowed(lines, idx, radius=3)
            if not address_block:
                address_block = block

            if not street:
                match_street = RE_STREET_FR.search(block)
                if match_street:
                    street = norm_spaces(match_street.group(0))

            zip_match = RE_ZIP_FR.search(block)
            if zip_match and not zipcode:
                zipcode = zip_match.group(0).replace(" ", "")

            if not country:
                country_match = RE_COUNTRY.search(block)
                if country_match:
                    country = country_match.group(1).title()

            search_region = block
            if zip_match:
                pos = block.find(zip_match.group(0))
                if pos != -1:
                    search_region = block[pos + len(zip_match.group(0)) :]

            if not city:
                city_match = RE_CITY.search(search_region)
                if city_match:
                    city = norm_spaces(city_match.group(1))

    if not street:
        match = RE_STREET_FR.search(cleaned)
        if match:
            street = norm_spaces(match.group(0))
            address_block = address_block or match.group(0)

    if not zipcode:
        match = RE_ZIP_FR.search(cleaned)
        if match:
            zipcode = match.group(0).replace(" ", "")

    if not country:
        match = RE_COUNTRY.search(cleaned)
        if match:
            country = match.group(1).title()

    if not city and zipcode:
        pos = cleaned.find(zipcode)
        if pos != -1:
            snippet = cleaned[pos : pos + 120]
            match = RE_CITY.search(snippet)
            if match:
                city = norm_spaces(match.group(1))

    selected_phone: Optional[str] = None
    phone_confidence = 0.0
    phone_reasons: List[str] = []

    if phone_candidates:
        ordered = sorted(
            phone_candidates.items(),
            key=lambda item: (item[1].score, item[0].startswith("+33")),
            reverse=True,
        )
        selected_phone, metadata = ordered[0]
        phone_confidence = metadata.score
        phone_reasons = sorted(metadata.reasons)

    address_confidence = 0.0
    if street and zipcode and city:
        address_confidence = 0.9
    elif street and city:
        address_confidence = 0.7
    elif street:
        address_confidence = 0.5
    elif zipcode and city:
        address_confidence = 0.4

    address_hash = (
        hashlib.sha256(address_block.encode("utf-8")).hexdigest() if address_block else None
    )

    return {
        "emails": sorted(emails),
        "phone": {
            "value": selected_phone,
            "confidence": round(phone_confidence, 3),
            "reasons": phone_reasons,
        },
        "address": {
            "street": street,
            "postal_code": zipcode,
            "city": city,
            "country": country,
            "confidence": round(address_confidence, 3),
            "block_hash": address_hash,
        },
    }


# ---------------------------------------------------------------------------
# CONTACT LINK DISCOVERY
# ---------------------------------------------------------------------------

TEXT_PATTERNS = [
    (re.compile(r"\b(contact|contacts|contactez|nous\s*contacter)\b", re.I), 100, "anchor:contact"),
    (re.compile(r"\b(mentions\s*l[eé]gales|legal|imprint|impressum)\b", re.I), 85, "anchor:legal"),
    (re.compile(r"\b(coordonn[ée]es|plan\s*acc[eè]s|o[uù]\s*nous\s*trouver)\b", re.I), 60, "anchor:coords"),
    (re.compile(r"\b(support|help|aide)\b", re.I), 35, "anchor:support"),
]

HREF_PATTERNS = [
    (re.compile(r"/(contact|contacts|contact-us|contactez|nous-?contacter)(/|$|\?)", re.I), 80, "path:contact"),
    (re.compile(r"/(mentions-?legales|legal|imprint|impressum)(/|$|\?)", re.I), 70, "path:legal"),
    (re.compile(r"/(support|help|aide)(/|$|\?)", re.I), 30, "path:support"),
    (re.compile(r"/(about|a-propos)(/|$|\?)", re.I), 20, "path:about"),
]


def _same_reg_domain(u1: str, u2: str) -> bool:
    try:
        h1, h2 = urlparse(u1).hostname or "", urlparse(u2).hostname or ""
        return h1.split(".")[-2:] == h2.split(".")[-2:]
    except Exception:
        return False


def _is_social(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host.endswith(s) for s in SOCIAL_HOSTS)


def _bad_href(url: str) -> bool:
    if not url:
        return True
    href = url.strip().lower()
    if href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return True
    if any(href.endswith(ext) for ext in FILE_EXT_BLOCK):
        return True
    return False


def _context_hint_score(a_tag) -> Tuple[int, List[str]]:
    score = 0
    reasons: List[str] = []
    parents = [p.name for p in a_tag.parents if getattr(p, "name", None)]
    if any(container in parents for container in ("header", "nav")):
        score += 20
        reasons.append("ctx:header/nav")
    if "footer" in parents:
        score += 10
        reasons.append("ctx:footer")
    attrs = " ".join(
        filter(
            None,
            [
                a_tag.get("aria-label"),
                a_tag.get("title"),
                " ".join(a_tag.get("rel") or []),
                " ".join(a_tag.get("class") or []),
            ],
        )
    ).lower()
    if any(token in attrs for token in ["contact", "mentions", "legal", "imprint", "telephone", "phone"]):
        score += 10
        reasons.append("ctx:attrs-hint")
    if any(token in attrs for token in ["social", "linkedin", "facebook", "twitter", "instagram", "youtube"]):
        score -= 40
        reasons.append("ctx:social")
    return score, reasons


def _text_of_link(a_tag) -> str:
    parts = [
        a_tag.get_text(" ", strip=True) or "",
        a_tag.get("title") or "",
        a_tag.get("aria-label") or "",
    ]
    return " ".join(part for part in parts if part).strip()


def score_link(a_tag, base_url: str) -> Tuple[int, List[str], str]:
    href_raw = a_tag.get("href") or ""
    if _bad_href(href_raw):
        return -999, ["bad:href"], ""
    absolute = urljoin(base_url, href_raw)
    reasons: List[str] = []
    score = 0

    if _same_reg_domain(base_url, absolute):
        score += 30
        reasons.append("same-domain")
    else:
        score -= 30
        reasons.append("cross-domain")

    if _is_social(absolute):
        return -500, ["bad:social"], absolute

    text = _text_of_link(a_tag)
    for regex, pts, tag in TEXT_PATTERNS:
        if regex.search(text):
            score += pts
            reasons.append(tag)

    path = urlparse(absolute).path or ""
    for regex, pts, tag in HREF_PATTERNS:
        if regex.search(path):
            score += pts
            reasons.append(tag)

    ctx_pts, ctx_reasons = _context_hint_score(a_tag)
    score += ctx_pts
    reasons.extend(ctx_reasons)

    if len(path.strip("/")) <= 16:
        score += 5
        reasons.append("path:short")

    if href_raw.strip().startswith("#"):
        score += 10
        reasons.append("anchor:in-page")

    return score, reasons, absolute


def find_best_contact_url(html: str, base_url: str) -> Dict[str, object]:
    soup = BeautifulSoup(html, "html.parser")
    raw_candidates: List[Dict[str, object]] = []

    for a_tag in soup.find_all("a", href=True):
        score, reasons, absolute = score_link(a_tag, base_url)
        if score == -999:
            continue
        raw_candidates.append({"url": absolute, "score": score, "reasons": reasons})

    if not raw_candidates:
        return {"best_url": None, "score": 0, "reasons": [], "candidates": []}

    aggregated: Dict[str, Dict[str, object]] = {}
    for candidate in raw_candidates:
        url = candidate["url"]
        stored = aggregated.get(url)
        if stored is None or candidate["score"] > stored["score"]:
            aggregated[url] = {
                "url": url,
                "score": candidate["score"],
                "reasons": list(candidate["reasons"]),
            }
        else:
            stored_reasons = set(stored["reasons"])
            stored_reasons.update(candidate["reasons"])
            stored["reasons"] = sorted(stored_reasons)
            stored["score"] = max(stored["score"], candidate["score"])

    sorted_candidates = sorted(aggregated.values(), key=lambda item: item["score"], reverse=True)
    best = sorted_candidates[0]

    if len(sorted_candidates) > 1:
        top_score = best["score"]
        for candidate in sorted_candidates[1:]:
            if abs(candidate["score"] - top_score) <= 5:
                path = urlparse(candidate["url"]).path or ""
                if re.search(r"/contact($|/|\?)", path, re.I) and _same_reg_domain(base_url, candidate["url"]):
                    best = candidate
                    break

    return {
        "best_url": best["url"],
        "score": best["score"],
        "reasons": best["reasons"],
        "candidates": sorted_candidates[:10],
    }


__all__ = [
    "extract_contacts",
    "find_best_contact_url",
    "normalize_domain_to_homepage",
    "normalize_fr_phone",
    "RE_MAIL",
    "RE_TEL_FR",
]
