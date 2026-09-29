// Canvas.js: lanes, edges, flow dots, story token and node cards.
// The stage is drawn at its logical size and scaled to fit the frame width.
import { html, useEffect, useRef, useState } from '../lib/html.js';
import { CONDITIONS } from '../data/conditions.js';
import { NodeCard } from './NodeCard.js';

const INK = { idle: '#B8C4D4', soft: '#CBD5E1', dim: '#CBD5E1', down: '#1F4A7A', lit: '#1F4A7A', up: '#7C6BB0', feedback: '#7C6BB0' };
const ACTIVE = new Set(['down', 'up', 'lit', 'feedback']);
const DOT = { down: '#2F6AA8', lit: '#1F4A7A', up: '#7C6BB0', feedback: '#9C8AD6' };

function edgeLook(e, state) {
  const active = ACTIVE.has(state);
  const cond = e.condition && CONDITIONS[e.condition];
  let stroke = INK[state] || INK.idle;
  let dash = e.kind === 'feedback' ? '5 5' : '';
  let width = active ? 2.3 : 1.4;
  if (cond) {
    dash = cond.dash;
    if (active && state !== 'up') stroke = cond.ink;
    if (active) width = cond.width + 0.4;
  }
  const opacity = { idle: 0.85, soft: 0.4, dim: 0.22 }[state] ?? 1;
  const marker = active ? (cond && state !== 'up' ? 'c-' + e.condition : state) : (state === 'dim' ? 'dim' : 'idle');
  return { stroke, dash, width, opacity, marker, active };
}

function Markers() {
  const keys = { ...INK, ...Object.fromEntries(Object.entries(CONDITIONS).map(([k, c]) => ['c-' + k, c.ink])) };
  return html`<defs>${Object.entries(keys).map(([k, color]) => html`
    <marker key=${k} id=${'rm5-arrow-' + k} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9 z" fill=${color}></path>
    </marker>`)}</defs>`;
}

function useFitScale(ref, logicalWidth) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const avail = el.clientWidth - 16;
      const floor = window.innerWidth < 768 ? 0.62 : 0.5;
      setScale(Math.max(floor, Math.min(1.12, avail / logicalWidth)));
    };
    fit();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', fit);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); };
  }, [ref, logicalWidth]);
  return scale;
}

export function Canvas({ view, layout, highlight, expanded, popover, storyStep, storyIndex, reducedMotion, onSelect, onSelectEdge, onToggle, onHover, onAvatar, onClear }) {
  const frameRef = useRef(null);
  const scale = useFitScale(frameRef, layout.width);
  const { nodeState, edgeState, animated, mode } = highlight;
  const storyTarget = storyStep ? layout.edges.find((e) => storyStep.token && e.leafIds.includes(storyStep.token)) : null;
  const arriveId = storyTarget ? storyTarget.to : null;

  // Each story step brings its focus card into view, so the demo never plays
  // below the fold or behind the story strip.
  useEffect(() => {
    if (storyIndex === null || storyIndex === undefined || !frameRef.current) return;
    const id = arriveId || (storyStep && storyStep.nodes[0]);
    const el = id && frameRef.current.querySelector('[data-node="' + id + '"]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const bottomLimit = window.innerHeight - 170; // leave room for the story strip
    if (r.top < 90 || r.bottom > bottomLimit) {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [storyIndex, arriveId]);

  // Edge text: condition glyphs always show in Domain; runtime verbs show only
  // where they explain the current focus, so lineage mode never gets cluttered.
  // Labels are rendered after the cards so short hops between lanes stay readable.
  const selectedIds = new Set(Object.keys(nodeState).filter((id) => nodeState[id] === 'selected'));
  const showLabel = (e) => {
    if (!ACTIVE.has(edgeState[e.id])) return false;
    if (mode === 'lineage') return selectedIds.has(e.from) || selectedIds.has(e.to);
    return mode !== 'hover';
  };

  return html`<div className="rm5-frame" ref=${frameRef} onClick=${onClear}
      role="region" aria-label=${view.title + ' view diagram'}>
    <div className="rm5-stage-wrap" style=${{ width: layout.width * scale + 'px', height: layout.height * scale + 'px' }}>
      <div key=${view.id} className="rm5-stage rm5-entering"
          style=${{ width: layout.width + 'px', height: layout.height + 'px', transform: 'scale(' + scale + ')' }}>

        ${layout.rowLabels.map((r) => html`<div key=${'row' + r.y} className="rm5-row-label" style=${{ left: r.x + 'px', top: r.y + 'px' }}>${r.text}</div>`)}
        ${layout.lanes.map((l) => html`<div key=${l.id} className=${'rm5-lane' + (l.id.startsWith('gate') ? ' rm5-lane-gate' : '')}
            style=${{ left: l.x + 'px', top: l.y + 'px', width: l.w + 'px', height: l.h + 'px' }}>
          <span className="rm5-lane-label">${l.label}</span></div>`)}

        <svg className="rm5-edges" width=${layout.width} height=${layout.height} style=${{ pointerEvents: 'none' }} aria-hidden="true">
          <${Markers} />
          ${layout.edges.map((e) => {
            const look = edgeLook(e, edgeState[e.id] || 'idle');
            return html`<g key=${e.id}>
              <path className="rm5-edge" d=${e.d} stroke=${look.stroke} strokeWidth=${look.width} strokeOpacity=${look.opacity}
                strokeDasharray=${look.dash || undefined} strokeLinecap="round" markerEnd=${'url(#rm5-arrow-' + look.marker + ')'}></path>
              <path className="rm5-edge-hit" d=${e.d} style=${{ pointerEvents: 'stroke' }}
                onClick=${(ev) => { ev.stopPropagation(); onSelectEdge(e.id); }}></path>
            </g>`;
          })}
        </svg>

        ${view.id === 'domain' && layout.edges.map((e) => {
          const c = CONDITIONS[e.condition];
          const state = edgeState[e.id] || 'idle';
          if (!c || showLabel(e)) return null;
          return html`<span key=${'g' + e.id} className="rm5-edge-glyph" title=${e.condition}
            style=${{ left: e.midX + 'px', top: e.midY + 'px', color: c.ink, borderColor: c.ink, background: c.fill, opacity: state === 'dim' ? 0.25 : state === 'soft' ? 0.5 : 1 }}>${c.glyph}</span>`;
        })}
        ${!reducedMotion && layout.edges.filter((e) => animated.has(e.id)).map((e, i) => {
          const state = edgeState[e.id];
          const color = e.condition && CONDITIONS[e.condition] && state !== 'up' ? CONDITIONS[e.condition].ink : DOT[state] || DOT.lit;
          const dur = 2.1 + (i % 3) * 0.35;
          return [0, 1].map((k) => html`<span key=${'d' + e.id + k} className="rm5-dot"
            style=${{ offsetPath: "path('" + e.d + "')", background: color, animationDuration: dur + 's', animationDelay: -(k * dur / 2 + i * 0.23) + 's' }}></span>`);
        })}
        ${!reducedMotion && storyTarget && html`<span key=${'token' + storyIndex} className="rm5-token"
            style=${{ offsetPath: "path('" + storyTarget.d + "')" }}></span>`}

        ${layout.nodes.map((box) => {
          const node = view.nodes[box.id];
          const state = nodeState[box.id] || 'normal';
          return html`<${NodeCard} key=${box.id} box=${box} node=${node} state=${state}
            expanded=${expanded === box.id} popoverOpen=${popover === box.id}
            gatePulse=${node.kind === 'gate' && state !== 'dim' && state !== 'soft' && mode !== 'none'}
            arrive=${arriveId === box.id}
            onSelect=${onSelect} onToggle=${onToggle} onHover=${onHover} onAvatar=${onAvatar} />`;
        })}
        ${layout.edges.filter(showLabel).map((e) => {
          const c = e.condition && CONDITIONS[e.condition];
          return html`<span key=${'l' + e.id} className="rm5-edge-label"
            style=${{ left: e.midX + 'px', top: e.midY + 'px', color: c ? c.ink : undefined, borderColor: c ? c.ink : undefined }}>
            ${c ? c.glyph + ' ' + e.condition : e.label}${e.merged > 1 ? ' ×' + e.merged : ''}</span>`;
        })}

      </div>
    </div>
  </div>`;
}
