// InteractiveGuide.js — no-build React (window.React + htm), isolated test shell.
// Reference: Continuum-V4-Final.html (bundled React) ported to htm.
// Phase 2: header + tab nav + DataFlow/Inventory/Validation/Model via guideState.
import { BASE_POSITIONS, NODES, EDGES, VALIDATION_SCRIPTS, TABS, TAB_LABELS, bfsReachable } from './GuideData.js';

import { DataFlow } from './DataFlow.js';
import { Inventory } from './Inventory.js';
import { Validation } from './Validation.js';
import { Model } from './Model.js';
const { useState, useMemo, useRef, useEffect } = window.React;
const html = window.htm.bind(window.React.createElement);
const STYLE_BLOCK = [
  '.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }',
  '.card-shadow { box-shadow: 0 1px 3px rgba(47,49,62,0.06), 0 4px 12px rgba(47,49,62,0.04); }',
  '.card-shadow-active { box-shadow: 0 2px 8px rgba(47,49,62,0.12), 0 8px 24px rgba(47,49,62,0.08); }',
  '.pastel-grid { background-image: radial-gradient(#E8E2E0 1px, transparent 1px); background-size: 24px 24px; }',
].join('\n');
function tabLabel(t) {
  if (t === 'flow') return 'Data Flow';
  if (t === 'inventory') return 'Inventory';
  if (t === 'validation') return 'Backend Validation';
  return 'Detailed Model';
}
export function InteractiveGuide() {
  const [activeTab, setActiveTab] = useState('flow');
  const [positions, setPositions] = useState(BASE_POSITIONS);
  const [selectedNodeId, setSelectedNodeId] = useState('client_360');
  const [validationId, setValidationId] = useState('val-acc');
  const [copied, setCopied] = useState(null);
  const [valRunning, setValRunning] = useState(null);
  const [valOutputs, setValOutputs] = useState({});
  const [drag, setDrag] = useState(null);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const scrollRef = useRef(null);
  const reach = useMemo(function () {
    if (!selectedNodeId) return { nodes: new Set(), edgeIds: new Set() };
    return bfsReachable(selectedNodeId);
  }, [selectedNodeId]);
  const selectedNode = useMemo(function () {
    return NODES.find(function (n) { return n.id === selectedNodeId; }) || null;
  }, [selectedNodeId]);
  const selectedValidation = useMemo(function () {
    return VALIDATION_SCRIPTS.find(function (s) { return s.id === validationId; }) || null;
  }, [validationId]);
  const downstreamList = useMemo(function () {
    if (!selectedNodeId) return [];
    const adj = {};
    EDGES.forEach(function (e) { (adj[e.from] = adj[e.from] || []).push(e); });
    const seen = {};
    const out = [];
    const queue = [selectedNodeId];
    seen[selectedNodeId] = true;
    while (queue.length) {
      const cur = queue.shift();
      const node = NODES.find(function (n) { return n.id === cur; });
      if (node) out.push(node);
      const next = adj[cur] || [];
      for (let k = 0; k < next.length; k++) {
        if (!seen[next[k].to]) { seen[next[k].to] = true; queue.push(next[k].to); }
      }
    }
    return out;
  }, [selectedNodeId]);
  function toggleDetail() { setDetailExpanded(function (v) { return !v; }); }
  function beginDrag(ev, nodeId) {
    const pos = positions[nodeId];
    if (!pos) return;
    if (ev && ev.preventDefault) { try { ev.preventDefault(); } catch (e) {} }
    setDrag({ id: nodeId, dx: ev.clientX - pos.x, dy: ev.clientY - pos.y });
    setSelectedNodeId(nodeId);
  }
  useEffect(function () {
    function onMove(ev) {
      setDrag(function (cur) {
        if (!cur) return cur;
        setPositions(function (prev) {
          const next = Object.assign({}, prev);
          next[cur.id] = { x: ev.clientX - cur.dx, y: ev.clientY - cur.dy };
          return next;
        });
        return cur;
      });
    }
    function onUp() { setDrag(null); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return function () {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);
  function resetLayout() { setPositions(Object.assign({}, BASE_POSITIONS)); }
  function exportJSON() {
    try {
      const blob = new Blob([JSON.stringify({ nodes: NODES, edges: EDGES, positions: positions }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'continuum-v4.json'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    } catch (e) { console.warn('[guide] export JSON failed', e); }
  }
  function exportMD() {
    try {
      let md = '# Continuum v4 - Flow\n\n';
      NODES.forEach(function (n) { md += '## ' + n.label + '\n- ' + n.desc + '\n- Logic: ' + n.logic + '\n\n'; });
      md += '## Edges\n';
      EDGES.forEach(function (e) { md += '- ' + e.from + ' -> ' + e.to + ' [' + e.condition + ']\n'; });
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'continuum-v4.md'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    } catch (e) { console.warn('[guide] export MD failed', e); }
  }
  function copyText(text, key) {
    try {
      navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(function () { setCopied(null); }, 1500);
    } catch (e) { console.warn('[guide] copy failed', e); }
  }
  // guideState bridge: tab modules read everything from this object.
  // DataFlow also needs drag + overlay toggle + ordered downstream list.
  const guideState = {
    activeTab: activeTab, setActiveTab: setActiveTab,
    positions: positions, setPositions: setPositions,
    selectedNodeId: selectedNodeId, setSelectedNodeId: setSelectedNodeId,
    selectedNode: selectedNode, reach: reach,
    downstreamList: downstreamList,
    detailExpanded: detailExpanded, toggleDetail: toggleDetail,
    drag: drag, beginDrag: beginDrag,
    validationId: validationId, setValidationId: setValidationId,
    selectedValidation: selectedValidation,
    valRunning: valRunning, setValRunning: setValRunning,
    valOutputs: valOutputs, setValOutputs: setValOutputs,
    scrollRef: scrollRef, resetLayout: resetLayout,
    copyText: copyText, copied: copied,
  };
  window.__GUIDE_STATE__ = guideState;
  return html`
    <div className="w-full min-h-screen bg-[#FCFBF9] text-[#2F313E] flex flex-col">
      <style>${STYLE_BLOCK}</style>
      <header className="sticky top-0 z-50 bg-[#FFF8F3]/90 backdrop-blur-xl border-b border-[#E8E2E0] px-5 md:px-7 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E3F2E7] border border-[#C5E0CC] flex items-center justify-center text-[14px]">◎</div>
            <h1 className="text-[15px] md:text-[16px] font-[600] tracking-tight text-[#22232B]">Continuum • Human-in-the-loop Knowledge Fabric</h1>
          </div>
          <div className="hidden md:flex items-center gap-1 ml-6 bg-[#F6F2EF] p-1 rounded-full border border-[#E8E2E0]">
            ${TABS.map(function (t) {
              return html`<button key=${t} onClick=${function () { setActiveTab(t); }} className=${'px-3.5 py-1.5 rounded-full text-[12.5px] font-[500] transition-all ' + (activeTab === t ? 'bg-white text-[#22232B] shadow-sm border border-[#E8E2E0]' : 'text-[#6B6B7A] hover:text-[#2F313E]')}>${tabLabel(t)}</button>`;
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick=${resetLayout} className="px-3.5 py-2 rounded-full bg-white border border-[#E8E2E0] text-[12px] font-[500] text-[#2F313E] hover:bg-[#FCFBF9] transition flex items-center gap-1.5">
            <span className="text-[12px]">↺</span> Reset Layout
          </button>
          <button onClick=${exportJSON} className="hidden md:flex px-3 py-2 rounded-full bg-[#2F313E] text-white text-[11.5px] font-[500] hover:bg-[#22232B]">Export JSON</button>
          <button onClick=${exportMD} className="hidden md:flex px-3 py-2 rounded-full bg-white border border-[#E8E2E0] text-[11.5px] font-[500]">Export MD</button>
        </div>
      </header>
      <div className="md:hidden flex gap-1 p-2 bg-[#F6F2EF] border-b border-[#E8E2E0] overflow-x-auto">
        ${TABS.map(function (t) {
          return html`<button key=${t} onClick=${function () { setActiveTab(t); }} className=${'whitespace-nowrap px-3.5 py-2 rounded-full text-[12px] font-[500] ' + (activeTab === t ? 'bg-white border border-[#E8E2E0] text-[#22232B]' : 'text-[#6B6B7A]')}>${t === 'flow' ? 'Data Flow' : t === 'inventory' ? 'Inventory' : t === 'validation' ? 'Validation' : 'Model'}</button>`;
        })}
      </div>
      <main className="flex-1 flex flex-col min-h-0" id="guide-tab-root">
        ${activeTab === 'flow' && html`<${DataFlow} guideState=${guideState} />`}
        ${activeTab === 'inventory' && html`<${Inventory} guideState=${guideState} />`}
        ${activeTab === 'validation' && html`<${Validation} guideState=${guideState} />`}
        ${activeTab === 'model' && html`<${Model} />`}
      </main>
      <footer className="h-8 border-t border-[#E8E2E0] bg-white flex items-center justify-between px-4 text-[10px] mono text-[#9A8FA8]">
        <span>Continuum v4 final • pastel only • no black • darker grey #2F313E • fixed layout • card 170×56 • gap 68px • inactive #C8C2CE 0.7 solid 1.2px • active #6B6B7A 1.5px</span>
        <span className="hidden md:inline">BFS till end • bottom bar h-[88px] • mini-map • inventory • validation • services.py</span>
      </footer>
    </div>
  `;
}
export function createGuideStateBridge() {
  return { TABS: TABS, TAB_LABELS: TAB_LABELS };
}


