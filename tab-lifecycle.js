const params=new URLSearchParams(location.search);
let active=params.get('tabActive')!=='0';
const starters=new Set();
const stoppers=new Set();
let running=false;

function safeCall(fn){
  try{return fn?.()}catch(error){console.error('Erro no ciclo de vida da aba:',error)}
}

function start(){
  if(running||!active)return;
  running=true;
  starters.forEach(safeCall);
  document.documentElement.dataset.tabActive='true';
}

function stop(){
  if(!running)return;
  running=false;
  stoppers.forEach(safeCall);
  document.documentElement.dataset.tabActive='false';
}

function setActive(value){
  const next=Boolean(value);
  if(next===active){
    if(next)start();
    return;
  }
  active=next;
  if(active)start();else stop();
  document.dispatchEvent(new CustomEvent(active?'wd-tab-resume':'wd-tab-suspend'));
}

window.AppFirebase=window.AppFirebase||{};
Object.assign(window.AppFirebase,{
  get active(){return active},
  get running(){return running},
  register({start:onStart,stop:onStop}={}){
    if(typeof onStart==='function')starters.add(onStart);
    if(typeof onStop==='function')stoppers.add(onStop);
    if(active&&typeof onStart==='function'){
      running=true;
      safeCall(onStart);
    }
    return ()=>{
      if(typeof onStop==='function')safeCall(onStop);
      starters.delete(onStart);
      stoppers.delete(onStop);
    };
  },
  setActive,
  canRender(){return active&&!document.hidden},
  guardRender(fn){return (...args)=>{if(active&&!document.hidden)return fn(...args)}},
  destroy(){stop();starters.clear();stoppers.clear()}
});

window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  if(event.data?.type==='wd-tab-lifecycle')setActive(event.data.active===true);
});
window.addEventListener('pagehide',()=>window.AppFirebase.destroy(),{once:true});
window.addEventListener('beforeunload',()=>window.AppFirebase.destroy(),{once:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)stop();else if(active)start();
});

document.documentElement.dataset.tabActive=active?'true':'false';
