// views.js: assembles the two views into one shape the components share:
//   { id, title, lanes, rowLabels, nodes: { id: node }, edges: [edge] }
import { RUNTIME_LANES, RUNTIME_ROW_LABELS, RUNTIME_NODES, RUNTIME_EDGES } from '../data/runtimeModel.js';
import { DOMAIN_LANES, DOMAIN_ROW_LABELS, DOMAIN_NODES, DOMAIN_EDGES } from '../data/domainView.js';

function withIds(nodes) {
  return Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, { id, ...n }]));
}

export const VIEWS = {
  runtime: {
    id: 'runtime', title: 'Runtime', lanes: RUNTIME_LANES, rowLabels: RUNTIME_ROW_LABELS,
    nodes: withIds(RUNTIME_NODES), edges: RUNTIME_EDGES.map((e) => ({ kind: 'flow', ...e })),
  },
  domain: {
    id: 'domain', title: 'Domain', lanes: DOMAIN_LANES, rowLabels: DOMAIN_ROW_LABELS,
    nodes: withIds(DOMAIN_NODES), edges: DOMAIN_EDGES.map((e) => ({ kind: 'typed', ...e })),
  },
};

// Top-level node IDs in lane order: what is visible with every group collapsed.
export function topLevelIds(view) {
  return view.lanes.flatMap((l) => l.nodes);
}

// All node IDs including group children, for inventory and integrity checks.
export function allNodeIds(view) {
  return Object.keys(view.nodes);
}
