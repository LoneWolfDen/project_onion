// layout.js: turns a view + the expanded group into pixel boxes and edge paths.
// Everything is computed from lane/row/col data, never measured from the DOM,
// so the drawing is identical on every machine and survives resizes.

export const SIZE = {
  laneW: 198, laneGap: 30, padX: 22, padTop: 12,
  laneHeader: 26, rowLabel: 26, rowGap: 60,
  cardW: 182, cardH: 92, childH: 70, childIndent: 12, gapY: 12,
};

// Which card a leaf is drawn on: its group when that group is collapsed.
export function visibleOf(view, id, expanded) {
  const n = view.nodes[id];
  if (n && n.parent && n.parent !== expanded) return n.parent;
  return id;
}

// When a group is open its header card carries no edges, so selecting the
// header means "all of my children".
export function expandSelection(view, id, expanded) {
  const n = view.nodes[id];
  if (n && n.children && id === expanded) return n.children.slice();
  return [visibleOf(view, id, expanded)];
}

export function computeLayout(view, expanded) {
  const S = SIZE;
  const rows = [...new Set(view.lanes.map((l) => l.row))].sort();
  const cols = Math.max(...view.lanes.map((l) => l.col)) + 1;
  const width = S.padX * 2 + cols * S.laneW + (cols - 1) * S.laneGap;

  // 1. Stack each lane: top-level cards, plus children under the open group.
  const stacks = view.lanes.map((lane) => {
    const items = [];
    lane.nodes.forEach((id) => {
      items.push({ id, child: false, h: S.cardH });
      const n = view.nodes[id];
      if (n.children && expanded === id) n.children.forEach((c) => items.push({ id: c, child: true, h: S.childH }));
    });
    const h = items.reduce((sum, it) => sum + it.h, 0) + S.gapY * Math.max(0, items.length - 1);
    return { lane, items, h };
  });

  // 2. Each row is as tall as its tallest lane; shorter lanes are centred.
  const boxes = {};
  const lanes = [];
  let y = S.padTop;
  const rowTops = [];
  rows.forEach((row) => {
    const inRow = stacks.filter((s) => s.lane.row === row);
    const contentH = Math.max(S.cardH, ...inRow.map((s) => s.h));
    const top = y + S.rowLabel;
    rowTops.push({ row, y });
    inRow.forEach((s) => {
      const x = S.padX + s.lane.col * (S.laneW + S.laneGap);
      lanes.push({ ...s.lane, x, y: top, w: S.laneW, h: S.laneHeader + contentH + 16 });
      let cy = top + S.laneHeader + (contentH - s.h) / 2 + 8;
      s.items.forEach((it) => {
        const bx = x + (S.laneW - S.cardW) / 2 + (it.child ? S.childIndent : 0);
        const bw = S.cardW - (it.child ? S.childIndent : 0);
        boxes[it.id] = { id: it.id, x: bx, y: cy, w: bw, h: it.h, row, col: s.lane.col, child: it.child };
        cy += it.h + S.gapY;
      });
    });
    y = top + S.laneHeader + contentH + 16 + S.rowGap;
  });
  const height = y - S.rowGap + S.padTop;

  // 3. Fold leaf edges onto visible cards, dropping self-loops and merging duplicates.
  const byKey = new Map();
  view.edges.forEach((e) => {
    const from = visibleOf(view, e.from, expanded);
    const to = visibleOf(view, e.to, expanded);
    if (from === to || !boxes[from] || !boxes[to]) return;
    const key = from + '>' + to;
    const prev = byKey.get(key);
    if (prev) {
      prev.leafIds.push(e.id);
      prev.merged += 1;
      if (e.kind !== 'feedback') prev.kind = e.kind;
    } else {
      byKey.set(key, { ...e, id: 'v:' + key, from, to, leafIds: [e.id], merged: 1 });
    }
  });
  const edges = [...byKey.values()];

  // 4. Spread edges that share a card side so fan-in does not collapse to one point.
  const ports = assignPorts(edges, boxes);
  edges.forEach((e) => Object.assign(e, edgeGeometry(e, boxes[e.from], boxes[e.to], ports)));

  const nodes = Object.values(boxes).sort((a, b) => (a.row - b.row) || (a.col - b.col) || (a.y - b.y));
  const rowLabels = rowTops.map((r, i) => ({ text: view.rowLabels[i] || '', x: S.padX, y: r.y + 4 }));
  return { width, height, boxes, nodes, lanes, edges, rowLabels };
}

function sideOf(e, a, b) {
  if (a.row !== b.row) return b.row > a.row ? 'down' : 'up';
  if (a.col === b.col) return b.y > a.y ? 'down' : 'up';
  return b.col > a.col ? 'forward' : 'back';
}

function assignPorts(edges, boxes) {
  const outs = {}; const ins = {};
  edges.forEach((e) => {
    const side = sideOf(e, boxes[e.from], boxes[e.to]);
    if (side !== 'forward' && side !== 'back') return;
    (outs[e.from + side] = outs[e.from + side] || []).push(e);
    (ins[e.to + side] = ins[e.to + side] || []).push(e);
  });
  const spread = (list, key, pick) => {
    list.sort((p, q) => boxes[pick(p)].y - boxes[pick(q)].y);
    const step = Math.min(9, 36 / Math.max(1, list.length));
    list.forEach((e, i) => { e[key] = (i - (list.length - 1) / 2) * step; });
  };
  Object.values(outs).forEach((l) => spread(l, 'outOffset', (e) => e.to));
  Object.values(ins).forEach((l) => spread(l, 'inOffset', (e) => e.from));
  return true;
}

// Cubic Bézier between two cards. Returns the SVG path and the label midpoint.
export function edgeGeometry(e, a, b) {
  const side = sideOf(e, a, b);
  let p0, p1, p2, p3;
  if (side === 'forward') {
    p0 = [a.x + a.w, a.y + a.h / 2 + (e.outOffset || 0)];
    p3 = [b.x, b.y + b.h / 2 + (e.inOffset || 0)];
    const dx = (p3[0] - p0[0]) * 0.5;
    p1 = [p0[0] + dx, p0[1]]; p2 = [p3[0] - dx, p3[1]];
  } else if (side === 'back') {
    // Drawn from the left side, a little below centre, so it never sits on
    // top of the forward edge between the same two cards.
    p0 = [a.x, a.y + a.h / 2 + 12 + (e.outOffset || 0)];
    p3 = [b.x + b.w, b.y + b.h / 2 + 12 + (e.inOffset || 0)];
    const dx = (p0[0] - p3[0]) * 0.5;
    p1 = [p0[0] - dx, p0[1] + 26]; p2 = [p3[0] + dx, p3[1] + 26];
  } else {
    const down = side === 'down';
    p0 = [a.x + a.w / 2, down ? a.y + a.h : a.y];
    p3 = [b.x + b.w / 2, down ? b.y : b.y + b.h];
    const k = Math.max(30, Math.abs(p3[1] - p0[1]) * 0.5);
    p1 = [p0[0], p0[1] + (down ? k : -k)]; p2 = [p3[0], p3[1] + (down ? -k : k)];
  }
  const f = (v) => Math.round(v * 10) / 10;
  const d = `M ${f(p0[0])} ${f(p0[1])} C ${f(p1[0])} ${f(p1[1])}, ${f(p2[0])} ${f(p2[1])}, ${f(p3[0])} ${f(p3[1])}`;
  // Labels sit 60% along the curve: edges fanning out of one card share their
  // start, so a point nearer the target keeps neighbouring labels apart.
  const t = 0.6, u = 1 - t;
  const mid = [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
  return { d, midX: mid[0], midY: mid[1], side };
}
