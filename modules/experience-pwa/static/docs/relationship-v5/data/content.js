// content.js: the words on the page, kept out of components so they can be
// edited without touching behaviour.
//
// Actions (used by Try chips, "See it in the demo" and "Show me"):
//   { type: 'story', step }              start the story at a step index (0-based)
//   { type: 'select', view, node }       switch view and select one node
//   { type: 'focus', view, nodes }       light a set of nodes, grey the rest
//   { type: 'view', view }               switch view only

export const CAPTION = 'Runtime: what actually happens · Domain: what the business model means';

const GATES = { type: 'focus', view: 'runtime', nodes: ['privacy_gate', 'review_gate', 'share_gate'], label: 'The three human gates' };

export const TRY_CHIPS = {
  runtime: [
    { label: 'Play the story', action: { type: 'story', step: 0 } },
    { label: 'Where do humans decide?', action: GATES },
    { label: 'What makes a card shared?', action: { type: 'select', view: 'runtime', node: 'share_gate' } },
  ],
  domain: [
    { label: 'How everything anchors', action: { type: 'select', view: 'domain', node: 'project_card' } },
    { label: 'Email → project via DOMAIN', action: { type: 'select', view: 'domain', node: 'emails' } },
    { label: 'What feeds RAID cards?', action: { type: 'select', view: 'domain', node: 'raid_agg' } },
  ],
};

export const WHY = {
  without: 'decision context leaves with the person.',
  with: 'the decision stays with the project.',
  rows: [
    {
      topic: 'Handover',
      without: 'A new PM rebuilds context from inboxes, chats and memory.',
      with: 'The project timeline holds every decision with its source.',
      demo: 'Story step 8', action: { type: 'story', step: 7 },
    },
    {
      topic: 'Same issue, told twice',
      without: 'Row 12 (laptops at 50%) and Row 18 (laptops at 100%) look like two unrelated risks.',
      with: 'They are recognised as one item, and the card shows Open → Partial → Closed.',
      demo: 'Story steps 2–7', action: { type: 'story', step: 1 },
    },
    {
      topic: 'Trust',
      without: 'AI summaries nobody can check.',
      with: 'Every card keeps its RAW source and provenance. Three human gates decide what is linked, kept and shared.',
      demo: 'The three gates', action: GATES,
    },
  ],
  // Scope § 7: rendered only when the team adds a figure WITH a named source.
  // Shape: { figure: '…', claim: '…', source: '…' }
  measuredImpact: [],
};

// Status is set by the team: 'demonstrated' | 'partial' | 'vision' | 'target'.
export const SUCCESS = [
  { title: 'Context survives a handover.', detail: 'A newcomer can see what was decided, when, and from which source.',
    verify: 'Play the story to step 8: the card shows its timeline and sources.', status: 'demonstrated', action: { type: 'story', step: 7 } },
  { title: 'Humans stay in control.', detail: 'Nothing becomes team-visible without a person approving it.',
    verify: 'Runtime view: three gates. Open Gate 3.', status: 'demonstrated', action: { type: 'select', view: 'runtime', node: 'share_gate' } },
  { title: 'Every claim is traceable.', detail: 'Each card links back to its RAW source.',
    verify: 'Continuum Cards → Status Cards → provenance.', status: 'demonstrated', action: { type: 'select', view: 'runtime', node: 'status_cards' } },
  { title: 'Linking is deterministic.', detail: 'Sources join projects by typed rules, not guesswork.',
    verify: 'Domain view: every edge is one of six operators. Click a chip.', status: 'demonstrated', action: { type: 'view', view: 'domain' } },
  { title: 'One issue, one card.', detail: 'Repeated updates about the same item merge instead of duplicating.',
    verify: 'Story steps 2–7: Row 12 + Row 18 → one card, Open → Partial → Closed.', status: 'demonstrated', action: { type: 'story', step: 1 } },
  { title: 'Honest about what’s built.', detail: 'Every node says Live, Partial or Vision.',
    verify: 'Look for the dashed Vision node: Emails & Teams.', status: 'demonstrated', action: { type: 'select', view: 'runtime', node: 'comms' } },
  { title: 'Understandable in 60 seconds.', detail: 'A first-time viewer can say where humans decide and how data reaches a project.',
    verify: 'Try it: "Where do humans decide?"', status: 'target', action: GATES },
];

export const SUCCESS_STATUS_LABEL = { demonstrated: 'Demonstrated', partial: 'Partial', vision: 'Vision', target: 'Target for judges' };

// ── Engineering menu content ────────────────────────────────────────────────
// Validation scripts are DISPLAY-ONLY: copy them into the PWA's DevTools console.
// They read the real keys the PWA writes (core/FailoverDB.js, components/App.js,
// components/HarvesterPanel.js). Dates are parsed with a Safari-safe ISO fix.
const ISO = "const iso = (v) => new Date(String(v || '').replace(' ', 'T'));";
export const VALIDATION_SCRIPTS = [
  { id: 'sync', title: 'Cards by sync status', reads: 'onion_db_state.timeline[].syncStatus',
    script: `const s = JSON.parse(localStorage.getItem('onion_db_state') || '{}');
const counts = {};
(s.timeline || []).forEach((t) => { counts[t.syncStatus || 'none'] = (counts[t.syncStatus || 'none'] || 0) + 1; });
counts;`,
    howToRead: 'pending_processing = waiting at Gate 2 (Review). pending_upload = saved locally, not yet synced. synced = on the server.' },
  { id: 'datapark', title: 'Data Park: items waiting for review', reads: 'onion_db_state.timeline[] where syncStatus = pending_processing',
    script: `${ISO}
const s = JSON.parse(localStorage.getItem('onion_db_state') || '{}');
(s.timeline || []).filter((t) => t.syncStatus === 'pending_processing').map((t) => ({
  title: String(t.title || '').slice(0, 40), source: t.source, privacy: t.privacy,
  age_min: Math.round((Date.now() - iso(t.created_at)) / 60000),
}));`,
    howToRead: 'Anything older than a few hours means Gate 2 has not been worked. These items are hidden from the timeline until approved.' },
  { id: 'privacy', title: 'Private vs Team Shared', reads: 'onion_db_state.timeline[].privacy, notes[].privacy',
    script: `const s = JSON.parse(localStorage.getItem('onion_db_state') || '{}');
const counts = {};
[...(s.timeline || []), ...(s.notes || [])].forEach((t) => { const p = t.privacy || '(unset → Team Shared)'; counts[p] = (counts[p] || 0) + 1; });
counts;`,
    howToRead: 'Private and My Notes are visible to the author only. Team Shared is visible to the team and searchable.' },
  { id: 'queue', title: 'Review queue length', reads: 'onion_review_queue',
    script: `const q = JSON.parse(localStorage.getItem('onion_review_queue') || '[]');
({ queued: Array.isArray(q) ? q.length : 0 });`,
    howToRead: 'Items the Harvester queued for review in this browser.' },
  { id: 'vector', title: 'Last vector sync', reads: 'lastVectorSyncAt',
    script: `${ISO}
const v = localStorage.getItem('lastVectorSyncAt');
v ? { last: v, age_min: Math.round((Date.now() - iso(v)) / 60000) } : 'Never synced in this browser';`,
    howToRead: 'Written when the PWA mirrors cards to vector-service (:8006). A long age means new shared cards are not searchable yet.' },
];

export const GUIDE = {
  // Earlier reference pages, kept reachable from Guide & setup (paths relative to this page).
  references: [
    ['Relationship Map (earlier version)', '../Project-Onion-Relationship-Model.html'],
    ['Data Model', '../Project-Onion-Data-Model.html'],
    ['Test Flow (stakeholder explainer)', '../RAG-Architecture.html'],
  ],
  run: [
    ['Start the PWA (serves this page)', 'python3 modules/experience-pwa/service.py'],
    ['Open this page', 'http://localhost:8002/static/docs/relationship-v5/'],
    ['Anchor service (optional)', 'python3 modules/platform-anchor/service.py   # :8000'],
    ['Cards store (optional)', 'python3 modules/domain-cards-store/service.py   # :8001'],
    ['Vector service (optional)', 'cd modules/vector-service && uvicorn main:app --port 8006'],
  ],
  reading: [
    ['Live', 'Code exists and runs in the demo.'],
    ['Partial', 'Exists but limited, e.g. upload only, or regex instead of a service.'],
    ['Vision', 'Designed, not built. Dashed border.'],
    ['Lavender card with avatar', 'A human gate: a person decides here.'],
    ['Blue edges', 'Downstream of the selection: where the data goes next.'],
    ['Lavender edges', 'Upstream of the selection: where the data came from.'],
    ['Dashed lavender loop', 'Feedback: the learned vectors help match the next item.'],
  ],
  regenerate: 'python3 modules/experience-pwa/static/docs/relationship-v5/generate_domain_model.py',
};
