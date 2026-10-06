# Relationship Model v5: Concept

Status: concept only, no implementation. Date: 2026-09-29.
Replaces: `Continuum-Demo.html` (v0.11 demo), `Continuum-V4-Final.html` (v4) and the partial port in `static/docs/guide-app/`.
Canonical data: `data/seed/relationship_model.json`, `archive/docs/RELATIONSHIP_MODEL.md`, `archive/docs/DATA_DICTIONARY.md`.

---

## 1. Purpose

A single page that explains Continuum to hackathon judges in under three minutes and still holds up when an engineer checks it against the code.

It needs to answer two questions, and it gives each one its own view:

| Question | View | Audience takeaway |
|---|---|---|
| "What data do you link, and how?" | **Domain view** | Every source ties back to a Project Anchor through a typed rule, never free text. |
| "What happens to a piece of data at runtime?" | **Runtime view** | Data moves through services with three human gates, and nothing is shared without a person saying so. |

Goals: demo friendly, visually impressive, clear on impact, accurate to the architecture, and maintainable as no-build React.

---

## 2. What we keep from earlier versions (review summary)

We carry forward the application flow and interactions only. None of the old CSS or rendering code comes with them.

| From | Keep | Drop or fix |
|---|---|---|
| **v0.11 demo** | The story told in stages (Sources, Privacy Gate, Linking, Review Gate, Cards, Merge Gate, Hub). The three **human gates** with a person glyph and a popover of human tasks. The **condition-type legend** with colors. Lineage in **both directions** (upstream and downstream). **"Vision · Future"** markers on unbuilt nodes. **"Try"** quick-start buttons. Moving developer notes out of the main view. | Black-heavy styling. Edge positions measured from the DOM (brittle on resize). Edge labels shown on only every third edge. Domain and runtime mixed on one canvas. The "1,284 cards" figure, which has no source. |
| **v4 final** | The runtime pipeline in columns (Client, Anchor, Sources, Harvester, Parser, Human Review, Cards, Privacy, Learning, Hub). **Animated flow dots** along active edges. A **detail panel** for the selected node: logic, sample, long description. The **mini-map**. The **Inventory** tab. The **Validation** tab with Chrome and Safari scripts and "how to read" notes. **Reset layout**. **Export JSON/MD**. Soft pastels with no black. | Lineage that is downstream only. Inactive nodes at 0.62 opacity, which is not greyed enough. Condition names outside the six typed operators (`DOMAIN_CONTAINS`, `Linked 90%`, `TOKEN_OVERLAP <0.9?`). McKinsey/Contoso sample data, where the live app uses Acme/NovaTech. A fake "services.py Live Runner" and simulated log. An "Implementation complete" claim for nodes that are not built. Free drag on by default, which makes it easy to wreck the layout mid-demo. |
| **guide-app/ port** | Structure that is already no-build (`React` UMD + `htm`, ES modules, data split out into `GuideData.js`). `bfsReachable`. Validation scripts that are display-only and never auto-run. | Tailwind arbitrary classes (`rounded-[14px]`, `bg-[#…]`). They are **not in `styles.css`**, and with no build step they render unstyled. v5 uses plain named CSS classes. |

---

## 3. Screen layout

Desktop (≥ 1024px):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER  ◎ Continuum · Relationship Model v5                                  │
│         [ Map | Inventory | Validation | Guide ]      Client: Acme Corp ▾    │
│         View: ( Runtime ● | Domain ○ )    ▶ Play story   ↺ Reset   ⤓ Export  │
├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ LEFT RAIL     │ CANVAS                                   │ INSPECTOR         │
│ 240px         │ swim lanes (columns), nodes, SVG edges   │ 360px, collapsible│
│               │                                          │                   │
│ Search nodes  │  ┌Lane┐  ┌Lane┐  ┌Lane┐  ┌Lane┐  ┌Lane┐   │ Node header       │
│ Categories ☑  │  │ ▢  │──│ ▢  │══│ ▢  │──│ ▢  │──│ ▢  │   │ Status pill       │
│ Conditions ☑  │  │ ▢  │  │ ▢  │  │ 👤 │  │ ▢  │  │ ◎  │   │ What it does      │
│ Status ☑      │  └────┘  └────┘  └────┘  └────┘  └────┘   │ Identifiers       │
│ Try: chips    │                                          │ Typed links in/out│
│ Legend        │                          ┌mini-map┐      │ Upstream list     │
│               │                          └────────┘      │ Downstream list   │
│               │                                          │ Module / source   │
├───────────────┴──────────────────────────────────────────┴───────────────────┤
│ STORY STRIP  ① Source ▸ ② Privacy gate ▸ ③ Link ▸ ④ Review ▸ ⑤ Card ▸ ⑥ Hub  │
│              caption: "A Risk Log row is harvested from SharePoint…"  ◀ ▶     │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Header** (sticky): the existing `.app-header` gradient (`#F0F7FF → #F3ECFF → #FFF9F0`). The client scope chip is read-only in the demo, matching "Client Master dropdown NOT editable".
- **Left rail**: filters and legend. Collapses to an icon strip below 1280px.
- **Canvas**: fixed logical size, scaled to fit the width with zoom-to-fit. Lanes are pastel rounded containers with a caps label. Nodes snap to a grid (column × row), so edges never overlap cards.
- **Inspector**: empty state shows "Select a card to see what it connects to" plus three Try chips. Once a node or edge is selected, it shows the details.
- **Story strip**: only visible while the story is playing or paused. Otherwise it collapses to a single "▶ Play story" affordance.
- **Mini-map**: bottom-right of the canvas. Click to pan. It shows lineage highlighting too.

Tablet (768–1023px): the left rail becomes a drawer and the inspector overlays from the right.
Phone (< 768px): the canvas scrolls horizontally inside its own frame (the page itself never scrolls sideways), the inspector becomes a bottom sheet, the tabs become a scrollable pill row, and there is a 16px side gutter.

---

## 4. Navigation model

**Top-level tabs** (4, down from v4's 4 and v0.11's 3):

| Tab | Content | Default |
|---|---|---|
| **Map** | Canvas with the Runtime/Domain switch. This is the demo surface. | Yes |
| **Inventory** | List of every node in the current view with filters. Clicking one shows full detail and its typed links (v4 pattern). "Show on map" jumps back with the node selected. | |
| **Validation** | Group A–F scripts (v4), display-only, with Copy buttons. Adds a **Model integrity** group (§ 10) that runs in the page against the model data itself. It is read-only and safe. | |
| **Guide** | How it works, color semantics, how to run the services locally (v0.11 Help & Setup). No developer notes live on the Map. | |

**URL hash state** so a demo can deep link and refresh without losing its place:
`#/map/runtime?node=harvester` · `#/map/domain?edge=project_card>sp_risk_log` · `#/inventory?node=gdp_dash` · `#/map/runtime?story=risk-row&step=3`

**Keyboard**

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move focus between nodes in lane order |
| `Enter` / `Space` on node | Select |
| `Esc` | Clear selection, or close inspector or sheet |
| `R` / `D` | Switch to Runtime / Domain |
| `P` | Play or pause story |
| `←` `→` | Previous or next story step (while the story is active) |
| `/` | Focus node search |
| `0` | Zoom to fit |

---

## 5. Visual styling

Use the PWA design language as it already exists (`static/css/styles.css`). v5 adds a small scoped stylesheet built only from these tokens and **never uses Tailwind arbitrary classes**.

### 5.1 Tokens (reuse existing, add only what is missing)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#1E293B` | Primary text |
| `--accent` | `#1F4A7A` | Titles, selected ring, active downstream edges |
| `--muted` | `#64748B` | Secondary text |
| `--faint` | `#94A3B8` | Captions, inactive labels |
| `--line` | `#E6EAF2` | Borders, lane outlines |
| `--wash` | `#F8FAFC` | Panel backgrounds |
| page bg | `#FAFCFE` | Body |
| `--pastel-blue` | `#D6E8FF` | Anchor, Parser |
| `--pastel-mint` | `#D6F5E8` | Client Master, Shared, Learning |
| `--pastel-peach` | `#FFE4D6` | SharePoint sources, primary button |
| `--pastel-lav` | `#E8DAFF` | Comms sources, human gates, upstream edges |
| *new* `--pastel-butter` | `#FFF5D6` | GDP sources (already used by `.onion-conf-med`) |
| *new* `--pastel-rose` | `#FFE4E6` | Error / blocked state (already used by the guide error box) |
| *new* `--edge-idle` | `#CBD5E1` | Greyed edges |
| *new* `--edge-up` | `#7C6BB0` | Active upstream edges (lavender ink) |

No pure black anywhere (the v4 rule is kept). Dark mode is out of scope for the demo. The stylesheet declares `color-scheme: light` so the OS can't half-apply dark mode.

### 5.2 Shape and depth

- Node cards: **16px radius**, 1px pastel border, `0 1px 2px rgba(31,74,122,.06)` shadow. Selected: 2px `--accent` ring plus a soft glow `0 8px 24px rgba(31,74,122,.12)`.
- Lanes and panels: 12–18px radius, `--wash` or pastel fill at about 70%, 1px `--line`.
- Pills and chips: 9999px radius, 11px text.
- Buttons: existing `.btn-primary` (peach gradient) for **Play story**, and `.btn-ghost` for the rest.
- Type: Inter (already loaded). Mono for identifiers and conditions uses `ui-monospace`, with no extra font download. Sizes: node title 13/600, sublabel 11/400, lane label 10/600 caps with tracking.

### 5.3 Node card anatomy (fixed 184 × 64)

```
┌──────────────────────────────────┐
│ (◉)  Project Card / Anchor   LIVE│  icon disc · title · status pill
│      anchor · project_name       │  category · primary identifier
└──────────────────────────────────┘
```

Human gate cards add a small person avatar with a pulsing mint dot (v0.11) on the left edge.

### 5.4 Typed condition styling (never color alone)

Each of the six operators gets a pastel chip, an ink color **and** a stroke pattern, so the edges stay readable in grayscale or print.

| Condition | Chip fill / ink | Edge pattern | Glyph |
|---|---|---|---|
| `EXACT` | blue / `#1F4A7A` | solid | `=` |
| `CONTAINS` | lavender / `#5B3FA0` | solid, thin | `⊃` |
| `DOMAIN` | rose / `#9F1239` | long dash | `@` |
| `DATE_RANGE` | butter / `#92400E` | dot-dash | `⧗` |
| `TOKEN_OVERLAP` | mint / `#065F46` | short dash | `≈` |
| `URL_CONTAINS` | peach / `#9A3412` | dotted | `↗` |

Runtime edges are process hand-offs, not typed matches. They use a neutral solid stroke and a short verb label ("dedupe", "screen PII", "approve").

---

## 6. Node categories

Every node has a **category** (drives color and lane), a **status** (drives border style) and, in the runtime view, a **module** (drives accuracy).

### 6.1 Domain view: entities and typed links

The IDs are taken **verbatim from `data/seed/relationship_model.json`**. v4's `client_360` and `projects_anchor`, and v0.11's `sp_collab` and `gdp_url`, are retired.

| Lane | Category | Fill | Nodes (canonical IDs) |
|---|---|---|---|
| 1 Scope | Master | mint | `client_master` |
| 2 Anchor | Anchor | blue | `project_card` |
| 3 Sources · SharePoint | Source-SP | peach | `sp_comm_plan`, `sp_risk_log`, `sp_esc` |
| 3 Sources · GDP | Source-GDP | butter | `gdp_dash`, `gdp_excel` |
| 3 Sources · Comms | Source-Comm | lavender | `emails`, `teams_chats`, `teams_vtt` |
| 3 Sources · Connected | Source-Connected | wash/grey-blue | `connected` |
| 4 Outcome | Derived card | white + accent border | `raid_agg` |

Edges: the 17 edges in the JSON, showing `condition`, `field`, `label` and `description`. These already exist in the data, so the inspector gets real text for free.

### 6.2 Runtime view: services, gates and stores

| Lane | Category | Visual | Example nodes | Maps to module |
|---|---|---|---|---|
| 1 Inputs | Adapter | peach/butter/lav by source family | SharePoint adapter, Excel parser, GDP adapter, Connected adapter, Bookmarklet | `integrations-sharepoint-adapter`, `integrations-excel-parser`, `integrations-gdp-adapter`, `integrations-connected-adapter`, `connected-bookmarklet` |
| 2 Scope | Anchor service | blue | Anchor service | `platform-anchor` / `01-anchor-service` |
| 3 Collect | Processing | wash | Harvester (collect, dedupe, provenance) | `04-harvester` |
| 4 Protect | **Human Gate 1** + service | lavender + avatar | PII screener, Privacy & scoping gate | `platform-pii-screener` |
| 5 Link | Processing | blue | Fusion / typed linking (six operators) | `domain-fusion-engine` / `05-fusion-engine` |
| 6 Review | **Human Gate 2** | lavender + avatar | Card review (Data Park, pending_processing → ready) | `experience-pwa` |
| 7 Store | Store | white + accent | Cards store (RAW + provenance + AI enrichment) | `domain-cards-store` / `06-cards-service` |
| 8 Decide | **Human Gate 3** | lavender + avatar | Accept & merge, Private / Shared | `experience-pwa`, `09-admin-governance` |
| 9 Learn | Learning | mint | Vector build, search / RAG | `vector-service`, `07-search-rag` |
| 10 Hub | Hub | soft tri-pastel gradient | Continuum (experience PWA) | `experience-pwa` |

The module column is a **proposal to verify**. There are numbered and named duplicates (`04-harvester` vs `platform-*`). The implementer confirms which folder is live and records the choice in `archive/docs/DECISION_LOG.md` before build. Any node without a confirmed module ships as `planned`.

### 6.3 Status (both views)

| Status | Border | Pill | Meaning |
|---|---|---|---|
| `live` | solid 1px | mint "LIVE" | Code exists and runs in the demo |
| `partial` | solid + half-filled dot | butter "PARTIAL" | Exists but limited (e.g. upload only, not SharePoint crawl) |
| `planned` | dashed, 80% opacity | lavender "VISION" | Designed, not built. Kept on the map to show where the design is headed (v0.11 idea) |

Status comes from the data file. It is never hard-coded in a component, and the Validation tab flags any `live` node that has no module path.

---

## 7. Interaction model

### 7.1 Selection and lineage (the core interaction)

1. **Idle**: all nodes at full color, all edges `--edge-idle` at 0.6. Only a slow ambient shimmer runs on the main spine (§ 8), so the page doesn't look static.
2. **Hover node** (desktop only): preview. Direct neighbours go to 100%, everything else drops to 0.55, and a tooltip shows `desc`. Nothing is locked.
3. **Click node**: locks the selection.
   - Walks the graph **upstream and downstream** separately (v0.11), to the end of each path (v4 "BFS till end").
   - Selected node: accent ring.
   - Downstream nodes and edges: full color, edges in `--accent`, flow dots moving away from the selection.
   - Upstream nodes and edges: full color, edges in `--edge-up`, flow dots moving *toward* the selection.
   - **Everything else is greyed**: nodes at 0.3 opacity plus `grayscale(0.6)`, edges `--edge-idle` at 0.25, no labels, no animation. This fixes v4's 0.62, which stayed too visible.
   - The inspector opens with upstream and downstream lists (click an item to move the selection there) and typed links in and out.
   - A segmented control in the inspector switches between **Both · Downstream · Upstream**, for a focused explanation.
4. **Click edge**: selects the edge only. Both endpoints go to full color, and the rest greys. The inspector shows condition chip, `field`, `label`, `description`.
5. **Click a condition chip** (legend or inspector): filters mode. Only edges of that operator stay lit, and so do their endpoints. It answers "show me everything linked by DOMAIN".
6. **Click empty canvas or press `Esc`**: clears the selection (v0.11 behaviour).
7. **Human gate avatar click**: a popover lists the gate's human tasks (privacy toggles, domain allowlist, multi-persona approval, conflict resolution).

Labels: when a node is selected, **every** active edge shows its condition pill (not every third one). With no selection, only lane-to-lane spine edges show pills, to avoid clutter.

### 7.2 Layout control

- The layout is **fixed and grid-based** by default. For a demo, predictability matters more than drag.
- An **"Arrange"** toggle in the left rail turns on drag (v4). Positions persist per viewer in `localStorage` (wrapped in try/catch) and **Reset** restores the base layout.
- Zoom: fit-to-width by default, `Ctrl/⌘ + wheel` or pinch to zoom, and the mini-map pans.

### 7.3 Quick starts ("Try" chips, from v0.11)

- Runtime: "Follow a Risk Log row" · "Where do humans decide?" · "What makes a card shared?"
- Domain: "How everything anchors" (selects `project_card`) · "Email → project via DOMAIN" · "What feeds RAID cards?"

Each chip sets a selection or a condition filter. The first runtime chip also offers "▶ Play as story".

### 7.4 Story mode (guided demo)

- **Play story** runs one scripted scenario over the **runtime view**, using **Acme Corp / NovaTech seed data** (`Seed-Demo.json`, `data/seed/cards.json`).
- 6–8 steps. Each step selects one node, animates one token along one edge, and writes a one-sentence caption in the story strip. The inspector shows the record's shape at that step (e.g. row → harvested item with provenance → PII-screened → linked with `URL_CONTAINS` → pending review → card → shared → embedded).
- Controls: play/pause, previous/next, step dots, auto-advance every 4s (paused on hover and when the user moves through steps by hand).
- The strip always shows the label **"Replay of seed data · not live telemetry"**. v5 shows **no fabricated logs, counts or "live runner"**. Any number on screen must come from the seed files.

---

## 8. Animation approach

Principles: motion explains direction and nothing else. It runs only on what matters and stops entirely when reduced motion is requested.

| Element | Technique | Timing |
|---|---|---|
| Edge geometry | SVG cubic Bézier computed from **grid coordinates in the data**, not from DOM measurement. Deterministic, resize-safe, and the same on every machine. | n/a |
| Flow dots | 1–2 small circles per **active** edge travelling the path (SVG `animateMotion` on the path, or CSS `offset-path`). Upstream edges run reversed. | 2.0–2.8s per edge, staggered by edge index so dots don't march in sync |
| Ambient spine | One faint dot on the main lane-to-lane spine when idle. | 6s loop, 40% opacity |
| Select / grey transition | CSS `opacity` + `filter` transition on nodes and edges. | 200ms ease-out |
| View switch | Crossfade the canvas plus a 12px slide in the direction of the switch. Selection carries across (§ 9). | 300ms |
| Story token | A single larger pastel token (8px, accent ring) moves along the step's edge. The target node gives a soft scale pulse (1 → 1.03 → 1) on arrival. | 900ms travel + 200ms pulse |
| Human gate | The avatar's mint dot pulses (v0.11) only while its gate is in the active lineage or story step. | 2s loop |

Performance: at most about 60 animated elements at once (active edges only). Idle greyed edges have zero animation. Animation pauses when the tab is hidden.

Reduced motion (`prefers-reduced-motion: reduce`): no flow dots, no pulses, and no slide. Active edges instead get a static direction arrowhead and a thicker stroke, the story advances with instant highlight changes, and transitions drop to 0ms.

---

## 9. Runtime vs Domain switch

- A **segmented control in the header** (`Runtime | Domain`), keyboard `R` / `D`, reflected in the URL hash. **Default: Runtime**. Judges care about the flow first. Engineers switch to Domain for the typed rules.
- Both views share the same canvas, inspector, legend and interactions. Only the node set, lanes and edge style change.
- **Selection carries across** via an explicit mapping table (data, not code):

| Domain node | Runtime node(s) |
|---|---|
| `client_master`, `project_card` | Anchor service |
| `sp_comm_plan`, `sp_esc` | SharePoint adapter |
| `sp_risk_log` | SharePoint adapter + Excel parser |
| `gdp_dash`, `gdp_excel` | GDP adapter |
| `connected` | Connected adapter / bookmarklet |
| `emails`, `teams_chats`, `teams_vtt` | *(planned adapters)* |
| `raid_agg` | Cards store |

  If the selected node has a mapping, the mapped node or nodes are selected after the switch, and the inspector notes "Shown as *SharePoint adapter* in Runtime view". If it has none, the selection clears and a small toast explains why.
- The **legend adapts**: Domain shows the six typed-condition chips, and Runtime shows service categories plus the three human gates.
- A one-line caption under the switch explains the difference: *"Domain: what connects to what. Runtime: what happens, in order."*

---

## 10. Architecture accuracy rules

1. **One source of truth per view.** Domain data is generated from, or checked against, `data/seed/relationship_model.json`. Runtime data lives in one file that lists each node's `module` path.
2. **Only the six operators** appear as edge conditions in the Domain view: `EXACT`, `CONTAINS`, `DOMAIN`, `DATE_RANGE`, `TOKEN_OVERLAP`, `URL_CONTAINS`.
3. **No invented fields or numbers.** This follows the anti-hallucination rules in the JSON: no GDP significance formula, and no "1,284 cards" style figures.
4. **Honest status.** Anything unverified is `planned`.
5. **Demo tenant is Acme Corp / NovaTech Labs.** No real client names. Internal SharePoint and GDP URLs are shown shortened by default (`…/Planning Documents/Risk_Log….xlsx`), and the full URL appears only in the inspector on request.
6. **Model integrity checks** (new Validation group G, run in the page, read-only):
   - every edge endpoint exists
   - every Domain condition is one of the six
   - no orphan nodes
   - every `live` runtime node has a `module`
   - every mapping target exists
   - Domain node IDs match the JSON

   Results show as a pass/fail list, so drift is visible before the demo.

---

## 11. Maintainable no-build code (structure only, no implementation)

Same stack as the PWA: vendored `react.production.min.js`, `react-dom.production.min.js` and `htm.umd.js`, with ES modules served by `service.py` (which already strips `?v=` cache-busters and serves `/static/docs/*`).

```
static/docs/relationship-v5/
  index.html              loads vendor scripts + main.js + rm5.css
  rm5.css                 scoped styles, rm5- prefixed classes, tokens only
  data/
    domain.js             nodes/edges/lanes (from relationship_model.json)
    runtime.js            nodes/edges/lanes with module + status
    mapping.js            domain ↔ runtime table
    stories.js            scripted scenario steps (seed-data references)
    conditions.js         six operators: color, pattern, glyph
  lib/
    graph.js              upstream/downstream walk, edge lookup
    layout.js             grid → pixel coords, Bézier paths
    integrity.js          model checks for Validation group G
    urlState.js           hash read/write
  components/
    App.js  Header.js  LeftRail.js  Canvas.js  NodeCard.js  EdgeLayer.js
    Inspector.js  StoryStrip.js  MiniMap.js  Inventory.js  Validation.js  Guide.js
```

Conventions: one component per file, each under about 200 lines. Data files hold content and components hold behaviour. No text is hard-coded inside components. Every `localStorage` access goes in try/catch. Comments explain *why*, matching the density of `service.py`. Reuse `guide-app/` pieces where they fit (`bfsReachable`, validation scripts, the Inventory layout), restyled with `rm5-` classes.

---

## 12. Acceptance criteria

**Runs**
- [ ] Opens at `http://localhost:8002/static/docs/relationship-v5/` via `service.py` with no build step and no network fetches beyond same-origin files.
- [ ] No console errors on load, view switch, selection or story playback in Chrome, Edge and Safari.
- [ ] Every class used exists in `rm5.css` or `styles.css`. There are zero Tailwind arbitrary classes.

**Views**
- [ ] Runtime is the default, and `R`/`D` plus the header switch toggle views in ≤ 300ms.
- [ ] Domain view shows exactly the 11 nodes and 17 edges of `relationship_model.json`, with its IDs and labels.
- [ ] Runtime view shows the three human gates as visibly distinct cards with avatars.
- [ ] A mapped selection survives a view switch, and an unmapped one clears with an explanation.

**Interaction**
- [ ] Clicking a node highlights its full upstream and downstream lineage to the end of each path. Everything else is at ≤ 0.3 opacity and desaturated, and non-lineage edges have no animation.
- [ ] Upstream and downstream are visually distinct (color and dot direction).
- [ ] Clicking an edge shows its condition, field and description.
- [ ] Clicking a condition chip isolates edges of that operator.
- [ ] `Esc` and a background click clear the selection. The keyboard can reach and select every node.
- [ ] Deep links (`#/map/domain?node=project_card`) restore view and selection on reload.

**Animation**
- [ ] Flow dots run only on active edges, in the correct direction.
- [ ] With `prefers-reduced-motion`, no element animates and direction is still shown by static arrowheads.
- [ ] Story mode plays 6–8 steps end-to-end, can be paused, stepped and replayed, and always shows the "Replay of seed data" label.

**Accuracy**
- [ ] Validation group G passes with zero failures.
- [ ] No Domain edge uses a condition outside the six operators.
- [ ] No real client names. Only Acme Corp / NovaTech Labs appear.
- [ ] Every `planned` node shows the dashed border and "VISION" pill, and no `live` node lacks a module path.
- [ ] No numbers on screen that are not traceable to a seed file.

**Look and layout**
- [ ] Uses only the pastel tokens in § 5, with rounded cards (16px), pills (9999px) and no pure black.
- [ ] At 390px width: no horizontal page scroll, the inspector is a bottom sheet, and the tabs scroll.
- [ ] Condition types are distinguishable in grayscale (pattern plus glyph, not color alone).
- [ ] Text contrast is ≥ 4.5:1 on every pastel fill.

**Judge test**
- [ ] A first-time viewer can answer "where do humans decide?" and "how does an email reach a project?" within 60 seconds using only the Try chips.

---

## 13. Open questions (decide before build)

1. Which module folders are live: numbered (`04-harvester`) or named (`platform-*`, `domain-*`)? This drives runtime status.
2. Should Emails and Teams VTT stay `planned` for the hackathon, or are either `partial`?
3. Should the story use the Risk Log row scenario, or a Connected Chatter post (simpler, with EXACT OppID)?
4. Does v5 replace `Project-Onion-Relationship-Model.html` and `Continuum-V4-Final.html` at their current links, or live alongside them until the demo?
