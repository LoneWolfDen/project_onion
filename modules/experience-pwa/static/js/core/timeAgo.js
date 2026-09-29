// js/core/timeAgo.js — card age computed from real dates at render time (A11).
// Stored strings such as "Just now" or "2h ago" never age, so they are only a
// fallback for records that carry no parseable date.
export function toDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

// Last activity on a card: an update, then AI processing, then creation.
export function cardDate(m) {
  return toDate(m && m.updated_at) || toDate(m && m.processed_at) || toDate(m && m.created_at);
}

export function relativeTime(d, now = Date.now()) {
  const mins = Math.floor((now - d.getTime()) / 60000);
  if (mins < 1) return 'Just now'; // also covers small clock skew into the future
  if (mins < 60) return mins + ' min ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// { label, color, title } for the age pill. color is null when no real date
// exists, so callers keep their previous colouring for the stored string.
export function cardAge(m, now = Date.now()) {
  const d = cardDate(m);
  if (!d) return { label: String((m && (m.timestamp || m.age)) || ''), color: null, title: '' };
  const hours = (now - d.getTime()) / 3600000;
  const color = hours < 24 ? '#22C55E' : hours < 24 * 7 ? '#F59E0B' : '#9CA3AF';
  return { label: relativeTime(d, now), color, title: d.toLocaleString() };
}

// Node timestamps for the node viewer: readable date when parseable.
export function formatWhen(v) {
  const d = toDate(v);
  return d ? d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : String(v || '');
}
