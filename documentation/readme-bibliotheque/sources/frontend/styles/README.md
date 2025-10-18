# 🎨 Styles Directory - Design System Documentation

## 📁 Structure

```
styles/
├── global.css          # Main stylesheet with imports
├── variables.css       # Design tokens & CSS variables
├── components.css      # Component utility classes
├── utilities.css       # Utility classes & animations
└── README.md          # This file
```

## 🎯 Usage

### Importing Styles

The main `global.css` file is imported in `app/layout.tsx`:

```tsx
import '@/styles/global.css'
```

All other stylesheets are automatically imported via `global.css`.

## 📐 Design Tokens (variables.css)

### Color Palette

```css
/* Usage in Tailwind */
bg-[rgb(var(--color-primary))]
text-[rgb(var(--color-text-primary))]
```

**Available Colors:**
- `--color-background` - Main app background (Gray-50)
- `--color-foreground` - Card backgrounds (White)
- `--color-border` - Border color (Gray-200)
- `--color-muted` - Muted backgrounds (Gray-100)
- `--color-text-primary` - Main text (Gray-900)
- `--color-text-secondary` - Secondary text (Gray-500)
- `--color-text-muted` - Muted text (Gray-400)
- `--color-primary` - Brand primary (Blue-500)
- `--color-success` - Success state (Green-500)
- `--color-warning` - Warning state (Orange-400)
- `--color-danger` - Danger state (Red-500)

### Spacing System (8px base)

```css
--spacing-xs: 0.5rem;    /* 8px */
--spacing-sm: 0.75rem;   /* 12px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
--spacing-3xl: 4rem;     /* 64px */
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
```

### Transitions

```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
--transition-slower: 500ms;
```

## 🧩 Component Classes (components.css)

### Buttons

```tsx
// Primary button
<button className="btn-primary btn-md">Click me</button>

// Secondary button
<button className="btn-secondary btn-md">Cancel</button>

// Ghost button
<button className="btn-ghost btn-sm">Options</button>

// Danger button
<button className="btn-danger btn-lg">Delete</button>
```

**Available Variants:**
- `btn-primary` - Main actions
- `btn-secondary` - Secondary actions
- `btn-ghost` - Subtle actions
- `btn-danger` - Destructive actions
- `btn-success` - Positive actions

**Available Sizes:**
- `btn-xs` - Extra small
- `btn-sm` - Small
- `btn-md` - Medium (default)
- `btn-lg` - Large
- `btn-xl` - Extra large

### Cards

```tsx
// Basic card
<div className="card">
  <p>Content here</p>
</div>

// Hoverable card
<div className="card-hover">
  <p>Clickable content</p>
</div>

// Glass effect card
<div className="card-glass">
  <p>Glassmorphism effect</p>
</div>

// Gradient card
<div className="card card-gradient">
  <p>With gradient overlay</p>
</div>
```

### Form Elements

```tsx
// Input field
<input type="text" className="input-field" />

// With error state
<input type="text" className="input-field input-error" />

// Textarea
<textarea className="textarea" />

// Select
<select className="select-field">
  <option>Option 1</option>
</select>

// Label
<label className="label">Username</label>
<label className="label label-required">Email</label>
```

### Badges

```tsx
<span className="badge-primary">New</span>
<span className="badge-success">Active</span>
<span className="badge-warning">Pending</span>
<span className="badge-danger">Error</span>
<span className="badge-neutral">Draft</span>

// With dot indicator
<span className="badge-success badge-dot">Online</span>
```

### Tables

```tsx
<div className="table-container">
  <table className="table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>John Doe</td>
        <td>john@example.com</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Alerts

```tsx
<div className="alert-info">
  <p>Information message</p>
</div>

<div className="alert-success">
  <p>Success message</p>
</div>

<div className="alert-warning">
  <p>Warning message</p>
</div>

<div className="alert-danger">
  <p>Error message</p>
</div>
```

### Dropdowns

```tsx
<div className="dropdown">
  <button className="dropdown-item">Option 1</button>
  <button className="dropdown-item">Option 2</button>
  <div className="dropdown-divider" />
  <button className="dropdown-item">Option 3</button>
</div>
```

### Modals

```tsx
<div className="modal-backdrop">
  <div className="modal">
    <div className="modal-content">
      <div className="modal-header">
        <h2>Modal Title</h2>
      </div>
      <div className="modal-body">
        <p>Modal content</p>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary">Cancel</button>
        <button className="btn-primary">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

### Layout Components

```tsx
// Navbar
<nav className="navbar">
  <div className="navbar-content">
    {/* content */}
  </div>
</nav>

// Sidebar
<aside className="sidebar-expanded">
  {/* navigation items */}
</aside>

// Containers
<div className="container-fluid">
  {/* full width with padding */}
</div>

<div className="container-max">
  {/* max-width with centering */}
</div>
```

## ✨ Utility Classes (utilities.css)

### Animations

```tsx
<div className="animate-fadeIn">Fades in</div>
<div className="animate-slideInLeft">Slides from left</div>
<div className="animate-slideInRight">Slides from right</div>
<div className="animate-slideInTop">Slides from top</div>
<div className="animate-slideInBottom">Slides from bottom</div>
<div className="animate-shimmer">Shimmer effect</div>
<div className="animate-pulse-soft">Soft pulse</div>
<div className="animate-spin-slow">Slow spin</div>
<div className="animate-bounce-subtle">Subtle bounce</div>
<div className="animate-scale-in">Scales in</div>
```

### Glassmorphism

```tsx
<div className="glass">Light glass effect</div>
<div className="glass-dark">Dark glass effect</div>
<div className="glass-card">Glass card</div>
```

### Gradients

```tsx
// Background gradients
<div className="gradient-primary">Blue to purple</div>
<div className="gradient-success">Green gradient</div>
<div className="gradient-warm">Orange to pink</div>
<div className="gradient-sunset">Multi-color sunset</div>
<div className="gradient-mesh">Mesh gradient</div>

// Text gradients
<h1 className="text-gradient">Gradient text</h1>
<h2 className="text-gradient-primary">Primary gradient</h2>
<h3 className="text-gradient-success">Success gradient</h3>
```

### Hover Effects

```tsx
<div className="hover-lift">Lifts on hover</div>
<div className="hover-grow">Grows on hover</div>
<div className="hover-glow">Glows on hover</div>
<div className="hover-shine">Shine effect on hover</div>
```

### Patterns

```tsx
<div className="grid-pattern">Grid background</div>
<div className="grid-pattern-sm">Small grid</div>
<div className="dots-pattern">Dots background</div>
```

### Scrollbar Styling

```tsx
<div className="scrollbar-thin">Custom thin scrollbar</div>
<div className="scrollbar-hidden">Hidden scrollbar</div>
```

### Text Utilities

```tsx
<p className="text-balance">Balanced text wrapping</p>
<p className="text-pretty">Pretty text wrapping</p>
<p className="truncate-2">Truncate to 2 lines</p>
<p className="truncate-3">Truncate to 3 lines</p>
```

## 🎨 Best Practices

### 1. Use Design Tokens

❌ **Don't do this:**
```tsx
<div className="bg-blue-500 text-white p-4 rounded-lg">
```

✅ **Do this:**
```tsx
<div className="btn-primary btn-md">
```

### 2. Consistent Spacing

Always use the spacing system variables:
```tsx
// Good
<div className="gap-[var(--spacing-md)]">

// Better
<div className="gap-4"> {/* Tailwind equivalent */}
```

### 3. Semantic Class Names

Use semantic component classes instead of utility-only approaches:
```tsx
// Good
<div className="card p-6 hover:shadow-lg">

// Better
<div className="card-hover">
```

### 4. Responsive Design

Use mobile-first approach:
```tsx
<div className="btn-sm md:btn-md lg:btn-lg">
  Responsive button
</div>
```

### 5. Accessibility

Always include proper focus states (built into component classes):
```tsx
<button className="btn-primary">
  {/* Automatically includes focus-visible styles */}
</button>
```

## 🔧 Customization

### Adding New Colors

Edit `styles/variables.css`:
```css
:root {
  --color-custom: 123 45 67; /* RGB values */
}
```

Use in Tailwind:
```tsx
<div className="bg-[rgb(var(--color-custom))]">
```

### Adding New Components

Edit `styles/components.css`:
```css
@layer components {
  .my-component {
    @apply bg-white rounded-lg shadow-sm p-4;
  }
}
```

### Adding New Utilities

Edit `styles/utilities.css`:
```css
@layer utilities {
  .my-utility {
    /* custom styles */
  }
}
```

## 📱 Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

Usage with Tailwind:
```tsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
```

## 🌙 Dark Mode (Optional)

Dark mode variables are defined but not active by default. To enable:

1. Add `dark` class to `<html>` tag
2. Use dark mode utilities: `dark:bg-gray-900`

## 🎯 Z-Index Scale

```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
--z-notification: 1080;
```

## 📚 Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [CSS Layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)

---

**Last Updated:** October 2024
**Version:** 1.0.0
