'use strict';
/* Almacén de documentos {col, id, data}. Postgres en producción; archivo JSON solo para desarrollo local. */
const fs = require('fs');

function createStore() {
  if (process.env.DATABASE_URL) return pgStore();
  console.warn('[store] DATABASE_URL no definida: usando data.json local (solo desarrollo).');
  return fileStore(process.env.DATA_FILE || 'data.json');
}

function pgStore() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 8,
  });
  const api = (q) => ({
    async list(col) { const r = await q('SELECT id, data FROM docs WHERE col=$1 ORDER BY id', [col]); return r.rows; },
    async get(col, id) { const r = await q('SELECT data FROM docs WHERE col=$1 AND id=$2', [col, id]); return r.rows[0] ? r.rows[0].data : null; },
    async put(col, id, data) {
      await q('INSERT INTO docs(col,id,data) VALUES($1,$2,$3) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()', [col, id, JSON.stringify(data)]);
    },
    async remove(col, id) { await q('DELETE FROM docs WHERE col=$1 AND id=$2', [col, id]); },
  });
  const direct = api((t, p) => pool.query(t, p));
  return {
    ...direct,
    async init() {
      await pool.query('CREATE TABLE IF NOT EXISTS docs (col text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (col, id))');
    },
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query('SELECT pg_advisory_xact_lock(7340211)');
        const res = await fn(api((t, p) => c.query(t, p)));
        await c.query('COMMIT');
        return res;
      } catch (e) { try { await c.query('ROLLBACK'); } catch (_) {} throw e; }
      finally { c.release(); }
    },
    async close() { await pool.end(); },
  };
}

function fileStore(file) {
  let db = {};
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
  let chain = Promise.resolve();
  const save = () => { try { fs.writeFileSync(file, JSON.stringify(db)); } catch (e) { console.error('[store] no se pudo guardar', e.message); } };
  const api = {
    async list(col) { return Object.entries(db[col] || {}).sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, data]) => ({ id, data: JSON.parse(JSON.stringify(data)) })); },
    async get(col, id) { const d = (db[col] || {})[id]; return d ? JSON.parse(JSON.stringify(d)) : null; },
    async put(col, id, data) { (db[col] || (db[col] = {}))[id] = JSON.parse(JSON.stringify(data)); save(); },
    async remove(col, id) { if (db[col]) delete db[col][id]; save(); },
  };
  return {
    ...api,
    async init() {},
    transaction(fn) { const run = chain.then(() => fn(api)); chain = run.catch(() => {}); return run; },
    async close() {},
  };
}

module.exports = { createStore };
