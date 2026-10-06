# Hackathon Demonstration Dataset: Continuum

Status: **plan and dataset design only. No code has been changed.**
Date: 29 Sep 2026 · Branch: `feature/relationship-model-v5`
Companion file: [Demo_Walkthrough_Dataset.md](Demo_Walkthrough_Dataset.md), the 5-minute live script.

This document covers four things:
- **Dataset.** A new, fully fictional dataset that replaces the Acme / Apollo / NovaTech demo data during judging.
- **Scenarios.** Ten scenarios. Each one shows one Continuum capability on a path the current code handles reliably.
- **Client 360 test data.**
- **Reset and implementation plan.** How the dataset is loaded ("Reset Demo Dataset"), which files change, and the implementation plan.

Every expected result below was **computed, not estimated**. I rebuilt these app rules in a small script and ran each card and each pasted input through it:
- Smart Append matcher (`HarvesterPanel.findSmartAppendMatch`)
- evidence strength (`confidence.js` + `TimelineCard.evidenceFor`)
- Handover categories, open/closed and risk rules (`HandoverModal.js`)
- Key Moments split (`AppCenter.js`)
- Client 360 themes and contacts
- the offline AI tagger (`AiClient.mockResult`)

The last step of the implementation plan turns that script into a permanent check (see section 8).

---

## Contents

1. [What the dataset relies on (review of current behaviour)](#1-what-the-dataset-relies-on)
2. [Design rules that keep the demo predictable](#2-design-rules)
3. [Cast: clients, projects, personas](#3-cast)
4. [Scenarios S1–S10](#4-scenarios)
5. [Client 360 test data](#5-client-360-test-data)
6. [How the dataset is loaded: "Reset Demo Dataset"](#6-loading-and-reset)
7. [Files to create or modify](#7-files-to-create-or-modify)
8. [Implementation plan](#8-implementation-plan)
9. [Recommendations for demo impact](#9-recommendations-for-demo-impact)
10. [Known limits we deliberately avoid on stage](#10-known-limits-avoided)
- [Appendix A: full card catalogue](#appendix-a-full-card-catalogue)
- [Appendix B: project and client records](#appendix-b-project-and-client-records)

---

## 1. What the dataset relies on

This is how the current code behaves, and the dataset is designed around each behaviour. File references are to `modules/experience-pwa/static/js/`.

| Area | Current behaviour | What it means for the dataset |
|---|---|---|
| **Smart Append** | `components/HarvesterPanel.js:66` checks every timeline card, in storage order. The first card that shares a *reference ID* with the pasted text wins immediately ("Exact ID match"). The recognised ID formats are `FW-REQ-n`, `PO-n`, `SoW-…`, `AP-n`, `MS1`–`MS9` and `R-n`. Without an ID it falls back to "2 or more shared words", which matches almost anything. | Every append in the demo uses **one unique reference ID**. We never rely on word overlap. |
| **Similarity (Chroma)** | The vector search (`core/VectorSync.js`) is consulted **only when the ID and word checks find nothing**. | Because every scripted input carries an ID, Chroma is never on the critical path. |
| **Staging** | The pasted text's first 80 characters become the card title. The target card takes that title when the update is shared (staging no longer changes it). | Every pasted input starts with an 80-character headline that already contains the reference ID. |
| **Sharing** | "Share update with team" appears **only for the card's owner** (`TimelineCard.js:684`). Sharing replaces the card text with the latest AI summary (`App.js:130`). | Each input is pasted by the persona who owns the target card. The ID sits in the first 80 characters, so it stays on the card after sharing. |
| **AI summary** | With no API key, the offline engine returns the first 220 characters of the input, plus keyword tags. Impact is 0.90 if the text contains words like *risk*, *PO* or *milestone*, and 0.35 otherwise. | The first 220 characters of each input read as a summary. Each input ends with a sentence that gives it an honest impact of 0.90. |
| **Evidence strength** | 55 + 8 per distinct source (at most 4) + 3 per extra shared RAW update (at most 3), capped at 97. High ≥ 85, Medium ≥ 60. **Draft updates do not count.** | Several target cards start at **74% Medium** (2 sources) and reach **85% High** after one shared update. A pasted update's source is always "Data Park Dropzone", which counts as a new source. |
| **Handover** | The category is picked by keyword, in this order: Finances → Client Feedback → Operations → Internal → Delivery. A card is "Closed" if its text contains *closed / resolved / signed / approved / fulfilled*. It is a risk if it contains *risk / blocked / failed…*. The persona's own "Only me" cards are included. | Card wording was chosen so each card lands in the intended category and state. Section 2 lists the words to avoid. |
| **Key Moments** | Top 5 cards by impact. Cards with impact below 0.5, or of type `generic_chatter`, go to "Routine updates". | Each project has a clear top 5 plus 1–2 routine items. |
| **Client 360** | Projects are matched by `client_name`. Contacts come from each project's `contacts[]`. Themes count tags on all of the client's cards. The Know-how items are hard-coded in `AppCenter.js:56`. | Contacts overlap across projects, so "on N projects" appears. Tags repeat across projects on purpose. Know-how needs a small change (section 7). |
| **Ask Assistant** | Keyword AND-match over the active project's cards (`App.js:48`). With an API key it returns a grounded answer. | The walkthrough query `why nightly batch` matches exactly one card. |
| **Reset** | `resetToSeedData()` reloads `mockSeed.js`. It does not clear the review queue, the vector queue or React state. | A new, separate reset path is needed (section 6). |

Problems found while reviewing, which the plan fixes:
- `App.js:61` starts Client 360 on the hard-coded client `'Acme Corp'` until a project is clicked, so Client 360 is empty with any other dataset.
- `App.js:84`: the new-project form defaults the account to `'Acme Corp'`.
- `VectorSync.js:41-44` falls back to `'Acme Corp'` / `'Apollo-123'` as the client and project on vector records.
- Judge-visible pages still name real or trademarked organisations:
  - `docs/guide-app/GuideData.js` (McKinsey / Contoso, 8 mentions);
  - `docs/Continuum-V4-Final.html` (3);
  - `docs/relationship-v5/lib/integrity.js` (1).
- `acme.com` is a real domain and appears in `mockSeed.js` and in the Relationship Model v5 story/model files.

---

## 2. Design rules

These rules are why the demo is predictable. The checker script enforces all of them.

| # | Rule | Why |
|---|---|---|
| DR-1 | **Each reference ID appears on exactly one card**, across all projects and all privacy levels. | The matcher stops at the first card that shares an ID. |
| DR-2 | **The ID is in the card title**, and in the first 80 characters of any input that updates the card. | The title and text are rewritten on staging and sharing; the ID must survive both. |
| DR-3 | **Each pasted input contains exactly one reference ID.** | Two IDs could point at two cards. |
| DR-4 | **Append targets are Team cards, and the input is pasted by the card's owner.** | Only the owner sees "Share update with team". This avoids private-card ownership edge cases. |
| DR-5 | **"Only me" cards contain no reference IDs and no tags.** | A private card can never be an append target, and it adds nothing to Client 360 themes. |
| DR-6 | **No cross-project appends.** Cross-project knowledge is shown by *reading* (Client 360, archived project), never by appending. | Avoids Chroma scope and cross-project match edge cases. |
| DR-7 | **Word hygiene**, so Handover categories stay correct. Avoid the words on the right, except where the effect is intended. | Handover and the "Share" button use substring checks. **Open cards avoid:** *closed, resolved, signed, approved, fulfilled* (including *unresolved, unsigned, disclosed*). **Non-finance cards avoid:** *payment, billing, finance, cost␠, $, £, po-* (including *repo-*). **All cards avoid:** *private* (it makes the Share button appear), *MS1–MS9*, *hotel/coffee/lunch/vacation/birthday*, and phone-like numbers. |
| DR-8 | **Fictional names only.** Company and person names are invented. Domains use the reserved `.example` suffix (RFC 2606), which can never resolve to a real site. IDs use made-up number ranges. | Safe to show publicly. |
| DR-9 | **Relative dates.** Every record stores an age in days. The loader turns it into real dates at reset, so "2 days ago" is always true. | Repeatable on any day. |
| DR-10 | **The four existing personas are kept** (Brené, Malcolm, Walter, Daniel) and share the work roughly evenly. | You asked to keep the existing personas. |

---

## 3. Cast

### Clients and projects (all fictional)

| Client | Domain(s) | Project | Status | What it is | Opportunity | Project ID |
|---|---|---|---|---|---|---|
| **Halden Mutual Insurance** | `halden-mutual.example`, `halden-claims.example` | **Beacon-201** | Active (default on load) | Claims platform modernisation | O-730201 | 7302010 |
| | | **Lantern-202** | Active | Claims history data migration | O-730202 | 7302020 |
| | | **Tidewater-150** | Archived (closed 13 months ago) | Policy portal rebuild | O-730150 | 7301500 |
| **Corrin Water Utilities** | `corrin-water.example` | **Aquila-310** | Active | Field operations mobile app | O-731310 | 7313100 |
| **Brackwater Retail Group** | `brackwater-retail.example` | **Meridian-420** | Active | Store checkout cloud migration | O-732420 | 7324200 |

### Personas (existing app personas, roles for this dataset)

| Persona | Role in the story | Scenarios owned |
|---|---|---|
| **Brené** | Halden account and delivery lead; the presenter's persona | S1 Handover, S2 Lost Decision Rationale (walkthrough), S10 Lessons Learned Reuse |
| **Malcolm** | Delivery manager: RAID, sprints, resourcing | S3 RAID Escalation, S5 Resource Transition |
| **Walter** | Lead engineer; moves from Aquila to Beacon | S6 Architecture Decision Record, S7 Runbook Recovery, S9 Cross-Team Knowledge Discovery |
| **Daniel** | Commercial and finance lead | S4 Financial Milestone, S8 Customer Issue Resolution |

Client-side people (Priya Okafor, Tomas Reyes, Ingrid Vale, Sunil Marsh, Hana Brook, Rafe Lindqvist, Mei Adeyemi, Colm Hartley, Ada Fenwick, Jonas Pike) and the incoming engineer Joss Amani appear only in text and contacts. None of them are app personas.

### Persona balance

| Persona | Team cards owned | "Only me" cards | RAW updates contributed | Projects |
|---|---|---|---|---|
| Brené | 6 | 1 | 4 | Beacon, Lantern, Tidewater |
| Malcolm | 5 | 2 | 8 | Beacon, Lantern, Aquila, Meridian |
| Walter | 5 | 2 | 9 | Beacon, Lantern, Tidewater, Aquila, Meridian |
| Daniel | 7 | 1 | 7 | Beacon, Tidewater, Aquila, Meridian |

Totals: 29 cards (23 Team, 6 "Only me"), 2 notes, 11 reference IDs. Every persona owns 7 or 8 cards, and every persona has at least one "Only me" card for the privacy demo.

### Reference IDs (one card each)

| ID | Card | Project | Used by |
|---|---|---|---|
| AP-4410 | Decision: nightly batch sync for claim status | Beacon-201 | S2 (walkthrough) |
| AP-4452 | ADR-007 event queue | Beacon-201 | S6 |
| R-72 | Risk: UAT testers booked | Beacon-201 | S10 |
| PO-448120 | Release 2 invoice | Beacon-201 | S1 (context only) |
| R-41 | Risk: duplicate policy records | Lantern-202 | S3 |
| PO-390077 | Final invoice (archived) | Tidewater-150 | S10 (context only) |
| R-57 | Key-person risk | Aquila-310 | S5 |
| FW-REQ-5102 | Offline sync queue runbook | Aquila-310 | S7 |
| PO-551870 · SoW-BRG-2026-07 | Milestone 2 invoice (both IDs on one card) | Meridian-420 | S4 |
| AP-3108 | Duplicate refunds client issue | Meridian-420 | S8 |

Other codes in the text (`BCN-231`, `LAN-88`, `TDW-142`, `MER-512`, `CR-12`, `D-09`, `ADR-007`) are **not** recognised as reference IDs by the matcher. They add realism without affecting matching.

---

## 4. Scenarios

Each scenario gives:
- the business situation and the raw inputs;
- the expected AI summary, Smart Append result, provenance chain and evidence strength;
- the expected Handover result;
- why judges will find it interesting.

"Paste input" means: select the persona, open the project, put the text in the Harvester, choose the type, then **Stage to Data Park → Run AI Processing Engine → ✅ Approve & Add to Project → Share update with team** (on the card).

Evidence numbers are *before → after sharing*. Draft updates never change the number.

For the AI summary, "Offline" means no API key: the engine badge says so, and the summary is the first 220 characters of the input. "Live" is what a model should produce; the exact wording varies by model.

---

### S1 · Project Handover

| | |
|---|---|
| **Persona / project** | Brené · Beacon-201 |
| **Business situation** | A new delivery lead joins Beacon-201 in two weeks (see the Malcolm action item card). Brené must hand over five months of decisions, risks, money and client feedback without writing a 20-page document. |
| **Sample raw inputs** | No new input. The pack is built from the Beacon cards already in the dataset: 9 Team cards plus 1 team note (see Appendix A). Brené types only a per-project remark: `Start with the two decision records. R-72 is the one risk to watch; the release 2 invoice depends on it.` |
| **Expected AI summary** | Not applicable. The Handover pack groups existing summaries; it doesn't generate new ones. |
| **Expected Smart Append** | None. Handover only reads cards. "Handover to Project Memory" saves the remark as a new **Team note** titled "Handover: Beacon-201" (source "Handover Pack"). |
| **Expected provenance chain** | Every pack item links (`#card-id`) back to its status card, and each card keeps its RAW → AI nodes. |
| **Expected evidence strength** | Not applicable to the pack. Individual cards keep their own evidence (63–85%). |
| **Expected Handover outcome** | Brené, Beacon-201 tab, Full Lifecycle, *before* the walkthrough: **10 items: 9 Open, 1 Closed, 1 risk.** By category: Delivery 6 · Operations 1 (R-72) · Finances 1 (PO-448120) · Client Feedback 1 (Sprint 9 demo) · Internal 1 (onboarding action). **After the walkthrough (S2):** 8 Open, 2 Closed. **"Last 3 Months" hides AP-4410** (created 148 days ago), which shows how old decisions drop out of short views. |
| **Why judges will find it interesting** | A handover is where project knowledge is usually lost. Here it's one click, every line can be traced to evidence, and it includes the *why* behind a five-month-old decision. |

### S2 · Lost Decision Rationale *(this is the live walkthrough)*

| | |
|---|---|
| **Persona / project** | Brené (owner of `demo-bcn-ap4410`) · Beacon-201 |
| **Business situation** | Halden's claims team asks, again, why claim status isn't real-time. The engineer who made the call (Walter) is moving between projects. The answer exists: a Teams chat from five months ago and a decision-log row, recorded as **AP-4410**. Today the client architect reconfirms the constraint. |
| **Sample raw inputs (already in the dataset)** | *RAW · Teams Chat · Walter · 150 days ago:* "[16:05] Walter: the core policy system only allows bulk reads 01:00-04:00, real-time polling would hit their 200 requests/min cap within minutes … [16:09] Brené: logging it as AP-4410 so we keep the why". *RAW · RAID Log Excel · Malcolm · 148 days ago:* "Decision D-09 \| AP-4410 \| … Why: the core policy system caps reads at 200 requests/min … Revisit trigger: vendor API upgrade". |
| **Input to paste (Email)** | `AP-4410 approved again: nightly batch sync stays for claim status in release 2. Priya Okafor (Halden architecture) confirmed today that the core policy system still caps reads at 200 requests a minute and the vendor API upgrade has moved to next year, so the why behind AP-4410 still holds. Last night's load test finished the batch in 2h 10m inside the 3h window. No new risk to the release 2 plan.` |
| **Expected AI summary** | *Offline:* the first 220 characters, with the "Offline mock" badge; tags `#Mock_Tagged #Risk_Watch`; **Impact: Key moment (0.90)**. *Live:* "The client architect reconfirmed nightly batch sync for claim status: the policy system read cap still applies and the vendor upgrade has slipped to next year; the load test fits the window." |
| **Expected Smart Append** | **Strong match: both mention AP-4410** (rule: shared reference ID; score 100) → target "AP-4410 Decision: nightly batch sync…". After approval the card shows a 🔒 draft pill and the banner "1 draft update added to this card — visible only to you until shared". After **Share update with team**, the card title becomes "AP-4410 approved again: nightly batch sync stays for claim status in release 2." |
| **Expected provenance chain** | Oldest first: RAW Teams Chat (Walter, −150 d) → AI → RAW RAID Log Excel (Malcolm, −148 d) → AI → **RAW Data Park Dropzone (Brené, today) → AI**. That's three people, three sources and five months, all on one card. |
| **Expected evidence strength** | **74% Medium → 85% High.** Before: 2 sources, 2 updates (55 + 16 + 3). With the draft staged it stays 74%, and the draft is shown as not counted. After sharing: 3 sources (RAID Log Excel, Teams Chat, Data Park Dropzone), 3 updates → 55 + 24 + 6 = **85**. |
| **Expected Handover outcome** | The card moves from **Delivery · Open** to **Delivery · Closed** (the title now contains "approved"), with today's date. Beacon becomes 8 Open / 2 Closed. |
| **Why judges will find it interesting** | It answers "why did we decide this?" with the original words, the original people and the date. The confidence number rises only when a person shares new evidence, not when AI writes a summary. |

### S3 · RAID Escalation

| | |
|---|---|
| **Persona / project** | Malcolm (owner of `demo-lan-r41`) · Lantern-202 |
| **Business situation** | Data profiling found 3.2% duplicate policy records in the claims history extract (R-41, amber). The client's data governance lead can't approve the de-duplication rule alone, so the risk escalates to red and blocks dry run 2. |
| **Sample raw inputs (in the dataset)** | *RAW · RAID Log Excel · Malcolm · −9 d:* "Risk R-41 \| Lantern-202 \| 3.2% of policy records in the claims history extract are duplicates \| Mitigation: agree a survivorship rule with data governance before dry run 2 \| Rating amber". *RAW · Jira CSV Export · Walter · −7 d:* "LAN-88,Profile claims history extract,Done,41,200 of 1,288,000 policy rows share policy number with a different legacy key". |
| **Input to paste (Email)** | `R-41 escalated to red: duplicate policy records now block migration dry run two. Sunil Marsh cannot agree the survivorship rule alone; it goes to the Halden governance board on Tuesday. Dry run 2 moves one week and the reconciliation build comes forward so the team keeps moving. Risk rating is now red.` |
| **Expected AI summary** | *Offline:* the first 220 characters; tags `#Mock_Tagged #Risk_Watch`; Impact 0.90. *Live:* "R-41 is now red: duplicate policy records block dry run 2 until the governance board rules on Tuesday; the plan swaps in the reconciliation build." |
| **Expected Smart Append** | **Strong match: both mention R-41** → `demo-lan-r41`. |
| **Expected provenance chain** | RAW RAID Log (Malcolm) → AI → RAW Jira CSV (Walter) → AI → RAW Data Park Dropzone (Malcolm, today) → AI. |
| **Expected evidence strength** | **74% Medium → 85% High.** |
| **Expected Handover outcome** | Stays **Delivery · Open · risk**. The title now says "escalated to red", so the pack's risk list reads as an escalation. |
| **Why judges will find it interesting** | The escalation keeps the full history: what was found, by whom, and the profiling numbers behind it. A RAID log row normally loses all of that. |

### S4 · Financial Milestone Discussion

| | |
|---|---|
| **Persona / project** | Daniel (owner of `demo-mer-po551870`) · Meridian-420 |
| **Business situation** | Milestone 2 (35% of the fixed fee under SoW-BRG-2026-07) is due when 20 stores are live for 10 trading days. Only 14 are live, so the invoice is on hold. Client finance proposes splitting the milestone. |
| **Sample raw inputs (in the dataset)** | *RAW · PO Tracker Excel · Daniel · −6 d:* "PO-551870,SoW-BRG-2026-07,Milestone 2,35%,20 stores live for 10 trading days,14,On hold". *RAW · Outlook Mail · Daniel · −5 d:* "Ada Fenwick (Brackwater finance): could we split milestone 2 so part is invoiced now for the 14 live stores? Needs a contract note." |
| **Input to paste (Email)** | `PO-551870 milestone 2 split agreed in principle: 20% invoiced for 14 live stores. Ada Fenwick will add a contract note; the remaining 15% stays tied to 20 stores live for 10 trading days. Revised PO line expected next week.` |
| **Expected AI summary** | *Offline:* the full text (under 220 characters); tags `#Mock_Tagged #Invoice_Mentioned #Milestone_Tracked`; Impact 0.90. *Live:* "Brackwater agreed in principle to split milestone 2: 20% now for 14 stores, 15% at the full 20-store exit. Contract note and revised PO line to follow." |
| **Expected Smart Append** | **Strong match: both mention PO-551870** → `demo-mer-po551870`. The input deliberately leaves out the SoW ID (DR-3). |
| **Expected provenance chain** | RAW PO Tracker (Daniel) → AI → RAW Outlook (Daniel) → AI → RAW Data Park Dropzone (Daniel, today) → AI. |
| **Expected evidence strength** | **74% Medium → 85% High.** |
| **Expected Handover outcome** | **Finances · Open.** It's "agreed in principle", not signed, so it correctly stays open. |
| **Why judges will find it interesting** | Money conversations usually sit in one person's inbox. Here the contract rule, the client proposal and the agreement sit on one card, and the card correctly stays open until the paperwork arrives. |

### S5 · Resource Transition

| | |
|---|---|
| **Persona / project** | Malcolm (owner of `demo-aql-r57`) · Aquila-310 |
| **Business situation** | Walter moves from Aquila-310 to Beacon-201. He alone knows signing key rotation and offline sync recovery. R-57 records the key-person risk and a three-session pairing plan with the incoming engineer, Joss Amani. |
| **Sample raw inputs (in the dataset)** | *RAW · RAID Log Excel · Malcolm · −14 d:* "Risk R-57 \| Aquila-310 \| Walter moves to Beacon-201 in 2 weeks \| Knowledge held by one person: build signing key rotation, offline sync queue recovery …". *RAW · Outlook Mail · Malcolm · −13 d:* "Resource manager confirms Walter to Beacon-201 from sprint 22; Joss Amani joins … one sprint of overlap." *RAW · Teams Chat · Walter · −12 d:* "things Joss needs from me: signing key rotation (twice a year), offline sync queue recovery (see the runbook), the store listing checklist". |
| **Input to paste (Email)** | `R-57 closed: Joss Amani now runs the offline sync runbook and the key rotation. All 3 pairing sessions are done, including a live signing key rotation walkthrough. Walter moves to Beacon-201 on schedule; Joss is the Aquila-310 contact for the mobile release pipeline. Key-person risk retired.` |
| **Expected AI summary** | *Offline:* the first 220 characters; `#Risk_Watch`; Impact 0.90. *Live:* "Key-person risk R-57 is closed: Joss completed all three pairing sessions and now owns the sync runbook and key rotation." |
| **Expected Smart Append** | **Strong match: both mention R-57** → `demo-aql-r57`. |
| **Expected provenance chain** | RAID (Malcolm) → Outlook (Malcolm) → Teams (Walter) → Data Park Dropzone (Malcolm, today), each followed by its AI node. |
| **Expected evidence strength** | **85% High → 96% High** (4 sources, 4 updates: 55 + 32 + 9). |
| **Expected Handover outcome** | **Operations · Open → Operations · Closed.** |
| **Why judges will find it interesting** | It shows Continuum handling people changes, the most common cause of knowledge loss, and ties back to S7: the runbook Joss learnt from is itself a card. |

### S6 · Architecture Decision Record

| | |
|---|---|
| **Persona / project** | Walter (owner of `demo-bcn-ap4452`) · Beacon-201 |
| **Business situation** | Fraud scoring slows to 9 seconds per claim at month-end, so claim intake times out. ADR-007 compares three options and picks a durable event queue with a dead-letter rule. A week of real numbers then justifies raising the alert threshold. |
| **Sample raw inputs (in the dataset)** | *RAW · Architecture Wiki · Walter · −38 d:* "ADR-007 \| AP-4452 \| Context … Options: (1) synchronous call with longer timeout, (2) durable event queue, (3) nightly scoring \| Decision: option 2 …". *RAW · Jira CSV Export · Malcolm · −36 d:* "BCN-231,Spike: queue throughput at month-end volume,Done,4,800 claims/hour sustained …". *RAW · Teams Chat · Brené · −34 d:* "design authority approved ADR-007 as written, only change is alerting when the dead-letter count passes 20 an hour". Walter also has an "Only me" note: "20 dead letters an hour may page us too often … collect a week of numbers". |
| **Input to paste (Email)** | `AP-4452 ADR-007 amended for release 2: dead-letter alert now 40 an hour, not 20. A week of month-end numbers showed 20 an hour paged the team 11 times with no lost claims. The design authority approved the change; the release 2 checklist is updated. Paging risk is lower.` |
| **Expected AI summary** | *Offline:* the first 220 characters; Impact 0.90. *Live:* "ADR-007 amended: the dead-letter alert threshold rises from 20 to 40 per hour after a week of month-end data showed false pages and no lost claims." |
| **Expected Smart Append** | **Strong match: both mention AP-4452** → `demo-bcn-ap4452`. |
| **Expected provenance chain** | Architecture Wiki (Walter) → Jira (Malcolm) → Teams (Brené) → Data Park Dropzone (Walter, today). |
| **Expected evidence strength** | **85% High → 96% High.** |
| **Expected Handover outcome** | **Delivery · Closed** before and after. It's an approved decision, so it sits in Closed with its reasoning attached. |
| **Why judges will find it interesting** | It follows an idea from a private hunch ("Only me") to a shared, evidence-backed amendment, showing that privacy and team memory work together. |

### S7 · Operational Runbook Recovery

| | |
|---|---|
| **Persona / project** | Walter (owner of `demo-aql-fwreq5102`) · Aquila-310 |
| **Business situation** | A gateway certificate rotation changed the gateway address. Field devices queued 1,900 job updates for 4 hours. Recovery needed an allowlist request (**FW-REQ-5102**) and a six-step drain procedure. The next rotation happens months later, and the runbook is found and reused. |
| **Sample raw inputs (in the dataset)** | *RAW · Teams Chat · Walter · −31 d:* "[06:12] Walter: field devices are queueing, sync workers get connection refused since the certificate rotation at 02:00 [06:40] … raising FW-REQ-5102". *RAW · Runbook Wiki · Walter · −30 d:* "Recovery: (1) confirm the new gateway address, (2) raise FW-REQ-5102 … (4) drain the queue in batches of 200 …". *RAW · Outlook Mail · Malcolm · −29 d:* "Mei Adeyemi (Corrin IT service) confirms all 1,900 job updates arrived and matched the field ops report." |
| **Input to paste (Email)** | `FW-REQ-5102 runbook reused: spring certificate rotation incident resolved fast. Queue drained in 25 min. Steps 1 to 6 followed as written; the new gateway address was allowlisted before the rotation this time, so only 140 job updates queued. Suggest adding a pre-rotation checklist step to cut the repeat risk.` |
| **Expected AI summary** | *Offline:* the first 220 characters; Impact 0.90. *Live:* "The FW-REQ-5102 runbook was reused for the spring rotation: pre-allowlisting cut the queue to 140 updates and recovery took 25 minutes instead of 3h 40m." |
| **Expected Smart Append** | **Strong match: both mention FW-REQ-5102** → `demo-aql-fwreq5102`. |
| **Expected provenance chain** | Teams (Walter) → Runbook Wiki (Walter) → Outlook (Malcolm) → Data Park Dropzone (Walter, today). |
| **Expected evidence strength** | **85% High → 96% High.** |
| **Expected Handover outcome** | **Operations · Closed** before and after. |
| **Why judges will find it interesting** | The number that matters is 3h 40m down to 25 minutes, because the knowledge was findable. This is the return on team memory. |

### S8 · Customer Issue Resolution

| | |
|---|---|
| **Persona / project** | Daniel (owner of `demo-mer-ap3108`) · Meridian-420 |
| **Business situation** | Twelve pilot stores issued 37 refunds twice. The root cause is a checkout retry after a 30-second timeout, with no idempotency key. A hotfix is planned. The client's store director is unhappy. |
| **Sample raw inputs (in the dataset)** | *RAW · Outlook Mail · Daniel · −4 d:* "Colm Hartley (store operations): 12 pilot stores issued 37 refunds twice this week, customers noticed. Logged as AP-3108." *RAW · Jira CSV Export · Walter · −3 d:* "MER-512,Duplicate refund on retry,In progress,Checkout retries after 30s timeout; refund message has no idempotency key". *RAW · Teams Chat · Daniel · −2 d:* "hotfix 4.2.1 adds the idempotency key, store rollout tomorrow night after trading". |
| **Input to paste (Email)** | `AP-3108 resolved: hotfix 4.2.1 is live in 12 pilot stores, no duplicate refunds. All 37 duplicates were reversed. Colm Hartley feedback: store teams are happy with the fix and the CSAT score for the pilot is back to 4.4. No open risk remains on AP-3108.` |
| **Expected AI summary** | *Offline:* the first 220 characters; Impact 0.90. *Live:* "AP-3108 resolved: hotfix 4.2.1 stopped duplicate refunds in all 12 stores, all 37 duplicates reversed, and pilot CSAT recovered to 4.4." |
| **Expected Smart Append** | **Strong match: both mention AP-3108** → `demo-mer-ap3108`. |
| **Expected provenance chain** | Outlook (Daniel) → Jira (Walter) → Teams (Daniel) → Data Park Dropzone (Daniel, today). The whole path from complaint to root cause to fix to feedback is on one card. |
| **Expected evidence strength** | **85% High → 96% High.** |
| **Expected Handover outcome** | **Client Feedback · Open · risk → Client Feedback · Closed.** |
| **Why judges will find it interesting** | It's a real client-facing story told in the client's own words, and the Handover pack shows the loop was closed with the client. |

### S9 · Cross-Team Knowledge Discovery

| | |
|---|---|
| **Persona / project** | Walter · Lantern-202 → Tidewater-150 (archived) |
| **Business situation** | On Lantern-202, claim event times shift by one hour after the clock change. Walter asks: "Has anyone at Halden solved this before?" The Tidewater-150 team (same client, closed 13 months ago) fixed the same problem. |
| **Sample raw inputs (in the dataset)** | *Lantern · RAW · Teams Chat · Walter · −5 d:* "dry run 1 shows claim event times one hour off for everything after the October clock change … the legacy extract writes local time with no offset". *Tidewater · RAW · Runbook Wiki · Walter · −430 d:* "Fix: run the extract with the UTC export option, convert to local time only in the UI". *Tidewater · RAW · Jira · Brené · −431 d:* "TDW-142 … Fix verified on 3 clock-change dates". |
| **Input to paste** | **None, by design.** Discovery is read-only. Walter records the pointer as a **team note** on Lantern ("Add for team"): `Known fix from Tidewater-150: export UTC from the legacy system and convert only on display. See the Tidewater runbook card.` Notes are not checked by the matcher, so nothing can append across projects. |
| **Expected AI summary** | Not applicable. The cards already carry summaries. |
| **Expected Smart Append** | None (DR-6). |
| **Expected provenance chain** | Client 360 → Recurring themes **#Legacy_Batch_Window ×3** and **#Timezone_Shift ×2** → Projects for this client → **Tidewater-150 (Archived)** → Open project → card "Tidewater-150 fix: legacy extract times converted to UTC at source". Contacts shows **Ingrid Vale on 3 projects** as the person to ask. |
| **Expected evidence strength** | Tidewater fix card: **74% Medium** (Runbook Wiki + Jira CSV Export). |
| **Expected Handover outcome** | Tidewater-150: 3 items, all Closed (Internal 1, Delivery 1, Finances 1). The Lantern team note joins Lantern's pack as a Delivery item. |
| **Why judges will find it interesting** | Knowledge moves across teams and survives after a project closes. Nobody had to know that Tidewater existed. |

### S10 · Lessons Learned Reuse

| | |
|---|---|
| **Persona / project** | Brené (owner of `demo-tdw-retro` and `demo-bcn-r72`) · Tidewater-150 → Beacon-201 |
| **Business situation** | Tidewater's retrospective found that headcount promises for UAT testers fell through (8 promised, 3 turned up). Lesson 2: book *named* testers three weeks ahead. Beacon's release 2 faces the same risk (R-72: 4 of 9 booked). Brené applies the lesson and the risk goes green. |
| **Sample raw inputs (in the dataset)** | *Tidewater · RAW · Lessons Log · Brené · −410 d:* "Lesson 2: book named UAT testers 3 weeks ahead …". *RAW · Teams Chat · Malcolm · −411 d:* "retro vote, top pain was UAT: we were promised 8 testers and got 3 in week one". *RAW · Outlook Mail · Daniel · −409 d:* change-request lesson. *Beacon R-72 · RAW · RAID · Brené · −12 d* and *RAW · Outlook · Daniel · −10 d:* "Tomas Reyes … can release 3 more claims handlers from week 2". |
| **Input to paste (Email)** | `R-72 mitigated for release 2 with Tidewater-150 lesson 2: all 9 testers booked. Tomas Reyes released 5 more claims handlers by name, three weeks before the UAT window, exactly as the Tidewater-150 lessons log advised. Risk rating moves from amber to green.` |
| **Expected AI summary** | *Offline:* the first 220 characters; Impact 0.90. *Live:* "R-72 mitigated: all nine named UAT testers are booked three weeks ahead, applying the Tidewater-150 lesson." |
| **Expected Smart Append** | **Strong match: both mention R-72** → `demo-bcn-r72`. The text names Tidewater-150, but that is not a reference ID, so no cross-project match is possible. |
| **Expected provenance chain** | RAID (Brené) → Outlook (Daniel) → Data Park Dropzone (Brené, today). The card text links the lesson back to the Tidewater retrospective card (85% High, 3 sources). |
| **Expected evidence strength** | R-72: **74% Medium → 85% High.** |
| **Expected Handover outcome** | R-72 moves from **Operations · Open · risk** to **Delivery · Open · risk**: the new text mentions "release" and no longer mentions "capacity". It stays a risk item because of its `#Risk_Watch` tag. *Presenter note:* this category change is expected. It's a side effect of keyword categories; don't highlight it. |
| **Why judges will find it interesting** | Lessons learned are usually written once and never read. Here a lesson from a closed project fixes a live risk on another project, with a visible link between the two. |

---

## 5. Client 360 test data

Client 360 is designed to pull together everything contributors have learned about a client across projects. Expected results after reset:

### Halden Mutual Insurance (the showcase client)

| Section | Expected content |
|---|---|
| Stats | **3 projects · 5 contacts · 11 themes · 3 know-how items** (the know-how count assumes the section 7 change; today it shows the 3 hard-coded samples) |
| Know-how and artefacts | This comes from each project's existing `sharepoint_urls` field (section 7, change C-4), so no new schema field is needed: **Beacon-201** "Decision log" → `https://halden-mutual.example/sites/beacon/Decision_Log.xlsx`; **Lantern-202** "Data mapping workbook" → `https://halden-mutual.example/sites/lantern/Data_Mapping.xlsx`; **Tidewater-150** "Lessons log" → `https://halden-mutual.example/sites/tidewater/Lessons_Log.docx`. Links go to `.example` addresses and don't open real sites. |
| Who to contact | **Ingrid Vale** (Head of IT Delivery), *on 3 projects* · **Priya Okafor** (Client Architecture Lead), *on 2 projects* (Beacon, Tidewater) · **Tomas Reyes** (Claims Operations Manager), *on 2 projects* (Beacon, Lantern) · **Sunil Marsh** (Data Governance Lead), Lantern · **Hana Brook** (Policy Systems Product Owner), Tidewater. Each has an email at `halden-mutual.example`. |
| Projects | Beacon-201 (Active) "11 timeline / Data Park assets" · Lantern-202 (Active) "6" · Tidewater-150 (Archived) "3". These counts include cards and notes of all privacy levels, because the counter doesn't filter by privacy. |
| Recurring themes | #Legacy_Batch_Window ×3 · #Decision_Record ×2 · #Invoice_Mentioned ×2 · #Milestone_Tracked ×2 · #Risk_Watch ×2 · #Timezone_Shift ×2 · #Action_Item ×1 · #Client_Feedback ×1 · #Data_Quality ×1 · #Lesson_Applied ×1 · #Lesson_Learned ×1. Sorted by count, then alphabetically. |
| Client domains | `halden-mutual.example`, `halden-claims.example` |

### Corrin Water Utilities

| Section | Expected content |
|---|---|
| Stats | 1 project · 2 contacts · 4 themes |
| Who to contact | Rafe Lindqvist (Field Operations Director) · Mei Adeyemi (IT Service Manager), both `@corrin-water.example` |
| Themes | #Invoice_Mentioned · #Resource_Change · #Risk_Watch · #Runbook (×1 each) |
| Know-how | Aquila-310 "Runbook space" → `https://corrin-water.example/wiki/aquila/runbooks` |

### Brackwater Retail Group

| Section | Expected content |
|---|---|
| Stats | 1 project · 3 contacts · 4 themes |
| Who to contact | Colm Hartley (Store Operations Director) · Ada Fenwick (Finance Business Partner) · Jonas Pike (Retail Platform Owner), all `@brackwater-retail.example` |
| Themes | #Milestone_Tracked ×2 · #Client_Issue · #Invoice_Mentioned · #Risk_Watch |
| Know-how | Meridian-420 "Pilot store rollout plan" → `https://brackwater-retail.example/sites/meridian/Rollout_Plan.xlsx` |

### Client 360 test checklist

| # | Check | Expected |
|---|---|---|
| C360-1 | Reset, then open Client 360 without clicking a project first | Shows **Halden Mutual Insurance** (the default project's client), not an empty "Acme Corp" page. Needs change C-3. |
| C360-2 | Halden contacts | 5 contacts. Ingrid Vale is marked "on 3 projects". |
| C360-3 | Halden themes | #Legacy_Batch_Window ×3 first |
| C360-4 | Open Tidewater-150 from Client 360 | Project opens with the "Archived" label and shows 3 cards |
| C360-5 | Switch client to Corrin Water, then open Client 360 | 1 project, 2 contacts, no Halden data |
| C360-6 | "Only me" cards add no themes | Theme counts are the same for every persona (private cards carry no tags, DR-5) |
| C360-7 | Know-how links | Every link goes to a `.example` address |

---

## 6. Loading and reset

### Recommendation

Add a **separate, versioned demo dataset** and a new reset path. The existing `mockSeed.js` and `resetToSeedData()` stay exactly as they are, because the test harness and the regression checks use them.

| Requirement | How it's met |
|---|---|
| **Separate from existing seed data** | A new module, `js/data/demoDataset.js`, with version tag `hackathon-demo-v1`. `mockSeed.js` is not touched. The stored state carries `dataset: 'hackathon-demo-v1'`, so the active dataset is always visible. |
| **One click** | The Harvester ⚙️ panel button is renamed **"↺ Reset Demo Dataset"**, with the tooltip "Replace all local data with the fictional hackathon dataset". |
| **Recreates the full demonstration state** | The reset writes all five collections (`clients`, `projects`, `timeline`, `notes`, `archived`). Otherwise `readLocal()` would fill any missing collection from `mockSeed`, mixing Acme data back in. It also sets the persona to **Brené**, then reloads the page so the selected project, filters, mode, Client 360 and the review queue all start clean. |
| **Predictable and repeatable** | Fixed IDs, fixed `Project_ReferenceID`s and fixed text. Only dates are computed, as *now minus N days*, so ages read the same on any day. Beacon-201 has the newest `created_at`, so it is always the default project. |
| **Safe to use repeatedly during judging** | The reset is idempotent: it clears and rewrites, and never appends. It **keeps** the API key and model settings (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ANTHROPIC_API_KEY`, `LLM_PROVIDER`, `VECTOR_BASE_URL`). It **clears** leftover in-progress state: `onion_review_queue`, every `onion_review_draft_*` key, `onion_vector_queue`, the legacy keys (`onion_db_storage`, `onion_db_state_v2`, `onion_db`) and `onion_projects` (read by the old v2 loader). A two-step confirm (the button reads "Click again to reset" for 3 seconds) stops accidental resets. |

### Reset sequence (proposed `FailoverDB.resetToDemoDataset()`)

1. Remove `onion_db_state`, the legacy keys, `onion_projects`, `onion_review_queue`, `onion_review_draft_*` and `onion_vector_queue`.
2. `state = buildDemoState(Date.now())`. This turns every `ageDays` into ISO `created_at` / `processed_at` values and node `at` times, and fills in the standard fields: `syncStatus: 'synced'`, `piiStatus: 'Clean'`, `vectorSyncStatus: 'synced'`, and a `timestamp` label for older code paths.
3. Run `ensureTimelineNodes` on each card. This keeps the pre-built nodes and fills in RAW/AI nodes for cards that have none.
4. `writeLocal(state)` (this fires `onion:db-update`), then `localStorage.activePersona = 'Brené'`.
5. The Harvester shows "Demo dataset restored ✅", then calls `location.reload()`.

### First load for a judge who has never opened the app

The app currently loads `mockSeed` (Acme / Apollo) on first boot.

**Recommended:** load the demo dataset on first boot instead, with a one-line switch in `FailoverDB.js` (`const BOOT_DATASET = 'demo'`). This is **your decision** (see section 9, R-1). The harness is unaffected, because its tests call `resetToSeedData()` explicitly.

### Chroma / vector service

The scripted flows never depend on the vector service (section 1).

**Recommended for judging:** run **without** the vector service (`:8006`). This keeps behaviour deterministic.
- The card footer then reads "Vector: ☁️" (waiting to upload) for updated cards. That is honest and needs no explanation.
- If the service must run, `chroma_data` still holds the old Apollo/NovaTech records. Clearing the collection before judging is optional; section 8, step 7 has the steps.

---

## 7. Files to create or modify

Existing files are marked **M** (modify) and new files **C** (create). Risk is the chance of affecting existing behaviour. The M rows are limited to the fixes needed for this dataset, and none of them change Smart Append, similarity, Chroma, storage or approval logic.

| # | File | Kind | Change | Risk |
|---|---|---|---|---|
| C-1 | `static/js/data/demoDataset.js` | **C** | `DEMO_DATASET_VERSION`, the clients, projects, cards and notes from Appendices A and B, and `buildDemoState(now)`. The data is plain JS objects, and only existing field names are used. | None (new file) |
| C-2 | `static/js/core/FailoverDB.js` | M | Add a `resetToDemoDataset()` method and export, plus `BOOT_DATASET`, which chooses the first-boot seed. `resetToSeedData()` is unchanged. | Low |
| C-3 | `static/js/components/App.js` | M | Line 61: `useState('Acme Corp')` → start empty and use the active project's client. Line 84: the new-project account default `'Acme Corp'` → `''`. | Low |
| C-4 | `static/js/components/AppCenter.js` | M | `c360Artefacts` lists the client's projects' `sharepoint_urls` entries (label, link, project). It falls back to the current samples only when none exist; the "Sample content" tag then shows only for the fallback. | Low (display only) |
| C-5 | `static/js/components/HarvesterPanel.js` | M | Button label "↺ Reset Demo Dataset", tooltip, two-step confirm, and a call to `resetToDemoDataset()` followed by reload. `onResetSeed` stays available for the harness. | Low |
| C-6 | `static/js/core/VectorSync.js` | M | Lines 41–44: replace the `'Acme Corp'` / `'Apollo-123'` fallbacks with `''`. Metadata defaults only; no search or scope logic changes. *Optional.* | Very low |
| C-7 | `static/docs/relationship-v5/components/MapView.js` (line 34), `data/story.js`, `data/runtimeModel.js`, `data/domainModel.js` | M | Replace Acme / Apollo / NovaTech / `acme.com` examples with Halden / Beacon-201 / `halden-mutual.example`. Text only. | None |
| C-8 | `static/docs/guide-app/GuideData.js`, `static/docs/Continuum-V4-Final.html`, `static/docs/relationship-v5/lib/integrity.js` | M | Remove the real and trademarked organisation names (McKinsey, Contoso) and use the fictional cast. Text only. | None |
| C-9 | `static/docs/Project-Onion-Data-Model.html`, `static/docs/Project-Onion-Relationship-Model.html`, `static/bookmarklet.js`, `static/js/components/ProjectModal.js` (placeholder text) | M | Same text-only rename. *Optional, but judges may open these.* | None |
| C-10 | `static/index.html` | M | Bump the cache query strings so browsers fetch the new modules through the stale-while-revalidate service worker. | None |
| C-11 | `scratchpad/harness/steps/demo_dataset.js` (or the repo's test location) | **C** | A harness step that resets to the demo dataset, then runs every scenario input and asserts the target card, the evidence before and after, the Handover category and open/closed state, the Key Moments and the Client 360 counts. It turns the numbers in this document into a regression test. | None |
| C-12 | `docs/HACKATHON_DEMO_DATA.md`, `docs/Demo_Walkthrough_Dataset.md` | **C** | These documents. | None |

**Not modified:** `mockSeed.js`, `seedData.v2.js`, `confidence.js`, `matchExplain.js`, `AiClient.js`, `TimelineCard.js`, `HandoverModal.js`, the Smart Append matcher, `VectorSync` search logic, `sw.js`, and the vector service.

---

## 8. Implementation plan

Estimated effort: about half a day, including verification. Each step can be checked on its own.

| Step | What | How to verify |
|---|---|---|
| 1 | Create `demoDataset.js` from Appendices A and B. Make `buildDemoState(now)` pure, with no storage access. | In the console: `buildDemoState(Date.now()).timeline.length === 29`. Every `Project_ReferenceID` resolves to a project. |
| 2 | Add `resetToDemoDataset()` to `FailoverDB.js`, following the sequence in section 6. | After a reset, `JSON.parse(localStorage.onion_db_state).dataset === 'hackathon-demo-v1'`. The API key is still present; the review queue keys are gone. |
| 3 | Rewire the Harvester button (C-5). | Clicking once shows "Click again to reset". Clicking again reloads onto Beacon-201 as Brené. Doing this 5 times in a row gives an identical state (compare `onion_db_state` without the dates). |
| 4 | Fix the Client 360 default and Know-how (C-3, C-4). | Run checks C360-1 to C360-7 (section 5). |
| 5 | Rename the judge-visible text (C-6 to C-9). | `grep -rEi "acme\|apollo-12\|novatech\|mckinsey\|contoso" static --exclude=*.bak` finds only `mockSeed.js` and `seedData.v2.js`. |
| 6 | Add the harness step (C-11), which runs all eight append inputs from section 4 one after another, each starting from a fresh reset. | All assertions pass: exact targets, 74→85 or 85→96, and the Handover transitions in section 4. There are no page errors. |
| 7 | *(Optional)* Clear old Chroma records. Stop the vector service, move `modules/vector-service/chroma_data` aside, and restart so it starts with an empty collection. | `/health` responds OK and `/ask` returns no Apollo records. The folder can be restored afterwards. |
| 8 | Rehearse the walkthrough twice with a timer, then reset. | Under 5:00. Every expected screen in the walkthrough document matches. |

Rollback: the change is additive. Reverting C-2 and C-5 restores the old button. The old seed is never removed.

---

## 9. Recommendations for demo impact

| # | Recommendation | Impact | Effort | Needs your decision? |
|---|---|---|---|---|
| R-1 | **Load the demo dataset on first boot** (`BOOT_DATASET = 'demo'`), so a judge opening the URL never sees Acme / Apollo. | High | 1 line | **Yes.** It changes the default seed; the harness is unaffected. |
| R-2 | **Use a live API key for the walkthrough, if venue Wi-Fi is reliable.** The live summary is noticeably better than the offline "first 220 characters". Offline mode still works end to end, and the engine badge says honestly which engine produced the summary. | High | None | Yes (venue network) |
| R-3 | **Keep the scripted inputs in a text file** open beside the browser (the code blocks in the walkthrough document) and copy-paste them. Never type live. | Medium | None | No |
| R-4 | **Tick only Beacon-201 before "Handover to Project Memory".** Every ticked project gets its own note, and the HTML report includes the presenter's own "Only me" cards from other projects. | Medium (avoids clutter and exposure) | None | No |
| R-5 | *(Optional, small)* Make the Client 360 theme chips open the matching cards across projects. This makes S9 a one-click discovery. It is display only, but it is new UI, so it belongs in the backlog unless there's time. | Medium | Small | Yes |
| R-6 | *(Optional)* Take the staged title from the input's **first line**, not the first 80 characters. The dataset doesn't need this, because every headline is tuned to 80 characters, but it helps any unscripted paste. **Warning:** the title also feeds the matcher's title-overlap score, so this touches Smart Append input. Leave it out before the demo. | Low | Small | Yes, recommend **not** before the demo |
| R-7 | Say out loud that **cards loaded from the dataset carry prepared summaries**, and that only the pasted update is summarised live. If a judge inspects the data, the dataset is labelled `hackathon-demo-v1` and the fictional names are obvious. | High (trust) | None | No |

---

## 10. Known limits avoided

Each of these is a real limit in the current build. The dataset and script are designed so none of them appears on stage. They are listed so presenters can answer honestly if asked.

| Limit | Where | How the demo avoids it |
|---|---|---|
| Word-overlap matching ("2 shared keywords") links unrelated cards | `HarvesterPanel.js:110-114` | Every input carries one unique reference ID (DR-1, DR-3) |
| The matcher also checks other people's "Only me" cards | `HarvesterPanel.js:70` | "Only me" cards contain no IDs (DR-5) |
| The Chroma query is scoped by project name and persona, and holds old records | `VectorSync.js:130-160` | The vector search is never reached: the ID match returns first |
| ~~The staged title is visible to other personas before sharing~~ **Fixed:** staging no longer changes the title or summary, and drafts, banners and the Share button show only to the draft's author | `FailoverDB.appendStaged`, `TimelineCard.js` | Switching persona at any point is now safe |
| ~~"Share update with team" stays visible after sharing (SA-4)~~ **Fixed:** the button shows only while the viewer has a draft on the card | `TimelineCard.js` | None needed |
| Pasting the same input twice after sharing adds a duplicate update | `FailoverDB.pushNode` dedup covers staged nodes only | Paste each input once; reset between rehearsals |
| Only the owner can share a draft update | `TimelineCard.js:684` | Every input is pasted by the target card's owner (DR-4) |
| The evidence tier can't show "Low" (minimum 63%) | `confidence.js` | We show Medium → High and don't claim a Low example |
| Handover categories are keyword-based | `HandoverModal.js:19-28` | Word hygiene (DR-7). The one visible category change (S10) is flagged for presenters. |
| "Only me" cards count towards Client 360 themes | `AppCenter.js:55` | "Only me" cards carry no tags (DR-5) |

---

## Appendix A: full card catalogue

Ages are days before reset. The evidence figures are those computed at reset. Handover shows the category and open/closed state for each card, and whether it counts as a risk. Nodes marked RAW are the stored original texts; AI nodes are prepared summaries (see R-7).

Team notes (the `notes` collection):
- `demo-note-bcn-1`: Beacon-201 · Malcolm · Team · age 2 · "New joiners: start with the two Decision Record cards (claim status sync and fraud scoring queue), then the release 2 status card." (Handover: Delivery · Open)
- `demo-note-lan-1`: Lantern-202 · Brené · Only me · age 1 · "Raise the duplicate policy records with Ingrid at the next steering group if the rule is not agreed by Friday."

### Beacon-201 (Halden Mutual Insurance)

| Card ID | Owner | Privacy | Source | Age (days) | Impact | Tags | Evidence at reset | Handover |
|---|---|---|---|---|---|---|---|---|
| `demo-bcn-ap4410` | Brené | Team | RAID Log Excel | 148 | 0.88 | #Decision_Record #Legacy_Batch_Window | 74% Medium (2 sources, 2 RAW) | Delivery · Open |
| `demo-bcn-ap4452` | Walter | Team | Architecture Wiki | 38 | 0.86 | #Decision_Record | 85% High (3 sources, 3 RAW) | Delivery · Closed |
| `demo-bcn-r72` | Brené | Team | RAID Log Excel | 12 | 0.84 | #Risk_Watch #Lesson_Applied | 74% Medium (2 sources, 2 RAW) | Operations · Open · risk |
| `demo-bcn-po448120` | Daniel | Team | PO Tracker Excel | 9 | 0.82 | #Invoice_Mentioned #Milestone_Tracked | 63% Medium (1 source, 1 RAW) | Finances · Open |
| `demo-bcn-status` | Malcolm | Team | GDP Status | 3 | 0.80 | #Milestone_Tracked | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-bcn-demo-fb` | Brené | Team | Outlook Mail | 6 | 0.62 | #Client_Feedback | 63% Medium (1 source, 1 RAW) | Client Feedback · Open |
| `demo-bcn-onboard` | Malcolm | Team | Teams Chat | 2 | 0.55 | #Action_Item | 63% Medium (1 source, 1 RAW) | Internal · Open |
| `demo-bcn-routine-1` | Brené | Team | Outlook Mail | 1 | 0.30 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-bcn-routine-2` | Daniel | Team | Outlook Mail | 1 | 0.25 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-bcn-walter-note` | Walter | Only me | Teams Chat | 2 | 0.60 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |

**`demo-bcn-ap4410`: AP-4410 Decision: nightly batch sync for claim status, not real-time**

- Card text (`content`): Decision D-09 | AP-4410 | Beacon-201 | Claim status sync = nightly batch (01:00-04:00) plus a 07:00 delta file | Why: the core policy system caps reads at 200 requests/min and has no change window this year | Revisit trigger: vendor API upgrade | Owner Brené
- Stored AI summary (`synthesizedText`): Claim status syncs by nightly batch because the core policy system caps reads at 200 requests a minute; revisit when the vendor API upgrade lands.
- Timeline nodes (oldest first):
  - RAW · Teams Chat · Walter · day -150: [16:05] Walter: the core policy system only allows bulk reads 01:00-04:00, real-time polling would hit their 200 requests/min cap within minutes [16:07] Walter: nightly batch plus a 07:00 delta keeps claim status under 12h old, and the claims team said that works for now [16:09] Brené: logging it as AP-4410 so we keep the why
  - AI · day -150: Real-time polling would exceed the core policy system read cap; the team chose nightly batch plus a morning delta, keeping claim status under 12 hours old.
  - RAW · RAID Log Excel · Malcolm · day -148: Decision D-09 | AP-4410 | Beacon-201 | Claim status sync = nightly batch (01:00-04:00) plus a 07:00 delta file | Why: the core policy system caps reads at 200 requests/min and has no change window this year | Revisit trigger: vendor API upgrade | Owner Brené
  - AI · day -148: Decision log entry D-09 records nightly batch for claim status, the read-cap reason, and the trigger to revisit it.

**`demo-bcn-ap4452`: AP-4452 ADR-007: event queue between claims intake and fraud scoring**

- Card text (`content`): ADR-007 | AP-4452 | Context: fraud scoring slows to 9s per claim at month-end peaks and intake times out | Options: (1) synchronous call with longer timeout, (2) durable event queue, (3) nightly scoring | Decision: option 2, durable event queue with a 3-retry dead-letter rule | Consequences: scoring becomes eventually consistent, typically under 2 minutes | Needed for release 2 | Approved by the Halden design authority
- Stored AI summary (`synthesizedText`): ADR-007 puts a durable event queue between claims intake and fraud scoring so intake keeps accepting claims when scoring slows; approved by the Halden design authority.
- Timeline nodes (oldest first):
  - RAW · Architecture Wiki · Walter · day -38: ADR-007 | AP-4452 | Context: fraud scoring slows to 9s per claim at month-end peaks and intake times out | Options: (1) synchronous call with longer timeout, (2) durable event queue, (3) nightly scoring | Decision: option 2 with a 3-retry dead-letter rule
  - AI · day -38: ADR-007 compares three integration options and picks a durable event queue with a dead-letter rule.
  - RAW · Jira CSV Export · Malcolm · day -36: Issue Key,Summary,Status,Result // BCN-231,Spike: queue throughput at month-end volume,Done,4,800 claims/hour sustained with scoring lag under 2 minutes // Linked decision AP-4452
  - AI · day -36: The spike showed the queue sustains month-end volume with under 2 minutes of scoring lag.
  - RAW · Teams Chat · Brené · day -34: [11:20] Walter: design authority approved ADR-007 as written, only change is alerting when the dead-letter count passes 20 an hour [11:22] Malcolm: added the alert to the release 2 checklist
  - AI · day -34: The Halden design authority approved ADR-007 with one addition: a dead-letter alert threshold.

**`demo-bcn-r72`: R-72 Risk: only 4 of 9 Halden UAT testers booked for release 2**

- Card text (`content`): Risk R-72 | Beacon-201 | Release 2 UAT starts in 3 weeks and needs 9 claims testers; 4 are booked by name, claims team capacity is tight at month-end | Impact: UAT window slips a week per missing pair | Mitigation: Tidewater-150 lesson 2, book named testers 3 weeks ahead, ask Tomas Reyes to release 5 more | Owner Brené
- Stored AI summary (`synthesizedText`): Release 2 UAT needs 9 claims testers; 4 are booked. Mitigation reuses Tidewater-150 lesson 2: book named testers 3 weeks ahead.
- Timeline nodes (oldest first):
  - RAW · RAID Log Excel · Brené · day -12: Risk R-72 | Beacon-201 | Release 2 UAT starts in 3 weeks and needs 9 claims testers; 4 are booked by name | Mitigation: Tidewater-150 lesson 2, book named testers 3 weeks ahead
  - AI · day -12: Only 4 of 9 UAT testers are booked; the mitigation reuses a Tidewater-150 lesson.
  - RAW · Outlook Mail · Daniel · day -10: Subject: Release 2 UAT testers // Tomas Reyes replied: he can release 3 more claims handlers from week 2, the last 2 depend on month-end volumes. Daniel
  - AI · day -10: Claims operations can add 3 testers from week 2; 2 more depend on month-end volumes.

**`demo-bcn-po448120`: PO-448120 release 2 invoice: 30% of Beacon-201 fixed fee due on UAT exit**

- Card text (`content`): PO Number,Milestone,Share of fee,Trigger,Status // PO-448120,Release 2,30%,UAT exit report accepted by Halden,Not yet due // Note: the tester gap on the RAID log would push this invoice by a week per missing pair
- Stored AI summary (`synthesizedText`): The release 2 invoice (30% of the fixed fee) can be raised only after UAT exit, so the UAT tester gap is also a cash-flow item.
- Timeline nodes (oldest first):
  - RAW · PO Tracker Excel · Daniel · day -9: PO Number,Milestone,Share of fee,Trigger,Status // PO-448120,Release 2,30%,UAT exit report accepted by Halden,Not yet due
  - AI · day -9: Release 2 invoice is 30% of the fee and is triggered by UAT exit.

**`demo-bcn-status`: Beacon-201 release 2 status: amber, 3 of 5 features in UAT readiness**

- Card text (`content`): GDP status | Beacon-201 | Release 2 amber | Features ready for UAT: claim intake v2, document upload, status notifications | Waiting: fraud scoring alerting, adjuster workload view | Next checkpoint: steering group Thursday
- Stored AI summary (`synthesizedText`): Release 2 is amber: 3 of 5 features are ready for UAT; the other 2 wait on the fraud scoring queue alert and tester bookings.
- Timeline nodes (oldest first):
  - RAW · GDP Status · Malcolm · day -3: GDP status | Beacon-201 | Release 2 amber | Features ready for UAT: claim intake v2, document upload, status notifications | Waiting: fraud scoring alerting, adjuster workload view
  - AI · day -3: Release 2 is amber with 3 of 5 features ready for UAT.

**`demo-bcn-demo-fb`: Sprint 9 demo feedback from the Halden claims team: positive, 2 change asks**

- Card text (`content`): Subject: Sprint 9 demo feedback // Tomas Reyes: the claims team liked the new intake flow and the status notifications. Two asks: bulk document upload for large claims, and a clearer rejection reason on screen. Brené to size both.
- Stored AI summary (`synthesizedText`): Claims team liked the new intake flow; they asked for bulk document upload and a clearer rejection reason.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-bcn-onboard`: Action item: refresh the Beacon-201 onboarding pack before the new lead joins**

- Card text (`content`): [10:02] Malcolm: action item for this week, refresh the Beacon-201 onboarding pack: link the two decision records, the release 2 plan and the Halden contacts list [10:04] Brené: yes, the new delivery lead starts in 2 weeks
- Stored AI summary (`synthesizedText`): The onboarding pack must point new joiners to the two decision records and the release 2 plan.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-bcn-routine-1`: Halden steering group moved to Thursday 10:00**

- Card text (`content`): Calendar update: Halden steering group moved to Thursday 10:00, same agenda.
- Stored AI summary (`synthesizedText`): Steering group moved to Thursday.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-bcn-routine-2`: FYI: Halden timesheet portal closes Friday 17:00**

- Card text (`content`): FYI from the Halden vendor desk: the timesheet portal closes Friday 17:00.
- Stored AI summary (`synthesizedText`): Timesheet portal closes Friday.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-bcn-walter-note`: Note to self: dead-letter alert threshold feels low**

- Card text (`content`): Note to self: 20 dead letters an hour may page us too often in month-end peaks. Collect a week of numbers before suggesting a change.
- Stored AI summary (`synthesizedText`): Walter thinks 20 dead letters an hour may be too sensitive; wants a week of data before raising it.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

### Lantern-202 (Halden Mutual Insurance)

| Card ID | Owner | Privacy | Source | Age (days) | Impact | Tags | Evidence at reset | Handover |
|---|---|---|---|---|---|---|---|---|
| `demo-lan-r41` | Malcolm | Team | RAID Log Excel | 9 | 0.87 | #Risk_Watch #Data_Quality | 74% Medium (2 sources, 2 RAW) | Delivery · Open · risk |
| `demo-lan-tz` | Walter | Team | Teams Chat | 5 | 0.78 | #Timezone_Shift #Legacy_Batch_Window | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-lan-routine` | Brené | Team | GDP Status | 4 | 0.30 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-lan-brene-note` | Brené | Only me | Teams Chat | 3 | 0.60 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-lan-malcolm-note` | Malcolm | Only me | Teams Chat | 2 | 0.60 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |

**`demo-lan-r41`: R-41 Risk: 3.2% duplicate policy records in the claims history extract**

- Card text (`content`): Risk R-41 | Lantern-202 | 3.2% of policy records in the claims history extract are duplicates (same policy, different legacy keys) | Impact: migrated claims could attach to the wrong policy | Mitigation: agree a survivorship rule with Sunil Marsh (data governance) before dry run 2 | Owner Malcolm | Rating amber
- Stored AI summary (`synthesizedText`): Profiling found 3.2% duplicate policy records in the claims history extract; the migration dry run needs a de-duplication rule agreed with Halden data governance.
- Timeline nodes (oldest first):
  - RAW · RAID Log Excel · Malcolm · day -9: Risk R-41 | Lantern-202 | 3.2% of policy records in the claims history extract are duplicates | Mitigation: agree a survivorship rule with data governance before dry run 2 | Rating amber
  - AI · day -9: Duplicate policy records could attach migrated claims to the wrong policy.
  - RAW · Jira CSV Export · Walter · day -7: Issue Key,Summary,Status,Finding // LAN-88,Profile claims history extract,Done,41,200 of 1,288,000 policy rows share policy number with a different legacy key
  - AI · day -7: Profiling ticket LAN-88 confirms about 41 thousand duplicate policy rows.

**`demo-lan-tz`: Lantern-202: legacy extract timestamps shift by one hour after the clock change**

- Card text (`content`): [14:30] Walter: dry run 1 shows claim event times one hour off for everything after the October clock change [14:33] Walter: the legacy extract writes local time with no offset. Has anyone at Halden solved this before?
- Stored AI summary (`synthesizedText`): Claims history timestamps from the legacy extract move by one hour for records around the clock change; the team is looking for a known fix.
- Timeline nodes (oldest first):
  - RAW · Teams Chat · Walter · day -5: [14:30] Walter: dry run 1 shows claim event times one hour off for everything after the October clock change [14:33] Walter: the legacy extract writes local time with no offset
  - AI · day -5: Legacy extract writes local time without an offset, so times shift by an hour after the clock change.

**`demo-lan-routine`: Lantern-202 weekly update: data mapping on track**

- Card text (`content`): Weekly update: data mapping workstream on track, nothing new to raise.
- Stored AI summary (`synthesizedText`): Data mapping on track.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-lan-brene-note`: Note to self: who owns data governance decisions at Halden?**

- Card text (`content`): Note to self: check with Ingrid Vale whether Sunil Marsh can agree the survivorship rule alone or needs the governance board.
- Stored AI summary (`synthesizedText`): Brené wants to confirm who can agree the survivorship rule before escalating.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-lan-malcolm-note`: Note to self: re-sequence the dry runs if the rule is late**

- Card text (`content`): Note to self: if the survivorship rule is late, swap dry run 2 with the reconciliation build so the team keeps moving.
- Stored AI summary (`synthesizedText`): Malcolm is considering swapping dry run 2 and the reconciliation build.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

### Tidewater-150 (Halden Mutual Insurance)

| Card ID | Owner | Privacy | Source | Age (days) | Impact | Tags | Evidence at reset | Handover |
|---|---|---|---|---|---|---|---|---|
| `demo-tdw-retro` | Brené | Team | Lessons Log | 410 | 0.83 | #Lesson_Learned | 85% High (3 sources, 3 RAW) | Internal · Closed |
| `demo-tdw-utc` | Walter | Team | Runbook Wiki | 430 | 0.80 | #Timezone_Shift #Legacy_Batch_Window | 74% Medium (2 sources, 2 RAW) | Delivery · Closed |
| `demo-tdw-final` | Daniel | Team | PO Tracker Excel | 380 | 0.70 | #Invoice_Mentioned | 63% Medium (1 source, 1 RAW) | Finances · Closed |

**`demo-tdw-retro`: Tidewater-150 retrospective: 5 lessons for future Halden deliveries**

- Card text (`content`): Retrospective | Tidewater-150 | Lesson 1: performance test with production-size data, not samples | Lesson 2: book named UAT testers 3 weeks ahead, headcount promises fell through | Lesson 3: agree the change request route before sprint 1 | Lesson 4: legacy extracts use local time, convert at source | Lesson 5: keep one Halden decision log | Project closed
- Stored AI summary (`synthesizedText`): Five lessons from the policy portal rebuild, including booking named UAT testers 3 weeks ahead and testing with production-size data.
- Timeline nodes (oldest first):
  - RAW · Lessons Log · Brené · day -410: Retrospective | Tidewater-150 | Lesson 1: performance test with production-size data | Lesson 2: book named UAT testers 3 weeks ahead | Lesson 3: agree the change request route before sprint 1 | Lesson 4: legacy extracts use local time, convert at source | Lesson 5: keep one decision log
  - AI · day -410: Five reusable lessons from the Tidewater-150 retrospective.
  - RAW · Teams Chat · Malcolm · day -411: [15:00] Malcolm: retro vote, top pain was UAT: we were promised 8 testers and got 3 in week one [15:02] Malcolm: second was the performance test on 5% sample data
  - AI · day -411: The team ranked UAT tester no-shows and sample-data performance tests as the top pains.
  - RAW · Outlook Mail · Daniel · day -409: Subject: Tidewater-150 commercial lessons // Change requests raised mid-sprint took 3 weeks to agree. Next time agree the change request route and approvers before sprint 1. Daniel
  - AI · day -409: Change requests were slow because the route was agreed late.

**`demo-tdw-utc`: Tidewater-150 fix: legacy extract times converted to UTC at source**

- Card text (`content`): Runbook | Tidewater-150 | Symptom: policy event times one hour off after the clock change | Cause: legacy extract writes local time with no offset | Fix: run the extract with the UTC export option, convert to local time only in the UI | Resolved in sprint 6
- Stored AI summary (`synthesizedText`): The one-hour shift after clock changes was fixed by exporting UTC from the legacy system and converting to local time only on display.
- Timeline nodes (oldest first):
  - RAW · Runbook Wiki · Walter · day -430: Symptom: policy event times one hour off after the clock change | Cause: legacy extract writes local time with no offset | Fix: run the extract with the UTC export option, convert to local time only in the UI
  - AI · day -430: Export UTC from the legacy system and convert only on display.
  - RAW · Jira CSV Export · Brené · day -431: Issue Key,Summary,Status // TDW-142,Event times shift one hour after clock change,Done // Fix verified on 3 clock-change dates
  - AI · day -431: Ticket TDW-142 verified the fix on three clock-change dates.

**`demo-tdw-final`: PO-390077 final Tidewater-150 invoice paid; project closed**

- Card text (`content`): PO Number,Milestone,Status // PO-390077,Final acceptance,Paid // Tidewater-150 closed after final acceptance.
- Stored AI summary (`synthesizedText`): The last milestone invoice was paid and the engagement was formally closed.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

### Aquila-310 (Corrin Water Utilities)

| Card ID | Owner | Privacy | Source | Age (days) | Impact | Tags | Evidence at reset | Handover |
|---|---|---|---|---|---|---|---|---|
| `demo-aql-r57` | Malcolm | Team | RAID Log Excel | 14 | 0.85 | #Risk_Watch #Resource_Change | 85% High (3 sources, 3 RAW) | Operations · Open · risk |
| `demo-aql-fwreq5102` | Walter | Team | Runbook Wiki | 30 | 0.83 | #Runbook | 85% High (3 sources, 3 RAW) | Operations · Closed |
| `demo-aql-cr12` | Daniel | Team | Outlook Mail | 8 | 0.64 | #Invoice_Mentioned | 63% Medium (1 source, 1 RAW) | Finances · Open |
| `demo-aql-routine` | Daniel | Team | Outlook Mail | 2 | 0.30 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-aql-walter-note` | Walter | Only me | Teams Chat | 11 | 0.60 | — | 63% Medium (1 source, 1 RAW) | Operations · Open |
| `demo-aql-malcolm-note` | Malcolm | Only me | Teams Chat | 10 | 0.60 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |

**`demo-aql-r57`: R-57 Key-person risk: Walter rolls off Aquila-310 in 2 weeks**

- Card text (`content`): Risk R-57 | Aquila-310 | Walter moves to Beacon-201 in 2 weeks | Knowledge held by one person: build signing key rotation, offline sync queue recovery | Mitigation: 3 pairing sessions with Joss Amani plus a runbook walkthrough | Resource change confirmed by the resource manager | Owner Malcolm
- Stored AI summary (`synthesizedText`): Walter moves to Beacon-201 in 2 weeks; mobile release pipeline and offline sync knowledge must pass to Joss Amani through 3 pairing sessions and a runbook walkthrough.
- Timeline nodes (oldest first):
  - RAW · RAID Log Excel · Malcolm · day -14: Risk R-57 | Aquila-310 | Walter moves to Beacon-201 in 2 weeks | Knowledge held by one person: build signing key rotation, offline sync queue recovery | Mitigation: 3 pairing sessions with Joss Amani
  - AI · day -14: Key-person risk logged with a pairing plan for the incoming engineer.
  - RAW · Outlook Mail · Malcolm · day -13: Subject: Aquila-310 allocation change // Resource manager confirms Walter to Beacon-201 from sprint 22; Joss Amani joins Aquila-310 full time from sprint 21, one sprint of overlap.
  - AI · day -13: Allocation change confirmed with one sprint of overlap.
  - RAW · Teams Chat · Walter · day -12: [09:15] Walter: things Joss needs from me: signing key rotation (twice a year), offline sync queue recovery (see the runbook), the store listing checklist [09:16] Walter: the runbook covers the queue, the signing keys need a live session
  - AI · day -12: Walter listed the three knowledge areas to hand over.

**`demo-aql-fwreq5102`: FW-REQ-5102 runbook: recover the offline sync queue after certificate rotation**

- Card text (`content`): Runbook | Aquila-310 | Incident: gateway certificate rotation changed the gateway address; field devices queued 1,900 job updates for 4 hours | Recovery: (1) confirm the new gateway address, (2) raise FW-REQ-5102 to allowlist it, (3) restart the sync workers, (4) drain the queue in batches of 200, (5) check job counts against the field ops report, (6) tell field supervisors | Incident resolved in 3h 40m
- Stored AI summary (`synthesizedText`): After the gateway certificate rotation, field devices queued 1,900 job updates; recovery is to allowlist the new gateway address under FW-REQ-5102 and drain the queue in batches of 200.
- Timeline nodes (oldest first):
  - RAW · Teams Chat · Walter · day -31: [06:12] Walter: field devices are queueing, sync workers get connection refused since the certificate rotation at 02:00 [06:40] Walter: new gateway address is not on the allowlist, raising FW-REQ-5102
  - AI · day -31: Sync stopped because the rotated gateway address was not allowlisted.
  - RAW · Runbook Wiki · Walter · day -30: Recovery: (1) confirm the new gateway address, (2) raise FW-REQ-5102 to allowlist it, (3) restart the sync workers, (4) drain the queue in batches of 200, (5) check job counts against the field ops report, (6) tell field supervisors
  - AI · day -30: Six-step recovery procedure recorded.
  - RAW · Outlook Mail · Malcolm · day -29: Subject: Aquila-310 sync incident closed // Mei Adeyemi (Corrin IT service) confirms all 1,900 job updates arrived and matched the field ops report. Malcolm
  - AI · day -29: Client IT confirmed every queued job update arrived.

**`demo-aql-cr12`: Aquila-310 change request CR-12: cost estimate for offline maps sent to Corrin**

- Card text (`content`): Subject: CR-12 offline maps // Cost estimate sent to Rafe Lindqvist: 3 sprints, fixed price, starts after the current release. Waiting for Corrin to choose a start sprint.
- Stored AI summary (`synthesizedText`): Daniel sent Corrin a cost estimate for offline maps (CR-12): 3 sprints, fixed price.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-aql-routine`: Aquila-310 device inventory export received**

- Card text (`content`): Corrin sent the monthly device inventory export, filed with the project documents.
- Stored AI summary (`synthesizedText`): Device inventory export received.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-aql-walter-note`: Note to self: signing key steps nobody else has run**

- Card text (`content`): Note to self: walk Joss through the signing key rotation live, the vault approval step is not written down anywhere yet.
- Stored AI summary (`synthesizedText`): Walter lists the signing key steps to walk Joss through live.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-aql-malcolm-note`: Note to self: sprint 22 load once Walter moves**

- Card text (`content`): Note to self: plan sprint 22 one story lighter while Joss settles in.
- Stored AI summary (`synthesizedText`): Malcolm plans to cut sprint 22 scope by one story.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

### Meridian-420 (Brackwater Retail Group)

| Card ID | Owner | Privacy | Source | Age (days) | Impact | Tags | Evidence at reset | Handover |
|---|---|---|---|---|---|---|---|---|
| `demo-mer-po551870` | Daniel | Team | PO Tracker Excel | 6 | 0.89 | #Invoice_Mentioned #Milestone_Tracked | 74% Medium (2 sources, 2 RAW) | Finances · Open |
| `demo-mer-ap3108` | Daniel | Team | Outlook Mail | 4 | 0.90 | #Client_Issue #Risk_Watch | 85% High (3 sources, 3 RAW) | Client Feedback · Open · risk |
| `demo-mer-wave2` | Walter | Team | GDP Status | 3 | 0.72 | #Milestone_Tracked | 63% Medium (1 source, 1 RAW) | Delivery · Open |
| `demo-mer-routine` | Malcolm | Team | Teams Chat | 1 | 0.25 | — | 63% Medium (1 source, 1 RAW) | Internal · Open |
| `demo-mer-daniel-note` | Daniel | Only me | Outlook Mail | 5 | 0.60 | — | 63% Medium (1 source, 1 RAW) | Delivery · Open |

**`demo-mer-po551870`: PO-551870 milestone 2 invoice on hold: store pilot exit not reached**

- Card text (`content`): PO Number,Contract,Milestone,Share of fee,Exit rule,Stores live,Status // PO-551870,SoW-BRG-2026-07,Milestone 2,35%,20 stores live for 10 trading days,14,On hold // Ada Fenwick asked whether the milestone can be split
- Stored AI summary (`synthesizedText`): Milestone 2 (35% of the fixed fee) is due at pilot exit: 20 stores live for 10 trading days. 14 stores are live, so the invoice is on hold.
- Timeline nodes (oldest first):
  - RAW · PO Tracker Excel · Daniel · day -6: PO Number,Contract,Milestone,Share of fee,Exit rule,Stores live,Status // PO-551870,SoW-BRG-2026-07,Milestone 2,35%,20 stores live for 10 trading days,14,On hold
  - AI · day -6: Milestone 2 invoice is on hold at 14 of 20 pilot stores.
  - RAW · Outlook Mail · Daniel · day -5: Subject: Milestone 2 timing // Ada Fenwick (Brackwater finance): could we split milestone 2 so part is invoiced now for the 14 live stores? Needs a contract note. Daniel
  - AI · day -5: Client finance proposed splitting the milestone.

**`demo-mer-ap3108`: AP-3108 Client issue: duplicate refunds at 12 pilot store checkouts**

- Card text (`content`): Subject: Duplicate refunds at pilot stores // Client feedback from Colm Hartley (stores director): 12 pilot stores issued 37 refunds twice this week, customers noticed. Logged as AP-3108. Root cause: checkout retries a refund after a 30s timeout and the message has no idempotency key. Hotfix 4.2.1 planned
- Stored AI summary (`synthesizedText`): Twelve pilot stores issued some refunds twice; root cause is a retry after a 30-second timeout without an idempotency key. Hotfix planned.
- Timeline nodes (oldest first):
  - RAW · Outlook Mail · Daniel · day -4: Subject: Duplicate refunds at pilot stores // Colm Hartley (store operations): 12 pilot stores issued 37 refunds twice this week, customers noticed. Logged as AP-3108.
  - AI · day -4: Store operations reported 37 duplicate refunds across 12 pilot stores.
  - RAW · Jira CSV Export · Walter · day -3: Issue Key,Summary,Status,Root cause // MER-512,Duplicate refund on retry,In progress,Checkout retries after 30s timeout; refund message has no idempotency key // Linked AP-3108
  - AI · day -3: Root cause is a retry without an idempotency key.
  - RAW · Teams Chat · Daniel · day -2: [17:10] Malcolm: hotfix 4.2.1 adds the idempotency key, store rollout tomorrow night after trading [17:12] Daniel: I will tell Colm and ask finance to reverse the 37 duplicates
  - AI · day -2: Hotfix 4.2.1 scheduled; duplicates to be reversed.

**`demo-mer-wave2`: Meridian-420 store rollout wave 2: 6 stores next week**

- Card text (`content`): GDP status | Meridian-420 | Rollout wave 2: 6 stores next week after trading hours | Pilot total after wave 2: 20 stores | Dependency: hotfix 4.2.1 live first
- Stored AI summary (`synthesizedText`): Wave 2 adds 6 stores next week, taking the pilot to 20 stores.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-mer-routine`: Meridian-420 daily standup: nothing new to raise**

- Card text (`content`): Daily standup, nothing new to raise.
- Stored AI summary (`synthesizedText`): Standup, nothing new.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

**`demo-mer-daniel-note`: Note to self: margin check before offering a milestone split**

- Card text (`content`): Note to self: check the margin impact of invoicing 20% now and 15% later before I reply to Ada.
- Stored AI summary (`synthesizedText`): Daniel wants to check margin impact before replying on the split.
- Timeline nodes: none stored; the app builds one RAW and one AI node from the card text at load.

---

## Appendix B: project and client records

All values are fictional. Field names are the existing schema fields (`.clinerules` rule_4: no invented fields). `ageDays` is loader input only: `buildDemoState` converts it to `created_at` and does not store it. Project `created_at` ages are chosen so Beacon-201 sorts first and becomes the default project.

### Clients (`clients[]`)

| account_name | project (primary) | opportunity_id | keywords | domains |
|---|---|---|---|---|
| Halden Mutual Insurance | Beacon-201 | O-730201 | claims, policy, UAT | halden-mutual.example, halden-claims.example |
| Corrin Water Utilities | Aquila-310 | O-731310 | field, sync, mobile | corrin-water.example |
| Brackwater Retail Group | Meridian-420 | O-732420 | checkout, pilot, stores | brackwater-retail.example |

### Projects (`projects[]`)

| project_name | Project_ReferenceID (fixed) | client_name | opportunity_numbers | project_ids | active | created (days ago) | gdp_url |
|---|---|---|---|---|---|---|---|
| Beacon-201 | `Beacon-O-730201-010326090000` | Halden Mutual Insurance | O-730201 | 7302010 | true | 180 | `https://gdp.example/dashboard/project-details/7302` |
| Lantern-202 | `Lantern-O-730202-150226090000` | Halden Mutual Insurance | O-730202 | 7302020 | true | 200 | `https://gdp.example/dashboard/project-details/7303` |
| Meridian-420 | `Meridian-O-732420-050226090000` | Brackwater Retail Group | O-732420 | 7324200 | true | 210 | `https://gdp.example/dashboard/project-details/7324` |
| Aquila-310 | `Aquila-O-731310-021125090000` | Corrin Water Utilities | O-731310 | 7313100 | true | 300 | `https://gdp.example/dashboard/project-details/7313` |
| Tidewater-150 | `Tidewater-O-730150-100525090000` | Halden Mutual Insurance | O-730150 | 7301500 | false | 500 | `https://gdp.example/dashboard/project-details/7301` |

The `Project_ReferenceID` values use the existing format `Prefix-Opp-DDMMYYHHMMSS`. They are fixed strings, so they don't change between resets.

### Contacts (`projects[].contacts`, `group: 'Client'`)

| Project | name | role | email |
|---|---|---|---|
| Beacon-201 | Priya Okafor | Client Architecture Lead | p.okafor@halden-mutual.example |
| Beacon-201 | Tomas Reyes | Claims Operations Manager | t.reyes@halden-mutual.example |
| Beacon-201 | Ingrid Vale | Head of IT Delivery | i.vale@halden-mutual.example |
| Lantern-202 | Ingrid Vale | Head of IT Delivery | i.vale@halden-mutual.example |
| Lantern-202 | Sunil Marsh | Data Governance Lead | s.marsh@halden-mutual.example |
| Lantern-202 | Tomas Reyes | Claims Operations Manager | t.reyes@halden-mutual.example |
| Tidewater-150 | Ingrid Vale | Head of IT Delivery | i.vale@halden-mutual.example |
| Tidewater-150 | Priya Okafor | Client Architecture Lead | p.okafor@halden-mutual.example |
| Tidewater-150 | Hana Brook | Policy Systems Product Owner | h.brook@halden-mutual.example |
| Aquila-310 | Rafe Lindqvist | Field Operations Director | r.lindqvist@corrin-water.example |
| Aquila-310 | Mei Adeyemi | IT Service Manager | m.adeyemi@corrin-water.example |
| Meridian-420 | Colm Hartley | Store Operations Director | c.hartley@brackwater-retail.example |
| Meridian-420 | Ada Fenwick | Finance Business Partner | a.fenwick@brackwater-retail.example |
| Meridian-420 | Jonas Pike | Retail Platform Owner | j.pike@brackwater-retail.example |

### Know-how links (`projects[].sharepoint_urls`, object form `{label: [urls]}`)

| Project | Label | URL |
|---|---|---|
| Beacon-201 | Decision log | `https://halden-mutual.example/sites/beacon/Decision_Log.xlsx` |
| Lantern-202 | Data mapping workbook | `https://halden-mutual.example/sites/lantern/Data_Mapping.xlsx` |
| Tidewater-150 | Lessons log | `https://halden-mutual.example/sites/tidewater/Lessons_Log.docx` |
| Aquila-310 | Runbook space | `https://corrin-water.example/wiki/aquila/runbooks` |
| Meridian-420 | Pilot store rollout plan | `https://brackwater-retail.example/sites/meridian/Rollout_Plan.xlsx` |

### Card field defaults applied by `buildDemoState`

| Field | Value |
|---|---|
| `client_name`, `project_name`, `projectId`, `Project_ReferenceID`, `opportunity_id` | From the card's project |
| `created_at`, `processed_at` | now − `ageDays` |
| `timestamp` | Label computed from the age (older code paths only; the UI uses real dates) |
| `detail` | Same as `content` |
| `syncStatus` / `vectorSyncStatus` / `piiStatus` | `synced` / `synced` / `Clean` |
| `nodes[].at` | now − node `ageDays`, with `author` and `source` taken from the node |
| `aiEngine` | Not set, so seed cards show no engine badge (the summaries are prepared; see R-7) |
