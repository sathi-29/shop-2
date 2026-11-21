function createLLM() {
  const pick = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (pick === 'voice_agent' || (!pick && process.env.VOICE_AGENT_URL))
    return require('./voice_agent')({ url: process.env.VOICE_AGENT_URL, token: process.env.VOICE_AGENT_TOKEN });
  if ((pick === 'gemini' || !pick) && process.env.GEMINI_API_KEY)
    return require('./gemini')({ apiKey: process.env.GEMINI_API_KEY, models: (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.5-flash-lite').split(',').map((s) => s.trim()).filter(Boolean) });
  if ((pick === 'openai' || !pick) && (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL))
    return require('./openai')({ apiKey: process.env.OPENAI_API_KEY, baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' });
  console.warn('[jarvis] No GEMINI_API_KEY / OPENAI_API_KEY / VOICE_AGENT_URL set -> using the simple keyword brain (demo only).');
  return require('./mock');
}
module.exports = { createLLM };