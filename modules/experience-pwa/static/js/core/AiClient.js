// js/core/AiClient.js — Hybrid OpenRouter / Mock AI integration (Failover-safe, zero-install).
// Default is No AI: content stays on the device. A remote provider is used only when
// aiConfig.resolveRemote() allows it (provider chosen + consent given + session key set);
// every call fails closed to the local rules otherwise.
// Returns: { synthesizedText, tags, impactScore, aiEngine, aiModel?, aiFallbackReason? }
// aiModel for live results is "<Provider> | <model>" so cards name the provider and model.
// — never throws to caller (always resolves). aiEngine is 'live' | 'mock' | 'fallback'
// so every card can say honestly which engine produced its summary.
import { resolveRemote, getModel, PROVIDERS, reasonText } from './aiConfig.js';
import { kindOf, kindMeta } from './knowledge.js';
import { isPending } from './handover.js';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Offline keyword rules. Whole words only: a bare substring test made
// "report", "support" and "opportunity" look like purchase orders.
const MOCK_RULES = {
  invoice: /\b(po|invoices?|invoiced|invoicing|payments?|billing)\b/,
  risk: /\b(risks?|raid|overruns?|delay|delays|delayed|blockers?)\b/,
  milestone: /\b(payroll|milestones?|sow|contracts?)\b/,
  furlough: /\bfurlough/,
  impact: /\b(po|invoices?|invoicing|risks?|overruns?|milestones?|payroll)\b/,
};

function mockResult(text, type) {
  const clean = String(text || '').slice(0, 220);
  const lower = String(text || '').toLowerCase();
  // Tags only say what the text mentions, never an outcome it does not state.
  const tags = ['#Mock_Tagged'];
  if (MOCK_RULES.invoice.test(lower)) tags.push('#Invoice_Mentioned');
  if (MOCK_RULES.risk.test(lower)) tags.push('#Risk_Watch');
  if (MOCK_RULES.milestone.test(lower)) tags.push('#Milestone_Tracked');
  if (MOCK_RULES.furlough.test(lower)) tags.push('#Furlough_Flag');
  const impactScore = MOCK_RULES.impact.test(lower) ? 0.9 : 0.35;
  // No mergeHint or structured fields: the mock has not compared anything or
  // extracted any values, so it must not claim to have (trust rule CF-3).
  return {
    synthesizedText: (clean || 'No input provided.') + (clean && clean.length >= 220 ? '…' : ''),
    tags,
    impactScore,
    aiEngine: 'mock',
  };
}

export function privacyMatchesCard(cardOrPrivacy, mode, activePersona) {
  // Persona-synchronized privacy matrix — mirrors App.js scopeByPrivacyMode exactly:
  // - My Notes: card.privacy === 'My Notes' (incl. 'Private' aliases) AND card.author === activePersona.
  // - Team Shared: card.privacy === 'Team Shared'.
  // - Both: Team Shared OR (My Notes AND card.author === activePersona).
  // Backward compat: first arg accepts either a card object {privacy, author}
  // or a legacy privacy string. When activePersona is unknown (legacy 2-arg
  // callers), preserve legacy pass-through so pre-scoped App.js flows keep working.
  let cardPrivacy;
  let cardAuthor;
  if (cardOrPrivacy && typeof cardOrPrivacy === 'object') {
    cardPrivacy = cardOrPrivacy.privacy;
    cardAuthor = cardOrPrivacy.author;
  } else {
    cardPrivacy = cardOrPrivacy;
    cardAuthor = undefined;
  }
  const m = String(mode || 'Both');
  const persona = (activePersona == null ? '' : String(activePersona));
  const hasPersona = persona !== '';
  const cp = String((cardPrivacy == null || cardPrivacy === '' ? 'Team Shared' : cardPrivacy));
  const isTeamShared = cp === 'Team Shared';
  const isMyNotes = cp === 'My Notes' || cp === 'Private' || cp === 'My Notes (Private)';
  if (m === 'My Notes') {
    if (!hasPersona) return isMyNotes;
    return isMyNotes && String(cardAuthor || '') === persona;
  }
  if (m === 'Team Shared') return isTeamShared;
  if (!hasPersona) return true;
  return isTeamShared || (isMyNotes && String(cardAuthor || '') === persona);
}

// Shared JSON-parse logic for both OpenRouter and Anthropic raw text responses.
// Try strict JSON first, then extract {...} block, then fall back to raw text.
function parseAiJson(raw, input, kind) {
  try {
    const parsed = JSON.parse(String(raw).trim());
    return {
      synthesizedText: String(parsed.synthesizedText || raw).slice(0, 2000),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ['#Auto_Tagged'],
      impactScore: Math.max(0, Math.min(1, Number(parsed.impactScore ?? 0.7))),
      mergeHint: parsed.mergeHint ? String(parsed.mergeHint) : undefined,
      structured: (parsed.structured && typeof parsed.structured === 'object') ? parsed.structured : undefined,
    };
  } catch (e) {
    const m = String(raw).match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      return {
        synthesizedText: String(parsed.synthesizedText || raw).slice(0, 2000),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ['#Auto_Tagged'],
        impactScore: Math.max(0, Math.min(1, Number(parsed.impactScore ?? 0.7))),
        mergeHint: parsed.mergeHint ? String(parsed.mergeHint) : undefined,
        structured: (parsed.structured && typeof parsed.structured === 'object') ? parsed.structured : undefined,
      };
    }
    return { synthesizedText: String(raw).slice(0, 2000) || mockResult(input, kind).synthesizedText, tags: ['#Auto_Tagged'], impactScore: 0.7 };
  }
}

async function callOpenRouter(input, kind, enrichWithAggregation) {
  const gate = resolveRemote();
  if (!gate.allowed || gate.provider !== 'openrouter') {
    const m = mockResult(input, kind);
    m.aiFallbackReason = reasonText(gate.reason);
    return enrichWithAggregation(m);
  }
  const apiKey = gate.key;
  const model = getModel();
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + String(apiKey).trim(),
        'HTTP-Referer': (typeof location !== 'undefined' && location.href) || 'http://localhost',
        'X-Title': 'Project Continuum Data Park',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an enterprise data parser for Project Continuum. ' +
              'Given raw harvested text, return ONLY valid JSON with keys: ' +
              'synthesizedText (string, concise executive summary preserving Project/Opp/GDP/SoW/PO identifiers), ' +
              'tags (array of hashtag strings), impactScore (number 0.0 to 1.0, <0.5 = routine chatter). ' +
              'No markdown, no extra keys.',
          },
          { role: 'user', content: '[' + kind + '] ' + input },
        ],
      }),
    });
    if (!res.ok) throw new Error('OpenRouter HTTP ' + res.status);
    const data = await res.json();
    const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return enrichWithAggregation(Object.assign(parseAiJson(raw, input, kind), { aiEngine: 'live', aiModel: PROVIDERS.openrouter.label + ' | ' + model }));
  } catch (err) {
    const fb = mockResult(input, kind);
    fb.tags = (fb.tags || []).concat(['#Mock_Fallback']);
    fb.aiEngine = 'fallback';
    fb.aiFallbackReason = 'OpenRouter: ' + String((err && err.message) || err).slice(0, 120);
    return fb;
  }
}

async function callAnthropic(input, kind, enrichWithAggregation) {
  const gate = resolveRemote();
  if (!gate.allowed || gate.provider !== 'anthropic') {
    const m = mockResult(input, kind);
    m.aiFallbackReason = reasonText(gate.reason);
    return enrichWithAggregation(m);
  }
  try {
    const prompt =
      'You are an enterprise data parser for Project Continuum. ' +
      'Given raw harvested text, return ONLY valid JSON with keys: ' +
      'synthesizedText (string, concise executive summary preserving Project/Opp/GDP/SoW/PO identifiers), ' +
      'tags (array of hashtag strings), impactScore (number 0.0 to 1.0, <0.5 = routine chatter). ' +
      'No markdown, no extra keys.\n\n[' + kind + '] ' + input;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': gate.key,
        'anthropic-version': '2023-06-01',
        //'dangerously-allow-browser': 'true',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error('Anthropic HTTP ' + res.status);
    const data = await res.json();
    const raw = (data && Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    return enrichWithAggregation(Object.assign(parseAiJson(raw, input, kind), { aiEngine: 'live', aiModel: PROVIDERS.anthropic.label + ' | claude-3-5-sonnet-20241022' }));
  } catch (err) {
    // Anthropic failed. Do NOT retry through another provider: the user only agreed
    // to send content to Anthropic. Fall back to the local rules and say so.
    const fb = mockResult(input, kind);
    fb.tags = (fb.tags || []).concat(['#Mock_Fallback']);
    fb.aiEngine = 'fallback';
    fb.aiFallbackReason = 'Anthropic: ' + String((err && err.message) || err).slice(0, 120);
    return enrichWithAggregation(fb);
  }
}

// Human-readable engine label for cards and the review queue. Empty when the
// card predates engine tracking (seed data), so nothing is claimed either way.
export function aiEngineLabel(engine, model) {
  const e = String(engine || '');
  if (e === 'live') {
    const parts = String(model || '').split(' | ');
    if (parts.length === 2) return parts[0] + ' · ' + parts[1].split('/').pop();
    return 'Live AI' + (model ? ' · ' + String(model).split('/').pop() : '');
  }
  if (e === 'mock') return 'No AI (local rules)';
  if (e === 'fallback') return 'No AI (local rules) · provider failed';
  return '';
}

export async function processWithAI(text, type) {
  const input = String(text || '');
  const kind = String(type || 'general');
  // Defaults only for fields that carry no claim. mergeHint and structured
  // are never filled in here: a placeholder "Similar to existing RAID log" or
  // "Amount: $45k" would present invented facts as findings (trust rule CF-3).
  const enrichWithAggregation = (base) => {
    const out = Object.assign({}, base);
    if (out.privacy == null) out.privacy = 'Team Shared';
    return out;
  };
  if (resolveRemote().provider === 'anthropic') {
    return callAnthropic(input, kind, enrichWithAggregation);
  }
  return callOpenRouter(input, kind, enrichWithAggregation);
}
function scopeCardsByPrivacy(cards, privacyMode, activePersona) {
  const arr = Array.isArray(cards) ? cards : [];
  const mode = String(privacyMode || 'Both');
  // Persona-synchronized: pass full card + activePersona so 'Both'/'My Notes'
  // enforce card.author === activePersona (same rules as App.js).
  return arr.filter((c) => privacyMatchesCard(c || {}, mode, activePersona));
}
// No-AI answer path: lists scoped cards whose text shares words with the question, each labelled
// with its statement kind (Needs confirmation for drafts). Every word comes from the cards; nothing is
// composed or invented. The search scope is always stated.
export function mockQaFallback(question, scopedCards, privacyMode, activePersona) {
  const persona = (activePersona == null ? '' : String(activePersona));
  const cards = Array.isArray(scopedCards) ? scopedCards : [];
  const scopeLine = 'Searched ' + cards.length + ' card' + (cards.length === 1 ? '' : 's') + ' (view: ' + String(privacyMode || 'Both') + (persona ? ', as ' + persona : '') + '). No AI.';
  if (!cards.length) return { answer: 'Not found: no sources are available in this view. ' + scopeLine, sources: [] };
  const toks = String(question || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const text = (c) => String((c && (c.title || '')) + ' ' + (c && (c.synthesizedText || c.content || c.detail || ''))).toLowerCase();
  const hits = cards.map((c) => ({ c, n: toks.filter((t) => text(c).indexOf(t) !== -1).length })).filter((h) => h.n > 0).sort((x, y) => y.n - x.n).slice(0, 3);
  if (!hits.length) return { answer: 'Not found: no card mentions that, so nothing was inferred. ' + scopeLine, sources: [] };
  const label = (c) => (isPending(c) ? 'Needs confirmation' : kindMeta(kindOf(c)).label);
  const lines = hits.map(({ c }) => {
    const body = String(c.synthesizedText || c.content || c.detail || '').slice(0, 220);
    return '[' + label(c) + '] "' + String(c.title || c.id || 'Untitled card') + '" (' + String(c.source || c.type || 'Timeline') + ')' + (body ? ': ' + body : '') + (c.id ? ' [Card ' + String(c.id) + ']' : '');
  });
  return { answer: hits.length + ' matching card(s). ' + scopeLine + ' ' + lines.join(' | '), sources: hits.map(({ c }) => String(c.source || c.type || 'Timeline')) };
}
// Remote answers are Inference: labelled with the model and the scope searched.
function aiPrefix(model, n) { return '[Inference, AI: ' + String(model || 'remote model') + ', searched ' + n + ' card' + (n === 1 ? '' : 's') + ', check the cited cards] '; }
export async function askSmartAssistant(question, contextCards, privacyMode, activePersona) {
  const q = String(question || '');
  const mode = String(privacyMode || 'Both');
  const persona = (activePersona == null ? '' : String(activePersona));
  const scoped = scopeCardsByPrivacy(contextCards, mode, persona);
  const lite = scoped.slice(0, 12).map((c) => ({
    id: (c && c.id) || '', title: (c && c.title) || '',
    source: (c && (c.source || c.type)) || '',
    type: (c && c.type) || '', privacy: (c && c.privacy) || 'Team Shared',
    author: (c && c.author) || '',
    content: String((c && (c.synthesizedText || c.content || c.detail)) || '').slice(0, 800),
  }));
  // Grounded CARD-block stringification for prompt injection (citation-ready).
  // --- CARD ID: ${card.id} ---
  // Title: ${card.title}
  // Content: ${card.content || card.synthesizedText}
  let ctx = '[]';
  try {
    const blocks = scoped.slice(0, 12).map((card) => '--- CARD ID: ' + String((card && card.id) || '') + ' ---\nTitle: ' + String((card && card.title) || '') + '\nContent: ' + String((card && (card.content || card.synthesizedText || card.detail)) || '').slice(0, 800));
    ctx = (blocks.join('\n\n') || '[]').slice(0, 6000);
  } catch (e) { try { ctx = JSON.stringify(lite, null, 2).slice(0, 6000); } catch (e2) {} }
  const gate = resolveRemote();
  const apiKey = gate.allowed && gate.provider === 'openrouter' ? gate.key : '';
  const model = getModel();
  if (apiKey) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + String(apiKey).trim(), 'HTTP-Referer': (typeof location !== 'undefined' && location.href) || 'http://localhost', 'X-Title': 'Project Continuum Smart Assistant' },
        body: JSON.stringify({ model, messages: [
          { role: 'system', content: 'You are an elite, highly professional enterprise AI assistant with a subtle touch of wit. You answer questions using ONLY the provided context cards.\nRULE 1 (Citations): You MUST cite your sources inline. When using facts from a card, append [Card {id}] at the end of the sentence. Example: \'The deployment is blocked [Card 123].\'\nRULE 2 (Fallback): If the user asks a question not answerable by the context, respond with a polite, witty professional disclaimer (e.g., \'While I\'d love to weigh in on that, my security clearance only covers our active project data...\'). DO NOT hallucinate external facts.\nReturn ONLY valid JSON with keys: answer (string), sources (array of source-name strings). Privacy scope: ' + mode + (persona ? ' (active persona: ' + persona + ')' : '') + '.' },
          { role: 'user', content: 'Question: ' + q + '\nPrivacy scope: ' + mode + (persona ? '\nActive persona: ' + persona : '') + '\nContext cards:\n' + ctx },
        ] }),
      });
      if (!res.ok) throw new Error('OpenRouter HTTP ' + res.status);
      const data = await res.json();
      const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      try {
        const parsed = JSON.parse(String(raw).trim());
        if (parsed && typeof parsed.answer === 'string') return { answer: aiPrefix(model, scoped.length) + String(parsed.answer).slice(0, 2000), sources: Array.isArray(parsed.sources) ? parsed.sources.map(String).slice(0, 12) : [] };
      } catch (e) {
        const m = String(raw).match(/\{[\s\S]*\}/);
        if (m) { try { const p2 = JSON.parse(m[0]); if (p2 && typeof p2.answer === 'string') return { answer: aiPrefix(model, scoped.length) + String(p2.answer).slice(0, 2000), sources: Array.isArray(p2.sources) ? p2.sources.map(String).slice(0, 12) : [] }; } catch (e2) {} }
        if (String(raw).trim()) return { answer: aiPrefix(model, scoped.length) + String(raw).slice(0, 2000), sources: lite.slice(0, 3).map((c) => String(c.source || 'Timeline')) };
      }
      throw new Error('Empty LLM answer');
    } catch (err) {
      return mockQaFallback(q, scoped, mode, persona);
    }
  }
  return mockQaFallback(q, scoped, mode, persona);
}
export default { processWithAI, askSmartAssistant, privacyMatchesCard, aiEngineLabel };
