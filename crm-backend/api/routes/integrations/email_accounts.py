"""
Routes API Email Accounts - CRUD multi-provider

Endpoints (7 au total):
✅ POST   /                        - Créer compte email
✅ GET    /                        - Lister comptes
✅ POST   /{id}/test              - Tester connexion
✅ DELETE /{id}                   - Supprimer compte
✅ POST   /debug/email-accounts/{user_id} - Debug: créer compte
✅ GET    /debug/email-accounts/{user_id} - Debug: lister comptes

Providers supportés:
- Microsoft O365 (OAuth + EWS/IMAP)
- IONOS (EWS)
- Generic IMAP (Gmail, etc.)
"""

from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.encryption import encrypt_value
from models.user import User
from models.user_email_account import UserEmailAccount

router = APIRouter()


# ==========================================
# HELPER FUNCTION
# ==========================================

def _get_user_context_from_token(current_user: dict, db: Session) -> tuple[int, int]:
    """
    Extract (user_id, team_id) from JWT token pour MULTI-TENANT isolation.

    Returns:
        tuple[int, int]: (user_id, team_id)

    Raises:
        HTTPException: Si user/team non trouvé ou team_id manquant
    """
    user_id_raw = current_user.get("user_id") or current_user.get("sub")
    if not user_id_raw:
        raise HTTPException(401, "User ID manquant dans le token")

    # Try converting to int
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        # Fallback: lookup user by email if user_id is non-numeric
        user_email = current_user.get("email")
        if not user_email:
            raise HTTPException(401, f"User ID non-numérique et pas d'email: {user_id_raw}")
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(404, f"Utilisateur non trouvé: {user_email}")
        user_id = user.id

    # Récupérer le team_id de l'utilisateur (OBLIGATOIRE pour multi-tenant)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, f"User {user_id} non trouvé")

    if not user.team_id:
        raise HTTPException(403, f"User {user_id} n'a pas de team assignée - multi-tenant requis")

    return (user_id, user.team_id)


class AddEmailAccountRequest(BaseModel):
    """Request pour ajouter un compte email"""
    email: str
    protocol: str  # "ews", "imap", "graph"
    server: str | None = None  # "exchange.ionos.eu", "imap.ionos.fr:993"
    password: str | None = None  # Pour EWS/IMAP Basic Auth
    provider: str | None = None  # "ionos", "gmail", "outlook", etc (optionnel, pour référence)


@router.post("")
async def add_email_account(
    request: AddEmailAccountRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ajouter un compte email pour l'utilisateur connecté.

    Supporte plusieurs protocols:
    - **EWS** (Exchange Web Services): IONOS, Microsoft Exchange on-premise
    - **IMAP**: Gmail, IONOS mail, autres
    - **Graph API**: Microsoft 365 OAuth (à venir)

    Exemples:

    IONOS EWS (Exchange):
    ```json
    {
        "email": "michel.marques@alforis.fr",
        "protocol": "ews",
        "server": "exchange.ionos.eu",
        "password": "...",
        "provider": "ionos"
    }
    ```

    IONOS IMAP:
    ```json
    {
        "email": "contact@alforis.fr",
        "protocol": "imap",
        "server": "imap.ionos.fr:993",
        "password": "...",
        "provider": "ionos"
    }
    ```
    """
    from core.encryption import encrypt_value

    # Validation selon protocol
    if request.protocol in ("ews", "imap"):
        if not request.server:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'server'")
        if not request.password:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'password'")
    elif request.protocol == "graph":
        raise HTTPException(400, "Graph API OAuth pas encore implémenté - utilisez EWS ou IMAP")
    else:
        raise HTTPException(400, f"Protocol inconnu: {request.protocol}. Supportés: ews, imap")

    # MULTI-TENANT: Récupérer user_id ET team_id
    user_id, team_id = _get_user_context_from_token(current_user, db)

    # Vérifier si compte existe déjà DANS CETTE TEAM (isolation)
    existing = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id,  # ISOLATION PAR TEAM!
        UserEmailAccount.email == request.email,
        UserEmailAccount.protocol == request.protocol,
    ).first()

    if existing:
        raise HTTPException(400, f"Compte {request.email} ({request.protocol}) existe déjà dans votre équipe")

    # Créer le compte avec team_id (ISOLATION MULTI-TENANT)
    account = UserEmailAccount(
        team_id=team_id,  # OBLIGATOIRE - contexte tenant
        user_id=user_id,  # Audit trail - qui a configuré
        email=request.email,
        protocol=request.protocol,
        server=request.server,
        provider=request.provider or request.protocol,
        encrypted_password=encrypt_value(request.password) if request.password else None,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "account": {
            "id": account.id,
            "email": account.email,
            "protocol": account.protocol,
            "server": account.server,
            "provider": account.provider,
            "is_active": account.is_active,
            "created_at": account.created_at.isoformat(),
        }
    }


@router.get("")
async def list_email_accounts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Liste tous les comptes email de la TEAM (multi-tenant isolation).
    Retourne TOUS les comptes de l'équipe, pas seulement ceux de l'user.
    """
    user_id, team_id = _get_user_context_from_token(current_user, db)

    # ISOLATION PAR TEAM - tous les comptes de l'équipe
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id  # MULTI-TENANT!
    ).all()

    return {
        "accounts": [
            {
                "id": acc.id,
                "email": acc.email,
                "protocol": acc.protocol,
                "server": acc.server,
                "provider": acc.provider,
                "is_active": acc.is_active,
                "created_at": acc.created_at.isoformat(),
            }
            for acc in accounts
        ]
    }


@router.post("/{account_id}/test")
async def test_email_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tester la connexion d'un compte email (avec isolation team).
    """
    from mail.provider_factory import MailProviderFactory

    user_id, team_id = _get_user_context_from_token(current_user, db)

    # Vérifier que le compte appartient à la TEAM (sécurité multi-tenant)
    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id,  # ISOLATION!
    ).first()

    if not account:
        raise HTTPException(404, "Account not found or access denied")

    result = await MailProviderFactory.test_connection(account)
    return result


@router.delete("/{account_id}")
async def delete_email_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Supprimer un compte email (avec isolation team).
    """
    user_id, team_id = _get_user_context_from_token(current_user, db)

    # Vérifier que le compte appartient à la TEAM (sécurité multi-tenant)
    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id,  # ISOLATION!
    ).first()

    if not account:
        raise HTTPException(404, "Account not found or access denied")

    db.delete(account)
    db.commit()

    return {"success": True, "message": f"Account {account.email} supprimé"}


# =============================================================================
# Email Sync Engine (Phase 1)
# =============================================================================

@router.post("/sync-all-emails")
async def sync_all_emails(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    since_days: int = Query(default=7, description="Nombre de jours à synchroniser"),
    limit_per_account: Optional[int] = Query(default=None, description="Limite d'emails par compte (pour tests)"),
):
    """
    **Phase 1: Email Sync Engine**

    Synchronise tous les emails de tous les comptes actifs de la team:
    1. ✅ Récupération multi-provider (EWS, IMAP, Graph)
    2. ✅ Déduplication SHA256 par content_hash
    3. ✅ Isolation multi-tenant stricte (team_id)
    4. ✅ Auto-linking emails → people (par sender_email)
    5. ⏳ Auto-création crm_interactions (TODO Phase 1.5)
    6. ⏳ AFTPM compliance tagging (TODO Phase 3)

    Returns:
        - total_emails_synced: Nombre d'emails importés
        - duplicates_skipped: Doublons évités grâce au hash
        - auto_linked_people: Emails liés automatiquement à des contacts
        - accounts_processed: Comptes synchronisés avec succès
        - errors: Erreurs rencontrées par compte
    """
    from mail.provider_factory import MailProviderFactory
    from models.email_message import EmailMessage
    from models.person import Person
    import logging

    logger = logging.getLogger("crm-api")

    # 1. CONTEXTE MULTI-TENANT
    user_id, team_id = _get_user_context_from_token(current_user, db)
    logger.info(f"🔄 Sync emails - user_id={user_id}, team_id={team_id}, since_days={since_days}")

    # 2. RÉCUPÉRER TOUS LES COMPTES ACTIFS DE LA TEAM
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id,
        UserEmailAccount.is_active == True,
    ).all()

    if not accounts:
        return {
            "success": True,
            "message": "Aucun compte email configuré pour cette team",
            "total_emails_synced": 0,
            "duplicates_skipped": 0,
            "auto_linked_people": 0,
            "accounts_processed": 0,
            "errors": [],
        }

    # 3. SYNC CHAQUE COMPTE
    since = datetime.now(timezone.utc) - timedelta(days=since_days)

    total_synced = 0
    total_duplicates = 0
    total_linked = 0
    total_interactions_created = 0
    accounts_ok = 0
    errors = []
    account_details = []

    for account in accounts:
        account_stats = {
            "account_id": account.id,
            "email": account.email,
            "protocol": account.protocol,
            "server": account.server,
            "emails_fetched": 0,
            "emails_new": 0,
            "emails_duplicates": 0,
            "auto_linked": 0,
            "interactions_created": 0,
            "error": None,
        }

        try:
            logger.info(f"📧 Syncing {account.email} ({account.protocol}) depuis {since.isoformat()}")

            # 3.1 Créer le provider (EWS/IMAP/Graph)
            provider = MailProviderFactory.create_provider(account)

            # 3.2 Fetch messages depuis le provider
            messages = await provider.sync_messages_since(since)
            account_stats["emails_fetched"] = len(messages)

            # Limiter pour tests
            if limit_per_account and len(messages) > limit_per_account:
                messages = messages[:limit_per_account]
                logger.warning(f"⚠️ Limite {limit_per_account} appliquée (test mode)")

            logger.info(f"   → {len(messages)} emails récupérés")

            # 3.3 Upsert dans email_messages (avec déduplication)
            for msg in messages:
                try:
                    # Calculer content_hash pour déduplication
                    # Handle both EWS format (string) and Graph API format (dict)
                    from_field = msg.get("from")
                    if isinstance(from_field, dict):
                        sender = from_field.get("email", "") or msg.get("sender", "")
                        sender_name = from_field.get("name", "")
                    else:
                        sender = from_field or msg.get("sender", "")
                        sender_name = msg.get("sender_name", "")

                    subject = msg.get("subject", "") or ""

                    # Handle both date formats
                    sent_at = msg.get("sent_at") or msg.get("receivedDateTime") or msg.get("date")
                    if sent_at:
                        # Convert ISO string to datetime if needed
                        if isinstance(sent_at, str):
                            from dateutil import parser as date_parser
                            sent_at = date_parser.parse(sent_at)
                    else:
                        sent_at = datetime.now(timezone.utc)

                    body_preview = (msg.get("body", "") or msg.get("snippet", ""))[:200]

                    content_hash = EmailMessage.compute_content_hash(
                        sender=sender,
                        subject=subject,
                        sent_at=sent_at,
                        body_preview=body_preview
                    )

                    # Vérifier si déjà existant (unique: team_id + account_id + content_hash)
                    existing = db.query(EmailMessage).filter(
                        EmailMessage.team_id == team_id,
                        EmailMessage.account_id == account.id,
                        EmailMessage.content_hash == content_hash,
                    ).first()

                    if existing:
                        account_stats["emails_duplicates"] += 1
                        total_duplicates += 1
                        continue  # Skip doublon

                    # AUTO-LINK: Détecter si sender existe dans people (sans team_id car Person n'a pas ce champ)
                    linked_person_id = None
                    if sender:
                        person = db.query(Person).filter(
                            Person.email == sender,
                        ).first()

                        if person:
                            linked_person_id = person.id
                            account_stats["auto_linked"] += 1
                            total_linked += 1
                            logger.debug(f"   🔗 Auto-linked {sender} → Person#{person.id}")

                    # Handle recipients - convert list of strings to list of dicts if needed
                    recipients_to = msg.get("to", [])
                    if recipients_to and isinstance(recipients_to[0], str):
                        recipients_to = [{"email": email} for email in recipients_to]

                    recipients_cc = msg.get("cc", [])
                    if recipients_cc and isinstance(recipients_cc[0], str):
                        recipients_cc = [{"email": email} for email in recipients_cc]

                    # Créer nouveau EmailMessage
                    email_msg = EmailMessage(
                        team_id=team_id,
                        account_id=account.id,
                        external_message_id=msg.get("id", "") or msg.get("message_id", "") or str(uuid4()),
                        thread_id=msg.get("conversation_id") or msg.get("thread_id"),
                        in_reply_to=msg.get("in_reply_to"),
                        subject=subject,
                        sender_email=sender,
                        sender_name=sender_name,
                        recipients_to=recipients_to or [],
                        recipients_cc=recipients_cc or [],
                        recipients_bcc=msg.get("bcc", []),
                        body_text=msg.get("body_text"),
                        body_html=msg.get("body", "") or msg.get("body_html"),
                        snippet=msg.get("snippet", "")[:500] if msg.get("snippet") else None,
                        sent_at=sent_at,
                        received_at=msg.get("received_at") or sent_at,
                        is_read=msg.get("is_read", False),
                        is_flagged=msg.get("is_flagged", False),
                        labels=msg.get("categories", []) or [],
                        content_hash=content_hash,
                        linked_person_id=linked_person_id,
                        is_compliance_relevant=False,  # TODO Phase 3: AFTPM detection
                        compliance_tags=[],
                    )

                    db.add(email_msg)
                    account_stats["emails_new"] += 1
                    total_synced += 1

                    # ========================================
                    # PHASE 1.5: Auto-create Interaction
                    # ========================================
                    if linked_person_id:
                        from models.interaction import Interaction

                        # Check if interaction already exists (idempotence)
                        existing_interaction = db.query(Interaction).filter(
                            Interaction.external_source == "email_sync",
                            Interaction.external_id == str(email_msg.id if hasattr(email_msg, 'id') else msg.get("id", "")),
                        ).first()

                        if not existing_interaction:
                            # Determine direction
                            direction = "out" if sender == account.email else "in"

                            # Get person's primary org if available
                            org_id = None
                            if linked_person_id:
                                from models.person import Person
                                person_obj = db.query(Person).filter(Person.id == linked_person_id).first()
                                # Person might have organizations via PersonOrganizationLink, but for now set to None
                                # TODO: Get primary org from PersonOrganizationLink

                            # Create interaction
                            interaction = Interaction(
                                type="email",
                                person_id=linked_person_id,
                                org_id=org_id,
                                title=subject[:200] if subject else "(No subject)",
                                description=email_msg.body_html or email_msg.body_text or "",
                                created_by=user_id,
                                external_source="email_sync",
                                external_id=msg.get("id", ""),
                                direction=direction,
                                thread_id=email_msg.thread_id,
                                interaction_date=email_msg.sent_at,
                                external_participants={
                                    "from": sender,
                                    "to": recipients_to or [],
                                    "cc": recipients_cc or [],
                                },
                                status="done",  # Email already happened, not a todo
                            )

                            db.add(interaction)
                            account_stats["interactions_created"] += 1
                            total_interactions_created += 1
                            logger.debug(f"   📝 Auto-created interaction for email from {sender}")

                except Exception as e_msg:
                    logger.error(f"   ❌ Erreur traitement message: {e_msg}", exc_info=True)
                    # Continue avec les autres messages
                    continue

            # Commit pour ce compte
            db.commit()
            accounts_ok += 1
            logger.info(f"   ✅ {account_stats['emails_new']} nouveaux, {account_stats['emails_duplicates']} doublons, {account_stats['auto_linked']} linked, {account_stats['interactions_created']} interactions")

        except Exception as e:
            db.rollback()
            logger.error(f"   ❌ Erreur sync {account.email}: {e}", exc_info=True)
            account_stats["error"] = str(e)
            errors.append({
                "account_id": account.id,
                "email": account.email,
                "error": str(e),
            })

        account_details.append(account_stats)

    # 4. RÉSULTAT FINAL
    result = {
        "success": True,
        "message": f"Synchronisation terminée: {total_synced} emails importés, {total_interactions_created} interactions créées",
        "total_emails_synced": total_synced,
        "duplicates_skipped": total_duplicates,
        "auto_linked_people": total_linked,
        "interactions_created": total_interactions_created,
        "accounts_processed": accounts_ok,
        "accounts_total": len(accounts),
        "errors": errors,
        "details": account_details,
        "sync_period": {
            "since": since.isoformat(),
            "days": since_days,
        },
    }

    logger.info(f"✅ Sync complete: {total_synced} emails, {total_duplicates} duplicates, {total_linked} linked, {total_interactions_created} interactions")
    return result


# =============================================================================
# TEMP: Debug endpoint sans auth
# =============================================================================

@router.post("/debug/email-accounts/{user_id}")
async def debug_add_email_account(
    user_id: int,
    request: AddEmailAccountRequest,
    db: Session = Depends(get_db),
):
    """
    TEMP: Ajouter un compte email SANS AUTH pour debug.
    """
    from core.encryption import encrypt_value

    # Validation
    if request.protocol in ("ews", "imap"):
        if not request.server:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'server'")
        if not request.password:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'password'")

    # Vérifier si compte existe déjà
    existing = db.query(UserEmailAccount).filter(
        UserEmailAccount.user_id == user_id,
        UserEmailAccount.email == request.email,
        UserEmailAccount.protocol == request.protocol,
    ).first()

    if existing:
        raise HTTPException(400, f"Compte {request.email} ({request.protocol}) existe déjà")

    # Créer le compte
    account = UserEmailAccount(
        user_id=user_id,
        email=request.email,
        protocol=request.protocol,
        server=request.server,
        provider=request.provider or request.protocol,
        encrypted_password=encrypt_value(request.password) if request.password else None,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "account": {
            "id": account.id,
            "email": account.email,
            "protocol": account.protocol,
            "server": account.server,
            "provider": account.provider,
            "is_active": account.is_active,
            "created_at": account.created_at.isoformat(),
        }
    }


@router.get("/debug/email-accounts/{user_id}")
async def debug_list_email_accounts(
    user_id: int,
    db: Session = Depends(get_db),
):
    """TEMP: Liste comptes SANS AUTH"""
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.user_id == user_id
    ).all()

    return {
        "accounts": [
            {
                "id": acc.id,
                "email": acc.email,
                "protocol": acc.protocol,
                "server": acc.server,
                "provider": acc.provider,
                "is_active": acc.is_active,
                "created_at": acc.created_at.isoformat(),
            }
            for acc in accounts
        ]
    }
