# Status Card — UX Recommendations and Logic Review

**Scope:** the Status Card experience end to end:

Raw input → PII gate → AI processing → similarity → Smart Append → human review → confidence → provenance → vector mirror → team memory.

**Status:** findings and recommendations only. No code has been changed.
**Date:** 29 Sep 2026 · **Branch:** `feature/relationship-model-v5`

**Files reviewed**

| Area | File |
|---|---|
| Card UI, timeline, confidence, provenance | [TimelineCard.js](../modules/experience-pwa/static/js/components/TimelineCard.js) |
| Data Park, similarity, review queue | [HarvesterPanel.js](../modules/experience-pwa/static/js/components/HarvesterPanel.js) |
| Card approval, sync | [App.js](../modules/experience-pwa/static/js/components/App.js) |
| Key Moments, informational updates | [AppCenter.js](../modules/experience-pwa/static/js/components/AppCenter.js) |
| Local store, Smart Append write | [FailoverDB.js](../modules/experience-pwa/static/js/core/FailoverDB.js) |
| Vector mirror, similarity query | [VectorSync.js](../modules/experience-pwa/static/js/core/VectorSync.js) |
| AI processing, mock mode | [AiClient.js](../modules/experience-pwa/static/js/core/AiClient.js) |
| Confidence formula | [confidence.js](../modules/experience-pwa/static/js/core/confidence.js) |
| PII screening | [PiiGate.js](../modules/experience-pwa/static/js/core/PiiGate.js) |
| Chroma store | [store.py](../modules/vector-service/store.py), [main.py](../modules/vector-service/main.py) |

**Method:** I read the code paths end to end. For the findings marked *verified*, I also ran the real modules in Node and confirmed the behaviour.

---

## Read this first: fix before the demo

These eight items can embarrass the demo in front of judges, or break the promise the product makes ("decision stays with the project, private until shared").

| # | Finding | Why it matters on stage | Ref |
|---|---|---|---|
| 1 | Mock AI tags almost any text as `#Invoice_Resolved` and invents `Amount: $45k, Status: Blocked` | A judge types "weekly report" and gets an invoice card with made-up money | [RA-1](#ra-1), [CF-3](#cf-3) |
| 2 | A *pending, private* Smart Append rewrites the shared card's title and summary straight away | Unreviewed private text is visible to the whole team before review | [SA-1](#sa-1) |
| 3 | Approving an update makes the **whole card** Team Shared, including someone else's private card | Breaks "private until shared" | [SA-2](#sa-2), [HR-1](#hr-1) |
| 4 | The similarity search scans every project and every persona's private cards | Another person's private card title appears as a "match" | [SM-1](#sm-1) |
| 5 | After approval, "Approve Updates & Share" never goes away, and Chroma keeps the card private (*verified*) | The approve flow looks broken; team search misses approved cards | [SA-4](#sa-4), [CH-1](#ch-1) |
| 6 | Confidence counts hashtags and unreviewed appends as evidence, and its sentence cites invented fields (*verified*) | An architect asks "why 82%?" and there is no defensible answer | [CF-1](#cf-1)–[CF-3](#cf-3) |
| 7 | Clicking any provenance link opens an `alert()` that says "(This is test data)" | The trust feature ends in a dead end | [PV-1](#pv-1) |
| 8 | Nodes whose text contains "pending" or "private" are hidden from teammates (*verified*) | "Deploy pending Infosec approval" disappears for everyone except the author | [TL-1](#tl-1) |

---

## A. UX / Experience Improvements

Each recommendation lists the problem, the change, and why it helps judges. Where a UX fix depends on a logic fix, the Section B ID is linked. UX polish on top of wrong numbers makes trust worse, not better.

### A.1 High impact / Low effort

**A1. Rename and explain confidence as "Evidence strength"**
- **Problem:** "Model confidence 82% (Medium)" suggests an ML model. It is actually a count of distinct labels.
- **Change:**
  - Rename it to **Evidence strength**.
  - Replace the sentence with a one-line breakdown: *"2 independent sources (Outlook Mail, Jira) · 1 reviewed update · 0 conflicts."*
  - Keep the percentage secondary, or drop it for High / Medium / Low.
- **Depends on:** [CF-1](#cf-1)–[CF-4](#cf-4).
- **Judges:** leaders get a sentence they can repeat. Architects get a rule they can audit.

**A2. Remove invented text from the card**
- **Problem:** the confidence sentence says "validated via Milestone: Sprint 1, Amount: $45k, Status: Blocked". The fixed hint "Similar to existing RAID log" appears on unrelated cards.
- **Change:** show structured fields only when the source actually contains them. Show a merge hint only when a comparison actually ran. See [CF-3](#cf-3).
- **Judges:** one fabricated number seen on stage undermines every real one.

**A3. Label the AI engine on every card**
- **Problem:** Live AI, silent fallback and mock output look identical on the card.
- **Change:** add a small badge next to the AI pill: `AI · Claude Haiku`, `AI · offline mock` or `AI · fallback (live failed)`. See [RA-2](#ra-2).
- **Judges:** architects will ask whether it is real. A visible "offline mock" badge shows the system is honest, and the failover design becomes a strength.

**A4. Say *why* two items matched, in plain words**
- **Problem:** the review queue shows `ref:FW-REQ-4471 · score 100`, or `3 shared keywords · score 3`, or `vector similarity (dist 0.21) · score 0.88`. These are three scales under one label.
- **Change:** use one sentence and one level:
  - *"Strong match: both mention **FW-REQ-4471**."*
  - *"Possible match: shares 'deploy', 'UAT', 'gateway'."*
  - *"Semantic match: 91% similar meaning."*
- Highlight the shared IDs or words in both snippets. See [SM-4](#sm-4).

**A5. Show a before/after in the Smart Append review**
- **Problem:** the reviewer approves an append without seeing what it will change on the target card.
- **Change:** in the review item, show the **current card title and summary** next to **what this update adds**. Make "Append to this card" and "Create as a new card" two explicit buttons, so the reviewer can overrule the match.
- **Judges:** this makes "human in the loop" visible instead of implied.

**A6. Rename the two approval steps and colour them correctly**
- **Problem:** there are two approvals with similar names:
  - "✅ Approve & Add to Project" in the Harvester
  - "Approve Updates & Share" on the card

  The card button is styled red. The merged banner says "✅ Merged … private / pending-review", which contradicts itself.
- **Change:**
  - **Step 1** (Harvester): **"Add to card (private draft)"**.
  - **Step 2** (card): **"Share update with team"** (blue), plus a **"Discard update"** option. There is no reject path today.
  - **Card states:** `Draft — only you` → `Shared with team ✓`.
- See [SA-5](#sa-5).

**A7. Replace "Similar to client playbook"**
- **Problem:** the purple banner shows on every card with pending appends. No playbook exists.
- **Change:** use **"1 update waiting for your review"** with a "Review" button that scrolls to the staged nodes on *this card*. The Harvester already cleared that item, so don't send the reviewer there.

**A8. Make the RAW / AI pills self-explaining**
- **Change:**
  - Add a two-item legend above the strip: **RAW = what the source said · AI = Continuum's summary**.
  - Put the source icon on RAW pills (✉️ 💬 📊).
  - Show staged pills with a 🔒 and "draft", not just amber.
  - Pair each RAW and AI node from one update visually, e.g. a shared bracket or the same date chip.
  - The AI pill currently shows *all earlier AI text combined* ([TL-4](#tl-4)). Label it "Summary so far", or show only this node's text.

**A9. Open provenance where the reader already is**
- **Change:** a provenance row click should open the existing inline node viewer: RAW text, source, author, date. Remove the `alert()`. See [PV-1](#pv-1).
- **Judges:** "click any claim, see the original words" is the single strongest trust moment in the demo.

**A10. Declutter the footer**
- **Problem:** the footer currently has eight items: author · privacy · Local sync · Vector sync · source icons · confidence · PII · date. Confidence is shown twice.
- **Change:**
  - Keep **author · privacy · evidence strength · date** in the footer.
  - Move sync, vector and PII into the expanded "Details" section.
  - Show one confidence display.

**A11. Real relative times**
- **Problem:** "Just now" and "2h ago" are stored as text and never age. A week-old card still says "Just now" with a green dot.
- **Change:** compute the age from `created_at` / `updated_at` at render time. See [TL-3](#tl-3).

**A12. Remove or relabel "Force Sync"**
- **Problem:** it marks items as synced without contacting any server ([LS-2](#ls-2)).
- **Change:** either wire it to the real vector flush and report its result, or relabel it "Mark as uploaded (demo)". Show the real vector state: `☁️ 2 queued` or `✓ in team memory`.

**A13. Say when cards are hidden**
- **Problem:** the feed silently drops cards with impact below 0.5, shows only 10, and cards between 0.4 and 0.5 appear nowhere ([TL-6](#tl-6)).
- **Change:** add a footer line: *"Showing 10 of 14 · 3 routine updates hidden · Show all."* Rename "Key Moments — Last 5" to "Top 5 by impact". It is sorted by impact, not by time.

### A.2 High impact / Medium effort

**A14. A per-card journey strip**
- **Change:** add a thin 5-step indicator on each card: `Captured → Summarised → Matched → Reviewed → Shared`. The current step is highlighted, and hovering a step shows who did it and when.
- This mirrors the pipeline and the Relationship Model v5 story, so the demo can move from the architecture map to a live card with the same vocabulary.

**A15. Evidence panel that separates independent sources**
- **Change:** in the expanded card, list evidence grouped by **system** (Outlook, Teams, Jira, GDP, RAID). Mark each item Reviewed or Draft, and flag conflicts (e.g. RAID says Open, GDP says Closed). Confidence then reads straight from this panel.
- **Judges:** architects see where the number comes from. Leaders see "three systems agree".

**A16. Accept or reject each pending update**
- **Change:** today all pending appends are approved together and the last one's title wins ([SA-5](#sa-5)). Give each update its own row: `Share` · `Keep private` · `Discard` · `Move to new card`.

**A17. Visible diff when an update changes the card summary**
- **Change:** after an update is shared, show "Summary updated by Walter · see previous", with the old summary one click away. At the moment the approved AI text replaces the card body with no history ([SA-6](#sa-6)).

**A18. Match explainer with highlighted overlap**
- **Change:** show the new text and the matched card side by side, with shared IDs in bold and shared keywords underlined. Show the rule that fired (ID / keywords / semantic) and the threshold. This one view answers "why did it merge?" for both judge audiences.

**A19. One privacy vocabulary**
- **Problem:** the UI and data use "My Notes", "Private", "My Notes (Private)", "Private (Only Me)", "Only me", "🔒 Private" and "Team Shared".
- **Change:** pick two labels, e.g. **Only me** and **Team**. Use them everywhere, including the review queue, footer, banners and filters.

**A20. Guided demo path on the seed data**
- **Change:** add a "Demo walkthrough" button that stages one prepared fragment. For example, a Teams message mentioning FW-REQ-4471. The walkthrough then steps through: match → review with before/after → share → evidence strength goes up → click provenance → original text.
- This gives both judge audiences a scripted, reliable path that fails safe if the AI is offline.

### A.3 Nice to have

- **A21.** Evidence strength drops over time when no new source confirms the card, e.g. "last confirmed 9 days ago".
- **A22.** A contradiction indicator when two sources disagree on status. It is high value, but needs parsing.
- **A23.** The informational-updates rows use 7px text ([AppCenter.js:207](../modules/experience-pwa/static/js/components/AppCenter.js#L207)). Use at least 11px.
- **A24.** Show avatars per contributor on the timeline strip, so "who knew what" can be scanned.
- **A25.** A hover card on the Smart Append pill: "Proposed by Walter · matched on FW-REQ-4471 · waiting 2 days".
- **A26.** Keyboard and screen-reader labels for the pills (currently a `title` only) and the ⋯ menu.
- **A27.** Replace the default names ("Walter", "Onion AI", "System", "Brené") with "Unknown author" wherever the real author is missing. See [PV-5](#pv-5).

### A.4 What each judge audience should come away with

| Audience | What they need to see on the card | Recommendations |
|---|---|---|
| **Leaders** | "The decision and its context stay with the project." Who said what, when, from which system, who approved sharing. | A1, A5, A6, A9, A14, A20 |
| **Architects** | Deterministic rules, honest failure modes, auditable numbers: why it matched, why this confidence, what is AI and what is source, what happens offline. | A2, A3, A4, A12, A15, A18 |

---

## B. Logic / Implementation Observations

**Severity**
- **Critical:** privacy breach, invented data, or permanent data loss.
- **High:** a visible wrong result, or a promise the UI makes that the code breaks.
- **Medium:** an edge case or inconsistency that shows up in normal use.
- **Low:** a latent risk or tidy-up.

**Type:** Bug · Edge case · Hidden assumption · Confusing · Trust risk · Design mismatch.

### B.1 Smart Append behaviour

<a id="sa-1"></a>**SA-1 · Critical · Trust risk / Design mismatch: a pending append rewrites the shared card before review**
- **Where:** [FailoverDB.js:420-421](../modules/experience-pwa/static/js/core/FailoverDB.js#L420-L421)
- **What happens:** `smartAppendToCard` sets `target.title = meta.title` and `target.synthesizedText = meta.synthesizedText` at staging time. The nodes are marked private / pending review, but the card's headline and summary change immediately for every viewer.
- **Scenario:** Walter's private update matches Malcolm's Team Shared "Sprint 14 burndown" card. Before anyone approves, every persona sees the card retitled with the first 80 characters of Walter's raw text.
- **Recommend:** keep the proposed title and summary inside `pendingAppends[]`. Apply them only when the update is shared.

<a id="sa-2"></a>**SA-2 · Critical · Trust risk: approving forces the whole card to Team Shared**
- **Where:** [App.js:147-152](../modules/experience-pwa/static/js/components/App.js#L147-L152)
- **What happens:** `handleApproveCard` sets `privacy='Team Shared'`, `is_private=false` and `piiStatus='Approved'` on the parent card. It does this whatever the card's original privacy was and whoever owns it.
- **Scenario:** Walter appends to Daniel's private "PO extension draft". [HR-1](#hr-1) makes Walter count as an owner, so Walter sees "Approve Updates & Share", clicks it, and Daniel's private draft is now shared with the team.
- **Recommend:** approval should change only the appended nodes. The parent's privacy should change only through an explicit owner action by the original author.

<a id="sa-3"></a>**SA-3 · High · Bug: a failed append is counted as a success**
- **Where:** [HarvesterPanel.js:625](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L625)
- **What happens:** `appendSuccess = true` is set whatever `smartAppendToCard` returns. It returns `null` when the target id is not in local storage. That happens when the vector match points to a card deleted locally but still in Chroma, or one from another device.
- **Result:** the message says "merged 1 update", no append happened, and the staged row stays `pending_processing` forever.
- **Recommend:** check the return value, and fall back to creating a new card.

<a id="sa-4"></a>**SA-4 · High · Bug (verified): approval never clears the private markers on nodes**
- **Where:**
  - [FailoverDB.js:394](../modules/experience-pwa/static/js/core/FailoverDB.js#L394) writes `is_private: true, isPrivate: true, appendPrivacy`.
  - `handleApproveCard` only flips `stagedAppend`.
  - [TimelineCard.js:676](../modules/experience-pwa/static/js/components/TimelineCard.js#L676) shows the Approve button whenever `/private/i` matches the nodes' JSON. The key name `is_private` always matches.
- **Result:** after approval, "Approve Updates & Share" stays on the card permanently. The same regex in the vector mirror keeps the card private in Chroma ([CH-1](#ch-1)).
- **Recommend:** use explicit boolean fields, never regexes over serialised JSON, and reset them on approval.

<a id="sa-5"></a>**SA-5 · Medium · Design mismatch: no per-update decision and no reject**
- **What happens:** approval clears every `pendingAppends` entry at once and takes the title from the *last* entry ([App.js:110-146](../modules/experience-pwa/static/js/components/App.js#L110-L146)). A wrong match can't be rejected, only deleted together with the whole card.
- **Recommend:** approve or reject each entry by `stagedId`.

<a id="sa-6"></a>**SA-6 · Medium · Trust risk: approval replaces the card body with AI text**
- **What happens:** `card.content`, `card.detail` and `card.synthesizedText` are all set to the latest AI node's text ([App.js:137-141](../modules/experience-pwa/static/js/components/App.js#L137-L141)). The card's original raw body is overwritten. It survives only as a node, if one exists.
- **Recommend:** keep `content` as the original source text. Update only `synthesizedText`, and keep the previous summary.

<a id="sa-7"></a>**SA-7 · Medium · Confusing: two approval implementations**
- **What happens:** `FailoverDB.approveStaged` resets node privacy to Team Shared and does not mirror to Chroma. `App.handleApproveCard` shares the whole card and does mirror. Only the second is wired up.
- **Recommend:** keep one function with one set of rules.

<a id="sa-8"></a>**SA-8 · Medium · Edge case: idempotency matches on the first 200 characters**
- **Where:** [FailoverDB.js:346-360](../modules/experience-pwa/static/js/core/FailoverDB.js#L346-L360)
- **What happens:** an update whose first 200 characters equal any existing node is silently dropped. Examples are emails with the same long subject line, or RAID rows with the same prefix. The drop also removes the staged row.
- **Recommend:** use the content hash already computed in the Harvester (`contentHash`) instead of a prefix.

<a id="sa-9"></a>**SA-9 · Medium · Bug: skipped duplicates stay staged forever**
- **Where:** [HarvesterPanel.js:510](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L510)
- **What happens:** on `isDup` the loop does `continue` without removing the `pending_processing` row. STAGED(N) never reaches zero, and later items overwrite the "Duplicate skipped" message.
- **Recommend:** remove or mark the row, and report the duplicate count at the end.

<a id="sa-10"></a>**SA-10 · Medium · Bug: AI processing picks up other projects' staged items**
- **Where:** [HarvesterPanel.js:423](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L423)
- **What happens:** when the active project has nothing staged, it processes *all* pending items. Their review cards are then built with the current project's context, and the matcher may append them into the wrong project.
- **Recommend:** process only the active project's items, and say so when none are staged.

<a id="sa-11"></a>**SA-11 · Low · Confusing: contradictory flags on staged nodes**
- **What happens:** every staged node gets `is_private: true`, even when `privacy` is `'Team Shared'` (a shared target). Different readers therefore reach different conclusions.

### B.2 Similarity matching

<a id="sm-1"></a>**SM-1 · Critical · Trust risk: the matcher ignores project and privacy scope**
- **Where:** [HarvesterPanel.js:69](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L69)
- **What happens:** `findSmartAppendMatch` reads every timeline card from local storage: all projects, and all personas' private cards.
- **Scenario:** a new fragment mentions an ID that so far appears only in Daniel's private draft.
  1. Walter's review queue shows "Smart Append match → 'Private note — PO extension draft'", which leaks the title.
  2. On approval, the append makes Walter a participant, and [HR-1](#hr-1) then shows him Daniel's whole private card.
- **Recommend:** filter candidates to the active project and to cards the active persona is allowed to see, before scoring.

<a id="sm-2"></a>**SM-2 · High · Design mismatch: the threshold is so loose that almost everything becomes an append**
- **Where:** [HarvesterPanel.js:110-113](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L110-L113)
- **What happens:** any two shared non-stop-words (longer than two characters) produce a match. In the Apollo seed, words like "apollo", "sprint", "deploy", "blocked" and "fw-req-4471" are on most cards. So nearly every new input is appended to *some* card instead of becoming a new one.
- **Consequences:**
  - The vector path (the documented similarity ≥ 0.85 gate) only runs when this heuristic finds nothing, so Chroma is rarely consulted.
  - The comment "force contextual overlaps to append" states this intent, but it contradicts the "human review of similarity" story.
- **Recommend:**
  - Require an ID match, *or* a title hit plus at least 3 non-project-specific tokens.
  - Drop the project name and client tokens from the overlap count.
  - Let the vector score decide borderline cases.

<a id="sm-3"></a>**SM-3 · Medium · Edge case: the first ID hit wins, and generic IDs count as strong**
- **What happens:**
  - A high-value ID match `break`s on the *first* card in storage order ([HarvesterPanel.js:90-92](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L90-L92)). Storage order is newest-staged first. `PO-88921` is on six seed cards, so which one receives the update is arbitrary.
  - `MS\d` (e.g. MS3) and `R-\d{1,4}` are treated as high-value although they repeat across many cards.
- **Recommend:** among ID matches, pick by a secondary score (token overlap, then recency), and treat milestone codes as generic.

<a id="sm-4"></a>**SM-4 · Medium · Confusing: three incompatible "score" scales**
- **What happens:** the same `score` label shows:
  - `100` for an ID match
  - `2`–`20` for token overlap
  - `0.50`–`0.95` for vector similarity, from `vectorScoreForDistance`

  That last formula is not the similarity used for the 0.85 gate ([VectorSync.js:149](../modules/experience-pwa/static/js/core/VectorSync.js#L149) vs [VectorSync.js:167](../modules/experience-pwa/static/js/core/VectorSync.js#L167)).
- **Recommend:** normalise to one 0–1 match strength plus a named rule. See A4.

<a id="sm-5"></a>**SM-5 · Medium · Hidden assumption: distance-to-similarity mapping**
- **What happens:** `similarity = 1 − distance/2` treats Chroma's distance as if it ranged from 0 to 2. The collection is created with no `hnsw:space` ([store.py:43](../modules/vector-service/store.py#L43)), so Chroma uses squared L2. For Chroma's default embedding, which produces normalised vectors, squared L2 = 2(1 − cos), so the formula gives exactly cosine similarity. It is correct by coincidence.
- **Risk:** if someone sets `hnsw:space: cosine` or changes the embedding model, the 0.85 gate silently becomes much looser. Under cosine space it becomes the equivalent of cos ≥ 0.70.
- **Also:** the comment at [VectorSync.js:132](../modules/experience-pwa/static/js/core/VectorSync.js#L132) still describes the old "≤ 1.2" rule.
- **Recommend:** pin the space explicitly, and document the mapping next to it.

<a id="sm-6"></a>**SM-6 · Medium · Edge case: vector matching looks only at the top hit, which may be a note**
- **What happens:** notes and timeline cards share one Chroma collection. The top hit can be a note, which `smartAppendToCard` will happily append into.
- **Recommend:** filter by type, or take the best timeline-card hit among the top K.

<a id="sm-7"></a>**SM-7 · Medium · Bug (verified): the PII gate deletes the IDs that matching relies on**
- **Where:** [PiiGate.js:5](../modules/experience-pwa/static/js/core/PiiGate.js#L5)
- **What happens:** the phone regex matches any 10-digit number. `IDs 987987 / 0000606071` becomes `IDs 987987 / [PHONE_REDACTED]` and the item is flagged `Redacted_Review`. Screening runs *before* matching, so these project IDs can no longer link cards.
- **Recommend:** protect known ID formats before the phone pattern runs, or require phone-style separators.

### B.3 Confidence calculation

<a id="cf-1"></a>**CF-1 · High · Trust risk (verified): hashtags and duplicate labels count as independent sources**
- **Where:** [TimelineCard.js:306](../modules/experience-pwa/static/js/components/TimelineCard.js#L306) and [TimelineCard.js:555-560](../modules/experience-pwa/static/js/components/TimelineCard.js#L555-L560)
- **What happens:** evidence is `sourceListFor(m)` = source + type + tags. A seed email card has three "origins": `Outlook Mail`, `Email` and `#Risk_Watch`. That is one message and one AI tag, and it scores **82%**. Mock AI always adds `#Auto_Tagged`, which is worth +8 points for nothing.
- **Recommend:** count distinct source systems from RAW nodes only. Tags are not evidence.

<a id="cf-2"></a>**CF-2 · High · Trust risk: unreviewed and AI-generated nodes raise confidence**
- **What happens:** `sourceRowCount = nodes.length + pendingAppends.length`. The following all add points:
  - AI summary nodes
  - private draft nodes
  - the pending-append metadata entries themselves

  Staging junk onto a card makes it look *more* trustworthy.
- **Recommend:** count only reviewed RAW nodes.

<a id="cf-3"></a>**CF-3 · Critical · Trust risk: the confidence sentence cites invented fields**
- **Where:**
  - [AiClient.js:193-195](../modules/experience-pwa/static/js/core/AiClient.js#L193-L195) injects `structured: {Milestone:'Sprint 1', Amount:'$45k', Status:'Blocked'}` whenever the AI returns none. That is always the case on the live path, because the prompt never asks for it.
  - The mock also sets it ([AiClient.js:30-32](../modules/experience-pwa/static/js/core/AiClient.js#L30-L32)).
  - `buildConfidenceText` renders it as "validated via Milestone: Sprint 1, Amount: $45k…".
  - `mergeHint` ("Similar to existing RAID log — details overlap") comes from a keyword regex ([AiClient.js:187-191](../modules/experience-pwa/static/js/core/AiClient.js#L187-L191)), not from any comparison.
- **Recommend:** never default `structured` or `mergeHint`. If they are missing, omit them.

<a id="cf-4"></a>**CF-4 · Medium · Confusing (verified): "Low" can never appear**
- **Where:** [confidence.js:16-19](../modules/experience-pwa/static/js/core/confidence.js#L16-L19)
- **What happens:** the base is 55 and one origin adds 8. The minimum possible score is therefore **63% (Medium)**, for a single unverified source, and the "Low" tier (below 60) is unreachable.
- **Recommend:** start low, e.g. one source = Low, two independent systems = Medium, three or more = High, and reduce the score for conflicts.

<a id="cf-5"></a>**CF-5 · Medium · Confusing: "Model confidence", shown twice**
- **What happens:** it isn't a model output. It appears in both the footer and the grey box.
- **Recommend:** see A1 and A10.

<a id="cf-6"></a>**CF-6 · Low · Design mismatch: confidence is computed at render time, not in the pipeline**
- **What happens:** it is recalculated on every render and never stored. It can't be shown in history ("confidence went from Medium to High when Jira confirmed"), and Chroma or Handover never see it.

### B.4 Provenance generation

<a id="pv-1"></a>**PV-1 · High · Trust risk: provenance links go nowhere**
- **Where:** [TimelineCard.js:497](../modules/experience-pwa/static/js/components/TimelineCard.js#L497)
- **What happens:** every source chip and provenance row calls `alert('…the definition of Human in the loop! (This is test data)')`.
- **Recommend:** open the node viewer that already exists (A9).

<a id="pv-2"></a>**PV-2 · High · Bug: appended nodes lose their own source**
- **What happens:** `pushNode` doesn't store `source` on the node ([FailoverDB.js:389-398](../modules/experience-pwa/static/js/core/FailoverDB.js#L389-L398)). Provenance then falls back to the *card's* source ([TimelineCard.js:322](../modules/experience-pwa/static/js/components/TimelineCard.js#L322)). A Teams update appended to an email card is listed as "Outlook Mail — RAW".
- The real source is kept only in `pendingAppends[].source`, which approval clears. After approval, the true origin is gone for good.
- **Recommend:** store `source`, `sourceId` and `contentHash` on every RAW node.

<a id="pv-3"></a>**PV-3 · Medium · Confusing: AI nodes are counted as provenance links**
- **What happens:** "Full Provenance — 2 link(s)" for a card with one source, because the AI node is counted too. The AI summary is derived content, not provenance.
- **Recommend:** list RAW nodes as sources. Show AI nodes as "summaries of" those sources.

<a id="pv-4"></a>**PV-4 · Medium · Bug / Trust risk: edits are unaudited, and often invisible**
- **Where:** [TimelineCard.js:446-459](../modules/experience-pwa/static/js/components/TimelineCard.js#L446-L459)
- **What happens:**
  - "Edit Details" overwrites `content` and `detail`, and sets `title` to the first 80 characters of the new body.
  - No edit node or history is recorded.
  - The card body renders `synthesizedText` first ([TimelineCard.js:643](../modules/experience-pwa/static/js/components/TimelineCard.js#L643)). So on any AI-processed card the edit doesn't appear to change anything, while the title *does* change.
- **Recommend:** make each edit a new `EDIT` node (author and time), update the field that is displayed, and don't derive the title from the body.

<a id="pv-5"></a>**PV-5 · Low · Trust risk: fallback identities misattribute content**
- **What happens:** missing authors become:
  - "System" or "Brené" in the UI
  - "Onion AI" or "AI" on AI nodes
  - "Walter" in the vector payload ([VectorSync.js:40](../modules/experience-pwa/static/js/core/VectorSync.js#L40)) and in Chroma metadata ([store.py:60](../modules/vector-service/store.py#L60))

  Missing client and project become "Acme Corp" and "Apollo-123". A NovaTech card missing those fields would be filed under Apollo.
- **Recommend:** use explicit `Unknown`, and reject the ingest when there is no project.

### B.5 Timeline behaviour

<a id="tl-1"></a>**TL-1 · High · Bug (verified): the words "pending" or "private" hide a node from the team**
- **Where:** [TimelineCard.js:226](../modules/experience-pwa/static/js/components/TimelineCard.js#L226)
- **What happens:** a node is treated as private when `/private/i` or `/pending/i` matches its serialised JSON, *including its text*. Status updates such as "deploy pending Infosec approval" or "private cloud cut-over" are hidden from everyone except the owner.
- **Recommend:** decide only from the `stagedAppend` / privacy fields.

<a id="tl-2"></a>**TL-2 · Medium · Bug: appended nodes carry invalid dates**
- **Where:** [HarvesterPanel.js:620-621](../modules/experience-pwa/static/js/components/HarvesterPanel.js#L620-L621)
- **What happens:**
  - Appended RAW and AI nodes get `at: card.timestamp`, i.e. "Just now" or "2h ago".
  - `miniTimelineFor` prefers `at` over the valid ISO `appended_at`.
  - The sort then compares `NaN`, so the order is undefined and can differ between Safari and Chrome.
  - The pill date shows "Just now" forever.
- **Recommend:** always write ISO `at`, and keep the display string separate.

<a id="tl-3"></a>**TL-3 · Medium · Bug (verified): stored relative times, and the age colour is wrong**
- **What happens:** `timestamp: 'Just now'` is saved and never recomputed. `ageDotColor('12d ago')` returns **green**, because it contains the substring "2d ago". Unknown formats also default to green.
- **Recommend:** derive age from dates at render time.

<a id="tl-4"></a>**TL-4 · Medium · Confusing: the AI pill shows combined text**
- **What happens:** `getCumulativeAiText` joins every earlier AI node, but the viewer title says "AI Node Content". The reader can't tell which update said what.
- **Recommend:** see A8.

<a id="tl-5"></a>**TL-5 · Medium · Trust risk: informational rows show draft nodes to everyone**
- **Where:** [AppCenter.js:170-212](../modules/experience-pwa/static/js/components/AppCenter.js#L170-L212)
- **What happens:** low-impact cards list **all** `nodes[]` without the staged/private filter the Status Card uses. A private draft appended to a shared low-impact card is visible to every persona there.
- **Recommend:** share one node-visibility function between both views.

<a id="tl-6"></a>**TL-6 · Medium · Confusing: cards disappear without notice**
- **What happens:**
  - The feed hides impact below 0.5 and caps at 10 ([TimelineCard.js:577](../modules/experience-pwa/static/js/components/TimelineCard.js#L577)).
  - Informational updates only take impact below 0.4.
  - Cards scored 0.40–0.49, which is common with a live model, appear **nowhere**.
  - "Key Moments — Last 5" is sorted by impact, not recency.
  - Mock AI scores any text without its keywords at 0.35, so those inputs only ever appear in the collapsed informational list.
- **Recommend:** use one threshold, and show a visible hidden-count (A13).

<a id="tl-7"></a>**TL-7 · Low · Edge case: the sort comparator is inconsistent**
- **What happens:** `return a.kind === 'RAW' ? -1 : 1` returns 1 for two nodes of the same kind, whichever order they are compared in. The result depends on the engine.

### B.6 RAW vs AI node behaviour

<a id="ra-1"></a>**RA-1 · Critical · Trust risk (verified): mock AI invents business facts**
- **Where:** [AiClient.js:8-33](../modules/experience-pwa/static/js/core/AiClient.js#L8-L33)
- **What happens:** `/po|invoice|…/` is a substring test, so "re**po**rt", "sup**po**rt" and "op**po**rtunity" all match. Any such text gets:
  - impact 0.9
  - tag `#Invoice_Resolved`, which asserts a resolution nobody stated
  - `Amount: $45k, Status: Blocked`
  - "Similar to existing RAID log"
- **Scenario:** a judge pastes "Weekly report: team offsite planning" and gets an invoice card with money.
- **Recommend:**
  - Use word-boundary regexes.
  - Use neutral mock tags (`#Mock_Tagged`).
  - Never invent `structured` values.
  - Make the mock summary visibly templated, e.g. "(offline summary) …".

<a id="ra-2"></a>**RA-2 · High · Trust risk: the AI engine isn't recorded**
- **What happens:**
  - No key → mock, with no marker.
  - OpenRouter failure → mock plus `#Mock_Fallback`.
  - Anthropic failure → OpenRouter → mock, with no marker.

  The card has no `aiEngine` field. The Live/Mock indicator exists only inside the Harvester settings panel.
- **Recommend:** store `aiEngine`, `model` and `fallbackReason` on the card, and show them (A3).

<a id="ra-3"></a>**RA-3 · Medium · Confusing: "AI" nodes that no AI produced**
- **What happens:**
  - Mock `synthesizedText` is the raw text cut to 220 characters, so the AI node repeats the RAW node.
  - `ensureTimelineNodes` builds an AI node from `content` when no summary exists ([FailoverDB.js:34-39](../modules/experience-pwa/static/js/core/FailoverDB.js#L34-L39)).

  Either way, the "AI" pill shows unprocessed text.
- **Recommend:** create an AI node only when a summary was actually produced.

<a id="ra-4"></a>**RA-4 · Medium · Design mismatch: the approved card body becomes AI-only**
- See [SA-6](#sa-6). After sharing, the card headline area shows AI text, and the original words are one level deeper.

<a id="ra-5"></a>**RA-5 · Low · Security (hidden assumption): API keys in localStorage**
- **What happens:** OpenRouter and Anthropic keys are stored in `localStorage`, and the Anthropic call uses `anthropic-dangerous-direct-browser-access`. That's acceptable for a local demo. Say so explicitly if architects ask, and plan a server-side proxy.

### B.7 Chroma interaction

<a id="ch-1"></a>**CH-1 · High · Bug (verified): shared cards stay private in Chroma**
- **Where:** [VectorSync.js:35-36](../modules/experience-pwa/static/js/core/VectorSync.js#L35-L36)
- **What happens:** `toVectorPayload` marks the whole card `Private` when `/private/i` matches `JSON.stringify(nodes, pendingAppends)`. Staged nodes contain the key names `is_private` / `isPrivate` and `appendPrivacy: 'My Notes (Private)'`, and approval never removes them ([SA-4](#sa-4)).
- **Result:** every card that ever received a Smart Append stays `is_private=True` in Chroma permanently. Other personas' semantic search and merge candidates never see it, which quietly defeats "team memory".
- The same regex also matches the *word* "private" in node text.
- **Recommend:** compute `is_private` from the card's own privacy field. Exclude draft nodes from the embedded document instead of making the whole card private.

<a id="ch-2"></a>**CH-2 · Medium · Bug: "Vector ✅" after an edit that hasn't synced**
- **Where:** [FailoverDB.js:18](../modules/experience-pwa/static/js/core/FailoverDB.js#L18)
- **What happens:** `stampVectorPending` only sets `pending` when the field is empty. Once a card has been `synced`, later edits never go back to pending. The footer shows ✅ while the upsert sits in the offline queue.
- **Recommend:** always set `pending` on write.

<a id="ch-3"></a>**CH-3 · Medium · Design mismatch: appended updates aren't embedded**
- **What happens:** the Chroma document is `Title + content + source` ([store.py:47-50](../modules/vector-service/store.py#L47-L50)). Node texts are not included. After three appended updates, semantic search still only knows the card's first text.
- **Recommend:** embed the reviewed RAW node texts, within a size budget.

<a id="ch-4"></a>**CH-4 · Medium · Hidden assumption: project scope by display name**
- **What happens:** the vector filter uses `project = project_name` ("Apollo-123"), not the immutable `Project_ReferenceID`. A rename, or two projects with the same name, merges their memory.
- **Recommend:** filter on `Project_ReferenceID`.

<a id="ch-5"></a>**CH-5 · Low · Edge case: the delete fallback may silently no-op**
- **What happens:** `postDelete` sends a DELETE with a body, then falls back to POST. `deleteCard` fires the vector delete even when nothing was found locally. It is harmless, but the queue fills with no-op entries.

### B.8 Local storage interaction

<a id="ls-1"></a>**LS-1 · Critical · Bug: one corrupt read leads to silent total data loss**
- **Where:** [FailoverDB.js:63-69](../modules/experience-pwa/static/js/core/FailoverDB.js#L63-L69) and [FailoverDB.js:104](../modules/experience-pwa/static/js/core/FailoverDB.js#L104)
- **What happens:**
  - If `JSON.parse` fails, `readLocal` returns an empty state, and the next write overwrites the stored blob with it.
  - Quota errors in `writeLocal` are swallowed, so the UI still says "Saved locally".
- **Recommend:**
  - On a parse failure, back up the raw string to a recovery key and refuse to overwrite it.
  - Surface quota errors to the user.

<a id="ls-2"></a>**LS-2 · High · Trust risk: "Force Sync" syncs nothing**
- **What happens:**
  - `forceSync()` flips `pending_upload` to `synced` without any network call ([FailoverDB.js:133-141](../modules/experience-pwa/static/js/core/FailoverDB.js#L133-L141)). The button tooltip admits it ("Flip pending_upload to synced").
  - `handleSyncCard` sets `synced` even when the vector push failed and was queued ([App.js:185](../modules/experience-pwa/static/js/components/App.js#L185)).
- **Recommend:** see A12.

<a id="ls-3"></a>**LS-3 · Medium · Edge case: no multi-tab safety**
- **What happens:** there is no `storage` event listener, so two open tabs overwrite each other's writes (last writer wins). `markQueueMirrored` separately read-modify-writes the same key.
- **Recommend:** listen for `storage`, and re-read before each write.

<a id="ls-4"></a>**LS-4 · Medium · Edge case: the review queue is lost on refresh**
- **What happens:** processed review items live only in React state. `onion_review_queue` is written on a privacy toggle but never read back. After a refresh, the items are still `pending_processing`, and running AI again can produce a different result.
- **Recommend:** persist the queue and restore it on load.

<a id="ls-5"></a>**LS-5 · Low · Confusing: hidden rewrites on every read**
- **What happens:** `readLocal` silently turns `processed` into `pending_upload` and writes back. Legacy keys are read but never cleaned up. Storage is capped at about 5 MB, while nodes grow without limit.

### B.9 Human review and privacy (cross-cutting)

<a id="hr-1"></a>**HR-1 · Critical · Trust risk: contributing to a card grants ownership rights**
- **Where:** [TimelineCard.js:537-542](../modules/experience-pwa/static/js/components/TimelineCard.js#L537-L542), [TimelineCard.js:656-667](../modules/experience-pwa/static/js/components/TimelineCard.js#L656-L667), [TimelineCard.js:732-733](../modules/experience-pwa/static/js/components/TimelineCard.js#L732-L733), [App.js:368-384](../modules/experience-pwa/static/js/components/App.js#L368-L384)
- **What happens:** anyone with one node or pending append on a card is treated as an owner. They can then:
  - see a private card
  - edit its body
  - delete it
  - approve and share it
- **Combined with:** [SM-1](#sm-1) (matching into private cards) and [SA-2](#sa-2) (approval shares the whole card), this gives one user a full path to expose another user's private note.
- **Recommend:** separate **owner** (the card author) from **contributor** (who appended). Contributors can see and act on *their own nodes* only.

<a id="hr-2"></a>**HR-2 · Medium · Confusing: "Approved for Team Share" on private cards**
- **What happens:** the green disabled badge shows whenever `piiStatus` is Clean ([TimelineCard.js:677](../modules/experience-pwa/static/js/components/TimelineCard.js#L677)), including on "🔒 Private" cards.
- **Recommend:** tie the label to privacy, not to the PII status.

<a id="hr-3"></a>**HR-3 · Medium · Confusing: what the PII gate reports doesn't match what it does**
- **What happens:**
  - The header comment says emails are redacted, but they are kept by design ([PiiGate.js:18](../modules/experience-pwa/static/js/core/PiiGate.js#L18)).
  - Words such as "lunch", "hotel" and "weekend" are replaced with `[NOISE_FILTERED]` and flagged `Redacted_Review`, which appears as "PII: Redacted_Review".
  - 10-digit IDs are redacted as phone numbers ([SM-7](#sm-7)).
- **Recommend:** keep "noise filtered" separate from "PII redacted", and fix the header comment.

### B.10 Where the implementation does not match the intended design

| Intended (pipeline and product story) | What the code does today | Ref |
|---|---|---|
| Human review comes **before** team memory | Pending private text rewrites the shared card title and summary at staging | SA-1 |
| Private until the author shares | Approval shares the whole parent card; contributors act as owners | SA-2, HR-1 |
| Project Anchor scopes everything | The matcher scans all projects; processing picks up other projects' staged items; Chroma scopes by display name | SM-1, SA-10, CH-4 |
| Similarity ≥ 0.85 (semantic) decides merges | A two-keyword string heuristic decides first; vector is a rare fallback | SM-2 |
| Confidence from cross-referenced source evidence | Counts tags, AI nodes and unreviewed appends; cites invented fields; floor 63% | CF-1–CF-4 |
| Provenance traceable to the original source | Links open an alert; appended nodes inherit the wrong source; true source dropped on approval | PV-1, PV-2 |
| RAW = source, AI = derived summary | Mock "AI" repeats RAW; approval replaces RAW body with AI text | RA-3, SA-6 |
| Vector mirror reflects local truth | Appended-to cards stay private in Chroma; ✅ after unsynced edits; updates not embedded | CH-1–CH-3 |
| Offline and mock mode are transparent | Engine not recorded; mock invents facts | RA-1, RA-2 |
| Pipeline order: RAW → AI → Similarity → Smart Append → Confidence → Provenance → Human Review → Team Memory | Actual order: RAW → PII → AI → Similarity → **review #1** (Harvester) → Smart Append write (headline rewritten) → Chroma (as private) → **review #2** (card) → shared. Confidence and provenance are recomputed at render time, not produced by the pipeline. | Section B.1–B.4 |

---

## Suggested order of work

1. **Stop invented data:** RA-1, CF-3. Small and contained to `AiClient.js`, with the biggest effect on judges.
2. **Close the privacy chain:** SM-1 → HR-1 → SA-2 → SA-1, in that order, because each one limits the next.
3. **Make approval behave:** SA-4, CH-1, SA-3, then A6 wording.
4. **Make confidence defensible:** CF-1, CF-2, CF-4, then A1 wording.
5. **Make provenance real:** PV-1, PV-2, then A9.
6. **Timeline correctness:** TL-1, TL-2, TL-3, TL-5.
7. **Durability:** LS-1, LS-2, CH-2.
8. **Medium-effort UX:** A14–A20.

Items 1–5 are mostly local fixes to existing functions and need no redesign.
