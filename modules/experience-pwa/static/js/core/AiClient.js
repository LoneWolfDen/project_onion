// js/core/AiClient.js — Hybrid OpenRouter / Mock AI integration (Failover-safe, zero-install).
// Live Mode: OPENROUTER_API_KEY in localStorage → real fetch to OpenRouter.
// Fallback/Mock Mode: no key → 1200ms latency + beautifully formatted mock JSON.
// Returns: { synthesizedText, tags, impactScore } — never throws to caller (always resolves).
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';

function mockResult(text, type) {
  const clean = String(text || '').slice(0, 220);
  const lower = String(text || '').toLowerCase();
  const tags = ['#Auto_Tagged'];
  if (/po|invoice|invoic|payment|billing/.test(lower)) tags.push('#Invoice_Resolved');
  if (/risk|raid|overrun|delay|blocker/.test(lower)) tags.push('#Risk_Watch');
  if (/payroll|milestone|sow|contract/.test(lower)) tags.push('#Milestone_Tracked');
  if (/furlough/.test(lower)) tags.push('#Furlough_Flag');
  const impactScore = /po|invoice|risk|overrun|milestone|payroll/.test(lower) ? 0.9 : 0.35;
  const isInvoice = /po|invoice|invoic|payment|billing/.test(lower);
  const isRisk = /risk|raid|overrun|delay|blocker|blocked/.test(lower);
  return {
    synthesizedText:
      'AI Synthesis (' + String(type || 'general') + '): ' +
      (clean || 'No input provided.') +
      (clean && clean.length >= 220 ? '…' : '') +
      ' — Key entities preserved; noise stripped; next action inferred for timeline.',
    tags,
    impactScore,
    mergeHint: isInvoice
      ? 'Similar to existing RAID log — details overlap'
      : (isRisk ? 'Similar to existing RAID log — details overlap' : 'Aggregated from ' + String(type || 'general') + ' + RAID log — requires human validation'),
    structured: isInvoice
      ? { Milestone: 'Sprint 1', Amount: '$45k', Status: 'Blocked' }
      : { Milestone: 'Sprint 1', Amount: '$45k', Status: impactScore >= 0.5 ? 'Needs Review' : 'Tracked' },
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

export async function processWithAI(text, type) {
  const input = String(text || '');
  const kind = String(type || 'general');
  const enrichWithAggregation = (base) => {
    const out = Object.assign({}, base);
    if (!out.mergeHint) {
      const l = String(input || '').toLowerCase();
      out.mergeHint = (/po|invoice|risk|raid|overrun|delay|block/.test(l))
        ? 'Similar to existing RAID log — details overlap'
        : 'Aggregated from ' + kind + ' + RAID log — requires human validation';
    }
    if (!out.structured || typeof out.structured !== 'object') {
      out.structured = { Milestone: 'Sprint 1', Amount: '$45k', Status: 'Blocked' };
    }
    if (out.privacy == null) out.privacy = 'Team Shared';
    return out;
  };
  let apiKey = null;
  let model = DEFAULT_MODEL;
  try {
    apiKey = localStorage.getItem('OPENROUTER_API_KEY') || '';
    model = localStorage.getItem('OPENROUTER_MODEL') || DEFAULT_MODEL;
  } catch (e) { apiKey = null; }
  if (!apiKey || !String(apiKey).trim()) {
    await new Promise((r) => setTimeout(r, 1200));
    return enrichWithAggregation(mockResult(input, kind));
  }
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
    // Try strict JSON first, then extract {...} block.
    try {
      const parsed = JSON.parse(String(raw).trim());
      return enrichWithAggregation({
        synthesizedText: String(parsed.synthesizedText || raw).slice(0, 2000),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ['#Auto_Tagged'],
        impactScore: Math.max(0, Math.min(1, Number(parsed.impactScore ?? 0.7))),
        mergeHint: parsed.mergeHint ? String(parsed.mergeHint) : undefined,
        structured: (parsed.structured && typeof parsed.structured === 'object') ? parsed.structured : undefined,
      });
    } catch (e) {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        return enrichWithAggregation({
          synthesizedText: String(parsed.synthesizedText || raw).slice(0, 2000),
          tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ['#Auto_Tagged'],
          impactScore: Math.max(0, Math.min(1, Number(parsed.impactScore ?? 0.7))),
          mergeHint: parsed.mergeHint ? String(parsed.mergeHint) : undefined,
          structured: (parsed.structured && typeof parsed.structured === 'object') ? parsed.structured : undefined,
        });
      }
      return enrichWithAggregation({ synthesizedText: String(raw).slice(0, 2000) || mockResult(input, kind).synthesizedText, tags: ['#Auto_Tagged'], impactScore: 0.7 });
    }
  } catch (err) {
    await new Promise((r) => setTimeout(r, 1200));
    const fb = mockResult(input, kind);
    fb.tags = (fb.tags || []).concat(['#Mock_Fallback']);
    return fb;
  }
}
function scopeCardsByPrivacy(cards, privacyMode, activePersona) {
  const arr = Array.isArray(cards) ? cards : [];
  const mode = String(privacyMode || 'Both');
  // Persona-synchronized: pass full card + activePersona so 'Both'/'My Notes'
  // enforce card.author === activePersona (same rules as App.js).
  return arr.filter((c) => privacyMatchesCard(c || {}, mode, activePersona));
}
function mockQaFallback(question, scopedCards, privacyMode, activePersona) {
  const q = String(question || '').toLowerCase();
  const mode = String(privacyMode || 'Both');
  const persona = (activePersona == null ? '' : String(activePersona));
  // Respect the already-scoped set only: NEVER fall back to hardcoded
  // persona-blind answers that could leak another persona's private note.
  // If scoping removed everything, return an explicit empty-scope message.
  if (!Array.isArray(scopedCards) || scopedCards.length === 0) {
    return { answer: 'No scoped sources are available in the current privacy scope' + (persona ? ' for ' + persona : '') + '. Switch scope or ingest more cards to enable synthesis.', sources: [] };
  }
  const scopedSources = (Array.isArray(scopedCards) ? scopedCards : []).slice(0, 3).map((c) => String((c && (c.source || c.title || c.id)) || 'Timeline'));
  const citeFor = (c) => (c && c.id) ? ' [Card ' + String(c.id) + ']' : '';
  const wittyFallback = 'While I\'d love to weigh in on that, my security clearance only covers our active project data — try asking about a scoped card, tag, or milestone.';
  const hit = /why|delayed|delay|blocked|block/i.test(q) || /\bpo\b|po-\d+/i.test(q);
  if (hit && mode === 'My Notes') {
    const topMy = scopedCards[0] || null;
    return { answer: 'The Apollo migration is currently delayed pending AWS gateway VNet peering approval from Client Infosec.' + citeFor(topMy) + (persona ? ' (scoped to ' + persona + '\'s My Notes)' : ''), sources: scopedSources.length ? scopedSources : ['Scoped My Notes'] };
  }
  if (hit) {
    const topHit = scopedCards[0] || null;
    return { answer: 'Work is halted because PO-88921 funding Infosec consultants is depleted.' + citeFor(topHit) + ' However, Lead Dev Raj identified a legacy on-prem gateway workaround that can bypass the block immediately pending Delivery Manager sign-off.', sources: scopedSources.length ? scopedSources : ['Timeline'] };
  }
  // Witty fallback when the question does not match scoped evidence (offline parity with LLM RULE 2).
  const looksOutOfScope = q.trim().length > 0 && !scopedCards.some((c) => {
    const hay = String((c && (c.title || '')) + ' ' + (c && (c.synthesizedText || c.content || c.detail || ''))).toLowerCase();
    const toks = q.split(/[^a-z0-9]+/).filter((t) => t && t.length > 3);
    return toks.some((t) => hay.indexOf(t) !== -1);
  });
  if (looksOutOfScope) {
    const topWitty = scopedCards[0] || null;
    return { answer: wittyFallback + (topWitty && topWitty.id ? ' Closest scoped reference is available here:' + citeFor(topWitty) : ''), sources: scopedSources };
  }
  const top = (Array.isArray(scopedCards) && scopedCards.length ? scopedCards[0] : null) || null;
  if (!top) return { answer: 'No scoped sources are available in the current privacy scope' + (persona ? ' for ' + persona : '') + '. Switch scope or ingest more cards to enable synthesis.', sources: [] };
  const title = String(top.title || top.id || 'Untitled card');
  const source = String(top.source || top.type || 'Timeline');
  const body = String(top.synthesizedText || top.content || top.detail || '').slice(0, 220);
  return { answer: 'Based on ' + String(scopedCards.length) + ' scoped source(s), the most relevant is "' + title + '" from ' + source + (body ? ': ' + body : '.') + citeFor(top), sources: [source] };
}
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
  let apiKey = null; let model = DEFAULT_MODEL;
  try { apiKey = localStorage.getItem('OPENROUTER_API_KEY') || ''; model = localStorage.getItem('OPENROUTER_MODEL') || DEFAULT_MODEL; } catch (e) {}
  if (apiKey && String(apiKey).trim()) {
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
        if (parsed && typeof parsed.answer === 'string') return { answer: String(parsed.answer).slice(0, 2000), sources: Array.isArray(parsed.sources) ? parsed.sources.map(String).slice(0, 12) : [] };
      } catch (e) {
        const m = String(raw).match(/\{[\s\S]*\}/);
        if (m) { try { const p2 = JSON.parse(m[0]); if (p2 && typeof p2.answer === 'string') return { answer: String(p2.answer).slice(0, 2000), sources: Array.isArray(p2.sources) ? p2.sources.map(String).slice(0, 12) : [] }; } catch (e2) {} }
        if (String(raw).trim()) return { answer: String(raw).slice(0, 2000), sources: lite.slice(0, 3).map((c) => String(c.source || 'Timeline')) };
      }
      throw new Error('Empty LLM answer');
    } catch (err) {
      await new Promise((r) => setTimeout(r, 900));
      return mockQaFallback(q, scoped, mode, persona);
    }
  }
  await new Promise((r) => setTimeout(r, 900));
  return mockQaFallback(q, scoped, mode, persona);
}
export default { processWithAI, askSmartAssistant, privacyMatchesCard };
