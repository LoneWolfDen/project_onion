// StoryStrip.js: story controls. Hovering the strip pauses auto-advance.
import { html } from '../lib/html.js';
import { STORY_STEPS, STORY_TITLE, STORY_LABEL } from '../data/story.js';

export function StoryStrip({ story, onStep, onTogglePlay, onExit, onHoverChange }) {
  const last = STORY_STEPS.length - 1;
  const step = STORY_STEPS[story.step];
  const atEnd = story.step === last && !story.playing;
  return html`<section className="rm5-story" aria-label="Story mode"
      onMouseEnter=${() => onHoverChange(true)} onMouseLeave=${() => onHoverChange(false)}>
    <div className="rm5-story-steps" role="group" aria-label="Story steps">
      ${STORY_STEPS.map((_, i) => html`<button type="button" key=${i}
          className=${'rm5-story-dot' + (i < story.step ? ' rm5-done' : '')}
          aria-current=${i === story.step ? 'step' : undefined}
          aria-label=${'Step ' + (i + 1)} onClick=${() => onStep(i)}>${i + 1}</button>`)}
    </div>
    <div>
      <div className="rm5-story-title">${STORY_TITLE} · step ${story.step + 1} of ${STORY_STEPS.length}</div>
      <p className="rm5-story-caption" aria-live="polite">${step.caption}</p>
      <div className="rm5-story-label">${STORY_LABEL}</div>
    </div>
    <div className="rm5-story-controls">
      <button type="button" className="rm5-btn rm5-btn-small" onClick=${() => onStep(story.step - 1)} disabled=${story.step === 0} aria-label="Previous step">◀</button>
      ${atEnd
        ? html`<button type="button" className="rm5-btn rm5-btn-small rm5-btn-primary" onClick=${() => onStep(0, true)}>↻ Replay</button>`
        : html`<button type="button" className="rm5-btn rm5-btn-small rm5-btn-primary" onClick=${onTogglePlay} aria-label=${story.playing ? 'Pause' : 'Play'}>${story.playing ? '❚❚ Pause' : '▶ Play'}</button>`}
      <button type="button" className="rm5-btn rm5-btn-small" onClick=${() => onStep(story.step + 1)} disabled=${story.step === last} aria-label="Next step">▶</button>
      <button type="button" className="rm5-btn rm5-btn-small rm5-btn-quiet" onClick=${onExit} aria-label="Exit story">✕</button>
    </div>
  </section>`;
}
