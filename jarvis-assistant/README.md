# Jarvis Assistant (voice shopping assistant)

Tap the mic in your shop's bottom bar, talk, and Jarvis searches, answers questions, manages the cart,
places orders (only after you say "yes") and tracks deliveries.

```
jarvis-assistant/
  web/jarvis.js        the voice sheet (drop-in, no dependencies)  ·  web/demo.html = try it
  server/              API: agent loop, tools, Gemini / OpenAI-compatible brains
  server/adapter/      mock.js = sample data · custom.js = YOUR real data (fill in)
  COPILOT_PROMPT.md    paste into VS Code Copilot to wire it into the project
  test/run.js          offline tests (npm test)
```

## Try it in 1 minute (needs Node 18+)
```
cd jarvis-assistant
copy .env.example .env      (Windows)   |   cp .env.example .env
# put your key in .env:  GEMINI_API_KEY=...   (free key: https://aistudio.google.com/apikey)
node server/index.js
```
Open http://localhost:8787 in **Chrome**, tap the mic button, allow the microphone.
Without a key it still runs, using a simple keyword brain (demo only, not smart).

## How a conversation works
"I want shoes" → asks brand → "Stride" → shows a list on screen and says the top pick →
"tell me about the first one" → answers from product data → "add it, size 9" → "place the order" →
asks address / payment → reads the summary → "yes" → order placed.
"Where is my order?" → asks which one if several → says status, current location, expected date, shows a timeline.

## Safety built in
- An order is placed only if the customer says yes in a LATER message than the summary (enforced in code, not just by the prompt).
- Each session is tied to the logged-in user; data access goes only through the adapter for that user.
- API key stays on the server. Per-IP rate limit. Replies are rendered as text (no HTML injection).

## Notes
- Voice uses the browser Web Speech API: best in Chrome/Edge/Android Chrome. It needs HTTPS (or localhost). Safari/Firefox: typing still works.
- Speech recognition in Chrome is sent to Google's servers by the browser; that is a browser feature.
- "Hey Jarvis" wake word: `initJarvis({ wakeWord: true })` (keeps the mic on while the tab is open; off by default).
- Languages: English, Hindi, Kannada, Tamil, Telugu selector in the sheet (quality depends on the device's voices).
- Not a React Native/Flutter module: that would need a native speech package instead of `web/jarvis.js` (the server part is reusable).
