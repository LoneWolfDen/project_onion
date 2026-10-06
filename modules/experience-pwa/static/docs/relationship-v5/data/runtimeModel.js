// runtimeModel.js: the Runtime view ("what actually happens").
// Scope § 5: 13 top-level nodes, six of them groups that expand in place.
//
// Edges are declared between LEAF nodes only. When a group is collapsed, the
// layout folds its children's edges onto the group card (lib/layout.js), so
// expanding a group never needs a second edge list.
//
// Status and evidence follow scope § 11 rule 3: only named module folders and
// experience-pwa count as evidence. Numbered folders (01-…09-) are specs only.

export const RUNTIME_LANES = [
  // Row 0: capture and protect
  { id: 'scope',   label: 'Scope',    row: 0, col: 0, nodes: ['anchor'] },
  { id: 'sources', label: 'Sources',  row: 0, col: 1, nodes: ['sharepoint', 'gdp', 'connected', 'comms'] },
  { id: 'collect', label: 'Collect',  row: 0, col: 2, nodes: ['harvester'] },
  { id: 'gate1',   label: 'Gate 1',   row: 0, col: 3, nodes: ['privacy_gate'] },
  { id: 'link',    label: 'Link',     row: 0, col: 4, nodes: ['typed_linking'] },
  // Row 1: decide and learn
  { id: 'gate2',   label: 'Gate 2',   row: 1, col: 0, nodes: ['review_gate'] },
  { id: 'cards',   label: 'Cards',    row: 1, col: 1, nodes: ['cards'] },
  { id: 'gate3',   label: 'Gate 3',   row: 1, col: 2, nodes: ['share_gate'] },
  { id: 'learn',   label: 'Learn',    row: 1, col: 3, nodes: ['learning'] },
  { id: 'hub',     label: 'Hub',      row: 1, col: 4, nodes: ['hub'] },
];

export const RUNTIME_ROW_LABELS = ['1 · Capture and protect', '2 · Decide and learn'];

export const RUNTIME_NODES = {
  // ── Scope ────────────────────────────────────────────────────────────────
  anchor: {
    label: 'Client & Project Anchor', sub: 'Scope · anchor_id', kind: 'anchor', status: 'live',
    children: ['client_master', 'project_card'],
    desc: 'Everything is scoped to one client and one project anchor before anything is collected.',
    evidence: ['archive/modules/platform-anchor/service.py (:8000)', 'experience-pwa header: client + project'],
  },
  client_master: {
    label: 'Client Master', sub: 'Account Name · EXACT', kind: 'master', status: 'live', parent: 'anchor',
    desc: 'The client dropdown. Read-only; it filters every project card by Account Name.',
    evidence: ['archive/modules/platform-anchor/seed_clients.py', 'data/seed/clients.json'],
    sample: [['Client', 'Acme Corp'], ['Domain', 'acme.com'], ['Projects', 'Apollo-123, Apollo-124, Helios-09']],
    sampleSource: 'data/seed/clients.json',
  },
  project_card: {
    label: 'Project Card / Anchor', sub: 'anchor_id · Opp IDs', kind: 'anchor', status: 'live', parent: 'anchor',
    desc: 'Holds every reference for one project: Opp IDs, GDP ID, SharePoint URLs, Teams channels.',
    evidence: ['archive/modules/platform-anchor/service.py', 'data/seed/anchors_persist.json'],
    sample: [['Anchor', 'APOLLO-123'], ['Opportunity', 'OPP-8891'], ['GDP ID', '8399'], ['Project ID', 'PO-12345']],
    sampleSource: 'data/seed/anchors_persist.json',
  },

  // ── Sources ──────────────────────────────────────────────────────────────
  sharepoint: {
    label: 'SharePoint', sub: '3 document types', kind: 'source-sp', status: 'partial',
    children: ['sp_comm_plan', 'sp_risk_log', 'sp_esc'],
    desc: 'Project documents. Links are registered on the anchor; Excel files are parsed on upload.',
    evidence: ['experience-pwa App.js: XLSX upload parser', 'integrations-sharepoint-adapter: contract only, no code yet'],
  },
  sp_comm_plan: {
    label: 'Collaboration Plan', sub: '.docx · contacts', kind: 'source-sp', status: 'partial', parent: 'sharepoint',
    desc: 'Communications library. Supplies the project contacts list.',
    evidence: ['Link registered on anchor; document not crawled yet'],
    sample: [['File', '…/Communications/Collaboration_Plan.docx']], sampleSource: 'data/seed/anchors_persist.json',
  },
  sp_risk_log: {
    label: 'Risk Log', sub: '.xlsx · RAID rows', kind: 'source-sp', status: 'partial', parent: 'sharepoint',
    desc: 'RAID register. Each row is one item; sheets named RAID, RAID Log, Log or RISK Log.',
    evidence: ['experience-pwa App.js: XLSX.read on upload'],
    sample: [['File', '…/Planning Documents/Risk_Log_Apollo.xlsx'], ['Rows in story', 'Row12, Row18']],
    sampleSource: 'data/seed/anchors_persist.json, data/seed/cards.json',
  },
  sp_esc: {
    label: 'ESC', sub: '.xlsm · Opp ID', kind: 'source-sp', status: 'partial', parent: 'sharepoint',
    desc: 'Engagement scoping file. The Opportunity ID is read from the file name.',
    evidence: ['Link registered on anchor; Opp ID parsed from file name'],
    sample: [['File', '…/Planning Documents/ESC_Apollo.xlsm']], sampleSource: 'data/seed/anchors_persist.json',
  },
  gdp: {
    label: 'GDP', sub: 'Dashboard + weekly Excel', kind: 'source-gdp', status: 'partial',
    children: ['gdp_dash', 'gdp_excel'],
    desc: 'Delivery dashboard link and its weekly Excel export, merged into one source.',
    evidence: ['archive/modules/gdp-adapter/service.py (:8003)', 'archive/modules/integrations-gdp-adapter/parse.js'],
  },
  gdp_dash: {
    label: 'GDP Dashboard URL', sub: 'GDP ID from URL', kind: 'source-gdp', status: 'partial', parent: 'gdp',
    desc: 'The GDP ID is parsed from /project-details/{id}.',
    evidence: ['archive/modules/gdp-adapter/service.py'],
    sample: [['URL', '…/project-details/8399'], ['GDP ID', '8399']], sampleSource: 'data/seed/anchors_persist.json',
  },
  gdp_excel: {
    label: 'GDP Weekly Excel', sub: 'Delta by Status Date', kind: 'source-gdp', status: 'partial', parent: 'gdp',
    desc: 'Weekly delta export. Used for timeline and freshness.',
    evidence: ['archive/modules/integrations-gdp-adapter/parse.js'],
  },
  connected: {
    label: 'Connected Chatter', sub: 'Opp record · EXACT', kind: 'source-connected', status: 'live',
    desc: 'Posts on the Opportunity record. Every post relates to that Opp ID.',
    evidence: ['archive/modules/connected-bookmarklet (:8004)', 'archive/modules/integrations-connected-adapter/bookmarklet.js'],
    sample: [['Record', '006Uj00000QOBkvIAH']], sampleSource: 'data/seed/anchors_persist.json',
  },
  comms: {
    label: 'Emails & Teams', sub: 'Vision · no Graph consent', kind: 'source-comm', status: 'vision',
    children: ['emails', 'teams_chats', 'teams_vtt'],
    desc: 'Outlook and Teams. Designed but not connected: there is no Microsoft Graph consent yet.',
    evidence: ['Not built'],
  },
  emails: {
    label: 'Emails', sub: 'Outlook threads', kind: 'source-comm', status: 'vision', parent: 'comms',
    desc: 'Threads filtered by project IDs, client domain and tokens.', evidence: ['Not built'],
  },
  teams_chats: {
    label: 'Teams Chats', sub: 'Allow-listed channels', kind: 'source-comm', status: 'vision', parent: 'comms',
    desc: 'Only channels the user nominates.', evidence: ['Not built'],
  },
  teams_vtt: {
    label: 'Teams VTT', sub: 'Meeting transcripts', kind: 'source-comm', status: 'vision', parent: 'comms',
    desc: 'Transcripts matched by attendee domain and spoken IDs.', evidence: ['Not built'],
  },

  // ── Collect → Gate 1 → Link ──────────────────────────────────────────────
  harvester: {
    label: 'Harvester', sub: 'Collect · provenance', kind: 'service', status: 'live',
    desc: 'Collects items into the Data Park with provenance: where it came from, which row, when.',
    evidence: ['experience-pwa components/HarvesterPanel.js', 'experience-pwa core/FailoverDB.js'],
  },
  privacy_gate: {
    label: 'Privacy & Scope', sub: 'Human gate 1', kind: 'gate', gate: 1, status: 'partial',
    desc: 'A person decides what may be linked. Emails and phone numbers are redacted before storage.',
    evidence: ['experience-pwa core/PiiGate.js (client-side regex)', 'platform-pii-screener: no code yet'],
  },
  typed_linking: {
    label: 'Typed Linking', sub: 'Six operators only', kind: 'service', status: 'partial',
    desc: 'Joins each item to its project with EXACT, CONTAINS, DOMAIN, DATE_RANGE, TOKEN_OVERLAP or URL_CONTAINS. No free text.',
    evidence: ['archive/modules/domain-fusion-engine/fuse.js', 'experience-pwa core/schema.js (ID matching)'],
  },

  // ── Gate 2 → Cards → Gate 3 ──────────────────────────────────────────────
  review_gate: {
    label: 'Review (Data Park)', sub: 'Human gate 2', kind: 'gate', gate: 2, status: 'live',
    desc: 'Suggested cards wait as pending_processing until a person approves, edits or rejects them.',
    evidence: ['experience-pwa components/HarvesterPanel.js', 'experience-pwa core/FailoverDB.js: pending_processing'],
  },
  cards: {
    label: 'Continuum Cards', sub: '4 card types', kind: 'store', status: 'live',
    children: ['key_moments', 'status_cards', 'info_updates', 'your_notes'],
    desc: 'Approved knowledge, stored per project with its source.',
    evidence: ['archive/modules/domain-cards-store/service.py (:8001)', 'experience-pwa components/TimelineCard.js'],
  },
  key_moments: {
    label: 'Key Moments', sub: 'Milestones', kind: 'store', status: 'live', parent: 'cards',
    desc: 'Dated milestones such as extensions and approvals.', evidence: ['experience-pwa components/AppCenter.js'],
  },
  status_cards: {
    label: 'Status Cards', sub: 'RAW + Provenance + AI', kind: 'store', status: 'live', parent: 'cards',
    desc: 'Every card keeps the RAW source text, its provenance, and the AI summary side by side.',
    evidence: ['archive/modules/domain-cards-store/service.py', 'experience-pwa components/TimelineCard.js'],
    sample: [['Card', 'timeline#Week33'], ['Source rows', 'Row12 + Row18'], ['Anchor', 'APOLLO-123'], ['Freshness', '2 days']],
    sampleSource: 'data/seed/cards.json',
  },
  info_updates: {
    label: 'Informational Updates', sub: 'Routine, low impact', kind: 'store', status: 'partial', parent: 'cards',
    desc: 'Items the AI scores below 0.5 impact are kept as information, not RAID.',
    evidence: ['experience-pwa core/AiClient.js: impactScore < 0.5 = routine'],
  },
  your_notes: {
    label: 'Your Notes', sub: 'Written by a person', kind: 'store', status: 'live', parent: 'cards',
    desc: 'Notes typed in Continuum. The author picks My Notes (private) or Team Shared when saving.',
    evidence: ['experience-pwa core/FailoverDB.js: updateNotePrivacy'],
  },
  share_gate: {
    label: 'Share: Private / Team', sub: 'Human gate 3', kind: 'gate', gate: 3, status: 'live',
    desc: 'A person chooses Private (My Notes) or Team Shared. Harvested items default to Team Shared but stay hidden until approved at Gate 2.',
    evidence: ['experience-pwa core/FailoverDB.js: updateCardPrivacy', 'experience-pwa components/App.js: Private / Team Shared'],
  },

  // ── Learn → Hub ──────────────────────────────────────────────────────────
  learning: {
    label: 'Self-Learning', sub: 'Vectors · tags · impact', kind: 'learning', status: 'live',
    children: ['vector_build', 'hashtag_id', 'classifier'],
    desc: 'Shared cards are embedded, so the next similar item is recognised instead of duplicated.',
    evidence: ['modules/vector-service (:8006, Chroma)', 'experience-pwa core/VectorSync.js'],
  },
  vector_build: {
    label: 'Vector Build', sub: 'Similarity ≥ 0.85', kind: 'learning', status: 'live', parent: 'learning',
    desc: 'Embeds shared cards. A new item joins an existing card when similarity is at least 0.85.',
    evidence: ['experience-pwa core/VectorSync.js: similarity gate 0.85', 'modules/vector-service/store.py'],
  },
  hashtag_id: {
    label: 'Hashtag ID', sub: 'AI tags', kind: 'learning', status: 'partial', parent: 'learning',
    desc: 'The AI proposes hashtags for each item.', evidence: ['experience-pwa core/AiClient.js: tags'],
  },
  classifier: {
    label: 'Info vs Status', sub: 'Impact score', kind: 'learning', status: 'partial', parent: 'learning',
    desc: 'Separates routine chatter from items that need action.', evidence: ['experience-pwa core/AiClient.js: impactScore'],
  },
  hub: {
    label: 'Continuum Hub', sub: 'Project timeline', kind: 'hub', status: 'live',
    desc: 'The project timeline a newcomer reads: decisions, their sources and who approved them.',
    evidence: ['modules/experience-pwa (:8002)'],
  },
};

// Leaf-level edges. kind 'feedback' = a loop back upstream; it is drawn, but
// lineage walks ignore it so a selection never lights the whole graph.
export const RUNTIME_EDGES = [
  { id: 'r-cm-pc',   from: 'client_master', to: 'project_card', label: 'filters projects' },
  { id: 'r-pc-spc',  from: 'project_card', to: 'sp_comm_plan', label: 'registers URL' },
  { id: 'r-pc-spr',  from: 'project_card', to: 'sp_risk_log', label: 'registers URL' },
  { id: 'r-pc-spe',  from: 'project_card', to: 'sp_esc', label: 'registers URL' },
  { id: 'r-pc-gd',   from: 'project_card', to: 'gdp_dash', label: 'GDP ID' },
  { id: 'r-pc-gx',   from: 'project_card', to: 'gdp_excel', label: 'Project ID + dates' },
  { id: 'r-pc-cn',   from: 'project_card', to: 'connected', label: 'Opp IDs' },
  { id: 'r-pc-em',   from: 'project_card', to: 'emails', label: 'IDs + domain' },
  { id: 'r-pc-tc',   from: 'project_card', to: 'teams_chats', label: 'channels' },
  { id: 'r-pc-tv',   from: 'project_card', to: 'teams_vtt', label: 'attendees' },
  { id: 'r-spc-hv',  from: 'sp_comm_plan', to: 'harvester', label: 'collect' },
  { id: 'r-spr-hv',  from: 'sp_risk_log', to: 'harvester', label: 'collect rows' },
  { id: 'r-spe-hv',  from: 'sp_esc', to: 'harvester', label: 'collect' },
  { id: 'r-gd-hv',   from: 'gdp_dash', to: 'harvester', label: 'collect' },
  { id: 'r-gx-hv',   from: 'gdp_excel', to: 'harvester', label: 'weekly delta' },
  { id: 'r-cn-hv',   from: 'connected', to: 'harvester', label: 'bookmarklet' },
  { id: 'r-em-hv',   from: 'emails', to: 'harvester', label: 'collect' },
  { id: 'r-tc-hv',   from: 'teams_chats', to: 'harvester', label: 'collect' },
  { id: 'r-tv-hv',   from: 'teams_vtt', to: 'harvester', label: 'collect' },
  { id: 'r-hv-pg',   from: 'harvester', to: 'privacy_gate', label: 'screen PII' },
  { id: 'r-pg-tl',   from: 'privacy_gate', to: 'typed_linking', label: 'in-scope items' },
  { id: 'r-tl-rg',   from: 'typed_linking', to: 'review_gate', label: 'suggested card', spine: true },
  { id: 'r-rg-km',   from: 'review_gate', to: 'key_moments', label: 'approve' },
  { id: 'r-rg-sc',   from: 'review_gate', to: 'status_cards', label: 'approve' },
  { id: 'r-rg-iu',   from: 'review_gate', to: 'info_updates', label: 'approve' },
  { id: 'r-km-sg',   from: 'key_moments', to: 'share_gate', label: 'visibility' },
  { id: 'r-sc-sg',   from: 'status_cards', to: 'share_gate', label: 'visibility' },
  { id: 'r-iu-sg',   from: 'info_updates', to: 'share_gate', label: 'visibility' },
  { id: 'r-yn-sg',   from: 'your_notes', to: 'share_gate', label: 'author chooses' },
  { id: 'r-sg-vb',   from: 'share_gate', to: 'vector_build', label: 'shared → embed' },
  { id: 'r-sg-ht',   from: 'share_gate', to: 'hashtag_id', label: 'shared → tag' },
  { id: 'r-sg-cl',   from: 'share_gate', to: 'classifier', label: 'shared → score' },
  { id: 'r-sg-hub',  from: 'share_gate', to: 'hub', label: 'on the timeline' },
  { id: 'r-vb-hub',  from: 'vector_build', to: 'hub', label: 'searchable' },
  { id: 'r-ht-hub',  from: 'hashtag_id', to: 'hub', label: 'tags' },
  { id: 'r-cl-hub',  from: 'classifier', to: 'hub', label: 'impact' },
  { id: 'r-vb-tl',   from: 'vector_build', to: 'typed_linking', label: 'similar card? ≥ 0.85', kind: 'feedback' },
];

// Scope § 5.3: what the human decides at each gate (avatar popover + inspector).
export const GATE_TASKS = {
  privacy_gate: ['Which client domains may be linked', 'What counts as PII (redacted before storage)', 'Scope to this account only'],
  review_gate: ['Approve, edit or reject each suggested card', 'Confirm or refuse the merge suggestion'],
  share_gate: ['Private (My Notes): only the author', 'Team Shared: visible to the team and searchable'],
};
