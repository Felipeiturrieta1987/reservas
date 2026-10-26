/* ===== Clientas ===== */
const SEGS=['todas','vip','activa','nueva','riesgo','inactiva','sinvisitas'];
function clientRows(){
  const q=S.cliQ.trim().toLowerCase(),qd=q.replace(/\D/g,'');
  let r=Object.entries(S.clients).map(([id,c])=>Object.assign({id},c,{s:cstat(id)}));
  if(S.cliSeg!=='todas')r=r.filter(x=>x.s.seg===S.cliSeg);
  if(q)r=r.filter(x=>String(x.nombre).toLowerCase().includes(q)||(qd&&normTel(x.telefono).includes(qd)));
  const so=S.cliSort;
  r.sort((a,b)=>so==='nombre'?String(a.nombre).localeCompare(b.nombre):so==='visitas'?b.s.visitas-a.s.visitas:so==='gasto'?b.s.gasto-a.s.gasto:(b.s.ultima||'').localeCompare(a.s.ultima||'')||String(a.nombre).localeCompare(b.nombre));
  return r;
}
function viewClientas(){
  const all=Object.values(S.stats.cl),rows=clientRows();
  const chips='<div class="chips" style="margin-bottom:14px">'+SEGS.map(k=>{const n=k==='todas'?all.length:all.filter(s=>s.seg===k).length;return '<button class="chip'+(S.cliSeg===k?' on':'')+'" data-act="cliseg" data-v="'+k+'">'+(k==='todas'?'Todas':SEGN[k])+'<b>'+n+'</b></button>'}).join('')+'</div>';
  const bar='<div class="row2" style="margin-bottom:16px;grid-template-columns:2fr 1fr"><label class="field"><span>Buscar</span><input class="in" id="cliQ" type="search" placeholder="Nombre o teléfono" value="'+esc(S.cliQ)+'"></label><label class="field"><span>Ordenar por</span><select class="in" id="cliSort">'+[['ultima','Última visita'],['nombre','Nombre'],['visitas','Más visitas'],['gasto','Mayor gasto']].map(o=>'<option value="'+o[0]+'"'+(S.cliSort===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></label></div>';
  let tb;
  if(!all.length)tb='<div class="empty"><b>Aún no tienes clientas registradas</b>Se crean solas al reservar la primera hora, o puedes agregarlas a mano.<br><br><button class="btn p sm" data-act="newclient">'+I('plus')+'Nueva clienta</button></div>';
  else if(!rows.length)tb='<div class="empty"><b>Sin resultados</b>Prueba con otro nombre o segmento.</div>';
  else tb='<div class="scroll"><table class="tbl"><thead><tr><th>Clienta</th><th>Estado</th><th class="n">Visitas</th><th>Última visita</th><th>Próxima</th><th class="n">Compras</th></tr></thead><tbody>'+rows.map(x=>'<tr class="clk" data-act="clientprofile" data-id="'+esc(x.id)+'"><td class="who"><b>'+esc(x.nombre)+(x.ejemplo?'<span class="tagx">Ejemplo</span>':'')+'</b><small>'+esc(fmtTel(x.telefono))+'</small></td><td>'+segHtml(x.s.seg)+'</td><td class="n">'+x.s.visitas+(x.s.noshow?' <small class="muted">('+x.s.noshow+' no vino)</small>':'')+'</td><td>'+(x.s.ultima?hace(x.s.ultima):'<span class="muted">—</span>')+'</td><td>'+(x.s.proxima?fdate(x.s.proxima.fecha)+' '+x.s.proxima.inicio:'<span class="muted">—</span>')+'</td><td class="n">'+money(x.s.gasto)+'</td></tr>').join('')+'</tbody></table></div>';
  return chips+bar+'<div class="card">'+tb+'</div>';
}

function clientFormModal(id){
  const c=id?S.clients[id]:{};
  const src=['','Instagram','Referida','Google / Web','Pasó por el local','Otro'];
  openModal(xbtn()+'<h2>'+(id?'Editar clienta':'Nueva clienta')+'</h2><p class="sub">El teléfono se usa para los mensajes de WhatsApp.</p><div class="form">'+
    '<label class="field"><span>Nombre completo</span><input class="in" id="f_nombre" value="'+esc(c.nombre)+'" autocomplete="off"></label>'+
    '<div class="row2"><label class="field"><span>Teléfono / WhatsApp</span><input class="in" id="f_tel" inputmode="tel" placeholder="+56 9 1234 5678" value="'+esc(c.telefono)+'"></label><label class="field"><span>Correo (opcional)</span><input class="in" id="f_mail" type="email" value="'+esc(c.email)+'"></label></div>'+
    '<label class="field"><span>Cómo nos conoció</span><select class="in" id="f_src">'+src.map(s=>'<option value="'+s+'"'+(c.fuente===s?' selected':'')+'>'+(s||'Sin especificar')+'</option>').join('')+'</select></label>'+
    '<label class="field"><span>Notas (tipo de piel, preferencias, alergias a productos)</span><textarea class="in" id="f_notas">'+esc(c.notas)+'</textarea></label></div>'+
    '<div class="ft"><button class="btn g" data-act="close">Cancelar</button><button class="btn p" data-act="saveclient" data-id="'+esc(id||'')+'">Guardar</button></div>');
}
async function saveClient(id){
  const nombre=$('#f_nombre').value.trim(),tel=$('#f_tel').value.trim();
  if(!nombre){toast('Falta el nombre',true);return}
  if(tel&&normTel(tel).length<10){toast('Revisa el teléfono',true);return}
  const dup=tel&&Object.entries(S.clients).find(([k,c])=>k!==id&&normTel(c.telefono)===normTel(tel));
  if(dup){toast('Ya existe: '+dup[1].nombre,true);return}
  const data=Object.assign({},id?S.clients[id]:{creado:todayStr()},{nombre,telefono:tel,email:$('#f_mail').value.trim(),fuente:$('#f_src').value,notas:$('#f_notas').value.trim()});
  const cid=id||uid();closeModal();await put('clients',cid,data);render();toast('Clienta guardada');
  if(S.W&&S.W.wantClient){S.W.clienteId=cid;S.W.wantClient=false;render()}
}

function profileModal(id){
  const build=()=>{
    const c=S.clients[id];if(!c)return null;
    const s=cstat(id),t=todayStr(),ap=Object.values(S.appts).filter(a=>a.clienteId===id).sort((a,b)=>byTime(b,a));
    const packs=Object.entries(S.packs).filter(([,p])=>p.clienteId===id).sort((a,b)=>(b[1].fecha||'').localeCompare(a[1].fecha||''));
    const packHtml=packs.length?packs.map(([pid,p])=>{const x=S.stats.pk[pid]||{usadas:0,agendadas:0,restan:0,libres:0},tot=+p.total||1;
      return '<div class="pack"><div class="top2"><b>'+esc(p.nombre)+'</b><span>'+(+p.precio?money(p.precio):'A cotizar')+'</span></div><div class="meter"><i style="width:'+Math.min(100,x.usadas/tot*100)+'%"></i></div><div class="top2"><small class="muted">'+x.usadas+' de '+tot+' '+plural(tot,'sesión','sesiones')+' usadas'+(x.agendadas?' · '+x.agendadas+' agendada'+(x.agendadas>1?'s':''):'')+'</small><small>'+((+p.precio)?(p.pagado===false?'<span style="color:var(--warn-t)">Por cobrar</span>':'<span style="color:var(--ok-t)">Pagado</span>'):'')+'</small></div><div style="display:flex;gap:8px;flex-wrap:wrap">'+(x.libres>0?'<button class="btn s sm" data-act="reservar" data-cid="'+esc(id)+'" data-pid="'+esc(pid)+'">'+I('plus')+'Agendar sesión</button>':'')+((+p.precio)?'<button class="btn g sm" data-act="togglepago" data-id="'+esc(pid)+'">'+(p.pagado===false?'Marcar pagado':'Marcar por cobrar')+'</button>':'')+'</div></div>'}).join(''):'<p class="muted" style="font-size:13px">Sin packs ni compras todavía.</p>';
    const tl=ap.length?'<div class="tl">'+ap.slice(0,40).map(a=>'<div class="it '+a.estado+'"><b>'+fdate(a.fecha)+' · '+a.inicio+'</b> '+estHtml(a.estado)+'<small>'+esc(a.servicioNombre)+(a.nSesion?' · sesión '+a.nSesion:'')+'</small></div>').join('')+'</div>':'<p class="muted" style="font-size:13px">Sin citas registradas.</p>';
    return xbtn()+'<h2>'+esc(c.nombre)+(c.ejemplo?'<span class="tagx">Ejemplo</span>':'')+'</h2><p class="sub">'+segHtml(s.seg)+' &nbsp;·&nbsp; '+esc(fmtTel(c.telefono)||'sin teléfono')+(c.fuente?' · '+esc(c.fuente):'')+'</p>'+
    '<div class="grid g4" style="margin-bottom:18px;gap:10px">'+tile('Visitas',s.visitas,'')+tile('Última visita',s.ultima?hace(s.ultima):'—','')+tile('Próxima',s.proxima?fdate(s.proxima.fecha):'—','')+tile('Compras',money(s.gasto),'')+'</div>'+
    '<div class="chips" style="margin-bottom:18px">'+(c.telefono?'<a class="btn ok sm" target="_blank" rel="noopener" href="https://wa.me/'+normTel(c.telefono)+'">'+I('wa')+'WhatsApp</a>':'')+'<button class="btn p sm" data-act="reservar" data-cid="'+esc(id)+'">'+I('plus')+'Nueva reserva</button><button class="btn g sm" data-act="editclient" data-id="'+esc(id)+'">'+I('edit')+'Editar</button><button class="btn d sm" data-act="delclient" data-id="'+esc(id)+'">'+I('trash')+'Eliminar</button></div>'+
    (c.notas?'<div class="banner" style="margin-bottom:18px"><span>'+esc(c.notas)+'</span></div>':'')+
    (c.ultimoContacto?'<p class="muted" style="font-size:12px;margin-bottom:16px">Último mensaje por WhatsApp: '+hace(c.ultimoContacto)+' ('+esc(c.ultimoTipo||'')+')</p>':'')+
    '<div class="grid g2"><div><h3 class="eyebrow" style="margin-bottom:10px">Packs y compras</h3><div style="display:grid;gap:10px">'+packHtml+'</div></div><div><h3 class="eyebrow" style="margin-bottom:10px">Historial</h3>'+tl+'</div></div>';
  };
  const h=build();if(!h){closeModal();return}
  openModal(h,'wide',build);
}
function delClientModal(id){
  const c=S.clients[id];if(!c)return;
  const n=Object.values(S.appts).filter(a=>a.clienteId===id).length;
  openModal(xbtn()+'<h2>¿Eliminar a '+esc(c.nombre)+'?</h2><p class="sub">Se borrarán su ficha, sus packs y sus '+n+' '+plural(n,'cita','citas')+'. Esta acción no se puede deshacer.</p><div class="ft"><button class="btn g" data-act="close">Cancelar</button><button class="btn d" data-act="delclientok" data-id="'+esc(id)+'">Eliminar definitivamente</button></div>');
}
async function delClient(id){
  const fechas=new Set();closeModal();
  for(const a of Object.values(S.appts).filter(a=>a.clienteId===id)){fechas.add(a.fecha);await del('appointments',a.id)}
  for(const [pid,p] of Object.entries(S.packs))if(p.clienteId===id)await del('packs',pid);
  await del('clients',id);
  for(const f of fechas)await syncAvail(f);
  render();toast('Clienta eliminada');
}

/* ===== Fidelización ===== */
function fidLists(){
  const t=todayStr(),st=S.stats,c=C();
  const extrano=Object.entries(S.clients).map(([id,x])=>({id,c:x,s:cstat(id)})).filter(x=>(x.s.seg==='riesgo'||x.s.seg==='inactiva')&&!x.s.proxima).sort((a,b)=>(a.s.ultima||'').localeCompare(b.s.ultima||''));
  const pack=Object.entries(S.packs).filter(([pid,p])=>st.pk[pid]&&st.pk[pid].libres>0&&S.clients[p.clienteId]&&!cstat(p.clienteId).proxima).map(([pid,p])=>({id:p.clienteId,pid,c:S.clients[p.clienteId],s:cstat(p.clienteId),p,x:st.pk[pid]})).sort((a,b)=>(a.s.ultima||'').localeCompare(b.s.ultima||''));
  const gracias=Object.values(S.appts).filter(a=>a.estado==='asistio'&&diffDays(t,a.fecha)<=2&&!a.graciasEnviado&&S.clients[a.clienteId]).sort(byTime).reverse().map(a=>({id:a.clienteId,a,c:S.clients[a.clienteId],s:cstat(a.clienteId)}));
  const vip=Object.entries(S.clients).map(([id,x])=>({id,c:x,s:cstat(id)})).filter(x=>x.s.seg==='vip');
  return {extrano,pack,gracias,vip};
}
function viewFidel(){
  const L=fidLists(),tab=S.fidTab,t=todayStr();
  const tabs=[['extrano','Te extrañamos',L.extrano.length],['pack','Packs por completar',L.pack.length],['gracias','Agradecer y pedir reseña',L.gracias.length],['vip','Clientas VIP',L.vip.length]];
  const head='<div class="chips" style="margin-bottom:16px">'+tabs.map(x=>'<button class="chip'+(tab===x[0]?' on':'')+'" data-act="fidtab" data-v="'+x[0]+'">'+x[1]+'<b>'+x[2]+'</b></button>').join('')+'</div>';
  const explain={extrano:'Clientas que no vuelven hace más de '+C().diasActiva+' días y no tienen hora reservada. Un mensaje a tiempo recupera visitas.',pack:'Tienen sesiones pagadas pendientes y ninguna cita agendada. Es la venta más fácil de cerrar.',gracias:'Atendidas en los últimos 2 días. Agradece y pide una reseña real mientras el resultado está fresco.',vip:'Clientas con '+C().vipDesde+' o más visitas. Cuídalas: avísales primero de promociones y horarios.'}[tab];
  const list=L[tab];
  const key={extrano:'extrano',pack:'pack',gracias:'gracias',vip:'extrano'}[tab];
  const rows=list.map(x=>{
    const c=x.c,s=x.s,recent=c.ultimoContacto&&diffDays(t,c.ultimoContacto)<=7;
    let msg,sub,tipo=tab;
    if(tab==='pack'){msg=fill('pack',{nombre:c.nombre.split(' ')[0],servicio:x.p.nombre,restantes:x.x.libres+' '+plural(x.x.libres,'sesión','sesiones')});sub=esc(x.p.nombre)+' · quedan '+x.x.libres+' · última visita '+(s.ultima?hace(s.ultima):'—')}
    else if(tab==='gracias'){msg=fill('gracias',{nombre:c.nombre.split(' ')[0]});sub=esc(x.a.servicioNombre)+' · '+hace(x.a.fecha)}
    else if(tab==='vip'){msg='Hola '+c.nombre.split(' ')[0]+' 🤍 Eres parte de nuestras clientas favoritas en Bellarium y queremos avisarte primero: ';sub=s.visitas+' visitas · última '+hace(s.ultima)}
    else{msg=fill('extrano',{nombre:c.nombre.split(' ')[0],ultima:hace(s.ultima)});sub='Última visita '+hace(s.ultima)+' · '+s.visitas+' '+plural(s.visitas,'visita','visitas')}
    const href=c.telefono?waLink(c.telefono,msg):'';
    return '<div class="li" style="'+(recent?'opacity:.6':'')+'"><div class="mid"><b>'+esc(c.nombre)+(c.ejemplo?'<span class="tagx">Ejemplo</span>':'')+'</b><small>'+sub+(recent?' · contactada '+hace(c.ultimoContacto):'')+'</small></div>'+segHtml(s.seg)+'<div class="acts">'+(href?'<a class="btn ok sm" target="_blank" rel="noopener" href="'+esc(href)+'" data-act="logwa" data-cid="'+esc(x.id)+'"'+(x.a?' data-id="'+esc(x.a.id)+'"':'')+' data-tipo="'+tipo+'">'+I('wa')+'Enviar WhatsApp</a>':'<span class="muted" style="font-size:12px">Sin teléfono</span>')+'<button class="btn g sm" data-act="clientprofile" data-id="'+esc(x.id)+'">Ficha</button></div></div>'}).join('');
  return head+'<div class="banner"><span>'+explain+'</span><button class="btn g sm" data-act="nav" data-v="config">Editar mensajes</button></div><div class="card">'+(rows?'<div class="list">'+rows+'</div>':'<div class="empty"><b>Todo al día</b>No hay clientas en esta lista por ahora.</div>')+'</div>';
}
