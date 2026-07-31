import { auth, db } from './firebase.js';
import { collection,getDocs,doc,updateDoc,addDoc,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const levels=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const $=id=>document.getElementById(id);
const select=$('quickClient'),summary=$('quickClientSummary'),valueInput=$('quickValue'),status=$('quickStatus');
let clients=[];

const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const shortUid=uid=>String(uid||'').slice(-6);

function calculate(c,value){
  const gained=Math.max(0,Math.floor(value/100));
  let vip=Math.max(0,Math.min(9,Number(c?.vip)||0));
  let stamps=Math.max(0,Math.min(10,Number(c?.carimbos)||0))+gained;
  while(stamps>=10&&vip<9){stamps-=10;vip++;}
  if(vip===9)stamps=Math.min(10,stamps);
  return {gained,vip,stamps};
}

function render(){
  const c=clients.find(x=>x.id===select.value);
  const value=parseMoney(valueInput.value);
  if(!c){summary.innerHTML='<span>Selecione um cliente.</span>';$('previewStamps').textContent='0';$('previewCurrent').textContent='—';$('previewAfter').textContent='—';return;}
  summary.innerHTML=`<strong>${c.nome||c.email||'Cliente'}</strong><span>${c.email||'Sem e-mail'} · ${c.telefone||'Telefone não informado'}</span><span>UID final ${shortUid(c.id)} · ${money(c.creditos)} em créditos</span>`;
  const result=calculate(c,Number.isFinite(value)?value:0);
  $('previewStamps').textContent=String(result.gained);
  $('previewCurrent').textContent=`LV${Number(c.vip||0)+1}`;
  $('previewAfter').textContent=`LV${result.vip+1} ${levels[result.vip]}`;
}

async function loadClients(){
  try{
    const snap=await getDocs(collection(db,'usuarios'));
    clients=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    select.innerHTML='<option value="">Selecione um cliente</option>'+clients.map(c=>`<option value="${c.id}">${c.nome||c.email||'Cliente'} · LV${Number(c.vip||0)+1} · ${c.email||'sem e-mail'}</option>`).join('');
    render();
  }catch(error){console.error(error);status.textContent='Não foi possível carregar os clientes.';}
}

async function submit(){
  const c=clients.find(x=>x.id===select.value);
  if(!c)return status.textContent='Selecione um cliente.';
  const value=parseMoney(valueInput.value);
  if(!Number.isFinite(value)||value<=0)return status.textContent='Informe um valor válido.';
  const result=calculate(c,value);
  if(result.gained<1)return status.textContent='A compra precisa atingir R$ 100 para gerar carimbo.';
  const button=$('quickSubmit');button.disabled=true;status.textContent='Registrando compra...';
  try{
    const before={vip:Number(c.vip)||0,carimbos:Number(c.carimbos)||0,creditos:Number(c.creditos)||0};
    await updateDoc(doc(db,'usuarios',c.id),{vip:result.vip,carimbos:result.stamps,creditos:before.creditos+value,atualizadoEm:serverTimestamp()});
    const purchase=await addDoc(collection(db,'compras'),{clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',telefone:c.telefone||'',valor:value,carimbosGanhos:result.gained,carimbosAntes:before.carimbos,carimbosDepois:result.stamps,vipAntes:before.vip,vipDepois:result.vip,criadoEm:serverTimestamp()});
    await addDoc(collection(db,'logs'),{tipo:'compra_registrada',clienteId:c.id,clienteNome:c.nome||c.email||'',compraId:purchase.id,valor:value,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});
    status.textContent=`Compra de ${money(value)} registrada. Cliente agora está no LV${result.vip+1} — ${levels[result.vip]}.`;
    valueInput.value='';await loadClients();select.value=c.id;render();
  }catch(error){console.error(error);status.textContent='Não foi possível registrar a compra.';}finally{button.disabled=false;}
}

select.addEventListener('change',render);valueInput.addEventListener('input',render);$('quickSubmit').addEventListener('click',submit);loadClients();