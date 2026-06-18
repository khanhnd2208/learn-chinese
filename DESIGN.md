---
version: alpha
name: Learn Chinese — Ink & Vermillion
description: Vocabulary Mastery app for Vietnamese learners of Mandarin Chinese. Warm East Asian study aesthetic with cream paper surfaces and vermillion accents.
colors:
  background: "#f7f4ef"
  background-secondary: "#efe9e0"
  surface: "#fffcf8"
  surface-secondary: "#f3ede4"
  surface-hover: "#ebe4d8"
  foreground: "#1c1410"
  foreground-secondary: "#4a3f38"
  muted: "#8a7b72"
  border: "#ddd2c4"
  primary: "#c41e3a"
  primary-hover: "#9e1830"
  primary-subtle: "#fdf0f2"
  on-primary: "#ffffff"
  ink: "#1a1a1a"
  gold: "#b8860b"
  success: "#2d6a4f"
  warning: "#b45309"
  error: "#c41e3a"
  background-dark: "#0f0e0d"
  surface-dark: "#1c1a18"
  foreground-dark: "#f5f0e8"
  primary-dark: "#e8364f"
typography:
  display-hero:
    fontFamily: Source Sans 3
    fontSize: 36px
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Sans 3
    fontSize: 24px
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: 900
    lineHeight: 1.3
    letterSpacing: 0
  body-md:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Source Sans 3
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  label-micro:
    fontFamily: Source Sans 3
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.15em
  hanzi-display:
    fontFamily: Noto Sans SC
    fontSize: 48px
    fontWeight: 900
    lineHeight: 1.1
  hanzi-large:
    fontFamily: Noto Sans SC
    fontSize: 36px
    fontWeight: 900
    lineHeight: 1.2
  pinyin:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
  mono-input:
    fontFamily: ui-monospace
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  page-padding: 24px
  sidebar-width: 240px
  content-max-sm: 672px
  content-max-md: 896px
  content-max-lg: 1152px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 10px 20px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 10px 20px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 16px
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 10px 12px
  stat-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 16px
  badge-new:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    typography: "{typography.label-micro}"
  badge-success:
    backgroundColor: "#e8f5ee"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    typography: "{typography.label-micro}"
  badge-warning:
    backgroundColor: "#fef3c7"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
    typography: "{typography.label-micro}"
---

# Learn Chinese — Design System

## Overview

**Learn Chinese** (Vietnamese: *Học Hán Ngữ*) is a web app that helps Vietnamese speakers master Mandarin Chinese vocabulary. Users create word sets from class notes or HSK lists, study multi-layer word cards, practice with 12 question types, review with spaced repetition (SRS), and analyze characters in Hanzi Lab.

**Brand personality:** Scholarly yet approachable — like a well-designed study notebook with vermillion seals and warm rice-paper pages. Not childish, not corporate. Calm, focused, culturally grounded.

**Target users:** Vietnamese adults and students learning simplified Chinese. UI language is **Vietnamese**; Chinese content uses **simplified characters (简体)** with pinyin and Hán Việt glosses.

**Emotional tone:** Confidence through clarity. Every screen should feel organized, unhurried, and rewarding. Learning Chinese is hard — the UI should never add friction.

**Tagline:** *Vocabulary Mastery* — *Biến danh sách từ mới thành kiến thức nghe được, nhớ mặt chữ, hiểu nghĩa, dùng được trong câu.*

**Wordmark:** `Learn` + `Chinese` (the word "Chinese" in primary vermillion `#c41e3a`). Sub-label: `HỌC HÁN NGỮ` in micro uppercase tracking.

### Screens to Design (complete app)

Design every screen below as a cohesive system. Desktop-first (sidebar layout), with responsive mobile variants.

| # | Screen | Route | Purpose |
|---|--------|-------|---------|
| 1 | Login | `/login` | Google OAuth sign-in card, centered |
| 2 | Home | `/` | Hero, 4 stat tiles, quick actions, recent word sets |
| 3 | Word Sets List | `/sets` | Grid/list of user's vocabulary sets |
| 4 | Create Set | `/sets/create` | Title, description, paste terms, coverage check, HSK 1 shortcut |
| 5 | Set Detail | `/sets/[id]` | Word list with progress badges, practice CTAs |
| 6 | Word Card | `/words/[id]` | **Core screen** — 5 tabs (see below) |
| 7 | Practice Session | `/practice/[setId]` | Question card, progress bar, instant feedback |
| 8 | SRS Review | `/review` | Daily review queue, up to 25 words |
| 9 | Hanzi Lab | `/hanzi-lab` | Character analyzer input + breakdown panel |
| 10 | Listening Picker | `/listening` | Choose a set for listening practice |
| 11 | Progress Dashboard | `/dashboard` | Error analytics, weak words, channel accuracy |
| 12 | Admin CMS | `/admin` | CSV import, preview, publish (admin only) |

**Word Card — 5 tabs (most important UI):**
1. **Tổng quan** — meaning, Hán Việt, mnemonic, related words, action links
2. **Ví dụ** — example sentences with highlighted target word + audio play
3. **Cấu tạo chữ** — per-character breakdown (radical, components, stroke hints)
4. **Cách dùng** — sentence patterns with sample usage
5. **Luyện tập** — shortcuts to listening / sentence / mixed practice

**Layout shell:** Fixed left sidebar (240px) with 6 nav items + user footer. Main content area with page header band (`border-bottom`) and centered content (`max-width 672–1152px`).

**Reference apps for UX patterns (not visual copy):** Duolingo (session flow), Anki (SRS), Pleco (dictionary depth), Skritter (character study). Prefer calm editorial layouts over gamified neon.

---

## Colors

The palette is **Ink & Vermillion** — warm paper neutrals with a single vivid accent inspired by traditional Chinese seal stamps (朱砂).

- **Background (#f7f4ef):** Warm cream "rice paper" — never pure white. Creates a soft, study-friendly atmosphere.
- **Surface (#fffcf8):** Slightly lighter cards and sidebar. Content sits on tonal layers, not heavy shadows.
- **Foreground (#1c1410):** Warm ink black for headlines and primary text. Softer than `#000`.
- **Foreground Secondary (#4a3f38):** Body copy, descriptions.
- **Muted (#8a7b72):** Labels, captions, metadata. Always paired with uppercase micro-labels.
- **Border (#ddd2c4):** Subtle warm dividers. Cards use `1px border`, not drop shadows.
- **Primary / Vermillion (#c41e3a):** The ONLY color for primary CTAs, active nav, key metrics, pinyin text, and brand accent. Use sparingly — one primary action per view.
- **Primary Subtle (#fdf0f2):** Tinted backgrounds for badges and highlights.
- **Success (#2d6a4f):** Correct answers, mastered words, positive feedback.
- **Warning (#b45309):** Weak words, needs attention.
- **Gold (#b8860b):** Reserved for premium/achievement moments (use rarely).
- **Ink (#1a1a1a):** Admin-only active states.

**Dark mode** (design tokens ready, implement toggle): Background `#0f0e0d`, surface `#1c1a18`, foreground `#f5f0e8`, primary `#e8364f`. Maintain warm undertones — never cold blue-gray.

**Word progress colors:**
- `new` — muted gray
- `learning` — primary subtle + primary text
- `familiar` — blue tint
- `strong` — success green
- `mastered` — gold accent
- `weak` — warning amber

---

## Typography

Dual-font strategy: Latin/Vietnamese UI in **Source Sans 3**, Chinese characters in **Noto Sans SC**.

- **Hero / Page titles:** Source Sans 3 Black (900), uppercase, tight tracking. Sizes 30–36px desktop.
- **Section headings:** Source Sans 3 Black 18–24px, uppercase.
- **Body:** Source Sans 3 Regular 14px, line-height 1.6. Secondary color for descriptions.
- **Micro labels:** Source Sans 3 Bold 10–12px, **uppercase**, wide letter-spacing (0.1–0.15em), muted color. Used for stat labels, tab labels, badges.
- **Hanzi display:** Noto Sans SC Black 36–48px. The visual anchor on word cards and practice questions. Always largest element on screen.
- **Pinyin:** Source Sans 3 Bold 18px in primary vermillion. Sits directly below or beside hanzi.
- **Hán Việt:** Source Sans 3 Semibold 14px, italic optional, foreground-secondary.
- **Monospace inputs:** System mono for paste areas (word lists, Hanzi Lab batch input).

**Hierarchy rule:** On any learning screen, the Chinese character is always the visual hero. Vietnamese UI chrome stays quiet and small.

---

## Layout

**Desktop (≥1024px):**
- Fixed sidebar: 240px left, full height, `surface` background, right border.
- Main area: fluid width with `max-width` constraints per page type.
- Page header band: full-width `border-bottom`, generous vertical padding (48px).
- Content sections: 24px horizontal padding, 32px vertical gaps between sections.
- Stat grids: 4 columns on desktop, 2 on tablet, 1 on mobile.

**Mobile (<1024px):**
- Collapse sidebar into bottom tab bar (5–6 items) OR hamburger drawer.
- Bottom nav: Home, Bộ từ, Ôn tập, Hanzi Lab, Tiến bộ.
- Word card tabs: horizontal scrollable pill tabs.
- Practice: full-screen question with large tap targets (min 48px).

**Spacing scale:** 4px base unit. Common values: 4, 8, 12, 16, 24, 32, 48px. Card internal padding: 16px. Section gaps: 32px. Button gaps: 12px.

**Content widths:**
- Narrow (word card, practice): 672px max
- Medium (sets, review): 896px max
- Wide (home, dashboard): 1152px max

---

## Elevation & Depth

**Flat tonal layering — no heavy shadows.**

Depth is achieved through:
1. Background → surface color shift (cream → near-white card)
2. 1px warm borders (`#ddd2c4`)
3. Hover: border shifts to primary vermillion
4. Active nav: filled primary background

Avoid: drop shadows, glassmorphism, gradients, neumorphism. The aesthetic is print-inspired — like pages in a bound notebook.

**Focus states:** 2px primary outline with 2px offset. Visible for keyboard navigation.

---

## Shapes

- **Cards & panels:** `12px` corner radius (`rounded-xl` feel)
- **Sidebar nav items:** `8px` radius
- **Buttons & badges:** `full` pill shape (9999px)
- **Input fields:** `8px` radius
- **Tab indicators:** pill or underline in primary color
- **Progress bars:** `full` radius, 6–8px height

The shape language balances **soft study warmth** (rounded cards) with **decisive actions** (pill buttons). Never mix sharp 0px corners with pills on the same screen.

---

## Components

### Sidebar Navigation
- Wordmark block at top with micro label + Learn**Chinese** lockup
- 6 items: Trang chủ, Bộ từ, Hanzi Lab, Luyện nghe, Ôn tập, Tiến bộ
- Active: filled primary pill. Inactive: secondary text, hover surface-hover bg
- Footer: user name (truncated) + Đăng xuất link
- Admin CMS item (conditional): ink-black active state

### Stat Tile
- Bordered card, 16px padding
- Micro uppercase label (muted)
- Large number (32–36px, black weight)
- Optional action link below in primary color

### Word Set Card
- Title (bold), metadata line (word count · due · weak)
- Hover: border → primary
- Optional progress bar at bottom

### Word Card (5-tab)
- Top: large hanzi (48px) + pinyin (primary) + Hán Việt
- Tab bar: horizontal pills, active = primary fill
- Tab content: bordered card sections with generous whitespace
- SpeakButton: circular icon button, primary border, plays TTS
- Related word chips: secondary bordered pills

### Practice Question Card
- Progress: "Câu 3 / 20" + thin progress bar
- Question prompt (micro label + body text)
- Large hanzi or audio waveform area (centered)
- 4 answer options: full-width bordered cards, tap to select
- OR text input field for typing answers
- Feedback overlay: green border + checkmark (correct) or red + explanation (wrong)
- Session end: summary card with score, weak words list, "Ôn lại" CTA

### SRS Review
- Similar to practice but calmer — "Ôn hôm nay" header with due count
- Completion screen: "Ôn xong!" with celebration (subtle, not confetti overload)

### Hanzi Lab
- Monospace textarea for batch input (max 15 chars)
- Results: character grid with breakdown cards per char
- Radical highlighted in primary, components in muted boxes
- Similar-character group as horizontal chip row

### Dashboard
- Channel accuracy: horizontal bar chart (meaning, pinyin, listening, sentence, radical)
- Top errors: numbered list with word + error type
- Weak words: amber-bordered chips, tappable → word card
- Suggestions: subtle card with actionable tips

### Login
- Centered card on cream background
- App wordmark + subtitle in Vietnamese
- Single "Tiếp tục với Google" button (white bg, border, Google icon)
- No other auth methods

### Empty States
- Friendly Vietnamese copy, not illustrations-heavy
- One clear primary CTA (e.g., "Tạo bộ từ mới")
- Example: "Chưa có bộ từ. Tạo bộ từ sau buổi học để bắt đầu."

### Loading
- Skeleton placeholders matching card shapes (not spinners)
- Warm gray pulse on surface-secondary

---

## Do's and Don'ts

**Do:**
- Keep Chinese characters as the largest, most prominent element on learning screens
- Use primary vermillion for exactly ONE main CTA per screen
- Write all UI chrome in Vietnamese; Chinese only for vocabulary content
- Use uppercase micro-labels for categories, stats, and metadata
- Maintain warm cream backgrounds — the app should feel like quality stationery
- Design mobile bottom nav and responsive word-card tabs
- Ensure WCAG AA contrast (4.5:1 body text, 3:1 large text)
- Use pill buttons for all actions
- Show learning progress visually (badges, bars, counts) without overwhelming

**Don't:**
- Don't use pure white `#ffffff` page backgrounds
- Don't add drop shadows or glass effects
- Don't use multiple accent colors competing with vermillion
- Don't use playful cartoon mascots or excessive gamification
- Don't use English for UI labels (except brand name "Learn Chinese" and "Hanzi Lab")
- Don't make hanzi smaller than supporting text
- Don't use red for errors AND primary actions without clear context differentiation
- Don't design dense data tables — prefer card lists
- Don't copy Duolingo's green or Pleco's orange — this brand is vermillion + cream

## SRS product note

The review system is a **multi-track Leitner box** (5 skill channels per word), not adaptive SRS like Anki/SM-2/FSRS. Scheduling unit is `(word, channel)`. Document this clearly in user-facing copy to set expectations.
