import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../web-preview/', import.meta.url)));
const rootPrefix = root + path.sep;
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(rootPrefix)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (pathname.endsWith('/')) file = path.join(file, 'index.html');
    try {
      if (!(await stat(file)).isFile()) throw new Error('Not a file');
    } catch {
      if (path.extname(pathname)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      file = path.join(root, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(400);
    res.end('Unable to open preview. Run npm run export:web to generate it.');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Technest preview: http://localhost:${port}\nPress Ctrl+C to stop.`),
);
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
