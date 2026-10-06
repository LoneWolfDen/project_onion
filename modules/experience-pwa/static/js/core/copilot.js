// js/core/copilot.js — Microsoft 365 Copilot, Pattern A (manual package workflow). Pure.
// The user takes the export package to Copilot and pastes the reply back. The reply is stored as
// a Draft note with origin 'copilot-pasted', so knowledge.kindOf makes it Inference or
// Recommendation and handover keeps it under "Needs confirmation". It never becomes a Fact.
export const COPILOT_ORIGIN = 'copilot-pasted';
export const MAX_REPLY = 20000;

export function citedStatementIds(text) {
  return [...new Set(String(text || '').match(/\bS-[0-9a-f]{10}\b/g) || [])];
}

export function buildCopilotNote(text, { kind = 'inference', project, author, screen = (t) => ({ text: t, flag: 'Clean' }), now = new Date() } = {}) {
  const raw = String(text || '').trim().slice(0, MAX_REPLY);
  if (!raw) throw new Error('Paste the Copilot reply first');
  if (!project) throw new Error('Pick a project first');
  const s = screen(raw);
  const k = kind === 'recommendation' ? 'recommendation' : 'inference';
  return {
    project_name: project.project_name, Project_ReferenceID: project.Project_ReferenceID, projectId: project.project_name,
    title: 'Copilot reply (' + (k === 'recommendation' ? 'Recommendation' : 'Inference') + ', needs confirmation)',
    content: s.text, original: s.text, rawOriginal: raw, rephrased: s.text, piiStatus: s.flag,
    privacy: 'My Notes (Private)', author: String(author || ''),
    origin: COPILOT_ORIGIN, kind: k, draft: true, aiEngine: 'copilot',
    refs: citedStatementIds(raw), updates: [], syncStatus: 'pending_upload', pastedAt: now.toISOString(),
  };
}
