// Gemini via REST (function calling). Tries each model in GEMINI_MODELS until one answers.
const upper = (s) => {
  if (Array.isArray(s)) return s.map(upper);
  if (s && typeof s === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(s)) o[k] = k === 'type' && typeof v === 'string' ? v.toUpperCase() : upper(v);
    return o;
  }
  return s;
};
const hasProps = (p) => p && p.properties && Object.keys(p.properties).length;

function toContents(messages, useRaw) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', parts: [{ text: m.text }] });
    else if (m.role === 'assistant') {
      const parts = useRaw && m.raw ? m.raw : [
        ...(m.text ? [{ text: m.text }] : []),
        ...(m.toolCalls || []).map((c) => ({ functionCall: { name: c.name, args: c.args || {} } })),
      ];
      if (parts.length) out.push({ role: 'model', parts });
    } else if (m.role === 'tool') {
      out.push({ role: 'user', parts: m.results.map((r) => ({ functionResponse: { name: r.name, response: { result: r.result } } })) });
    }
  }
  return out;
}

module.exports = function gemini({ apiKey, models }) {
  return {
    name: 'gemini',
    async generate({ system, messages, tools }) {
      let lastErr;
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const body = {
          systemInstruction: { parts: [{ text: system }] },
          contents: toContents(messages, i === 0),
          tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, ...(hasProps(t.parameters) ? { parameters: upper(t.parameters) } : {}) })) }],
          generationConfig: { temperature: 0.4 },
        };
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
          });
          if (!res.ok) { lastErr = new Error(`Gemini ${model} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); continue; }
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join(' ').trim();
          const toolCalls = parts.filter((p) => p.functionCall).map((p, n) => ({ id: `c${Date.now()}_${n}`, name: p.functionCall.name, args: p.functionCall.args || {} }));
          if (!text && !toolCalls.length) { lastErr = new Error(`Gemini ${model} returned nothing (${data.candidates?.[0]?.finishReason || 'no candidate'})`); continue; }
          return { text, toolCalls, raw: i === 0 ? parts : undefined };
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error('Gemini failed');
    },
  };
};
