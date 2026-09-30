// MapView.js: the Map tab. Toolbar (client, view switch, play), caption,
// Try chips + legend, the compact Why strip, canvas + inspector, story strip.
import { html } from '../lib/html.js';
import { CAPTION, TRY_CHIPS, WHY } from '../data/content.js';
import { CONDITIONS, CONDITION_ORDER } from '../data/conditions.js';
import { ConditionTag } from './ui.js';
import { Canvas } from './Canvas.js';
import { Inspector } from './Inspector.js';
import { StoryStrip } from './StoryStrip.js';

function ViewSwitch({ viewId, onSwitch }) {
  return html`<div className="rm5-switch" role="group" aria-label="View">
    ${['runtime', 'domain'].map((v) => html`<button type="button" key=${v} aria-pressed=${viewId === v} onClick=${() => onSwitch(v)}>
      ${v === 'runtime' ? 'Runtime' : 'Domain'}</button>`)}
  </div>`;
}

function Legend({ viewId, selection, onFilter }) {
  if (viewId === 'domain') {
    return html`${CONDITION_ORDER.map((c) => html`<button type="button" key=${c} className="rm5-chip"
        aria-pressed=${Boolean(selection && selection.type === 'filter' && selection.condition === c)}
        title=${CONDITIONS[c].meaning} onClick=${() => onFilter(c)}><${ConditionTag} condition=${c} /></button>`)}`;
  }
  return html`
    <span className="rm5-legend-swatch"><span className="rm5-legend-line" style=${{ borderColor: '#7C6BB0' }}></span>upstream</span>
    <span className="rm5-legend-swatch"><span className="rm5-legend-line" style=${{ borderColor: '#1F4A7A' }}></span>downstream</span>
    <span className="rm5-legend-swatch"><span className="rm5-legend-line" style=${{ borderColor: '#7C6BB0', borderTopStyle: 'dashed' }}></span>feedback loop</span>`;
}

export function MapView(p) {
  const chips = TRY_CHIPS[p.viewId];
  return html`<main className="rm5-map" id="main">
    <div className="rm5-toolbar">
      
      <${ViewSwitch} viewId=${p.viewId} onSwitch=${p.onSwitch} />
      <span className="rm5-spacer"></span>
      <button type="button" className="rm5-btn rm5-btn-primary" onClick=${p.onTogglePlay}>
        ${!p.story ? '▶ Play story' : p.story.playing ? '❚❚ Pause story' : p.story.step === p.lastStep ? '↻ Replay story' : '▶ Resume story'}</button>
    </div>
    <div className="rm5-caption">${CAPTION.split(' · ').map((part, i) => {
      const [name, ...rest] = part.split(':');
      return html`<span key=${i}>${i ? ' · ' : ''}<b>${name}:</b>${rest.join(':')}</span>`;
    })}</div>
    <div className="rm5-chips">
      <span className="rm5-chips-label">Try</span>
      ${chips.map((c) => html`<button type="button" key=${c.label} className="rm5-chip" onClick=${() => p.onAction(c.action)}>${c.label}</button>`)}
      <span className="rm5-spacer"></span>
      <${Legend} viewId=${p.viewId} selection=${p.selection} onFilter=${p.onFilter} />
    </div>

    ${p.showWhy && html`<div className=${'rm5-why-strip' + (p.whyFlash ? ' rm5-why-flash' : '')} role="note" aria-label="Why this matters">
      <p><b>Without Continuum</b>, ${WHY.without} <b>With Continuum</b>, ${WHY.with}</p>
      <button type="button" className="rm5-btn rm5-btn-small" onClick=${p.onReadWhy}>Read more →</button>
      <button type="button" className="rm5-btn rm5-btn-small rm5-btn-quiet" onClick=${p.onDismissWhy} aria-label="Dismiss">✕</button>
    </div>`}

    <div className="rm5-body">
      <${Canvas} view=${p.view} layout=${p.layout} highlight=${p.highlight} expanded=${p.expanded} popover=${p.popover}
        storyStep=${p.storyStep} storyIndex=${p.story ? p.story.step : null} reducedMotion=${p.reducedMotion}
        onSelect=${p.onSelect} onSelectEdge=${p.onSelectEdge} onToggle=${p.onToggle} onHover=${p.onHover}
        onAvatar=${p.onAvatar} onClear=${p.onClear} />
      <${Inspector} view=${p.view} layout=${p.layout} highlight=${p.highlight} selection=${p.selection}
        storyIndex=${p.story ? p.story.step : null} expanded=${p.expanded}
        onSelect=${p.onSelect} onToggle=${p.onToggle} onSelectEdge=${p.onSelectEdge} onClear=${p.onClear} />
    </div>

    ${p.story && html`<${StoryStrip} story=${p.story} onStep=${p.onStoryStep} onTogglePlay=${p.onTogglePlay}
      onExit=${p.onStoryExit} onHoverChange=${p.onStoryHover} />`}
  </main>`;
}
