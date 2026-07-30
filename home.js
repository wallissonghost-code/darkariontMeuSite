import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc,getDoc,onSnapshot,collection,getDocs,query,where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const levels=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateText=value=>{try{const d=value?.toDate?value.toDate():new Date(value);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});}catch{return 'Data indisponível';}};
let stopUserListener=null;

function renderUser(user,data){
  const vip=Math.max(0,Math.min(9,Number(data.vip)||0));
  const stamps=Math.max(0,Math.min(10,Number(data.carimbos)||0));
  const name=data.nome||user.displayName||'Founder';
  const firstName=name.split(' ')[0];
  const credits=money(data.creditos);
  document.getElementById('nomeUsuario').textContent=firstName;
  document.getElementById('avatarInitial').textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'WD';
  document.getElementById('homeCard').dataset.vip=String(vip);
  document.getElementById('homeLevelName').textContent=levels[vip];
  document.getElementById('homeBadge').textContent=levels[vip];
  document.getElementById('homeClientName').textContent=name;
  document.getElementById('homeCredits').textContent=credits;
  document.getElementById('heroLevel').textContent=`LV${vip+1} — ${levels[vip]}`;
  document.getElementById('heroMessage').textContent=vip===9?'Você alcançou o nível máximo do clube.':'Continue evoluindo para liberar novas vantagens.';
  document.getElementById('heroStampText').textContent=`${stamps} de 10`;
  document.getElementById('heroProgressBar').style.width=`${stamps*10}%`;
  document.getElementById('metricCredits').textContent=credits;
  document.getElementById('metricNext').textContent=vip===9?'Nível máximo':`LV${vip+2} ${levels[vip+1]}`;
  document.getElementById('metricMissing').textContent=vip===9?'Status Founder ativo':`Faltam ${10-stamps} carimbos`;
  loadBenefits(vip);
}

async function loadBenefits(vip){
  const next=Math.min(9,vip+1);
  document.getElementById('benefitLevel').textContent=vip===9?'Benefícios Founder':`Benefícios do LV${next+1}`;
  let benefits=['Condições especiais para membros','Acesso a vantagens exclusivas'];
  try{const snap=await getDoc(doc(db,'niveis',`lv${next+1}`));if(snap.exists()&&Array.isArray(snap.data().beneficios)&&snap.data().beneficios.length)benefits=snap.data().beneficios;}catch(e){console.error(e)}
  document.getElementById('homeBenefits').innerHTML=benefits.map(x=>`<div class="home-benefit">${x}</div>`).join('');
}

async function loadHistory(uid){
  const timeline=document.getElementById('timeline');
  try{
    const snap=await getDocs(query(collection(db,'compras'),where('clienteId','==',uid)));
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0)).slice(0,8);
    if(!items.length){timeline.innerHTML='<div class="empty-state">Nenhuma compra registrada ainda.</div>';document.getElementById('metricLastPurchase').textContent='Nenhuma';return;}
    const latest=items[0];
    document.getElementById('metricLastPurchase').textContent=money(latest.valor);
    document.getElementById('metricLastDate').textContent=dateText(latest.criadoEm);
    timeline.innerHTML=items.map(item=>`<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-main"><strong>Compra registrada</strong><span>${dateText(item.criadoEm)}</span></div><div class="timeline-value"><strong>${money(item.valor)}</strong><small>+${Number(item.carimbosGanhos)||0} carimbo(s)</small></div></div>`).join('');
  }catch(error){console.error(error);timeline.innerHTML='<div class="empty-state">O histórico ainda não pôde ser carregado.</div>';}
}

onAuthStateChanged(auth,user=>{
  if(stopUserListener){stopUserListener();stopUserListener=null;}
  if(!user)return;
  stopUserListener=onSnapshot(doc(db,'usuarios',user.uid),snap=>{
    renderUser(user,snap.exists()?snap.data():{});
    loadHistory(user.uid);
  },error=>console.error('Erro ao sincronizar dashboard:',error));
});