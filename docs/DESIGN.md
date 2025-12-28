# EngageNinja Design System

A comprehensive guide to UI components, styling patterns, and design standards for consistent development.

## Table of Contents

1. [Components](#components)
2. [Typography](#typography)
3. [Color System](#color-system)
4. [Spacing & Layout](#spacing--layout)
5. [Border Radius](#border-radius)
6. [Form Validation](#form-validation)
7. [Empty States](#empty-states)
8. [Loading States](#loading-states)
9. [Best Practices](#best-practices)

---

## Components

### Form Components

#### Input
Reusable text input with validation support.

```jsx
import { Input, Label } from '@/components/ui';

<div>
  <Label htmlFor="email" required>Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="user@example.com"
    error={emailError}
  />
</div>
```

**Props:**
- `type`: Input type (default: 'text')
- `error`: Error message string (shows red border and error text below)
- `className`: Custom classes (merged with base styles)

**Styling:**
- Base: `rounded-lg border bg-[var(--card)] px-4 py-2 text-[var(--text)]`
- Error: Red border and focus ring

#### Select
Reusable dropdown select with consistent styling.

```jsx
import { Select, Label } from '@/components/ui';

<div>
  <Label htmlFor="role" required>Role</Label>
  <Select
    id="role"
    value={role}
    onChange={(e) => setRole(e.target.value)}
    error={roleError}
  >
    <option value="">Choose a role</option>
    <option value="member">Member</option>
    <option value="admin">Admin</option>
  </Select>
</div>
```

**Props:**
- `error`: Error message string
- `className`: Custom classes
- All standard HTML select attributes

#### Label
Form label with required field indicator.

```jsx
<Label htmlFor="name" required>Full Name</Label>
```

**Props:**
- `required`: Show red asterisk (*)
- Standard HTML label attributes

### Data Display Components

#### DataTable
Reusable table with sorting, search, pagination, and row actions.

```jsx
import { DataTable } from '@/components/ui';

<DataTable
  columns={columns}
  data={data}
  title="Items"
  description="Manage your items"
  rowActions={rowActions}
  emptyIcon={Users}
  emptyTitle="No items"
  emptyDescription="Create your first item to get started."
/>
```

**Props:**
- `columns`: Array of column definitions (@tanstack/react-table)
- `data`: Array of row data
- `title`: Optional table title
- `description`: Optional description
- `rowActions`: Array of row action buttons
- `bulkActions`: Array of bulk action buttons
- `enableSearch`: Show search input (default: true)
- `enableSelection`: Show checkboxes (default: true)
- `enableColumnToggle`: Show column visibility toggle (default: true)
- `hidePagination`: Hide pagination controls (default: false)
- `emptyIcon`: Icon component for empty state
- `emptyTitle`: Empty state title
- `emptyDescription`: Empty state description
- `emptyAction`: CTA button for empty state

### State Components

#### EmptyState
Display when no data is available.

```jsx
import { EmptyState } from '@/components/ui';
import { Users } from 'lucide-react';

<EmptyState
  icon={Users}
  title="No team members"
  description="Invite your first team member to get started."
  action={<PrimaryAction onClick={onInvite}>Invite Member</PrimaryAction>}
/>
```

**Props:**
- `icon`: Lucide icon component (default: FileQuestion)
- `title`: Empty state title
- `description`: Optional description
- `action`: Optional CTA element

#### LoadingState
Show while data is loading.

```jsx
import { LoadingState } from '@/components/ui';

<LoadingState message="Loading campaigns..." />
```

#### ErrorState
Display when an error occurs.

```jsx
import { ErrorState } from '@/components/ui';

<ErrorState
  title="Failed to load data"
  description="An error occurred"
  onRetry={refetch}
  retryLabel="Try Again"
/>
```

### Skeleton Loaders
Placeholders for content that's loading.

```jsx
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton
} from '@/components/ui';

// Single skeleton block
<Skeleton className="h-20 w-full rounded-lg" />

// Multi-line text
<SkeletonText lines={3} />

// Card placeholder
<SkeletonCard />

// Table placeholder
<SkeletonTable rows={5} columns={6} />

// Avatar placeholder
<SkeletonAvatar />

// Button placeholder
<SkeletonButton />
```

### Dialog
Modal dialog component.

```jsx
import { Dialog, Button } from '@/components/ui';

<Dialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
    </>
  }
/>
```

### Badge
Label/tag component for status and categories.

```jsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="primary">Featured</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="neutral">Draft</Badge>
```

**Variants:** success, primary, warning, neutral

### Button
Action button component.

```jsx
import { Button } from '@/components/ui';

<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

---

## Typography

### Type Scale

| Level | Class | Size | Weight | Use Case |
|-------|-------|------|--------|----------|
| H1 | `text-3xl` | 30px | `font-bold` | Page titles |
| H2 | `text-2xl` | 24px | `font-semibold` | Section headers |
| H3 | `text-xl` | 20px | `font-semibold` | Subsection headers |
| H4 | `text-lg` | 18px | `font-semibold` | Component titles |
| Body | `text-base` | 16px | `font-normal` | Paragraph text |
| Small | `text-sm` | 14px | `font-normal` | Secondary text, labels |
| Tiny | `text-xs` | 12px | `font-normal` | Captions, hints |

### Text Color

- **Primary text**: `text-[var(--text)]`
- **Secondary text**: `text-[var(--text-muted)]`
- **Success text**: `text-green-600 dark:text-green-400`
- **Error text**: `text-red-600 dark:text-red-400`
- **Warning text**: `text-yellow-600 dark:text-yellow-400`

### Font Guidelines

- **Headlines**: Use `font-bold` for H1, `font-semibold` for H2-H4
- **Body text**: Use `font-normal` for standard content
- **Labels**: Use `font-medium` for form labels and captions
- **Uppercase**: Use `uppercase tracking-[0.3em]` for section labels

Example:
```jsx
<h1 className="text-3xl font-bold text-[var(--text)]">Page Title</h1>
<p className="text-sm font-normal text-[var(--text-muted)]">Secondary text</p>
<div className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Section</div>
```

---

## Color System

### CSS Variables (Use for Theme-Dependent Colors)

All color values use CSS custom properties for automatic dark mode support:

```css
--text: Primary text color
--text-muted: Secondary/muted text
--background: Page background
--card: Card/input background
--border: Border color
--grid-bg: Table background
--grid-header: Table header background
--grid-border: Table border color
--grid-glow: Table glow/shadow
```

### Semantic Status Colors

Use Tailwind color utilities for semantic meaning:

**Success**: `text-green-600`, `bg-green-100`, `border-green-200`
**Error**: `text-red-600`, `bg-red-100`, `border-red-200`
**Warning**: `text-yellow-600`, `bg-yellow-100`, `border-yellow-200`
**Info**: `text-blue-600`, `bg-blue-100`, `border-blue-200`

### Color Usage Rules

1. **Never use hex values** - Always use CSS variables or Tailwind colors
2. **Theme-dependent colors** - Use `var(--*)` for backgrounds, text, borders
3. **Status colors** - Use semantic Tailwind classes (green, red, yellow, blue)
4. **Interactive states** - Use `hover:`, `focus:`, `disabled:` modifiers

Example:
```jsx
// ✅ Correct
<div className="bg-[var(--card)] text-[var(--text)] border border-[var(--border)]">
  Content
</div>

<button className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700">
  Success
</button>

// ❌ Incorrect
<div className="bg-#ffffff text-#000000">Content</div>
<button className="bg-rgb(0, 255, 0)">Button</button>
```

---

## Spacing & Layout

### Standard Spacing Scale

Use consistent spacing based on 4px units:

| Class | Size | Use |
|-------|------|-----|
| `p-2` | 8px | Tight spacing |
| `p-3` | 12px | Compact spacing |
| `p-4` | 16px | Default padding |
| `p-5` | 20px | Generous spacing |
| `p-6` | 24px | Section spacing |
| `gap-2` | 8px | Tight gaps |
| `gap-3` | 12px | Compact gaps |
| `gap-4` | 16px | Standard gaps |
| `gap-6` | 24px | Section gaps |

### Layout Patterns

```jsx
// Vertical spacing
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Horizontal spacing
<div className="flex gap-3">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>

// Responsive grid
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id}>{item}</Card>)}
</div>

// Card sections
<Card className="space-y-5">
  <CardHeader>Title</CardHeader>
  <CardContent className="space-y-4">
    Content here
  </CardContent>
</Card>
```

---

## Border Radius

### Standard Values

Only 2 border radius values are used across the app:

- **`rounded-lg`** (8px): Buttons, inputs, selects, small UI elements
- **`rounded-2xl`** (16px): Cards, dialogs, large containers

**Rules:**
- Never use `rounded-md`, `rounded-xl`, `rounded-3xl`
- Inputs and buttons: Always `rounded-lg`
- Cards and containers: Always `rounded-2xl`
- Dialogs: Always `rounded-2xl`

Example:
```jsx
// ✅ Correct
<Input className="rounded-lg" />
<Button className="rounded-lg" />
<Card className="rounded-2xl" />
<Dialog className="rounded-2xl" />

// ❌ Incorrect
<Input className="rounded-md" />
<Card className="rounded-xl" />
<Button className="rounded-3xl" />
```

---

## Form Validation

### Required Fields

Show required indicator with red asterisk:

```jsx
<Label htmlFor="email" required>Email Address</Label>
<Input
  id="email"
  type="email"
  placeholder="user@example.com"
/>
```

Renders as: "Email Address *" (asterisk in red)

### Error Display

Show inline error messages:

```jsx
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');

const validate = () => {
  if (!email) {
    setEmailError('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setEmailError('Invalid email format');
  }
};

<div className="space-y-2">
  <Label htmlFor="email" required>Email</Label>
  <Input
    id="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    onBlur={validate}
    error={emailError}
  />
</div>
```

**Visual feedback:**
- Required field: Red `*` next to label
- Error state: Red border on input
- Error message: Red text below input (14px, `text-red-600`)

### Error Styling

- Border: `border-red-500`
- Focus ring: `focus-visible:ring-red-500`
- Text: `text-red-600 dark:text-red-400`

---

## Empty States

### Structure

Empty states should always include:
1. **Icon** - Visual representation (defaults to FileQuestion if not provided)
2. **Title** - What's missing or why it's empty
3. **Description** - Optional context or guidance
4. **Action** - Optional CTA button

### Best Practices

**Informative titles:**
- ❌ "No items"
- ✅ "No contacts yet"
- ✅ "No campaigns created"

**Helpful descriptions:**
- ❌ "There is nothing here"
- ✅ "Create your first contact to get started"
- ✅ "Import a CSV or add contacts manually"

**Appropriate CTAs:**
- Match the action user needs to take
- Use PrimaryAction or SecondaryAction
- Make it obvious how to proceed

Example:
```jsx
<EmptyState
  icon={Users}
  title="No team members yet"
  description="Invite teammates to collaborate on campaigns."
  action={<PrimaryAction onClick={onInvite}>Invite Member</PrimaryAction>}
/>
```

---

## Loading States

### Options

1. **Spinner** (for quick operations < 2 seconds):
   ```jsx
   <LoadingState message="Loading campaigns..." />
   ```

2. **Skeleton** (for longer operations > 2 seconds):
   ```jsx
   <SkeletonCard />
   <SkeletonTable rows={5} columns={6} />
   ```

3. **Combined** (skeleton with delayed spinner):
   ```jsx
   {loading && (
     <>
       {!skeletonVisible && <LoadingState />}
       {skeletonVisible && <SkeletonTable />}
     </>
   )}
   ```

### When to Use

- **Spinners**: API calls, quick operations, form submissions
- **Skeletons**: Page loads, large data sets, > 1 second expected time
- **DataTable loading**: Use `loading` prop on DataTable component

---

## Best Practices

### 1. Consistency Over Variation

- Use standardized components instead of custom HTML
- Stick to design system colors, spacing, and typography
- Reuse components across pages (Button, Badge, Input, etc.)

### 2. Accessibility

- Always include `htmlFor` on Label for form inputs
- Use `aria-label` on icon-only buttons
- Include error messages for form validation
- Ensure sufficient color contrast (WCAG AA minimum)

### 3. Dark Mode

- All colors must work in light and dark modes
- Use CSS variables (`var(--*)`) for automatic support
- Test all UI in both modes
- Use `dark:` prefix for mode-specific overrides

### 4. Responsive Design

- Mobile-first approach
- Use `md:`, `lg:`, `xl:` breakpoints
- Test on actual devices
- Ensure touch targets are 44px minimum

### 5. Performance

- Use Skeleton loaders for perceived performance
- Lazy load images
- Minimize bundle size
- Use `React.memo()` for expensive components

### 6. Code Organization

```jsx
// ✅ Good structure
import { Input, Label, Button } from '@/components/ui';
import { Mail } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
      </div>
      <Button type="submit">Login</Button>
    </form>
  );
}
```

### 7. Component Props

- Keep props minimal and focused
- Use TypeScript for prop definitions
- Provide sensible defaults
- Document prop usage in comments

### 8. Testing

- Test components in isolation
- Verify dark mode support
- Test responsive behavior
- Check form validation states
- Test empty, loading, and error states

---

## Component Checklist

When creating new components, ensure:

- [ ] Uses standardized spacing (gap-*, p-*)
- [ ] Uses rounded-lg or rounded-2xl only
- [ ] Uses CSS variables for colors
- [ ] Includes accessible labels/aria
- [ ] Works in both light and dark modes
- [ ] Responsive on mobile/tablet/desktop
- [ ] Supports error/disabled states
- [ ] Documented with JSDoc comments
- [ ] Exported from ui/index.js
- [ ] No inline styles (use className only)

---

## Migration Guide

### From Old Patterns to Design System

**Replace custom selects:**
```jsx
// Old
<select className="w-full rounded-md border border-gray-300 ...">

// New
import { Select } from '@/components/ui';
<Select>...</Select>
```

**Replace inline error handling:**
```jsx
// Old
{error && <div className="text-red-600 text-sm mt-1">{error}</div>}

// New
<Input error={error} />
```

**Replace custom empty states:**
```jsx
// Old
{data.length === 0 && <div>No data</div>}

// New
import { EmptyState } from '@/components/ui';
<EmptyState icon={Users} title="No items" />
```

---

## Resources

- **Tailwind CSS**: https://tailwindcss.com
- **Lucide Icons**: https://lucide.dev
- **React Table**: https://tanstack.com/table/v8/docs/guide/introduction
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Last Updated**: 2025-12-28
**Maintained By**: EngageNinja Frontend Team
