// story.js: "One risk, told twice, becomes one card" (scope § 9).
// A replay of seed data, NOT live telemetry. Every value below is quoted from
// a tracked repo file, and each step names that file in `detail.source`.
//
//   data/seed/clients.json         Acme Corp · acme.com
//   data/seed/anchors_persist.json APOLLO-123 · OPP-8891 · GDP 8399 · Risk_Log_Apollo.xlsx
//   data/seed/cards.json           timeline#Week33 · source_rows Row12 + Row18 · significance_score 0.9
//   archive/root/GLOBAL_BRAIN.md                "Week 33: Laptop 50%->100% [Row12+Row18]"
//   core/VectorSync.js             similarity gate 0.85
//
// Step fields: `nodes` / `edges` are leaf IDs (lib/layout.js folds them onto
// collapsed groups), `expand` is the one group to open, `token` is the edge
// the story token travels along.

export const STORY_TITLE = 'One risk, told twice, becomes one card';

export const STORY_STEPS = [
  {
    nodes: ['client_master', 'project_card'], edges: ['r-cm-pc'], expand: null, token: null,
    caption: 'Everything is scoped to Acme Corp and one project anchor, APOLLO-123.',
    detail: {
      heading: 'Scope',
      rows: [['Client', 'Acme Corp (acme.com)'], ['Anchor', 'APOLLO-123'], ['Opportunity', 'OPP-8891'], ['GDP ID', '8399']],
      source: 'data/seed/clients.json · data/seed/anchors_persist.json',
    },
  },
  {
    nodes: ['project_card', 'sp_risk_log'], edges: ['r-pc-spr'], expand: 'sharepoint', token: 'r-pc-spr',
    caption: 'The project’s Risk Log arrives. Row 12 records the laptop rollout at 50%.',
    detail: {
      heading: 'Risk Log · Row 12',
      rows: [['File', '…/Planning Documents/Risk_Log_Apollo.xlsx'], ['Row', 'Row12'], ['Week', 'Week 33'], ['Laptops', '50%']],
      source: 'data/seed/anchors_persist.json · archive/root/GLOBAL_BRAIN.md',
    },
  },
  {
    nodes: ['sp_risk_log', 'harvester'], edges: ['r-spr-hv'], expand: 'sharepoint', token: 'r-spr-hv',
    caption: 'The Harvester collects the row with its provenance: which file, which row, when.',
    detail: {
      heading: 'Provenance kept with the item',
      rows: [['Source', 'Risk_Log_Apollo.xlsx'], ['Row', 'Row12'], ['Staged as', 'pending_processing'], ['Kept', 'file URL · row · captured-at time']],
      source: 'core/FailoverDB.js: stageToDataPark',
    },
  },
  {
    nodes: ['harvester', 'privacy_gate'], edges: ['r-hv-pg'], expand: 'sharepoint', token: 'r-hv-pg',
    caption: 'A person confirms scope. Only Acme’s domain is linked, and emails and phone numbers are redacted.',
    detail: {
      heading: 'Human gate 1 · Privacy & Scope',
      rows: [['Allowed domain', 'acme.com'], ['Redacted', 'emails, phone numbers'], ['Kept', 'Project, Opp, GDP, SoW, PO numbers']],
      source: 'core/PiiGate.js · data/seed/clients.json',
    },
  },
  {
    nodes: ['privacy_gate', 'typed_linking'], edges: ['r-pg-tl'], expand: 'sharepoint', token: 'r-pg-tl',
    caption: 'Typed linking joins the row to the project by URL_CONTAINS, and to RAID by CONTAINS. No guesswork.',
    detail: {
      heading: 'Typed rules applied',
      rows: [['URL_CONTAINS', 'sharepoint_urls[] contains .xlsx URL'], ['CONTAINS', 'Date Raised, RAID Type, Description, Mitigation']],
      source: 'data/seed/relationship_model.json (edges project_card → sp_risk_log, sp_risk_log → raid_agg)',
    },
  },
  {
    nodes: ['sp_risk_log', 'harvester', 'privacy_gate', 'typed_linking', 'vector_build'],
    edges: ['r-spr-hv', 'r-hv-pg', 'r-pg-tl', 'r-vb-tl'], expand: 'sharepoint', token: 'r-vb-tl',
    caption: 'Later, Row 18 arrives: the laptop rollout reaches 100%. It is matched to the same item, not filed as a new risk.',
    detail: {
      heading: 'Row 18 · same item?',
      rows: [['Row', 'Row18'], ['Laptops', '100%'], ['Score recorded in seed for Row12 + Row18', '0.9'], ['Match gate in code', 'similarity ≥ 0.85']],
      note: 'The seed records one score for the merged pair (significance_score). Live matching uses vector similarity in VectorSync.js.',
      source: 'data/seed/cards.json · core/VectorSync.js',
    },
  },
  {
    nodes: ['typed_linking', 'review_gate', 'status_cards'], edges: ['r-tl-rg', 'r-rg-sc'], expand: 'cards', token: 'r-rg-sc',
    caption: 'A person approves. One card, one timeline: Open → Partial → Closed.',
    detail: {
      heading: 'Human gate 2 · one card',
      rows: [['Card', 'timeline#Week33'], ['Open', 'item raised'], ['Partial', 'Row12 · 50%'], ['Closed', 'Row18 · 100%'], ['Sources', 'Row12 + Row18']],
      source: 'data/seed/cards.json · archive/root/GLOBAL_BRAIN.md',
    },
  },
  {
    nodes: ['status_cards', 'share_gate', 'hub'], edges: ['r-sc-sg', 'r-sg-hub'], expand: 'cards', token: 'r-sg-hub',
    caption: 'Shared with the team. When the PM moves on, the decision stays with the project.',
    showWhy: true,
    detail: {
      heading: 'Human gate 3 · Team Shared',
      rows: [['Visibility', 'Team Shared'], ['Anchor', 'APOLLO-123'], ['Freshness', '2 days']],
      source: 'data/seed/cards.json · core/FailoverDB.js: updateCardPrivacy',
    },
  },
];

export const STORY_AUTO_ADVANCE_MS = 4000;
export const STORY_LABEL = 'Replay of seed data · not live telemetry';
