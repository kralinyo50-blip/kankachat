'use strict';
/* KankaChat v3 istemci */
const $ = (s) => document.querySelector(s);

/* 🔒 SAĞ TIK / İNCELEME KİLİDİ */
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  const k = (e.key || '').toUpperCase();
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k)) || (e.ctrlKey && ['U', 'S'].includes(k))) e.preventDefault();
});
document.addEventListener('dragstart', (e) => e.preventDefault());

let ws = null, me = null, channels = [], usersList = [], known = {}, myDms = [];
let chanMsgs = {}, current = null, currentIsDm = false, lastRendered = null;
let typingMap = new Map(), reconnectDelay = 1000, closedOnPurpose = false;
let pendingImage = null, pendingFile = null, lastTypingSent = 0, metaInfo = { requireInvite: false, inviteCode: null };
let shop = [], myCoins = 0;
let chosenMic = null;
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
  $('#loginBtn').onclick = doLogin;
  $('#loginName').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  const saved = localStorage.getItem('kc-user');
  if (saved) { try { $('#loginName').value = JSON.parse(saved).name || ''; } catch (_) {} }
}
function doLogin() {
  const name = $('#loginName').value.trim();
  if (!name) { $('#loginError').textContent = 'Lütfen bir takma ad yaz 😊'; return; }
  localStorage.setItem('kc-user', JSON.stringify({ name, color: pickedColor }));
  const invite = $('#loginInvite').value.trim();
  if (ws && ws.readyState === WebSocket.OPEN) wsSend({ t: 'join', name, color: pickedColor, invite });
  else connect();
}

/* ---------------- bağlantı ---------------- */
function connect() {
  closedOnPurpose = false;
  ws = new WebSocket(wsUrl());
  ws.onopen = () => {
    reconnectDelay = 1000;
    $('#netBanner').classList.add('hidden');
    const saved = localStorage.getItem('kc-user');
    if (saved) { const id = JSON.parse(saved); wsSend({ t: 'join', name: id.name, color: id.color, invite: $('#loginInvite').value.trim() }); }
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
      chanMsgs[m.you.channelId] = m.messages; current = m.you.channelId;
      $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
      setupMe(); renderAll(); $('#input').focus();
      break;
    case 'users': usersList = m.users; renderUsers(); renderChannels(); break;
    case 'channels': channels = m.channels; renderChannels(); updateHeader(); updateComposerLock(); break;
    case 'switched':
      current = m.channelId; currentIsDm = !!m.dm; chanMsgs[current] = m.messages;
      if (currentIsDm && !myDms.some((d) => d.id === current)) myDms.push({ id: current, partner: current.split(':').slice(1).find((x) => x !== me.id) });
      typingMap.clear(); renderTyping(); renderAll(); closeDrawers(); $('#input').focus();
      break;
    case 'msg': {
      if (!chanMsgs[m.channelId]) chanMsgs[m.channelId] = [];
      chanMsgs[m.channelId].push(m.msg);
      if (m.channelId === current) appendMessage(m.msg);
      const mine = m.msg.uid && m.msg.uid !== me.id;
      if (mine && (document.hidden || m.channelId !== current)) {
        beep();
        if (mentionedMe(m.msg) || m.channelId.startsWith('dm:')) notify(m.msg);
      }
      break;
    }
    case 'typing':
      typingMap.set(m.uid, { name: m.name, until: Date.now() + 3000 });
      renderTyping(); setTimeout(renderTyping, 3100);
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
    case 'msg-game': {
      const msg = (chanMsgs[m.channelId] || []).find((x) => x.id === m.msgId);
      if (msg) { msg.game = m.game; if (m.channelId === current) renderMessagesKeepScroll(); }
      break;
    }
    case 'toast': toast(m.text); break;
    case 'coins': myCoins = m.coins; if (m.owned) myOwned = m.owned; updateCoins(); if (profileOpen) renderProfile(); break;
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
  el.textContent = pf && pf.emoji ? pf.emoji : ((info && info.name) || '?')[0].toUpperCase();
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
  if (c) c.textContent = '🪙 ' + myCoins;
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
}
function renderAll() { renderChannels(); renderMessages(); renderUsers(); updateHeader(); updateComposerLock(); renderOwnerPanel(); }

function partnerInfo(pid) {
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
    const item = document.createElement('div');
    item.className = 'ch-item' + (c.id === current ? ' active' : '');
    const h = document.createElement('span'); h.className = 'hash'; h.textContent = c.locked ? '🔒' : '#';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name;
    item.append(h, l);
    item.onclick = () => { if (c.id !== current) wsSend({ t: 'switch', channelId: c.id }); };
    list.appendChild(item);
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
      item.onclick = () => { if (d.id !== current) wsSend({ t: 'switch', channelId: d.id }); };
      list.appendChild(item);
    });
  }

  const g2 = document.createElement('div');
  g2.className = 'ch-group'; g2.innerHTML = '<span>Ses Kanalları</span>';
  list.appendChild(g2);
  voices.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'ch-item' + (voice.channelId === c.id ? ' active' : '');
    const icon = document.createElement('span'); icon.textContent = '🔊';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name;
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
    const info = document.createElement('div'); info.className = 'm-info';
    const nm = document.createElement('div'); nm.className = 'm-name';
    applyName(nm, u.name + (u.id === me.id ? ' (sen)' : '') + (u.role === 'owner' ? ' 👑' : ''), u.profile);
    const sub = document.createElement('div'); sub.className = 'm-sub';
    const ch = channels.find((c) => c.id === u.channelId);
    sub.textContent = (u.profile && u.profile.status) ? u.profile.status : (ch ? '#' + ch.name : 'özel');
    info.append(nm, sub);
    row.append(av, info);
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
      let last = 0;
      for (const mt of p.matchAll(mrx)) {
        if (mt.index > last) container.appendChild(document.createTextNode(p.slice(last, mt.index)));
        const s = document.createElement('span');
        s.className = 'mention' + (mt[1] === me.name ? ' me' : '');
        s.textContent = '@' + mt[1];
        container.appendChild(s);
        last = mt.index + mt[0].length;
      }
      if (last < p.length) container.appendChild(document.createTextNode(p.slice(last)));
    } else container.appendChild(document.createTextNode(p));
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
  if (!g || g.type !== 'xo') return null;
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
    applyName(nm, msg.name, msg.profile || (usersList.find((x) => x.id === msg.uid) || {}).profile);
    const tm = document.createElement('span'); tm.className = 'msg-time'; tm.textContent = dayLabel(msg.ts) + ' ' + timeFmt.format(msg.ts);
    head.append(nm, tm);
    body.appendChild(head);
  }
  if (msg.text) {
    const tx = document.createElement('div'); tx.className = 'msg-text';
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

function renderMessages() {
  const box = $('#messages'); box.innerHTML = ''; lastRendered = null;
  let lastDay = '';
  for (const msg of chanMsgs[current] || []) {
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
  el.textContent = names.length === 1 ? `${names[0]} yazıyor…` : names.length === 2 ? `${names[0]} ve ${names[1]} yazıyor…` : 'Birkaç kişi yazıyor…';
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
    wsSend({ t: 'msg', text, image: pendingImage, file: pendingFile });
    input.value = ''; input.style.height = 'auto';
    clearPendingImage(); input.focus();
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
  if (voice.screenStream) { try { pc.screenSender = pc.addTrack(voice.screenStream.getVideoTracks()[0], voice.screenStream); } catch (_) {} }

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
      attachSpeaking(uid, stream);
      let a = document.getElementById('aud-' + uid);
      if (!a) { a = new Audio(); a.id = 'aud-' + uid; a.autoplay = true; document.body.appendChild(a); }
      a.srcObject = stream; a.play().catch(() => {});
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
async function startScreen() {
  if (!voice.channelId) { alert('Önce ses odasına gir 🔊'); return; }
  if (voice.screenStream) return;
  let s;
  try { s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); }
  catch (_) { alert('Ekran paylaşımı başlatılamadı 😕'); return; }
  voice.screenStream = s;
  const track = s.getVideoTracks()[0];
  track.onended = () => stopScreen();
  for (const [uid, pc] of voice.pcs) {
    try { pc.screenSender = pc.addTrack(track, s); } catch (_) {}
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
  $('#screenVideo').srcObject = voice.screenStream;
  $('#screenStopBtn').classList.remove('hidden');
  $('#screenOverlay').classList.remove('hidden');
}
function showRemoteScreen(uid, stream) {
  screenView = { mode: 'remote', uid };
  const u = usersList.find((x) => x.id === uid);
  $('#screenTitle').textContent = (u ? u.name : 'Biri') + ' ekranını paylaşıyor 🖥️';
  $('#screenVideo').srcObject = stream;
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
    'Günlük ilk giriş → +10 🪙\n!maden → 1-3 🪙 (5 dk bekleme, kolay yok 😏)\n!yarisma → ilk bilen +5 🪙\n!adam (adam asmaca) → +4 🪙\n!sayi (sayı tahmini) → +4 🪙\n!film (emojiden film) → +4 🪙\n!xo kazanırsan → +3 🪙\n!zincir kelime başına → +1 🪙\n!bahis 50 → ya x2 ya 💸'],
  ['🎮 OYUNLAR',
    '!xo → tıklamalı X-O (kankaya meydan oku)\n!zincir → kelime zinciri (!durdur ile bitir)\n!adam → adam asmaca (harf yaz / !kelime tahmin)\n!sayi → 1-100 tahmin\n!film → emojiden film bil\n!yarisma → bilgi yarışması\n!oylama <soru> → canlı anket\n!durdur → TÜM oyunları durdur 🛑'],
  ['🤖 BOT & AI',
    '#ai kanalına direkt yaz → KankaAI cevaplar ✨\n!ai <soru> → herhangi bir kanaldan sor\n!zar, !8ball <soru>, !puan, !market, !yardim'],
  [' PROFİL & MAĞAZA',
    'Sol altta ismine / 🪙 kutusuna tıkla → mağaza\nAvatar emojisi, çerçeve, rozet, isim rengi, durum yazısı\nCoinler harcandıkça havalan 😎'],
  ['🎤 SES & EKRAN',
    'Ses kanalına tıkla → mikrofonunu SEÇ 🎚️\n🎙️ mute • 🎚️ mic değiştir • 🖥️ ekran paylaş • 🎵 soundboard\nKim konuşursa yeşil halka 💚'],
  ['👑 SAHİP (ilk giren)',
    '⛔ üye listesinde adam atma\n🔓 kanal kilitleme • ✏️ kanal adı • 🗑️ kanal silme\n⚙️ davet kodu zorunlu yapma'],
  ['💬 DİĞER',
    'Üyeye tıkla → DM 📨\nMesaj üstüne gel → tepki / düzenle / sil\n@isim → etiket • ➕ resim / video / dosya gönder\n🔔 bildirim aç'],
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

/* ---------------- PROFİL & MAĞAZA ---------------- */
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
  const prev = document.createElement('div'); prev.className = 'prof-preview';
  const av = document.createElement('div'); av.className = 'avatar big'; paintAvatar(av, me);
  const infoD = document.createElement('div');
  const nm = document.createElement('div'); nm.className = 'm-name'; applyName(nm, me.name + (me.role === 'owner' ? ' 👑' : ''), pf);
  const st = document.createElement('div'); st.className = 'm-sub'; st.textContent = pf.status || 'Durum yazın yok';
  const coins = document.createElement('div'); coins.className = 'prof-coins'; coins.textContent = '🪙 ' + myCoins + ' KankaCoin';
  infoD.append(nm, st, coins);
  prev.append(av, infoD);
  body.appendChild(prev);

  // durum yazısı
  if (profileOwns('status')) {
    const row = document.createElement('div'); row.className = 'inv-row';
    const inp = document.createElement('input'); inp.id = 'statusInp'; inp.maxLength = 40; inp.placeholder = 'Durum yazısı…'; inp.value = pf.status || '';
    const btn = document.createElement('button'); btn.className = 'btn-small'; btn.textContent = 'Kaydet';
    btn.onclick = () => wsSend({ t: 'status', text: inp.value.trim() });
    row.append(inp, btn);
    body.appendChild(row);
  }

  const SECTIONS = [['emoji', '😎 Avatar Emojisi'], ['frame', '🖼️ Çerçeveler'], ['badge', '🎖️ Rozetler'], ['namecolor', ' İsim Renkleri'], ['status', '💬 Özel']];
  SECTIONS.forEach(([type, title]) => {
    const items = shop.filter((s) => s.type === type);
    if (!items.length) return;
    const h = document.createElement('div'); h.className = 'ch-group'; h.innerHTML = `<span>${title}</span>`;
    body.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'shop-grid';
    items.forEach((it) => {
      const owned = profileOwns(it.id);
      const equipped = pf.emoji === it.value || pf.frame === it.value || pf.badge === it.value || pf.nameColor === it.value || (type === 'status' && owned);
      const b = document.createElement('button');
      b.className = 'shop-item' + (equipped ? ' equipped' : owned ? ' owned' : '');
      b.innerHTML = `<span class="shop-label">${it.label}</span><span class="shop-price">${owned ? (equipped ? '✅ Takılı' : 'Tak') : '🪙 ' + it.price}</span>`;
      b.onclick = () => {
        if (type === 'status') { if (!owned) wsSend({ t: 'buy', id: it.id }); else toast('Aşağıdan durum yazını gir ✍️'); return; }
        if (owned) wsSend({ t: 'equip', slot: type, id: equipped ? null : it.id });
        else wsSend({ t: 'buy', id: it.id });
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
  });

  const tip = document.createElement('div'); tip.className = 'shop-tip';
  tip.textContent = '💰 Coin kas: günlük +10 • !maden ⛏️ • !yarisma 🧠 +5 • !adam 🪢 +4 • !sayi 🔢 +4 • !film 🎬 +4 • !xo 🕹️ +3 • !zincir 🔗 +1 • !bahis 🎰 — Tüm liste için ❓ butonu!';
  body.appendChild(tip);
}
function profileOwns(id) {
  // sunucu owned listesini profile event'inde göndermiyor; init'te owneds'ı tutalım
  return (myOwned || []).includes(id);
}
let myOwned = [];

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
setInterval(() => wsSend({ t: 'ping' }), 25000);

buildLogin(); setupComposer(); setupVoiceButtons(); setupSoundboard(); setupMobile(); setupLogout(); setupHelp(); connect();
