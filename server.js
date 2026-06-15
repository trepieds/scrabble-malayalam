// server.js — Scrabble Malayalam · Serveur WebSocket
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// ── Jeux en cours : code → { state, clients: [ws, ws] } ──────────────────────
const games = new Map();

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Serveur HTTP : sert le fichier index.html ─────────────────────────────────
const server = http.createServer((req, res) => {
  const file = path.join(__dirname, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

// ── Serveur WebSocket ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(game, obj) {
  game.clients.forEach(c => send(c, obj));
}

wss.on('connection', (ws) => {
  let gameCode = null;
  let role = null; // 'p1' | 'p2'

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── Créer une partie ──────────────────────────────────────────────────────
    if (msg.type === 'create') {
      gameCode = genCode();
      games.set(gameCode, { state: msg.state, clients: [ws, null] });
      role = 'p1';
      ws._role = 'p1';
      ws._code = gameCode;
      send(ws, { type: 'created', code: gameCode });
      console.log(`[${gameCode}] Partie créée par ${msg.state.p1.name}`);
    }

    // ── Demande d'état (p2 veut rejoindre) ───────────────────────────────────
    else if (msg.type === 'get_state') {
      const code = (msg.code || '').trim().toUpperCase();
      const game = games.get(code);
      if (!game) { send(ws, { type: 'error', reason: 'Partie introuvable. Vérifiez le code.' }); return; }
      if (game.clients[1] && game.clients[1].readyState === 1) {
        send(ws, { type: 'error', reason: 'Cette partie est déjà complète.' }); return;
      }
      send(ws, { type: 'current_state', state: game.state });
    }

    // ── Rejoindre une partie (p2 envoie l'état mis à jour avec son rack) ─────
    else if (msg.type === 'join') {
      const code = (msg.code || '').trim().toUpperCase();
      const game = games.get(code);
      if (!game) { send(ws, { type: 'error', reason: 'Partie introuvable.' }); return; }
      game.clients[1] = ws;
      role = 'p2';
      ws._role = 'p2';
      ws._code = code;
      gameCode = code;
      game.state = msg.state;
      send(ws, { type: 'joined', state: game.state });
      send(game.clients[0], { type: 'opponent_joined', state: game.state });
      console.log(`[${code}] ${msg.state.p2.name} a rejoint`);
    }

    // ── Mise à jour de l'état (coup joué) ────────────────────────────────────
    else if (msg.type === 'update') {
      const game = games.get(ws._code);
      if (!game) return;
      game.state = msg.state;
      const other = game.clients.find(c => c && c !== ws);
      if (other) send(other, { type: 'update', state: msg.state });
      console.log(`[${ws._code}] Coup joué par ${ws._role}`);
    }
  });

  ws.on('close', () => {
    if (!gameCode) return;
    const game = games.get(gameCode);
    if (!game) return;
    const other = game.clients.find(c => c && c !== ws);
    if (other) send(other, { type: 'opponent_left' });
    // Nettoyer si les deux partis
    if (!other || other.readyState !== 1) games.delete(gameCode);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎲 Scrabble Malayalam — Serveur démarré`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`   Partagez votre IP locale pour jouer en réseau local`);
  console.log(`   (trouvez-la avec : ip addr | grep inet  ou  ipconfig)\n`);
});
