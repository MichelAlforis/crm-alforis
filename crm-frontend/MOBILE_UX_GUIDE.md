# 📱 Guide d'Optimisation Mobile UX/UI - TPM Finance CRM

## 🎯 Principes d'optimisation mobile

### 1. Touch Targets (Cibles tactiles)
**Taille minimale recommandée : 44x44px (iOS) / 48x48px (Android)**

```tsx
// ❌ Mauvais : bouton trop petit
<button className="p-1 text-sm">Action</button>

// ✅ Bon : touch target adapté
<button className="min-h-[44px] min-w-[44px] p-3 text-base">
  Action
</button>
```

### 2. Espacements
**Mobile nécessite plus d'espace pour éviter les clics accidentels**

```tsx
// ❌ Mauvais : éléments trop serrés
<div className="gap-1">

// ✅ Bon : espacement adapté
<div className="gap-3 md:gap-2">
```

### 3. Typographie
**Texte lisible sans zoom**

```tsx
// Tailles minimales recommandées
body text     : 16px (base)
secondary text: 14px (sm)
labels        : 12px (xs) - minimum absolu
```

---

## 🛠️ Composants Mobile Créés

### 1. `useMediaQuery` Hook

Détection responsive et adaptation conditionnelle de l'UI.

```tsx
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery'

function MyComponent() {
  const isMobile = useIsMobile() // < 768px
  const isTablet = useIsTablet() // 768px - 1024px
  const isDesktop = useIsDesktop() // > 1024px

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  )
}
```

**Cas d'usage** :
- Afficher/masquer des éléments selon la taille d'écran
- Charger des composants différents (table vs cartes)
- Adapter la navigation

### 2. `MobileCard` Component

Remplace les lignes de tableau par des cartes sur mobile.

```tsx
import MobileCard from '@/components/mobile/MobileCard'

<MobileCard
  fields={[
    { label: 'Nom', value: 'Acme Corp', primary: true },
    { label: 'Catégorie', value: 'Institution', secondary: true },
    { label: 'Pays', value: '🇫🇷 France' },
    { label: 'Status', value: <Badge>Actif</Badge> },
  ]}
  onClick={() => router.push(`/dashboard/org/${id}`)}
  actions={
    <>
      <Button size="sm">Modifier</Button>
      <Button size="sm" variant="ghost">Supprimer</Button>
    </>
  }
/>
```

**Avantages** :
- ✅ Touch-friendly (grande zone cliquable)
- ✅ Lisible (pas de scroll horizontal)
- ✅ Hiérarchie claire (primary/secondary)
- ✅ Actions accessibles

### 3. `BottomSheet` Component

Modal optimisé mobile (slide depuis le bas).

```tsx
import BottomSheet from '@/components/mobile/BottomSheet'

function FiltersButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Filtres
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Filtres"
      >
        <div className="space-y-4">
          <Select label="Catégorie" />
          <Select label="Pays" />
          <Button onClick={() => setIsOpen(false)}>
            Appliquer
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
```

**Quand l'utiliser** :
- ✅ Filtres avancés
- ✅ Actions multiples
- ✅ Formulaires courts
- ✅ Menus contextuels

---

## 📋 Checklist d'optimisation par composant

### Tables → Cartes sur mobile

**Avant** :
```tsx
<Table>
  <tbody>
    {data.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>{item.category}</td>
        <td>{item.country}</td>
      </tr>
    ))}
  </tbody>
</Table>
```

**Après (responsive)** :
```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'
import MobileCard from '@/components/mobile/MobileCard'

function OrganisationsList() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map(item => (
          <MobileCard
            key={item.id}
            fields={[
              { label: 'Nom', value: item.name, primary: true },
              { label: 'Catégorie', value: item.category, secondary: true },
              { label: 'Pays', value: item.country },
            ]}
            onClick={() => router.push(`/org/${item.id}`)}
          />
        ))}
      </div>
    )
  }

  return <Table data={data} /> // Desktop view
}
```

### Formulaires

**✅ Optimisations recommandées** :

```tsx
// 1. Input types adaptés au clavier mobile
<input type="email" inputMode="email" /> // Clavier email
<input type="tel" inputMode="tel" />     // Clavier numérique
<input type="number" inputMode="numeric" /> // Pavé numérique

// 2. Autocomplete pour autofill
<input type="email" autoComplete="email" />
<input type="tel" autoComplete="tel" />

// 3. Labels toujours visibles (pas de placeholder uniquement)
<label className="block mb-2">Email</label>
<input type="email" placeholder="exemple@email.com" />

// 4. Touch-friendly selects
<select className="min-h-[44px] text-base">
  <option>Option 1</option>
</select>

// 5. Espacement entre champs
<div className="space-y-4"> {/* au lieu de space-y-2 */}
  <Input />
  <Input />
</div>
```

### Navigation

**Navbar mobile** :
```tsx
// ✅ Burger menu visible
// ✅ Actions essentielles accessibles
// ✅ Recherche via page dédiée (pas d'input inline)

<nav className="sticky top-0 z-40">
  <div className="flex items-center justify-between h-16 px-4">
    {/* Burger */}
    <button className="lg:hidden p-2 min-h-[44px] min-w-[44px]">
      <Menu />
    </button>

    {/* Logo */}
    <Link href="/dashboard">TPM CRM</Link>

    {/* Actions */}
    <div className="flex gap-2">
      <Link href="/dashboard/search" className="p-2 min-h-[44px] min-w-[44px]">
        <Search />
      </Link>
      <button className="p-2 min-h-[44px] min-w-[44px]">
        <Bell />
      </button>
    </div>
  </div>
</nav>
```

**Sidebar mobile** :
```tsx
// ✅ Full-screen overlay
// ✅ Swipe to close
// ✅ Backdrop blur

<div className={clsx(
  'fixed inset-0 z-40 lg:relative lg:z-0',
  'bg-background lg:bg-transparent',
  'transform transition-transform duration-300',
  isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
)}>
  {/* Sidebar content */}
</div>

{/* Backdrop - mobile only */}
{isOpen && (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
    onClick={onClose}
  />
)}
```

### Modals et Dialogs

**Desktop** : Modal centré classique
**Mobile** : Bottom Sheet (slide du bas)

```tsx
import { useIsMobile } from '@/hooks/useMediaQuery'
import BottomSheet from '@/components/mobile/BottomSheet'
import Modal from '@/components/shared/Modal'

function MyDialog({ isOpen, onClose }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Détails">
        <Content />
      </BottomSheet>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Content />
    </Modal>
  )
}
```

---

## 🎨 Design Patterns Mobile

### 1. Sticky Bottom Actions

Pour les pages de formulaire, actions en bas sticky :

```tsx
<div className="relative min-h-screen pb-20">
  {/* Content */}
  <form className="p-4">
    <Input />
    <Input />
  </form>

  {/* Sticky bottom actions */}
  <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
    <div className="flex gap-3">
      <Button variant="ghost" className="flex-1">
        Annuler
      </Button>
      <Button className="flex-1">
        Enregistrer
      </Button>
    </div>
  </div>
</div>
```

### 2. Pull to Refresh

Utiliser un state pour indiquer le chargement :

```tsx
function ListPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  return (
    <div className="relative">
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* List items */}
      </div>

      {/* Refresh button for mobile */}
      <button
        onClick={handleRefresh}
        className="fixed bottom-20 right-4 p-4 bg-primary text-white rounded-full shadow-lg lg:hidden"
      >
        <RefreshCw className={clsx('w-6 h-6', isRefreshing && 'animate-spin')} />
      </button>
    </div>
  )
}
```

### 3. Infinite Scroll vs Pagination

**Mobile** : Préférer infinite scroll
**Desktop** : Pagination acceptable

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'

function InfiniteList() {
  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 0 }) => fetchItems(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.map(page => (
        page.items.map(item => <ItemCard key={item.id} {...item} />)
      ))}

      {/* Trigger */}
      <div ref={ref} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="animate-spin" />}
      </div>
    </div>
  )
}
```

---

## 🧪 Tests Mobile

### 1. Chrome DevTools

```
1. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
2. Tester sur différents devices :
   - iPhone SE (375px) - petit écran
   - iPhone 12/13 Pro (390px) - standard
   - iPhone 14 Pro Max (430px) - grand
   - iPad (768px) - tablette
   - iPad Pro (1024px) - tablette large
```

### 2. Checklist de test

- [ ] Touch targets ≥ 44x44px
- [ ] Pas de scroll horizontal
- [ ] Texte lisible sans zoom (≥ 16px)
- [ ] Formulaires utilisables (bons types d'input)
- [ ] Navigation accessible (burger menu)
- [ ] Modals/sheets s'affichent correctement
- [ ] Tableaux → cartes sur mobile
- [ ] Actions importantes facilement accessibles
- [ ] Performance : <3s First Contentful Paint

### 3. Tests réels

**Recommandé** : Tester sur vrais devices

- iOS Safari (comportement différent de Chrome)
- Android Chrome
- Différentes tailles d'écran
- Mode paysage (landscape)

---

## 📊 Métriques Mobile

### Core Web Vitals cibles (mobile)

- **LCP** (Largest Contentful Paint) : < 2.5s
- **FID** (First Input Delay) : < 100ms
- **CLS** (Cumulative Layout Shift) : < 0.1

### Performance optimizations

```tsx
// 1. Lazy load images
<img
  src={url}
  loading="lazy"
  className="w-full h-auto"
/>

// 2. Code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false // si pas besoin de SSR
})

// 3. Pagination/virtualization pour longues listes
import { useVirtualizer } from '@tanstack/react-virtual'
```

---

## 🚀 Prochaines étapes

### Améliorations prioritaires

1. **Convertir les tables en mode carte sur mobile**
   - [ ] organisations/page.tsx
   - [ ] people/page.tsx
   - [ ] mandats/page.tsx
   - [ ] produits/page.tsx

2. **Optimiser les formulaires**
   - [ ] Ajouter inputMode appropriés
   - [ ] Améliorer les espacements
   - [ ] Sticky bottom actions

3. **Navigation**
   - [ ] Swipe pour fermer sidebar mobile
   - [ ] Bottom navigation bar (optionnel)

4. **Interactions**
   - [ ] Pull to refresh
   - [ ] Swipe actions sur cartes (delete, edit)
   - [ ] Haptic feedback (vibrations)

### Fonctionnalités avancées (optionnel)

- **Share API** : Partager contacts/organisations
- **Add to Home Screen** : Prompt d'installation PWA
- **Notifications** : Push notifications natives
- **Offline mode** : Mode hors ligne complet
- **Biometrics** : Face ID / Touch ID pour auth

---

## 📚 Ressources

- [Material Design - Touch targets](https://m3.material.io/foundations/interaction/interaction-states)
- [Apple HIG - Ergonomics](https://developer.apple.com/design/human-interface-guidelines/inputs)
- [Web.dev - Mobile UX](https://web.dev/mobile-ux/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

---

**Created**: 21 octobre 2025
**Status**: 📱 Mobile UX Optimization Guide
