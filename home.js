import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc,getDoc,onSnapshot,collection,getDocs,query,where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { calcularFidelidade,money } from './regras-fidelidade.js';

const levels=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const palettes=[
  {a:'#35363a',b:'#1e2024',c:'#090a0c',edge:'#d7d9dd',shadow:'rgba(0,0,0,.58)',text:'#fff'},
  {a:'#c98a50',b:'#8d4d22',c:'#2b1408',edge:'#f0bd88',shadow:'rgba(83,42,16,.58)',text:'#fff'},
  {a:'#e9eaec',b:'#aeb2b7',c:'#545a61',edge:'#ffffff',shadow:'rgba(70,76,84,.46)',text:'#171717'},
  {a:'#d1b352',b:'#9c7618',c:'#332400',edge:'#f5df91',shadow:'rgba(75,53,5,.55)',text:'#fff'},
  {a:'#7652c6',b:'#4e2a95',c:'#1b0d3d',edge:'#c9b6f4',shadow:'rgba(45,22,90,.56)',text:'#fff'},
  {a:'#e7e8e9',b:'#b9bdc1',c:'#70777e',edge:'#ffffff',shadow:'rgba(79,85,92,.46)',text:'#171717'},
  {a:'#316cc4',b:'#174887',c:'#061b3d',edge:'#9fc3ef',shadow:'rgba(9,42,86,.56)',text:'#fff'},
  {a:'#252628',b:'#101113',c:'#020203',edge:'#8d9298',shadow:'rgba(0,0,0,.72)',text:'#fff'},
  {a:'#ba3446',b:'#7d1424',c:'#29040a',edge:'#ed9aa5',shadow:'rgba(82,8,19,.58)',text:'#fff'},
  {a:'#324b91',b:'#1e3269',c:'#07122f',edge:'#c7a94a',shadow:'rgba(8,21,58,.62)',text:'#fff'},
  {a:'#252117',b:'#0b0b0c',c:'#000000',edge:'#d8b958',shadow:'rgba(0,0,0,.76)',text:'#fff'}
];

const el=id=>document.getElementById(id);
const dateText=value=>{try{const d=value?.toDate?value.toDate():new Date(value);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});}catch{return 'Data indisponível';}};
const loyaltyValue=p=>Math.max(0,Number(p.valorFidelidade ?? p.valorPago ?? p.valor)||0);
let stopUserListener=null,renderToken=0;

function applyPalette(card,vip){const p=palettes[vip]||palettes[0];card.dataset.vip=String(vip);card.style.setProperty('--a',p.a);card.style.setProperty('--b',p.b);card.style.setProperty('--c',p.c);card.style.setProperty('--edge',p.edge);card.style.setProperty('--shadow',p.shadow);card.style.setProperty('--text',p.text);card.classList.toggle('light-card',vip===2||vip===5);card.classList.toggle('prime-card',vip===9);card.classList.toggle('founder-card',vip===10)}

function renderResumo(user,data,total=0,savings=0,purchases=[]){
  const calc=calcularFidelidade(Math.max(0,Number(total)||0));
  const vip=calc.vip,stamps=calc.carimbos,name=data.nome||user.displayName||'Membro';
  const bonus=money(data.creditos||0),card=el('homeCard');
  applyPalette(card,vip);
  el('nomeUsuario').textContent=name.split(' ')[0]||'Membro';
  el('homeLevelName').textContent=levels[vip];
  el('homeBadge').textContent=levels[vip];
  el('homeClientName').textContent=name;
  el('homeCredits').textContent=bonus;
  el('heroLevel').textContent=`LV${vip} — ${levels[vip]}`;
  el('heroMessage').textContent=vip===10?'Você alcançou o nível máximo do clube.':'Continue evoluindo para liberar novas vantagens.';
  el('heroStampText').textContent=`${stamps} de 10`;
  el('heroProgressBar').style.width=`${stamps*10}%`;
  el('metricCredits').textContent=money(total);
  el('metricSavings').textContent=money(savings);
  el('metricNext').textContent=vip===10?'Nível máximo':`LV${vip+1} ${levels[vip+1]}`;
  el('metricMissing').textContent=vip===10?'Status Founder ativo':`Faltam ${money(calc.faltam)}`;
  renderHistory(purchases);
  loadBenefits(vip).catch(console.error);
}

function renderFallback(user,data){
  const total=Math.max(0,Number(data.totalGasto)||0);
  const savings=Math.max(0,Number(data.totalEconomizado||data.creditosUsados)||0);
  renderResumo(user,data,total,savings,[]);
}

async function buscarCompras(uid){
  const consulta=getDocs(query(collection(db,'compras'),where('clienteId','==',uid)));
  const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite ao carregar compras')),8000));
  const snap=await Promise.race([consulta,timeout]);
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

async function renderUser(user,data){
  const token=++renderToken;
  renderFallback(user,data);
  try{
    const purchases=await buscarCompras(user.uid);
    if(token!==renderToken)return;
    const total=purchases.reduce((sum,p)=>sum+loyaltyValue(p),0);
    const savings=purchases.reduce((sum,p)=>sum+Math.max(0,Number(p.creditoUsado)||0),0);
    renderResumo(user,data,total,savings,purchases);
  }catch(error){
    console.error('Não foi possível carregar as compras; usando resumo salvo no perfil:',error);
    el('timeline').innerHTML='<div class="empty-state">Não foi possível atualizar o histórico agora. Os dados principais continuam disponíveis.</div>';
  }
}

async function loadBenefits(vip){const next=Math.min(10,vip+1);el('benefitLevel').textContent=vip===10?'Benefícios Founder':`Benefícios do LV${next}`;let benefits=['Condições especiais para membros','Acesso a vantagens exclusivas'];try{const snap=await getDoc(doc(db,'niveis',`lv${next}`));if(snap.exists()&&Array.isArray(snap.data().beneficios)&&snap.data().beneficios.length)benefits=snap.data().beneficios}catch(e){console.error(e)}el('homeBenefits').innerHTML=benefits.map(x=>`<div class="home-benefit">${x}</div>`).join('')}

function renderHistory(items){const timeline=el('timeline');items.sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0));if(!items.length){timeline.innerHTML='<div class="empty-state">Nenhuma compra registrada ainda.</div>';el('metricLastPurchase').textContent='Nenhuma';el('metricLastDate').textContent='Seu histórico aparecerá aqui';return}const latest=items[0];el('metricLastPurchase').textContent=money(latest.valor);el('metricLastDate').textContent=dateText(latest.criadoEm);timeline.innerHTML=items.slice(0,5).map(item=>`<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-main"><strong>Compra registrada</strong><span>${dateText(item.criadoEm)}</span></div><div class="timeline-value"><strong>${money(item.valor)}</strong><small>${money(loyaltyValue(item))} válido no VIP</small></div></div>`).join('')}

onAuthStateChanged(auth,user=>{
  if(stopUserListener){stopUserListener();stopUserListener=null}
  if(!user)return;
  renderFallback(user,{nome:user.displayName||'Membro'});
  stopUserListener=onSnapshot(doc(db,'usuarios',user.uid),snap=>{
    renderUser(user,snap.exists()?snap.data():{}).catch(error=>{
      console.error('Erro ao renderizar dashboard:',error);
      renderFallback(user,snap.exists()?snap.data():{});
    });
  },error=>{
    console.error('Erro ao sincronizar dashboard:',error);
    renderFallback(user,{nome:user.displayName||'Membro'});
  });
});