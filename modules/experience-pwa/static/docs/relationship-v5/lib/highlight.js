// highlight.js: decides how every card and edge looks right now.
//
// Node states: selected · up · down · lit · near · soft · dim · normal
// Edge states: up · down · lit · feedback · soft · dim · idle
// `animated` holds the edges that get flow dots (active edges only, scope M7).
import { lineage, neighbours } from './graph.js';
import { expandSelection, visibleOf } from './layout.js';

export function computeHighlight({ view, layout, expanded, selection, story, hover }) {
  const nodeState = {};
  const edgeState = {};
  const animated = new Set();
  const all = layout.nodes.map((n) => n.id);
  const setAll = (s) => all.forEach((id) => { nodeState[id] = s; });
  const setEdges = (s) => layout.edges.forEach((e) => { edgeState[e.id] = s; });
  const fold = (id) => visibleOf(view, id, expanded);
  const foldEdge = (leafId) => layout.edges.find((e) => e.leafIds.includes(leafId));

  if (story) {
    setAll('dim'); setEdges('dim');
    story.nodes.map(fold).forEach((id) => { nodeState[id] = 'lit'; });
    story.edges.forEach((leafId) => {
      const e = foldEdge(leafId);
      if (e) { edgeState[e.id] = e.kind === 'feedback' ? 'feedback' : 'lit'; animated.add(e.id); }
    });
    return { mode: 'story', nodeState, edgeState, animated };
  }

  if (selection && selection.type === 'node') {
    const starts = expandSelection(view, selection.id, expanded);
    const lin = lineage(layout.edges, starts);
    setAll('dim'); setEdges('dim');
    lin.up.forEach((id) => { nodeState[id] = 'up'; });
    lin.down.forEach((id) => { nodeState[id] = 'down'; });
    starts.forEach((id) => { nodeState[id] = 'selected'; });
    // An open group's header stays readable while its children are selected.
    if (starts.length > 1 || starts[0] !== selection.id) nodeState[selection.id] = 'selected';
    // ...and so does the header of an open group whose child is selected.
    const parent = view.nodes[selection.id] && view.nodes[selection.id].parent;
    if (parent && nodeState[parent] === 'dim') nodeState[parent] = 'near';
    lin.upEdges.forEach((id) => { edgeState[id] = 'up'; animated.add(id); });
    lin.downEdges.forEach((id) => { edgeState[id] = 'down'; animated.add(id); });
    const inLineage = (id) => nodeState[id] && nodeState[id] !== 'dim';
    layout.edges.filter((e) => e.kind === 'feedback' && inLineage(e.from) && inLineage(e.to))
      .forEach((e) => { edgeState[e.id] = 'feedback'; animated.add(e.id); });
    return { mode: 'lineage', nodeState, edgeState, animated, lineage: lin, starts };
  }

  if (selection && selection.type === 'edge') {
    setAll('dim'); setEdges('dim');
    const e = layout.edges.find((x) => x.id === selection.id);
    if (e) { edgeState[e.id] = 'lit'; animated.add(e.id); nodeState[e.from] = 'lit'; nodeState[e.to] = 'lit'; }
    return { mode: 'edge', nodeState, edgeState, animated };
  }

  if (selection && selection.type === 'focus') {
    setAll('dim'); setEdges('dim');
    const focus = new Set(selection.nodes.map(fold));
    layout.edges.forEach((e) => {
      if (focus.has(e.from) || focus.has(e.to)) {
        edgeState[e.id] = 'lit'; animated.add(e.id);
        nodeState[e.from] = 'near'; nodeState[e.to] = 'near';
      }
    });
    focus.forEach((id) => { nodeState[id] = 'lit'; });
    return { mode: 'focus', nodeState, edgeState, animated };
  }

  if (selection && selection.type === 'filter') {
    setAll('dim'); setEdges('dim');
    layout.edges.filter((e) => e.condition === selection.condition).forEach((e) => {
      edgeState[e.id] = 'lit'; animated.add(e.id);
      nodeState[e.from] = 'lit'; nodeState[e.to] = 'lit';
    });
    return { mode: 'filter', nodeState, edgeState, animated };
  }

  if (hover) {
    const nb = neighbours(layout.edges, hover);
    setAll('soft'); setEdges('soft');
    nb.nodes.forEach((id) => { nodeState[id] = 'normal'; });
    nb.edges.forEach((id) => { edgeState[id] = 'lit'; });
    nodeState[hover] = 'lit';
    return { mode: 'hover', nodeState, edgeState, animated };
  }

  setAll('normal'); setEdges('idle');
  return { mode: 'none', nodeState, edgeState, animated };
}
