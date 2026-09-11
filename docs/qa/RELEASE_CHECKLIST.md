# Release Checklist — UI/UX

## Pre-merge (every UI change)

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] No new arbitrary colors/spacing outside tokens
- [ ] Reused `src/components/ui/` components where applicable
- [ ] Vietnamese copy for user-facing strings
- [ ] Dark mode checked (light + dark)
- [ ] Mobile width checked (375px minimum)

## Per-screen Definition of Done

### Product
- [ ] Clear screen goal
- [ ] One primary CTA
- [ ] Fits golden flow
- [ ] No redundant features

### UX
- [ ] User knows current state
- [ ] Next action obvious
- [ ] Error recovery path
- [ ] No dead ends
- [ ] Back behavior predictable

### Visual
- [ ] Design tokens only
- [ ] Typography hierarchy
- [ ] Spacing from scale

### Component
- [ ] No duplicate components
- [ ] All variants/states covered

### Interaction
- [ ] Instant feedback on actions
- [ ] Motion purposeful
- [ ] Reduced motion respected

### Responsive
- [ ] Mobile + tablet + desktop
- [ ] Long content + empty + many records

### Accessibility
- [ ] Keyboard navigable
- [ ] Focus visible
- [ ] Labels present
- [ ] Contrast AA

### Engineering
- [ ] Business logic unchanged
- [ ] No unnecessary dependencies
- [ ] No console errors

## Milestone gates

| Milestone | Gate |
|-----------|------|
| M1 Docs + tokens | All docs exist; tokens in `@theme` |
| M2 Components | UI Lab shows all primitives + composites |
| M3 Golden slice | Practice + SRS + Inferno + Dashboard score ≥ 80 |
| M4 Scale | Remaining screens use design system |
| M5 Polish | PWA SW + `npm run quality` green |

## PWA release

- [ ] `manifest.webmanifest` valid
- [ ] Service worker registers
- [ ] Offline shell loads
- [ ] Icons 192 + 512 present
- [ ] `theme_color` matches accent

## Post-release

- [ ] Monitor SRS completion rate
- [ ] Check empty-state CTA clicks
- [ ] Review error logs for UI-related failures
