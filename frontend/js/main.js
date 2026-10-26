/* ===== Shell y render ===== */
const NAV=[['dashboard','Panel','dash'],['hoy','Hoy','today'],['agenda','Agenda','cal'],['clientas','Clientas','users'],['fidel','Fidelización','heart'],['asist','Asistencias','list'],['reservar','Nueva reserva','plus'],['config','Configuración','cog']];
const TITLES={dashboard:['Panel de <em>control</em>','Cómo va tu negocio, de un vistazo'],hoy:['<em>Hoy</em> en Bellarium',null],agenda:['<em>Agenda</em>','Semana y día, con todas las sesiones'],clientas:['<em>Clientas</em>','Registro, historial y estado de cada una'],fidel:['<em>Fidelización</em>','Mensajes de WhatsApp para que vuelvan'],asist:['Registro de <em>asistencias</em>','Quién vino, quién no, y cuándo'],reservar:['Nueva <em>reserva</em>','Agenda una sesión para una clienta'],config:['<em>Configuración</em>','Horarios, servicios, mensajes y datos']};
let rq=0;
function render(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;try{doRender()}catch(e){console.error(e);const v=$('#view');if(v)v.innerHTML='<div class="empty"><b>Algo no salió bien</b>'+esc(e.message)+'</div>'}})}
let shellMode=null;
function viewFor(v){
  return {dashboard:viewDashboard,hoy:viewHoy,agenda:viewAgenda,clientas:viewClientas,fidel:viewFidel,asist:viewAsist,reservar:viewReservar,config:viewConfig}[v]();
}
function doRender(){
  const app=$('#app');
  if(!S.ready){app.innerHTML='<div class="loading">Cargando Bellarium…</div>';shellMode=null;return}
  if(S.login){app.innerHTML='<div class="login"><img src="/img/logo-oro.png" alt="Bellarium"><h1>Acceso <em style="color:var(--oro)">privado</em></h1><p>Panel de reservas de Bellarium.</p><label class="field"><span>Contraseña</span><input class="in" id="lpass" type="password" autocomplete="current-password"></label><button class="btn p" data-act="login" style="width:100%">Entrar</button><p id="lerr" style="color:var(--crit-t);margin-top:14px;min-height:20px"></p><p><a href="/" style="color:var(--axis)">Volver a la página de reservas</a></p></div>';shellMode=null;return}
  if(!S.db){app.innerHTML='<div class="pub" style="padding-top:12vh;text-align:center"><img src="/img/logo-oro.png" alt="Bellarium" style="width:120px;margin:0 auto 24px"><h1>Inicia sesión <em>para reservar</em></h1><p class="muted" style="margin:14px auto;max-width:44ch">Esta página guarda las reservas de forma segura. Abre el enlace con tu cuenta de Claude para ver horarios y reservar.</p></div>';shellMode=null;return}
  computeStats();
  const mode=(S.admin&&!S.preview)?'admin':'pub';
  const fa=document.activeElement,fid=fa&&fa.id&&$('#view')&&$('#view').contains(fa)?{id:fa.id,s:fa.selectionStart,e:fa.selectionEnd}:null;
  if(shellMode!==mode){
    shellMode=mode;
    app.innerHTML=mode==='admin'
      ?'<div class="app"><aside class="side"><div class="brand"><img src="/img/logo-circulo.png" alt=""><div><b>Bellarium</b><small>Reservas</small></div></div><nav class="menu" id="menu" aria-label="Secciones"></nav><div class="foot" id="foot"></div></aside><main class="work"><div class="top" id="top"></div><div id="note"></div><div id="view"></div></main></div>'
      :'<div style="max-width:1100px;margin:0 auto;padding:22px 0 60px"><div id="pubbar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:30px"><img src="/img/logo-oro.png" alt="Bellarium" style="height:44px;width:auto"><span id="pubact"></span></div><div id="view"></div><p class="foot-link"><a href="/admin">Acceso administradora</a></p></div>';
  }
  if(mode==='admin'){
    if(!NAV.some(n=>n[0]===S.view))S.view='dashboard';
    const t=todayStr(),pend=Object.values(S.appts).filter(a=>a.estado==='pendiente'&&a.fecha>=t).length||Object.values(S.appts).filter(a=>a.fecha===t&&VIVA(a.estado)).length;
    const FL=fidLists(),nf=FL.extrano.length+FL.pack.length;
    $('#menu').innerHTML=NAV.map((n,i)=>(i===6?'<div class="sep"></div>':'')+'<button class="'+(S.view===n[0]?'on':'')+'" data-act="nav" data-v="'+n[0]+'"'+(S.view===n[0]?' aria-current="page"':'')+'>'+I(n[2])+n[1]+(n[0]==='hoy'&&pend?'<span class="badge">'+pend+'</span>':'')+(n[0]==='fidel'&&nf?'<span class="badge">'+nf+'</span>':'')+'</button>').join('')+'<div class="sep"></div><a href="/" target="_blank" rel="noopener">'+I('eye')+'Página de clientas</a><a href="#" data-act="logout">'+I('x')+'Cerrar sesión</a>';
    $('#foot').innerHTML='<b>'+esc(C().nombre)+'</b>'+fdateL(t);
    const T=TITLES[S.view],act=S.view==='clientas'?'<button class="btn g sm" data-act="exp" data-v="clientas">'+I('download')+'CSV</button><button class="btn p sm" data-act="newclient">'+I('plus')+'Nueva clienta</button>':S.view==='asist'?'<button class="btn g sm" data-act="exp" data-v="citas">'+I('download')+'Exportar CSV</button>':(S.view==='dashboard'||S.view==='agenda')?'<button class="btn p sm" data-act="reservar">'+I('plus')+'Nueva reserva</button>':'';
    $('#top').innerHTML='<div><h1>'+T[0]+'</h1>'+(T[1]?'<p class="sub">'+T[1]+'</p>':'')+'</div><div class="actions">'+act+'</div>';
    const ej=countEjemplo();
    $('#note').innerHTML=ej?'<div class="banner"><span>'+I('alert')+' Estás viendo <b>datos de ejemplo</b> para que pruebes el sistema. Bórralos cuando quieras empezar con tus clientas reales.</span>'+(S.view==='config'?'':'<button class="btn s sm" data-act="nav" data-v="config">Ir a Configuración</button>')+'</div>':'';
  }else{
  }
  $('#view').innerHTML=viewFor(mode==='admin'?S.view:'reservar');
  if(fid){const el=document.getElementById(fid.id);if(el){el.focus();try{if(fid.s!=null)el.setSelectionRange(fid.s,fid.e)}catch(e){}}}
  if(S.modalLive){const h=S.modalLive();if(h==null)closeModal();else{const m=$('#modal .modal');if(m)m.innerHTML=h}}
}

/* ===== Acciones ===== */
const TIPON={confirmada:'confirmación',recordatorio:'recordatorio',gracias:'agradecimiento',extrano:'te extrañamos',pack:'pack pendiente',vip:'VIP'};
const A={
  nav(d){S.view=d.v;if(d.v==='reservar'&&(!S.W||S.W.done))S.W=newW();closeModal();scrollTo(0,0);render()},
  range(d){S.range=d.v==='mes'?'mes':+d.v;render()},
  close(){closeModal()},
  ovclose(d,e){if(e.target.classList.contains('ov'))closeModal()},
  preview(){S.preview=!S.preview;if(S.preview)S.W=newW();shellMode=null;scrollTo(0,0);render()},
  estado(d){setEstado(d.id,d.v)},
  logwa(d){
    const t=todayStr();let cid=d.cid;
    if(d.id&&S.appts[d.id]){cid=cid||S.appts[d.id].clienteId;const p={};if(d.tipo==='confirmada')p.estado='confirmada';if(d.tipo==='recordatorio')p.recordado=true;if(d.tipo==='gracias')p.graciasEnviado=true;
      if(Object.keys(p).length){const was=S.appts[d.id].estado;patch('appointments',d.id,p)}}
    if(cid&&S.clients[cid])patch('clients',cid,{ultimoContacto:t,ultimoTipo:TIPON[d.tipo]||d.tipo});
  },
  appt(d){apptModal(d.id)},
  clientprofile(d){profileModal(d.id)},
  reservar(d){closeModal();S.preview=false;S.view='reservar';S.W=newW(d.cid?{clienteId:d.cid,packId:d.pid||null,servicioId:d.pid&&S.packs[d.pid]?S.packs[d.pid].servicioId:null,step:d.pid?2:1}:{});shellMode=null;scrollTo(0,0);render()},
  reagendar(d){const a=S.appts[d.id];if(!a)return;closeModal();S.view='reservar';S.W=newW({editId:a.id,servicioId:a.servicioId,fecha:a.fecha,step:2});scrollTo(0,0);render()},
  slot(d,e){
    const col=e.target.closest('.cal-col'),r=col.getBoundingClientRect(),c=C(),h0=Math.floor(toMin(c.horaInicio)/60);
    let m=h0*60+Math.floor((e.clientY-r.top)/PXH*60/c.paso)*c.paso;m=Math.max(m,0);
    closeModal();S.view='reservar';S.W=newW({fecha:d.d,hora:fromMin(m),step:1});scrollTo(0,0);render();
  },
  agprev(){const m=(S.agendaMode||(innerWidth<860?'dia':'semana'))==='semana';S.agendaStart=addDays(S.agendaStart||todayStr(),m?-7:-1);render()},
  agnext(){const m=(S.agendaMode||(innerWidth<860?'dia':'semana'))==='semana';S.agendaStart=addDays(S.agendaStart||todayStr(),m?7:1);render()},
  agtoday(){S.agendaStart=todayStr();render()},
  agmode(d){S.agendaMode=d.v;render()},
  agday(d){S.agendaStart=d.v;render()},
  cliseg(d){S.cliSeg=d.v;render()},
  newclient(){clientFormModal(null)},
  editclient(d){clientFormModal(d.id)},
  saveclient(d){saveClient(d.id||null)},
  delclient(d){delClientModal(d.id)},
  delclientok(d){delClient(d.id)},
  togglepago(d){const p=S.packs[d.id];if(p)patch('packs',d.id,{pagado:p.pagado===false})},
  fidtab(d){S.fidTab=d.v;render()},
  /* asistente */
  wsvc(d){const W=S.W,sv=S.services[d.id];W.servicioId=d.id;W.step=2;
    if(W.fecha&&W.hora){const ok=freeSlots(W.fecha,Object.assign({id:d.id},sv),null,!isPub()).find(x=>x.h===W.hora&&x.free);if(!ok)W.hora=null}
    render();scrollTo(0,0)},
  wdate(d){S.W.fecha=d.v;S.W.hora=null;render()},
  whora(d){S.W.hora=d.v;render()},
  wnext(){if(S.W.hora){S.W.step=3;render();scrollTo(0,0)}},
  wback(){S.W.step=Math.max(1,S.W.step-1);render()},
  wcancel(){S.W=newW();S.view='agenda';render()},
  wmove(){wizardMove()},
  wpick(d){S.W.clienteId=d.id;S.W.q='';render()},
  wunpick(){S.W.clienteId=null;render()},
  wconfirm(){wizardCreate()},
  wcopy_old(){const W=S.W,sv=S.services[W.servicioId];const msg=fill('solicitud',{servicio:sv.nombre,fecha:fdateL(W.fecha),hora:W.hora,nombre:W.nombre,tel:W.tel});
    (navigator.clipboard?navigator.clipboard.writeText(msg):Promise.reject()).then(()=>toast('Mensaje copiado'),()=>openModal(xbtn()+'<h2>Copia tu mensaje</h2><textarea class="in" rows="5" readonly>'+esc(msg)+'</textarea>'))},
  wsend_old(d,e){const W=S.W;if(!W.nombre.trim()||normTel(W.tel).length<10){e.preventDefault();toast('Completa tu nombre y teléfono',true);return}toast('Abriendo WhatsApp…')},
  login(){doLogin()},logout(){Api.req('POST','/api/logout').finally(()=>{location.href='/admin'})},
  wbook(){publicBook()},wagain(){S.W=newW();render()},
  savecfg(){saveCfg()},savetpl(){saveTpl()},
  editsvc(d){svcModal(d.id||null)},savesvc(d){saveSvc(d.id||null)},
  exp(d){exportar(d.v)},resync(){resync()},
  delejemplo(){openModal(xbtn()+'<h2>¿Borrar los datos de ejemplo?</h2><p class="sub">Se eliminarán las clientas, citas y packs marcados como “Ejemplo”. Tus datos reales no se tocan.</p><div class="ft"><button class="btn g" data-act="close">Cancelar</button><button class="btn d" data-act="delejemplook">Borrar ejemplos</button></div>')},
  delejemplook(){delEjemplo()}
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const f=A[el.dataset.act];if(!f)return;
  if(el.dataset.act==='ovclose'&&e.target!==el)return;
  if(el.tagName!=='A')e.preventDefault();
  f(el.dataset,e);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Enter'&&e.target.id==='lpass')doLogin()});
document.addEventListener('input',e=>{
  const id=e.target.id,v=e.target.value,W=S.W;
  if(id==='cliQ'){S.cliQ=v;render()}
  else if(id==='wq'){W.q=v;render()}
  else if(id==='wnombre'||id==='wtel'||id==='wnotas'){W[id==='wnombre'?'nombre':id==='wtel'?'tel':'notas']=v;
    const a=$('#wwa');if(a&&W.servicioId){const sv=S.services[W.servicioId];a.href=waBizLink(fill('solicitud',{servicio:sv.nombre,fecha:fdateL(W.fecha),hora:W.hora,nombre:W.nombre||'…',tel:W.tel||'…'}))}}
});
document.addEventListener('change',e=>{
  const id=e.target.id,v=e.target.value;
  if(id==='cliSort'){S.cliSort=v;render()}
  else if(id==='asiFrom'){S.asiFrom=v||S.asiFrom;render()}
  else if(id==='asiTo'){S.asiTo=v||S.asiTo;render()}
  else if(id==='asiEstado'){S.asiEstado=v;render()}
  else if(id==='wdate'){S.W.fecha=v;S.W.hora=null;render()}
  else if(id==='wpago'){S.W.pagado=v}
  else if(e.target.classList&&e.target.classList.contains('cfg-dia')){e.target.parentNode.classList.toggle('on',e.target.checked)}
});

/* ===== Arranque ===== */
async function doLogin(){
  const p=$('#lpass');if(!p)return;const err=$('#lerr');err.textContent='';
  try{await Api.req('POST','/api/login',{password:p.value});location.reload()}
  catch(e){err.textContent=e.status===429?'Demasiados intentos. Espera unos minutos.':e.status===503?'El acceso aún no está configurado en el servidor.':'Contraseña incorrecta.'}
}
(async function init(){
  render();
  let me={admin:false};
  try{me=await Api.req('GET','/api/session')}catch(e){}
  if(IS_ADMIN_PATH&&!me.admin){S.login=true;S.ready=true;render();return}
  ADMIN=!!(me.admin&&IS_ADMIN_PATH);
  const db=await claude.use('db'),user=await claude.use('user');
  S.db=db;S.admin=!!(await user.canEdit());S.ready=true;
  S.view=S.admin?'dashboard':'reservar';S.W=newW();
  const subs=(col,key)=>S.db.collection(col).onSnapshot(s=>{const m={};s.docs.forEach(d=>{m[d.id]=Object.assign({},d.data())});if(key==='appts')Object.keys(m).forEach(k=>{m[k].id=k});S[key]=m;S.loaded[key]=true;render()});
  S.db.doc('config/main').onSnapshot(s=>{S.cfg=s.exists?Object.assign({},s.data()):{};S.loaded.cfg=true;render()});
  subs('services','services');subs('availability','avail');
  if(S.admin){subs('clients','clients');subs('appointments','appts');subs('packs','packs')}
  render();
  setInterval(()=>{if(!document.hidden)render()},60000);
})();
