// App.js: state and actions for Relationship Model v5.
//
// State lives here and flows down; components only call the actions below.
//   tab        map | why | success | eng-*
//   viewId     runtime | domain
//   expanded   the one open group (runtime), or null
//   selection  { type: node|edge|focus|filter, ... } or null
//   story      { step, playing } or null. While a story runs it owns the highlight.
import { html, useState, useEffect, useMemo, useCallback, useRef } from '../lib/html.js';
import { VIEWS } from '../lib/views.js';
import { computeLayout } from '../lib/layout.js';
import { computeHighlight } from '../lib/highlight.js';
import { readFlag, writeFlag } from '../lib/storage.js';
import { DOMAIN_TO_RUNTIME, RUNTIME_TO_DOMAIN } from '../data/mapping.js';
import { STORY_STEPS, STORY_AUTO_ADVANCE_MS } from '../data/story.js';
import { Header } from './Header.js';
import { MapView } from './MapView.js';
import { WhyTab } from './WhyTab.js';
import { SuccessTab } from './SuccessTab.js';
import { EngineeringPage } from './EngineeringPages.js';

const WHY_KEY = 'rm5_why_dismissed';
const LAST_STEP = STORY_STEPS.length - 1;

function useMedia(query) {
  const get = () => { try { return window.matchMedia(query).matches; } catch (e) { return false; } };
  const [on, setOn] = useState(get);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(query); } catch (e) { return undefined; }
    const update = () => setOn(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', update); else mq.addListener(update);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', update); else mq.removeListener(update); };
  }, [query]);
  return on;
}

export function App() {
  const [tab, setTab] = useState('map');
  const [viewId, setViewId] = useState('runtime');
  const [expanded, setExpanded] = useState(null);
  const [selection, setSelection] = useState(null);
  const [story, setStory] = useState(null);
  const [storyHover, setStoryHover] = useState(false);
  const [hover, setHover] = useState(null);
  const [popover, setPopover] = useState(null);
  const [note, setNote] = useState('');
  const [whyDismissed, setWhyDismissed] = useState(() => readFlag(WHY_KEY));
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const canHover = useMedia('(hover: hover) and (pointer: fine)');

  const view = VIEWS[viewId];
  const storyStep = story ? STORY_STEPS[story.step] : null;
  const activeExpanded = storyStep ? storyStep.expand : expanded;
  const layout = useMemo(() => computeLayout(view, activeExpanded), [view, activeExpanded]);
  const highlight = useMemo(() => computeHighlight({
    view, layout, expanded: activeExpanded,
    selection: storyStep ? null : selection,
    story: storyStep,
    hover: storyStep || selection || !canHover ? null : hover,
  }), [view, layout, activeExpanded, selection, storyStep, hover, canHover]);

  // Toast notes clear themselves.
  useEffect(() => {
    if (!note) return undefined;
    const t = setTimeout(() => setNote(''), 3800);
    return () => clearTimeout(t);
  }, [note]);

  // Story auto-advance: every 4s, paused while the strip is hovered.
  useEffect(() => {
    if (!story || !story.playing || storyHover) return undefined;
    const t = setTimeout(() => {
      setStory((s) => (s && s.step < LAST_STEP ? { step: s.step + 1, playing: true } : s && { step: s.step, playing: false }));
    }, STORY_AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [story, storyHover]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const clear = useCallback(() => { setSelection(null); setPopover(null); }, []);

  const stopStory = useCallback(() => { setStory(null); setStoryHover(false); setExpanded(null); }, []);

  const startStory = useCallback((step = 0) => {
    setTab('map'); setViewId('runtime'); setSelection(null); setPopover(null); setExpanded(null); setHover(null);
    setStory({ step: Math.max(0, Math.min(LAST_STEP, step)), playing: true });
  }, []);

  const stepStory = useCallback((step, play = false) => {
    if (step < 0 || step > LAST_STEP) return;
    setStory({ step, playing: play });
  }, []);

  const togglePlay = useCallback(() => {
    setStory((s) => {
      if (!s) return null;
      if (!s.playing && s.step === LAST_STEP) return { step: 0, playing: true };
      return { step: s.step, playing: !s.playing };
    });
    if (!story) startStory(0);
  }, [story, startStory]);

  // Selecting a leaf whose group is closed opens that group first.
  const selectNode = useCallback((id, inView = viewId) => {
    if (story) stopStory();
    const n = VIEWS[inView].nodes[id];
    if (n && n.parent) setExpanded(n.parent);
    setSelection({ type: 'node', id });
    setPopover(null);
  }, [story, stopStory, viewId]);

  const selectEdge = useCallback((id) => {
    if (story) stopStory();
    setSelection({ type: 'edge', id }); setPopover(null);
  }, [story, stopStory]);

  const toggleGroup = useCallback((id) => {
    if (story) stopStory();
    setExpanded((cur) => (cur === id ? null : id));
    setPopover(null);
  }, [story, stopStory]);

  const toggleFilter = useCallback((condition) => {
    setSelection((cur) => (cur && cur.type === 'filter' && cur.condition === condition ? null : { type: 'filter', condition }));
  }, []);

  // View switch carries a node selection across via data/mapping.js (scope S6).
  const switchView = useCallback((next) => {
    if (next === viewId) return;
    if (story) stopStory();
    setPopover(null); setHover(null);
    const from = VIEWS[viewId];
    const to = VIEWS[next];
    if (selection && selection.type === 'node') {
      const map = next === 'runtime' ? DOMAIN_TO_RUNTIME : RUNTIME_TO_DOMAIN;
      const target = map[selection.id];
      const label = from.nodes[selection.id] ? from.nodes[selection.id].label : selection.id;
      if (target && to.nodes[target]) {
        const t = to.nodes[target];
        setExpanded(next === 'runtime' && t.parent ? t.parent : null);
        setSelection({ type: 'node', id: target });
        if (t.label !== label) setNote('“' + label + '” is shown as “' + t.label + '” in the ' + to.title + ' view.');
      } else {
        setSelection(null); setExpanded(null);
        setNote('“' + label + '” is a process step with no business-model entity, so the selection was cleared.');
      }
    } else {
      setSelection(null); setExpanded(null);
    }
    setViewId(next);
  }, [viewId, story, stopStory, selection]);

  // One entry point for Try chips, "See it in the demo" and "Show me".
  const runAction = useCallback((a) => {
    if (a.type === 'story') { startStory(a.step); return; }
    stopStory();
    setTab('map'); setPopover(null);
    setViewId(a.view);
    if (a.type === 'view') { setSelection(null); setExpanded(null); return; }
    if (a.type === 'focus') { setExpanded(null); setSelection({ type: 'focus', nodes: a.nodes, label: a.label }); return; }
    if (a.type === 'select') {
      const n = VIEWS[a.view].nodes[a.node];
      setExpanded(n && n.parent ? n.parent : null);
      setSelection({ type: 'node', id: a.node });
    }
  }, [startStory, stopStory]);

  const showOnMap = useCallback((v, id) => runAction({ type: 'select', view: v, node: id }), [runAction]);

  const dismissWhy = useCallback(() => { setWhyDismissed(true); writeFlag(WHY_KEY, true); }, []);

  // Keyboard (scope S9): Esc, P, and ← → while a story runs.
  const keyState = useRef({});
  keyState.current = { tab, story, popover, togglePlay, stepStory, stopStory, clear };
  useEffect(() => {
    const onKey = (e) => {
      const k = keyState.current;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (k.popover) setPopover(null);
        else if (k.story) k.stopStory();
        else k.clear();
        return;
      }
      if (k.tab !== 'map') return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); k.togglePlay(); return; }
      if (k.story && e.key === 'ArrowRight') { e.preventDefault(); k.stepStory(k.story.step + 1); }
      if (k.story && e.key === 'ArrowLeft') { e.preventDefault(); k.stepStory(k.story.step - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const whyFromStory = Boolean(storyStep && storyStep.showWhy);

  let page;
  if (tab === 'map') {
    page = html`<${MapView}
      viewId=${viewId} view=${view} layout=${layout} highlight=${highlight} expanded=${activeExpanded}
      selection=${selection} story=${story} storyStep=${storyStep} lastStep=${LAST_STEP} popover=${popover} reducedMotion=${reducedMotion}
      showWhy=${!whyDismissed || whyFromStory} whyFlash=${whyFromStory}
      onSwitch=${switchView} onSelect=${selectNode} onSelectEdge=${selectEdge} onToggle=${toggleGroup}
      onHover=${setHover} onAvatar=${setPopover} onClear=${clear} onFilter=${toggleFilter} onAction=${runAction}
      onTogglePlay=${togglePlay} onStoryStep=${stepStory} onStoryExit=${stopStory} onStoryHover=${setStoryHover}
      onReadWhy=${() => { stopStory(); setTab('why'); }} onDismissWhy=${dismissWhy} />`;
  } else if (tab === 'why') {
    page = html`<${WhyTab} onAction=${runAction} />`;
  } else if (tab === 'success') {
    page = html`<${SuccessTab} onAction=${runAction} onTab=${setTab} />`;
  } else {
    page = html`<${EngineeringPage} tab=${tab} onBack=${() => setTab('map')} onShow=${showOnMap} />`;
  }

  return html`<div className="rm5-app">
    <${Header} tab=${tab} onTab=${(t) => { if (t !== 'map') stopStory(); setTab(t); }} />
    ${page}
    ${note && html`<div className="rm5-toast" role="status">${note}</div>`}
  </div>`;
}
