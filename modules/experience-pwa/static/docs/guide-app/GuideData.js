// GuideData.js — extracted from modules/experience-pwa/static/docs/Continuum-V4-Final.html
// Source-of-truth reference only. Do NOT edit by hand; regenerate from the reference file.
// Counts: NODES=24 EDGES=43 POSITIONS=24 VALIDATION_SCRIPTS=15
// Reference demo tenant is McKinsey/Contoso (PROJ-114, opp_881). Live app uses Acme/NovaTech.
// SAFETY: reload-* chromeScripts contain localStorage.setItem + fetch and are DISPLAY-ONLY.
// Never auto-execute them; Validation.js renders Copy buttons and read-only try/catch runner.

export const BASE_POSITIONS = {
  "client_360": {
    "x": 40,
    "y": 40
  },
  "projects_anchor": {
    "x": 240,
    "y": 40
  },
  "sp_collab": {
    "x": 440,
    "y": 20
  },
  "sp_risk": {
    "x": 440,
    "y": 100
  },
  "sp_esc": {
    "x": 440,
    "y": 180
  },
  "gdp_url": {
    "x": 440,
    "y": 280
  },
  "gdp_weekly": {
    "x": 440,
    "y": 360
  },
  "teams_chats": {
    "x": 440,
    "y": 460
  },
  "teams_vtt": {
    "x": 440,
    "y": 540
  },
  "emails": {
    "x": 440,
    "y": 620
  },
  "connected_chatter": {
    "x": 440,
    "y": 700
  },
  "harvester": {
    "x": 720,
    "y": 100
  },
  "parser": {
    "x": 720,
    "y": 280
  },
  "human_review": {
    "x": 920,
    "y": 200
  },
  "key_moments": {
    "x": 1120,
    "y": 40
  },
  "informational_updates": {
    "x": 1120,
    "y": 140
  },
  "status_cards": {
    "x": 1120,
    "y": 260
  },
  "your_notes": {
    "x": 1120,
    "y": 380
  },
  "privacy_private": {
    "x": 1360,
    "y": 80
  },
  "privacy_shared": {
    "x": 1360,
    "y": 200
  },
  "vector_building": {
    "x": 1560,
    "y": 60
  },
  "hashtag_id": {
    "x": 1560,
    "y": 160
  },
  "classifier": {
    "x": 1560,
    "y": 260
  },
  "continuum_final": {
    "x": 1780,
    "y": 160
  }
};

export const NODES = [
  {
    "id": "client_360",
    "label": "Client 360",
    "sublabel": "Master • Root",
    "kind": "master",
    "color": "#E3F2E7",
    "border": "#C5E0CC",
    "desc": "Root account view - all data scoped here",
    "long": "Filters by Account Name + Client Domains. Golden record for tenant. Every downstream card inherits client_id. No data leaves this scope.",
    "logic": "EXACT match on account_name + DOMAIN overlap on client_domains[]",
    "sample": "client_360 / acc_92 • mckinsey.com → all projects",
    "icon": "◉",
    "column": 0
  },
  {
    "id": "projects_anchor",
    "label": "Projects (Anchors)",
    "sublabel": "Anchor • Project_id",
    "kind": "anchor",
    "color": "#FFE6E6",
    "border": "#F5C8C8",
    "desc": "Project_id, opp id, anchor - golden link",
    "long": "Anchors link via Project_id, Opp Id, Dealroom anchor. This is the JOIN key for SharePoint, GDP, Teams.",
    "logic": "EXACT project_id || CONTAINS opp_id || TOKEN_OVERLAP anchor_terms[>0.92]",
    "sample": "PROJ-114 • opp_881 • \"Phoenix Migration\"",
    "icon": "⚓",
    "column": 1
  },
  {
    "id": "sp_collab",
    "label": "SP • Collab Site",
    "sublabel": "Source • SharePoint",
    "kind": "source",
    "color": "#FFF4E5",
    "border": "#F0DDC0",
    "desc": "Collab documents & decks",
    "long": "SharePoint collaboration site crawl. Docs, decks, minutes. Typed as SOURCE.",
    "logic": "URL_CONTAINS /collab/ + DOMAIN mckinsey.sharepoint.com",
    "sample": "/sites/collab/Phoenix/Week3.pptx",
    "icon": "◧",
    "column": 2
  },
  {
    "id": "sp_risk",
    "label": "SP • Risk Log",
    "sublabel": "Source • Risk",
    "kind": "source",
    "color": "#FFF4E5",
    "border": "#F0DDC0",
    "desc": "Risk & issue logs",
    "long": "Risk register extraction. If overlap with RAID <0.9 → Informational.",
    "logic": "URL_CONTAINS /risk/ + TOKEN_OVERLAP risk_terms",
    "sample": "Risk #42 • Data delay • owner: J.Smith",
    "icon": "◧",
    "column": 2
  },
  {
    "id": "sp_esc",
    "label": "SP • Esc Hub",
    "sublabel": "Source • Escalation",
    "kind": "source",
    "color": "#FFF4E5",
    "border": "#F0DDC0",
    "desc": "Escalation hub tracking",
    "long": "Escalation hub. Parsed for status cards vs informational.",
    "logic": "URL_CONTAINS /esc/ + DATE_RANGE esc_date",
    "sample": "ESC-09 • Blocked on vendor API",
    "icon": "◧",
    "column": 2
  },
  {
    "id": "gdp_url",
    "label": "GDP • URL Feed",
    "sublabel": "Source • GDP",
    "kind": "source",
    "color": "#E8F0FF",
    "border": "#C8D9F5",
    "desc": "GDP links harvested",
    "long": "GDP URL feed. Weekly crawl of client docs.",
    "logic": "DOMAIN gdp.internal + URL_CONTAINS /deliverables/",
    "sample": "gdp://deliverable/114/sow.pdf",
    "icon": "↗",
    "column": 2
  },
  {
    "id": "gdp_weekly",
    "label": "GDP • Weekly",
    "sublabel": "Source • Status",
    "kind": "source",
    "color": "#E8F0FF",
    "border": "#C8D9F5",
    "desc": "Weekly status ingestion",
    "long": "Weekly status packs. Auto-classified via classifier threshold.",
    "logic": "CONTAINS \"weekly\" + DATE_RANGE within 7d",
    "sample": "Weekly #31 • Green • 3 risks closed",
    "icon": "↗",
    "column": 2
  },
  {
    "id": "teams_chats",
    "label": "Teams • Chats",
    "sublabel": "Source • Messages",
    "kind": "source",
    "color": "#EDE8FF",
    "border": "#D9D2F0",
    "desc": "Chat threads",
    "long": "Teams chat harvest. Human notes layer can override.",
    "logic": "TOKEN_OVERLAP chat_terms + EXACT channel_id",
    "sample": "Teams • #phoenix-ops • \"We shipped...\"",
    "icon": "◫",
    "column": 2
  },
  {
    "id": "teams_vtt",
    "label": "Teams • VTT",
    "sublabel": "Source • Transcript",
    "kind": "source",
    "color": "#EDE8FF",
    "border": "#D9D2F0",
    "desc": "Meeting transcripts",
    "long": "VTT transcripts parsed for key moments.",
    "logic": "CONTAINS vtt + DATE_RANGE meeting_date",
    "sample": "VTT • 2024-11-02 • 45m • 12 speakers",
    "icon": "◫",
    "column": 2
  },
  {
    "id": "emails",
    "label": "Emails",
    "sublabel": "Source • Inbox",
    "kind": "source",
    "color": "#FFF0F0",
    "border": "#F2D2D2",
    "desc": "Email threads",
    "long": "Email ingestion via Graph. Linked via project anchor.",
    "logic": "DOMAIN_CONTAINS client.com + TOKEN_OVERLAP subject",
    "sample": "Re: Phoenix SOW approval • 3 attachments",
    "icon": "✉",
    "column": 2
  },
  {
    "id": "connected_chatter",
    "label": "Connected • Chatter",
    "sublabel": "Source • Social",
    "kind": "source",
    "color": "#E6FFF0",
    "border": "#C2E8D0",
    "desc": "Internal chatter feed",
    "long": "Connected chatter. Lightest weight, mostly informational.",
    "logic": "TOKEN_OVERLAP chatter_tags + URL_CONTAINS /chatter/",
    "sample": "Chatter • \"Great win on Phoenix!\" • 12 likes",
    "icon": "◍",
    "column": 2
  },
  {
    "id": "harvester",
    "label": "Harvester",
    "sublabel": "Gate • Collect",
    "kind": "gate",
    "color": "#F0F6FF",
    "border": "#C5D9F5",
    "desc": "Collects from SP, GDP, Teams, Emails, Chatter",
    "long": "Polite crawler. Deduplicates by URL + content hash. Emits harvest_event with source provenance.",
    "logic": "Collect + Dedupe(content_hash) + Provenance(url, timestamp, actor)",
    "sample": "harvest_881 • 9 sources • 42 docs • 2.3s",
    "icon": "⬙",
    "column": 3
  },
  {
    "id": "parser",
    "label": "Parser • Typed Linking",
    "sublabel": "Gate • No free text",
    "kind": "gate",
    "color": "#FFF6D6",
    "border": "#F0E4A8",
    "desc": "EXACT, CONTAINS, DOMAIN, DATE_RANGE, TOKEN_OVERLAP, URL_CONTAINS - no free text",
    "long": "Typed linker only. Six operators. No embedding similarity here. Deterministic linking to anchors.",
    "logic": "EXACT | CONTAINS | DOMAIN | DATE_RANGE | TOKEN_OVERLAP | URL_CONTAINS",
    "sample": "parser • 42 docs → 38 linked (90%) • 4 orphaned",
    "icon": "⬡",
    "column": 3
  },
  {
    "id": "human_review",
    "label": "Human Review",
    "sublabel": "Gate • Privacy",
    "kind": "gate",
    "color": "#F5F3FF",
    "border": "#DCD6F0",
    "desc": "Privacy toggles, approvals, sync",
    "long": "Human-in-the-loop. Approves, sets Private/Shared, edits. Last gate before Data Park.",
    "logic": "Manual approval + privacy_select {private, shared} + syncStatus pending_processing → ready",
    "sample": "review_queue • 6 pending • avg age 14m",
    "icon": "◐",
    "column": 4
  },
  {
    "id": "key_moments",
    "label": "Key Moments",
    "sublabel": "Anchor • Milestone",
    "kind": "anchor",
    "color": "#E6F0FF",
    "border": "#C5D6F0",
    "desc": "Important milestones extracted",
    "long": "Milestones extracted via date + verb heuristics. Always shared if parent shared.",
    "logic": "DATE + ACTION_VERB + Anchor link >0.95",
    "sample": "Go-Live • 2024-12-01 • linked to PROJ-114",
    "icon": "◆",
    "column": 5
  },
  {
    "id": "informational_updates",
    "label": "Informational Updates",
    "sublabel": "If overlap <0.9 → info",
    "kind": "connected",
    "color": "#EEEEF5",
    "border": "#D5D5E0",
    "desc": "If overlap <0.9 → informational, not RAID",
    "long": "When TOKEN_OVERLAP with RAID <0.9, card becomes Informational, not RAID/Risk.",
    "logic": "IF TOKEN_OVERLAP(RAID_terms) <0.9 THEN type=informational ELSE type=status",
    "sample": "FYI: Vendor released new API docs • overlap 0.42 → informational",
    "icon": "◐",
    "column": 5
  },
  {
    "id": "status_cards",
    "label": "Status Cards",
    "sublabel": "TWO: RAW + Provenance",
    "kind": "anchor",
    "color": "#FFE8E8",
    "border": "#F0C8C8",
    "desc": "TWO: RAW content + Provenance + AI enriched",
    "long": "Every status card has TWO layers: RAW original content + Provenance (source url, timestamp, actor) + AI enrichment. This is the primary artifact.",
    "logic": "RAW + Provenance(url, actor, ts) + AI(enrichment, hashtags, vector)",
    "sample": "Status: Amber • RAW + prov + AI summary",
    "icon": "◩",
    "badge": "RAW + Provenance • AI",
    "column": 5
  },
  {
    "id": "your_notes",
    "label": "Your Notes",
    "sublabel": "Human layer",
    "kind": "comm",
    "color": "#F3E8FF",
    "border": "#DDC8F5",
    "desc": "Human notes layer, always private first",
    "long": "Private by default. Human notes never auto-shared. Must toggle to shared.",
    "logic": "DEFAULT privacy=private • manual toggle → shared",
    "sample": "Note: \"Client wants to delay by 1 week\" • private",
    "icon": "✎",
    "column": 5
  },
  {
    "id": "privacy_private",
    "label": "Privacy • Private",
    "sublabel": "Only owner",
    "kind": "gate",
    "color": "#F7F0FF",
    "border": "#DDD2F0",
    "desc": "Only owner sees",
    "long": "Private lane. Embeddings still built but not searchable by team.",
    "logic": "privacy==private → visibility=owner_only • vector_visibility=private",
    "sample": "12 cards • private • vector hidden from team",
    "icon": "🔒",
    "column": 6
  },
  {
    "id": "privacy_shared",
    "label": "Privacy • Shared",
    "sublabel": "Team visible",
    "kind": "gate",
    "color": "#E8FFF0",
    "border": "#C2E0C8",
    "desc": "Team visible after toggle",
    "long": "Shared after human toggle. Becomes searchable, appears in Continuum.",
    "logic": "privacy==shared → visibility=team • vector_visibility=shared • sync to Data Park",
    "sample": "28 cards • shared • searchable",
    "icon": "◍",
    "column": 6
  },
  {
    "id": "vector_building",
    "label": "Vector Building",
    "sublabel": "System learns",
    "kind": "continuum",
    "color": "#E8FFF0",
    "border": "#C2E0C8",
    "desc": "System learns - embeddings updated",
    "long": "Embeddings updated on shared cards. Incremental vector build.",
    "logic": "onShared → embed(text) → upsert to vector_db + update onion_vector_meta",
    "sample": "vector_meta • last_update 2m ago • 284 embeddings",
    "icon": "⬢",
    "column": 7
  },
  {
    "id": "hashtag_id",
    "label": "Hashtag ID",
    "sublabel": "Auto hashtag",
    "kind": "continuum",
    "color": "#FFF8D6",
    "border": "#F0E8B8",
    "desc": "Auto hashtag identification from sources",
    "long": "Hashtags extracted via frequency + anchor co-occurrence. No LLM for this step.",
    "logic": "TF-IDF + anchor_cooccur >3 → hashtag",
    "sample": "#phoenix-migration • 12 cards • trending",
    "icon": "#",
    "column": 7
  },
  {
    "id": "classifier",
    "label": "Classifier • Info vs Status",
    "sublabel": "Decision <0.9",
    "kind": "continuum",
    "color": "#E6F4EA",
    "border": "#C5E0CC",
    "desc": "Decision if input is Informational update or Status card",
    "long": "Final classifier decides Informational vs Status based on overlap threshold 0.9 and source weight.",
    "logic": "IF overlap<0.9 OR source_weight<0.5 THEN informational ELSE status",
    "sample": "classifier • 38 decisions • 12 informational / 26 status",
    "icon": "≋",
    "column": 7
  },
  {
    "id": "continuum_final",
    "label": "Continuum • Learning Hub",
    "sublabel": "Final goto",
    "kind": "continuum",
    "color": "linear-gradient(135deg,#E8FFF0 0%,#FFF8D6 50%,#E6F0FF 100%)",
    "border": "#D0C8E8",
    "desc": "Final goto - self-learning",
    "long": "Learning hub. All shared, classified, vectorized knowledge converges. Self-learning loop.",
    "logic": "Converge(private→shared→vector→hashtag→classifier) → continuum_final searchable",
    "sample": "Continuum • 284 vectors • 42 hashtags • 6 anchors",
    "icon": "◎",
    "column": 8
  }
];

export const EDGES = [
  {
    "id": "e1",
    "from": "client_360",
    "to": "projects_anchor",
    "condition": "EXACT account",
    "kind": "primary"
  },
  {
    "id": "e2a",
    "from": "projects_anchor",
    "to": "sp_collab",
    "condition": "EXACT project_id",
    "kind": "typed"
  },
  {
    "id": "e2b",
    "from": "projects_anchor",
    "to": "sp_risk",
    "condition": "CONTAINS opp_id",
    "kind": "typed"
  },
  {
    "id": "e2c",
    "from": "projects_anchor",
    "to": "sp_esc",
    "condition": "TOKEN_OVERLAP",
    "kind": "typed"
  },
  {
    "id": "e2d",
    "from": "projects_anchor",
    "to": "gdp_url",
    "condition": "DOMAIN",
    "kind": "typed"
  },
  {
    "id": "e2e",
    "from": "projects_anchor",
    "to": "gdp_weekly",
    "condition": "DATE_RANGE",
    "kind": "typed"
  },
  {
    "id": "e2f",
    "from": "projects_anchor",
    "to": "teams_chats",
    "condition": "EXACT channel",
    "kind": "typed"
  },
  {
    "id": "e2g",
    "from": "projects_anchor",
    "to": "teams_vtt",
    "condition": "DATE_RANGE",
    "kind": "typed"
  },
  {
    "id": "e2h",
    "from": "projects_anchor",
    "to": "emails",
    "condition": "DOMAIN_CONTAINS",
    "kind": "typed"
  },
  {
    "id": "e2i",
    "from": "projects_anchor",
    "to": "connected_chatter",
    "condition": "TOKEN_OVERLAP",
    "kind": "typed"
  },
  {
    "id": "e3a",
    "from": "sp_collab",
    "to": "harvester",
    "condition": "URL_CONTAINS",
    "kind": "primary"
  },
  {
    "id": "e3b",
    "from": "sp_risk",
    "to": "harvester",
    "condition": "URL_CONTAINS",
    "kind": "primary"
  },
  {
    "id": "e3c",
    "from": "sp_esc",
    "to": "harvester",
    "condition": "URL_CONTAINS",
    "kind": "primary"
  },
  {
    "id": "e3d",
    "from": "gdp_url",
    "to": "harvester",
    "condition": "DOMAIN",
    "kind": "primary"
  },
  {
    "id": "e3e",
    "from": "gdp_weekly",
    "to": "harvester",
    "condition": "DATE_RANGE",
    "kind": "primary"
  },
  {
    "id": "e3f",
    "from": "teams_chats",
    "to": "harvester",
    "condition": "TOKEN_OVERLAP",
    "kind": "primary"
  },
  {
    "id": "e3g",
    "from": "teams_vtt",
    "to": "harvester",
    "condition": "DATE_RANGE",
    "kind": "primary"
  },
  {
    "id": "e3h",
    "from": "emails",
    "to": "harvester",
    "condition": "DOMAIN_CONTAINS",
    "kind": "primary"
  },
  {
    "id": "e3i",
    "from": "connected_chatter",
    "to": "harvester",
    "condition": "TOKEN_OVERLAP",
    "kind": "primary"
  },
  {
    "id": "e3a2",
    "from": "sp_collab",
    "to": "parser",
    "condition": "TOKEN_OVERLAP",
    "kind": "typed"
  },
  {
    "id": "e3b2",
    "from": "sp_risk",
    "to": "parser",
    "condition": "TOKEN_OVERLAP <0.9?",
    "kind": "typed"
  },
  {
    "id": "e3f2",
    "from": "teams_chats",
    "to": "parser",
    "condition": "EXACT channel",
    "kind": "typed"
  },
  {
    "id": "e4",
    "from": "harvester",
    "to": "parser",
    "condition": "Dedupe + Provenance",
    "kind": "primary"
  },
  {
    "id": "e5",
    "from": "parser",
    "to": "human_review",
    "condition": "Linked 90%",
    "kind": "primary"
  },
  {
    "id": "e6a",
    "from": "human_review",
    "to": "key_moments",
    "condition": "Approved",
    "kind": "primary"
  },
  {
    "id": "e6b",
    "from": "human_review",
    "to": "informational_updates",
    "condition": "Overlap<0.9",
    "kind": "primary"
  },
  {
    "id": "e6c",
    "from": "human_review",
    "to": "status_cards",
    "condition": "RAW+Prov+AI",
    "kind": "primary"
  },
  {
    "id": "e6d",
    "from": "human_review",
    "to": "your_notes",
    "condition": "Private first",
    "kind": "primary"
  },
  {
    "id": "e7a",
    "from": "key_moments",
    "to": "privacy_shared",
    "condition": "Shared if parent shared",
    "kind": "privacy"
  },
  {
    "id": "e7b",
    "from": "informational_updates",
    "to": "privacy_private",
    "condition": "Check visibility",
    "kind": "privacy"
  },
  {
    "id": "e7b2",
    "from": "informational_updates",
    "to": "privacy_shared",
    "condition": "Toggle",
    "kind": "privacy"
  },
  {
    "id": "e7c",
    "from": "status_cards",
    "to": "privacy_private",
    "condition": "Default check",
    "kind": "privacy"
  },
  {
    "id": "e7c2",
    "from": "status_cards",
    "to": "privacy_shared",
    "condition": "Toggle → team",
    "kind": "privacy"
  },
  {
    "id": "e7d",
    "from": "your_notes",
    "to": "privacy_private",
    "condition": "Always private first",
    "kind": "privacy"
  },
  {
    "id": "e8a",
    "from": "privacy_private",
    "to": "vector_building",
    "condition": "Private vector",
    "kind": "learn"
  },
  {
    "id": "e8b",
    "from": "privacy_shared",
    "to": "vector_building",
    "condition": "Shared → embed",
    "kind": "learn"
  },
  {
    "id": "e8c",
    "from": "privacy_shared",
    "to": "hashtag_id",
    "condition": "TF-IDF",
    "kind": "learn"
  },
  {
    "id": "e8d",
    "from": "privacy_private",
    "to": "hashtag_id",
    "condition": "Co-occur",
    "kind": "learn"
  },
  {
    "id": "e8e",
    "from": "privacy_shared",
    "to": "classifier",
    "condition": "Overlap check",
    "kind": "learn"
  },
  {
    "id": "e8f",
    "from": "privacy_private",
    "to": "classifier",
    "condition": "Source weight",
    "kind": "learn"
  },
  {
    "id": "e9a",
    "from": "vector_building",
    "to": "continuum_final",
    "condition": "Embedding upsert",
    "kind": "learn"
  },
  {
    "id": "e9b",
    "from": "hashtag_id",
    "to": "continuum_final",
    "condition": "Hashtag converge",
    "kind": "learn"
  },
  {
    "id": "e9c",
    "from": "classifier",
    "to": "continuum_final",
    "condition": "Info vs Status",
    "kind": "learn"
  }
];

export const VALIDATION_SCRIPTS = [
  {
    "id": "val-acc",
    "group": "Group A: Seed Data Validation",
    "title": "Validate Account Names",
    "short": "Account names exist?",
    "what": "Checks if onion_db_state has valid client_360 account names and domains.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state') || '{\"clients\":[]}');\ns.clients?.map(c=>({ name: c.name, domains: c.domains, valid: !!c.name && c.domains?.length>0 })) || 'No clients seeded';",
    "safariScript": null,
    "sample": [
      {
        "name": "McKinsey Phoenix",
        "domains": [
          "mckinsey.com"
        ],
        "valid": true
      },
      {
        "name": "Contoso Ltd",
        "domains": [
          "contoso.com"
        ],
        "valid": true
      }
    ],
    "howToRead": "valid:true means account_name passes EXACT match and domains array non-empty. Used for Client 360 filter."
  },
  {
    "id": "val-proj",
    "group": "Group A: Seed Data Validation",
    "title": "Validate Project Anchors",
    "short": "Project anchors linked?",
    "what": "Lists projects with anchor terms and checks if opp_id present.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state')||'{\"projects\":[]}');\ns.projects?.map(p=>({ project_id: p.project_id, opp_id: p.opp_id, anchors: p.anchors?.slice(0,2), linked: p.anchors?.length>0 }));",
    "safariScript": null,
    "sample": [
      {
        "project_id": "PROJ-114",
        "opp_id": "opp_881",
        "anchors": [
          "Phoenix Migration",
          "Data Park"
        ],
        "linked": true
      }
    ],
    "howToRead": "linked:true means TOKEN_OVERLAP will work. Anchors are golden links for Parser."
  },
  {
    "id": "val-sp",
    "group": "Group A: Seed Data Validation",
    "title": "Validate SharePoint URLs",
    "short": "SP URLs reachable?",
    "what": "Checks stored SP URLs for URL_CONTAINS pattern /collab/ /risk/ /esc/",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state')||'{\"sp_urls\":[]}');\n(s.sp_urls||[]).map(u=>({ url: u.slice(0,50), contains_collab: u.includes('/collab/'), contains_risk: u.includes('/risk/'), ok: /\\/(collab|risk|esc)\\//.test(u) }));",
    "safariScript": null,
    "sample": [
      {
        "url": "https://mckinsey.sharepoint.com/sites/collab/Phoenix",
        "contains_collab": true,
        "ok": true
      }
    ],
    "howToRead": "ok:true means Harvester URL_CONTAINS rule will match. False = orphaned doc, won’t reach parser."
  },
  {
    "id": "reload-clients",
    "group": "Group B: Seed Data Reload",
    "title": "Reload Clients",
    "short": "Re-seed clients",
    "what": "Fetches seed clients.json and reloads into local state.",
    "chromeScript": "fetch('/data/seed/clients.json').then(r=>r.json()).then(data=>{\n  let s = JSON.parse(localStorage.getItem('onion_db_state')||'{}');\n  s.clients = data;\n  localStorage.setItem('onion_db_state', JSON.stringify(s));\n  console.log('Reloaded', data.length, 'clients');\n});",
    "safariScript": null,
    "sample": [
      {
        "action": "Reloaded",
        "count": 12,
        "status": "ok"
      }
    ],
    "howToRead": "Run to reset client master after testing. Check console for count."
  },
  {
    "id": "reload-proj",
    "group": "Group B: Seed Data Reload",
    "title": "Reload Projects",
    "short": "Re-seed projects",
    "what": "Reloads project anchors seed.",
    "chromeScript": "fetch('/data/seed/projects.json').then(r=>r.json()).then(data=>{\n  let s = JSON.parse(localStorage.getItem('onion_db_state')||'{}');\n  s.projects = data;\n  localStorage.setItem('onion_db_state', JSON.stringify(s));\n  console.log('Reloaded', data.length, 'projects');\n});",
    "safariScript": null,
    "sample": [
      {
        "action": "Reloaded",
        "count": 6,
        "status": "ok"
      }
    ],
    "howToRead": "Resets project anchors. Use when parser shows 0 linked."
  },
  {
    "id": "vec-updated",
    "group": "Group C: Vector Status",
    "title": "Check vector updated",
    "short": "Vector dirty?",
    "what": "Reads onion_vector_meta to see if embeddings are fresh.",
    "chromeScript": "JSON.parse(localStorage.getItem('onion_vector_meta')||'{}');",
    "safariScript": null,
    "sample": [
      {
        "last_update": "2024-11-10T14:32:00Z",
        "embedding_count": 284,
        "dirty": false,
        "version": 12
      }
    ],
    "howToRead": "dirty:false means vectors up-to-date. If dirty:true, harvester needs to re-embed."
  },
  {
    "id": "vec-when",
    "group": "Group C: Vector Status",
    "title": "When updated",
    "short": "Last update time",
    "what": "Shows human-readable age of last vector build.",
    "chromeScript": "let m = JSON.parse(localStorage.getItem('onion_vector_meta')||'{}');\nif(!m.last_update) 'No vector built yet';\nelse {\n  let ageM = Math.round((Date.now() - new Date(m.last_update))/60000);\n  ({ last_update: m.last_update, age: ageM+'m ago', count: m.embedding_count });\n}",
    "safariScript": "let m = JSON.parse(localStorage.getItem('onion_vector_meta')||'{}');\nif(!m.last_update) 'No vector built yet';\nelse {\n  // Safari needs ISO fix: replace space with T if needed\n  let iso = m.last_update.replace(' ', 'T');\n  let ageM = Math.round((Date.now() - new Date(iso))/60000);\n  ({ last_update: m.last_update, age: ageM+'m ago', count: m.embedding_count });\n}",
    "sample": [
      {
        "last_update": "2024-11-10T14:32:00Z",
        "age": "2m ago",
        "count": 284
      }
    ],
    "howToRead": "Age >60m means stale. Vector Building node should trigger after shared toggle."
  },
  {
    "id": "vec-count",
    "group": "Group C: Vector Status",
    "title": "Embedding count",
    "short": "How many vectors?",
    "what": "Counts embeddings in vector store.",
    "chromeScript": "let v = JSON.parse(localStorage.getItem('onion_vectors')||'[]');\n({ total: v.length, private: v.filter(x=>x.visibility==='private').length, shared: v.filter(x=>x.visibility==='shared').length });",
    "safariScript": null,
    "sample": [
      {
        "total": 284,
        "private": 112,
        "shared": 172
      }
    ],
    "howToRead": "Shared count should equal privacy_shared cards. Private hidden from team search."
  },
  {
    "id": "timeline-date",
    "group": "Group D: Timeline / Data Park",
    "title": "Check Data Park card date before review",
    "short": "Card date before review",
    "what": "The example script from spec - shows pending_processing cards with created_at age.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state') || '{\"timeline\":[]}');\ns.timeline.filter(t=>t.syncStatus==='pending_processing').map(p=>({\n  title: p.title?.slice(0,40),\n  created_at: p.created_at,\n  timestamp: p.timestamp,\n  age_mins: Math.round((Date.now() - new Date(p.created_at))/60000)+'m ago',\n  source: p.source\n}));",
    "safariScript": "let s = JSON.parse(localStorage.getItem('onion_db_state') || '{\"timeline\":[]}');\ns.timeline.filter(t=>t.syncStatus==='pending_processing').map(p=>{\n  let d = new Date(p.created_at.replace ? p.created_at.replace(' ', 'T') : p.created_at);\n  return {\n    title: (p.title||'').slice(0,40),\n    created_at: p.created_at,\n    timestamp: p.timestamp,\n    age_mins: Math.round((Date.now() - d)/60000)+'m ago',\n    source: p.source\n  };\n});",
    "sample": [
      {
        "title": "Weekly Status #31 - Green",
        "created_at": "2024-11-10T14:20:00Z",
        "timestamp": "Just now",
        "age_mins": "12m ago",
        "source": "gdp_weekly"
      }
    ],
    "howToRead": "age_mins >30m means card stuck in pending_processing - human_review gate not approved. Check if human_review y=200."
  },
  {
    "id": "pending-age",
    "group": "Group D: Timeline / Data Park",
    "title": "Pending processing age",
    "short": "Age of pending",
    "what": "Groups pending cards by age bucket.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state')||'{\"timeline\":[]}');\nlet pend = s.timeline.filter(t=>t.syncStatus==='pending_processing');\nlet now = Date.now();\nlet buckets = { '<5m':0, '5-30m':0, '30m-2h':0, '>2h':0 };\npend.forEach(p=>{\n  let age = (now - new Date(p.created_at))/60000;\n  if(age<5) buckets['<5m']++; else if(age<30) buckets['5-30m']++; else if(age<120) buckets['30m-2h']++; else buckets['>2h']++;\n});\n({ total_pending: pend.length, buckets });",
    "safariScript": null,
    "sample": [
      {
        "total_pending": 6,
        "buckets": {
          "<5m": 1,
          "5-30m": 3,
          "30m-2h": 2,
          ">2h": 0
        }
      }
    ],
    "howToRead": ">2h bucket >0 indicates stuck pipeline - check harvester logs."
  },
  {
    "id": "sync-status",
    "group": "Group D: Timeline / Data Park",
    "title": "Sync status",
    "short": "All sync statuses",
    "what": "Counts timeline by syncStatus.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state')||'{\"timeline\":[]}');\nlet counts = {};\ns.timeline.forEach(t=>{ counts[t.syncStatus] = (counts[t.syncStatus]||0)+1; });\ncounts;",
    "safariScript": null,
    "sample": [
      {
        "pending_processing": 6,
        "ready": 28,
        "failed": 1
      }
    ],
    "howToRead": "ready = reached Continuum final. pending_processing = waiting human_review. failed = parser orphan."
  },
  {
    "id": "priv-count",
    "group": "Group E: Privacy & Visibility",
    "title": "Private vs Shared count",
    "short": "Privacy split",
    "what": "Counts cards by privacy selection.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state')||'{\"timeline\":[]}');\nlet priv = { private:0, shared:0 };\ns.timeline.forEach(t=>{ if(t.privacy==='private') priv.private++; else if(t.privacy==='shared') priv.shared++; });\npriv;",
    "safariScript": null,
    "sample": [
      {
        "private": 12,
        "shared": 28
      }
    ],
    "howToRead": "Private first is default. Shared requires toggle in human_review. Ratio shows adoption."
  },
  {
    "id": "priv-toggle",
    "group": "Group E: Privacy & Visibility",
    "title": "Toggle effect",
    "short": "What toggle does?",
    "what": "Simulates privacy toggle effect on visibility and vector.",
    "chromeScript": "// Dry run: what happens when you toggle private→shared\nlet card = { id:'test_01', privacy:'private', visibility:'owner_only' };\nfunction toggle(c){\n  return { ...c, privacy:'shared', visibility:'team', vector_visibility:'shared', syncStatus:'ready', search: true };\n}\ntoggle(card);",
    "safariScript": null,
    "sample": [
      {
        "id": "test_01",
        "privacy": "shared",
        "visibility": "team",
        "vector_visibility": "shared",
        "syncStatus": "ready",
        "search": true
      }
    ],
    "howToRead": "Toggle changes visibility owner_only→team and makes vector searchable. See privacy nodes."
  },
  {
    "id": "class-decision",
    "group": "Group F: Card Classification",
    "title": "Info vs Status decision",
    "short": "Decision logic",
    "what": "Reproduces classifier logic: overlap threshold 0.9.",
    "chromeScript": "function classify(overlap, source_weight){\n  if(overlap <0.9 || source_weight <0.5) return 'informational_updates';\n  return 'status_cards';\n}\n[\n  { overlap:0.42, source_weight:0.8, result: classify(0.42,0.8) },\n  { overlap:0.95, source_weight:0.9, result: classify(0.95,0.9) }\n];",
    "safariScript": null,
    "sample": [
      {
        "overlap": 0.42,
        "source_weight": 0.8,
        "result": "informational_updates"
      },
      {
        "overlap": 0.95,
        "source_weight": 0.9,
        "result": "status_cards"
      }
    ],
    "howToRead": "Overlap from TOKEN_OVERLAP with RAID terms. <0.9 = informational (light), >=0.9 = status (needs action)."
  },
  {
    "id": "threshold-check",
    "group": "Group F: Card Classification",
    "title": "<0.9 threshold check",
    "short": "Threshold audit",
    "what": "Audits timeline for threshold edge cases.",
    "chromeScript": "let s = JSON.parse(localStorage.getItem('onion_db_state')||'{\"timeline\":[]}');\ns.timeline.filter(t=>t.overlap!==undefined).map(t=>({\n  title: t.title?.slice(0,30),\n  overlap: t.overlap,\n  type: t.type,\n  correct: (t.overlap<0.9 && t.type==='informational') || (t.overlap>=0.9 && t.type==='status')\n})).slice(0,5);",
    "safariScript": null,
    "sample": [
      {
        "title": "FYI: New API docs",
        "overlap": 0.42,
        "type": "informational",
        "correct": true
      }
    ],
    "howToRead": "correct:false means misclassified - classifier node needs retrain. Check classifier • Info vs Status."
  }
];

export const TABS = ['flow', 'inventory', 'validation', 'model'];

export const TAB_LABELS = { flow: "Data Flow", inventory: "Inventory", validation: "Validation", model: "Model" };

export const COLOR_TOKENS = {
  inactiveEdge: "#C8C2CE",
  activeEdge: "#6B6B7A",
  canvasBg: "#FCFBF9",
  border: "#E8E2E0",
  ink: "#2F313E",
  muted: "#6B6B7A"
};

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function groupedValidationScripts() {
  const groups = {};
  for (const s of VALIDATION_SCRIPTS) { (groups[s.group] = groups[s.group] || []).push(s); }
  return groups;
}

export function bfsReachable(startId) {
  // BFS downstream from startId to continuum_final (never stops early).
  const adj = {};
  for (const e of EDGES) { (adj[e.from] = adj[e.from] || []).push(e); }
  const nodes = new Set([startId]);
  const edgeIds = new Set();
  const queue = [startId];
  while (queue.length) {
    const cur = queue.shift();
    for (const e of (adj[cur] || [])) { edgeIds.add(e.id); if (!nodes.has(e.to)) { nodes.add(e.to); queue.push(e.to); } }
  }
  return { nodes, edgeIds };
}
