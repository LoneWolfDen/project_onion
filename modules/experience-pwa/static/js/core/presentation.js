// js/core/presentation.js — HUI-02 Presentation Mode. Pure: no DOM, no storage.
// A view filter only: saved data is never modified. Private cards and anything still a draft
// (waiting for approval) are hidden; everything else is shown unchanged.
import { isPending } from './handover.js';

export const isPrivateCard = (c) => {
  const v = String((c && c.privacy) || '').trim().toLowerCase();
  return v === 'my notes' || v === 'private' || v.includes('private');
};
export const hiddenInPresentation = (c) => !!c && (isPrivateCard(c) || isPending(c));
export const forPresentation = (cards) => (Array.isArray(cards) ? cards : []).filter((c) => !hiddenInPresentation(c));
export const hiddenCount = (cards) => (Array.isArray(cards) ? cards : []).filter(hiddenInPresentation).length;

export const PRESENT_ATTR = 'data-presentation';
export function applyPresentation(doc, on) {
  if (on) doc.documentElement.setAttribute(PRESENT_ATTR, 'on'); else doc.documentElement.removeAttribute(PRESENT_ATTR);
  return !!on;
}
