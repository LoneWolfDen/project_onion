import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCopilotNote, citedStatementIds } from '../static/js/core/copilot.js';
import { kindOf } from '../static/js/core/knowledge.js';
import { isPending } from '../static/js/core/handover.js';

const project = { Project_ReferenceID: 'R1', project_name: 'Beacon-201' };

test('a pasted reply is a private Draft Inference that cites statement ids', () => {
  const n = buildCopilotNote('Risk owner unclear [S-1a2b3c4d5e]. Also [S-1a2b3c4d5e] and [S-ffffffffff].', { project, author: 'Ana' });
  assert.equal(n.draft, true);
  assert.equal(n.origin, 'copilot-pasted');
  assert.equal(n.privacy, 'My Notes (Private)');
  assert.deepEqual(n.refs, ['S-1a2b3c4d5e', 'S-ffffffffff']);
  assert.equal(kindOf(n), 'inference');
  assert.equal(isPending(n), true);
});

test('recommendation kind is kept; empty text or no project is refused', () => {
  assert.equal(kindOf(buildCopilotNote('Do X', { project, kind: 'recommendation' })), 'recommendation');
  assert.throws(() => buildCopilotNote('  ', { project }), /Paste/);
  assert.throws(() => buildCopilotNote('x', {}), /project/);
  assert.deepEqual(citedStatementIds('no ids'), []);
});

test('the PII screen runs on the reply', () => {
  const n = buildCopilotNote('call 07700 900123', { project, screen: (t) => ({ text: t.replace(/\d{5} \d{6}/, '[PHONE]'), flag: 'Redacted' }) });
  assert.equal(n.content, 'call [PHONE]');
  assert.equal(n.rawOriginal, 'call 07700 900123');
});
