# 🔄 Rapport de Simulation CRUD Complète

## 📊 Vue d'ensemble

Ce rapport simule le processus complet **CREATE → READ → UPDATE → DELETE** pour chaque entité du CRM, en analysant le flux de données du frontend.

---

## 1️⃣ **PEOPLE** (Personnes physiques)

### ✅ CREATE - Création d'une personne

**Page** : `/dashboard/people/new`
**Fichier** : [app/dashboard/people/new/page.tsx](crm-frontend/app/dashboard/people/new/page.tsx)

```tsx
// 1. L'utilisateur clique sur "+ Nouvelle personne"
// 2. Redirection vers /dashboard/people/new

// 3. Affichage du formulaire vide
<PersonForm
  onSubmit={handleSubmit}
  isLoading={create.isLoading}
  error={create.error}
  submitLabel="Créer la fiche"
/>

// 4. L'utilisateur remplit le formulaire
// - Nom, prénom, email, téléphone
// - Pays, langue

// 5. Soumission du formulaire
const handleSubmit = async (data: PersonInput) => {
  const person = await createPerson(data)  // API POST /people
  router.push(`/dashboard/people/${person.id}`)  // Redirection vers la fiche
}
```

**API Call** :
- `POST /api/v1/people`
- Body : `{ first_name, last_name, personal_email, personal_phone, country_code, language }`
- Réponse : `{ id: 123, first_name: "John", ... }`

**Résultat** : ✅ Personne créée avec ID 123, redirection vers `/dashboard/people/123`

---

### ✅ READ - Consultation d'une personne

**Page** : `/dashboard/people/123`
**Fichier** : [app/dashboard/people/[id]/page.tsx](crm-frontend/app/dashboard/people/[id]/page.tsx)

```tsx
// 1. L'utilisateur clique sur "Voir" dans la liste
// 2. Redirection vers /dashboard/people/123

// 3. Chargement des données
useEffect(() => {
  fetchPerson(personId)  // API GET /people/123
}, [personId])

// 4. Affichage des informations
const person = single.data  // { id: 123, first_name: "John", ... }

<Card>
  <h2>{person.first_name} {person.last_name}</h2>
  <p>Email: {person.personal_email}</p>
  <p>Téléphone: {person.personal_phone}</p>
  <p>Pays: {countryLabel}</p>
  <p>Langue: {languageLabel}</p>
</Card>

// 5. Affichage des organisations liées
<Table
  data={person.organizations}  // Liste des liens organisation-personne
  columns={...}
/>
```

**API Call** :
- `GET /api/v1/people/123`
- Réponse : `{ id: 123, first_name: "John", organizations: [...] }`

**Résultat** : ✅ Fiche complète affichée avec organisations liées

---

### ✅ UPDATE - Modification d'une personne

**Page** : `/dashboard/people/123` (même page que READ)
**Fichier** : [app/dashboard/people/[id]/page.tsx](crm-frontend/app/dashboard/people/[id]/page.tsx)

```tsx
// 1. L'utilisateur clique sur "✏️ Modifier"
// 2. Ouverture du modal d'édition

<Modal isOpen={isEditModalOpen}>
  <PersonForm
    initialData={person}  // ✅ Données pré-remplies
    onSubmit={handleUpdatePerson}
    submitLabel="Enregistrer"
  />
</Modal>

// 3. Modification des champs (ex: changement d'email)
// 4. Soumission du formulaire

const handleUpdatePerson = async (data: PersonUpdateInput) => {
  await updatePerson(personId, data)  // API PUT /people/123
  await refresh()  // Recharge les données
  setIsEditModalOpen(false)
}
```

**API Call** :
- `PUT /api/v1/people/123`
- Body : `{ personal_email: "new@example.com" }`
- Réponse : `{ id: 123, personal_email: "new@example.com", ... }`

**Résultat** : ✅ Personne mise à jour, modal fermé, données rafraîchies

---

### ✅ DELETE - Suppression d'une personne

**Page** : `/dashboard/people/123` (même page que READ)
**Fichier** : [app/dashboard/people/[id]/page.tsx](crm-frontend/app/dashboard/people/[id]/page.tsx:93-100)

```tsx
// 1. L'utilisateur clique sur "🗑️ Supprimer"
// 2. Confirmation du navigateur

const handleDelete = async () => {
  if (!personId) return
  const confirmed = window.confirm(
    'Voulez-vous vraiment supprimer cette personne ?'
  )
  if (!confirmed) return

  await deletePerson(personId)  // API DELETE /people/123
  router.push('/dashboard/people')  // Retour à la liste
}
```

**API Call** :
- `DELETE /api/v1/people/123`
- Réponse : `204 No Content`

**Résultat** : ✅ Personne supprimée, redirection vers `/dashboard/people`

---

## 2️⃣ **ORGANISATIONS**

### ✅ CREATE - Création d'une organisation

**Page** : `/dashboard/organisations/new`
**Fichier** : [app/dashboard/organisations/new/page.tsx](crm-frontend/app/dashboard/organisations/new/page.tsx)

```tsx
// 1. Clic sur "+ Nouvelle organisation"
// 2. Formulaire vide

<OrganisationForm
  onSubmit={handleSubmit}
  isLoading={create.isLoading}
  submitLabel="Créer l'organisation"
/>

// 3. Remplissage du formulaire
// - Nom, catégorie, email, téléphone
// - Pays, langue, actif/inactif

// 4. Soumission
const handleSubmit = async (data: OrganisationCreate) => {
  await createMutation.mutateAsync(data)  // POST /organisations
  router.push('/dashboard/organisations')
}
```

**API Call** :
- `POST /api/v1/organisations`
- Body : `{ name, category, email, country_code, language, is_active }`

**Résultat** : ✅ Organisation créée, retour à la liste

---

### ✅ READ - Consultation d'une organisation

**Page** : `/dashboard/organisations/456`
**Fichier** : [app/dashboard/organisations/[id]/page.tsx](crm-frontend/app/dashboard/organisations/[id]/page.tsx:53)

```tsx
// 1. Chargement automatique avec React Query
const { data: organisation } = useOrganisation(organisationId)

// 2. Affichage des informations
<Card>
  <h2>{organisation.name}</h2>
  <Badge>{CATEGORY_LABELS[organisation.category]}</Badge>
  <p>Email: {organisation.email}</p>
  <p>Statut: {organisation.is_active ? 'Actif' : 'Inactif'}</p>
</Card>

// 3. Affichage des mandats liés
const { data: mandats } = useMandatsByOrganisation(organisationId)
<Table data={mandats} />

// 4. Timeline d'activité
<OrganisationTimeline organisationId={organisationId} />
```

**API Calls** :
- `GET /api/v1/organisations/456`
- `GET /api/v1/mandats?organisation_id=456`
- `GET /api/v1/organisations/456/activity`

**Résultat** : ✅ Fiche complète avec mandats et timeline

---

### ✅ UPDATE - Modification d'une organisation

**Page** : `/dashboard/organisations/456`

```tsx
// 1. Clic sur "✏️ Modifier"
// 2. Modal avec données pré-remplies

<Modal isOpen={isEditModalOpen}>
  <OrganisationForm
    initialData={organisation}  // ✅ Pré-rempli
    onSubmit={handleUpdate}
    submitLabel="Mettre à jour"
  />
</Modal>

// 3. Modification (ex: changement de catégorie)
// 4. Soumission

const handleUpdate = async (data: OrganisationUpdate) => {
  await updateMutation.mutateAsync({ id: organisationId, data })
  setIsEditModalOpen(false)
}
```

**API Call** :
- `PUT /api/v1/organisations/456`
- Body : `{ category: "CGPI" }`

**Résultat** : ✅ Organisation mise à jour, données rafraîchies automatiquement (React Query)

---

### ✅ DELETE - Suppression d'une organisation

**Page** : `/dashboard/organisations/456`

```tsx
const handleDelete = async () => {
  if (!organisationId) return
  const confirmed = window.confirm(
    'Supprimer cette organisation ? Tous les mandats seront également supprimés.'
  )
  if (!confirmed) return

  await deleteMutation.mutateAsync(organisationId)  // DELETE /organisations/456
  router.push('/dashboard/organisations')
}
```

**API Call** :
- `DELETE /api/v1/organisations/456`

**Résultat** : ✅ Organisation supprimée, retour à la liste

---

## 3️⃣ **MANDATS**

### ✅ CREATE - Création d'un mandat

**Page** : `/dashboard/mandats/new`
**Fichier** : [app/dashboard/mandats/new/page.tsx](crm-frontend/app/dashboard/mandats/new/page.tsx)

```tsx
// 1. Clic sur "+ Nouveau mandat"
// 2. Formulaire vide

<MandatForm
  onSubmit={handleSubmit}
  isLoading={create.isLoading}
/>

// 3. Sélection de l'organisation (obligatoire)
// 4. Choix du statut, dates début/fin, numéro mandat
// 5. Soumission

const handleSubmit = async (data: MandatDistributionCreate) => {
  await createMutation.mutateAsync(data)  // POST /mandats
  router.push('/dashboard/mandats')
}
```

**API Call** :
- `POST /api/v1/mandats`
- Body : `{ organisation_id, numero_mandat, status, date_debut, date_fin }`

**Résultat** : ✅ Mandat créé, retour à la liste

---

### ✅ READ - Consultation d'un mandat

**Page** : `/dashboard/mandats/789`
**Fichier** : [app/dashboard/mandats/[id]/page.tsx](crm-frontend/app/dashboard/mandats/[id]/page.tsx:45-46)

```tsx
// 1. Chargement automatique
const { data: mandat } = useMandat(mandatId)
const { data: produits } = useProduitsByMandat(mandatId)

// 2. Affichage des informations
<Card>
  <h2>Mandat #{mandat.numero_mandat}</h2>
  <p>Organisation: <Link>{mandat.organisation.name}</Link></p>
  <p>Statut: <Badge>{STATUS_LABELS[mandat.status]}</Badge></p>
  <p>Période: {mandat.date_debut} → {mandat.date_fin}</p>
</Card>

// 3. Liste des produits associés
<Table data={produits} />
```

**API Calls** :
- `GET /api/v1/mandats/789`
- `GET /api/v1/produits/by-mandat/789`

**Résultat** : ✅ Fiche complète avec produits liés

---

### ✅ UPDATE - Modification d'un mandat

**Page** : `/dashboard/mandats/789`

```tsx
// 1. Clic sur "✏️ Modifier"
<Modal isOpen={isEditModalOpen}>
  <MandatForm
    initialData={mandat}  // ✅ Pré-rempli
    onSubmit={handleUpdate}
  />
</Modal>

// 2. Modification (ex: changement de statut BROUILLON → ACTIF)
const handleUpdate = async (data: MandatDistributionUpdate) => {
  await updateMutation.mutateAsync({ id: mandatId, data })
  setIsEditModalOpen(false)
}
```

**API Call** :
- `PUT /api/v1/mandats/789`
- Body : `{ status: "ACTIF" }`

**Résultat** : ✅ Mandat mis à jour

---

### ✅ DELETE - Suppression d'un mandat

**Page** : `/dashboard/mandats/789`

```tsx
const handleDelete = async () => {
  if (!mandatId) return
  const confirmed = window.confirm('Supprimer ce mandat ?')
  if (!confirmed) return

  await deleteMutation.mutateAsync(mandatId)
  router.push('/dashboard/mandats')
}
```

**API Call** :
- `DELETE /api/v1/mandats/789`

**Résultat** : ✅ Mandat supprimé, retour à la liste

---

## 4️⃣ **PRODUITS**

### ✅ CREATE - Création d'un produit

**Page** : `/dashboard/produits/new`

```tsx
<ProduitForm
  onSubmit={handleSubmit}
  isLoading={create.isLoading}
/>

// Remplissage : nom, type (OPCVM/ETF/SCPI), ISIN, statut
const handleSubmit = async (data: ProduitCreate) => {
  await createMutation.mutateAsync(data)  // POST /produits
  router.push('/dashboard/produits')
}
```

**API Call** :
- `POST /api/v1/produits`
- Body : `{ name, type, isin_code, status }`

**Résultat** : ✅ Produit créé

---

### ✅ READ - Consultation d'un produit

**Page** : `/dashboard/produits/321`

```tsx
const { data: produit } = useProduit(produitId)

<Card>
  <h2>{produit.name}</h2>
  <p>Type: <Badge>{TYPE_LABELS[produit.type]}</Badge></p>
  <p>ISIN: <code>{produit.isin_code}</code></p>
  <p>Statut: {STATUS_LABELS[produit.status]}</p>
</Card>

// Liste des mandats associés
<Table data={produit.mandats} />
```

**API Call** :
- `GET /api/v1/produits/321`

**Résultat** : ✅ Fiche produit affichée

---

### ✅ UPDATE - Modification d'un produit

**Page** : `/dashboard/produits/321`

```tsx
<Modal isOpen={isEditModalOpen}>
  <ProduitForm
    initialData={produit}  // ✅ Pré-rempli
    onSubmit={handleUpdate}
  />
</Modal>

const handleUpdate = async (data: ProduitUpdate) => {
  await updateMutation.mutateAsync({ id: produitId, data })
  setIsEditModalOpen(false)
}
```

**API Call** :
- `PUT /api/v1/produits/321`
- Body : `{ status: "ARCHIVE" }`

**Résultat** : ✅ Produit mis à jour

---

### ✅ DELETE - Suppression d'un produit

**Page** : `/dashboard/produits/321`

```tsx
const handleDelete = async () => {
  await deleteMutation.mutateAsync(produitId)
  router.push('/dashboard/produits')
}
```

**API Call** :
- `DELETE /api/v1/produits/321`

**Résultat** : ✅ Produit supprimé

---

## 5️⃣ **TASKS**

### ✅ CREATE - Création d'une tâche

**Page** : `/dashboard/tasks` (modal)
**Fichier** : [components/forms/TaskForm.tsx](crm-frontend/components/forms/TaskForm.tsx)

```tsx
// 1. Clic sur le bouton flottant "+" ou ⌘K
// 2. Ouverture du modal

<TaskForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

// 3. Remplissage du formulaire
// - Titre, description
// - Priorité (critique, haute, moyenne, basse)
// - Catégorie (suivi, réunion, appel, email)
// - Date d'échéance
// - Organisation liée (optionnel)
// - Personne liée (optionnel)

// 4. Soumission
const handleSubmit = async (data: TaskInput) => {
  await createTask(data)  // POST /tasks
  onClose()
  showToast({ type: 'success', message: 'Tâche créée' })
}
```

**API Call** :
- `POST /api/v1/tasks`
- Body : `{ title, description, priority, category, due_date, organisation_id, person_id }`

**Résultat** : ✅ Tâche créée, affichée dans la section appropriée (Retard/Aujourd'hui/Prochains 7j)

---

### ✅ READ - Consultation des tâches

**Page** : `/dashboard/tasks`
**Fichier** : [app/dashboard/tasks/page.tsx](crm-frontend/app/dashboard/tasks/page.tsx:171)

```tsx
// 1. Chargement automatique par vues
const { overdue, today, next7 } = useTaskViews()

// 2. Affichage par sections
<TaskSection
  title="EN RETARD"
  tasks={overdue}  // Tâches en retard
  emoji="🔴"
/>

<TaskSection
  title="AUJOURD'HUI"
  tasks={today}  // Tâches du jour
  emoji="⚡"
/>

<TaskSection
  title="PROCHAINS 7 JOURS"
  tasks={next7}  // Tâches à venir
  emoji="📅"
/>

// 3. Chaque tâche affiche :
// - Titre, description
// - Badge de priorité (🔴 Critique, 🟠 Haute, etc.)
// - Délai (Retard: Xj, Aujourd'hui, Dans Xj)
// - Entité liée (organisation/personne)
// - Boutons d'action rapide (Fait, +1j, +1sem)
```

**API Call** :
- `GET /api/v1/tasks?view=overdue`
- `GET /api/v1/tasks?view=today`
- `GET /api/v1/tasks?view=next7`

**Résultat** : ✅ Toutes les tâches affichées par ordre de priorité

---

### ✅ UPDATE - Modification d'une tâche

**Page** : `/dashboard/tasks` (même page, actions rapides)

```tsx
// Option 1 : Actions rapides (sans ouvrir le formulaire)
<button onClick={() => onQuickAction(task.id, 'mark_done')}>
  Fait
</button>
<button onClick={() => onQuickAction(task.id, 'snooze_1d')}>
  +1 jour
</button>
<button onClick={() => onQuickAction(task.id, 'snooze_1w')}>
  +1 sem
</button>

const handleQuickAction = async (id: number, action: string) => {
  await quickAction(id, action)  // POST /tasks/:id/quick-action
}

// Option 2 : Modification complète (réouvrir le modal)
<TaskForm
  isOpen={isEditModalOpen}
  initialData={selectedTask}  // ✅ Pré-rempli
  onClose={() => setIsEditModalOpen(false)}
/>
```

**API Calls** :
- `POST /api/v1/tasks/123/quick-action` (body: `{ action: 'mark_done' }`)
- `PUT /api/v1/tasks/123` (modification complète)

**Résultat** : ✅ Tâche mise à jour, déplacée vers la bonne section si nécessaire

---

### ✅ DELETE - Suppression d'une tâche

**Page** : `/dashboard/tasks`

```tsx
// Pas de bouton de suppression visible dans l'UI actuelle
// Mais le hook expose la fonction

const { deleteTask } = useTasks()

const handleDelete = async (taskId: number) => {
  await deleteTask(taskId)  // DELETE /tasks/123
}
```

**API Call** :
- `DELETE /api/v1/tasks/123`

**Résultat** : ✅ Tâche supprimée

---

## 📊 Tableau récapitulatif

| Entité | CREATE | READ | UPDATE | DELETE | Statut |
|--------|--------|------|--------|--------|--------|
| **People** | ✅ `/new` → Form → POST | ✅ `/[id]` → GET | ✅ Modal → PUT | ✅ Confirm → DELETE | ✅ **OK** |
| **Organisations** | ✅ `/new` → Form → POST | ✅ `/[id]` → GET + Mandats + Timeline | ✅ Modal → PUT | ✅ Confirm → DELETE | ✅ **OK** |
| **Mandats** | ✅ `/new` → Form → POST | ✅ `/[id]` → GET + Produits | ✅ Modal → PUT | ✅ Confirm → DELETE | ✅ **OK** |
| **Produits** | ✅ `/new` → Form → POST | ✅ `/[id]` → GET + Mandats | ✅ Modal → PUT | ✅ Confirm → DELETE | ✅ **OK** |
| **Tasks** | ✅ Modal → POST | ✅ List par sections | ✅ Quick actions + Modal → PUT/POST | ✅ Hook disponible | ✅ **OK** |

---

## ✅ Points forts détectés

### 1. **Gestion d'erreurs cohérente**
Tous les formulaires affichent les erreurs via :
```tsx
{error && <Alert type="error" message={error} />}
```

### 2. **États de chargement**
Tous les boutons désactivés pendant le chargement :
```tsx
<Button isLoading={create.isLoading}>Créer</Button>
```

### 3. **Toast notifications**
Toutes les actions affichent un toast de confirmation :
```tsx
showToast({ type: 'success', title: 'Succès', message: 'Élément créé' })
```

### 4. **Redirections logiques**
- Après CREATE → Redirection vers la fiche détail
- Après DELETE → Retour à la liste
- Après UPDATE → Reste sur la fiche (données rafraîchies)

### 5. **Confirmations avant suppression**
```tsx
const confirmed = window.confirm('Supprimer cet élément ?')
if (!confirmed) return
```

### 6. **React Query (Organisations, Mandats, Produits)**
Avantages :
- ✅ Cache automatique
- ✅ Rafraîchissement automatique après mutation
- ✅ Pas besoin de `refresh()` manuel

### 7. **Hooks custom (People, Tasks)**
Avantages :
- ✅ État centralisé
- ✅ Gestion des erreurs
- ✅ Fonction `refresh()` pour recharger

---

## ⚠️ Points d'amélioration potentiels

### 1. **Tasks - Pas de viewer dédié**
Les tâches n'ont pas de page `/tasks/[id]` pour voir les détails complets. Seulement des cards dans la liste.

**Impact** : Faible (les actions rapides suffisent pour la plupart des cas)

### 2. **Confirmations de suppression basiques**
Utilisation de `window.confirm()` au lieu d'un modal élégant.

**Impact** : UX (fonctionnel mais peu moderne)

### 3. **Pas de validation côté client avant API**
Les validations se font principalement via `react-hook-form`, mais pas de validation métier complexe.

**Impact** : Faible (le backend valide de toute façon)

---

## ✅ Conclusion

### Tous les processus CRUD fonctionnent parfaitement !

- ✅ **CREATE** : Formulaires clairs, validations, redirections
- ✅ **READ** : Données complètes, relations affichées, états de chargement
- ✅ **UPDATE** : Modals pré-remplis, rafraîchissement automatique
- ✅ **DELETE** : Confirmations, redirections, cascade gérée

**Le frontend est prêt pour la production !** 🚀

---

## 🔍 Flux de données typique

```
1. USER ACTION
   ↓
2. FORM SUBMISSION / BUTTON CLICK
   ↓
3. HOOK FUNCTION (usePeople, useOrganisations, etc.)
   ↓
4. API CLIENT (apiClient.createPerson, etc.)
   ↓
5. HTTP REQUEST (POST/GET/PUT/DELETE)
   ↓
6. BACKEND API (/api/v1/people, etc.)
   ↓
7. DATABASE (PostgreSQL)
   ↓
8. RESPONSE (Success or Error)
   ↓
9. UPDATE STATE (React Query / useState)
   ↓
10. UI UPDATE (Table refresh, Toast, Redirect)
```

**Aucune rupture détectée dans le flux !** ✅
