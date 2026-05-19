/* ═══════════════════════════════════════════════════════════════
   PassForge  ·  app.js
   Modules: Canvas · Config · API · Generator · Vault · Stats · UI
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   MODULE: Canvas — animated mesh + particle background
   ───────────────────────────────────────────────────────────── */
const Canvas = (() => {
  let canvas, ctx, W, H, raf;
  const NODES = 55;
  const LINK_DIST = 140;
  const nodes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkNode() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      r:  Math.random() * 1.5 + .5,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Dark radial gradient base
    const grad = ctx.createRadialGradient(W*.5, H*.5, 0, W*.5, H*.5, Math.max(W, H)*.7);
    grad.addColorStop(0,   'rgba(14,14,30,0)');
    grad.addColorStop(1,   'rgba(7,7,13,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const t = performance.now() * .001;

    // Update + draw nodes
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      n.pulse += .015;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;

      const pulse = Math.sin(n.pulse) * .5 + .5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + pulse * .6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(29,255,160,${.15 + pulse * .15})`;
      ctx.fill();
    }

    // Draw links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * .12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(29,255,160,${alpha})`;
          ctx.lineWidth = .6;
          ctx.stroke();
        }
      }
    }

    // Floating glow orbs (2 big ones)
    const orbs = [
      { x: W*.15 + Math.sin(t*.2)*80,  y: H*.2  + Math.cos(t*.15)*60,  r: 250, c: '29,255,160', a: .06 },
      { x: W*.85 + Math.cos(t*.18)*70, y: H*.75 + Math.sin(t*.22)*50,  r: 300, c: '0,180,255',  a: .05 },
    ];
    for (const o of orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0,   `rgba(${o.c},${o.a})`);
      g.addColorStop(1,   `rgba(${o.c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI*2);
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  function init() {
    canvas = document.getElementById('bgCanvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < NODES; i++) nodes.push(mkNode());
    draw();
  }

  return { init };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: Config — password generation settings
   ───────────────────────────────────────────────────────────── */
const Config = (() => {
  const PRESETS = {
    pin:    { len: 6,  upper: false, lower: false, nums: true,  syms: false },
    std:    { len: 12, upper: true,  lower: true,  nums: true,  syms: false },
    strong: { len: 20, upper: true,  lower: true,  nums: true,  syms: true  },
    max:    { len: 32, upper: true,  lower: true,  nums: true,  syms: true  },
  };

  let current = { len: 16, upper: true, lower: true, nums: true, syms: false };

  const slider  = document.getElementById('lengthSlider');
  const lenVal  = document.getElementById('lenVal');
  const slFill  = document.getElementById('sliderFill');

  function updateSlider() {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slFill.style.width = pct + '%';
    lenVal.textContent = slider.value;
    current.len = parseInt(slider.value);
  }

  function getCharsetCards() {
    return document.querySelectorAll('.charset-card');
  }

  function readCharsets() {
    getCharsetCards().forEach(card => {
      const key = card.dataset.key;
      current[key] = card.classList.contains('active');
    });
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    slider.value = p.len;
    current = { ...p };
    updateSlider();
    getCharsetCards().forEach(card => {
      const key = card.dataset.key;
      card.classList.toggle('active', !!p[key]);
    });
  }

  function get() { readCharsets(); return { ...current }; }

  function init() {
    updateSlider();
    slider.addEventListener('input', updateSlider);

    getCharsetCards().forEach(card => {
      card.addEventListener('click', () => card.classList.toggle('active'));
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });
  }

  return { init, get, applyPreset };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: Generator — password creation logic (local + API)
   ───────────────────────────────────────────────────────────── */
const Generator = (() => {
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMS  = '0123456789';
  const SYMS  = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  function local(cfg) {
    if (!cfg.upper && !cfg.lower && !cfg.nums && !cfg.syms)
      throw new Error('Selecciona al menos un tipo de carácter.');

    let pool = '';
    const guaranteed = [];

    if (cfg.upper) { pool += UPPER; guaranteed.push(rand(UPPER)); }
    if (cfg.lower) { pool += LOWER; guaranteed.push(rand(LOWER)); }
    if (cfg.nums)  { pool += NUMS;  guaranteed.push(rand(NUMS));  }
    if (cfg.syms)  { pool += SYMS;  guaranteed.push(rand(SYMS));  }

    const arr = [...guaranteed];
    while (arr.length < cfg.len) arr.push(pool[Math.floor(Math.random() * pool.length)]);

    return arr.sort(() => Math.random() - .5).join('');
  }

  function rand(src) { return src[Math.floor(Math.random() * src.length)]; }

  function strength(pwd) {
    let s = 0;
    if (pwd.length >= 8)  s += 20;
    if (pwd.length >= 12) s += 10;
    if (pwd.length >= 16) s += 10;
    if (/[A-Z]/.test(pwd)) s += 15;
    if (/[a-z]/.test(pwd)) s += 15;
    if (/[0-9]/.test(pwd)) s += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) s += 15;
    return Math.min(s, 100);
  }

  async function fromApi(cfg) {
    const res = await fetch('http://localhost:8080/api/passwords/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        length: cfg.len, uppercase: cfg.upper,
        lowercase: cfg.lower, numbers: cfg.nums, symbols: cfg.syms
      }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { password: data.password, strength: data.strength };
  }

  async function generate(cfg) {
    if (API.isOnline()) {
      try { return await fromApi(cfg); } catch {}
    }
    const password = local(cfg);
    return { password, strength: strength(password) };
  }

  return { generate, strength };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: API — backend connectivity
   ───────────────────────────────────────────────────────────── */
const API = (() => {
  const BASE = 'http://localhost:8080/api/passwords';
  let online = false;

  async function probe() {
    try {
      await fetch(BASE, { signal: AbortSignal.timeout(1500) });
      online = true;
    } catch {
      online = false;
    }
    UI.setApiStatus(online);
  }

  async function saveRemote(entry) {
    const res = await fetch(`${BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: entry.name,
        password: entry.passwordValue,
        category: entry.category,
        notes: entry.notes
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('API save failed');
    return res.json();
  }

  async function deleteRemote(id) {
    await fetch(`${BASE}/${id}`, { method: 'DELETE', signal: AbortSignal.timeout(3000) });
  }

  function isOnline() { return online; }

  return { probe, saveRemote, deleteRemote, isOnline };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: Vault — local storage persistence
   ───────────────────────────────────────────────────────────── */
const Vault = (() => {
  const KEY = 'passforge_v2';
  let items = [];

  function load()    { items = JSON.parse(localStorage.getItem(KEY) || '[]'); }
  function save()    { localStorage.setItem(KEY, JSON.stringify(items)); }
  function getAll()  { return [...items]; }
  function count()   { return items.length; }

  function add(entry) {
    items.unshift(entry);
    save();
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    save();
  }

  function filter({ search = '', category = '', sort = 'date' }) {
    let list = [...items];
    if (search)   list = list.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category||'').toLowerCase().includes(search.toLowerCase())
    );
    if (category) list = list.filter(p => p.category === category);
    if (sort === 'name')     list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'strength') list.sort((a, b) => (b.strength||0) - (a.strength||0));
    return list;
  }

  return { load, getAll, add, remove, filter, count };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: UI — output panel, vault rendering, stats
   ───────────────────────────────────────────────────────────── */
const UI = (() => {
  const CAT_ICONS = {
    General:'🌐', Trabajo:'💼', Social:'📱',
    Finanzas:'💳', Entretenimiento:'🎮', Educacion:'📚', Otro:'🔑'
  };

  // — Output panel —
  const outputText   = document.getElementById('outputText');
  const meterFill    = document.getElementById('meterFill');
  const meterLabel   = document.getElementById('meterLabel');
  const btnCopy      = document.getElementById('btnCopy');
  const btnRefresh   = document.getElementById('btnRefresh');
  const btnSave      = document.getElementById('btnSave');

  function renderPassword(password, strength) {
    outputText.innerHTML = '';
    outputText.className = 'output-text';

    // Staggered character reveal animation
    [...password].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.animationDelay = `${i * 18}ms`;
      span.style.animation = 'charIn .3s ease both';
      outputText.appendChild(span);
    });

    // Inject keyframe if not present
    if (!document.getElementById('charInStyle')) {
      const s = document.createElement('style');
      s.id = 'charInStyle';
      s.textContent = `@keyframes charIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }`;
      document.head.appendChild(s);
    }

    // Meter
    const colors = strength >= 70
      ? 'linear-gradient(90deg,#1dffa0,#00e0c0)'
      : strength >= 40
      ? 'linear-gradient(90deg,#ffb800,#ff8c00)'
      : 'linear-gradient(90deg,#ff4d6d,#c0003c)';

    meterFill.style.background = colors;
    // Defer width animation one frame
    requestAnimationFrame(() => { meterFill.style.width = strength + '%'; });

    const label = strength >= 70 ? '🛡️ Fuerte' : strength >= 40 ? '⚡ Media' : '⚠️ Débil';
    meterLabel.textContent = `${label} (${strength}%)`;

    btnCopy.disabled    = false;
    btnRefresh.disabled = false;
    btnSave.disabled    = false;
  }

  // — Vault —
  function renderVault() {
    const list = document.getElementById('vaultList');
    const search   = document.getElementById('searchInput').value;
    const category = document.getElementById('filterCat').value;
    const sort     = document.getElementById('sortBy').value;
    const items    = Vault.filter({ search, category, sort });

    document.getElementById('searchClear').hidden = !search;

    if (items.length === 0) {
      const msg = Vault.count() === 0
        ? 'Tu bóveda está vacía.<br>Genera y guarda tu primera contraseña.'
        : 'Sin resultados para esa búsqueda.';
      list.innerHTML = `<div class="vault-empty">
        <div class="vault-empty-icon">🗄️</div><p>${msg}</p></div>`;
      return;
    }

    list.innerHTML = items.map((p, idx) => {
      const icon = CAT_ICONS[p.category] || '🔑';
      const str  = p.strength || 0;
      const strClass = str >= 70 ? 'strong' : str >= 40 ? 'medium' : 'weak';
      const strLabel = str >= 70 ? '🛡️ Fuerte' : str >= 40 ? '⚡ Media' : '⚠️ Débil';
      const date = new Date(p.createdAt).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });

      return `<div class="vault-card" style="animation-delay:${idx*40}ms">
        <div class="vc-avatar">${icon}</div>
        <div class="vc-info">
          <div class="vc-name">${esc(p.name)}</div>
          <div class="vc-meta">
            <span class="vc-badge">${p.category||'General'}</span>
            <span>${date}</span>
            <span class="vc-str ${strClass}">${strLabel}</span>
            ${p.notes ? `<span title="${esc(p.notes)}">📝</span>` : ''}
          </div>
        </div>
        <div class="vc-pwd" data-pwd="${escAttr(p.passwordValue||'')}"
             title="Clic para revelar">${esc(p.passwordValue||'')}</div>
        <div class="vc-actions">
          <button class="icon-btn" title="Copiar" data-copy="${escAttr(p.passwordValue||'')}">📋</button>
          <button class="icon-btn del" title="Eliminar" data-del="${p.id}">🗑️</button>
        </div>
      </div>`;
    }).join('');

    // Bind vault card events
    list.querySelectorAll('.vc-pwd').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('revealed'));
    });
    list.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await copyText(btn.dataset.copy);
        btn.textContent = '✅';
        setTimeout(() => { btn.textContent = '📋'; }, 1500);
      });
    });
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => Actions.deleteEntry(parseInt(btn.dataset.del)));
    });
  }

  // — Stats —
  function renderStats() {
    const all = Vault.getAll();
    const total    = all.length;
    const strong   = all.filter(p => (p.strength||0) >= 70).length;
    const weak     = all.filter(p => (p.strength||0) < 40).length;
    const cats     = new Set(all.map(p => p.category).filter(Boolean));
    const avgLen   = total ? Math.round(all.reduce((s,p) => s + (p.length||0), 0) / total) : 0;
    const avgStr   = total ? Math.round(all.reduce((s,p) => s + (p.strength||0), 0) / total) : 0;

    document.getElementById('sTotalPwds').textContent = total;
    document.getElementById('sStrongPwds').textContent = strong;
    document.getElementById('sWeakPwds').textContent   = weak;
    document.getElementById('sCats').textContent       = cats.size;
    document.getElementById('sAvgLen').textContent     = avgLen || '—';
    document.getElementById('sAvgStr').textContent     = total ? avgStr + '%' : '—';

    // Category bars
    const catBars = document.getElementById('catBars');
    const catMap  = {};
    all.forEach(p => { const c = p.category||'General'; catMap[c] = (catMap[c]||0)+1; });
    const maxCat = Math.max(...Object.values(catMap), 1);

    catBars.innerHTML = Object.keys(catMap).length === 0
      ? '<p class="empty-hint">Aún no tienes contraseñas guardadas.</p>'
      : Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([name, count]) => `
          <div class="cat-bar-row">
            <span class="cat-bar-name">${CAT_ICONS[name]||'🔑'} ${name}</span>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width:${Math.round(count/maxCat*100)}%"></div>
            </div>
            <span class="cat-bar-count">${count}</span>
          </div>`).join('');

    // Strength distribution
    const medium = all.filter(p => (p.strength||0) >= 40 && (p.strength||0) < 70).length;
    const maxSD  = Math.max(strong, medium, weak, 1);
    const sdEl   = document.getElementById('strengthDist');
    sdEl.innerHTML = [
      { label: 'Fuerte',  count: strong, cls: 'strong' },
      { label: 'Media',   count: medium, cls: 'medium' },
      { label: 'Débil',   count: weak,   cls: 'weak'   },
    ].map(s => `
      <div class="sd-col">
        <div class="sd-bar-wrap" style="height:${Math.round(s.count/maxSD*100)}%">
          <div class="sd-bar ${s.cls}" style="height:100%"></div>
        </div>
        <span class="sd-label">${s.label}<br>${s.count}</span>
      </div>`).join('');
  }

  // — API status chip —
  function setApiStatus(online) {
    document.getElementById('apiDot')?.remove();
    const dot   = document.getElementById('apiChip').querySelector('.api-dot');
    const label = document.getElementById('apiLabel');
    dot.classList.toggle('online', online);
    label.textContent = online ? 'API Java ✓' : 'Modo local';
  }

  // — Vault badge counter —
  function updateBadge() {
    document.getElementById('vaultBadge').textContent = Vault.count();
  }

  // — Notification —
  function notify(msg, type = 'ok') {
    const stack = document.getElementById('notifStack');
    const el = document.createElement('div');
    el.className = `notif ${type}`;
    el.innerHTML = `<span class="notif-icon">${type === 'ok' ? '✅' : '❌'}</span>
                    <span class="notif-text">${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      el.addEventListener('animationend', () => el.remove());
    }, 3000);
  }

  return { renderPassword, renderVault, renderStats, setApiStatus, updateBadge, notify };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: Actions — user interactions glue
   ───────────────────────────────────────────────────────────── */
const Actions = (() => {
  let currentPwd = '';
  let currentStr = 0;

  async function generate() {
    const cfg = Config.get();
    if (!cfg.upper && !cfg.lower && !cfg.nums && !cfg.syms) {
      UI.notify('Selecciona al menos un tipo de carácter.', 'err'); return;
    }
    try {
      const { password, strength } = await Generator.generate(cfg);
      currentPwd = password;
      currentStr = strength;
      UI.renderPassword(password, strength);
    } catch (e) {
      UI.notify(e.message || 'Error al generar.', 'err');
    }
  }

  async function copyPwd() {
    if (!currentPwd) return;
    await copyText(currentPwd);
    const btn = document.getElementById('btnCopy');
    btn.classList.add('copied');
    btn.innerHTML = '<span class="btn-icon">✅</span> Copiada';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<span class="btn-icon">📋</span> Copiar';
    }, 2000);
  }

  async function saveEntry() {
    if (!currentPwd) { UI.notify('Primero genera una contraseña.', 'err'); return; }
    const name     = document.getElementById('saveName').value.trim() || 'Sin nombre';
    const category = document.getElementById('saveCategory').value;
    const notes    = document.getElementById('saveNotes').value.trim();

    const entry = {
      id:            Date.now(),
      name, category, notes,
      passwordValue: currentPwd,
      strength:      currentStr,
      length:        currentPwd.length,
      createdAt:     new Date().toISOString(),
    };

    // Try API first, fall back to local
    if (API.isOnline()) {
      try { await API.saveRemote(entry); } catch {}
    }
    Vault.add(entry);
    UI.updateBadge();
    UI.notify(`"${name}" guardada en tu bóveda.`, 'ok');

    document.getElementById('saveName').value  = '';
    document.getElementById('saveNotes').value = '';
  }

  async function deleteEntry(id) {
    if (!confirm('¿Eliminar esta contraseña?')) return;
    if (API.isOnline()) {
      try { await API.deleteRemote(id); } catch {}
    }
    Vault.remove(id);
    UI.renderVault();
    UI.renderStats();
    UI.updateBadge();
    UI.notify('Contraseña eliminada.', 'ok');
  }

  return { generate, copyPwd, saveEntry, deleteEntry };
})();


/* ─────────────────────────────────────────────────────────────
   MODULE: Router — tab switching
   ───────────────────────────────────────────────────────────── */
const Router = (() => {
  function go(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${tab}`)?.classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

    if (tab === 'vault')  UI.renderVault();
    if (tab === 'stats')  UI.renderStats();
  }

  function init() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => go(btn.dataset.tab));
    });
  }

  return { init, go };
})();


/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return String(s).replace(/'/g,"\\'"); }

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    UI.notify('Copiado al portapapeles.', 'ok');
  } catch {
    UI.notify('No se pudo copiar.', 'err');
  }
}


/* ─────────────────────────────────────────────────────────────
   BOOT — wire up events & initialise everything
   ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Layer 1: canvas
  Canvas.init();

  // Data
  Vault.load();
  UI.updateBadge();

  // Config module
  Config.init();

  // Navigation
  Router.init();

  // Generator buttons
  document.getElementById('btnGenerate').addEventListener('click', Actions.generate);
  document.getElementById('btnRefresh').addEventListener('click', () => {
    const btn = document.getElementById('btnRefresh');
    btn.classList.add('spinning');
    btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    Actions.generate();
  });
  document.getElementById('btnCopy').addEventListener('click', Actions.copyPwd);
  document.getElementById('btnSave').addEventListener('click', Actions.saveEntry);

  // Output reveal overlay (click anywhere on stage to show/hide)
  document.getElementById('outputStage').addEventListener('mouseenter', () => {
    if (document.getElementById('outputText').textContent.trim() &&
        !document.querySelector('.output-placeholder')) {
      // optional overlay logic
    }
  });

  // Vault search & filters
  document.getElementById('searchInput').addEventListener('input', UI.renderVault.bind(UI));
  document.getElementById('searchClear').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    UI.renderVault();
  });
  document.getElementById('filterCat').addEventListener('change', UI.renderVault.bind(UI));
  document.getElementById('sortBy').addEventListener('change', UI.renderVault.bind(UI));

  // API probe (non-blocking)
  API.probe();

  // Auto-generate on first load
  Actions.generate();
});
