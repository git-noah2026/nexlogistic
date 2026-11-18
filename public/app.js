/* NEXLOGISTIC – Sendungen, Touren & Fuhrpark by Andrerer */
'use strict';
(() => {
  // =============================================================== Hilfsfunktionen
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const uid = () => {
    const b = crypto.getRandomValues(new Uint8Array(12));
    return [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 20);
  };
  const num = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim().replace(/\s/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => isoDate(new Date());
  const addDays = (s, n) => {
    const d = new Date(`${s}T12:00:00`);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  };
  const daysUntil = (s) => Math.round((new Date(`${s}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 864e5);
  const fmtDate = (s) => {
    if (!s) return '';
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
  };
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const fmtDay = (s) => {
    if (!s) return '';
    const dd = daysUntil(s);
    const rel = dd === 0 ? 'Heute' : dd === 1 ? 'Morgen' : dd === -1 ? 'Gestern' : WD[new Date(`${s}T12:00:00`).getDay()];
    return `${rel}, ${fmtDate(s)}`;
  };
  const fmtTime = (t) => (t ? new Date(t).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' }) : '');
  const fmtClock = (t) => (t ? new Date(t).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '');
  const NUMF = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 1 });
  const NUMF3 = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 2 });
  const EUR = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' });
  const fmtKg = (n) => `${NUMF.format(Number(n) || 0)} kg`;
  const fmtM3 = (n) => `${NUMF3.format(Number(n) || 0)} m³`;
  const money = (n) => EUR.format(Number(n) || 0);
  const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  const byText = (f) => (a, b) => String(f(a) || '').localeCompare(String(f(b) || ''), 'de');
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const setPath = (o, path, v) => {
    const ks = path.split('.');
    let cur = o;
    ks.slice(0, -1).forEach((k) => { cur = cur[k] = cur[k] && typeof cur[k] === 'object' ? cur[k] : {}; });
    cur[ks[ks.length - 1]] = v;
  };
  const formData = (form) => {
    const o = {};
    new FormData(form).forEach((v, k) => setPath(o, k, typeof v === 'string' ? v.trim() : v));
    return o;
  };
  const randomCode = (len) => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return [...crypto.getRandomValues(new Uint8Array(len))].map((b) => A[b % A.length]).join('');
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // =============================================================== Icons
  const ICONS = {
    grid: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 7h7M9 11h5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkc: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
    idcard: '<rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8Z"/>',
    play: '<path d="m6 3 14 9-14 9Z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    weight: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.93-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-9.17 4.17a2 2 0 0 1-1.66 0L2 17.5"/>',
    warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    minus: '<path d="M5 12h14"/>',
    swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    barcode: '<path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    euro: '<path d="M4 10h12M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  };
  const icon = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // =============================================================== Fachliche Konstanten
  const SHIP_STATUS = {
    draft: { l: 'Erfasst', c: '' },
    planned: { l: 'Eingeplant', c: 'violet' },
    picked: { l: 'Abgeholt', c: 'info' },
    transit: { l: 'Unterwegs', c: 'info' },
    out: { l: 'In Zustellung', c: 'violet' },
    delivered: { l: 'Zugestellt', c: 'ok' },
    failed: { l: 'Zustellproblem', c: 'bad' },
    returned: { l: 'Retour', c: 'warn' },
    cancelled: { l: 'Storniert', c: '' },
  };
  const OPEN_ST = ['draft', 'planned'];
  const MOVING_ST = ['picked', 'transit', 'out'];
  const DONE_ST = ['delivered', 'failed', 'returned', 'cancelled'];
  const TOUR_STATUS = { planned: { l: 'Geplant', c: 'violet' }, active: { l: 'Unterwegs', c: 'info' }, done: { l: 'Abgeschlossen', c: 'ok' } };
  const SERVICES = { standard: 'Standard', express: 'Express', sameday: 'Same Day', freight: 'Stückgut', pickup: 'Abholung' };
  const VEHICLE_TYPES = ['Transporter', 'Kastenwagen', 'Pritsche', 'LKW bis 7,5 t', 'LKW über 7,5 t', 'Sattelzug', 'PKW', 'Lastenrad'];
  const VEHICLE_STATUS = { active: { l: 'Einsatzbereit', c: 'ok' }, workshop: { l: 'Werkstatt', c: 'warn' }, inactive: { l: 'Außer Dienst', c: '' } };
  const ROLES = { admin: 'Admin', dispo: 'Disposition', lager: 'Lager', driver: 'Fahrer:in' };
  const COUNTRIES = ['AT', 'DE', 'CH', 'IT', 'SI', 'HU', 'CZ', 'SK', 'LI', 'HR', 'PL'];
  const COLS = ['shipments', 'tours', 'vehicles', 'drivers', 'contacts', 'settings', 'articles', 'movements', 'locations'];
  const MV_TYPES = {
    initial: 'Anfangsbestand', in: 'Wareneingang', out: 'Warenausgang', ship: 'Versand', return: 'Rücknahme',
    transfer: 'Umbuchung', correction: 'Inventur', storno: 'Storno',
  };
  const MANUAL_MV = ['initial', 'in', 'out', 'transfer', 'correction'];
  const UNITS = ['Stk', 'Karton', 'Palette', 'kg', 'l', 'm', 'm²', 'Paar', 'Set', 'Rolle', 'Sack'];
  // Ab diesen Sendungsstatus ist die Ware physisch aus dem Lager (Warenausgang gebucht)
  const STOCK_OUT_ST = ['picked', 'transit', 'out', 'delivered', 'failed'];

  const badge = (map, key) => {
    const s = map[key] || { l: key || '–', c: '' };
    return `<span class="badge ${s.c}">${esc(s.l)}</span>`;
  };
  const dueBadge = (date, label = '', warnDays = 30) => {
    if (!date) return '<span class="muted">–</span>';
    const d = daysUntil(date);
    if (d < 0) return `<span class="badge bad" title="${esc(label)}">überfällig · ${fmtDate(date)}</span>`;
    if (d <= warnDays) return `<span class="badge warn" title="${esc(label)}">in ${d} ${d === 1 ? 'Tag' : 'Tagen'} · ${fmtDate(date)}</span>`;
    return `<span class="badge ok plain">${fmtDate(date)}</span>`;
  };

  // =============================================================== Zustand
  const S = {
    authReady: false, session: null, me: null, loaded: false, schemaMissing: false, recovery: false,
    db: Object.fromEntries(COLS.map((c) => [c, new Map()])),
    rt: 'off', online: navigator.onLine,
  };
  const UI = { authTab: 'login', authMsg: null, navOpen: false, f: { shipStatus: 'open', shipQ: '', shipDate: '', tourDate: today(), q: {} } };

  const list = (col) => [...S.db[col].values()];
  const get = (col, id) => (id ? S.db[col].get(id) : undefined);
  const role = () => S.me?.user?.role;
  const isAdmin = () => role() === 'admin';
  const canPlan = () => role() === 'admin' || role() === 'dispo';
  const canStock = () => canPlan() || role() === 'lager';
  const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
  const fmtQty = (n) => new Intl.NumberFormat('de-AT', { maximumFractionDigits: 3 }).format(Number(n) || 0);

  // ---------------------------------------------------------------- Lager: Bestände
  // Bestände werden nie gespeichert, sondern immer aus den (unveränderlichen) Bewegungen berechnet –
  // so gibt es keine Konflikte, wenn mehrere Geräte gleichzeitig buchen.
  let stockCache = null;
  function stock() {
    if (stockCache) return stockCache;
    const total = new Map();
    const byLoc = new Map();
    const reserved = new Map();
    for (const m of S.db.movements.values()) {
      const q = num(m.qty);
      total.set(m.articleId, (total.get(m.articleId) || 0) + q);
      const k = `${m.articleId}|${m.locationId || ''}`;
      byLoc.set(k, (byLoc.get(k) || 0) + q);
    }
    for (const s of S.db.shipments.values()) {
      if (s.stockBooked || !OPEN_ST.includes(s.status)) continue;
      for (const it of s.items || []) reserved.set(it.articleId, (reserved.get(it.articleId) || 0) + num(it.qty));
    }
    stockCache = { total, byLoc, reserved };
    return stockCache;
  }
  const qtyOf = (aid) => r3(stock().total.get(aid) || 0);
  const qtyAt = (aid, loc) => r3(stock().byLoc.get(`${aid}|${loc || ''}`) || 0);
  const reservedOf = (aid) => r3(stock().reserved.get(aid) || 0);
  const isLow = (a) => num(a.min) > 0 && qtyOf(a.id) <= num(a.min);
  const activeArticles = () => list('articles').filter((a) => !a.archived).sort(byText((a) => a.name));
  const locations = () => [{ id: '', name: companySettings().mainLocation || 'Hauptlager' }, ...list('locations').sort(byText((l) => l.name))];
  const locName = (id) => (locations().find((l) => l.id === (id || '')) || { name: 'Lagerort gelöscht' }).name;
  const articleLabel = (a) => (a ? `${a.sku ? `${a.sku} · ` : ''}${a.name}` : '(Artikel gelöscht)');
  const companySettings = () => get('settings', 'company') || {};
  const myDriverIds = () => list('drivers').filter((d) => d.userId && d.userId === S.me?.user?.id).map((d) => d.id);

  // =============================================================== Supabase
  const CFG = window.NEXLOGISTIC_CONFIG || {};
  const configured = !!(CFG.supabaseUrl && CFG.supabaseKey);
  const sb = configured && window.supabase
    ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'nexlogistic-auth' },
    })
    : null;

  // Basisadresse der App (funktioniert auch unter einem Unterpfad)
  const appBase = () => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
  const trackUrl = (code) => `${appBase()}?track=${encodeURIComponent(code)}`;
  const isNetworkMsg = (m) => /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(String(m || ''));
  const isMissingSchema = (e) => e && (e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42P01' || /could not find the (function|table)/i.test(e.message || ''));

  async function rpc(fn, args = {}) {
    let res;
    try { res = await sb.rpc(fn, args); } catch { throw new Error('Keine Verbindung zum Server.'); }
    if (res.error) {
      if (isMissingSchema(res.error)) { S.schemaMissing = true; throw new Error('Die Datenbank für NEXLOGISTIC ist noch nicht eingerichtet.'); }
      const msg = res.error.message || 'Unbekannter Fehler';
      if (isNetworkMsg(msg)) throw new Error('Keine Verbindung zum Server.');
      if (msg === 'NO_COMPANY') { S.me = { ...S.me, company: null }; render(); throw new Error('Du gehörst keiner Firma mehr an.'); }
      throw new Error(msg);
    }
    return res.data;
  }

  // ---------------------------------------------------------------- Daten
  function putRow(row) {
    stockCache = null;
    const m = S.db[row.collection];
    if (!m) return;
    if (row.deleted || !row.data) m.delete(row.id);
    else m.set(row.id, { ...row.data, id: row.id });
  }

  async function loadAll() {
    const cid = S.me.company.id;
    const fresh = Object.fromEntries(COLS.map((c) => [c, new Map()]));
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('nl_records').select('collection,id,data,deleted')
        .eq('company_id', cid).eq('deleted', false).order('id').range(from, from + 999);
      if (error) {
        if (isMissingSchema(error)) S.schemaMissing = true;
        throw new Error(error.message);
      }
      data.forEach((row) => { if (fresh[row.collection] && row.data) fresh[row.collection].set(row.id, { ...row.data, id: row.id }); });
      if (data.length < 1000) break;
    }
    S.db = fresh;
    stockCache = null;
    S.loaded = true;
  }

  let channel = null;
  function subscribe() {
    unsubscribe();
    const cid = S.me.company.id;
    let wasDown = false;
    channel = sb.channel(`nexlogistic-${cid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nl_records', filter: `company_id=eq.${cid}` }, (p) => {
        if (p.new && p.new.collection) { putRow(p.new); scheduleRender(); }
      })
      .subscribe((status) => {
        S.rt = status;
        if (status === 'SUBSCRIBED' && wasDown) loadAll().then(scheduleRender).catch(() => {});
        if (status !== 'SUBSCRIBED') wasDown = true;
        renderConn();
      });
  }
  function unsubscribe() {
    if (channel) { sb.removeChannel(channel); channel = null; }
    S.rt = 'off';
  }

  // Speichern: optimistisch lokal, dann in Supabase. Neue Datensätze per INSERT, bestehende per UPDATE
  // (Fahrer dürfen nur ändern, nicht anlegen – ein UPSERT würde an der INSERT-Regel scheitern).
  async function save(col, obj) {
    const id = obj.id || uid();
    const prev = S.db[col].get(id);
    const data = { ...obj, id, updatedAt: new Date().toISOString() };
    if (!data.createdAt) data.createdAt = data.updatedAt;
    if (!prev && col === 'movements') data.by = S.me.user.name;
    // Sendungen mit Lagerartikeln: Warenausgang/Rücknahme automatisch passend zum Status buchen
    let stockMoves = [];
    if (col === 'shipments' && (data.items || []).length) {
      const want = STOCK_OUT_ST.includes(data.status);
      if (want !== !!data.stockBooked) {
        stockMoves = data.items.filter((it) => it.articleId && num(it.qty)).map((it) => ({
          articleId: it.articleId, qty: want ? -num(it.qty) : num(it.qty), type: want ? 'ship' : 'return',
          locationId: it.locationId || '', date: today(), unitCost: num(get('articles', it.articleId)?.cost),
          note: `Sendung ${data.number}`, shipmentId: id,
        }));
        data.stockBooked = want;
      }
    }
    S.db[col].set(id, data);
    stockCache = null;
    scheduleRender();
    const cid = S.me.company.id;
    const res = prev
      ? await sb.from('nl_records').update({ data, deleted: false }).match({ company_id: cid, collection: col, id }).select('id')
      : await sb.from('nl_records').insert({ company_id: cid, collection: col, id, data });
    if (res.error || (prev && !res.data?.length)) {
      if (prev) S.db[col].set(id, prev); else S.db[col].delete(id);
      scheduleRender();
      const msg = res.error?.message || 'Keine Berechtigung für diese Änderung.';
      throw new Error(isNetworkMsg(msg) ? 'Keine Verbindung – Änderung nicht gespeichert.' : /row-level security/i.test(msg) ? 'Keine Berechtigung für diese Änderung.' : msg);
    }
    for (const m of stockMoves) await save('movements', m);
    return data;
  }

  async function remove(col, id) {
    const prev = S.db[col].get(id);
    S.db[col].delete(id);
    stockCache = null;
    scheduleRender();
    const { error } = await sb.from('nl_records').update({ deleted: true, data: null }).match({ company_id: S.me.company.id, collection: col, id });
    if (error) {
      if (prev) S.db[col].set(id, prev);
      scheduleRender();
      throw new Error(/row-level security/i.test(error.message) ? 'Keine Berechtigung zum Löschen.' : error.message);
    }
  }

  const nextNumber = async (kind, prefix) => `${prefix}-${String(await rpc('nl_next_number', { p_kind: kind })).padStart(5, '0')}`;

  // =============================================================== Oberfläche: Bausteine
  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(type === 'bad' ? 'alert' : 'checkc')}<span>${esc(msg)}</span>`;
    $('#toast-root').append(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, type === 'bad' ? 5200 : 2800);
    setTimeout(() => el.remove(), type === 'bad' ? 5600 : 3200);
  }
  const fail = (e) => toast(e?.message || String(e), 'bad');

  const inp = (name, label, val = '', attrs = '', hint = '') =>
    `<label class="field"><span>${label}</span><input name="${name}" value="${esc(val)}" ${attrs}>${hint ? `<small>${hint}</small>` : ''}</label>`;
  const area = (name, label, val = '', attrs = '') =>
    `<label class="field"><span>${label}</span><textarea name="${name}" ${attrs}>${esc(val)}</textarea></label>`;
  const opts = (pairs, val) => pairs.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const sel = (name, label, pairs, val, attrs = '') =>
    `<label class="field"><span>${label}</span><select name="${name}" ${attrs}>${opts(pairs, val)}</select></label>`;

  // Modal mit Formular. onSubmit(form, close) – Fehler werden als Toast gezeigt, Modal bleibt offen.
  function modal({ title, body, size = '', submit = 'Speichern', cancel = 'Abbrechen', danger = false, extra = '', onSubmit, onOpen, onClose }) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-bg';
    wrap.innerHTML = `<form class="modal ${size}" novalidate>
      <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="btn ghost icon sm" data-close aria-label="Schließen">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${extra ? `<div class="left">${extra}</div>` : ''}${cancel ? `<button type="button" class="btn" data-close>${esc(cancel)}</button>` : ''}
        ${submit ? `<button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submit)}</button>` : ''}</div>
    </form>`;
    const form = $('form', wrap);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      onClose?.();
    };
    const onKey = (e) => { if (e.key === 'Escape' && root.lastElementChild === wrap) close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = $$('[required]', form).find((x) => !String(x.value).trim());
      if (invalid) { invalid.focus(); toast('Bitte fülle alle Pflichtfelder aus.', 'bad'); return; }
      if (!onSubmit) return close();
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try { if ((await onSubmit(form, close)) !== false) close(); } catch (err) { fail(err); } finally { btn.disabled = false; }
    });
    root.append(wrap);
    onOpen?.(form, close);
    const first = $('input:not([type="hidden"]):not([type="checkbox"]), select, textarea', form);
    if (first && !matchMedia('(max-width: 560px)').matches) first.focus();
    return close;
  }

  const confirmBox = (title, text, { ok = 'Bestätigen', danger = false } = {}) => new Promise((resolve) => {
    let yes = false;
    modal({
      title, size: 'sm', submit: ok, danger, body: `<p>${text}</p>`,
      onSubmit: () => { yes = true; },
      onClose: () => resolve(yes),
    });
  });

  const empty = (ic, title, text, action = '') =>
    `<div class="empty"><div class="ic">${icon(ic)}</div><b>${esc(title)}</b><p>${text}</p>${action}</div>`;

  const pageHead = (title, sub = '', actions = '', crumb = '') => `<div class="page-head"><div class="titles">${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;

  const copyText = async (t, msg = 'Kopiert.') => {
    try { await navigator.clipboard.writeText(t); toast(msg); } catch { window.prompt('Zum Kopieren:', t); }
  };

  // =============================================================== Sendungen: Berechnungen
  const pkgCount = (s) => sum(s.packages || [], (p) => Math.max(1, num(p.qty) || 1));
  const pkgWeight = (s) => sum(s.packages || [], (p) => (Math.max(1, num(p.qty) || 1)) * num(p.weight));
  const pkgVolume = (s) => sum(s.packages || [], (p) => (Math.max(1, num(p.qty) || 1)) * num(p.l) * num(p.w) * num(p.h) / 1e6);
  const addrLine = (a = {}) => [a.street, [a.zip, a.city].filter(Boolean).join(' '), a.country && a.country !== 'AT' ? a.country : ''].filter(Boolean).join(', ');
  const fmtWindow = (s) => (s.windowFrom || s.windowTo ? `${s.windowFrom || '…'}–${s.windowTo || '…'} Uhr` : '');
  const mapsUrl = (a = {}) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([a.street, a.zip, a.city, a.country].filter(Boolean).join(', '))}`;
  const shipDeliveredOn = (s) => (s.status === 'delivered' ? String(s.deliveredAt || '').slice(0, 10) : '');
  const tourStops = (t) => (t.stops || []).map((id) => get('shipments', id)).filter(Boolean);
  const tourProgress = (t) => {
    const st = tourStops(t);
    const done = st.filter((s) => DONE_ST.includes(s.status)).length;
    return { total: st.length, done, pct: st.length ? Math.round((done / st.length) * 100) : 0 };
  };

  async function setShipStatus(s, status, { place = '', note = '', pod = null } = {}) {
    const ev = { status, at: new Date().toISOString(), place, note, by: S.me.user.name };
    const next = { ...s, status, events: [...(s.events || []), ev] };
    if (pod) next.pod = pod;
    if (status === 'delivered') next.deliveredAt = ev.at;
    return save('shipments', next);
  }

  // =============================================================== Rendern
  let renderQueued = false;
  const scheduleRender = () => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  };

  function render() {
    stockCache = null;
    const app = $('#app');
    // Fokus & Cursor in Suchfeldern über das Neuzeichnen hinweg behalten
    const a = document.activeElement;
    const keep = a && app.contains(a) ? a.dataset.keep : null;
    const selStart = keep && 'selectionStart' in a ? a.selectionStart : null;

    app.innerHTML = view();

    if (keep) {
      const el = $(`[data-keep="${keep}"]`, app);
      if (el) { el.focus(); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch { /* Datumsfeld */ } }
    }
  }

  function view() {
    if (UI.trackCode !== undefined) return viewTrack();
    if (!configured || !sb) return viewMessage('Supabase ist nicht verbunden', 'In <code>public/config.js</code> fehlen Project URL und Publishable Key.');
    if (!S.authReady) return bootScreen('Anmeldung wird geprüft …');
    if (!S.session) return viewAuth();
    if (S.recovery) return viewRecovery();
    if (S.schemaMissing) return viewSetup();
    if (!S.me) return bootScreen('Profil wird geladen …');
    if (!S.me.company) return viewOnboarding();
    if (!S.loaded) return bootScreen('Daten werden geladen …');
    return viewShell();
  }

  const bootScreen = (t) => `<div class="boot"><img src="icon.svg" alt="" width="56" height="56"><span>${esc(t)}</span></div>`;
  const viewMessage = (title, text) => `<div class="auth-panel" style="min-height:100vh"><div class="auth-box"><img src="icon.svg" width="48" height="48" alt="" style="border-radius:12px;margin-bottom:18px"><h2>${esc(title)}</h2><p class="muted">${text}</p></div></div>`;

  function viewSetup() {
    return `<div class="auth-panel" style="min-height:100vh"><div class="auth-box" style="max-width:560px">
      <img src="icon.svg" width="48" height="48" alt="" style="border-radius:12px;margin-bottom:18px">
      <h2>Datenbank wird noch eingerichtet</h2>
      <p class="muted">Die Anmeldung hat geklappt – aber im Supabase-Projekt fehlen noch die NEXLOGISTIC-Tabellen.</p>
      <div class="alert violet" style="margin-bottom:16px">${icon('info')}<p>Auf GitHub unter <b>Actions → „Supabase-Datenbank“ → Run workflow</b> starten
      (braucht das Secret <code>SUPABASE_ACCESS_TOKEN</code>) – oder den Inhalt von
      <code>supabase/migrations/…_nexlogistic_init.sql</code> einmal im Supabase SQL-Editor ausführen.</p></div>
      <div class="row"><button class="btn primary" data-act="retry">${icon('undo')} Erneut prüfen</button><button class="btn ghost" data-act="logout">Abmelden</button></div>
    </div></div>`;
  }

  // ---------------------------------------------------------------- Anmeldung
  function authArt() {
    return `<div class="auth-art">
      <img src="logo-dark.svg" alt="NEXLOGISTIC by Andrerer">
      <div class="claim">
        <h1>Lager &amp; Logistik – <em>vom Regal bis zur Haustür.</em></h1>
        <p>NEXLOGISTIC ist das Lagersystem der NEX-Familie: Bestände, Wareneingang, Inventur – und die Zustellung gleich dazu.</p>
        <ul>
          <li>${icon('layers')} Lagerartikel mit Mindestbestand, mehreren Lagerorten &amp; Lagerplätzen</li>
          <li>${icon('clipboard')} Wareneingang, Umbuchung und Inventur mit Zählliste</li>
          <li>${icon('package')} Versand direkt aus dem Lager – mit Etikett, Lieferschein &amp; Tracking</li>
          <li>${icon('route')} Touren, Fahrer-App und Fuhrpark mit §57a-Pickerl</li>
        </ul>
      </div>
      <div class="fine">Ein Andrerer-Konto für alle NEX-Apps – auch für NEXCOUNT.</div>
    </div>`;
  }

  function viewAuth() {
    const t = UI.authTab;
    const msg = UI.authMsg ? `<div class="alert ${UI.authMsg.type || ''} err">${icon(UI.authMsg.type === 'bad' ? 'alert' : 'info')}<p>${esc(UI.authMsg.text)}</p></div>` : '';
    let box;
    if (t === 'forgot') {
      box = `<h2>Passwort vergessen</h2><p>Wir schicken dir einen Link zum Zurücksetzen.</p>${msg}
        <form class="form" data-form="forgot">${inp('email', 'E-Mail', '', 'type="email" autocomplete="email" required')}
        <button class="btn primary lg block">Link senden</button></form>
        <div class="switch"><a href="#" data-act="auth-tab" data-tab="login">Zurück zur Anmeldung</a></div>`;
    } else {
      box = `<h2>${t === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</h2>
        <p>${t === 'login' ? 'Melde dich mit deinem Andrerer-Konto an.' : 'In unter einer Minute startklar – kostenlos.'}</p>
        <div class="tabs2"><button type="button" class="${t === 'login' ? 'on' : ''}" data-act="auth-tab" data-tab="login">Anmelden</button><button type="button" class="${t === 'register' ? 'on' : ''}" data-act="auth-tab" data-tab="register">Registrieren</button></div>
        ${msg}
        <form class="form" data-form="${t}">
          ${t === 'register' ? inp('name', 'Dein Name', '', 'autocomplete="name" required') : ''}
          ${inp('email', 'E-Mail', '', 'type="email" autocomplete="email" required')}
          ${inp('password', 'Passwort', '', `type="password" autocomplete="${t === 'login' ? 'current-password' : 'new-password'}" required ${t === 'register' ? 'minlength="8"' : ''}`, t === 'register' ? 'Mindestens 8 Zeichen.' : '')}
          <button class="btn primary lg block">${t === 'login' ? 'Anmelden' : 'Konto erstellen'}</button>
        </form>
        ${t === 'login' ? '<div class="switch"><a href="#" data-act="auth-tab" data-tab="forgot">Passwort vergessen?</a></div>' : '<div class="switch"><small>Du hast schon ein NEXCOUNT-Konto? Dann einfach anmelden.</small></div>'}`;
    }
    return `<div class="auth">${authArt()}<div class="auth-panel"><div class="auth-box">
      <img class="logo-m" src="logo.svg" alt="NEXLOGISTIC">${box}
      <div class="track-mini"><h3 style="margin-bottom:8px">Sendung verfolgen</h3>
        <form class="row" data-form="track-go"><input name="code" placeholder="Tracking-Nummer, z. B. NL7K3QF9X2AB" autocomplete="off"><button class="btn">${icon('search')}</button></form></div>
    </div></div></div>`;
  }

  function viewRecovery() {
    return `<div class="auth">${authArt()}<div class="auth-panel"><div class="auth-box">
      <img class="logo-m" src="logo.svg" alt="NEXLOGISTIC"><h2>Neues Passwort</h2><p>Lege ein neues Passwort für dein Konto fest.</p>
      <form class="form" data-form="recovery">${inp('password', 'Neues Passwort', '', 'type="password" autocomplete="new-password" minlength="8" required', 'Mindestens 8 Zeichen.')}
      <button class="btn primary lg block">Passwort speichern</button></form></div></div></div>`;
  }

  const authError = (m) => {
    m = String(m || '');
    if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort ist falsch.';
    if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der Bestätigungsmail).';
    if (/already registered|already been registered/i.test(m)) return 'Diese E-Mail ist bereits registriert – melde dich einfach an (auch NEXCOUNT-Konten funktionieren).';
    if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche – bitte warte kurz und versuche es dann erneut.';
    if (/password.*(at least|short|weak)/i.test(m)) return 'Das Passwort ist zu kurz oder zu schwach (mindestens 8 Zeichen).';
    if (isNetworkMsg(m)) return 'Keine Verbindung zum Server.';
    return m;
  };

  // ---------------------------------------------------------------- Firma anlegen / beitreten
  function viewOnboarding() {
    const name = S.me.user.name || '';
    return `<div class="auth">${authArt()}<div class="auth-panel"><div class="auth-box" style="max-width:440px">
      <img class="logo-m" src="logo.svg" alt="NEXLOGISTIC">
      <h2>Hallo${name ? ` ${esc(name.split(' ')[0])}` : ''}!</h2>
      <p>Lege deine Firma an oder tritt mit einem Einladungscode einem bestehenden Team bei.</p>
      <div class="card"><div class="card-body">
        <h3 style="margin-bottom:12px">${icon('building')} Neue Firma anlegen</h3>
        <form class="form" data-form="create-company">
          ${inp('company', 'Firmenname', '', 'required maxlength="120" placeholder="z. B. Huber Transporte e.U."')}
          ${name ? '' : inp('name', 'Dein Name', '', 'required maxlength="80"')}
          <button class="btn primary block">Firma anlegen</button>
        </form>
      </div></div>
      <div class="card"><div class="card-body">
        <h3 style="margin-bottom:12px">${icon('users')} Team beitreten</h3>
        <form class="form" data-form="join-company">
          ${inp('code', 'Einladungscode', '', 'required placeholder="NL…" autocomplete="off" style="text-transform:uppercase"', 'Den Code bekommst du von der Administration deiner Firma.')}
          ${name ? '' : inp('name', 'Dein Name', '', 'required maxlength="80"')}
          <button class="btn block">Beitreten</button>
        </form>
      </div></div>
      <div class="switch"><a href="#" data-act="logout">Abmelden (${esc(S.me.user.email || '')})</a></div>
    </div></div></div>`;
  }

  // ---------------------------------------------------------------- App-Rahmen
  const route = () => {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || (canStock() ? 'dashboard' : 'my'), id: parts[1] };
  };

  function navItems() {
    const t = today();
    const open = list('shipments').filter((s) => !DONE_ST.includes(s.status)).length;
    const toursToday = list('tours').filter((x) => x.date === t && x.status !== 'done').length;
    const mine = myDriverIds().length > 0;
    const low = activeArticles().filter(isLow).length;
    const items = [];
    if (canStock()) {
      items.push(['', [['dashboard', 'Übersicht', 'grid']]]);
      items.push(['Lager', [['stock', 'Bestand', 'layers', low], ['moves', 'Bewegungen', 'swap'], ['inventory', 'Inventur', 'clipboard'], ['locations', 'Lagerorte', 'warehouse']]]);
      items.push(['Logistik', [['shipments', 'Sendungen', 'package', open], ...(canPlan() ? [['tours', 'Touren', 'route', toursToday]] : []), ...(mine ? [['my', 'Meine Tour', 'nav']] : [])]]);
      items.push(['Stammdaten', [...(canPlan() ? [['fleet', 'Fuhrpark', 'truck'], ['drivers', 'Fahrer:innen', 'idcard']] : []), ['contacts', 'Kontakte', 'book']]]);
      items.push(['Verwaltung', [['team', 'Team', 'users'], ...(canPlan() ? [['settings', 'Einstellungen', 'sliders']] : [])]]);
    } else {
      items.push(['', [['my', 'Meine Tour', 'nav'], ['shipments', 'Sendungen', 'package', open]]]);
      items.push(['Verwaltung', [['team', 'Team', 'users']]]);
    }
    return items;
  }

  const ROUTE_PARENT = { shipment: 'shipments', tour: 'tours', article: 'stock' };

  function viewShell() {
    const r = route();
    const active = ROUTE_PARENT[r.name] || r.name;
    const nav = navItems().map(([group, items]) => `${group ? `<div class="nav-group">${group}</div>` : ''}<nav class="nav">${items.map(([k, l, ic, n]) =>
      `<a href="#/${k}" class="${active === k ? 'active' : ''}">${icon(ic)}<span>${l}</span>${n ? `<span class="count">${n}</span>` : ''}</a>`).join('')}</nav>`).join('');
    const u = S.me.user;
    return `<div class="shell ${UI.navOpen ? 'nav-open' : ''}">
      <aside class="side">
        <div class="brand"><img src="logo-dark.svg" alt="NEXLOGISTIC by Andrerer"></div>
        <div class="company"><b>${esc(S.me.company.name)}</b><span>${esc(ROLES[u.role] || '')}</span></div>
        ${nav}
        <div class="foot">
          <a class="user" href="#/account"><span class="avatar">${esc(initials(u.name))}</span><span class="grow"><b>${esc(u.name)}</b><span>Mein Konto</span></span></a>
          <div class="conn" id="conn">${connHtml()}</div>
        </div>
      </aside>
      <div class="main">
        <div class="topbar"><img src="logo-dark.svg" alt="NEXLOGISTIC"><button class="btn icon sm burger" data-act="nav-toggle" aria-label="Menü">${icon('menu')}</button></div>
        <main class="content">${viewRoute(r)}</main>
      </div>
    </div>`;
  }

  const connHtml = () => {
    if (!S.online) return '<span class="dot off"></span>Offline';
    if (S.rt === 'SUBSCRIBED') return '<span class="dot"></span>Live verbunden';
    return '<span class="dot wait"></span>Verbinde …';
  };
  const renderConn = () => { const el = $('#conn'); if (el) el.innerHTML = connHtml(); };

  function viewRoute(r) {
    const V = {
      dashboard: viewDashboard, shipments: viewShipments, shipment: viewShipment, tours: viewTours, tour: viewTour,
      fleet: viewFleet, drivers: viewDrivers, contacts: viewContacts, my: viewMyTour, team: viewTeam,
      settings: viewSettings, account: viewAccount,
      stock: viewStock, article: viewArticle, moves: viewMoves, inventory: viewInventory, locations: viewLocations,
    };
    const planOnly = ['tours', 'tour', 'fleet', 'drivers', 'settings'];
    const stockOnly = ['dashboard', 'stock', 'article', 'moves', 'inventory', 'locations', 'contacts'];
    if (!V[r.name] || (planOnly.includes(r.name) && !canPlan()) || (stockOnly.includes(r.name) && !canStock())) return empty('alert', 'Seite nicht gefunden', 'Diese Seite gibt es nicht oder du hast keinen Zugriff.', '<a class="btn" href="#/">Zur Startseite</a>');
    return V[r.name](r.id);
  }

  // ---------------------------------------------------------------- Übersicht
  function viewDashboard() {
    const t = today();
    const ships = list('shipments');
    const dueToday = ships.filter((s) => s.deliveryDate === t && !DONE_ST.includes(s.status));
    const moving = ships.filter((s) => MOVING_ST.includes(s.status));
    const deliveredToday = ships.filter((s) => shipDeliveredOn(s) === t);
    const problems = ships.filter((s) => s.status === 'failed' || s.status === 'returned');
    const unplanned = ships.filter((s) => s.status === 'draft' && !s.tourId).sort(byText((s) => s.deliveryDate || '9999'));
    const toursToday = list('tours').filter((x) => x.date === t).sort(byText((x) => x.start || x.number));
    const first = S.me.user.name.split(' ')[0];
    const hour = new Date().getHours();
    const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';

    const arts = activeArticles();
    if (!ships.length && !arts.length && !list('tours').length && !list('vehicles').length) {
      return `${pageHead(`${hello}, ${esc(first)}`, `${fmtDay(t)} · ${esc(S.me.company.name)}`)}
        <div class="card"><div class="card-body">${empty('warehouse', 'Willkommen in deinem Lager',
          'Lege Lagerartikel mit Anfangsbestand und Mindestbestand an, buche Wareneingänge und versende Ware direkt aus dem Lager – oder lade Beispieldaten, um NEXLOGISTIC in Ruhe auszuprobieren.',
          `<div class="row wrap" style="justify-content:center;margin-top:14px"><button class="btn primary" data-act="art-new">${icon('plus')} Erster Lagerartikel</button>
           ${canPlan() ? `<button class="btn" data-act="ship-new">${icon('package')} Neue Sendung</button>` : ''}
           ${isAdmin() ? `<button class="btn" data-act="demo">${icon('activity')} Beispieldaten laden</button>` : ''}</div>`)}</div></div>`;
    }
    const lowArts = arts.filter(isLow).sort((a, b) => qtyOf(a.id) / (num(a.min) || 1) - qtyOf(b.id) / (num(b.min) || 1));
    const stockValue = sum(arts, (a) => Math.max(0, qtyOf(a.id)) * num(a.cost));
    const units = sum(arts, (a) => Math.max(0, qtyOf(a.id)));
    const moves = list('movements').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 7);

    // Fälligkeiten Fuhrpark & Fahrer
    const due = [];
    list('vehicles').forEach((v) => {
      [['inspectionDue', '§57a-Pickerl'], ['serviceDue', 'Service']].forEach(([k, l]) => {
        if (v[k] && daysUntil(v[k]) <= 30) due.push({ date: v[k], text: `${l} · ${v.plate}`, href: '#/fleet', ic: 'truck' });
      });
    });
    list('drivers').filter((d) => d.active !== false).forEach((d) => {
      [['licenseExpiry', 'Führerschein'], ['c95Expiry', 'Code 95']].forEach(([k, l]) => {
        if (d[k] && daysUntil(d[k]) <= 60) due.push({ date: d[k], text: `${l} · ${d.name}`, href: '#/drivers', ic: 'idcard', warn: 60 });
      });
    });
    due.sort(byText((x) => x.date));

    const events = ships.flatMap((s) => (s.events || []).map((e) => ({ ...e, s }))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 7);

    return `${pageHead(`${hello}, ${esc(first)}`, `${fmtDay(t)} · ${esc(S.me.company.name)}`,
      `<button class="btn" data-act="move-new" data-type="in">${icon('download')} Wareneingang</button>
       ${canPlan() ? `<button class="btn primary" data-act="ship-new">${icon('plus')} Neue Sendung</button>` : `<button class="btn primary" data-act="move-new" data-type="out">${icon('minus')} Warenausgang</button>`}`)}
      <div class="kpis">
        <div class="kpi hero"><div class="label"><span class="ic">${icon('euro')}</span>Lagerwert</div><div class="value">${money(stockValue)}</div><div class="sub">${fmtQty(units)} Einheiten · ${arts.length} Artikel</div></div>
        <div class="kpi"><div class="label"><span class="ic">${icon('alert')}</span>Nachbestellen</div><div class="value" style="${lowArts.length ? 'color:var(--bad)' : ''}">${lowArts.length}</div><div class="sub">am oder unter Mindestbestand</div></div>
        <div class="kpi"><div class="label"><span class="ic">${icon('calendar')}</span>Heute zu versenden</div><div class="value">${dueToday.length}</div><div class="sub">${dueToday.filter((s) => !s.tourId).length} davon noch ohne Tour</div></div>
        <div class="kpi"><div class="label"><span class="ic">${icon('truck')}</span>Unterwegs</div><div class="value">${moving.length}</div><div class="sub">${deliveredToday.length} heute zugestellt${problems.length ? ` · <b style="color:var(--bad)">${problems.length} Problem${problems.length === 1 ? '' : 'e'}</b>` : ''}</div></div>
      </div>
      <div class="grid g-main">
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Nachbestellen</h2><a class="btn sm" href="#/stock" data-act="stock-low">Alle anzeigen</a></div>
            ${lowArts.length ? `<div class="table-wrap"><table><thead><tr><th>Artikel</th><th class="hide-m">Lagerort</th><th style="width:34%">Bestand</th><th></th></tr></thead><tbody>
              ${lowArts.slice(0, 6).map((a) => {
                const q = qtyOf(a.id);
                return `<tr class="click" data-href="#/article/${esc(a.id)}"><td><div class="t1">${esc(a.name)}</div><div class="t2">${esc(a.sku || '')}</div></td>
                  <td class="hide-m">${esc(locName(a.locationId))}${a.bin ? ` · ${esc(a.bin)}` : ''}</td>
                  <td><div class="row" style="font-size:13px;margin-bottom:5px"><b style="color:var(--bad)">${fmtQty(q)}</b><span class="muted">/ ${fmtQty(a.min)} ${esc(a.unit || '')}</span></div>
                    <div class="progress over"><i style="width:${Math.max(4, Math.min(100, (q / num(a.min)) * 100))}%"></i></div></td>
                  <td class="right"><button class="btn sm" data-act="move-new" data-type="in" data-id="${esc(a.id)}">${icon('plus')} Eingang</button></td></tr>`;
              }).join('')}</tbody></table></div>`
              : `<div class="card-body">${empty('checkc', arts.length ? 'Alles ausreichend vorrätig' : 'Noch keine Lagerartikel', arts.length ? 'Kein Artikel liegt am oder unter seinem Mindestbestand.' : 'Lege Artikel an, um Bestände zu führen.')}</div>`}
          </div>
          ${canPlan() ? `<div class="card"><div class="card-head"><h2>Touren heute</h2><a class="btn sm" href="#/tours">Alle Touren</a></div>
            <div class="card-body">${toursToday.length ? `<div class="tours-grid">${toursToday.map(tourCard).join('')}</div>`
              : empty('route', 'Heute keine Touren', 'Plane eine Tour und weise Sendungen zu.', `<button class="btn primary sm" data-act="tour-new" data-date="${t}">${icon('plus')} Tour planen</button>`)}</div></div>` : ''}
          <div class="card"><div class="card-head"><h2>Noch nicht eingeplant</h2><span class="badge violet plain">${unplanned.length}</span></div>
            ${unplanned.length ? `<div class="table-wrap"><table><thead><tr><th>Sendung</th><th>Empfänger</th><th>Zustellung</th><th class="num">Gewicht</th></tr></thead><tbody>
              ${unplanned.slice(0, 8).map((s) => `<tr class="click" data-href="#/shipment/${esc(s.id)}"><td><div class="t1">${esc(s.number)}</div><div class="t2">${esc(SERVICES[s.service] || '')}</div></td>
                <td><div class="t1">${esc(s.recipient?.name)}</div><div class="t2">${esc([s.recipient?.zip, s.recipient?.city].filter(Boolean).join(' '))}</div></td>
                <td>${s.deliveryDate ? `<span class="${daysUntil(s.deliveryDate) < 0 ? 'badge bad plain' : ''}">${fmtDay(s.deliveryDate)}</span>` : '<span class="muted">offen</span>'}</td><td class="num">${fmtKg(pkgWeight(s))}</td></tr>`).join('')}
            </tbody></table></div>` : `<div class="card-body">${empty('checkc', 'Alles eingeplant', 'Jede offene Sendung ist einer Tour zugewiesen.')}</div>`}
          </div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Letzte Lagerbewegungen</h2><a class="btn sm" href="#/moves">Alle</a></div>
            ${moves.length ? `<div class="list">${moves.map(moveItem).join('')}</div>` : '<div class="card-body"><p class="muted" style="margin:0">Noch keine Bewegungen.</p></div>'}
          </div>
          ${canPlan() ? `<div class="card"><div class="card-head"><h2>Fälligkeiten</h2></div>
            ${due.length ? `<div class="list">${due.slice(0, 8).map((d) => `<a class="item" href="${d.href}">${icon(d.ic)}<span class="grow">${esc(d.text)}</span>${dueBadge(d.date, '', d.warn || 30)}</a>`).join('')}</div>`
              : `<div class="card-body"><p class="muted" style="margin:0">Keine Pickerl-, Service- oder Führerscheintermine in den nächsten Wochen.</p></div>`}
          </div>` : ''}
          <div class="card"><div class="card-head"><h2>Letzte Sendungsereignisse</h2></div>
            ${events.length ? `<div class="card-body"><ul class="timeline">${events.map((e) => `<li><b><a href="#/shipment/${esc(e.s.id)}">${esc(e.s.number)}</a> · ${esc(SHIP_STATUS[e.status]?.l || e.status)}</b><small>${fmtTime(e.at)}${e.by ? ` · ${esc(e.by)}` : ''}</small></li>`).join('')}</ul></div>`
              : '<div class="card-body"><p class="muted" style="margin:0">Noch keine Aktivitäten.</p></div>'}
          </div>
        </div>
      </div>`;
  }

  function tourCard(t) {
    const p = tourProgress(t);
    const drv = get('drivers', t.driverId);
    const veh = get('vehicles', t.vehicleId);
    return `<a class="tour-card" href="#/tour/${esc(t.id)}">
      <div class="top"><b class="grow">${esc(t.name || t.number)}</b>${badge(TOUR_STATUS, t.status)}</div>
      <div class="t2 muted">${esc(t.number)}${t.start ? ` · ab ${esc(t.start)} Uhr` : ''}</div>
      <div class="meta"><span>${icon('user')}${esc(drv?.name || 'kein Fahrer')}</span><span>${icon('truck')}${esc(veh?.plate || 'kein Fahrzeug')}</span><span>${icon('package')}${p.total} Stopps</span></div>
      <div class="progress"><i style="width:${p.pct}%"></i></div>
      <div class="t2 muted" style="margin-top:6px">${p.done} von ${p.total} erledigt</div>
    </a>`;
  }

  // ---------------------------------------------------------------- Sendungen: Liste
  const SHIP_FILTERS = [
    ['open', 'Offen', (s) => OPEN_ST.includes(s.status)],
    ['moving', 'Unterwegs', (s) => MOVING_ST.includes(s.status)],
    ['delivered', 'Zugestellt', (s) => s.status === 'delivered'],
    ['problem', 'Probleme', (s) => s.status === 'failed' || s.status === 'returned'],
    ['cancelled', 'Storniert', (s) => s.status === 'cancelled'],
    ['all', 'Alle', () => true],
  ];

  function viewShipments() {
    const f = UI.f;
    const all = list('shipments');
    const flt = SHIP_FILTERS.find((x) => x[0] === f.shipStatus) || SHIP_FILTERS[0];
    const q = f.shipQ.toLowerCase();
    const rows = all.filter(flt[2])
      .filter((s) => !f.shipDate || s.deliveryDate === f.shipDate)
      .filter((s) => !q || [s.number, s.trackingCode, s.reference, s.recipient?.name, s.recipient?.city, s.recipient?.zip, s.sender?.name].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => String(b.deliveryDate || '').localeCompare(String(a.deliveryDate || '')) || String(b.number).localeCompare(String(a.number)));
    const chips = SHIP_FILTERS.map(([k, l, fn]) => `<button class="chip ${f.shipStatus === k ? 'on' : ''}" data-act="ship-filter" data-k="${k}">${l}<span class="n">${all.filter(fn).length}</span></button>`).join('');
    return `${pageHead('Sendungen', 'Alle Aufträge mit Status, Tour und Sendungsverfolgung.', canPlan() ? `<button class="btn primary" data-act="ship-new">${icon('plus')} Neue Sendung</button>` : '')}
      <div class="card">
        <div class="toolbar">
          <label class="search">${icon('search')}<input type="search" placeholder="Nummer, Empfänger, Ort, Referenz …" value="${esc(f.shipQ)}" data-keep="shipQ" data-filter="shipQ"></label>
          <input type="date" value="${esc(f.shipDate)}" data-filter="shipDate" title="Zustelldatum">
          ${f.shipDate ? `<button class="btn ghost sm" data-act="clear-ship-date">${icon('x')} Datum</button>` : ''}
          <div class="chips">${chips}</div>
        </div>
        ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Sendung</th><th>Empfänger</th><th class="hide-m">Zustellung</th><th class="num hide-m">Pakete</th><th class="hide-m">Tour</th><th>Status</th></tr></thead><tbody>
          ${rows.map((s) => {
            const tour = get('tours', s.tourId);
            return `<tr class="click" data-href="#/shipment/${esc(s.id)}">
              <td><div class="t1">${esc(s.number)}</div><div class="t2 mono">${esc(s.trackingCode)}</div></td>
              <td><div class="t1">${esc(s.recipient?.name)}</div><div class="t2">${esc([s.recipient?.zip, s.recipient?.city].filter(Boolean).join(' '))}</div></td>
              <td class="hide-m"><div>${s.deliveryDate ? fmtDay(s.deliveryDate) : '<span class="muted">offen</span>'}</div><div class="t2">${esc(fmtWindow(s))}${s.service && s.service !== 'standard' ? ` · ${esc(SERVICES[s.service])}` : ''}</div></td>
              <td class="num hide-m">${pkgCount(s)} · ${fmtKg(pkgWeight(s))}</td>
              <td class="hide-m">${tour ? esc(tour.name || tour.number) : '<span class="muted">–</span>'}</td>
              <td>${badge(SHIP_STATUS, s.status)}</td></tr>`;
          }).join('')}</tbody></table></div>`
          : empty('package', all.length ? 'Keine Treffer' : 'Noch keine Sendungen', all.length ? 'Passe Suche oder Filter an.' : 'Lege deine erste Sendung an – Etikett und Tracking-Link gibt’s automatisch.',
            !all.length && canPlan() ? `<button class="btn primary" data-act="ship-new">${icon('plus')} Neue Sendung</button>` : '')}
      </div>`;
  }

  // ---------------------------------------------------------------- Sendung: Detail
  function viewShipment(id) {
    const s = get('shipments', id);
    if (!s) return empty('package', 'Sendung nicht gefunden', 'Sie wurde vielleicht gelöscht.', '<a class="btn" href="#/shipments">Zu den Sendungen</a>');
    const tour = get('tours', s.tourId);
    const drv = tour && get('drivers', tour.driverId);
    const evs = [...(s.events || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const addr = (a = {}, title) => `<div class="card"><div class="card-head"><h2>${title}</h2></div><div class="card-body addr-block">
      <b>${esc(a.name || '–')}</b>${a.contact ? `<br>z. H. ${esc(a.contact)}` : ''}<br>${esc(a.street || '')}<br>${esc([a.country, a.zip].filter(Boolean).join('-'))} ${esc(a.city || '')}
      ${a.phone ? `<br><a href="tel:${esc(a.phone)}">${icon('phone')} ${esc(a.phone)}</a>` : ''}${a.email ? `<br><a href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : ''}</div></div>`;
    const editable = canPlan();
    return `${pageHead(`${esc(s.number)} ${badge(SHIP_STATUS, s.status)}`, `${esc(SERVICES[s.service] || 'Standard')} · ${pkgCount(s)} ${pkgCount(s) === 1 ? 'Paket' : 'Pakete'} · ${fmtKg(pkgWeight(s))}${s.reference ? ` · Ref. ${esc(s.reference)}` : ''}`,
      `<button class="btn" data-act="print-label" data-id="${esc(s.id)}">${icon('print')} Etikett</button>
       <button class="btn" data-act="print-note" data-id="${esc(s.id)}">${icon('print')} Lieferschein</button>
       ${editable ? `<button class="btn" data-act="ship-edit" data-id="${esc(s.id)}">${icon('edit')} Bearbeiten</button>` : ''}
       <button class="btn primary" data-act="ship-status" data-id="${esc(s.id)}">${icon('activity')} Status ändern</button>`,
      '<a href="#/shipments">Sendungen</a> /')}
      <div class="grid g-main">
        <div class="stack">
          <div class="grid g2">${addr(s.sender, 'Absender')}${addr(s.recipient, 'Empfänger')}</div>
          ${(s.items || []).length ? `<div class="card"><div class="card-head"><h2>Ware aus dem Lager</h2>${s.stockBooked ? '<span class="badge ok">ausgebucht</span>' : DONE_ST.includes(s.status) ? '' : '<span class="badge violet">reserviert</span>'}</div>
            <div class="table-wrap"><table><thead><tr><th>Artikel</th>${multiLoc() ? '<th>Lagerort</th>' : ''}<th class="num">Menge</th><th class="num">Bestand jetzt</th></tr></thead><tbody>
            ${s.items.map((it) => { const a = get('articles', it.articleId); return `<tr><td>${a ? `<a href="#/article/${esc(a.id)}"><b>${esc(a.name)}</b></a><div class="t2">${esc(a.sku || '')}${a.bin ? ` · Platz ${esc(a.bin)}` : ''}</div>` : '<span class="muted">(Artikel gelöscht)</span>'}</td>
              ${multiLoc() ? `<td>${esc(locName(it.locationId))}</td>` : ''}<td class="num"><b>${fmtQty(it.qty)}</b> ${esc(a?.unit || '')}</td><td class="num">${a ? stockCell(a) : '–'}</td></tr>`; }).join('')}
            </tbody></table></div></div>` : ''}
          <div class="card"><div class="card-head"><h2>Packstücke</h2><span class="muted">${fmtM3(pkgVolume(s))}</span></div>
            <div class="table-wrap"><table><thead><tr><th>Inhalt</th><th class="num">Anzahl</th><th class="num">Gewicht/Stk.</th><th class="num">Maße (L×B×H cm)</th></tr></thead><tbody>
            ${(s.packages || []).map((p) => `<tr><td>${esc(p.desc || 'Paket')}</td><td class="num">${Math.max(1, num(p.qty) || 1)}</td><td class="num">${fmtKg(p.weight)}</td><td class="num">${[p.l, p.w, p.h].every((x) => num(x)) ? `${num(p.l)}×${num(p.w)}×${num(p.h)}` : '–'}</td></tr>`).join('')
              || '<tr><td colspan="4" class="muted">Keine Packstücke erfasst.</td></tr>'}
            </tbody></table></div></div>
          <div class="card"><div class="card-head"><h2>Details</h2></div><div class="card-body"><dl class="kv">
            <dt>Abholung</dt><dd>${s.pickupDate ? fmtDay(s.pickupDate) : '–'}</dd>
            <dt>Zustellung</dt><dd>${s.deliveryDate ? fmtDay(s.deliveryDate) : '–'} ${esc(fmtWindow(s))}</dd>
            <dt>Tour</dt><dd>${tour ? `<a href="#/tour/${esc(tour.id)}">${esc(tour.name || tour.number)}</a> · ${fmtDate(tour.date)}${drv ? ` · ${esc(drv.name)}` : ''}` : '<span class="muted">nicht eingeplant</span>'}</dd>
            ${num(s.cod) ? `<dt>Nachnahme</dt><dd><b>${money(s.cod)}</b></dd>` : ''}
            ${num(s.value) ? `<dt>Warenwert</dt><dd>${money(s.value)}</dd>` : ''}
            <dt>Hinweise</dt><dd>${s.notes ? esc(s.notes).replace(/\n/g, '<br>') : '<span class="muted">–</span>'}</dd>
            <dt>Erstellt</dt><dd>${fmtTime(s.createdAt)}</dd>
          </dl></div></div>
          ${s.pod ? `<div class="card"><div class="card-head"><h2>Zustellnachweis</h2>${badge(SHIP_STATUS, 'delivered')}</div><div class="card-body"><dl class="kv">
            <dt>Übernommen von</dt><dd><b>${esc(s.pod.name || '–')}</b></dd><dt>Zeitpunkt</dt><dd>${fmtTime(s.pod.at)}</dd>${s.pod.note ? `<dt>Notiz</dt><dd>${esc(s.pod.note)}</dd>` : ''}</dl></div></div>` : ''}
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Sendungsverfolgung</h2></div><div class="card-body">
            <div class="code-box"><span class="mono">${esc(s.trackingCode)}</span><button class="btn ghost icon sm" data-act="copy" data-text="${esc(s.trackingCode)}" title="Kopieren">${icon('copy')}</button></div>
            <div class="row" style="margin-top:10px"><button class="btn sm grow" data-act="copy" data-text="${esc(trackUrl(s.trackingCode))}" data-msg="Tracking-Link kopiert.">${icon('link')} Link kopieren</button>
            <a class="btn sm" href="${esc(trackUrl(s.trackingCode))}" target="_blank" rel="noopener">${icon('ext')} Öffnen</a></div>
            <p class="muted" style="margin:10px 0 0;font-size:12.5px">Den Link kannst du an Empfänger:innen schicken – er zeigt nur Status und Ort, keine Namen oder Adressen.</p>
          </div></div>
          <div class="card"><div class="card-head"><h2>Verlauf</h2></div><div class="card-body">
            ${evs.length ? `<ul class="timeline">${evs.map((e, i) => `<li class="${i === 0 ? 'cur' : ''}"><b>${esc(SHIP_STATUS[e.status]?.l || e.status)}</b><small>${fmtTime(e.at)}${e.place ? ` · ${esc(e.place)}` : ''}${e.by ? ` · ${esc(e.by)}` : ''}</small>${e.note ? `<small>${esc(e.note)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Noch kein Verlauf.</p>'}
          </div></div>
          ${editable ? `<div class="row"><button class="btn danger sm" data-act="ship-delete" data-id="${esc(s.id)}">${icon('trash')} Löschen</button></div>` : ''}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- Sendung: Formular
  function addressFields(prefix, a = {}, withEmail = false) {
    const sources = [['', 'Übernehmen aus …'], ['__company', `Eigene Firma / Depot`], ...list('contacts').sort(byText((c) => c.name)).map((c) => [c.id, `${c.name}${c.city ? ` · ${c.city}` : ''}`])];
    return `<div class="row" style="justify-content:flex-end;margin-top:-4px"><select data-fill="${prefix}" style="width:auto;max-width:100%;height:32px;font-size:12.5px">${opts(sources, '')}</select></div>
      <div class="cols">${inp(`${prefix}.name`, 'Name / Firma *', a.name, 'required maxlength="120"')}${inp(`${prefix}.contact`, 'Ansprechperson', a.contact, 'maxlength="80"')}</div>
      ${inp(`${prefix}.street`, 'Straße & Hausnummer', a.street, 'maxlength="120" autocomplete="off"')}
      <div class="cols-zip">${inp(`${prefix}.zip`, 'PLZ', a.zip, 'maxlength="10" inputmode="numeric"')}${inp(`${prefix}.city`, 'Ort *', a.city, 'required maxlength="80"')}${sel(`${prefix}.country`, 'Land', COUNTRIES.map((c) => [c, c]), a.country || 'AT')}</div>
      <div class="cols">${inp(`${prefix}.phone`, 'Telefon', a.phone, 'type="tel" maxlength="40"')}${withEmail ? inp(`${prefix}.email`, 'E-Mail', a.email, 'type="email" maxlength="120"') : '<span></span>'}</div>`;
  }
  const pkgRow = (p = {}) => `<tr data-pkg>
    <td><input data-k="desc" value="${esc(p.desc || '')}" placeholder="z. B. Karton" maxlength="80"></td>
    <td><input data-k="qty" value="${esc(p.qty ?? 1)}" inputmode="numeric" style="width:64px"></td>
    <td><input data-k="weight" value="${esc(p.weight ?? '')}" inputmode="decimal" placeholder="kg" style="width:80px"></td>
    <td><div class="row" style="gap:4px"><input data-k="l" value="${esc(p.l ?? '')}" inputmode="numeric" placeholder="L" style="width:58px"><input data-k="w" value="${esc(p.w ?? '')}" inputmode="numeric" placeholder="B" style="width:58px"><input data-k="h" value="${esc(p.h ?? '')}" inputmode="numeric" placeholder="H" style="width:58px"></div></td>
    <td><button type="button" class="btn ghost icon sm" data-rm-pkg title="Entfernen">${icon('x')}</button></td></tr>`;

  function companyAddress() {
    const c = companySettings();
    const d = c.depot && c.depot.street ? c.depot : c;
    return { name: S.me.company.name, street: d.street || '', zip: d.zip || '', city: d.city || '', country: d.country || 'AT', phone: c.phone || '' };
  }

  const itemRow = (it = {}, locked = false) => `<tr data-item>
    <td><select data-k="articleId" style="min-width:220px" ${locked ? 'disabled' : ''}>${articleOptions(it.articleId || '')}</select></td>
    <td><input data-k="qty" value="${esc(it.qty ?? '')}" inputmode="decimal" placeholder="Menge" style="width:90px" ${locked ? 'disabled' : ''}></td>
    ${multiLoc() ? `<td><select data-k="locationId" ${locked ? 'disabled' : ''}>${locOpts(it.locationId ?? (get('articles', it.articleId)?.locationId || ''))}</select></td>` : ''}
    <td>${locked ? '' : `<button type="button" class="btn ghost icon sm" data-rm-item title="Entfernen">${icon('x')}</button>`}</td></tr>`;

  function shipmentForm(existing = null, preset = {}) {
    const s = existing || { service: 'standard', status: 'draft', sender: companyAddress(), recipient: { country: 'AT' }, packages: [{ qty: 1 }], deliveryDate: addDays(today(), 1), ...preset };
    const locked = !!s.stockBooked;
    const withItems = activeArticles().length > 0 || (s.items || []).length > 0;
    const itemsBlock = withItems ? `<fieldset><legend>Ware aus dem Lager</legend>
          ${locked ? `<div class="alert">${icon('info')}<p>Die Ware ist bereits ausgebucht – Positionen sind gesperrt. Setze den Status zurück auf „Erfasst“, um sie zu ändern.</p></div>` : '<small class="muted">Wird beim Status „Abgeholt“ bzw. beim Tourstart automatisch aus dem Lager ausgebucht und bis dahin reserviert.</small>'}
          <div class="table-wrap"><table><thead><tr><th>Artikel</th><th>Menge</th>${multiLoc() ? '<th>aus Lagerort</th>' : ''}<th></th></tr></thead>
          <tbody data-items>${(s.items || []).map((it) => itemRow(it, locked)).join('') || (locked ? '' : itemRow())}</tbody></table></div>
          ${locked ? '' : `<div><button type="button" class="btn sm" data-add-item>${icon('plus')} Artikel</button></div>`}
        </fieldset>` : '';
    modal({
      title: existing ? `Sendung ${s.number} bearbeiten` : 'Neue Sendung', size: 'lg', submit: existing ? 'Speichern' : 'Sendung anlegen',
      body: `<div class="form">
        <div class="cols3">${sel('service', 'Service', Object.entries(SERVICES), s.service)}${inp('reference', 'Referenz / Auftragsnr.', s.reference, 'maxlength="60"')}
          ${sel('customerId', 'Auftraggeber', [['', '– kein –'], ...list('contacts').filter((c) => c.type !== 'partner').sort(byText((c) => c.name)).map((c) => [c.id, c.name])], s.customerId)}</div>
        <div class="cols"><fieldset><legend>Absender</legend>${addressFields('sender', s.sender)}</fieldset>
        <fieldset><legend>Empfänger</legend>${addressFields('recipient', s.recipient, true)}
          ${existing ? '' : '<label class="check"><input type="checkbox" name="saveContact" value="1"> Als Kontakt speichern</label>'}</fieldset></div>
        ${itemsBlock}
        <fieldset><legend>Packstücke</legend>
          <div class="table-wrap"><table class="pkg-table"><thead><tr><th>Inhalt</th><th>Anzahl</th><th>Gewicht/Stk.</th><th>Maße in cm</th><th></th></tr></thead>
          <tbody data-pkgs>${(s.packages?.length ? s.packages : [{ qty: 1 }]).map(pkgRow).join('')}</tbody></table></div>
          <div><button type="button" class="btn sm" data-add-pkg>${icon('plus')} Packstück</button></div>
        </fieldset>
        <div class="cols3">${inp('pickupDate', 'Abholung am', s.pickupDate, 'type="date"')}${inp('deliveryDate', 'Zustellung am', s.deliveryDate, 'type="date"')}
          <div class="cols" style="gap:8px">${inp('windowFrom', 'Zeitfenster von', s.windowFrom, 'type="time"')}${inp('windowTo', 'bis', s.windowTo, 'type="time"')}</div></div>
        <div class="cols">${inp('cod', 'Nachnahme (€)', s.cod ? String(s.cod).replace('.', ',') : '', 'inputmode="decimal" placeholder="0,00"')}${inp('value', 'Warenwert (€)', s.value ? String(s.value).replace('.', ',') : '', 'inputmode="decimal" placeholder="0,00"')}</div>
        ${area('notes', 'Hinweise für Fahrer:in', s.notes, 'maxlength="1000" placeholder="z. B. Hintereingang, bitte vorher anrufen"')}
      </div>`,
      onOpen(form) {
        const tbody = $('[data-pkgs]', form);
        $('[data-add-pkg]', form).addEventListener('click', () => { tbody.insertAdjacentHTML('beforeend', pkgRow({ qty: 1 })); $('tr:last-child input', tbody).focus(); });
        tbody.addEventListener('click', (e) => { if (e.target.closest('[data-rm-pkg]') && tbody.children.length > 1) e.target.closest('tr').remove(); });
        const items = $('[data-items]', form);
        $('[data-add-item]', form)?.addEventListener('click', () => { items.insertAdjacentHTML('beforeend', itemRow()); $('tr:last-child select', items).focus(); });
        items?.addEventListener('click', (e) => { if (e.target.closest('[data-rm-item]')) e.target.closest('tr').remove(); });
        items?.addEventListener('change', (e) => {
          if (e.target.dataset.k !== 'articleId') return;
          const ls = $('[data-k="locationId"]', e.target.closest('tr'));
          const art = get('articles', e.target.value);
          if (ls && art) ls.value = art.locationId || '';
        });
        $$('[data-fill]', form).forEach((selEl) => selEl.addEventListener('change', () => {
          const pre = selEl.dataset.fill;
          const src = selEl.value === '__company' ? companyAddress() : get('contacts', selEl.value);
          if (src) ['name', 'contact', 'street', 'zip', 'city', 'country', 'phone', 'email'].forEach((k) => {
            const el = form.elements[`${pre}.${k}`];
            if (el) el.value = (k === 'name' && src.company ? src.company : src[k]) || (k === 'country' ? 'AT' : '');
          });
          selEl.value = '';
        }));
      },
      async onSubmit(form) {
        const v = formData(form);
        const packages = $$('[data-pkg]', form).map((tr) => Object.fromEntries($$('[data-k]', tr).map((i) => [i.dataset.k, i.value.trim()])))
          .filter((p) => p.desc || num(p.weight) || num(p.l))
          .map((p) => ({ desc: p.desc, qty: Math.max(1, Math.round(num(p.qty)) || 1), weight: num(p.weight), l: num(p.l), w: num(p.w), h: num(p.h) }));
        if (!packages.length) packages.push({ desc: '', qty: 1, weight: 0, l: 0, w: 0, h: 0 });
        const items = locked ? (s.items || []) : $$('[data-item]', form).map((tr) => Object.fromEntries($$('[data-k]', tr).map((i) => [i.dataset.k, i.value.trim()])))
          .filter((it) => it.articleId && num(it.qty) > 0)
          .map((it) => ({ articleId: it.articleId, qty: num(it.qty), locationId: it.locationId ?? (get('articles', it.articleId)?.locationId || '') }));
        // Gewicht aus den Artikeln übernehmen, wenn bei den Packstücken keines erfasst ist
        const itemsWeight = sum(items, (it) => num(it.qty) * num(get('articles', it.articleId)?.weight));
        if (itemsWeight && !sum(packages, (p) => p.qty * p.weight)) packages[0].weight = Math.round((itemsWeight / packages[0].qty) * 100) / 100;
        const short = items.filter((it) => num(it.qty) > qtyOf(it.articleId) - reservedOf(it.articleId) + sum((s.items || []).filter((o) => !s.stockBooked && o.articleId === it.articleId), (o) => o.qty));
        const data = {
          ...s, service: v.service, reference: v.reference, customerId: v.customerId || null,
          sender: v.sender, recipient: v.recipient, packages, items,
          pickupDate: v.pickupDate, deliveryDate: v.deliveryDate, windowFrom: v.windowFrom, windowTo: v.windowTo,
          cod: num(v.cod), value: num(v.value), notes: v.notes,
        };
        if (!existing) {
          data.number = await nextNumber('shipment', 'S');
          data.trackingCode = `NL${randomCode(10)}`;
          data.status = 'draft';
          data.events = [{ status: 'draft', at: new Date().toISOString(), place: v.sender.city || '', by: S.me.user.name }];
          if (v.saveContact) {
            await save('contacts', { type: 'customer', name: v.recipient.name, contact: v.recipient.contact, street: v.recipient.street, zip: v.recipient.zip, city: v.recipient.city, country: v.recipient.country, phone: v.recipient.phone, email: v.recipient.email });
          }
        }
        const saved = await save('shipments', data);
        toast(existing ? 'Sendung gespeichert.' : `Sendung ${saved.number} angelegt.`);
        if (short.length) toast(`Achtung: zu wenig verfügbar – ${short.map((it) => get('articles', it.articleId)?.name).join(', ')}`, 'bad');
        if (!existing) location.hash = `#/shipment/${saved.id}`;
      },
    });
  }

  function shipmentStatusForm(s) {
    const allowed = canPlan() ? Object.keys(SHIP_STATUS) : ['picked', 'transit', 'out', 'delivered', 'failed', 'returned'];
    const suggestion = { draft: 'planned', planned: 'picked', picked: 'transit', transit: 'out', out: 'delivered', failed: 'out' }[s.status] || s.status;
    modal({
      title: `Status · ${s.number}`, size: 'sm', submit: 'Status setzen',
      body: `<div class="form">
        ${sel('status', 'Neuer Status', allowed.map((k) => [k, SHIP_STATUS[k].l]), allowed.includes(suggestion) ? suggestion : allowed[0], 'data-st')}
        ${inp('place', 'Ort', '', 'maxlength="80" placeholder="z. B. Depot Wien, Linz …"')}
        <div data-pod class="form">${inp('podName', 'Übernommen von', '', 'maxlength="80" placeholder="Name der Person"')}</div>
        ${area('note', 'Notiz', '', 'maxlength="500"')}
      </div>`,
      onOpen(form) {
        const t = () => { $('[data-pod]', form).classList.toggle('hidden', form.elements.status.value !== 'delivered'); };
        form.elements.status.addEventListener('change', t);
        t();
      },
      async onSubmit(form) {
        const v = formData(form);
        await setShipStatus(s, v.status, { place: v.place, note: v.note, pod: v.status === 'delivered' ? { name: v.podName, at: new Date().toISOString(), note: v.note } : null });
        toast(`Status: ${SHIP_STATUS[v.status].l}`);
      },
    });
  }

  async function deleteShipment(s) {
    if (!(await confirmBox('Sendung löschen?', `Sendung <b>${esc(s.number)}</b> wird endgültig gelöscht. Stornieren behält sie im Verlauf.`, { ok: 'Löschen', danger: true }))) return;
    const tour = get('tours', s.tourId);
    if (tour) await save('tours', { ...tour, stops: (tour.stops || []).filter((x) => x !== s.id) });
    await remove('shipments', s.id);
    toast('Sendung gelöscht.');
    location.hash = '#/shipments';
  }

  // =============================================================== Druck
  // Code 128 (Zeichensatz B) – Balkenbreiten der Symbole 0–106
  const C128 = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
  function barcode(text) {
    const vals = [...String(text)].map((ch) => ch.charCodeAt(0) - 32).filter((v) => v >= 0 && v < 95);
    const codes = [104, ...vals];
    const check = vals.reduce((a, v, i) => a + v * (i + 1), 104) % 103;
    codes.push(check, 106);
    let x = 10;
    let bars = '';
    codes.forEach((c) => {
      [...C128[c]].forEach((w, i) => {
        if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="50"/>`;
        x += +w;
      });
    });
    return `<svg viewBox="0 0 ${x + 10} 50" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${bars}</svg>`;
  }

  function printHtml(html) {
    const root = $('#print-root');
    root.innerHTML = html;
    const imgs = $$('img', root).map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))).filter(Boolean);
    Promise.all(imgs).then(() => setTimeout(() => window.print(), 60));
  }
  const addrHtml = (a = {}) => `<b>${esc(a.name || '')}</b>${a.contact ? `<br>z. H. ${esc(a.contact)}` : ''}<br>${esc(a.street || '')}<br>${esc([a.country, a.zip].filter(Boolean).join('-'))} ${esc(a.city || '')}${a.phone ? `<br>Tel. ${esc(a.phone)}` : ''}`;

  function printLabel(s) {
    const n = pkgCount(s);
    const labels = Array.from({ length: n }, (_, i) => `<div class="ship-label">
      <div class="l-top"><img src="logo.svg" alt=""><span class="l-svc">${esc((SERVICES[s.service] || 'Standard').toUpperCase())}</span></div>
      <div class="l-small"><b>Von:</b> ${esc(s.sender?.name || '')} · ${esc(addrLine(s.sender))}</div>
      <div class="l-to"><div class="l-small"><b>An:</b></div><b>${esc(s.recipient?.name || '')}</b>${s.recipient?.contact ? `<br>z. H. ${esc(s.recipient.contact)}` : ''}<br>${esc(s.recipient?.street || '')}
        <div class="city">${esc([s.recipient?.country, s.recipient?.zip].filter(Boolean).join('-'))} ${esc((s.recipient?.city || '').toUpperCase())}</div>${s.recipient?.phone ? `<div class="l-small">Tel. ${esc(s.recipient.phone)}</div>` : ''}</div>
      <div class="l-small" style="display:flex;justify-content:space-between"><span>Sendung <b>${esc(s.number)}</b>${s.reference ? ` · Ref. ${esc(s.reference)}` : ''}</span><span>Paket <b>${i + 1}/${n}</b></span></div>
      <div class="l-small" style="display:flex;justify-content:space-between"><span>Zustellung: <b>${s.deliveryDate ? fmtDate(s.deliveryDate) : '–'}</b> ${esc(fmtWindow(s))}</span><span>${fmtKg(pkgWeight(s))}</span></div>
      ${num(s.cod) ? `<div style="border:2px solid #000;padding:1.5mm 3mm;font-weight:800;font-size:12pt">NACHNAHME ${money(s.cod)}</div>` : ''}
      <div class="l-bar">${barcode(s.trackingCode)}<div class="l-code">${esc(s.trackingCode)}</div></div>
    </div>`).join('');
    printHtml(`<style>@page { size: 100mm 150mm; margin: 0; } .ship-label { margin: 0 auto; border: 0; height: 150mm; }</style>${labels}`);
  }

  function docHead(title, sub) {
    const c = companySettings();
    return `<div class="doc-head"><div><img src="logo.svg" alt=""><div style="font-size:9pt;color:#555;margin-top:6px">${esc(S.me.company.name)} · ${esc(addrLine(c))}${c.phone ? ` · ${esc(c.phone)}` : ''}${c.uid ? ` · UID ${esc(c.uid)}` : ''}</div></div>
      <div style="text-align:right"><h1>${esc(title)}</h1><div style="font-size:10pt">${sub}</div></div></div>`;
  }

  function printDeliveryNote(s) {
    printHtml(`<div class="doc">${docHead('Lieferschein', `Nr. <b>${esc(s.number)}</b><br>Datum ${fmtDate(s.deliveryDate || today())}<br>Tracking ${esc(s.trackingCode)}`)}
      <div class="doc-cols"><div><div class="lbl">Absender</div>${addrHtml(s.sender)}</div><div><div class="lbl">Empfänger</div>${addrHtml(s.recipient)}</div></div>
      ${(s.items || []).length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><thead><tr><th style="text-align:left">Pos.</th><th style="text-align:left">Art.-Nr.</th><th style="text-align:left">Artikel</th><th style="text-align:right">Menge</th><th style="text-align:left">Einheit</th></tr></thead><tbody>
        ${s.items.map((it, i) => { const a = get('articles', it.articleId) || {}; return `<tr><td>${i + 1}</td><td>${esc(a.sku || '')}</td><td>${esc(a.name || '')}${a.ean ? `<br><span style="font-size:8.5pt;color:#666">EAN ${esc(a.ean)}</span>` : ''}</td><td style="text-align:right"><b>${fmtQty(it.qty)}</b></td><td>${esc(a.unit || '')}</td></tr>`; }).join('')}
      </tbody></table><div class="lbl">Packstücke</div>` : ''}
      <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Pos.</th><th style="text-align:left">Inhalt</th><th style="text-align:right">Anzahl</th><th style="text-align:right">Gewicht</th><th style="text-align:right">Maße (cm)</th></tr></thead><tbody>
      ${(s.packages || []).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.desc || 'Paket')}</td><td style="text-align:right">${Math.max(1, num(p.qty) || 1)}</td><td style="text-align:right">${fmtKg(num(p.weight) * Math.max(1, num(p.qty) || 1))}</td><td style="text-align:right">${[p.l, p.w, p.h].every((x) => num(x)) ? `${num(p.l)}×${num(p.w)}×${num(p.h)}` : '–'}</td></tr>`).join('')}
      <tr><td></td><td><b>Gesamt</b></td><td style="text-align:right"><b>${pkgCount(s)}</b></td><td style="text-align:right"><b>${fmtKg(pkgWeight(s))}</b></td><td style="text-align:right">${fmtM3(pkgVolume(s))}</td></tr>
      </tbody></table>
      <p style="margin-top:16px;font-size:10pt">Service: <b>${esc(SERVICES[s.service] || 'Standard')}</b>${s.reference ? ` · Referenz: ${esc(s.reference)}` : ''}${num(s.cod) ? ` · <b>Nachnahme: ${money(s.cod)}</b>` : ''}</p>
      ${s.notes ? `<p style="font-size:10pt">Hinweise: ${esc(s.notes)}</p>` : ''}
      <p style="font-size:10pt">Ware in einwandfreiem Zustand und vollständig erhalten.</p>
      <div class="sign"><div>Ort, Datum</div><div>Unterschrift Empfänger:in (Name in Blockschrift)</div></div>
      <div style="margin-top:26px;width:70mm">${barcode(s.trackingCode)}<div style="font:700 10pt var(--mono);letter-spacing:.1em;text-align:center">${esc(s.trackingCode)}</div></div>
    </div>`);
  }

  // =============================================================== Lager
  const qtyColor = (q) => (q > 0 ? 'var(--ok)' : q < 0 ? 'var(--bad)' : 'var(--muted)');
  function moveItem(m) {
    const a = get('articles', m.articleId);
    const q = num(m.qty);
    return `<a class="item" href="#/article/${esc(m.articleId)}"><span class="grow"><b>${esc(a?.name || '(gelöscht)')}</b><div class="t2 muted">${esc(MV_TYPES[m.type] || m.type)} · ${fmtDate(m.date)}${m.note ? ` · ${esc(m.note)}` : ''}</div></span>
      <b class="nowrap" style="color:${qtyColor(q)}">${q > 0 ? '+' : ''}${fmtQty(q)} <span class="muted" style="font-weight:400">${esc(a?.unit || '')}</span></b></a>`;
  }
  function stockCell(a, loc = 'all') {
    const q = loc === 'all' ? qtyOf(a.id) : qtyAt(a.id, loc);
    const cls = q < 0 ? 'bad' : loc === 'all' && isLow(a) ? 'warn' : '';
    return cls ? `<span class="badge ${cls} plain">${fmtQty(q)} ${esc(a.unit || '')}</span>` : `<b>${fmtQty(q)}</b> <span class="muted">${esc(a.unit || '')}</span>`;
  }
  const locOpts = (val, withAll = false) => opts([...(withAll ? [['all', 'Alle Lagerorte']] : []), ...locations().map((l) => [l.id, l.name])], val);
  const multiLoc = () => list('locations').length > 0;

  function viewStock() {
    const f = UI.f;
    const all = activeArticles();
    const archived = list('articles').filter((a) => a.archived);
    const cats = [...new Set(all.map((a) => a.category).filter(Boolean))].sort();
    const loc = f.stockLoc ?? 'all';
    const q = String(f.stockQ || '').toLowerCase();
    let rows = f.stockArchived ? archived : all;
    if (q) rows = rows.filter((a) => [a.sku, a.name, a.ean, a.category, a.bin].some((v) => String(v || '').toLowerCase().includes(q)));
    if (f.stockCat) rows = rows.filter((a) => a.category === f.stockCat);
    if (loc !== 'all') rows = rows.filter((a) => qtyAt(a.id, loc) !== 0 || (a.locationId || '') === loc);
    if (f.stockLow) rows = rows.filter(isLow);
    const qOf = (a) => (loc === 'all' ? qtyOf(a.id) : qtyAt(a.id, loc));
    const value = sum(rows, (a) => Math.max(0, qOf(a)) * num(a.cost));
    const low = all.filter(isLow).length;
    return `${pageHead('Bestand', `${all.length} Lagerartikel · Lagerwert ${money(sum(all, (a) => Math.max(0, qtyOf(a.id)) * num(a.cost)))}`,
      `<button class="btn" data-act="stock-csv">${icon('download')} CSV</button>
       ${multiLoc() ? `<button class="btn" data-act="transfer-new">${icon('swap')} Umbuchen</button>` : ''}
       <button class="btn" data-act="move-new" data-type="in">${icon('download')} Wareneingang</button>
       <button class="btn primary" data-act="art-new">${icon('plus')} Lagerartikel</button>`)}
      <div class="card">
        <div class="toolbar">
          <label class="search">${icon('search')}<input type="search" placeholder="Nr., Name, EAN, Lagerplatz …" value="${esc(f.stockQ || '')}" data-keep="stockQ" data-filter="stockQ"></label>
          ${cats.length ? `<select data-filter="stockCat">${opts([['', 'Alle Kategorien'], ...cats.map((c) => [c, c])], f.stockCat || '')}</select>` : ''}
          ${multiLoc() ? `<select data-filter="stockLoc">${locOpts(loc, true)}</select>` : ''}
          <div class="chips"><button class="chip ${f.stockLow ? 'on' : ''}" data-act="stock-low-toggle">Nachbestellen<span class="n">${low}</span></button>
            ${archived.length ? `<button class="chip ${f.stockArchived ? 'on' : ''}" data-act="stock-arch-toggle">Archiviert<span class="n">${archived.length}</span></button>` : ''}</div>
        </div>
        ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Artikel</th><th class="hide-m">Kategorie</th><th class="hide-m">Lagerplatz</th><th class="num">Bestand</th><th class="num hide-m">Reserviert</th><th class="num hide-m">Mindest</th><th class="num hide-m">Lagerwert</th><th></th></tr></thead><tbody>
          ${rows.map((a) => {
            const res = reservedOf(a.id);
            return `<tr class="click" data-href="#/article/${esc(a.id)}">
              <td><div class="t1">${esc(a.name)}</div><div class="t2">${esc([a.sku, a.ean ? `EAN ${a.ean}` : ''].filter(Boolean).join(' · '))}</div></td>
              <td class="hide-m">${esc(a.category || '–')}</td>
              <td class="hide-m">${esc(locName(a.locationId))}${a.bin ? `<div class="t2">${esc(a.bin)}</div>` : ''}</td>
              <td class="num">${stockCell(a, loc)}</td>
              <td class="num hide-m">${res ? `${fmtQty(res)}<div class="t2" ${qtyOf(a.id) - res < 0 ? 'style="color:var(--bad);font-weight:600"' : ''}>verfügbar ${fmtQty(qtyOf(a.id) - res)}</div>` : '<span class="muted">–</span>'}</td>
              <td class="num hide-m muted">${num(a.min) ? fmtQty(a.min) : '–'}</td>
              <td class="num hide-m">${money(Math.max(0, qOf(a)) * num(a.cost))}</td>
              <td class="right nowrap">${a.archived ? '' : `<button class="btn ghost icon sm" data-act="move-new" data-type="in" data-id="${esc(a.id)}" title="Wareneingang">${icon('plus')}</button><button class="btn ghost icon sm" data-act="move-new" data-type="out" data-id="${esc(a.id)}" title="Warenausgang">${icon('minus')}</button>`}</td></tr>`;
          }).join('')}</tbody>
          <tfoot><tr><td colspan="6" class="muted" style="padding:11px 14px">${rows.length} Artikel</td><td class="num hide-m" style="padding:11px 14px"><b>${money(value)}</b></td><td></td></tr></tfoot></table></div>`
          : empty('layers', all.length ? 'Keine Treffer' : 'Noch keine Lagerartikel', all.length ? 'Passe Suche oder Filter an.' : 'Lege Artikel mit Anfangsbestand, Mindestbestand und Lagerplatz an.',
            all.length ? '' : `<button class="btn primary" data-act="art-new">${icon('plus')} Ersten Lagerartikel anlegen</button>`)}
      </div>`;
  }

  function viewArticle(id) {
    const a = get('articles', id);
    if (!a) return empty('layers', 'Artikel nicht gefunden', 'Er wurde vielleicht gelöscht.', '<a class="btn" href="#/stock">Zum Bestand</a>');
    const q = qtyOf(a.id);
    const res = reservedOf(a.id);
    const mv = list('movements').filter((m) => m.articleId === a.id).sort((x, y) => String(y.date).localeCompare(String(x.date)) || String(y.createdAt).localeCompare(String(x.createdAt)));
    const perLoc = locations().map((l) => ({ ...l, q: qtyAt(a.id, l.id) })).filter((l) => l.q !== 0 || l.id === (a.locationId || ''));
    const supplier = get('contacts', a.supplierId);
    const openShips = list('shipments').filter((s) => !DONE_ST.includes(s.status) && (s.items || []).some((it) => it.articleId === a.id));
    return `${pageHead(`${esc(a.name)} ${a.archived ? '<span class="badge">archiviert</span>' : isLow(a) ? '<span class="badge warn">nachbestellen</span>' : ''}`,
      esc([a.sku, a.ean ? `EAN ${a.ean}` : '', a.category].filter(Boolean).join(' · ')),
      `${a.archived ? '' : `<button class="btn" data-act="move-new" data-type="in" data-id="${esc(a.id)}">${icon('plus')} Eingang</button>
       <button class="btn" data-act="move-new" data-type="out" data-id="${esc(a.id)}">${icon('minus')} Ausgang</button>
       ${multiLoc() ? `<button class="btn" data-act="transfer-new" data-id="${esc(a.id)}">${icon('swap')} Umbuchen</button>` : ''}
       <button class="btn" data-act="count-one" data-id="${esc(a.id)}">${icon('clipboard')} Zählen</button>`}
       <button class="btn primary" data-act="art-edit" data-id="${esc(a.id)}">${icon('edit')} Bearbeiten</button>`,
      '<a href="#/stock">Bestand</a> /')}
      <div class="kpis">
        <div class="kpi hero"><div class="label"><span class="ic">${icon('layers')}</span>Bestand</div><div class="value">${fmtQty(q)} <span style="font-size:15px;font-weight:500">${esc(a.unit || '')}</span></div><div class="sub">${num(a.min) ? `Mindestbestand ${fmtQty(a.min)}` : 'kein Mindestbestand'}</div></div>
        <div class="kpi"><div class="label"><span class="ic">${icon('package')}</span>Reserviert</div><div class="value">${fmtQty(res)}</div><div class="sub">in offenen Sendungen</div></div>
        <div class="kpi"><div class="label"><span class="ic">${icon('checkc')}</span>Verfügbar</div><div class="value" style="${q - res < 0 ? 'color:var(--bad)' : ''}">${fmtQty(q - res)}</div><div class="sub">Bestand minus Reservierungen</div></div>
        <div class="kpi"><div class="label"><span class="ic">${icon('euro')}</span>Lagerwert</div><div class="value">${money(Math.max(0, q) * num(a.cost))}</div><div class="sub">${money(a.cost)} je ${esc(a.unit || 'Einheit')}</div></div>
      </div>
      <div class="grid g-main">
        <div class="card"><div class="card-head"><h2>Bewegungen</h2><span class="muted">${mv.length}</span></div>
          ${mv.length ? movesTable(mv, { showArticle: false }) : `<div class="card-body"><p class="muted" style="margin:0">Noch keine Bewegungen.</p></div>`}</div>
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Bestand je Lagerort</h2></div><div class="list">
            ${perLoc.map((l) => `<div class="item">${icon('warehouse')}<span class="grow">${esc(l.name)}${l.id === (a.locationId || '') && a.bin ? `<div class="t2 muted">Platz ${esc(a.bin)}</div>` : ''}</span><b>${fmtQty(l.q)}</b> <span class="muted">${esc(a.unit || '')}</span></div>`).join('')}
          </div></div>
          <div class="card"><div class="card-head"><h2>Stammdaten</h2></div><div class="card-body"><dl class="kv">
            <dt>Einheit</dt><dd>${esc(a.unit || '–')}</dd>
            <dt>Gewicht</dt><dd>${num(a.weight) ? `${NUMF3.format(a.weight)} kg je ${esc(a.unit || 'Einheit')}` : '–'}</dd>
            <dt>Lieferant</dt><dd>${supplier ? esc(supplier.name) : '–'}</dd>
            ${a.description ? `<dt>Beschreibung</dt><dd>${esc(a.description)}</dd>` : ''}
          </dl></div></div>
          ${openShips.length ? `<div class="card"><div class="card-head"><h2>Offene Sendungen</h2></div><div class="list">${openShips.map((s) => `<a class="item" href="#/shipment/${esc(s.id)}"><span class="grow"><b>${esc(s.number)}</b> <span class="muted">· ${esc(s.recipient?.name || '')}</span></span><b>${fmtQty(sum((s.items || []).filter((it) => it.articleId === a.id), (it) => it.qty))}</b>${badge(SHIP_STATUS, s.status)}</a>`).join('')}</div></div>` : ''}
        </div>
      </div>`;
  }

  function movesTable(mv, { showArticle = true } = {}) {
    return `<div class="table-wrap"><table><thead><tr><th>Datum</th>${showArticle ? '<th>Artikel</th>' : ''}<th>Art</th>${multiLoc() ? '<th class="hide-m">Lagerort</th>' : ''}<th class="num">Menge</th><th class="hide-m">Notiz / Beleg</th><th class="hide-m">Von</th><th></th></tr></thead><tbody>
      ${mv.map((m) => {
        const a = get('articles', m.articleId);
        const q = num(m.qty);
        const canStorno = canStock() && MANUAL_MV.includes(m.type) && !m.reversedBy;
        const ship = m.shipmentId && get('shipments', m.shipmentId);
        return `<tr${m.reversedBy ? ' style="opacity:.55"' : ''}><td class="nowrap">${fmtDate(m.date)}</td>
          ${showArticle ? `<td><a href="#/article/${esc(m.articleId)}"><b>${esc(a?.name || '(gelöscht)')}</b></a><div class="t2">${esc(a?.sku || '')}</div></td>` : ''}
          <td><span class="badge plain ${m.type === 'storno' ? '' : q >= 0 ? 'ok' : 'violet'}">${esc(MV_TYPES[m.type] || m.type)}</span></td>
          ${multiLoc() ? `<td class="hide-m">${esc(locName(m.locationId))}</td>` : ''}
          <td class="num"><b style="color:${qtyColor(q)}">${q > 0 ? '+' : ''}${fmtQty(q)}</b> <span class="muted">${esc(a?.unit || '')}</span></td>
          <td class="hide-m">${ship ? `<a href="#/shipment/${esc(ship.id)}">${esc(m.note)}</a>` : esc(m.note || '')}</td>
          <td class="hide-m muted">${esc(m.by || '')}</td>
          <td class="right">${canStorno ? `<button class="btn ghost icon sm" data-act="move-storno" data-id="${esc(m.id)}" title="Stornieren (Gegenbuchung)">${icon('undo')}</button>` : m.reversedBy ? '<small class="muted">storniert</small>' : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function viewMoves() {
    const f = UI.f;
    const q = String(f.moveQ || '').toLowerCase();
    let mv = list('movements').sort((x, y) => String(y.date).localeCompare(String(x.date)) || String(y.createdAt).localeCompare(String(x.createdAt)));
    const total = mv.length;
    if (f.moveType) mv = mv.filter((m) => m.type === f.moveType);
    if ((f.moveLoc ?? 'all') !== 'all') mv = mv.filter((m) => (m.locationId || '') === f.moveLoc);
    if (q) mv = mv.filter((m) => { const a = get('articles', m.articleId) || {}; return [a.name, a.sku, m.note, m.by].some((v) => String(v || '').toLowerCase().includes(q)); });
    const shown = mv.slice(0, 500);
    return `${pageHead('Bewegungen', 'Jeder Zu- und Abgang – unveränderlich protokolliert, Korrekturen per Storno.',
      `${multiLoc() ? `<button class="btn" data-act="transfer-new">${icon('swap')} Umbuchen</button>` : ''}
       <button class="btn" data-act="move-new" data-type="out">${icon('minus')} Warenausgang</button>
       <button class="btn primary" data-act="move-new" data-type="in">${icon('plus')} Wareneingang</button>`)}
      <div class="card">
        <div class="toolbar">
          <label class="search">${icon('search')}<input type="search" placeholder="Artikel, Notiz, Person …" value="${esc(f.moveQ || '')}" data-keep="moveQ" data-filter="moveQ"></label>
          <select data-filter="moveType">${opts([['', 'Alle Arten'], ...Object.entries(MV_TYPES)], f.moveType || '')}</select>
          ${multiLoc() ? `<select data-filter="moveLoc">${locOpts(f.moveLoc ?? 'all', true)}</select>` : ''}
          <span class="muted">${mv.length} von ${total}</span>
        </div>
        ${shown.length ? movesTable(shown) : empty('swap', total ? 'Keine Treffer' : 'Noch keine Bewegungen', total ? 'Passe die Filter an.' : 'Buche einen Wareneingang oder lege Artikel mit Anfangsbestand an.')}
        ${mv.length > shown.length ? `<p class="muted" style="padding:12px 16px;margin:0">Die neuesten ${shown.length} von ${mv.length} – nutze die Filter.</p>` : ''}
      </div>`;
  }

  // ---------------------------------------------------------------- Inventur (Zählung über alle Artikel)
  const invKey = () => `nl-inv-${S.me.company.id}`;
  function invState() {
    if (!UI.inv) {
      UI.inv = { loc: '', cat: '', counts: {} };
      try { Object.assign(UI.inv, JSON.parse(localStorage.getItem(invKey()) || '{}')); } catch { /* kein Entwurf */ }
    }
    return UI.inv;
  }
  const saveInv = () => { try { localStorage.setItem(invKey(), JSON.stringify(UI.inv)); } catch { /* privat */ } };
  const invRows = () => {
    const st = invState();
    return activeArticles().filter((a) => !st.cat || a.category === st.cat)
      .filter((a) => !multiLoc() || (a.locationId || '') === st.loc || qtyAt(a.id, st.loc) !== 0)
      .sort(byText((a) => `${a.bin || '~'} ${a.name}`));
  };
  const invDiffs = () => {
    const st = invState();
    return invRows().filter((a) => st.counts[a.id] !== undefined && st.counts[a.id] !== '')
      .map((a) => ({ a, counted: num(st.counts[a.id]), book: qtyAt(a.id, st.loc) }))
      .map((x) => ({ ...x, diff: r3(x.counted - x.book) }));
  };

  function viewInventory() {
    const st = invState();
    const rows = invRows();
    const cats = [...new Set(activeArticles().map((a) => a.category).filter(Boolean))].sort();
    const d = invDiffs();
    const nDiff = d.filter((x) => x.diff).length;
    return `${pageHead('Inventur', 'Zählliste drucken, gezählte Mengen eintragen, Differenzen in einem Schritt buchen. Der Zwischenstand bleibt auf diesem Gerät gespeichert.',
      `<button class="btn" data-act="inv-print">${icon('print')} Zählliste</button>
       ${d.length ? `<button class="btn ghost" data-act="inv-clear">${icon('x')} Zählung verwerfen</button>` : ''}
       <button class="btn primary" data-act="inv-book" ${d.length ? '' : 'disabled'}>${icon('check')} ${nDiff ? `${nDiff} Differenz${nDiff === 1 ? '' : 'en'} buchen` : 'Zählung abschließen'}</button>`)}
      <div class="card">
        <div class="toolbar">
          ${multiLoc() ? `<label class="row" style="gap:8px"><span class="muted">Lagerort</span><select data-inv-set="loc">${locOpts(st.loc)}</select></label>` : ''}
          ${cats.length ? `<select data-inv-set="cat">${opts([['', 'Alle Kategorien'], ...cats.map((c) => [c, c])], st.cat)}</select>` : ''}
          <span class="grow"></span><span class="muted" id="inv-sum">${d.length} von ${rows.length} gezählt · ${nDiff} mit Differenz</span>
        </div>
        ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Artikel</th><th class="hide-m">Lagerplatz</th><th class="num">Buchbestand</th><th style="width:150px">Gezählt</th><th class="num">Differenz</th></tr></thead><tbody>
          ${rows.map((a) => {
            const book = qtyAt(a.id, st.loc);
            const c = st.counts[a.id];
            const diff = c === undefined || c === '' ? null : r3(num(c) - book);
            return `<tr><td><div class="t1">${esc(a.name)}</div><div class="t2">${esc(a.sku || '')}</div></td><td class="hide-m">${esc(a.bin || '–')}</td>
              <td class="num">${fmtQty(book)} <span class="muted">${esc(a.unit || '')}</span></td>
              <td><input data-inv="${esc(a.id)}" data-keep="inv-${esc(a.id)}" value="${esc(c ?? '')}" inputmode="decimal" placeholder="–" style="height:32px;text-align:right"></td>
              <td class="num" id="invd-${esc(a.id)}">${invDiffHtml(diff, a)}</td></tr>`;
          }).join('')}</tbody></table></div>`
          : empty('clipboard', 'Keine Artikel', 'An diesem Lagerort bzw. in dieser Kategorie gibt es keine Artikel.')}
      </div>`;
  }
  const invDiffHtml = (diff, a) => (diff === null ? '<span class="muted">–</span>' : diff === 0 ? `<span class="badge ok plain">${icon('check')} stimmt</span>`
    : `<b style="color:${qtyColor(diff)}">${diff > 0 ? '+' : ''}${fmtQty(diff)}</b> <span class="muted">${esc(a.unit || '')}</span>`);

  async function bookInventory() {
    const st = invState();
    const d = invDiffs();
    const nd = d.filter((x) => x.diff);
    const val = sum(nd, (x) => x.diff * num(x.a.cost));
    if (!(await confirmBox('Inventur abschließen?', `${d.length} Artikel gezählt, <b>${nd.length}</b> mit Differenz (Wert ${money(val)}). Die Differenzen werden als Inventurbuchung erfasst.`, { ok: 'Buchen' }))) return;
    for (const x of nd) {
      await save('movements', { articleId: x.a.id, qty: x.diff, type: 'correction', locationId: st.loc, date: today(), unitCost: num(x.a.cost), note: `Inventur ${fmtDate(today())}` });
    }
    st.counts = {};
    saveInv();
    toast(nd.length ? `${nd.length} Inventurdifferenz${nd.length === 1 ? '' : 'en'} gebucht.` : 'Inventur abgeschlossen – alle Bestände stimmen.');
    render();
  }

  function printCountSheet() {
    const st = invState();
    const rows = invRows();
    printHtml(`<div class="doc">${docHead('Zählliste', `Inventur ${fmtDate(today())}<br>${esc(locName(st.loc))}${st.cat ? `<br>${esc(st.cat)}` : ''}`)}
      <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Lagerplatz</th><th style="text-align:left">Nr.</th><th style="text-align:left">Artikel</th><th style="text-align:left">Einheit</th><th style="text-align:left;width:32mm">Gezählt</th><th style="text-align:left;width:40mm">Bemerkung</th></tr></thead><tbody>
      ${rows.map((a) => `<tr><td>${esc(a.bin || '')}</td><td>${esc(a.sku || '')}</td><td>${esc(a.name)}</td><td>${esc(a.unit || '')}</td><td style="border-bottom:1px solid #999"></td><td style="border-bottom:1px solid #999"></td></tr>`).join('')}
      </tbody></table>
      <p style="font-size:9pt;color:#555;margin-top:10px">Blindzählung: Sollbestände werden bewusst nicht angezeigt.</p>
      <div class="sign"><div>Gezählt von / Datum</div><div>Kontrolliert von</div></div></div>`);
  }

  function exportStockCsv() {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const nf = (n) => String(r3(n)).replace('.', ',');
    const lines = [['Nr.', 'Artikel', 'EAN', 'Kategorie', 'Einheit', 'Lagerort', 'Lagerplatz', 'Bestand', 'Reserviert', 'Mindestbestand', 'Einkaufswert', 'Lagerwert'].map(cell).join(';')];
    activeArticles().forEach((a) => {
      const q = qtyOf(a.id);
      lines.push([a.sku, a.name, a.ean, a.category, a.unit, locName(a.locationId), a.bin, nf(q), nf(reservedOf(a.id)), nf(a.min), nf(a.cost), nf(Math.max(0, q) * num(a.cost))].map(cell).join(';'));
    });
    const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bestand_${today()}.csv`;
    document.body.append(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
  }

  // ---------------------------------------------------------------- Lagerorte
  function viewLocations() {
    const arts = activeArticles();
    const rows = locations().map((l) => {
      const items = arts.filter((a) => qtyAt(a.id, l.id) !== 0);
      return { ...l, n: items.length, units: sum(items, (a) => qtyAt(a.id, l.id)), value: sum(items, (a) => Math.max(0, qtyAt(a.id, l.id)) * num(a.cost)) };
    });
    return `${pageHead('Lagerorte', 'Lager, Hallen oder Außenlager. Den genauen Platz (Regal, Fach) trägst du je Artikel ein.', `<button class="btn primary" data-act="loc-new">${icon('plus')} Lagerort</button>`)}
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Lagerort</th><th class="hide-m">Adresse / Notiz</th><th class="num">Artikel</th><th class="num">Einheiten</th><th class="num">Lagerwert</th></tr></thead><tbody>
        ${rows.map((l) => `<tr class="click" data-act="loc-edit" data-id="${esc(l.id)}"><td><div class="row">${icon('warehouse')}<div><div class="t1">${esc(l.name)}</div><div class="t2">${l.id ? esc(l.code || '') : 'Standard-Lagerort'}</div></div></div></td>
          <td class="hide-m">${esc(l.address || l.note || '–')}</td><td class="num">${l.n}</td><td class="num">${fmtQty(l.units)}</td><td class="num">${money(l.value)}</td></tr>`).join('')}
      </tbody></table></div></div>
      ${!multiLoc() ? `<div class="alert violet" style="margin-top:16px">${icon('info')}<p>Mit einem zweiten Lagerort kannst du Ware zwischen Lagern umbuchen und je Lager zählen.</p></div>` : ''}`;
  }

  function locationForm(id) {
    const main = id === '';
    const l = main ? { name: locations()[0].name } : (id && get('locations', id)) || {};
    const isNew = !main && !l.id;
    const used = !isNew && activeArticles().some((a) => qtyAt(a.id, main ? '' : l.id) !== 0);
    modal({
      title: isNew ? 'Neuer Lagerort' : l.name, size: 'sm',
      extra: !isNew && !main ? `<button type="button" class="btn danger sm" data-del ${used ? 'disabled title="Hier liegt noch Ware"' : ''}>${icon('trash')} Löschen</button>` : '',
      body: `<div class="form">${inp('name', 'Bezeichnung *', l.name, 'required maxlength="60" placeholder="z. B. Außenlager Süd"')}
        ${main ? '<small class="muted">Der Standard-Lagerort wird verwendet, solange nichts anderes gewählt ist.</small>' : `${inp('code', 'Kürzel', l.code, 'maxlength="12" placeholder="z. B. AL-S"')}${area('address', 'Adresse / Notiz', l.address, 'maxlength="300"')}`}</div>`,
      onOpen(form, close) {
        $('[data-del]', form)?.addEventListener('click', async () => {
          if (await confirmBox('Lagerort löschen?', `<b>${esc(l.name)}</b> wird gelöscht.`, { ok: 'Löschen', danger: true })) { await remove('locations', l.id).catch(fail); close(); toast('Lagerort gelöscht.'); }
        });
      },
      async onSubmit(form) {
        const v = formData(form);
        if (main) await save('settings', { ...companySettings(), id: 'company', mainLocation: v.name });
        else await save('locations', { ...l, ...v });
        toast('Lagerort gespeichert.');
      },
    });
  }

  // ---------------------------------------------------------------- Artikel-Formular
  function articleForm(a = null) {
    const x = a || { unit: 'Stk', locationId: '' };
    const isNew = !a;
    const cats = [...new Set(list('articles').map((y) => y.category).filter(Boolean))].sort();
    const suppliers = list('contacts').filter((c) => c.type === 'supplier' || c.type === 'partner').sort(byText((c) => c.name));
    const hasMoves = !isNew && list('movements').some((m) => m.articleId === x.id);
    modal({
      title: isNew ? 'Neuer Lagerartikel' : x.name, size: 'lg', submit: isNew ? 'Anlegen' : 'Speichern',
      extra: isNew ? '' : `<button type="button" class="btn sm" data-arch>${icon(x.archived ? 'undo' : 'inbox')} ${x.archived ? 'Reaktivieren' : 'Archivieren'}</button>${hasMoves ? '' : ` <button type="button" class="btn danger sm" data-del>${icon('trash')} Löschen</button>`}`,
      body: `<div class="form">
        <div class="cols">${inp('name', 'Bezeichnung *', x.name, 'required maxlength="160"')}<div class="cols" style="gap:10px">${inp('sku', 'Artikelnummer', x.sku, 'maxlength="40" placeholder="automatisch"')}${inp('ean', 'EAN / Barcode', x.ean, 'maxlength="40" inputmode="numeric"')}</div></div>
        <div class="cols3"><label class="field"><span>Kategorie</span><input name="category" value="${esc(x.category || '')}" list="dl-cat" maxlength="60"></label>
          <label class="field"><span>Einheit</span><input name="unit" value="${esc(x.unit || 'Stk')}" list="dl-unit" maxlength="20"></label>
          ${inp('weight', 'Gewicht je Einheit (kg)', x.weight ? String(x.weight).replace('.', ',') : '', 'inputmode="decimal"', 'Für Sendungsgewicht')}</div>
        <div class="cols3">${sel('locationId', 'Standard-Lagerort', locations().map((l) => [l.id, l.name]), x.locationId || '')}${inp('bin', 'Lagerplatz', x.bin, 'maxlength="40" placeholder="z. B. Regal A3, Fach 2"')}${inp('min', 'Mindestbestand', x.min ? String(x.min).replace('.', ',') : '', 'inputmode="decimal"', 'Darunter: „nachbestellen“')}</div>
        <div class="cols3">${inp('cost', 'Einkaufswert je Einheit (€)', x.cost ? String(x.cost).replace('.', ',') : '', 'inputmode="decimal"', isNew ? '' : 'Wird bei Wareneingängen gemittelt')}
          ${sel('supplierId', 'Lieferant', [['', '– kein –'], ...suppliers.map((c) => [c.id, c.name])], x.supplierId)}
          ${isNew ? inp('initial', 'Anfangsbestand', '', 'inputmode="decimal" placeholder="0"') : `<label class="field"><span>Aktueller Bestand</span><input readonly value="${esc(`${fmtQty(qtyOf(x.id))} ${x.unit || ''}`)}"></label>`}</div>
        ${area('description', 'Beschreibung / Hinweise', x.description, 'maxlength="2000" rows="2"')}
        <datalist id="dl-cat">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <datalist id="dl-unit">${UNITS.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      </div>`,
      onOpen(form, close) {
        $('[data-arch]', form)?.addEventListener('click', async () => {
          try { await save('articles', { ...x, archived: !x.archived }); close(); toast(x.archived ? 'Artikel reaktiviert.' : 'Artikel archiviert.'); } catch (e) { fail(e); }
        });
        $('[data-del]', form)?.addEventListener('click', async () => {
          if (await confirmBox('Artikel löschen?', `<b>${esc(x.name)}</b> hat noch keine Bewegungen und wird gelöscht.`, { ok: 'Löschen', danger: true })) {
            await remove('articles', x.id).catch(fail); close(); toast('Artikel gelöscht.'); location.hash = '#/stock';
          }
        });
      },
      async onSubmit(form) {
        const v = formData(form);
        if (v.sku && list('articles').some((y) => y.sku === v.sku && y.id !== x.id)) throw new Error(`Die Artikelnummer ${v.sku} ist bereits vergeben.`);
        const data = { ...x, name: v.name, sku: v.sku || x.sku || await nextNumber('article', 'A'), ean: v.ean, category: v.category, unit: v.unit || 'Stk',
          weight: num(v.weight), locationId: v.locationId || '', bin: v.bin, min: num(v.min), cost: num(v.cost), supplierId: v.supplierId || null, description: v.description };
        const saved = await save('articles', data);
        if (isNew && num(v.initial)) await save('movements', { articleId: saved.id, qty: num(v.initial), type: 'initial', locationId: saved.locationId, date: today(), unitCost: saved.cost, note: 'Anfangsbestand' });
        toast(isNew ? `Artikel ${saved.sku} angelegt.` : 'Artikel gespeichert.');
        if (isNew) location.hash = `#/article/${saved.id}`;
      },
    });
  }

  // ---------------------------------------------------------------- Wareneingang / -ausgang (mehrere Positionen)
  const articleOptions = (val) => opts([['', 'Artikel wählen …'], ...activeArticles().map((a) => [a.id, `${articleLabel(a)} (${fmtQty(qtyOf(a.id))} ${a.unit || ''})`])], val);
  const moveRow = (isIn, aid = '') => `<tr data-line><td><select data-k="articleId" style="min-width:220px">${articleOptions(aid)}</select></td>
    <td><input data-k="qty" inputmode="decimal" placeholder="Menge" style="width:96px"></td>
    ${isIn ? `<td><input data-k="unitCost" inputmode="decimal" placeholder="€" value="${esc(aid && get('articles', aid)?.cost ? String(get('articles', aid).cost).replace('.', ',') : '')}" style="width:96px"></td>` : ''}
    <td><button type="button" class="btn ghost icon sm" data-rm title="Entfernen">${icon('x')}</button></td></tr>`;

  function moveForm(type, articleId = '') {
    if (!activeArticles().length) { toast('Bitte zuerst einen Lagerartikel anlegen.', 'bad'); return; }
    const isIn = type === 'in';
    const a0 = get('articles', articleId);
    const suppliers = list('contacts').filter((c) => c.type === 'supplier' || c.type === 'partner').sort(byText((c) => c.name));
    modal({
      title: isIn ? 'Wareneingang buchen' : 'Warenausgang buchen', size: 'lg', submit: 'Buchen',
      body: `<div class="form">
        <div class="cols3">${inp('date', 'Datum *', today(), 'type="date" required')}
          ${multiLoc() ? sel('locationId', isIn ? 'Einlagern in' : 'Entnehmen aus', locations().map((l) => [l.id, l.name]), a0?.locationId || '') : '<input type="hidden" name="locationId" value="">'}
          ${isIn ? sel('supplierId', 'Lieferant', [['', '– kein –'], ...suppliers.map((c) => [c.id, c.name])], a0?.supplierId || '') : sel('reason', 'Grund', [['Verbrauch', 'Verbrauch'], ['Verkauf / Abholung', 'Verkauf / Abholung'], ['Bruch / Schwund', 'Bruch / Schwund'], ['Ausleihe', 'Ausleihe'], ['Rücksendung an Lieferant', 'Rücksendung an Lieferant'], ['Sonstiges', 'Sonstiges']], 'Verbrauch')}</div>
        ${inp('note', isIn ? 'Lieferschein-Nr. / Notiz' : 'Notiz', '', 'maxlength="200"')}
        <div class="table-wrap"><table><thead><tr><th>Artikel</th><th>Menge</th>${isIn ? '<th>Einkauf je Einheit</th>' : ''}<th></th></tr></thead><tbody data-lines>${moveRow(isIn, articleId)}</tbody></table></div>
        <div><button type="button" class="btn sm" data-add>${icon('plus')} Position</button></div>
        ${isIn ? '' : '<label class="check"><input type="checkbox" name="allowNeg" value="1"> Auch buchen, wenn der Bestand nicht reicht (Bestand wird negativ)</label>'}
      </div>`,
      onOpen(form) {
        const tb = $('[data-lines]', form);
        $('[data-add]', form).addEventListener('click', () => { tb.insertAdjacentHTML('beforeend', moveRow(isIn)); $('tr:last-child select', tb).focus(); });
        tb.addEventListener('click', (e) => { if (e.target.closest('[data-rm]') && tb.children.length > 1) e.target.closest('tr').remove(); });
        tb.addEventListener('change', (e) => {
          if (e.target.dataset.k !== 'articleId' || !isIn) return;
          const uc = $('[data-k="unitCost"]', e.target.closest('tr'));
          const art = get('articles', e.target.value);
          if (uc && art && !uc.value) uc.value = art.cost ? String(art.cost).replace('.', ',') : '';
        });
        $('[data-k="qty"]', tb)?.focus();
      },
      async onSubmit(form) {
        const v = formData(form);
        const lines = $$('[data-line]', form).map((tr) => Object.fromEntries($$('[data-k]', tr).map((i) => [i.dataset.k, i.value.trim()])))
          .filter((l) => l.articleId && num(l.qty) > 0);
        if (!lines.length) throw new Error('Bitte mindestens eine Position mit Artikel und Menge erfassen.');
        if (!isIn && !v.allowNeg) {
          const need = new Map();
          lines.forEach((l) => need.set(l.articleId, (need.get(l.articleId) || 0) + num(l.qty)));
          for (const [aid, n] of need) {
            const have = qtyAt(aid, v.locationId);
            if (n > have) throw new Error(`${get('articles', aid).name}: nur ${fmtQty(have)} am Lagerort ${locName(v.locationId)} vorhanden.`);
          }
        }
        const supplier = get('contacts', v.supplierId);
        const note = [isIn ? supplier?.name : v.reason, v.note].filter(Boolean).join(' · ');
        for (const l of lines) {
          const art = get('articles', l.articleId);
          const qty = num(l.qty);
          const unitCost = isIn && l.unitCost !== '' ? num(l.unitCost) : num(art.cost);
          if (isIn && l.unitCost !== '') {
            // gleitender Durchschnittspreis
            const have = Math.max(0, qtyOf(art.id));
            const cost = have > 0 && num(art.cost) ? (have * num(art.cost) + qty * unitCost) / (have + qty) : unitCost;
            if (Math.abs(cost - num(art.cost)) > 0.0001) await save('articles', { ...art, cost: Math.round(cost * 10000) / 10000 });
          }
          await save('movements', { articleId: art.id, qty: isIn ? qty : -qty, type: isIn ? 'in' : 'out', locationId: v.locationId || '', date: v.date, unitCost, note, supplierId: v.supplierId || null });
        }
        toast(`${isIn ? 'Wareneingang' : 'Warenausgang'} gebucht (${lines.length} Position${lines.length === 1 ? '' : 'en'}).`);
      },
    });
  }

  function transferForm(articleId = '') {
    const locs = locations();
    const a0 = get('articles', articleId);
    modal({
      title: 'Umbuchen', submit: 'Umbuchen',
      body: `<div class="form">
        <label class="field"><span>Artikel *</span><select name="articleId" required>${articleOptions(articleId)}</select></label>
        <div class="cols">${sel('from', 'Von', locs.map((l) => [l.id, l.name]), a0?.locationId || '')}${sel('to', 'Nach', locs.map((l) => [l.id, l.name]), (locs.find((l) => l.id !== (a0?.locationId || '')) || locs[0]).id)}</div>
        <div class="cols">${inp('qty', 'Menge *', '', 'required inputmode="decimal"')}${inp('date', 'Datum', today(), 'type="date"')}</div>
        <small class="muted" data-have></small>
        ${inp('note', 'Notiz', '', 'maxlength="200"')}
      </div>`,
      onOpen(form) {
        const upd = () => { const a = get('articles', form.elements.articleId.value); $('[data-have]', form).textContent = a ? `Am Ausgangslager: ${fmtQty(qtyAt(a.id, form.elements.from.value))} ${a.unit || ''}` : ''; };
        form.addEventListener('change', upd);
        upd();
      },
      async onSubmit(form) {
        const v = formData(form);
        const a = get('articles', v.articleId);
        const qty = num(v.qty);
        if (!a || qty <= 0) throw new Error('Bitte Artikel und Menge angeben.');
        if (v.from === v.to) throw new Error('Ausgangs- und Ziellager sind gleich.');
        if (qty > qtyAt(a.id, v.from)) throw new Error(`Am Lagerort ${locName(v.from)} sind nur ${fmtQty(qtyAt(a.id, v.from))} vorhanden.`);
        const transferId = uid();
        const base = { articleId: a.id, type: 'transfer', date: v.date || today(), unitCost: num(a.cost), transferId };
        await save('movements', { ...base, qty: -qty, locationId: v.from, note: `→ ${locName(v.to)}${v.note ? ` · ${v.note}` : ''}` });
        await save('movements', { ...base, qty, locationId: v.to, note: `← ${locName(v.from)}${v.note ? ` · ${v.note}` : ''}` });
        toast(`${fmtQty(qty)} ${a.unit || ''} umgebucht.`);
      },
    });
  }

  function countOneForm(articleId) {
    const a = get('articles', articleId);
    modal({
      title: `Zählen · ${a.name}`, size: 'sm', submit: 'Korrektur buchen',
      body: `<div class="form">
        ${multiLoc() ? sel('loc', 'Lagerort', locations().map((l) => [l.id, l.name]), a.locationId || '') : '<input type="hidden" name="loc" value="">'}
        <label class="field"><span>Buchbestand</span><input readonly data-book></label>
        ${inp('counted', 'Gezählter Bestand *', '', 'required inputmode="decimal"')}
        ${inp('note', 'Notiz', 'Stichprobe', 'maxlength="200"')}</div>`,
      onOpen(form) {
        const upd = () => { $('[data-book]', form).value = `${fmtQty(qtyAt(a.id, form.elements.loc.value))} ${a.unit || ''}`; };
        form.addEventListener('change', upd);
        upd();
        form.elements.counted.focus();
      },
      async onSubmit(form) {
        const v = formData(form);
        const diff = r3(num(v.counted) - qtyAt(a.id, v.loc));
        if (!diff) { toast('Bestand stimmt – keine Korrektur nötig.'); return; }
        await save('movements', { articleId: a.id, qty: diff, type: 'correction', locationId: v.loc || '', date: today(), unitCost: num(a.cost), note: v.note });
        toast(`Differenz ${diff > 0 ? '+' : ''}${fmtQty(diff)} ${a.unit || ''} gebucht.`);
      },
    });
  }

  async function stornoMove(id) {
    const m = get('movements', id);
    if (!m || m.reversedBy) return;
    const a = get('articles', m.articleId) || {};
    const legs = m.transferId ? list('movements').filter((x) => x.transferId === m.transferId && !x.reversedBy) : [m];
    if (!(await confirmBox('Bewegung stornieren?', `„${esc(MV_TYPES[m.type])} ${fmtQty(m.qty)} ${esc(a.unit || '')} ${esc(a.name || '')}“ wird durch eine Gegenbuchung aufgehoben${legs.length > 1 ? ' (beide Seiten der Umbuchung)' : ''}.`, { ok: 'Stornieren', danger: true }))) return;
    for (const x of legs) {
      const rev = await save('movements', { articleId: x.articleId, qty: -num(x.qty), type: 'storno', locationId: x.locationId || '', date: today(), unitCost: x.unitCost, note: `Storno: ${MV_TYPES[x.type]}${x.note ? ` (${x.note})` : ''}`, reverses: x.id });
      await save('movements', { ...get('movements', x.id), reversedBy: rev.id });
    }
    toast('Bewegung storniert.');
  }

  // =============================================================== Touren
  function viewTours() {
    const d = UI.f.tourDate || today();
    const tours = list('tours').filter((t) => t.date === d).sort(byText((t) => t.start || t.number));
    const openForDay = list('shipments').filter((s) => !s.tourId && OPEN_ST.includes(s.status) && (!s.deliveryDate || s.deliveryDate <= d));
    const upcoming = list('tours').filter((t) => t.date > d && t.status !== 'done').sort(byText((t) => t.date)).slice(0, 6);
    return `${pageHead('Touren & Disposition', 'Plane Touren je Tag, weise Fahrzeug, Fahrer:in und Sendungen zu.', `<button class="btn primary" data-act="tour-new" data-date="${esc(d)}">${icon('plus')} Neue Tour</button>`)}
      <div class="card" style="margin-bottom:16px"><div class="toolbar" style="border:0">
        <button class="btn icon" data-act="tour-day" data-d="-1" title="Vortag">${icon('left')}</button>
        <input type="date" value="${esc(d)}" data-filter="tourDate" style="width:170px">
        <button class="btn icon" data-act="tour-day" data-d="1" title="Nächster Tag">${icon('right')}</button>
        ${d !== today() ? `<button class="btn ghost" data-act="tour-day" data-d="0">Heute</button>` : ''}
        <b class="grow" style="margin-left:6px">${fmtDay(d)}</b>
        <span class="badge ${openForDay.length ? 'warn' : 'ok'} plain">${openForDay.length} Sendung${openForDay.length === 1 ? '' : 'en'} ohne Tour</span>
      </div></div>
      ${tours.length ? `<div class="tours-grid">${tours.map(tourCard).join('')}</div>`
        : `<div class="card"><div class="card-body">${empty('route', 'Keine Touren an diesem Tag', openForDay.length ? `${openForDay.length} offene Sendung(en) warten auf eine Tour.` : 'Lege eine Tour an, um Sendungen zuzuweisen.', `<button class="btn primary" data-act="tour-new" data-date="${esc(d)}">${icon('plus')} Tour anlegen</button>`)}</div></div>`}
      ${upcoming.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h2>Demnächst</h2></div><div class="list">
        ${upcoming.map((t) => `<a class="item" href="#/tour/${esc(t.id)}">${icon('calendar')}<span class="grow"><b>${esc(t.name || t.number)}</b> <span class="muted">· ${fmtDay(t.date)}</span></span><span class="muted">${tourProgress(t).total} Stopps</span>${badge(TOUR_STATUS, t.status)}</a>`).join('')}
      </div></div>` : ''}`;
  }

  function viewTour(id) {
    const t = get('tours', id);
    if (!t) return empty('route', 'Tour nicht gefunden', 'Sie wurde vielleicht gelöscht.', '<a class="btn" href="#/tours">Zu den Touren</a>');
    const stops = tourStops(t);
    const drv = get('drivers', t.driverId);
    const veh = get('vehicles', t.vehicleId);
    const p = tourProgress(t);
    const w = sum(stops, pkgWeight);
    const vol = sum(stops, pkgVolume);
    const cap = num(veh?.payload);
    const capV = num(veh?.volume);
    const locked = t.status === 'done';
    const showAll = UI.f.tourShowAll;
    const cands = list('shipments').filter((s) => !s.tourId && OPEN_ST.includes(s.status) && (showAll || !s.deliveryDate || s.deliveryDate <= t.date))
      .sort(byText((s) => `${s.deliveryDate || '0000'}${s.recipient?.zip || ''}`));
    const bar = (val, max, fmt, label) => {
      const pct = max ? Math.min(100, Math.round((val / max) * 100)) : 0;
      return `<div style="margin-bottom:12px"><div class="row" style="font-size:13px;margin-bottom:5px"><span class="grow">${label}</span><b>${fmt(val)}</b>${max ? `<span class="muted">/ ${fmt(max)}</span>` : ''}</div>
        <div class="progress ${max && val > max ? 'over' : ''}"><i style="width:${max ? pct : 0}%"></i></div>${max && val > max ? '<small style="color:var(--bad)">Überladen!</small>' : ''}</div>`;
    };
    return `${pageHead(`${esc(t.name || t.number)} ${badge(TOUR_STATUS, t.status)}`, `${esc(t.number)} · ${fmtDay(t.date)}${t.start ? ` · Start ${esc(t.start)} Uhr` : ''}`,
      `<button class="btn" data-act="print-tour" data-id="${esc(t.id)}">${icon('print')} Ladeliste</button>
       <button class="btn" data-act="tour-edit" data-id="${esc(t.id)}">${icon('edit')} Bearbeiten</button>
       ${t.status === 'planned' ? `<button class="btn primary" data-act="tour-start" data-id="${esc(t.id)}" ${stops.length ? '' : 'disabled'}>${icon('play')} Tour starten</button>` : ''}
       ${t.status === 'active' ? `<button class="btn primary" data-act="tour-finish" data-id="${esc(t.id)}">${icon('flag')} Tour abschließen</button>` : ''}`,
      '<a href="#/tours">Touren</a> /')}
      <div class="grid g-main">
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Stopps</h2><span class="muted">${p.done}/${p.total} erledigt</span></div>
            ${stops.length ? `<div class="stops">${stops.map((s, i) => `<div class="stop ${s.status === 'delivered' ? 'done' : ['failed', 'returned'].includes(s.status) ? 'fail' : ''}">
              <span class="n">${s.status === 'delivered' ? icon('check') : i + 1}</span>
              <div class="body"><div class="row" style="gap:8px;flex-wrap:wrap"><a href="#/shipment/${esc(s.id)}"><b>${esc(s.recipient?.name)}</b></a>${badge(SHIP_STATUS, s.status)}</div>
                <div class="addr">${esc(addrLine(s.recipient))}</div>
                <div class="t2 muted">${esc(s.number)} · ${pkgCount(s)} Pkt. · ${fmtKg(pkgWeight(s))}${fmtWindow(s) ? ` · ${esc(fmtWindow(s))}` : ''}${num(s.cod) ? ` · NN ${money(s.cod)}` : ''}</div></div>
              ${locked ? '' : `<div class="tools"><button class="btn ghost icon sm" data-act="stop-move" data-id="${esc(t.id)}" data-s="${esc(s.id)}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Nach oben">${icon('up')}</button>
                <button class="btn ghost icon sm" data-act="stop-move" data-id="${esc(t.id)}" data-s="${esc(s.id)}" data-d="1" ${i === stops.length - 1 ? 'disabled' : ''} title="Nach unten">${icon('down')}</button>
                ${DONE_ST.includes(s.status) ? '' : `<button class="btn ghost icon sm" data-act="stop-remove" data-id="${esc(t.id)}" data-s="${esc(s.id)}" title="Aus Tour entfernen">${icon('x')}</button>`}</div>`}
            </div>`).join('')}</div>` : `<div class="card-body">${empty('package', 'Noch keine Stopps', 'Füge unten offene Sendungen hinzu.')}</div>`}
          </div>
          ${locked ? '' : `<div class="card"><div class="card-head"><h2>Sendungen hinzufügen</h2>
              <label class="check" style="font-size:13px"><input type="checkbox" data-act="tour-showall" ${showAll ? 'checked' : ''}> alle offenen</label>
              ${cands.length > 1 ? `<button class="btn sm" data-act="tour-add-all" data-id="${esc(t.id)}">Alle ${cands.length} hinzufügen</button>` : ''}</div>
            ${cands.length ? `<div class="list">${cands.map((s) => `<div class="item"><span class="grow"><b>${esc(s.recipient?.name)}</b> <span class="muted">· ${esc([s.recipient?.zip, s.recipient?.city].filter(Boolean).join(' '))}</span>
                <div class="t2 muted">${esc(s.number)} · ${s.deliveryDate ? fmtDay(s.deliveryDate) : 'ohne Datum'} · ${fmtKg(pkgWeight(s))}</div></span>
                <button class="btn sm" data-act="stop-add" data-id="${esc(t.id)}" data-s="${esc(s.id)}">${icon('plus')} Hinzufügen</button></div>`).join('')}</div>`
              : `<div class="card-body"><p class="muted" style="margin:0">Keine offenen Sendungen${showAll ? '' : ' bis zu diesem Datum'}.</p></div>`}
          </div>`}
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Fahrzeug &amp; Fahrer:in</h2></div><div class="card-body"><dl class="kv">
            <dt>Fahrer:in</dt><dd>${drv ? `<b>${esc(drv.name)}</b>${drv.phone ? `<br><a href="tel:${esc(drv.phone)}">${esc(drv.phone)}</a>` : ''}` : '<span class="muted">nicht zugewiesen</span>'}</dd>
            <dt>Fahrzeug</dt><dd>${veh ? `<b>${esc(veh.plate)}</b><br><span class="muted">${esc([veh.name, veh.type].filter(Boolean).join(' · '))}</span>` : '<span class="muted">nicht zugewiesen</span>'}</dd>
            ${t.notes ? `<dt>Notiz</dt><dd>${esc(t.notes)}</dd>` : ''}
          </dl></div></div>
          <div class="card"><div class="card-head"><h2>Auslastung</h2></div><div class="card-body">
            ${bar(w, cap, fmtKg, 'Gewicht')}${bar(vol, capV, fmtM3, 'Volumen')}
            ${bar(p.done, p.total, (x) => String(x), 'Fortschritt')}
            ${!veh ? '<small class="muted">Weise ein Fahrzeug zu, um die Nutzlast zu prüfen.</small>' : ''}
          </div></div>
          ${t.status !== 'active' ? `<div class="row"><button class="btn danger sm" data-act="tour-delete" data-id="${esc(t.id)}">${icon('trash')} Tour löschen</button></div>` : ''}
        </div>
      </div>`;
  }

  function tourForm(existing = null, date = today()) {
    const t = existing || { date, status: 'planned', start: '07:30' };
    const drivers = list('drivers').filter((d) => d.active !== false || d.id === t.driverId).sort(byText((d) => d.name));
    const vehicles = list('vehicles').filter((v) => v.status !== 'inactive' || v.id === t.vehicleId).sort(byText((v) => v.plate));
    modal({
      title: existing ? `Tour ${t.number} bearbeiten` : 'Neue Tour', submit: existing ? 'Speichern' : 'Tour anlegen',
      body: `<div class="form">
        ${inp('name', 'Bezeichnung', t.name, 'maxlength="80" placeholder="z. B. Wien Süd – Vormittag"')}
        <div class="cols">${inp('date', 'Datum *', t.date, 'type="date" required')}${inp('start', 'Startzeit', t.start, 'type="time"')}</div>
        <div class="cols">${sel('driverId', 'Fahrer:in', [['', '– noch offen –'], ...drivers.map((d) => [d.id, d.name])], t.driverId)}
          ${sel('vehicleId', 'Fahrzeug', [['', '– noch offen –'], ...vehicles.map((v) => [v.id, `${v.plate}${v.name ? ` · ${v.name}` : ''}${v.status === 'workshop' ? ' (Werkstatt)' : ''}`])], t.vehicleId)}</div>
        ${area('notes', 'Notiz', t.notes, 'maxlength="500"')}
        ${!drivers.length || !vehicles.length ? `<div class="alert">${icon('info')}<p>Lege unter <b>Fuhrpark</b> und <b>Fahrer:innen</b> Stammdaten an, um sie hier auszuwählen.</p></div>` : ''}
      </div>`,
      async onSubmit(form) {
        const v = formData(form);
        const data = { ...t, ...v, driverId: v.driverId || null, vehicleId: v.vehicleId || null, stops: t.stops || [] };
        if (!existing) data.number = await nextNumber('tour', 'T');
        const saved = await save('tours', data);
        toast(existing ? 'Tour gespeichert.' : `Tour ${saved.number} angelegt.`);
        if (!existing) location.hash = `#/tour/${saved.id}`;
      },
    });
  }

  async function addStops(tourId, shipIds) {
    const t = get('tours', tourId);
    const ids = shipIds.filter((x) => !(t.stops || []).includes(x));
    await save('tours', { ...t, stops: [...(t.stops || []), ...ids] });
    for (const sid of ids) {
      const s = get('shipments', sid);
      const status = t.status === 'active' ? 'out' : 'planned';
      await save('shipments', { ...s, tourId, status, events: [...(s.events || []), { status, at: new Date().toISOString(), note: `Tour ${t.number}`, by: S.me.user.name }] });
    }
  }

  async function removeStop(tourId, sid) {
    const t = get('tours', tourId);
    const s = get('shipments', sid);
    await save('tours', { ...t, stops: (t.stops || []).filter((x) => x !== sid) });
    if (s) await save('shipments', { ...s, tourId: null, status: 'draft', events: [...(s.events || []), { status: 'draft', at: new Date().toISOString(), note: `aus Tour ${t.number} entfernt`, by: S.me.user.name }] });
  }

  async function startTour(t) {
    await save('tours', { ...t, status: 'active', startedAt: new Date().toISOString() });
    const veh = get('vehicles', t.vehicleId);
    for (const s of tourStops(t)) {
      if (!DONE_ST.includes(s.status) && s.status !== 'out') await setShipStatus(s, 'out', { place: veh ? veh.plate : '', note: `Tour ${t.number} gestartet` });
    }
    toast('Tour gestartet – Sendungen sind in Zustellung.');
  }

  async function finishTour(t) {
    const open = tourStops(t).filter((s) => !DONE_ST.includes(s.status));
    if (open.length && !(await confirmBox('Tour abschließen?', `${open.length} Stopp(s) sind noch offen. Sie werden aus der Tour genommen und können neu eingeplant werden.`, { ok: 'Abschließen' }))) return;
    for (const s of open) {
      await save('shipments', { ...s, tourId: null, status: 'draft', events: [...(s.events || []), { status: 'draft', at: new Date().toISOString(), note: `nicht zugestellt – Tour ${t.number} beendet`, by: S.me.user.name }] });
    }
    const cur = get('tours', t.id);
    await save('tours', { ...cur, status: 'done', finishedAt: new Date().toISOString(), stops: (cur.stops || []).filter((x) => !open.some((s) => s.id === x)) });
    toast('Tour abgeschlossen.');
  }

  function printTour(t) {
    const stops = tourStops(t);
    const drv = get('drivers', t.driverId);
    const veh = get('vehicles', t.vehicleId);
    printHtml(`<div class="doc">${docHead('Ladeliste', `Tour <b>${esc(t.number)}</b>${t.name ? `<br>${esc(t.name)}` : ''}<br>${fmtDay(t.date)}${t.start ? ` · ${esc(t.start)} Uhr` : ''}`)}
      <div class="doc-cols"><div><div class="lbl">Fahrer:in</div><b>${esc(drv?.name || '–')}</b>${drv?.phone ? `<br>${esc(drv.phone)}` : ''}</div>
        <div><div class="lbl">Fahrzeug</div><b>${esc(veh?.plate || '–')}</b>${veh ? `<br>${esc([veh.name, veh.type].filter(Boolean).join(' · '))}` : ''}</div></div>
      <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">#</th><th style="text-align:left">Empfänger</th><th style="text-align:left">Sendung</th><th style="text-align:right">Pkt.</th><th style="text-align:right">Gewicht</th><th style="text-align:left">Hinweis</th><th style="text-align:left;width:28mm">Unterschrift</th></tr></thead><tbody>
      ${stops.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.recipient?.name || '')}</b><br><span style="font-size:9pt">${esc(addrLine(s.recipient))}${s.recipient?.phone ? ` · ${esc(s.recipient.phone)}` : ''}</span></td>
        <td style="font-size:9pt">${esc(s.number)}<br>${esc(s.trackingCode)}</td><td style="text-align:right">${pkgCount(s)}</td><td style="text-align:right">${fmtKg(pkgWeight(s))}</td>
        <td style="font-size:9pt">${esc(fmtWindow(s))}${num(s.cod) ? ` <b>NN ${money(s.cod)}</b>` : ''}${s.notes ? `<br>${esc(s.notes)}` : ''}</td><td></td></tr>`).join('')}
      <tr><td></td><td><b>${stops.length} Stopps</b></td><td></td><td style="text-align:right"><b>${sum(stops, pkgCount)}</b></td><td style="text-align:right"><b>${fmtKg(sum(stops, pkgWeight))}</b></td><td colspan="2"></td></tr>
      </tbody></table>
      <div class="sign"><div>Beladen von / Uhrzeit</div><div>Übernommen von Fahrer:in</div></div></div>`);
  }

  // =============================================================== Stammdaten (Fuhrpark, Fahrer, Kontakte)
  function tableView({ key, title, sub, newAct, newLabel, rows, head, row, emptyIc, emptyText, searchFields }) {
    const q = String(UI.f.q[key] || '').toLowerCase();
    const shown = rows.filter((r) => !q || searchFields(r).some((v) => String(v || '').toLowerCase().includes(q)));
    return `${pageHead(title, sub, canPlan() ? `<button class="btn primary" data-act="${newAct}">${icon('plus')} ${newLabel}</button>` : '')}
      <div class="card">
        ${rows.length ? `<div class="toolbar"><label class="search">${icon('search')}<input type="search" placeholder="Suchen …" value="${esc(UI.f.q[key] || '')}" data-keep="q-${key}" data-filter="q.${key}"></label><span class="muted">${shown.length} von ${rows.length}</span></div>` : ''}
        ${shown.length ? `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${shown.map(row).join('')}</tbody></table></div>`
          : empty(emptyIc, rows.length ? 'Keine Treffer' : `Noch keine Einträge`, rows.length ? 'Passe die Suche an.' : emptyText, rows.length ? '' : `<button class="btn primary" data-act="${newAct}">${icon('plus')} ${newLabel}</button>`)}
      </div>`;
  }

  function viewFleet() {
    const vs = list('vehicles').sort(byText((v) => v.plate));
    return tableView({
      key: 'fleet', title: 'Fuhrpark', sub: 'Fahrzeuge mit Nutzlast, §57a-Begutachtung („Pickerl“) und Service.', newAct: 'veh-new', newLabel: 'Fahrzeug',
      rows: vs, emptyIc: 'truck', emptyText: 'Erfasse deine Fahrzeuge, um Touren zu planen und Fälligkeiten im Blick zu behalten.',
      searchFields: (v) => [v.plate, v.name, v.type],
      head: '<th>Kennzeichen</th><th class="hide-m">Typ</th><th class="num hide-m">Nutzlast</th><th>§57a-Pickerl</th><th class="hide-m">Service</th><th>Status</th>',
      row: (v) => `<tr class="click" data-act="veh-edit" data-id="${esc(v.id)}"><td><div class="t1 mono">${esc(v.plate)}</div><div class="t2">${esc(v.name || '')}</div></td>
        <td class="hide-m">${esc(v.type || '–')}</td><td class="num hide-m">${v.payload ? fmtKg(v.payload) : '–'}${v.volume ? `<div class="t2">${fmtM3(v.volume)}</div>` : ''}</td>
        <td>${dueBadge(v.inspectionDue, '§57a')}</td><td class="hide-m">${dueBadge(v.serviceDue, 'Service')}${v.mileage ? `<div class="t2">${NUMF.format(v.mileage)} km</div>` : ''}</td><td>${badge(VEHICLE_STATUS, v.status || 'active')}</td></tr>`,
    });
  }

  function vehicleForm(v = null) {
    const x = v || { status: 'active', type: 'Transporter' };
    modal({
      title: v ? `Fahrzeug ${x.plate}` : 'Neues Fahrzeug', submit: 'Speichern', extra: v && canPlan() ? `<button type="button" class="btn danger sm" data-del>${icon('trash')} Löschen</button>` : '',
      body: `<div class="form">
        <div class="cols">${inp('plate', 'Kennzeichen *', x.plate, 'required maxlength="20" placeholder="W-12345X" style="text-transform:uppercase"')}${inp('name', 'Bezeichnung', x.name, 'maxlength="60" placeholder="z. B. Sprinter 1"')}</div>
        <div class="cols">${sel('type', 'Typ', VEHICLE_TYPES.map((t) => [t, t]), x.type)}${sel('status', 'Status', Object.entries(VEHICLE_STATUS).map(([k, s]) => [k, s.l]), x.status)}</div>
        <div class="cols3">${inp('payload', 'Nutzlast (kg)', x.payload || '', 'inputmode="numeric"')}${inp('volume', 'Laderaum (m³)', x.volume ? String(x.volume).replace('.', ',') : '', 'inputmode="decimal"')}${inp('mileage', 'Kilometerstand', x.mileage || '', 'inputmode="numeric"')}</div>
        <div class="cols">${inp('inspectionDue', '§57a-Pickerl fällig', x.inspectionDue, 'type="date"', 'Wiederkehrende Begutachtung')}${inp('serviceDue', 'Nächstes Service', x.serviceDue, 'type="date"')}</div>
        ${area('notes', 'Notizen', x.notes, 'maxlength="1000"')}
      </div>`,
      onOpen(form, close) {
        $('[data-del]', form)?.addEventListener('click', async () => {
          if (list('tours').some((t) => t.vehicleId === x.id && t.status !== 'done')) return toast('Das Fahrzeug ist noch offenen Touren zugewiesen.', 'bad');
          if (await confirmBox('Fahrzeug löschen?', `<b>${esc(x.plate)}</b> wird gelöscht.`, { ok: 'Löschen', danger: true })) { await remove('vehicles', x.id).catch(fail); close(); toast('Fahrzeug gelöscht.'); }
        });
      },
      async onSubmit(form) {
        const f = formData(form);
        await save('vehicles', { ...x, ...f, plate: f.plate.toUpperCase(), payload: num(f.payload), volume: num(f.volume), mileage: num(f.mileage) });
        toast('Fahrzeug gespeichert.');
      },
    });
  }

  function viewDrivers() {
    const ds = list('drivers').sort(byText((d) => d.name));
    const members = new Map(S.me.members.map((m) => [m.id, m]));
    return tableView({
      key: 'drivers', title: 'Fahrer:innen', sub: 'Mit Führerscheinklassen, Ablaufdaten und verknüpftem Benutzerkonto für die Fahrer-App.', newAct: 'drv-new', newLabel: 'Fahrer:in',
      rows: ds, emptyIc: 'idcard', emptyText: 'Lege Fahrer:innen an und verknüpfe sie mit ihrem Konto – dann sehen sie ihre Tour am Handy.',
      searchFields: (d) => [d.name, d.phone, d.email, d.licenseClasses],
      head: '<th>Name</th><th class="hide-m">Telefon</th><th>Führerschein</th><th class="hide-m">Code 95</th><th class="hide-m">Konto</th><th>Status</th>',
      row: (d) => `<tr class="click" data-act="drv-edit" data-id="${esc(d.id)}"><td><div class="row"><span class="avatar">${esc(initials(d.name))}</span><div><div class="t1">${esc(d.name)}</div><div class="t2">${esc(d.email || '')}</div></div></div></td>
        <td class="hide-m">${d.phone ? `<a href="tel:${esc(d.phone)}">${esc(d.phone)}</a>` : '–'}</td>
        <td><div>${esc(d.licenseClasses || '–')}</div>${d.licenseExpiry ? dueBadge(d.licenseExpiry) : ''}</td><td class="hide-m">${dueBadge(d.c95Expiry)}</td>
        <td class="hide-m">${d.userId && members.get(d.userId) ? `<span class="badge violet plain">${esc(members.get(d.userId).name)}</span>` : '<span class="muted">–</span>'}</td>
        <td>${d.active === false ? '<span class="badge">inaktiv</span>' : '<span class="badge ok">aktiv</span>'}</td></tr>`,
    });
  }

  function driverForm(d = null) {
    const x = d || { active: true };
    const taken = new Set(list('drivers').filter((o) => o.id !== x.id && o.userId).map((o) => o.userId));
    const members = S.me.members.filter((m) => !taken.has(m.id));
    modal({
      title: d ? x.name : 'Neue:r Fahrer:in', extra: d ? `<button type="button" class="btn danger sm" data-del>${icon('trash')} Löschen</button>` : '',
      body: `<div class="form">
        <div class="cols">${inp('name', 'Name *', x.name, 'required maxlength="80"')}${inp('phone', 'Telefon', x.phone, 'type="tel" maxlength="40"')}</div>
        ${inp('email', 'E-Mail', x.email, 'type="email" maxlength="120"')}
        <div class="cols3">${inp('licenseClasses', 'Führerscheinklassen', x.licenseClasses, 'maxlength="40" placeholder="B, C1, CE"')}${inp('licenseExpiry', 'Führerschein gültig bis', x.licenseExpiry, 'type="date"')}${inp('c95Expiry', 'Code 95 gültig bis', x.c95Expiry, 'type="date"', 'Berufskraftfahrer-Weiterbildung')}</div>
        ${sel('userId', 'Benutzerkonto (für „Meine Tour“)', [['', '– nicht verknüpft –'], ...members.map((m) => [m.id, `${m.name} · ${m.email}`])], x.userId)}
        <label class="check"><input type="checkbox" name="active" value="1" ${x.active !== false ? 'checked' : ''}> aktiv (bei der Tourenplanung auswählbar)</label>
        ${area('notes', 'Notizen', x.notes, 'maxlength="1000"')}
      </div>`,
      onOpen(form, close) {
        $('[data-del]', form)?.addEventListener('click', async () => {
          if (list('tours').some((t) => t.driverId === x.id && t.status !== 'done')) return toast('Noch offenen Touren zugewiesen.', 'bad');
          if (await confirmBox('Eintrag löschen?', `<b>${esc(x.name)}</b> wird gelöscht.`, { ok: 'Löschen', danger: true })) { await remove('drivers', x.id).catch(fail); close(); toast('Gelöscht.'); }
        });
      },
      async onSubmit(form) {
        const f = formData(form);
        await save('drivers', { ...x, ...f, userId: f.userId || null, active: !!f.active });
        toast('Gespeichert.');
      },
    });
  }

  const CONTACT_TYPES = { customer: 'Kunde', recipient: 'Empfänger', supplier: 'Lieferant', partner: 'Partner / Subunternehmer' };
  function viewContacts() {
    const cs = list('contacts').sort(byText((c) => c.name));
    return tableView({
      key: 'contacts', title: 'Kontakte', sub: 'Kunden, Empfänger und Partner – für schnelles Ausfüllen von Sendungen.', newAct: 'con-new', newLabel: 'Kontakt',
      rows: cs, emptyIc: 'book', emptyText: 'Kontakte kannst du hier anlegen oder direkt beim Erfassen einer Sendung speichern.',
      searchFields: (c) => [c.name, c.contact, c.city, c.zip, c.email, c.phone],
      head: '<th>Name</th><th>Adresse</th><th class="hide-m">Kontakt</th><th class="hide-m">Art</th><th class="num hide-m">Sendungen</th>',
      row: (c) => {
        const n = list('shipments').filter((s) => s.customerId === c.id || (s.recipient?.name === c.name && s.recipient?.city === c.city)).length;
        return `<tr class="click" data-act="con-edit" data-id="${esc(c.id)}"><td><div class="t1">${esc(c.name)}</div><div class="t2">${esc(c.contact || '')}</div></td>
          <td>${esc(addrLine(c)) || '<span class="muted">–</span>'}</td><td class="hide-m"><div>${esc(c.phone || '')}</div><div class="t2">${esc(c.email || '')}</div></td>
          <td class="hide-m"><span class="badge plain">${esc(CONTACT_TYPES[c.type] || 'Kunde')}</span></td><td class="num hide-m">${n || '–'}</td></tr>`;
      },
    });
  }

  function contactForm(c = null) {
    const x = c || { type: 'customer', country: 'AT' };
    modal({
      title: c ? x.name : 'Neuer Kontakt', extra: c ? `<button type="button" class="btn danger sm" data-del>${icon('trash')} Löschen</button>` : '',
      body: `<div class="form">
        <div class="cols">${inp('name', 'Name / Firma *', x.name, 'required maxlength="120"')}${sel('type', 'Art', Object.entries(CONTACT_TYPES), x.type)}</div>
        ${inp('contact', 'Ansprechperson', x.contact, 'maxlength="80"')}
        ${inp('street', 'Straße & Hausnummer', x.street, 'maxlength="120"')}
        <div class="cols-zip">${inp('zip', 'PLZ', x.zip, 'maxlength="10"')}${inp('city', 'Ort', x.city, 'maxlength="80"')}${sel('country', 'Land', COUNTRIES.map((k) => [k, k]), x.country || 'AT')}</div>
        <div class="cols">${inp('phone', 'Telefon', x.phone, 'type="tel" maxlength="40"')}${inp('email', 'E-Mail', x.email, 'type="email" maxlength="120"')}</div>
        ${area('notes', 'Notizen', x.notes, 'maxlength="1000" placeholder="z. B. Lieferzeiten, Zufahrt, Rampe"')}
      </div>`,
      onOpen(form, close) {
        $('[data-del]', form)?.addEventListener('click', async () => {
          if (await confirmBox('Kontakt löschen?', `<b>${esc(x.name)}</b> wird gelöscht. Bestehende Sendungen bleiben unverändert.`, { ok: 'Löschen', danger: true })) { await remove('contacts', x.id).catch(fail); close(); toast('Kontakt gelöscht.'); }
        });
      },
      async onSubmit(form) { await save('contacts', { ...x, ...formData(form) }); toast('Kontakt gespeichert.'); },
    });
  }

  // =============================================================== Fahrer-Ansicht „Meine Tour“
  function viewMyTour() {
    const ids = myDriverIds();
    if (!ids.length) {
      return `${pageHead('Meine Tour')}<div class="card"><div class="card-body">${empty('idcard', 'Noch keinem Fahrer zugeordnet',
        'Bitte die Disposition, dein Konto unter <b>Fahrer:innen</b> mit deinem Eintrag zu verknüpfen. Danach erscheinen deine Touren hier.')}</div></div>`;
    }
    const t0 = today();
    const tours = list('tours').filter((t) => ids.includes(t.driverId) && (t.date === t0 || t.status === 'active')).sort(byText((t) => `${t.date}${t.start || ''}`));
    const later = list('tours').filter((t) => ids.includes(t.driverId) && t.date > t0 && t.status === 'planned').sort(byText((t) => t.date)).slice(0, 5);
    const tourBlock = (t) => {
      const st = tourStops(t);
      const p = tourProgress(t);
      const veh = get('vehicles', t.vehicleId);
      const next = st.find((s) => !DONE_ST.includes(s.status));
      return `<div class="card"><div class="card-head"><h2>${esc(t.name || t.number)}</h2>${badge(TOUR_STATUS, t.status)}</div>
        <div class="card-body" style="padding-bottom:6px"><div class="row wrap muted" style="font-size:13px;gap:14px">${icon('calendar')}${fmtDay(t.date)}${t.start ? ` · ${esc(t.start)} Uhr` : ''}<span>${icon('truck')} ${esc(veh?.plate || '–')}</span><span>${icon('package')} ${p.total} Stopps</span></div>
        <div class="progress" style="margin:12px 0 4px"><i style="width:${p.pct}%"></i></div><small class="muted">${p.done} von ${p.total} erledigt</small>
        ${t.status === 'planned' ? `<button class="btn primary lg block" style="margin-top:12px" data-act="tour-start" data-id="${esc(t.id)}" ${st.length ? '' : 'disabled'}>${icon('play')} Tour starten</button>` : ''}
        ${t.status === 'active' && !next ? `<button class="btn ok lg block" style="margin-top:12px" data-act="tour-finish" data-id="${esc(t.id)}">${icon('flag')} Tour abschließen</button>` : ''}
        </div>
        ${st.map((s, i) => {
          const done = DONE_ST.includes(s.status);
          return `<div class="drive-stop" style="${done ? 'opacity:.6' : ''}${s === next ? ';background:var(--primary-soft)' : ''}">
            <div class="row" style="align-items:flex-start"><span class="stop ${s.status === 'delivered' ? 'done' : ['failed', 'returned'].includes(s.status) ? 'fail' : ''}" style="padding:0;border:0"><span class="n">${s.status === 'delivered' ? icon('check') : i + 1}</span></span>
              <div class="grow"><b>${esc(s.recipient?.name)}</b> ${badge(SHIP_STATUS, s.status)}<div>${esc(addrLine(s.recipient))}</div>
              <div class="t2 muted">${pkgCount(s)} Pkt. · ${fmtKg(pkgWeight(s))}${fmtWindow(s) ? ` · ${esc(fmtWindow(s))}` : ''}${num(s.cod) ? ` · <b style="color:var(--warn)">Nachnahme ${money(s.cod)}</b>` : ''}</div>
              ${s.notes ? `<div class="alert" style="margin-top:8px;padding:8px 10px">${icon('info')}<p>${esc(s.notes)}</p></div>` : ''}</div></div>
            ${done ? '' : `<div class="row btns">
              <a class="btn" href="${esc(mapsUrl(s.recipient))}" target="_blank" rel="noopener">${icon('nav')} Navigation</a>
              ${s.recipient?.phone ? `<a class="btn" href="tel:${esc(s.recipient.phone)}">${icon('phone')} Anrufen</a>` : ''}
              ${t.status === 'active' ? `<button class="btn ok" data-act="drv-deliver" data-id="${esc(s.id)}">${icon('check')} Zugestellt</button><button class="btn danger" data-act="drv-fail" data-id="${esc(s.id)}">${icon('alert')} Problem</button>` : ''}
            </div>`}</div>`;
        }).join('')}</div>`;
    };
    return `${pageHead('Meine Tour', fmtDay(t0))}
      ${tours.length ? `<div class="stack">${tours.map(tourBlock).join('')}</div>` : `<div class="card"><div class="card-body">${empty('route', 'Heute keine Tour', 'Für heute ist dir keine Tour zugewiesen.')}</div></div>`}
      ${later.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h2>Nächste Touren</h2></div><div class="list">${later.map((t) => `<div class="item">${icon('calendar')}<span class="grow"><b>${esc(t.name || t.number)}</b><div class="t2 muted">${fmtDay(t.date)}${t.start ? ` · ${esc(t.start)} Uhr` : ''}</div></span><span class="muted">${tourProgress(t).total} Stopps</span></div>`).join('')}</div></div>` : ''}`;
  }

  function deliverForm(s) {
    modal({
      title: `Zugestellt · ${s.recipient?.name || s.number}`, size: 'sm', submit: 'Zustellung bestätigen',
      body: `<div class="form">${inp('name', 'Übernommen von *', '', 'required maxlength="80" placeholder="Name der Person"')}
        ${num(s.cod) ? `<div class="alert warn">${icon('alert')}<p>Nachnahme <b>${money(s.cod)}</b> kassieren!</p></div>` : ''}
        ${area('note', 'Notiz', '', 'maxlength="300" placeholder="z. B. beim Nachbarn Top 4 abgegeben"')}</div>`,
      async onSubmit(form) {
        const v = formData(form);
        await setShipStatus(s, 'delivered', { place: s.recipient?.city || '', note: v.note, pod: { name: v.name, at: new Date().toISOString(), note: v.note } });
        toast('Zustellung gespeichert.');
      },
    });
  }

  function failForm(s) {
    const reasons = ['Empfänger nicht angetroffen', 'Annahme verweigert', 'Adresse nicht auffindbar', 'Sendung beschädigt', 'Zeitfenster verpasst', 'Sonstiges'];
    modal({
      title: `Problem · ${s.recipient?.name || s.number}`, size: 'sm', submit: 'Speichern', danger: true,
      body: `<div class="form">${sel('reason', 'Grund', reasons.map((r) => [r, r]), reasons[0])}
        ${sel('status', 'Weiter mit', [['failed', 'Zustellproblem (neuer Versuch)'], ['returned', 'Retour an Absender']], 'failed')}
        ${area('note', 'Notiz', '', 'maxlength="300"')}</div>`,
      async onSubmit(form) {
        const v = formData(form);
        await setShipStatus(s, v.status, { place: s.recipient?.city || '', note: [v.reason, v.note].filter(Boolean).join(' – ') });
        toast('Gespeichert.');
      },
    });
  }

  // =============================================================== Team
  function viewTeam() {
    const ms = [...S.me.members].sort(byText((m) => m.name));
    const me = S.me.user;
    const inv = S.me.company.inviteCode;
    return `${pageHead('Team', `${ms.length} ${ms.length === 1 ? 'Person' : 'Personen'} bei ${esc(S.me.company.name)}`)}
      <div class="grid g-main">
        <div class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Rolle</th>${isAdmin() ? '<th></th>' : ''}</tr></thead><tbody>
          ${ms.map((m) => `<tr><td><div class="row"><span class="avatar">${esc(initials(m.name))}</span><div><div class="t1">${esc(m.name)}${m.id === me.id ? ' <span class="muted">(du)</span>' : ''}</div><div class="t2">${esc(m.email)}</div></div></div></td>
            <td>${isAdmin() && m.id !== me.id ? `<select data-act-change="role" data-id="${esc(m.id)}" style="width:auto">${opts(Object.entries(ROLES), m.role)}</select>` : `<span class="badge violet plain">${esc(ROLES[m.role])}</span>`}</td>
            ${isAdmin() ? `<td class="right">${m.id !== me.id ? `<button class="btn ghost icon sm danger" data-act="member-remove" data-id="${esc(m.id)}" title="Entfernen">${icon('trash')}</button>` : ''}</td>` : ''}</tr>`).join('')}
        </tbody></table></div></div>
        <div class="stack">
          ${isAdmin() && inv ? `<div class="card"><div class="card-head"><h2>Einladen</h2></div><div class="card-body">
            <p class="muted">Neue Teammitglieder registrieren sich und geben diesen Code ein. Sie starten als <b>Fahrer:in</b>.</p>
            <div class="code-box"><span class="mono">${esc(inv)}</span><button class="btn ghost icon sm" data-act="copy" data-text="${esc(inv)}" title="Kopieren">${icon('copy')}</button></div>
            <div class="row" style="margin-top:10px"><button class="btn sm" data-act="copy" data-text="${esc(`Tritt ${S.me.company.name} auf NEXLOGISTIC bei: ${appBase()} – Einladungscode: ${inv}`)}" data-msg="Einladung kopiert.">${icon('mail')} Einladungstext kopieren</button>
            <button class="btn ghost sm" data-act="invite-rotate">${icon('undo')} Neuer Code</button></div>
          </div></div>` : ''}
          <div class="card"><div class="card-head"><h2>Rollen</h2></div><div class="card-body"><dl class="kv" style="grid-template-columns:110px 1fr">
            <dt>Admin</dt><dd>Alles, inkl. Team, Einladungen und Firmendaten.</dd>
            <dt>Disposition</dt><dd>Lager, Sendungen, Touren, Fuhrpark, Fahrer:innen und Kontakte.</dd>
            <dt>Lager</dt><dd>Artikel, Wareneingang/-ausgang, Umbuchung, Inventur und Kommissionierung von Sendungen.</dd>
            <dt>Fahrer:in</dt><dd>Sieht die eigene Tour, setzt Zustellstatus und Zustellnachweis.</dd>
          </dl></div></div>
        </div>
      </div>`;
  }

  // =============================================================== Einstellungen & Konto
  function viewSettings() {
    const c = companySettings();
    const dp = c.depot || {};
    let theme = 'system';
    try { theme = localStorage.getItem('nl-theme') || 'system'; } catch { /* privat */ }
    return `${pageHead('Einstellungen', 'Firmendaten erscheinen auf Lieferscheinen, Ladelisten und als Standard-Absender.')}
      <form class="stack" data-form="settings" style="max-width:860px">
        <div class="card"><div class="card-head"><h2>Firma</h2></div><div class="card-body form">
          ${inp('companyName', 'Firmenname', S.me.company.name, `maxlength="120" ${isAdmin() ? '' : 'disabled'}`, isAdmin() ? '' : 'Nur Admins können den Namen ändern.')}
          ${inp('street', 'Straße & Hausnummer', c.street)}
          <div class="cols-zip">${inp('zip', 'PLZ', c.zip, 'maxlength="10"')}${inp('city', 'Ort', c.city, 'maxlength="80"')}${sel('country', 'Land', COUNTRIES.map((k) => [k, k]), c.country || 'AT')}</div>
          <div class="cols3">${inp('phone', 'Telefon', c.phone, 'type="tel"')}${inp('email', 'E-Mail', c.email, 'type="email"')}${inp('uid', 'UID-Nummer', c.uid, 'maxlength="20" placeholder="ATU12345678"')}</div>
        </div></div>
        <div class="card"><div class="card-head"><h2>Depot / Lager</h2><small class="muted">optional – sonst gilt die Firmenadresse als Absender</small></div><div class="card-body form">
          ${inp('depot.street', 'Straße & Hausnummer', dp.street)}
          <div class="cols-zip">${inp('depot.zip', 'PLZ', dp.zip, 'maxlength="10"')}${inp('depot.city', 'Ort', dp.city, 'maxlength="80"')}${sel('depot.country', 'Land', COUNTRIES.map((k) => [k, k]), dp.country || 'AT')}</div>
        </div></div>
        <div class="row"><button class="btn primary">${icon('check')} Speichern</button></div>
      </form>
      <div class="card" style="max-width:860px;margin-top:16px"><div class="card-head"><h2>Darstellung</h2></div><div class="card-body">
        <div class="chips">${[['system', 'Wie System'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button class="chip ${theme === k ? 'on' : ''}" data-act="theme" data-k="${k}">${l}</button>`).join('')}</div>
      </div></div>`;
  }

  function viewAccount() {
    const u = S.me.user;
    return `${pageHead('Mein Konto', 'Dein Andrerer-Konto gilt für alle NEX-Apps.', `<button class="btn" data-act="logout">${icon('logout')} Abmelden</button>`)}
      <div class="grid g2" style="max-width:960px">
        <div class="card"><div class="card-head"><h2>Profil</h2></div><div class="card-body">
          <form class="form" data-form="profile">${inp('name', 'Name', u.name, 'required maxlength="80"')}<div><button class="btn primary">Speichern</button></div></form></div></div>
        <div class="card"><div class="card-head"><h2>E-Mail-Adresse</h2></div><div class="card-body">
          <form class="form" data-form="email">${inp('email', 'E-Mail', S.session.user.email, 'type="email" required')}<small class="muted">Du bekommst einen Bestätigungslink an die neue Adresse.</small><div><button class="btn">Ändern</button></div></form></div></div>
        <div class="card"><div class="card-head"><h2>Passwort</h2></div><div class="card-body">
          <form class="form" data-form="password">${inp('current', 'Aktuelles Passwort', '', 'type="password" autocomplete="current-password" required')}${inp('password', 'Neues Passwort', '', 'type="password" autocomplete="new-password" minlength="8" required', 'Mindestens 8 Zeichen.')}<div><button class="btn">Passwort ändern</button></div></form></div></div>
        <div class="card"><div class="card-head"><h2>Firma</h2></div><div class="card-body">
          <p><b>${esc(S.me.company.name)}</b><br><span class="muted">Rolle: ${esc(ROLES[u.role])}</span></p>
          <div class="row wrap"><button class="btn" data-act="logout-all">Auf allen Geräten abmelden</button><button class="btn danger" data-act="leave">Firma verlassen</button></div></div></div>
      </div>`;
  }

  // =============================================================== Öffentliche Sendungsverfolgung
  const TRACK_STEPS = ['Erfasst', 'Abgeholt', 'Unterwegs', 'In Zustellung', 'Zugestellt'];
  const TRACK_IDX = { draft: 0, planned: 0, picked: 1, transit: 2, out: 3, delivered: 4, failed: 3, returned: 2, cancelled: 0 };
  async function loadTrack(code) {
    UI.trackCode = String(code || '').trim().toUpperCase();
    UI.track = { loading: !!UI.trackCode };
    render();
    if (!UI.trackCode || !sb) return;
    const { data, error } = await sb.rpc('nl_track', { p_code: UI.trackCode });
    UI.track = { loading: false, data, error };
    render();
  }

  function viewTrack() {
    const T = UI.track || {};
    const d = T.data;
    let body;
    if (!UI.trackCode) body = `<div class="card-body">${empty('search', 'Sendung verfolgen', 'Gib deine Tracking-Nummer ein.')}</div>`;
    else if (T.loading) body = '<div class="card-body"><p class="muted">Sendung wird gesucht …</p></div>';
    else if (T.error) body = `<div class="card-body">${empty('alert', 'Abfrage nicht möglich', isMissingSchema(T.error) ? 'Die Sendungsverfolgung ist noch nicht eingerichtet.' : esc(T.error.message))}</div>`;
    else if (!d) body = `<div class="card-body">${empty('search', 'Keine Sendung gefunden', `Zur Nummer <b class="mono">${esc(UI.trackCode)}</b> gibt es keine Sendung. Bitte prüfe die Eingabe.`)}</div>`;
    else {
      const idx = TRACK_IDX[d.status] ?? 0;
      const st = SHIP_STATUS[d.status] || { l: d.status };
      const evs = [...(d.events || [])].reverse();
      const place = (p) => [p?.zip, p?.city].filter(Boolean).join(' ') + (p?.country && p.country !== 'AT' ? ` (${p.country})` : '');
      body = `<div class="card-body">
        <div class="track-status"><span class="big">${icon(d.status === 'delivered' ? 'checkc' : ['failed', 'returned', 'cancelled'].includes(d.status) ? 'alert' : 'truck')}</span>
          <div><div class="muted" style="font-size:12.5px">Sendung ${esc(d.number || '')} · ${esc(d.company || '')}</div><h1 style="font-size:24px">${esc(st.l)}</h1>
          ${d.status !== 'delivered' && d.plannedDate ? `<div>Voraussichtliche Zustellung: <b>${fmtDay(d.plannedDate)}</b>${d.windowFrom || d.windowTo ? `, ${esc(d.windowFrom || '…')}–${esc(d.windowTo || '…')} Uhr` : ''}</div>` : ''}</div></div>
        ${d.status === 'cancelled' ? '' : `<div class="steps">${TRACK_STEPS.map((_, i) => `<div class="${i <= idx ? 'on' : ''}"></div>`).join('')}</div><div class="steps-l">${TRACK_STEPS.map((s) => `<span>${s}</span>`).join('')}</div>`}
        ${d.status === 'failed' ? `<div class="alert bad" style="margin-top:14px">${icon('alert')}<p>Bei der Zustellung gab es ein Problem. Wir versuchen es erneut oder melden uns bei dir.</p></div>` : ''}
        ${d.status === 'returned' ? `<div class="alert warn" style="margin-top:14px">${icon('undo')}<p>Die Sendung geht an den Absender zurück.</p></div>` : ''}
        <div class="sep"></div>
        <dl class="kv"><dt>Tracking-Nummer</dt><dd class="mono">${esc(d.trackingCode)}</dd><dt>Von</dt><dd>${esc(place(d.from)) || '–'}</dd><dt>Nach</dt><dd>${esc(place(d.to)) || '–'}</dd><dt>Packstücke</dt><dd>${esc(d.packages)}</dd>${d.service ? `<dt>Service</dt><dd>${esc(SERVICES[d.service] || d.service)}</dd>` : ''}</dl>
        <div class="sep"></div><h2 style="margin-bottom:12px">Verlauf</h2>
        <ul class="timeline">${evs.map((e, i) => `<li class="${i === 0 ? 'cur' : ''}"><b>${esc(SHIP_STATUS[e.status]?.l || e.status)}</b><small>${fmtTime(e.at)}${e.place ? ` · ${esc(e.place)}` : ''}</small></li>`).join('')}</ul>
      </div>`;
    }
    return `<div class="track-page"><div class="track-head"><div class="in"><img src="logo-dark.svg" alt="NEXLOGISTIC"><span class="grow"></span>
        ${S.session ? '<a class="btn sm" style="color:#fff;border-color:rgba(255,255,255,.25);background:transparent" href="./">Zur App</a>' : ''}</div></div>
      <div class="track-body">
        <form class="card" data-form="track-go" style="margin-bottom:16px"><div class="card-body row"><label class="search grow">${icon('search')}<input name="code" value="${esc(UI.trackCode || '')}" placeholder="Tracking-Nummer" autocomplete="off" style="text-transform:uppercase"></label><button class="btn primary">Verfolgen</button></div></form>
        <div class="card">${body}</div>
        <p class="muted" style="text-align:center;margin-top:18px;font-size:12px">Sendungsverfolgung mit NEXLOGISTIC by Andrerer</p>
      </div></div>`;
  }

  // =============================================================== Beispieldaten
  async function loadDemo() {
    if (!(await confirmBox('Beispieldaten laden?', 'Es werden 2 Lagerorte, 8 Lagerartikel mit Beständen, Lieferanten, Fahrzeuge, Fahrer:innen, 6 Sendungen und eine Tour für heute angelegt. Du kannst alles später löschen oder archivieren.', { ok: 'Laden' }))) return;
    const t = today();
    // Lager
    const loc2 = await save('locations', { name: 'Außenlager Simmering', code: 'AL-11', address: 'Leberstraße 64, 1110 Wien' });
    const sup1 = await save('contacts', { type: 'supplier', name: 'Alpenquell Getränke GmbH', street: 'Quellenweg 3', zip: '5020', city: 'Salzburg', country: 'AT', phone: '+43 662 445566' });
    const sup2 = await save('contacts', { type: 'supplier', name: 'Packwerk Verpackungen KG', street: 'Gewerbepark 12', zip: '2700', city: 'Wiener Neustadt', country: 'AT' });
    const artDefs = [
      ['Mineralwasser still 6 × 1,5 l', 'Getränke', 'Karton', 9.4, 2.85, 40, '', 'A-01-1', 64, sup1, '9001234500017'],
      ['Apfelsaft naturtrüb 6 × 1 l', 'Getränke', 'Karton', 6.6, 5.9, 30, '', 'A-01-2', 22, sup1, '9001234500024'],
      ['Kaffeebohnen Crema 1 kg', 'Kolonialwaren', 'Stk', 1.05, 13.2, 20, '', 'B-03-1', 48, null, '9001234500031'],
      ['Olivenöl extra vergine 5 l', 'Kolonialwaren', 'Kanister', 4.7, 31.5, 8, '', 'B-04-2', 6, null, '9001234500048'],
      ['Weizenmehl Type 700 25 kg', 'Backwaren', 'Sack', 25, 14.8, 10, loc2.id, 'H2-07', 35, null, ''],
      ['Versandkarton 60 × 40 × 40', 'Verpackung', 'Stk', 0.6, 1.15, 100, loc2.id, 'H1-02', 250, sup2, ''],
      ['Stretchfolie 500 mm', 'Verpackung', 'Rolle', 2.4, 7.9, 12, loc2.id, 'H1-03', 9, sup2, ''],
      ['Europalette (EPAL)', 'Ladehilfsmittel', 'Stk', 25, 11, 20, loc2.id, 'Hof', 42, null, ''],
    ];
    const arts = [];
    for (const [name, category, unit, weight, cost, min, locationId, bin, initial, sup, ean] of artDefs) {
      const a = await save('articles', { name, sku: await nextNumber('article', 'A'), ean, category, unit, weight, cost, min, locationId, bin, supplierId: sup?.id || null });
      await save('movements', { articleId: a.id, qty: initial, type: 'initial', locationId, date: addDays(t, -14), unitCost: cost, note: 'Anfangsbestand' });
      arts.push(a);
    }
    await save('movements', { articleId: arts[0].id, qty: 24, type: 'in', locationId: '', date: addDays(t, -2), unitCost: 2.85, note: `${sup1.name} · LS 48211`, supplierId: sup1.id });
    await save('movements', { articleId: arts[2].id, qty: -6, type: 'out', locationId: '', date: addDays(t, -1), unitCost: 13.2, note: 'Verbrauch · Büro' });
    await save('movements', { articleId: arts[1].id, qty: -2, type: 'correction', locationId: '', date: addDays(t, -1), unitCost: 5.9, note: 'Inventur – Bruch' });
    const shipItems = [
      [[0, 10], [1, 6]], [[2, 12]], [[0, 8], [3, 2]], [[1, 8]], [[4, 20], [7, 1]], [[0, 30], [1, 12]],
    ];
    const v1 = await save('vehicles', { plate: 'W-48213L', name: 'Sprinter 1', type: 'Transporter', payload: 1200, volume: 14, mileage: 84210, inspectionDue: addDays(t, 21), serviceDue: addDays(t, 75), status: 'active' });
    await save('vehicles', { plate: 'W-90377K', name: 'Iveco 7,5 t', type: 'LKW bis 7,5 t', payload: 3200, volume: 36, mileage: 152000, inspectionDue: addDays(t, 140), serviceDue: addDays(t, -3), status: 'active' });
    const d1 = await save('drivers', { name: 'Stefan Gruber', phone: '+43 660 1234567', licenseClasses: 'B, C1', licenseExpiry: addDays(t, 900), c95Expiry: addDays(t, 45), active: true, userId: S.me.user.id });
    await save('drivers', { name: 'Aylin Demir', phone: '+43 664 7654321', licenseClasses: 'B, C, CE', licenseExpiry: addDays(t, 1500), c95Expiry: addDays(t, 600), active: true });
    const contacts = [
      { type: 'customer', name: 'Bäckerei Kornfeld', contact: 'Fr. Huber', street: 'Wiedner Hauptstraße 41', zip: '1040', city: 'Wien', country: 'AT', phone: '+43 1 5051234' },
      { type: 'recipient', name: 'Café Lindenhof', street: 'Neubaugasse 12', zip: '1070', city: 'Wien', country: 'AT', phone: '+43 1 5234567' },
      { type: 'recipient', name: 'Bioladen Grünzeug', street: 'Landstraßer Hauptstraße 88', zip: '1030', city: 'Wien', country: 'AT' },
      { type: 'partner', name: 'Westbahn Spedition GmbH', street: 'Industriezeile 7', zip: '4020', city: 'Linz', country: 'AT', phone: '+43 732 778899' },
    ];
    const cs = [];
    for (const c of contacts) cs.push(await save('contacts', c));
    const sender = { ...companyAddress(), street: companyAddress().street || 'Lagerstraße 5', zip: companyAddress().zip || '1100', city: companyAddress().city || 'Wien' };
    const recips = [
      cs[1], cs[2],
      { name: 'Hotel Am Stadtpark', street: 'Johannesgasse 26', zip: '1010', city: 'Wien', country: 'AT', phone: '+43 1 7110000' },
      { name: 'Kindergarten Sonnenschein', street: 'Simmeringer Hauptstraße 120', zip: '1110', city: 'Wien', country: 'AT' },
      { name: 'Feinkost Moser', street: 'Herrengasse 9', zip: '8010', city: 'Graz', country: 'AT' },
      { name: 'Weinhandel Berger', street: 'Hauptplatz 3', zip: '3500', city: 'Krems an der Donau', country: 'AT' },
    ];
    const ships = [];
    for (let i = 0; i < recips.length; i++) {
      const r = recips[i];
      const data = {
        service: i === 2 ? 'express' : i > 3 ? 'freight' : 'standard', customerId: cs[0].id, sender,
        recipient: { name: r.name, contact: r.contact || '', street: r.street, zip: r.zip, city: r.city, country: r.country || 'AT', phone: r.phone || '' },
        items: shipItems[i].map(([ai, qty]) => ({ articleId: arts[ai].id, qty, locationId: arts[ai].locationId })),
        packages: [{ desc: i > 3 ? 'Palette' : 'Karton', qty: i > 3 ? 1 : 1 + (i % 2), weight: Math.round(sum(shipItems[i], ([ai, qty]) => qty * arts[ai].weight) / (i > 3 ? 1 : 1 + (i % 2))), l: i > 3 ? 120 : 60, w: i > 3 ? 80 : 40, h: i > 3 ? 110 : 40 }],
        deliveryDate: i < 4 ? t : addDays(t, 1), windowFrom: i === 2 ? '08:00' : '', windowTo: i === 2 ? '10:00' : '', cod: i === 1 ? 84.9 : 0,
        notes: i === 0 ? 'Lieferung über den Hintereingang, bitte klingeln.' : '',
        number: await nextNumber('shipment', 'S'), trackingCode: `NL${randomCode(10)}`, status: 'draft',
        events: [{ status: 'draft', at: new Date().toISOString(), place: 'Wien', by: S.me.user.name }],
      };
      ships.push(await save('shipments', data));
    }
    const tour = await save('tours', { number: await nextNumber('tour', 'T'), name: 'Wien Innenstadt – Vormittag', date: t, start: '07:30', driverId: d1.id, vehicleId: v1.id, status: 'planned', stops: [] });
    await addStops(tour.id, ships.slice(0, 4).map((s) => s.id));
    toast('Beispieldaten angelegt.');
  }

  // =============================================================== Aktionen
  const ACT = {
    'auth-tab': (d) => { UI.authTab = d.tab; UI.authMsg = null; render(); },
    logout: async () => { await sb.auth.signOut(); location.hash = ''; },
    'logout-all': async () => { if (await confirmBox('Überall abmelden?', 'Du wirst auf allen Geräten abgemeldet – in allen NEX-Apps.', { ok: 'Abmelden' })) await sb.auth.signOut({ scope: 'global' }); },
    retry: () => { S.schemaMissing = false; S.me = null; render(); afterLogin(); },
    'nav-toggle': () => { UI.navOpen = !UI.navOpen; render(); },
    copy: (d) => copyText(d.text, d.msg),
    demo: () => loadDemo(),
    theme: (d) => { try { localStorage.setItem('nl-theme', d.k); } catch { /* privat */ } applyTheme(); render(); },

    'ship-new': () => shipmentForm(),
    'ship-edit': (d) => shipmentForm(get('shipments', d.id)),
    'ship-status': (d) => shipmentStatusForm(get('shipments', d.id)),
    'ship-delete': (d) => deleteShipment(get('shipments', d.id)),
    'ship-filter': (d) => { UI.f.shipStatus = d.k; render(); },
    'clear-ship-date': () => { UI.f.shipDate = ''; render(); },
    'print-label': (d) => printLabel(get('shipments', d.id)),
    'print-note': (d) => printDeliveryNote(get('shipments', d.id)),

    'tour-new': (d) => tourForm(null, d.date || UI.f.tourDate || today()),
    'tour-edit': (d) => tourForm(get('tours', d.id)),
    'tour-day': (d) => { UI.f.tourDate = d.d === '0' ? today() : addDays(UI.f.tourDate || today(), +d.d); render(); },
    'tour-showall': () => { UI.f.tourShowAll = !UI.f.tourShowAll; render(); },
    'tour-start': (d) => startTour(get('tours', d.id)),
    'tour-finish': (d) => finishTour(get('tours', d.id)),
    'tour-delete': async (d) => {
      const t = get('tours', d.id);
      if (!(await confirmBox('Tour löschen?', `Tour <b>${esc(t.number)}</b> wird gelöscht. Nicht zugestellte Sendungen werden wieder freigegeben.`, { ok: 'Löschen', danger: true }))) return;
      for (const s of tourStops(t)) if (!DONE_ST.includes(s.status)) await save('shipments', { ...s, tourId: null, status: 'draft' });
      await remove('tours', t.id);
      toast('Tour gelöscht.');
      location.hash = '#/tours';
    },
    'stop-add': (d) => addStops(d.id, [d.s]),
    'tour-add-all': (d) => {
      const t = get('tours', d.id);
      const ids = list('shipments').filter((s) => !s.tourId && OPEN_ST.includes(s.status) && (UI.f.tourShowAll || !s.deliveryDate || s.deliveryDate <= t.date)).map((s) => s.id);
      return addStops(d.id, ids);
    },
    'stop-remove': (d) => removeStop(d.id, d.s),
    'stop-move': (d) => {
      const t = get('tours', d.id);
      const st = [...(t.stops || [])];
      const i = st.indexOf(d.s);
      const j = i + +d.d;
      if (i < 0 || j < 0 || j >= st.length) return;
      [st[i], st[j]] = [st[j], st[i]];
      return save('tours', { ...t, stops: st });
    },
    'print-tour': (d) => printTour(get('tours', d.id)),
    'drv-deliver': (d) => deliverForm(get('shipments', d.id)),
    'drv-fail': (d) => failForm(get('shipments', d.id)),

    'art-new': () => articleForm(),
    'art-edit': (d) => articleForm(get('articles', d.id)),
    'move-new': (d) => moveForm(d.type, d.id || ''),
    'transfer-new': (d) => transferForm(d.id || ''),
    'count-one': (d) => countOneForm(d.id),
    'move-storno': (d) => stornoMove(d.id),
    'stock-low': () => { UI.f.stockLow = true; UI.f.stockArchived = false; location.hash = '#/stock'; },
    'stock-low-toggle': () => { UI.f.stockLow = !UI.f.stockLow; UI.f.stockArchived = false; render(); },
    'stock-arch-toggle': () => { UI.f.stockArchived = !UI.f.stockArchived; UI.f.stockLow = false; render(); },
    'stock-csv': () => exportStockCsv(),
    'inv-print': () => printCountSheet(),
    'inv-book': () => bookInventory(),
    'inv-clear': async () => {
      if (!(await confirmBox('Zählung verwerfen?', 'Alle eingetragenen Zählmengen werden gelöscht. Es wird nichts gebucht.', { ok: 'Verwerfen', danger: true }))) return;
      invState().counts = {};
      saveInv();
      render();
    },
    'loc-new': () => locationForm(null),
    'loc-edit': (d) => locationForm(d.id),

    'veh-new': () => vehicleForm(),
    'veh-edit': (d) => vehicleForm(get('vehicles', d.id)),
    'drv-new': () => driverForm(),
    'drv-edit': (d) => driverForm(get('drivers', d.id)),
    'con-new': () => contactForm(),
    'con-edit': (d) => contactForm(get('contacts', d.id)),

    'invite-rotate': async () => {
      if (!(await confirmBox('Neuen Einladungscode erzeugen?', 'Der bisherige Code funktioniert danach nicht mehr.', { ok: 'Neuer Code' }))) return;
      S.me = await rpc('nl_rotate_invite');
      render();
      toast('Neuer Einladungscode erstellt.');
    },
    'member-remove': async (d) => {
      const m = S.me.members.find((x) => x.id === d.id);
      if (!(await confirmBox('Aus dem Team entfernen?', `<b>${esc(m?.name)}</b> verliert sofort den Zugriff auf ${esc(S.me.company.name)}.`, { ok: 'Entfernen', danger: true }))) return;
      S.me = await rpc('nl_remove_member', { p_user: d.id });
      render();
      toast('Entfernt.');
    },
    leave: async () => {
      if (!(await confirmBox('Firma verlassen?', isAdmin() && S.me.members.length === 1 ? 'Du bist die einzige Person – <b>die Firma und alle Daten werden gelöscht.</b>' : 'Du verlierst den Zugriff auf alle Daten dieser Firma.', { ok: 'Verlassen', danger: true }))) return;
      unsubscribe();
      S.me = await rpc('nl_leave_company');
      S.loaded = false;
      location.hash = '';
      render();
    },
  };

  const FORMS = {
    async login(v) {
      const { error } = await sb.auth.signInWithPassword({ email: v.email, password: v.password });
      if (error) throw new Error(authError(error.message));
    },
    async register(v) {
      if (String(v.password).length < 8) throw new Error('Das Passwort braucht mindestens 8 Zeichen.');
      const { data, error } = await sb.auth.signUp({ email: v.email, password: v.password, options: { data: { name: v.name }, emailRedirectTo: appBase() } });
      if (error) throw new Error(authError(error.message));
      if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw new Error(authError('already registered'));
      if (!data.session) { UI.authTab = 'login'; UI.authMsg = { type: 'violet', text: `Fast geschafft! Wir haben dir einen Bestätigungslink an ${v.email} geschickt.` }; render(); }
    },
    async forgot(v) {
      const { error } = await sb.auth.resetPasswordForEmail(v.email, { redirectTo: appBase() });
      if (error) throw new Error(authError(error.message));
      UI.authMsg = { type: 'violet', text: 'Falls ein Konto existiert, ist der Link unterwegs. Bitte prüfe dein Postfach.' };
      render();
    },
    async recovery(v) {
      const { error } = await sb.auth.updateUser({ password: v.password });
      if (error) throw new Error(authError(error.message));
      S.recovery = false;
      toast('Passwort gespeichert.');
      render();
    },
    async 'create-company'(v) { S.me = await rpc('nl_create_company', { p_company_name: v.company, p_name: v.name || null }); await loadAll(); subscribe(); render(); },
    async 'join-company'(v) { S.me = await rpc('nl_join_company', { p_code: v.code, p_name: v.name || null }); await loadAll(); subscribe(); render(); toast(`Willkommen bei ${S.me.company.name}!`); },
    async 'track-go'(v) {
      if (!v.code) return;
      history.pushState(null, '', `?track=${encodeURIComponent(v.code.toUpperCase())}`);
      await loadTrack(v.code);
    },
    async settings(v) {
      if (isAdmin() && v.companyName && v.companyName !== S.me.company.name) S.me = await rpc('nl_update_company', { p_name: v.companyName });
      const { companyName, ...rest } = v;
      await save('settings', { ...companySettings(), ...rest, id: 'company' });
      toast('Einstellungen gespeichert.');
    },
    async profile(v) { S.me = await rpc('nl_update_profile', { p_name: v.name }); render(); toast('Profil gespeichert.'); },
    async email(v) {
      const { error } = await sb.auth.updateUser({ email: v.email }, { emailRedirectTo: appBase() });
      if (error) throw new Error(authError(error.message));
      toast('Bitte bestätige die Änderung über den Link in deinem Postfach.');
    },
    async password(v, form) {
      const { error: e1 } = await sb.auth.signInWithPassword({ email: S.session.user.email, password: v.current });
      if (e1) throw new Error('Das aktuelle Passwort stimmt nicht.');
      const { error } = await sb.auth.updateUser({ password: v.password });
      if (error) throw new Error(authError(error.message));
      form.reset();
      toast('Passwort geändert.');
    },
  };

  // =============================================================== Ereignisse
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const link = e.target.closest('a[href]');
    if (b && link && link !== b && b.contains(link)) return; // z. B. tel:-Link in einer klickbaren Zeile
    if (b && !b.closest('.modal-bg')) {
      if (b.type !== 'checkbox') e.preventDefault();
      if (b.tagName === 'BUTTON') { b.disabled = true; setTimeout(() => { b.disabled = false; }, 400); }
      Promise.resolve().then(() => ACT[b.dataset.act]?.(b.dataset, b)).catch(fail);
      return;
    }
    const row = e.target.closest('[data-href]');
    if (row && !e.target.closest('a, button, input, select')) location.hash = row.dataset.href;
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.inv) { invState().counts[t.dataset.inv] = t.value; saveInv(); debouncedRender(); return; }
    if (t.dataset.invSet) { invState()[t.dataset.invSet] = t.value; saveInv(); render(); return; }
    const k = e.target.dataset.filter;
    if (!k) return;
    setPath(UI.f, k, e.target.value);
    if (e.target.type === 'date') render(); else debouncedRender();
  });
  const debouncedRender = debounce(render, 120);
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.actChange === 'role') {
      try { S.me = await rpc('nl_set_member_role', { p_user: el.dataset.id, p_role: el.value }); toast('Rolle geändert.'); } catch (err) { fail(err); }
      render();
    }
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-form]');
    if (!f || f.closest('.modal-bg')) return;
    e.preventDefault();
    const btn = $('button:not([type="button"])', f);
    if (btn) btn.disabled = true;
    try { await FORMS[f.dataset.form]?.(formData(f), f); } catch (err) {
      if (!S.session && ['login', 'register', 'forgot'].includes(f.dataset.form)) { UI.authMsg = { type: 'bad', text: err.message }; render(); } else fail(err);
    } finally { if (btn && document.contains(btn)) btn.disabled = false; }
  });
  window.addEventListener('hashchange', () => { UI.navOpen = false; render(); window.scrollTo(0, 0); });
  window.addEventListener('popstate', () => {
    const c = new URLSearchParams(location.search).get('track');
    if (c !== null) loadTrack(c); else { UI.trackCode = undefined; render(); }
  });
  window.addEventListener('online', () => { S.online = true; renderConn(); if (S.me?.company) loadAll().then(scheduleRender).catch(() => {}); });
  window.addEventListener('offline', () => { S.online = false; renderConn(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.me?.company && S.loaded) {
      rpc('nl_me').then((me) => { S.me = me; return me.company ? loadAll() : null; }).then(scheduleRender).catch(() => {});
    }
  });

  // =============================================================== Start
  function applyTheme() {
    let t = null;
    try { t = localStorage.getItem('nl-theme'); } catch { /* privat */ }
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }

  function resetData() {
    unsubscribe();
    S.me = null;
    S.loaded = false;
    S.db = Object.fromEntries(COLS.map((c) => [c, new Map()]));
  }

  async function afterLogin() {
    try {
      S.me = await rpc('nl_me');
      if (S.me.company) { await loadAll(); subscribe(); }
    } catch (e) {
      if (!S.schemaMissing) fail(e);
    }
    render();
  }

  applyTheme();
  const trackParam = new URLSearchParams(location.search).get('track');
  if (trackParam !== null) loadTrack(trackParam);

  if (sb) {
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') S.recovery = true;
      const prev = S.session?.user?.id;
      S.session = session;
      S.authReady = true;
      if (!session) { resetData(); UI.authMsg = null; render(); return; }
      if (prev !== session.user.id) {
        resetData();
        render();
        setTimeout(afterLogin, 0); // nicht innerhalb des Auth-Callbacks auf Supabase warten
        return;
      }
      render();
    });
  } else {
    render();
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
