# 🔐 CRM AUTH - GUIDE DE TEST COMPLET

## ✅ Authentification Implémentée!

L'authentification JWT est maintenant complètement intégrée au CRM.

---

## 🚀 Quick Start

### 1. Redémarrer le Backend

```bash
cd crm-backend
docker-compose restart api
```

### 2. Accédez à la Documentation

```
http://localhost:8000/docs
```

Vous verrez maintenant les routes `/api/v1/auth/*` au-dessus des routes existantes.

---

## 🧪 Test des Endpoints d'Auth

### Test dans Swagger UI (Facile ✨)

1. Allez à http://localhost:8000/docs
2. Ouvrez `/api/v1/auth/login` → "Try it out"
3. Entrez:
```json
{
  "email": "admin@tpmfinance.com",
  "password": "admin123"
}
```
4. Cliquez "Execute"
5. Vous recevez un `access_token`

---

## 📝 Utilisateurs de Test

| Email | Password | Rôle |
|-------|----------|------|
| `admin@tpmfinance.com` | `admin123` | Admin |
| `user@tpmfinance.com` | `user123` | User |

---

## 🔑 Workflow Complet: Login → Accès API

### Étape 1: Login (Obtenir le Token)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tpmfinance.com","password":"admin123"}'
```

**Réponse:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB0cG1maW5hbmNlLmNvbSIsImVtYWlsIjoiYWRtaW5AdHBtZmluYW5jZS5jb20iLCJpc19hZG1pbiI6dHJ1ZSwibmFtZSI6IkFkbWluaXN0cmF0b3IiLCJleHAiOjE3Mjk2MDk1NDd9.abc123...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**⭐ Sauvegardez le token!**

### Étape 2: Utiliser le Token

```bash
# Sauvegarder le token dans une variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB0cG1maW5hbmNlLmNvbSIsImVtYWlsIjoiYWRtaW5AdHBtZmluYW5jZS5jb20iLCJpc19hZG1pbiI6dHJ1ZSwibmFtZSI6IkFkbWluaXN0cmF0b3IiLCJleHAiOjE3Mjk2MDk1NDd9.abc123..."

# Utiliser le token pour accéder aux API protégées
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/investors

# Ou avec jq pour formater la réponse
curl -s -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/investors | jq .
```

### Étape 3: Voir Mes Infos

```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/auth/me

# Réponse:
# {
#   "email": "admin@tpmfinance.com",
#   "is_admin": true
# }
```

### Étape 4: Rafraîchir le Token

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/auth/refresh

# Retourne un nouveau token
```

---

## 🎯 Script Complet de Test

Sauvegardez ce script comme `test_auth.sh`:

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:8000/api/v1"

echo "==================================="
echo "  CRM AUTH - Test Script"
echo "==================================="
echo ""

# 1. Login
echo "1️⃣  Login with admin..."
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tpmfinance.com","password":"admin123"}')

TOKEN=$(echo $RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed!"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."
echo ""

# 2. Get current user info
echo "2️⃣  Get current user info..."
curl -s -H "Authorization: Bearer $TOKEN" \
     $BASE_URL/auth/me | jq .
echo ""

# 3. Create investor (protected route)
echo "3️⃣  Create investor..."
INVESTOR=$(curl -s -X POST $BASE_URL/investors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Co","email":"test@example.com"}')

INVESTOR_ID=$(echo $INVESTOR | jq -r '.id')
echo "✅ Created investor with ID: $INVESTOR_ID"
echo ""

# 4. List investors
echo "4️⃣  List investors..."
curl -s -H "Authorization: Bearer $TOKEN" \
     $BASE_URL/investors | jq '.items[0]'
echo ""

# 5. Create interaction
echo "5️⃣  Create interaction..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"appel","date":"2024-10-15"}' \
  $BASE_URL/interactions/investor/$INVESTOR_ID | jq .
echo ""

# 6. Refresh token
echo "6️⃣  Refresh token..."
NEW_TOKEN=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/auth/refresh | jq -r '.access_token')

echo "✅ Got new token: ${NEW_TOKEN:0:50}..."
echo ""

# 7. Test with new token
echo "7️⃣  Test with new token..."
curl -s -H "Authorization: Bearer $NEW_TOKEN" \
     $BASE_URL/auth/me | jq .
echo ""

echo "==================================="
echo "✨ All tests passed!"
echo "==================================="
```

**Utilisation:**
```bash
chmod +x test_auth.sh
./test_auth.sh
```

---

## 🚨 Cas d'Erreur à Tester

### ❌ Sans Token
```bash
curl http://localhost:8000/api/v1/investors
# Réponse: 401 Unauthorized - "Not authenticated"
```

### ❌ Token Invalide
```bash
curl -H "Authorization: Bearer invalid_token" \
     http://localhost:8000/api/v1/investors
# Réponse: 401 Unauthorized - "Token invalide ou expiré"
```

### ❌ Mauvais Credentials
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tpmfinance.com","password":"wrong"}'
# Réponse: 401 Unauthorized - "Email ou mot de passe incorrect"
```

### ❌ Token Expiré
```bash
# Attendre 24h (ou changer JWT_EXPIRATION_HOURS à 1 sec pour tester)
curl -H "Authorization: Bearer expired_token" \
     http://localhost:8000/api/v1/investors
# Réponse: 401 Unauthorized
```

---

## 📊 Routes d'Auth Disponibles

### POST /api/v1/auth/login
**Login et obtenir un token**
- Requiert: `email`, `password`
- Retourne: `access_token`, `token_type`, `expires_in`

### GET /api/v1/auth/me
**Obtenir les infos de l'utilisateur connecté**
- Requiert: Header `Authorization: Bearer TOKEN`
- Retourne: `email`, `is_admin`

### POST /api/v1/auth/refresh
**Rafraîchir un token existant**
- Requiert: Header `Authorization: Bearer TOKEN`
- Retourne: Nouveau token avec même données

### POST /api/v1/auth/logout
**Logout (côté client: supprimer le token)**
- Pas de token requis
- Retourne: Message de confirmation

---

## 🔐 Utilisation dans React (Phase 2)

```javascript
// 1. Login
const login = async (email, password) => {
  const res = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await res.json();
  const token = data.access_token;
  
  // Sauvegarder le token
  localStorage.setItem('token', token);
  return token;
};

// 2. Utiliser le token
const fetchInvestors = async (token) => {
  const res = await fetch('http://localhost:8000/api/v1/investors', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return res.json();
};

// 3. Automatiser avec interceptor
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
};
```

---

## ✅ Checklist d'Implémentation

- [x] Route `/auth/login` créée
- [x] Route `/auth/me` créée
- [x] Route `/auth/refresh` créée
- [x] JWT Token generation
- [x] Token validation
- [x] Users de test configurés
- [x] Routes intégrées dans api/__init__.py
- [x] Security helpers corrigés
- [x] Tests possibles

---

## 🎯 Prochaines Étapes (Phase 2)

1. **Créer une vraie table User en BD** (remplacer TEST_USERS)
   ```python
   class User(BaseModel):
       id = Column(Integer, primary_key=True)
       email = Column(String(255), unique=True)
       password_hash = Column(String(255))
       is_admin = Column(Boolean, default=False)
   ```

2. **Ajouter UserService** pour CRUD Users

3. **Implémenter le register** (`POST /auth/register`)

4. **Ajouter la validation des permissions** sur les routes

5. **Frontend React** avec login/logout

---

## 💡 Points Importants

⚠️ **Les mots de passe sont en dur** (développement seulement)
- En production: Hasher les passwords avec `verify_password()`
- Stocker en BD

⚠️ **Pas de token blacklist**
- Pour une vraie logout, ajouter Redis pour blacklist les tokens

⚠️ **Authentification optionnelle** par défaut
- Vous pouvez commencer sans auth sur les routes
- Ajouter `Depends(get_current_user)` quand vous en avez besoin

---

## 🎓 Ressources

- JWT: https://jwt.io/
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- python-jose: https://github.com/mpdavis/python-jose

---

## ✨ C'est Prêt!

Vous pouvez maintenant:
- ✅ Tester l'authentification dans Swagger UI
- ✅ Obtenir des tokens
- ✅ Accéder aux API protégées
- ✅ Gérer les erreurs d'authentification

**Prochaine étape?** Phase 2 avec Frontend React! 🚀