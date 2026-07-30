import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, onSnapshot, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const levels=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
let currentUser=null,currentData={vip:0,carimbos:0,creditos:0,nome:'Cliente Founder'},isAdmin=false,stopUserListener=null;

function paint(){
  const vip=Math.max(0,Math.min(9,Number(currentData.vip)||0));
  const stamps=Math.max(0,Math.min(10,Number(currentData.carimbos)||0));
  const card=document.getElementById('cartao');
  card.dataset.vip=String(vip);
  card.setAttribute('aria-label',`Cartão ${levels[vip]} nível ${vip+1}`);
  document.getElementById('nivel').textContent=`LV${vip+1}`;
  document.getElementById('membroNivel').textContent=`MEMBRO ${levels[vip]}`;
  document.getElementById('seloNivel').textContent=levels[vip];
  document.getElementById('clienteNome').textContent=currentData.nome||'Cliente Founder';
  document.getElementById('creditosCliente').textContent=Number(currentData.creditos||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  document.getElementById('textoCarimbo').textContent=`${stamps} / 10 carimbos`;
  document.getElementById('listaCarimbos').innerHTML=Array.from({length:10},(_,i)=>`<span class="stamp ${i<stamps?'on':''}" aria-hidden="true"></span>`).join('');
  document.getElementById('progressBar').style.width=`${stamps*10}%`;
  loadNext(vip,stamps);
}

async function loadNext(vip,stamps){
  const next=Math.min(9,vip+1);
  document.getElementById('nextLevel').textContent=vip===9?'Nível máximo':`LV${next+1} — ${levels[next]}`;
  document.getElementById('missing').textContent=vip===9?'Você chegou ao Founder':`Faltam ${Math.max(0,10-stamps)} carimbos`;
  let benefits=vip===9?['Acesso às condições máximas do clube','Atendimento e experiências reservadas ao Founder']:['Benefícios exclusivos do próximo nível','Condições especiais para membros'];
  try{
    const s=await getDoc(doc(db,'niveis',`lv${next+1}`));
    if(s.exists()&&Array.isArray(s.data().beneficios)) benefits=s.data().beneficios.filter(Boolean);
  }catch(e){
    console.warn('Não foi possível carregar os benefícios do nível:',e);
  }
  document.getElementById('benefits').innerHTML=benefits.length?benefits.map(x=>`<div class="benefit-row">${x}</div>`).join(''):'<div class="empty-benefits">Benefícios serão publicados em breve.</div>';
}

async function registerPurchase(){
  if(!isAdmin||!currentUser)return;
  const raw=prompt('Valor da compra:');
  if(raw===null)return;
  const value=Number(raw.replace('R$','').replace('.','').replace(',','.').trim());
  if(!Number.isFinite(value)||value<=0)return alert('Valor inválido.');
  const gained=Math.floor(value/100);
  if(!gained)return alert('A compra precisa atingir R$ 100 para gerar carimbo.');
  let vip=Number(currentData.vip)||0,stamps=(Number(currentData.carimbos)||0)+gained;
  while(stamps>=10&&vip<9){stamps-=10;vip++}
  await updateDoc(doc(db,'usuarios',currentUser.uid),{vip,carimbos:stamps,creditos:increment(value)});
  alert('Compra registrada com sucesso.');
}
window.registrarCompra=registerPurchase;

document.addEventListener('wd-role-ready',e=>{
  isAdmin=e.detail.admin;
  document.querySelector('.admin-purchase')?.classList.toggle('is-visible',isAdmin);
});

onAuthStateChanged(auth,user=>{
  if(stopUserListener){stopUserListener();stopUserListener=null;}
  if(!user)return;
  currentUser=user;
  stopUserListener=onSnapshot(doc(db,'usuarios',user.uid),snap=>{
    currentData=snap.exists()?{...currentData,...snap.data()}:currentData;
    paint();
  },error=>console.error('Erro ao sincronizar cartão:',error));
});