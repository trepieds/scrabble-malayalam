// server.js — Scrabble Malayalam · Serveur HTTP polling (sans WebSocket)
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const games = new Map(); // code → { state, updatedAt }

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, data, status=200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
  });
}

// Nettoyer les vieilles parties (> 2h)
setInterval(() => {
  const now = Date.now();
  for (const [code, game] of games) {
    if (now - game.updatedAt > 2 * 60 * 60 * 1000) games.delete(code);
  }
}, 10 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  // ── Servir index.html ────────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/') {
    const file = path.join(__dirname, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      cors(res);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // ── POST /create ─────────────────────────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/create') {
    const body = await readBody(req);
    const code = genCode();
    games.set(code, { state: body.state, updatedAt: Date.now() });
    console.log(`[${code}] Créée par ${body.state.p1.name}`);
    json(res, { code });
    return;
  }

  // ── GET /state/:code ─────────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname.startsWith('/state/')) {
    const code = pathname.slice(7).toUpperCase();
    const game = games.get(code);
    if (!game) { json(res, { error: 'Partie introuvable.' }, 404); return; }
    json(res, { state: game.state });
    return;
  }

  // ── POST /join/:code ─────────────────────────────────────────────────────────
  if (req.method === 'POST' && pathname.startsWith('/join/')) {
    const code = pathname.slice(6).toUpperCase();
    const game = games.get(code);
    if (!game) { json(res, { error: 'Partie introuvable. Vérifiez le code.' }, 404); return; }
    if (game.state.p2 && game.state.p2.name) { json(res, { error: 'Partie déjà complète.' }, 400); return; }
    const body = await readBody(req);
    game.state = body.state;
    game.updatedAt = Date.now();
    console.log(`[${code}] ${body.state.p2.name} a rejoint`);
    json(res, { state: game.state });
    return;
  }

  // ── POST /update/:code ───────────────────────────────────────────────────────
  if (req.method === 'POST' && pathname.startsWith('/update/')) {
    const code = pathname.slice(8).toUpperCase();
    const game = games.get(code);
    if (!game) { json(res, { error: 'Partie introuvable.' }, 404); return; }
    const body = await readBody(req);
    game.state = body.state;
    game.updatedAt = Date.now();
    json(res, { ok: true });
    return;
  }

  // ── GET /poll/:code/:version ─────────────────────────────────────────────────
  if (req.method === 'GET' && pathname.startsWith('/poll/')) {
    const parts = pathname.slice(6).split('/');
    const code = parts[0].toUpperCase();
    const clientVersion = parseInt(parts[1]) || 0;
    const game = games.get(code);
    if (!game) { json(res, { error: 'Partie introuvable.' }, 404); return; }
    const serverVersion = game.state.version || 0;
    if (serverVersion !== clientVersion) {
      json(res, { updated: true, state: game.state });
    } else {
      json(res, { updated: false });
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🎲 Scrabble Malayalam — Serveur HTTP démarré`);
  console.log(`📡 http://localhost:${PORT}\n`);
});
