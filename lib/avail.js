'use strict';
const TZ = 'America/Santiago';
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const nowMin = () => { const p = new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':'); return (+p[0] % 24) * 60 + +p[1]; };
const D = (s) => new Date(s + 'T12:00:00Z');
const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (s) => D(s).getUTCDay();
const toMin = (h) => { const p = String(h || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); };
const fromMin = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const normTel = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 9 && d[0] === '9') d = '56' + d; else if (d.length === 8) d = '569' + d; return d; };

const DEF = { nombre: 'Bellarium', whatsapp: '', direccion: 'Av. Presidente José Batlle y Ordóñez 4502, Ñuñoa', horaInicio: '10:00', horaFin: '20:00', dias: [1, 2, 3, 4, 5, 6], paso: 30, capBronceado: 1, capHifu: 1, anticipo: 30, cerrados: [] };
const PUBLIC_KEYS = ['nombre', 'whatsapp', 'direccion', 'horaInicio', 'horaFin', 'dias', 'paso', 'capBronceado', 'capHifu', 'anticipo', 'cerrados'];

function cfgOf(raw) {
  const c = Object.assign({}, DEF, raw || {});
  c.dias = Array.isArray(c.dias) ? c.dias.map(Number) : DEF.dias;
  c.cerrados = Array.isArray(c.cerrados) ? c.cerrados : [];
  c.paso = +c.paso || 30;
  return c;
}
const publicConfig = (raw) => { const c = cfgOf(raw); const o = {}; PUBLIC_KEYS.forEach((k) => { o[k] = c[k]; }); return o; };
const isOpen = (c, f) => c.dias.includes(dow(f)) && !c.cerrados.includes(f);
const ACTIVE = (e) => e !== 'cancelada';

/** ¿Se puede reservar `hora` (HH:MM) el `fecha` para `svc` dado el conjunto de citas del día? */
function checkSlot(c, svc, fecha, hora, dayAppts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return 'Fecha u hora inválida.';
  const t = todayStr();
  if (fecha < t || fecha > addDays(t, +c.anticipo || 30)) return 'Esa fecha no está disponible para reservar.';
  if (!isOpen(c, fecha)) return 'Ese día no atendemos.';
  const m = toMin(hora), dur = +svc.duracion || 30, open = toMin(c.horaInicio), close = toMin(c.horaFin);
  if (m < open || m + dur > close || (m - open) % c.paso !== 0) return 'Esa hora no está disponible.';
  if (fecha === t && m <= nowMin() + 30) return 'Esa hora ya pasó o es muy próxima.';
  const cap = +(svc.recurso === 'hifu' ? c.capHifu : c.capBronceado) || 1;
  const n = dayAppts.filter((a) => a.recurso === svc.recurso && ACTIVE(a.estado) && toMin(a.inicio) < m + dur && toMin(a.fin) > m).length;
  if (n >= cap) return 'SLOT_TAKEN';
  return null;
}

module.exports = { TZ, todayStr, nowMin, addDays, dow, toMin, fromMin, normTel, cfgOf, publicConfig, isOpen, checkSlot, ACTIVE };
