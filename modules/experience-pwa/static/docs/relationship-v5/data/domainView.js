// domainView.js: the Domain view ("what the business model means").
// Nodes and edges come verbatim from domainModel.js (generated from
// data/seed/relationship_model.json). This file adds only presentation:
// lanes, card kind, and the team's Live / Partial / Vision status per node.
import { DOMAIN_MODEL } from './domainModel.js';

export const DOMAIN_LANES = [
  { id: 'scope',   label: 'Scope',                  row: 0, col: 0, nodes: ['client_master'] },
  { id: 'anchor',  label: 'Anchor',                 row: 0, col: 1, nodes: ['project_card'] },
  { id: 'docs',    label: 'Sources · documents',    row: 0, col: 2, nodes: ['sp_comm_plan', 'sp_risk_log', 'sp_esc', 'gdp_dash', 'gdp_excel'] },
  { id: 'convo',   label: 'Sources · conversations', row: 0, col: 3, nodes: ['connected', 'emails', 'teams_chats', 'teams_vtt'] },
  { id: 'outcome', label: 'Outcome',                row: 0, col: 4, nodes: ['raid_agg'] },
];

export const DOMAIN_ROW_LABELS = ['Every source ties back to the Project Anchor by a typed rule'];

// Card colour family per JSON "group". raid_agg is grouped as an anchor in the
// JSON but is the outcome of the model, so it gets its own look.
const KIND_BY_GROUP = {
  master: 'master', anchor: 'anchor', sharepoint: 'source-sp', gdp: 'source-gdp',
  comm: 'source-comm', connected: 'source-connected',
};

const STATUS = {
  client_master: ['live', 'archive/modules/platform-anchor/seed_clients.py'],
  project_card:  ['live', 'archive/modules/platform-anchor/service.py'],
  sp_comm_plan:  ['partial', 'Link registered on anchor; document not crawled yet'],
  sp_risk_log:   ['partial', 'experience-pwa App.js: XLSX upload parser'],
  sp_esc:        ['partial', 'Link registered on anchor; Opp ID from file name'],
  gdp_dash:      ['partial', 'archive/modules/gdp-adapter/service.py'],
  gdp_excel:     ['partial', 'archive/modules/integrations-gdp-adapter/parse.js'],
  connected:     ['live', 'archive/modules/connected-bookmarklet'],
  emails:        ['vision', 'Not built: no Microsoft Graph consent'],
  teams_chats:   ['vision', 'Not built: no Microsoft Graph consent'],
  teams_vtt:     ['vision', 'Not built: no Microsoft Graph consent'],
  raid_agg:      ['partial', 'archive/modules/domain-cards-store; conversation sources not built'],
};

// One-line card subtitle. Presentation only: the full identifiers, fields and
// filter keywords from the JSON are shown in the inspector.
const SUB = {
  client_master: 'Account Name · EXACT', project_card: 'anchor_id · Opp IDs · GDP ID',
  sp_comm_plan: '.docx · contacts', sp_risk_log: '.xlsx · RAID rows', sp_esc: '.xlsm · Opp ID in name',
  gdp_dash: 'GDP ID from URL', gdp_excel: 'Weekly delta by Status Date', connected: 'Opp record posts',
  emails: 'Threads · IDs + domain', teams_chats: 'Allow-listed channels', teams_vtt: 'Meeting transcripts',
  raid_agg: 'hash(sources + description)',
};

function shortSub(n) {
  return SUB[n.id] || n.group;
}

export const DOMAIN_NODES = Object.fromEntries(DOMAIN_MODEL.nodes.map((n) => {
  const [status, evidence] = STATUS[n.id] || ['vision', 'Not mapped'];
  return [n.id, {
    label: n.label,
    sub: shortSub(n),
    kind: n.id === 'raid_agg' ? 'outcome' : (KIND_BY_GROUP[n.group] || 'service'),
    status,
    desc: n.notes,
    evidence: [evidence],
    domain: n, // identifiers, fields, filters, examplePath for the inspector
  }];
}));

export const DOMAIN_EDGES = DOMAIN_MODEL.edges.map((e) => ({
  id: 'd-' + e.from + '-' + e.to,
  from: e.from, to: e.to,
  condition: e.condition, label: e.label, field: e.field, description: e.description,
}));
