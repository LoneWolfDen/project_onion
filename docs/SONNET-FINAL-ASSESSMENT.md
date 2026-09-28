# FINAL ASSESSMENT - Sonnet Cross-Reference + Your Clarifications

## Validation of Sonnet's Cross-Reference (I checked live code + old HTML)

### Confirmed Claims - Sonnet is CORRECT:

**Backlog #2 - Confidence always 63% - CONFIRMED REAL BUG**
TimelineCard.js:269 `calcConfidence([{origin: m.source||m.type||'Timeline'}], 1)` always 1 origin + sourceRowCount=1 → confidence.js: 55 + min(1*8,32) + min(0*3,9) = 63 every card. Not hardcoded literal, but inputs never vary. 
**My assessment:** This is why you saw 63% static after yesterday's fix - we fixed display but not inputs. Fix: pass real evidence: distinct chips/sources count + node count + provenance length. Complexity LOW (just change 1 line to pass `m.nodes.length`, `m.provenance.length`, distinct sources). Will make cards show different % like 71%, 84%, 92% etc.

**Backlog #7 - Model confidence detailed sentence missing - CONFIRMED DEAD CODE**
confText line 338 and structEntries line 334 are computed but NEVER referenced in returned JSX. Dead code. Data IS there: mergeHint/structured already flow AiClient → FailoverDB.markProcessed → card. So data exists, rendering missing. 
**My assessment:** Old pastel HTML had "Model confidence: High — 3 sources fused, validated via Salesforce amount update and no further chasing. Sources: Email + Teams channel + Salesforce". That sentence is built from structured + source count. Currently dead code. Complexity LOW-MEDIUM to wire confText into card floor. This is the RAG beauty you wanted.

**Backlog #9 - Title not PII-screened, only body - CONFIRMED REAL BUG (Partially confirmed by Sonnet, I confirm fully)**
HarvesterPanel.onStage(): `screened = piiScreen(v)` then `stageTitle = v.slice(0,80)` from UNSCREENED v, while content: screened.text redacted. Title bypasses redaction. Same in onProcess() stagedTitle = item.title || (text).slice(0,80) not screened. FailoverDB markProcessed/smartAppendToCard never call piiScreen on title.
This matches your BIG issue: body redacted but title still whole content unredacted, both should be AI parsed latest status, pills keep originals.
**My assessment:** CRITICAL for PII gate compliance (.clinerules rule_3). Fix LOW - screen title everywhere via piiScreen.

**Backlog #12 - YOUR NOTES sync counter always 0 - CONFIRMED but different root cause than my earlier guess**
Sonnet says: pendingVecLive (TimelineCard.js:292) and pendingVec (AppCenter.js:213) both count vectorSyncStatus==='pending', but Force Sync button calls OnionDB.forceSync() which flips syncStatus local pending_upload→synced - different field. Counter and button operate on two unrelated concepts, so counter rarely reflects button.
**My assessment:** You reported "YOUR NOTES sync at top-right broken always pending sync (0)". This is exactly it - conflated pipelines. Need decision (see Q1 answer below). Complexity LOW once semantics decided.

**Backlog #13 - Sort order missing - CONFIRMED**
moments line 272 preserves raw timeline insertion order from stageToDataPark unshift, no .sort() anywhere. AppCenter Key Moments sorts by impactScore only. So modified cards don't bubble to top.
**My assessment:** You confirmed YES to updated_at desc + amber pinned top. Fix LOW - add .sort() by updated_at desc, pendingAppends first.

**Backlog #10a - Similar to client playbook banner on original cards - CONFIRMED logic exists UI hidden**
findSmartAppendMatch/buildSmartAppendFor only run during staging/review, amber banner only in review queue parsedReviewQueue map line 657, never on committed card in TimelineCard.js.
**My assessment:** Old pastel HTML had purple banner "⚡ Similar to client playbook in Acme 360" or "Similar to #c4 — extension details overlap" with Merge button on original card floor. Logic exists but only in review queue, not on committed card. Needs new logic to detect if committed card was append target or re-run lightweight match. Complexity MEDIUM (higher than my earlier LOW estimate) - needs clarification Q2.

**Backlog #10b - Full Provenance multiple links - CONFIRMED no such data exists**
mockSeed.js has no provenance[] array (grep zero hits), each card has exactly one source/type string. sourceListFor() only returns [source, type, ...tags] - never more than one link per type. Old dead file TimelineCard_notFullyWorking_24Sep0021.js references m.provenance but never populated.
**My assessment:** This is genuine rebuild from nodes, not restore. Each RAW/AI pair = provenance entry with source/author/at. Old HTML had 6 lines: Email, Channel, Chat Group, Meeting, Salesforce, Excel each with — link —. Since seed has no multi-link data, must derive from nodes[]. Complexity MEDIUM-HIGH, not LOW as I guessed earlier.

**Backlog #3,17 - STAGED(N) counter - CONFIRMED missing**
No pending_processing counter next to Run AI Engine. Matches Discovery B.
**Fix:** LOW - timeline.filter(c=>c.syncStatus==='pending_processing').length next to button.

**Backlog #4 - pending_processing visible in main feed - CONFIRMED still missing**
canSeeCard/isNoise/matchRef has no syncStatus !== 'pending_processing' filter.
**Fix:** LOW - one filter clause. You confirmed YES needs fix.

**Backlog #14 - Ellipsis / Collapse All dead - NOT reproducible in current file - Sonnet CORRECT**
⋯ menu onClick setMenuOpenId and Collapse All onClick setCollapseAllTrigger in AppCenter.js consumed via useEffect in TimelineCard.js both already wired. Refers to old minimal 7kb version not current. No action needed, just smoke-test.

**Backlog #15 - Side panel width - CONFIRMED current widths**
AppRight Smart Assistant column w-[340px], Harvester slide-out #harvester-control-panel width:min(400px,94vw), Guide slider App.js inline width:'36vw', minWidth:'420px', maxWidth:'620px'. Backlog said entire rich-slider + Guide slider ambiguous whether AppRight static column in scope. Needs clarification Q4.

**WP1/WP5 - IMPLEMENTATION_MASTER cross-check - Already fixed**
Hard-stop continue guard in onApproveAll already implemented lines 554-566, Anthropic provider branch already implemented callAnthropic. So IMPLEMENTATION_MASTER.md is partially stale historical reference.

## Answers to Sonnet's 7 Clarifying Questions (with your non-technical input)

### Q1. YOUR NOTES sync counter (#11) - count local pending_upload or vector pending?
**Your input:** You said YOUR NOTES sync top-right broken always shows pending sync (0) even when all cards synced, condition lost. You want it to reflect reality.
**My expert recommendation:** Count LOCAL syncStatus === 'pending_upload' because Force Sync button flips that field, not vector. So counter and button match same pipeline. Vector pending should be separate indicator (maybe small dot or second line). So:
- YOUR NOTES top-right: count local pending_upload + pending_review (cards needing local sync)
- When 0, show "All synced ✅" or "Sync latest" not "0 pending"
- Keep vectorSyncStatus as separate small icon in card footer Local: ✅ / Vector: ⏳ (already dynamic per Sonnet check line 422)
**Complexity:** LOW

### Q2. Similar to client playbook banner (#10a) - only on cards with active pendingAppends or live re-matching?
**Your input:** You want purple banner "⚡ Similar to client playbook in Acme 360" on original cards with Merge button (ideally Review & Merge) that takes to Harvester side panel Parser card to see what needs review to keep latest.
**My recommendation:** Option A - only on cards that have active pendingAppends (reuse existing amber Smart Append banner but purple variant). This is LOW-MEDIUM: when card has pendingAppends.length>0, show purple banner "Similar to client playbook..." with Review & Merge button that scrolls to Harvester. 
Option B live re-matching against other cards even after approval is heavier "find related cards" feature - MEDIUM-HIGH and needs new logic.
**For final backlog:** Go with Option A - show banner only when card has pendingAppends or was recently matched. This matches old HTML where banner appeared on card that had smart append target. No invented metrics, stays within .clinerules.
**Complexity:** MEDIUM (needs to detect if committed card has append history, not full re-match)

### Q3. Full Provenance multiple links (#10b) - derive from nodes[]?
**Your input:** You want Full Provenance when card expanded (+) to have multiple links appended to type, e.g., multiple emails/multiple RAID logs, not sure if logic still there.
**My recommendation:** YES, derive from nodes[] array. Each RAW/AI pair = one provenance instance tagged with source/author/at. Since mockSeed has no multi-link provenance data (Sonnet confirmed zero hits), we must rebuild from nodes. This stays within no invented metrics constraint - we use existing nodes data, not new seed fields.
Example: If card has 3 nodes: RAW Email, AI, RAW RAID Row 12, then Full Provenance shows Email: RE: PO Extension APPROVED — 12 Aug — link + RAID.xlsx Row 12 — PO Extension flagged.
**Complexity:** MEDIUM-HIGH (new logic, not restoration)

### Q4. Side panel width +30% (#13) - scope?
**Your input:** You confirmed side panel width +30% safe, pure CSS, and you want entire rich-slider (Harvester) and if possible Guide button right slider as well, no logic change just CSS aligning text/font proportionally to side-panel width change.
**My recommendation:** Scope = Harvester slide-out #harvester-control-panel 400px→520px (+30%) AND Guide slider 36vw/420-620px → 46vw/546-806px (+30%). Do NOT widen AppRight static Smart Assistant column 340px→442px because that shrinks center column further on smaller screens (as Sonnet flagged). If you want AppRight wider too, we can but need responsive check. For now: Harvester + Guide only.
**Complexity:** LOW (CSS only)

### Q5. Pills cumulative AI text (#9) - RAW own fullText, AI cumulative up to that pill?
**Your input:** YES, you confirmed: RAW should show full RAW from Harvester input, AI should show cumulative AI until that point to correct hallucinations. You said we already did yesterday but not clear/readable and had static text PII kept etc. in parser window.
**My recommendation:** RAW pill click = that node's own fullText unchanged. AI pill click = all AI node texts up to and including that pill's position concatenated with line breaks (e.g., nodes[0].AI + nodes[1].AI + current AI). This lets you see cumulative synthesis and correct hallucinations. Implement getCumulativeAiText(nodes, idx).
**Complexity:** MEDIUM

### Q6. Static PII text in parser window (#9 second half) - not found
**Your input:** You said some static text like PII kept etc. shows in parser window where user has to accept APPEND, please remove or show once at bottom italic just to show what AI worked on, but if complex no for now just remove.
**Sonnet says:** Could not find literal "PII kept, Amount kept" string anywhere in current HarvesterPanel review-queue markup (grep zero hits).
**My assessment:** In HarvesterPanel.FINAL.js I also searched and didn't find "PII kept". Maybe it's phrased as "PII: Email, Amount — Approve redacted share" or similar PII pill. That PII pill is in old HTML but maybe not in current parser window? Or it's in TimelineCard footer "PII: Context" or "PII: Email, Amount — Approve redacted share" (from old HTML). In current parser, it shows impact tags etc. but not PII kept text.
**Recommendation:** Skip as already resolved/not-reproducible, OR if you still see it, please point exact wording screenshot. For backlog, mark as verify only, no code change expected. If it appears, remove from parser and show once at bottom italic as you suggested, but low priority.
**Complexity:** None expected, or LOW if removal needed.

### Q7. Confidence banner placement (#7) - replace or add below footer?
**Your input:** You want model confidence detailed message to showcase beauty of vector/RAG log or AI model smartness, to be added to floor of card i.e., after current row where we show user/sync status etc.
**My recommendation:** ADD as additional line/section BELOW existing footer, keeping the % and label too (per #8). So footer currently: Author • Team Shared • Local ✅/Vector ✅ • 63% Confidence • PII • date. New floor below: Model confidence: High — 3 sources fused, validated via Salesforce amount update... Sources: Email + Teams + Salesforce, plus PII pill, Private/Team Shared buttons, Edit history as in old pastel HTML. This matches old HTML structure where confidence was in separate rounded box below main content.
**Complexity:** MEDIUM - need to wire confText/structEntries/mergeHint into footer/floor.

## Revised Complexity Estimates (after Sonnet cross-check)

| # | Item | Sonnet Complexity | My Final Complexity | Reason |
|---|------|-------------------|---------------------|--------|
| 1 | Hook-in-loop crash | Low-Med | Low-Med | Same - move useState out of .map() to keyed dict |
| 2 | Author dropped | Low | Low | Copy author/contributor through |
| 3 | isOwner narrow | Low | Low | Widen to participant check |
| 4 | pending_processing visible | Low | Low | One filter clause |
| 5 | personas.js stale | Low | Low | Fix array + wire dropdown |
| 6 | Title not PII-screened | Low | Low | Screen title via piiScreen |
| 7 | Confidence text missing | Med | Med | Data exists, wire confText/structEntries into floor, buildConfidenceText from structured+sources |
| 8 | Confidence % always 63 | Low | Low | Pass real evidence to calcConfidence, not synthetic 1-item array |
| 9 | Pills cumulative + static PII text | Med | Med + None | Cumulative MED, static text None expected (already gone) |
| 10a | Similar to playbook banner | Med (higher than LOW) | Med | Needs to detect committed card has append history, add purple banner + Review & Merge scroll |
| 10b | Full Provenance multiple links | Med-High | Med-High | No existing data, rebuild from nodes[] |
| 11 | YOUR NOTES sync counter | Low | Low | Decide semantics local pending_upload, show All synced |
| 12 | Sort order updated_at + pending_review pinned | Low | Low | Add .sort() |
| 13 | Side panel +30% | Low | Low | CSS only Harvester+Guide |
| 14 | Dynamic sync footer | None expected | None expected | Already dynamic per Sonnet line 422 check |
| 15 | STAGED(N) counter | Low | Low | Compute pending_processing count |
| 16 | Ellipsis/Collapse dead | None | None | Already working, smoke-test only |
| 17 | ChromaDB slow load | None expected | None expected | Already fire-and-forget |
| 18 | Pastel styling parity | Low but needs specifics | Low | Diff against old HTML if mismatches pointed out |

## FINAL CONSOLIDATED BACKLOG FOR SONNET ACT MODE (P0→P3, one file at a time)

### P0 - Must fix white screen + persona attribution:
1. TimelineCard.js: Fix hook-in-loop - move useState out of .map() into selectedNodeMap dict (keyed by card id, same pattern as appendOpen). Fixes React #300 on persona/project switch.
2. FailoverDB.js: Fix author drop - stageToDataPark() add author: payload.author, contributor: payload.contributor to rec; markProcessed() add author/contributor from aiResult to patch, fallback to existing t.author if not provided; replace hardcoded 'Daniel'/'System' in ensureTimelineNodes() and smartAppendToCard() with getDefaultPersona() from personas.js.

### P1 - PII + privacy + staged separation:
3. TimelineCard.js: Widen isOwner to match canSeeCard participant logic - check author, contributor, nodes[].author, pendingAppends[].author.
4. TimelineCard.js/AppCenter.js: Hide pending_processing from main feed - add syncStatus !== 'pending_processing' filter in canSeeCard/allMoments.
5. personas.js + App.js: Fix PERSONAS to ['Brené','Malcolm','Walter','Daniel'] and wire App.js persona <select> to map over PERSONAS.
6. HarvesterPanel.js + FailoverDB.js: Title PII-screened - onStage stageTitle = piiScreen(v).text.slice(0,80) not unscreened v; onProcess stagedTitle screened; markProcessed/smartAppendToCard screen title via piiScreen. Fixes your BIG issue title unredacted while body redacted.

### P2 - Core features you asked (model confidence, pills, provenance, merge, sync, sort):
7. AiClient.js + TimelineCard.js: Confidence text/banner missing - Build buildConfidenceText(structured, sources) that generates "High — 3 sources fused, validated via Salesforce amount update..." from structured + source count. Wire confText (line 338), structEntries (334), mergeHint into card floor below footer as additional section with PII pill + Private/Team Shared buttons + Edit history (as old pastel HTML). Keep existing footer % and label too (Q7 answer: add below, not replace).
8. TimelineCard.js: Confidence % always 63 - Fix calcConfidence call to pass real evidence: distinct sources count + nodes.length + provenance length, not synthetic 1-item array. Add High/Medium/Low label via existing confidenceTier(). Will show different % per card.
9. TimelineCard.js: Pills cumulative AI text - Implement getCumulativeAiText(nodes, idx): RAW returns own fullText, AI returns all AI texts up to idx joined with line breaks. RAW stays own fullText. Remove static PII text from parser if found, or show once italic bottom (Q6: skip as not reproducible, verify only).
10a. TimelineCard.js + HarvesterPanel.js: Similar to client playbook banner on original cards - When card has pendingAppends.length>0, show purple banner "⚡ Similar to client playbook in Acme 360" or "Similar to #c4 — extension details overlap" with "Review & Merge" button that scrolls to Harvester slide-out (document.getElementById('harvester-control-panel').scrollIntoView()). Reuse existing amber Smart Append styling purple variant. Complexity MED - needs to detect committed card has append history.
10b. TimelineCard.js: Full Provenance multiple links - Rebuild from nodes[] since mockSeed has no multi-link data. Each RAW/AI pair = provenance entry tagged with source/author/at. When card expanded (+), show list with — link — per entry (e.g., 2 emails, 3 RAID rows). Old HTML had 6 lines. Complexity MED-HIGH - new logic not restoration.
11. AppCenter.js + TimelineCard.js: YOUR NOTES sync counter fix - Count local syncStatus === 'pending_upload' + pending_review (matching Force Sync button), not vector pending. When 0 show "All synced ✅" or "Sync latest". Relabel vector as separate small indicator if needed. Fixes your broken top-right sync.
12. TimelineCard.js: Sort order - Add .sort() by updated_at desc, with pendingAppends.length>0 floated to top (amber pinned). Recently-appended-to cards bubble to top.

### P3 - UI polish:
13. styles.css + App.js: Side panel +30% - #harvester-control-panel 400px→520px, Guide slider 36vw/420-620px → 46vw/546-806px. AppRight static column 340px stays (not widen) to avoid shrinking center on small screens (per Q4 answer: Harvester+Guide only). CSS only, align text/font proportionally.
14. TimelineCard.js: Dynamic sync footer - Already dynamic per Sonnet line 422 check, verify only.
15. HarvesterPanel.js: STAGED(N) counter next to Run AI Engine - Compute pending_processing count, render next to button. You confirmed location next to Run AI Engine.
16. Ellipsis/Collapse All - Already working per Sonnet, verify only in smoke-test.
17. VectorSync.js: ChromaDB slow load - Already fire-and-forget per FailoverDB fireVectorMirror, verify only.
18. Pastel styling parity - Spot-check vs old HTML reference, diff if specific mismatches pointed out.

### Testing Checklist After Fix (same as before + your new clarifications):
- Project click keeps UI
- Persona change keeps UI, filters correctly, no white screen
- Harvester stage → STAGED (1) increments next to Run AI Engine, not visible in main feed
- Run AI → STAGED (0), card appears or smart append amber
- RAW pill click shows full original paste, AI pill shows cumulative AI correction until that point
- Walter appends to Daniel's card → Walter sees Approve CTA
- Approve → amber disappears, Local/Vector updates
- Harvester picks selected persona not System
- Model confidence detailed banner shows "High — 3 sources fused..." on floor below footer
- Model % shows different per card (71%, 84%, etc.) not static 63%
- PII redaction both title and body, title not showing unredacted
- Full Provenance expanded shows multiple links per type (2 emails, 3 RAID)
- Similar to playbook purple banner with Review & Merge scrolls to Harvester Parser card
- YOUR NOTES sync shows All synced ✅ not pending (0) always
- Sort: modified bubbles to top, amber pinned top
- Collapse All works, ... works
- Side panels 30% wider Harvester+Guide, readable
- No React #300
