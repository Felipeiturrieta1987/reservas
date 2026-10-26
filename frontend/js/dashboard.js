/* ===== Dashboard ===== */
const PERIODOS=[[7,'7 días'],[30,'30 días'],[90,'90 días'],['mes','Este mes']];
function periodo(){
  const t=todayStr();let from,to=t;
  if(S.range==='mes'){from=t.slice(0,8)+'01'}else from=addDays(t,-(S.range-1));
  const len=diffDays(to,from)+1;
  return {from,to,pfrom:addDays(from,-len),pto:addDays(from,-1),len};
}
const inR=(f,a,b)=>f>=a&&f<=b;
const niceMax=v=>{if(v<=4)return 4;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return (n<=1.5?1.5:n<=2?2:n<=3?3:n<=5?5:10)*p};
const topRound=(x,y,w,h,r)=>{r=Math.min(r,h,w/2);return 'M'+x+' '+(y+h)+'V'+(y+r)+'Q'+x+' '+y+' '+(x+r)+' '+y+'H'+(x+w-r)+'Q'+(x+w)+' '+y+' '+(x+w)+' '+(y+r)+'V'+(y+h)+'Z'};

function deltaHtml(cur,prev,fmt,goodUp){
  if(prev===0&&cur===0)return '<span class="dl">sin cambios vs período anterior</span>';
  if(prev===0)return '<span class="dl"><span class="up">'+I('up')+'nuevo</span> vs período anterior</span>';
  const d=(cur-prev)/prev*100,up=d>=0;
  return '<span class="dl"><span class="'+((up===goodUp)?'up':'dn')+'">'+I(up?'up':'down')+(up?'+':'')+Math.round(d)+'%</span> vs período anterior</span>';
}
function tile(lb,v,sub,cls){return '<div class="tile '+(cls||'')+'"><span class="lb">'+lb+'</span><span class="v">'+v+'</span>'+(sub?'<span class="dl">'+sub+'</span>':'')+'</div>'}

function viewDashboard(){
  const P=periodo(),t=todayStr(),c=C();
  const ap=Object.values(S.appts),inP=ap.filter(a=>inR(a.fecha,P.from,P.to)),inQ=ap.filter(a=>inR(a.fecha,P.pfrom,P.pto));
  const cnt=(arr,e)=>arr.filter(a=>a.estado===e).length;
  const asist=cnt(inP,'asistio'),noshow=cnt(inP,'no_asistio'),asistQ=cnt(inQ,'asistio');
  const tasa=(asist+noshow)?Math.round(asist/(asist+noshow)*100):null;
  const tasaQ=(cnt(inQ,'asistio')+cnt(inQ,'no_asistio'))?Math.round(asistQ/(asistQ+cnt(inQ,'no_asistio'))*100):null;
  const ventas=Object.values(S.packs).filter(p=>inR(p.fecha||'',P.from,P.to)).reduce((s,p)=>s+(+p.precio||0),0);
  const ventasQ=Object.values(S.packs).filter(p=>inR(p.fecha||'',P.pfrom,P.pto)).reduce((s,p)=>s+(+p.precio||0),0);
  const nuevas=Object.values(S.clients).filter(x=>inR(x.creado||'',P.from,P.to)).length;
  const cs=Object.values(S.stats.cl);
  const activas=cs.filter(s=>s.seg==='activa'||s.seg==='vip').length;
  const con1=cs.filter(s=>s.visitas>=1).length,con2=cs.filter(s=>s.visitas>=2).length;
  const reten=con1?Math.round(con2/con1*100):null;
  // ocupación: horas reservadas / capacidad en días abiertos del período
  const dias=[];for(let d=P.from;d<=P.to;d=addDays(d,1))if(isOpen(d)&&d<=addDays(t,0))dias.push(d);
  const horasDia=(toMin(c.horaFin)-toMin(c.horaInicio))/60;
  const cap=dias.length*horasDia*(+c.capBronceado||1);
  const usadas=inP.filter(a=>a.recurso==='bronceado'&&a.estado!=='cancelada'&&a.fecha<=t).reduce((s,a)=>s+(toMin(a.fin)-toMin(a.inicio))/60,0);
  const ocup=cap?Math.round(usadas/cap*100):null;

  const filtros='<div class="chips" role="group" aria-label="Período" style="margin-bottom:20px">'+PERIODOS.map(p=>'<button class="chip'+(S.range===p[0]?' on':'')+'" data-act="range" data-v="'+p[0]+'">'+p[1]+'</button>').join('')+'</div>';

  const kpis='<div class="grid g4" style="margin-bottom:18px">'+
    '<div class="tile hero"><span class="lb">Ventas registradas · '+P.len+' días</span><span class="v">'+money(ventas)+'</span>'+deltaHtml(ventas,ventasQ,money,true)+'</div>'+
    tile('Sesiones atendidas',asist,deltaHtml(asist,asistQ,null,true).replace(/^<span class="dl">|<\/span>$/g,''))+
    tile('Asistencia',tasa==null?'—':tasa+'%',tasa==null?'Aún sin datos':(noshow+' '+plural(noshow,'no vino','no vinieron')+(tasaQ!=null?' · antes '+tasaQ+'%':'')))+
    tile('Clientas nuevas',nuevas,'registradas en el período')+
    tile('Clientas activas',activas,'visitaron en los últimos '+c.diasActiva+' días')+
    tile('Retención',reten==null?'—':reten+'%',con2+' de '+con1+' volvieron a una 2ª visita')+
    tile('Ocupación cabina',ocup==null?'—':ocup+'%',Math.round(usadas)+' h reservadas de '+Math.round(cap)+' h')+
  '</div>';

  const accion=accionesHtml();
  const prox=Object.values(S.appts).filter(a=>a.fecha>=t&&VIVA(a.estado)).sort((a,b)=>(a.fecha+a.inicio).localeCompare(b.fecha+b.inicio)).slice(0,6);
  const proxHtml=prox.length?'<div class="list">'+prox.map(a=>'<div class="li"><span class="tm">'+a.inicio+'</span><div class="mid"><b>'+esc(a.clienteNombre)+(a.ejemplo?'<span class="tagx">Ejemplo</span>':'')+'</b><small>'+fdate(a.fecha)+' · '+esc(a.servicioNombre)+'</small></div>'+estHtml(a.estado)+'</div>').join('')+'</div>':'<div class="empty"><b>Sin citas próximas</b>Crea una reserva para empezar a llenar la agenda.</div>';

  return kpis+
    '<div class="grid gmain" style="margin-bottom:18px"><div class="card"><div class="hd"><div><h3>Citas por '+(P.len>35?'semana':'día')+'</h3><p class="hint">Sesiones del período según su estado</p></div></div>'+chartCitas(P)+'</div>'+
    '<div class="card"><div class="hd"><div><h3>Por hacer</h3><p class="hint">Lo que conviene resolver hoy</p></div></div>'+accion+'</div></div>'+
    '<div class="grid g2" style="margin-bottom:18px"><div class="card"><div class="hd"><div><h3>Horarios más pedidos</h3><p class="hint">Sesiones por día y hora, '+P.len+' días</p></div></div>'+heatmap(P)+'</div>'+
    '<div class="card"><div class="hd"><div><h3>Próximas citas</h3></div><button class="btn g sm" data-act="nav" data-v="agenda">Ver agenda</button></div>'+proxHtml+'</div></div>'+
    '<div class="grid g2"><div class="card"><div class="hd"><div><h3>Servicios reservados</h3><p class="hint">Sesiones no canceladas del período</p></div></div>'+rankServicios(inP)+'</div>'+
    '<div class="card"><div class="hd"><div><h3>Salud de la cartera</h3><p class="hint">Clientas por tiempo desde su última visita</p></div><button class="btn g sm" data-act="nav" data-v="fidel">Fidelizar</button></div>'+carteraHtml()+'</div></div>';
}

function accionesHtml(){
  const t=todayStr(),m=addDays(t,1),st=S.stats,c=C();
  const apps=Object.values(S.appts);
  const manana=apps.filter(a=>a.fecha===m&&a.estado==='reservada').length;
  const sinMarcar=apps.filter(a=>(a.fecha<t||(a.fecha===t&&toMin(a.fin)<=nowMin()))&&VIVA(a.estado)).length;
  const riesgo=Object.values(st.cl).filter(s=>s.seg==='riesgo'||s.seg==='inactiva').length;
  const packs=Object.entries(S.packs).filter(([id])=>st.pk[id]&&st.pk[id].libres>0&&!(cstat(S.packs[id].clienteId).proxima)).length;
  const porCobrar=Object.values(S.packs).filter(p=>p.pagado===false&&(+p.precio||0)>0).length;
  const porAprobar=apps.filter(a=>a.estado==='pendiente'&&a.fecha>=t).length;
  const row=(n,tx,sub,v)=>'<button data-act="nav" data-v="'+v+'"><span class="n'+(n?'':' z')+'">'+n+'</span><span class="tx">'+tx+'<small>'+sub+'</small></span>'+I('chev')+'</button>';
  return '<div class="todo">'+
    row(porAprobar,'Solicitudes por aprobar','Reservas nuevas desde la página','hoy')+
    row(sinMarcar,'Citas por marcar asistencia','Ya pasaron y siguen sin estado','hoy')+
    row(manana,'Recordatorios de mañana','Citas sin confirmar por WhatsApp','hoy')+
    row(riesgo,'Clientas para reactivar','En riesgo o inactivas','fidel')+
    row(packs,'Packs con sesiones por agendar','Sin próxima cita reservada','fidel')+
    row(porCobrar,'Pagos pendientes','Packs marcados como por cobrar','clientas')+
  '</div>';
}

function chartCitas(P){
  const semanal=P.len>35,buckets=[],map={};
  if(semanal){for(let d=mondayOf(P.from);d<=P.to;d=addDays(d,7)){const b={k:d,label:fdate(d).slice(4),a:0,n:0,p:0};buckets.push(b);for(let i=0;i<7;i++)map[addDays(d,i)]=b}}
  else for(let d=P.from;d<=P.to;d=addDays(d,1)){const b={k:d,label:String(D(d).getUTCDate()),a:0,n:0,p:0,dw:DIAS[dow(d)]};buckets.push(b);map[d]=b}
  let total=0;
  Object.values(S.appts).forEach(a=>{const b=map[a.fecha];if(!b||a.estado==='cancelada')return;total++;if(a.estado==='asistio')b.a++;else if(a.estado==='no_asistio')b.n++;else b.p++});
  if(!total)return '<div class="empty"><b>Aún no hay citas en este período</b>Cuando agendes sesiones, verás aquí su evolución.</div>';
  const W=640,H=300,L=30,R=6,T=10,B=26,pw=W-L-R,ph=H-T-B;
  const mx=niceMax(Math.max(...buckets.map(b=>b.a+b.n+b.p),1)),step=pw/buckets.length,bw=Math.min(24,Math.max(4,step-4));
  let g='';
  [0,.5,1].forEach(f=>{const y=T+ph-ph*f;g+='<line class="gl" x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">'+Math.round(mx*f)+'</text>'});
  buckets.forEach((b,i)=>{
    const x=L+step*i+(step-bw)/2,tot=b.a+b.n+b.p;let y=T+ph;
    const segs=[['a',b.a,'var(--ok)'],['n',b.n,'var(--crit)'],['p',b.p,'var(--oro)']].filter(s=>s[1]>0);
    const tip=(semanal?'Semana del ':'')+(b.dw?b.dw+' ':'')+(semanal?b.label:fdate(b.k).slice(4))+'|'+tot+' '+plural(tot,'sesión','sesiones')+'|'+b.a+' asistió · '+b.n+' no vino · '+b.p+' pendientes';
    g+='<g data-tip="'+esc(tip)+'" tabindex="0" role="img" aria-label="'+esc(tip.replace(/\|/g,', '))+'"><rect x="'+(L+step*i)+'" y="'+T+'" width="'+step+'" height="'+ph+'" fill="transparent"/>';
    segs.forEach((s,k)=>{const h=Math.max(2,ph*s[1]/mx-(k<segs.length-1?2:0));y-=ph*s[1]/mx;const yy=y+(k<segs.length-1?2:0);
      g+=(k===segs.length-1)?'<path d="'+topRound(x,yy,bw,h,4)+'" fill="'+s[2]+'"/>':'<rect x="'+x+'" y="'+yy+'" width="'+bw+'" height="'+h+'" fill="'+s[2]+'"/>'});
    g+='</g>';
    const every=Math.ceil(buckets.length/(semanal?10:14));
    if(i%every===0)g+='<text x="'+(x+bw/2)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(b.label)+'</text>';
  });
  g+='<line class="ax" x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'"/>';
  const legend='<div class="legend"><span><i style="background:var(--ok)"></i>Asistió</span><span><i style="background:var(--crit)"></i>No vino</span><span><i style="background:var(--oro)"></i>Pendientes (por confirmar o agendadas)</span></div>';
  const tabla='<details class="datos"><summary>Ver como tabla</summary><div class="scroll"><table class="tbl"><thead><tr><th>'+(semanal?'Semana':'Día')+'</th><th class="n">Asistió</th><th class="n">No vino</th><th class="n">Pendientes</th></tr></thead><tbody>'+buckets.filter(b=>b.a+b.n+b.p>0).map(b=>'<tr><td>'+(semanal?b.label:fdate(b.k))+'</td><td class="n">'+b.a+'</td><td class="n">'+b.n+'</td><td class="n">'+b.p+'</td></tr>').join('')+'</tbody></table></div></details>';
  return legend+'<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Citas por '+(semanal?'semana':'día')+', apiladas por estado">'+g+'</svg>'+tabla;
}

function heatmap(P){
  const c=C(),h0=Math.floor(toMin(c.horaInicio)/60),h1=Math.ceil(toMin(c.horaFin)/60),horas=[];
  for(let h=h0;h<h1;h++)horas.push(h);
  const dias=c.dias.slice().sort((a,b)=>((a+6)%7)-((b+6)%7));
  const cell={};let mx=0,tot=0;
  Object.values(S.appts).forEach(a=>{if(a.estado==='cancelada'||!inR(a.fecha,P.from,P.to))return;const k=dow(a.fecha)+'-'+Math.floor(toMin(a.inicio)/60);cell[k]=(cell[k]||0)+1;mx=Math.max(mx,cell[k]);tot++});
  if(!tot)return '<div class="empty"><b>Sin datos todavía</b>Aquí verás qué días y horas se llenan más.</div>';
  const W=640,L=44,T=4,B=22,cw=(W-L)/horas.length,ch=42,H=T+ch*dias.length+B;
  let g='';
  dias.forEach((d,r)=>{
    g+='<text x="'+(L-8)+'" y="'+(T+ch*r+ch/2+4)+'" text-anchor="end">'+DIAS[d]+'</text>';
    horas.forEach((h,k)=>{const n=cell[d+'-'+h]||0,op=n?(0.18+0.82*n/mx):0;
      const tip=DIASL[d]+' '+fromMin(h*60)+'|'+n+' '+plural(n,'sesión','sesiones')+'|en '+P.len+' días';
      g+='<rect data-tip="'+esc(tip)+'" tabindex="0" x="'+(L+cw*k+1)+'" y="'+(T+ch*r+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="3" fill="'+(n?'var(--oro)':'var(--graf)')+'" fill-opacity="'+(n?op.toFixed(2):1)+'" aria-label="'+esc(tip.replace(/\|/g,', '))+'"/>'});
  });
  horas.forEach((h,k)=>{if(k%2===0||horas.length<8)g+='<text x="'+(L+cw*k+cw/2)+'" y="'+(H-6)+'" text-anchor="middle">'+h+'h</text>'});
  const leg='<div class="legend" style="margin:10px 0 0"><span>Menos</span><span style="display:inline-block;width:90px;height:8px;border-radius:4px;background:linear-gradient(90deg,rgba(219,183,115,.18),#DBB773)"></span><span>Más · máximo '+mx+'</span></div>';
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Mapa de calor de sesiones por día y hora">'+g+'</svg>'+leg;
}

function rankServicios(arr){
  const m={};arr.filter(a=>a.estado!=='cancelada').forEach(a=>{m[a.servicioNombre]=(m[a.servicioNombre]||0)+1});
  const r=Object.entries(m).sort((a,b)=>b[1]-a[1]);
  if(!r.length)return '<div class="empty"><b>Sin reservas</b>Todavía no hay sesiones en este período.</div>';
  const mx=r[0][1];
  return r.map(([n,v])=>'<div class="barrow" data-tip="'+esc(n+'|'+v+' '+plural(v,'sesión','sesiones'))+'" tabindex="0"><span class="t">'+esc(n)+'</span><div class="meter"><i style="width:'+Math.max(4,v/mx*100)+'%"></i></div><span class="n">'+v+'</span></div>').join('');
}

function carteraHtml(){
  const cs=Object.values(S.stats.cl),tot=cs.length;
  if(!tot)return '<div class="empty"><b>Aún no hay clientas</b>Se registran solas al reservar su primera hora.</div>';
  const order=['vip','activa','nueva','riesgo','inactiva','sinvisitas'],col={vip:'var(--champ)',activa:'var(--ok)',nueva:'var(--oro)',riesgo:'var(--warn)',inactiva:'var(--crit)',sinvisitas:'var(--axis)'};
  const desc={vip:'5+ visitas y activa',activa:'visitó en los últimos 30 días',nueva:'primera cita agendada',riesgo:'31 a 60 días sin venir',inactiva:'más de 60 días sin venir',sinvisitas:'registrada, aún no ha asistido'};
  return order.map(k=>{const n=cs.filter(s=>s.seg===k).length;return '<div class="barrow" data-tip="'+esc(SEGN[k]+'|'+n+' '+plural(n,'clienta','clientas')+'|'+desc[k])+'" tabindex="0"><span class="t">'+segHtml(k)+'</span><div class="meter"><i style="width:'+(n?Math.max(4,n/tot*100):0)+'%;background:'+col[k]+'"></i></div><span class="n">'+n+'</span></div>'}).join('');
}
