import { auth, db } from './firebase.js';
import { collection,getDocs,doc,updateDoc,addDoc,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { NIVEIS,calcularFidelidade,money } from './regras-fidelidade.js';

const $=id=>document.getElementById(id);
const select=$('quickClient'),summary=$('quickClientSummary'),valueInput=$('quickValue'),status=$('quickStatus');
let clients=[],purchases=[];

const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const shortUid=uid=>String(uid||'').slice(-6);
const totalCliente=id=>purchases.filter(p=>p.clienteId===id).reduce((s,p)=>s+Number(p.valor||0),0);

function render(){
  const c=clients.find(x=>x.id===select.value);
  const value=parseMoney(valueInput.value);
  if(!c){summary.innerHTML='<span>Selecione um cliente.</span>';$('previewStamps').textContent='0';$('previewCurrent').textContent='—';$('previewAfter').textContent='—';return;}
  const totalAtual=totalCliente(c.id);
  const atual=calcularFidelidade(totalAtual);
  const depois=calcularFidelidade(totalAtual+(Number.isFinite(value)?value:0));
  summary.innerHTML=`<strong>${c.nome||c.email||'Cliente'}</strong><span>${c.email||'Sem e-mail'} · ${c.telefone||'Telefone não informado'}</span><span>UID final ${shortUid(c.id)} · Total em compras ${money(totalAtual)}</span><span>${depois.proximo?`Cada carimbo no ${depois.nome} exige ${money(depois.valorCarimbo)}.`:'Nível máximo alcançado.'}</span>`;
  $('previewStamps').textContent=String(Math.max(0,depois.carimbos-atual.carimbos));
  $('previewCurrent').textContent=`LV${atual.vip} ${atual.nome}`;
  $('previewAfter').textContent=`LV${depois.vip} ${depois.nome}`;
}

async function loadClients(){
  try{
    const [usersSnap,purchasesSnap]=await Promise.all([getDocs(collection(db,'usuarios')),getDocs(collection(db,'compras'))]);
    purchases=purchasesSnap.docs.map(d=>({id:d.id,...d.data()}));
    clients=usersSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    select.innerHTML='<option value="">Selecione um cliente</option>'+clients.map(c=>{const r=calcularFidelidade(totalCliente(c.id));return `<option value="${c.id}">${c.nome||c.email||'Cliente'} · LV${r.vip} ${r.nome} · ${c.email||'sem e-mail'}</option>`}).join('');
    render();
  }catch(error){console.error(error);status.textContent='Não foi possível carregar os clientes.';}
}

async function submit(){
  const c=clients.find(x=>x.id===select.value);
  if(!c)return status.textContent='Selecione um cliente.';
  const value=parseMoney(valueInput.value);
  if(!Number.isFinite(value)||value<=0)return status.textContent='Informe um valor válido.';
  const totalAntes=totalCliente(c.id),antes=calcularFidelidade(totalAntes),depois=calcularFidelidade(totalAntes+value);
  const button=$('quickSubmit');button.disabled=true;status.textContent='Registrando compra...';
  try{
    await updateDoc(doc(db,'usuarios',c.id),{vip:depois.vip,carimbos:depois.carimbos,totalGasto:depois.totalGasto,atualizadoEm:serverTimestamp()});
    const purchase=await addDoc(collection(db,'compras'),{clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',telefone:c.telefone||'',valor:value,totalAntes,totalDepois:depois.totalGasto,carimbosAntes:antes.carimbos,carimbosDepois:depois.carimbos,vipAntes:antes.vip,vipDepois:depois.vip,criadoEm:serverTimestamp()});
    await addDoc(collection(db,'logs'),{tipo:'compra_registrada',clienteId:c.id,clienteNome:c.nome||c.email||'',compraId:purchase.id,valor:value,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});
    status.textContent=`Compra de ${money(value)} registrada. Cliente agora está no LV${depois.vip} — ${depois.nome}, com ${depois.carimbos}/10 carimbos.`;
    valueInput.value='';await loadClients();select.value=c.id;render();
  }catch(error){console.error(error);status.textContent='Não foi possível registrar a compra.';}finally{button.disabled=false;}
}

select.addEventListener('change',render);valueInput.addEventListener('input',render);$('quickSubmit').addEventListener('click',submit);loadClients();