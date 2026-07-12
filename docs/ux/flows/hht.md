# User Flow — HHT Mode

## Entry points

- Sidebar "HHT Mode"
- Bottom nav "HHT Mode"

## User goal

Practice MCQ questions across all SRS-active vocabulary sets without changing SRS schedule. Words answered correctly appear less often over time; wrong answers keep the same selection weight. Sets are rotated fairly so no single set dominates.

## Preconditions

- User logged in
- Minimum `HHT_MIN_ENROLLED` (10) words in SRS-active sets
- Words have enough data for at least one MCQ type (meaning, sound, or sentence)

## Main path

1. Navigate to `/hht`
2. Focus mode activated (no mobile bottom nav)
3. Briefing shows enrolled word count and active set count
4. Gate check if below minimum enrolled words
5. Load session via `GET /api/hht`
6. Answer MCQ-only questions via `QuestionRenderer`
7. Submit incrementally via `POST /api/hht/submit`
8. Session continues with prefetch batches
9. Session summary on exit or completion

## Question types

Only MCQ:

- `hanzi_to_meaning`
- `meaning_to_hanzi`
- `sound_to_hanzi`
- `fill_sentence`

## Weight behavior

- Correct answer: `selectionWeight *= HHT_WEIGHT_DECAY` (floor `HHT_MIN_WEIGHT`)
- Wrong answer: weight unchanged
- Set-fair pick: round-robin across SRS-active sets, weighted random within set
- Answers logged with `source: hht` — no SRS schedule change

## Alternative paths

| Path | Trigger | Behavior |
|------|---------|----------|
| Gate blocked | &lt; 10 SRS words | Progress bar + link to sets |
| Exit mid-session | Dừng | Save partial progress + summary |
| Empty pool | No MCQ-eligible words | EmptyState + link sets |

## Error paths

| State | UX |
|-------|-----|
| Loading | Spinner |
| Unauthenticated | Redirect `/login` |
| API error | Retry via reload |

## Exit points

- `/sets`
- `/` home
- `/review` (SRS due queue)

## Success signal

- Session summary with score %
- `CnAnswerLog` rows with `source: hht`
- `CnHhtProgress` weights updated per word
