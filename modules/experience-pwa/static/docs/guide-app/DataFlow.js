// DataFlow.js — Part 1/3: helpers + SVG edge layer (no-build htm).
// Visual contract: SVG renders ONLY lines/gradients/dots (pointer-events-none, z-1).
// Node cards are standard HTML divs (absolute, 170x56) rendered alongside the SVG.
// Active gradient path uses strokeWidth 1.5 (V4 refinement); animateMotion dots intact.
import { NODES, EDGES } from './GuideData.js';

const htmHtml = window.htm.bind(window.React.createElement);

export const FLOW_W = 2100;
export const FLOW_H = 860;
export const CARD_W = 170;
export const CARD_H = 56;

export function edgePath(R, T) {
  const D = R.x + CARD_W;
  const Le = R.y + 28;
  const en = T.x;
  const si = T.y + 28;
  const ci = Math.abs(en - D);
  const ef = D + ci * 0.45;
  const nf = en - ci * 0.35;
  return 'M ' + D + ' ' + Le + ' C ' + ef + ' ' + Le + ', ' + nf + ' ' + si + ', ' + en + ' ' + si;
}

export function edgeDur(edgeId) {
  const n = parseInt(String(edgeId).slice(1), 10);
  const k = isNaN(n) ? 0 : n;
  return (2.2 + (k % 3) * 0.6).toFixed(1) + 's';
}

function edgeSvg(edge, positions, reach) {
  const R = positions[edge.from];
  const T = positions[edge.to];
  if (!R || !T) return null;
  const active = reach.edgeIds.has(edge.id);
  const d = edgePath(R, T);
  return htmHtml`<g key=${edge.id}>
    <path d=${d} fill="none" stroke=${active ? '#6B6B7A' : '#C8C2CE'} strokeWidth=${active ? 1.5 : 1.2} strokeOpacity=${active ? 1 : 0.7} strokeLinecap="round" strokeLinejoin="round"></path>
    ${active && htmHtml`<g>
      <path d=${d} fill="none" stroke="url(#activeGrad)" strokeWidth=${1.5} strokeOpacity=${0.9} strokeLinecap="round"></path>
      <circle r=${3.2} fill="#6B6B7A"><animateMotion dur=${edgeDur(edge.id)} repeatCount="indefinite" path=${d}></animateMotion></circle>
      <circle r=${2} fill="#9A8FA8" opacity=${0.7}><animateMotion dur=${edgeDur(edge.id)} begin="0.6s" repeatCount="indefinite" path=${d}></animateMotion></circle>
    </g>`}
  </g>`;
}

export function EdgeLayer(props) {
  const guideState = props.guideState;
  const positions = guideState.positions;
  const reach = guideState.reach;
  return htmHtml`<svg className="absolute inset-0 pointer-events-none" width=${FLOW_W} height=${FLOW_H} style=${{ zIndex: 1 }}>
    <defs><linearGradient id="activeGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#6B6B7A" stopOpacity=${0.9}></stop>
      <stop offset="100%" stopColor="#9A8FA8" stopOpacity=${0.9}></stop>
    </linearGradient></defs>
    ${EDGES.map(function (e) { return edgeSvg(e, positions, reach); })}
  </svg>`;
}
function nodeCard(node, guideState) {
  const pos = guideState.positions[node.id];
  if (!pos) return null;
  const selectedId = guideState.selectedNodeId;
  const reach = guideState.reach;
  const isSel = selectedId === node.id;
  const inReach = reach.nodes.has(node.id);
  const dim = selectedId && !inReach;
  const isGrad = String(node.color || '').indexOf('linear-gradient') === 0;
  return htmHtml`<div key=${node.id}
    className=${'absolute select-none cursor-grab active:cursor-grabbing rounded-[14px] border card-shadow transition-all duration-200 flex flex-col justify-center px-3 py-2 ' + (isSel ? 'card-shadow-active ring-2 ring-[#6B6B7A]/20 z-20' : inReach ? 'z-10' : 'z-0') + ' ' + (dim ? 'opacity-[0.62]' : 'opacity-100')}
    style=${{ left: pos.x, top: pos.y, width: CARD_W, height: CARD_H, background: isGrad ? node.color : undefined, backgroundColor: isGrad ? undefined : node.color, borderColor: isSel ? '#6B6B7A' : node.border }}
    onMouseDown=${function (ev) { guideState.beginDrag(ev, node.id); }}
    onClick=${function () { guideState.setSelectedNodeId(node.id); }}>
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-full bg-white/70 border border-[#E8E2E0]/60 flex items-center justify-center text-[11px] text-[#2F313E] shrink-0">${node.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-[600] leading-[13px] tracking-tight text-[#22232B] truncate">${node.label}</div>
        <div className="text-[10px] font-[400] leading-[11px] text-[#6B6B7A] truncate mt-[1px]">${node.sublabel}</div>
      </div>
    </div>
  </div>`;
}

export function NodeLayer(props) {
  const guideState = props.guideState;
  return NODES.map(function (n) { return nodeCard(n, guideState); });
}

function groupShell(left, top, width, height, labelClass, label, key) {
  return htmHtml`<div key=${key} className="absolute rounded-[18px] border backdrop-blur-sm ${labelClass}" style=${{ left: left, top: top, width: width, height: height }}>
    <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-[600] tracking-widest uppercase">${label}</div>
  </div>`;
}

export function GroupLayer() {
  return [
    groupShell(430, 8, 190, 800, 'bg-[#FFF9F3]/80 border-[#E8E2E0] text-[#8A7D7A]', 'Distributed Sources', 'g-src'),
    groupShell(710, 60, 190, 320, 'bg-[#F6F8FF]/70 border-[#E0DDE8] text-[#7A7A90]', 'Processing Gates', 'g-gate'),
    groupShell(1110, 18, 190, 440, 'bg-[#FFF6F9]/70 border-[#E8EDE0] text-[#8A7D80]', 'Formed Cards', 'g-cards'),
    groupShell(1350, 48, 190, 200, 'bg-[#F7FFF8]/70 border-[#DDE8DE] text-[#6E7E6E]', 'Privacy Lens', 'g-priv'),
    groupShell(1550, 28, 190, 300, 'bg-[#FFFDF0]/70 border-[#E8E2D0] text-[#8A7E6E]', 'Self-Learning', 'g-learn'),
  ];
}

export function MiniMap(props) {
  const guideState = props.guideState;
  const positions = guideState.positions;
  const reach = guideState.reach;
  return htmHtml`<div className="absolute bottom-[88px] right-4 w-[200px] h-[110px] rounded-[12px] bg-white/90 backdrop-blur border border-[#E8E2E0] shadow-sm overflow-hidden hidden md:block">
    <div className="absolute inset-[8px] rounded-[8px] bg-[#FCFBF9] border border-[#F0EBE8] overflow-hidden">
      ${NODES.map(function (n) {
        const R = positions[n.id];
        if (!R) return null;
        const x = (R.x / FLOW_W) * 184;
        const y = (R.y / FLOW_H) * 94;
        const on = reach.nodes.has(n.id);
        return htmHtml`<div key=${n.id} className=${'absolute w-[8px] h-[4px] rounded-[2px] ' + (on ? 'bg-[#6B6B7A]' : 'bg-[#C8C2CE]')} style=${{ left: x, top: y }}></div>`;
      })}
    </div>
    <div className="absolute bottom-1 left-2 text-[8px] mono text-[#9A8FA8]">MINI - ${NODES.length} nodes - ${EDGES.length} edges</div>
  </div>`;
}
function detailIdentity(node) {
  return htmHtml`<div className="w-[280px] shrink-0 px-4 py-3 border-r border-[#E8E2E0] flex flex-col justify-center">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center border text-[12px]" style=${{ background: node.color, borderColor: node.border }}>${node.icon}</div>
      <div>
        <div className="text-[13px] font-[600] text-[#22232B] leading-[14px]">${node.label}</div>
        <div className="text-[11px] text-[#6B6B7A] mono">${node.id} - ${node.kind}</div>
      </div>
    </div>
    <div className="mt-2 text-[11.5px] leading-[15px] text-[#2F313E] line-clamp-2">${node.desc}</div>
  </div>`;
}

function detailLogic(node) {
  return htmHtml`<div className="min-w-[280px]">
    <div className="text-[10px] font-[600] tracking-widest uppercase text-[#8A7D7A] mb-1">Logic - Typed Identifier</div>
    <div className="text-[12px] font-[500] text-[#2F313E] bg-[#F6F2EF] border border-[#E8E2E0] rounded-[8px] px-2.5 py-1.5 mono">${node.logic}</div>
    <div className="mt-2 text-[10px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Sample Path</div>
    <div className="text-[11px] text-[#6B6B7A] mono mt-0.5 truncate">${node.sample}</div>
  </div>`;
}

function detailDownstream(node, guideState) {
  const list = guideState.downstreamList || [];
  const sel = guideState.selectedNodeId;
  return htmHtml`<div className="min-w-[300px]">
    <div className="text-[10px] font-[600] tracking-widest uppercase text-[#8A7D7A] mb-1">Downstream to Continuum Final - ${Math.max(list.length - 1, 0)} hops</div>
    <div className="flex flex-wrap gap-1.5">
      ${list.slice(0, 12).map(function (m) {
        return htmHtml`<span key=${m.id} className=${'px-2 py-0.5 rounded-full text-[10px] font-[500] border ' + (m.id === sel ? 'bg-[#2F313E] text-white border-[#2F313E]' : m.id === 'continuum_final' ? 'bg-[#FFF8D6] border-[#E8E2D0] text-[#2F313E]' : 'bg-white border-[#E8E2E0] text-[#6B6B7A]')}>${m.label}</span>`;
      })}
      ${list.length > 12 && htmHtml`<span className="text-[10px] text-[#9A8FA8]">+${list.length - 12} more</span>`}
    </div>
    <div className="mt-2 flex gap-1.5 flex-wrap">
      ${EDGES.filter(function (e) { return e.from === node.id; }).slice(0, 4).map(function (e) {
        return htmHtml`<span key=${e.id} className="px-2 py-0.5 rounded-full bg-[#F0F6FF] border border-[#C5D9F5] text-[10px] mono text-[#6B6B7A]">${e.condition} - ${e.to}</span>`;
      })}
    </div>
  </div>`;
}

function detailLong(node) {
  return htmHtml`<div className="min-w-[240px]">
    <div className="text-[10px] font-[600] tracking-widest uppercase text-[#8A7D7A] mb-1">What it does - Long</div>
    <div className="text-[11px] leading-[15px] text-[#2F313E]">${node.long}</div>
  </div>`;
}

export function DetailBar(props) {
  const guideState = props.guideState;
  const node = guideState.selectedNode;
  const expanded = !!guideState.detailExpanded;
  if (!node) {
    return htmHtml`<div className="absolute bottom-0 left-0 right-0 z-40 h-[88px] border-t border-[#E8E2E0] bg-white/95 backdrop-blur flex items-stretch overflow-hidden">
      <div className="flex-1 flex items-center justify-center text-[12px] text-[#9A8FA8]">Click any card - path goes till end - BFS to Continuum Final</div>
    </div>`;
  }
  return htmHtml`<div className=${'absolute bottom-0 left-0 right-0 z-40 border-t border-[#E8E2E0] bg-white/95 backdrop-blur flex items-stretch overflow-hidden ' + (expanded ? 'h-[50vh]' : 'h-[88px]')}>
    ${detailIdentity(node)}
    <div className="flex-1 px-4 py-2.5 flex gap-6 overflow-x-auto">
      ${detailLogic(node)}
      ${detailDownstream(node, guideState)}
      ${detailLong(node)}
    </div>
    <button onClick=${guideState.toggleDetail} title=${expanded ? 'Minimize' : 'Expand'} className="absolute top-2 right-3 w-7 h-7 rounded-full bg-white border border-[#E8E2E0] text-[12px] text-[#6B6B7A] flex items-center justify-center hover:bg-[#FCFBF9]">${expanded ? 'v' : '^'}</button>
  </div>`;
}

export function DataFlow(props) {
  const guideState = props.guideState;
  return htmHtml`<div className="flex-1 flex flex-col">
    <div className="flex-1 relative overflow-hidden">
      <div ref=${guideState.scrollRef} className="absolute inset-0 overflow-auto pastel-grid">
        <div className="relative" style=${{ width: FLOW_W, height: FLOW_H }}>
          ${GroupLayer()}
          ${htmHtml`<${EdgeLayer} guideState=${guideState} />`}
          ${htmHtml`<${NodeLayer} guideState=${guideState} />`}
        </div>
      </div>
      ${htmHtml`<${MiniMap} guideState=${guideState} />`}
      ${htmHtml`<${DetailBar} guideState=${guideState} />`}
    </div>
  </div>`;
}

export function useGuideDrag() {
  return null;
}

