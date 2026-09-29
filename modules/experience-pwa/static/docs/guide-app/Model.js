// Model.js — live runner view (no-build htm, read-only simulation log).
// Reference python block preserved as static text; no execution, no network.
const htmHtml = window.htm.bind(window.React.createElement);
const PY_BLOCK = [
  '# services.py - Continuum Harvester Runner',
  'import asyncio, hashlib',
  'from datetime import datetime',
  '',
  'class Harvester:',
  '  def collect(self, sources):',
  '    docs = []',
  '    for src in sources:',
  '      h = sha256(src.content)[:12]  # Dedupe by content_hash',
  '      docs.append({"id": "harvest_" + h, "source": src.type})',
  '    return docs  # 9 sources -> 42 docs',
  '',
  'class Parser:',
  '  OPERATORS = ["EXACT","CONTAINS","DOMAIN","DATE_RANGE","TOKEN_OVERLAP","URL_CONTAINS"]',
  '  def link(self, docs, anchors):',
  '    return [d for d in docs if self.token_overlap(d) >= 0.42]  # 90% linked',
  '',
  'class Classifier:',
  '  def decide(self, doc):',
  '    if doc.overlap < 0.9 or doc.weight < 0.5:',
  '      return "informational_updates"',
  '    return "status_cards"',
  '',
  'def apply_privacy(card, choice):',
  '  return {"visibility": "owner_only"} if choice == "private" else {"visibility": "team"}',
].join('\n');
const LOG_ROWS = [
  ['14:20:01', 'harvester: 9 sources -> 42 docs'],
  ['14:20:02', 'parser: TOKEN_OVERLAP - 38 linked (90%) - 4 orphan'],
  ['14:20:03', 'human_review: 6 pending - avg age 14m - waiting'],
  ['14:20:04', 'status_cards: RAW + Provenance AI - 26 cards'],
  ['14:20:05', 'privacy_shared: 28 -> team visible'],
  ['14:20:06', 'vector_building: embedding upsert - 284 vectors'],
  ['14:20:07', 'hashtag_id: #phoenix-migration - 12 cards'],
  ['14:20:08', 'classifier: 38 decisions - 12 info / 26 status'],
];
function logPanel() {
  return htmHtml`<div className="rounded-[12px] border border-[#E8E2E0] bg-[#FCFBF9] p-3">
    <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A] mb-2">Live Log - Simulation</div>
    <div className="mono text-[11px] leading-[15px] text-[#2F313E] space-y-1">
      ${LOG_ROWS.map(function (r) {
        return htmHtml`<div key=${r[0]}>
          <span className="text-[#8A7D7A]">${r[0]}</span>${' ' + r[1]}
        </div>`;
      })}
    </div>
    <div className="pt-1 font-[600] text-[#2F6B3A]">continuum_final: searchable - self-learning active</div>
  </div>`;
}
export function Model() {
  return htmHtml`<div className="flex-1 overflow-y-auto bg-[#FCFBF9] p-5 md:p-8">
    <div className="max-w-[1100px] mx-auto space-y-6">
      <div className="rounded-[16px] border border-[#E8E2E0] bg-white p-5 card-shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-[600] text-[#22232B]">services.py - Live Runner</h3>
          <span className="px-2.5 py-1 rounded-full bg-[#E8FFF0] border border-[#C2E0C8] text-[11px] mono text-[#2F6B3A]">python - live</span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4">
          <pre className="p-4 rounded-[12px] bg-[#2F313E] text-[#E8E2E0] mono text-[11.5px] leading-[16px] overflow-x-auto">${PY_BLOCK}</pre>
          <div className="space-y-3">
            ${logPanel()}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
