import { auth, db } from './firebase.js';
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const select=document.getElementById('deleteClient');
const summary=document.getElementById('selectedClient');
const reason=document.getElementById('deleteReason');
const button=document.getElementById('deleteClientButton');
const status=document.getElementById('deleteStatus');
let clients=[];

const shortUid=uid=>String(uid||'').slice(-6);
const roleLabel=role=>['admin','administrador','master'].includes(String(role||'').toLowerCase())?'ADMIN':'CLIENTE';

function render(){
  const c=clients.find(x=>x.id===select.value);
  if(!c){summary.innerHTML='<span>Selecione uma conta para conferir os dados.</span>';return;}
  summary.innerHTML=`<strong>${c.nome||c.email||'Cliente'}</strong><span>${c.email||'Sem e-mail'} · ${roleLabel(c.role)}</span><span>UID final: ${shortUid(c.id)} · LV${Math.max(1,(Number(c.vip)||0)+1)}</span>${c.id===auth.currentUser?.uid?'<span><strong>Esta é a conta que está logada agora e não pode ser excluída.</strong></span>':''}`;
}

async function loadClients(){
  try{
    const snap=await getDocs(collection(db,'usuarios'));
    clients=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    select.innerHTML='<option value="">Selecione um cliente</option>'+clients.map(c=>`<option value="${c.id}">${c.nome||c.email||'Cliente'} · ${c.email||'sem e-mail'} · ${roleLabel(c.role)} · ID ${shortUid(c.id)}${c.id===auth.currentUser?.uid?' · VOCÊ':''}</option>`).join('');
    render();
  }catch(error){
    console.error(error);
    select.innerHTML='<option value="">Não foi possível carregar clientes</option>';
    status.textContent='Verifique as regras administrativas do Firestore.';
  }
}

async function removeClient(){
  const c=clients.find(x=>x.id===select.value);
  if(!c){status.textContent='Selecione um cliente.';return;}
  if(c.id===auth.currentUser?.uid){status.textContent='A conta atualmente logada não pode ser excluída.';return;}
  const motivo=reason.value.trim();
  if(motivo.length<3){status.textContent='Informe o motivo da exclusão.';return;}
  const confirmation=prompt(`Digite EXCLUIR para remover ${c.nome||c.email}:`);
  if(confirmation!=='EXCLUIR'){status.textContent='Exclusão cancelada.';return;}
  button.disabled=true;
  status.textContent='Excluindo perfil...';
  try{
    await addDoc(collection(db,'logs'),{tipo:'perfil_excluido',clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',motivo,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},dadosExcluidos:c,criadoEm:serverTimestamp()});
    await deleteDoc(doc(db,'usuarios',c.id));
    status.textContent='Perfil excluído do site. Remova também no Authentication caso essa conta ainda esteja lá.';
    reason.value='';
    await loadClients();
  }catch(error){
    console.error(error);
    status.textContent='Não foi possível excluir. Verifique as regras do Firestore.';
  }finally{
    button.disabled=false;
  }
}

select.addEventListener('change',render);
button.addEventListener('click',removeClient);
loadClients();