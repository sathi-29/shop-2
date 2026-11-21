const { createHash } = require('node:crypto');

const SHOP_TERMS =
  /\b(?:shop(?:ping)?|store|catalog(?:ue)?|product|products|item|items|buy|purchase|cart|checkout|order|orders|shipment|delivery|deliver|track(?:ing)?|return|refund|wishlist|saved items|brand|category|categories|subcategory|price|cost|discount|coupon|offer|deal|sale|sales|promotion|promotions|available|recommend|suggest|looking for|i want|show me|in stock|out of stock|size|colour|color|wallet|shopperks|payment|address|bangle|bracelet|headphones?|keyboard|smart watch|shoes?|saree|shirt|dress|laptop|mobile phone)\b|₹/i;
const CONTEXT_FOLLOWUP =
  /\b(?:it|this|that|these|those|first|second|last|one|which one|its|their|same|yes|no|size|colour|color|add|remove|tell me more)\b/i;
const LOCAL_ACTION =
  /^(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:open|launch|start|run|close|kill)\s+(?:the\s+)?(?:notepad|calculator|paint|explorer|browser|https?:\/\/)/i;
const LOCAL_FILE_ACTION =
  /^(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:create|write|save|delete|remove|erase|read|summari[sz]e)\b.*\b(?:file|folder|document|notes?\.\w+)/i;
const GENERAL_CONVERSATION =
  /^(?:hi|hello|hey|namaste|good morning|good afternoon|good evening|who are you|what can you do|how are you|what|why|how|when|where|who|whom|which|is|are|was|were|do|does|did|can|could|should|would|will|tell me|explain|define|meaning of)\b/i;

function shouldUseGeneralFallback(text, hasRecentShopContext = false) {
  const message = String(text || '').trim();
  if (!message || LOCAL_ACTION.test(message) || LOCAL_FILE_ACTION.test(message)) return false;
  if (SHOP_TERMS.test(message)) return false;
  if (hasRecentShopContext && CONTEXT_FOLLOWUP.test(message)) return false;
  return GENERAL_CONVERSATION.test(message) || /\?\s*$/.test(message);
}

function createVoiceAgentFallback({ url, token, fetchImpl = globalThis.fetch } = {}) {
  if (!url && !token) return null;
  if (!url || !token) {
    throw new Error('VOICE_AGENT_URL and VOICE_AGENT_TOKEN must both be configured.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('The Node.js fetch API is required for the voice-agent fallback.');
  }

  const base = new URL(url);
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
    base.username ||
    base.password
  ) {
    throw new Error('VOICE_AGENT_URL must point to a localhost service.');
  }
  const endpoint = new URL('/v1/chat', base);
  const resetEndpoint = new URL('/v1/reset', base);
  const sessionIdFor = (sessionId, userId) =>
    createHash('sha256')
      .update(`${String(userId)}\0${String(sessionId)}`)
      .digest('hex')
      .slice(0, 40);

  async function request(target, body) {
    const response = await fetchImpl(target, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`voice-agent returned HTTP ${response.status}`);
    }
    return response.json();
  }

  return {
    async ask({ text, sessionId, userId, lang }) {
      const payload = await request(endpoint, {
        text: String(text).slice(0, 500),
        sessionId: sessionIdFor(sessionId, userId),
        lang: String(lang || 'en-IN'),
      });
      if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
        throw new Error('voice-agent returned an invalid chat response');
      }
      return payload.reply.trim();
    },
    async reset({ sessionId, userId }) {
      await request(resetEndpoint, { sessionId: sessionIdFor(sessionId, userId) });
    },
  };
}

module.exports = { createVoiceAgentFallback, shouldUseGeneralFallback };
