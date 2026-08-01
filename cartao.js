import { db } from './firebase.js';
import { doc,getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const levels=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const palettes=[
  {c1:'#8c7b65',c2:'#51463a',c3:'#211c18',accent:'#d6c7b4',glow:'rgba(120,105,87,.42)'},
  {c1:'#f0a45b',c2:'#B87333',c3:'#4b1f0d',accent:'#ffd0a0',glow:'rgba(184,115,51,.48)'},
  {c1:'#ffffff',c2:'#C0C0C0',c3:'#5f6670',accent:'#ffffff',glow:'rgba(150,160,175,.42)',light:true},
  {c1:'#ffe083',c2:'#D4AF37',c3:'#5b3c00',accent:'#fff2b0',glow:'rgba(212,175,55,.52)'},
  {c1:'#ad82ff',c2:'#6C3CE9',c3:'#21104f',accent:'#e5d6ff',glow:'rgba(108,60,233,.5)'},
  {c1:'#f7f8fa',c2:'#c5cbd2',c3:'#69737f',accent:'#ffffff',glow:'rgba(151,164,179,.5)',light:true,platinum:true},
  {c1:'#4c8dff',c2:'#0F52BA',c3:'#031b49',accent:'#b8d4ff',glow:'rgba(15,82,186,.52)'},
  {c1:'#353535',c2:'#121212',c3:'#000000',accent:'#d9dde3',glow:'rgba(0,0,0,.7)'},
  {c1:'#ee5365',c2:'#B11226',c3:'#3b020b',accent:'#ffc0c8',glow:'rgba(177,18,38,.52)'},
  {c1:'#4265c5',c2:'#1F3A93',c3:'#071337',accent:'#D4AF37',glow:'rgba(31,58,147,.58)',prime:true},
  {c1:'#242424',c2:'#080808',c3:'#000000',accent:'#FFD700',glow:'rgba(212,175,55,.34)',founder:true}
];

let currentData={vip:0,carimbos:0,creditos:0,nome:'Cliente Founder'};

function paint(){
  const vip=Math.max(0,Math.min(10,Number(currentData.vip)||0));
  const stamps=Math.max(0,Math.min(10,Number(currentData.carimbos)||0));
  const p=palettes[vip];
  const card=document.getElementById('cartao');
  if(!card)return;

  card.style.setProperty('--c1',p.c1);
  card.style.setProperty('--c2',p.c2);
  card.style.setProperty('--c3',p.c3);
  card.style.setProperty('--accent',p.accent);
  card.style.setProperty('--glow',p.glow);
  card.classList.toggle('light',!!p.light);
  card.classList.toggle('platinum',!!p.platinum);
  card.classList.toggle('prime',!!p.prime);
  card.classList.toggle('founder',!!p.founder);
  card.dataset.vip=String(vip);
  card.setAttribute('aria-label',`Cartão ${levels[vip]} nível ${vip}`);

  document.getElementById('nivel').textContent=`LV${vip}`;
  document.getElementById('membroNivel').textContent=vip===0?'MEMBRO':`MEMBRO ${levels[vip]}`;
  document.getElementById('seloNivel').textContent=levels[vip];
  document.getElementById('clienteNome').textContent=currentData.nome||'Cliente Founder';
  document.getElementById('creditosCliente').textContent=Number(currentData.creditos||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  document.getElementById('textoCarimbo').textContent=`${stamps} / 10 carimbos`;
  document.getElementById('listaCarimbos').innerHTML=Array.from({length:10},(_,i)=>`<span class="stamp ${i<stamps?'on':''}" aria-hidden="true"></span>`).join('');
  document.getElementById('progressBar').style.width=`${stamps*10}%`;
  loadNext(vip,stamps);
}

async function loadNext(vip,stamps){
  const next=Math.min(10,vip+1);
  const nextLevel=document.getElementById('nextLevel');
  if(!nextLevel)return;

  nextLevel.textContent=vip===10?'Nível máximo':`LV${next} — ${levels[next]}`;
  document.getElementById('missing').textContent=vip===10?'Você chegou ao Founder':`Faltam ${Math.max(0,10-stamps)} carimbos`;

  let benefits=vip===10
    ? ['Acesso às condições máximas do clube','Atendimento e experiências reservadas ao Founder']
    : ['Benefícios exclusivos do próximo nível','Condições especiais para membros'];

  try{
    const snapshot=await getDoc(doc(db,'niveis',`lv${next}`));
    if(snapshot.exists()&&Array.isArray(snapshot.data().beneficios))benefits=snapshot.data().beneficios.filter(Boolean);
  }catch(error){
    console.warn(error);
  }

  const container=document.getElementById('benefits');
  if(container)container.innerHTML=benefits.length
    ? benefits.map(item=>`<div class="benefit-row">${item}</div>`).join('')
    : '<div class="empty-benefits">Benefícios serão publicados em breve.</div>';
}

window.WDSession.subscribe(state=>{
  if(state.status!=='ready')return;
  currentData={...currentData,...state.profile,nome:state.profile?.nome||state.user?.displayName||'Cliente Founder'};
  paint();
});
