// js/core/destructive.js — guard rails for reset / clear actions (DAT-05).
// Pure logic so the rules can be tested without a browser.
export const CLEAR_PHRASE = 'DELETE ALL DATA';

export function phraseMatches(input, phrase) {
  return String(input == null ? '' : input).trim() === phrase;
}

// What an action will remove, in the user's own terms.
export function removalSummary(state) {
  const s = state || {};
  const n = (k) => (Array.isArray(s[k]) ? s[k].length : 0);
  const nodes = (Array.isArray(s.timeline) ? s.timeline : []).reduce((a, c) => a + (c && Array.isArray(c.nodes) ? c.nodes.length : 0), 0);
  return { cards: n('timeline'), nodes, projects: n('projects'), clients: n('clients'), notes: n('notes'), archived: n('archived') };
}
export function describeRemoval(sum) {
  return sum.cards + ' cards (' + sum.nodes + ' timeline entries), ' + sum.projects + ' projects, ' + sum.clients + ' clients, ' + sum.notes + ' notes and ' + sum.archived + ' archived items';
}

// Runs `action` only when every guard passes. Returns { ran, reason }.
//   confirmed: user pressed the confirm button   phrase/input: typed phrase (optional)
//   backup: async () => boolean — called first when wantBackup is true; failure aborts.
export async function runGuarded({ confirmed, phrase, input, wantBackup, backup, action }) {
  if (!confirmed) return { ran: false, reason: 'cancelled' };
  if (phrase && !phraseMatches(input, phrase)) return { ran: false, reason: 'phrase' };
  if (wantBackup) {
    let ok = false;
    try { ok = !!(await backup()); } catch (e) { ok = false; }
    if (!ok) return { ran: false, reason: 'backup-failed' };
  }
  await action();
  return { ran: true, reason: 'done' };
}
