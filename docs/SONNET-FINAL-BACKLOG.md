# FINAL BACKLOG FOR SONNET - Project Onion (Non-Technical Summary + Technical Tasks)

## YOUR CLARIFICATIONS ANSWERED (Expertise)

### 1. Is model confidence detailed text still generated in AiClient.js? You saw structured but not confidence string.
**Answer (non-technical):** Right now, the code saves structured data (Milestone MS3, $120k→$145k, dates, approvers) but DOES NOT generate the beautiful sentence "Model confidence: High — 3 sources fused, validated via Salesforce amount update... Sources: Email + Teams + Salesforce". That beautiful sentence was in the old pastel HTML (209k file) and made the AI look smart. It's currently missing.
**Complexity to restore:** MEDIUM. We need to add a small function in AiClient.js that builds that sentence from structured data + how many sources (Email, Teams, Salesforce, Excel, etc.). Data exists, just need to turn it into sentence. No logic change to business, just UI beauty. We should include it.

### 2. Model % always 63% - you saw different percentages when I fixed before.
**Answer:** Old UI showed High/Medium, not %. Current TimelineCard.FINAL.js line 105 has hardcoded `• 63% Confidence`. Yesterday's fix probably made it dynamic (impactScore*100) but got reverted to 63% static in the FINAL version you uploaded.
**What it should be:** impactScore 0.85 → 85% Confidence, plus label High if >0.8, Medium if 0.5-0.8, Low if <0.5. So you see different percentages per card.
**Complexity:** LOW - just change 1 line from static 63% to `Math.round((m.impactScore||0.7)*100)+'%` and compute High/Medium.

### 3. STAGED(N) counter next to Run AI Engine - YES
**Answer:** Means number of cards that are staged in Data Park but not yet AI processed (pending_processing). Currently you only see legacy Excel drop counter. New flow should show STAGED (N) next to Run AI Processing Engine button. When you Stage to Data Park, N becomes 1, after Run AI, N becomes 0.
**Complexity:** LOW - just count `timeline.filter(c=>c.syncStatus==='pending_processing').length` and render next to button in HarvesterPanel.

### 4. Sort order - updated_at desc + amber pinned top - YES to both
**Answer:** Currently central panel sorted by created_at (oldest first). You want modified/updated cards bubble to top, so when Walter appends private update to Daniel's card, that card jumps to top. And amber pending_review (needs approval) should be pinned top even more.
**Fix:** Sort by `updated_at desc`, with `pending_review` first. In FailoverDB smartAppendToCard already sets updated_at = now, so sorting will work.
**Complexity:** LOW - one sort function in AppCenter.js

### 5. Side panel width +30% - entire rich-slider + Guide slider - YES
**Answer:** You mean entire right slider (Harvester) and also Guide button slider? Currently ~320px wide, font 11px very small with lot content. Increasing to 416px (+30%) will make readable. It's pure CSS, no logic change, just change grid-template-columns and align text/font proportionally.
**Complexity:** LOW - CSS only, check mobile responsive still stacks vertically. No impact elsewhere except center slightly narrower, safe.

### 6. Sync/privacy statuses - you covered all in cards
Good - but I found 2 more small gaps: sync footer hardcoded Local/Vector always ✅, should be ⏳ when pending. And YOUR NOTES sync top-right broken.

### 7. YOUR NOTES sync top-right broken - always shows pending sync (0) even when synced
**Answer:** This is a lost condition. Probably in AppRight.js or YOUR NOTES component, it does `timeline.filter(c=>c.syncStatus==='pending_upload').length` but should count pending_upload + pending_review, or should show "All synced" when 0. Currently always 0 due to wrong filter or wrong key (onion_db_state vs onion_db_storage mismatch we fixed with LEGACY_KEYS, but YOUR NOTES may still read wrong key).
**Complexity:** LOW - fix filter condition to count correctly and show "All synced" or "Sync latest" when 0.

### 8. Timeline pills - RAW full RAW, AI cumulative - YES + remove static PII text
**Answer:** You said we did getCumulativeAiText yesterday but not clear/readable and had static text "PII kept etc." also showing in PARSER window where user accepts APPEND. You want RAW pill click = show full original paste from Harvester (fullText), AI pill click = show cumulative AI processed content until that point (so you can correct hallucinations), and remove static text like "PII kept, Amount kept" from parser window, or show once at bottom italic to show what AI worked on. If complex, just remove for now.
**Current:** TimelineCard.FINAL.js line 92 shows `selectedNode.fullText || selectedNode.text` - only that node's text, not cumulative. And HarvesterPanel parser shows static text "PII kept" inside each node.
**Fix:** Implement `getCumulativeAiText(nodes, idx)` - RAW returns fullText, AI returns accumulated AI text until idx. Remove static "PII kept etc." from parser, or move to bottom italic once.
**Complexity:** MEDIUM for cumulative (need to loop nodes), LOW for removing static text.

### 9. BIG PII issue - Card title and body should both be AI parsed redacted latest status, timeline pills capture originals, but yesterday body redacted but title still shows whole content unredacted.
**Answer:** This is critical. Both title and body should go through PiiGate piiScreen. Currently in HarvesterPanel.FINAL.js, body is screened but title maybe not, or in TimelineCard display, title shows unredacted while detail shows redacted. You saw card body redacted but title still whole content same as body without redaction.
**Fix:** Ensure in stageToDataPark and markProcessed and smartAppendToCard, both title and synthesizedText/content go through piiScreen. And in TimelineCard display, use redacted versions for title and detail, while pills keep original fullText.
**Complexity:** LOW - add piiScreen to title in two places.

### 10. Old HTML beauty - Model confidence floor, Full Provenance multiple links, Similar to playbook
**Answer for Similar to client playbook [Merge] → Review & Merge:** Old had purple banner "⚡ Similar to client playbook in Acme 360" with Merge button that should take to Harvester Parser card. Current only shows amber Smart Append banner in review queue, not in original cards. Logic findSmartAppendMatch still exists, just UI hidden.
**Complexity:** LOW - UI only, add purple banner in original cards when findSmartAppendMatch finds similar, with button "Review & Merge" that scrolls to Harvester (document.getElementById('harvester-panel').scrollIntoView()). No logic change.

**Answer for Full Provenance multiple links:** Old FULL PROVENANCE — EXPLORABLE showed 6 lines each with — link —, multiple emails/multiple RAID logs per type. Current only shows tags. Aggregation logic may still be in mockSeed but UI hidden.
**Complexity:** If logic still in mockSeed (provenance array), LOW - just render list with links. If removed, MEDIUM - rebuild from nodes.

### FINAL BACKLOG FOR SONNET ACT MODE (Prioritized)

#### P0 CRITICAL - White screen crashes (must fix first):
1. TimelineCard.js hook-in-loop: Sonnet found useState inside moments.map (line 347 in old version). Current FINAL has useState at top correct, but need to ensure selectedNodeMap pattern (keyed dict) not single useState per card. Fix: Replace const [selectedNode, setSelectedNode] with const [selectedNodeMap, setSelectedNodeMap] = useState({}) and derive selectedNode = selectedNodeMap[m.id] || null. This fixes persona change white screen React #300. Confidence Very High.
2. FailoverDB.js author drop: stageToDataPark() omits author/contributor from payload even though HarvesterPanel passes persona. markProcessed() omits author/contributor from aiResult. Fix: Add author: payload.author, contributor: payload.contributor to rec, and author/contributor to patch from aiResult. Replace hardcoded 'Daniel'/'System' fallback with getDefaultPersona() from personas.js. This fixes Harvester picks System not selected persona.

#### P1 HIGH - Privacy + UX gaps:
3. TimelineCard.js isOwner too narrow: isOwner only checks m.author === activePersona, not nodes/pendingAppends authors. If Walter appends to Daniel's card, Walter can't see Approve CTA. Fix: Widen to check m.author === persona || nodes.some(n=>n.author===persona) || pendingAppends.some(p=>p.author===persona) mirroring canSeeCard.
4. Discovery B - pending_processing visible in main feed: Add filter syncStatus !== 'pending_processing' in AppCenter.js or canSeeCard, so staged raw fragment not in main Status Cards, only in STAGED(N) counter. YES you confirmed.
5. personas.js stale: PERSONAS = ['Brené','Walter','Apollo'] - Apollo is project name, missing Malcolm/Daniel. Fix to ['Brené','Malcolm','Walter','Daniel'] and wire App.js dropdown to map over PERSONAS (single source of truth).
6. PII redaction both title and body: Ensure piiScreen applied to both title and synthesizedText/content in stageToDataPark, markProcessed, smartAppendToCard, and TimelineCard display. Title currently unredacted while body redacted. Fix both.

#### P2 MEDIUM - Core features you asked:
7. Model confidence detailed banner (RAG beauty): Old pastel HTML had "Model confidence: High — 3 sources fused, validated via Salesforce amount update..." Currently only 63% static. Data structured exists, confidence text missing. Need to add function buildConfidenceText(structured, sources) in AiClient.js that generates sentence from structured + source count. Show on floor of card after user/sync row, with PII pill + Private/Team Shared buttons + Edit history (as in old HTML). Complexity MEDIUM - data exists, just build sentence. You said you don't know if code exists - it doesn't, need to restore. Include it.
8. Model % dynamic: Replace hardcoded 63% with Math.round((m.impactScore||0.7)*100)+'%' and High/Medium/Low label. Complexity LOW.
9. Timeline pills cumulative: RAW shows fullText original, AI shows cumulative AI until that point to correct hallucinations. Implement getCumulativeAiText(nodes, upToIdx). Remove static "PII kept etc." from parser window, or show once at bottom italic. You said if complex just remove. So remove static text from parser, keep cumulative logic. Complexity MEDIUM.
10. Full Provenance multiple links: When card expanded (+), show multiple links per type (2 emails, 3 RAID logs) not just tags. Check if provenance aggregation still in mockSeed, if yes render list with — link —. Old UI had 6 lines. Complexity LOW if data exists, MEDIUM if need rebuild from nodes.
11. Similar to client playbook Review & Merge banner: Add purple banner "⚡ Similar to client playbook in Acme 360" or "Similar to #c4 — extension details overlap" in original cards when findSmartAppendMatch finds similar, with button "Review & Merge" that scrolls to Harvester Parser card. Logic exists, UI hidden. Complexity LOW - UI only.
12. YOUR NOTES sync top-right broken always pending sync (0): Fix filter condition - should count pending_upload + pending_review, show "All synced" or "Sync latest" when 0. Lost condition. Complexity LOW.
13. Sort order central panel: Sort by updated_at desc so modified bubbles to top, and pin amber pending_review to top. Yes you confirmed both. Complexity LOW.

#### P3 LOW - UI polish + side panels:
14. Ellipsis ... / Collapse All buttons dead: Minimal 7kb version had no onClick. Restore handlers from git original. Collapse All should use collapseAllTrigger prop.
15. Side panel width +30%: 320px → 416px for Harvester (entire rich-slider) and Guide slider. Pure CSS grid-template-columns, align text/font proportionally. No logic change. Complexity LOW, safe.
16. Dynamic sync footer: Local ✅/⏳ / Vector ✅/⏳ based on syncStatus/vectorSyncStatus, not hardcoded ✅. Complexity LOW.
17. STAGED(N) counter next to Run AI Engine: Count timeline.filter(syncStatus==='pending_processing').length, show STAGED (N) next to button. Yes you confirmed location. Complexity LOW.
18. ChromaDB slow load: fireVectorMirror setTimeout 0 non-blocking, ensure VectorSync uses queue not blocking fetch. Not part of 6 bugs but worth flagging, low priority.
19. Old pastel styling: Colors bg-[#E8F2FF], bg-[#F0E6FF], rounded-[12px], p-3, etc. Ensure current uses same pastel classes for beauty. No logic change.

#### Testing Checklist After Fix:
- Project click keeps UI (already fixed)
- Persona change (Brené/Walter/Malcolm/Daniel) keeps UI, filters correctly, no white screen
- Harvester stage → STAGED (1) increments, not visible in main feed
- Run AI Engine → STAGED (0), card appears or smart append amber
- RAW pill click shows full original paste, AI pill shows cumulative AI correction
- Walter appends to Daniel's card → Walter sees Approve CTA
- Approve → amber disappears, Local/Vector status updates to ✅
- Harvester picks selected persona not System
- Model confidence detailed banner shows "High — 3 sources fused..." on floor of card
- Model % shows different per card (e.g., 85%, 70%, 63%) not static 63%
- PII redaction both title and body, title not showing unredacted
- Full Provenance expanded shows multiple links per type
- Similar to playbook purple banner with Review & Merge button scrolls to Harvester
- YOUR NOTES sync shows All synced not pending (0)
- Sort: modified card bubbles to top, amber pinned top
- Collapse All works, ... works
- Side panels 30% wider, readable, Guide slider also wider
- No React #300

#### What Sonnet Needs in Cline:
@SONNET_FINAL_PLAN.md (this file) OR @SONNET_FULL_CONTEXT.md single doc + actual JS files:
@FailoverDB.js @App.js @AppLeft.js @AppCenter.js @AppRight.js @TimelineCard.js @HarvesterPanel.js @mockSeed.js @personas.js @AiClient.js @PiiGate.js @VectorSync.js

Prompt:
You are reviewing Project Onion full flow per FINAL BACKLOG. P0 white screen hook bug + author drop, P1 privacy + pending_processing filter + personas.js + PII both title/body, P2 model confidence detailed banner + model % dynamic + pills cumulative + provenance multiple links + Review & Merge banner + YOUR NOTES sync fix + sort order, P3 side panel width + STAGED counter + Collapse handlers + pastel styling. Do not change business logic, only restore beauty that exists in old HTML if data still there. Provide fixed files diff. Complexity estimates given.


---

## STATUS — verified 2026-10-05 (headless browser run against the demo dataset)

| # | Item | Status |
|---|------|--------|
| 1–6, 8, 9, 10, 12, 13, 14, 16, 17 | P0/P1 + P2/P3 fixes (hook-in-loop, author drop, isOwner, pending_processing filter, personas, PII title+body, dynamic %, cumulative pills, multi-link provenance, notes sync, updated_at sort + pending pinned, Collapse All, dynamic sync footer, STAGED(N)) | Done, verified |
| 7 | Model confidence text | Done — card floor reads "Model confidence: High — 3 sources fused, validated via Salesforce (85%). Sources: Teams Chat + Salesforce + Outlook Mail." (`buildConfidenceText` in `core/confidence.js`; "fused" only with 2+ distinct sources, "validated via" only when a system-of-record source is present; a single source reads "not yet corroborated"). Unit tests: `modules/experience-pwa/tests/confidence.test.mjs`. |
| 11 | "Similar to playbook → Review & Merge" | Done — purple banner on the target card while a matched item is queued in the Harvester (before Approve); **Review & Merge** opens the drawer and scrolls to the review queue. The post-Approve "update waiting for your review" banner already existed. |
| 15 | Side panels | Done — Harvester drawer and Guide slider are 40vw (min 480px, max 94vw); Harvester content text scaled up (zoom 1.18); backdrop dim set to 30%. |
| STAGED | Run AI clears STAGED(N) | Done — items moved to the review queue no longer count as staged. They stay `pending_processing` in storage until Approve, so a reload before Approve restores them. |
| 18, 19 | Chroma non-blocking, pastel audit | Not verified (low priority) |
| 14 (ellipsis menu) | "Card options" button | Done, verified — Edit Details / Delete work for the card owner and are disabled for others; menu width fixed (compiled CSS lacked `w-32`). |
