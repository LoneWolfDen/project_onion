// Inventory.js — list + details view (no-build htm).
// Reads guideState: selectedNodeId, setSelectedNodeId, selectedNode, downstreamList.
import { NODES } from './GuideData.js';

const htmHtml = window.htm.bind(window.React.createElement);

function tileButton(node, guideState) {
  const sel = guideState.selectedNodeId === node.id;
  return htmHtml`<button key=${node.id} onClick=${function () { guideState.setSelectedNodeId(node.id); }}
    className=${'w-full text-left rounded-[12px] border px-3 py-2.5 flex gap-2.5 items-start transition ' + (sel ? 'bg-white border-[#6B6B7A] card-shadow-active' : 'bg-white/60 border-[#E8E2E0] hover:bg-white')}>
    <div className="w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-[13px]" style=${{ background: node.color, borderColor: node.border }}>${node.icon}</div>
    <div className="min-w-0 flex-1">
      <div className="text-[12.5px] font-[600] text-[#22232B] leading-[14px]">${node.label}</div>
      <div className="text-[10.5px] text-[#6B6B7A] leading-[13px] mt-0.5 line-clamp-2">${node.desc}</div>
      <div className="mt-1 flex gap-1">
        <span className="px-1.5 py-0.5 rounded-full bg-[#F6F2EF] border border-[#E8E2E0] text-[9px] mono text-[#8A7D7A]">${node.kind}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-white border border-[#E8E2E0] text-[9px] mono text-[#8A7D7A]">${node.column}</span>
      </div>
    </div>
  </button>`;
}

function detailHead(node) {
  return htmHtml`<div className="flex items-start gap-4">
    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center border text-[18px]" style=${{ background: node.color, borderColor: node.border }}>${node.icon}</div>
    <div>
      <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">${node.sublabel}</div>
      <h2 className="text-[20px] font-[600] tracking-tight text-[#22232B]">${node.label}</h2>
      <div className="text-[12px] text-[#6B6B7A] mono mt-0.5">${node.id} - column ${node.column} - ${node.kind}</div>
    </div>
  </div>`;
}

function detailLogicBlock(node) {
  return htmHtml`<div className="mt-4 rounded-[14px] border border-[#E8E2E0] bg-[#FCFBF9] p-4">
    <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Typed linking logic</div>
    <div className="mt-1 text-[12.5px] mono text-[#2F313E] bg-white border border-[#E8E2E0] rounded-[8px] px-2.5 py-1.5">${node.logic}</div>
    <div className="mt-3 text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Sample</div>
    <div className="text-[12px] mono text-[#2F313E] mt-0.5">${node.sample}</div>
    <div className="mt-3 text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">What it does - Long</div>
    <div className="text-[12.5px] leading-[17px] text-[#2F313E] mt-0.5">${node.long}</div>
  </div>`;
}

function detailFlowBlock(node, guideState) {
  const list = guideState.downstreamList || [];
  return htmHtml`<div className="mt-4 rounded-[14px] border border-[#E8E2E0] bg-white p-4">
    <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Downstream flow - ${Math.max(list.length - 1, 0)} hops to Continuum Final</div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      ${list.map(function (m) {
        return htmHtml`<button key=${m.id} onClick=${function () { guideState.setSelectedNodeId(m.id); }}
          className=${'px-2 py-0.5 rounded-full text-[10.5px] border ' + (m.id === node.id ? 'bg-[#2F313E] text-white border-[#2F313E]' : 'bg-[#FCFBF9] border-[#E8E2E0] text-[#2F313E] hover:bg-white')}>${m.label}</button>`;
      })}
    </div>
    <div className="mt-3 flex gap-1.5 flex-wrap">
      ${['EXACT', 'CONTAINS', 'DOMAIN', 'DATE_RANGE', 'TOKEN_OVERLAP', 'URL_CONTAINS'].map(function (m) {
        return htmHtml`<span key=${m} className="px-2 py-1 rounded-full bg-[#FFF6D6] border border-[#F0E4A8] mono text-[10px] text-[#6B5A3A]">${m}</span>`;
      })}
    </div>
  </div>`;
}

export function Inventory(props) {
  const guideState = props.guideState;
  const node = guideState.selectedNode;
  return htmHtml`<div className="flex-1 flex flex-col md:flex-row min-h-0">
    <div className="w-full md:w-[360px] border-r border-[#E8E2E0] bg-[#FCFBF9] overflow-y-auto">
      <div className="p-3 sticky top-0 bg-[#FCFBF9] border-b border-[#E8E2E0] z-10">
        <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Inventory - ${NODES.length} tiles</div>
        <div className="text-[12px] text-[#6B6B7A] mt-1">Clean list says what each item does. Click for data flow to next stages + logic.</div>
      </div>
      <div className="p-2 space-y-1.5">
        ${NODES.map(function (n) { return tileButton(n, guideState); })}
      </div>
    </div>
    <div className="flex-1 overflow-y-auto bg-white">
      ${node && htmHtml`<div className="p-5 md:p-7 max-w-[900px]">
        ${detailHead(node)}
        <div className="mt-2 text-[13px] text-[#2F313E]">${node.desc}</div>
        ${detailLogicBlock(node)}
        ${detailFlowBlock(node, guideState)}
      </div>`}
    </div>
  </div>`;
}
