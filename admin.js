import { auth,db } from './firebase.js';
import { doc,getDoc,setDoc,serverTimestamp,collection,getDocs,updateDoc,addDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { money,calcularCarteira } from './regras-fidelidade.js';

const LEVELS=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const $=id=>document.getElementById(id);
const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const digits=value=>String(value||'').replace(/\D/g,'');
const shortUid=uid=>String(uid||'').slice(-6);
const normal=v=>String(v||'').trim().toLowerCase();
const roleLabel=role=>['admin','administrador','master'].includes(normal(role))?'ADMIN':'CLIENTE';
const audit=(tipo,payload)=>addDoc(collection(db,'logs'),{tipo,...payload,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});

const level=$('adminLevel');
const field=$('adminBenefits');
const status=$('adminStatus');
const correctionClient=$('correctionClient');
const correctionVip=$('correctionVip');
const correctionStamps=$('correctionStamps');
const correctionCredits=$('correctionCredits');
const correctionReason=$('correctionReason');
const correctionStatus=$('correctionStatus');
const duplicateInfo=$('duplicateInfo');
const whatsappDdd=$('storeWhatsappDdd');
const whatsappNumber=$('storeWhatsappNumber');
const whatsappGreeting=$('storeWhatsappGreeting');
const whatsappStatus=$('storeWhatsappStatus');
let clients=[];

async function loadBenefits(){
  const snap=await getDoc(doc(db,'niveis',level.value));
  field.value=snap.exists()&&Array.isArray(snap.data().beneficios)?snap.data().beneficios.join('\n'):'';
  status.textContent='';
}

async function saveBenefits(){
  try{
    await setDoc(doc(db,'niveis',level.value),{beneficios:field.value.split('\n').map(x=>x.trim()).filter(Boolean),atualizadoEm:serverTimestamp()},{merge:true});
    status.textContent='Benefícios salvos.';
  }catch(error){console.error(error);status.textContent='Não foi possível salvar.'}
}

async function loadStoreWhatsapp(){
  if(!whatsappDdd||!whatsappNumber)return;
  try{
    const snap=await getDoc(doc(db,'ofertas','__config_loja'));
    const data=snap.exists()?snap.data():{};
    whatsappDdd.value=digits(data.whatsappDdd).slice(0,2);
    whatsappNumber.value=digits(data.whatsappNumero).slice(0,9);
    whatsappGreeting.value=data.whatsappMensagem||'Olá! Tenho interesse neste produto:';
    whatsappStatus.textContent=snap.exists()?'Número atual carregado.':'Cadastre o número usado nos testes.';
  }catch(error){console.error(error);whatsappStatus.textContent='Não foi possível carregar o WhatsApp.'}
}

async function saveStoreWhatsapp(){
  const ddd=digits(whatsappDdd?.value).slice(0,2);
  const numero=digits(whatsappNumber?.value).slice(0,9);
  const mensagem=String(whatsappGreeting?.value||'').trim()||'Olá! Tenho interesse neste produto:';
  if(ddd.length!==2)return whatsappStatus.textContent='Informe um DDD com 2 números.';
  if(numero.length<8||numero.length>9)return whatsappStatus.textContent='Informe um número com 8 ou 9 dígitos.';
  whatsappDdd.value=ddd;
  whatsappNumber.value=numero;
  whatsappStatus.textContent='Salvando...';
  try{
    await setDoc(doc(db,'ofertas','__config_loja'),{tipo:'configuracao',whatsappPais:'55',whatsappDdd:ddd,whatsappNumero:numero,whatsappCompleto:`55${ddd}${numero}`,whatsappMensagem:mensagem,ativo:false,atualizadoEm:serverTimestamp(),adminUid:auth.currentUser?.uid||''},{merge:true});
    await audit('whatsapp_loja_atualizado',{ddd,finalNumero:numero.slice(-4)});
    whatsappStatus.textContent=`WhatsApp salvo: +55 (${ddd}) ${numero}. Todos os produtos usarão este número.`;
  }catch(error){console.error(error);whatsappStatus.textContent='Não foi possível salvar o WhatsApp.'}
}

function optionLabel(client){
  const you=client.id===auth.currentUser?.uid?' · VOCÊ':'';
  const manual=client.ajusteManualAtivo===true?' · AJUSTE MANUAL':'';
  return `${client.nome||client.email||'Cliente'} — LV${Math.max(0,Math.min(10,Number(client.vip)||0))} · ${roleLabel(client.role)}${manual} · ${client.email||'sem e-mail'} · ID ${shortUid(client.id)}${you}`;
}

function renderCorrection(){
  const client=clients.find(item=>item.id===correctionClient.value);
  if(!client){duplicateInfo.innerHTML='<span>Selecione um cliente.</span>';return}
  const vip=Math.max(0,Math.min(10,Number(client.vip)||0));
  correctionVip.value=String(vip);
  correctionStamps.value=String(Math.max(0,Math.min(vip===10?10:9,Number(client.carimbos)||0)));
  correctionCredits.value=Number(client.creditos||0).toFixed(2).replace('.',',');
  const manual=client.ajusteManualAtivo===true?' · Ajuste manual ativo':'';
  duplicateInfo.innerHTML=`<strong>${client.nome||client.email||'Cliente'}</strong><span>${client.email||'Sem e-mail'} · ${roleLabel(client.role)} · ID ${shortUid(client.id)}</span><span>LV${vip} ${LEVELS[vip]} · Total histórico ${money(client.totalGasto||0)} · Bônus ${money(client.creditos||0)}${manual}</span>`;
}

async function loadClients(){
  try{
    const selected=correctionClient.value;
    const snap=await getDocs(collection(db,'usuarios'));
    clients=snap.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    correctionClient.innerHTML='<option value="">Selecione um cliente</option>'+clients.map(client=>`<option value="${client.id}">${optionLabel(client)}</option>`).join('');
    const requested=new URLSearchParams(location.search).get('cliente');
    if(clients.some(client=>client.id===requested))correctionClient.value=requested;
    else if(clients.some(client=>client.id===selected))correctionClient.value=selected;
    else if(clients.some(client=>client.id===auth.currentUser?.uid))correctionClient.value=auth.currentUser.uid;
    renderCorrection();
  }catch(error){console.error(error);correctionStatus.textContent='Sem permissão para listar clientes.'}
}

async function saveCorrection(){
  const client=clients.find(item=>item.id===correctionClient.value);
  if(!client)return correctionStatus.textContent='Selecione um cliente.';
  const vip=Math.max(0,Math.min(10,Number(correctionVip.value)||0));
  const carimbos=vip===10?10:Math.max(0,Math.min(9,Number(correctionStamps.value)||0));
  const creditos=parseMoney(correctionCredits.value);
  const motivo=correctionReason.value.trim();
  if(!Number.isFinite(creditos)||creditos<0)return correctionStatus.textContent='Informe um bônus válido.';
  if(motivo.length<3)return correctionStatus.textContent='Informe o motivo.';
  try{
    const carteira=calcularCarteira(client,vip);
    const bonusManual=Math.max(0,creditos-carteira.bonusNivel);
    await updateDoc(doc(db,'usuarios',client.id),{vip,carimbos,ajusteManualAtivo:true,ajusteManualMotivo:motivo,ajusteManualEm:serverTimestamp(),bonusBaseVip:carteira.bonusBaseVip,bonusNivel:carteira.bonusNivel,bonusManual,creditos,atualizadoEm:serverTimestamp()});
    await audit('conta_corrigida',{clienteId:client.id,motivo,depois:{vip,carimbos,creditos,bonusManual,bonusNivel:carteira.bonusNivel,ajusteManualAtivo:true}});
    correctionStatus.textContent='Conta atualizada. O nível manual agora tem prioridade sobre o histórico.';
    correctionReason.value='';
    await loadClients();
  }catch(error){console.error(error);correctionStatus.textContent='Não foi possível atualizar.'}
}

async function resetCustomer(){
  const client=clients.find(item=>item.id===correctionClient.value);
  const motivo=correctionReason.value.trim();
  if(!client)return correctionStatus.textContent='Selecione um cliente.';
  if(motivo.length<3)return correctionStatus.textContent='Informe o motivo.';
  if(!confirm(`Zerar progresso e bônus de ${client.nome||client.email}? O histórico de compras será preservado.`))return;
  try{
    await updateDoc(doc(db,'usuarios',client.id),{vip:0,carimbos:0,totalGasto:0,bonusBaseVip:0,bonusNivel:0,bonusManual:0,creditos:0,ajusteManualAtivo:true,ajusteManualMotivo:motivo,ajusteManualEm:serverTimestamp(),atualizadoEm:serverTimestamp()});
    await audit('conta_zerada',{clienteId:client.id,motivo,historicoPreservado:true,ajusteManualAtivo:true});
    correctionStatus.textContent='Conta zerada. O histórico foi preservado e não elevará o nível novamente.';
    correctionReason.value='';
    await loadClients();
  }catch(error){console.error(error);correctionStatus.textContent='Não foi possível zerar.'}
}

level.addEventListener('change',loadBenefits);
$('saveBenefits').addEventListener('click',saveBenefits);
correctionClient.addEventListener('change',renderCorrection);
$('saveCorrection').addEventListener('click',saveCorrection);
$('resetCustomer').addEventListener('click',resetCustomer);
$('saveStoreWhatsapp')?.addEventListener('click',saveStoreWhatsapp);
whatsappDdd?.addEventListener('input',()=>whatsappDdd.value=digits(whatsappDdd.value).slice(0,2));
whatsappNumber?.addEventListener('input',()=>whatsappNumber.value=digits(whatsappNumber.value).slice(0,9));

loadBenefits();
loadClients();
loadStoreWhatsapp();