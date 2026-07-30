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
  if(!c){summary.innerHTML='<span>Selecione uma conta para conferir os dados.</span>';button.disabled=true;return;}
  const current=c.id===auth.currentUser?.uid;
  summary.innerHTML=`<strong>${c.nome||c.email||'Cliente'}</strong><span>${c.email||'Sem e-mail'} · ${roleLabel(c.role)}</span><span>UID final: ${shortUid(c.id)} · LV${Math.max(1,(Number(c.vip)||0)+1)}</span>${current?'<span class="current-warning">Esta é a conta usada agora. Excluí-la encerrará seu acesso ao painel.</span>':''}`;
  button.disabled=false;
  button.textContent=current?'Excluir minha conta administrativa':'Excluir conta selecionada';
}

async function loadClients(){
  try{
    const selected=select.value;
    const snap=await getDocs(collection(db,'usuarios'));
    clients=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    select.innerHTML='<option value="">Selecione uma conta</option>'+clients.map(c=>`<option value="${c.id}">${c.nome||c.email||'Cliente'} · ${c.email||'sem e-mail'} · ${roleLabel(c.role)} · ID ${shortUid(c.id)}${c.id===auth.currentUser?.uid?' · VOCÊ':''}</option>`).join('');
    if(clients.some(c=>c.id===selected))select.value=selected;
    render();
  }catch(error){
    console.error(error);
    select.innerHTML='<option value="">Não foi possível carregar contas</option>';
    status.textContent='Verifique as regras administrativas do Firestore.';
  }
}

async function removeClient(){
  const c=clients.find(x=>x.id===select.value);
  if(!c){status.textContent='Selecione uma conta.';return;}
  const motivo=reason.value.trim();
  if(motivo.length<3){status.textContent='Informe o motivo da exclusão.';return;}
  const deletingSelf=c.id===auth.currentUser?.uid;
  const required=deletingSelf?'EXCLUIR MINHA CONTA':'EXCLUIR';
  const confirmation=prompt(`Esta ação remove permanentemente o perfil de ${c.nome||c.email} do site. Digite ${required} para confirmar:`);
  if(confirmation!==required){status.textContent='Exclusão cancelada.';return;}
  button.disabled=true;
  status.textContent='Excluindo conta...';
  try{
    await addDoc(collection(db,'logs'),{tipo:'perfil_excluido',clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',clienteRole:c.role||'cliente',motivo,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},dadosExcluidos:c,criadoEm:serverTimestamp()});
    await deleteDoc(doc(db,'usuarios',c.id));
    reason.value='';
    if(deletingSelf){
      alert('Sua conta administrativa foi removida do site. Exclua também o usuário no Authentication caso queira removê-lo por completo.');
      location.replace('index.html');
      return;
    }
    status.textContent='Conta excluída do site com sucesso. Para removê-la por completo, exclua também o usuário correspondente no Authentication.';
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
button.disabled=true;
loadClients();