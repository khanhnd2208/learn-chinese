# Design Foundations — Ink & Vermillion

Runtime source of truth: [`src/app/globals.css`](../../src/app/globals.css)  
Brand spec: [`DESIGN.md`](../../DESIGN.md) (entry point, not duplicate all tokens here)

## Token naming convention

**Runtime uses `accent`** (not `primary`). `DESIGN.md` frontmatter maps `primary` → `accent` for agent compatibility.

| Semantic | CSS variable | Tailwind class |
|----------|-------------|----------------|
| Canvas | `--background` | `bg-background` |
| Surface | `--surface` | `bg-surface` |
| Surface elevated | `--surface-container` | `bg-surface-container` |
| Text primary | `--foreground` | `text-foreground` |
| Text secondary | `--foreground-secondary` | `text-foreground-secondary` |
| Text muted | `--muted` | `text-muted` |
| Border subtle | `--border` | `border-border` |
| Primary action | `--accent` | `bg-accent`, `text-accent` |
| Primary hover | `--accent-hover` | `hover:bg-accent-hover` |
| On primary | `--accent-foreground` | `text-accent-foreground` |
| Success | `--success` | `text-success`, `bg-success` |
| Warning | `--warning` | `text-warning` |
| Danger | `--error` | `text-error` |
| Focus ring | `--accent` | `ring-accent` |

## Color palette

Light mode `:root` and `.dark` overrides in `globals.css`. Warm undertones always — never cold blue-gray.

## Typography

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| display-hero | 36px | 900 | Page titles |
| headline-lg | 24px | 900 | Section headings |
| headline-md | 18px | 900 | Subsections |
| body-md | 14px | 400 | Body copy |
| body-sm | 13px | 400 | Secondary text |
| label-caps | 10px | 700 | Uppercase labels |
| hanzi-display | 48px | 900 | Question hero (Noto Sans SC) |
| hanzi-lg | 36px | 900 | Card hero |
| pinyin | 18px | 700 | Below hanzi, accent color |

Fonts: Source Sans 3 (UI), Noto Sans SC (Chinese), Material Symbols (icons).

## Spacing scale

Use only these values (Tailwind + `@theme`):

`2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

| Token | Value | Usage |
|-------|-------|-------|
| page-padding | 16px mobile, 32px desktop | Page gutters |
| section-gap | 32px | Between sections |
| card-padding | 16px | Inside cards |
| sidebar-width | 240px | Desktop nav |

## Radius

| Token | Value | Component |
|-------|-------|-----------|
| control | 8px | Input, small nav |
| card | 12px | Cards, panels |
| panel | 16px | Large panels |
| dialog | 20px | Modals |
| pill | 9999px | Buttons, badges |

## Elevation (flat tonal — no drop shadows by default)

| Level | Technique |
|-------|-----------|
| 0 | Background only |
| 1 | `bg-surface` + `border-border` |
| 2 | `bg-surface-container` |
| 3 | Overlay `bg-black/40` + dialog surface |

Shadow tokens exist for rare floating elements only (`shadow-elevated`).

## Z-index scale

| Token | Value | Usage |
|-------|-------|-------|
| base | 0 | Default content |
| sticky | 30 | Top app bar |
| sidebar | 40 | Desktop sidebar |
| dropdown | 50 | Menus, bottom nav |
| overlay | 60 | Modal backdrop |
| dialog | 70 | Modal content |
| toast | 80 | Toast notifications |
| critical | 90 | System alerts |

## Motion tokens

| Token | Duration | Usage |
|-------|----------|-------|
| instant | 100ms | Button press |
| fast | 150ms | Exit, hover |
| standard | 220ms | Enter, panel |
| slow | 320ms | Page section |

Easing: `ease-out` enter, `ease-in` exit. Respect `prefers-reduced-motion`.

## Layout breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| mobile | 320–767px | Bottom nav, single column |
| tablet | 768–1023px | 2-col grids |
| desktop | 1024px+ | Sidebar visible |

Content max widths: 672px (narrow), 896px (medium), 1152px (wide).

## Iconography

- Family: Material Symbols Outlined
- Default size: 24px (nav), 16–20px (inline)
- Filled variant for active nav states
- Always pair icon-only buttons with `aria-label`

## Word progress colors

| State | Color |
|-------|-------|
| new | muted |
| learning | accent-subtle |
| familiar | blue tint |
| strong | success |
| mastered | gold |
| weak | warning |
