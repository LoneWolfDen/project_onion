// Inspector.js: the right-hand panel. What it shows depends on what is lit:
// a story step, a node, an edge, a focus set, a condition filter, or nothing.
import { html } from '../lib/html.js';
import { StatusPill, ConditionTag, Section, KeyValues } from './ui.js';
import { CONDITIONS, CONDITION_ORDER } from '../data/conditions.js';
import { GATE_TASKS } from '../data/runtimeModel.js';
import { STORY_STEPS, STORY_TITLE, STORY_LABEL } from '../data/story.js';

const KIND_LABEL = {
  master: 'Client master', anchor: 'Anchor', 'source-sp': 'Source · SharePoint', 'source-gdp': 'Source · GDP',
  'source-comm': 'Source · Emails & Teams', 'source-connected': 'Source · Connected', service: 'Service',
  gate: 'Human gate', store: 'Card store', learning: 'Self-learning', hub: 'Hub', outcome: 'Outcome',
};

function NodeLink({ view, id, dir, onSelect }) {
  const n = view.nodes[id];
  if (!n) return null;
  return html`<li><button type="button" className="rm5-link" onClick=${() => onSelect(id)}>
    <span>${n.label}</span>
    <span>${dir ? html`<span className=${'rm5-dir rm5-dir-' + dir}>${dir === 'up' ? '↑ from' : '↓ to'}</span>` : html`<${StatusPill} status=${n.status} />`}</span>
  </button></li>`;
}

function Lineage({ view, highlight, onSelect }) {
  const lin = highlight.lineage;
  if (!lin) return null;
  const order = (set) => [...set];
  return html`
    <${Section} title=${'Upstream · ' + lin.up.size}>
      ${lin.up.size ? html`<ul className="rm5-list">${order(lin.up).map((id) => html`<${NodeLink} key=${id} view=${view} id=${id} dir="up" onSelect=${onSelect} />`)}</ul>`
        : html`<p>Nothing feeds this card. It is where the flow starts.</p>`}
    <//>
    <${Section} title=${'Downstream · ' + lin.down.size}>
      ${lin.down.size ? html`<ul className="rm5-list">${order(lin.down).map((id) => html`<${NodeLink} key=${id} view=${view} id=${id} dir="down" onSelect=${onSelect} />`)}</ul>`
        : html`<p>This is the end of the flow.</p>`}
    <//>`;
}

function DomainDetail({ view, node, onSelect, onSelectEdge, layoutEdges }) {
  const d = node.domain;
  const links = view.edges.filter((e) => e.from === node.id || e.to === node.id);
  return html`
    <${Section} title="Typed links">
      <ul className="rm5-list">${links.map((e) => {
        const other = e.from === node.id ? e.to : e.from;
        const visible = layoutEdges.find((v) => v.leafIds.includes(e.id));
        return html`<li key=${e.id}><button type="button" className="rm5-link" onClick=${() => visible && onSelectEdge(visible.id)}>
          <span>${e.from === node.id ? '→ ' : '← '}${view.nodes[other].label}</span><${ConditionTag} condition=${e.condition} />
        </button></li>`;
      })}</ul>
    <//>
    ${d.identifiers.length ? html`<${Section} title="Primary identifiers"><p className="rm5-mono" style=${{ fontSize: '12px' }}>${d.identifiers.join(' · ')}</p><//>` : null}
    ${d.filters.length ? html`<${Section} title="Filter keywords (typed, no free text)">
      <ul className="rm5-list">${d.filters.map((f, i) => html`<li key=${i} className="rm5-evidence">
        <${ConditionTag} condition=${f.condition} /> ${f.key}${f.source ? html`<div className="rm5-source">${f.source}</div>` : null}</li>`)}</ul><//>` : null}
    ${d.fields.length ? html`<details className="rm5-more"><summary>Fields · ${d.fields.length}</summary>
      <${KeyValues} rows=${d.fields.map((f) => [f.name, [f.kind, f.example].filter(Boolean).join(' · ') || '–'])} /></details>` : null}
    ${d.examplePath ? html`<${Section} title="Example path"><p className="rm5-mono" style=${{ fontSize: '12px' }}>${d.examplePath}</p><//>` : null}
    <p className="rm5-source">Source: <code>data/seed/relationship_model.json</code></p>`;
}

function NodeDetail({ view, node, highlight, expanded, onSelect, onToggle, onSelectEdge, layoutEdges }) {
  return html`
    <div className="rm5-insp-head">
      <div className="rm5-insp-kicker">${KIND_LABEL[node.kind] || node.kind}${node.parent ? ' · in ' + view.nodes[node.parent].label : ''}</div>
      <h2 className="rm5-insp-title">${node.label}</h2>
      <${StatusPill} status=${node.status} />
    </div>
    <div className="rm5-insp-body">
      <${Section} title="What it does"><p>${node.desc}</p><//>
      ${node.kind === 'gate' && html`<${Section} title="A person decides"><ul className="rm5-list">
        ${(GATE_TASKS[node.id] || []).map((t) => html`<li key=${t} className="rm5-evidence" style=${{ fontFamily: 'inherit' }}>${t}</li>`)}</ul><//>`}
      ${node.children && html`<${Section} title=${'Inside · ' + node.children.length}>
        ${expanded !== node.id && html`<p style=${{ marginBottom: '6px' }}><button type="button" className="rm5-btn rm5-btn-small" onClick=${() => onToggle(node.id)}>Expand on the map</button></p>`}
        <ul className="rm5-list">${node.children.map((c) => html`<${NodeLink} key=${c} view=${view} id=${c} onSelect=${onSelect} />`)}</ul><//>`}
      <${Lineage} view=${view} highlight=${highlight} onSelect=${onSelect} />
      ${node.sample && html`<${Section} title="Sample (seed)"><${KeyValues} rows=${node.sample} />
        <p className="rm5-source" style=${{ marginTop: '4px' }}>Source: <code>${node.sampleSource}</code></p><//>`}
      <${Section} title="Built in">
        <ul className="rm5-list">${(node.evidence || []).map((ev) => html`<li key=${ev} className="rm5-evidence">${ev}</li>`)}</ul>
      <//>
      ${node.domain && html`<${DomainDetail} view=${view} node=${node} onSelect=${onSelect} onSelectEdge=${onSelectEdge} layoutEdges=${layoutEdges} />`}
    </div>`;
}

function EdgeDetail({ view, edge }) {
  const from = view.nodes[edge.from];
  const to = view.nodes[edge.to];
  const cond = edge.condition && CONDITIONS[edge.condition];
  return html`
    <div className="rm5-insp-head">
      <div className="rm5-insp-kicker">${cond ? 'Typed link' : edge.kind === 'feedback' ? 'Feedback loop' : 'Hand-off'}</div>
      <h2 className="rm5-insp-title">${from.label} → ${to.label}</h2>
      ${cond && html`<${ConditionTag} condition=${edge.condition} />`}
    </div>
    <div className="rm5-insp-body">
      ${cond && html`<${Section} title="Rule"><p>${cond.meaning}</p><//>`}
      <${KeyValues} rows=${[
        ['Label', edge.label],
        ...(edge.field ? [['Field', edge.field]] : []),
        ...(edge.merged > 1 ? [['Carries', edge.merged + ' links (group collapsed)']] : []),
      ]} />
      ${edge.description && html`<${Section} title="Description"><p>${edge.description}</p><//>`}
      ${cond && html`<p className="rm5-source">Source: <code>data/seed/relationship_model.json</code></p>`}
    </div>`;
}

function StoryDetail({ index, view, onSelect }) {
  const step = STORY_STEPS[index];
  const main = view.nodes[step.nodes[step.nodes.length - 1]];
  return html`
    <div className="rm5-insp-head">
      <div className="rm5-insp-kicker">${STORY_TITLE} · step ${index + 1} of ${STORY_STEPS.length}</div>
      <h2 className="rm5-insp-title">${step.detail.heading}</h2>
      <span className="rm5-source">${STORY_LABEL}</span>
    </div>
    <div className="rm5-insp-body">
      <p style=${{ margin: 0, fontSize: '13.5px', color: 'var(--ink-2)' }}>${step.caption}</p>
      <${KeyValues} rows=${step.detail.rows} />
      ${step.detail.note && html`<div className="rm5-note">${step.detail.note}</div>`}
      <p className="rm5-source">Source: <code>${step.detail.source}</code></p>
      ${main && html`<${Section} title="Card in focus"><ul className="rm5-list"><${NodeLink} view=${view} id=${main.id} onSelect=${onSelect} /></ul><//>`}
    </div>`;
}

function Empty({ view }) {
  return html`<div className="rm5-empty">
    <h2>Select a card to see what it connects to</h2>
    <p>Its upstream turns lavender and its downstream turns blue. Everything else greys out.</p>
    <${Section} title="Status">
      <p><${StatusPill} status="live" /> code runs today · <${StatusPill} status="partial" /> limited · <${StatusPill} status="vision" /> designed, dashed</p>
    <//>
    ${view.id === 'runtime' ? html`<${Section} title="Human gates"><p>The three lavender cards with a person are where someone decides. Click the person to see what.</p><//>`
      : html`<${Section} title="Typed rules"><ul className="rm5-list">${CONDITION_ORDER.map((c) => html`<li key=${c} style=${{ fontSize: '12px' }}><${ConditionTag} condition=${c} /> <span style=${{ color: 'var(--muted)' }}>${CONDITIONS[c].meaning}</span></li>`)}</ul><//>`}
    <p className="rm5-source">Keyboard: Tab to a card, Enter to select, Esc to clear, P to play the story.</p>
  </div>`;
}

export function Inspector({ view, layout, highlight, selection, storyIndex, expanded, onSelect, onToggle, onSelectEdge, onClear }) {
  let content = null;
  let idle = false;
  if (storyIndex !== null) {
    content = html`<${StoryDetail} index=${storyIndex} view=${view} onSelect=${onSelect} />`;
  } else if (selection && selection.type === 'node' && view.nodes[selection.id]) {
    content = html`<${NodeDetail} view=${view} node=${view.nodes[selection.id]} highlight=${highlight} expanded=${expanded}
      onSelect=${onSelect} onToggle=${onToggle} onSelectEdge=${onSelectEdge} layoutEdges=${layout.edges} />`;
  } else if (selection && selection.type === 'edge') {
    const edge = layout.edges.find((e) => e.id === selection.id);
    content = edge ? html`<${EdgeDetail} view=${view} edge=${edge} />` : null;
  } else if (selection && selection.type === 'focus') {
    content = html`<div className="rm5-insp-head"><div className="rm5-insp-kicker">Focus</div><h2 className="rm5-insp-title">${selection.label}</h2></div>
      <div className="rm5-insp-body"><ul className="rm5-list">${selection.nodes.map((id) => html`<${NodeLink} key=${id} view=${view} id=${id} onSelect=${onSelect} />`)}</ul>
      ${selection.nodes.map((id) => view.nodes[id] && html`<${Section} key=${'s' + id} title=${view.nodes[id].label}><p>${view.nodes[id].desc}</p><//>`)}</div>`;
  } else if (selection && selection.type === 'filter') {
    const c = CONDITIONS[selection.condition];
    const edges = layout.edges.filter((e) => e.condition === selection.condition);
    content = html`<div className="rm5-insp-head"><div className="rm5-insp-kicker">Typed rule</div><h2 className="rm5-insp-title">${selection.condition}</h2><${ConditionTag} condition=${selection.condition} /></div>
      <div className="rm5-insp-body"><p style=${{ margin: 0 }}>${c.meaning}</p>
      <${Section} title=${edges.length + ' links use it'}><ul className="rm5-list">${edges.map((e) => html`<li key=${e.id}><button type="button" className="rm5-link" onClick=${() => onSelectEdge(e.id)}>
        <span>${view.nodes[e.from].label} → ${view.nodes[e.to].label}</span></button></li>`)}</ul><//></div>`;
  } else {
    idle = true;
    content = html`<${Empty} view=${view} />`;
  }
  return html`<aside className=${'rm5-inspector' + (idle ? ' rm5-idle' : '')} aria-label="Inspector" aria-live="polite">
    ${!idle && storyIndex === null && html`<button type="button" className="rm5-btn rm5-btn-small rm5-btn-quiet rm5-insp-close" onClick=${onClear} aria-label="Clear selection">✕</button>`}
    ${content}
  </aside>`;
}
