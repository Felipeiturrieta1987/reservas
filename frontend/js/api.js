'use strict';
/* ===== Capa de datos: REST + sondeo (reemplaza la base del prototipo) ===== */
const IS_ADMIN_PATH=location.pathname.replace(/\/+$/,'')==='/admin';
let ADMIN=false;
const Api={
  async req(method,url,body){
    const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Requested-With':'bellarium'},body:body==null?undefined:JSON.stringify(body)});
    let j=null;try{j=await r.json()}catch(e){}
    if(!r.ok){const e=new Error((j&&j.error)||('Error '+r.status));e.status=r.status;e.code=(j&&j.code)||('http_'+r.status);throw e}
    return j;
  }
};
const dbCache={},dbWatch={},dbSig={};
let inflight=0,pollTimer=null;
const dbSnap=col=>{const m=dbCache[col]||{};const docs=Object.keys(m).sort().map(id=>({id,exists:true,data:()=>m[id]}));return {docs,size:docs.length,empty:!docs.length}};
const dbFire=col=>{(dbWatch[col]||[]).forEach(f=>{try{f()}catch(e){console.error(e)}})};
async function dbPull(){
  if(inflight>0)return;
  const cols=Object.keys(dbWatch).filter(c=>dbWatch[c].length);
  try{
    const needPublic=!ADMIN||cols.includes('availability');
    if(needPublic){
      const p=await Api.req('GET','/api/public');
      const sets={config:p.config?{main:p.config}:{},services:p.services||{},availability:p.availability||{}};
      for(const c of ['config','services','availability']){
        if(ADMIN&&c!=='availability')continue;
        if(!dbWatch[c]||!dbWatch[c].length)continue;
        const sig=JSON.stringify(sets[c]);
        if(sig!==dbSig[c]){dbSig[c]=sig;dbCache[c]=sets[c];dbFire(c)}
      }
    }
    if(ADMIN){
      await Promise.all(cols.filter(c=>c!=='availability').map(async c=>{
        const r=await Api.req('GET','/api/docs/'+c);const m={};r.docs.forEach(d=>{m[d.id]=d.data});
        const sig=JSON.stringify(m);if(sig!==dbSig[c]){dbSig[c]=sig;dbCache[c]=m;dbFire(c)}
      }));
    }
  }catch(e){if(e.status===401&&ADMIN){location.reload()}else console.warn('sondeo',e.message)}
}
function dbStart(){if(!pollTimer){pollTimer=setInterval(()=>{if(!document.hidden)dbPull()},6000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)dbPull()})}}
function dbWrite(method,col,id,data){
  if(col==='availability')return Promise.resolve();
  inflight++;
  return Api.req(method,'/api/docs/'+col+'/'+encodeURIComponent(id),data).finally(()=>{inflight--});
}
const dbDoc=(col,id)=>({
  id,
  set:async d=>{const c=dbCache[col]||(dbCache[col]={});c[id]=JSON.parse(JSON.stringify(d));dbSig[col]=JSON.stringify(c);dbFire(col);await dbWrite('PUT',col,id,d)},
  update:async d=>{const c=dbCache[col]||(dbCache[col]={});c[id]=Object.assign({},c[id],d);dbSig[col]=JSON.stringify(c);dbFire(col);await dbWrite('PATCH',col,id,d)},
  delete:async()=>{const c=dbCache[col]||(dbCache[col]={});delete c[id];dbSig[col]=JSON.stringify(c);dbFire(col);await dbWrite('DELETE',col,id)},
  onSnapshot(next){
    const f=()=>{const m=dbCache[col]||{};next({id,exists:!!m[id],data:()=>m[id]})};
    (dbWatch[col]||(dbWatch[col]=[])).push(f);dbStart();dbPull();return()=>{}
  }
});
const dbCol=col=>({
  doc:id=>dbDoc(col,id),
  onSnapshot(next){
    const f=()=>next(dbSnap(col));
    (dbWatch[col]||(dbWatch[col]=[])).push(f);dbStart();dbPull();return()=>{}
  }
});
const dbApi={collection:dbCol,doc:p=>{const i=p.indexOf('/');return dbDoc(p.slice(0,i),p.slice(i+1))}};
const dlApi={async save({filename,data}){
  const b=data instanceof Blob?data:new Blob([data],{type:'text/plain;charset=utf-8'});
  const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);return {status:'saved'};
}};
const claude={use:async n=>({db:dbApi,downloads:dlApi,user:{canEdit:async()=>ADMIN}}[n]||null)};
