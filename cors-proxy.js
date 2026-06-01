const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
}

function getTargetUrl(req) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);

  if (searchParams.has('url')) {
    return searchParams.get('url');
  }

  // Support path-style proxy: /https://example.com/api
  const trimmedPath = pathname.replace(/^\/+/, '');
  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath;
  }

  return null;
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const target = getTargetUrl(req);
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing target URL. Use /https://example.com/api or ?url=https://example.com/api');
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid target URL.');
    return;
  }

  const client = targetUrl.protocol === 'https:' ? https : http;
  const proxyOptions = {
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host,
      origin: targetUrl.origin,
    },
  };

  const proxyReq = client.request(proxyOptions, (proxyRes) => {
    setCorsHeaders(res);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy request failed: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
  console.log(`CORS proxy running on http://localhost:${PORT}`);
  console.log('Usage examples:');
  console.log('  http://localhost:' + PORT + '/https://example.com/api');
  console.log('  http://localhost:' + PORT + '/?url=https://example.com/api');
});
