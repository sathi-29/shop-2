// Any OpenAI-compatible chat-completions API (OpenAI, Groq, OpenRouter, Ollama, LM Studio...).
function toMessages(system, messages) {
  const out = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      const msg = { role: 'assistant', content: m.text || null };
      if (m.toolCalls?.length) msg.tool_calls = m.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args || {}) } }));
      out.push(msg);
    } else if (m.role === 'tool') for (const r of m.results) out.push({ role: 'tool', tool_call_id: r.id, content: JSON.stringify(r.result) });
  }
  return out;
}
module.exports = function openai({ apiKey, baseUrl, model }) {
  return {
    name: 'openai-compatible',
    async generate({ system, messages, tools }) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ model, temperature: 0.4, messages: toMessages(system, messages), tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: 'auto' }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const msg = (await res.json()).choices?.[0]?.message || {};
      const toolCalls = (msg.tool_calls || []).map((c) => { let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch {} return { id: c.id, name: c.function.name, args }; });
      return { text: (msg.content || '').trim(), toolCalls };
    },
  };
};
