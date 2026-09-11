# Accessibility

Integrated from component system — not a final-step audit.

## Requirements

### Semantic HTML
- Use `<main>`, `<nav>`, `<section>`, `<button>` vs `<div onClick>`
- Heading order: h1 → h2 → h3, no skips
- Lists for navigation items

### Keyboard
- All interactive elements focusable via Tab
- Visible focus: `ring-2 ring-accent ring-offset-2`
- Escape closes modals/sheets
- Enter/Space activates buttons
- Arrow keys in tabs and radio groups
- No focus traps except in open dialogs

### Forms
- Every input has visible `<label>` or `aria-label`
- Errors linked via `aria-describedby` + `aria-invalid`
- Required fields marked

### Icons
- Icon-only buttons: `aria-label` required
- Decorative icons: `aria-hidden="true"`

### Color & contrast
- WCAG AA: 4.5:1 body text, 3:1 large text
- Never rely on color alone — add icon or text label
- Error states: border + message, not just red border

### Screen readers
- Live regions for toast: `role="status"` `aria-live="polite"`
- Dialog: `aria-modal="true"`, labelled by title
- Progress: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Touch
- Minimum target: 44×44px on mobile
- `tap-highlight-transparent` on interactive elements

### Motion
- `prefers-reduced-motion: reduce` disables animations (implemented in globals.css)

### Chinese content
- `lang` attribute on hanzi spans: `lang="zh-Hans"`
- Page `lang="vi"` on `<html>`

## Keyboard flows to test

1. Tab through sidebar → activate link with Enter
2. Open dialog → Tab trapped → Escape → focus returns
3. Complete practice question with keyboard only
4. Toggle theme with keyboard
5. Submit form with Enter

## Testing tools

- axe DevTools or Lighthouse accessibility audit
- VoiceOver (macOS/iOS) spot check on review session
- Keyboard-only navigation pass before release
