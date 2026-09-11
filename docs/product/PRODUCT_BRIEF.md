# Product Brief — Learn Chinese (Học Hán Ngữ)

## 1. Product purpose

**Learn Chinese** helps Vietnamese adults and students master simplified Mandarin vocabulary by turning class notes and HSK lists into structured word sets, daily SRS review, and practice sessions.

> This product helps **Vietnamese learners of Mandarin** achieve **vocabulary mastery they can hear, read, understand, and use in sentences** by providing **multi-channel SRS and practice in one calm study app**.

## 2. Target users

| Dimension | Description |
|-----------|-------------|
| Who | Vietnamese students and working adults learning simplified Chinese |
| Job | Retain vocabulary from class; pass HSK; communicate in daily life |
| Current tools | Paper notes, Excel, Anki, Pleco, Duolingo |
| Pain | Scattered word lists; no daily habit; confusion between practice and real SRS scheduling |
| Tech comfort | Moderate — comfortable with Google login, mobile web, file import |
| Device | **Mobile-first** for daily 5–15 min SRS; desktop for import and set management |
| Frequency | Daily SRS; weekly set import; occasional focused practice |
| Context | Commute, between classes, before bed — short focused sessions |

## 3. Core problems

1. Vocabulary from class is lost without a structured review system.
2. Learners cannot distinguish **practice** (no schedule impact) from **SRS review** (real scheduling).
3. Multi-skill mastery (meaning, sound, sentence) is hard to track per word.
4. Progress metrics are confusing (due vs weak vs mastered).

## 4. Core jobs-to-be-done

1. **When** I finish a class, **I want** to import new words quickly, **so that** I can start reviewing the same day.
2. **When** I have 10 minutes, **I want** to complete my SRS queue, **so that** I don't fall behind on retention.
3. **When** I want extra drill, **I want** practice or Inferno without breaking my SRS schedule, **so that** I can study more without penalty.
4. **When** I review weekly, **I want** clear reports on weak channels and errors, **so that** I know what to focus on.

## 5. Business goals

- Increase daily SRS completion rate
- Increase activation (first set + SRS enabled within 7 days)
- Increase retention (7-day and 30-day return)
- Reduce confusion support (metric labels, flow clarity)
- Increase feature adoption (Inferno, shared sets)

## 6. Success metrics

| Metric | Target signal |
|--------|---------------|
| SRS completion rate | % of due items reviewed per day |
| Time to first SRS session | Login → first review < 24h after import |
| Activation rate | User with ≥1 SRS-active set within 7 days |
| 7-day retention | Return within 7 days of signup |
| Error rate in sessions | Wrong answers / total (track by channel) |
| Empty-state CTA clicks | Import, enable SRS, start review |
| Feature adoption | Inferno sessions, shared-set duplication per WAU |

## 7. Constraints

- UI language: **Vietnamese** (brand terms: Learn Chinese, SRS, Inferno)
- Chinese content: simplified characters + pinyin + Hán Việt
- Auth: Google OAuth only
- Stack: Next.js 16, React 19, Tailwind 4, no native app (responsive web + PWA)
- SRS model: multi-track Leitner (not SM-2/FSRS) — must be explained in UI copy
- No gamification mascots, neon, or English navigation labels

## 8. Non-goals

- Full course curriculum or grammar lessons
- Social network / chat between learners
- Native iOS/Android apps (Capacitor/React Native)
- Payment / subscription (current scope)
- Writing Chinese characters with stroke order practice
- Live AI tutoring chat

## Gate checklist

Before designing any new screen, confirm:

- [ ] Who is the primary user for this screen?
- [ ] What job does this screen help complete?
- [ ] What is the single primary action?
- [ ] What is explicitly out of scope?
