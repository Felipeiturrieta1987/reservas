/* ===== Configuración ===== */
function viewConfig(){
  const c=C(),svcs=svcList(false),p=c.plantillas;
  const lab=(k,t,h)=>'<label class="field"><span>'+t+'</span><textarea class="in" id="pl_'+k+'" rows="4">'+esc(p[k])+'</textarea>'+(h?'<small class="muted">'+h+'</small>':'')+'</label>';
  const dayBoxes=[1,2,3,4,5,6,0].map(d=>'<label class="chip'+(c.dias.includes(d)?' on':'')+'" style="display:inline-flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" class="cfg-dia" value="'+d+'"'+(c.dias.includes(d)?' checked':'')+' style="accent-color:#DBB773">'+DIASL[d]+'</label>').join('');
  const nEj=countEjemplo();
  return '<div class="grid g2" style="align-items:start">'+
  '<div class="card"><div class="hd"><div><h3>Estudio y horario</h3><p class="hint">Define cuándo se pueden reservar horas</p></div></div><div class="form" style="display:grid;gap:14px">'+
    '<div class="row2"><label class="field"><span>Nombre</span><input class="in" id="cfg_nombre" value="'+esc(c.nombre)+'"></label><label class="field"><span>WhatsApp del negocio</span><input class="in" id="cfg_wa" inputmode="tel" placeholder="+56 9 …" value="'+esc(c.whatsapp)+'"></label></div>'+
    '<label class="field"><span>Dirección</span><input class="in" id="cfg_dir" value="'+esc(c.direccion)+'"></label>'+
    '<div class="row3"><label class="field"><span>Abre</span><input class="in" type="time" id="cfg_h0" value="'+c.horaInicio+'"></label><label class="field"><span>Cierra</span><input class="in" type="time" id="cfg_h1" value="'+c.horaFin+'"></label><label class="field"><span>Intervalo (min)</span><select class="in" id="cfg_paso">'+[15,30,60].map(n=>'<option'+(c.paso===n?' selected':'')+'>'+n+'</option>').join('')+'</select></label></div>'+
    '<div class="field"><span>Días de atención</span><div class="chips">'+dayBoxes+'</div></div>'+
    '<div class="row3"><label class="field"><span>Cabinas bronceado</span><input class="in" type="number" min="1" max="6" id="cfg_cb" value="'+c.capBronceado+'"></label><label class="field"><span>Equipos HIFU</span><input class="in" type="number" min="1" max="4" id="cfg_ch" value="'+c.capHifu+'"></label><label class="field"><span>Reservar hasta (días)</span><input class="in" type="number" min="7" max="120" id="cfg_ant" value="'+c.anticipo+'"></label></div>'+
    '<label class="field"><span>Días cerrados / feriados (AAAA-MM-DD, separados por coma)</span><input class="in" id="cfg_cerr" value="'+esc(c.cerrados.join(', '))+'" placeholder="2026-12-25, 2027-01-01"></label>'+
    '<div class="row3"><label class="field"><span>Activa hasta (días)</span><input class="in" type="number" min="7" id="cfg_act" value="'+c.diasActiva+'"></label><label class="field"><span>En riesgo hasta (días)</span><input class="in" type="number" min="14" id="cfg_rie" value="'+c.diasRiesgo+'"></label><label class="field"><span>VIP desde (visitas)</span><input class="in" type="number" min="2" id="cfg_vip" value="'+c.vipDesde+'"></label></div>'+
  '</div><div class="ft"><button class="btn p" data-act="savecfg">Guardar</button></div></div>'+

  '<div class="card"><div class="hd"><div><h3>Mensajes de WhatsApp</h3><p class="hint">Variables: {nombre} {servicio} {fecha} {hora} {tel} {ultima} {restantes} {direccion}</p></div></div><div class="form" style="display:grid;gap:14px">'+
    lab('solicitud','Solicitud de la clienta (página de reservas)')+lab('confirmacion','Confirmación de cita')+lab('recordatorio','Recordatorio del día anterior')+lab('extrano','Te extrañamos')+lab('pack','Pack por completar')+lab('gracias','Gracias y reseña')+
  '</div><div class="ft"><button class="btn p" data-act="savetpl">Guardar mensajes</button></div></div></div>'+

  '<div class="card" style="margin-top:18px"><div class="hd"><div><h3>Servicios y precios</h3><p class="hint">Lo que las clientas pueden reservar. Las sesiones definen cuántas citas incluye cada pack.</p></div><button class="btn p sm" data-act="editsvc" data-id="">'+I('plus')+'Nuevo servicio</button></div>'+
  (svcs.length?'<div class="scroll"><table class="tbl"><thead><tr><th>Servicio</th><th class="n">Precio</th><th class="n">Sesiones</th><th class="n">Duración</th><th>Recurso</th><th></th></tr></thead><tbody>'+svcs.map(s=>'<tr><td class="who"><b>'+esc(s.nombre)+(s.activo===false?'<span class="tagx">Oculto</span>':'')+'</b><small>'+esc(s.desc||'')+'</small></td><td class="n">'+svcPrice(s)+'</td><td class="n">'+(+s.sesiones||1)+'</td><td class="n">'+(+s.duracion||30)+' min</td><td>'+RECURSOS[s.recurso||'bronceado']+'</td><td class="n"><button class="btn g sm" data-act="editsvc" data-id="'+esc(s.id)+'">Editar</button></td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><b>Sin servicios</b>Agrega el primero para abrir las reservas.</div>')+'</div>'+

  '<div class="card" style="margin-top:18px"><div class="hd"><div><h3>Datos y respaldo</h3><p class="hint">Tu información es tuya: descárgala cuando quieras.</p></div></div><div class="chips">'+
    '<button class="btn g sm" data-act="exp" data-v="clientas">'+I('download')+'Clientas (CSV)</button><button class="btn g sm" data-act="exp" data-v="citas">'+I('download')+'Citas (CSV)</button><button class="btn g sm" data-act="exp" data-v="json">'+I('download')+'Respaldo completo (JSON)</button><button class="btn g sm" data-act="resync">Re-sincronizar disponibilidad</button>'+
    (nEj?'<button class="btn d sm" data-act="delejemplo">'+I('trash')+'Borrar '+nEj+' datos de ejemplo</button>':'')+'</div>'+
    '<p class="muted" style="font-size:12px;margin-top:12px">Privacidad: los datos de clientas solo los ven quienes pueden editar este panel. Quienes abren la página con permiso de solo ver acceden únicamente a servicios, horario y horas ocupadas (sin nombres).</p></div>';
}
function countEjemplo(){return ['clients','appts','packs'].reduce((n,k)=>n+Object.values(S[k]).filter(x=>x.ejemplo).length,0)}

async function saveCfg(){
  const g=id=>$('#'+id).value.trim(),n=id=>+$('#'+id).value;
  const dias=$$('.cfg-dia').filter(x=>x.checked).map(x=>+x.value);
  if(!dias.length){toast('Elige al menos un día de atención',true);return}
  if(toMin(g('cfg_h1'))<=toMin(g('cfg_h0'))){toast('La hora de cierre debe ser posterior a la de apertura',true);return}
  const cerr=g('cfg_cerr').split(/[,\s]+/).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x));
  const d=Object.assign({},S.cfg,{nombre:g('cfg_nombre')||'Bellarium',whatsapp:g('cfg_wa'),direccion:g('cfg_dir'),horaInicio:g('cfg_h0'),horaFin:g('cfg_h1'),paso:n('cfg_paso'),dias,capBronceado:Math.max(1,n('cfg_cb')||1),capHifu:Math.max(1,n('cfg_ch')||1),anticipo:n('cfg_ant')||30,cerrados:cerr,diasActiva:n('cfg_act')||30,diasRiesgo:n('cfg_rie')||60,vipDesde:n('cfg_vip')||5});
  S.cfg=d;render();await enq(()=>S.db.doc('config/main').set(d));toast('Configuración guardada');
}
async function saveTpl(){
  const pl={};['solicitud','confirmacion','recordatorio','extrano','pack','gracias'].forEach(k=>{pl[k]=$('#pl_'+k).value});
  const d=Object.assign({},S.cfg,{plantillas:pl});S.cfg=d;await enq(()=>S.db.doc('config/main').set(d));toast('Mensajes guardados');
}
function svcModal(id){
  const s=id?S.services[id]:{nombre:'',precio:0,sesiones:1,duracion:30,recurso:'bronceado',activo:true,desc:''};
  openModal(xbtn()+'<h2>'+(id?'Editar servicio':'Nuevo servicio')+'</h2><p class="sub">Un pack de 3 sesiones es un servicio con “sesiones = 3” y el precio total.</p><div class="form">'+
    '<label class="field"><span>Nombre</span><input class="in" id="s_nombre" value="'+esc(s.nombre)+'"></label>'+
    '<label class="field"><span>Descripción corta</span><input class="in" id="s_desc" value="'+esc(s.desc)+'"></label>'+
    '<div class="row3"><label class="field"><span>Precio total ($)</span><input class="in" type="number" min="0" step="1000" id="s_precio" value="'+(+s.precio||0)+'"></label><label class="field"><span>Sesiones</span><input class="in" type="number" min="1" max="20" id="s_ses" value="'+(+s.sesiones||1)+'"></label><label class="field"><span>Duración (min)</span><input class="in" type="number" min="15" step="15" id="s_dur" value="'+(+s.duracion||30)+'"></label></div>'+
    '<div class="row2"><label class="field"><span>Recurso</span><select class="in" id="s_rec">'+Object.entries(RECURSOS).map(([k,v])=>'<option value="'+k+'"'+(s.recurso===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="field"><span>Visible para reservar</span><select class="in" id="s_act"><option value="1"'+(s.activo!==false?' selected':'')+'>Sí</option><option value="0"'+(s.activo===false?' selected':'')+'>No (oculto)</option></select></label></div>'+
    '<p class="muted" style="font-size:12px">Precio 0 se muestra como “A cotizar”.</p></div><div class="ft"><button class="btn g" data-act="close">Cancelar</button><button class="btn p" data-act="savesvc" data-id="'+esc(id||'')+'">Guardar</button></div>');
}
async function saveSvc(id){
  const nombre=$('#s_nombre').value.trim();if(!nombre){toast('Falta el nombre',true);return}
  const d=Object.assign({},id?S.services[id]:{orden:svcList(false).length+1},{nombre,desc:$('#s_desc').value.trim(),precio:+$('#s_precio').value||0,sesiones:Math.max(1,+$('#s_ses').value||1),duracion:Math.max(15,+$('#s_dur').value||30),recurso:$('#s_rec').value,activo:$('#s_act').value==='1'});
  closeModal();await put('services',id||uid(),d);render();toast('Servicio guardado');
}

async function exportar(tipo){
  const t=todayStr();
  if(tipo==='clientas'){
    const rows=[['Nombre','Teléfono','Correo','Segmento','Visitas','Última visita','Próxima cita','No asistió','Compras (CLP)','Notas','Registrada']];
    Object.entries(S.clients).forEach(([id,c])=>{const s=cstat(id);rows.push([c.nombre,c.telefono,c.email,SEGN[s.seg],s.visitas,s.ultima||'',s.proxima?s.proxima.fecha+' '+s.proxima.inicio:'',s.noshow,s.gasto,c.notas,c.creado])});
    await saveFile('bellarium-clientas-'+t+'.csv',csv(rows));
  }else if(tipo==='citas'){
    const rows=[['Fecha','Hora','Fin','Clienta','Teléfono','Servicio','Sesión','Estado','Notas']];
    Object.values(S.appts).sort(byTime).forEach(a=>rows.push([a.fecha,a.inicio,a.fin,a.clienteNombre,a.clienteTel,a.servicioNombre,a.nSesion?a.nSesion+'/'+(a.totalSesiones||''):'',ESTN[a.estado],a.notas]));
    await saveFile('bellarium-citas-'+t+'.csv',csv(rows));
  }else{
    await saveFile('bellarium-respaldo-'+t+'.json',JSON.stringify({exportado:t,config:S.cfg,servicios:S.services,clientas:S.clients,citas:S.appts,packs:S.packs},null,1));
  }
}
async function resync(){
  const fechas=new Set(Object.values(S.appts).filter(a=>a.fecha>=addDays(todayStr(),-1)).map(a=>a.fecha));
  for(const f of fechas)await syncAvail(f);
  toast('Disponibilidad sincronizada ('+fechas.size+' días)');
}
async function delEjemplo(){
  closeModal();const fechas=new Set();
  for(const [id,a] of Object.entries(S.appts))if(a.ejemplo){fechas.add(a.fecha);await del('appointments',id)}
  for(const [id,p] of Object.entries(S.packs))if(p.ejemplo)await del('packs',id);
  for(const [id,c] of Object.entries(S.clients))if(c.ejemplo)await del('clients',id);
  for(const f of fechas)await syncAvail(f);
  render();toast('Datos de ejemplo eliminados');
}
