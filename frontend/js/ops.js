/* ===== Hoy ===== */
const byTime=(a,b)=>(a.fecha+a.inicio).localeCompare(b.fecha+b.inicio);
function waBtn(a,key,label,tipo){
  const href=waLink(a.clienteTel||(S.clients[a.clienteId]||{}).telefono,fill(key,apptVars(a)));
  return '<a class="btn ok sm" target="_blank" rel="noopener" href="'+esc(href)+'" data-act="logwa" data-id="'+esc(a.id)+'" data-tipo="'+tipo+'">'+I('wa')+label+'</a>';
}
function apptActions(a,compact){
  const id=esc(a.id);let h='';
  if(a.estado==='pendiente'){
    h+=waBtn(a,'confirmacion','Aprobar y avisar','confirmada');
    h+='<button class="btn no sm" data-act="estado" data-id="'+id+'" data-v="cancelada">'+I('x')+'Rechazar</button>';
  }else if(VIVA(a.estado)){
    h+=a.estado==='reservada'?waBtn(a,'confirmacion','Confirmar','confirmada'):'';
    h+='<button class="btn ok sm" data-act="estado" data-id="'+id+'" data-v="asistio">'+I('check')+'Asistió</button>';
    h+='<button class="btn no sm" data-act="estado" data-id="'+id+'" data-v="no_asistio">'+I('x')+'No vino</button>';
  }else if(a.estado==='asistio'){
    h+=waBtn(a,'gracias','Agradecer','gracias');
    h+='<button class="btn g sm" data-act="estado" data-id="'+id+'" data-v="confirmada">Deshacer</button>';
  }else{
    h+='<button class="btn g sm" data-act="estado" data-id="'+id+'" data-v="confirmada">Reactivar</button>';
  }
  if(!compact)h+='<button class="btn g sm" data-act="appt" data-id="'+id+'">Detalle</button>';
  return h;
}
function viewHoy(){
  const t=todayStr(),m=addDays(t,1);
  const hoy=Object.values(S.appts).filter(a=>a.fecha===t).sort(byTime);
  const act=hoy.filter(a=>a.estado!=='cancelada');
  const asis=act.filter(a=>a.estado==='asistio').length,no=act.filter(a=>a.estado==='no_asistio').length,pend=act.filter(a=>VIVA(a.estado)).length;
  const manana=Object.values(S.appts).filter(a=>a.fecha===m&&a.estado!=='pendiente'&&VIVA(a.estado)).sort(byTime);
  const atras=Object.values(S.appts).filter(a=>a.fecha<t&&VIVA(a.estado)).sort(byTime);
  const row=a=>'<div class="li"><span class="tm">'+a.inicio+'</span><div class="mid"><b>'+esc(a.clienteNombre)+(a.ejemplo?'<span class="tagx">Ejemplo</span>':'')+'</b><small>'+esc(a.servicioNombre)+(a.nSesion?' · sesión '+a.nSesion+(a.totalSesiones?' de '+a.totalSesiones:''):'')+' · '+fromMinDur(a)+'</small></div>'+estHtml(a.estado)+'<div class="acts">'+apptActions(a)+'</div></div>';
  let h='<div class="grid g4" style="margin-bottom:18px">'+tile('Citas hoy',act.length,'')+tile('Asistieron',asis,'')+tile('No vinieron',no,'')+tile('Por atender',pend,'')+'</div>';
  const sols=Object.values(S.appts).filter(a=>a.estado==='pendiente'&&a.fecha>=t).sort(byTime);
  if(sols.length)h+='<div class="card" style="margin-bottom:18px;border-color:var(--warn)"><div class="hd"><div><h3>Solicitudes por confirmar</h3><p class="hint">Reservas hechas por clientas desde la página. Apruébalas para avisarles por WhatsApp, o recházalas para liberar la hora.</p></div></div><div class="list">'+sols.map(a=>'<div class="li"><span class="tm" style="font-size:20px;min-width:96px">'+fdate(a.fecha)+'<br>'+a.inicio+'</span><div class="mid"><b>'+esc(a.clienteNombre)+'</b><small>'+esc(a.servicioNombre)+' · '+esc(fmtTel(a.clienteTel))+(a.notas?' · '+esc(a.notas):'')+'</small></div><div class="acts">'+apptActions(a)+'</div></div>').join('')+'</div></div>';
  if(atras.length)h+='<div class="banner warn"><span>'+I('alert')+' Tienes <b>'+atras.length+'</b> '+plural(atras.length,'cita pasada','citas pasadas')+' sin marcar asistencia. Márcalas para que el historial y la fidelización sean correctos.</span><button class="btn s sm" data-act="nav" data-v="asist">Revisar</button></div>';
  h+='<div class="grid gmain"><div class="card"><div class="hd"><div><h3>Agenda de hoy</h3><p class="hint">'+fdateL(t)+'</p></div><button class="btn p sm" data-act="reservar">'+I('plus')+'Nueva reserva</button></div>'+
    (hoy.length?'<div class="list">'+hoy.map(row).join('')+'</div>':'<div class="empty"><b>Hoy no hay citas</b>Cuando agendes sesiones para hoy, aparecerán aquí para marcar la asistencia.</div>')+'</div>'+
    '<div class="card"><div class="hd"><div><h3>Recordar mañana</h3><p class="hint">'+fdateL(m)+'</p></div></div>'+
    (manana.length?'<div class="list">'+manana.map(a=>'<div class="li"><span class="tm">'+a.inicio+'</span><div class="mid"><b>'+esc(a.clienteNombre)+'</b><small>'+esc(a.servicioNombre)+(a.recordado?' · recordatorio enviado':'')+'</small></div><div class="acts">'+waBtn(a,'recordatorio',a.recordado?'Reenviar':'Recordar','recordatorio')+'</div></div>').join('')+'</div>':'<div class="empty"><b>Sin citas mañana</b>Nada que recordar por ahora.</div>')+'</div></div>';
  return h;
}
const fromMinDur=a=>(toMin(a.fin)-toMin(a.inicio))+' min';

/* ===== Agenda ===== */
const PXH=64;
function viewAgenda(){
  const c=C(),t=todayStr(),narrow=innerWidth<860;
  const mode=S.agendaMode||(narrow?'dia':'semana');
  if(!S.agendaStart)S.agendaStart=t;
  const start=mode==='semana'?mondayOf(S.agendaStart):S.agendaStart,n=mode==='semana'?7:1,days=[];
  for(let i=0;i<n;i++)days.push(addDays(start,i));
  const h0=Math.floor(toMin(c.horaInicio)/60),h1=Math.ceil(toMin(c.horaFin)/60),H=(h1-h0)*PXH;
  const ttl=mode==='semana'?(fdate(days[0])+' – '+fdate(days[6])):fdateL(start);
  const bar='<div class="cal-bar"><button class="btn g sm" data-act="agprev" aria-label="Anterior">'+I('left')+'</button><button class="btn g sm" data-act="agtoday">Hoy</button><button class="btn g sm" data-act="agnext" aria-label="Siguiente">'+I('right')+'</button><span class="ttl">'+ttl+'</span><span style="flex:1"></span>'+
    '<div class="chips"><button class="chip'+(mode==='semana'?' on':'')+'" data-act="agmode" data-v="semana">Semana</button><button class="chip'+(mode==='dia'?' on':'')+'" data-act="agmode" data-v="dia">Día</button></div></div>';
  let strip='';
  if(mode==='dia'){const ws=mondayOf(start);strip='<div class="day-strip">'+Array.from({length:7},(_,i)=>addDays(ws,i)).map(d=>'<button class="'+(d===start?'on':'')+'" data-act="agday" data-v="'+d+'">'+DIAS[dow(d)]+'<b>'+D(d).getUTCDate()+'</b></button>').join('')+'</div>'}
  const head='<div class="cal-head" style="grid-template-columns:54px repeat('+n+',minmax(0,1fr))"><div style="border:0"></div>'+days.map(d=>'<div class="'+(d===t?'today':'')+'">'+DIAS[dow(d)]+'<b>'+D(d).getUTCDate()+'</b></div>').join('')+'</div>';
  let hours='<div class="cal-hours" style="height:'+H+'px">';
  for(let h=h0;h<h1;h++)hours+='<span style="top:'+((h-h0)*PXH+2)+'px">'+h+':00</span>';
  hours+='</div>';
  const cols=days.map(d=>{
    let x='<div class="cal-col" data-act="slot" data-d="'+d+'" style="height:'+H+'px">';
    for(let h=h0;h<h1;h++)x+='<div class="hl" style="top:'+((h-h0)*PXH)+'px"></div>';
    if(!isOpen(d))x+='<div class="closed" style="top:0;height:'+H+'px"></div>';
    else{const a0=(toMin(c.horaInicio)-h0*60)/60*PXH,a1=(toMin(c.horaFin)-h0*60)/60*PXH;if(a0>0)x+='<div class="closed" style="top:0;height:'+a0+'px"></div>';if(a1<H)x+='<div class="closed" style="top:'+a1+'px;height:'+(H-a1)+'px"></div>'}
    if(d===t){const y=(nowMin()-h0*60)/60*PXH;if(y>0&&y<H)x+='<div class="now" style="top:'+y+'px"></div>'}
    const evs=Object.values(S.appts).filter(a=>a.fecha===d&&a.estado!=='cancelada').sort(byTime);
    // columnas para solapes
    const lanes=[];const placed=evs.map(a=>{const s=toMin(a.inicio),e=toMin(a.fin);let L=lanes.findIndex(end=>end<=s);if(L<0){L=lanes.length;lanes.push(e)}else lanes[L]=e;return {a,s,e,L}});
    // ancho por cluster
    placed.forEach(p=>{p.n=placed.filter(q=>q.s<p.e&&q.e>p.s).reduce((m,q)=>Math.max(m,q.L+1),p.L+1)});
    placed.forEach(p=>{const top=(p.s-h0*60)/60*PXH,h=Math.max(22,(p.e-p.s)/60*PXH-2),w=100/p.n;
      x+='<button class="ev '+p.a.estado+'" data-act="appt" data-id="'+esc(p.a.id)+'" style="top:'+top+'px;height:'+h+'px;left:calc('+(p.L*w)+'% + 2px);width:calc('+w+'% - 4px)" title="'+esc(p.a.clienteNombre+' · '+p.a.servicioNombre)+'"><b>'+esc(p.a.clienteNombre)+'</b><small>'+p.a.inicio+' · '+esc(p.a.servicioNombre)+'</small></button>'});
    return x+'</div>';
  }).join('');
  return bar+strip+'<div class="cal" style="overflow-x:auto"><div style="min-width:'+(mode==='semana'?640:0)+'px">'+head+'<div class="cal-body" style="grid-template-columns:54px repeat('+n+',minmax(0,1fr))">'+hours+cols+'</div></div></div><p class="hint muted" style="margin-top:10px;font-size:12px">Toca un espacio libre para reservar. Las franjas rayadas están fuera de horario.</p>';
}

/* ===== Detalle de cita ===== */
function apptModal(id){
  const a=S.appts[id];if(!a){closeModal();return}
  const cl=S.clients[a.clienteId]||{},st=cstat(a.clienteId);
  const build=()=>{
    const a=S.appts[id];if(!a)return '';
    return xbtn()+'<h2>'+esc(a.clienteNombre)+'</h2><p class="sub">'+estHtml(a.estado)+' &nbsp; '+segHtml(cstat(a.clienteId).seg)+'</p>'+
    '<dl class="kv"><dt>Servicio</dt><dd>'+esc(a.servicioNombre)+(a.nSesion?' · sesión '+a.nSesion+(a.totalSesiones?' de '+a.totalSesiones:''):'')+'</dd><dt>Fecha</dt><dd>'+fdateL(a.fecha)+'</dd><dt>Hora</dt><dd>'+a.inicio+' – '+a.fin+' ('+RECURSOS[a.recurso]+')</dd><dt>Teléfono</dt><dd>'+esc(fmtTel(a.clienteTel||cl.telefono))+'</dd>'+(a.notas?'<dt>Notas</dt><dd>'+esc(a.notas)+'</dd>':'')+'<dt>Visitas</dt><dd>'+cstat(a.clienteId).visitas+' · última '+hace(cstat(a.clienteId).ultima)+'</dd></dl>'+
    '<div class="ft" style="justify-content:flex-start;margin-top:20px">'+apptActions(a,true)+'</div>'+
    '<div class="ft"><button class="btn g sm" data-act="clientprofile" data-id="'+esc(a.clienteId)+'">Ver clienta</button><button class="btn g sm" data-act="reagendar" data-id="'+esc(a.id)+'">Reagendar</button>'+(a.estado!=='cancelada'?'<button class="btn d sm" data-act="estado" data-id="'+esc(a.id)+'" data-v="cancelada">Cancelar cita</button>':'')+'</div>';
  };
  openModal(build(),'',()=>S.appts[id]?build():null);
}

/* ===== Asistencias (historial) ===== */
function viewAsist(){
  const t=todayStr();
  if(!S.asiFrom)S.asiFrom=addDays(t,-30);if(!S.asiTo)S.asiTo=t;
  let rows=Object.values(S.appts).filter(a=>inR(a.fecha,S.asiFrom,S.asiTo)&&(S.asiEstado==='todos'||a.estado===S.asiEstado)).sort((a,b)=>byTime(b,a));
  const sinMarcar=Object.values(S.appts).filter(a=>a.fecha<t&&VIVA(a.estado)).length;
  const cnt=e=>rows.filter(a=>a.estado===e).length;
  const f='<div class="card" style="margin-bottom:18px"><div class="row3"><label class="field"><span>Desde</span><input class="in" type="date" id="asiFrom" value="'+S.asiFrom+'"></label><label class="field"><span>Hasta</span><input class="in" type="date" id="asiTo" value="'+S.asiTo+'"></label><label class="field"><span>Estado</span><select class="in" id="asiEstado"><option value="todos">Todos</option>'+Object.keys(ESTN).map(k=>'<option value="'+k+'"'+(S.asiEstado===k?' selected':'')+'>'+ESTN[k]+'</option>').join('')+'</select></label></div></div>';
  const resumen='<div class="chips" style="margin-bottom:16px"><span class="chip">Mostrando<b>'+rows.length+'</b></span><span class="chip">Asistió<b>'+cnt('asistio')+'</b></span><span class="chip">No vino<b>'+cnt('no_asistio')+'</b></span><span class="chip">Canceladas<b>'+cnt('cancelada')+'</b></span><span class="chip">Pendientes<b>'+(cnt('pendiente')+cnt('reservada')+cnt('confirmada'))+'</b></span>'+(sinMarcar?'<span class="chip" style="border-color:var(--warn);color:var(--warn-t)">'+I('alert')+' '+sinMarcar+' pasadas sin marcar</span>':'')+'</div>';
  const tabla=rows.length?'<div class="scroll"><table class="tbl"><thead><tr><th>Fecha</th><th>Clienta</th><th>Servicio</th><th>Estado</th><th></th></tr></thead><tbody>'+rows.slice(0,300).map(a=>'<tr><td>'+fdate(a.fecha)+' · '+a.inicio+'</td><td class="who"><b>'+esc(a.clienteNombre)+(a.ejemplo?'<span class="tagx">Ejemplo</span>':'')+'</b></td><td>'+esc(a.servicioNombre)+'</td><td>'+estHtml(a.estado)+'</td><td class="n">'+(VIVA(a.estado)?'<span style="display:inline-flex;gap:6px"><button class="btn ok sm" data-act="estado" data-id="'+esc(a.id)+'" data-v="asistio">Asistió</button><button class="btn no sm" data-act="estado" data-id="'+esc(a.id)+'" data-v="no_asistio">No vino</button></span>':'<button class="btn g sm" data-act="appt" data-id="'+esc(a.id)+'">Detalle</button>')+'</td></tr>').join('')+'</tbody></table></div>'+(rows.length>300?'<p class="hint muted">Mostrando las 300 más recientes. Exporta el CSV para ver todo.</p>':''):'<div class="empty"><b>Sin registros</b>No hay citas con esos filtros.</div>';
  return f+resumen+'<div class="card">'+tabla+'</div>';
}
