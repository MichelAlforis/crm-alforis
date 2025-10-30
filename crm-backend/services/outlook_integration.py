"""
Service d'intégration Outlook (Microsoft Graph API)

Fonctionnalités:
- OAuth 2.0 avec Microsoft Graph
- Ingestion signatures emails
- Détection threads sans réponse
- Parser contacts Outlook

Scopes requis:
- Mail.Read: Lecture emails
- Contacts.Read: Lecture contacts
"""

import base64
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from fastapi import HTTPException

from core.config import settings
from core.encryption import decrypt_value, encrypt_value
from models.user import User


class OutlookIntegration:
    """Service d'intégration Microsoft Outlook via Graph API"""

    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    MSA_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad"

    def __init__(self, db: Session):
        self.db = db
        self.client_id = settings.outlook_client_id
        self.client_secret = settings.outlook_client_secret
        self.redirect_uri = settings.outlook_redirect_uri
        self.tenant = (settings.outlook_tenant or "organizations").strip() or "organizations"
        self.auth_url = settings.outlook_auth_url or f"https://login.microsoftonline.com/{self.tenant}/oauth2/v2.0/authorize"
        self.token_url = settings.outlook_token_url or f"https://login.microsoftonline.com/{self.tenant}/oauth2/v2.0/token"
        self.scopes = settings.outlook_scopes.split()
        self.allowed_domains = [domain.lower() for domain in settings.outlook_allowed_domains] if settings.outlook_allowed_domains else []

    # ==========================================
    # OAuth Flow
    # ==========================================

    def get_authorization_url(
        self,
        state: str,
        *,
        login_hint: Optional[str] = None,
        force_prompt: bool = True,
        domain_hint: Optional[str] = None,
    ) -> str:
        """
        Génère l'URL d'autorisation OAuth

        Args:
            state: État CSRF pour sécuriser le callback
            login_hint: Email suggéré pour pré-remplir le sélecteur Microsoft
            force_prompt: Force select_account pour éviter la session MSA cachée
            domain_hint: Hint Microsoft (organizations, consumers, ...)

        Returns:
            URL d'autorisation Microsoft
        """
        scopes_str = " ".join(self.scopes)
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": scopes_str,
            "state": state,
        }

        if force_prompt:
            params["prompt"] = "select_account"

        if login_hint:
            params["login_hint"] = login_hint

        if domain_hint:
            params["domain_hint"] = domain_hint
        elif self.allowed_domains:
            params["domain_hint"] = "organizations"

        query_string = "&".join([f"{k}={quote(str(v))}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Échange le code d'autorisation contre un access token

        Args:
            code: Code d'autorisation reçu du callback

        Returns:
            {
                "access_token": "...",
                "refresh_token": "...",
                "expires_in": 3600,
                "scope": "Mail.Read Contacts.Read"
            }
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            response.raise_for_status()
            return response.json()

    @staticmethod
    def _decode_jwt_without_verification(token: str) -> Dict:
        try:
            _header, payload, _signature = token.split(".")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="ID token Microsoft invalide") from exc

        padding = "=" * (-len(payload) % 4)
        try:
            decoded = base64.urlsafe_b64decode((payload + padding).encode("ascii"))
            return json.loads(decoded.decode("utf-8"))
        except (ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=400, detail="Impossible de décoder l'ID token Microsoft") from exc

    def _is_domain_allowed(self, email: str) -> bool:
        if not self.allowed_domains:
            return True
        if not email or "@" not in email:
            return False
        domain = email.split("@", 1)[1].lower()
        return domain in self.allowed_domains

    async def validate_token_identity(self, token_data: Dict) -> Dict:
        """Valide qu'un token correspond à un compte professionnel autorisé.

        Returns:
            {
                "email": "...",
                "tenant_id": "...",
                "profile": {...},
                "claims": {...},
                "emails_considered": ["..."]
            }
        """

        logger = logging.getLogger(__name__)

        id_token = token_data.get("id_token")
        access_token = token_data.get("access_token")

        if not id_token or not access_token:
            raise HTTPException(status_code=400, detail="Réponse Microsoft incomplète (tokens manquants)")

        claims = self._decode_jwt_without_verification(id_token)
        tenant_id = (claims.get("tid") or claims.get("tenantId") or "").lower()

        if tenant_id in {"", self.MSA_TENANT_ID}:
            raise HTTPException(
                status_code=400,
                detail="Compte personnel Microsoft détecté. Utilisez un compte professionnel ou scolaire.",
            )

        preferred_username = (claims.get("preferred_username") or claims.get("upn") or "").lower()
        email_claim = (claims.get("email") or "").lower()

        select_fields = "id,displayName,mail,userPrincipalName,jobTitle,officeLocation,proxyAddresses"
        try:
            profile = await self.get_user_profile(access_token, select=select_fields)
        except httpx.HTTPStatusError as exc:
            logger.warning("Impossible de récupérer proxyAddresses (%s), fallback minimal", exc)
            profile = await self.get_user_profile(access_token)

        candidates: List[str] = []

        # proxyAddresses: primary SMTP is uppercase
        proxy_addresses = profile.get("proxyAddresses") or []
        primary_proxy = None
        secondary_proxies: List[str] = []
        for addr in proxy_addresses:
            if not isinstance(addr, str) or ":" not in addr:
                continue
            prefix, value = addr.split(":", 1)
            if prefix == "SMTP":
                primary_proxy = value.lower()
            elif prefix.lower() == "smtp":
                secondary_proxies.append(value.lower())

        if primary_proxy:
            candidates.append(primary_proxy)
        candidates.extend(secondary_proxies)

        mail_field = (profile.get("mail") or "").lower()
        if mail_field:
            candidates.append(mail_field)

        upn_field = (profile.get("userPrincipalName") or "").lower()
        if upn_field:
            candidates.append(upn_field)

        if preferred_username:
            candidates.append(preferred_username)
        if email_claim:
            candidates.append(email_claim)

        # Déduplication en conservant l'ordre
        emails_considered: List[str] = []
        seen = set()
        for email in candidates:
            if email and email not in seen:
                emails_considered.append(email)
                seen.add(email)

        if not emails_considered:
            raise HTTPException(status_code=400, detail="Impossible de déterminer l'adresse email Outlook")

        if self.allowed_domains and not any(self._is_domain_allowed(email) for email in emails_considered):
            raise HTTPException(status_code=400, detail="Adresse email hors domaines autorisés")

        return {
            "email": emails_considered[0],
            "tenant_id": tenant_id,
            "profile": profile,
            "claims": claims,
            "emails_considered": emails_considered,
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Rafraîchit l'access token avec le refresh token

        Args:
            refresh_token: Refresh token stocké

        Returns:
            Nouveau access token
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            response.raise_for_status()
            return response.json()

    async def get_valid_access_token(
        self,
        user: User,
        *,
        force_refresh: bool = False,
        refresh_margin: int = 300,
    ) -> str:
        """Récupère ou renouvelle le token Outlook de l'utilisateur.

        Args:
            user: Utilisateur CRM avec tokens chiffrés
            force_refresh: Force le refresh même si le token semble valide
            refresh_margin: Nombre de secondes avant expiration pour déclencher un refresh

        Returns:
            access_token Microsoft Graph valide

        Raises:
            HTTPException: si Outlook non connecté ou tokens invalides
        """

        logger = logging.getLogger(__name__)

        if not user or not user.outlook_connected:
            raise HTTPException(status_code=400, detail="Outlook non connecté")

        if not user.encrypted_outlook_access_token:
            raise HTTPException(status_code=400, detail="Token Outlook manquant")

        try:
            access_token = decrypt_value(user.encrypted_outlook_access_token)
        except Exception as exc:
            logger.error("Impossible de déchiffrer access token Outlook: %s", exc)
            raise HTTPException(status_code=500, detail="Token Outlook illisible") from exc

        now_utc = datetime.now(timezone.utc)
        expires_at = user.outlook_token_expires_at
        if expires_at is not None:
            try:
                expires_utc = (
                    expires_at.astimezone(timezone.utc)
                    if expires_at.tzinfo
                    else expires_at.replace(tzinfo=timezone.utc)
                )
            except Exception:
                expires_utc = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_utc = None

        if (
            not force_refresh
            and access_token
            and expires_utc is not None
            and (expires_utc - now_utc).total_seconds() > max(refresh_margin, 0)
        ):
            return access_token

        if not user.encrypted_outlook_refresh_token:
            raise HTTPException(status_code=400, detail="Refresh token Outlook manquant")

        try:
            refresh_token = decrypt_value(user.encrypted_outlook_refresh_token)
        except Exception as exc:
            logger.error("Impossible de déchiffrer refresh token Outlook: %s", exc)
            raise HTTPException(status_code=500, detail="Refresh token Outlook illisible") from exc

        try:
            token_data = await self.refresh_access_token(refresh_token)
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code if exc.response else 502
            logger.warning("Refresh token Outlook rejeté (status=%s): %s", status, exc)
            raise HTTPException(status_code=401, detail="Refresh token Outlook invalide") from exc
        except Exception as exc:
            logger.error("Erreur inattendue lors du refresh token Outlook: %s", exc)
            raise HTTPException(status_code=502, detail="Echec du refresh token Outlook") from exc

        new_access_token = token_data.get("access_token")
        if not new_access_token:
            logger.error("Refresh Outlook sans access_token dans la réponse: %s", token_data)
            raise HTTPException(status_code=502, detail="Réponse Microsoft invalide (access_token manquant)")

        new_refresh_token = token_data.get("refresh_token") or refresh_token
        expires_in_raw = token_data.get("expires_in", 3600)
        try:
            expires_seconds = int(expires_in_raw)
        except (TypeError, ValueError):
            logger.warning(
                "Valeur expires_in invalide (%s), fallback 3600s pour user_id=%s",
                expires_in_raw,
                user.id,
            )
            expires_seconds = 3600

        try:
            user.encrypted_outlook_access_token = encrypt_value(new_access_token)
            if new_refresh_token:
                user.encrypted_outlook_refresh_token = encrypt_value(new_refresh_token)
            user.outlook_token_expires_at = now_utc + timedelta(seconds=expires_seconds)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        except Exception as exc:
            logger.error("Impossible de mettre à jour les tokens Outlook en base: %s", exc)
            self.db.rollback()
            raise HTTPException(status_code=500, detail="Echec de mise à jour des tokens Outlook") from exc

        logger.info(
            "Token Outlook rafraîchi pour user_id=%s, expire dans %ss",
            user.id,
            expires_seconds,
        )

        return new_access_token

    # ==========================================
    # Graph API Calls
    # ==========================================

    async def get_user_profile(self, access_token: str, select: Optional[str] = None) -> Dict:
        """
        Récupère le profil de l'utilisateur Microsoft connecté

        Args:
            access_token: Token d'accès Microsoft
            select: Champs Graph API à sélectionner (optionnel)

        Returns:
            {
                "id": "...",
                "displayName": "Michel Marques",
                "mail": "michel.marques@alforis.fr",
                "userPrincipalName": "michel.marques@alforis.fr",
                "jobTitle": "...",
                "officeLocation": "..."
            }
        """
        params = {"$select": select} if select else None

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.GRAPH_BASE_URL}/me",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()

    def _build_aqs_query(self, query: str) -> str:
        """
        Construit une requête AQS (Advanced Query Syntax) pour Microsoft Graph

        NOTE: Graph $search ne supporte PAS l'opérateur OR explicite!
        On cible un seul champ (participants étant le plus pertinent)

        Args:
            query: Requête utilisateur (email, domaine, mot-clé...)

        Returns:
            Requête AQS optimisée
        """
        # Nettoyer la requête (enlever guillemets qui posent problème)
        q = query.strip().replace('"', ' ').strip()

        # Email précis → cibler participants (inclut from + to + cc)
        if "@" in q and " " not in q:
            return f'participants:{q}'

        # Probable domaine → cibler participants (le plus fiable)
        if "." in q and " " not in q:
            return f'participants:{q}'

        # Fallback: recherche générique (tous champs)
        return q

    async def _search_with_aqs(
        self, access_token: str, aqs_query: str, limit: int, timeout: float = 30.0
    ) -> List[Dict]:
        """
        Recherche via $search avec AQS et retry logic

        Args:
            access_token: Token d'accès Microsoft
            aqs_query: Requête AQS construite
            limit: Nombre max de résultats
            timeout: Timeout en secondes

        Returns:
            Liste de messages (légers, sans body complet)

        Raises:
            HTTPException: Si erreur Graph API
        """
        import asyncio
        import logging

        logger = logging.getLogger(__name__)

        async with httpx.AsyncClient(timeout=timeout) as client:
            request_url = f"{self.GRAPH_BASE_URL}/me/messages"
            params = {
                "$search": f'"{aqs_query}"',
                "$top": min(limit, 25),  # Graph $search accepte 25 max par page
                "$select": "id,subject,from,toRecipients,sentDateTime,bodyPreview",
            }
            headers = {
                "Authorization": f"Bearer {access_token}",
                "ConsistencyLevel": "eventual",
            }

            collected: List[Dict] = []

            while len(collected) < limit and request_url:
                response = None

                # Retry logic pour 429/503/timeout
                for attempt in range(3):
                    try:
                        if params is not None:
                            response = await client.get(request_url, params=params, headers=headers)
                        else:
                            response = await client.get(request_url, headers=headers)

                        if response.status_code in (429, 503):
                            retry_after = int(response.headers.get("Retry-After", 2))
                            wait_time = retry_after if attempt == 0 else retry_after * 2
                            logger.warning(
                                f"Graph API {response.status_code}, waiting {wait_time}s (attempt {attempt + 1}/3)"
                            )
                            await asyncio.sleep(wait_time)
                            continue

                        if response.status_code >= 400:
                            error_detail = {
                                "source": "microsoft_graph",
                                "status_code": response.status_code,
                                "error_body": response.text[:2000],
                                "aqs_query": aqs_query,
                                "url": str(response.url),
                            }
                            logger.error(f"Graph API search error: {error_detail}")
                            raise HTTPException(status_code=502, detail=error_detail)

                        break

                    except httpx.TimeoutException as e:
                        logger.error(f"Graph API timeout (attempt {attempt + 1}/3): {e}")
                        if attempt == 2:
                            raise HTTPException(
                                status_code=504, detail="Microsoft Graph API timeout"
                            )
                        await asyncio.sleep(2)

                # Si response est None, toutes les tentatives ont échoué
                if response is None:
                    break

                data = response.json()
                collected.extend(data.get("value", []))

                if len(collected) >= limit:
                    break

                # Préparer la page suivante si disponible
                request_url = data.get("@odata.nextLink")
                params = None  # nextLink embarque déjà les paramètres

            return collected[:limit]

    async def _filter_fallback(
        self, access_token: str, query: str, limit: int
    ) -> List[Dict]:
        """
        Fallback avec $filter quand $search retourne 0 résultats

        Args:
            access_token: Token d'accès Microsoft
            query: Requête utilisateur
            limit: Nombre max de résultats

        Returns:
            Liste de messages via $filter
        """
        import logging

        logger = logging.getLogger(__name__)

        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.GRAPH_BASE_URL}/me/messages"
            headers = {"Authorization": f"Bearer {access_token}"}

            async def _run_filter(filter_params: Dict, context: str) -> List[Dict]:
                """Exécute la requête $filter avec pagination jusqu'à `limit`."""
                request_url = url
                params = filter_params.copy()
                params.setdefault(
                    "$select", "id,subject,from,toRecipients,sentDateTime,bodyPreview"
                )
                params["$top"] = min(limit, params.get("$top", limit), 25)

                collected: List[Dict] = []
                request_params: Optional[Dict] = params

                while len(collected) < limit and request_url:
                    try:
                        if request_params is not None:
                            response = await client.get(request_url, params=request_params, headers=headers)
                        else:
                            response = await client.get(request_url, headers=headers)
                    except httpx.HTTPError as e:
                        logger.warning(f"Filter fallback ({context}) failed: {e}")
                        return []

                    if response.status_code != 200:
                        logger.warning(
                            f"Filter fallback ({context}) returned status {response.status_code}: {response.text[:2000]}"
                        )
                        return []

                    data = response.json()
                    collected.extend(data.get("value", []))

                    if len(collected) >= limit:
                        break

                    request_url = data.get("@odata.nextLink")
                    request_params = None  # nextLink contient déjà les paramètres

                if collected:
                    logger.info(f"Filter fallback success with {context}: {len(collected[:limit])} results")

                return collected[:limit]

            # Si email exact, essayer from/emailAddress/address eq
            if "@" in query and " " not in query:
                params = {
                    "$filter": f"from/emailAddress/address eq '{query}'",
                    "$orderby": "sentDateTime desc",
                }
                results = await _run_filter(params, "from/emailAddress/address")
                if results:
                    return results

            # Sinon, essayer contains(subject, ...)
            safe_query = query.replace("'", " ").strip()
            if safe_query:
                params = {
                    "$filter": f"contains(subject,'{safe_query}')",
                    "$orderby": "sentDateTime desc",
                }
                results = await _run_filter(params, "contains(subject)")
                if results:
                    return results

            return []

    async def _fetch_message_details(
        self, access_token: str, message_ids: List[str], max_fetch: int = 25
    ) -> List[Dict]:
        """
        Récupère les détails complets (body, uniqueBody) pour une liste de messages

        Args:
            access_token: Token d'accès Microsoft
            message_ids: Liste d'IDs de messages
            max_fetch: Nombre max de messages à récupérer pour limiter le rate limiting

        Returns:
            Liste de messages avec corps complet
        """
        import logging

        logger = logging.getLogger(__name__)

        messages_detailed = []

        # Limiter le nombre de fetches pour éviter le rate limiting Graph
        if max_fetch > 0:
            message_ids = message_ids[:max_fetch]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for msg_id in message_ids:
                try:
                    url = f"{self.GRAPH_BASE_URL}/me/messages/{msg_id}"
                    params = {
                        "$select": "id,subject,from,toRecipients,sentDateTime,body,uniqueBody"
                    }
                    headers = {"Authorization": f"Bearer {access_token}"}

                    response = await client.get(url, params=params, headers=headers)
                    response.raise_for_status()

                    messages_detailed.append(response.json())

                except Exception as e:
                    logger.warning(f"Failed to fetch message {msg_id}: {e}")
                    continue

        return messages_detailed

    async def search_messages_by_query(
        self, access_token: str, query: str, limit: int = 10
    ) -> Dict:
        """
        Recherche contextuelle dans les emails (MODE 1 - Autofill intelligent)

        Stratégie:
        1. Construire requête AQS intelligente
        2. Recherche via $search (Graph API)
        3. Si 0 résultats, fallback avec $filter
        4. Fetch détails messages (body) pour extraction signatures
        5. Parser signatures et extraire domaines

        Args:
            access_token: Token d'accès Microsoft
            query: Requête de recherche (nom, email, entreprise...)
            limit: Nombre max de résultats (défaut: 10)

        Returns:
            {
                "messages": [...],
                "signatures": [...],
                "last_contact_date": "2025-01-15T10:30:00Z",
                "company_domains": ["acme.com", "example.fr"]
            }
        """
        import logging

        logger = logging.getLogger(__name__)

        # 1. Construire requête AQS
        aqs_query = self._build_aqs_query(query)
        logger.info(f"Search query: '{query}' → AQS: '{aqs_query}'")

        # 2. Recherche via $search
        messages = await self._search_with_aqs(access_token, aqs_query, limit)

        # 3. Fallback si 0 résultats
        if not messages:
            logger.info(f"No results with $search, trying $filter fallback...")
            messages = await self._filter_fallback(access_token, query, limit)

        if not messages:
            logger.info(f"No results found for query '{query}'")
            return {
                "messages": [],
                "signatures": [],
                "last_contact_date": None,
                "company_domains": [],
            }

        logger.info(f"Found {len(messages)} messages for query '{query}'")

        # 4. Fetch détails (body/uniqueBody) pour signatures
        message_ids = [msg["id"] for msg in messages]
        messages_detailed = await self._fetch_message_details(
            access_token, message_ids, max_fetch=min(limit, 25)
        )

        # 5. Sort by sentDateTime
        messages_detailed.sort(key=lambda m: m.get("sentDateTime", ""), reverse=True)

        # 6. Extraire signatures
        signatures = self.extract_signatures_from_messages(messages_detailed)

        # 7. Détecter company domains
        company_domains = set()
        for sig in signatures:
            if sig.get("email"):
                domain = sig["email"].split("@")[-1]
                company_domains.add(domain)

        # 8. Trouver date du dernier échange
        last_contact_date = None
        if messages_detailed:
            last_contact_date = messages_detailed[0].get("sentDateTime")

        return {
            "messages": messages_detailed,
            "signatures": signatures,
            "last_contact_date": last_contact_date,
            "company_domains": list(company_domains),
        }

    async def get_recent_messages(
        self, access_token: str, limit: int = 50, days: int = 30
    ) -> List[Dict]:
        """
        Récupère les messages récents de l'utilisateur avec PAGINATION

        Args:
            access_token: Token d'accès Microsoft
            limit: Nombre max de messages (défaut: 50, 0 = illimité pour aspirateur)
            days: Nombre de jours dans le passé (défaut: 30)

        Returns:
            Liste de messages avec signatures
        """
        import asyncio
        import logging

        logger = logging.getLogger(__name__)

        # Date de début (30 jours dans le passé)
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"

        async with httpx.AsyncClient(timeout=60.0) as client:
            request_url = f"{self.GRAPH_BASE_URL}/me/messages"
            params = {
                "$top": min(limit, 100) if limit > 0 else 100,  # $filter supporte jusqu'à 100 par page
                "$select": "id,subject,from,toRecipients,sentDateTime,body,uniqueBody",
                "$filter": f"sentDateTime ge {start_date}",
                "$orderby": "sentDateTime desc",
            }
            headers = {"Authorization": f"Bearer {access_token}"}

            collected: List[Dict] = []
            page_count = 0
            max_pages = 100 if limit == 0 else (limit // 100) + 1  # Protection contre boucle infinie

            logger.info(f"Starting message sync: limit={limit}, days={days}, max_pages={max_pages}")

            while request_url and page_count < max_pages:
                # Si limit > 0, arrêter quand on a assez
                if limit > 0 and len(collected) >= limit:
                    break

                # Retry logic pour 429/503
                for attempt in range(3):
                    try:
                        if params is not None:
                            response = await client.get(request_url, params=params, headers=headers)
                        else:
                            response = await client.get(request_url, headers=headers)

                        # Rate limiting
                        if response.status_code in (429, 503):
                            retry_after = int(response.headers.get("Retry-After", 2))
                            wait_time = retry_after if attempt == 0 else retry_after * 2
                            logger.warning(
                                f"Graph API {response.status_code}, waiting {wait_time}s (attempt {attempt + 1}/3)"
                            )
                            await asyncio.sleep(wait_time)
                            continue

                        # Erreur
                        if response.status_code >= 400:
                            logger.error(f"Graph API error {response.status_code}: {response.text[:500]}")
                            response.raise_for_status()

                        break

                    except httpx.TimeoutException as e:
                        logger.error(f"Graph API timeout (attempt {attempt + 1}/3): {e}")
                        if attempt == 2:
                            raise
                        await asyncio.sleep(2)

                if response is None or response.status_code >= 400:
                    break

                data = response.json()
                page_messages = data.get("value", [])
                collected.extend(page_messages)
                page_count += 1

                logger.info(f"Page {page_count}: {len(page_messages)} messages (total: {len(collected)})")

                # Préparer page suivante
                request_url = data.get("@odata.nextLink")
                params = None  # nextLink contient déjà tout

            logger.info(f"Sync complete: {len(collected)} messages collected across {page_count} pages")

            # Tronquer si limit > 0
            if limit > 0:
                return collected[:limit]
            return collected

    async def _list_child_folders(
        self, client: httpx.AsyncClient, folder_id: str, headers: dict
    ) -> List[Dict]:
        """
        Liste récursivement les sous-dossiers d'un dossier

        Args:
            client: Client httpx
            folder_id: ID du dossier parent
            headers: Headers avec Authorization

        Returns:
            Liste de sous-dossiers
        """
        url = f"{self.GRAPH_BASE_URL}/me/mailFolders/{folder_id}/childFolders"
        folders = []
        params = {"$top": 100}

        while url:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            folders.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
            params = None  # nextLink contient déjà les params

        return folders

    async def list_all_primary_folders(self, access_token: str) -> List[Dict]:
        """
        Liste TOUS les dossiers de la boîte primaire (récursif, sans archives)

        Args:
            access_token: Token d'accès Microsoft

        Returns:
            Liste complète de dossiers (racine + enfants)
        """
        import logging

        logger = logging.getLogger(__name__)

        headers = {"Authorization": f"Bearer {access_token}"}
        root_url = f"{self.GRAPH_BASE_URL}/me/mailFolders"
        folders = []
        params = {"$top": 100}

        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Récupérer dossiers racine
            url = root_url
            while url:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()

                for folder in data.get("value", []):
                    # Exclure archives
                    well_known = (folder.get("wellKnownName") or "").lower()
                    if well_known in {"archivemsgfolderroot", "archive"}:
                        logger.info(f"Skipping archive folder: {folder.get('displayName')}")
                        continue
                    folders.append(folder)

                url = data.get("@odata.nextLink")
                params = None

            # 2. Descendre récursivement dans les sous-dossiers
            all_folders = []
            queue = folders[:]

            while queue:
                parent = queue.pop(0)
                all_folders.append(parent)

                # Récupérer enfants
                try:
                    children = await self._list_child_folders(
                        client, parent["id"], headers
                    )

                    for child in children:
                        well_known = (child.get("wellKnownName") or "").lower()
                        if well_known in {"archivemsgfolderroot", "archive"}:
                            continue
                        queue.append(child)

                except Exception as e:
                    logger.warning(
                        f"Failed to list children of {parent.get('displayName')}: {e}"
                    )
                    continue

        logger.info(f"Found {len(all_folders)} primary folders")
        return all_folders

    async def _fetch_folder_messages(
        self,
        access_token: str,
        folder_id: str,
        start_date: str,
        limit: int = None,
    ) -> List[Dict]:
        """
        Récupère messages d'un dossier spécifique avec pagination

        Args:
            access_token: Token d'accès Microsoft
            folder_id: ID du dossier
            start_date: Date de début ISO (format: 2025-01-01T00:00:00Z)
            limit: Limite optionnelle

        Returns:
            Liste de messages
        """
        import asyncio
        import logging

        logger = logging.getLogger(__name__)

        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{self.GRAPH_BASE_URL}/me/mailFolders/{folder_id}/messages"
        params = {
            "$top": 100,
            "$select": "id,subject,from,toRecipients,receivedDateTime,body,uniqueBody,parentFolderId,hasAttachments",
            "$filter": f"receivedDateTime ge {start_date}",
            "$orderby": "receivedDateTime desc",
        }

        collected = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            while url:
                # Retry logic
                for attempt in range(3):
                    try:
                        if params is not None:
                            response = await client.get(url, headers=headers, params=params)
                        else:
                            response = await client.get(url, headers=headers)

                        if response.status_code in (429, 503):
                            retry_after = int(response.headers.get("Retry-After", 2))
                            wait_time = retry_after * (attempt + 1)
                            logger.warning(
                                f"Rate limit, waiting {wait_time}s (attempt {attempt + 1}/3)"
                            )
                            await asyncio.sleep(wait_time)
                            continue

                        response.raise_for_status()
                        break

                    except httpx.TimeoutException:
                        if attempt == 2:
                            raise
                        await asyncio.sleep(2)

                data = response.json()
                messages = data.get("value", [])
                collected.extend(messages)

                if limit and len(collected) >= limit:
                    return collected[:limit]

                url = data.get("@odata.nextLink")
                params = None

        return collected

    async def get_recent_messages_from_all_folders(
        self, access_token: str, days: int = 90, limit: int = 0
    ) -> List[Dict]:
        """
        Récupère messages de TOUS les dossiers primaires (sans archives)

        Stratégie:
        1. Liste tous les dossiers (récursif)
        2. Priorise Inbox et SentItems
        3. Récupère messages dossier par dossier
        4. Déduplique par ID

        Args:
            access_token: Token d'accès Microsoft
            days: Nombre de jours dans le passé
            limit: Limite (0 = illimité)

        Returns:
            Liste dédupliquée de messages
        """
        import logging
        from datetime import datetime, timezone, timedelta

        logger = logging.getLogger(__name__)

        # 1. Lister tous les dossiers
        start_time = datetime.now()
        folders = await self.list_all_primary_folders(access_token)
        logger.info(f"Listed {len(folders)} folders in {(datetime.now() - start_time).total_seconds():.2f}s")

        # 2. Prioriser Inbox/Sent pour remplir vite
        def folder_priority(folder: Dict) -> int:
            name = (folder.get("wellKnownName") or folder.get("displayName", "")).lower()
            if name in {"inbox", "boîte de réception"}:
                return 0
            if name in {"sentitems", "éléments envoyés"}:
                return 1
            return 2

        folders.sort(key=folder_priority)

        # 3. Date de début
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+00:00", "Z")

        # 4. Récupérer messages dossier par dossier
        seen_ids = set()
        collected = []

        for folder in folders:
            folder_name = folder.get("displayName", folder.get("id"))
            logger.info(f"Fetching messages from folder: {folder_name}")

            try:
                messages = await self._fetch_folder_messages(
                    access_token, folder["id"], start_date, limit=None
                )

                # Dédupliquer
                for msg in messages:
                    msg_id = msg.get("id")
                    if msg_id and msg_id not in seen_ids:
                        seen_ids.add(msg_id)
                        collected.append(msg)

                        if limit and len(collected) >= limit:
                            logger.info(
                                f"Reached limit of {limit} messages across {len(seen_ids)} unique"
                            )
                            return collected[:limit]

                logger.info(
                    f"Folder {folder_name}: {len(messages)} messages, {len(collected)} total unique"
                )

            except Exception as e:
                logger.error(f"Failed to fetch messages from {folder_name}: {e}")
                continue

        logger.info(
            f"Collected {len(collected)} unique messages from {len(folders)} folders"
        )
        return collected

    async def get_sent_messages_without_reply(
        self, access_token: str, older_than_days: int = 3
    ) -> List[Dict]:
        """
        Détecte les threads envoyés sans réponse depuis X jours

        Args:
            access_token: Token d'accès Microsoft
            older_than_days: Délai minimum sans réponse (défaut: 3 jours)

        Returns:
            Liste de threads sans réponse
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=older_than_days)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            # Récupérer messages envoyés
            response = await client.get(
                f"{self.GRAPH_BASE_URL}/me/mailFolders/SentItems/messages",
                params={
                    "$top": 100,
                    "$select": "id,conversationId,subject,toRecipients,sentDateTime",
                    "$filter": f"sentDateTime lt {cutoff_date}",
                    "$orderby": "sentDateTime desc",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )

            response.raise_for_status()
            sent_messages = response.json().get("value", [])

            # Pour chaque message, vérifier s'il y a eu une réponse
            unanswered = []
            for msg in sent_messages:
                conversation_id = msg.get("conversationId")

                # Chercher réponse dans la conversation
                reply_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/messages",
                    params={
                        "$top": 5,
                        "$filter": f"conversationId eq '{conversation_id}' and sentDateTime gt {msg['sentDateTime']}",
                        "$select": "id",
                    },
                    headers={"Authorization": f"Bearer {access_token}"},
                )

                replies = reply_response.json().get("value", [])

                # Si aucune réponse, ajouter à la liste
                if not replies:
                    to_email = msg["toRecipients"][0]["emailAddress"]["address"] if msg.get("toRecipients") else None

                    unanswered.append({
                        "thread_id": conversation_id,
                        "message_id": msg["id"],
                        "subject": msg.get("subject", "(Sans sujet)"),
                        "recipient": to_email,
                        "sent_date": msg["sentDateTime"],
                        "older_than_days": (datetime.utcnow() - datetime.fromisoformat(msg["sentDateTime"].replace("Z", "+00:00"))).days,
                    })

            return unanswered

    # ==========================================
    # Filtres anti-pollution
    # ==========================================

    # Blocklist emails marketing/newsletters
    EMAIL_BLOCKLIST_PATTERNS = [
        r"noreply",
        r"no-reply",
        r"notification",
        r"newsletter",
        r"marketing",
        r"promo",
        r"support@.*",
        r"info@.*",
        r"contact@.*",
        r".*@outlook\.com$",  # Emails publicitaires Outlook
        r".*@.*\.onmicrosoft\.com$",
        r"bounce",
        r"mailer",
        r"postmaster",
        r"unsubscribe",
    ]

    def is_marketing_email(self, email: str) -> bool:
        """
        Détecte si un email est probablement du marketing/spam

        Args:
            email: Adresse email à vérifier

        Returns:
            True si email marketing, False sinon
        """
        if not email:
            return True

        email_lower = email.lower()

        # Vérifier contre la blocklist
        for pattern in self.EMAIL_BLOCKLIST_PATTERNS:
            if re.search(pattern, email_lower):
                return True

        return False

    # ==========================================
    # Parsing Signatures
    # ==========================================

    def parse_signature(self, html_body: str) -> Optional[Dict]:
        """
        Extrait les informations d'une signature email

        Args:
            html_body: Corps HTML de l'email

        Returns:
            {
                "email": "alice.durand@acme.com",
                "phone": "+33184201234",
                "job_title": "Head of Sales",
                "company": "ACME Corp",
                "address": "123 rue de la Paix, 75001 Paris"
            }
        """
        if not html_body:
            return None

        # Parser HTML
        soup = BeautifulSoup(html_body, "html.parser")
        text = soup.get_text()

        # Patterns regex
        email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        phone_pattern = r"(?:Tel|Tél|Phone|Mobile|Mob)[\s:]*([+]?[0-9][\s\-\.\(\)0-9]{7,18})"

        # Extraction
        signature = {}

        # Email
        emails = re.findall(email_pattern, text)
        if emails:
            # Prendre le premier email qui n'est pas microsoft.com
            for email in emails:
                if "microsoft.com" not in email.lower():
                    signature["email"] = email
                    break

        # Téléphone
        phone_match = re.search(phone_pattern, text, re.IGNORECASE)
        if phone_match:
            signature["phone"] = phone_match.group(1).strip()

        # Fonction (patterns courants)
        job_patterns = [
            r"(CEO|CTO|CFO|COO|Directeur|Director|Manager|Head of|VP|Responsable|Président)",
            r"([A-Z][a-z]+\s+(?:de|of)\s+[A-Z][a-z]+)",
        ]
        for pattern in job_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                signature["job_title"] = match.group(0).strip()
                break

        # Entreprise (chercher après fonction ou avant email)
        company_pattern = r"(?:chez|at|@)\s+([A-Z][A-Za-z0-9\s&]+)(?:\n|$|<br)"
        company_match = re.search(company_pattern, text)
        if company_match:
            signature["company"] = company_match.group(1).strip()

        return signature if signature else None

    def extract_signatures_from_messages(
        self, messages: List[Dict], filter_marketing: bool = True
    ) -> List[Dict]:
        """
        Extrait les signatures de plusieurs messages

        Args:
            messages: Liste de messages Outlook
            filter_marketing: Filtrer les emails marketing (défaut: True)

        Returns:
            Liste de signatures uniques (filtrées)
        """
        signatures = []
        seen_emails = set()

        for msg in messages:
            body = msg.get("body", {}).get("content", "")
            signature = self.parse_signature(body)

            if signature and signature.get("email"):
                email = signature["email"]

                # Filtrer emails marketing
                if filter_marketing and self.is_marketing_email(email):
                    continue

                # Éviter doublons
                if email not in seen_emails:
                    seen_emails.add(email)
                    signature["source_message_id"] = msg.get("id")
                    signature["source_date"] = msg.get("sentDateTime")
                    signature["is_validated"] = False  # Nécessite validation manuelle
                    signatures.append(signature)

        return signatures

    # ==========================================
    # Helpers
    # ==========================================

    def normalize_phone_from_signature(self, phone: str, country_code: str = "FR") -> Optional[str]:
        """
        Normalise un téléphone extrait d'une signature

        Args:
            phone: Numéro brut
            country_code: Code pays (défaut: FR)

        Returns:
            Numéro au format E.164 (+33...)
        """
        try:
            from phonenumbers import parse as pn_parse, format_number, PhoneNumberFormat, is_possible_number

            num = pn_parse(phone, country_code)
            if is_possible_number(num):
                return format_number(num, PhoneNumberFormat.E164)
        except Exception:
            pass

        return None
