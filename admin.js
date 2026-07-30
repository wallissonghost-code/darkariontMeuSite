import { auth, db } from './firebase.js';
import { doc,getDoc,setDoc,serverTimestamp,collection,getDocs,updateDoc,increment,addDoc,query,orderBy,limit,deleteDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
const names=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const level=document.getElementById('adminLevel'),field=document.getElementById('adminBenefits'),status=document.getElementById('adminStatus');
const clientSelect=document.getElementById('clientSelect'),clientSummary=document.getElementById('clientSummary'),purchaseStatus=document.getElementById('purchaseStatus'),history=document.getElementById('purchaseHistory');
const correctionClient=document.getElementById('correctionClient'),correctionVip=document.getElementById('correctionVip'),correctionStamps=document.getElementById('correctionStamps'),correctionCredits=document.getElementById('correctionCredits'),correctionReason=document.getElementById('correctionReason'),correctionStatus=document.getElementById('correctionStatus');
let clients=[];

function parseMoney(raw){return Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim())}
function money(value){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function formatDate(ts){try{return ts?.toDate().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})||'Agora'}catch{return 'Agora'}}
function currentAdmin(){return {uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''}}
async function audit(type,payload){await addDoc(collection(db,'logs'),{tipo:type,...payload,admin:currentAdmin(),criadoEm:serverTimestamp()})}

async function loadBenefits(){const s=await getDoc(doc(db,'niveis',level.value));field.value=s.exists()&&Array.isArray(s.data().beneficios)?s.data().beneficios.join('\n'):'';status.textContent=''}
async function saveBenefits(){const beneficios=field.value.split('\n').map(x=>x.trim()).filter(Boolean);await setDoc(doc(db,'niveis',level.value),{beneficios,atualizadoEm:serverTimestamp()},{merge:true});status.textContent='Benefícios salvos com sucesso.'}
level.addEventListener('change',loadBenefits);document.getElementById('saveBenefits').addEventListener('click',saveBenefits);loadBenefits();

const offerId=document.getElementById('offerId'),offerStatus=document.getElementById('offerStatus');
async function loadOffer(){const s=await getDoc(doc(db,'ofertas',offerId.value));const d=s.exists()?s.data():{};offerCategory.value=d.categoria||'';offerTitle.value=d.titulo||'';offerDescription.value=d.descricao||'';offerButton.value=d.botao||'';offerOrder.value=d.ordem||Number(offerId.value.replace('oferta',''))||1;offerStatus.textContent=''}
async function saveOffer(){const data={categoria:offerCategory.value.trim(),titulo:offerTitle.value.trim(),descricao:offerDescription.value.trim(),botao:offerButton.value.trim()||'Ver benefício',ordem:Number(offerOrder.value)||1,ativo:true,atualizadoEm:serverTimestamp()};if(!data.titulo)return offerStatus.textContent='Informe o título da oferta.';await setDoc(doc(db,'ofertas',offerId.value),data,{merge:true});offerStatus.textContent='Oferta salva com sucesso.'}
offerId.addEventListener('change',loadOffer);document.getElementById('saveOffer').addEventListener('click',saveOffer);loadOffer();

function optionLabel(c){return `${c.nome||c.email||'Cliente'} — LV${Math.max(1,(Number(c.vip)||0)+1)}`}
function renderClient(){const c=clients.find(x=>x.id===clientSelect.value);if(!c){clientSummary.innerHTML='<strong>Nenhum cliente selecionado</strong><span>O nível e o telefone aparecerão aqui.</span>';return}const vip=Math.max(0,Math.min(9,Number(c.vip)||0));clientSummary.innerHTML=`<strong>${c.nome||c.email||'Cliente'}</strong><span>LV${vip+1} — ${names[vip]} · ${c.telefone||'Telefone não informado'}</span>`}
function renderCorrection(){const c=clients.find(x=>x.id===correctionClient.value);if(!c)return;correctionVip.value=String(Math.max(0,Math.min(9,Number(c.vip)||0)));correctionStamps.value=String(Math.max(0,Math.min(10,Number(c.carimbos)||0)));correctionCredits.value=Number(c.creditos||0).toFixed(2).replace('.',',')}
async function loadClients(){
  try{
    const selected=clientSelect.value,selectedCorrection=correctionClient.value;
    const snap=await getDocs(collection(db,'usuarios'));
    clients=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    const options='<option value="">Selecione um cliente</option>'+clients.map(c=>`<option value="${c.id}">${optionLabel(c)}</option>`).join('');
    clientSelect.innerHTML=options;correctionClient.innerHTML=options;
    if(clients.some(c=>c.id===selected))clientSelect.value=selected;
    if(clients.some(c=>c.id===selectedCorrection))correctionClient.value=selectedCorrection;
    renderClient();renderCorrection();
  }catch(e){clientSelect.innerHTML='<option value="">Sem permissão para listar clientes</option>';correctionClient.innerHTML=clientSelect.innerHTML;purchaseStatus.textContent='As regras do Firestore precisam permitir leitura administrativa da coleção usuarios.'}
}

async function loadHistory(){
  try{
    const snap=await getDocs(query(collection(db,'compras'),orderBy('criadoEm','desc'),limit(100)));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    history.innerHTML=rows.length?rows.map(r=>`<article class="history-item"><div><strong>${r.clienteNome||r.clienteEmail||'Cliente'}</strong><small>LV${Number(r.vipDepois||0)+1} — ${names[Math.max(0,Math.min(9,Number(r.vipDepois)||0))]}</small></div><div class="history-value">${money(r.valor)}</div><div class="history-stamps">+${Number(r.carimbosGanhos||0)} carimbo(s)</div><small class="history-date">${formatDate(r.criadoEm)}</small><button class="danger-btn delete-purchase" data-id="${r.id}" type="button">Excluir lançamento</button></article>`).join(''):'<div class="client-summary"><span>Nenhuma compra registrada ainda.</span></div>';
    document.querySelectorAll('.delete-purchase').forEach(btn=>btn.addEventListener('click',()=>deletePurchase(btn.dataset.id,rows.find(r=>r.id===btn.dataset.id))));
  }catch(e){console.error(e);history.innerHTML='<div class="client-summary"><span>Não foi possível carregar o histórico. Verifique as regras da coleção compras.</span></div>'}
}

async function savePurchase(){
  const c=clients.find(x=>x.id===clientSelect.value);if(!c)return purchaseStatus.textContent='Selecione um cliente.';
  const value=parseMoney(document.getElementById('purchaseValue').value);if(!Number.isFinite(value)||value<=0)return purchaseStatus.textContent='Informe um valor válido.';
  const gained=Math.floor(value/100);if(gained<1)return purchaseStatus.textContent='A compra precisa atingir R$ 100 para gerar carimbo.';
  let vipAntes=Number(c.vip)||0,vip=vipAntes,stampsAntes=Number(c.carimbos)||0,stamps=stampsAntes+gained;
  while(stamps>=10&&vip<9){stamps-=10;vip++}if(vip===9)stamps=Math.min(stamps,10);
  await updateDoc(doc(db,'usuarios',c.id),{vip,carimbos:stamps,creditos:increment(value),atualizadoEm:serverTimestamp()});
  const purchase=await addDoc(collection(db,'compras'),{clienteId:c.id,clienteNome:c.nome||'',clienteEmail:c.email||'',telefone:c.telefone||'',valor:value,carimbosGanhos:gained,carimbosAntes:stampsAntes,carimbosDepois:stamps,vipAntes,vipDepois:vip,criadoEm:serverTimestamp()});
  await audit('compra_registrada',{clienteId:c.id,clienteNome:c.nome||c.email||'',compraId:purchase.id,valor:value,vipAntes,vipDepois:vip,carimbosAntes:stampsAntes,carimbosDepois:stamps});
  document.getElementById('purchaseValue').value='';purchaseStatus.textContent=`Compra registrada para ${c.nome||c.email}. ${gained} carimbo(s) adicionado(s).`;
  await loadClients();await loadHistory();
}

async function saveCorrection(){
  const c=clients.find(x=>x.id===correctionClient.value);if(!c)return correctionStatus.textContent='Selecione um cliente.';
  const newVip=Math.max(0,Math.min(9,Number(correctionVip.value)||0));
  const newStamps=Math.max(0,Math.min(10,Number(correctionStamps.value)||0));
  const newCredits=parseMoney(correctionCredits.value);
  const reason=correctionReason.value.trim();
  if(!Number.isFinite(newCredits)||newCredits<0)return correctionStatus.textContent='Informe créditos válidos.';
  if(reason.length<3)return correctionStatus.textContent='Informe o motivo da correção.';
  const before={vip:Number(c.vip)||0,carimbos:Number(c.carimbos)||0,creditos:Number(c.creditos)||0};
  const after={vip:newVip,carimbos:newStamps,creditos:newCredits};
  await updateDoc(doc(db,'usuarios',c.id),{...after,atualizadoEm:serverTimestamp()});
  await audit('conta_corrigida',{clienteId:c.id,clienteNome:c.nome||c.email||'',motivo:reason,antes:before,depois:after});
  correctionStatus.textContent=`Conta de ${c.nome||c.email} corrigida e registrada no histórico administrativo.`;
  correctionReason.value='';await loadClients();
}

async function resetCustomer(){
  const c=clients.find(x=>x.id===correctionClient.value);if(!c)return correctionStatus.textContent='Selecione um cliente.';
  const reason=correctionReason.value.trim();if(reason.length<3)return correctionStatus.textContent='Informe o motivo antes de zerar a conta.';
  if(!confirm(`Zerar nível, carimbos e créditos de ${c.nome||c.email}?`))return;
  const before={vip:Number(c.vip)||0,carimbos:Number(c.carimbos)||0,creditos:Number(c.creditos)||0};
  await updateDoc(doc(db,'usuarios',c.id),{vip:0,carimbos:0,creditos:0,atualizadoEm:serverTimestamp()});
  await audit('conta_zerada',{clienteId:c.id,clienteNome:c.nome||c.email||'',motivo:reason,antes:before,depois:{vip:0,carimbos:0,creditos:0}});
  correctionStatus.textContent=`Conta de ${c.nome||c.email} zerada com registro administrativo.`;correctionReason.value='';await loadClients();
}

async function deletePurchase(id,purchase){
  if(!purchase||!confirm(`Excluir este lançamento de ${money(purchase.valor)}? Isso remove apenas o registro do histórico. Ajuste o nível e os créditos na seção Corrigir conta.`))return;
  await deleteDoc(doc(db,'compras',id));
  await audit('compra_excluida',{clienteId:purchase.clienteId||'',clienteNome:purchase.clienteNome||purchase.clienteEmail||'',compraId:id,lancamentoExcluido:purchase});
  await loadHistory();
}

clientSelect.addEventListener('change',renderClient);
correctionClient.addEventListener('change',renderCorrection);
document.getElementById('savePurchase').addEventListener('click',savePurchase);
document.getElementById('saveCorrection').addEventListener('click',saveCorrection);
document.getElementById('resetCustomer').addEventListener('click',resetCustomer);
loadClients();loadHistory();
