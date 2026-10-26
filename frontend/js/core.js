'use strict';
/* ===== Utilidades ===== */
const TZ='America/Santiago';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=n=>'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-'+n+'"/></svg>';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const todayStr=()=>new Date().toLocaleDateString('en-CA',{timeZone:TZ});
const nowMin=()=>{const p=new Date().toLocaleTimeString('en-GB',{timeZone:TZ,hour12:false,hour:'2-digit',minute:'2-digit'}).split(':');return (+p[0]%24)*60+ +p[1]};
const D=s=>new Date(s+'T12:00:00Z');
const ds=d=>d.toISOString().slice(0,10);
const addDays=(s,n)=>{const d=D(s);d.setUTCDate(d.getUTCDate()+n);return ds(d)};
const dow=s=>D(s).getUTCDay();
const diffDays=(a,b)=>Math.round((D(a)-D(b))/864e5);
const mondayOf=s=>addDays(s,-((dow(s)+6)%7));
const DIAS=['dom','lun','mar','mié','jue','vie','sáb'];
const DIASL=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fdate=s=>{const d=D(s);return DIAS[d.getUTCDay()]+' '+d.getUTCDate()+' '+MESES[d.getUTCMonth()]};
const fdateL=s=>{const d=D(s);return DIASL[d.getUTCDay()]+' '+d.getUTCDate()+' de '+MESESL[d.getUTCMonth()]};
const toMin=h=>{const p=String(h||'0:0').split(':');return (+p[0]||0)*60+(+p[1]||0)};
const fromMin=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const money=n=>'$'+String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const plural=(n,a,b)=>n===1?a:b;
const normTel=t=>{let d=String(t||'').replace(/\D/g,'');if(d.length===9&&d[0]==='9')d='56'+d;else if(d.length===8)d='569'+d;return d};
const fmtTel=t=>{const d=normTel(t);if(d.length===11&&d.startsWith('569'))return '+56 9 '+d.slice(3,7)+' '+d.slice(7);return t||''};
const waLink=(tel,msg)=>'https://wa.me/'+normTel(tel)+'?text='+encodeURIComponent(msg);
const hace=(f,t)=>{if(!f)return 'nunca';const n=diffDays(t||todayStr(),f);if(n<=0)return 'hoy';if(n===1)return 'ayer';if(n<14)return 'hace '+n+' días';if(n<60)return 'hace '+Math.round(n/7)+' semanas';return 'hace '+Math.round(n/30)+' meses'};
const dentro=(f,t)=>{const n=diffDays(f,t||todayStr());if(n===0)return 'hoy';if(n===1)return 'mañana';return 'en '+n+' días'};
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();

/* ===== Estado ===== */
const DEF={
  nombre:'Bellarium',whatsapp:'',direccion:'Av. Presidente José Batlle y Ordóñez 4502, Ñuñoa',
  horaInicio:'10:00',horaFin:'20:00',dias:[1,2,3,4,5,6],paso:30,capBronceado:1,capHifu:1,anticipo:30,cerrados:[],
  diasActiva:30,diasRiesgo:60,vipDesde:5,
  plantillas:{
    solicitud:'Hola Bellarium ✨ Quiero reservar *{servicio}* el {fecha} a las {hora}. Soy {nombre}, mi teléfono es {tel}.',
    confirmacion:'Hola {nombre} ✨ Tu hora en Bellarium quedó confirmada: *{servicio}* el {fecha} a las {hora}. Dirección: {direccion}. Cualquier cambio avísanos por aquí 🤍',
    recordatorio:'Hola {nombre} 🤍 Te recordamos tu hora de mañana en Bellarium: *{servicio}*, {fecha} a las {hora}. ¿Nos confirmas con un “sí”? Tip: exfolia 24 h antes y llega con la piel limpia.',
    extrano:'Hola {nombre} 🤍 ¡Te extrañamos en Bellarium! Ya pasó un tiempo desde tu última visita ({ultima}). ¿Te reservamos una hora para mantener tu color? Responde y te mostramos los horarios.',
    pack:'Hola {nombre} ✨ Te quedan {restantes} de tu pack *{servicio}* en Bellarium. ¿Agendamos tu próxima sesión? Responde con el día que prefieras y te reservamos.',
    gracias:'Hola {nombre} 🤍 Gracias por visitarnos hoy en Bellarium. Si quedaste feliz con tu resultado, nos ayudaría muchísimo que nos dejes tu opinión. ¡Te esperamos en tu próxima sesión!'
  }
};
const S={db:null,admin:false,ready:false,view:'dashboard',preview:false,
  cfg:{},services:{},clients:{},appts:{},packs:{},avail:{},loaded:{},err:null,
  range:30,agendaStart:null,agendaMode:null,cliQ:'',cliSeg:'todas',cliSort:'ultima',fidTab:'extrano',
  asiFrom:null,asiTo:null,asiEstado:'todos',W:null,modalLive:null,stats:null};
const C=()=>{const c=Object.assign({},DEF,S.cfg);c.plantillas=Object.assign({},DEF.plantillas,S.cfg.plantillas||{});c.dias=Array.isArray(c.dias)?c.dias.map(Number):DEF.dias;c.cerrados=Array.isArray(c.cerrados)?c.cerrados:[];c.paso=+c.paso||30;return c};
const svcList=(soloActivos)=>Object.entries(S.services).map(([id,s])=>Object.assign({id},s)).filter(s=>!soloActivos||s.activo!==false).sort((a,b)=>(a.orden||0)-(b.orden||0)||String(a.nombre).localeCompare(b.nombre));
const RECURSOS={bronceado:'Cabina de bronceado',hifu:'HIFU 7D'};

/* ===== Escrituras (en serie, una por documento a la vez) ===== */
let Q=Promise.resolve();
const enq=fn=>{Q=Q.then(fn).catch(e=>{console.error(e);toast('No se pudo guardar'+(e&&e.code?' ('+e.code+')':''),true)});return Q};
const put=(col,id,data)=>{S[col==='clients'?'clients':col==='appointments'?'appts':col][id]=data;return enq(()=>S.db.doc(col+'/'+id).set(data))};
const patch=(col,id,p)=>{const key=col==='appointments'?'appts':col;S[key][id]=Object.assign({},S[key][id],p);render();return enq(()=>S.db.doc(col+'/'+id).update(p))};
const del=(col,id)=>{const key=col==='appointments'?'appts':col;delete S[key][id];return enq(()=>S.db.doc(col+'/'+id).delete())};

async function syncAvail(f){
  const busy=Object.values(S.appts).filter(a=>a.fecha===f&&a.estado!=='cancelada').map(a=>({r:a.recurso,s:a.inicio,e:a.fin}));
  S.avail[f]={busy,fecha:f};
  return enq(()=>S.db.doc('availability/'+f).set({busy,fecha:f,upd:Date.now()}));
}
async function saveAppt(a,oldFecha){
  S.appts[a.id]=a;render();
  await enq(()=>S.db.doc('appointments/'+a.id).set(a));
  await syncAvail(a.fecha);
  if(oldFecha&&oldFecha!==a.fecha)await syncAvail(oldFecha);
}
async function setEstado(id,estado,extra){
  const a=S.appts[id];if(!a)return;
  const p=Object.assign({estado,upd:Date.now()},extra||{});
  await patch('appointments',id,p);
  if(estado==='cancelada'||a.estado==='cancelada')await syncAvail(a.fecha);
}

/* ===== Disponibilidad ===== */
const isOpen=f=>{const c=C();return c.dias.includes(dow(f))&&!c.cerrados.includes(f)};
function busyList(fecha,rec,ignoreId){
  if(S.admin)return Object.values(S.appts).filter(a=>a.fecha===fecha&&a.recurso===rec&&a.estado!=='cancelada'&&a.id!==ignoreId).map(a=>[toMin(a.inicio),toMin(a.fin)]);
  const d=S.avail[fecha];return ((d&&d.busy)||[]).filter(b=>b.r===rec).map(b=>[toMin(b.s),toMin(b.e)]);
}
function freeSlots(fecha,svc,ignoreId,allowPast){
  const c=C(),out=[];if(!svc||!isOpen(fecha))return out;
  const cap=+(svc.recurso==='hifu'?c.capHifu:c.capBronceado)||1,dur=+svc.duracion||30,b=busyList(fecha,svc.recurso,ignoreId),t=todayStr();
  for(let m=toMin(c.horaInicio);m+dur<=toMin(c.horaFin);m+=c.paso){
    if(!allowPast&&(fecha<t||(fecha===t&&m<=nowMin()+30)))continue;
    const n=b.filter(x=>x[0]<m+dur&&x[1]>m).length;
    out.push({h:fromMin(m),free:n<cap});
  }
  return out;
}

/* ===== Estadísticas de clientas ===== */
function computeStats(){
  const t=todayStr(),c=C(),cl={},pk={};
  Object.keys(S.clients).forEach(id=>cl[id]={visitas:0,noshow:0,cancel:0,ultima:null,proxima:null,gasto:0,total:0,packsAbiertos:[]});
  Object.keys(S.packs).forEach(id=>pk[id]={usadas:0,agendadas:0});
  Object.values(S.appts).forEach(a=>{
    const s=cl[a.clienteId],p=a.packId&&pk[a.packId];
    if(s){s.total++;
      if(a.estado==='asistio'){s.visitas++;if(!s.ultima||a.fecha>s.ultima)s.ultima=a.fecha}
      else if(a.estado==='no_asistio')s.noshow++;
      else if(a.estado==='cancelada')s.cancel++;
      else if(a.fecha>=t){const k=a.fecha+' '+a.inicio;if(!s.proxima||k<s.proxima.k)s.proxima={k,fecha:a.fecha,inicio:a.inicio,id:a.id}}}
    if(p){if(a.estado==='asistio')p.usadas++;else if(VIVA(a.estado))p.agendadas++}
  });
  Object.entries(S.packs).forEach(([id,p])=>{const s=cl[p.clienteId];if(!s)return;s.gasto+=+p.precio||0;
    const x=pk[id];x.restan=Math.max(0,(+p.total||1)-x.usadas);x.libres=Math.max(0,x.restan-x.agendadas);
    if(x.restan>0)s.packsAbiertos.push(id)});
  const segOf=s=>{
    if(!s.visitas)return s.proxima?'nueva':'sinvisitas';
    const d=diffDays(t,s.ultima);
    if(d<=c.diasActiva)return s.visitas>=c.vipDesde?'vip':'activa';
    if(d<=c.diasRiesgo)return 'riesgo';
    return 'inactiva';
  };
  Object.values(cl).forEach(s=>s.seg=segOf(s));
  S.stats={cl,pk};
}
const SEGN={vip:'VIP',activa:'Activa',riesgo:'En riesgo',inactiva:'Inactiva',nueva:'Nueva',sinvisitas:'Sin visitas'};
const segHtml=k=>'<span class="seg '+k+'">'+SEGN[k]+'</span>';
const VIVA=e=>e==='pendiente'||e==='reservada'||e==='confirmada';
const ESTN={pendiente:'Por confirmar',reservada:'Reservada',confirmada:'Confirmada',asistio:'Asistió',no_asistio:'No vino',cancelada:'Cancelada'};
const ESTI={pendiente:'clock',reservada:'clock',confirmada:'check',asistio:'check',no_asistio:'x',cancelada:'x'};
const estHtml=k=>'<span class="st '+k+'">'+I(ESTI[k])+ESTN[k]+'</span>';
const cstat=id=>(S.stats&&S.stats.cl[id])||{visitas:0,noshow:0,cancel:0,gasto:0,packsAbiertos:[],seg:'sinvisitas'};

/* ===== Mensajes WhatsApp ===== */
function fill(key,v){
  const c=C(),t=c.plantillas[key]||'';
  const all=Object.assign({direccion:c.direccion,nombre:'',servicio:'',fecha:'',hora:'',tel:'',ultima:'',restantes:''},v);
  return t.replace(/\{(\w+)\}/g,(m,k)=>all[k]!=null?all[k]:m);
}
function apptVars(a){const c=S.clients[a.clienteId]||{};return {nombre:(a.clienteNombre||c.nombre||'').split(' ')[0],servicio:a.servicioNombre,fecha:fdateL(a.fecha),hora:a.inicio,tel:a.clienteTel||c.telefono}}
function waBizLink(msg){const n=normTel(C().whatsapp);return n?('https://wa.me/'+n+'?text='+encodeURIComponent(msg)):'https://w.app/bellarium'}

/* ===== UI base: toast, modal, tooltip ===== */
let toastT;
function toast(msg,err){let t=$('.toast');if(t)t.remove();t=document.createElement('div');t.className='toast'+(err?' err':'');t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),3200)}
function openModal(html,cls,live){const m=$('#modal');m.innerHTML='<div class="ov" data-act="ovclose"><div class="modal '+(cls||'')+'" role="dialog" aria-modal="true">'+html+'</div></div>';S.modalLive=live||null;const f=$('.modal .in',m);if(f&&!live)setTimeout(()=>f.focus(),30)}
function closeModal(){$('#modal').innerHTML='';S.modalLive=null}
function xbtn(){return '<button class="xbtn" data-act="close" aria-label="Cerrar">'+I('x')+'</button>'}
const tipEl=()=>{let t=$('.tip');if(!t){t=document.createElement('div');t.className='tip';t.hidden=true;document.body.appendChild(t)}return t};
function showTip(el,x,y){
  const t=tipEl(),p=(el.getAttribute('data-tip')||'').split('|');t.textContent='';
  const b=document.createElement('b');b.textContent=p[1]||'';const s=document.createElement('span');s.textContent=p[0]||'';t.append(b,s);
  if(p[2]){const e=document.createElement('span');e.style.display='block';e.textContent=p[2];t.append(e)}
  t.hidden=false;const w=t.offsetWidth,h=t.offsetHeight;
  t.style.left=Math.max(8,Math.min(innerWidth-w-8,x+14))+'px';t.style.top=Math.max(8,Math.min(innerHeight-h-8,y-h-10))+'px';
}
document.addEventListener('pointermove',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(el)showTip(el,e.clientX,e.clientY);else{const t=$('.tip');if(t)t.hidden=true}});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(el){const r=el.getBoundingClientRect();showTip(el,r.left+r.width/2,r.top)}});
document.addEventListener('focusout',()=>{const t=$('.tip');if(t)t.hidden=true});

/* ===== Exportar ===== */
const csv=rows=>'﻿'+rows.map(r=>r.map(v=>{v=String(v==null?'':v);return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\n');
let DL=undefined;
async function saveFile(filename,data){
  if(DL===undefined){try{DL=await claude.use('downloads')}catch(e){DL=null}}
  if(!DL){openModal(xbtn()+'<h2>Copiar datos</h2><p class="sub">Este navegador no permite descargar desde aquí. Copia el contenido:</p><textarea class="in" rows="12" readonly>'+esc(data)+'</textarea>','wide');return}
  try{await DL.save({filename,data});toast('Archivo listo')}catch(e){if(!e||e.code!=='declined')toast('No se pudo descargar',true)}
}
