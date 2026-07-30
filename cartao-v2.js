import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, onSnapshot, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const levels=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const palettes=[
  {c1:'#f0a45b',c2:'#B87333',c3:'#4b1f0d',accent:'#ffd0a0',glow:'rgba(184,115,51,.48)'},
  {c1:'#ffffff',c2:'#C0C0C0',c3:'#5f6670',accent:'#ffffff',glow:'rgba(150,160,175,.42)',light:true},
  {c1:'#ffe083',c2:'#D4AF37',c3:'#5b3c00',accent:'#fff2b0',glow:'rgba(212,175,55,.52)'},
  {c1:'#ad82ff',c2:'#6C3CE9',c3:'#21104f',accent:'#e5d6ff',glow:'rgba(108,60,233,.5)'},
  {c1:'#ffffff',c2:'#E5E4E2',c3:'#87909b',accent:'#ffffff',glow:'rgba(190,200,212,.48)',light:true},
  {c1:'#4c8dff',c2:'#0F52BA',c3:'#031b49',accent:'#b8d4ff',glow:'rgba(15,82,186,.52)'},
  {c1:'#353535',c2:'#121212',c3:'#000000',accent:'#bfc2c7',glow:'rgba(0,0,0,.65)'},
  {c1:'#ee5365',c2:'#B11226',c3:'#3b020b',accent:'#ffc0c8',glow:'rgba(177,18,38,.52)'},
  {c1:'#4265c5',c2:'#1F3A93',c3:'#071337',accent:'#D4AF37',glow:'rgba(31,58,147,.58)',prime:true},
  {c1:'#303030',c2:'#0A0A0A',c3:'#000000',accent:'#FFD700',glow:'rgba(0,0,0,.72)',founder:true}
];
let currentUser=null,currentData={vip:0,carimbos:0,creditos:0,nome:'Cliente Founder'},isAdmin=false,stopUserListener=null;

function paint(){
  const vip=Math.max(0,Math.min(9,Number(currentData.vip)||0));
  const stamps=Math.max(0,Math.min(10,Number(currentData.carimbos)||0));
  const p=palettes[vip],card=document.getElementById('cartao');
  card.style.setProperty('--c1',p.c1);card.style.setProperty('--c2',p.c2);card.style.setProperty('--c3',p.c3);card.style.setProperty('--accent',p.accent);card.style.setProperty('--glow',p.glow);
  card.classList.toggle('light',!!p.light);card.classList.toggle('prime',!!p.prime);card.classList.toggle('founder',!!p.founder);
  card.dataset.vip=String(vip);card.setAttribute('aria-label',`Cartão ${levels[vip]} nível ${vip+1}`);
  document.getElementById('nivel').textContent=`LV${vip+1}`;
  document.getElementById('membroNivel').textContent=`MEMBRO ${levels[vip]}`;
  document.getElementById('seloNivel').textContent=levels[vip];
  document.getElementById('clienteNome').textContent=currentData.nome||'Cliente Founder';
  document.getElementById('creditosCliente').textContent=Number(currentData.creditos||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  document.getElementById('textoCarimbo').textContent=`${stamps} / 10 carimbos`;
  document.getElementById('listaCarimbos').innerHTML=Array.from({length:10},(_,i)=>`<span class="stamp ${i<stamps?'on':''}" aria-hidden="true"></span>`).join('');
  document.getElementById('progressBar').style.width=`${stamps*10}%`;loadNext(vip,stamps);
}
async function loadNext(vip,stamps){const next=Math.min(9,vip+1);document.getElementById('nextLevel').textContent=vip===9?'Nível máximo':`LV${next+1} — ${levels[next]}`;document.getElementById('missing').textContent=vip===9?'Você chegou ao Founder':`Faltam ${Math.max(0,10-stamps)} carimbos`;let benefits=vip===9?['Acesso às condições máximas do clube','Atendimento e experiências reservadas ao Founder']:['Benefícios exclusivos do próximo nível','Condições especiais para membros'];try{const s=await getDoc(doc(db,'niveis',`lv${next+1}`));if(s.exists()&&Array.isArray(s.data().beneficios))benefits=s.data().beneficios.filter(Boolean)}catch(e){console.warn(e)}document.getElementById('benefits').innerHTML=benefits.length?benefits.map(x=>`<div class="benefit-row">${x}</div>`).join(''):'<div class="empty-benefits">Benefícios serão publicados em breve.</div>'}
async function registerPurchase(){if(!isAdmin||!currentUser)return;const raw=prompt('Valor da compra:');if(raw===null)return;const value=Number(raw.replace('R$','').replace('.','').replace(',','.').trim());if(!Number.isFinite(value)||value<=0)return alert('Valor inválido.');const gained=Math.floor(value/100);if(!gained)return alert('A compra precisa atingir R$ 100.');let vip=Number(currentData.vip)||0,stamps=(Number(currentData.carimbos)||0)+gained;while(stamps>=10&&vip<9){stamps-=10;vip++}await updateDoc(doc(db,'usuarios',currentUser.uid),{vip,carimbos:stamps,creditos:increment(value)});alert('Compra registrada com sucesso.')}
window.registrarCompra=registerPurchase;
document.addEventListener('wd-role-ready',e=>{isAdmin=e.detail.admin;document.querySelector('.admin-purchase')?.classList.toggle('is-visible',isAdmin)});
onAuthStateChanged(auth,user=>{if(stopUserListener){stopUserListener();stopUserListener=null}if(!user)return;currentUser=user;stopUserListener=onSnapshot(doc(db,'usuarios',user.uid),snap=>{currentData=snap.exists()?{...currentData,...snap.data()}:currentData;paint()},error=>console.error('Erro ao sincronizar cartão:',error))});