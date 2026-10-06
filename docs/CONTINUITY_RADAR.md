# Continuity Radar (RAD-01)

Open it with **Radar** in the header. It lists where knowledge in the active project could be lost. It is about coverage of knowledge, never about people: no person is named, scored or ranked, and the output carries counts of contributors, not names.

Rules (also shown in the app under "How levels are decided"; source: `core/radar.js`, `RULES`):

| Rule | Medium | High |
|---|---|---|
| Single contributor | An open, approved card has one approved contributor | Same, when the card is a decision or a risk |
| Stale card | No approved activity for 30 days | 90 days |
| Missing evidence | A decision or risk rests on one source | No source is recorded at all |
| Unreviewed decision | Decision tag or "Proposed decision" with no person-recorded decision | not used |
| Thin handover coverage | Fewer than half of the six handover areas have an approved item | Fewer than a third |

Notes:
- Closed cards and drafts are skipped, except for the unreviewed-decision rule, which looks at drafts on purpose.
- Approved activity means the card itself or a shared (approved) update. Draft updates do not refresh a stale card.
- Each risk links to its card and lists the sources and strength behind it.
- Cards in the Harvester staging list are not in the database yet and are not scanned.
