const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 18791;
const OPENROUTER_HOST = 'openrouter.ai';
const API_KEY = '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';

const server = http.createServer((req, res) => {
  const targetPath = req.url;
  console.log(`[PROXY] ${req.method} ${targetPath}`);

  const options = {
    hostname: OPENROUTER_HOST,
    port: 443,
    path: '/api/v1' + targetPath,
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://aicare.local',
      'X-Title': 'AICare',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[PROXY] Error:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenRouter proxy listening on http://127.0.0.1:${PORT}`);
});
