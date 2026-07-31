import { auth, db } from './firebase.js';
import { collection,getDocs,doc,updateDoc,addDoc,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { calcularFidelidade,money } from './regras-fidelidade.js';

const $=id=>document.getElementById(id);
const select=$('quickClient'),summary=$('quickClientSummary'),valueInput=$('quickValue'),status=$('quickStatus');
let clients=[],purchases=[];

const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const shortUid=uid=>String(uid||'').slice(-6);
const totalCliente=id=>purchases.filter(p=>p.clienteId===id).reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);

function carimbosGerados(antes,depois){
  if(depois.vip===antes.vip)return Math.max(0,depois.carimbos-antes.carimbos);
  let total=Math.max(0,10-antes.carimbos);
  if(depois.vip-antes.vip>1)total+=(depois.vip-antes.vip-1)*10;
  total+=depois.carimbos;
  return total;
}

function render(){
  const c=clients.find(x=>x.id===select.value);
  const value=parseMoney(valueInput.value);
  const valor=Number.isFinite(value)&&value>0?value:0;
  $('previewValue').textContent=money(valor);
  if(!c){
    summary.innerHTML='<div><strong>Selecione um membro</strong><span>Os dados aparecem aqui.</span></div><span class="client-level">—</span>';
    $('previewStamps').textContent='0';$('previewCart').textContent='0 → 0/10';$('previewCurrent').textContent='LV0 MEMBRO';$('previewAfter').textContent='LV0 MEMBRO';$('upgradeNote').classList.remove('is-visible');$('upgradeNote').textContent='';return;
  }
  const totalAtual=totalCliente(c.id),atual=calcularFidelidade(totalAtual),depois=calcularFidelidade(totalAtual+valor),gerados=carimbosGerados(atual,depois);
  summary.innerHTML=`<div><strong>${c.nome||c.email||'Membro'}</strong><span>${c.email||'Sem e-mail'} · ID ${shortUid(c.id)}</span></div><span class="client-level">LV${atual.vip} ${atual.nome}</span>`;
  $('previewStamps').textContent=String(gerados);
  $('previewCart').textContent=`${atual.carimbos} → ${depois.carimbos}/10`;
  $('previewCurrent').textContent=`LV${atual.vip} ${atual.nome}`;
  $('previewAfter').textContent=`LV${depois.vip} ${depois.nome}`;
  const note=$('upgradeNote');
  if(depois.vip>atual.vip){note.textContent=`Subirá para LV${depois.vip} ${depois.nome}. Total acumulado: ${money(depois.totalGasto)}.`;note.classList.add('is-visible');}
  else if(depois.proximo){note.textContent=`Faltarão ${money(depois.faltam)} para LV${depois.proximo.vip} ${depois.proximo.nome}.`;note.classList.toggle('is-visible',valor>0);}
  else{note.textContent='Nível Founder mantido.';note.classList.toggle('is-visible',valor>0);}
}

async function loadClients(){
  try{
    const selected=select.value;
    const [usersSnap,purchasesSnap]=await Promise.all([getDocs(collection(db,'usuarios')),getDocs(collection(db,'compras'))]);
    purchases=purchasesSnap.docs.map(d=>({id:d.id,...d.data()}));
    clients=usersSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    select.innerHTML='<option value="">Selecione um membro</option>'+clients.map(c=>{const r=calcularFidelidade(totalCliente(c.id));return `<option value="${c.id}">${c.nome||c.email||'Membro'} · LV${r.vip} ${r.nome} · ${c.email||'sem e-mail'}</option>`}).join('');
    if(clients.some(c=>c.id===selected))select.value=selected;
    render();
  }catch(error){console.error(error);status.textContent='Não foi possível carregar os membros.';}
}

async function submit(){
  const c=clients.find(x=>x.id===select.value);
  if(!c)return status.textContent='Selecione um membro.';
  const value=parseMoney(valueInput.value);
  if(!Number.isFinite(value)||value<=0)return status.textContent='Informe um valor válido.';
  const totalAntes=totalCliente(c.id),antes=calcularFidelidade(totalAntes),depois=calcularFidelidade(totalAntes+value);
  const button=$('quickSubmit');button.disabled=true;status.textContent='Confirmando movimentação...';
  try{
    await updateDoc(doc(db,'usuarios',c.id),{vip:depois.vip,carimbos:depois.carimbos,totalGasto:depois.totalGasto,atualizadoEm:serverTimestamp()});
    const purchase=await addDoc(collection(db,'compras'),{clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',telefone:c.telefone||'',valor:value,totalAntes,totalDepois:depois.totalGasto,carimbosGerados:carimbosGerados(antes,depois),carimbosAntes:antes.carimbos,carimbosDepois:depois.carimbos,vipAntes:antes.vip,vipDepois:depois.vip,criadoEm:serverTimestamp()});
    await addDoc(collection(db,'logs'),{tipo:'compra_registrada',clienteId:c.id,clienteNome:c.nome||c.email||'',compraId:purchase.id,valor:value,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});
    status.textContent=`Movimentação de ${money(value)} registrada com sucesso.`;
    valueInput.value='';await loadClients();select.value=c.id;render();
  }catch(error){console.error(error);status.textContent='Não foi possível registrar a movimentação.';}finally{button.disabled=false;}
}

select.addEventListener('change',render);valueInput.addEventListener('input',render);$('quickSubmit').addEventListener('click',submit);loadClients();