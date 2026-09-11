# Visual QA Checklist

Run before marking any screen complete. Test at: **320, 375, 768, 1024, 1280, 1440px**.

## Layout
- [ ] Alignment consistent with spacing scale
- [ ] No excessive nested containers
- [ ] Whitespace rhythm (section-gap 32px)
- [ ] Long text doesn't break layout (100 char titles)
- [ ] Sticky header doesn't obscure content
- [ ] Safe area insets on mobile (bottom nav)

## Typography
- [ ] Heading hierarchy clear (one h1 per page)
- [ ] Body readable at 14px
- [ ] Label vs placeholder distinct
- [ ] Line length < 75 characters for body
- [ ] Hanzi always largest on learning screens

## Component consistency
- [ ] Same-role buttons same variant
- [ ] Form fields same height
- [ ] Modal padding consistent
- [ ] Icons same size per context
- [ ] Cards not overused

## States
- [ ] Loading (skeleton)
- [ ] Empty (CTA present)
- [ ] Error (retry path)
- [ ] Success feedback
- [ ] Disabled (reason clear)
- [ ] Hover / focus / active
- [ ] Permission denied

## Responsive
- [ ] Mobile bottom nav visible (except focus sessions)
- [ ] Desktop sidebar visible
- [ ] Grids collapse correctly
- [ ] Modals → sheets on mobile
- [ ] Touch targets ≥ 44px

## Content stress
- [ ] 100-char set title
- [ ] 0 items / 1 item / 100+ items
- [ ] No avatar / long email
- [ ] 200% browser zoom usable

## Performance
- [ ] No layout shift on load
- [ ] Animations use transform/opacity
- [ ] No blocking interaction during load

## Scorecard (100 points)

| Group | Points |
|-------|--------|
| Product clarity | 10 |
| Information architecture | 10 |
| User flow | 10 |
| Visual hierarchy | 10 |
| Design-system consistency | 10 |
| States & error recovery | 10 |
| Interaction & motion | 10 |
| Responsive | 10 |
| Accessibility | 10 |
| Performance & engineering | 10 |

| Score | Rating |
|-------|--------|
| < 60 | Not ready |
| 60–74 | Usable, basic |
| 75–84 | Professional |
| 85–92 | High product quality |
| > 92 | Polish — verify not perfectionism |

Target for golden slice: **≥ 80**.
