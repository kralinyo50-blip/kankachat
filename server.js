'use strict';
/* KankaChat v3 — DM, tepkiler, bot, oyunlar, admin, davet, EKONOMİ & PROFİL */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let WebSocketServer;
try { ({ WebSocketServer } = require('ws')); }
catch (_) { ({ WebSocketServer } = require('./vendor/ws')); }

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data.json');
const MAX_HISTORY = 300, MAX_TEXT = 2000, MAX_IMAGE = 2_000_000, MAX_UPLOAD = 25 * 1024 * 1024;
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (_) {}

const DEFAULT_CHANNELS = [
  { id: 'genel', name: 'genel', type: 'text', topic: 'Herkes buraya 👋' },
  { id: 'oyun', name: 'oyun', type: 'text', topic: 'Oyun muhabbeti 🎮' },
  { id: 'muzik', name: 'müzik', type: 'text', topic: 'Şarkı önerileri 🎵' },
  { id: 'ai', name: 'ai', type: 'text', topic: 'KankaAI’ya sor, aydınlatsın ✨ (direkt yaz)' },
  { id: 'izleme', name: 'İzleme Odası', type: 'watch', topic: 'Birlikte YouTube 🎬 — link yapıştır, herkes izlesin' },
  { id: 'ses-sohbet', name: 'Sohbet Odası', type: 'voice' },
  { id: 'ses-oyun', name: 'Oyun Odası', type: 'voice' },
];

/* ---------------- MAĞAZA (KankaCoin 🪙) ---------------- */
const SHOP = [
  { id: 'e_cool', type: 'emoji', label: '😎 Cool', price: 100, value: '😎' },
  { id: 'e_pizza', type: 'emoji', label: '🍕 Pizzacı', price: 100, value: '🍕' },
  { id: 'e_wolf', type: 'emoji', label: '🐺 Kurt', price: 150, value: '🐺' },
  { id: 'e_cat', type: 'emoji', label: '🐱 Cozy Cat', price: 150, value: '🐱' },
  { id: 'e_fire', type: 'emoji', label: '🔥 Ateş', price: 200, value: '🔥' },
  { id: 'e_skull', type: 'emoji', label: '💀 Skull', price: 250, value: '💀' },
  { id: 'e_uni', type: 'emoji', label: '🦄 Unicorn', price: 300, value: '🦄' },
  { id: 'e_drg', type: 'emoji', label: '🐉 Ejderha', price: 800, value: '🐉' },
  { id: 'e_king', type: 'emoji', label: '👑 Kral', price: 1000, value: '👑' },
  { id: 'f_steel', type: 'frame', label: '⚙️ Çelik Çerçeve', price: 250, value: 'steel' },
  { id: 'f_star', type: 'frame', label: '✨ Yıldızlı Aura', price: 600, value: 'star' },
  { id: 'f_fire', type: 'frame', label: '🔥 Ateş Çerçevesi', price: 700, value: 'fire' },
  { id: 'f_gold', type: 'frame', label: ' Altın Çerçeve', price: 1500, value: 'gold' },
  { id: 'f_gal', type: 'frame', label: '🌌 Galaksi (animasyonlu)', price: 2000, value: 'galaxy' },
  { id: 'f_rain', type: 'frame', label: '🌈 Gökkuşağı (animasyonlu)', price: 2500, value: 'rainbow' },
  { id: 'b_bolt', type: 'badge', label: '⚡ Hızlı', price: 100, value: '⚡' },
  { id: 'b_star', type: 'badge', label: '🌟 Yıldız', price: 200, value: '🌟' },
  { id: 'b_angel', type: 'badge', label: '😇 Melek', price: 300, value: '😇' },
  { id: 'b_devil', type: 'badge', label: '😈 Şeytan', price: 300, value: '😈' },
  { id: 'b_med', type: 'badge', label: '🎖️ Gazi', price: 500, value: '🎖️' },
  { id: 'b_cup', type: 'badge', label: '🏆 Şampiyon', price: 1000, value: '🏆' },
  { id: 'b_tiara', type: 'badge', label: '👑 Starlight Taç', price: 1500, value: '💫' },
  { id: 'b_dia', type: 'badge', label: '💎 Elmas', price: 2500, value: '💎' },
  { id: 'b_goat', type: 'badge', label: '🐐 EFSANE (GOAT)', price: 5000, value: '🐐' },
  { id: 'n_green', type: 'namecolor', label: '🟢 Yeşil İsim', price: 200, value: 'green' },
  { id: 'n_red', type: 'namecolor', label: '🔴 Kırmızı İsim', price: 200, value: 'red' },
  { id: 'n_purp', type: 'namecolor', label: '🟣 Mor İsim', price: 300, value: 'purple' },
  { id: 'n_gold', type: 'namecolor', label: '🥇 Altın İsim', price: 1500, value: 'gold' },
  { id: 'n_rain', type: 'namecolor', label: '🌈 Gökkuşağı İsim', price: 3000, value: 'rainbow' },
  { id: 'status', type: 'status', label: '💬 Özel Durum Yazısı', price: 100, value: 'status' },
  { id: 't_kanka', type: 'title', label: '💙 Kanka', price: 100, value: 'Kanka' },
  { id: 't_gazi', type: 'title', label: '🎖️ Gazi', price: 500, value: 'Gazi' },
  { id: 't_efso', type: 'title', label: '🌟 Efsane', price: 1000, value: 'Efsane' },
  { id: 't_patron', type: 'title', label: '💼 Patron', price: 2500, value: 'Patron' },
  { id: 't_kral', type: 'title', label: '👑 Kral', price: 5000, value: 'Kral' },
  { id: 'bub_blue', type: 'bubble', label: '🫧 Mavi Mesaj Balonu', price: 300, value: '#5865f2' },
  { id: 'bub_red', type: 'bubble', label: '🫧 Kırmızı Mesaj Balonu', price: 300, value: '#ed4245' },
  { id: 'bub_green', type: 'bubble', label: '🫧 Yeşil Mesaj Balonu', price: 300, value: '#23a55a' },
  { id: 'bub_gold', type: 'bubble', label: '🫧 Altın Mesaj Balonu', price: 1200, value: '#f0b232' },
  { id: 'pbg_g1', type: 'pbg', label: '🌌 Profil: Galaksi', price: 600, value: 'g1' },
  { id: 'pbg_g2', type: 'pbg', label: '🌅 Profil: Gün Batımı', price: 600, value: 'g2' },
  { id: 'pbg_g3', type: 'pbg', label: '💜 Profil: Neon', price: 900, value: 'g3' },
  { id: 'gold_msg', type: 'gold', label: '✨ Altın Mesajlar', price: 1500, value: true },
  { id: 'anons', type: 'anons', label: '📣 Giriş Anonsu (özel yazı)', price: 800, value: 'anons' },
  { id: 'p_herkese', type: 'power', label: '📢 @herkes Gücü', price: 2000, value: true },
];

let channels = DEFAULT_CHANNELS.map((c) => ({ ...c }));
let messages = {};
let meta = { ownerId: null, inviteCode: genCode(), requireInvite: false, scores: {}, known: {}, coins: {}, profiles: {} };
const chainState = {}, quizState = {}, duelState = {}, anaState = {}, matState = {}, songState = {};
const scramble = (w) => { const a = [...w]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join('') === w ? w.split('').reverse().join('') : a.join(''); };

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (raw && Array.isArray(raw.channels) && raw.channels.length) channels = raw.channels;
  if (raw && raw.messages) messages = raw.messages;
  if (raw && raw.meta) meta = Object.assign(meta, raw.meta);
  for (const d of DEFAULT_CHANNELS) if (!channels.find((c) => c.id === d.id)) channels.push({ ...d });
  for (const c of channels) if ((c.type === 'text' || c.type === 'watch') && !Array.isArray(messages[c.id])) messages[c.id] = [];
  console.log('[veri] data.json yüklendi');
} catch (_) {}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages, meta })); } catch (_) {} }, 800);
}
const doSave = () => { try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages, meta })); } catch (_) {} };
process.on('SIGTERM', async () => { doSave(); await cloudSave(true).catch(() => {}); process.exit(0); });
process.on('SIGINT', async () => { doSave(); await cloudSave(true).catch(() => {}); process.exit(0); });

const COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#f47b67', '#45ddc0', '#9b84ee', '#3ba55d', '#f0b232'];
const users = new Map(); const byId = new Map();
const rid = () => crypto.randomBytes(6).toString('hex');

/* ---------------- HESAP SİSTEMİ ---------------- */
function hashPass(pass, salt) {
  return crypto.createHash('sha256').update(salt + ':' + pass).digest('hex');
}
const accOf = (name) => (meta.accounts || {})[trLow(name)];
const ADMIN_NAME = 'kaan';
function sendMail(to, subject, text) {
  const sid = process.env.EMAILJS_SERVICE, tid = process.env.EMAILJS_TEMPLATE, uid = process.env.EMAILJS_KEY;
  if (!sid || !tid || !uid) return Promise.resolve(null); // demo mod
  return fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: sid, template_id: tid, user_id: uid, template_params: { to_email: to, subject, message: text } }),
  }).then((r) => (r.ok ? true : null)).catch(() => null);
}

/* ---------------- profil yardımcıları ---------------- */
function profileOf(uid) {
  if (!meta.profiles[uid]) meta.profiles[uid] = { coins: 0, owned: [], emoji: null, frame: null, badge: null, nameColor: null, status: null, title: null, bubble: null, pbg: null, gold: false, anons: null, xp: 0, msgs: 0, wins: 0, ach: [], quests: { date: '', c: {}, claimed: [] }, lastDaily: '', lastMine: 0, lastSpin: '', streak: 0, pet: null };
  return meta.profiles[uid];
}
const levelOf = (p) => Math.floor(Math.sqrt((p.xp || 0) / 100));
const petLvl = (pet) => Math.floor(Math.sqrt((pet.xp || 0) / 50));
const petFace = (pet) => {
  if (!pet) return null;
  if (petLvl(pet) <= 0) return '🐣';
  const base = { kedi: '🐱', kopek: '🐶', ejder: '🐉' }[pet.type] || '🐾';
  return petLvl(pet) >= 3 ? base + '✨' : base;
};
const publicProfile = (p, uid) => ({ emoji: p.emoji, frame: p.frame, badge: p.badge, nameColor: p.nameColor, status: p.status, title: p.title, level: levelOf(p), bubble: p.bubble, pbg: p.pbg, gold: p.gold, anons: p.anons, pet: p.pet ? { e: petFace(p.pet), lvl: petLvl(p.pet) } : null, clan: uid && typeof clanOf === 'function' && clanOf(uid) ? clanOf(uid)[1].name : null, buddy: uid && typeof buddyOf === 'function' && buddyOf(uid) ? buddyOf(uid).find((x) => x !== uid) : null, photo: p.photo || null });

const QUESTS = [
  { id: 'q_msgs', label: '💬 10 mesaj gönder', need: 10, key: 'msgs', reward: 5 },
  { id: 'q_wins', label: '🏆 1 oyun kazan', need: 1, key: 'wins', reward: 5 },
  { id: 'q_react', label: '😀 3 tepki ver', need: 3, key: 'reacts', reward: 3 },
  { id: 'q_voice', label: '🎤 Ses odasına gir', need: 1, key: 'voice', reward: 2 },
];
const ACH = { first_msg: '💬 İlk Mesaj', chatty: '🗣️ 100 Mesaj', rich100: '🪙 Cüzdan 100', rich1000: '💰 Cüzdan 1000', lvl5: '📈 Seviye 5', gamer: '🏆 İlk Zafer', social: '📨 İlk DM', ai_friend: '🤖 AI Dostu', showman: '🎆 İlk Şov' };

/* ---------------- 🎆 COIN ŞOVLARI ---------------- */
const SOVS = {
  havai: { cost: 50, label: '🎆 Havai Fişek', msg: (n) => `🎆 ${n} havai fişek şöleni patlattı!` },
  beba: { cost: 77, label: '🦗 Ardanın Bebası', msg: (n) => `🦗 ${n} ARDANIN BEBASINI saldı! Camı açık bırakın 😂` },
  yagmur: { cost: 30, label: '🌧️ Yağmur', msg: (n) => `🌧️ ${n} yağmur bulutu getirdi!` },
  kar: { cost: 30, label: '❄️ Kar Yağışı', msg: (n) => `❄️ ${n} kış getirdi, üşüdünüz mü?` },
  para: { cost: 100, label: '💸 Para Şovu', msg: (n) => `💸 ${n} para saçtı! Toplayın kankalar!` },
  parti: { cost: 60, label: '🎂 Parti', msg: (n) => `🎂 ${n} parti başlattı!` },
  bomba: { cost: 40, label: '💣 Bomba', msg: (n) => `💣 ${n} bombayı patlattı! Sarsılın!` },
  gokkusagi: { cost: 45, label: '🌈 Gökkuşağı', msg: (n) => `🌈 ${n} gökkuşağı sald!` },
  kral: { cost: 150, label: '👑 Kral Şovu', msg: (n) => `👑 ${n} krallığını ilan etti!` },
  roket: { cost: 80, label: '🚀 Roket', msg: (n) => `🚀 ${n} roketleri fırlattı!` },
};
/* ---------------- ⚔️ KLAN + 🏪 PAZAR + 🎪 MÜZAYEDE ---------------- */
let warState = null, auctionState = null;
const clanOf = (uid) => Object.entries(meta.clans || {}).find(([, c]) => (c.members || []).includes(uid));
const marketBroadcast = () => broadcast({ t: 'market', market: meta.market || [] });

/* ---------------- 😤 MODERASYON + 🏷️ ROLLER ---------------- */
function pushAudit(txt) {
  if (!meta.audit) meta.audit = [];
  meta.audit.unshift({ t: Date.now(), txt });
  meta.audit = meta.audit.slice(0, 100);
  scheduleSave();
}
const findOnline = (nm) => allUsers().find((x) => trLow(x.name) === trLow(String(nm).replace(/@/g, '').trim()));
function runMod(u, cmd, text, ch) {
  if (!meta.roles) meta.roles = [];
  if (!meta.userRoles) meta.userRoles = {};
  const owner = isOwner(u);

  if (cmd.startsWith('!sustur')) {
    if (!owner) { botSay(ch, '😤 Sadece sahip!'); return true; }
    const parts = text.split(/\s+/);
    const tgt = findOnline(parts[1] || '');
    const min = parseInt(parts[2], 10) || 5;
    if (!tgt || tgt.id === u.id) { botSay(ch, '😤 Kullanım: !sustur @isim 5'); return true; }
    if (!meta.timeouts) meta.timeouts = {};
    meta.timeouts[tgt.id] = Date.now() + min * 60000;
    scheduleSave();
    pushAudit(`😤 ${u.name}, ${tgt.name} kişisini ${min} dk susturdu`);
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `😤 ${tgt.name} ${min} dakika susturuldu ⏳`);
    return true;
  }
  if (cmd.startsWith('!ban')) {
    if (!owner) { botSay(ch, '🚫 Sadece sahip!'); return true; }
    const tgt = findOnline(text.slice(4));
    const nm = trLow(text.slice(4).replace(/@/g, '').trim());
    if (!nm) { botSay(ch, '🚫 Kullanım: !ban @isim'); return true; }
    if (!meta.bans) meta.bans = {};
    meta.bans[nm] = true;
    pushAudit(`🚫 ${u.name}, ${nm} kişisini BANladı`);
    scheduleSave();
    botSay(ch, `🚫 ${nm} BANlandı!`);
    const tw = tgt && byId.get(tgt.id);
    if (tw) { send(tw, { t: 'kicked' }); setTimeout(() => tw.terminate(), 300); }
    return true;
  }
  if (cmd.startsWith('!unban')) {
    if (!owner) return true;
    const nm = trLow(text.slice(6).replace(/@/g, '').trim());
    if (meta.bans) delete meta.bans[nm];
    pushAudit(`✅ ${u.name}, ${nm} banını kaldırdı`);
    scheduleSave();
    botSay(ch, `✅ ${nm} banı kalktı`);
    return true;
  }
  if (cmd.startsWith('!slowmode')) {
    if (!owner) return true;
    const sec = parseInt((text.match(/\d+/) || [0])[0], 10);
    const c = anyTextish(ch);
    if (!c) return true;
    c.slow = sec > 0 ? Math.min(300, sec) : 0;
    scheduleSave();
    pushAudit(`🐌 ${u.name} #${c.name} slowmode: ${c.slow}sn`);
    broadcast({ t: 'channels', channels });
    botSay(ch, c.slow ? `🐌 Slowmode AÇIK: ${c.slow} sn` : '🐌 Slowmode kapalı');
    return true;
  }
  if (cmd.startsWith('!limit')) {
    if (!owner) return true;
    if (!u.voiceId) { botSay(ch, '👥 Ses odasında olmalısın'); return true; }
    const vc = voiceChannel(u.voiceId);
    const n = parseInt((text.match(/\d+/) || [0])[0], 10);
    vc.limit = n > 0 ? n : 0;
    scheduleSave();
    pushAudit(`👥 ${u.name} ${vc.name} limit: ${vc.limit || 'yok'}`);
    broadcast({ t: 'channels', channels });
    botSay(ch, `👥 Oda limiti: ${vc.limit || 'sınırsız'}`);
    return true;
  }
  if (cmd.startsWith('!sahne')) {
    if (!owner) return true;
    if (!u.voiceId) { botSay(ch, '🌐 Ses odasında olmalısın'); return true; }
    const vc = voiceChannel(u.voiceId);
    vc.stage = !vc.stage;
    if (!vc.stage) vc.speakers = [];
    scheduleSave();
    pushAudit(`🌐 ${u.name} ${vc.name} sahne modu: ${vc.stage ? 'AÇIK' : 'kapalı'}`);
    broadcast({ t: 'channels', channels });
    botSay(ch, vc.stage ? '🌐 SAHNE MODU: dinleyiciler susturulur, 🖐️ ile söz iste!' : '🌐 Sahne modu kapandı');
    return true;
  }
  if (cmd.startsWith('!sozver')) {
    if (!owner) return true;
    const tgt = findOnline(text.slice(7));
    if (!tgt) { botSay(ch, '🌐 Kullanım: !sozver @isim'); return true; }
    const vc = voiceChannel(tgt.voiceId);
    if (!vc) return true;
    if (!vc.speakers) vc.speakers = [];
    if (vc.speakers.includes(tgt.id)) vc.speakers = vc.speakers.filter((x) => x !== tgt.id);
    else vc.speakers.push(tgt.id);
    const on = vc.speakers.includes(tgt.id);
    const tw = byId.get(tgt.id);
    if (tw) { const tu = users.get(tw); if (tu && on) tu.muted = false; }
    scheduleSave();
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `🌐 ${tgt.name} ${on ? 'söz aldı 🎤' : 'sahneyi bıraktı'}`);
    return true;
  }
  if (cmd.startsWith('!rol olustur') || cmd.startsWith('!rol oluştur')) {
    if (!owner) return true;
    const mm = text.match(/#([0-9a-fA-F]{6})/);
    const rname = text.replace(/!rol (olustur|oluştur)/i, '').replace(/#[0-9a-fA-F]{6}/, '').trim().slice(0, 16);
    if (!rname || !mm) { botSay(ch, '🏷️ Kullanım: !rol oluştur MOD #ff0000'); return true; }
    meta.roles.push({ id: 'r' + rid(), name: rname, color: '#' + mm[1] });
    scheduleSave();
    pushAudit(`🏷️ ${u.name} rol oluşturdu: ${rname}`);
    broadcast({ t: 'roles', roles: meta.roles, userRoles: meta.userRoles });
    botSay(ch, `🏷️ Rol hazır: ${rname} • Ver: !rol ver @isim ${rname}`);
    return true;
  }
  if (cmd.startsWith('!rol ver')) {
    if (!owner) return true;
    const parts = text.replace(/!rol ver/i, '').trim();
    const tgt = findOnline(parts.split(/\s+/)[0]);
    const rname = parts.split(/\s+/).slice(1).join(' ');
    const role = meta.roles.find((r) => trLow(r.name) === trLow(rname));
    if (!tgt || !role) { botSay(ch, '🏷️ Kullanım: !rol ver @isim RolAdı'); return true; }
    meta.userRoles[tgt.id] = role.id;
    scheduleSave();
    pushAudit(`🏷️ ${u.name}, ${tgt.name} → ${role.name}`);
    broadcast({ t: 'roles', roles: meta.roles, userRoles: meta.userRoles });
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `🏷️ ${tgt.name} artık [${role.name}]!`);
    return true;
  }
  if (cmd === '!roller') {
    botSay(ch, '🏷️ ' + (meta.roles.map((r) => `${r.name} (${r.color})`).join(' • ') || 'rol yok — !rol oluştur AD #renk'));
    return true;
  }
  if (cmd.startsWith('!karsilama')) {
    if (!owner) return true;
    meta.welcome = text.replace(/!karsilama/i, '').trim().slice(0, 80) || '';
    scheduleSave();
    broadcast({ t: 'welcome', welcome: meta.welcome });
    botSay(ch, '🎫 Karşılama yazısı güncellendi!');
    return true;
  }
  if (cmd === '!log') {
    if (!owner) return true;
    botSay(ch, '📜 ' + ((meta.audit || []).slice(0, 5).map((a) => a.txt).join(' • ') || 'kayıt yok'));
    return true;
  }
  return false;
}

/* ---------------- 💞 KANKA + 📰 GAZETE + ✍️ SPOILER ---------------- */
const buddyOf = (uid) => (meta.buddies || []).find((b) => b.includes(uid));
function runSocial(u, cmd, text, ch) {
  if (!meta.buddies) meta.buddies = [];
  if (cmd.startsWith('!teklif')) {
    const tn = trLow(text.replace(/!teklif/i, '').replace(/@/g, '').trim());
    const target = allUsers().find((x) => trLow(x.name) === tn && x.id !== u.id);
    if (!target) { botSay(ch, '💍 Kullanım: !teklif @isim (kişi çevrimiçi olmalı)'); return true; }
    if (buddyOf(u.id)) { botSay(ch, '💍 Zaten kankan var! (!bosan önce 😄)'); return true; }
    if (buddyOf(target.id)) { botSay(ch, '💍 Onun zaten kankası var 😅'); return true; }
    meta.pendingBuddy = { from: u.id, to: target.id };
    scheduleSave();
    botSay(ch, `💍 ${u.name}, ${target.name} kişisine KANKALIK teklif etti! Kabul: !evet`);
    const tw = byId.get(target.id);
    if (tw) send(tw, { t: 'toast', text: `💍 ${u.name} kanka teklif etti! !evet yaz` });
    return true;
  }
  if (cmd === '!evet') {
    const p = meta.pendingBuddy;
    if (!p || p.to !== u.id) { botSay(ch, '💍 Sana bekleyen teklif yok'); return true; }
    meta.buddies.push([p.from, p.to]);
    meta.pendingBuddy = null;
    scheduleSave();
    broadcast({ t: 'users', users: allUsers() });
    broadcast({ t: 'profile', uid: u.id, profile: publicProfile(profileOf(u.id), u.id) });
    broadcast({ t: 'profile', uid: p.from, profile: publicProfile(profileOf(p.from), p.from) });
    const other = meta.known[p.from] ? meta.known[p.from].name : '?';
    botSay(ch, `💞 KUTLU OLSUN! ${u.name} & ${other} artık RESMİ KANKA! 💍`);
    return true;
  }
  if (cmd === '!bosan') {
    const b = buddyOf(u.id);
    if (!b) { botSay(ch, '💍 Kankan yok ki 😄'); return true; }
    meta.buddies = meta.buddies.filter((x) => x !== b);
    scheduleSave();
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `💔 ${u.name} kanka ilişkisini bitirdi. Olur böyle şeyler 😔`);
    return true;
  }
  if (cmd === '!gazete') { gazete(ch); return true; }
  return false;
}
function gazete(ch) {
  const rows = Object.entries(meta.profiles || {});
  const nm = (id) => (meta.known[id] ? meta.known[id].name : '?');
  const rich = [...rows].sort((a, b) => (b[1].coins || 0) - (a[1].coins || 0))[0];
  const lvl = [...rows].sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))[0];
  const talk = [...rows].sort((a, b) => (b[1].msgs || 0) - (a[1].msgs || 0))[0];
  const win = [...rows].sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0))[0];
  const clans = Object.values(meta.clans || {}).sort((a, b) => (b.wins || 0) - (a.wins || 0))[0];
  const bud = (meta.buddies || [])[0];
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  let txt = `📰 KANKA GAZETESİ — ${date}\n`;
  txt += `💰 En Zengin: ${rich ? nm(rich[0]) + ' (' + rich[1].coins + '🪙)' : '-'}\n`;
  txt += `📈 En Yüksek Seviye: ${lvl ? nm(lvl[0]) + ' (Lv' + levelOf(lvl[1]) + ')' : '-'}\n`;
  txt += `🗣️ Geveze: ${talk ? nm(talk[0]) + ' (' + talk[1].msgs + ' mesaj)' : '-'}\n`;
  txt += `🏆 Oyun Canavarı: ${win ? nm(win[0]) + ' (' + win[1].wins + ' zafer)' : '-'}\n`;
  txt += `⚔️ En Güçlü Klan: ${clans ? clans.name + ' (' + clans.wins + ' zafer)' : 'henüz yok'}\n`;
  txt += `💍 Günün Kankaları: ${bud ? nm(bud[0]) + ' & ' + nm(bud[1]) : 'henüz yok'}`;
  botSay(ch, txt);
}

function runEco(u, cmd, text, ch) {
  if (!meta.clans) meta.clans = {};
  if (!meta.market) meta.market = [];
  const my = clanOf(u.id);

  if (cmd.startsWith('!klankur')) {
    const name = text.replace(/!klankur/i, '').trim().slice(0, 16);
    if (!name) { botSay(ch, '⚔️ Kullanım: !klankur İsim'); return true; }
    if (my) { botSay(ch, '⚔️ Zaten bir klandasın!'); return true; }
    const p = profileOf(u.id);
    if (p.coins < 200) { botSay(ch, '⚔️ Klan kurmak 200 🪙!'); return true; }
    if (Object.values(meta.clans).some((c) => trLow(c.name) === trLow(name))) { botSay(ch, '⚔️ Bu klan adı alınmış!'); return true; }
    p.coins -= 200;
    const id = 'cl' + rid();
    meta.clans[id] = { name, leader: u.id, members: [u.id], wins: 0 };
    scheduleSave(); sendWallet(u);
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `⚔️ ${u.name} “${name}” klanını kurdu! Katılmak: !klan ${name}`);
    return true;
  }
  if (cmd.startsWith('!klan ')) {
    const name = text.slice(6).trim();
    const ent = Object.entries(meta.clans).find(([, c]) => trLow(c.name) === trLow(name));
    if (!ent) { botSay(ch, '⚔️ Öyle bir klan yok (!klanlar → liste)'); return true; }
    if (my) { botSay(ch, '⚔️ Zaten klandasın, önce !ayril'); return true; }
    ent[1].members.push(u.id);
    scheduleSave();
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `⚔️ ${u.name} “${ent[1].name}” klanına katıldı!`);
    return true;
  }
  if (cmd === '!klanlar') {
    const list = Object.values(meta.clans).map((c) => `${c.name} (${c.members.length} üye, ${c.wins} zafer)`).join(' • ') || 'Henüz klan yok — !klankur İsim';
    botSay(ch, '⚔️ KLANLAR: ' + list);
    return true;
  }
  if (cmd === '!ayril') {
    if (!my) { botSay(ch, '⚔️ Klanda değilsin'); return true; }
    const [cid, c] = my;
    c.members = c.members.filter((x) => x !== u.id);
    if (c.leader === u.id && c.members.length) c.leader = c.members[0];
    if (!c.members.length) delete meta.clans[cid];
    scheduleSave();
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, `⚔️ ${u.name} klandan ayrıldı`);
    return true;
  }
  if (cmd.startsWith('!savas')) {
    if (!my) { botSay(ch, '⚔️ Önce bir klana gir (!klan isim)'); return true; }
    const target = Object.entries(meta.clans).find(([, c]) => trLow(c.name) === trLow(text.slice(7).trim()) && c !== my[1]);
    if (!target) { botSay(ch, '⚔️ Rakip klan bulunamadı (!klanlar)'); return true; }
    if (warState) { botSay(ch, '⚔️ Zaten savaş var!'); return true; }
    warState = { a: my[0], b: target[0], ta: 0, tb: 0, until: Date.now() + 30000 };
    botSay(ch, `⚔️ SAVAŞ BAŞLADI: ${my[1].name} vs ${target[1].name}! 30 sn boyunca !destek 20 yazarak klanına coin bas! 💪`);
    setTimeout(() => {
      if (!warState) return;
      const w = warState; warState = null;
      const ca = meta.clans[w.a], cb = meta.clans[w.b];
      if (!ca || !cb) return;
      if (w.ta === w.tb) { botSay(ch, `⚔️ Savaş BERABERE: ${w.ta}-${w.tb} 🤝`); return; }
      const winC = w.ta > w.tb ? ca : cb;
      winC.wins = (winC.wins || 0) + 1;
      scheduleSave();
      winC.members.forEach((uid) => { const wu = users.get(byId.get(uid)); if (wu) addCoins(wu, 10, '⚔️ klan savaşı zaferi'); });
      botSay(ch, `⚔️ SAVAŞ BİTTİ: ${w.ta}-${w.tb} → 🏆 ${winC.name} kazandı! Üyeleri +10 🪙`);
    }, 30000);
    return true;
  }
  if (cmd.startsWith('!destek')) {
    if (!warState) { botSay(ch, '⚔️ Şu an savaş yok'); return true; }
    if (!my || (my[0] !== warState.a && my[0] !== warState.b)) { botSay(ch, '⚔️ Bu savaşta klanın yok'); return true; }
    const n = parseInt((text.match(/\d+/) || [0])[0], 10);
    const p = profileOf(u.id);
    if (!n || p.coins < n) { botSay(ch, '⚔️ Geçerli bir miktar yaz (coinin yetmeli)'); return true; }
    p.coins -= n;
    if (my[0] === warState.a) warState.ta += n; else warState.tb += n;
    scheduleSave(); sendWallet(u);
    const ca = meta.clans[warState.a], cb = meta.clans[warState.b];
    botSay(ch, `💪 ${u.name} +${n} bastı! Durum: ${ca ? ca.name : '?'} ${warState.ta} - ${warState.tb} ${cb ? cb.name : '?'}`);
    return true;
  }
  if (cmd === '!muzayede') {
    if (auctionState) { botSay(ch, '🎪 Zaten müzayede var!'); return true; }
    const prize = Math.random() < 0.5 ? { kind: 'coins', amount: 100 } : { kind: 'item', id: ['b_dia', 't_kral', 'f_rain', 'n_rain', 'b_goat'][Math.floor(Math.random() * 5)] };
    auctionState = { bid: 0, bidder: null, prize, until: Date.now() + 30000 };
    const pl = prize.kind === 'coins' ? `💰 ${prize.amount} 🪙` : '🎁 ' + (SHOP.find((s) => s.id === prize.id) || {}).label;
    botSay(ch, `🎪 MÜZAYEDE! Ödül: ${pl} • 30 sn • Teklif: !teklif 50`);
    setTimeout(() => {
      if (!auctionState) return;
      const a = auctionState; auctionState = null;
      if (!a.bidder) { botSay(ch, '🎪 Müzayede alıcısız kapandı 😴'); return; }
      const wu = users.get(byId.get(a.bidder));
      if (!wu) { botSay(ch, '🎪 Kazanan ayrıldı, ödül yandı 💨'); return; }
      const wp = profileOf(wu.id);
      if (wp.coins < a.bid) { botSay(ch, `🎪 ${wu.name} coin yetiremedi, ödül yandı 💸`); return; }
      wp.coins -= a.bid;
      if (a.prize.kind === 'coins') wp.coins += a.prize.amount;
      else wp.owned.push(a.prize.id);
      scheduleSave(); sendWallet(wu);
      const pl = a.prize.kind === 'coins' ? a.prize.amount + ' 🪙' : (SHOP.find((s) => s.id === a.prize.id) || {}).label;
      botSay(ch, `🎪 ${wu.name}, ${a.bid} 🪙'ye kazandı! Ödül: ${pl} 🎉`);
    }, 30000);
    return true;
  }
  if (cmd.startsWith('!teklif')) {
    if (!auctionState) { botSay(ch, '🎪 Müzayede yok'); return true; }
    const n = parseInt((text.match(/\d+/) || [0])[0], 10);
    if (!n || n <= auctionState.bid) { botSay(ch, `🎪 En az ${auctionState.bid + 1} teklif et!`); return true; }
    const p = profileOf(u.id);
    if (p.coins < n) { botSay(ch, '🎪 O kadar coinin yok!'); return true; }
    auctionState.bid = n; auctionState.bidder = u.id;
    botSay(ch, `🎪 ${u.name} ${n} 🪙 dedi! Başka? ⏳`);
    return true;
  }
  if (cmd.startsWith('!yagmur')) {
    if (!isOwner(u)) { botSay(ch, '🌧️ Bunu sadece sahip yapar!'); return true; }
    const n = parseInt((text.match(/\d+/) || [0])[0], 10) || 5;
    const online = [...users.values()];
    const p = profileOf(u.id);
    if (p.coins < n * online.length) { botSay(ch, `🌧️ ${online.length} kişiyiz, toplam ${n * online.length} 🪙 lazım!`); return true; }
    p.coins -= n * online.length;
    scheduleSave();
    broadcast({ t: 'fx', kind: 'para' });
    online.forEach((ou) => { addCoins(ou, n, '🌧️ coin yağmuru'); });
    botSay(ch, `🌧️ ${u.name} coin yağmuru başlattı! Herkese +${n} 🪙`);
    return true;
  }
  return false;
}

function trySov(u, cmd, ch) {
  const s = SOVS[cmd.slice(1)];
  if (!s) return false;
  const p = profileOf(u.id);
  if (p.coins < s.cost) { botSay(ch, `${s.label} için ${s.cost} 🪙 lazım (sende ${p.coins})!`); return true; }
  addCoins(u, -s.cost, '');
  broadcast({ t: 'fx', kind: cmd.slice(1), by: u.name });
  botSay(ch, s.msg(u.name) + ` (-${s.cost} 🪙)`);
  if (!p.ach.includes('showman')) {
    p.ach.push('showman');
    const w = byId.get(u.id); if (w) send(w, { t: 'toast', text: '🏅 Başarım: 🎆 İlk Şov!' });
    scheduleSave();
  }
  return true;
}

function sendWallet(u) {
  const p = profileOf(u.id);
  const ws = byId.get(u.id);
  if (ws) send(ws, { t: 'coins', coins: p.coins, owned: p.owned, xp: p.xp, level: levelOf(p), quests: p.quests, ach: p.ach });
}
function checkAch(u) {
  const p = profileOf(u.id);
  const give = (id) => {
    if (!p.ach.includes(id)) {
      p.ach.push(id);
      const ws = byId.get(u.id);
      if (ws) send(ws, { t: 'toast', text: `🏅 Başarım açıldı: ${ACH[id]}!` });
      scheduleSave();
    }
  };
  if ((p.msgs || 0) >= 1) give('first_msg');
  if ((p.msgs || 0) >= 100) give('chatty');
  if (p.coins >= 100) give('rich100');
  if (p.coins >= 1000) give('rich1000');
  if (levelOf(p) >= 5) give('lvl5');
  if ((p.wins || 0) >= 1) give('gamer');
}
function qBump(u, key, n = 1) {
  const p = profileOf(u.id);
  const today = new Date().toDateString();
  if (!p.quests || p.quests.date !== today) p.quests = { date: today, c: {}, claimed: [] };
  p.quests.c[key] = (p.quests.c[key] || 0) + n;
  scheduleSave();
  sendWallet(u);
}
function winGame(u) {
  const p = profileOf(u.id);
  p.wins = (p.wins || 0) + 1;
  qBump(u, 'wins');
  checkAch(u);
}
function gainXp(u, n) {
  const p = profileOf(u.id);
  const l0 = levelOf(p);
  p.xp = (p.xp || 0) + n;
  const l1 = levelOf(p);
  scheduleSave();
  if (l1 > l0) {
    botSay(u.channelId, `📈 ${u.name} SEVİYE ${l1} oldu! Saygılar 🫡`);
    const ws = byId.get(u.id);
    if (ws) send(ws, { t: 'toast', text: `📈 Seviye atladın: ${l1}!` });
    checkAch(u);
  }
  sendWallet(u);
}
function publicUser(u) {
  return { id: u.id, name: u.name, color: u.color, channelId: u.channelId, voiceId: u.voiceId, muted: u.muted, role: u.role, presence: u.presence || 'online', timedOut: !!(meta.timeouts && meta.timeouts[u.id] && Date.now() < meta.timeouts[u.id]), roleId: (meta.userRoles || {})[u.id] || null, profile: publicProfile(profileOf(u.id), u.id) };
}
function addCoins(u, n, why) {
  const p = profileOf(u.id);
  p.coins = Math.max(0, p.coins + n);
  scheduleSave();
  const ws = byId.get(u.id);
  if (ws) send(ws, { t: 'coins', coins: p.coins });
  if (why) botSay(u.channelId, `🪙 ${u.name} ${n > 0 ? '+' + n : n} KankaCoin — ${why}`);
}
const allUsers = () => [...users.values()].map(publicUser);
const textChannel = (id) => channels.find((c) => c.id === id && c.type === 'text');
const watchChannel = (id) => channels.find((c) => c.id === id && c.type === 'watch');
const anyTextish = (id) => textChannel(id) || watchChannel(id);
const watchSec = (s) => s ? (s.paused != null ? s.paused : Math.max(0, Math.floor((Date.now() - s.wall) / 1000))) : 0;
const voiceChannel = (id) => channels.find((c) => c.id === id && c.type === 'voice');
const voiceUsersOf = (vid) => [...users.values()].filter((u) => u.voiceId === vid);
const isOwner = (u) => u && u.id === meta.ownerId;
const dmPartner = (dmId, meId) => dmId.split(':').slice(1).find((x) => x !== meId);
const trLow = (s) => s.toLocaleLowerCase('tr');

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
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
  if (channelId.startsWith('dm:')) {
    const other = dmPartner(channelId, msg.uid || '');
    broadcast({ t: 'tick', channelId }, (u) => u.id === other && u.channelId !== channelId);
  } else {
    broadcast({ t: 'tick', channelId }, (u) => u.channelId !== channelId);
  }
  return msg;
}
function findMsg(channelId, msgId) { return (messages[channelId] || []).find((m) => m.id === msgId); }
const BOT = { uid: 'bot', name: 'KankaBot', color: '#f0b232' };
const botSay = (chId, text, extra) => pushMessage(chId, Object.assign({ id: rid(), ...BOT, text, ts: Date.now() }, extra || {}));

/* ---------------- BOT + OYUNLAR + AI ---------------- */
const EIGHTBALL = ['Kesinlikle evet 😎', 'Hayır, hiç şansın yok 💀', 'Kankana sor, o bilir 🤔', 'Yıldızlar evet diyor ✨', 'Bugün olmaz, yarın dene 😴', '%100 evet 🔥', 'Rüyanda görürsün 😂', 'Bence yap, pişman olma 🚀', 'Ters gidebilir, dikkat ⚠️', 'Coin kas da gel 🪙'];
const QUIZ = [
  { q: 'Türkiye’nin başkenti?', a: 'ankara' },
  { q: 'En büyük gezegen?', a: 'jüpiter' },
  { q: 'Mona Lisa’yı kim çizdi?', a: 'leonardo' },
  { q: '1 kg kaç gram?', a: '1000' },
  { q: 'Hangi hayvan kükür? a) kedi b) aslan c) köpek', a: 'aslan' },
  { q: 'Türkiye’nin en uzun nehri?', a: 'kızılırmak' },
  { q: 'İnsanda yaklaşık kaç kemik? a) 206 b) 100 c) 300', a: '206' },
  { q: 'Sarı + mavi = ?', a: 'yeşil' },
  { q: 'Ay’a ilk ayak basan insan?', a: 'armstrong' },
  { q: 'En hızlı kara hayvanı?', a: 'çita' },
];
const HANG_WORDS = ['karpuz', 'kelebek', 'bilgisayar', 'merdiven', 'pencere', 'trabzon', 'yildiz', 'kaplumbaga', 'simsek', 'portakal', 'kutuphane', 'motosiklet'];
const ANA_WORDS = ['kalem', 'deniz', 'orman', 'gunes', 'cicek', 'kitap', 'radyo', 'masa', 'bulut', 'tavsan'];
const SONGS = [
  { e: '🎩🕺', a: ['şımarık', 'simarik', 'tarkan'] },
  { e: '🌹', a: ['gülümse', 'gulümse', 'sezen aksu'] },
  { e: '🚂💨', a: ['kara tren'] },
  { e: '⛰️⛰️', a: ['dağlar', 'daglar', 'barış manço', 'baris manco'] },
  { e: '🌙', a: ['ay ışığı', 'ay isigi', 'mfö', 'mazhar'] },
];
const FILMS = [
  { e: '🦁👑', a: ['aslan kral', 'lion king'] },
  { e: '🕷️', a: ['örümcek adam', 'spider man', 'spiderman'] },
  { e: '❄️👸', a: ['karlar ülkesi', 'frozen'] },
  { e: '🧙💍', a: ['yüzüklerin efendisi', 'lotr'] },
  { e: '🚢🧊', a: ['titanik', 'titanic'] },
  { e: '🦖️', a: ['jurassic park', 'jurassic'] },
  { e: '🐠🔍', a: ['kayıp balık nemo', 'nemo'] },
  { e: '🧸📖', a: ['oyuncak hikayesi', 'toy story'] },
  { e: '👻🚫', a: ['hayalet avcısı', 'ghostbusters'] },
];
const norm = (s) => trLow(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const hangState = {}, numState = {}, filmState = {};

/* ---------------- KankaAI ---------------- */
async function aiFetch(q, mem) {
  const hist = (mem || []).slice(-6);
  const body = JSON.stringify({
    messages: [
      { role: 'system', content: 'Sen KankaAI: SADECE TÜRKÇE konuşan, samimi ama BİLGİLİ bir asistansın. Kısa ve öz cevap ver (en fazla 3-4 cümle). Önceki konuşmayı hatırla ve bağlama uygun cevap ver. Emin değilsen uydurma, "tam bilmiyorum" de. Kankalara "kanka" diye hitap et. Matematik/genel kültür sorularını doğru cevapla.' },
      ...hist,
      { role: 'user', content: q },
    ], model: 'openai',
  });
  for (let i = 0; i < 3; i++) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 20000);
      const res = await fetch('https://text.pollinations.ai/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctl.signal });
      clearTimeout(to);
      const txt = (await res.text() || '').trim();
      if (res.ok && txt && !txt.startsWith('{"error')) return txt;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 2500));
  }
  return null;
}
async function wikiFetch(q) {
  try {
    const s = 'https://tr.wikipedia.org/w/api.php?action=opensearch&search=' + encodeURIComponent(q) + '&limit=1&format=json&origin=*';
    const r = await fetch(s);
    const j = await r.json();
    const title = j && j[1] && j[1][0];
    if (!title) return null;
    const r2 = await fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
    const j2 = await r2.json();
    return j2 && j2.extract ? `📚 ${title}: ${j2.extract}` : null;
  } catch (_) { return null; }
}
async function askAI(u, q, chId) {
  const ch = chId || u.channelId;
  const p = profileOf(u.id);
  if (!p.ach.includes('ai_friend')) {
    p.ach.push('ai_friend');
    const w0 = byId.get(u.id); if (w0) send(w0, { t: 'toast', text: '🏅 Başarım: 🤖 AI Dostu!' });
    scheduleSave();
  }
  if (!meta.aiMem) meta.aiMem = {};
  const mem = meta.aiMem[ch] || (meta.aiMem[ch] = []);
  const nq = norm(q);
  // selam-sabah modu: saçmalama garantili 🙂
  if (/^(merhaba|selam|naber|nasilsin|nasılsın|hey|günaydın|gunaydin|iyi aksamlar)$/.test(nq) || nq.includes('merhaba') || nq.includes('selam')) { botSay(ch, '✨ KankaAI: Merhaba kanka! 👋 Bugün coin kasacak mıyız? 😎'); return; }
  if (nq.includes('nasılsın') || nq.includes('nasilsin')) { botSay(ch, '✨ KankaAI: Süperim kanka, sunucu tıkırında! 😎 Sen nasılsın?'); return; }
  if (nq.includes('kimsin') || nq.includes('nesin') || nq.includes('ne yapabilirsin')) { botSay(ch, '✨ KankaAI: Ben KankaChat’in yapay zekasıyım 🤖 Soruları cevaplarım, kankaları aydınlatırım. #ai kanalına ya da !ai <soru> yaz!'); return; }
  if (nq.includes('teşekkür') || nq.includes('tesekkur') || nq.includes('eyvallah')) { botSay(ch, '✨ KankaAI: Rica ederim kanka 💙'); return; }

  let txt = await aiFetch(q, mem);
  if (txt) botSay(ch, '✨ KankaAI: ' + txt.slice(0, 600));
  else {
    const w = await wikiFetch(q);
    if (w) { txt = w; botSay(ch, '✨ KankaAI (bilgi modu 📚): ' + w.slice(0, 600)); }
    else botSay(ch, '✨ KankaAI: Bunu tam bilemedim kanka 😅 Daha açık yazar mısın? (Örn: "Konya neresi?")');
  }
  mem.push({ role: 'user', content: q });
  if (txt) mem.push({ role: 'assistant', content: txt.slice(0, 400) });
  if (mem.length > 8) mem.splice(0, mem.length - 8);
}

function stopAllGames(ch) {
  if (chainState[ch]) chainState[ch].active = false;
  if (quizState[ch]) quizState[ch].active = false;
  if (hangState[ch]) hangState[ch].active = false;
  if (numState[ch]) numState[ch].active = false;
  if (filmState[ch]) filmState[ch].active = false;
  if (anaState[ch]) anaState[ch].active = false;
  if (matState[ch]) matState[ch].active = false;
  if (songState[ch]) songState[ch].active = false;
}

function runBot(u, text) {
  const ch = u.channelId;
  const cmd = trLow(text).trim();
  if (cmd.startsWith('!zar')) {
    const sides = parseInt((text.match(/\d+/) || [6])[0], 10) || 6;
    botSay(ch, `🎲 ${u.name} zar attı: **${1 + Math.floor(Math.random() * sides)}** (${sides} yüzlü)`);
  } else if (cmd.startsWith('!8ball')) {
    const q = text.slice(6).trim();
    botSay(ch, `🎱 “${q || '?'}” → ${EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)]}`);
  } else if (cmd.startsWith('!oylama')) {
    const q = text.slice(7).trim() || 'Oylama!';
    botSay(ch, `📊 OYLAMA: ${q}`, { poll: { q }, reactions: { '👍': [], '👎': [] } });
  } else if (cmd.startsWith('!xo')) {
    botSay(ch, `🕹️ X-O mücadelesi! ${u.name} rakip bekliyor… (kareye tıkla, katıl!) Kazanana +3 🪙`, { game: { type: 'xo', board: Array(9).fill(null), players: [u.id], names: [u.name], turn: 0, active: true, winner: null } });
  } else if (cmd.startsWith('!zincir')) {
    if (chainState[ch] && chainState[ch].active) { chainState[ch].active = false; botSay(ch, '🛑 Kelime zinciri bitti!'); }
    else { chainState[ch] = { active: true, last: null, lastUid: null }; botSay(ch, '🔗 KELİME ZİNCİRİ başladı! Kabul edilen kelime +1 🪙 (bitirmek için: !durdur)'); }
  } else if (cmd.startsWith('!durdur')) {
    stopAllGames(ch);
    botSay(ch, '🛑 Bu kanaldaki tüm oyunlar durduruldu.');
  } else if (cmd.startsWith('!adam')) {
    const word = HANG_WORDS[Math.floor(Math.random() * HANG_WORDS.length)];
    hangState[ch] = { word, guessed: [], wrong: 0, active: true };
    botSay(ch, `🪢 ADAM ASMACA! ${word.length} harf. Tek harf yaz ya da “!kelime tahmin” de. 6 hak ❤️ (+4 🪙)`);
  } else if (cmd.startsWith('!sayi')) {
    numState[ch] = { n: 1 + Math.floor(Math.random() * 100), tries: 0, active: true };
    botSay(ch, '🔢 1-100 arası sayı tuttum! Sayı yaz, yukarı/aşağı diyeyim. Bilene +4 🪙');
  } else if (cmd.startsWith('!film')) {
    const f = FILMS[Math.floor(Math.random() * FILMS.length)];
    filmState[ch] = { a: f.a, active: true };
    botSay(ch, `🎬 EMOJİ FİLM: ${f.e} — hangi film? Yaz! (+4 🪙)`);
  } else if (cmd.startsWith('!anagram')) {
    const word = ANA_WORDS[Math.floor(Math.random() * ANA_WORDS.length)];
    anaState[ch] = { word, active: true };
    botSay(ch, `🔀 ANAGRAM: “${scramble(word)}” harflerinden kelimeyi çöz! (+3 🪙)`);
  } else if (cmd.startsWith('!mat')) {
    const a = 2 + Math.floor(Math.random() * 12), b = 2 + Math.floor(Math.random() * 12);
    const op = ['+', '-', 'x'][Math.floor(Math.random() * 3)];
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    matState[ch] = { ans, active: true };
    botSay(ch, `➗ MATEMATİK: ${a} ${op} ${b} = ? (cevabı sayı olarak yaz, +2 🪙)`);
  } else if (cmd.startsWith('!sarki')) {
    const s = SONGS[Math.floor(Math.random() * SONGS.length)];
    songState[ch] = { a: s.a, active: true };
    botSay(ch, `🎵 EMOJİ ŞARKI: ${s.e} — hangi şarkı/sanatçı? (+3 🪙)`);
  } else if (cmd.startsWith('!tkm')) {
    const pick = (t) => t.includes('taş') || t.includes('tas') ? 'taş' : t.includes('kağıt') || t.includes('kagit') ? 'kağıt' : t.includes('makas') ? 'makas' : null;
    const uPick = pick(trLow(text));
    if (!uPick) { botSay(ch, '✂️ Kullanım: !tkm taş / kağıt / makas (kazanana +2 🪙)'); return; }
    const opts = ['taş', 'kağıt', 'makas'];
    const bPick = opts[Math.floor(Math.random() * 3)];
    const beats = { 'taş': 'makas', 'kağıt': 'taş', 'makas': 'kağıt' };
    if (uPick === bPick) botSay(ch, `✂️ Berabere: ${uPick} = ${bPick} 🤝`);
    else if (beats[uPick] === bPick) { botSay(ch, `✂️ KAZANDIN! ${uPick} > ${bPick} 🎉`); addCoins(u, 2, '✂️ TKM zaferi'); winGame(u); }
    else botSay(ch, `✂️ Kaybettin: ${uPick} < ${bPick} 🤖`);
  } else if (cmd.startsWith('!rulet')) {
    const parts = text.split(/\s+/);
    const amount = parseInt((parts[1] || '').match(/\d+/) || [0], 10) || 0;
    const bet = trLow(parts[2] || '');
    const p = profileOf(u.id);
    if (!amount || !['kırmızı', 'kirmizi', 'siyah', 'yeşil', 'yesil'].includes(bet) || p.coins < amount) {
      botSay(ch, '🎡 Kullanım: !rulet 10 kırmızı|siyah|yeşil (kırmızı/siyah x2, yeşil x10)'); return;
    }
    addCoins(u, -amount, '');
    const n = Math.floor(Math.random() * 15); // 0-14; 0=yeşil, tek=kırmızı, çift=siyah
    const color = n === 0 ? 'yeşil' : n % 2 === 1 ? 'kırmızı' : 'siyah';
    const betN = bet.startsWith('kır') || bet.startsWith('kir') ? 'kırmızı' : bet.startsWith('siyah') ? 'siyah' : 'yeşil';
    if (color === betN) {
      const mult = betN === 'yeşil' ? 10 : 2;
      addCoins(u, amount * mult, `🎡 RULET ${color} → x${mult}!`);
    } else botSay(ch, `🎡 Top ${color} geldi — kaybettin 💸 (-${amount})`);
  } else if (cmd.startsWith('!havai')) {
    trySov(u, '!havai', ch);
  } else if (cmd.startsWith('!cevir')) {
    const p = profileOf(u.id);
    const today = new Date().toDateString();
    if (p.lastSpin === today) { botSay(ch, '🎡 Çark günde bir kez döner! Yarın gel 😄'); return; }
    p.lastSpin = today;
    const r = Math.random();
    const gain = r < 0.05 ? 50 : r < 0.25 ? 20 : r < 0.6 ? 8 : 3;
    p.coins += gain;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🎡 ${u.name} çarkı çevirdi: ${gain === 50 ? '🌟 JACKPOT +50 🪙!!' : '+' + gain + ' 🪙'}`);
    checkAch(u);
  } else if (cmd.startsWith('!lider')) {
    const rows = Object.entries(meta.profiles).map(([id, pp]) => ({ id, c: pp.coins || 0, l: levelOf(pp), x: pp.xp || 0 }));
    const topC = [...rows].sort((a, b) => b.c - a.c).slice(0, 5).map((r2, i) => `${i + 1}. ${meta.known[r2.id] ? meta.known[r2.id].name : '?'} 🪙${r2.c}`).join('  ');
    const topL = [...rows].sort((a, b) => b.x - a.x).slice(0, 5).map((r2, i) => `${i + 1}. ${meta.known[r2.id] ? meta.known[r2.id].name : '?'} Lv${r2.l}`).join('  ');
    botSay(ch, `🏆 LİDERLER — 💰 ${topC}  •  📈 ${topL}`);
  } else if (cmd.startsWith('!gonder')) {
    const amount = parseInt((text.match(/\d+/) || [0])[0], 10);
    const namePart = text.replace(/!gonder/i, '').replace(/\d+/g, '').replace(/@/g, '').trim();
    const tn = trLow(namePart);
    const target = allUsers().find((x) => trLow(x.name) === tn) || null;
    const tUid = target ? target.id : Object.entries(meta.known).find(([id, k]) => trLow(k.name) === tn)?.[0];
    const p = profileOf(u.id);
    if (!amount || amount < 1 || !tUid || tUid === u.id) { botSay(ch, '🤝 Kullanım: !gonder 20 @isim'); return; }
    if (p.coins < amount) { botSay(ch, `🤝 O kadar coinin yok (sende ${p.coins})`); return; }
    p.coins -= amount;
    const tp = profileOf(tUid);
    tp.coins += amount;
    scheduleSave(); sendWallet(u);
    const tw = byId.get(tUid); if (tw) sendWallet(users.get(tw));
    botSay(ch, `🤝 ${u.name} → ${meta.known[tUid] ? meta.known[tUid].name : '?'} kişisine ${amount} 🪙 gönderdi!`);
    if (tw) send(tw, { t: 'toast', text: `🤝 ${u.name} sana ${amount} 🪙 gönderdi!` });
  } else if (runMod(u, cmd, text, ch)) {
    /* moderasyon */
  } else if (runSocial(u, cmd, text, ch)) {
    /* sosyal paket */
  } else if (runEco(u, cmd, text, ch)) {
    /* ekonomi paketi işlendi */
  } else if (cmd === '!sovlar') {
    botSay(ch, '🎆 ŞOVLAR: ' + Object.entries(SOVS).map(([k, s]) => `!${k} → ${s.cost}🪙 ${s.label}`).join(' • '));
  } else if (trySov(u, cmd, ch)) {
    /* şov işlendi */
  } else if (cmd.startsWith('!yarisma')) {
    const item = QUIZ[Math.floor(Math.random() * QUIZ.length)];
    quizState[ch] = { a: norm(item.a), active: true };
    botSay(ch, `🧠 YARIŞMA: ${item.q} — cevabı yaz, ilk bilen +5 🪙!`);
  } else if (cmd.startsWith('!maden')) {
    const p = profileOf(u.id);
    const now = Date.now();
    if (now - p.lastMine < 300000) { botSay(ch, `⛏️ Maden yorgun! ${Math.ceil((300000 - (now - p.lastMine)) / 60000)} dk sonra tekrar kaz.`); return; }
    p.lastMine = now;
    const gain = 1 + Math.floor(Math.random() * 3);
    botSay(ch, `⛏️ ${u.name} madenden ${gain} 🪙 çıkardı (5 dk bekleme — kolay yok öyle 😏)`);
    addCoins(u, gain, '');
  } else if (cmd.startsWith('!slot')) {
    const p = profileOf(u.id);
    if (p.coins < 5) { botSay(ch, '🎰 Slot için 5 🪙 lazım, git maden kaz ⛏️'); return; }
    addCoins(u, -5, '');
    const S = ['🍒', '🍋', '💎', '7️⃣', '🍀'];
    const r = [0, 0, 0].map(() => S[Math.floor(Math.random() * S.length)]);
    let win = 0;
    if (r[0] === r[1] && r[1] === r[2]) win = r[0] === '7️⃣' ? 50 : 25;
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) win = 10;
    if (win) addCoins(u, win, `🎰 SLOT ${r.join('')} → +${win} 🪙!`);
    else botSay(ch, `🎰 ${r.join(' ')} → olmadı 💸 (-5)`);
  } else if (cmd.startsWith('!duello')) {
    const amount = parseInt((text.match(/\d+/) || [0])[0], 10) || 10;
    const p = profileOf(u.id);
    if (p.coins < amount) { botSay(ch, `⚔️ Cüzdanında ${amount} 🪙 yok!`); return; }
    duelState[ch] = { from: u.id, name: u.name, amount };
    botSay(ch, `⚔️ ${u.name}, ${amount} 🪙'ye DÜELLO istiyor! Kabul eden kanka !kabul yazsın (30 sn)`);
    setTimeout(() => { if (duelState[ch] && duelState[ch].from === u.id) { duelState[ch] = null; } }, 30000);
  } else if (cmd === '!kabul') {
    const d = duelState[ch];
    if (!d || d.from === u.id) return;
    const pf = profileOf(u.id);
    const po = profileOf(d.from);
    if (pf.coins < d.amount || po.coins < d.amount) { botSay(ch, '⚔️ Birinizin coini yetmiyor!'); duelState[ch] = null; return; }
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
    addCoins(u, -d.amount, ''); 
    const ow = byId.get(d.from); if (ow) { const ou = users.get(ow); if (ou) addCoins(ou, -d.amount, ''); }
    duelState[ch] = null;
    if (a === b) {
      botSay(ch, `⚔️ ${d.name}: ${a} vs ${b} :${u.name} — BERABERE, coinler iade 🤝`);
      addCoins(u, d.amount, ''); const ow2 = byId.get(d.from); if (ow2) { const ou = users.get(ow2); if (ou) addCoins(ou, d.amount, ''); }
    } else {
      const wUid = a > b ? d.from : u.id;
      const wu = users.get(byId.get(wUid));
      botSay(ch, `⚔️ DÜELLO: ${d.name} 🎲${a} vs 🎲${b} ${u.name} → 🏆 ${wu ? wu.name : '?'} kazandı (+${d.amount * 2} 🪙)!`);
      if (wu) { addCoins(wu, d.amount * 2, '⚔️ düello zaferi'); winGame(wu); }
    }
  } else if (cmd.startsWith('!bahis')) {
    const amount = parseInt((text.match(/\d+/) || [0])[0], 10);
    const p = profileOf(u.id);
    if (!amount || amount < 5) { botSay(ch, '🎰 Kullanım: !bahis 50 (en az 5 🪙)'); return; }
    if (p.coins < amount) { botSay(ch, `🎰 O kadar coinin yok! (sende ${p.coins} 🪙) Git maden kaz ⛏️`); return; }
    if (Math.random() < 0.5) { addCoins(u, amount, '🎰 bahsi KAZANDI (x2)!'); }
    else { addCoins(u, -amount, '🎰 bahis kaybetti 💸'); }
  } else if (cmd.startsWith('!puan')) {
    const top = Object.entries(meta.scores || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, pt], i) => `${i + 1}. ${meta.known[id] ? meta.known[id].name : id} — ${pt}`).join('  |  ');
    botSay(ch, `🏆 PUAN: ${top || 'yok'}  •  🪙 cüzdanın: ${profileOf(u.id).coins}`);
  } else if (cmd.startsWith('!market') || cmd.startsWith('!magaza')) {
    botSay(ch, '🛒 Mağaza: sol alttaki ismine/coin kutusuna tıkla! Coin: !maden !yarisma !xo !zincir !adam !sayi !film !bahis');
  } else if (cmd.startsWith('!ai ')) {
    askAI(u, text.slice(4).trim(), ch);
  } else if (cmd.startsWith('!yardim') || cmd === '!help') {
    botSay(ch, '🤖 Oyunlar: !xo !zincir !adam !sayi !film !sarki !anagram !mat !tkm !rulet !yarisma !oylama !zar !8ball • Ekonomi: !maden !bahis !cevir !gonder !lider !puan • Klan: !klankur !klan !savas !muzayede !yagmur • Sosyal: !teklif !evet !bosan !gazete • 🏪 Pazar: profilde/⋯ • Şovlar: !sovlar • AI: !ai <soru> veya #ai • !durdur');
  }
}

function checkGames(u, text) {
  if (text.startsWith('!')) return;
  const low = trLow(text.trim());

  // adam asmaca
  const hg = hangState[ch];
  if (hg && hg.active) {
    if (low.startsWith('!kelime ')) {
      const guess = norm(low.slice(8));
      if (guess === hg.word) { hg.active = false; botSay(ch, `🪢 BİLDİN! Kelime “${hg.word}” idi 🎉`); addCoins(u, 4, '🪢 adam asmaca'); winGame(u); }
      else {
        hg.wrong++;
        botSay(ch, `❌ “${guess}” değil! ${'❤️'.repeat(Math.max(0, 6 - hg.wrong))}${'🖤'.repeat(Math.min(6, hg.wrong))}`);
        if (hg.wrong >= 6) { hg.active = false; botSay(ch, `💀 Adam asıldı! Kelime: “${hg.word}”`); }
      }
      return;
    }
    const letter = norm(low).split(' ')[0];
    if (letter && letter.length === 1) {
      if (hg.guessed.includes(letter)) { botSay(ch, `♻️ “${letter}” zaten denendi.`); return; }
      hg.guessed.push(letter);
      if (hg.word.includes(letter)) {
        if (![...hg.word].some((c) => !hg.guessed.includes(c))) { hg.active = false; botSay(ch, `🪢 BİLDİN! “${hg.word}” 🎉`); addCoins(u, 4, '🪢 adam asmaca'); winGame(u); }
        else botSay(ch, `✅ “${letter}” var! → ${[...hg.word].map((c) => (hg.guessed.includes(c) ? c : '_')).join(' ')}`);
      } else {
        hg.wrong++;
        botSay(ch, `❌ “${letter}” yok! ${'❤️'.repeat(Math.max(0, 6 - hg.wrong))}${'🖤'.repeat(Math.min(6, hg.wrong))}`);
        if (hg.wrong >= 6) { hg.active = false; botSay(ch, `💀 Adam asıldı! Kelime: “${hg.word}”`); }
      }
      return;
    }
    return;
  }

  // sayı tahmini
  const ns = numState[ch];
  if (ns && ns.active) {
    const g = parseInt((low.match(/\d+/) || [NaN])[0], 10);
    if (!isNaN(g)) {
      ns.tries++;
      if (g === ns.n) { ns.active = false; botSay(ch, `🔢 BİLDİN! ${ns.n} idi (${ns.tries} deneme) 🎉`); addCoins(u, 4, '🔢 sayı tahmini'); winGame(u); }
      else botSay(ch, g < ns.n ? '⬆️ Daha BÜYÜK!' : '⬇️ Daha küçük!');
      return;
    }
    return;
  }

  // anagram
  const an = anaState[ch];
  if (an && an.active) {
    if (norm(low) === an.word) { an.active = false; botSay(ch, `🔀 BİLDİN! “${an.word}” 🎉`); addCoins(u, 3, '🔀 anagram'); winGame(u); }
    return;
  }

  // matematik
  const mt = matState[ch];
  if (mt && mt.active) {
    const g = parseInt((low.match(/-?\d+/) || [NaN])[0], 10);
    if (!isNaN(g)) {
      if (g === mt.ans) { mt.active = false; botSay(ch, `➗ DOĞRU! ${g} 🎉`); addCoins(u, 2, '➗ matematik'); winGame(u); }
      else botSay(ch, '❌ Olmadı, tekrar dene!');
      return;
    }
    return;
  }

  // emoji şarkı
  const sg = songState[ch];
  if (sg && sg.active) {
    if (sg.a.some((a) => norm(low).includes(norm(a)))) {
      sg.active = false;
      botSay(ch, `🎵 DOĞRU! ${sg.a[0]} 🎧`);
      addCoins(u, 3, '🎵 şarkı bildi'); winGame(u);
    }
    return;
  }

  // emoji film
  const fs2 = filmState[ch];
  if (fs2 && fs2.active) {
    if (fs2.a.some((a) => norm(low).includes(norm(a)))) {
      fs2.active = false;
      botSay(ch, `🎬 DOĞRU! ${fs2.a[0]} 🍿`);
      addCoins(u, 4, '🎬 film bildi'); winGame(u);
    }
    return;
  }

  // kelime zinciri
  const cs = chainState[ch];
  if (cs && cs.active) {
    const word = norm(low).split(' ')[0];
    if (!word) return;
    if (cs.lastUid === u.id) { botSay(ch, `✋ Sıra sende değil ${u.name}!`); return; }
    if (cs.last && word[0] !== cs.last.slice(-1)) { botSay(ch, `❌ “${word}” olmaz — “${cs.last.slice(-1)}” ile başlamalıydı!`); return; }
    cs.last = word; cs.lastUid = u.id;
    addCoins(u, 1, '🔗 zincir kelimesi');
    return;
  }

  // yarışma
  const qz = quizState[ch];
  if (qz && qz.active) {
    if (norm(low).includes(qz.a) && qz.a.length > 2) {
      qz.active = false;
      meta.scores[u.id] = (meta.scores[u.id] || 0) + 1;
      meta.known[u.id] = meta.known[u.id] || { name: u.name, color: u.color };
      scheduleSave();
      botSay(ch, `🎉 DOĞRU! ${u.name} bildi (+1 puan)`);
      addCoins(u, 5, '🧠 yarışma ödülü'); winGame(u);
    }
  }
}
/* ---------------- HTTP ---------------- */
async function uploadToGitHub(buf, fname) {
  const tok = process.env.REPO_TOKEN;
  if (!tok) return null;
  const repo = process.env.GH_REPO || 'kralinyo50-blip/kankachat';
  const H = { Authorization: 'token ' + tok, 'User-Agent': 'kankachat', Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  try {
    const blob = await (await fetch('https://api.github.com/repos/' + repo + '/git/blobs', { method: 'POST', headers: H, body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' }) })).json();
    if (!blob.sha) return null;
    const ref = await (await fetch('https://api.github.com/repos/' + repo + '/git/ref/heads/media', { headers: H })).json();
    let baseSha = null, baseTree = null;
    if (ref && ref.object && ref.object.sha) {
      baseSha = ref.object.sha;
      const com = await (await fetch('https://api.github.com/repos/' + repo + '/git/commits/' + baseSha, { headers: H })).json();
      baseTree = com.tree ? com.tree.sha : null;
    }
    if (!baseTree) {
      const et = await (await fetch('https://api.github.com/repos/' + repo + '/git/trees', { method: 'POST', headers: H, body: JSON.stringify({ tree: [] }) })).json();
      baseTree = et.sha;
    }
    const nt = await (await fetch('https://api.github.com/repos/' + repo + '/git/trees', { method: 'POST', headers: H, body: JSON.stringify({ base_tree: baseTree, tree: [{ path: 'media/' + fname, mode: '100644', type: 'blob', sha: blob.sha }] }) })).json();
    const nc = await (await fetch('https://api.github.com/repos/' + repo + '/git/commits', { method: 'POST', headers: H, body: JSON.stringify({ message: '🎬 media: ' + fname, tree: nt.sha, parents: baseSha ? [baseSha] : [] }) })).json();
    if (baseSha) await fetch('https://api.github.com/repos/' + repo + '/git/refs/heads/media', { method: 'PATCH', headers: H, body: JSON.stringify({ sha: nc.sha }) });
    else await fetch('https://api.github.com/repos/' + repo + '/git/refs', { method: 'POST', headers: H, body: JSON.stringify({ ref: 'refs/heads/media', sha: nc.sha }) });
    return 'https://raw.githubusercontent.com/' + repo + '/media/media/' + fname;
  } catch (_) { return null; }
}
async function uploadToCatbox(buf, fname) {
  try {
    const boundary = '----kankachat' + Date.now().toString(16);
    const CRLF = '\r\n';
    const parts = [];
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="reqtype"${CRLF}${CRLF}fileupload${CRLF}`));
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="fileToUpload"; filename="${fname}"${CRLF}Content-Type: application/octet-stream${CRLF}${CRLF}`));
    parts.push(buf);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));
    const body = Buffer.concat(parts);
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 45000);
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body,
      signal: ctl.signal,
    });
    clearTimeout(to);
    const txt = (await res.text() || '').trim();
    if (res.ok && txt.startsWith('https://')) return txt;
    return null;
  } catch (_) { return null; }
}
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);

    /* ---- dosya yükleme (video/dosya) ---- */
    if (req.method === 'POST' && urlPath === '/upload') {
      const chunks = []; let size = 0; let aborted = false;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_UPLOAD) { aborted = true; res.writeHead(413); res.end('çok büyük'); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', async () => {
        if (aborted) return;
        try {
          let fname = String(req.headers['x-file-name'] || 'dosya');
          try { fname = decodeURIComponent(fname); } catch (_) {}
          fname = fname.replace(/[^\w.\-ğüşıöçĞÜŞİÖÇ ]/g, '').trim().slice(0, 60) || 'dosya';
          const ext = (fname.match(/\.[a-z0-9]{1,5}$/i) || [''])[0].toLowerCase();
          const okExt = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.pdf', '.txt', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
          const safeExt = okExt.includes(ext) ? ext : '.bin';
          const buf = Buffer.concat(chunks);
          const ftype = String(req.headers['x-file-type'] || '');
          // videolar & büyük dosyalar → kalıcı bulut; küçükler local
          if (buf.length > 1_000_000) {
            const gh = await uploadToGitHub(buf, rid() + safeExt);
            if (gh) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ url: gh, name: fname, type: ftype }));
            }
            const cloud = await uploadToCatbox(buf, (fname || 'kankachat') + safeExt);
            if (cloud) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ url: cloud, name: fname, type: ftype }));
            }
          }
          const id = rid();
          fs.writeFileSync(path.join(UPLOAD_DIR, id + safeExt), buf);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url: '/uploads/' + id + safeExt, name: fname, type: ftype }));
        } catch (_) { res.writeHead(500); res.end('hata'); }
      });
      return;
    }

    /* ---- yüklenen dosyaları sun ---- */
    if (urlPath.startsWith('/uploads/')) {
      const f = path.normalize(urlPath).replace(/^([.][.][/\\])+/, '');
      const full = path.join(UPLOAD_DIR, path.basename(f));
      return fs.readFile(full, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
      });
    }

    let file = urlPath === '/' ? '/index.html' : urlPath;
    file = path.normalize(file).replace(/^([.][.][/\\])+/, '');
    const full = path.join(PUBLIC_DIR, file);
    if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('403'); }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  } catch (_) { res.writeHead(500); res.end('500'); }
});

/* ---------------- WS ---------------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 3 * 1024 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  send(ws, { t: 'hello', welcome: meta.welcome || '', banner: meta.banner || null });
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let m; try { m = JSON.parse(data.toString()); } catch (_) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    handle(ws, m).catch((e) => console.error('[hata]', e));
  });
  ws.on('close', () => cleanup(ws));
  ws.on('error', () => cleanup(ws));
});

async function handle(ws, m) {
  const u = users.get(ws);

  if (m.t === 'register') {
    const name = String(m.name || '').replace(/[\u0000-\u001f<>&]/g, '').trim().slice(0, 24);
    const email = String(m.email || '').trim().toLowerCase();
    const pass = String(m.pass || '');
    if (!name || name.length < 2) { send(ws, { t: 'reg-err', text: 'Kullanıcı adı en az 2 harf olmalı' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { send(ws, { t: 'reg-err', text: 'Geçerli bir mail gir 📧' }); return; }
    if (pass.length < 6) { send(ws, { t: 'reg-err', text: 'Şifre en az 6 karakter olmalı 🔑' }); return; }
    if (!meta.accounts) meta.accounts = {};
    if (accOf(name)) { send(ws, { t: 'reg-err', text: 'Bu kullanıcı adı alınmış 😅' }); return; }
    if (Object.values(meta.accounts).some((a) => a.email === email)) { send(ws, { t: 'reg-err', text: 'Bu mail zaten kayıtlı 📧' }); return; }
    const salt = crypto.randomBytes(8).toString('hex');
    meta.accounts[trLow(name)] = { id: 'a' + rid(), name, email, salt, hash: hashPass(pass, salt), color: COLORS.includes(m.color) ? m.color : COLORS[Math.floor(Math.random() * COLORS.length)], created: Date.now() };
    scheduleSave();
    send(ws, { t: 'reg-ok', name });
    return;
  }

  if (m.t === 'reset-request') {
    const email = String(m.email || '').trim().toLowerCase();
    const acc = Object.values(meta.accounts || {}).find((a) => a.email === email);
    if (!acc) { send(ws, { t: 'reset-err', text: 'Bu maile kayıtlı hesap yok 🤔' }); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!meta.resets) meta.resets = {};
    meta.resets[email] = { code, until: Date.now() + 10 * 60 * 1000 };
    scheduleSave();
    const sent = await sendMail(email, 'KankaChat şifre sıfırlama', 'Sıfırlama kodun: ' + code + ' (10 dk geçerli)');
    if (sent) send(ws, { t: 'reset-ok', demo: null });
    else send(ws, { t: 'reset-ok', demo: code }); // mail servisi bağlı değilse kodu ekranda göster
    return;
  }

  if (m.t === 'reset') {
    const email = String(m.email || '').trim().toLowerCase();
    const r = (meta.resets || {})[email];
    const pass = String(m.pass || '');
    if (!r || Date.now() > r.until || r.code !== String(m.code || '').trim()) { send(ws, { t: 'reset-err', text: 'Kod yanlış veya süresi dolmuş ⏰' }); return; }
    if (pass.length < 6) { send(ws, { t: 'reset-err', text: 'Şifre en az 6 karakter olmalı 🔑' }); return; }
    const acc = Object.values(meta.accounts || {}).find((a) => a.email === email);
    if (!acc) { send(ws, { t: 'reset-err', text: 'Hesap bulunamadı' }); return; }
    acc.salt = crypto.randomBytes(8).toString('hex');
    acc.hash = hashPass(pass, acc.salt);
    delete meta.resets[email];
    scheduleSave();
    send(ws, { t: 'reset-done' });
    return;
  }

  if (m.t === 'join') {
    if (u) return;
    if (meta.requireInvite && meta.ownerId && String(m.invite || '').toUpperCase() !== meta.inviteCode) {
      send(ws, { t: 'join-error', text: 'Yanlış davet kodu! 👀' }); return;
    }
    let name = String(m.name || '').replace(/[\u0000-\u001f<>&]/g, '').trim().slice(0, 24);
    if (!name) name = 'Misafir';
    if ((meta.bans || {})[trLow(name)]) { send(ws, { t: 'join-error', text: '🚫 Bu sunucudan BANlandın!' }); return; }
    const acc = accOf(name);
    if (!acc) { send(ws, { t: 'join-error', text: 'Bu isim kayıtlı değil — önce Kayıt Ol 📝' }); return; }
    if (hashPass(String(m.pass || ''), acc.salt) !== acc.hash) { send(ws, { t: 'join-error', text: 'Şifre yanlış! 🔑 (unuttuysan: "Şifremi unuttum")' }); return; }
    if (!acc.id) { acc.id = 'a' + rid(); scheduleSave(); }
    const color = acc.color;
    const user = { id: acc.id, name: acc.name, color, channelId: channels.find((c) => c.type === 'text').id, voiceId: null, muted: false, lastMsgs: [] };
    if (trLow(acc.name) === ADMIN_NAME) { meta.ownerId = user.id; scheduleSave(); }
    if (!meta.ownerId) { meta.ownerId = user.id; scheduleSave(); }
    user.role = isOwner(user) ? 'owner' : 'member';
    meta.known[user.id] = { name, color };
    users.set(ws, user); byId.set(user.id, ws);
    // günlük bonus ( seri sistemi: her gün üstüne koyar!)
    const p = profileOf(user.id);
    const today = new Date().toDateString();
    const yest = new Date(Date.now() - 86400000).toDateString();
    let daily = 0;
    if (p.lastDaily !== today) {
      p.streak = p.lastDaily === yest ? (p.streak || 0) + 1 : 1;
      p.lastDaily = today;
      daily = 10 + Math.min(20, (p.streak - 1) * 2);
      p.coins += daily;
      scheduleSave();
    }
    const myDms = Object.keys(messages).filter((k) => k.startsWith('dm:') && k.includes(user.id)).map((k) => ({ id: k, partner: dmPartner(k, user.id) }));
    // KankaBot hoşgeldin DM'i
    const dmBotId = 'dm:' + ['bot', user.id].sort().join(':');
    if (!Array.isArray(messages[dmBotId]) || !messages[dmBotId].length) {
      pushMessage(dmBotId, { id: rid(), ...BOT, ts: Date.now(), text: 'Selam kanka, ben KankaBot 🤖 Hoş geldin! Sana turu atayım:\n• ❓ butonu → TÜM komutlar & rehber\n• 🪙 kutun → profil, mağaza, görevler\n• 🎆 butonu → coin şovları\n• #ai → bana soru sor, aydınlataayım\n• !maden yaz, ilk coinini kas ⛏️\nİyi eğlenceler! 💙' });
    }
    if (!myDms.some((d) => d.id === dmBotId)) myDms.unshift({ id: dmBotId, partner: 'bot' });
    send(ws, {
      t: 'init', you: publicUser(user), channels, users: allUsers(),
      messages: (messages[user.channelId] || []).slice(-100), myDms, known: meta.known,
      meta: { requireInvite: meta.requireInvite, inviteCode: isOwner(user) ? meta.inviteCode : null },
      shop: SHOP, coins: p.coins, owned: p.owned, xp: p.xp, level: levelOf(p), quests: p.quests, ach: p.ach, market: meta.market || [], banner: meta.banner || null, welcome: meta.welcome || '', roles: meta.roles || [], userRoles: meta.userRoles || {},
    });
    if (daily) send(ws, { t: 'toast', text: `🪙 Günlük bonus +${daily} • 🔥 Seri: ${p.streak} gün!` });
    // günlük otomatik gazete (günde 1 kez, #genel)
    const todayP = new Date().toDateString();
    if (meta.lastPaper !== todayP) {
      meta.lastPaper = todayP;
      scheduleSave();
      gazete(channels.find((c) => c.id === 'genel') ? 'genel' : user.channelId);
    }
    broadcast({ t: 'users', users: allUsers() }, (x) => x !== user);
    pushMessage(user.channelId, { id: rid(), system: true, text: `${name} sunucuya katıldı`, ts: Date.now() }, false);
    if (profileOf(user.id).anons) botSay(user.channelId, `📣 ${profileOf(user.id).anons} — ${name} teşrif etti! 👑`);
    console.log(`[+] ${name} (${users.size} çevrimiçi)`);
    return;
  }
  if (!u) return;

  switch (m.t) {
    case 'ping': send(ws, { t: 'pong' }); break;

    case 'buy': {
      const item = SHOP.find((s) => s.id === m.id);
      const p = profileOf(u.id);
      if (!item || p.owned.includes(item.id)) return;
      if (p.coins < item.price) { send(ws, { t: 'toast', text: `🪙 Yetersiz coin! (${p.coins}/${item.price}) — !maden ile kaz ⛏️` }); return; }
      p.coins -= item.price;
      p.owned.push(item.id);
      // otomatik kuşan
      if (item.type === 'emoji') p.emoji = item.value;
      if (item.type === 'frame') p.frame = item.value;
      if (item.type === 'badge') p.badge = item.value;
      if (item.type === 'namecolor') p.nameColor = item.value;
      scheduleSave();
      send(ws, { t: 'coins', coins: p.coins, owned: p.owned });
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      broadcast({ t: 'users', users: allUsers() });
      botSay(u.channelId, `🛒 ${u.name} “${item.label}” satın aldı! Havalı 😎`);
      break;
    }

    case 'claim': {
      const q = QUESTS.find((x) => x.id === m.id);
      const p = profileOf(u.id);
      if (!q) return;
      if (p.quests.date !== new Date().toDateString()) p.quests = { date: new Date().toDateString(), c: {}, claimed: [] };
      if ((p.quests.c[q.key] || 0) < q.need || p.quests.claimed.includes(q.id)) return;
      p.quests.claimed.push(q.id);
      p.coins += q.reward;
      scheduleSave();
      sendWallet(u);
      botSay(u.channelId, `📋 ${u.name} görevi tamamladı: ${q.label} → +${q.reward} 🪙`);
      checkAch(u);
      break;
    }

    case 'equip': {
      const p = profileOf(u.id);
      const slot = m.slot;
      if (m.id === null) { if (['emoji', 'frame', 'badge', 'namecolor', 'title'].includes(slot)) { p[slot] = null; } }
      else {
        const item = SHOP.find((s) => s.id === m.id);
        if (!item || item.type !== slot || !p.owned.includes(item.id)) return;
        p[slot] = item.value;
      }
      scheduleSave();
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'thread': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg) return;
      const thId = 'th-' + rid();
      const nm = (msg.text || '️').slice(0, 24);
      channels.push({ id: thId, name: '🧵 ' + nm, type: 'thread', parent: u.channelId, creator: u.id, topic: 'Thread' });
      messages[thId] = [];
      scheduleSave();
      pushAudit(`🧵 ${u.name} thread açtı: ${nm}`);
      broadcast({ t: 'channels', channels });
      u.channelId = thId;
      send(ws, { t: 'switched', channelId: thId, messages: [], dm: false });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'raisehand': {
      const vc = voiceChannel(u.voiceId);
      if (!vc || !vc.stage) return;
      broadcast({ t: 'toast', text: `🖐️ ${u.name} söz istiyor! (!sozver @${u.name})` }, (x) => isOwner(x));
      break;
    }

    case 'audit': {
      if (!isOwner(u)) return;
      send(ws, { t: 'audit', list: meta.audit || [] });
      break;
    }

    case 'banner': {
      if (!isOwner(u)) return;
      const d = String(m.data || '');
      if (!d.startsWith('data:image/') || d.length > 250000) { send(ws, { t: 'toast', text: 'Banner çok büyük 🖼️' }); return; }
      meta.banner = d;
      scheduleSave();
      pushAudit(`🖼️ ${u.name} sunucu baneri koydu`);
      broadcast({ t: 'banner', banner: d });
      break;
    }

    case 'photo': {
      const p = profileOf(u.id);
      const d = String(m.data || '');
      if (!d.startsWith('data:image/') || d.length > 250000) { send(ws, { t: 'toast', text: 'Foto çok büyük — küçük bir resim dene 📸' }); return; }
      p.photo = d;
      scheduleSave();
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      broadcast({ t: 'users', users: allUsers() });
      send(ws, { t: 'toast', text: '📸 Profil fotoğrafın güncellendi!' });
      break;
    }

    case 'market-list': {
      const item = SHOP.find((s) => s.id === m.itemId);
      const p = profileOf(u.id);
      if (!item || !p.owned.includes(item.id)) return;
      const price = Math.max(1, Math.floor(Number(m.price) || 0));
      if (!price) { send(ws, { t: 'toast', text: 'Fiyat gir 🏷️' }); return; }
      for (const slot of ['emoji', 'frame', 'badge', 'namecolor', 'title', 'bubble', 'pbg']) {
        if (item.type === slot && String(p[slot]) === String(item.value)) p[slot] = null;
      }
      if (item.type === 'gold' && p.gold) p.gold = false;
      p.owned = p.owned.filter((x) => x !== item.id);
      if (!meta.market) meta.market = [];
      meta.market.push({ id: 'mk' + rid(), seller: u.id, itemId: item.id, price });
      scheduleSave();
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      broadcast({ t: 'users', users: allUsers() });
      marketBroadcast(); sendWallet(u);
      break;
    }

    case 'market-unlist': {
      const l = (meta.market || []).find((x) => x.id === m.listingId && x.seller === u.id);
      if (!l) return;
      meta.market = meta.market.filter((x) => x !== l);
      profileOf(u.id).owned.push(l.itemId);
      scheduleSave(); marketBroadcast();
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(profileOf(u.id), u.id) });
      break;
    }

    case 'market-buy': {
      const l = (meta.market || []).find((x) => x.id === m.listingId);
      if (!l || l.seller === u.id) return;
      const p = profileOf(u.id);
      if (p.coins < l.price) { send(ws, { t: 'toast', text: '🪙 Yetersiz coin!' }); return; }
      p.coins -= l.price;
      p.owned.push(l.itemId);
      const sp = profileOf(l.seller);
      sp.coins += l.price;
      meta.market = meta.market.filter((x) => x !== l);
      scheduleSave(); marketBroadcast(); sendWallet(u);
      const sws = byId.get(l.seller);
      if (sws) { sendWallet(users.get(sws)); send(sws, { t: 'toast', text: `🏪 ${u.name} ürününü aldı! +${l.price} 🪙` }); }
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      send(ws, { t: 'toast', text: '🏪 Satın alındı! Profilden “Tak” 🎉' });
      break;
    }

    case 'pin': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg) return;
      if (msg.uid !== u.id && !isOwner(u)) { send(ws, { t: 'toast', text: 'Sadece kendi mesajını sabitleyebilirsin (ya da sahip)' }); return; }
      msg.pinned = !msg.pinned;
      scheduleSave();
      broadcast({ t: 'msg-pin', channelId: u.channelId, msgId: msg.id, pinned: msg.pinned }, (x) => x.channelId === u.channelId);
      break;
    }

    case 'pet': {
      const p = profileOf(u.id);
      if (m.action === 'buy') {
        const types = { kedi: 200, kopek: 200, ejder: 500 };
        const cost = types[m.type];
        if (!cost || p.pet) return;
        if (p.coins < cost) { send(ws, { t: 'toast', text: `🐣 Yumurta ${cost} 🪙, biraz daha kas!` }); return; }
        p.coins -= cost;
        p.pet = { type: m.type, xp: 0 };
        scheduleSave(); sendWallet(u);
        broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
        broadcast({ t: 'users', users: allUsers() });
        botSay(u.channelId, `🐣 ${u.name} bir yumurta aldı! (${m.type === 'kedi' ? '🐱' : m.type === 'kopek' ? '🐶' : '🐉'}) Besle, büyüsün!`);
      } else if (m.action === 'feed') {
        if (!p.pet) return;
        if (p.coins < 5) { send(ws, { t: 'toast', text: 'Mama 5 🪙 🍖' }); return; }
        p.coins -= 5;
        p.pet.xp += 10;
        let extra = '';
        if (Math.random() < 0.2) { p.coins += 3; extra = ' — ve 3 🪙 buldu! 🐾'; }
        scheduleSave(); sendWallet(u);
        broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
        broadcast({ t: 'users', users: allUsers() });
        send(ws, { t: 'toast', text: `${petFace(p.pet)} mama yedi (Lv${petLvl(p.pet)})${extra}` });
      }
      break;
    }

    case 'anons': {
      const p = profileOf(u.id);
      if (!p.owned.includes('anons')) { send(ws, { t: 'toast', text: 'Önce mağazadan “📣 Giriş Anonsu” al' }); return; }
      p.anons = String(m.text || '').slice(0, 60) || null;
      scheduleSave();
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      break;
    }

    case 'status': {
      const p = profileOf(u.id);
      if (!p.owned.includes('status')) { send(ws, { t: 'toast', text: 'Önce mağazadan “Özel Durum Yazısı” al 💬' }); return; }
      p.status = String(m.text || '').slice(0, 40) || null;
      scheduleSave();
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'switch': {
      let ok = null, isDm = false;
      if (String(m.channelId).startsWith('dm:')) {
        if (m.channelId.includes(u.id)) { ok = m.channelId; isDm = true; if (!Array.isArray(messages[ok])) messages[ok] = []; }
      } else ok = anyTextish(m.channelId);
      if (!ok) return;
      u.channelId = isDm ? ok : ok.id;
      const wst = (meta.watchState || {})[u.channelId];
      send(ws, { t: 'switched', channelId: u.channelId, messages: (messages[u.channelId] || []).slice(-100), dm: isDm, watch: wst ? { videoId: wst.videoId, sec: watchSec(wst) } : null });
      if (isDm) { const p = profileOf(u.id); if (!p.ach.includes('social')) { p.ach.push('social'); send(ws, { t: 'toast', text: '🏅 Başarım: 📨 İlk DM!' }); scheduleSave(); } }
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'msg': {
      const now = Date.now();
      u.lastMsgs = (u.lastMsgs || []).filter((t) => now - t < 3000);
      if (u.lastMsgs.length >= 8) return;
      u.lastMsgs.push(now);
      if ((meta.timeouts || {})[u.id] && Date.now() < meta.timeouts[u.id]) { send(ws, { t: 'toast', text: '⏳ Susturuldun! ' + Math.ceil((meta.timeouts[u.id] - Date.now()) / 60000) + ' dk kaldı' }); return; }
      const chSlow = anyTextish(u.channelId);
      if (chSlow && chSlow.slow && !isOwner(u)) {
        const last = u.slowTs || 0;
        if (Date.now() - last < chSlow.slow * 1000) { send(ws, { t: 'toast', text: `🐌 Slowmode aktif: ${Math.ceil((chSlow.slow * 1000 - (Date.now() - last)) / 1000)} sn bekle` }); return; }
        u.slowTs = Date.now();
      }
      const chId = u.channelId;
      const ch = anyTextish(chId);
      if (ch && ch.locked && !isOwner(u)) { send(ws, { t: 'toast', text: '🔒 Kanal kilitli — sadece yönetici yazabilir' }); return; }
      let text = typeof m.text === 'string' ? m.text.replace(/\u0000/g, '').slice(0, MAX_TEXT) : '';
      let image = null;
      if (typeof m.image === 'string' && m.image.startsWith('data:image/') && m.image.length <= MAX_IMAGE) image = m.image;
      let fileMeta = null;
      const spoiler = !!m.spoiler;
      const replyTo = m.replyTo && m.replyTo.id ? { id: String(m.replyTo.id).slice(0, 24), name: String(m.replyTo.name || '').slice(0, 30), text: String(m.replyTo.text || '').slice(0, 80) } : null;
      if (m.file && typeof m.file.url === 'string' && (m.file.url.startsWith('/uploads/') || /^https:\/\/(files\.catbox\.moe|raw\.githubusercontent\.com)\//.test(m.file.url))) {
        fileMeta = { url: m.file.url, name: String(m.file.name || 'dosya').slice(0, 60), type: String(m.file.type || '').slice(0, 40) };
      }
      if (!text.trim() && !image && !fileMeta) return;
      const mentionAll = text.includes('@herkes') && profileOf(u.id).owned.includes('p_herkese');
      pushMessage(chId, { id: rid(), uid: u.id, name: u.name, color: u.color, text, image, file: fileMeta, spoiler, replyTo, ts: Date.now(), reactions: {}, mentionAll, profile: publicProfile(profileOf(u.id), u.id) });
      { const p = profileOf(u.id); p.msgs = (p.msgs || 0) + 1; qBump(u, 'msgs'); gainXp(u, 5); checkAch(u); }
      if (text.startsWith('!')) runBot(u, text);
      else {
        checkGames(u, text);
        const chNow = anyTextish(chId);
        if (chNow && chNow.id === 'ai') askAI(u, text);
      }
      break;
    }

    case 'typing': broadcast({ t: 'typing', uid: u.id, name: u.name }, (x) => x.channelId === u.channelId && x !== u); break;

    case 'react': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg) return;
      if (!msg.reactions) msg.reactions = {};
      const em = String(m.emoji || '').slice(0, 8);
      if (!em) return;
      const arr = msg.reactions[em] || (msg.reactions[em] = []);
      const i = arr.indexOf(u.id);
      if (i >= 0) arr.splice(i, 1); else arr.push(u.id);
      if (!arr.length) delete msg.reactions[em];
      scheduleSave();
      broadcast({ t: 'react', channelId: u.channelId, msgId: msg.id, reactions: msg.reactions }, (x) => x.channelId === u.channelId);
      qBump(u, 'reacts');
      break;
    }

    case 'edit': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg || msg.uid !== u.id) return;
      msg.text = String(m.text || '').slice(0, MAX_TEXT);
      msg.edited = true;
      scheduleSave();
      broadcast({ t: 'msg-edit', channelId: u.channelId, msgId: msg.id, text: msg.text }, (x) => x.channelId === u.channelId);
      break;
    }

    case 'del': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg || (msg.uid !== u.id && !isOwner(u))) return;
      messages[u.channelId] = messages[u.channelId].filter((x) => x.id !== msg.id);
      scheduleSave();
      broadcast({ t: 'msg-del', channelId: u.channelId, msgId: msg.id }, (x) => x.channelId === u.channelId);
      break;
    }

    case 'game': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg || !msg.game || !msg.game.active) return;
      const g = msg.game;
      if (g.type === 'xo') {
        const idx = Number(m.move);
        if (!(idx >= 0 && idx <= 8) || g.board[idx]) return;
        if (g.players.length === 1) {
          if (u.id === g.players[0]) return;
          g.players.push(u.id); g.names.push(u.name);
        }
        if (!g.players.includes(u.id) || g.players.length < 2) return;
        if (g.players[g.turn] !== u.id) return;
        g.board[idx] = g.turn === 0 ? 'X' : 'O';
        const W = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of W) if (g.board[a] && g.board[a] === g.board[b] && g.board[b] === g.board[c]) { g.winner = g.board[a] === 'X' ? 0 : 1; g.active = false; }
        if (g.active && g.board.every(Boolean)) { g.winner = -1; g.active = false; }
        g.turn = 1 - g.turn;
        if (!g.active) {
          if (g.winner === -1) botSay(u.channelId, '🕹️  Berabere!');
          else {
            botSay(u.channelId, `🕹️  ${g.names[g.winner]} kazandı!`);
            const wu = users.get(byId.get(g.players[g.winner]));
            if (wu) { addCoins(wu, 3, '🕹️ X-O zaferi'); winGame(wu); }
          }
        }
        scheduleSave();
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
      }
      break;
    }

    case 'sound': {
      const name = String(m.name || '').slice(0, 20);
      broadcast({ t: 'sound', name, from: u.id }, (x) => x.voiceId && x.voiceId === u.voiceId);
      break;
    }

    case 'sov': {
      trySov(u, '!' + String(m.key || '').slice(0, 12), u.channelId);
      break;
    }

    case 'create-channel': {
      let name = String(m.name || '').replace(/[\u0000-\u001f<>&#]/g, '').trim().slice(0, 24);
      if (!name) return;
      if (channels.some((c) => c.type === 'text' && c.name.toLowerCase() === name.toLowerCase() && c.parent === (m.parentId || null))) return;
      let parent = null;
      if (m.parentId) { const pch = textChannel(m.parentId); if (pch && !pch.parent) parent = pch.id; }
      const newId = 'ch-' + rid();
      channels.push({ id: newId, name, type: 'text', topic: '', parent });
      messages[newId] = [];
      scheduleSave();
      broadcast({ t: 'channels', channels });
      break;
    }

    case 'rename-channel': {
      if (!isOwner(u)) return;
      const ch = textChannel(m.channelId);
      let name = String(m.name || '').replace(/[\u0000-\u001f<>&#]/g, '').trim().slice(0, 24);
      if (!ch || !name) return;
      ch.name = name;
      scheduleSave();
      broadcast({ t: 'channels', channels });
      break;
    }

    case 'del-channel': {
      const chX = textChannel(m.channelId);
      if (!isOwner(u) && !(chX && chX.type === 'thread' && chX.creator === u.id)) return;
      const ch = textChannel(m.channelId);
      if (!ch) return;
      const kids = channels.filter((c) => c.parent === ch.id);
      const removing = [ch, ...kids];
      if (channels.filter((c) => c.type === 'text' && !c.parent).length <= 1 && !ch.parent) { send(ws, { t: 'toast', text: 'Son ana metin kanalı silinemez!' }); return; }
      channels = channels.filter((c) => !removing.includes(c));
      removing.forEach((r2) => delete messages[r2.id]);
      const fallback = channels.find((c) => c.type === 'text');
      for (const [w2, u2] of users) {
        if (removing.some((r2) => r2.id === u2.channelId)) {
          u2.channelId = fallback.id;
          send(w2, { t: 'switched', channelId: fallback.id, messages: (messages[fallback.id] || []).slice(-100), dm: false });
        }
      }
      scheduleSave();
      broadcast({ t: 'channels', channels });
      broadcast({ t: 'users', users: allUsers() });
      botSay(fallback.id, `🗑️ #${ch.name}${kids.length ? ' ve ' + kids.length + ' alt kanalı' : ''} silindi (sahip)`);
      break;
    }

    case 'lock': {
      if (!isOwner(u)) return;
      const ch = textChannel(m.channelId);
      if (!ch) return;
      ch.locked = !!m.locked;
      scheduleSave();
      broadcast({ t: 'channels', channels });
      botSay(ch.id, ch.locked ? '🔒 Kanal kilitlendi — sadece yönetici yazabilir' : '🔓 Kanal kilidi açıldı');
      break;
    }

    case 'kick': {
      if (!isOwner(u)) return;
      const tws = byId.get(String(m.uid || ''));
      if (!tws || tws === ws) return;
      send(tws, { t: 'kicked' });
      setTimeout(() => tws.terminate(), 300);
      break;
    }

    case 'invite': {
      if (!isOwner(u)) return;
      if (m.action === 'toggle') meta.requireInvite = !!m.on;
      if (m.action === 'new') meta.inviteCode = genCode();
      scheduleSave();
      send(ws, { t: 'meta', meta: { requireInvite: meta.requireInvite, inviteCode: meta.inviteCode } });
      broadcast({ t: 'meta-public', on: meta.requireInvite });
      break;
    }

    case 'mute': u.muted = !!m.muted; broadcast({ t: 'users', users: allUsers() }); break;

    case 'presence': {
      const v = ['online', 'away', 'dnd'].includes(m.v) ? m.v : 'online';
      u.presence = v;
      broadcast({ t: 'users', users: allUsers() });
      break;
    }

    case 'voice-join': {
      const ch = voiceChannel(m.channelId);
      if (!ch) return;
      if (u.voiceId === ch.id) return;
      if (ch.limit && voiceUsersOf(ch.id).length >= ch.limit && !isOwner(u)) { send(ws, { t: 'toast', text: `👥 Oda dolu! (limit ${ch.limit})` }); return; }
      if (u.voiceId) broadcast({ t: 'voice-left', uid: u.id, channelId: u.voiceId });
      u.voiceId = ch.id;
      if (ch.stage && !isOwner(u) && !(ch.speakers || []).includes(u.id)) u.muted = true;
      qBump(u, 'voice');
      send(ws, { t: 'voice-joined', channelId: ch.id, peers: voiceUsersOf(ch.id).filter((x) => x !== u).map(publicUser) });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }
    case 'voice-leave': {
      if (!u.voiceId) return;
      const old = u.voiceId; u.voiceId = null; u.muted = false;
      broadcast({ t: 'voice-left', uid: u.id, channelId: old });
      broadcast({ t: 'users', users: allUsers() });
      break;
    }
    case 'watch': {
      const ch = watchChannel(m.channelId || u.channelId);
      if (!ch) return;
      if (!meta.watchState) meta.watchState = {};
      const now = Date.now();
      if (m.action === 'play') {
        const from = Math.max(0, Number(m.from || 0));
        meta.watchState[ch.id] = { videoId: String(m.videoId || '').slice(0, 20), wall: now - from * 1000, paused: null };
        scheduleSave();
        broadcast({ t: 'watch', channelId: ch.id, action: 'play', videoId: m.videoId, from, by: u.name }, (x) => x.channelId === ch.id);
      } else if (m.action === 'pause') {
        const st = meta.watchState[ch.id]; if (!st) return;
        const sec = watchSec(st); st.paused = sec;
        scheduleSave();
        broadcast({ t: 'watch', channelId: ch.id, action: 'pause', sec, by: u.name }, (x) => x.channelId === ch.id);
      } else if (m.action === 'seek') {
        const sec = Math.max(0, Number(m.sec || 0));
        const old = meta.watchState[ch.id];
        meta.watchState[ch.id] = { videoId: (old && old.videoId) || String(m.videoId || '').slice(0, 20), wall: now - sec * 1000, paused: null };
        scheduleSave();
        broadcast({ t: 'watch', channelId: ch.id, action: 'seek', sec, by: u.name }, (x) => x.channelId === ch.id);
      } else if (m.action === 'stop') {
        delete meta.watchState[ch.id];
        scheduleSave();
        broadcast({ t: 'watch', channelId: ch.id, action: 'stop', by: u.name }, (x) => x.channelId === ch.id);
      }
      break;
    }

    case 'rtc': {
      const target = byId.get(String(m.to || ''));
      if (target && target !== ws && users.has(target)) send(target, { t: 'rtc', from: u.id, data: m.data });
      break;
    }
  }
}

function cleanup(ws) {
  const u = users.get(ws);
  if (!u) return;
  users.delete(ws); byId.delete(u.id);
  broadcast({ t: 'users', users: allUsers() });
  if (u.voiceId) broadcast({ t: 'voice-left', uid: u.id, channelId: u.voiceId });
  if (textChannel(u.channelId)) pushMessage(u.channelId, { id: rid(), system: true, text: `${u.name} ayrıldı`, ts: Date.now() }, false);
  console.log(`[-] ${u.name} (${users.size} çevrimiçi)`);
}

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, 30000);

/* ---------------- BULUT YEDEK (GitHub Gist, opsiyonel) ---------------- */
const GIST = process.env.GIST_TOKEN || '';
const ghH = { Authorization: 'token ' + GIST, 'User-Agent': 'kankachat', Accept: 'application/vnd.github+json' };
async function findGist() {
  const r = await fetch('https://api.github.com/gists?per_page=100', { headers: ghH });
  if (!r.ok) return null;
  const j = await r.json();
  return Array.isArray(j) ? (j.find((x) => x.files && x.files['kankachat-data.json']) || null) : null;
}
async function cloudLoad() {
  if (!GIST) return null;
  try {
    const g = await findGist();
    if (!g) return null;
    const r = await fetch(g.files['kankachat-data.json'].raw_url, { headers: ghH });
    return await r.json();
  } catch (_) { return null; }
}
let lastCloud = 0;
async function cloudSave(force) {
  if (!GIST) return;
  const now = Date.now();
  if (!force && now - lastCloud < 30000) return;
  lastCloud = now;
  try {
    const content = JSON.stringify({ channels, messages, meta });
    const g = await findGist();
    if (g) await fetch('https://api.github.com/gists/' + g.id, { method: 'PATCH', headers: ghH, body: JSON.stringify({ files: { 'kankachat-data.json': { content } } }) });
    else await fetch('https://api.github.com/gists', { method: 'POST', headers: ghH, body: JSON.stringify({ description: 'kankachat yedek', public: false, files: { 'kankachat-data.json': { content } } }) });
  } catch (_) {}
}
setInterval(() => cloudSave(false), 60000);

(async () => {
  if (GIST) {
    const c = await cloudLoad();
    if (c && c.meta) {
      if (Array.isArray(c.channels) && c.channels.length) channels = c.channels;
      if (c.messages) messages = c.messages;
      meta = Object.assign(meta, c.meta);
      for (const d of DEFAULT_CHANNELS) if (!channels.find((x) => x.id === d.id)) channels.push({ ...d });
      for (const cc of channels) if ((cc.type === 'text' || cc.type === 'watch') && !Array.isArray(messages[cc.id])) messages[cc.id] = [];
      console.log('[bulut] Gist yedeğinden tarihçe yüklendi ☁️');
    } else console.log('[bulut] yedek bulunamadı, yenisi oluşturulacak');
  }
  server.listen(PORT, '0.0.0.0', () => console.log(`KankaChat v5 http://0.0.0.0:${PORT} hazır`));
})();
