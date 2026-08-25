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
const MAX_HISTORY = 300, MAX_TEXT = 2000, MAX_IMAGE = 2_000_000, MAX_UPLOAD = 100 * 1024 * 1024;
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (_) {}

const DEFAULT_CHANNELS = [
  { id: 'genel', name: 'genel', type: 'text', topic: 'Herkes buraya 👋' },
  { id: 'oyun', name: 'oyun', type: 'text', topic: 'Oyun muhabbeti 🎮' },
  { id: 'muzik', name: 'müzik', type: 'text', topic: 'Şarkı önerileri 🎵' },
  { id: 'ai', name: 'ai', type: 'text', topic: 'KankaAI’ya sor, aydınlatsın ✨ (direkt yaz)' },
  { id: 'muze', name: 'Müze', type: 'text', topic: '🏛️ Efsane anılar çerçeveli — !çerçevele ile as' },
  { id: 'sarkilarimiz', name: 'Şarkılarımız', type: 'text', topic: '🎵 ultra şarkı videoları — !sarkilar • !çal • !dinle 3' },
  { id: 'skyline', name: 'Skyline', type: 'text', topic: '🏙️ Skyline Server — ilan & reklam: !ilan 🏠 başlık fiyat • !reklam kademe | metin' },
  { id: 'uzgunler', name: 'Üzgünler V2', type: 'text', topic: '🕯️ hüzünlü kankaların mekanı — yalnız değilsin 💙' },
  { id: 'uz-mum', name: '🕯️ Mum Köşesi', type: 'text', parent: 'uzgunler', topic: '!mum → bir mum yak, ışığı hiç sönmesin' },
  { id: 'uz-saril', name: '🫂 Sarılma Duvarı', type: 'text', parent: 'uzgunler', topic: '!saril @isim → sanal sarıl, kalpler uçuşsun' },
  { id: 'uz-dert', name: '📜 Dert Dökme', type: 'text', parent: 'uzgunler', topic: 'burada herkes ANONİM — içini dök, kimse bilmez' },
  { id: 'uz-mektup', name: '💌 Mektup Kutusu', type: 'text', parent: 'uzgunler', topic: '!mektup yaz → duvara asılsın • !mektuplar → okumuş' },
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
  { id: 'nazar', type: 'nazar', label: '🧿 Nazar Boncuğu (1 hak: coin kaybını engeller)', price: 150, value: true },
  { id: 'magnet', type: 'magnet', label: '🧲 Mıknatıs (event coinlerine +%10)', price: 400, value: true },
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
  saveTimer = setTimeout(() => { try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages, meta })); } catch (_) {} cloudSave(false); }, 800);
}
const doSave = () => { try { fs.writeFileSync(DATA_FILE, JSON.stringify({ channels, messages, meta })); } catch (_) {} };
process.on('SIGTERM', async () => { doSave(); await cloudSave(true).catch(() => {}); process.exit(0); });
process.on('SIGINT', async () => { doSave(); await cloudSave(true).catch(() => {}); process.exit(0); });

const COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#f47b67', '#45ddc0', '#9b84ee', '#3ba55d', '#f0b232'];
const users = new Map(); const byId = new Map();
const rid = () => crypto.randomBytes(6).toString('hex');

const CHANGELOG = [
  '🎮 OYUNLAR: !xo !zincir !adam !sayi !film !sarki !anagram !mat !tkm !rulet !yarisma',
  '🪙 EKONOMİ: coin • 📋 günlük görevler • 🏅 başarımlar • 🐣 pet • 🎡 !cevir • 🏆 !lider • 🏪 Pazar • ⚔️ klan+savaş • 🎪 !muzayede • 🌧️ !yagmur',
  '🎆 ŞOVLAR: !havai !beba !para !kral !roket !bomba !parti !kar !yagmur !gokkusagi (🎆 butonu!)',
  '🔐 HESAP: kayıt (mail+şifre) • 👑 Kaan=yönetici • 😢 şifre sıfırlama kodu',
  '🎬 İZLEME ODASI: birlikte YouTube • 📂 alt kanallar • 🧵 thread',
  '💞 SOSYAL: !teklif kanka • 📸 profil fotoğrafı • 🙈 spoiler • 📰 !gazete',
  '☁️ KALICILIK: gist yedeği (mesajlar/kanallar) • 🎬 videolar GitHub media • 🆔 F5te hiçbir şey uçmaz',
  '😤 DİSCORD PRO: ↩️ reply • ✍️ markdown • ⌨️ / menü • 😤!sustur 🚫!ban 🐌!slowmode • 🏷️ roller • 🌐 sahne • 🖱️ sağ tık • 🖼️ baner • 🎫 karşılama • 📜 log',
  '🎨 GÖRÜNÜM: 5 tema • 5 renk • arkaplanlar • çerçeveler • rozetler • ünvanlar • balonlar •  mobil mod',
  '🎤 SES: mic seçici • 🖥️ ekran+sese • ⛶ tam ekran • 📴 sağırlaştır • 🎵 soundboard • 🎧 YouTube müzik',
  '🎭 V3 MEGA (full fıstık): ☕ !cay @isim (aura) • 🧿 Nazar Boncuğu (kayıp engeller) • 🐦 !guvercin (anonim mesaj) • 🎭 !maske (10 dk maskeli balo) • 🧻 !kagit (kağıt savaşı) • 🪦 kaybedene komik mezar taşı • ⛲ Coin Çeşmesi (tepki koy kap!) • 🏺 !kazi (eser kazı → Müze) • 🧲 Mıknatıs (+%10)',
  '🕯️ v48 ÜZGÜNLER V2: yeni ana kanal + 4 ÖZEL BÖLÜM: 🕯️ Mum Köşesi (!mum) • 🫂 Sarılma Duvarı (!saril @isim) • 📜 Dert Dökme (herkes ANONİM "Üzgün Ruh") • 💌 Mektup Kutusu (!mektup / !mektuplar) • kanalda hava hep yağmurlu 🌧️',
  '🤖 v47 BOT DM FIX: DMde TÜM komutlar çalışır (!yardim !maden oyunlar) • bilinmeyen komuta anında cevap • KankaAI anında "düşünüyor…" yazar + hızlandı (donma yok!)',
  '🔧 v46 FIX: işçi kiralama paneli eklendi (➕ İşçi Kirle butonu) • 👷 butonu çökmesi düzeldi • KankaBot DMine yazınca cevap verir • ❓ rehbere işçi + bot DM bölümü',
  '🚪 v44 MEGA: özel temalı odalar (50🪙/sa) + VIP + AURA + karaborsa + kredi + turnuva + arena',
  '💼 v43 İŞ PAKETİ: 7 yeni iş (🍞🎪🌋🧪🌙) • 🤕 sakatlanma • ⛏️ kazma (-%25 süre) • ⛑️ baret (+%10, yarı risk)',
  '👷 v42 İŞÇİ+: max 3 slot • !isciler ile bota durum sor',
  '👷 v41 İŞÇİ SİSTEMİ: herkesin kendi İşçi kanalı • 30🪙 işçi kirle • işe yolla (5dk-4sa) • topla • Acemi→Usta→Efsane (x1.5)',
  '📱 v40 MOBİL SADELEŞTİRME: Discord gibi iki ekran (kanallar → sohbet ←), composerda sadece ➕+yaz+➤, ➕ menüsü, büyük dokunma alanları',
  '🔊 v39 SES SAĞLIĞI: kopan bağlantı oto-yeniden (3 deneme) • kalabalıkta bitrate limiti • ses kilidi açma butonu • bağlantı sayacı',
  '🌦️ v38 YAŞAYAN DÜNYA: sunucu havası (oylama! yağmur/kar/fırtına animasyon + %20 coin) • 🐠 akvaryum (!balik !yem) • 🌋 kaos modu (!kaos 60sn) • 🏛️ Müze (!çerçevele / 🏛️ butonu)',
  '🎵 v35 ŞARKILARIMIZ: yeni kanal + ultra şarkı videoları botu: !sarkilar !çal !dinle',
  '🏙️ v34 SAATLİK REKLAM: sidebar 70🪙/sa • giriş 100🪙/sa • şerit 90🪙/sa • çoklu konum + saat seçimi (6sa %10, 24sa %20 indirim)',
  '🏙️ v32 SKYLINE: Skyline kanalı • !ilan kartları (ev/araba/dükkan) • !reklam kademeli pano (bronz/gümüş/altın/elmas) • !panolar',
  '📤 v31: dosya limiti 100MB + upload ilerleme çubuğu (%)',
  '✨ v30 CİLA: cam paneller, gradyan butonlar, kanal geçiş animasyonu, sekme başlığı rozet, login parçacıkları, profil istatistik, 10 tema, mesaj stilleri, mobil/PC mikro animasyonlar',
  '🎮 BUTONLU OYUNLAR: !21 !tkm !rulet !slot !yazitura !zars !adam(harf) !macera !film/!sarki/!anagram(şıklı) — XO gibi sohbetten oyna',
  '🧠 DERİN MANTIK: 🃏!21 • 🎁!kutu • 🏦!banka/!yatir • 📈!hisse al/sat • 🎫!loto • 🕵️!soygun • 🕹️!hafiza • 🐔!ek/!hasat • 🗺️!macera/!sec • 🐾!kapisma • 💣!patates/!pas • 🎤!sozquiz • 🔄!takas/!toffer/!tonay • ⚖️!mahkeme • 🕵️!mafya/!suclu • 🎯!xobet • 🎯!gorevler • 🏅 sezon',
];
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
const publicProfile = (p, uid) => ({ emoji: p.emoji, frame: p.frame, badge: p.badge, nameColor: p.nameColor, status: p.status, title: p.title, level: levelOf(p), bubble: p.bubble, pbg: p.pbg, gold: p.gold, anons: p.anons, pet: p.pet ? { e: petFace(p.pet), lvl: petLvl(p.pet) } : null, clan: uid && typeof clanOf === 'function' && clanOf(uid) ? clanOf(uid)[1].name : null, buddy: uid && typeof buddyOf === 'function' && buddyOf(uid) ? buddyOf(uid).find((x) => x !== uid) : null, photo: p.photo || null, vip: vipActive(uid), aura: auraTier((meta.aura || {})[uid] || 0) });

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

/* ---------------- 🌦️🐟🏛️ YAŞAYAN DÜNYA ---------------- */
const WEATHERS = { gunes: '☀️ Güneşli', yagmur: '🌧️ Yağmurlu', kar: '❄️ Karlı', firtina: '⛈️ Fırtına (+%20 coin)' };
const FISH_TYPES = ['🐠', '🐟', '', '', '🦈'];
const fishStage = (f) => { const l = Math.floor(Math.sqrt((f.xp || 0) / 30)); return Math.min(5, l); };
const FISH_STAGE_EMO = { '🐠': ['🐠', '', '', '🐠', '🐠', ''] };
function fishEmoji(f) {
  const st = fishStage(f);
  const base = f.t || '🐠';
  return ['', '', '', '🦈', '', ''][st] || base;
}
const JOB_DEFS = {
  temizlik: { m: 5, r: 2, e: '🧹', label: 'Temizlik' },
  tarla: { m: 30, r: 12, e: '🌾', label: 'Tarla' },
  maden: { m: 60, r: 30, e: '⛏️', label: 'Maden' },
  balik: { m: 120, r: 70, e: '🎣', label: 'Balıkçılık' },
  insaat: { m: 240, r: 150, e: '🏗️', label: 'İnşaat' },
  sirk: { m: 15, r: 6, e: '🎪', label: 'Sirk' },
  firin: { m: 45, r: 20, e: '🍞', label: 'Fırın' },
  tehlike: { m: 30, r: 25, e: '🌋', label: 'Tehlikeli İş' },
  kurye: { m: 90, r: 50, e: '🚕', label: 'Kurye' },
  hazine: { m: 180, r: 100, e: '💰', label: 'Hazine Avı' },
  lab: { m: 300, r: 300, e: '🧪', label: 'Laboratuvar' },
  gece: { m: 480, r: 500, e: '🌙', label: 'Gece Vardiyası' },
};
const workerLvl = (w) => (w.done >= 15 ? 2 : w.done >= 5 ? 1 : 0);
const LVL_NAMES = ['Acemi', 'Usta', 'Efsane'];
const LVL_MULT = [1, 1.25, 1.5];
function workersOf(uid) { if (!meta.workers) meta.workers = {}; if (!meta.workers[uid]) meta.workers[uid] = []; return meta.workers[uid]; }
function ensureWorkerChannel(u) {
  const cid = 'isc-' + u.id;
  if (!channels.find((c) => c.id === cid)) {
    channels.push({ id: cid, name: u.name + ' İşçileri', type: 'worker', owner: u.id, topic: '👷 İşçilerin — kirle, işe yolla, kazan!' });
    messages[cid] = [];
    scheduleSave();
    broadcast({ t: 'channels', channels });
  }
  return cid;
}
const ROOM_THEMES = {
  disko: { label: '🪩 Disko', perk: '🌈 rengarenk efekt' },
  kamp: { label: '🔥 Kamp Ateşi', perk: '🪙 odadayken +%5 coin' },
  uzay: { label: '🌌 Uzay', perk: '⭐ odadayken 5 dkda +1 coin' },
  plaj: { label: '🏖️ Plaj', perk: '👷 isçiler %10 hizli' },
};
const AURA_TIERS = ['Normie', 'Cool', 'Sigma', 'AURA TANRISI'];
const auraTier = (a) => (a >= 5000 ? 3 : a >= 1000 ? 2 : a >= 100 ? 1 : 0);
const vipActive = (uid) => !!(meta.vip && meta.vip[uid] > Date.now());
const inRoomTheme = (u, theme) => { const c = channels.find((x) => x.id === u.channelId && x.type === 'room'); return !!(c && c.theme === theme); };
function addAura(uid, n) {
  if (!meta.aura) meta.aura = {};
  const o = auraTier(meta.aura[uid] || 0);
  meta.aura[uid] = (meta.aura[uid] || 0) + n;
  const nt = auraTier(meta.aura[uid]);
  if (nt > o) {
    const w = byId.get(uid);
    if (w) send(w, { t: 'toast', text: '✨ AURA KADEMESİ: ' + AURA_TIERS[nt] + '!' });
    broadcast({ t: 'users', users: allUsers() });
  }
}
function runWorld(u, cmd, text, ch) {
  if (cmd === '!kredi') {
    const p = profileOf(u.id);
    if (!meta.debt) meta.debt = {};
    const debt = meta.debt[u.id] || 0;
    if (debt > 0) { botSay(ch, '🏦 Önce borcunu öde! !borc'); return true; }
    const n = parseInt((text.match(/\d+/) || [50])[0], 10);
    if (n > 100) { botSay(ch, '🏦 Max kredi 100 🪙'); return true; }
    meta.debt[u.id] = Math.round(n * 1.2);
    p.coins += n;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🏦 Kredi çekildi: +${n} 🪙 • Borç: ${meta.debt[u.id]} 🪙 (%20 faiz) — !ode ile öde`);
    return true;
  }
  if (cmd === '!borc') {
    botSay(ch, '🏦 Borcun: ' + ((meta.debt || {})[u.id] || 0) + ' 🪙');
    return true;
  }
  if (cmd === '!ode') {
    if (!meta.debt) meta.debt = {};
    const debt = meta.debt[u.id] || 0;
    if (!debt) { botSay(ch, '🏦 Borcun yok, temizsin 😎'); return true; }
    const p = profileOf(u.id);
    const pay = Math.min(debt, p.coins);
    if (pay <= 0) { botSay(ch, '🏦 Coin yok ki ödeyesin 😅'); return true; }
    p.coins -= pay; meta.debt[u.id] = debt - pay;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🏦 ${pay} 🪙 ödendi • Kalan borç: ${meta.debt[u.id]}`);
    return true;
  }
  if (cmd === '!aura') {
    const a2 = (meta.aura || {})[u.id] || 0;
    botSay(ch, `✨ AURAN: ${a2} • Kademe: ${AURA_TIERS[auraTier(a2)]}\nKasma: mesaj +1 • oyun +10 • şov +25 • alışveriş +50 • oda +20`);
    return true;
  }
  if (cmd === '!auratop') {
    const top = Object.entries(meta.aura || {}).sort((a3, b2) => b2[1] - a3[1]).slice(0, 5)
      .map(([id, v], i) => `${i + 1}. ${(meta.known[id] || {}).name || '?'} — ${v} ✨ (${AURA_TIERS[auraTier(v)]})`).join(' • ');
    botSay(ch, '✨ AURA LİDERLER: ' + (top || 'henüz kimse kasmamış 😴'));
    return true;
  }
  if (cmd.startsWith('!arena')) {
    const tgt = findOnline(text.slice(6));
    if (!tgt || tgt.id === u.id) { botSay(ch, '🐾 Kullanım: !arena @isim'); return true; }
    const pa = profileOf(u.id), pb = profileOf(tgt.id);
    if (!pa.pet || !pb.pet) { botSay(ch, '🐾 İkinizin de peti olmalı!'); return true; }
    const sa = petLvl(pa.pet) * 10 + Math.random() * 20, sb = petLvl(pb.pet) * 10 + Math.random() * 20;
    const winA = sa >= sb;
    const wu = winA ? u : tgt;
    (winA ? pa : pb).pet.xp += 20;
    profileOf(wu.id).coins += 10;
    addAura(wu.id, 10);
    scheduleSave();
    botSay(ch, `🐾 ARENA: ${petFace(pa.pet)} ${Math.round(sa)} vs ${Math.round(sb)} ${petFace(pb.pet)} → 🏆 ${wu.name}! (+10🪙 +10✨)`);
    return true;
  }
  if (cmd === '!isciler' || cmd === '!işçiler' || cmd === '!iscidurum' || cmd === '!durum') {
    const list = workersOf(u.id);
    if (!list.length) { botSay(ch, '👷 İşçin yok — kendi İşçi kanalındaki panelden kirle (30🪙, max 3 slot)'); return true; }
    botSay(ch, '👷 İŞÇİ DURUMU:\n' + list.map((w) => {
      const lvl = LVL_NAMES[workerLvl(w)];
      if (!w.job) return `#${w.n} ${lvl} — 😴 boşta`;
      const jd = JOB_DEFS[w.job.k];
      const left = w.job.at + jd.m * 60000 - Date.now();
      return `#${w.n} ${lvl} — ${jd.e} ${jd.label} • ${left > 0 ? Math.ceil(left / 60000) + ' dk kaldı' : '✅ BİTTİ, topla!'}`;
    }).join('\n'));
    return true;
  }
  if (cmd === '!hava' || cmd.startsWith('!hava ')) {
    if (!isOwner(u)) { botSay(ch, '🌦️ Sahip: !hava gunes|yagmur|kar|firtina — herkes için: !havaoy'); return true; }
    const k = Object.keys(WEATHERS).find((x) => cmd.includes(x) || text.includes(x));
    if (!k) return true;
    meta.weather = k; scheduleSave();
    broadcast({ t: 'weather', w: k });
    botSay(ch, `🌦️ Sunucu havası değişti: ${WEATHERS[k]}`);
    return true;
  }
  if (cmd === '!havaoy') {
    if (meta.wvote && meta.wvote.until > Date.now()) { botSay(ch, '🗳️ Zaten oylama var! !oy gunes|yagmur|kar|firtina'); return true; }
    meta.wvote = { c: {}, until: Date.now() + 30000 };
    botSay(ch, '🗳️ HAVA OYLAMASI (30 sn): !oy gunes / !oy yagmur / !oy kar / !oy firtina');
    setTimeout(() => {
      const v = meta.wvote; if (!v) return; meta.wvote = null;
      const tally = {};
      Object.values(v.c).forEach((k) => { tally[k] = (tally[k] || 0) + 1; });
      const win = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      if (win) { meta.weather = win[0]; scheduleSave(); broadcast({ t: 'weather', w: win[0] }); botSay('genel', `🌦️ Demokrasi konuştu: ${WEATHERS[win[0]]} (${win[1]} oy)`); }
      else botSay('genel', '🌦️ Oylama sonuçsuz kaldı');
    }, 30000);
    return true;
  }
  if (cmd.startsWith('!oy ')) {
    if (!meta.wvote || meta.wvote.until < Date.now()) { botSay(ch, '🗳️ Oylama yok — !havaoy başlat'); return true; }
    const k = Object.keys(WEATHERS).find((x) => text.includes(x));
    if (!k) return true;
    meta.wvote.c[u.id] = k;
    send(byId.get(u.id), { t: 'toast', text: '🗳️ Oyun sayıldı: ' + WEATHERS[k] });
    return true;
  }
  if (cmd === '!balik' || cmd === '!balık') {
    if (!meta.fish) meta.fish = {};
    if (meta.fish[u.id]) { botSay(ch, '🐟 Zaten balığın var! !yem ver, büyüsün'); return true; }
    const p = profileOf(u.id);
    if (p.coins < 20) { botSay(ch, '🐟 Balık 20 🪙'); return true; }
    p.coins -= 20;
    meta.fish[u.id] = { t: FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)], xp: 0 };
    scheduleSave(); sendWallet(u);
    broadcast({ t: 'fish', fish: meta.fish });
    botSay(ch, `🐟 ${u.name} akvaryuma ${meta.fish[u.id].t} bıraktı! !yem ile besle`);
    return true;
  }
  if (cmd === '!yem') {
    if (!meta.fish) meta.fish = {};
    const f = meta.fish[u.id];
    if (!f) { botSay(ch, '🐟 Önce !balik al!'); return true; }
    const p = profileOf(u.id);
    const now = Date.now();
    if (now - (f.last || 0) < 180000) { botSay(ch, '🐟 Balık doydu! ' + Math.ceil((180000 - (now - f.last)) / 60000) + ' dk sonra'); return true; }
    if (p.coins < 2) { botSay(ch, '🐟 Yem 2 🪙'); return true; }
    p.coins -= 2; f.last = now; f.xp = (f.xp || 0) + 10;
    let extra = '';
    if (Math.random() < 0.1) { p.coins += 3; extra = ' — balık hazine buldu +3 🪙!'; }
    scheduleSave(); sendWallet(u);
    broadcast({ t: 'fish', fish: meta.fish });
    botSay(ch, `🐟 ${u.name} yem attı → balık Lv${fishStage(f)} ${fishEmoji(f)}${extra}`);
    return true;
  }
  if (cmd === '!baliklar' || cmd === '!balıklar') {
    const list = Object.entries(meta.fish || {}).map(([id, f]) => `${fishEmoji(f)} Lv${fishStage(f)} ${(meta.known[id] || {}).name || '?'}`);
    botSay(ch, '🐠 AKVARYUM: ' + (list.join(' • ') || 'boş — !balik al!'));
    return true;
  }
  if (cmd === '!kaos') {
    if (!isOwner(u)) { botSay(ch, '🌋 Sadece sahip başlatır!'); return true; }
    meta.chaos = { until: Date.now() + 60000 };
    scheduleSave();
    broadcast({ t: 'chaos', until: meta.chaos.until });
    botSay(ch, '🌋 KAOS MODU: 60 saniye! Mesajlar karışacak 😈');
    setTimeout(() => { broadcast({ t: 'chaos', until: 0 }); botSay('genel', '🌋 Kaos bitti, oh be 😮‍💨'); }, 60000);
    return true;
  }
  return false;
}

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
/* ---------------- 🏙️ SKYLINE REKLAM SİSTEMİ ---------------- */
const PLACES = {
  sidebar: { rate: 70, label: '📋 Sidebar panosu' },
  giris: { rate: 100, label: '🚪 Giriş ekranı' },
  sohbet: { rate: 90, label: '💬 Sohbet şeridi' },
};
const AD_HOURS = [1, 3, 6, 12, 24];
function adCost(places, hours) {
  const sum = places.reduce((t, p) => t + (PLACES[p] ? PLACES[p].rate : 0), 0);
  let total = sum * hours;
  if (hours >= 24) total *= 0.8; else if (hours >= 6) total *= 0.9;
  return Math.max(10, Math.round(total));
}
function doAd(u, places, hours, advText, ch) {
  const p = profileOf(u.id);
  places = (Array.isArray(places) ? places : ['sidebar']).filter((x) => PLACES[x]);
  if (!places.length || !advText) { botSay(ch, '🏙️ Eksik bilgi!'); return; }
  hours = AD_HOURS.includes(Number(hours)) ? Number(hours) : 1;
  const cost = adCost(places, hours);
  if (p.coins < cost) { botSay(ch, `🏙️ Bu reklam ${cost} 🪙 (${places.map((x) => PLACES[x].label).join(' + ')}, ${hours} saat) — sende ${p.coins}`); return; }
  p.coins -= cost;
  addAura(u.id, 25);
  cleanAds();
  meta.ads.push({ id: 'ad' + rid(), uid: u.id, name: u.name, places, hours, text: advText.slice(0, 140), until: Date.now() + hours * 3600000 });
  scheduleSave(); sendWallet(u);
  broadcast({ t: 'ads', ads: meta.ads });
  botSay('skyline', `📢 REKLAM YAYINDA (${hours} saat • ${cost}🪙): ${places.map((x) => PLACES[x].label).join(' + ')}\n│ ${advText}\n│ — ${u.name}`);
  botSay(ch, `🏙️ Reklamın yayında! ${hours} saat • ${cost} 🪙 harcandı 📢`);
}
const cleanAds = () => { if (!meta.ads) meta.ads = []; meta.ads = meta.ads.filter((a) => a.until > Date.now()); };
function runAds(u, cmd, text, ch) {
  if (cmd.startsWith('!ilan')) {
    const body = text.slice(5).trim();
    const icons = ['🏠', '', '', '📦', '🐾', ''];
    const icon = icons.find((i) => body.includes(i)) || '📦';
    const priceM = body.match(/(\d+)\s*(🪙|coin|tl)?$/i);
    const price = priceM ? parseInt(priceM[1], 10) : null;
    const title = body.replace(/\d+\s*(🪙|coin|tl)?$/i, '').trim().slice(0, 60) || 'İlan';
    if (!body) { botSay(ch, '🏙️ Kullanım: !ilan 🏠 Satılık ev 5000'); return true; }
    pushMessage(ch, { id: rid(), uid: u.id, name: u.name, color: u.color, ts: Date.now(), text: '', listing: { icon, title, price, seller: u.name }, profile: publicProfile(profileOf(u.id), u.id) });
    return true;
  }
  if (cmd.startsWith('!reklam')) {
    const rest = text.slice(7).trim();
    const hours = parseInt((rest.match(/\d+/) || [1])[0], 10);
    const advText = rest.split('|').slice(1).join('|').trim();
    if (!advText) { botSay(ch, '🏙️ Kullanım: !reklam 2 | 🍕 KANKA PİZZA! (saat • sidebar 70🪙/saat)\nMenüden tüm konumları seç: #Skyline → 📢 Reklam Bas'); return true; }
    doAd(u, ['sidebar'], hours, advText, ch);
    return true;
  }
  if (cmd === '!panolar') {
    cleanAds();
    if (!meta.ads.length) { botSay(ch, '🏙️ Pano boş — ilk sen çık! #Skyline → 📢 Reklam Bas'); return true; }
    botSay(ch, '🏙️ AKTİF PANOLAR:\n' + meta.ads.map((a2) => `[${a2.places.map((x) => PLACES[x].label).join('+')}] ${Math.max(0, Math.round((a2.until - Date.now()) / 3600000))}sa kaldı • ${a2.text} — ${a2.name}`).join('\n'));
    return true;
  }
  return false;
}

/* ---------------- 🎰 CASINO & EKONOMİ DERİN ---------------- */
const bjState = {}, advState = {}, memState = {};
let potState = null, mafState = null;
const tradeState = {};
const cardVal = (c) => Math.min(10, parseInt(c, 10) || (['J', 'Q', 'K'].includes(c) ? 10 : 11));
const handVal = (h) => { let v = h.reduce((a, c) => a + cardVal(c), 0); let ace = h.filter((c) => c === 'A').length; while (v > 21 && ace) { v -= 10; ace--; } return v; };
const drawCard = () => { const r = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']; return r[Math.floor(Math.random() * r.length)]; };
const SONG_DB = [{"id": "X8l_uVHBoOM", "title": "ardanın bebası"}, {"id": "l1TbryOgQn8", "title": "ömer fantazisibro part3"}, {"id": "XFaBoDNIR7A", "title": "Osman tuş armut piş azıma düş"}, {"id": "w6IlHVCjRlY", "title": "ömerin fantazisibro part2"}, {"id": "ODHaL2BuViQ", "title": "armut piş azıma düs"}, {"id": "b2pG_faQCYo", "title": "arda ile gökhan abi"}, {"id": "9S7xe4ZlUSk", "title": "ömerin ultra fantazisibro"}];
const LYRICS = [
  { l: '“İstanbul’da vapur dumanı…”', a: ['istanbul', 'vapur'] },
  { l: '“Gülümse, hadi gülümse…”', a: ['gülümse', 'gulümse', 'sezen'] },
  { l: '“Kara tren gecikir belki hiç gelmez…”', a: ['kara tren', 'tren'] },
  { l: '“Şımarık şımarık öpücük…”', a: ['şımarık', 'simarik', 'tarkan'] },
  { l: '“Dağlar dağlar, kurbanım dağlar…”', a: ['dağlar', 'daglar'] },
];
const ADV_EVENTS = [
  { t: '🌲 Ormanda yol ayrımı. Kurt sesi geliyor…', a: ['A) Ağaca tırman', 'B) Yola devam'] },
  { t: '️ Eski bir mağara buldun, içinden ışık sızıyor.', a: ['A) Gir', 'B) Taş at'] },
  { t: '🧙 Yaşlı bir büyücü para istiyor.', a: ['A) 10🪙 ver', 'B) Geç'] },
  { t: '🐻 Bir ayı kampına yaklaştın!', a: ['A) Kaç', 'B) Bal ver'] },
  { t: '💧 Nehir taştı, karşıda hazine parlıyor.', a: ['A) Yüz', 'B) Köprü ara'] },
];

function runDeep(u, cmd, text, ch) {
  const p = profileOf(u.id);
  /* 🃏 BLACKJACK */
  if (cmd.startsWith('!21')) {
    const bet = parseInt((text.replace(/!21/, '').match(/\d+/) || [10])[0], 10);
    if (p.coins < bet) { botSay(ch, '🃏 O kadar coinin yok!'); return true; }
    p.coins -= bet; scheduleSave(); sendWallet(u);
    bjState[u.id] = { p: [drawCard(), drawCard()], d: [drawCard(), drawCard()], bet };
    const s = bjState[u.id];
    if (handVal(s.p) === 21) { p.coins += bet * 3; scheduleSave(); sendWallet(u); delete bjState[u.id]; botSay(ch, `🃏 BLACKJACK! ${u.name} x3 kazandı (+${bet * 3}) 🎉`); return true; }
    const bjg = { type: 'bj', uid: u.id, btns: ['🃏 Çek', '🛑 Dur'], hand: s.p.join(' '), hv: handVal(s.p), dshow: s.d[0], bet };
    bjState[u.id].msgId = postGame(ch, bjg, `🃏 BLACKJACK (bahis ${bet}🪙) — butonlara bas!`);
    return true;
  }
  if (cmd === '!cek' || cmd === '!dur') {
    const s = bjState[u.id];
    if (!s) { botSay(ch, '🃏 El yok — !21 10 ile başla'); return true; }
    if (cmd === '!cek') s.p.push(drawCard());
    const pv = handVal(s.p);
    if (pv > 21 || cmd === '!dur') {
      while (handVal(s.d) < 17) s.d.push(drawCard());
      const dv = handVal(s.d);
      let msg = `🃏 Sen [${s.p.join(' ')}]=${pv} • Krupiye [${s.d.join(' ')}]=${dv} → `;
      if (pv > 21) { msg += 'BATTIN 💸'; }
      else if (dv > 21 || pv > dv) { p.coins += s.bet * 2; msg += `KAZANDIN +${s.bet * 2} 🎉`; }
      else if (pv === dv) { p.coins += s.bet; msg += 'berabere, iade 🤝'; }
      else msg += 'krupiye aldı 😔';
      scheduleSave(); sendWallet(u); delete bjState[u.id];
      botSay(ch, msg);
    } else {
      botSay(ch, `🃏 [${s.p.join(' ')}] = ${pv} • !cek / !dur`);
    }
    return true;
  }
  /* 🎁 GİZEMLİ KUTU */
  if (cmd === '!kutu') {
    if (p.coins < 50) { botSay(ch, '🎁 Kutu 50 🪙!'); return true; }
    p.coins -= 50;
    const r = Math.random();
    let out;
    if (r < 0.35) { const g = 10 + Math.floor(Math.random() * 30); p.coins += g; out = `💨 ${g} 🪙 çıktı (eh işte)`; }
    else if (r < 0.7) { const g = 60 + Math.floor(Math.random() * 60); p.coins += g; out = `🪙 ${g} coin çıktı!`; }
    else if (r < 0.92) { const items = SHOP.filter((s) => s.price <= 500); const it = items[Math.floor(Math.random() * items.length)]; p.owned.push(it.id); out = `🎁 ${it.label} çıktı!!`; }
    else { const it = SHOP.find((s) => s.id === 'b_dia'); p.owned.push(it.id); out = '💎 EFSANE! Elmas rozet çıktı!!!'; }
    scheduleSave(); sendWallet(u);
    broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
    botSay(ch, `🎁 ${u.name} kutu açtı: ${out}`);
    return true;
  }
  /* 🏦 BANKA */
  if (cmd === '!banka') { botSay(ch, `🏦 Bankanda: ${meta.banks ? meta.banks[u.id] || 0 : 0} 🪙 (her gün +%5 faiz, max 50/gün)`); return true; }
  if (cmd.startsWith('!yatir')) {
    const n = parseInt((text.match(/\d+/) || [0])[0], 10);
    if (!n || p.coins < n) { botSay(ch, '🏦 Geçerli miktar yaz (coinin yetmeli)'); return true; }
    p.coins -= n;
    if (!meta.banks) meta.banks = {};
    meta.banks[u.id] = (meta.banks[u.id] || 0) + n;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🏦 ${n} 🪙 yatırıldı. Faiz işliyor… 💤`);
    return true;
  }
  if (cmd.startsWith('!cekbank') || cmd === '!bankacek') {
    if (!meta.banks) meta.banks = {};
    const n2 = parseInt((text.match(/\d+/) || [0])[0], 10);
    const bal = meta.banks[u.id] || 0;
    if (!n2 || bal < n2) { botSay(ch, `🏦 Bankanda ${bal} 🪙 var`); return true; }
    meta.banks[u.id] = bal - n2; p.coins += n2;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🏦 ${n2} 🪙 çekildi`);
    return true;
  }
  /* 📈 BORSA */
  if (!meta.stock) meta.stock = { price: 100 };
  if (cmd === '!hisse' || cmd === '!borsa') {
    const sh = (meta.shares || {})[u.id] || 0;
    const pr = Math.round(meta.stock.price);
    const trend = meta.stock.last ? (pr >= meta.stock.last ? '📈' : '📉') : '➖';
    botSay(ch, `📈 KankaHisse: ${pr} 🪙 ${trend} • Elinde: ${sh} hisse (${sh * pr} 🪙) • al/sat: !hisse al 5`);
    return true;
  }
  if (cmd.startsWith('!hisse al') || cmd.startsWith('!hisse sat')) {
    const n = parseInt((text.match(/\d+/) || [0])[0], 10);
    const pr = Math.round(meta.stock.price);
    if (!meta.shares) meta.shares = {};
    const sh = meta.shares[u.id] || 0;
    if (cmd.includes('al')) {
      if (!n || p.coins < n * pr) { botSay(ch, `📈 ${n} hisse = ${n * pr} 🪙 lazım`); return true; }
      p.coins -= n * pr; meta.shares[u.id] = sh + n;
    } else {
      if (!n || sh < n) { botSay(ch, `📈 Elinde ${sh} hisse var`); return true; }
      meta.shares[u.id] = sh - n; p.coins += n * pr;
    }
    scheduleSave(); sendWallet(u);
    botSay(ch, `📈 İşlem tamam: ${cmd.includes('al') ? 'aldın' : 'sattın'} ${n} @ ${pr}`);
    return true;
  }
  /* 🎫 LOTO */
  if (cmd === '!loto') {
    if (p.coins < 20) { botSay(ch, '🎫 Bilet 20 🪙'); return true; }
    if (!meta.lotto) meta.lotto = { tickets: [], pot: 0 };
    if (meta.lotto.tickets.includes(u.id)) { botSay(ch, '🎫 Bugün zaten biletin var!'); return true; }
    p.coins -= 20; meta.lotto.tickets.push(u.id); meta.lotto.pot += 20;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🎫 Bilet alındı! Pot: ${meta.lotto.pot * 2} 🪙 — çekiliş yarın ilk girişte!`);
    return true;
  }
  /* 🕵️ SOYGUN */
  if (cmd === '!soygun') {
    if (p.lastHeist === new Date().toDateString()) { botSay(ch, '🕵️ Polisi atlattın ama bugün yoruldun — yarın!'); return true; }
    p.lastHeist = new Date().toDateString();
    const r = Math.random();
    if (r < 0.5) { const g = 100 + Math.floor(Math.random() * 200); p.coins += g; botSay(ch, `🕵️ SOYGUN BAŞARILI! +${g} 🪙 `); }
    else if (r < 0.9) botSay(ch, '🕵️ Kasa boştu… polise yakalanmadan kaçtın 😮‍💨');
    else {
      if (!nazarSave(u, p)) { p.coins = Math.max(0, p.coins - 50); tombstone(ch, u.name); botSay(ch, '🚔 YAKALANDIN! Kefalet: -50 🪙'); }
    }
    scheduleSave(); sendWallet(u);
    return true;
  }
  /* 🕹️ HAFIZA */
  if (cmd === '!hafiza') {
    const emo = ['🍒', '', '', '🔔'];
    const cards = [...emo, ...emo].sort(() => Math.random() - 0.5).map((e) => ({ e, open: false, m: false }));
    memState[u.id] = { cards, first: null, moves: 0, msgId: null };
    botSay(ch, '🕹️ HAFIZA OYUNU başladı — kartlara tıkla, eşleri bul! (+5 🪙)', { game: { type: 'mem', uid: u.id, cards: cards.map((c) => ({ e: '❓', open: false, m: false })), moves: 0 } });
    const last = (messages[ch] || []).slice(-1)[0];
    if (last && last.game) memState[u.id].msgId = last.id;
    return true;
  }
  /* 🐔 ÇİFTLİK */
  if (!meta.farm) meta.farm = {};
  if (cmd === '!ek') {
    if (meta.farm[u.id]) { botSay(ch, '🐔 Zaten ekili! !tarla bak'); return true; }
    if (p.coins < 10) { botSay(ch, '🐔 Tohum 10 🪙'); return true; }
    p.coins -= 10; meta.farm[u.id] = { at: Date.now() };
    scheduleSave(); sendWallet(u);
    botSay(ch, `🐔 Tohum ekildi! 10 dk sonra !hasat et 🌱`);
    return true;
  }
  if (cmd === '!tarla') {
    const f = meta.farm[u.id];
    if (!f) { botSay(ch, '🐔 Tarla boş — !ek 10'); return true; }
    const dk = Math.floor((Date.now() - f.at) / 60000);
    botSay(ch, dk >= 10 ? '🐔 Ürün HAZIR! !hasat et 🌾' : `🐔 Büyüyor… ${10 - dk} dk kaldı 🌱`);
    return true;
  }
  if (cmd === '!hasat') {
    const f = meta.farm[u.id];
    if (!f) { botSay(ch, '🐔 Bir şey ekmedin!'); return true; }
    if (Date.now() - f.at < 600000) { botSay(ch, '🐔 Daha büyümedi! 🌱'); return true; }
    delete meta.farm[u.id];
    p.coins += 40;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🌾 HASAT! +40 🪙 (10🪙 → 40🪙, güzel kâr 😎)`);
    return true;
  }
  /* 🗺️ MACERA */
  if (cmd === '!macera') {
    const ev = ADV_EVENTS[Math.floor(Math.random() * ADV_EVENTS.length)];
    advState[u.id] = { step: 0, coins: 0 };
    advState[u.id].ev = ev;
    postGame(ch, { type: 'mac', uid: u.id, btns: [ev.a[0], ev.a[1]], step: 1 }, `🗺️ MACERA 1/4: ${ev.t}`);
    return true;
  }
  if (cmd.startsWith('!sec')) {
    const a = advState[u.id];
    if (!a) { botSay(ch, '🗺️ Macera yok — !macera'); return true; }
    const good = Math.random() < 0.55;
    a.coins += good ? 15 : 5;
    a.step++;
    if (a.step >= 4) {
      p.coins += a.coins;
      scheduleSave(); sendWallet(u);
      botSay(ch, `🗺️ MACERA BİTTİ! Toplam +${a.coins} 🪙 `);
      delete advState[u.id];
    } else {
      const ev = ADV_EVENTS[Math.floor(Math.random() * ADV_EVENTS.length)];
      a.ev = ev;
      botSay(ch, `${good ? '✅ İyi seçim!' : '😬 Tehlikeliydi…'} (+${good ? 15 : 5})\n🗺️ ${a.step + 1}/4: ${ev.t}\n${ev.a[0]} • ${ev.a[1]}`);
    }
    return true;
  }
  /* 🐾 PET KAPIŞMA */
  if (cmd.startsWith('!kapisma')) {
    const tgt = findOnline(text.slice(9));
    if (!tgt || tgt.id === u.id) { botSay(ch, '🐾 Kullanım: !kapisma @isim'); return true; }
    const pa = p.pet, pb = profileOf(tgt.id).pet;
    if (!pa || !pb) { botSay(ch, '🐾 İkinizin de peti olmalı!'); return true; }
    const sa = petLvl(pa) * 10 + Math.random() * 20, sb = petLvl(pb) * 10 + Math.random() * 20;
    const winA = sa >= sb;
    const wp = winA ? p : profileOf(tgt.id);
    wp.pet.xp += 20;
    if (winA) p.coins += 10; else profileOf(tgt.id).coins += 10;
    scheduleSave(); sendWallet(u);
    const tw = byId.get(tgt.id); if (tw) sendWallet(users.get(tw));
    botSay(ch, `🐾 KAPIŞMA: ${petFace(pa)} ${Math.round(sa)} vs ${Math.round(sb)} ${petFace(pb)} → 🏆 ${winA ? u.name : tgt.name}! (+10 🪙, pet +20 xp)`);
    return true;
  }
  /* 💣 SICAK PATATES */
  if (cmd === '!patates') {
    if (potState) { botSay(ch, '💣 Zaten oyun var!'); return true; }
    const online = [...users.values()];
    if (online.length < 2) { botSay(ch, '💣 En az 2 kişi lazım!'); return true; }
    const holder = online[Math.floor(Math.random() * online.length)];
    potState = { holder: holder.id, rounds: 0 };
    botSay(ch, `💣 BOMBA ${holder.name}'de! 5 sn içinde !pas yaz, yoksa PATLAR 💥 (-5 🪙)`);
    schedulePotato(ch);
    return true;
  }
  if (cmd === '!pas') {
    if (!potState || potState.holder !== u.id) { if (potState) botSay(ch, `💣 Bomba sende değil! (${(meta.known[potState.holder] || {}).name || '?'}'de)`); return true; }
    const online = [...users.values()].filter((x) => x.id !== u.id);
    const next = online[Math.floor(Math.random() * online.length)];
    potState.holder = next.id;
    potState.rounds++;
    if (potState.rounds >= 8) { potState = null; botSay(ch, '💣 Bomba söndü! Kimse patlamadı, herkes +2 🪙 '); online.forEach((o) => addCoins(o, 2, '')); return true; }
    botSay(ch, `💣 PAS! Bomba ${next.name}'de! 5 sn…`);
    schedulePotato(ch);
    return true;
  }
  /* 🎤 ŞARKI SÖZÜ */
  if (cmd === '!sozquiz') {
    const q = LYRICS[Math.floor(Math.random() * LYRICS.length)];
    songQuizState[ch] = { a: q.a, active: true };
    botSay(ch, `🎤 SÖZ QUIZ: ${q.l} — bu hangi şarkı? (+3 🪙)`);
    return true;
  }
  /* 🔄 TAKAS */
  if (cmd.startsWith('!takas')) {
    const tgt = findOnline(text.slice(6));
    if (!tgt || tgt.id === u.id) { botSay(ch, '🔄 Kullanım: !takas @isim'); return true; }
    tradeState[u.id] = { with: tgt.id, off: {}, acc: {} };
    const tw = byId.get(tgt.id);
    if (tw) send(tw, { t: 'toast', text: `🔄 ${u.name} takas istiyor! !takas @${u.name} yazarak aç` });
    botSay(ch, `🔄 ${tgt.name} kişisine takas isteği gitti. O da !takas @${u.name} yazınca oturum açılır.`);
    return true;
  }
  if (cmd.startsWith('!toffer')) {
    const t = Object.values(tradeState).find((x) => (x.with === u.id && tradeState[Object.keys(tradeState).find((k) => tradeState[k] === x)]));
    const sess = Object.entries(tradeState).find(([k, v]) => v.with === u.id || k === u.id);
    if (!sess) { botSay(ch, '🔄 Takas oturumu yok'); return true; }
    const [ka, v] = sess;
    const other = v.with === u.id ? ka : v.with;
    const n = parseInt((text.match(/\d+/) || [0])[0], 10) || 0;
    v.off[u.id] = { c: n };
    botSay(ch, `🔄 Teklifin: ${n} 🪙 • karşı: ${v.off[other] ? v.off[other].c : 0} 🪙 • onay: !tonay`);
    return true;
  }
  if (cmd === '!tonay') {
    const sess = Object.entries(tradeState).find(([k, v]) => v.with === u.id || k === u.id);
    if (!sess) return true;
    const [ka, v] = sess;
    const other = v.with === u.id ? ka : v.with;
    v.acc[u.id] = true;
    if (v.acc[other]) {
      const pa2 = profileOf(ka), pb2 = profileOf(v.with);
      const ca = (v.off[ka] || {}).c || 0, cb = (v.off[v.with] || {}).c || 0;
      pa2.coins = pa2.coins - ca + cb;
      pb2.coins = pb2.coins - cb + ca;
      scheduleSave();
      delete tradeState[ka];
      const w1 = byId.get(ka), w2 = byId.get(v.with);
      if (w1) sendWallet(users.get(w1)); if (w2) sendWallet(users.get(w2));
      botSay(ch, `🔄 TAKAS TAMAM! ${ca}🪙 ↔ ${cb}🪙 el değiştirdi 🤝`);
    } else botSay(ch, '🔄 Onayın alındı, karşı taraf bekleniyor…');
    return true;
  }
  /* ⚖️ MAHKEME */
  if (cmd.startsWith('!mahkeme')) {
    const tgt = findOnline(text.slice(9).split(' için ')[0].split(' sebebiyle')[0]);
    if (!tgt) { botSay(ch, '⚖️ Kullanım: !mahkeme @isim'); return true; }
    botSay(ch, `⚖️ MAHKEME AÇILDI: ${tgt.name} sanık! Suç: ${text.slice(9).replace(/@[\wğüşöçİı]+/, '').trim() || 'kankalık görevini ihmal'}\n30 sn oy: 👍 suçlu • 👎 masum (tepkilerle!)`, { poll: { q: `${tgt.name} suçlu mu?` }, reactions: { '👍': [], '👎': [] } });
    const msgId = (messages[ch] || []).slice(-1)[0].id;
    setTimeout(() => {
      const m2 = findMsg(ch, msgId);
      if (!m2) return;
      const g = (m2.reactions['👍'] || []).length, ino = (m2.reactions['👎'] || []).length;
      botSay(ch, g > ino ? `⚖️ KARAR: SUÇLU! ${tgt.name} 10 dk susturuldu 😤 (jüri ${g}-${ino})` : `⚖️ KARAR: MASUM! ${tgt.name} beraat etti 🕊️ (${ino}-${g})`);
      if (g > ino) { if (!meta.timeouts) meta.timeouts = {}; meta.timeouts[tgt.id] = Date.now() + 600000; broadcast({ t: 'users', users: allUsers() }); }
    }, 30000);
    return true;
  }
  /* 🕵️ MAFYA */
  if (cmd === '!mafya') {
    if (mafState) { botSay(ch, '🕵️ Tur zaten var!'); return true; }
    const online = [...users.values()];
    if (online.length < 3) { botSay(ch, '🕵️ En az 3 kişi lazım'); return true; }
    const mafia = online[Math.floor(Math.random() * online.length)];
    mafState = { mafia: mafia.id, until: Date.now() + 45000 };
    online.forEach((o) => {
      const ow = byId.get(o.id);
      if (ow) send(ow, { t: 'toast', text: o.id === mafia.id ? '🕵️ SEN MAFYASIN! Yakalanma…' : '🕵️ Mafya kim? 45 sn içinde !suclu @isim' });
    });
    botSay(ch, '🕵️ MAFYA aramızda! Herkese gizli rol bildirildi. 45 sn…');
    setTimeout(() => {
      if (!mafState) return;
      const mf = mafState; mafState = null;
      const mp = profileOf(mf.mafia);
      mp.coins += 15; scheduleSave();
      const mw = byId.get(mf.mafia); if (mw) sendWallet(users.get(mw));
      botSay(ch, `🕵️ Süre doldu! Mafya ${(meta.known[mf.mafia] || {}).name} idi — kaçtı, +15 🪙 😈`);
    }, 45000);
    return true;
  }
  if (cmd.startsWith('!suclu')) {
    if (!mafState) { botSay(ch, '🕵️ Tur yok'); return true; }
    const tgt = findOnline(text.slice(6));
    if (!tgt) return true;
    if (tgt.id === mafState.mafia) {
      const town = [...users.values()].filter((x) => x.id !== mafState.mafia);
      town.forEach((o) => addCoins(o, 5, '🕵️ mafyayı buldun'));
      mafState = null;
      botSay(ch, `🕵️ DOĞRU! ${tgt.name} mafyaydı! Kasaba +5 🪙 `);
    } else botSay(ch, `🕵️ ${tgt.name} masummuş… Mafya sırıtıyor 😏`);
    return true;
  }
  /* 🎯 XO BAHİS */
  if (cmd.startsWith('!bahisxo')) {
    botSay(ch, '🎯 XO bahsi: !xo oyununda kazananı tahmin et: !xobet @isim 10');
    return true;
  }
  if (cmd.startsWith('!xobet')) {
    const tgt = findOnline(text.slice(7).split(/\s+/)[0]);
    const n = parseInt((text.match(/\d+/) || [0])[0], 10);
    if (!tgt || !n || p.coins < n) { botSay(ch, '🎯 Kullanım: !xobet @isim 10'); return true; }
    p.coins -= n;
    if (!meta.xobets) meta.xobets = {};
    meta.xobets[u.id] = { pick: tgt.id, n };
    scheduleSave(); sendWallet(u);
    botSay(ch, `🎯 Bahis: ${tgt.name} kazanırsa x2! (${n} 🪙)`);
    return true;
  }
  /* 🎯 GÜNLÜK CHALLENGE */
  if (cmd === '!gorevler' || cmd === '!challenge') {
    const c = ensureChal(u);
    botSay(ch, '🎯 GÜNLÜK CHALLENGE:\n' + c.list.map((q2, i) => `${q2.claimed ? '✅' : '⬜'} ${q2.label} (${Math.min(c.cur[q2.key] - c.base[q2.key], q2.need)}/${q2.need}) → !gal ${i + 1}`).join('\n'));
    return true;
  }
  if (cmd.startsWith('!gal')) {
    const idx = parseInt((text.match(/\d+/) || [0])[0], 10) - 1;
    const c = ensureChal(u);
    const q2 = c.list[idx];
    if (!q2 || q2.claimed) return true;
    if (c.cur[q2.key] - c.base[q2.key] < q2.need) { botSay(ch, '🎯 Daha tamamlanmadı!'); return true; }
    q2.claimed = true;
    p.coins += q2.reward;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🎯 Challenge tamam! +${q2.reward} 🪙`);
    return true;
  }
  return false;
}
const songQuizState = {};
function postGame(chId, game, text) {
  return pushMessage(chId, { id: rid(), ...BOT, text: text || '', ts: Date.now(), game }).id;
}
const TR_LETTERS = ['a','b','c','d','e','f','g','h','ı','i','j','k','l','m','n','o','p','r','s','t','u','v','y','z'];
function schedulePotato(ch) {
  setTimeout(() => {
    if (!potState) return;
    const h = potState.holder;
    potState = null;
    const hp2 = profileOf(h);
    hp2.coins = Math.max(0, hp2.coins - 5);
    scheduleSave();
    const hw = byId.get(h); if (hw) sendWallet(users.get(hw));
    broadcast({ t: 'fx', kind: 'bomba' });
    botSay(ch, `💥 PATLADI! ${(meta.known[h] || {}).name} yandı -5 🪙 😂`);
  }, 5000);
}
function ensureChal(u) {
  if (!meta.chal) meta.chal = {};
  const today = new Date().toDateString();
  let c = meta.chal[u.id];
  const p = profileOf(u.id);
  if (!c || c.date !== today) {
    c = {
      date: today,
      base: { msgs: p.msgs || 0, wins: p.wins || 0, reacts: (p.quests && p.quests.c && p.quests.c.reacts) || 0 },
      cur: { msgs: p.msgs || 0, wins: p.wins || 0, reacts: 0 },
      list: [
        { label: '15 mesaj gönder', key: 'msgs', need: 15, reward: 15, claimed: false },
        { label: '2 oyun kazan', key: 'wins', need: 2, reward: 20, claimed: false },
      ],
    };
    meta.chal[u.id] = c;
    scheduleSave();
  }
  c.cur = { msgs: p.msgs || 0, wins: p.wins || 0, reacts: c.cur.reacts };
  return c;
}

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
  addAura(u.id, 10);
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
/* 🎭 MASKELİ BALO — takma adlar */
const MASK_EMO = ['🦊', '🐸', '🐺', '', '🐼', '🐨', '', '🐙', '🦉', '🐢', '🦋', '', '', '🐞', '🦔', ''];
const MASK_ADJ = ['Gizli', 'Maskeli', 'Sessiz', 'Gece', 'Duman', 'Pusu', 'Gölge', 'Sır'];
function displayNameOf(u) {
  if ((meta.maskUntil || 0) > Date.now()) {
    if (!meta.masks) meta.masks = {};
    if (!meta.masks[u.id]) meta.masks[u.id] = MASK_EMO[Math.floor(Math.random() * MASK_EMO.length)] + ' ' + MASK_ADJ[Math.floor(Math.random() * MASK_ADJ.length)] + '-' + (1 + Math.floor(Math.random() * 90));
    return meta.masks[u.id];
  }
  return u.name;
}
const EPITAPHS = ['"coin kasarken yakalandı"', '"son sözü: bi tur daha"', '"bahse girdi, mezarı kaybetti"', '"polisle hâlâ pazarlık ediyor"', '"mezar taşında bile borç yazıyor"', '"kefen parasını slot\'a gömdü"'];
const tombstone = (ch, name) => botSay(ch, `🪦 RIP ${name} — burada yatıyor… ${EPITAPHS[Math.floor(Math.random() * EPITAPHS.length)]}`);
function nazarSave(u, p) {
  if ((p.nazar || 0) > 0) {
    p.nazar--; scheduleSave(); sendWallet(u);
    botSay(u.channelId, `🧿 Nazar boncuğun çatladı ama coinlerin korundu kanka! (${p.nazar} hak kaldı)`);
    return true;
  }
  return false;
}
const magnetMult = (u, n) => (profileOf(u.id).owned.includes('magnet') ? Math.round(n * 1.1) : n);

function publicUser(u) {
  return { id: u.id, name: displayNameOf(u), color: u.color, channelId: u.channelId, voiceId: u.voiceId, muted: u.muted, role: u.role, presence: u.presence || 'online', timedOut: !!(meta.timeouts && meta.timeouts[u.id] && Date.now() < meta.timeouts[u.id]), roleId: (meta.userRoles || {})[u.id] || null, profile: publicProfile(profileOf(u.id), u.id) };
}
function addCoins(u, n, why) {
  const p = profileOf(u.id);
  if (n > 0 && (meta.weather || 'gunes') === 'firtina') n = Math.round(n * 1.2);
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

// 🕯️ Üzgünler V2 karşılama tabelası
if (Array.isArray(messages['uzgunler']) && !messages['uzgunler'].length) {
  botSay('uzgunler', '🕯️ ÜZGÜNLER V2 — hüzünlü kankaların mekanı 💙\nYalnız değilsin kanka, buradayız.\n📚 ÖZEL BÖLÜMLER (alt kanallar 👇):\n️ Mum Köşesi → !mum ile mum yak\n🫂 Sarılma Duvarı → !saril @isim ile sanal sarıl\n📜 Dert Dökme → burada herkes ANONİM, içini dök\n💌 Mektup Kutusu → !mektup yaz duvara asılsın • !mektuplar\nBu kanalda hava hep yağmurlu 🌧️ ama kalpler sıcak 🤍');
}

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
  for (let i = 0; i < 2; i++) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch('https://text.pollinations.ai/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctl.signal });
      clearTimeout(to);
      const txt = (await res.text() || '').trim();
      if (res.ok && txt && !txt.startsWith('{"error')) return txt;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 800));
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

  botSay(ch, '✨ KankaAI düşünüyor… 🤔');
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
  if (cmd === '!sarkilar' || cmd === '!şarkılar') {
    botSay(ch, '🎵 ULTRA ŞARKI VİDEOLARI (#Şarkılarımız):\n' + SONG_DB.map((s2, i) => `${i + 1}. ${s2.title}`).join('\n') + '\nDinle: !dinle 1 • Rastgele: !çal');
    return true;
  }
  if (cmd.startsWith('!dinle')) {
    const q = text.slice(6).trim();
    const n = parseInt(q, 10);
    let s2 = (n >= 1 && n <= SONG_DB.length) ? SONG_DB[n - 1] : SONG_DB.find((x) => trLow(x.title).includes(trLow(q)));
    if (!s2) { botSay(ch, '🎵 Bulamadım — !sarkilar ile listeye bak'); return true; }
    botSay(ch, `🎵 ${s2.title} → https://www.youtube.com/shorts/${s2.id}`);
    return true;
  }
  if (cmd === '!cal' || cmd === '!çal') {
    const s2 = SONG_DB[Math.floor(Math.random() * SONG_DB.length)];
    botSay(ch, `🎵 Rastgele: ${s2.title} → https://www.youtube.com/shorts/${s2.id}`);
    return true;
  }
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
    postGame(ch, { type: 'adam', btns: TR_LETTERS, mask: '_ '.repeat(word.length).trim(), hearts: 6 }, `🪢 ADAM ASMACA — harflere bas ya da yaz! (${word.length} harf, 6 hak ❤️)`);
  } else if (cmd.startsWith('!sayi')) {
    numState[ch] = { n: 1 + Math.floor(Math.random() * 100), tries: 0, active: true };
    botSay(ch, '🔢 1-100 arası sayı tuttum! Sayı yaz, yukarı/aşağı diyeyim. Bilene +4 🪙');
  } else if (cmd.startsWith('!film')) {
    const f = FILMS[Math.floor(Math.random() * FILMS.length)];
    filmState[ch] = { a: f.a, active: true };
    const wrongs = FILMS.filter((x) => x.a[0] !== f.a[0]).sort(() => Math.random() - 0.5).slice(0, 2).map((x) => x.a[0]);
    const opts = [f.a[0], ...wrongs].sort(() => Math.random() - 0.5);
    filmState[ch].opts = opts;
    postGame(ch, { type: 'quiz', key: 'film', btns: opts.map((o) => '🎬 ' + o), correct: opts.indexOf(f.a[0]) }, `🎬 EMOJİ FİLM: ${f.e} — şıklara bas ya da yaz! (+4 🪙)`);
  } else if (cmd.startsWith('!anagram')) {
    const word = ANA_WORDS[Math.floor(Math.random() * ANA_WORDS.length)];
    anaState[ch] = { word, active: true };
    const wr3 = ANA_WORDS.filter((x) => x !== word).sort(() => Math.random() - 0.5).slice(0, 2);
    const op3 = [word, ...wr3].sort(() => Math.random() - 0.5);
    anaState[ch].opts = op3;
    postGame(ch, { type: 'quiz', key: 'ana', btns: op3.map((o) => '🔀 ' + o), correct: op3.indexOf(word) }, `🔀 ANAGRAM: “${scramble(word)}” — şık ya da yaz! (+3 🪙)`);
  } else if (cmd.startsWith('!mat')) {
    const a = 2 + Math.floor(Math.random() * 12), b = 2 + Math.floor(Math.random() * 12);
    const op = ['+', '-', 'x'][Math.floor(Math.random() * 3)];
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    matState[ch] = { ans, active: true };
    botSay(ch, `➗ MATEMATİK: ${a} ${op} ${b} = ? (cevabı sayı olarak yaz, +2 🪙)`);
  } else if (cmd.startsWith('!sarki')) {
    const s = SONGS[Math.floor(Math.random() * SONGS.length)];
    songState[ch] = { a: s.a, active: true };
    const wr2 = SONGS.filter((x) => x.a[0] !== s.a[0]).sort(() => Math.random() - 0.5).slice(0, 2).map((x) => x.a[0]);
    const op2 = [s.a[0], ...wr2].sort(() => Math.random() - 0.5);
    songState[ch].opts = op2;
    postGame(ch, { type: 'quiz', key: 'sarki', btns: op2.map((o) => '🎵 ' + o), correct: op2.indexOf(s.a[0]) }, `🎵 EMOJİ ŞARKI: ${s.e} — şık ya da yaz! (+3 🪙)`);
  } else if (cmd.startsWith('!tkm')) {
    const pick = (t) => t.includes('taş') || t.includes('tas') ? 'taş' : t.includes('kağıt') || t.includes('kagit') ? 'kağıt' : t.includes('makas') ? 'makas' : null;
    const uPick = pick(trLow(text));
    if (!uPick) { postGame(ch, { type: 'tkm', btns: ['✊ Taş', '✋ Kağıt', '✌️ Makas'] }, '✂️ TAŞ-KAĞIT-MAKAS — seç! (kazanana +2 🪙)'); return true; }
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
      postGame(ch, { type: 'rulet', bet: 10, btns: ['🔴 Kırmızı x2', '⚫ Siyah x2', '🟢 Yeşil x10'] }, '🎡 RULET (10🪙) — rengine bas!'); return true;
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
  } else if (cmd === '!yenilikler' || cmd === '!surum') {
    botSay(ch, '🆕 KANKACHAT SÜRÜM NOTLARI:\n' + CHANGELOG.join('\n'));
    return true;
  } else if (runWorld(u, cmd, text, ch)) {
    /* dünya */
  } else if (runAds(u, cmd, text, ch)) {
    /* skyline */
  } else if (runDeep(u, cmd, text, ch)) {
    /* derin mantık */
  } else if (runMod(u, cmd, text, ch)) {
    /* moderasyon */
  } else if (runSocial(u, cmd, text, ch)) {
    /* sosyal paket */
  } else if (runEco(u, cmd, text, ch)) {
  } else if (runUzgun(u, cmd, text, ch)) {
  } else if (runV3(u, cmd, text, ch)) {
    /* ekonomi paketi işlendi */
  } else if (cmd === '!sovlar') {
    botSay(ch, '🎆 ŞOVLAR: ' + Object.entries(SOVS).map(([k, s]) => `!${k} → ${s.cost}🪙 ${s.label}`).join(' • '));
  } else if (trySov(u, cmd, ch)) {
    /* şov işlendi */
  } else if (cmd === '!slot') {
    postGame(ch, { type: 'slot', btns: ['🎰 ÇEK (5🪙)'] }, '🎰 SLOT — kolu çek! (3 aynı x5, 2 aynı x2)');
    return true;
  } else if (cmd === '!yazitura') {
    postGame(ch, { type: 'flip', btns: ['⭕ Yazı', '🦅 Tura'] }, '🪙 YAZI TURA (5🪙) — tut! (x2)');
    return true;
  } else if (cmd === '!zars') {
    postGame(ch, { type: 'zars', btns: ['🎲 ZAR AT'] }, '🎡 ZAR — at! (6 gelirse +10 🪙)');
    return true;
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
      { const lUid = wUid === u.id ? d.from : u.id; const lw = byId.get(lUid); const lu = lw ? users.get(lw) : null;
        if (lu) { const lp = profileOf(lUid); if (nazarSave(lu, lp)) addCoins(lu, d.amount, '🧿 nazar iadesi'); else tombstone(ch, lu.name); } }
    }
  } else if (cmd.startsWith('!bahis')) {
    const amount = parseInt((text.match(/\d+/) || [0])[0], 10);
    const p = profileOf(u.id);
    if (!amount || amount < 5) { botSay(ch, '🎰 Kullanım: !bahis 50 (en az 5 🪙)'); return; }
    if (p.coins < amount) { botSay(ch, `🎰 O kadar coinin yok! (sende ${p.coins} 🪙) Git maden kaz ⛏️`); return; }
    if (Math.random() < 0.5) { addCoins(u, amount, '🎰 bahsi KAZANDI (x2)!'); }
    else if (!nazarSave(u, p)) { addCoins(u, -amount, '🎰 bahis kaybetti 💸'); tombstone(ch, u.name); }
  } else if (cmd.startsWith('!puan')) {
    const top = Object.entries(meta.scores || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, pt], i) => `${i + 1}. ${meta.known[id] ? meta.known[id].name : id} — ${pt}`).join('  |  ');
    botSay(ch, `🏆 PUAN: ${top || 'yok'}  •  🪙 cüzdanın: ${profileOf(u.id).coins}`);
  } else if (cmd.startsWith('!market') || cmd.startsWith('!magaza')) {
    botSay(ch, '🛒 Mağaza: sol alttaki ismine/coin kutusuna tıkla! Coin: !maden !yarisma !xo !zincir !adam !sayi !film !bahis');
  } else if (cmd.startsWith('!ai ')) {
    askAI(u, text.slice(4).trim(), ch);
  } else if (cmd.startsWith('!yardim') || cmd === '!help') {
    botSay(ch, '🤖 Oyunlar: !xo !zincir !adam !sayi !film !sarki !anagram !mat !tkm !rulet !yarisma !oylama !zar !8ball • Ekonomi: !maden !bahis !cevir !gonder !lider !puan • Klan: !klankur !klan !savas !muzayede !yagmur • Sosyal: !teklif !evet !bosan !gazete • Derin: !21 !kutu !banka !hisse !loto !soygun !hafiza !ek !macera !kapisma !patates !sozquiz !takas !mahkeme !mafya !gorevler • Skyline: !ilan !reklam !panolar • Butonlu: !21 !tkm !rulet !slot !yazitura !zars • 🏪 Pazar: profilde/⋯ • Şovlar: !sovlar • AI: !ai <soru> veya #ai • !durdur');
  }
}

/* ---------------- 🕯️ ÜZGÜNLER V2 ---------------- */
function runUzgun(u, cmd, text, ch) {
  if (cmd === '!mum') {
    const now = Date.now();
    if (now - (u.lastMum || 0) < 5000) { botSay(ch, '🕯️ Mumlar taze kanka, az bekle…'); return true; }
    u.lastMum = now;
    meta.mums = (meta.mums || 0) + 1;
    scheduleSave();
    botSay(ch, `🕯️ ${u.name} bir mum yaktı… (toplam ${meta.mums} mum) Işığı hiç sönmesin 🤍`);
    broadcast({ t: 'fx', kind: 'mum', by: u.id }, (x) => x.channelId === ch);
    return true;
  }
  if (cmd.startsWith('!saril')) {
    const q = text.slice(6).trim().replace(/@/g, '').trim();
    let tgt = null;
    if (q) for (const usr of users.values()) if (trLow(usr.name).includes(trLow(q))) { tgt = usr; break; }
    meta.hugs = (meta.hugs || 0) + 1;
    scheduleSave();
    botSay(ch, tgt && tgt.id !== u.id ? `🫂 ${u.name}, ${tgt.name}’e sımsıkı sarıldı 💙 (${meta.hugs} sarılma)` : `🫂 ${u.name} tüm Üzgünler V2 ailesine sarıldı 🥺 (${meta.hugs} sarılma)`);
    broadcast({ t: 'fx', kind: 'saril', by: u.id }, (x) => x.channelId === ch);
    return true;
  }
  if (cmd.startsWith('!mektup')) {
    const body = text.slice(8).trim();
    if (!body) { botSay(ch, '💌 Kullanım: !mektup içinden ne geçiyorsa yaz…'); return true; }
    if (!meta.letters) meta.letters = [];
    const n = meta.letters.length + 1;
    meta.letters.push({ n, body: body.slice(0, 400), ts: Date.now() });
    if (meta.letters.length > 50) meta.letters.splice(0, meta.letters.length - 50);
    scheduleSave();
    botSay(ch, `💌 MEKTUP #${n}\n━━━━━━━━━━━━\n“${body}”\n━━━━━━━━━━━━\n📜 Duvara asıldı • !mektuplar ile hepsini okuyabilirsin`);
    return true;
  }
  if (cmd === '!mektuplar') {
    const L = (meta.letters || []).slice(-5).map((l) => `#${l.n}: “${l.body.slice(0, 70)}${l.body.length > 70 ? '…' : ''}”`).join('\n');
    botSay(ch, `📮 MEKTUP DUVARI (${(meta.letters || []).length} mektup)\n${L || 'henüz hiç mektup yok 🥺 !mektup ile ilk sen yaz'}`);
    return true;
  }
  return false;
}

/* ---------------- 🎭 V3 MEGA PAKET ---------------- */
function runV3(u, cmd, text, ch) {
  const p = profileOf(u.id);
  const findTgt = (q) => {
    q = String(q || '').replace(/@/g, '').trim();
    if (!q) return null;
    for (const usr of users.values()) if (usr.id !== u.id && trLow(usr.name).includes(trLow(q))) return usr;
    return null;
  };
  if (cmd.startsWith('!cay')) {
    const tgt = findTgt(text.slice(4));
    meta.cays = (meta.cays || 0) + 1; scheduleSave();
    if (tgt) { addAura(u.id, 3); addAura(tgt.id, 3); botSay(ch, `☕ ${u.name}, ${tgt.name}’e tavşan kanı çay ısmarladı 🫖 (ikisine de +3 aura)`); }
    else { addAura(u.id, 2); botSay(ch, `☕ ${u.name} herkese çay ısmarladı 🫖 Demlik hazır, bardaklar taze! (+2 aura)`); }
    broadcast({ t: 'fx', kind: 'cay', by: u.id }, (x) => x.channelId === ch);
    return true;
  }
  if (cmd.startsWith('!guvercin')) {
    const body = text.slice(9).trim();
    if (!body) { botSay(ch, '🐦 Kullanım: !guvercin mesajın — rastgele bir kankaya ANONİM gider'); return true; }
    const now = Date.now();
    if (now - (u.lastGuv || 0) < 30000) { botSay(ch, '🐦 Güvercin daha yolda kanka, az bekle!'); return true; }
    u.lastGuv = now;
    const others = [...users.values()].filter((x) => x.id !== u.id);
    if (!others.length) { botSay(ch, '🐦 Şu an başka online kanka yok 🥺'); return true; }
    const tgt = others[Math.floor(Math.random() * others.length)];
    botSay('dm:' + ['bot', tgt.id].sort().join(':'), `🐦 GÜVERCİN GETİRDİ (anonim): “${body.slice(0, 300)}”`);
    botSay(ch, '🐦 Güvercin yola çıktı… Kime gittiğini sadece o bilecek 😏');
    return true;
  }
  if (cmd === '!maske') {
    if ((meta.maskUntil || 0) > Date.now()) { botSay(ch, `🎭 Maskeli balo zaten sürüyor! ${Math.ceil((meta.maskUntil - Date.now()) / 60000)} dk kaldı`); return true; }
    if (p.coins < 20) { botSay(ch, '🎭 Maskeli balo başlatmak 20 🪙'); return true; }
    p.coins -= 20; scheduleSave(); sendWallet(u);
    meta.maskUntil = Date.now() + 10 * 60000;
    meta.masks = {};
    for (const usr of users.values()) displayNameOf(usr);
    broadcast({ t: 'users', users: allUsers() });
    botSay(ch, '🎭 MASKELİ BALO BAŞLADI (10 dk)! Herkes takma adla — kim kimdir bilinmez 😈');
    broadcast({ t: 'fx', kind: 'maske', by: u.id });
    return true;
  }
  if (cmd.startsWith('!kagit')) {
    const now = Date.now();
    if (now - (u.lastKagit || 0) < 10000) { botSay(ch, '🧻 Kağıtlar daha yerlerde kanka!'); return true; }
    u.lastKagit = now;
    const tgt = findTgt(text.slice(6));
    botSay(ch, tgt ? `🧻 ${u.name}, ${tgt.name}’e KAĞIT SAVAŞI açtı! Tuvalet kağıdı stokları tükendi 😹` : `🧻 ${u.name} KAĞIT SAVAŞI başlattı! Herkes sığınsın 😹`);
    broadcast({ t: 'fx', kind: 'kagit', by: u.id }, (x) => x.channelId === ch);
    return true;
  }
  if (cmd === '!kazilar') {
    const L = (p.arts || []).slice(-8).map((a) => `${a.e} ${a.nm} (${a.tier})`).join(' • ');
    botSay(ch, `🏺 ESERLERİN (${(p.arts || []).length}): ${L || 'henüz hiç eser yok — !kazi ile kaz!'}`);
    return true;
  }
  if (cmd.startsWith('!kazi')) {
    const now = Date.now();
    if (now - (p.lastKazi || 0) < 600000) { botSay(ch, `⛏️ Kazma yoruldu! ${Math.ceil((600000 - (now - (p.lastKazi || 0))) / 60000)} dk sonra tekrar kaz.`); return true; }
    p.lastKazi = now;
    if (!p.arts) p.arts = [];
    const r = Math.random();
    if (r < 0.35) { botSay(ch, '🏺 Kaza kaza… sadece toz buldun 💨'); return true; }
    const tier = r < 0.75 ? 'Normal' : r < 0.93 ? 'Nadir' : 'Efsane';
    const pool = tier === 'Normal' ? [['🏺', 'Kırık Testi'], ['🥄', 'Osmanlı Kaşığı'], ['🪙', 'Paslı Sikke']] : tier === 'Nadir' ? [['🗿', 'Mini Heykel'], ['💍', 'Mühür Yüzüğü'], ['📜', 'Eski Parşömen']] : [['👑', 'Kayıp Taç'], ['💎', 'Nazar Elması'], ['🏆', 'Altın Kupa']];
    const [e, nm] = pool[Math.floor(Math.random() * pool.length)];
    p.arts.push({ e, nm, tier });
    const bonus = magnetMult(u, { Normal: 5, Nadir: 15, Efsane: 50 }[tier]);
    p.coins += bonus;
    scheduleSave(); sendWallet(u);
    botSay(ch, `🏺 KAZI: ${e} ${nm} (${tier}) buldun! +${bonus} 🪙`);
    if (tier === 'Efsane') { botSay('muze', `🏛️ MÜZEYE YENİ ESER: ${u.name} → ${e} ${nm} (EFSANE!)`); broadcast({ t: 'fx', kind: 'kral', by: u.id }, (x) => x.channelId === 'muze'); }
    return true;
  }
  return false;
}

function checkGames(u, text) {
  if (text.startsWith('!')) return;
  const ch = u.channelId;
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

  // şarkı sözü quiz
  const sq = songQuizState[ch];
  if (sq && sq.active) {
    if (sq.a.some((a) => norm(low).includes(norm(a)))) { sq.active = false; botSay(ch, `🎤 DOĞRU! ${sq.a[0]} 🎧`); addCoins(u, 3, '🎤 söz quiz'); winGame(u); }
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
      pushMessage(dmBotId, { id: rid(), ...BOT, ts: Date.now(), text: 'Selam kanka, ben KankaBot 🤖 Hoş geldin! İşte harita:\n🎮 OYUNLAR: !xo !tkm !21 !rulet !slot !yazitura !zars !adam !hafiza !macera !film !sarki !anagram !mat !sayi !zincir !yarisma !patates !mafya !mahkeme\n🪙 PARA: !maden !cevir !bahis !kutu !soygun !yatir !hisse !loto !lider !gonder !puan !gorevler' });
      pushMessage(dmBotId, { id: rid(), ...BOT, ts: Date.now(), text: '🎆 ŞOV: 🎆 butonu / !havai !beba !para !kral !roket !bomba !parti !kar !yagmur\n👤 PROFİL: ismine tıkla → mağaza, 📸 fotoğraf, 🐣 pet, ️ klan • 🎨 tema/renk\n💞 SOSYAL: !teklif (kanka), üyeye tıkla → DM, ↩️ yanıtla, 🧵 thread, 🙈 spoiler\n😤 SAHİP: !sustur !ban !slowmode !limit !sahne !rol !log\n🆑 Tüm liste: !yardim • 🆕 Neler eklendi: !yenilikler\nİlk coinin: !maden ⛏️ İyi eğlenceler 💙' });
    } else if (profileOf(user.id).lastGuideDay !== new Date().toDateString()) {
      profileOf(user.id).lastGuideDay = new Date().toDateString();
      scheduleSave();
      pushMessage(dmBotId, { id: rid(), ...BOT, ts: Date.now(), text: '🤖 Günaydın! Kısa hatırlatma: !yardim → komutlar • !yenilikler → son eklenenler • !gorevler → günlük bonuslar 🎯' });
    }
    if (!myDms.some((d) => d.id === dmBotId)) myDms.unshift({ id: dmBotId, partner: 'bot' });
    send(ws, {
      t: 'init', you: publicUser(user), channels, users: allUsers(),
      messages: (messages[user.channelId] || []).slice(-100), myDms, known: meta.known,
      meta: { requireInvite: meta.requireInvite, inviteCode: isOwner(user) ? meta.inviteCode : null },
      shop: SHOP, coins: p.coins, owned: p.owned, xp: p.xp, level: levelOf(p), quests: p.quests, ach: p.ach, market: meta.market || [], banner: meta.banner || null, welcome: meta.welcome || '', roles: meta.roles || [], userRoles: meta.userRoles || {}, workers: workersOf(user.id), kb: (meta.kb && meta.kb.until > Date.now()) ? { open: true, items: meta.kb.items } : { open: false, items: [] }, debt: (meta.debt || {})[user.id] || 0, weather: meta.weather || 'gunes', fish: meta.fish || {}, chaosUntil: (meta.chaos && meta.chaos.until) || 0, songs: SONG_DB, stats: { wins: p.wins || 0, msgs: p.msgs || 0 }, ads: (meta.ads || []).filter((a) => a.until > Date.now()),
    });
    if (daily) send(ws, { t: 'toast', text: `🪙 Günlük bonus +${daily} • 🔥 Seri: ${p.streak} gün!` });
    // 🏦 faiz
    if (meta.banks && meta.banks[user.id] && p.lastBankDay !== today) {
      const interest = Math.min(50, Math.floor((meta.banks[user.id] || 0) * 0.05));
      if (interest > 0) { meta.banks[user.id] += interest; send(ws, { t: 'toast', text: `🏦 Faiz yattı: +${interest} 🪙` }); }
      p.lastBankDay = today;
      scheduleSave();
    }
    // 🎫 loto çekilişi
    if (meta.lotto && meta.lotto.tickets.length && meta.lottoDay !== today) {
      meta.lottoDay = today;
      const winUid = meta.lotto.tickets[Math.floor(Math.random() * meta.lotto.tickets.length)];
      const pot = meta.lotto.pot * 2;
      profileOf(winUid).coins += pot;
      botSay('genel', `🎫 LOTO ÇEKİLDİ! ${(meta.known[winUid] || {}).name || '?'} ${pot} 🪙 KAZANDI!`);
      meta.lotto = { tickets: [], pot: 0 };
      scheduleSave();
    }
    // 🏅 sezon
    const mstr = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    if (meta.season !== mstr) {
      if (meta.season) {
        const rows2 = Object.entries(meta.profiles || {}).sort((a, b) => (b[1].coins || 0) - (a[1].coins || 0))[0];
        if (!meta.hall) meta.hall = [];
        if (rows2) meta.hall.push({ season: meta.season, name: (meta.known[rows2[0]] || {}).name || '?' });
      }
      meta.season = mstr;
      scheduleSave();
    }
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
      if (!item || (item.type !== 'nazar' && p.owned.includes(item.id))) return;
      if (p.coins < item.price) { send(ws, { t: 'toast', text: `🪙 Yetersiz coin! (${p.coins}/${item.price}) — !maden ile kaz ⛏️` }); return; }
      p.coins -= item.price;
      if (item.type === 'nazar') p.nazar = (p.nazar || 0) + 1;
      else p.owned.push(item.id);
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

    case 'listing': {
      const chX = anyTextish(u.channelId);
      if (!chX || chX.id !== 'skyline') { send(ws, { t: 'toast', text: '🏙️ İlanlar sadece #Skyline kanalında!' }); return; }
      const icons = ['🏠', '', '', '📦', '🐾', ''];
      const icon = icons.includes(m.icon) ? m.icon : '📦';
      const title = String(m.title || '').slice(0, 60);
      const price = m.price != null ? Math.max(0, Math.floor(Number(m.price))) : null;
      if (!title) { send(ws, { t: 'toast', text: 'İlan başlığı yaz 🏷️' }); return; }
      pushMessage(u.channelId, { id: rid(), uid: u.id, name: u.name, color: u.color, ts: Date.now(), text: '', listing: { icon, title, price, seller: u.name }, profile: publicProfile(profileOf(u.id), u.id) });
      break;
    }

    case 'frame': {
      const src = findMsg(u.channelId, m.msgId);
      if (!src || src.system) { send(ws, { t: 'toast', text: '🏛️ Çerçevelenecek mesaj bulunamadı' }); return; }
      const p = profileOf(u.id);
      if (p.coins < 5) { send(ws, { t: 'toast', text: '🏛️ Çerçeve 5 🪙' }); return; }
      p.coins -= 5;
      scheduleSave(); sendWallet(u);
      pushMessage('muze', { id: rid(), uid: u.id, name: u.name, color: u.color, ts: Date.now(), text: '', museum: { name: src.name, text: (src.text || '🖼️').slice(0, 300), image: src.image || null, by: u.name }, profile: publicProfile(p, u.id) });
      send(ws, { t: 'toast', text: '🏛️ Müzeye asıldı! #Müze' });
      break;
    }

    case 'worker-hire': {
      const p = profileOf(u.id);
      if (p.coins < 30) { send(ws, { t: 'toast', text: '👷 İşçi kiralamak 30 🪙' }); return; }
      p.coins -= 30;
      const ws2 = workersOf(u.id);
      ws2.push({ id: 'w' + rid(), n: ws2.length + 1, done: 0, job: null });
      ensureWorkerChannel(u);
      scheduleSave(); sendWallet(u);
      broadcast({ t: 'workers', uid: u.id, workers: ws2 });
      send(ws, { t: 'toast', text: '👷 İşçi #' + ws2.length + ' işe alındı! (Acemi)' });
      break;
    }

    case 'worker-job': {
      const w2 = workersOf(u.id).find((x) => x.id === m.wid);
      const jd = JOB_DEFS[m.job];
      if (!w2 || !jd || w2.job) return;
      if (w2.hurt && Date.now() < w2.hurt) { send(ws, { t: 'toast', text: '🤕 İşçi sakat! ' + Math.ceil((w2.hurt - Date.now()) / 60000) + ' dk dinlenmeli' }); return; }
      const dur = jd.m * 60000 * ((w2.eq || {}).kazma ? 0.75 : 1);
      w2.job = { k: m.job, at: Date.now(), dur };
      scheduleSave();
      broadcast({ t: 'workers', uid: u.id, workers: workersOf(u.id) });
      break;
    }

    case 'rent': {
      const th = ROOM_THEMES[m.theme];
      if (!th) return;
      const p = profileOf(u.id);
      if (p.coins < 50) { send(ws, { t: 'toast', text: '🚪 Oda kirası 50 🪙/saat' }); return; }
      p.coins -= 50;
      if (!meta.rentals) meta.rentals = {};
      const old = meta.rentals[u.id];
      const until = Math.max(Date.now(), old ? old.until : Date.now()) + 3600000;
      meta.rentals[u.id] = { theme: m.theme, until, guests: old ? old.guests : [] };
      const cid = 'oda-' + u.id;
      if (!channels.find((c) => c.id === cid)) {
        channels.push({ id: cid, name: u.name + ' Özel Oda', type: 'room', theme: m.theme, owner: u.id, guests: [] });
        messages[cid] = [];
      }
      const rc = channels.find((c) => c.id === cid);
      rc.theme = m.theme; rc.guests = meta.rentals[u.id].guests; rc.until = until;
      scheduleSave(); sendWallet(u);
      broadcast({ t: 'channels', channels });
      send(ws, { t: 'toast', text: th.label + ' oda kiralandı! 1 saat 🔑' });
      addAura(u.id, 20);
      break;
    }

    case 'room-invite': {
      const rc = channels.find((c) => c.id === 'oda-' + u.id);
      if (!rc) return;
      const tgt = findOnline(String(m.name || ''));
      if (!tgt) { send(ws, { t: 'toast', text: '👥 Kişi bulunamadı' }); return; }
      if (!rc.guests) rc.guests = [];
      if (!rc.guests.includes(tgt.id)) rc.guests.push(tgt.id);
      const r2 = meta.rentals[u.id]; if (r2) r2.guests = rc.guests;
      scheduleSave();
      broadcast({ t: 'channels', channels });
      const tw = byId.get(tgt.id);
      if (tw) send(tw, { t: 'toast', text: '🚪 ' + u.name + ' seni özel odasına davet etti!' });
      break;
    }

    case 'bm-buy': {
      if (!meta.kb || meta.kb.until < Date.now()) { send(ws, { t: 'toast', text: '🏴 Karaborsa kapalı!' }); return; }
      const it = (meta.kb.items || []).find((x) => x.id === m.itemId);
      if (!it) return;
      const shopIt = SHOP.find((x) => x.id === it.id);
      const p = profileOf(u.id);
      if (p.owned.includes(it.id)) { send(ws, { t: 'toast', text: 'Zaten sende var!' }); return; }
      if (p.coins < it.price) { send(ws, { t: 'toast', text: '🏴 Coin yetmiyor!' }); return; }
      p.coins -= it.price; p.owned.push(it.id);
      meta.kb.items = meta.kb.items.filter((x) => x !== it);
      scheduleSave(); sendWallet(u);
      broadcast({ t: 'kb', open: true, items: meta.kb.items });
      botSay('skyline', `🏴 KARABORSA: ${u.name} ${shopIt.label} kaptı!`);
      addAura(u.id, 50);
      broadcast({ t: 'profile', uid: u.id, profile: publicProfile(p, u.id) });
      break;
    }

    case 'turnuva': {
      if (!meta.turnuva || Date.now() > meta.turnuva.end) { send(ws, { t: 'toast', text: '🎰 Turnuva yok — saat başı açılır!' }); return; }
      if ((meta.turnuva.entries || []).some((e) => e.uid === u.id)) { send(ws, { t: 'toast', text: 'Zaten katıldın!' }); return; }
      const p = profileOf(u.id);
      if (p.coins < 10) { send(ws, { t: 'toast', text: '🎰 Katılım 10 🪙' }); return; }
      p.coins -= 10;
      meta.turnuva.entries.push({ uid: u.id, name: u.name });
      meta.turnuva.pot += 10;
      scheduleSave(); sendWallet(u);
      send(ws, { t: 'toast', text: '🎰 Turnuvadasın! Pot: ' + meta.turnuva.pot + ' 🪙' });
      break;
    }

    case 'worker-eq': {
      const w2 = workersOf(u.id).find((x) => x.id === m.wid);
      if (!w2) return;
      if (!w2.eq) w2.eq = {};
      const p = profileOf(u.id);
      if (m.item === 'kazma' && !w2.eq.kazma) {
        if (p.coins < 100) { send(ws, { t: 'toast', text: '⛏️ Kazma 100 🪙' }); return; }
        p.coins -= 100; w2.eq.kazma = true;
      } else if (m.item === 'baret' && !w2.eq.baret) {
        if (p.coins < 80) { send(ws, { t: 'toast', text: '⛑️ Baret 80 🪙' }); return; }
        p.coins -= 80; w2.eq.baret = true;
      } else return;
      scheduleSave(); sendWallet(u);
      broadcast({ t: 'workers', uid: u.id, workers: workersOf(u.id) });
      break;
    }

    case 'worker-collect': {
      const w2 = workersOf(u.id).find((x) => x.id === m.wid);
      if (!w2 || !w2.job) return;
      const jd = JOB_DEFS[w2.job.k];
      if (Date.now() < w2.job.at + jd.m * 60000) return;
      const mult = LVL_MULT[workerLvl(w2)] * ((w2.eq || {}).baret ? 1.1 : 1);
      const gain = Math.round(jd.r * mult);
      addCoins(u, gain, `👷 İşçi #${w2.n} ${jd.label} işini bitirdi`);
      w2.done++;
      w2.job = null;
      if (m.job0 === 'x') {} // noop
      if (jd === JOB_DEFS.tehlike) {
        const risk = (w2.eq || {}).baret ? 0.1 : 0.2;
        if (Math.random() < risk) { w2.hurt = Date.now() + 30 * 60000; botSay(u.channelId, `🤕 İşçi #${w2.n} tehlikeli işte sakatlandı! 30 dk dinlenecek`); }
      }
      scheduleSave();
      broadcast({ t: 'workers', uid: u.id, workers: workersOf(u.id) });
      break;
    }

    case 'wvote': {
      if (!meta.wvote || meta.wvote.until < Date.now()) return;
      const k = Object.keys(WEATHERS).find((x) => x === m.c);
      if (!k) return;
      meta.wvote.c[u.id] = k;
      send(ws, { t: 'toast', text: '🗳️ Oyun sayıldı: ' + WEATHERS[k] });
      break;
    }

    case 'ad': {
      doAd(u, m.places, Number(m.hours) || 1, String(m.text || ''), u.channelId);
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
      u.lastMsgs = (u.lastMsgs || []).filter((t) => now - t < 2000);
      if (u.lastMsgs.length >= 12) return;
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
      // 📜 Dert Dökme: herkes ANONİM
      const anon = chId === 'uz-dert';
      pushMessage(chId, { id: rid(), uid: anon ? 'anon' : u.id, name: anon ? 'Üzgün Ruh' : displayNameOf(u), color: anon ? '#8a93a5' : u.color, text, image, file: fileMeta, spoiler, replyTo, ts: Date.now(), reactions: {}, mentionAll, profile: anon ? null : publicProfile(profileOf(u.id), u.id) });
      { const p = profileOf(u.id); p.msgs = (p.msgs || 0) + 1; qBump(u, 'msgs'); gainXp(u, 5); checkAch(u); addAura(u.id, 1); }
      if (chId.startsWith('dm:') && chId.includes('bot')) {
        if (text.startsWith('!')) {
          const before = (messages[chId] || []).length;
          const isAiCmd = trLow(text).startsWith('!ai');
          runBot(u, text);
          setTimeout(() => {
            if ((messages[chId] || []).length === before && !isAiCmd) botSay(chId, '🤖 Bu komutu bilmiyorum kanka 😅 !yardim yaz, tüm listeyi dökeyim!');
          }, 1500);
        } else askAI(u, text, chId);
      } else if (text.startsWith('!')) runBot(u, text);
      else {
        checkGames(u, text);
        const chNow = anyTextish(chId);
        if (chNow && chNow.id === 'ai') askAI(u, text, chNow.id);
      }
      break;
    }

    case 'typing': broadcast({ t: 'typing', uid: u.id, name: u.name }, (x) => x.channelId === u.channelId && x !== u); break;

    case 'react': {
      const msg = findMsg(u.channelId, m.msgId);
      if (!msg) return;
      // ⛲ coin çeşmesi: tepki koy = kap!
      if (meta.fountain && meta.fountain.msgId === msg.id && meta.fountain.left > 0 && !meta.fountain.takers.includes(u.id)) {
        meta.fountain.takers.push(u.id);
        meta.fountain.left--;
        const gain = magnetMult(u, 15);
        addCoins(u, gain, '⛲ çeşmeden coin');
        botSay(u.channelId, `⛲ ${u.name} çeşmeden ${gain} 🪙 kaptı! (${meta.fountain.left} hak kaldı)`);
        if (meta.fountain.left <= 0) { botSay(u.channelId, '⛲ Çeşme kurudu 💨 bir sonrakine!'); meta.fountain = null; }
        scheduleSave();
      }
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
      if (!msg || !msg.game) return;
      const g = msg.game;
      if (g.type === 'mem') {
        const st = memState[g.uid];
        if (!st || g.uid !== u.id) return;
        const i = Number(m.move); const c2 = st.cards[i];
        if (!c2 || c2.m || c2.open) return;
        c2.open = true;
        if (st.first === null) st.first = i;
        else {
          st.moves++;
          const f = st.cards[st.first];
          if (f.e === c2.e) { f.m = true; c2.m = true; }
          f.open = false; c2.open = false;
          st.first = null;
          if (st.cards.every((x) => x.m)) { addCoins(u, 5, '🕹️ hafıza zaferi'); winGame(u); delete memState[u.id]; g.done = true; }
        }
        g.cards = st.cards.map((x) => ({ e: x.m || x.open ? x.e : '❓', m: x.m }));
        g.moves = st.moves;
        scheduleSave();
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'bj') {
        const st = bjState[g.uid];
        if (!st || g.uid !== u.id || g.done) return;
        const p = profileOf(u.id);
        if (m.move === 0) st.p.push(drawCard());
        const pv = handVal(st.p);
        if (m.move === 1 || pv > 21) {
          while (handVal(st.d) < 17) st.d.push(drawCard());
          const dv = handVal(st.d);
          let res;
          if (pv > 21) res = 'BATTIN 💸';
          else if (dv > 21 || pv > dv) { p.coins += st.bet * 2; res = `KAZANDIN +${st.bet * 2} 🎉`; }
          else if (pv === dv) { p.coins += st.bet; res = 'berabere, iade 🤝'; }
          else res = 'krupiye aldı 😔';
          scheduleSave(); sendWallet(u); delete bjState[u.id];
          g.done = true;
          g.info = `Sen [${st.p.join(' ')}]=${pv} • Krupiye [${st.d.join(' ')}]=${dv} → ${res}`;
        } else { g.hand = st.p.join(' '); g.hv = pv; }
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'tkm') {
        if (g.done) return;
        const picks = ['taş', 'kağıt', 'makas'];
        const uPick = picks[m.move];
        const bPick = picks[Math.floor(Math.random() * 3)];
        const beats = { 'taş': 'makas', 'kağıt': 'taş', 'makas': 'kağıt' };
        let res;
        if (uPick === bPick) res = 'Berabere 🤝';
        else if (beats[uPick] === bPick) { addCoins(u, 2, '✂️ TKM zaferi'); winGame(u); res = 'KAZANDIN +2 🎉'; }
        else res = 'Kaybettin 😔';
        g.done = true; g.info = `${uPick} vs ${bPick} → ${res}`;
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'rulet') {
        if (g.done) return;
        const p = profileOf(u.id); const bet = g.bet || 10;
        if (p.coins < bet) { send(ws, { t: 'toast', text: '🪙 Coin yetmiyor!' }); return; }
        p.coins -= bet;
        const n = Math.floor(Math.random() * 15);
        const color = n === 0 ? 'yeşil' : n % 2 === 1 ? 'kırmızı' : 'siyah';
        const chosen = ['kırmızı', 'siyah', 'yeşil'][m.move];
        let res;
        if (color === chosen) { const mult = chosen === 'yeşil' ? 10 : 2; p.coins += bet * mult; res = `${color.toUpperCase()} GELDİ! x${mult} 🎉`; }
        else res = `${color} geldi 💸`;
        scheduleSave(); sendWallet(u);
        g.done = true; g.info = res;
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'slot') {
        if (g.done) return;
        const p = profileOf(u.id);
        if (p.coins < 5) { send(ws, { t: 'toast', text: '🪙 5 coin lazım!' }); return; }
        p.coins -= 5;
        const S = ['🍒', '🍋', '', '7️⃣', ''];
        const r = [0, 0, 0].map(() => S[Math.floor(Math.random() * S.length)]);
        let res;
        if (r[0] === r[1] && r[1] === r[2]) { const w2 = r[0] === '7️⃣' ? 50 : 25; p.coins += w2; res = `JACKPOT +${w2} 🎉`; }
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { p.coins += 10; res = '2 aynı +10 🪙'; }
        else res = 'olmadı 💸';
        scheduleSave(); sendWallet(u);
        g.done = true; g.info = `${r.join(' ')} → ${res}`;
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'flip') {
        if (g.done) return;
        const p = profileOf(u.id);
        if (p.coins < 5) { send(ws, { t: 'toast', text: '🪙 5 coin lazım!' }); return; }
        p.coins -= 5;
        const res = Math.random() < 0.5 ? 'yazı' : 'tura';
        const pick = ['yazı', 'tura'][m.move];
        if (res === pick) { p.coins += 10; g.info = `🪙 ${res.toUpperCase()}! x2 +10 🎉`; }
        else g.info = `🪙 ${res} geldi 💸`;
        scheduleSave(); sendWallet(u);
        g.done = true;
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'zars') {
        if (g.done) return;
        const d = 1 + Math.floor(Math.random() * 6);
        if (d === 6) { addCoins(u, 10, '🎲 altı attı'); g.info = `🎲 ${d} → ALTILAAAR +10 🎉`; }
        else g.info = `🎲 ${d} geldi (6 lazımdı 😅)`;
        g.done = true;
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'adam') {
        const st = hangState[u.channelId];
        if (!st || !st.active || g.done) return;
        const letter = g.btns[m.move];
        if (!letter || st.guessed.includes(letter)) return;
        st.guessed.push(letter);
        if (st.word.includes(letter)) {
          if (![...st.word].some((c) => !st.guessed.includes(c))) { st.active = false; g.done = true; addCoins(u, 4, '🪢 adam asmaca'); winGame(u); g.info = `🎉 BİLDİN: ${st.word}!`; }
        } else {
          st.wrong++;
          g.hearts = 6 - st.wrong;
          if (st.wrong >= 6) { st.active = false; g.done = true; g.info = `💀 Asıldı! Kelime: ${st.word}`; }
        }
        g.mask = [...st.word].map((c) => (st.guessed.includes(c) ? c : '_')).join(' ');
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'mac') {
        const a = advState[g.uid];
        if (!a || g.done || g.uid !== u.id) return;
        const good = Math.random() < 0.55;
        a.coins += good ? 15 : 5;
        a.step++;
        const p = profileOf(u.id);
        if (a.step >= 4) {
          p.coins += a.coins;
          scheduleSave(); sendWallet(u);
          g.done = true; g.info = `MACERA BİTTİ! +${a.coins} 🪙 `;
          delete advState[g.uid];
        } else {
          const ev = ADV_EVENTS[Math.floor(Math.random() * ADV_EVENTS.length)];
          a.ev = ev;
          g.btns = [ev.a[0], ev.a[1]];
          g.step = a.step + 1;
          g.info = (good ? '✅ İyi seçim! (+15)' : '😬 Tehlikeliydi… (+5)');
        }
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
      if (g.type === 'quiz') {
        if (g.done) return;
        const stMap = { film: filmState, sarki: songState, ana: anaState };
        const st = stMap[g.key] && stMap[g.key][u.channelId];
        if (!st || !st.active) return;
        st.active = false;
        const p = profileOf(u.id);
        if (m.move === g.correct) {
          const rw = g.key === 'film' ? 4 : 3;
          addCoins(u, rw, '🧠 şık doğru'); winGame(u);
          g.info = 'DOĞRU! 🎉';
        } else g.info = `Yanlış 😔 Doğru: ${g.btns[g.correct]}`;
        g.done = true;
        broadcast({ t: 'msg-game', channelId: u.channelId, msgId: msg.id, game: g }, (x) => x.channelId === u.channelId);
        return;
      }
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
            if (meta.xobets) {
              Object.entries(meta.xobets).forEach(([bid, bb]) => {
                if (bb.pick === g.players[g.winner]) { const bu = users.get(byId.get(bid)); if (bu) addCoins(bu, bb.n * 2, '🎯 XO bahsi tuttu'); }
                else { /* kaybeden zaten ödedi */ }
              });
              meta.xobets = {};
              scheduleSave();
            }
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

/* 🎭 maske süresi + ⛲ coin çeşmesi spawner */
setInterval(() => {
  if ((meta.maskUntil || 0) && Date.now() > meta.maskUntil) {
    meta.maskUntil = 0; meta.masks = {};
    broadcast({ t: 'users', users: allUsers() });
    botSay('genel', '🎭 Maskeli balo bitti — kimlikler açık 😄');
  }
  if (meta.fountain && Date.now() > meta.fountain.until) { botSay(meta.fountain.ch, '⛲ Çeşme kimse kapmadan kurudu 💨'); meta.fountain = null; }
  if (!meta.fountain && users.size > 0 && Math.random() < 0.35) {
    const cand = channels.filter((c) => c.type === 'text' && !c.parent && c.id !== 'muze');
    const chx = cand[Math.floor(Math.random() * cand.length)];
    if (chx) {
      const fmsg = botSay(chx.id, '⛲ COİN ÇEŞMESİ belirdi! Bu mesaja herhangi bir emoji tepkisi koy — ilk 3 kişi +15 🪙 kapar! 💦');
      meta.fountain = { msgId: fmsg.id, ch: chx.id, left: 3, takers: [], until: Date.now() + 120000 };
    }
  }
}, 60000);

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
let lastCloud = 0, cloudReady = false;
async function cloudSave(force) {
  if (!GIST || !cloudReady) return;
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
  cloudReady = true;
  setInterval(() => cloudSave(false), 60000);
  setInterval(() => { cleanAds(); if (meta.ads && meta.ads.length !== (meta._adCount || -1)) { meta._adCount = meta.ads.length; broadcast({ t: 'ads', ads: meta.ads }); } }, 60000);
  setInterval(() => {
    const now = Date.now();
    if (!meta.kb) meta.kb = { until: 0, nextOpen: now + 3600000, items: [] };
    if (now >= (meta.kb.nextOpen || 0)) {
      const picks = [...SHOP].sort(() => Math.random() - 0.5).slice(0, 3).map((x) => ({ id: x.id, price: Math.round(x.price / 2) }));
      meta.kb = { until: now + 3600000, nextOpen: now + 6 * 3600000, items: picks };
      scheduleSave();
      broadcast({ t: 'kb', open: true, items: picks });
      botSay('skyline', '🏴 KARABORSA AÇILDI! 1 saat boyunca nadir eşyalar YARI FİYAT — profilden kap!');
    } else if (meta.kb.until && now > meta.kb.until && meta.kb.items.length) {
      meta.kb.items = [];
      broadcast({ t: 'kb', open: false, items: [] });
    }
    if (!meta.turnuva || now > meta.turnuva.end) {
      if (meta.turnuva && (meta.turnuva.entries || []).length >= 2) {
        const win = meta.turnuva.entries[Math.floor(Math.random() * meta.turnuva.entries.length)];
        const wu = users.get(byId.get(win.uid));
        if (wu) { profileOf(win.uid).coins += meta.turnuva.pot; sendWallet(wu); botSay('genel', `🎰 SLOT TURNUVASI: ${win.name} ${meta.turnuva.pot} 🪙 POTU KAZANDI!`); }
      }
      meta.turnuva = { end: now + 3600000, entries: [], pot: 0 };
    }
    for (const [w2, u2] of users) {
      const rc = channels.find((c) => c.id === u2.channelId && c.type === 'room' && c.theme === 'uzay');
      if (rc) { profileOf(u2.id).coins += 1; sendWallet(u2); }
    }
  }, 300000);
  setInterval(() => {
    if (!meta.stock) meta.stock = { price: 100 };
    meta.stock.last = Math.round(meta.stock.price);
    meta.stock.price = Math.max(10, Math.min(500, meta.stock.price * (0.9 + Math.random() * 0.2)));
    scheduleSave();
  }, 60000);
  server.listen(PORT, '0.0.0.0', () => console.log(`KankaChat v5 http://0.0.0.0:${PORT} hazır`));
})();
