// integrity.js: model checks shown under ⋯ Engineering → Model check.
// Read-only: they inspect the data files, never the PWA's storage.
import { VIEWS } from './views.js';
import { DOMAIN_MODEL } from '../data/domainModel.js';
import { CONDITIONS } from '../data/conditions.js';
import { DOMAIN_TO_RUNTIME, RUNTIME_TO_DOMAIN } from '../data/mapping.js';
import { STORY_STEPS } from '../data/story.js';
import { SUCCESS, WHY, TRY_CHIPS } from '../data/content.js';

const STATUSES = ['live', 'partial', 'vision'];
const FORBIDDEN_NAMES = /mckinsey|contoso/i;
const NUMBERED_MODULE = /modules\/0\d-/;

function check(title, failures) {
  return { title, ok: failures.length === 0, failures };
}

function edgesFor(view) {
  return view.edges;
}

export function runIntegrityChecks() {
  const results = [];
  const rt = VIEWS.runtime;
  const dm = VIEWS.domain;

  results.push(check('Domain view matches relationship_model.json (nodes and edges)', [
    ...DOMAIN_MODEL.nodes.filter((n) => !dm.nodes[n.id]).map((n) => 'missing node ' + n.id),
    ...Object.keys(dm.nodes).filter((id) => !DOMAIN_MODEL.nodes.some((n) => n.id === id)).map((id) => 'extra node ' + id),
    ...(dm.edges.length === DOMAIN_MODEL.edges.length ? [] : ['edge count ' + dm.edges.length + ' ≠ ' + DOMAIN_MODEL.edges.length]),
  ]));

  results.push(check('Every domain node is placed in exactly one lane', (() => {
    const placed = dm.lanes.flatMap((l) => l.nodes);
    return [
      ...Object.keys(dm.nodes).filter((id) => placed.filter((p) => p === id).length !== 1).map((id) => id + ' placed ' + placed.filter((p) => p === id).length + '×'),
    ];
  })()));

  results.push(check('Domain conditions use only the six typed operators',
    dm.edges.filter((e) => !CONDITIONS[e.condition]).map((e) => e.id + ': ' + e.condition)));

  [rt, dm].forEach((v) => {
    results.push(check(v.title + ': every edge endpoint exists',
      edgesFor(v).filter((e) => !v.nodes[e.from] || !v.nodes[e.to]).map((e) => e.id)));
    results.push(check(v.title + ': no orphan nodes (every leaf has an edge)',
      Object.values(v.nodes).filter((n) => !n.children)
        .filter((n) => !v.edges.some((e) => e.from === n.id || e.to === n.id)).map((n) => n.id)));
    results.push(check(v.title + ': every node has a valid status',
      Object.values(v.nodes).filter((n) => !STATUSES.includes(n.status)).map((n) => n.id + ': ' + n.status)));
  });

  results.push(check('Runtime: 13 top-level nodes', (() => {
    const top = rt.lanes.flatMap((l) => l.nodes);
    return top.length === 13 ? [] : ['found ' + top.length];
  })()));

  results.push(check('Runtime: group children point back to their group', Object.values(rt.nodes).flatMap((n) =>
    (n.children || []).filter((c) => !rt.nodes[c] || rt.nodes[c].parent !== n.id).map((c) => n.id + ' → ' + c))));

  results.push(check('Runtime: Live and Partial nodes cite evidence from named folders only',
    Object.values(rt.nodes).filter((n) => n.status !== 'vision').flatMap((n) => {
      const ev = n.evidence || [];
      if (!ev.length) return [n.id + ': no evidence'];
      return ev.filter((x) => NUMBERED_MODULE.test(x)).map((x) => n.id + ': cites ' + x);
    })));

  results.push(check('Mapping targets exist in both views', [
    ...Object.entries(DOMAIN_TO_RUNTIME).filter(([d, r]) => !dm.nodes[d] || !rt.nodes[r]).map(([d, r]) => d + ' → ' + r),
    ...Object.entries(RUNTIME_TO_DOMAIN).filter(([r, d]) => !rt.nodes[r] || !dm.nodes[d]).map(([r, d]) => r + ' → ' + d),
  ]));

  results.push(check('Story steps reference existing runtime nodes and edges', STORY_STEPS.flatMap((s, i) => [
    ...s.nodes.filter((id) => !rt.nodes[id]).map((id) => 'step ' + (i + 1) + ': node ' + id),
    ...s.edges.filter((id) => !rt.edges.some((e) => e.id === id)).map((id) => 'step ' + (i + 1) + ': edge ' + id),
    ...(s.token && !s.edges.includes(s.token) ? ['step ' + (i + 1) + ': token edge not in step edges'] : []),
    ...(s.expand && !(rt.nodes[s.expand] && rt.nodes[s.expand].children) ? ['step ' + (i + 1) + ': expand ' + s.expand] : []),
    ...(s.detail && s.detail.source ? [] : ['step ' + (i + 1) + ': no source cited']),
  ])));

  const actions = [...SUCCESS.map((s) => s.action), ...WHY.rows.map((r) => r.action), ...TRY_CHIPS.runtime.map((c) => c.action), ...TRY_CHIPS.domain.map((c) => c.action)];
  results.push(check('Every "Show me" / Try action points at something real', actions.flatMap((a) => {
    if (a.type === 'story') return a.step >= 0 && a.step < STORY_STEPS.length ? [] : ['story step ' + a.step];
    if (a.type === 'select') return VIEWS[a.view] && VIEWS[a.view].nodes[a.node] ? [] : [a.view + ':' + a.node];
    if (a.type === 'focus') return a.nodes.filter((id) => !VIEWS[a.view].nodes[id]).map((id) => a.view + ':' + id);
    if (a.type === 'view') return VIEWS[a.view] ? [] : ['view ' + a.view];
    return ['unknown action ' + a.type];
  })));

  results.push(check('No impact figure without a named source',
    WHY.measuredImpact.filter((m) => !m.source).map((m) => m.figure)));

  const text = JSON.stringify([rt.nodes, dm.nodes, STORY_STEPS, SUCCESS, WHY]);
  results.push(check('Only the demo tenants appear (no real client names)',
    FORBIDDEN_NAMES.test(text) ? ['found a forbidden client name in page data'] : []));

  return results;
}
