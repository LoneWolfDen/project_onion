// js/core/layoutFlag.js — HUI-03 card hierarchy behind a flag. Off by default; display only.
// The flag sets data-layout on <html>; css/hierarchy.css does the rest. No data or behaviour changes.
export const LAYOUT_KEY = 'continuum_layout';
export const LAYOUTS = ['classic', 'hierarchy'];
export function getLayout(store) {
  try { const v = store && store.getItem(LAYOUT_KEY); return LAYOUTS.includes(v) ? v : 'classic'; } catch (e) { return 'classic'; }
}
export function setLayout(store, value) {
  const v = LAYOUTS.includes(value) ? value : 'classic';
  try { store.setItem(LAYOUT_KEY, v); } catch (e) { /* blocked: applies for this visit only */ }
  return v;
}
export function applyLayout(doc, value) {
  const v = LAYOUTS.includes(value) ? value : 'classic';
  if (v === 'classic') doc.documentElement.removeAttribute('data-layout'); else doc.documentElement.setAttribute('data-layout', v);
  return v;
}
