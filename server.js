const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 3000;

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function send(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  res.end(body);
}

function safeFilePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  if (decoded === '/') decoded = '/index.html';
  if (decoded === '/host' || decoded === '/host/') decoded = '/host.html';

  const filePath = path.resolve(root, `.${decoded}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    send(res, 200, JSON.stringify({ status: 'ok' }), 'application/json; charset=utf-8');
    return;
  }

  const urlPath = (req.url || '/').split('?')[0];
  const filePath = safeFilePath(urlPath);
  if (!filePath) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      send(res, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }

    const contentType = types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': contentType.startsWith('text/') ? 'no-cache' : 'public, max-age=3600'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`IGNUS Marvel Family Feud listening on port ${port}`);
});
