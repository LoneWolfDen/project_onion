# Relationship Model v5: Scope

Status: scope agreed for build. Implementation not started. Date: 2026-09-29.
Builds on: [Relationship_Model_v5_concept.md](Relationship_Model_v5_concept.md), the design reference. This file decides **what ships**. Where the two disagree, this file wins.

---

## 1. Who it is for

One page, two audiences, each served by its own view:

| Audience | View | Question it answers | What they should leave with |
|---|---|---|---|
| **Hackathon judges** | **Runtime** (default) | What actually happens? | Project knowledge is captured, checked by people and kept with the project, not with the person who leaves. |
| **Architect reviewers, engineers** | **Domain** | What does the business model mean? | Every source ties to a Project Anchor through one of six typed rules. It is deterministic, traceable and honest about what is built. |

The switch caption reads: *"Runtime: what actually happens. Domain: what the business model means."*

---

## 2. Scope at a glance

| Ships in v5 (visible) | Reduced (behind the "⋯ Engineering" corner menu) | Backlog (not in v5) |
|---|---|---|
| Runtime / Domain switch | Inventory list | Edge tables |
| **Story mode** (Risk Log row) | Validation scripts (display-only) | Deep linking / URL hash state |
| Click-to-highlight upstream + downstream | Model integrity check | Mini-map |
| Animated flow along active edges | Guide / local setup | Drag / "Arrange" layout |
| Simplified runtime (~13 nodes) with expandable groups | Export JSON / MD | Node search, category and status filters |
| **Why this matters** panel | | Hover preview on touch devices |
| **How we measure success** tab | | Dark mode |
| Live / Partial / Vision status on every node | | Keyboard shortcuts beyond Tab / Enter / Esc / P |
| Inspector panel (node + edge detail) | | |
| Condition legend (Domain view, click to isolate one operator) | | |

### 2.1 Priority: Must have · Should have · Backlog

This sorts the scope above by priority and adds nothing new. **Must have** is the minimum for the demo to work for both audiences. **Should have** ships if time allows, and is cut from the bottom of its list up.

**Must have**, without which there is no demo:

| # | Item | Section |
|---|---|---|
| M1 | Map tab with the Runtime / Domain switch and its caption (Runtime is the default) | § 3, § 4 |
| M2 | Runtime view: 13 collapsed nodes, each showing Live / Partial / Vision | § 5.1 |
| M3 | Group expansion, one group at a time (the story needs SharePoint → Risk Log and Continuum Cards) | § 5.2 |
| M4 | Three human gates shown as distinct lavender cards with avatars | § 5.3 |
| M5 | Domain view: exactly 11 nodes and 17 edges from `relationship_model.json`, with edges styled by the six typed operators | § 6 |
| M6 | Click a node to highlight upstream and downstream lineage, with the rest greyed (≤ 0.3, not animated). Clear with `Esc` or a background click | § 10 |
| M7 | Animated flow dots on active edges only, with the reduced-motion fallback | § 10 |
| M8 | Story mode: the 8-step Risk Log scenario with play/pause, previous/next and replay, and an always-visible "Replay of seed data" label | § 9 |
| M9 | Node inspector: what it does, upstream and downstream, "Built in" evidence, seed sample | § 4, § 5.1 |
| M10 | Why this matters: the compact card on the Map and the full tab | § 7 |
| M11 | How we measure success tab with status pills | § 8 |
| M12 | PWA visual language: tokens, 16px cards, pills, `rm5-` classes, no Tailwind arbitrary classes | § 10 |
| M13 | Accuracy guardrails (all five) | § 11 |
| M14 | Runs under `service.py` with no build step, alongside the v4 and Relationship-Model pages. No console errors. No horizontal page scroll at 390px | § 12 |

**Should have**, if time allows, listed in the order to keep them (cut from the bottom first):

| # | Item | Section |
|---|---|---|
| S1 | Edge click opens the inspector with `condition`, `field`, `label`, `description` | § 6 |
| S2 | Condition legend chips isolate one operator (Domain) | § 6 |
| S3 | Gate avatar popovers listing each gate's human decisions | § 5.3 |
| S4 | "Try" chips, 3 per view | § 10 |
| S5 | "Show me" / "See it in the demo" jumps from both tabs into the story step | § 7.2, § 8 |
| S6 | Selection carries across the view switch via the mapping table | § 6 |
| S7 | Hover preview of direct neighbours (desktop) | § 10 |
| S8 | Mobile layout: inspector as a bottom sheet, stacked story strip | § 4 |
| S9 | Keyboard: `Tab` / `Enter` / `Esc` / `P` / `←` `→` | § 3 |
| S10 | ⋯ Engineering menu: Model check | § 3 |
| S11 | ⋯ Engineering menu: Inventory and Guide & setup (reuse `guide-app/` content) | § 3 |
| S12 | ⋯ Engineering menu: Validation scripts (display-only) | § 3 |
| S13 | Why card dismissal remembered per viewer | § 4 |
| S14 | ⋯ Engineering menu: Export JSON / MD | § 3 |

**Backlog**, not built in v5 (unchanged from § 13):
edge tables · deep linking / URL hash state · mini-map · drag / Arrange layout · node search and filters · Connected Chatter fallback story · inspector upstream/downstream toggle · zoom controls · extra keyboard shortcuts · dark mode · hover preview on touch devices.

§ 12 "Build definition of done" applies to the **Must have** items. Should-have items are checked only if they ship.

---

## 3. Navigation

Three primary tabs plus a corner menu. The first thing a judge sees is the map, not a tab bar full of engineering tools.

```
[ Map ]  [ Why it matters ]  [ How we measure success ]              ⋯ Engineering ▾
                                                                        Inventory
                                                                        Validation
                                                                        Model check
                                                                        Guide & setup
                                                                        Export
```

- **Map**: the canvas, the Runtime/Domain switch, story mode and the inspector. Opens here.
- **Why it matters**: the full before/after narrative (§ 7).
- **How we measure success**: judge-facing success criteria with honest status (§ 8).
- **⋯ Engineering**: a small ghost button, top right. Pages open in the same content area with a "← Back to map" link. Nothing from this menu appears on the Map itself.

Keyboard (v5 only): `Tab` / `Shift+Tab` between nodes, `Enter` to select, `Esc` to clear, `P` to play or pause the story, `←` `→` for story steps.

---

## 4. Map screen layout

The left rail from the concept is removed. With ~13 nodes the canvas fits the screen, so there are no filters and no mini-map.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◎ Continuum   [Map] [Why it matters] [How we measure success]  ⋯ Engineering │
│ Client: Acme Corp        ( Runtime ● | Domain ○ )          ▶ Play story      │
│ Runtime: what actually happens · Domain: what the business model means       │
├──────────────────────────────────────────────────────────┬───────────────────┤
│ ┌ Why this matters ──────────────┐                       │ INSPECTOR  340px  │
│ │ Without Continuum, decision    │  (dismissible card,   │ (opens on select) │
│ │ context leaves with the person.│   top-left of canvas) │                   │
│ │ With Continuum, it stays with  │                       │ Title · status    │
│ │ the project.     Read more →   │                       │ What it does      │
│ └────────────────────────────────┘                       │ Upstream ▸        │
│                                                          │ Downstream ▸      │
│   Scope   Sources   Collect  Gate1  Link  Gate2  Cards   │ Built in: module  │
│   ▢ ──── ▣ SP ────▶ ▢ ────▶ 👤 ──▶ ▢ ──▶ 👤 ──▶ ▣ ──┐    │ Sample (seed)     │
│          ▣ GDP                                     │    │                   │
│          ▣ Connected   Gate3  Learn   Hub          │    │                   │
│          ▣ Comms ◌      👤 ◀─ ▣ ◀── ◎ ◀────────────┘    │                   │
├──────────────────────────────────────────────────────────┴───────────────────┤
│ STORY  ●●●○○○○○  Step 3 of 8 · "Row 12 and Row 18 describe the same laptop   │
│        rollout…"                    ◀  ❚❚  ▶     Replay of seed data         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- ▣ marks a **group node**, which can expand (§ 5.2). ◌ marks a Vision (planned) node, shown with a dashed border.
- The Why card is shown on first load. Once dismissed, it stays dismissed for that viewer (`localStorage`, wrapped in try/catch). The final story step always shows it again.
- Below 768px: the inspector becomes a bottom sheet, the story strip stacks, the canvas scrolls inside its own frame, and there is no horizontal page scroll.

---

## 5. Runtime view (simplified)

### 5.1 Collapsed layout: 13 nodes

The v4 view had 24 runtime nodes. v5 shows **13 by default**, and group nodes expand in place.

| # | Lane | Node | Kind | Status (proposed) | Evidence in repo |
|---|---|---|---|---|---|
| 1 | Scope | **Client & Project Anchor** ▣ | anchor | Live | `platform-anchor/service.py`, PWA header (Acme Corp / O-5030460) |
| 2 | Sources | **SharePoint** ▣ | source | Partial | Link-only + Excel upload in PWA (vendored `xlsx`). `integrations-sharepoint-adapter` has no code yet |
| 3 | Sources | **GDP** ▣ (URL + weekly Excel **merged**) | source | Partial | `gdp-adapter`, `integrations-gdp-adapter` (1 file each) |
| 4 | Sources | **Connected Chatter** | source | Live | `connected-bookmarklet`, `integrations-connected-adapter` |
| 5 | Sources | **Emails & Teams** ▣ | source | Vision | No Graph consent. Partial only if manual paste is demoed |
| 6 | Collect | **Harvester** | service | Live | `experience-pwa/static/js/core` (harvest path) |
| 7 | Gate 1 | **Privacy & Scope** 👤 | human gate | Partial | Privacy toggle live in PWA. `platform-pii-screener` has no code |
| 8 | Link | **Typed Linking** | service | Partial | `domain-fusion-engine` (1 file), fusion logic in PWA |
| 9 | Gate 2 | **Review (Data Park)** 👤 | human gate | Live | PWA: `pending_processing → ready` |
| 10 | Cards | **Continuum Cards** ▣ | store | Live | `domain-cards-store`, PWA timeline cards |
| 11 | Gate 3 | **Share: Private / Shared** 👤 | human gate | Live | PWA: Your Notes + Privacy toggle |
| 12 | Learn | **Self-Learning** ▣ | learning | Live | `vector-service` (Chroma), `VectorSync.js` (similarity gate ≥ 0.85) |
| 13 | Hub | **Continuum Hub** | hub | Live | `experience-pwa` |

Status comes from the data file and is set by the team. The "Evidence" column goes into each node's inspector under "Built in", which is what architects will check.

### 5.2 Group expansion

| Group | Expands to |
|---|---|
| Client & Project Anchor | Client Master · Project Card / Anchor |
| SharePoint | Collaboration Plan · Risk Log (.xlsx) · ESC (.xlsm) |
| GDP | GDP Dashboard URL · GDP Weekly Excel (delta) |
| Emails & Teams | Emails · Teams Chats · Teams VTT (all Vision) |
| Continuum Cards | Key Moments · Status Cards (RAW + Provenance + AI) · Informational Updates · Your Notes |
| Self-Learning | Vector build · Hashtag ID · Info-vs-Status classifier (sub-item status set per item; unverified items ship as Vision) |

Expansion rules:
- **Click the ▣ chevron** to expand. **Click the card body** to select, the same as for any other node.
- Only **one group is expanded at a time**. Expanding another collapses the first, so the layout never overflows.
- Expanded children appear as a stacked sub-column inside the lane. Edges re-route to the children, and the lane grows vertically with a 200ms transition.
- Lineage highlighting works on both collapsed and expanded nodes. A collapsed group is "in lineage" if any child is.
- Story mode auto-expands the group a step needs (e.g. SharePoint → Risk Log), and collapses it again when the story ends.

### 5.3 Human gates

The three gates are the visual signature of the runtime view. Each is a lavender card with a person avatar and a pulsing dot while active. Clicking the avatar opens a popover of what the human decides:

- **Gate 1, Privacy & Scope**: which client domains may link, what counts as PII, and scope to this account.
- **Gate 2, Review**: approve, edit or reject a suggested card, and confirm the merge suggestion.
- **Gate 3, Share**: Private (only me) or Shared (team, becomes searchable).

---

## 6. Domain view

For architects. It is kept faithful to the canonical model, with no simplification beyond layout.

- Nodes and edges are **exactly** those in `data/seed/relationship_model.json` (11 nodes, 17 edges), using its IDs and labels.
- Lanes: Scope (Client Master) → Anchor (Project Card) → Sources (SharePoint · GDP · Comms · Connected) → Outcome (RAID Aggregated Cards).
- Edges are styled by the six typed operators. Each operator has a color **plus** a stroke pattern and glyph (concept § 5.4).
- **Condition legend**: the six chips across the top of the canvas. Clicking a chip isolates that operator's edges. This is the one filter that ships, because it is the architect's key question: "show me everything linked by DOMAIN".
- **Edge click** opens the inspector with `condition`, `field`, `label` and `description`, straight from the JSON.
- **Switching views keeps the selection** where a mapping exists (concept § 9 table). For example, `sp_risk_log` in Domain becomes SharePoint → Risk Log in Runtime, with the group auto-expanded. Unmapped selections clear with a one-line note.

---

## 7. Why this matters panel

Two placements: a compact card on the Map (first load, and the final story step) and the full **Why it matters** tab.

### 7.1 Compact card (Map)

> **Without Continuum**, decision context leaves with the person.
> **With Continuum**, the decision stays with the project.
> *Read more →*

### 7.2 Full tab

Headline: the same two lines, large. Below that, three before/after rows, each linked to the moment in the demo that proves it:

| | Without Continuum | With Continuum | See it in the demo |
|---|---|---|---|
| **Handover** | A new PM rebuilds context from inboxes, chats and memory. | The project timeline holds every decision with its source. | Story step 8 |
| **Same issue, told twice** | Row 12 ("50% laptops pending") and Row 18 ("remaining 50% closed") look like two unrelated risks in different weeks. | They are recognised as one item, and the card shows **Open → Partial → Closed**. | Story steps 3–6 |
| **Trust** | AI summaries nobody can check. | Every card keeps its RAW source and provenance. Three human gates, and nothing is shared without a person choosing to share it. | Click any gate or card |

Rules:
- **No invented impact numbers.** A "Measured impact" block appears only if the team adds a figure with a named source to the data file. Otherwise it is not rendered.
- The "See it in the demo" links jump to the Map and start the story at that step. They are in-page actions, not deep links (deep linking is backlog).

---

## 8. How we measure success tab

This makes the acceptance thinking visible to judges. It is phrased as outcomes rather than engineering checks. Each row has a status pill set by the team in the data file (**Demonstrated · Partial · Vision**) and a "Show me" button that jumps to the proof on the Map.

| # | Success criterion | How you can verify it here | Proposed status |
|---|---|---|---|
| 1 | **Context survives a handover.** A newcomer can see what was decided, when, and from which source. | Play the story to step 8: the card shows its timeline and sources. | Demonstrated |
| 2 | **Humans stay in control.** Nothing becomes team-visible without a person choosing it. | Runtime view: three gates. Click Gate 3. | Demonstrated |
| 3 | **Every claim is traceable.** Each card links back to its RAW source. | Click Continuum Cards → Status Card → provenance. | Demonstrated |
| 4 | **Linking is deterministic.** Sources join projects by typed rules, not guesswork. | Domain view: every edge is one of six operators. Click a chip. | Demonstrated |
| 5 | **One issue, one card.** Repeated updates about the same item merge instead of duplicating. | Story steps 3–6: Row 12 + Row 18 → one card, Open → Partial → Closed. | Demonstrated |
| 6 | **Honest about what's built.** Every node says Live, Partial or Vision. | Look for dashed "Vision" nodes (Emails & Teams). | Demonstrated |
| 7 | **Understandable in 60 seconds.** A first-time viewer can say where humans decide and how data reaches a project. | Try it: "Where do humans decide?" | Target for judges |

Footer line: *"Engineering acceptance criteria: ⋯ Engineering → Model check."*

---

## 9. Story mode: "One risk, told twice, becomes one card"

The primary story is the Risk Log row scenario. It is grounded in the repo (`docs/DECISION_LOG.md`: Acme Corp, O-5030460, Week 33, Row12 + Row18, Laptop 50% → 100%). The fallback story, a Connected Chatter post linked by EXACT OppID, is backlog. Only the Risk Log story is built for v5.

| Step | Node(s) highlighted | Caption (draft) | Inspector shows |
|---|---|---|---|
| 1 | Client & Project Anchor | "Everything is scoped to Acme Corp and one project anchor." | Anchor ID, Opp ID O-5030460 |
| 2 | SharePoint → Risk Log (auto-expand) | "The project's Risk Log is uploaded. Row 12: *50% of laptops pending*." | Row 12 fields (seed) |
| 3 | Harvester | "The row is harvested with its provenance: file, sheet, row, date." | Provenance block |
| 4 | Privacy & Scope 👤 | "A person confirms scope. Nothing outside Acme is linked." | Gate 1 tasks |
| 5 | Typed Linking | "It links to the project by `URL_CONTAINS` and `DATE_RANGE`." | The two typed rules |
| 6 | Harvester → Typed Linking → Self-Learning | "Weeks later, Row 18 arrives: *remaining 50% closed*. Similarity passes the gate, so it's the same item." | Similarity value from seed replay vs gate ≥ 0.85 |
| 7 | Review 👤 → Continuum Cards | "A person approves. One card, one timeline: **Open → Partial → Closed**." | Card timeline |
| 8 | Share 👤 → Continuum Hub | "Shared with the team. When the PM moves on, the decision stays with the project." | Why card re-appears |

Rules:
- Every value comes from seed files. The strip always shows **"Replay of seed data · not live telemetry"**.
- The similarity value shown is the one the seed replay produces. The gate threshold shown is the code's (≥ 0.85, `VectorSync.js`). No "0.92" appears unless the seed data produces it.
- Controls: play/pause, previous/next, step dots, and auto-advance every 4s, which pauses on hover and on manual stepping.
- The story runs on the runtime view. If started from Domain, the view switches first.

---

## 10. Interaction and visuals (what ships)

The details are in the concept doc. This section only confirms what is kept and trimmed.

**Kept**
- Click a node to highlight its full upstream and downstream lineage. Upstream is lavender with dots flowing in, downstream is accent blue with dots flowing out. Everything else is greyed: 0.3 opacity, desaturated, not animated.
- Hover preview of direct neighbours (desktop).
- Clicking the background or pressing `Esc` clears the selection.
- A "Try" row under the switch, 3 chips per view:
  - Runtime: *Play the story* · *Where do humans decide?* · *What makes a card shared?*
  - Domain: *How everything anchors* · *Email → project via DOMAIN* · *What feeds RAID cards?*
- Visual language:
  - PWA tokens only: `--ink`, `--accent`, `--line`, `--wash` and the four pastels, plus butter and rose.
  - 16px cards, pill chips, no pure black.
  - Plain `rm5-` CSS classes, **no Tailwind arbitrary classes**.
- Animation:
  - SVG Bézier edges from grid coordinates, with flow dots only on active edges.
  - Story token with an arrival pulse.
  - Pulsing dot on active gates.
  - 200ms fades and a 300ms view crossfade.
  - `prefers-reduced-motion` turns animation off and shows static arrowheads instead.

**Trimmed from the concept**
- The Both / Upstream / Downstream toggle in the inspector. v5 always shows both.
- Keyboard shortcuts `R` `D` `/` `0`.
- Zoom controls. The layout is fit-to-width only.

---

## 11. Accuracy guardrails

1. Domain view equals `relationship_model.json`, with no added or renamed nodes.
2. Only the six typed operators appear as Domain conditions.
3. Runtime status and "Built in" come from **named** module folders and `experience-pwa`. The numbered folders (`01-` … `09-`) contain specs only, with no code, and are **not referenced** as evidence.
4. There are no invented numbers or live-looking logs anywhere.
5. The demo tenant is Acme Corp / NovaTech Labs. Internal SharePoint and GDP URLs are shown shortened.

---

## 12. Build definition of done

This list is the engineer-facing version. The judge-facing version is § 8.

- [ ] Opens via `service.py` at `/static/docs/relationship-v5/` with no build step. It uses vendored React + `htm` only.
- [ ] It lives **alongside** `Project-Onion-Relationship-Model.html` and `Continuum-V4-Final.html`, and neither is modified.
- [ ] No console errors in Chrome, Edge or Safari across load, view switch, expand, select and story.
- [ ] The runtime view shows 13 nodes collapsed, and every group expands and collapses, one at a time.
- [ ] The Domain view shows 11 nodes and 17 edges matching the JSON.
- [ ] Lineage highlight: non-lineage items are ≤ 0.3 opacity and not animated.
- [ ] The story plays all 8 steps. Pause, previous/next and replay all work, and the "Replay of seed data" label is always visible.
- [ ] The Why card and both new tabs render. There are no impact numbers without a source.
- [ ] The Engineering menu reaches Inventory, Validation, Model check, Guide and Export. None of them appears on the Map.
- [ ] Reduced-motion is respected. At 390px width there is no horizontal page scroll. Text contrast is ≥ 4.5:1 on pastels.
- [ ] Every class exists in `rm5.css` or `styles.css`.

---

## 13. Backlog (logged, not built in v5)

Edge tables · deep linking / URL hash state · mini-map · drag / Arrange layout · node search and filters · Connected Chatter fallback story · inspector upstream/downstream toggle · zoom controls · extra keyboard shortcuts · dark mode · hover preview on touch devices.

---

## 14. Needs confirmation before build

These items in the clarification notes don't match the repo as of today:

1. **`/mnt/data/src/App.tsx` is not in this repo**, and nor is `Continuum_v5.1_FlowOverview.html`. It is also TypeScript/TSX, which needs a build step, and that conflicts with the no-build requirement. Proposed: v5 is written fresh as no-build `htm` modules. If `App.tsx` holds node text (the "brain" field per node), import that text into the v5 data files as content only.
2. **Several module names in the notes don't exist yet.** `domain-client360`, `domain-projects`, `platform-harvester`, `platform-parser` and `platform-vector` are not folders. The table in § 5.1 maps to what exists: `platform-anchor`, `domain-fusion-engine`, `domain-cards-store`, `vector-service` and `experience-pwa`.
3. **Output file name.** Is it `static/docs/relationship-v5/index.html` (proposed), or a single named file such as `continuum_high_level_no.html`?
4. **Similarity figure.** The notes say 0.92. The code gate is ≥ 0.85. The story will show whatever the seed replay produces.
