# Design System Documentation

**Version**: 5.10.0  
**Last Updated**: 2025-10-16T13:03:00.000Z  
**Status**: Active - Single Source of Truth

---

## Overview

This document describes the centralized design system for the DoneIsBetter SSO project. All visual styling **MUST** use design tokens from `styles/globals.css`. Hardcoded values are **PROHIBITED**.

## Core Principles

### 1. **Single Source of Truth**
All design tokens are defined in `styles/globals.css`. No hardcoded colors, spacing, or typography values are allowed outside this file.

### 2. **Semantic Naming**
Tokens use semantic names that describe their purpose (e.g., `--text-primary`, `--bg-surface`) rather than their values (e.g., `--color-blue-500`).

### 3. **Consistency**
Use the same tokens for the same purposes across the entire application to maintain visual consistency.

### 4. **Accessibility**
All color combinations meet WCAG 2.1 AA accessibility standards for contrast ratios.

---

## Design Tokens

### Color System

#### Background Colors
```css
--bg-page: #fafafa              /* Main page background */
--bg-surface: #ffffff           /* Card/panel backgrounds */
--bg-surface-secondary: #f4f4f5 /* Secondary surfaces */
--bg-surface-hover: #e4e4e7     /* Hover states */
--bg-code: #18181b              /* Code blocks */
--bg-overlay: rgba(0,0,0,0.5)   /* Modal overlays */
```

#### Text Colors
```css
--text-primary: #09090b         /* Primary text (headlines, body) */
--text-secondary: #52525b       /* Secondary text (descriptions) */
--text-tertiary: #71717a        /* Tertiary text (hints, labels) */
--text-inverse: #ffffff         /* Text on dark backgrounds */
--text-link: #2563eb            /* Links */
--text-link-hover: #1d4ed8      /* Link hover state */
--text-code: #d4d4d8            /* Code text */
```

#### Border Colors
```css
--border-subtle: #e4e4e7        /* Subtle borders */
--border-default: #d4d4d8       /* Default borders */
--border-strong: #a1a1aa        /* Strong borders */
--border-focus: #3b82f6         /* Focus rings */
```

#### Brand Colors
```css
--brand-primary: #2563eb        /* Primary brand color */
--brand-primary-hover: #1d4ed8  /* Primary hover */
--brand-primary-active: #1e40af /* Primary active */
--brand-secondary: #8b5cf6      /* Secondary brand color */
--brand-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)
```

#### Status Colors
```css
--status-success: #16a34a       /* Success states */
--status-error: #dc2626         /* Error states */
--status-warning: #d97706       /* Warning states */
--status-info: #2563eb          /* Info states */
```

### Typography

#### Font Families
```css
--font-sans: 'Inter', -apple-system, ...    /* Body text */
--font-mono: 'JetBrains Mono', ...          /* Code */
```

#### Font Sizes
```css
--text-xs: 0.75rem      /* 12px */
--text-sm: 0.875rem     /* 14px */
--text-base: 1rem       /* 16px */
--text-lg: 1.125rem     /* 18px */
--text-xl: 1.25rem      /* 20px */
--text-2xl: 1.5rem      /* 24px */
--text-3xl: 1.875rem    /* 30px */
--text-4xl: 2.25rem     /* 36px */
--text-5xl: 3rem        /* 48px */
```

#### Font Weights
```css
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

#### Line Heights
```css
--leading-none: 1
--leading-tight: 1.25
--leading-snug: 1.375
--leading-normal: 1.5
--leading-relaxed: 1.625
--leading-loose: 2
```

### Spacing Scale

```css
--space-0: 0
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
--space-20: 5rem     /* 80px */

/* Semantic Aliases */
--space-xs: var(--space-1)
--space-sm: var(--space-2)
--space-md: var(--space-4)
--space-lg: var(--space-6)
--space-xl: var(--space-8)
--space-2xl: var(--space-12)
--space-3xl: var(--space-16)
```

### Border Radius

```css
--radius-none: 0
--radius-sm: 0.375rem   /* 6px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-2xl: 1.5rem    /* 24px */
--radius-full: 9999px
```

### Shadows

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1)...
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)...
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)...
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)...
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)
--shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.1)
--shadow-brand: 0 4px 12px rgba(59, 130, 246, 0.15)
--shadow-brand-lg: 0 10px 30px rgba(59, 130, 246, 0.2)
```

### Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slower: 500ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Utility Classes

Pre-built, reusable CSS classes for common patterns.

### Buttons

```html
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary Action</button>
<button class="btn-danger">Delete</button>
<button class="btn-ghost">Ghost Button</button>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <p>Card content goes here</p>
  <div class="card-footer">
    <button class="btn-primary">Action</button>
  </div>
</div>
```

### Badges

```html
<span class="badge">Default</span>
<span class="badge badge-success">Active</span>
<span class="badge badge-error">Error</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-info">Info</span>
```

### Containers

```html
<div class="container">Full width container</div>
<div class="container container-sm">Small container</div>
<div class="container container-md">Medium container</div>
```

### Layout Utilities

```html
<!-- Flexbox -->
<div class="flex items-center justify-between gap-4">
  <span>Item 1</span>
  <span>Item 2</span>
</div>

<!-- Text alignment -->
<p class="text-center">Centered text</p>
<p class="text-left">Left-aligned text</p>

<!-- Text colors -->
<p class="text-primary">Primary text</p>
<p class="text-secondary">Secondary text</p>

<!-- Spacing -->
<div class="mt-4 mb-8">Content with margin</div>
```

---

## Usage Guidelines

### ✅ DO

```css
/* Use design tokens */
.my-component {
  color: var(--text-primary);
  background: var(--bg-surface);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

```jsx
/* Use utility classes */
<div className="card">
  <h2>My Component</h2>
  <button className="btn-primary">Click Me</button>
</div>
```

### ❌ DON'T

```css
/* Don't use hardcoded values */
.my-component {
  color: #333;              /* ❌ Use var(--text-primary) */
  background: white;        /* ❌ Use var(--bg-surface) */
  padding: 16px;            /* ❌ Use var(--space-4) */
  border-radius: 8px;       /* ❌ Use var(--radius-md) */
}
```

```jsx
/* Don't use inline styles */
<div style={{ color: '#333', padding: '16px' }}>  {/* ❌ */}
  Content
</div>
```

---

## Removing Inline Styles

When removing inline styles from React components:

### Step 1: Identify the Pattern
Look at what the inline style is trying to achieve:
```jsx
<div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
```

### Step 2: Use Design Tokens in CSS Module
Create or update a CSS module:
```css
/* component.module.css */
.description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-2);
}
```

### Step 3: Apply the Class
```jsx
<div className={styles.description}>
  Content
</div>
```

### Step 4: Or Use Utility Classes
For simple cases, use utility classes directly:
```jsx
<div className="text-sm text-secondary mt-2">
  Content
</div>
```

---

## Adding New Components

When creating new components:

1. **Start with utility classes** if possible
2. **Create a CSS module** if you need custom styling
3. **Always use design tokens** from `globals.css`
4. **Never hardcode** colors, spacing, or typography values
5. **Test accessibility** - ensure sufficient contrast ratios

### Example Component

```jsx
// components/InfoCard.js
import styles from './InfoCard.module.css';

export default function InfoCard({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
```

```css
/* components/InfoCard.module.css */
.title {
  color: var(--text-primary);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

.content {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}
```

---

## Migration Checklist

When refactoring existing components:

- [ ] Remove all hardcoded colors
- [ ] Remove all hardcoded spacing values
- [ ] Remove all hardcoded font sizes/weights
- [ ] Replace with design tokens or utility classes
- [ ] Test in both light and dark contexts (if applicable)
- [ ] Verify accessibility (contrast ratios)
- [ ] Test responsive behavior

---

## Maintenance

### Adding New Tokens

1. Add to `styles/globals.css` in the appropriate section
2. Document in this file
3. Announce in team communication
4. Update RELEASE_NOTES.md

### Modifying Existing Tokens

**WARNING**: Changing token values affects the entire application.

1. Create a proposal with before/after examples
2. Test across all pages
3. Update this documentation
4. Version bump (MINOR for additions, MAJOR for breaking changes)

---

## Resources

- **Design System File**: `styles/globals.css`
- **Example Usage**: `styles/home.module.css`
- **Utility Classes**: See `globals.css` lines 414-594

---

## Questions?

For questions or suggestions about the design system, please open an issue or discuss in the team channel.

**Remember**: Consistency is key. When in doubt, use existing patterns.
