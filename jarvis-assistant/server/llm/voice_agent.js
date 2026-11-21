/**
 * Brain that delegates the whole conversation to the Python voice-agent service.
 * Enable with LLM_PROVIDER=voice_agent and VOICE_AGENT_URL=http://127.0.0.1:8788
 *
 * The Python agent owns the prompt, the intent router and the policy gates, so this
 * provider returns plain text and never asks for shop tools. Use it when you want a
 * general assistant; leave it off to keep the shopping tool loop (Gemini/OpenAI).
 */
const sessionIds = new WeakMap();
let counter = 0;

function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message && message.role === 'user' && message.text) return String(message.text);
  }
  return '';
}

function sessionIdFor(messages) {
  let id = sessionIds.get(messages);
  if (!id) {
    counter += 1;
    id = `va-${Date.now().toString(36)}-${counter.toString(36)}`;
    sessionIds.set(messages, id);
  }
  return id;
}

module.exports = function voiceAgent({ url, token, timeout = 20000 }) {
  if (!url) throw new Error('VOICE_AGENT_URL is required when LLM_PROVIDER=voice_agent.');
  const endpoint = new URL(/^https?:\/\//.test(url) ? url : `http://${url}`);
  if (!/^https?:$/.test(endpoint.protocol)) throw new Error(`Unsupported VOICE_AGENT_URL: ${url}`);
  const base = endpoint.toString().replace(/\/$/, '');

  return {
    name: 'voice_agent',
    async generate({ messages }) {
      const text = lastUserText(messages);
      if (!text) return { text: "Sorry, I didn't catch that.", toolCalls: [] };
      const headers = { 'content-type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await fetch(`${base}/v1/turn`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, sessionId: sessionIdFor(messages) }),
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) throw new Error(`voice-agent returned HTTP ${res.status}`);
      const data = await res.json();
      const reply = String(data.reply || '').trim();
      return { text: reply || "Sorry, I didn't have an answer for that.", toolCalls: [] };
    },
  };
};

module.exports.lastUserText = lastUserText;
module.exports.sessionIdFor = sessionIdFor;