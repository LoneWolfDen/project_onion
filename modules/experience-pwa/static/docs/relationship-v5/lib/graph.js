// graph.js: lineage walks over the VISIBLE edges (after group folding).
// Feedback edges are skipped while walking, otherwise the learning loop would
// make every node upstream and downstream of every other node.

function walk(edges, startIds, forward) {
  const nodes = new Set();
  const used = new Set();
  const queue = [...startIds];
  const seen = new Set(startIds);
  while (queue.length) {
    const u = queue.shift();
    edges.forEach((e) => {
      if (e.kind === 'feedback') return;
      const [a, b] = forward ? [e.from, e.to] : [e.to, e.from];
      if (a !== u) return;
      used.add(e.id);
      if (!seen.has(b)) { seen.add(b); nodes.add(b); queue.push(b); }
    });
  }
  startIds.forEach((id) => nodes.delete(id));
  return { nodes, edges: used };
}

// Full upstream + downstream lineage from one or more starting cards.
export function lineage(edges, startIds) {
  const down = walk(edges, startIds, true);
  const up = walk(edges, startIds, false);
  return { up: up.nodes, down: down.nodes, upEdges: up.edges, downEdges: down.edges };
}

export function neighbours(edges, id) {
  const nodes = new Set();
  const used = new Set();
  edges.forEach((e) => {
    if (e.from === id) { nodes.add(e.to); used.add(e.id); }
    if (e.to === id) { nodes.add(e.from); used.add(e.id); }
  });
  return { nodes, edges: used };
}
