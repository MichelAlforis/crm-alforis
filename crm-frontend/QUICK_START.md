# ⚡ Quick Start Guide - Design System

Guide rapide pour utiliser le nouveau design system de TPM Finance CRM.

## 🎨 Classes Essentielles

### Buttons

```tsx
// Variants
<button className="btn-primary btn-md">Primaire</button>
<button className="btn-secondary btn-md">Secondaire</button>
<button className="btn-ghost btn-md">Ghost</button>
<button className="btn-danger btn-md">Danger</button>

// Tailles
<button className="btn-primary btn-xs">XS</button>
<button className="btn-primary btn-sm">Small</button>
<button className="btn-primary btn-md">Medium</button>
<button className="btn-primary btn-lg">Large</button>
<button className="btn-primary btn-xl">XL</button>
```

### Cards

```tsx
// Basique
<div className="card p-6">
  <h3>Titre</h3>
  <p>Contenu</p>
</div>

// Avec hover
<div className="card-hover p-6">
  <p>Cliquable</p>
</div>

// Glass effect
<div className="card-glass p-6">
  <p>Glassmorphism</p>
</div>
```

### Forms

```tsx
// Input
<label className="label">Email</label>
<input type="email" className="input-field" />

// Avec erreur
<input className="input-field input-error" />

// Textarea
<textarea className="textarea" />

// Select
<select className="select-field">
  <option>Option 1</option>
</select>
```

### Badges

```tsx
<span className="badge-primary">Nouveau</span>
<span className="badge-success">Actif</span>
<span className="badge-warning">En attente</span>
<span className="badge-danger">Erreur</span>
<span className="badge-neutral badge-dot">En ligne</span>
```

### Alerts

```tsx
<div className="alert-info">
  <p>Information</p>
</div>

<div className="alert-success">
  <p>Succès</p>
</div>

<div className="alert-warning">
  <p>Attention</p>
</div>

<div className="alert-danger">
  <p>Erreur</p>
</div>
```

## ✨ Animations

```tsx
<div className="animate-fadeIn">Apparition</div>
<div className="animate-slideInLeft">De gauche</div>
<div className="animate-slideInRight">De droite</div>
<div className="animate-shimmer">Brillance</div>
<div className="animate-pulse-soft">Pulsation</div>
```

## 🎨 Effets

```tsx
// Glassmorphism
<div className="glass p-6">Verre clair</div>
<div className="glass-dark p-6">Verre sombre</div>

// Gradients
<div className="gradient-primary p-6 text-white">
  Blue → Purple
</div>

// Text gradients
<h1 className="text-gradient-primary">
  Titre avec gradient
</h1>

// Hover effects
<div className="hover-lift">Soulève</div>
<div className="hover-grow">Agrandit</div>
<div className="hover-glow">Brille</div>
```

## 📐 Layout

```tsx
// Container
<div className="container-max">
  {/* Max-width 7xl, centré, padding */}
</div>

// Dashboard
<div className="dashboard-layout">
  <Sidebar />
  <main className="dashboard-main">
    <div className="dashboard-content">
      {children}
    </div>
  </main>
</div>
```

## 🎯 Patterns Courants

### Card avec hover et animation

```tsx
<div className="card-hover animate-fadeIn p-6">
  <h3 className="text-xl font-semibold mb-2">Titre</h3>
  <p className="text-gray-600">Description</p>
  <button className="btn-primary btn-sm mt-4">
    Action
  </button>
</div>
```

### Form complète

```tsx
<form className="space-y-4">
  <div>
    <label className="label label-required">Nom</label>
    <input type="text" className="input-field" required />
  </div>

  <div>
    <label className="label">Email</label>
    <input type="email" className="input-field" />
  </div>

  <div>
    <label className="label">Type</label>
    <select className="select-field">
      <option>Option 1</option>
      <option>Option 2</option>
    </select>
  </div>

  <div className="flex gap-3">
    <button type="submit" className="btn-primary btn-md">
      Envoyer
    </button>
    <button type="button" className="btn-secondary btn-md">
      Annuler
    </button>
  </div>
</form>
```

### Table responsive

```tsx
<div className="table-container">
  <table className="table">
    <thead>
      <tr>
        <th>Nom</th>
        <th>Email</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>John Doe</td>
        <td>john@example.com</td>
        <td>
          <span className="badge-success">Actif</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modal

```tsx
{isOpen && (
  <>
    <div className="modal-backdrop" onClick={onClose} />
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Titre du modal</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>Contenu</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  </>
)}
```

### Dropdown Menu

```tsx
{isOpen && (
  <>
    <div className="fixed inset-0 z-10" onClick={close} />
    <div className="dropdown z-20">
      <button className="dropdown-item">Option 1</button>
      <button className="dropdown-item">Option 2</button>
      <div className="dropdown-divider" />
      <button className="dropdown-item text-red-600">
        Supprimer
      </button>
    </div>
  </>
)}
```

## 📱 Responsive

```tsx
// Mobile-first
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-2xl md:text-3xl lg:text-4xl">
    Titre responsive
  </h1>
</div>

// Button sizes
<button className="btn-primary btn-sm md:btn-md lg:btn-lg">
  Responsive
</button>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="card p-4">Item 1</div>
  <div className="card p-4">Item 2</div>
  <div className="card p-4">Item 3</div>
</div>
```

## 🎨 Design Tokens

### Couleurs (CSS Variables)

```css
/* Usage */
bg-[rgb(var(--color-primary))]
text-[rgb(var(--color-success))]

/* Variables disponibles */
--color-primary        /* Blue-500 */
--color-success        /* Green-500 */
--color-warning        /* Orange-400 */
--color-danger         /* Red-500 */
--color-text-primary   /* Gray-900 */
--color-text-secondary /* Gray-500 */
```

### Spacing

```css
/* Variables */
--spacing-xs   /* 8px */
--spacing-sm   /* 12px */
--spacing-md   /* 16px */
--spacing-lg   /* 24px */
--spacing-xl   /* 32px */

/* Usage */
gap-[var(--spacing-md)]
p-[var(--spacing-lg)]
```

## 🚀 Tips

### 1. Combiner les classes

```tsx
<button className="btn-primary btn-md hover-lift animate-fadeIn">
  Multiple effects
</button>
```

### 2. Responsive + Animations

```tsx
<div className="card-hover animate-fadeIn p-4 md:p-6 lg:p-8">
  Responsive + animated
</div>
```

### 3. Custom backgrounds

```tsx
<div className="gradient-mesh min-h-screen p-8">
  <div className="glass-card p-6">
    Gradient mesh + glass
  </div>
</div>
```

## 📚 Documentation Complète

Pour plus de détails, voir :
- [styles/README.md](styles/README.md) - Documentation complète
- [REFACTORING.md](REFACTORING.md) - Architecture et changements

## 🎯 Exemples Complets

### Page avec header

```tsx
export default function Page() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Titre de la page</h1>
        <p className="page-description">Description</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-hover p-6">
          <div className="text-3xl font-bold text-blue-600">124</div>
          <div className="text-sm text-gray-600">Investisseurs</div>
        </div>
        {/* More cards... */}
      </div>

      {/* Content */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Contenu</h2>
        {/* ... */}
      </div>
    </div>
  )
}
```

### Liste avec actions

```tsx
export default function List() {
  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.id} className="card-hover p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge-success">Actif</span>
            <button className="btn-ghost btn-sm">Éditer</button>
            <button className="btn-danger btn-sm">Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

**Happy coding!** 🚀
