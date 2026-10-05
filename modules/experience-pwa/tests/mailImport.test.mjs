// Run: node --test modules/experience-pwa/tests/
// IMP-06: .eml and .vtt parsing, drafts, recap labelling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEml, parseVtt, extractDrafts, emlDraftItems, vttDraftItems, isMachineRecap, htmlToText, decodeWords, cueRange } from '../static/js/core/mailImport.js';

const EML = [
  'Message-ID: <abc123@mail.example.com>',
  'Date: Mon, 05 Oct 2026 09:30:00 +0000',
  'Subject: =?utf-8?B?UHJvamVjdCBzdGF0dXM=?=',
  'From: Alex <alex@example.com>',
  'To: team@example.com',
  'Content-Type: multipart/mixed; boundary="B1"',
  '',
  '--B1',
  'Content-Type: multipart/alternative; boundary="B2"',
  '',
  '--B2',
  'Content-Type: text/plain; charset=utf-8',
  'Content-Transfer-Encoding: quoted-printable',
  '',
  'Hello team,',
  'Decision: ship the pilot on Friday',
  'Action: Sam to send the =E2=82=AC budget',
  '--B2',
  'Content-Type: text/html',
  '',
  '<html><script>alert(1)</script><img src="http://tracker.example/p.gif"><p>Hello html</p></html>',
  '--B2--',
  '--B1',
  'Content-Type: application/pdf; name="plan.pdf"',
  'Content-Disposition: attachment; filename="plan.pdf"',
  'Content-Transfer-Encoding: base64',
  '',
  'JVBERi0xLjQKJcfsj6IK',
  '--B1--',
  '',
].join('\r\n');

test('eml keeps message id, sent date, subject; decodes encoded words and quoted-printable', () => {
  const m = parseEml(EML);
  assert.equal(m.messageId, 'abc123@mail.example.com');
  assert.equal(m.sentAt, '2026-10-05T09:30:00.000Z');
  assert.equal(m.subject, 'Project status');
  assert.match(m.body, /Action: Sam to send the € budget/);
});
test('eml prefers plain text; html is never kept and nothing remote is referenced', () => {
  const m = parseEml(EML);
  assert.doesNotMatch(m.body, /tracker|script|alert|<img/);
  const h = parseEml('Subject: x\n\n'.replace('\n\n', '\nContent-Type: text/html\n\n') + '<p>Hi</p><script>bad()</script><img src="http://t/x.gif">');
  assert.equal(h.htmlOnly, true);
  assert.equal(h.body, 'Hi');
});
test('attachments are listed, never imported', () => {
  const m = parseEml(EML);
  assert.equal(m.attachments.length, 1);
  assert.deepEqual([m.attachments[0].name, m.attachments[0].type, m.attachments[0].imported], ['plan.pdf', 'application/pdf', false]);
  assert.doesNotMatch(m.body, /JVBER/);
});
test('decodeWords and htmlToText basics', () => {
  assert.equal(decodeWords('=?utf-8?Q?Caf=C3=A9_plan?='), 'Café plan');
  assert.equal(htmlToText('<p>a</p><style>x{}</style><p>b</p>'), 'a\nb');
});

const VTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.500
<v Alex Kim>Welcome everyone.</v>

2
00:00:05.000 --> 00:00:09.000
Sam Lee: Decision: we go live Friday

3
00:01:00.000 --> 00:01:03.000
<v Sam Lee>Action: Sam to update the plan</v>
`;
test('vtt keeps speaker, timestamps and cue range', () => {
  const c = parseVtt(VTT);
  assert.equal(c.length, 3);
  assert.deepEqual([c[0].speaker, c[0].start, c[0].end, c[0].text], ['Alex Kim', '00:00:01.000', '00:00:04.500', 'Welcome everyone.']);
  assert.equal(c[1].speaker, 'Sam Lee');
  assert.equal(cueRange(c), '00:00:01.000 to 00:01:03.000');
});
test('drafts come only from explicit markers and point back to their line or cue', () => {
  const d = extractDrafts(vttDraftItems(parseVtt(VTT)));
  assert.deepEqual(d.map((x) => x.type), ['decision', 'action']);
  assert.match(d[0].ref, /cue 2 \(00:00:05.000 to 00:00:09.000\), Sam Lee/);
  const e = extractDrafts(emlDraftItems(parseEml(EML).body));
  assert.equal(e.length, 2);
  assert.equal(extractDrafts([{ text: 'We might decide something', ref: 'x' }]).length, 0);
});
test('copilot and teams recaps are recognised', () => {
  assert.equal(isMachineRecap({ name: 'Meeting recap.vtt' }), true);
  assert.equal(isMachineRecap({ text: 'AI-generated notes' }), true);
  assert.equal(isMachineRecap({ name: 'standup.vtt', text: 'hello' }), false);
});
