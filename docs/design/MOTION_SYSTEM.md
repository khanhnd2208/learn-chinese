# Motion System

## Purpose hierarchy

Motion serves four functions only:

| Function | Examples | Priority |
|----------|----------|----------|
| Feedback | Button press, toggle, save success | High |
| Continuity | Panel open, tab indicator | Medium |
| Hierarchy | Modal enter, new content | Medium |
| Attention | Validation error, critical alert | Low (use sparingly) |

**Never** animate for decoration.

## Duration tokens

| Token | ms | CSS variable | Use |
|-------|-----|--------------|-----|
| instant | 100 | `--duration-instant` | Press, color |
| fast | 150 | `--duration-fast` | Exit, hover |
| standard | 220 | `--duration-standard` | Enter, panel |
| slow | 320 | `--duration-slow` | Section reveal |

## Easing

| Name | Curve | Use |
|------|-------|-----|
| enter | ease-out | Elements appearing |
| exit | ease-in | Elements leaving |
| standard | ease-in-out | Color, opacity |

## Component specs

### Button press
- `scale(0.98)` on active, instant duration
- Color transition on hover: fast

### Dialog enter
- Overlay: opacity 0→1, standard
- Panel: opacity 0→1 + translateY(8px→0), standard
- Exit: fast, no translate on exit

### Sheet (mobile)
- Slide up from bottom, standard
- Backdrop fade, standard

### Toast
- Slide up + fade in, fast
- Slide down + fade out, fast

### Page section
- `animate-section-in` (fade-slide-up 0.45s) — max once per section on load
- No stagger on lists > 5 items

### Question card feedback
- Correct: border color pulse-success (2s loop, stop after 1 cycle)
- Wrong: shake disabled — use border-warning static

## Rules

1. Direct interaction feedback < 120ms perceived.
2. Exit faster than enter.
3. Animate `transform` and `opacity` only — avoid width/height.
4. No full-page animation on route change (Next.js default).
5. Honor `prefers-reduced-motion: reduce` — disable all animations.

## CSS vs JS

| Use CSS | Use JS/state |
|---------|--------------|
| Hover, focus, color | Focus trap in dialog |
| Simple enter/exit | Drag gestures (future) |
| Button press | — |

No animation library dependency in current scope.
