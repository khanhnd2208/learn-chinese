# Component Standards

Implementation: [`src/components/ui/`](../../src/components/ui/)  
Showcase: `/dev/ui` (UI Lab)

## Primitives

### Button

| Property | Values |
|----------|--------|
| Variants | `primary`, `secondary`, `tertiary`, `destructive`, `ghost`, `link` |
| Sizes | `sm`, `md`, `lg` |
| States | default, hover, active, focus, disabled, loading |
| Icon | `left`, `right`, icon-only (requires `aria-label`) |
| Keyboard | Enter/Space activates; visible focus ring |

**Do not:** combine `rounded` + `gradient` + `glowing` props.

### Input / Textarea / Select

- Height: 40px (md), 36px (sm)
- Border: `border-border`, focus: `ring-2 ring-accent`
- Error: `border-error` + error message below via `FormField`
- Disabled: `opacity-50`, `cursor-not-allowed`

### Checkbox / Radio / Switch

- Min touch target: 44×44px on mobile
- Label always associated via `htmlFor` / `aria-labelledby`

### Badge

| Variant | Usage |
|---------|-------|
| default | Neutral metadata |
| accent | Active, due count |
| success | Mastered, correct |
| warning | Overdue, weak |
| error | Failed state |

### Spinner / Skeleton

- Spinner: inline actions, buttons
- Skeleton: page/card loading (match final layout shape)

## Composite components

### Card

```
Card > CardHeader? > CardTitle + CardDescription? > CardContent > CardFooter?
```

Variants: `default` (card-paper style), `interactive` (hover border accent).

### Dialog / Sheet

- Dialog: centered modal, desktop
- Sheet: bottom sheet on mobile (`<md`), dialog on desktop
- Focus trap, Escape closes, focus returns to trigger
- `role="dialog"`, `aria-modal="true"`, labelled by title

### Toast

- Non-blocking, auto-dismiss 4s
- Variants: success, error, info
- Max 3 visible; stack bottom-center (mobile) or bottom-right (desktop)

### EmptyState / ErrorState

- Icon + title + description + primary CTA + optional secondary link
- EmptyState: neutral tone
- ErrorState: warning icon, retry CTA

### Tabs

- Keyboard: Arrow keys switch tabs
- Active indicator: accent underline or pill fill

### FormField

- Wraps label + control + hint + error message
- Error associated via `aria-describedby`

## Legacy utilities (migrate to components)

| Utility | Replace with |
|---------|--------------|
| `btn-primary` | `<Button variant="primary">` |
| `btn-secondary` | `<Button variant="secondary">` |
| `card-paper` | `<Card>` |
| `label-caps` | `<span className="label-caps">` or typography token |

## Usage rules

1. One `primary` button per view.
2. Reuse `MaterialIcon` — do not mix icon families.
3. Chinese text uses `hanzi-display` or `hanzi-lg` classes.
4. All data states must be designed — not just happy path.
