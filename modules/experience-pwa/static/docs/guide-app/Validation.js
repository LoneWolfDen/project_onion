// Validation.js P1: helpers (no-build htm). Display-only; writes never execute.
// NOTE: no hooks in this module. Run/output state lives in InteractiveGuide
// (valRunning/valOutputs) so switching tabs never changes hook order (React #310).
import { VALIDATION_SCRIPTS, groupedValidationScripts } from './GuideData.js';
const htmHtml = window.htm.bind(window.React.createElement);
export function isReadOnlyScript(src) {
  const s = String(src || '');
  if (s.indexOf('localStorage.setItem') !== -1) return false;
  if (s.indexOf('fetch(') !== -1) return false;
  if (s.indexOf('XMLHttpRequest') !== -1) return false;
  return true;
}
function sampleTable(sample) {
  if (!sample || !sample.length) return null;
  const keys = Object.keys(sample[0] || {});
  return htmHtml`<div className="overflow-x-auto rounded-[10px] border border-[#E8E2E0]">
    <table className="w-full text-[11px] mono">
      <thead><tr className="bg-[#F6F2EF] text-left">
        ${keys.map(function (k) { return htmHtml`<th key=${k} className="px-2 py-1.5 font-[600] text-[#6B6B7A]">${k}</th>`; })}
      </tr></thead>
      <tbody>
        ${sample.map(function (row, i) {
          return htmHtml`<tr key=${i} className="border-t border-[#F0EBE8]">
            ${keys.map(function (k) {
              const v = row[k];
              const t = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
              return htmHtml`<td key=${k} className="px-2 py-1.5 text-[#2F313E]">${t}</td>`;
            })}
          </tr>`;
        })}
      </tbody>
    </table>
  </div>`;
}
function scriptCard(script, guideState, runState) {
  const sel = guideState.validationId === script.id;
  const ro = isReadOnlyScript(script.chromeScript);
  const out = runState.outputs[script.id];
  return htmHtml`<div key=${script.id} className=${'rounded-[14px] border overflow-hidden ' + (sel ? 'border-[#6B6B7A] card-shadow-active' : 'border-[#E8E2E0]')}>
    <div className="flex items-center justify-between p-3 bg-[#FCFBF9] border-b border-[#E8E2E0]">
      <div>
        <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">${script.group}</div>
        <div className="text-[13px] font-[600] text-[#22232B]">${script.title}</div>
        <div className="text-[11.5px] text-[#6B6B7A] mt-0.5">${script.what}</div>
      </div>
      <span className="px-2 py-0.5 rounded-full bg-white border border-[#E8E2E0] text-[10px] mono text-[#6B6B7A]">${script.short}</span>
    </div>
    <div className="p-3 space-y-2 bg-white">
      <div className="flex gap-2 items-center flex-wrap">
        <button onClick=${function () { guideState.copyText(script.chromeScript, script.id); }} className="px-3 py-1.5 rounded-full bg-[#2F313E] text-white text-[11px] font-[500]">${guideState.copied === script.id ? 'Copied' : 'Copy script'}</button>
        <button onClick=${function () { runState.run(script); }} disabled=${!ro} className="px-3 py-1.5 rounded-full bg-white border border-[#E8E2E0] text-[11px] font-[500] disabled:opacity-50">${runState.running === script.id ? 'Running' : ro ? 'Run read-only' : 'Run blocked (writes)'}</button>
      </div>
      <pre className="p-3 rounded-[10px] bg-[#2F313E] text-[#E8E2E0] mono text-[11px] leading-[15px] overflow-x-auto whitespace-pre-wrap">${script.chromeScript}</pre>
      <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Sample output</div>
      ${sampleTable(script.sample)}
      <div className="text-[11.5px] text-[#2F313E]">How to read: ${script.howToRead}</div>
    </div>
  </div>`;
}
function liveResult(script, runState) {
  const out = runState.outputs[script.id];
  if (!out) return null;
  return htmHtml`<div>
    <div className="text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">Live result (read-only)</div>
    <pre className="mt-1 p-3 rounded-[10px] bg-[#F6F2EF] border border-[#E8E2E0] mono text-[11px] overflow-x-auto whitespace-pre-wrap">${out}</pre>
  </div>`;
}
export function Validation(props) {
  const guideState = props.guideState;
  const groups = groupedValidationScripts();
  const sel = guideState.selectedValidation;
  const running = guideState.valRunning;
  const outputs = guideState.valOutputs || {};
  function run(script) {
    if (!isReadOnlyScript(script.chromeScript)) return;
    guideState.setValRunning(script.id);
    let text = '';
    try {
      const fn = new Function(script.chromeScript);
      let result = null;
      try { result = fn(); } catch (e) { result = 'Error: ' + String((e && e.message) || e); }
      text = result === undefined || result === null
        ? '(no return value - read-only check finished)'
        : (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    } catch (e) {
      text = 'Blocked: ' + String((e && e.message) || e);
    }
    guideState.setValOutputs(function (prev) {
      const next = Object.assign({}, prev);
      next[script.id] = String(text).slice(0, 4000);
      return next;
    });
    guideState.setValRunning(null);
  }
  const runState = { running: running, outputs: outputs, run: run };
  return htmHtml`<div className="flex-1 flex flex-col md:flex-row min-h-0">
    <div className="w-full md:w-[380px] border-r border-[#E8E2E0] bg-[#FCFBF9] overflow-y-auto">
      ${Object.keys(groups).map(function (g) {
        return htmHtml`<div key=${g} className="p-2.5 border-b border-[#F0EBE8] last:border-0">
          <div className="px-2 py-2 text-[11px] font-[600] tracking-widest uppercase text-[#8A7D7A]">${g}</div>
          <div className="space-y-1.5">
            ${groups[g].map(function (s) {
              const on = guideState.validationId === s.id;
              return htmHtml`<button key=${s.id} onClick=${function () { guideState.setValidationId(s.id); }}
                className=${'w-full text-left rounded-[12px] border px-3 py-2.5 flex flex-col gap-1 transition ' + (on ? 'bg-white border-[#6B6B7A] card-shadow-active' : 'bg-white/70 border-[#E8E2E0] hover:bg-white')}>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[12.5px] font-[600] text-[#22232B]">${s.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F6F2EF] border border-[#E8E2E0] mono text-[#8A7D7A]">${s.short}</span>
                </div>
                <div className="text-[11px] leading-[13px] text-[#6B6B7A] line-clamp-2">${s.what}</div>
              </button>`;
            })}
          </div>
        </div>`;
      })}
    </div>
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="p-5 md:p-7 max-w-[860px] space-y-4">
        <div className="text-[12px] text-[#6B6B7A]">Display-only runner: ${VALIDATION_SCRIPTS.length} scripts. Writes (setItem/fetch) are copy-only and never execute.</div>
        ${sel && scriptCard(sel, guideState, runState)}
        ${sel && liveResult(sel, runState)}
      </div>
    </div>
  </div>`;
}

