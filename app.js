'use strict';
/* KankaChat istemcisi — WebSocket + WebRTC */
const $ = (s) => document.querySelector(s);

/* ---------------- durum ---------------- */
let ws = null;
let me = null;
let channels = [];
let usersList = [];
let chanMsgs = {};          // channelId -> mesajlar
let current = null;         // aktif metin kanalı
let lastRendered = null;    // gruplama için son mesaj
let typingMap = new Map();  // uid -> {name, until}
let reconnectDelay = 1000;
let closedOnPurpose = false;
let pendingImage = null;
let lastTypingSent = 0;

const voice = { channelId: null, pcs: new Map(), stream: null, muted: false, joining: false, screenStream: null };
let speakingAn = new Map();   // uid -> analyser (konuşma halkası için)
let remoteStreams = new Map();// uid -> remote MediaStream
let screenView = null;        // {mode:'local'|'remote', uid}

const COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#f47b67', '#45ddc0', '#9b84ee', '#3ba55d', '#f0b232'];
let pickedColor = COLORS[Math.floor(Math.random() * COLORS.length)];

const timeFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const esc = (s) => s; // DOM textContent kullanıyoruz, yine de savunma amaçlı
const wsUrl = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

/* ---------------- giriş ekranı ---------------- */
function buildLogin() {
  const row = $('#colorRow');
  COLORS.forEach((c) => {
    const d = document.createElement('div');
    d.className = 'color-dot' + (c === pickedColor ? ' sel' : '');
    d.style.background = c;
    d.onclick = () => {
      pickedColor = c;
      row.querySelectorAll('.color-dot').forEach((x) => x.classList.remove('sel'));
      d.classList.add('sel');
    };
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
  $('#loginError').textContent = '';
  if (ws && ws.readyState === WebSocket.OPEN) {
    wsSend({ t: 'join', name, color: pickedColor });
  } else {
    connect();
  }
}

/* ---------------- bağlantı ---------------- */
function connect() {
  closedOnPurpose = false;
  ws = new WebSocket(wsUrl());
  ws.onopen = () => {
    reconnectDelay = 1000;
    $('#netBanner').classList.add('hidden');
    const saved = localStorage.getItem('kc-user');
    if (saved) {
      const id = JSON.parse(saved);
      wsSend({ t: 'join', name: id.name, color: id.color });
    }
  };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
    handle(m);
  };
  ws.onclose = () => {
    if (closedOnPurpose) return;
    $('#netBanner').classList.remove('hidden');
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 10000);
  };
  ws.onerror = () => {};
}
function wsSend(obj) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }

/* ---------------- gelen mesajlar ---------------- */
function handle(m) {
  switch (m.t) {
    case 'init':
      me = m.you;
      channels = m.channels;
      usersList = m.users;
      chanMsgs[m.you.channelId] = m.messages;
      current = m.you.channelId;
      $('#login').classList.add('hidden');
      $('#app').classList.remove('hidden');
      setupMe();
      renderAll();
      $('#input').focus();
      break;
    case 'users':
      usersList = m.users;
      renderUsers();
      renderChannels();
      break;
    case 'channels':
      channels = m.channels;
      renderChannels();
      break;
    case 'switched':
      current = m.channelId;
      chanMsgs[current] = m.messages;
      typingMap.clear();
      renderTyping();
      renderAll();
      closeDrawers();
      $('#input').focus();
      break;
    case 'msg':
      if (!chanMsgs[m.channelId]) chanMsgs[m.channelId] = [];
      chanMsgs[m.channelId].push(m.msg);
      if (m.channelId === current) appendMessage(m.msg);
      if (m.msg.uid && m.msg.uid !== me.id && (document.hidden || m.channelId !== current)) beep();
      break;
    case 'typing':
      typingMap.set(m.uid, { name: m.name, until: Date.now() + 3000 });
      renderTyping();
      setTimeout(renderTyping, 3100);
      break;
    case 'voice-joined':
      voice.channelId = m.channelId;
      voice.joining = false;
      updateVoiceUI();
      for (const p of m.peers) createPeer(p.id, true);
      break;
    case 'voice-left':
      closePeer(m.uid);
      break;
    case 'rtc':
      handleSignal(m.from, m.data).catch(console.error);
      break;
  }
}

/* ---------------- render ---------------- */
function setupMe() {
  const av = $('#meAvatar');
  av.style.background = me.color;
  av.textContent = me.name[0].toUpperCase();
  $('#meName').textContent = me.name;
}
function renderAll() { renderChannels(); renderMessages(); renderUsers(); updateHeader(); }

function updateHeader() {
  const ch = channels.find((c) => c.id === current);
  if (!ch) return;
  $('#chName').textContent = ch.name;
  $('#chTopic').textContent = ch.topic || '';
  $('#topTitle').textContent = '#' + ch.name;
  $('#input').placeholder = '#' + ch.name + ' kanalına yaz…';
}

function renderChannels() {
  const list = $('#channelList');
  list.innerHTML = '';
  const texts = channels.filter((c) => c.type === 'text');
  const voices = channels.filter((c) => c.type === 'voice');

  const g1 = document.createElement('div');
  g1.className = 'ch-group';
  g1.innerHTML = '<span>Metin Kanalları</span>';
  const addBtn = document.createElement('button');
  addBtn.className = 'ch-add'; addBtn.title = 'Kanal oluştur'; addBtn.textContent = '+';
  addBtn.onclick = (e) => {
    e.stopPropagation();
    const name = prompt('Yeni kanal adı:');
    if (name && name.trim()) wsSend({ t: 'create-channel', name: name.trim() });
  };
  g1.appendChild(addBtn);
  list.appendChild(g1);

  texts.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'ch-item' + (c.id === current ? ' active' : '');
    const h = document.createElement('span'); h.className = 'hash'; h.textContent = '#';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name;
    item.append(h, l);
    item.onclick = () => { if (c.id !== current) wsSend({ t: 'switch', channelId: c.id }); };
    list.appendChild(item);
  });

  const g2 = document.createElement('div');
  g2.className = 'ch-group';
  g2.innerHTML = '<span>Ses Kanalları</span>';
  list.appendChild(g2);

  voices.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'ch-item' + (voice.channelId === c.id ? ' active' : '');
    const icon = document.createElement('span'); icon.textContent = '🔊';
    const l = document.createElement('span'); l.className = 'ch-label'; l.textContent = c.name;
    item.append(icon, l);
    item.onclick = () => {
      if (voice.channelId === c.id) leaveVoice();
      else joinVoice(c.id);
    };
    list.appendChild(item);

    const membersIn = usersList.filter((u) => u.voiceId === c.id);
    if (membersIn.length) {
      const box = document.createElement('div');
      box.className = 'voice-members';
      membersIn.forEach((u) => {
        const row = document.createElement('div');
        row.className = 'vm-item';
        const av = document.createElement('span');
        av.className = 'mini-av';
        av.style.background = u.color;
        av.dataset.av = u.id; // konuşma halkası için
        av.textContent = u.name[0].toUpperCase();
        const nm = document.createElement('span');
        nm.textContent = u.id === me.id ? u.name + ' (sen)' : u.name;
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
  const list = $('#memberList');
  list.innerHTML = '';
  const sorted = [...usersList].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  sorted.forEach((u) => {
    const row = document.createElement('div');
    row.className = 'member';
    const av = document.createElement('div');
    av.className = 'avatar';
    av.style.background = u.color;
    av.dataset.av = u.id; // konuşma halkası için
    av.textContent = u.name[0].toUpperCase();
    const info = document.createElement('div');
    info.className = 'm-info';
    const nm = document.createElement('div');
    nm.className = 'm-name';
    nm.textContent = u.name + (u.id === me.id ? ' (sen)' : '');
    const sub = document.createElement('div');
    sub.className = 'm-sub';
    const ch = channels.find((c) => c.id === u.channelId);
    sub.textContent = ch ? '#' + ch.name : '';
    info.append(nm, sub);
    row.append(av, info);
    if (u.voiceId) {
      const v = document.createElement('span');
      v.className = 'm-voice';
      v.textContent = u.muted ? '🔇' : '🎙️';
      row.appendChild(v);
    }
    list.appendChild(row);
  });
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Bugün';
  if (same(d, yest)) return 'Dün';
  return dateFmt.format(d);
}

function linkify(container, text) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  for (const p of parts) {
    if (/^https?:\/\//.test(p)) {
      const a = document.createElement('a');
      a.href = p; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = p;
      container.appendChild(a);
    } else {
      container.appendChild(document.createTextNode(p));
    }
  }
}

function buildMessage(msg, prev) {
  if (msg.system) {
    const d = document.createElement('div');
    d.className = 'msg system';
    d.textContent = `— ${msg.text} · ${timeFmt.format(msg.ts)} —`;
    return { el: d };
  }
  const grouped = prev && !prev.system && prev.uid === msg.uid && msg.ts - prev.ts < 5 * 60 * 1000
    && new Date(prev.ts).toDateString() === new Date(msg.ts).toDateString();

  const d = document.createElement('div');
  d.className = 'msg' + (grouped ? ' grouped' : '');

  if (grouped) {
    const sp = document.createElement('div');
    sp.className = 'msg-gtime';
    sp.textContent = timeFmt.format(msg.ts);
    d.appendChild(sp);
  } else {
    const av = document.createElement('div');
    av.className = 'avatar';
    av.style.background = msg.color || '#5865f2';
    av.textContent = (msg.name || '?')[0].toUpperCase();
    d.appendChild(av);
  }

  const body = document.createElement('div');
  body.className = 'msg-body';
  if (!grouped) {
    const head = document.createElement('div');
    head.className = 'msg-head';
    const nm = document.createElement('span');
    nm.className = 'msg-name';
    nm.style.color = msg.color || '#fff';
    nm.textContent = msg.name;
    const tm = document.createElement('span');
    tm.className = 'msg-time';
    tm.textContent = dayLabel(msg.ts) + ' ' + timeFmt.format(msg.ts);
    head.append(nm, tm);
    body.appendChild(head);
  }
  if (msg.text) {
    const tx = document.createElement('div');
    tx.className = 'msg-text';
    const stripped = msg.text.replace(/[\p{Extended_Pictographic}\u200d\ufe0f\s]/gu, '');
    if (stripped === '' && msg.text.trim().length > 0 && msg.text.trim().length <= 12) tx.classList.add('jumbo');
    linkify(tx, msg.text);
    body.appendChild(tx);
  }
  if (msg.image) {
    const im = document.createElement('img');
    im.className = 'msg-img';
    im.src = msg.image;
    im.alt = 'resim';
    im.onclick = () => window.open(im.src, '_blank');
    body.appendChild(im);
  }
  d.appendChild(body);
  return { el: d };
}

function renderMessages() {
  const box = $('#messages');
  box.innerHTML = '';
  lastRendered = null;
  let lastDay = '';
  for (const msg of chanMsgs[current] || []) {
    const day = new Date(msg.ts).toDateString();
    if (day !== lastDay) {
      const sep = document.createElement('div');
      sep.className = 'day-sep';
      sep.textContent = dayLabel(msg.ts);
      box.appendChild(sep);
      lastDay = day;
      lastRendered = null;
    }
    box.appendChild(buildMessage(msg, lastRendered).el);
    lastRendered = msg;
  }
  box.scrollTop = box.scrollHeight;
}

function appendMessage(msg) {
  const box = $('#messages');
  const day = new Date(msg.ts).toDateString();
  const prevDay = lastRendered ? new Date(lastRendered.ts).toDateString() : '';
  if (day !== prevDay) {
    const sep = document.createElement('div');
    sep.className = 'day-sep';
    sep.textContent = dayLabel(msg.ts);
    box.appendChild(sep);
    lastRendered = null;
  }
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 200;
  box.appendChild(buildMessage(msg, lastRendered).el);
  lastRendered = msg;
  if (nearBottom || msg.uid === me.id) box.scrollTop = box.scrollHeight;
}

function renderTyping() {
  const now = Date.now();
  const names = [...typingMap.values()].filter((x) => x.until > now).map((x) => x.name);
  const el = $('#typingRow');
  if (!names.length) { el.textContent = ''; return; }
  if (names.length === 1) el.textContent = `${names[0]} yazıyor…`;
  else if (names.length === 2) el.textContent = `${names[0]} ve ${names[1]} yazıyor…`;
  else el.textContent = 'Birkaç kişi yazıyor…';
}

/* ---------------- yazma / gönderme ---------------- */
function setupComposer() {
  const input = $('#input');
  const sendBtn = $('#sendBtn');

  const doSend = () => {
    const text = input.value.trim();
    if (!text && !pendingImage) return;
    wsSend({ t: 'msg', text, image: pendingImage });
    input.value = '';
    input.style.height = 'auto';
    clearPendingImage();
    input.focus();
  };
  sendBtn.onclick = doSend;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    const now = Date.now();
    if (now - lastTypingSent > 1200 && input.value.trim()) {
      lastTypingSent = now;
      wsSend({ t: 'typing' });
    }
  });

  // resim ekleme
  $('#attachBtn').onclick = () => $('#fileInput').click();
  $('#fileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { alert('Şimdilik sadece resim gönderebilirsin 🖼️'); return; }
    if (f.size > 1_200_000) { alert('Resim çok büyük (en fazla ~1 MB) 📏'); return; }
    const r = new FileReader();
    r.onload = () => {
      pendingImage = r.result;
      $('#imgPreviewImg').src = pendingImage;
      $('#imgPreview').classList.remove('hidden');
    };
    r.readAsDataURL(f);
  });
  $('#imgRemoveBtn').onclick = clearPendingImage;

  // emoji seçici
  const EMOJIS = ['😀','😂','😅','😍','😎','🤔','😴','😭','😡','🥳','😇','🤯','👍','👎','👋','🙏','💪','🤝','👀','❤️','🔥','⭐','✨','🎉','💯','🎮','🎧','🎵','⚽','🏆','🍕','☕','🫡','💀','🤡','🙈'];
  const pop = $('#emojiPop');
  EMOJIS.forEach((em) => {
    const b = document.createElement('button');
    b.textContent = em;
    b.onclick = () => {
      input.value += em;
      input.focus();
      pop.classList.add('hidden');
    };
    pop.appendChild(b);
  });
  $('#emojiBtn').onclick = (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); };
  document.addEventListener('click', (e) => {
    if (!pop.classList.contains('hidden') && !pop.contains(e.target)) pop.classList.add('hidden');
  });
}
function clearPendingImage() {
  pendingImage = null;
  $('#imgPreview').classList.add('hidden');
  $('#imgPreviewImg').src = '';
}

/* ---------------- bildirim sesi ---------------- */
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.26);
  } catch (_) {}
}

/* ---------------- sesli sohbet (WebRTC) ---------------- */
async function joinVoice(channelId) {
  if (voice.joining) return;
  voice.joining = true;
  if (voice.channelId) {
    wsSend({ t: 'voice-leave' });
    closeAllPeers();
    stopLocalStream();
    voice.channelId = null;
  }
  try {
    voice.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    voice.muted = false;
    attachSpeaking(me.id, voice.stream); // kendi konuşma halkam
  } catch (_) {
    voice.stream = null;      // mikrofonsuz: sadece dinleme modu
    voice.muted = true;
  }
  wsSend({ t: 'voice-join', channelId });
  wsSend({ t: 'mute', muted: voice.muted });
  if (!voice.stream && !confirm('Mikrofonuna erişilemedi — odaya sadece dinleyici olarak katılacaksın. Devam edilsin mi?')) {
    wsSend({ t: 'voice-leave' });
    voice.joining = false;
    return;
  }
}

function leaveVoice() {
  wsSend({ t: 'voice-leave' });
  stopScreen();
  closeAllPeers();
  stopLocalStream();
  speakingAn.clear();
  voice.channelId = null;
  voice.muted = false;
  updateVoiceUI();
  renderChannels();
}

function stopLocalStream() {
  if (voice.stream) { voice.stream.getTracks().forEach((t) => t.stop()); voice.stream = null; }
}

function sendRtc(to, data) { wsSend({ t: 'rtc', to, data }); }

function createPeer(uid, initiator) {
  closePeer(uid, true);
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
  });
  pc.iceQueue = [];
  voice.pcs.set(uid, pc);

  if (voice.stream) voice.stream.getTracks().forEach((t) => pc.addTrack(t, voice.stream));
  if (voice.screenStream) {
    try { pc.screenSender = pc.addTrack(voice.screenStream.getVideoTracks()[0], voice.screenStream); } catch (_) {}
  }

  pc.onicecandidate = (e) => { if (e.candidate) sendRtc(uid, { candidate: e.candidate }); };
  pc.ontrack = (e) => {
    const [stream] = e.streams;
    remoteStreams.set(uid, stream);
    if (e.track.kind === 'audio') {
      attachSpeaking(uid, stream);
      let a = document.getElementById('aud-' + uid);
      if (!a) {
        a = new Audio();
        a.id = 'aud-' + uid;
        a.autoplay = true;
        document.body.appendChild(a);
      }
      a.srcObject = stream;
      a.play().catch(() => {});
    } else {
      // karşıdan gelen ekran görüntüsü
      showRemoteScreen(uid, stream);
      e.track.onmute = () => hideScreenIf(uid);
    }
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') { closePeer(uid); }
  };

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
      const polite = me.id > from; // glare çözümünde nazik taraf
      const collision = pc && pc.signalingState !== 'stable';
      if (collision && !polite) return; // kaba taraf gelen offerı yok sayar
      if (!pc) pc = createPeer(from, false);
      try {
        if (collision) await pc.setLocalDescription({ type: 'rollback' });
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendRtc(from, { sdp: pc.localDescription });
        flushIce(pc);
      } catch (e) { console.error('offer hatası', e); }
    } else if (data.sdp.type === 'answer') {
      const pc = voice.pcs.get(from);
      if (!pc) return;
      try { await pc.setRemoteDescription(data.sdp); flushIce(pc); } catch (e) { console.error('answer hatası', e); }
    }
  } else if (data.screen === true) {
    const st = remoteStreams.get(from);
    if (st) showRemoteScreen(from, st);
  } else if (data.screen === false) {
    hideScreenIf(from);
  } else if (data.candidate) {
    const pc = voice.pcs.get(from);
    if (!pc) return;
    if (pc.remoteDescription) pc.addIceCandidate(data.candidate).catch(() => {});
    else pc.iceQueue.push(data.candidate);
  }
}
function flushIce(pc) {
  const q = pc.iceQueue.splice(0);
  q.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
}

function closePeer(uid, silent) {
  const pc = voice.pcs.get(uid);
  if (pc) { try { pc.close(); } catch (_) {} voice.pcs.delete(uid); }
  const a = document.getElementById('aud-' + uid);
  if (a) { a.srcObject = null; a.remove(); }
  speakingAn.delete(uid);
  remoteStreams.delete(uid);
  hideScreenIf(uid);
  if (!silent) renderChannels();
}
function closeAllPeers() {
  for (const uid of [...voice.pcs.keys()]) closePeer(uid, true);
}

/* ---------------- ekran paylaşımı ---------------- */
async function startScreen() {
  if (!voice.channelId) { alert('Önce bir ses odasına girmelisin 🔊'); return; }
  if (voice.screenStream) return;
  let s;
  try {
    s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch (_) {
    alert('Ekran paylaşımı başlatılamadı — izin verilmedi veya tarayıcın desteklemiyor 😕');
    return;
  }
  voice.screenStream = s;
  const track = s.getVideoTracks()[0];
  track.onended = () => stopScreen(); // tarayıcı çubuğundan durdurursa
  for (const [uid, pc] of voice.pcs) {
    try { pc.screenSender = pc.addTrack(track, s); } catch (_) {}
    sendRtc(uid, { screen: true });
  }
  viewLocalScreen();
  updateVoiceUI();
}

function stopScreen() {
  if (!voice.screenStream) return;
  const s = voice.screenStream;
  voice.screenStream = null;
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
  $('#screenTitle').textContent = (u ? u.name : 'Birisi') + ' ekranını paylaşıyor 🖥️';
  $('#screenVideo').srcObject = stream;
  $('#screenStopBtn').classList.add('hidden');
  $('#screenOverlay').classList.remove('hidden');
}
function hideScreenIf(uid) {
  if (screenView && screenView.mode === 'remote' && screenView.uid === uid) hideScreen();
}
function hideScreen() {
  screenView = null;
  $('#screenOverlay').classList.add('hidden');
  $('#screenVideo').srcObject = null;
}

/* ---------------- konuşma halkası (ses seviyesi) ---------------- */
function ensureAudioCtx() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) {}
  return audioCtx;
}
function attachSpeaking(uid, stream) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  try {
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    speakingAn.set(uid, an);
  } catch (_) {}
}
setInterval(() => {
  if (!speakingAn.size) return;
  const buf = new Uint8Array(256);
  for (const [uid, an] of speakingAn) {
    an.getByteFrequencyData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i];
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
  $('#screenBtn').onclick = () => {
    if (!voice.channelId) { alert('Önce bir ses odasına girmelisin 🔊'); return; }
    if (voice.screenStream) stopScreen();
    else startScreen();
  };
  $('#screenClose').onclick = hideScreen;
  $('#screenStopBtn').onclick = stopScreen;
}

/* ---------------- mobil çekmeceler ---------------- */
function closeDrawers() {
  $('#sidebar').classList.remove('open');
  $('#members').classList.remove('open');
  $('#backdrop').classList.remove('show');
}
function setupMobile() {
  $('#menuBtn').onclick = () => {
    $('#members').classList.remove('open');
    $('#sidebar').classList.toggle('open');
    $('#backdrop').classList.toggle('show', $('#sidebar').classList.contains('open'));
  };
  $('#membersBtn').onclick = () => {
    $('#sidebar').classList.remove('open');
    $('#members').classList.toggle('open');
    $('#backdrop').classList.toggle('show', $('#members').classList.contains('open'));
  };
  $('#backdrop').onclick = closeDrawers;
}

/* ---------------- çıkış ---------------- */
function setupLogout() {
  $('#logoutBtn').onclick = () => {
    if (!confirm('Sohbetten çıkılsın mı?')) return;
    closedOnPurpose = true;
    localStorage.removeItem('kc-user');
    if (ws) ws.close();
    location.reload();
  };
}

/* ---------------- kalp atışı (mobilde bağlantıyı canlı tut) ---------------- */
setInterval(() => wsSend({ t: 'ping' }), 25000);

/* ---------------- başlat ---------------- */
buildLogin();
setupComposer();
setupVoiceButtons();
setupMobile();
setupLogout();
connect();
