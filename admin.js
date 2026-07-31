import { auth, db } from './firebase.js';
import { doc,getDoc,setDoc,serverTimestamp,collection,getDocs,updateDoc,increment,addDoc,query,orderBy,limit,deleteDoc,where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const names=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const $=id=>document.getElementById(id);
const level=$('adminLevel'),field=$('adminBenefits'),status=$('adminStatus');
const clientSelect=$('clientSelect'),clientSummary=$('clientSummary'),purchaseStatus=$('purchaseStatus'),history=$('purchaseHistory');
const correctionClient=$('correctionClient'),correctionVip=$('correctionVip'),correctionStamps=$('correctionStamps'),correctionCredits=$('correctionCredits'),correctionReason=$('correctionReason'),correctionStatus=$('correctionStatus'),duplicateInfo=$('duplicateInfo');
let clients=[];

const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const shortUid=uid=>String(uid||'').slice(-6);
const normalized=value=>String(value||'').trim().toLowerCase();
const roleLabel=role=>['admin','administrador','master'].includes(normalized(role))?'ADMIN':'CLIENTE';
const currentAdmin=()=>({uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''});
function formatDate(ts){try{return ts?.toDate().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})||'Agora'}catch{return 'Agora'}}
async function audit(tipo,payload){await addDoc(collection(db,'logs'),{tipo,...payload,admin:currentAdmin(),criadoEm:serverTimestamp()})}

function calculateAccountFromPurchases(purchases){
  const totalCredits=purchases.reduce((sum,p)=>sum+Math.max(0,Number(p.valor)||0),0);
  const totalStamps=purchases.reduce((sum,p)=>sum+Math.max(0,Number(p.carimbosGanhos)||Math.floor((Number(p.valor)||0)/100)),0);
  const vip=Math.min(9,Math.floor(totalStamps/10));
  const carimbos=vip===9?Math.min(10,totalStamps-90):totalStamps%10;
  return {vip,carimbos,creditos:totalCredits,totalStamps};
}

async function loadBenefits(){const s=await getDoc(doc(db,'niveis',level.value));field.value=s.exists()&&Array.isArray(s.data().beneficios)?s.data().beneficios.join('\n'):'';status.textContent=''}
async function saveBenefits(){await setDoc(doc(db,'niveis',level.value),{beneficios:field.value.split('\n').map(x=>x.trim()).filter(Boolean),atualizadoEm:serverTimestamp()},{merge:true});status.textContent='Benefícios salvos com sucesso.'}
level.addEventListener('change',loadBenefits);$('saveBenefits').addEventListener('click',saveBenefits);loadBenefits();

const offerId=$('offerId'),offerStatus=$('offerStatus');
async function loadOffer(){const s=await getDoc(doc(db,'ofertas',offerId.value));const d=s.exists()?s.data():{};$('offerCategory').value=d.categoria||'';$('offerTitle').value=d.titulo||'';$('offerDescription').value=d.descricao||'';$('offerButton').value=d.botao||'';$('offerOrder').value=d.ordem||Number(offerId.value.replace('oferta',''))||1;offerStatus.textContent=''}
async function saveOffer(){const data={categoria:$('offerCategory').value.trim(),titulo:$('offerTitle').value.trim(),descricao:$('offerDescription').value.trim(),botao:$('offerButton').value.trim()||'Ver benefício',ordem:Number($('offerOrder').value)||1,ativo:true,atualizadoEm:serverTimestamp()};if(!data.titulo)return offerStatus.textContent='Informe o título da oferta.';await setDoc(doc(db,'ofertas',offerId.value),data,{merge:true});offerStatus.textContent='Oferta salva com sucesso.'}
offerId.addEventListener('change',loadOffer);$('saveOffer').addEventListener('click',saveOffer);loadOffer();

function optionLabel(c){const you=c.id===auth.currentUser?.uid?' · VOCÊ':'';const email=c.email||'sem e-mail';return `${c.nome||email} — LV${Math.max(1,(Number(c.vip)||0)+1)} · ${roleLabel(c.role)} · ${email} · ID ${shortUid(c.id)}${you}`}
function identityHtml(c){return `<strong>${c.nome||c.email||'Cliente'}</strong><span>${c.email||'Sem e-mail'} · ${roleLabel(c.role)} · ID final ${shortUid(c.id)}</span><span>LV${Math.max(1,(Number(c.vip)||0)+1)} — ${names[Math.max(0,Math.min(9,Number(c.vip)||0))]} · ${c.telefone||'Telefone não informado'}</span>`}
function renderClient(){const c=clients.find(x=>x.id===clientSelect.value);clientSummary.innerHTML=c?identityHtml(c):'<strong>Nenhum cliente selecionado</strong><span>Nome, e-mail, função e ID aparecerão aqui.</span>'}
function renderCorrection(){const c=clients.find(x=>x.id===correctionClient.value);if(!c){duplicateInfo.innerHTML='';return}correctionVip.value=String(Math.max(0,Math.min(9,Number(c.vip)||0)));correctionStamps.value=String(Math.max(0,Math.min(10,Number(c.carimbos)||0)));correctionCredits.value=Number(c.creditos||0).toFixed(2).replace('.',',');duplicateInfo.innerHTML=identityHtml(c)}

async function loadClients(){
  try{
    const selected=clientSelect.value,selectedCorrection=correctionClient.value;
    const snap=await getDocs(collection(db,'usuarios'));
    clients=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    const options='<option value="">Selecione um cliente</option>'+clients.map(c=>`<option value="${c.id}">${optionLabel(c)}</option>`).join('');
    clientSelect.innerHTML=options;correctionClient.innerHTML=options;
    if(clients.some(c=>c.id===selected))clientSelect.value=selected;
    if(clients.some(c=>c.id===selectedCorrection))correctionClient.value=selectedCorrection;
    else if(clients.some(c=>c.id===auth.currentUser?.uid))correctionClient.value=auth.currentUser.uid;
    renderClient();renderCorrection();
  }catch(e){console.error(e);clientSelect.innerHTML='<option>Sem permissão para listar clientes</option>';correctionClient.innerHTML=clientSelect.innerHTML;purchaseStatus.textContent='Verifique as regras administrativas do Firestore.'}
}

async function loadHistory(){
  try{
    const snap=await getDocs(query(collection(db,'compras'),orderBy('criadoEm','desc'),limit(100)));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    history.innerHTML=rows.length?rows.map(r=>`<article class="history-item"><div><strong>${r.clienteNome||r.clienteEmail||'Cliente'}</strong><small>${r.clienteEmail||''} · ID ${shortUid(r.clienteId)}</small><small>LV${Number(r.vipDepois||0)+1} — ${names[Math.max(0,Math.min(9,Number(r.vipDepois)||0))]}</small></div><div class="history-value">${money(r.valor)}</div><div class="history-stamps">+${Number(r.carimbosGanhos||0)} carimbo(s)</div><small class="history-date">${formatDate(r.criadoEm)}</small><button class="danger-btn delete-purchase" data-id="${r.id}" type="button">Excluir e estornar</button></article>`).join(''):'<div class="client-summary"><span>Nenhuma compra registrada ainda.</span></div>';
    document.querySelectorAll('.delete-purchase').forEach(btn=>btn.addEventListener('click',()=>deletePurchase(btn.dataset.id,rows.find(r=>r.id===btn.dataset.id))));
  }catch(e){console.error(e);history.innerHTML='<div class="client-summary"><span>Não foi possível carregar o histórico.</span></div>'}
}

async function savePurchase(){
  const c=clients.find(x=>x.id===clientSelect.value);if(!c)return purchaseStatus.textContent='Selecione um cliente.';
  const value=parseMoney($('purchaseValue').value);if(!Number.isFinite(value)||value<=0)return purchaseStatus.textContent='Informe um valor válido.';
  const gained=Math.floor(value/100);if(gained<1)return purchaseStatus.textContent='A compra precisa atingir R$ 100.';
  let vipAntes=Number(c.vip)||0,vip=vipAntes,stampsAntes=Number(c.carimbos)||0,stamps=stampsAntes+gained;
  while(stamps>=10&&vip<9){stamps-=10;vip++}if(vip===9)stamps=Math.min(stamps,10);
  await updateDoc(doc(db,'usuarios',c.id),{vip,carimbos:stamps,creditos:increment(value),atualizadoEm:serverTimestamp()});
  const p=await addDoc(collection(db,'compras'),{clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',telefone:c.telefone||'',valor:value,carimbosGanhos:gained,carimbosAntes:stampsAntes,carimbosDepois:stamps,vipAntes,vipDepois:vip,criadoEm:serverTimestamp()});
  await audit('compra_registrada',{clienteId:c.id,clienteNome:c.nome||c.email||'',compraId:p.id,valor:value});
  $('purchaseValue').value='';purchaseStatus.textContent='Compra registrada com sucesso.';await loadClients();await loadHistory();
}

async function saveCorrection(){const c=clients.find(x=>x.id===correctionClient.value);if(!c)return correctionStatus.textContent='Selecione um cliente.';const vip=Math.max(0,Math.min(9,Number(correctionVip.value)||0)),carimbos=Math.max(0,Math.min(10,Number(correctionStamps.value)||0)),creditos=parseMoney(correctionCredits.value),motivo=correctionReason.value.trim();if(!Number.isFinite(creditos)||creditos<0)return correctionStatus.textContent='Informe créditos válidos.';if(motivo.length<3)return correctionStatus.textContent='Informe o motivo.';await updateDoc(doc(db,'usuarios',c.id),{vip,carimbos,creditos,atualizadoEm:serverTimestamp()});await audit('conta_corrigida',{clienteId:c.id,clienteEmail:c.email||'',motivo});correctionStatus.textContent='Conta atualizada.';correctionReason.value='';await loadClients()}
async function resetCustomer(){const c=clients.find(x=>x.id===correctionClient.value);if(!c)return correctionStatus.textContent='Selecione um cliente.';const motivo=correctionReason.value.trim();if(motivo.length<3)return correctionStatus.textContent='Informe o motivo.';if(!confirm(`Zerar nível, carimbos e créditos de ${c.nome||c.email}?`))return;await updateDoc(doc(db,'usuarios',c.id),{vip:0,carimbos:0,creditos:0,atualizadoEm:serverTimestamp()});await audit('conta_zerada',{clienteId:c.id,clienteEmail:c.email||'',motivo});correctionStatus.textContent='Conta zerada.';correctionReason.value='';await loadClients()}
async function deleteCustomerProfile(){const c=clients.find(x=>x.id===correctionClient.value);if(!c)return correctionStatus.textContent='Selecione o perfil que deseja excluir.';const motivo=correctionReason.value.trim();if(motivo.length<3)return correctionStatus.textContent='Informe o motivo da exclusão.';if(prompt(`Digite EXCLUIR para remover ${c.nome||c.email}:`)!=='EXCLUIR')return correctionStatus.textContent='Exclusão cancelada.';await audit('perfil_excluido',{clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',motivo,dadosExcluidos:c});await deleteDoc(doc(db,'usuarios',c.id));correctionReason.value='';correctionStatus.textContent='Perfil removido do site.';await loadClients()}

async function deletePurchase(id,purchase){
  if(!purchase)return;
  const valor=Math.max(0,Number(purchase.valor)||0);
  if(!confirm(`Excluir e estornar a compra de ${money(valor)}?\n\nA conta será recalculada usando somente as compras que continuarem no histórico.`))return;
  const button=document.querySelector(`.delete-purchase[data-id="${id}"]`);
  if(button){button.disabled=true;button.textContent='Recalculando...';}
  try{
    const userRef=doc(db,'usuarios',purchase.clienteId);
    const userSnap=await getDoc(userRef);
    if(!userSnap.exists())throw new Error('O perfil do cliente não existe mais.');
    const before=userSnap.data();

    await deleteDoc(doc(db,'compras',id));
    const remainingSnap=await getDocs(query(collection(db,'compras'),where('clienteId','==',purchase.clienteId)));
    const remaining=remainingSnap.docs.map(d=>d.data());
    const recalculated=calculateAccountFromPurchases(remaining);

    await updateDoc(userRef,{vip:recalculated.vip,carimbos:recalculated.carimbos,creditos:recalculated.creditos,atualizadoEm:serverTimestamp()});
    await audit('compra_excluida_estornada',{clienteId:purchase.clienteId||'',clienteNome:purchase.clienteNome||purchase.clienteEmail||'',compraId:id,valorEstornado:valor,antes:{vip:Number(before.vip)||0,carimbos:Number(before.carimbos)||0,creditos:Number(before.creditos)||0},depois:{vip:recalculated.vip,carimbos:recalculated.carimbos,creditos:recalculated.creditos},comprasRestantes:remaining.length,lancamentoExcluido:purchase});

    purchaseStatus.textContent=`Estorno concluído: LV${recalculated.vip+1} — ${names[recalculated.vip]}, ${recalculated.carimbos} carimbo(s) e ${money(recalculated.creditos)} em créditos.`;
    await loadClients();await loadHistory();
  }catch(error){
    console.error(error);
    alert(`Não foi possível concluir o estorno: ${error.message||'erro desconhecido'}`);
    if(button){button.disabled=false;button.textContent='Excluir e estornar';}
  }
}

clientSelect.addEventListener('change',renderClient);correctionClient.addEventListener('change',renderCorrection);$('savePurchase').addEventListener('click',savePurchase);$('saveCorrection').addEventListener('click',saveCorrection);$('resetCustomer').addEventListener('click',resetCustomer);$('deleteDuplicateProfile')?.addEventListener('click',deleteCustomerProfile);loadClients();loadHistory();