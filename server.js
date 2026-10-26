'use strict';
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { createStore } = require('./lib/store');
const A = require('./lib/avail');

const COLS = new Set(['config', 'services', 'clients', 'appointments', 'packs']);
const ID_RE = /^[A-Za-z0-9_\-.:@+]{1,100}$/;
const SESSION_DAYS = 30;

function createApp(store, env = process.env) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const SECRET = env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';

  /* ---------- seguridad básica ---------- */
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    next();
  });
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.get('x-requested-with') !== 'bellarium') return res.status(403).json({ error: 'Solicitud no permitida.' });
    next();
  });

  /* ---------- límites de uso (en memoria) ---------- */
  const hits = new Map();
  const limited = (key, max, windowMs) => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { hits.set(key, arr); return true; }
    arr.push(now); hits.set(key, arr); return false;
  };
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

  /* ---------- sesión de administradora ---------- */
  const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
  const makeToken = () => { const exp = String(Date.now() + SESSION_DAYS * 864e5); return exp + '.' + sign(exp); };
  const validToken = (t) => {
    if (!t) return false; const [exp, sig] = t.split('.');
    if (!exp || !sig || +exp < Date.now()) return false;
    const good = sign(exp); return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
  };
  const cookie = (req, name) => { const m = (req.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(name + '=')); return m ? decodeURIComponent(m.slice(name.length + 1)) : ''; };
  const isAdmin = (req) => validToken(cookie(req, 'bsess'));
  const requireAdmin = (req, res, next) => (isAdmin(req) ? next() : res.status(401).json({ error: 'Sesión expirada.', code: 'unauthorized' }));
  const eqPass = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

  app.get('/api/session', (req, res) => res.json({ admin: isAdmin(req) }));
  app.post('/api/login', (req, res) => {
    if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Acceso no configurado.' });
    if (limited('login:' + req.ip, 8, 15 * 60e3)) return res.status(429).json({ error: 'Demasiados intentos.' });
    const p = String((req.body || {}).password || '');
    if (!p || !eqPass(p, ADMIN_PASSWORD)) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    res.set('Set-Cookie', `bsess=${encodeURIComponent(makeToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${req.secure ? '; Secure' : ''}`);
    res.json({ ok: true });
  });
  app.post('/api/logout', (req, res) => {
    res.set('Set-Cookie', `bsess=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${req.secure ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  /* ---------- datos públicos (sin información personal) ---------- */
  app.get('/api/public', async (req, res, next) => {
    try {
      const [cfgDoc, svcs, appts] = await Promise.all([store.get('config', 'main'), store.list('services'), store.list('appointments')]);
      const c = A.cfgOf(cfgDoc);
      const t = A.todayStr(), until = A.addDays(t, (+c.anticipo || 30) + 2);
      const availability = {};
      appts.forEach(({ data: a }) => {
        if (!a || !A.ACTIVE(a.estado) || a.fecha < t || a.fecha > until) return;
        (availability[a.fecha] || (availability[a.fecha] = { fecha: a.fecha, busy: [] })).busy.push({ r: a.recurso, s: a.inicio, e: a.fin });
      });
      const services = {};
      svcs.forEach(({ id, data }) => { if (data.activo !== false) services[id] = data; });
      res.json({ config: A.publicConfig(cfgDoc), services, availability });
    } catch (e) { next(e); }
  });

  /* ---------- reserva directa de una clienta ---------- */
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
  app.post('/api/book', async (req, res, next) => {
    try {
      const b = req.body || {};
      if (b.website) return res.json({ ok: true }); // trampa para bots
      if (limited('book:' + req.ip, +env.BOOK_LIMIT || 10, 3600e3)) return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde o escríbenos por WhatsApp.' });
      const sid = clean(b.servicioId, 100), nombre = clean(b.nombre, 80), notas = clean(b.notas, 300), fecha = clean(b.fecha, 10), hora = clean(b.hora, 5);
      const tel = A.normTel(b.telefono);
      if (nombre.length < 2) return res.status(400).json({ error: 'Escribe tu nombre.' });
      if (tel.length < 10 || tel.length > 15) return res.status(400).json({ error: 'Revisa tu teléfono.' });
      const result = await store.transaction(async (tx) => {
        const svc = await tx.get('services', sid);
        if (!svc || svc.activo === false) return { status: 400, error: 'Ese servicio no está disponible.' };
        const c = A.cfgOf(await tx.get('config', 'main'));
        const all = (await tx.list('appointments')).map((r) => r.data);
        const err = A.checkSlot(c, svc, fecha, hora, all.filter((a) => a.fecha === fecha));
        if (err === 'SLOT_TAKEN') return { status: 409, error: 'Esa hora acaba de ser tomada.' };
        if (err) return { status: 400, error: err };
        const t = A.todayStr();
        const mine = all.filter((a) => A.normTel(a.clienteTel) === tel && a.fecha >= t && (a.estado === 'pendiente' || a.estado === 'reservada' || a.estado === 'confirmada'));
        if (mine.length >= 3) return { status: 429, error: 'Ya tienes varias horas pendientes. Escríbenos por WhatsApp para coordinar.' };
        let cid = null;
        for (const r of await tx.list('clients')) if (A.normTel(r.data.telefono) === tel) { cid = r.id; break; }
        const display = '+' + tel;
        if (!cid) { cid = crypto.randomBytes(8).toString('hex'); await tx.put('clients', cid, { nombre, telefono: display, email: '', fuente: 'Web', notas: '', creado: t }); }
        const client = (await tx.get('clients', cid));
        const pid = crypto.randomBytes(8).toString('hex'), aid = crypto.randomBytes(8).toString('hex');
        const total = +svc.sesiones || 1;
        await tx.put('packs', pid, { clienteId: cid, servicioId: sid, nombre: svc.nombre, total, precio: +svc.precio || 0, pagado: false, fecha: t, origen: 'web' });
        await tx.put('appointments', aid, {
          id: aid, clienteId: cid, clienteNombre: client.nombre, clienteTel: client.telefono, servicioId: sid, servicioNombre: svc.nombre,
          fecha, inicio: hora, fin: A.fromMin(A.toMin(hora) + (+svc.duracion || 30)), recurso: svc.recurso || 'bronceado', estado: 'pendiente',
          packId: pid, nSesion: 1, totalSesiones: total, notas, creado: t, ts: Date.now(), origen: 'web',
        });
        return { status: 200, body: { ok: true } };
      });
      if (result.status !== 200) return res.status(result.status).json({ error: result.error });
      res.json(result.body);
    } catch (e) { next(e); }
  });

  /* ---------- API de administración (documentos) ---------- */
  const guard = (req, res, next) => (COLS.has(req.params.col) && (!req.params.id || ID_RE.test(req.params.id)) ? next() : res.status(404).json({ error: 'No encontrado.' }));
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  app.get('/api/docs/:col', requireAdmin, guard, async (req, res, next) => {
    try { res.json({ docs: await store.list(req.params.col) }); } catch (e) { next(e); }
  });
  app.put('/api/docs/:col/:id', requireAdmin, guard, async (req, res, next) => {
    try { if (!isObj(req.body)) return res.status(400).json({ error: 'Datos inválidos.' }); await store.put(req.params.col, req.params.id, req.body); res.json({ ok: true }); } catch (e) { next(e); }
  });
  app.patch('/api/docs/:col/:id', requireAdmin, guard, async (req, res, next) => {
    try {
      if (!isObj(req.body)) return res.status(400).json({ error: 'Datos inválidos.' });
      await store.transaction(async (tx) => { const cur = (await tx.get(req.params.col, req.params.id)) || {}; await tx.put(req.params.col, req.params.id, Object.assign(cur, req.body)); });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  app.delete('/api/docs/:col/:id', requireAdmin, guard, async (req, res, next) => {
    try { await store.remove(req.params.col, req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
  });
  app.get('/healthz', (req, res) => res.type('text').send('ok'));
  app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));

  /* ---------- páginas ---------- */
  const pub = path.join(__dirname, 'public');
  app.use('/img', express.static(path.join(pub, 'img'), { maxAge: '7d' }));
  const page = (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(pub, 'index.html'));
  app.get(['/', '/admin', '/admin/'], page);
  app.use((req, res) => res.status(404).type('text').send('No encontrado'));
  app.use((err, req, res, next) => { // eslint-disable-line
    console.error(err);
    res.status(err.status && err.status < 500 ? err.status : 500).json({ error: err.status && err.status < 500 ? 'Solicitud inválida.' : 'Error del servidor. Intenta de nuevo.' });
  });
  return app;
}

/* Datos iniciales la primera vez que arranca con la base vacía. */
async function ensureDefaults(store) {
  const svcs = await store.list('services');
  if (!(await store.get('config', 'main'))) {
    await store.put('config', 'main', { nombre: 'Bellarium', whatsapp: '', direccion: A.cfgOf().direccion, horaInicio: '10:00', horaFin: '20:00', paso: 30, dias: [1, 2, 3, 4, 5, 6], capBronceado: 1, capHifu: 1, anticipo: 30, cerrados: [], diasActiva: 30, diasRiesgo: 60, vipDesde: 5 });
  }
  if (!svcs.length) {
    const S = {
      marq2: { nombre: 'Marquiña · 2 sesiones', desc: 'Bikini con cinta + intensificador', precio: 69990, sesiones: 2, duracion: 30, recurso: 'bronceado', activo: true, orden: 1 },
      marq3: { nombre: 'Marquiña · 3 sesiones', desc: 'Bikini con cinta + intensificador', precio: 99990, sesiones: 3, duracion: 30, recurso: 'bronceado', activo: true, orden: 2 },
      hifu_eval: { nombre: 'Evaluación HIFU 7D', desc: 'Conversamos tu objetivo y cotizamos tu plan', precio: 0, sesiones: 1, duracion: 45, recurso: 'hifu', activo: true, orden: 3 },
    };
    for (const [id, d] of Object.entries(S)) await store.put('services', id, d);
  }
}

async function start() {
  const store = createStore();
  await store.init();
  await ensureDefaults(store);
  if (!process.env.ADMIN_PASSWORD) console.warn('[admin] ADMIN_PASSWORD no está definida: el panel /admin no se podrá abrir hasta configurarla.');
  const app = createApp(store);
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('Bellarium reservas escuchando en el puerto ' + port));
}

module.exports = { createApp, ensureDefaults };
if (require.main === module) start().catch((e) => { console.error(e); process.exit(1); });
