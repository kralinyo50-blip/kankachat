'use strict';
/*
 * KankaChat — Discord benzeri gerçek zamanlı sohbet sunucusu
 * Node.js + ws. Kalıcı veri: data.json (kanallar + mesaj geçmişi)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let WebSocketServer;
try { ({ WebSocketServer } = require('ws')); }
catch (_) { ({ WebSocketServer } = require('./vendor/ws')); } // npm'siz de çalışsın

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');
const MAX_HISTORY = 300;          // kanal başına saklanan mesaj
const MAX_TEXT = 2000;            // mesaj karakter limiti
const MAX_IMAGE = 2_000_000;      // dataURL karakter limiti (~1.4MB dosya)

/* ---------------------------- kalıcı durum ---------------------------- */
const DEFAULT_CHANNELS = [
  { id: 'genel', name: 'genel', type: 'text', topic: 'Herkes buraya 👋' },
  { id: 'oyun', name: 'oyun', type: 'text', topic: 'Oyun muhabbeti 🎮' },
  { id: 'muzik', name: 'müzik', type: 'text', topic: 'Şarkı önerileri 🎵' },
  { id: 'ses-sohbet', name: 'Sohbet Odası', type: 'voice' },
  { id: 'ses-oyun', name: 'Oyun Odası', type: 'voice' },
];

let channels = DEFAULT_CHANNELS.map((c) => ({ ...c }));
let messages = {};
for (const c of channels) if (c.type === 'text') messages[c.id] = [];

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (raw && Array.isArray(raw.channels) && raw.channels.length) channels = raw.channels;
  if (raw && raw.messages) messages = raw.messages;
  for (const c of channels) if (c.type === 'text' && !Array.isArray(messages[c.id])) messages[c.id] = [];
  console.log('[veri] data.json yüklendi');
} catch (_) { /* ilk çalıştırma */ }

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages })); } catch (_) {}
  }, 800);
}
process.on('SIGTERM', () => { try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages })); } catch (_) {} process.exit(0); });
process.on('SIGINT', () => { try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages })); } catch (_) {} process.exit(0); });

/* ---------------------------- kullanıcılar ---------------------------- */
const COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#f47b67', '#45ddc0', '#9b84ee', '#3ba55d', '#f0b232'];
const users = new Map(); // ws -> user
const byId = new Map();  // id  -> ws

const rid = () => crypto.randomBytes(6).toString('hex');
const publicUser = (u) => ({ id: u.id, name: u.name, color: u.color, channelId: u.channelId, voiceId: u.voiceId, muted: u.muted });
const allUsers = () => [...users.values()].map(publicUser);
const textChannel = (id) => channels.find((c) => c.id === id && c.type === 'text');
const voiceChannel = (id) => channels.find((c) => c.id === id && c.type === 'voice');
const voiceUsersOf = (vid) => [...users.values()].filter((u) => u.voiceId === vid);

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function broadcast(obj, filter) {
  const s = JSON.stringify(obj);
  for (const ws of users.keys()) {
    if (ws.readyState !== 1) continue;
    if (filter && !filter(users.get(ws))) continue;
    ws.send(s);
  }
}
function pushMessage(channelId, msg, persist = true) {
  if (!Array.isArray(messages[channelId])) messages[channelId] = [];
  messages[channelId].push(msg);
  if (messages[channelId].length > MAX_HISTORY) messages[channelId].splice(0, messages[channelId].length - MAX_HISTORY);
  if (persist) scheduleSave();
  broadcast({ t: 'msg', channelId, msg }, (u) => u.channelId === channelId);
}

/* ---------------------------- HTTP / statik ---------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = urlPath === '/' ? '/index.html' : urlPath;
    file = path.normalize(file).replace(/^([.][.][/\\])+/, '');
    const full = path.join(PUBLIC_DIR, file);
    if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('403'); }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  } catch (_) {
    res.writeHead(500); res.end('500');
  }
});

/* ---------------------------- WebSocket ---------------------------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 3 * 1024 * 1024 });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch (_) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    try { handle(ws, m); } catch (e) { console.error('[hata]', e); }
  });

  ws.on('close', () => cleanup(ws));
  ws.on('error', () => cleanup(ws));
});

function handle(ws, m) {
  const u = users.get(ws);

  if (m.t === 'join') {
    if (u) return; // zaten katılmış
    let name = String(m.name || '').replace(/[\u0000-\u001f<>&]/g, '').trim().slice(0, 24);
    if (!name) name = 'Misafir';
    const color = COLORS.includes(m.color) ? m.color : COLORS[Math.floor(Math.random() * COLORS.length)];
    const user = { id: rid(), name, color, channelId: channels.find((c) => c.type === 'text').id, voiceId: null, muted: false, lastMsgs: [] };
    users.set(ws, user);
    byId.set(user.id, ws);
    send(ws, {
      t: 'init',
      you: publicUser(user),
      channels,
      users: allUsers(),
      messages: (messages[user.channelId] || []).slice(-100),
    });
    broadcast({ t: 'users', users: allUsers() }, (x) => x !== user);
    pushMessage(user.channelId, { id: rid(), system: true, text: `${name} sunucuya katıldı`, ts: Date.now() }, false);
    console.log(`[+] ${name} (${users.size} çevrimiçi)`);
    return;
  }

  if (!u) return; // join öncesi her şey yok sayılır

  switch (m.t) {
    case 'ping': { send(ws, { t: 'pong' }); break; }

    case 'switch': {
      const ch = textChannel(m.channelId);
      if (!ch || u.channelId === ch.id) return;
      u.channelId = ch.id;
      send(ws, { t: 'switched', channelId: ch.id, messages: (messages[ch.id] || []).slice(-100) });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'msg': {
      // basit rate limit: 3 sn içinde en fazla 6 mesaj
      const now = Date.now();
      u.lastMsgs = (u.lastMsgs || []).filter((t) => now - t < 3000);
      if (u.lastMsgs.length >= 6) return;
      u.lastMsgs.push(now);

      let text = typeof m.text === 'string' ? m.text.replace(/\u0000/g, '').slice(0, MAX_TEXT) : '';
      let image = null;
      if (typeof m.image === 'string' && m.image.startsWith('data:image/') && m.image.length <= MAX_IMAGE) image = m.image;
      if (!text.trim() && !image) return;
      pushMessage(u.channelId, { id: rid(), uid: u.id, name: u.name, color: u.color, text, image, ts: Date.now() });
      break;
    }

    case 'typing': {
      broadcast({ t: 'typing', uid: u.id, name: u.name }, (x) => x.channelId === u.channelId && x !== u);
      break;
    }

    case 'create-channel': {
      let name = String(m.name || '').replace(/[\u0000-\u001f<>&#]/g, '').trim().slice(0, 24);
      if (!name) return;
      if (channels.some((c) => c.type === 'text' && c.name.toLowerCase() === name.toLowerCase())) return;
      const ch = { id: 'ch-' + rid(), name, type: 'text', topic: '' };
      channels.push(ch);
      messages[ch.id] = [];
      scheduleSave();
      broadcast({ t: 'channels', channels });
      break;
    }

    case 'mute': {
      u.muted = !!m.muted;
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'voice-join': {
      const ch = voiceChannel(m.channelId);
      if (!ch) return;
      if (u.voiceId === ch.id) return;
      if (u.voiceId) broadcast({ t: 'voice-left', uid: u.id, channelId: u.voiceId });
      u.voiceId = ch.id;
      const peers = voiceUsersOf(ch.id).filter((x) => x !== u).map(publicUser);
      send(ws, { t: 'voice-joined', channelId: ch.id, peers });
      broadcast({ t: 'users', users: allUsers() });
      console.log(`[ses] ${u.name} -> ${ch.name}`);
      break;
    }

    case 'voice-leave': {
      if (!u.voiceId) return;
      const old = u.voiceId;
      u.voiceId = null;
      u.muted = false;
      broadcast({ t: 'voice-left', uid: u.id, channelId: old });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'rtc': {
      // WebRTC sinyalleşme aktarımı (SDP / ICE)
      const target = byId.get(String(m.to || ''));
      if (target && target !== ws && users.has(target)) {
        send(target, { t: 'rtc', from: u.id, data: m.data });
      }
      break;
    }
  }
}

function cleanup(ws) {
  const u = users.get(ws);
  if (!u) return;
  users.delete(ws);
  byId.delete(u.id);
  broadcast({ t: 'users', users: allUsers() });
  if (u.voiceId) broadcast({ t: 'voice-left', uid: u.id, channelId: u.voiceId });
  if (textChannel(u.channelId)) {
    pushMessage(u.channelId, { id: rid(), system: true, text: `${u.name} ayrıldı`, ts: Date.now() }, false);
  }
  console.log(`[-] ${u.name} (${users.size} çevrimiçi)`);
}

/* kalp atışı: kopan bağlantıları temizle */
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KankaChat http://0.0.0.0:${PORT} adresinde hazır`);
});
