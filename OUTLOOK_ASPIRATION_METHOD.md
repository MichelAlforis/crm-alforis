# 🔍 Méthode d'aspiration Outlook actuelle - Pour review ChatGPT

**Problème**: Ne récupère que **6 messages** alors que la boîte devrait en contenir bien plus.

---

## 📋 Méthode actuelle (Mode 3 - Aspirateur)

### Fichier: `crm-backend/services/outlook_integration.py`

### Méthode: `get_recent_messages()` (lignes 493-586)

```python
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

        # ⚠️ REQUÊTE GRAPH API ACTUELLE
        params = {
            "$top": min(limit, 100) if limit > 0 else 100,  # Max 100 par page
            "$select": "id,subject,from,toRecipients,sentDateTime,body,uniqueBody",
            "$filter": f"sentDateTime ge {start_date}",  # ⚠️ FILTRE DATE
            "$orderby": "sentDateTime desc",
        }
        headers = {"Authorization": f"Bearer {access_token}"}

        collected: List[Dict] = []
        page_count = 0
        max_pages = 100 if limit == 0 else (limit // 100) + 1

        logger.info(f"Starting message sync: limit={limit}, days={days}, max_pages={max_pages}")

        # Boucle de pagination
        while request_url and page_count < max_pages:
            if limit > 0 and len(collected) >= limit:
                break

            # Retry logic pour 429/503
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

            # ⚠️ PAGINATION VIA @odata.nextLink
            request_url = data.get("@odata.nextLink")
            params = None  # nextLink contient déjà tous les paramètres

        logger.info(f"Sync complete: {len(collected)} messages collected across {page_count} pages")

        if limit > 0:
            return collected[:limit]
        return collected
```

---

## 🔍 Requête Graph API construite

**URL de base**:
```
GET https://graph.microsoft.com/v1.0/me/messages
```

**Paramètres actuels** (exemple avec days=90, limit=200):
```
$top: 100
$select: id,subject,from,toRecipients,sentDateTime,body,uniqueBody
$filter: sentDateTime ge 2025-07-31T09:39:00.000000Z
$orderby: sentDateTime desc
```

**Headers**:
```
Authorization: Bearer <access_token>
```

---

## 📊 Résultat observé

### Test effectué:
```bash
GET /api/v1/integrations/outlook/sync?limit=200&days=90
```

### Logs serveur:
```
2025-10-29 09:39:09,722 - INFO - Starting message sync: limit=200, days=90, max_pages=3
2025-10-29 09:39:10,176 - INFO - Page 1: 6 messages (total: 6)
2025-10-29 09:39:10,176 - INFO - Sync complete: 6 messages collected across 1 pages
```

### Réponse Graph API:
```json
{
  "value": [
    { "id": "xxx1", "subject": "...", "sentDateTime": "2025-10-20T..." },
    { "id": "xxx2", "subject": "...", "sentDateTime": "2025-10-19T..." },
    { "id": "xxx3", "subject": "...", "sentDateTime": "2025-10-18T..." },
    { "id": "xxx4", "subject": "...", "sentDateTime": "2025-10-17T..." },
    { "id": "xxx5", "subject": "...", "sentDateTime": "2025-10-16T..." },
    { "id": "xxx6", "subject": "...", "sentDateTime": "2025-10-15T..." }
  ],
  "@odata.nextLink": null  // ⚠️ PAS DE NEXT LINK
}
```

**Constat**: Graph API retourne seulement 6 messages et **aucun `@odata.nextLink`**, ce qui signifie qu'il considère avoir retourné tous les messages correspondant au filtre.

---

## ❓ Questions pour ChatGPT

### 1. **Le filtre `$filter` est-il trop restrictif ?**

Le filtre actuel :
```
$filter: sentDateTime ge 2025-07-31T09:39:00.000000Z
```

**Questions**:
- Est-ce que `sentDateTime` inclut les emails dans **tous les dossiers** (Boîte de réception, Envoyés, Archivés, etc.) ?
- Faut-il ajouter un filtre sur `isDraft eq false` ou `isRead` ?
- Le filtre exclut-il des messages légitimes ?

### 2. **Les dossiers Outlook sont-ils tous inclus ?**

L'endpoint `/me/messages` interroge-t-il :
- ✅ Boîte de réception
- ✅ Éléments envoyés
- ❓ Dossiers archivés
- ❓ Dossiers personnalisés
- ❓ Éléments supprimés

**Alternative possible** : Faut-il utiliser `/me/mailFolders/{folderId}/messages` pour chaque dossier et agréger ?

### 3. **Permissions/Scopes insuffisants ?**

**Scopes actuels** (hardcodés):
```
Mail.Read Contacts.Read offline_access
```

**Questions**:
- `Mail.Read` donne-t-il accès à TOUS les messages ou seulement boîte de réception ?
- Faut-il `Mail.ReadBasic` + `Mail.Read` + `Mail.ReadWrite` ?
- Les archives nécessitent-elles un scope supplémentaire ?

### 4. **Limitation Exchange/Outlook ?**

**Hypothèses possibles**:
- Le compte est de type **Exchange** avec archivage automatique activé (emails >30j archivés ailleurs)
- Le compte a des **règles de rétention** qui limitent l'accès via API
- Le compte est **nouveau** (créé récemment) et n'a vraiment que 6 emails

### 5. **Test de vérification suggéré**

**Requête directe sans filtre**:
```bash
GET https://graph.microsoft.com/v1.0/me/messages?$top=100&$select=id,subject,sentDateTime
```

Si cette requête retourne **plus de 6 messages**, alors le problème vient du filtre `$filter: sentDateTime ge ...`.

Si elle retourne **toujours 6 messages**, alors :
- Soit le compte n'a vraiment que 6 messages accessibles via API
- Soit les permissions sont insuffisantes
- Soit il faut interroger d'autres endpoints (mailFolders)

---

## 🔧 Tests de diagnostic à effectuer

### Test 1: Requête sans filtre date

**Modifier temporairement** `get_recent_messages()`:
```python
params = {
    "$top": 100,
    "$select": "id,subject,from,sentDateTime",
    # "$filter": f"sentDateTime ge {start_date}",  # ⚠️ COMMENTER
    "$orderby": "sentDateTime desc",
}
```

**Résultat attendu**:
- Si retourne **plus de 6 messages** → Le filtre date est trop restrictif
- Si retourne **toujours 6** → Le compte n'a vraiment que 6 messages accessibles

### Test 2: Lister tous les dossiers

**Nouvel endpoint**:
```python
@router.get("/outlook/debug/folders")
async def list_mail_folders(...):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.microsoft.com/v1.0/me/mailFolders",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        folders = response.json().get("value", [])

        # Pour chaque dossier, compter les messages
        folder_counts = []
        for folder in folders:
            count_response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/mailFolders/{folder['id']}/messages/$count",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            folder_counts.append({
                "name": folder["displayName"],
                "id": folder["id"],
                "count": int(count_response.text)
            })

        return {"folders": folder_counts}
```

**Résultat attendu**:
- Voir combien de messages par dossier
- Identifier si les messages sont dans des dossiers non interrogés

### Test 3: Interroger dossier "Éléments envoyés"

```python
# Au lieu de /me/messages
request_url = f"{self.GRAPH_BASE_URL}/me/mailFolders/sentitems/messages"
```

**Résultat attendu**:
- Vérifier si les emails envoyés sont comptés séparément

### Test 4: Vérifier les scopes du token

**Décoder le JWT access token**:
```python
import base64
import json

# Le token Graph est un JWT, on peut lire les claims sans le valider
parts = access_token.split('.')
payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
scopes = payload.get('scp', '').split()
print("Scopes dans le token:", scopes)
```

**Résultat attendu**:
- Vérifier que `Mail.Read` est bien présent
- Voir s'il y a d'autres scopes restrictifs

---

## 💡 Solutions possibles

### Solution A: Interroger tous les dossiers

```python
async def get_all_messages_from_all_folders(self, access_token: str, days: int = 30):
    """Récupère messages de TOUS les dossiers"""

    # 1. Lister tous les dossiers
    folders = await self._list_mail_folders(access_token)

    all_messages = []

    # 2. Pour chaque dossier, récupérer messages
    for folder in folders:
        folder_messages = await self._get_messages_from_folder(
            access_token,
            folder['id'],
            days
        )
        all_messages.extend(folder_messages)

    # 3. Dédupliquer par ID (au cas où)
    seen = set()
    unique_messages = []
    for msg in all_messages:
        if msg['id'] not in seen:
            seen.add(msg['id'])
            unique_messages.append(msg)

    return unique_messages
```

### Solution B: Utiliser Delta query (changements incrémentaux)

Au lieu de filtrer par date, utiliser `/me/messages/delta` qui retourne tous les changements depuis la dernière synchro :

```python
async def sync_with_delta_query(self, access_token: str, delta_link: str = None):
    """
    Synchronisation incrémentale via delta query

    Première fois: retourne TOUS les messages + deltaLink
    Fois suivantes: retourne seulement les nouveaux/modifiés
    """

    if delta_link:
        url = delta_link  # Utiliser le lien précédent
    else:
        url = f"{self.GRAPH_BASE_URL}/me/messages/delta"

    # Graph retourne tout jusqu'à avoir un @odata.deltaLink
    # Stocker ce deltaLink pour la prochaine synchro
```

### Solution C: Augmenter les scopes

Demander des scopes plus larges lors de l'OAuth :

```python
# Dans outlook_integration.py
self.scopes = [
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.ReadBasic",
    "https://graph.microsoft.com/Mail.ReadWrite",  # Nécessaire pour archives ?
    "https://graph.microsoft.com/MailboxSettings.Read",
    "offline_access"
]
```

Puis **reconnecter Outlook** pour obtenir les nouveaux scopes.

---

## 📝 Résumé pour ChatGPT

**Situation actuelle** :
- ✅ Code pagination fonctionnel (boucle while, @odata.nextLink, retry 429)
- ❌ Récupère seulement 6 messages alors que la boîte devrait en contenir plus
- ❓ Graph API ne retourne pas de `@odata.nextLink` (considère avoir tout retourné)

**Requête Graph construite** :
```
GET /me/messages
  ?$top=100
  &$select=id,subject,from,toRecipients,sentDateTime,body,uniqueBody
  &$filter=sentDateTime ge 2025-07-31T09:39:00.000000Z
  &$orderby=sentDateTime desc
```

**Questions principales** :
1. Le filtre `$filter: sentDateTime ge ...` est-il trop restrictif ?
2. `/me/messages` inclut-il tous les dossiers (Envoyés, Archives, etc.) ?
3. Les scopes `Mail.Read` sont-ils suffisants ?
4. Faut-il interroger `/me/mailFolders/{id}/messages` séparément ?

**Tests suggérés** :
- Retirer le filtre date et voir si on a plus de messages
- Lister tous les dossiers et compter messages par dossier
- Décoder les scopes du token pour vérifier permissions
- Tester avec `/me/mailFolders/sentitems/messages`

**Attente** : Retour de ChatGPT avec diagnostic et solution appropriée.

---

**Fichiers concernés** :
- `crm-backend/services/outlook_integration.py` (lignes 493-586)
- `crm-backend/api/routes/integrations.py` (lignes 380-468)

**Dernière mise à jour** : 2025-10-29
**Auteur** : Claude (Assistant IA)
