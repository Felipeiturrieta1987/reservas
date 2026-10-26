/* ===== Reserva (asistente) ===== */
const newW=(o)=>Object.assign({busy:false,sent:null,step:1,servicioId:null,packId:null,fecha:null,hora:null,nombre:'',tel:'',notas:'',clienteId:null,editId:null,pagado:'si',q:'',done:null},o||{});
const isPub=()=>!S.admin||S.preview;
function svcPrice(s){return +s.precio?money(s.precio):'A cotizar'}
function svcMeta(s){const n=+s.sesiones||1;return (n>1?n+' sesiones · ':'')+(+s.duracion||30)+' min'+(n>1?' c/u':'')}
function svcSub(s){return s.desc?s.desc+' · '+(+s.duracion||30)+' min':svcMeta(s)}

function dayStripPub(W){
  const c=C(),t=todayStr(),days=[];
  for(let i=0;i<=c.anticipo;i++){const d=addDays(t,i);if(isOpen(d))days.push(d)}
  if(!days.length)return '<p class="muted">No hay días disponibles por ahora.</p>';
  return '<div class="day-strip" role="group" aria-label="Elige un día">'+days.slice(0,24).map(d=>'<button class="'+(W.fecha===d?'on':'')+'" data-act="wdate" data-v="'+d+'">'+DIAS[dow(d)]+'<b>'+D(d).getUTCDate()+'</b>'+MESES[D(d).getUTCMonth()]+'</button>').join('')+'</div>';
}
function viewReservar(){
  const W=S.W||(S.W=newW()),pub=isPub(),svcs=svcList(true),c=C();
  if(!svcs.length)return '<div class="empty"><b>Aún no hay servicios cargados</b>'+(S.admin?'Agrega tus servicios en Configuración para abrir las reservas.<br><br><button class="btn p sm" data-act="nav" data-v="config">Ir a Configuración</button>':'Vuelve en un momento.')+'</div>';
  const steps=W.editId?2:3;
  const bar=W.done?'':'<div class="steps">'+Array.from({length:steps},(_,i)=>'<i class="'+((i+1)<=(W.editId?1:W.step)?'on':'')+'"></i>').join('')+'</div>';
  let h='';
  if(W.done){
    const a=W.done;
    h='<div class="card" style="text-align:center;padding:36px 22px"><p class="eyebrow">Reserva creada</p><h3 style="font-size:34px;margin:8px 0">'+esc(a.clienteNombre)+'</h3><p class="muted">'+esc(a.servicioNombre)+' · '+fdateL(a.fecha)+' a las '+a.inicio+'</p><div class="chips" style="justify-content:center;margin-top:22px">'+waBtn(a,'confirmacion','Enviar confirmación','confirmada')+'<button class="btn g sm" data-act="reservar">Otra reserva</button><button class="btn g sm" data-act="nav" data-v="agenda">Ver agenda</button></div></div>';
    return h;
  }
  if(W.sent){
    const a=W.sent,wa=waBizLink(fill('solicitud',{servicio:a.servicio,fecha:fdateL(a.fecha),hora:a.hora,nombre:a.nombre,tel:a.tel}));
    return '<div class="pub"><div class="pub-grid"><div><p class="eyebrow">Solicitud enviada</p><h1>¡Listo, <em>'+esc(a.nombre.split(' ')[0])+'</em>!</h1><div class="card" style="margin:26px 0;background:var(--graf)"><p class="eyebrow">Tu hora</p><h3 style="margin-top:4px">'+esc(a.servicio)+'</h3><p class="muted">'+fdateL(a.fecha)+' · '+a.hora+'</p><p class="muted" style="font-size:12.5px;margin-top:10px">'+esc(C().direccion)+'</p></div><p class="muted" style="max-width:46ch">Tu hora está reservada y quedó <b>por confirmar</b>. Te escribiremos por WhatsApp al número que dejaste para confirmarla.</p><div class="chips" style="margin-top:22px"><a class="btn ok" target="_blank" rel="noopener" href="'+esc(wa)+'">'+I('wa')+'Avisar por WhatsApp</a><button class="btn g" data-act="wagain">Reservar otra hora</button></div></div><div class="pub-art"><img src="/img/hero.jpg" alt=""></div></div></div>';
  }
  const sv=W.servicioId&&S.services[W.servicioId]?Object.assign({id:W.servicioId},S.services[W.servicioId]):null;
  if(W.step===1&&!W.editId){
    h=bar+'<h3 class="eyebrow" style="margin-bottom:12px">1 · Elige tu servicio</h3><div style="display:grid;gap:10px">'+svcs.map(s=>'<button class="svc'+(W.servicioId===s.id?' on':'')+'" data-act="wsvc" data-id="'+esc(s.id)+'"><span><b>'+esc(s.nombre)+'</b><small>'+esc(svcSub(s))+'</small></span><span class="pr">'+svcPrice(s)+'</span></button>').join('')+'</div>';
  }else if(W.step===2||W.editId){
    const slots=W.fecha&&sv?freeSlots(W.fecha,sv,W.editId,!pub):[];
    const ok=slots.some(x=>x.free);
    h=bar+(W.editId?'<h3 class="eyebrow" style="margin-bottom:12px">Reagendar · '+esc(sv?sv.nombre:'')+'</h3>':'<h3 class="eyebrow" style="margin-bottom:12px">2 · Elige día y hora</h3>')+
      (pub?dayStripPub(W):'<div class="row2" style="margin-bottom:14px"><label class="field"><span>Día</span><input class="in" type="date" id="wdate" value="'+(W.fecha||'')+'"></label><div class="field"><span>Atajos</span><div class="chips">'+[0,1,2,7].map(n=>'<button class="chip" data-act="wdate" data-v="'+addDays(todayStr(),n)+'">'+(n===0?'Hoy':n===1?'Mañana':n===2?fdate(addDays(todayStr(),2)):'En 1 semana')+'</button>').join('')+'</div></div></div>')+
      (W.fecha?(slots.length?'<div class="slots" style="margin-top:6px">'+slots.map(x=>'<button class="'+(W.hora===x.h?'on':'')+'" data-act="whora" data-v="'+x.h+'"'+(x.free?'':' disabled')+'>'+x.h+'</button>').join('')+'</div>'+(ok?'':'<p class="muted" style="margin-top:12px">Ese día ya no quedan horas libres. Prueba con otro.</p>'):'<p class="muted" style="margin-top:12px">'+(isOpen(W.fecha)?'No hay horarios para esta fecha.':'Ese día estamos cerrados.')+'</p>'):'<p class="muted" style="margin-top:8px">Elige un día para ver los horarios disponibles.</p>')+
      '<div class="ft" style="justify-content:space-between">'+(W.editId?'<button class="btn g" data-act="wcancel">Cancelar</button>':'<button class="btn g" data-act="wback">Atrás</button>')+(W.editId?'<button class="btn p" data-act="wmove"'+(W.hora?'':' disabled')+'>Mover cita</button>':'<button class="btn p" data-act="wnext"'+(W.hora?'':' disabled')+'>Continuar</button>')+'</div>';
  }else{
    const resumen='<div class="card" style="margin-bottom:18px;background:var(--graf)"><p class="eyebrow">Tu hora</p><h3 style="margin-top:4px">'+esc(sv.nombre)+'</h3><p class="muted">'+fdateL(W.fecha)+' · '+W.hora+' · '+svcPrice(sv)+'</p></div>';
    if(pub){
      h=bar+'<h3 class="eyebrow" style="margin-bottom:12px">3 · Tus datos</h3>'+resumen+'<div class="form" style="display:grid;gap:14px"><label class="field"><span>Nombre</span><input class="in" id="wnombre" value="'+esc(W.nombre)+'" autocomplete="name" maxlength="80"></label><label class="field"><span>Teléfono / WhatsApp</span><input class="in" id="wtel" inputmode="tel" placeholder="+56 9 1234 5678" value="'+esc(W.tel)+'" autocomplete="tel" maxlength="20"></label><label class="field"><span>Algo que debamos saber (opcional)</span><textarea class="in" id="wnotas" rows="2" maxlength="300">'+esc(W.notas)+'</textarea></label><input class="hp" id="whp" tabindex="-1" autocomplete="off" aria-hidden="true"></div>'+
        '<p class="muted" style="font-size:12.5px;margin-top:14px">Tu hora queda <b>reservada</b> al enviar la solicitud. Bellarium te confirmará por WhatsApp.</p>'+
        '<div class="ft" style="justify-content:space-between"><button class="btn g" data-act="wback">Atrás</button><button class="btn p" data-act="wbook"'+(W.busy?' disabled':'')+'>'+(W.busy?'Enviando…':'Solicitar hora')+'</button></div>';
    }else{
      const q=W.q.trim().toLowerCase(),qd=q.replace(/\D/g,'');
      const found=W.clienteId?[]:(q?Object.entries(S.clients).filter(([,x])=>String(x.nombre).toLowerCase().includes(q)||(qd.length>3&&normTel(x.telefono).includes(qd))).slice(0,6):[]);
      const sel=W.clienteId&&S.clients[W.clienteId];
      const cl=sel?'<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px"><span class="who"><b>'+esc(sel.nombre)+'</b><small>'+esc(fmtTel(sel.telefono))+' · '+cstat(W.clienteId).visitas+' visitas</small></span><button class="btn g sm" data-act="wunpick">Cambiar</button></div>':
        '<label class="field" style="margin-bottom:12px"><span>Buscar clienta existente</span><input class="in" id="wq" type="search" placeholder="Nombre o teléfono" value="'+esc(W.q)+'"></label>'+
        (found.length?'<div class="list" style="margin-bottom:12px">'+found.map(([id,x])=>'<button class="svc" style="margin-bottom:8px" data-act="wpick" data-id="'+esc(id)+'"><span><b>'+esc(x.nombre)+'</b><small>'+esc(fmtTel(x.telefono))+'</small></span>'+segHtml(cstat(id).seg)+'</button>').join('')+'</div>':'')+
        '<p class="eyebrow" style="margin:16px 0 10px">O registra una nueva</p><div class="row2"><label class="field"><span>Nombre</span><input class="in" id="wnombre" value="'+esc(W.nombre)+'"></label><label class="field"><span>Teléfono / WhatsApp</span><input class="in" id="wtel" inputmode="tel" placeholder="+56 9 1234 5678" value="'+esc(W.tel)+'"></label></div>';
      h=bar+'<h3 class="eyebrow" style="margin-bottom:12px">3 · Clienta</h3>'+resumen+cl+
        '<div class="row2" style="margin-top:14px"><label class="field"><span>Notas de la cita</span><input class="in" id="wnotas" value="'+esc(W.notas)+'"></label>'+(W.packId?'<div class="field"><span>Pack</span><div class="in" style="display:flex;align-items:center">Continúa pack existente</div></div>':'<label class="field"><span>Pago</span><select class="in" id="wpago"><option value="si"'+(W.pagado==='si'?' selected':'')+'>Pagado</option><option value="no"'+(W.pagado==='no'?' selected':'')+'>Por cobrar</option></select></label>')+'</div>'+
        '<div class="ft" style="justify-content:space-between"><button class="btn g" data-act="wback">Atrás</button><button class="btn p" data-act="wconfirm">Crear reserva</button></div>';
    }
  }
  if(pub){
    return '<div class="pub"><div class="pub-grid"><div><p class="eyebrow">Bellarium · Ñuñoa</p><h1>Reserva tu <em>hora</em></h1><p class="muted" style="margin:10px 0 26px;max-width:46ch">Bronceado marquiña y tratamientos HIFU 7D. Elige servicio, día y hora; te respondemos por WhatsApp para confirmar.</p>'+h+'</div><div class="pub-art"><img src="/img/hero.jpg" alt=""></div></div></div>';
  }
  return '<div style="max-width:720px">'+h+'</div>';
}

async function wizardCreate(){
  const W=S.W,sv=S.services[W.servicioId],c=C(),t=todayStr();
  if(!sv)return;
  const svo=Object.assign({id:W.servicioId},sv);
  if(!freeSlots(W.fecha,svo,null,true).find(x=>x.h===W.hora&&x.free)){toast('Esa hora ya no está disponible',true);W.hora=null;W.step=2;render();return}
  let cid=W.clienteId;
  if(!cid){
    const nombre=W.nombre.trim(),tel=W.tel.trim();
    if(!nombre){toast('Falta el nombre de la clienta',true);return}
    if(!tel||normTel(tel).length<10){toast('Revisa el teléfono',true);return}
    const ex=Object.entries(S.clients).find(([,x])=>normTel(x.telefono)===normTel(tel));
    cid=ex?ex[0]:uid();
    if(!ex)await put('clients',cid,{nombre,telefono:tel,email:'',fuente:'',notas:'',creado:t});
  }
  const cl=S.clients[cid];
  let pid=W.packId,total=+sv.sesiones||1;
  if(!pid){pid=uid();await put('packs',pid,{clienteId:cid,servicioId:W.servicioId,nombre:sv.nombre,total,precio:+sv.precio||0,pagado:W.pagado!=='no',fecha:t})}
  else total=+S.packs[pid].total||1;
  const n=Object.values(S.appts).filter(a=>a.packId===pid&&a.estado!=='cancelada'&&a.estado!=='no_asistio').length+1;
  const dur=+sv.duracion||30,a={id:uid(),clienteId:cid,clienteNombre:cl.nombre,clienteTel:cl.telefono,servicioId:W.servicioId,servicioNombre:sv.nombre,fecha:W.fecha,inicio:W.hora,fin:fromMin(toMin(W.hora)+dur),recurso:sv.recurso||'bronceado',estado:'reservada',packId:pid,nSesion:n,totalSesiones:total,notas:W.notas.trim(),creado:t,ts:Date.now()};
  await saveAppt(a);
  S.W=newW({done:a});render();toast('Reserva creada');
}
async function wizardMove(){
  const W=S.W,a=S.appts[W.editId],sv=S.services[a.servicioId]||{duracion:toMin(a.fin)-toMin(a.inicio),recurso:a.recurso};
  const svo=Object.assign({id:a.servicioId},sv,{duracion:toMin(a.fin)-toMin(a.inicio),recurso:a.recurso});
  if(!freeSlots(W.fecha,svo,a.id,true).find(x=>x.h===W.hora&&x.free)){toast('Esa hora no está disponible',true);return}
  const old=a.fecha,n=Object.assign({},a,{fecha:W.fecha,inicio:W.hora,fin:fromMin(toMin(W.hora)+toMin(a.fin)-toMin(a.inicio)),estado:'reservada',recordado:false,upd:Date.now()});
  S.W=null;S.view='agenda';S.agendaStart=n.fecha;await saveAppt(n,old);render();toast('Cita movida');
}

async function publicBook(){
  const W=S.W,sv=S.services[W.servicioId];if(!sv||W.busy)return;
  const nombre=W.nombre.trim(),tel=W.tel.trim();
  if(nombre.length<2){toast('Escribe tu nombre',true);return}
  if(normTel(tel).length<10){toast('Revisa tu teléfono (ej. +56 9 1234 5678)',true);return}
  W.busy=true;render();
  try{
    await Api.req('POST','/api/book',{servicioId:W.servicioId,fecha:W.fecha,hora:W.hora,nombre,telefono:tel,notas:W.notas.trim(),website:($('#whp')||{}).value||''});
    S.W=newW({sent:{servicio:sv.nombre,fecha:W.fecha,hora:W.hora,nombre,tel}});scrollTo(0,0);render();
  }catch(e){
    W.busy=false;
    if(e.status===409){toast('Esa hora acaba de ser tomada. Elige otra.',true);W.hora=null;W.step=2;await dbPull()}
    else toast(e.message||'No se pudo enviar. Intenta de nuevo.',true);
    render();
  }
}
