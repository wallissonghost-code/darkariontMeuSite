import { db } from './firebase.js';
import { doc,getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { resolverFidelidade } from './regras-fidelidade.js';

const grid=document.getElementById('offersGrid');
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const LEVELS=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
let lastKey='';

function render(vip,benefits){
  if(!grid)return;
  if(!benefits.length){
    grid.innerHTML=`<article class="oferta"><h2>LV${vip} ${LEVELS[vip]}</h2><h1>Benefícios em breve</h1><p>A loja ainda não publicou condições para este nível.</p></article>`;
    return;
  }
  grid.innerHTML=benefits.map((item,index)=>`<article class="oferta"><h2>LV${vip} · ${esc(LEVELS[vip])}</h2><h1>${esc(item)}</h1><p>Benefício disponível para membros deste nível.</p><button type="button" disabled aria-disabled="true">Benefício ativo</button></article>`).join('');
}

async function load(profile){
  const fidelity=resolverFidelidade(profile);
  const vip=fidelity.vip;
  const key=`${vip}:${profile?.ajusteManualAtivo===true}`;
  if(key===lastKey)return;
  lastKey=key;
  if(grid)grid.innerHTML='<article class="oferta"><h2>CARREGANDO</h2><h1>Benefícios</h1><p>Consultando as condições do seu nível.</p></article>';
  try{
    const snapshot=await getDoc(doc(db,'niveis',`lv${vip}`));
    const benefits=snapshot.exists()&&Array.isArray(snapshot.data().beneficios)?snapshot.data().beneficios.map(x=>String(x||'').trim()).filter(Boolean):[];
    render(vip,benefits);
  }catch(error){
    console.error('Não foi possível carregar os benefícios do nível:',error);
    lastKey='';
    if(grid)grid.innerHTML='<article class="oferta"><h2>INDISPONÍVEL</h2><h1>Não foi possível carregar</h1><p>Tente novamente em alguns instantes.</p></article>';
  }
}

window.WDSession.subscribe(state=>{
  if(state.status==='ready')load(state.profile||{});
});
