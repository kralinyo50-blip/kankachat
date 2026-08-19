'use strict';
/* KankaChat v3 istemci */
const $ = (s) => document.querySelector(s);

/* 🔒 SAĞ TIK / İNCELEME KİLİDİ */
document.addEventListener('contextmenu', (e) => {
  const mem = e.target.closest('.member');
  if (mem && mem.dataset.uid) { e.preventDefault(); openMemberMenu(mem.dataset.uid, e.clientX, e.clientY); return; }
  e.preventDefault();
});
document.addEventListener('keydown', (e) => {
  const k = (e.key || '').toUpperCase();
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k)) || (e.ctrlKey && ['U', 'S'].includes(k))) e.preventDefault();
});
document.addEventListener('dragstart', (e) => e.preventDefault());

/* ---------------- 📱/️ MOD SİSTEMİ ---------------- */
let uiMode = localStorage.getItem('kc-mode') || 'auto';
function applyMode() {
  const mob = uiMode === 'mobile' || (uiMode === 'auto' && innerWidth <= 800);
  document.body.classList.toggle('layout-mobile', mob);
  document.body.classList.toggle('layout-pc', !mob);
}
applyMode();
window.addEventListener('resize', () => { if (uiMode === 'auto') applyMode(); });
function setMode(m) {
  uiMode = m;
  localStorage.setItem('kc-mode', m);
  applyMode();
  paintModeBtns();
}
function paintModeBtns() {
  const map = { modeM: 'mobile', modeA: 'auto', modeP: 'pc' };
  Object.entries(map).forEach(([id, v]) => {
    const b = $('#' + id);
    if (b) b.classList.toggle('sel', uiMode === v);
  });
}

/* ---------------- 🏪 OYUNCU PAZARI ---------------- */
function openMarket() {
  let m = $('#marketModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'marketModal'; m.className = 'modal-back hidden';
    m.innerHTML = '<div class="modal-card"><div class="modal-head"><span class="modal-title">🏪 Oyuncu Pazarı</span><button id="mkClose" class="icon-btn">✕</button></div><div id="mkBody" class="modal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    $('#mkClose').onclick = () => m.classList.add('hidden');
  }
  m.classList.remove('hidden');
  renderMarketBody();
}
function renderMarketBody() {
  const body = $('#mkBody');
  if (!body) return;
  body.innerHTML = '';
  // satılıklar
  const h1 = document.createElement('div'); h1.className = 'ch-group'; h1.innerHTML = '<span> Satılıklar</span>';
  body.appendChild(h1);
  if (!myMarket.length) {
    const e = document.createElement('div'); e.className = 'msg system'; e.textContent = 'Şu an tezgah boş — ilk sen sat! 😄';
    body.appendChild(e);
  }
  myMarket.forEach((l) => {
    const item = shop.find((s) => s.id === l.itemId) || { label: l.itemId };
    const seller = l.seller === me.id ? 'Sen' : (usersList.find((x) => x.id === l.seller) || { name: '?' }).name;
    const row = document.createElement('div'); row.className = 'quest-row';
    row.innerHTML = `<span class="quest-label">${item.label} — <b>${seller}</b></span>`;
    const b = document.createElement('button'); b.className = 'btn-small';
    if (l.seller === me.id) { b.textContent = 'Geri Al'; b.onclick = () => wsSend({ t: 'market-unlist', listingId: l.id }); }
    else { b.textContent = '🪙 ' + l.price; b.onclick = () => wsSend({ t: 'market-buy', listingId: l.id }); }
    row.appendChild(b);
    body.appendChild(row);
  });
  // benim eşyalarım
  const h2 = document.createElement('div'); h2.className = 'ch-group'; h2.innerHTML = '<span>🎒 Eşyaların (satmak için tıkla)</span>';
  body.appendChild(h2);
  const sellable = (myOwned || []).map((id) => shop.find((s) => s.id === id)).filter(Boolean);
  if (!sellable.length) {
    const e = document.createElement('div'); e.className = 'msg system'; e.textContent = 'Mağazadan eşya al, burada kankalara sat 🎒';
    body.appendChild(e);
  }
  const grid = document.createElement('div'); grid.className = 'shop-grid';
  sellable.forEach((it) => {
    const b = document.createElement('button'); b.className = 'shop-item';
    b.innerHTML = `<span class="shop-label">${it.label}</span><span class="shop-price">Sat 🏷️</span>`;
    b.onclick = () => {
      const pr = prompt(`${it.label} için fiyat (🪙):`, '100');
      const n = parseInt(pr, 10);
      if (n > 0) wsSend({ t: 'market-list', itemId: it.id, price: n });
    };
    grid.appendChild(b);
  });
  body.appendChild(grid);
}

/* ---------------- 👤 ÜYE PROFİLİ ---------------- */
function openMemberProfile(u) {
  let m = $('#memberModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'memberModal'; m.className = 'modal-back hidden';
    m.innerHTML = '<div class="modal-card small"><div id="mmBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
  }
  const pf = u.profile || {};
  const body = $('#mmBody');
  body.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'prof-preview' + (pf.pbg ? ' pbg-' + pf.pbg : '');
  head.style.flexDirection = 'column'; head.style.alignItems = 'center'; head.style.textAlign = 'center';
  const av = document.createElement('div'); av.className = 'avatar big'; paintAvatar(av, u);
  const nm = document.createElement('div'); nm.className = 'm-name'; nm.style.fontSize = '17px';
  applyName(nm, u.name + (u.role === 'owner' ? ' 👑' : ''), pf, (pf.title ? ' • ' + pf.title : '') + (pf.pet ? ' ' + pf.pet.e : ''));
  const lv = document.createElement('div'); lv.className = 'm-sub';
  lv.textContent = '📈 Lv' + (pf.level || 0) + (pf.status ? ' • ' + pf.status : '');
  head.append(av, nm, lv);
  body.appendChild(head);
  // 📸 fotoğraf + 💍 kanka
  const prRow = document.createElement('div'); prRow.className = 'inv-row'; prRow.style.padding = '8px 12px';
  const pb = document.createElement('button'); pb.className = 'btn-small'; pb.textContent = '📸 Fotoğraf Yükle';
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true;
  pb.onclick = () => fi.click();
  fi.onchange = () => {
    const f = fi.files[0]; if (!f) return;
    if (f.size > 2_000_000) { toast('Çok büyük resim 📏'); return; }
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); const S = 128;
        c.width = S; c.height = S;
        const x = c.getContext('2d');
        const m = Math.min(img.width, img.height);
        x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
        wsSend({ t: 'photo', data: c.toDataURL('image/jpeg', 0.8) });
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };
  prRow.appendChild(pb); prRow.appendChild(fi);
  if (pf.buddy) {
    const bd = document.createElement('span'); bd.className = 'quest-label';
    bd.textContent = '💍 Kankan: ' + ((usersList.find((x) => x.id === pf.buddy) || known[pf.buddy] || { name: '?' }).name);
    prRow.appendChild(bd);
  }
  body.appendChild(prRow);
  const btns = document.createElement('div'); btns.className = 'ui-row'; btns.style.padding = '12px';
  if (u.id !== me.id) {
    const dm = document.createElement('button'); dm.className = 'btn-small'; dm.textContent = '📨 DM Gönder';
    dm.onclick = () => { m.classList.add('hidden'); const ids = [me.id, u.id].sort(); wsSend({ t: 'switch', channelId: 'dm:' + ids[0] + ':' + ids[1] }); };
    btns.appendChild(dm);
  }
  const close = document.createElement('button'); close.className = 'btn-small'; close.textContent = 'Kapat';
  close.onclick = () => m.classList.add('hidden');
  btns.appendChild(close);
  body.appendChild(btns);
  m.classList.remove('hidden');
}

/* ---------------- 🎨 ARAYÜZ ÖZELLEŞTİRME ---------------- */
let uiCfg = { theme: 'dark', accent: 'blurple', fs: 'm', bg: 'plain' };
try { uiCfg = Object.assign(uiCfg, JSON.parse(localStorage.getItem('kc-ui') || '{}')); } catch (_) {}
function applyUI() {
  const r = document.documentElement;
  r.setAttribute('data-theme', uiCfg.theme);
  r.setAttribute('data-accent', uiCfg.accent);
  r.setAttribute('data-fs', uiCfg.fs);
  r.setAttribute('data-bg', uiCfg.bg);
}
applyUI();
const UI_OPTS = [
  ['mode', '📱 CİHAZ MODU', [['mobile', '📱 Mobil'], ['auto', '✨ Oto'], ['pc', '🖥️ PC']]],
  ['theme', '🌗 TEMA', [['dark', 'Discord Koyu'], ['midnight', 'Gece Siyahı'], ['light', 'Aydınlık'], ['purple', 'Mor Gece'], ['matrix', 'Matrix']]],
  ['accent', '🎨 ANA RENK', [['blurple', 'Blurple'], ['red', 'Kırmızı'], ['green', 'Yeşil'], ['orange', 'Turuncu'], ['pink', 'Pembe']]],
  ['fs', '🔤 YAZI BOYU', [['s', 'Küçük'], ['m', 'Normal'], ['l', 'Büyük']]],
  ['bg', '🖼️ SOHBET ARKA PLANI', [['plain', 'Sade'], ['stars', 'Yıldızlı'], ['sunset', 'Gün Batımı'], ['forest', 'Orman']]],
];
function openUI() {
  let m = $('#uiModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'uiModal'; m.className = 'modal-back hidden';
    m.innerHTML = '<div class="modal-card small"><div class="modal-head"><span class="modal-title">🎨 Görünüm Ayarları</span><button id="uiClose" class="icon-btn">✕</button></div><div id="uiBody" class="modal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    $('#uiClose').onclick = () => m.classList.add('hidden');
  }
  const body = $('#uiBody');
  body.innerHTML = '';
  UI_OPTS.forEach(([key, title, opts]) => {
    const h = document.createElement('div'); h.className = 'ch-group'; h.innerHTML = `<span>${title}</span>`;
    body.appendChild(h);
    const row = document.createElement('div'); row.className = 'ui-row';
    opts.forEach(([val, label]) => {
      const b = document.createElement('button');
      b.className = 'ui-opt' + (((key === 'mode' ? uiMode : uiCfg[key]) === val) ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => {
        if (key === 'mode') { setMode(val); openUI(); return; }
        uiCfg[key] = val;
        localStorage.setItem('kc-ui', JSON.stringify(uiCfg));
        applyUI(); openUI();
      };
      row.appendChild(b);
    });
    body.appendChild(row);
  });
  m.classList.remove('hidden');
}

/* ---------------- 🎧 YOUTUBE MÜZİK ---------------- */
function parseYT(s) {
  s = (s || '').trim();
  const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : null;
}
function openMusic() {
  let m = $('#musicModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'musicModal'; m.className = 'modal-back hidden';
    m.innerHTML = '<div class="modal-card small"><div class="modal-head"><span class="modal-title">🎧 Arka Plan Müziği</span><button id="muClose" class="icon-btn">✕</button></div><div class="modal-body"><div id="muBody"></div></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    $('#muClose').onclick = () => m.classList.add('hidden');
  }
  const body = $('#muBody');
  body.innerHTML = '';
  const inp = document.createElement('input');
  inp.id = 'ytInp'; inp.placeholder = 'YouTube linki yapıştır…';
  const btn = document.createElement('button'); btn.className = 'btn-small'; btn.textContent = '▶ Çal';
  btn.onclick = () => { const id = parseYT(inp.value); if (!id) { toast('Geçerli bir YouTube linki yapıştır 🔗'); return; } playYT(id); };
  const row = document.createElement('div'); row.className = 'inv-row'; row.append(inp, btn);
  body.appendChild(row);
  const presets = [['dQw4w9WgXcQ', '😄 Sürpriz Klasik'], ['jfKfP3p4jrd', '🌙 lofi radio'], ['4k2Zv6wqNjk', '🎹 piyano'], ['h2dyf4P1AwQ', '🌧️ yağmur + lofi']];
  const grid = document.createElement('div'); grid.className = 'ui-row';
  presets.forEach(([id, label]) => {
    const b = document.createElement('button'); b.className = 'ui-opt'; b.textContent = label;
    b.onclick = () => playYT(id);
    grid.appendChild(b);
  });
  body.appendChild(grid);
  const wrap = document.createElement('div'); wrap.id = 'muPlayer'; wrap.className = 'mu-player hidden';
  body.appendChild(wrap);
  const stop = document.createElement('button'); stop.className = 'btn-small'; stop.style.marginTop = '8px'; stop.textContent = '⏹ Durdur';
  stop.onclick = () => { $('#muPlayer').innerHTML = ''; $('#muPlayer').classList.add('hidden'); };
  body.appendChild(stop);
  const note = document.createElement('div'); note.className = 'shop-tip'; note.textContent = 'Not: Bazı videolar gömülü çalınmaya izin vermez, o durumda başka video dene. Müzik sadece SENDE çalar (kanka modu değil 😄).';
  body.appendChild(note);
  m.classList.remove('hidden');
}
function playYT(id) {
  const w = $('#muPlayer');
  w.classList.remove('hidden');
  w.innerHTML = `<iframe width="100%" height="150" src="https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}" title="müzik" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
}

/* ---------------- 🎆 ŞOV BUTONU (chatin yanında) ---------------- */
const CLIENT_SOVS = [
  ['yagmur', '🌧️ Yağmur', 30],
  ['kar', '❄️ Kar', 30],
  ['bomba', '💣 Bomba', 40],
  ['gokkusagi', '🌈 Gökkuşağı', 45],
  ['havai', '🎆 Havai Fişek', 50],
  ['parti', '🎂 Parti', 60],
  ['beba', '🦗 Ardanın Bebası', 77],
  ['roket', '🚀 Roket', 80],
  ['para', '💸 Para Şovu', 100],
  ['kral', '👑 Kral Şovu', 150],
];
function setupSovs() {
  const pop = $('#sovPop');
  CLIENT_SOVS.forEach(([key, label, cost]) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${label}</span><b>🪙${cost}</b>`;
    b.onclick = (e) => {
      e.stopPropagation();
      wsSend({ t: 'sov', key });
      pop.classList.add('hidden');
    };
    pop.appendChild(b);
  });
  $('#sovBtn').onclick = (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); };
  document.addEventListener('click', (e) => { if (!pop.classList.contains('hidden') && !pop.contains(e.target) && e.target.id !== 'sovBtn') pop.classList.add('hidden'); });
}

/* ---------------- 🎊 KONFETİ & 🎆 ŞOV MOTORU ---------------- */
function emojiRain(emojis, opts = {}) {
  const c = document.createElement('canvas');
  c.className = 'confetti-cv';
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  const n = opts.n || 60;
  const P = Array.from({ length: n }, () => ({
    x: Math.random() * c.width,
    y: opts.up ? c.height + 30 : -30 - Math.random() * 250,
    vy: opts.up ? -(3.5 + Math.random() * 4.5) : 2 + Math.random() * 3,
    vx: opts.up ? (Math.random() * 2 - 1) : (Math.random() * 1.6 - 0.8),
    e: emojis[Math.floor(Math.random() * emojis.length)],
    s: opts.s || (18 + Math.random() * 18),
    r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25,
  }));
  const t0 = Date.now(); const dur = opts.dur || 2800;
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of P) {
      p.y += p.vy; p.x += p.vx; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(Math.sin(p.r) * 0.5);
      x.font = p.s + 'px serif'; x.textAlign = 'center'; x.fillText(p.e, 0, 0);
      x.restore();
    }
    if (Date.now() - t0 < dur) requestAnimationFrame(loop);
    else c.remove();
  })();
}
function shake() { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 700); }
function boom() {
  const ctx = ensureAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.5);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.65);
}
function chirp() {
  const ctx = ensureAudioCtx(); if (!ctx) return;
  for (let i = 0; i < 6; i++) {
    const t = ctx.currentTime + i * 0.18;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(4200, t); o.frequency.exponentialRampToValueAtTime(3600, t + 0.09);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.13);
  }
}
function rainbowFlash() {
  const d = document.createElement('div'); d.className = 'rainbow-ov';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}
function bebaOverlay() {
  const d = document.createElement('div'); d.className = 'beba-ov';
  d.innerHTML = '<img src="/img/beba.png" alt="Ardanın Bebası"/><div class="beba-cap">HAVALANSIN DİYE 5 DAKİKA CAMI AÇIK BIRAKMIŞIMDIR 😂</div><div class="beba-name">🦗 ARDANIN BEBASI 🦗</div>';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 4200);
  chirp();
}
function runFx(kind, by) {
  switch (kind) {
    case 'havai': confetti(); playSound('tada'); break;
    case 'beba': bebaOverlay(); emojiRain(['🦗', '', '🎧'], { n: 40 }); break;
    case 'yagmur': emojiRain(['💧', '💦', '☔'], { n: 70 }); break;
    case 'kar': emojiRain(['❄️', '☃️'], { n: 60, s: 16, dur: 3500 }); break;
    case 'para': emojiRain(['💵', '', '🪙'], { n: 70 }); playSound('pop'); break;
    case 'parti': emojiRain(['🎉', '🥳', '🎂', ''], { n: 60 }); playSound('tada'); break;
    case 'bomba': shake(); boom(); emojiRain(['💥', '🔥'], { n: 30, dur: 1500 }); break;
    case 'gokkusagi': rainbowFlash(); emojiRain(['🌈', '✨'], { n: 30 }); break;
    case 'kral': emojiRain(['👑', '✨', '💛'], { n: 50 }); playSound('tada'); break;
    case 'roket': emojiRain(['🚀', '🔥'], { n: 40, up: true }); break;
    default: confetti();
  }
}
function confetti() {
  const c = document.createElement('canvas');
  c.className = 'confetti-cv';
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  const cols = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#45ddc0', '#f0b232'];
  const P = Array.from({ length: 150 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height / 3, vy: 2 + Math.random() * 3.5, vx: -1.2 + Math.random() * 2.4, s: 4 + Math.random() * 6, col: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6 }));
  const t0 = Date.now();
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of P) { p.y += p.vy; p.x += p.vx; p.r += 0.06; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.col; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); x.restore(); }
    if (Date.now() - t0 < 2800) requestAnimationFrame(loop);
    else c.remove();
  })();
}

let ws = null, me = null, channels = [], usersList = [], known = {}, myDms = [];
let chanMsgs = {}, current = null, currentIsDm = false, lastRendered = null;
let typingMap = new Map(), reconnectDelay = 1000, closedOnPurpose = false;
let pendingImage = null, pendingFile = null, lastTypingSent = 0, metaInfo = { requireInvite: false, inviteCode: null };
let spoilOn = false;
let shop = [], myCoins = 0;
let myXp = 0, myLevel = 0, myQuests = { date: '', c: {}, claimed: [] }, myAch = [];
let myMarket = [];
let roles = [], userRoles = {}, replyTo = null, deaf = false;
let chosenMic = null;
const unread = new Set();
const collapsed = new Set();
try { chosenMic = JSON.parse(localStorage.getItem('kc-mic') || 'null'); } catch (_) {}

const voice = { channelId: null, pcs: new Map(), stream: null, muted: false, joining: false, screenStream: null };
let speakingAn = new Map(), remoteStreams = new Map(), screenView = null;

const COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#f47b67', '#45ddc0', '#9b84ee', '#3ba55d', '#f0b232'];
let pickedColor = COLORS[Math.floor(Math.random() * COLORS.length)];
const timeFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const wsUrl = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
const REACT_SET = ['👍', '❤️', '😂', '', '😮', '👎'];

/* ---------------- giriş ---------------- */
function buildLogin() {
  const row = $('#colorRow');
  COLORS.forEach((c) => {
    const d = document.createElement('div');
    d.className = 'color-dot' + (c === pickedColor ? ' sel' : '');
    d.style.background = c;
    d.onclick = () => { pickedColor = c; row.querySelectorAll('.color-dot').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); };
    row.appendChild(d);
  });
  const showTab = (reg) => {
    $('#tabLogin').classList.toggle('sel', !reg);
    $('#tabReg').classList.toggle('sel', reg);
    $('#loginForm').classList.toggle('hidden', reg);
    $('#regForm').classList.toggle('hidden', !reg);
    $('#loginError').textContent = '';
  };
  $('#tabLogin').onclick = () => showTab(false);
  $('#tabReg').onclick = () => showTab(true);
  $('#loginBtn').onclick = doLogin;
  $('#loginName').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  $('#loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  $('#regBtn').onclick = doRegister;
  $('#forgotBtn').onclick = openReset;
  $('#modeM').onclick = () => setMode('mobile');
  $('#modeA').onclick = () => setMode('auto');
  $('#modeP').onclick = () => setMode('pc');
  paintModeBtns();
  const saved = localStorage.getItem('kc-user');
  if (saved) { try { $('#loginName').value = JSON.parse(saved).name || ''; } catch (_) {} }
}
function doLogin() {
  const name = $('#loginName').value.trim();
  const pass = $('#loginPass').value;
  if (!name) { $('#loginError').textContent = 'Kullanıcı adını yaz 😊'; return; }
  if (!pass) { $('#loginError').textContent = 'Şifreni yaz 🔑'; return; }
  localStorage.setItem('kc-user', JSON.stringify({ name, pass }));
  const invite = $('#loginInvite').value.trim();
  if (ws && ws.readyState === WebSocket.OPEN) wsSend({ t: 'join', name, pass, invite });
  else connect();
}
function doRegister() {
  const name = $('#regName').value.trim();
  const email = $('#regMail').value.trim();
  const p1 = $('#regPass').value, p2 = $('#regPass2').value;
  if (p1 !== p2) { $('#loginError').textContent = 'Şifreler eşleşmiyor 😅'; return; }
  const payload = { t: 'register', name, email, pass: p1, color: pickedColor };
  if (ws && ws.readyState === WebSocket.OPEN) wsSend(payload);
  else { connect(); setTimeout(() => wsSend(payload), 1500); }
}
function openReset() {
  let m = $('#resetModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'resetModal'; m.className = 'modal-back hidden';
    m.innerHTML = '<div class="modal-card small"><div class="modal-head"><span class="modal-title">😢 Şifre Sıfırlama</span><button id="rsClose" class="icon-btn">✕</button></div><div class="modal-body"><div id="rsBody"></div></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    $('#rsClose').onclick = () => m.classList.add('hidden');
  }
  const body = $('#rsBody');
  body.innerHTML = '';
  const mail = document.createElement('input'); mail.placeholder = 'Kayıtlı mailin 📧'; mail.type = 'email';
  const b1 = document.createElement('button'); b1.className = 'btn-small'; b1.textContent = 'Kod Gönder';
  const row = document.createElement('div'); row.className = 'inv-row'; row.append(mail, b1);
  const info = document.createElement('div'); info.className = 'shop-tip'; info.style.marginTop = '8px';
  const step2 = document.createElement('div'); step2.className = 'hidden';
  const code = document.createElement('input'); code.placeholder = '6 haneli kod';
  const np = document.createElement('input'); np.type = 'password'; np.placeholder = 'Yeni şifre (en az 6)';
  const b2 = document.createElement('button'); b2.className = 'btn-small'; b2.textContent = 'Şifreyi Değiştir';
  step2.append(code, np, b2);
  body.append(row, info, step2);
  b1.onclick = () => {
    wsSend({ t: 'reset-request', email: mail.value.trim() });
    m._mail = mail.value.trim();
    info.textContent = '⏳ Gönderiliyor…';
    m._info = info; m._step2 = step2;
  };
  b2.onclick = () => {
    wsSend({ t: 'reset', email: m._mail, code: code.value.trim(), pass: np.value });
  };
  m.classList.remove('hidden');
}

/* ---------------- bağlantı ---------------- */
function connect() {
  closedOnPurpose = false;
  ws = new WebSocket(wsUrl());
  ws.onopen = () => {
    reconnectDelay = 1000;
    $('#netBanner').classList.add('hidden');
    const saved = localStorage.getItem('kc-user');
    if (saved) { const id = JSON.parse(saved); wsSend({ t: 'join', name: id.name, pass: id.pass || '', invite: $('#loginInvite').value.trim() }); }
  };
  ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (_) { return; } handle(m); };
  ws.onclose = () => { if (closedOnPurpose) return; $('#netBanner').classList.remove('hidden'); setTimeout(connect, reconnectDelay); reconnectDelay = Math.min(reconnectDelay * 2, 10000); };
  ws.onerror = () => {};
}
function wsSend(o) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); }
function toast(text) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

/* ---------------- gelen ---------------- */
function handle(m) {
  switch (m.t) {
    case 'init':
      me = m.you; channels = m.channels; usersList = m.users; known = m.known || {};
      myDms = m.myDms || []; metaInfo = Object.assign({ requireInvite: false, inviteCode: null }, m.meta || {});
      shop = m.shop || []; myCoins = m.coins || 0; myOwned = m.owned || [];
      myXp = m.xp || 0; myLevel = m.level || 0; myQuests = m.quests || myQuests; myAch = m.ach || [];
      myMarket = m.market || [];
      roles = m.roles || []; userRoles = m.userRoles || {};
      if (m.banner) applyBanner(m.banner);
      if (m.welcome) applyWelcome(m.welcome);
      chanMsgs[m.you.channelId] = m.messages; current = m.you.channelId;
      $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
      setupMe(); renderAll(); $('#input').focus();
      break;
    case 'users': usersList = m.users; renderUsers(); renderChannels(); break;
    case 'channels': channels = m.channels; renderChannels(); updateHeader(); updateComposerLock(); break;
    case 'switched':
      current = m.channelId; currentIsDm = !!m.dm; chanMsgs[current] = m.messages;
      unread.delete(current);
      if (currentIsDm && !myDms.some((d) => d.id === current)) myDms.push({ id: current, partner: current.split(':').slice(1).find((x) => x !== me.id) });
      typingMap.clear(); renderTyping(); renderAll(); closeDrawers(); $('#input').focus();
      updateWatchPanel();
      if (currentIsWatch() && m.watch) startWatch(m.watch.videoId, m.watch.sec, true);
      break;
    case 'msg': {
      if (!chanMsgs[m.channelId]) chanMsgs[m.channelId] = [];
      chanMsgs[m.channelId].push(m.msg);
      if (m.channelId === current) appendMessage(m.msg);
      const mine = m.msg.uid && m.msg.uid !== me.id;
      if (mine && (document.hidden || m.channelId !== current)) {
        beep();
        if (mentionedMe(m.msg) || m.msg.mentionAll || m.channelId.startsWith('dm:')) notify(m.msg);
      }
      break;
    }
    case 'typing':
      typingMap.set(m.uid, { name: m.name, until: Date.now() + 3000 });
      renderTyping(); setTimeout(renderTyping, 3100);
      break;
    case 'tick':
      if (m.channelId !== current) { unread.add(m.channelId); renderChannels(); }
      break;
    case 'hello':
      if (m.banner) applyBanner(m.banner);
      applyWelcome(m.welcome || '');
      break;
    case 'roles':
      roles = m.roles || []; userRoles = m.userRoles || {};
      renderUsers(); renderChannels();
      break;
    case 'banner': applyBanner(m.banner); break;
    case 'welcome': applyWelcome(m.welcome || ''); break;
    case 'audit': {
      let m2 = $('#auditModal');
      if (!m2) {
        m2 = document.createElement('div'); m2.id = 'auditModal'; m2.className = 'modal-back hidden';
        m2.innerHTML = '<div class="modal-card"><div class="modal-head"><span class="modal-title">📜 Denetim Kaydı</span><button id="auClose" class="icon-btn">✕</button></div><div id="auBody" class="modal-body"></div></div>';
        document.body.appendChild(m2);
        m2.addEventListener('click', (e) => { if (e.target === m2) m2.classList.add('hidden'); });
        $('#auClose').onclick = () => m2.classList.add('hidden');
      }
      const b2 = $('#auBody'); b2.innerHTML = '';
      if (!m.list.length) b2.innerHTML = '<div class="msg system">kayıt yok</div>';
      m.list.forEach((a) => {
        const d = document.createElement('div'); d.className = 'quest-row';
        d.innerHTML = `<span class="quest-label">${a.txt}</span><span class="msg-time">${new Date(a.t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>`;
        b2.appendChild(d);
      });
      m2.classList.remove('hidden');
      break;
    }
    case 'market':
      myMarket = m.market || [];
      if (!$('#marketModal')?.classList.contains('hidden')) renderMarketBody();
      break;
    case 'react': {
      const msg = (chanMsgs[m.channelId] || []).find((x) => x.id === m.msgId);
      if (msg) { msg.reactions = m.reactions; if (m.channelId === current) renderMessagesKeepScroll(); }
      break;
    }
    case 'msg-edit': {
      const msg = (chanMsgs[m.channelId] || []).find((x) => x.id === m.msgId);
      if (msg) { msg.text = m.text; msg.edited = true; if (m.channelId === current) renderMessagesKeepScroll(); }
      break;
    }
    case 'msg-del': {
      if (chanMsgs[m.channelId]) chanMsgs[m.channelId] = chanMsgs[m.channelId].filter((x) => x.id !== m.msgId);
      if (m.channelId === current) renderMessagesKeepScroll();
      break;
    }
    case 'msg-pin': {
      const msg = (chanMsgs[m.channelId] || []).find((x) => x.id === m.msgId);
      if (msg) { msg.pinned = m.pinned; if (m.channelId === current) renderMessagesKeepScroll(); }
      break;
    }
    case 'msg-game': {
      const msg = (chanMsgs[m.channelId] || []).find((x) => x.id === m.msgId);
      if (msg) { msg.game = m.game; if (m.channelId === current) renderMessagesKeepScroll(); }
      break;
    }
    case 'toast': toast(m.text); break;
    case 'join-error': $('#loginError').textContent = m.text || 'Giriş hatası'; break;
    case 'reg-err': $('#loginError').textContent = m.text || 'Kayıt hatası'; break;
    case 'reg-ok':
      toast('🎉 Hesap oluştu! Şimdi giriş yap.');
      $('#loginName').value = m.name || '';
      $('#tabLogin').click();
      $('#loginPass').value = '';
      $('#loginPass').focus();
      break;
    case 'reset-ok': {
      const mm = $('#resetModal');
      if (mm && mm._info) {
        mm._info.textContent = m.demo
          ? `📧 (Demo mod — mail servisi Render'da bağlı değil) Kodun: ${m.demo}`
          : '📧 Kod mailine gönderildi! (10 dk geçerli)';
        mm._step2.classList.remove('hidden');
      }
      break;
    }
    case 'reset-err': {
      const mm2 = $('#resetModal');
      if (mm2 && mm2._info) mm2._info.textContent = '❌ ' + (m.text || 'Hata');
      else $('#loginError').textContent = m.text || 'Hata';
      break;
    }
    case 'reset-done': {
      toast('🔑 Şifren değişti! Yeni şifrenle giriş yap.');
      const mm3 = $('#resetModal'); if (mm3) mm3.classList.add('hidden');
      break;
    }
    case 'coins':
      myCoins = m.coins; if (m.owned) myOwned = m.owned;
      if (m.xp !== undefined) { if (m.level > myLevel) confetti(); myXp = m.xp; myLevel = m.level; }
      if (m.quests) myQuests = m.quests;
      if (m.ach) myAch = m.ach;
      updateCoins(); if (profileOpen) renderProfile();
      break;
    case 'profile': {
      const ul = usersList.find((x) => x.id === m.uid);
      if (ul) ul.profile = m.profile;
      if (m.uid === me.id) me.profile = m.profile;
      renderUsers(); renderChannels();
      break;
    }
    case 'kicked':
      closedOnPurpose = true;
      localStorage.removeItem('kc-user');
      alert('Yönetici seni sunucudan çıkardı 😅');
      location.reload();
      break;
    case 'meta': metaInfo = Object.assign(metaInfo, m.meta); renderOwnerPanel(); break;
    case 'meta-public': metaInfo.requireInvite = m.on; break;
    case 'sound': if (m.from !== me.id) playSound(m.name); break;
    case 'fx': runFx(m.kind, m.by); break;
    case 'watch': {
      if (m.channelId !== current || !currentIsWatch()) break;
      if (m.action === 'play') { startWatch(m.videoId, m.from, true); toast('🎬 ' + (m.by || 'Biri') + ' videoyu başlattı — birlikte izliyorsunuz!'); }
      else if (m.action === 'pause') { ytCmd('pauseVideo'); toast('⏸ ' + (m.by || 'Biri') + ' duraklattı'); }
      else if (m.action === 'seek') { ytCmd('seekTo', [m.sec, true]); }
      else if (m.action === 'stop') { stopWatchUI(); toast('⏹ ' + (m.by || 'Biri') + ' izlemeyi bitirdi'); }
      break;
    }
    case 'voice-joined':
      voice.channelId = m.channelId; voice.joining = false; updateVoiceUI();
      for (const p of m.peers) createPeer(p.id, true);
      break;
    case 'voice-left': closePeer(m.uid); break;
    case 'rtc': handleSignal(m.from, m.data).catch(console.error); break;
  }
}

function mentionedMe(msg) {
  if (!msg.text) return false;
  return msg.text.includes('@' + me.name);
}
function notify(msg) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification('KankaChat — ' + msg.name, { body: (msg.text || '🖼️ resim').slice(0, 80) }); } catch (_) {}
}

/* ---------------- render ---------------- */
function paintAvatar(el, info) {
  const pf = info && info.profile;
  el.style.background = (info && info.color) || '#5865f2';
  el.classList.remove('photo');
  el.style.backgroundImage = '';
  if (pf && pf.photo) {
    el.classList.add('photo');
    el.style.backgroundImage = `url(${pf.photo})`;
    el.textContent = '';
  } else {
    el.textContent = pf && pf.emoji ? pf.emoji : ((info && info.name) || '?')[0].toUpperCase();
  }
  el.classList.remove('frame-steel', 'frame-star', 'frame-fire', 'frame-gold', 'frame-galaxy', 'frame-rainbow');
  if (pf && pf.frame) el.classList.add('frame-' + pf.frame);
}
function applyName(el, name, pf, suffix) {
  el.textContent = name + (suffix || '');
  if (pf && pf.badge) el.textContent += ' ' + pf.badge;
  el.classList.remove('nc-green', 'nc-red', 'nc-purple', 'nc-gold', 'nc-rainbow');
  if (pf && pf.nameColor) el.classList.add('nc-' + pf.nameColor);
}
function updateCoins() {
  const c = $('#meCoins');
  if (c) {
    c.textContent = '🪙 ' + myCoins;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  }
}

function setupMe() {
  paintAvatar($('#meAvatar'), me);
  $('#meName').textContent = me.name + (me.role === 'owner' ? ' 👑' : '');
  $('#ownerBtn').classList.toggle('hidden', me.role !== 'owner');
  if (!$('#meCoins')) {
    const c = document.createElement('div');
    c.id = 'meCoins'; c.className = 'me-coins';
    document.querySelector('.me-bar').insertBefore(c, $('#logoutBtn'));
  }
  updateCoins();
  $('#meAvatar').onclick = openProfile;
  $('#meCoins').onclick = openProfile;
  const dot = $('#meDot');
  dot.className = 'p-dot ' + myPresence;
  dot.onclick = (e) => {
    e.stopPropagation();
    myPresence = myPresence === 'online' ? 'away' : myPresence === 'away' ? 'dnd' : 'online';
    dot.className = 'p-dot ' + myPresence;
    wsSend({ t: 'presence', v: myPresence });
    toast('Durum: ' + (myPresence === 'online' ? '🟢 Çevrimiçi' : myPresence === 'away' ? '🌙 Uzakta' : '⛔ Rahatsız Etmeyin'));
  };
}
let myPresence = 'online';
function renderAll() { renderChannels(); renderMessages(); renderUsers(); updateHeader(); updateComposerLock(); renderOwnerPanel(); }

function partnerInfo(pid) {
  if (pid === 'bot') return { name: 'KankaBot 🤖', color: '#f0b232' };
  const u = usersList.find((x) => x.id === pid);
  if (u) return { name: u.name, color: u.color };
  return known[pid] || { name: 'Kanka', color: '#5865f2' };
}
function updateHeader() {
  if (currentIsDm) {
    const p = partnerInfo(current.split(':').slice(1).find((x) => x !== me.id));
    $('#chName').textContent = '@' + p.name;
    $('#chTopic').textContent = 'Özel mesaj';
    $('#topTitle').textContent = '@' + p.name;
    $('#lockBtn').classList.add('hidden');
    $('#renBtn').classList.add('hidden');
    $('#delBtn').classList.add('hidden');
  } else {
    const ch = channels.find((c) => c.id === current);
    if (!ch) return;
    $('#chName').textContent = ch.name;
    $('#chTopic').textContent = ch.topic || '';
    $('#topTitle').textContent = '#' + ch.name;
    const lb = $('#lockBtn');
    lb.classList.toggle('hidden', me.role !== 'owner');
    lb.textContent = ch.locked ? '🔒' : '🔓';
    const isOwnerNow = me.role === 'owner';
    $('#renBtn').classList.toggle('hidden', !isOwnerNow);
    $('#delBtn').classList.toggle('hidden', !isOwnerNow);
  }
  $('#input').placeholder = (currentIsDm ? '@' : '#') + $('#chName').textContent.replace(/^@/, '') + ' kanalına yaz…';
}
function updateComposerLock() {
  const ch = channels.find((c) => c.id === current);
  const locked = ch && ch.locked && me.role !== 'owner';
  $('#input').disabled = !!locked;
  $('#lockNote').classList.toggle('hidden', !locked);
}

function renderChannels() {
  const list = $('#channelList');
  list.innerHTML = '';
  const texts = channels.filter((c) => c.type === 'text');
  const voices = channels.filter((c) => c.type === 'voice');

  const g1 = document.createElement('div');
  g1.className = 'ch-group'; g1.innerHTML = '<span>Metin Kanalları</span>';
  const addBtn = document.createElement('button');
  addBtn.className = 'ch-add'; addBtn.title = 'Kanal oluştur'; addBtn.textContent = '+';
  addBtn.onclick = (e) => { e.stopPropagation(); const n = prompt('Yeni kanal adı:'); if (n && n.trim()) wsSend({ t: 'create-channel', name: n.trim() }); };
  g1.appendChild(addBtn); list.appendChild(g1);

  texts.forEach((c) => {
    if (c.parent) return; // alt kanallar aşağıda çizilir
    const kids = texts.filter((k) => k.parent === c.id);
    const item = document.createElement('div');
    item.className = 'ch-item' + (c.id === current ? ' active' : '');
    if (kids.length) {
      const ar = document.createElement('span');
      ar.className = 'ch-arrow';
      ar.textContent = collapsed.has(c.id) ? '▸' : '▾';
      ar.onclick = (e) => { e.stopPropagation(); collapsed.has(c.id) ? collapsed.delete(c.id) : collapsed.add(c.id); renderChannels(); };
      item.appendChild(ar);
    }
    const h = document.createElement('span'); h.className = 'hash'; h.textContent = c.locked ? '🔒' : '#';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name;
    item.append(h, l);
    const addSub = document.createElement('button');
    addSub.className = 'ch-add-sm'; addSub.title = 'Alt kanal aç'; addSub.textContent = '+';
    addSub.onclick = (e) => {
      e.stopPropagation();
      const n = prompt(`#${c.name} altına yeni alt kanal adı:`);
      if (n && n.trim()) wsSend({ t: 'create-channel', name: n.trim(), parentId: c.id });
    };
    item.appendChild(addSub);
    if (unread.has(c.id)) { const d = document.createElement('span'); d.className = 'unread-dot'; item.appendChild(d); }
    if (c.slow) { const sl = document.createElement('span'); sl.className = 'slow-tag'; sl.textContent = '🐌' + c.slow; item.appendChild(sl); }
    item.onclick = () => { if (c.id !== current) wsSend({ t: 'switch', channelId: c.id }); };
    list.appendChild(item);
    if (!collapsed.has(c.id)) {
      const thKids = channels.filter((t2) => t2.type === 'thread' && t2.parent === c.id);
      thKids.forEach((k) => {
        const ki = document.createElement('div');
        ki.className = 'ch-item ch-sub' + (k.id === current ? ' active' : '');
        const kl = document.createElement('span'); kl.className = 'ch-label'; kl.textContent = k.name;
        ki.appendChild(kl);
        ki.onclick = () => { if (k.id !== current) wsSend({ t: 'switch', channelId: k.id }); };
        list.appendChild(ki);
      });
      kids.forEach((k) => {
        const ki = document.createElement('div');
        ki.className = 'ch-item ch-sub' + (k.id === current ? ' active' : '');
        const kh = document.createElement('span'); kh.className = 'hash'; kh.textContent = k.locked ? '🔒' : '#';
        const kl = document.createElement('span'); kl.className = 'ch-label'; kl.textContent = k.name;
        ki.append(kh, kl);
        if (unread.has(k.id)) { const d = document.createElement('span'); d.className = 'unread-dot'; ki.appendChild(d); }
        ki.onclick = () => { if (k.id !== current) wsSend({ t: 'switch', channelId: k.id }); };
        list.appendChild(ki);
      });
    }
  });

  if (myDms.length) {
    const gd = document.createElement('div');
    gd.className = 'ch-group'; gd.innerHTML = '<span>Özel Mesajlar</span>';
    list.appendChild(gd);
    myDms.forEach((d) => {
      const p = partnerInfo(d.partner);
      const item = document.createElement('div');
      item.className = 'ch-item' + (d.id === current ? ' active' : '');
      const h = document.createElement('span'); h.className = 'hash'; h.textContent = '@';
      const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = p.name;
      item.append(h, l);
      if (unread.has(d.id)) { const dd = document.createElement('span'); dd.className = 'unread-dot'; item.appendChild(dd); }
      item.onclick = () => { if (d.id !== current) wsSend({ t: 'switch', channelId: d.id }); };
      list.appendChild(item);
    });
  }

  const g2 = document.createElement('div');
  g2.className = 'ch-group'; g2.innerHTML = '<span>Ses Kanalları</span>';
  list.appendChild(g2);
  channels.filter((c) => c.type === 'watch').forEach((c, i) => {
    if (i === 0) {
      const gw = document.createElement('div');
      gw.className = 'ch-group'; gw.innerHTML = '<span>🎬 İzleme Odaları</span>';
      list.insertBefore(gw, g2);
    }
    const item = document.createElement('div');
    item.className = 'ch-item' + (c.id === current ? ' active' : '');
    const icon = document.createElement('span'); icon.textContent = '🎬';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name;
    item.append(icon, l);
    if (unread.has(c.id)) { const d = document.createElement('span'); d.className = 'unread-dot'; item.appendChild(d); }
    item.onclick = () => { if (c.id !== current) wsSend({ t: 'switch', channelId: c.id }); };
    list.insertBefore(item, g2);
  });
  voices.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'ch-item' + (voice.channelId === c.id ? ' active' : '');
    const icon = document.createElement('span'); icon.textContent = c.stage ? '🌐' : '🔊';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name + (c.limit ? ` (${voiceUsersOfLen(c.id)}/${c.limit})` : '');
    item.append(icon, l);
    item.onclick = () => { if (voice.channelId === c.id) leaveVoice(); else joinVoice(c.id); };
    list.appendChild(item);
    const membersIn = usersList.filter((u) => u.voiceId === c.id);
    if (membersIn.length) {
      const box = document.createElement('div'); box.className = 'voice-members';
      membersIn.forEach((u) => {
        const row = document.createElement('div'); row.className = 'vm-item';
        const av = document.createElement('span'); av.className = 'mini-av'; av.dataset.av = u.id; paintAvatar(av, u);
        const nm = document.createElement('span'); nm.textContent = u.id === me.id ? u.name + ' (sen)' : u.name;
        row.append(av, nm);
        if (u.muted) { const mt = document.createElement('span'); mt.className = 'vm-mute'; mt.textContent = '🔇'; row.appendChild(mt); }
        box.appendChild(row);
      });
      list.appendChild(box);
    }
  });
}

function renderUsers() {
  $('#onlineBadge').textContent = usersList.length + ' çevrimiçi';
  const list = $('#memberList'); list.innerHTML = '';
  [...usersList].sort((a, b) => (b.role === 'owner') - (a.role === 'owner') || a.name.localeCompare(b.name, 'tr')).forEach((u) => {
    const row = document.createElement('div'); row.className = 'member';
    const av = document.createElement('div'); av.className = 'avatar'; av.dataset.av = u.id; paintAvatar(av, u);
    const dot = document.createElement('span'); dot.className = 'p-dot ' + (u.presence || 'online'); av.appendChild(dot);
    av.style.cursor = 'pointer';
    av.onclick = (e) => { e.stopPropagation(); openMemberProfile(u); };
    const info = document.createElement('div'); info.className = 'm-info';
    const nm = document.createElement('div'); nm.className = 'm-name';
    applyName(nm, u.name + (u.id === me.id ? ' (sen)' : '') + (u.role === 'owner' ? ' 👑' : '') + (u.profile && u.profile.clan ? ` ⚔️${u.profile.clan}` : '') + (u.profile && u.profile.level ? ` · Lv${u.profile.level}` : '') + (u.profile && u.profile.pet ? ' ' + u.profile.pet.e : ''), u.profile);
    const rl = roleOf(u.id);
    if (rl) { const rc = document.createElement('span'); rc.className = 'role-chip'; rc.style.borderColor = rl.color; rc.style.color = rl.color; rc.textContent = rl.name; nm.appendChild(rc); }
    if (u.timedOut) { const to2 = document.createElement('span'); to2.className = 'to-tag'; to2.textContent = '⏳'; nm.appendChild(to2); }
    const sub = document.createElement('div'); sub.className = 'm-sub';
    const ch = channels.find((c) => c.id === u.channelId);
    sub.textContent = (u.profile && u.profile.title ? '🎗️ ' + u.profile.title + ' • ' : '') + ((u.profile && u.profile.status) ? u.profile.status : (ch ? '#' + ch.name : 'özel'));
    info.append(nm, sub);
    row.append(av, info);
    row.dataset.uid = u.id;
    if (u.voiceId) { const v = document.createElement('span'); v.className = 'm-voice'; v.textContent = u.muted ? '🔇' : '🎙️'; row.appendChild(v); }
    if (me.role === 'owner' && u.id !== me.id) {
      const k = document.createElement('button'); k.className = 'icon-btn kick-btn'; k.title = 'Sunucudan at'; k.textContent = '⛔'; k.dataset.kick = u.id;
      row.appendChild(k);
    }
    row.dataset.dm = u.id;
    row.style.cursor = 'pointer';
    list.appendChild(row);
  });
}

function dayLabel(ts) {
  const d = new Date(ts), today = new Date(), yest = new Date(Date.now() - 86400000);
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Bugün';
  if (same(d, yest)) return 'Dün';
  return dateFmt.format(d);
}

function applyBanner(d) {
  const el = $('#serverBanner');
  if (!el) return;
  if (d) { el.style.backgroundImage = `url(${d})`; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}
function applyWelcome(t) {
  const el = $('#welcomeTxt');
  if (el && t) el.textContent = t;
}
function roleOf(uid) { const id = userRoles[uid]; return roles.find((r) => r.id === id) || null; }
const voiceUsersOfLen = (vid) => usersList.filter((x) => x.voiceId === vid).length;
function mdNodes(container, text) {
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*)/;
  let rest = text, m;
  while ((m = re.exec(rest))) {
    if (m.index > 0) container.appendChild(document.createTextNode(rest.slice(0, m.index)));
    const t = m[0];
    if (t[0] === '`') { const c = document.createElement('code'); c.textContent = t.slice(1, -1); container.appendChild(c); }
    else if (t.startsWith('**')) { const b = document.createElement('b'); b.textContent = t.slice(2, -2); container.appendChild(b); }
    else if (t.startsWith('__')) { const u2 = document.createElement('u'); u2.textContent = t.slice(2, -2); container.appendChild(u2); }
    else if (t.startsWith('~~')) { const s2 = document.createElement('s'); s2.textContent = t.slice(2, -2); container.appendChild(s2); }
    else { const i2 = document.createElement('i'); i2.textContent = t.slice(1, -1); container.appendChild(i2); }
    rest = rest.slice(m.index + t.length);
  }
  if (rest) container.appendChild(document.createTextNode(rest));
}
function mentionRegex() {
  const names = new Set(usersList.map((u) => u.name));
  Object.values(known).forEach((k) => names.add(k.name));
  const arr = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!arr.length) return null;
  try { return new RegExp('@(' + arr.join('|') + ')', 'g'); } catch (_) { return null; }
}
function richText(container, text) {
  const urlParts = text.split(/(https?:\/\/[^\s<]+)/g);
  const mrx = mentionRegex();
  for (const p of urlParts) {
    if (/^https?:\/\//.test(p)) {
      const a = document.createElement('a'); a.href = p; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = p;
      container.appendChild(a);
    } else if (mrx) {
      const rx = new RegExp(mrx.source, 'g');
      let last = 0;
      for (const mt of p.matchAll(rx)) {
        if (mt.index > last) mdNodes(container, p.slice(last, mt.index));
        const s = document.createElement('span');
        s.className = 'mention' + (mt[1] === me.name ? ' me' : '');
        s.textContent = '@' + mt[1];
        container.appendChild(s);
        last = mt.index + mt[0].length;
      }
      if (last < p.length) mdNodes(container, p.slice(last));
    } else mdNodes(container, p);
  }
}

function renderReactions(msg) {
  const frag = document.createDocumentFragment();
  const entries = Object.entries(msg.reactions || {});
  if (!entries.length) return frag;
  const wrap = document.createElement('div'); wrap.className = 'react-row';
  entries.forEach(([em, uids]) => {
    const b = document.createElement('button');
    b.className = 'react-chip' + (uids.includes(me.id) ? ' mine' : '');
    b.dataset.act = 'react'; b.dataset.id = msg.id; b.dataset.emoji = em;
    b.textContent = em + ' ' + uids.length;
    b.title = 'Tepki ver';
    wrap.appendChild(b);
  });
  frag.appendChild(wrap);
  return frag;
}

function renderGame(msg) {
  const g = msg.game;
  if (!g) return null;
  if (g.type === 'mem') {
    const w = document.createElement('div');
    const box = document.createElement('div'); box.className = 'mem-box';
    (g.cards || []).forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'mem-cell' + (c.m ? ' matched' : '');
      b.textContent = c.e;
      b.dataset.act = 'move'; b.dataset.id = msg.id; b.dataset.move = i;
      if (c.m) b.disabled = true;
      box.appendChild(b);
    });
    const st = document.createElement('div'); st.className = 'xo-status';
    st.textContent = g.done ? '🎉 Hepsini buldun!' : `Hamle: ${g.moves || 0} — eşleri bul!`;
    w.append(box, st);
    return w;
  }
  if (g.btns) {
    const w = document.createElement('div');
    if (g.type === 'bj') {
      const h = document.createElement('div'); h.className = 'xo-status';
      h.textContent = `🃏 Sen: [${g.hand || ''}] = ${g.hv || 0} • Krupiye: [${g.dshow || ''} ?]${g.bet ? ' • bahis ' + g.bet + '🪙' : ''}`;
      w.appendChild(h);
    }
    if (g.type === 'adam') {
      const h = document.createElement('div'); h.className = 'adam-mask';
      h.textContent = (g.mask || '') + '  ' + '❤️'.repeat(Math.max(0, g.hearts == null ? 6 : g.hearts)) + '🖤'.repeat(Math.min(6, 6 - (g.hearts == null ? 6 : g.hearts)));
      w.appendChild(h);
    }
    const box = document.createElement('div'); box.className = 'btnrow';
    (g.btns || []).forEach((b, i) => {
      const btn = document.createElement('button');
      btn.className = 'gbtn';
      btn.textContent = b;
      btn.dataset.act = 'move'; btn.dataset.id = msg.id; btn.dataset.move = i;
      if (g.done) btn.disabled = true;
      box.appendChild(btn);
    });
    w.appendChild(box);
    const st = document.createElement('div'); st.className = 'xo-status';
    st.textContent = g.done ? (g.info || 'Bitti!') : (g.info ? g.info + ' • ' : '') + (g.type === 'mac' ? `Adım ${g.step}/4` : 'butonlara bas!');
    w.appendChild(st);
    return w;
  }
  if (g.type !== 'xo') return null;
  const box = document.createElement('div'); box.className = 'xo-box';
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.className = 'xo-cell' + (g.board[i] === 'X' ? ' x' : g.board[i] === 'O' ? ' o' : '');
    b.textContent = g.board[i] || '';
    b.dataset.act = 'move'; b.dataset.id = msg.id; b.dataset.move = i;
    if (!g.active || g.board[i]) b.disabled = true;
    box.appendChild(b);
  }
  const st = document.createElement('div'); st.className = 'xo-status';
  if (!g.active) st.textContent = g.winner === -1 ? '🤝 Berabere' : `🏆 ${g.names[g.winner]} kazandı`;
  else if (g.players.length < 2) st.textContent = `${g.names[0]} rakip bekliyor — kareye tıkla!`;
  else st.textContent = `Sıra: ${g.names[g.turn]} (${g.turn === 0 ? 'X' : 'O'})`;
  const w = document.createElement('div'); w.append(box, st);
  return w;
}

function renderPoll(msg) {
  const r = msg.reactions || {};
  const yes = (r['👍'] || []).length, no = (r['👎'] || []).length;
  const total = yes + no;
  const w = document.createElement('div'); w.className = 'poll-box';
  [['👍', yes], ['👎', no]].forEach(([em, n]) => {
    const row = document.createElement('div'); row.className = 'poll-row';
    const pct = total ? Math.round((n / total) * 100) : 0;
    row.innerHTML = `<span class="poll-em">${em}</span><div class="poll-bar"><div style="width:${pct}%"></div></div><span class="poll-pct">%${pct} (${n})</span>`;
    w.appendChild(row);
  });
  return w;
}

function buildMessage(msg, prev) {
  if (msg.system) {
    const d = document.createElement('div'); d.className = 'msg system';
    d.textContent = `— ${msg.text} · ${timeFmt.format(msg.ts)} —`;
    return d;
  }
  const grouped = prev && !prev.system && prev.uid === msg.uid && msg.ts - prev.ts < 5 * 60 * 1000 && new Date(prev.ts).toDateString() === new Date(msg.ts).toDateString();
  const d = document.createElement('div');
  d.className = 'msg' + (grouped ? ' grouped' : '');
  d.dataset.msgid = msg.id;
  if (msg.profile && msg.profile.bubble) d.style.background = msg.profile.bubble + '1c';

  if (grouped) {
    const sp = document.createElement('div'); sp.className = 'msg-gtime'; sp.textContent = timeFmt.format(msg.ts);
    d.appendChild(sp);
  } else {
    const av = document.createElement('div'); av.className = 'avatar';
    if (msg.uid === 'bot') { av.style.background = '#f0b232'; av.textContent = '🤖'; }
    else paintAvatar(av, { color: msg.color, name: msg.name, profile: msg.profile || (usersList.find((x) => x.id === msg.uid) || {}).profile });
    d.appendChild(av);
  }

  const body = document.createElement('div'); body.className = 'msg-body';
  if (!grouped) {
    const head = document.createElement('div'); head.className = 'msg-head';
    const nm = document.createElement('span'); nm.className = 'msg-name'; nm.style.color = msg.color || '#fff';
    applyName(nm, msg.name, msg.profile || (usersList.find((x) => x.id === msg.uid) || {}).profile, ((msg.profile && msg.profile.clan) ? ' ⚔️' + msg.profile.clan : '') + ((msg.profile && msg.profile.title) ? ' • ' + msg.profile.title : '') + ((msg.profile && msg.profile.pet) ? ' ' + msg.profile.pet.e : ''));
    const tm = document.createElement('span'); tm.className = 'msg-time'; tm.textContent = dayLabel(msg.ts) + ' ' + timeFmt.format(msg.ts);
    head.append(nm, tm);
    body.appendChild(head);
  }
  if (msg.text) {
    const tx = document.createElement('div'); tx.className = 'msg-text' + (msg.profile && msg.profile.gold ? ' gold-txt' : '');
    const stripped = msg.text.replace(/[\p{Extended_Pictographic}\u200d\ufe0f\s*]/gu, '');
    if (stripped === '' && msg.text.trim().length > 0 && msg.text.trim().length <= 12) tx.classList.add('jumbo');
    richText(tx, msg.text.replace(/\*\*([^*]+)\*\*/g, '$1'));
    if (msg.edited) { const e = document.createElement('span'); e.className = 'edited'; e.textContent = ' (düzenlendi)'; tx.appendChild(e); }
    body.appendChild(tx);
  }
  if (msg.image) {
    const im = document.createElement('img'); im.className = 'msg-img'; im.src = msg.image; im.alt = 'resim';
    im.onclick = () => window.open(im.src, '_blank');
    body.appendChild(im);
  }
  if (msg.file) {
    if ((msg.file.type || '').startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(msg.file.url)) {
      const v = document.createElement('video');
      v.className = 'msg-video'; v.controls = true; v.preload = 'metadata'; v.src = msg.file.url;
      body.appendChild(v);
    } else if ((msg.file.type || '').startsWith('image/')) {
      const im = document.createElement('img'); im.className = 'msg-img'; im.src = msg.file.url;
      im.onclick = () => window.open(im.src, '_blank');
      body.appendChild(im);
    } else {
      const a = document.createElement('a'); a.className = 'file-chip'; a.href = msg.file.url;
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = '📄 ' + msg.file.name + ' (indir)';
      body.appendChild(a);
    }
  }
  if (msg.pinned) {
    const pc = document.createElement('div'); pc.className = 'pin-chip'; pc.textContent = '📌 Sabitlenmiş mesaj';
    body.appendChild(pc);
  }
  if (msg.replyTo) {
    const q = document.createElement('div'); q.className = 'quote-box';
    q.innerHTML = `<b>↩️ ${msg.replyTo.name}</b> <span>${(msg.replyTo.text || '').slice(0, 60)}</span>`;
    q.onclick = () => { const t = document.querySelector(`.msg[data-msgid="${msg.replyTo.id}"]`); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    body.appendChild(q);
  }
  if (msg.spoiler) {
    const sc = document.createElement('div'); sc.className = 'pin-chip'; sc.textContent = '✍️ spoiler — görmek için tıkla';
    body.prepend(sc);
    body.classList.add('spoiled');
    body.addEventListener('click', (e) => { e.stopPropagation(); body.classList.toggle('revealed'); });
  }
  if (msg.poll) body.appendChild(renderPoll(msg));
  const gw = renderGame(msg); if (gw) body.appendChild(gw);
  body.appendChild(renderReactions(msg));
  d.appendChild(body);

  // hover araç çubuğu
  const tb = document.createElement('div'); tb.className = 'msg-tools';
  REACT_SET.slice(0, 3).forEach((em) => {
    const b = document.createElement('button'); b.className = 'tool-btn'; b.textContent = em; b.dataset.act = 'react'; b.dataset.id = msg.id; b.dataset.emoji = em;
    tb.appendChild(b);
  });
  const more = document.createElement('button'); more.className = 'tool-btn'; more.textContent = '😀+'; more.dataset.act = 'reactmore'; more.dataset.id = msg.id;
  tb.appendChild(more);
  if (msg.uid === me.id || me.role === 'owner') {
    const pn = document.createElement('button'); pn.className = 'tool-btn'; pn.textContent = '📌'; pn.title = 'Sabitle/kaldır'; pn.dataset.act = 'pin'; pn.dataset.id = msg.id;
    tb.appendChild(pn);
  }
  const rp = document.createElement('button'); rp.className = 'tool-btn'; rp.textContent = '↩️'; rp.title = 'Yanıtla';
  rp.onclick = (e) => { e.stopPropagation(); replyTo = { id: msg.id, name: msg.name, text: msg.text || '🖼️' }; const rc = $('#replyChip'); rc.innerHTML = `<b>↩️ ${msg.name}</b> ${(msg.text || '🖼️').slice(0, 40)} <span class="rc-x">✕</span>`; rc.classList.remove('hidden'); $('#input').focus(); };
  tb.appendChild(rp);
  const th = document.createElement('button'); th.className = 'tool-btn'; th.textContent = '🧵'; th.title = 'Thread aç';
  th.onclick = (e) => { e.stopPropagation(); wsSend({ t: 'thread', msgId: msg.id }); };
  tb.appendChild(th);
  if (msg.uid === me.id) {
    const ed = document.createElement('button'); ed.className = 'tool-btn'; ed.textContent = '✏️'; ed.dataset.act = 'edit'; ed.dataset.id = msg.id;
    const dl = document.createElement('button'); dl.className = 'tool-btn'; dl.textContent = '🗑️'; dl.dataset.act = 'del'; dl.dataset.id = msg.id;
    tb.append(ed, dl);
  } else if (me.role === 'owner') {
    const dl = document.createElement('button'); dl.className = 'tool-btn'; dl.textContent = '🗑️'; dl.dataset.act = 'del'; dl.dataset.id = msg.id;
    tb.appendChild(dl);
  }
  d.appendChild(tb);
  return d;
}

let searchTerm = '';
function renderMessages() {
  const box = $('#messages'); box.innerHTML = ''; lastRendered = null;
  const all = chanMsgs[current] || [];
  const list = searchTerm ? all.filter((m) => ((m.text || '') + ' ' + (m.name || '')).toLocaleLowerCase('tr').includes(searchTerm)) : all;
  if (searchTerm) {
    const info = document.createElement('div'); info.className = 'msg system';
    info.textContent = `🔍 "${searchTerm}" için ${list.length} sonuç`;
    box.appendChild(info);
  }
  let lastDay = '';
  for (const msg of list) {
    const day = new Date(msg.ts).toDateString();
    if (day !== lastDay) {
      const sep = document.createElement('div'); sep.className = 'day-sep'; sep.textContent = dayLabel(msg.ts);
      box.appendChild(sep); lastDay = day; lastRendered = null;
    }
    box.appendChild(buildMessage(msg, lastRendered));
    lastRendered = msg;
  }
  box.scrollTop = box.scrollHeight;
}
function renderMessagesKeepScroll() {
  const box = $('#messages'); const st = box.scrollTop;
  renderMessages(); box.scrollTop = st;
}
function appendMessage(msg) {
  const box = $('#messages');
  const day = new Date(msg.ts).toDateString();
  const prevDay = lastRendered ? new Date(lastRendered.ts).toDateString() : '';
  if (day !== prevDay) {
    const sep = document.createElement('div'); sep.className = 'day-sep'; sep.textContent = dayLabel(msg.ts);
    box.appendChild(sep); lastRendered = null;
  }
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 200;
  box.appendChild(buildMessage(msg, lastRendered));
  lastRendered = msg;
  if (nearBottom || msg.uid === me.id) box.scrollTop = box.scrollHeight;
}
function renderTyping() {
  const now = Date.now();
  const names = [...typingMap.values()].filter((x) => x.until > now).map((x) => x.name);
  const el = $('#typingRow');
  if (!names.length) { el.textContent = ''; return; }
  el.textContent = names.length === 1 ? `${names[0]} yazıyor` : names.length === 2 ? `${names[0]} ve ${names[1]} yazıyor` : 'Birkaç kişi yazıyor';
  if (names.length) {
    const d = document.createElement('span'); d.className = 'tdots';
    d.innerHTML = '<span></span><span></span><span></span>';
    el.appendChild(d);
  }
}

/* ---------------- owner paneli ---------------- */
function renderOwnerPanel() {
  const p = $('#ownerPop');
  if (!p) return;
  $('#invCode').textContent = metaInfo.inviteCode || '—';
  $('#invOn').checked = !!metaInfo.requireInvite;
}

/* ---------------- composer & olaylar ---------------- */
function setupComposer() {
  const input = $('#input');
  const doSend = () => {
    const text = input.value.trim();
    if (!text && !pendingImage && !pendingFile) return;
    wsSend({ t: 'msg', text, image: pendingImage, file: pendingFile, spoiler: spoilOn, replyTo: replyTo || null });
    if (spoilOn) { spoilOn = false; $('#spoilBtn').classList.remove('on'); }
    const rp2 = replyTo; replyTo = null; $('#replyChip').classList.add('hidden');
    input.value = ''; input.style.height = 'auto';
    hideSlash();
    clearPendingImage(); input.focus();
    return rp2;
  };
  $('#replyChip').addEventListener('click', () => { replyTo = null; $('#replyChip').classList.add('hidden'); });
  $('#spoilBtn').onclick = () => {
    spoilOn = !spoilOn;
    $('#spoilBtn').classList.toggle('on', spoilOn);
    toast(spoilOn ? '✍️ Spoiler modu AÇIK — sonraki mesaj bulanık' : '✍️ Spoiler kapalı');
  };
  $('#sendBtn').onclick = doSend;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
  input.addEventListener('input', () => {
    input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    const now = Date.now();
    if (now - lastTypingSent > 1200 && input.value.trim()) { lastTypingSent = now; wsSend({ t: 'typing' }); }
  });

  $('#attachBtn').onclick = () => $('#fileInput').click();
  $('#fileInput').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { alert('Dosya çok büyük (max 25 MB) 📏'); return; }
    if (f.type.startsWith('image/') && f.size <= 1_200_000) {
      const r = new FileReader();
      r.onload = () => { pendingImage = r.result; showPending('🖼️ ' + f.name, pendingImage); };
      r.readAsDataURL(f);
      return;
    }
    showPending('⏫ Yükleniyor: ' + f.name, null);
    try {
      const res = await fetch('/upload', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(f.name), 'x-file-type': f.type || '' }, body: f });
      const j = await res.json();
      if (!j.url) throw 0;
      pendingFile = { url: j.url, name: j.name || f.name, type: f.type || '' };
      showPending((f.type.startsWith('video/') ? '🎬 ' : f.type.startsWith('audio/') ? '🎧 ' : '📄 ') + (j.name || f.name), null);
    } catch (_) { clearPendingImage(); toast('Yükleme başarısız 😕'); }
  });
  $('#imgRemoveBtn').onclick = clearPendingImage;

  const EMOJIS = ['😀','😂','😅','😍','😎','🤔','😴','😭','😡','🥳','😇','🤯','👍','','👋','','💪','','👀','❤️','🔥','⭐','✨','🎉','💯','','🎧','','⚽','🏆','🍕','','🫡','💀','🤡',''];
  const pop = $('#emojiPop');
  EMOJIS.forEach((em) => {
    const b = document.createElement('button'); b.textContent = em;
    b.onclick = () => { input.value += em; input.focus(); pop.classList.add('hidden'); };
    pop.appendChild(b);
  });
  $('#emojiBtn').onclick = (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); };
  document.addEventListener('click', (e) => { if (!pop.classList.contains('hidden') && !pop.contains(e.target)) pop.classList.add('hidden'); });

  // çift tık → mention
  $('#messages').addEventListener('dblclick', (e) => {
    const msgEl = e.target.closest('.msg[data-msgid]');
    if (!msgEl) return;
    const msg = (chanMsgs[current] || []).find((x) => x.id === msgEl.dataset.msgid);
    if (msg && msg.name && msg.uid !== me.id) {
      const inp = $('#input');
      inp.value = (inp.value ? inp.value + ' ' : '') + '@' + msg.name + ' ';
      inp.focus();
    }
  });

  // mesaj araçları (delegasyon)
  $('#messages').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'react') wsSend({ t: 'react', msgId: b.dataset.id, emoji: b.dataset.emoji });
    if (act === 'reactmore') {
      const em = prompt('Emoji yaz:');
      if (em) wsSend({ t: 'react', msgId: b.dataset.id, emoji: em.trim() });
    }
    if (act === 'edit') {
      const msg = (chanMsgs[current] || []).find((x) => x.id === b.dataset.id);
      const nt = prompt('Mesajı düzenle:', msg ? msg.text : '');
      if (nt !== null && nt.trim()) wsSend({ t: 'edit', msgId: b.dataset.id, text: nt.trim() });
    }
    if (act === 'del') { if (confirm('Mesaj silinsin mi?')) wsSend({ t: 'del', msgId: b.dataset.id }); }
    if (act === 'move') wsSend({ t: 'game', msgId: b.dataset.id, move: Number(b.dataset.move) });
    if (act === 'pin') wsSend({ t: 'pin', msgId: b.dataset.id });
  });

  // üye listesi: DM aç + kick
  $('#memberList').addEventListener('click', (e) => {
    const k = e.target.closest('[data-kick]');
    if (k) { if (confirm('Bu kişiyi sunucudan atayım mı? ⛔')) wsSend({ t: 'kick', uid: k.dataset.kick }); return; }
    const row = e.target.closest('[data-dm]');
    if (row) {
      const uid = row.dataset.dm;
      if (uid === me.id) return;
      const ids = [me.id, uid].sort();
      wsSend({ t: 'switch', channelId: 'dm:' + ids[0] + ':' + ids[1] });
    }
  });

  // kilit + zil + owner
  $('#lockBtn').onclick = () => {
    const ch = channels.find((c) => c.id === current);
    if (ch) wsSend({ t: 'lock', channelId: ch.id, locked: !ch.locked });
  };
  $('#renBtn').onclick = () => {
    const ch = channels.find((c) => c.id === current);
    if (!ch) return;
    const nn = prompt('Yeni kanal adı:', ch.name);
    if (nn && nn.trim() && nn.trim() !== ch.name) wsSend({ t: 'rename-channel', channelId: ch.id, name: nn.trim() });
  };
  $('#delBtn').onclick = () => {
    const ch = channels.find((c) => c.id === current);
    if (!ch) return;
    if (confirm(`#${ch.name} kanalı SİLİNSİN mi? (geri alınamaz)`)) wsSend({ t: 'del-channel', channelId: ch.id });
  };
  $('#bellBtn').onclick = async () => {
    if (!('Notification' in window)) { alert('Tarayıcın bildirim desteklemiyor 😕'); return; }
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? '🔔 Bildirimler açık!' : 'Bildirim izni verilmedi');
  };
  $('#ownerBtn').onclick = (e) => { e.stopPropagation(); $('#ownerPop').classList.toggle('hidden'); };
  $('#invOn').onchange = (e) => wsSend({ t: 'invite', action: 'toggle', on: e.target.checked });
  $('#invNew').onclick = () => wsSend({ t: 'invite', action: 'new' });
  $('#invCopy').onclick = () => { navigator.clipboard.writeText(metaInfo.inviteCode || '').then(() => toast('Kod kopyalandı 📋')); };
  document.addEventListener('click', (e) => { if (!$('#ownerPop').classList.contains('hidden') && !$('#ownerPop').contains(e.target) && e.target.id !== 'ownerBtn') $('#ownerPop').classList.add('hidden'); });
}
function showPending(label, imgSrc) {
  $('#imgPreviewLabel').textContent = label;
  const im = $('#imgPreviewImg');
  if (imgSrc) { im.src = imgSrc; im.style.display = ''; } else { im.style.display = 'none'; }
  $('#imgPreview').classList.remove('hidden');
}
function clearPendingImage() {
  pendingImage = null; pendingFile = null;
  $('#imgPreview').classList.add('hidden');
  $('#imgPreviewImg').src = ''; $('#imgPreviewLabel').textContent = '';
}

/* ---------------- ses & bildirim ---------------- */
let audioCtx = null;
function ensureAudioCtx() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (_) {}
  return audioCtx;
}
function beep() {
  const ctx = ensureAudioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.26);
  } catch (_) {}
}

/* soundboard: herkes için WebAudio ile sentez */
function playSound(name) {
  const ctx = ensureAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const tone = (type, f0, f1, dur, at = 0, vol = 0.25) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t + at);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
    g.gain.setValueAtTime(vol, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t + at); o.stop(t + at + dur + 0.02);
  };
  if (name === 'airhorn') { for (let i = 0; i < 3; i++) tone('sawtooth', 440, 466, 0.22, i * 0.25, 0.3); }
  else if (name === 'bruh') tone('square', 130, 70, 0.35);
  else if (name === 'pop') tone('sine', 600, 180, 0.09);
  else if (name === 'lazer') tone('sawtooth', 1400, 90, 0.3);
  else if (name === 'tada') [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, null, 0.22, i * 0.12));
  else if (name === 'huzun') [392, 370, 349, 330].forEach((f, i) => tone('triangle', f, null, 0.3, i * 0.3));
}
function setupSoundboard() {
  const SOUNDS = [['airhorn', '📯 Korna'], ['bruh', '💀 Bruh'], ['pop', '🫧 Pop'], ['lazer', '🔫 Lazer'], ['tada', '🎉 Tada'], ['huzun', '🎻 Hüzün']];
  const pop = $('#soundPop');
  SOUNDS.forEach(([id, label]) => {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => { playSound(id); wsSend({ t: 'sound', name: id }); pop.classList.add('hidden'); };
    pop.appendChild(b);
  });
  $('#soundBtn').onclick = (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); };
  document.addEventListener('click', (e) => { if (!pop.classList.contains('hidden') && !pop.contains(e.target)) pop.classList.add('hidden'); });
}

/* ---------------- 🎬 BİRLİKTE İZLEME ODASI ---------------- */
let watchIframe = null;
function currentIsWatch() { const c = channels.find((x) => x.id === current); return !!(c && c.type === 'watch'); }
function startWatch(videoId, sec, auto) {
  const wrap = $('#watchPlayer');
  wrap.innerHTML = '';
  const f = document.createElement('iframe');
  f.width = '100%'; f.height = '230'; f.frameBorder = '0';
  f.allow = 'autoplay; encrypted-media; picture-in-picture';
  f.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=1&autoplay=${auto ? 1 : 0}&start=${Math.floor(sec || 0)}`;
  f.onload = () => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'kc', channel: 'widget' }), '*'); } catch (_) {} };
  wrap.appendChild(f);
  watchIframe = f;
  $('#watchNow').textContent = '🎬 Odada oynuyor';
}
function ytCmd(fn, args) {
  if (!watchIframe) return;
  try { watchIframe.contentWindow.postMessage(JSON.stringify({ event: 'commanding', func: fn, args: args || [] }), '*'); } catch (_) {}
}
function stopWatchUI() { $('#watchPlayer').innerHTML = ''; watchIframe = null; $('#watchNow').textContent = ''; }
function updateWatchPanel() {
  if (currentIsWatch()) {
    $('#watchPanel').classList.remove('hidden');
  } else {
    $('#watchPanel').classList.add('hidden');
    stopWatchUI();
  }
}
function setupWatch() {
  $('#watchPlay').onclick = () => {
    const id = parseYT($('#watchInp').value);
    if (!id) { toast('Geçerli bir YouTube linki yapıştır 🔗'); return; }
    wsSend({ t: 'watch', action: 'play', videoId: id, from: 0 });
    $('#watchInp').value = '';
  };
  $('#watchPause').onclick = () => wsSend({ t: 'watch', action: 'pause' });
  $('#watchStop').onclick = () => wsSend({ t: 'watch', action: 'stop' });
}

/* ---------------- mikrofon seçici ---------------- */
async function listMics() {
  let devs = await navigator.mediaDevices.enumerateDevices();
  let mics = devs.filter((d) => d.kind === 'audioinput');
  if (!mics.some((d) => d.label)) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      devs = await navigator.mediaDevices.enumerateDevices();
      mics = devs.filter((d) => d.kind === 'audioinput');
    } catch (_) {}
  }
  return mics;
}
function pickMic() {
  return listMics().then((mics) => new Promise((resolve) => {
    if (!mics.length) return resolve(null);
    if (mics.length === 1) {
      const sel = { id: mics[0].deviceId, label: mics[0].label || 'Mikrofon' };
      chosenMic = sel; localStorage.setItem('kc-mic', JSON.stringify(sel));
      return resolve(mics[0].deviceId);
    }
    const back = document.createElement('div'); back.className = 'modal-back';
    const card = document.createElement('div'); card.className = 'modal-card small';
    card.innerHTML = '<div class="modal-head"><span class="modal-title">🎙️ Hangi mikrofonu kullanalım?</span></div>';
    const list = document.createElement('div'); list.className = 'mic-list';
    mics.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'mic-item' + (chosenMic && chosenMic.id === d.deviceId ? ' sel' : '');
      b.textContent = d.label || ('Mikrofon ' + (i + 1));
      b.onclick = () => {
        const sel = { id: d.deviceId, label: b.textContent };
        chosenMic = sel; localStorage.setItem('kc-mic', JSON.stringify(sel));
        back.remove(); resolve(d.deviceId);
      };
      list.appendChild(b);
    });
    const cancel = document.createElement('button'); cancel.className = 'btn-small'; cancel.textContent = 'Varsayılanı kullan';
    cancel.onclick = () => { back.remove(); resolve(chosenMic ? chosenMic.id : (mics[0].deviceId || null)); };
    card.append(list, cancel); back.append(card);
    document.body.appendChild(back);
  }));
}
async function changeMicLive() {
  if (!voice.channelId) { toast('Önce ses odasına gir 🔊'); return; }
  if (!voice.stream) { toast('Mikrofonun yok (dinleyici modu) 👂'); return; }
  const devId = await pickMic();
  if (!devId) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: devId }, echoCancellation: true, noiseSuppression: true } });
    const nt = s.getAudioTracks()[0];
    nt.enabled = !voice.muted;
    for (const [, pc] of voice.pcs) {
      const snd = pc.getSenders().find((x) => x.track && x.track.kind === 'audio');
      if (snd) snd.replaceTrack(nt);
    }
    voice.stream.getAudioTracks().forEach((t) => t.stop());
    voice.stream = s;
    attachSpeaking(me.id, s);
    toast('🎙️ Mikrofon değişti: ' + (chosenMic ? chosenMic.label : ''));
  } catch (_) { toast('Mikrofon açılamadı 😕'); }
}

/* ---------------- WebRTC ses ---------------- */
async function joinVoice(channelId) {
  if (voice.joining) return;
  voice.joining = true;
  if (voice.channelId) { wsSend({ t: 'voice-leave' }); closeAllPeers(); stopLocalStream(); voice.channelId = null; }
  let devId = null;
  try { devId = await pickMic(); } catch (_) {}
  try {
    voice.stream = await navigator.mediaDevices.getUserMedia({
      audio: Object.assign({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }, devId ? { deviceId: { exact: devId } } : {}),
    });
    voice.muted = false;
    attachSpeaking(me.id, voice.stream);
    if (chosenMic && chosenMic.label) toast('🎙️ Mikrofon: ' + chosenMic.label);
  } catch (_) { voice.stream = null; voice.muted = true; }
  wsSend({ t: 'voice-join', channelId });
  wsSend({ t: 'mute', muted: voice.muted });
  if (!voice.stream && !confirm('Mikrofona erişilemedi — dinleyici olarak katılacaksın. Devam?')) {
    wsSend({ t: 'voice-leave' }); voice.joining = false; return;
  }
}
function leaveVoice() {
  wsSend({ t: 'voice-leave' });
  stopScreen(); closeAllPeers(); stopLocalStream();
  speakingAn.clear();
  voice.channelId = null; voice.muted = false;
  updateVoiceUI(); renderChannels();
}
function stopLocalStream() { if (voice.stream) { voice.stream.getTracks().forEach((t) => t.stop()); voice.stream = null; } }
function sendRtc(to, data) { wsSend({ t: 'rtc', to, data }); }

function createPeer(uid, initiator) {
  closePeer(uid, true);
  const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] });
  pc.iceQueue = [];
  voice.pcs.set(uid, pc);
  if (voice.stream) voice.stream.getTracks().forEach((t) => pc.addTrack(t, voice.stream));
  if (voice.screenStream) {
    try {
      pc.screenSender = pc.addTrack(voice.screenStream.getVideoTracks()[0], voice.screenStream);
      voice.screenStream.getAudioTracks().forEach((at) => pc.addTrack(at, voice.screenStream));
    } catch (_) {}
  }

  pc.onicecandidate = (e) => { if (e.candidate) sendRtc(uid, { candidate: e.candidate }); };
  // EKRAN PAYLAŞIMI İÇİN ŞART: sonradan eklenen track'ler için yeniden pazarlık
  pc.onnegotiationneeded = async () => {
    try {
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(await pc.createOffer());
      sendRtc(uid, { sdp: pc.localDescription });
    } catch (_) {}
  };
  pc.ontrack = (e) => {
    const [stream] = e.streams;
    remoteStreams.set(uid, stream);
    if (e.track.kind === 'audio') {
      if (stream.getVideoTracks().length) return; // ekran sesi → video elementi çalar
      attachSpeaking(uid, stream);
      let a = document.getElementById('aud-' + uid);
      if (!a) { a = new Audio(); a.id = 'aud-' + uid; a.autoplay = true; document.body.appendChild(a); }
      a.srcObject = stream; a.volume = deaf ? 0 : 1; a.play().catch(() => {});
    } else {
      showRemoteScreen(uid, stream);
      e.track.onmute = () => hideScreenIf(uid);
      e.track.onended = () => hideScreenIf(uid);
    }
  };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') closePeer(uid); };

  if (initiator) {
    (async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendRtc(uid, { sdp: pc.localDescription });
    })().catch(console.error);
  }
  return pc;
}

async function handleSignal(from, data) {
  if (!voice.channelId) return;
  if (data.sdp) {
    if (data.sdp.type === 'offer') {
      let pc = voice.pcs.get(from);
      const polite = me.id > from;
      const collision = pc && pc.signalingState !== 'stable';
      if (collision && !polite) return;
      if (!pc) pc = createPeer(from, false);
      try {
        if (collision) await pc.setLocalDescription({ type: 'rollback' });
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendRtc(from, { sdp: pc.localDescription });
        flushIce(pc);
      } catch (e) { console.error('offer', e); }
    } else if (data.sdp.type === 'answer') {
      const pc = voice.pcs.get(from);
      if (!pc) return;
      try { await pc.setRemoteDescription(data.sdp); flushIce(pc); } catch (e) { console.error('answer', e); }
    }
  } else if (data.screen === true) {
    toast('🖥️ ' + ((usersList.find((x) => x.id === from) || {}).name || 'Biri') + ' ekranını paylaşıyor…');
  } else if (data.screen === false) {
    hideScreenIf(from);
  } else if (data.candidate) {
    const pc = voice.pcs.get(from);
    if (!pc) return;
    if (pc.remoteDescription) pc.addIceCandidate(data.candidate).catch(() => {});
    else pc.iceQueue.push(data.candidate);
  }
}
function flushIce(pc) { pc.iceQueue.splice(0).forEach((c) => pc.addIceCandidate(c).catch(() => {})); }

function closePeer(uid, silent) {
  const pc = voice.pcs.get(uid);
  if (pc) { try { pc.close(); } catch (_) {} voice.pcs.delete(uid); }
  const a = document.getElementById('aud-' + uid);
  if (a) { a.srcObject = null; a.remove(); }
  speakingAn.delete(uid); remoteStreams.delete(uid); hideScreenIf(uid);
  if (!silent) renderChannels();
}
function closeAllPeers() { for (const uid of [...voice.pcs.keys()]) closePeer(uid, true); }

/* ---------------- ekran paylaşımı ---------------- */
function askScreenAudio() {
  return new Promise((res) => {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = '<div class="modal-card small"><div class="modal-head"><span class="modal-title">🖥️ Ekran Paylaşımı</span></div><div class="ui-row" style="padding:12px"><button id="saY" class="ui-opt">🔊 Sesli (sekme sesi)</button><button id="saN" class="ui-opt">🔇 Sessiz</button></div><div class="shop-tip" style="margin:0 12px 12px">İpucu: Ses için paylaşırken "Sekme" seç ve "Sekme sesi paylaş"ı aç (Chrome) 🎧</div></div>';
    document.body.appendChild(back);
    back.querySelector('#saY').onclick = () => { back.remove(); res(true); };
    back.querySelector('#saN').onclick = () => { back.remove(); res(false); };
  });
}
async function startScreen() {
  if (!voice.channelId) { alert('Önce ses odasına gir 🔊'); return; }
  if (voice.screenStream) return;
  const wantAudio = await askScreenAudio();
  let s;
  try { s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: wantAudio }); }
  catch (_) { alert('Ekran paylaşımı başlatılamadı 😕'); return; }
  voice.screenStream = s;
  const track = s.getVideoTracks()[0];
  track.onended = () => stopScreen();
  for (const [uid, pc] of voice.pcs) {
    try {
      pc.screenSender = pc.addTrack(track, s);
      s.getAudioTracks().forEach((at) => pc.addTrack(at, s));
    } catch (_) {}
    sendRtc(uid, { screen: true });
  }
  viewLocalScreen(); updateVoiceUI();
}
function stopScreen() {
  if (!voice.screenStream) return;
  const s = voice.screenStream; voice.screenStream = null;
  for (const [uid, pc] of voice.pcs) {
    try { if (pc.screenSender) pc.screenSender.replaceTrack(null); } catch (_) {}
    sendRtc(uid, { screen: false });
  }
  s.getTracks().forEach((t) => t.stop());
  if (screenView && screenView.mode === 'local') hideScreen();
  updateVoiceUI();
}
function viewLocalScreen() {
  screenView = { mode: 'local' };
  $('#screenTitle').textContent = 'Sen ekranını paylaşıyorsun';
  const v = $('#screenVideo');
  v.muted = true;
  v.srcObject = voice.screenStream;
  $('#screenStopBtn').classList.remove('hidden');
  $('#screenOverlay').classList.remove('hidden');
}
function showRemoteScreen(uid, stream) {
  screenView = { mode: 'remote', uid };
  const u = usersList.find((x) => x.id === uid);
  $('#screenTitle').textContent = (u ? u.name : 'Biri') + ' ekranını paylaşıyor 🖥️';
  const v = $('#screenVideo');
  v.muted = false; // ekran sesi duyulsun 🎧
  v.srcObject = stream;
  $('#screenStopBtn').classList.add('hidden');
  $('#screenOverlay').classList.remove('hidden');
}
function hideScreenIf(uid) { if (screenView && screenView.mode === 'remote' && screenView.uid === uid) hideScreen(); }
function hideScreen() { screenView = null; $('#screenOverlay').classList.add('hidden'); $('#screenVideo').srcObject = null; }

/* ---------------- konuşma halkası ---------------- */
function attachSpeaking(uid, stream) {
  const ctx = ensureAudioCtx(); if (!ctx) return;
  try {
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser(); an.fftSize = 512;
    src.connect(an); speakingAn.set(uid, an);
  } catch (_) {}
}
setInterval(() => {
  if (!speakingAn.size) return;
  const buf = new Uint8Array(256);
  for (const [uid, an] of speakingAn) {
    an.getByteFrequencyData(buf);
    let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i];
    const on = sum / buf.length > 18;
    document.querySelectorAll('[data-av="' + uid + '"]').forEach((el) => el.classList.toggle('speaking', on));
  }
}, 150);

function updateVoiceUI() {
  const panel = $('#voicePanel');
  if (!voice.channelId) { panel.classList.add('hidden'); return; }
  const ch = channels.find((c) => c.id === voice.channelId);
  $('#voiceChanName').textContent = ch ? ch.name : '';
  panel.classList.remove('hidden');
  const mb = $('#muteBtn');
  mb.textContent = voice.muted ? '🔇' : '🎙️';
  mb.classList.toggle('off', voice.muted);
  const sb = $('#screenBtn');
  sb.textContent = voice.screenStream ? '🟩' : '🖥️';
  sb.classList.toggle('on', !!voice.screenStream);
  const vc = channels.find((c) => c.id === voice.channelId);
  $('#handBtn').classList.toggle('hidden', !(vc && vc.stage));
  renderChannels();
}
function setupVoiceButtons() {
  $('#muteBtn').onclick = () => {
    if (!voice.channelId) return;
    voice.muted = !voice.muted;
    if (voice.stream) voice.stream.getAudioTracks().forEach((t) => { t.enabled = !voice.muted; });
    wsSend({ t: 'mute', muted: voice.muted });
    updateVoiceUI();
  };
  $('#voiceLeaveBtn').onclick = leaveVoice;
  $('#micBtn').onclick = changeMicLive;
  $('#screenBtn').onclick = () => {
    if (!voice.channelId) { alert('Önce ses odasına gir 🔊'); return; }
    if (voice.screenStream) stopScreen(); else startScreen();
  };
  $('#screenClose').onclick = hideScreen;
  $('#screenStopBtn').onclick = stopScreen;
  const toggleFull = () => {
    const o = $('#screenOverlay');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (o.requestFullscreen) o.requestFullscreen();
  };
  $('#screenFull').onclick = toggleFull;
  $('#screenVideo').ondblclick = toggleFull;
}

/* ---------------- mobil & çıkış & pwa ---------------- */
function closeDrawers() {
  $('#sidebar').classList.remove('open'); $('#members').classList.remove('open'); $('#backdrop').classList.remove('show');
}
function setupMobile() {
  $('#menuBtn').onclick = () => { $('#members').classList.remove('open'); $('#sidebar').classList.toggle('open'); $('#backdrop').classList.toggle('show', $('#sidebar').classList.contains('open')); };
  $('#membersBtn').onclick = () => { $('#sidebar').classList.remove('open'); $('#members').classList.toggle('open'); $('#backdrop').classList.toggle('show', $('#members').classList.contains('open')); };
  $('#backdrop').onclick = closeDrawers;
}
function setupLogout() {
  $('#logoutBtn').onclick = () => {
    if (!confirm('Sohbetten çıkılsın mı?')) return;
    closedOnPurpose = true; localStorage.removeItem('kc-user');
    if (ws) ws.close();
    location.reload();
  };
}
/* ---------------- KOMUTLAR / YARDIM PENCERESİ ---------------- */
const HELP = [
  ['💰 COIN KASMA (KankaCoin 🪙)',
    'Günlük giriş → +10 (🔥 SERİ: her gün +2 artar, max +30!)\n!cevir → günlük çark 🎡 (3-50, jackpot var!)\n!maden → 1-3 (5 dk bekleme 😏)\n!yarisma → +5 • !adam → +4 • !sayi → +4\n!film → +4 • !sarki → +3 • !anagram → +3\n!xo zafer → +3 • !tkm → +2 • !mat → +2\n!zincir kelime → +1 • 📋 günlük görevler (profilde)\n!bahis / !rulet → kumar 🎰 •  butonu → şovlar\n!gonder 20 @isim → kankana coin gönder 🤝\n!lider → 🏆 liderlik tablosu\n🐣 petin bazen coin bulur 🐾'],
  ['🎮 OYUNLAR (hepsi burada!)',
    '!xo → tıklamalı X-O düello\n!zincir → kelime zinciri\n!adam → adam asmaca\n!sayi → 1-100 sayı tahmini\n!film → emojiden FİLM bil 🎬\n!sarki → emojiden ŞARKI bil 🎵\n!anagram → karışık harfi çöz 🔀\n!mat → hızlı matematik ➗\n!tkm taş/kağıt/makas → bota karşı ✂️\n!rulet 10 kırmızı → casino 🎡\n!yarisma → bilgi yarışması 🧠\n!oylama <soru> → canlı anket 📊\n!zar, !8ball → eğlence\n!durdur → TÜM oyunları durdur 🛑'],
  ['🎆 COIN ŞOVLARI (!sovlar)',
    '!havai 50🪙 → konfeti + havai fişek\n!beba 77🪙 → 🦗 ARDANIN BEBASI (meme şovu!)\n!yagmur 30🪙 • !kar 30🪙 • !bomba 40🪙 (ekran sarsılır 💥)\n!gokkusagi 45🪙 • !parti 60🪙 • !roket 80🪙\n!para 100🪙 → para yağmuru • !kral 150🪙 → taç yağmuru\nŞovlar HERKESTE oynar, coin senin şanın 😎'],
  ['🤖 BOT & AI',
    '#ai kanalına direkt yaz → KankaAI cevaplar ✨\n!ai <soru> → herhangi bir kanaldan sor\n!zar, !8ball <soru>, !puan, !market, !yardim'],
  ['🛍️ PROFİL & MAĞAZA (🪙 kutusuna tıkla)',
    '😎 Avatar emojisi • 🖼️ çerçeveler (animasyonlu!)\n🎖️ rozetler •  isim renkleri (gökkuşağı!)\n🎗️ ünvanlar • 🫧 mesaj balonu renkleri\n🌌 profil arkaplanları • ✨ altın mesajlar\n💬 durum yazısı • 📣 giriş anonsu\n📢 @herkes gücü (2000🪙 — herkesi etiketle!)'],
  ['🎤 SES & EKRAN',
    'Ses kanalına tıkla → mikrofonunu SEÇ 🎚️\n️ mute • 🎚️ mic değiştir • 🖥️ ekran paylaş • 🎵 soundboard\nKim konuşursa yeşil halka 💚\n📱/🖥️ mod seçimi: açılışta veya 🎨 menüsünde'],
  ['👑 SAHİP (ilk giren)',
    '⛔ üye listesinde adam atma\n🔓 kanal kilitleme • ✏️ kanal adı • 🗑️ kanal silme\n⚙️ davet kodu zorunlu yapma'],
  ['📂 KANALLAR',
    'Kanalın üstüne gel → + ile ALT kanal aç 📂\n▸/▾ okuyla alt kanalları aç-kapa\nSahip 🗑️ ile ana kanalı silerse altları da gider'],
  ['🎮 BUTONLU OYUNLAR',
    'Artık çoğu oyun XO gibi SOHBETTE butonlu:\n🃏 !21 → Çek/Dur butonları\n✂️ !tkm → taş/kağıt/makas bas\n🎡 !rulet → renge bas\n🎰 !slot • 🪙 !yazitura • 🎲 !zars\n🪢 !adam → harf ızgarasına bas\n🗺️ !macera → A/B butonları\n🎬🔀 quizler → şıklara bas'],
  ['🧠 DERİN MANTIK',
    '🃏 !21 10 → blackjack (!cek/!dur)\n🎁 !kutu → gizemli kutu (Elmas bile var 💎)\n🏦 !yatir 100 → banka, günlük %5 faiz\n📈 !hisse → borsa, fiyat her dk oynar\n🎫 !loto → gün sonu çekiliş\n🕵️ !soygun → riskli vurgun\n🕹️ !hafiza → butonlu hafıza oyunu\n🐔 !ek → 10 dk bekle, !hasat +40\n🗺️ !macera + !sec A/B → hikaye\n🐾 !kapisma @isim → petler dövüşür\n💣 !patates → !pas yaz yoksa 💥\n🎤 !sozquiz → sözden şarkı\n🔄 !takas @isim → coin takası\n⚖️ !mahkeme @isim → jüri oylar\n🕵️ !mafya → katil kim?\n🎯 !xobet @isim → XO maçı bahsi\n🎯 !gorevler → günlük challenge'],
  ['🆕 YENİLİKLER',
    '!yenilikler yaz → tüm sürüm notları dökülür\nHer yeni özellik ❓ rehbere ve bu listeye işlenir ✅'],
  ['😤 MODERASYON & DISCORD PRO',
    '😤 !sustur @isim 5 • 🚫 !ban • ✅ !unban\n🐌 !slowmode 10 • 👥 !limit 5 • 🌐 !sahne + 🖐️ söz iste\n🏷️ !rol oluştur MOD #ff0000 • !rol ver @isim MOD\n📜 !log (sahip) • ⚙️ menüde 📜 Log & 🖼️ Baner\n↩️ mesaj araçlarında Yanıtla • 🧵 Thread aç\n✍️ Markdown: **kalın** *italik* __altı__ ~~üstü~~ `kod`\n/ veya ! yaz → komut menüsü • 🖱️ üyeye sağ tık menü\n📴 sağırlaştır • ⏳ susturulan üye listede görünür'],
  ['🔐 HESAP SİSTEMİ',
    '📝 Kayıt Ol: kullanıcı adı + mail + şifre\n🔑 Giriş: adın + şifrenle (kayıtsız girilmez!)\n😢 Şifremi unuttum → 6 haneli kodla sıfırla\n👑 Yönetici: Kaan hesabı otomatik SAHİP\n(gerçek mail için Render’a EmailJS anahtarlarını ekle)'],
  ['🎬 İZLEME ODASI',
    '🎬 İzleme Odası kanalına gir\nYouTube linkini yapıştır → ▶ Başlat\nOdadaki HERKESTE aynı anda açılır 🍿\n⏸ Herkes → birlikte duraklar • ⏹ birlikte kapanır\nSohbet de açık, yorum yazarak izleyin 😄'],
  ['⚔️ KLAN & 🏪 PAZAR',
    '!klankur İsim → klan kur (200🪙)\n!klan İsim → katıl • !klanlar → liste • !ayril\n!savas <rakip> → 30 sn savaş! !destek N ile coin bas\nKazanan klan üyelerine +10 🪙 \n Pazar (profilde/): eşyanı kankalara sat!\n!muzayede → ödül açık artırma • !teklif N\n🌧️ !yagmur N → sahip coin yağdırır (herkese!)'],
  ['💞 SOSYAL PAKET',
    '!teklif @isim → kanka teklifi 💍 • !evet → kabul\n!bosan → ilişkileri bitirir 😄\n💍 kanka rozeti isimde gezer\n📸 Profilden gerçek fotoğraf yükle\n🙈 butonu → spoiler modu (mesaj bulanık, tıkla-gör)\n📰 !gazete → günün özeti (zengin, geveze, klanlar)'],
  ['🐾 PET &  DİĞER',
    '🐣 Profilden yumurta al (🐱200/🐶200/🐉500)\n🍖 besle → seviye atlar, isminin yanında gezer\n📌 mesaj üstüne gel → 📌 sabitle • 📌 butonu → liste\n😴 5 dk yoksan otomatik "Uzakta" 🌙\nÜyeye tıkla → DM 📨 • @isim → etiket\n➕ resim / video / dosya • 🔔 bildirim\n🎧 YouTube müzik • 🎨 tema/renk/arkaplan'],
];
function openHelp() {
  let m = $('#helpModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'helpModal'; m.className = 'modal-back hidden';
    m.innerHTML = '<div class="modal-card"><div class="modal-head"><span class="modal-title">❓ Komutlar & Rehber</span><button id="helpClose" class="icon-btn">✕</button></div><div id="helpBody" class="modal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    $('#helpClose').onclick = () => m.classList.add('hidden');
    const body = $('#helpBody');
    HELP.forEach(([title, lines]) => {
      const h = document.createElement('div'); h.className = 'ch-group'; h.innerHTML = `<span>${title}</span>`;
      const p = document.createElement('div'); p.className = 'help-lines'; p.textContent = lines;
      body.append(h, p);
    });
  }
  m.classList.remove('hidden');
}
function setupHelp() { $('#helpBtn').onclick = openHelp; }
function setupUIButtons() {
  $('#uiBtn').onclick = openUI;
  $('#musicBtn').onclick = openMusic;
}
function setupSearch() {
  $('#searchBtn').onclick = () => {
    const inp = $('#searchInp');
    inp.classList.toggle('hidden');
    if (!inp.classList.contains('hidden')) inp.focus();
    else { searchTerm = ''; inp.value = ''; renderMessages(); }
  };
  $('#searchInp').addEventListener('input', (e) => { searchTerm = e.target.value.trim().toLocaleLowerCase('tr'); renderMessages(); });
  // 📌 sabitlenmiş mesajlar listesi
  $('#pinBtn').onclick = () => {
    let m = $('#pinModal');
    if (!m) {
      m = document.createElement('div'); m.id = 'pinModal'; m.className = 'modal-back hidden';
      m.innerHTML = '<div class="modal-card small"><div class="modal-head"><span class="modal-title">📌 Sabitlenmiş Mesajlar</span><button id="pinClose" class="icon-btn">✕</button></div><div id="pinBody" class="modal-body"></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
      $('#pinClose').onclick = () => m.classList.add('hidden');
    }
    const body = $('#pinBody'); body.innerHTML = '';
    const pins = (chanMsgs[current] || []).filter((x) => x.pinned);
    if (!pins.length) body.innerHTML = '<div class="msg system">Bu kanalda sabitli mesaj yok. Mesajın üstüne gel → 📌</div>';
    pins.forEach((p) => {
      const d = document.createElement('div'); d.className = 'quest-row';
      d.innerHTML = `<span class="quest-label"><b>${p.name}:</b> ${(p.text || '🖼️').slice(0, 60)}</span>`;
      body.appendChild(d);
    });
    m.classList.remove('hidden');
  };
}

/* ---------------- 🖱️ SAĞ TIK ÜYE MENÜSÜ ---------------- */
function openMemberMenu(uid, x, y) {
  const u = usersList.find((a) => a.id === uid);
  if (!u) return;
  let m = $('#ctxMenu');
  if (m) m.remove();
  m = document.createElement('div'); m.id = 'ctxMenu'; m.className = 'more-sheet';
  m.style.top = Math.min(y, innerHeight - 260) + 'px'; m.style.right = 'auto'; m.style.left = Math.min(x, innerWidth - 220) + 'px';
  const acts = [
    ['👤 Profil', () => openMemberProfile(u)],
    ['📨 DM', () => { const ids = [me.id, u.id].sort(); wsSend({ t: 'switch', channelId: 'dm:' + ids[0] + ':' + ids[1] }); }],
    ['✍️ Etiketle', () => { $('#input').value += '@' + u.name + ' '; $('#input').focus(); }],
  ];
  if (me.role === 'owner' && u.id !== me.id) {
    acts.push(['😤 5 dk sustur', () => wsSend({ t: 'msg', text: `!sustur @${u.name} 5` })]);
    acts.push(['⛔ At', () => { if (confirm(u.name + ' atılsın mı?')) wsSend({ t: 'kick', uid: u.id }); }]);
    acts.push(['🚫 BAN', () => { if (confirm(u.name + ' BANlansın mı?')) wsSend({ t: 'msg', text: `!ban @${u.name}` }); }]);
  }
  acts.forEach(([label, fn]) => {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => { m.remove(); fn(); };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', function h() { m.remove(); document.removeEventListener('click', h); }), 10);
}

/* ---------------- ⌨️ SLASH KOMUT MENÜSÜ ---------------- */
const CMDLIST = ['!zar', '!8ball', '!oylama', '!xo', '!zincir', '!adam', '!sayi', '!film', '!sarki', '!anagram', '!mat', '!tkm', '!rulet', '!yarisma', '!maden', '!bahis', '!cevir', '!gonder', '!lider', '!puan', '!market', '!sovlar', '!havai', '!beba', '!para', '!kral', '!roket', '!bomba', '!parti', '!kar', '!yagmur', '!klankur', '!klan', '!klanlar', '!savas', '!destek', '!muzayede', '!teklif', '!teklif', '!ai', '!gazete', '!teklif'];
function hideSlash() { $('#slashPop').classList.add('hidden'); }
function setupSlash() {
  $('#input').addEventListener('input', () => {
    const v = $('#input').value;
    if (v.startsWith('/') || (v.startsWith('!') && v.length <= 4 && !v.includes(' '))) {
      const q = v.slice(1).toLowerCase();
      const list = [...new Set(CMDLIST)].filter((c) => c.slice(1).startsWith(q)).slice(0, 8);
      const pop = $('#slashPop');
      if (!list.length) { hideSlash(); return; }
      pop.innerHTML = '';
      list.forEach((c) => {
        const b = document.createElement('button'); b.textContent = c;
        b.onclick = (e) => { e.stopPropagation(); $('#input').value = c + ' '; hideSlash(); $('#input').focus(); };
        pop.appendChild(b);
      });
      pop.classList.remove('hidden');
    } else hideSlash();
  });
}

/* ----------------  SES PRO (sağırlaştır + sahne) ---------------- */
function applyDeaf() {
  document.querySelectorAll('audio[id^="aud-"]').forEach((a) => { a.volume = deaf ? 0 : 1; });
}
function setupVoicePro() {
  $('#deafBtn').onclick = () => {
    deaf = !deaf;
    $('#deafBtn').classList.toggle('off', deaf);
    applyDeaf();
    toast(deaf ? '📴 Sağırlaştırıldı — gelen ses kapalı' : '🔊 Ses geri açık');
  };
  $('#handBtn').onclick = () => wsSend({ t: 'raisehand' });
  $('#logBtn').onclick = () => wsSend({ t: 'audit' });
  $('#banBtn').onclick = () => $('#banInp').click();
  $('#banInp').onchange = () => {
    const f = $('#banInp').files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const W = 400, H = 120; c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, W, H);
        wsSend({ t: 'banner', data: c.toDataURL('image/jpeg', 0.7) });
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
    $('#banInp').value = '';
  };
}

/* ---------------- 📱 MOBİL ALT NAV & ⋯ MENÜ ---------------- */
function setupBottomNav() {
  $('#bottomNav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-nav]');
    if (!b) return;
    const v = b.dataset.nav;
    if (v === 'ch') { $('#members').classList.remove('open'); $('#sidebar').classList.add('open'); $('#backdrop').classList.add('show'); }
    if (v === 'members') { $('#sidebar').classList.remove('open'); $('#members').classList.add('open'); $('#backdrop').classList.add('show'); }
    if (v === 'sov') $('#sovBtn').click();
    if (v === 'profile') openProfile();
    if (v === 'ui') openUI();
  });
  $('#moreBtn').onclick = (e) => {
    e.stopPropagation();
    let sh = $('#moreSheet');
    if (sh) { sh.remove(); return; }
    sh = document.createElement('div'); sh.id = 'moreSheet'; sh.className = 'more-sheet';
    const acts = [
      ['🔍 Ara', () => $('#searchBtn').click()],
      ['📌 Sabitler', () => $('#pinBtn').click()],
      ['❓ Rehber', () => openHelp()],
      ['🔔 Bildirim', () => $('#bellBtn').click()],
    ];
    if (me && me.role === 'owner') {
      acts.push(['🔒 Kilitle/Aç', () => $('#lockBtn').click()]);
      acts.push(['✏️ Kanal Adı', () => $('#renBtn').click()]);
      acts.push(['🗑️ Kanal Sil', () => $('#delBtn').click()]);
    }
    acts.push(['🎧 Müzik', () => openMusic()]);
    acts.push(['🏪 Pazar', () => openMarket()]);
    acts.forEach(([label, fn]) => {
      const b = document.createElement('button'); b.textContent = label;
      b.onclick = () => { sh.remove(); fn(); };
      sh.appendChild(b);
    });
    document.body.appendChild(sh);
    setTimeout(() => document.addEventListener('click', function h(ev) { if (!sh.contains(ev.target)) { sh.remove(); document.removeEventListener('click', h); } }), 10);
  };
}

/* ---------------- 😴 OTOMATİK AFK ---------------- */
let lastAct = Date.now(), autoAway = false;
function setupAfk() {
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => {
    lastAct = Date.now();
    if (autoAway) {
      autoAway = false; myPresence = 'online';
      const d = $('#meDot'); if (d) d.className = 'p-dot online';
      wsSend({ t: 'presence', v: 'online' });
    }
  }, { passive: true }));
  setInterval(() => {
    if (me && !autoAway && myPresence === 'online' && Date.now() - lastAct > 5 * 60 * 1000) {
      autoAway = true; myPresence = 'away';
      const d = $('#meDot'); if (d) d.className = 'p-dot away';
      wsSend({ t: 'presence', v: 'away' });
      toast('😴 5 dk hareketsizlik → Uzakta modu');
    }
  }, 30000);
}

/* ---------------- PROFİL & MAĞAZA ---------------- */
const CLIENT_QUESTS = [
  { id: 'q_msgs', label: '💬 10 mesaj gönder', need: 10, key: 'msgs', reward: 5 },
  { id: 'q_wins', label: '🏆 1 oyun kazan', need: 1, key: 'wins', reward: 5 },
  { id: 'q_react', label: '😀 3 tepki ver', need: 3, key: 'reacts', reward: 3 },
  { id: 'q_voice', label: '🎤 Ses odasına gir', need: 1, key: 'voice', reward: 2 },
];
const CLIENT_ACH = { first_msg: '💬 İlk Mesaj', chatty: '🗣️ 100 Mesaj', rich100: '🪙 Cüzdan 100', rich1000: '💰 Cüzdan 1000', lvl5: '📈 Seviye 5', gamer: '🏆 İlk Zafer', social: '📨 İlk DM', ai_friend: '🤖 AI Dostu', showman: '🎆 İlk Şov' };
let profileOpen = false;
function openProfile() {
  profileOpen = true;
  let modal = $('#profileModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'profileModal'; modal.className = 'modal-back';
    modal.innerHTML = '<div class="modal-card"><div class="modal-head"><span class="modal-title">🪪 Profil & Mağaza</span><button id="profClose" class="icon-btn">✕</button></div><div id="profBody" class="modal-body"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProfile(); });
    $('#profClose').onclick = closeProfile;
  }
  modal.classList.remove('hidden');
  renderProfile();
}
function closeProfile() { profileOpen = false; const m = $('#profileModal'); if (m) m.classList.add('hidden'); }

function renderProfile() {
  const body = $('#profBody');
  if (!body) return;
  body.innerHTML = '';
  const pf = me.profile || {};

  // önizleme
  const prev = document.createElement('div'); prev.className = 'prof-preview' + (pf.pbg ? ' pbg-' + pf.pbg : '');
  const av = document.createElement('div'); av.className = 'avatar big'; paintAvatar(av, me);
  const infoD = document.createElement('div');
  const nm = document.createElement('div'); nm.className = 'm-name'; applyName(nm, me.name + (me.role === 'owner' ? ' 👑' : ''), pf);
  const st = document.createElement('div'); st.className = 'm-sub'; st.textContent = pf.status || 'Durum yazın yok';
  const coins = document.createElement('div'); coins.className = 'prof-coins'; coins.textContent = '🪙 ' + myCoins + ' KankaCoin  •  📈 Lv' + myLevel + (pf.title ? '  •  🎗️ ' + pf.title : '');
  const bar = document.createElement('div'); bar.className = 'xp-bar';
  const cur = myXp - 100 * myLevel * myLevel, need = 100 * (myLevel + 1) * (myLevel + 1) - 100 * myLevel * myLevel;
  bar.innerHTML = `<div style="width:${Math.min(100, Math.round((cur / need) * 100))}%"></div>`;
  const xpL = document.createElement('div'); xpL.className = 'm-sub'; xpL.textContent = `XP: ${myXp} (sonraki seviye: ${100 * (myLevel + 1) * (myLevel + 1)})`;
  infoD.append(nm, st, coins, bar, xpL);
  prev.append(av, infoD);
  body.appendChild(prev);

  // günlük görevler
  const hq = document.createElement('div'); hq.className = 'ch-group'; hq.innerHTML = '<span>📋 Günlük Görevler</span>';
  body.appendChild(hq);
  const today = new Date().toDateString();
  const q = (myQuests && myQuests.date === today) ? myQuests : { c: {}, claimed: [] };
  CLIENT_QUESTS.forEach((qq) => {
    const done = (q.c[qq.key] || 0) >= qq.need;
    const claimed = (q.claimed || []).includes(qq.id);
    const row = document.createElement('div'); row.className = 'quest-row';
    row.innerHTML = `<span class="quest-label">${qq.label} <b>(${Math.min(q.c[qq.key] || 0, qq.need)}/${qq.need})</b></span>`;
    const b = document.createElement('button');
    b.className = 'btn-small' + (claimed ? ' done' : done ? '' : ' lock');
    b.textContent = claimed ? '✅' : done ? `+${qq.reward} 🪙` : '…';
    b.disabled = !done || claimed;
    b.onclick = () => wsSend({ t: 'claim', id: qq.id });
    row.appendChild(b);
    body.appendChild(row);
  });

  // başarımlar
  const ha = document.createElement('div'); ha.className = 'ch-group'; ha.innerHTML = `<span>🏅 Başarımlar (${myAch.length}/${Object.keys(CLIENT_ACH).length})</span>`;
  body.appendChild(ha);
  const grid = document.createElement('div'); grid.className = 'ach-grid';
  Object.entries(CLIENT_ACH).forEach(([id, label]) => {
    const d = document.createElement('div');
    d.className = 'ach' + (myAch.includes(id) ? ' got' : '');
    d.textContent = (myAch.includes(id) ? '' : '🔒 ') + label;
    grid.appendChild(d);
  });
  body.appendChild(grid);

  // 🐣 evcil hayvan
  const hp = document.createElement('div'); hp.className = 'ch-group'; hp.innerHTML = '<span>🐣 Evcil Hayvan</span>';
  body.appendChild(hp);
  const petBox = document.createElement('div'); petBox.className = 'quest-row';
  if (pf.pet) {
    petBox.innerHTML = `<span>${pf.pet.e} <b>Seviye ${pf.pet.lvl}</b></span>`;
    const fb = document.createElement('button'); fb.className = 'btn-small'; fb.textContent = '🍖 Besle (5🪙)';
    fb.onclick = () => wsSend({ t: 'pet', action: 'feed' });
    petBox.appendChild(fb);
  } else {
    petBox.innerHTML = '<span>Yumurta al:</span>';
    [['kedi', '🐱 200'], ['kopek', '🐶 200'], ['ejder', '🐉 500']].forEach(([t, l]) => {
      const b = document.createElement('button'); b.className = 'btn-small'; b.textContent = l;
      b.onclick = () => wsSend({ t: 'pet', action: 'buy', type: t });
      petBox.appendChild(b);
    });
  }
  body.appendChild(petBox);

  // ⚔️ klan + 🏪 pazar kısayolları
  const hc = document.createElement('div'); hc.className = 'ch-group'; hc.innerHTML = '<span>⚔️ Klan & 🏪 Pazar</span>';
  body.appendChild(hc);
  const kRow = document.createElement('div'); kRow.className = 'quest-row';
  kRow.innerHTML = `<span>${pf.clan ? '⚔️ Klanın: <b>' + pf.clan + '</b>' : 'Klanın yok'}</span>`;
  const mk = document.createElement('button'); mk.className = 'btn-small'; mk.textContent = '🏪 Pazar';
  mk.onclick = () => { $('#profileModal').classList.add('hidden'); openMarket(); };
  kRow.appendChild(mk);
  body.appendChild(kRow);
  const kTip = document.createElement('div'); kTip.className = 'shop-tip';
  kTip.textContent = pf.clan ? '!savas <rakip> → klan savaşı! !destek N ile coin bas 💪' : '!klankur İsim (200🪙) • !klan İsim → katıl • !klanlar → liste';
  body.appendChild(kTip);

  // durum yazısı
  if (profileOwns('status')) {
    const row = document.createElement('div'); row.className = 'inv-row';
    const inp = document.createElement('input'); inp.id = 'statusInp'; inp.maxLength = 40; inp.placeholder = 'Durum yazısı…'; inp.value = pf.status || '';
    const btn = document.createElement('button'); btn.className = 'btn-small'; btn.textContent = 'Kaydet';
    btn.onclick = () => wsSend({ t: 'status', text: inp.value.trim() });
    row.append(inp, btn);
    body.appendChild(row);
  }
  // giriş anonsu
  if (profileOwns('anons')) {
    const row = document.createElement('div'); row.className = 'inv-row';
    const inp = document.createElement('input'); inp.maxLength = 60; inp.placeholder = '📣 Anons yazısı (girişte duyurulur)'; inp.value = pf.anons || '';
    const btn = document.createElement('button'); btn.className = 'btn-small'; btn.textContent = 'Kaydet';
    btn.onclick = () => wsSend({ t: 'anons', text: inp.value.trim() });
    row.append(inp, btn);
    body.appendChild(row);
  }

  const SECTIONS = [['emoji', '😎 Avatar Emojisi'], ['frame', '🖼️ Çerçeveler'], ['badge', '🎖️ Rozetler'], ['namecolor', ' İsim Renkleri'], ['title', '🎗️ Ünvanlar'], ['bubble', '🫧 Mesaj Balonu'], ['pbg', '🌌 Profil Arkaplanı'], ['gold', '✨ Işıltı'], ['power', '📢 Güçler'], ['status', '💬 Özel']];
  SECTIONS.forEach(([type, title]) => {
    const items = shop.filter((s) => s.type === type);
    if (!items.length) return;
    const h = document.createElement('div'); h.className = 'ch-group'; h.innerHTML = `<span>${title}</span>`;
    body.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'shop-grid';
    items.forEach((it) => {
      const owned = profileOwns(it.id);
      const equipped = pf.emoji === it.value || pf.frame === it.value || pf.badge === it.value || pf.nameColor === it.value || pf.bubble === it.value || pf.pbg === it.value || pf.gold === it.value || ((type === 'status' || type === 'power') && owned);
      const b = document.createElement('button');
      b.className = 'shop-item' + (equipped ? ' equipped' : owned ? ' owned' : '');
      b.innerHTML = `<span class="shop-label">${it.label}</span><span class="shop-price">${owned ? (type === 'power' ? '✅ Aktif' : equipped ? '✅ Takılı' : 'Tak') : '🪙 ' + it.price}</span>`;
      b.onclick = () => {
        if (type === 'status' || type === 'anons') { if (!owned) wsSend({ t: 'buy', id: it.id }); else toast('Yukarıdaki kutuya yazıp kaydet ✍️'); return; }
        if (type === 'power') { if (!owned) wsSend({ t: 'buy', id: it.id }); else toast('📢 Gücün aktif! Sohbete @herkes yaz'); return; }
        if (owned) wsSend({ t: 'equip', slot: type, id: equipped ? null : it.id });
        else wsSend({ t: 'buy', id: it.id });
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
  });

  const tip = document.createElement('div'); tip.className = 'shop-tip';
  tip.textContent = '💰 KAS: günlük +10 • !maden ⛏️ • !yarisma +5 • !adam +4 • !sayi +4 • !film +4 • !sarki +3 • !anagram +3 • !tkm +2 • !mat +2 • !xo +3 • !zincir +1 • !bahis/!rulet 🎰 • 🎆 !havai (50🪙 gösteri!) — Tam rehber: ❓';
  body.appendChild(tip);
}
function profileOwns(id) {
  // sunucu owned listesini profile event'inde göndermiyor; init'te owneds'ı tutalım
  return (myOwned || []).includes(id);
}
let myOwned = [];

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
setInterval(() => wsSend({ t: 'ping' }), 25000);

buildLogin(); setupComposer(); setupSlash(); setupVoiceButtons(); setupVoicePro(); setupSoundboard(); setupSovs(); setupWatch(); setupMobile(); setupBottomNav(); setupLogout(); setupHelp(); setupSearch(); setupUIButtons(); setupAfk(); connect();
