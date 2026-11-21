// Standalone server: `node server/index.js` -> API at /api/assistant/* and the demo page at /
const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./env');
loadEnv();
const { createHandler } = require('./handler');

const api = createHandler();
const WEB = path.join(__dirname, '..', 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url.startsWith('/api/assistant')) return api(req, res);
  const file = path.normalize(path.join(WEB, url === '/' ? 'demo.html' : url));
  if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const port = Number(process.env.PORT || 8787);
server.listen(port, () => console.log(`[jarvis] http://localhost:${port}  (demo page at /, API at /api/assistant)`));
