import { auth,db } from './firebase.js';
import { doc,getDoc,setDoc,serverTimestamp,collection,getDocs,updateDoc,addDoc,deleteDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { money,calcularCarteira } from './regras-fidelidade.js';

const LEVELS=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const $=id=>document.getElementById(id);
const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const shortUid=uid=>String(uid||'').slice(-6);
const normal=v=>String(v||'').trim().toLowerCase();
const roleLabel=role=>['admin','administrador','master'].includes(normal(role))?'ADMIN':'CLIENTE';
const audit=(tipo,payload)=>addDoc(collection(db,'logs'),{tipo,...payload,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});

const level=$('adminLevel'),field=$('adminBenefits'),status=$('adminStatus');
const correctionClient=$('correctionClient'),correctionVip=$('correctionVip'),correctionStamps=$('correctionStamps'),correctionCredits=$('correctionCredits'),correctionReason=$('correctionReason'),correctionStatus=$('correctionStatus'),duplicateInfo=$('duplicateInfo');
const offerId=$('offerId'),offerStatus=$('offerStatus');
const productId=$('productId'),productStatus=$('productStatus');
let clients=[];
let products=[];

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

async function loadOffer(){
  const snap=await getDoc(doc(db,'ofertas',offerId.value));
  const data=snap.exists()?snap.data():{};
  $('offerCategory').value=data.categoria||'';
  $('offerTitle').value=data.titulo||'';
  $('offerDescription').value=data.descricao||'';
  $('offerButton').value=data.botao||'';
  $('offerOrder').value=data.ordem||Number(offerId.value.replace('oferta',''))||1;
  offerStatus.textContent='';
}

async function saveOffer(){
  const data={categoria:$('offerCategory').value.trim(),titulo:$('offerTitle').value.trim(),descricao:$('offerDescription').value.trim(),botao:$('offerButton').value.trim()||'Ver benefício',ordem:Number($('offerOrder').value)||1,ativo:true,atualizadoEm:serverTimestamp()};
  if(!data.titulo)return offerStatus.textContent='Informe o título.';
  try{await setDoc(doc(db,'ofertas',offerId.value),data,{merge:true});offerStatus.textContent='Oferta salva.'}
  catch(error){console.error(error);offerStatus.textContent='Não foi possível salvar.'}
}

function optionLabel(client){
  const you=client.id===auth.currentUser?.uid?' · VOCÊ':'';
  return `${client.nome||client.email||'Cliente'} — LV${Math.max(0,Math.min(10,Number(client.vip)||0))} · ${roleLabel(client.role)} · ${client.email||'sem e-mail'} · ID ${shortUid(client.id)}${you}`;
}

function renderCorrection(){
  const client=clients.find(item=>item.id===correctionClient.value);
  if(!client){duplicateInfo.innerHTML='<span>Selecione um cliente.</span>';return}
  const vip=Math.max(0,Math.min(10,Number(client.vip)||0));
  correctionVip.value=String(vip);
  correctionStamps.value=String(Math.max(0,Math.min(10,Number(client.carimbos)||0)));
  correctionCredits.value=Number(client.creditos||0).toFixed(2).replace('.',',');
  duplicateInfo.innerHTML=`<strong>${client.nome||client.email||'Cliente'}</strong><span>${client.email||'Sem e-mail'} · ${roleLabel(client.role)} · ID ${shortUid(client.id)}</span><span>LV${vip} ${LEVELS[vip]} · Total ${money(client.totalGasto||0)} · Bônus ${money(client.creditos||0)}</span>`;
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
  const carimbos=Math.max(0,Math.min(10,Number(correctionStamps.value)||0));
  const creditos=parseMoney(correctionCredits.value);
  const motivo=correctionReason.value.trim();
  if(!Number.isFinite(creditos)||creditos<0)return correctionStatus.textContent='Informe um bônus válido.';
  if(motivo.length<3)return correctionStatus.textContent='Informe o motivo.';
  try{
    const carteira=calcularCarteira(client,vip);
    const bonusManual=Math.max(0,creditos-carteira.bonusNivel);
    await updateDoc(doc(db,'usuarios',client.id),{vip,carimbos,bonusBaseVip:carteira.bonusBaseVip,bonusNivel:carteira.bonusNivel,bonusManual,creditos,atualizadoEm:serverTimestamp()});
    await audit('conta_corrigida',{clienteId:client.id,motivo,depois:{vip,carimbos,creditos,bonusManual,bonusNivel:carteira.bonusNivel}});
    correctionStatus.textContent='Conta atualizada.';
    correctionReason.value='';
    await loadClients();
  }catch(error){console.error(error);correctionStatus.textContent='Não foi possível atualizar.'}
}

async function resetCustomer(){
  const client=clients.find(item=>item.id===correctionClient.value);
  const motivo=correctionReason.value.trim();
  if(!client)return correctionStatus.textContent='Selecione um cliente.';
  if(motivo.length<3)return correctionStatus.textContent='Informe o motivo.';
  if(!confirm(`Zerar progresso e bônus de ${client.nome||client.email}?`))return;
  try{
    await updateDoc(doc(db,'usuarios',client.id),{vip:0,carimbos:0,totalGasto:0,bonusBaseVip:0,bonusNivel:0,bonusManual:0,creditos:0,atualizadoEm:serverTimestamp()});
    await audit('conta_zerada',{clienteId:client.id,motivo});
    correctionStatus.textContent='Conta zerada.';
    correctionReason.value='';
    await loadClients();
  }catch(error){console.error(error);correctionStatus.textContent='Não foi possível zerar.'}
}

function clearProductForm(){
  productId.value='';
  $('productName').value='';
  $('productCategory').value='';
  $('productBadge').value='';
  $('productPrice').value='';
  $('productOldPrice').value='';
  $('productStock').value='';
  $('productOrder').value=String(products.length+1);
  $('productButton').value='Ver item';
  $('productLink').value='';
  $('productImage').value='';
  $('productDescription').value='';
  $('productActive').checked=true;
  productStatus.textContent='Novo produto.';
}

function renderProductForm(){
  const product=products.find(item=>item.id===productId.value);
  if(!product)return clearProductForm();
  $('productName').value=product.nome||'';
  $('productCategory').value=product.categoria||'';
  $('productBadge').value=product.selo||'';
  $('productPrice').value=Number(product.preco||0).toFixed(2).replace('.',',');
  $('productOldPrice').value=product.precoAntigo?Number(product.precoAntigo).toFixed(2).replace('.',','):'';
  $('productStock').value=Number.isFinite(Number(product.estoque))?String(product.estoque):'';
  $('productOrder').value=String(product.ordem||1);
  $('productButton').value=product.botao||'Ver item';
  $('productLink').value=product.link||'';
  $('productImage').value=product.imagem||'';
  $('productDescription').value=product.descricao||'';
  $('productActive').checked=product.ativo!==false;
  productStatus.textContent='Editando produto existente.';
}

async function loadProducts(){
  try{
    const selected=productId.value;
    const snap=await getDocs(collection(db,'produtosVitrine'));
    products=snap.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));
    productId.innerHTML='<option value="">Novo produto</option>'+products.map(product=>`<option value="${product.id}">${product.nome||'Produto sem nome'}</option>`).join('');
    if(products.some(product=>product.id===selected))productId.value=selected;
    renderProductForm();
  }catch(error){console.error(error);productStatus.textContent='Não foi possível carregar os produtos.'}
}

async function saveProduct(){
  const nome=$('productName').value.trim();
  const preco=parseMoney($('productPrice').value);
  const precoAntigo=parseMoney($('productOldPrice').value||0);
  if(!nome)return productStatus.textContent='Informe o nome do produto.';
  if(!Number.isFinite(preco)||preco<0)return productStatus.textContent='Informe um preço válido.';
  const id=productId.value||`produto-${Date.now()}`;
  const data={
    nome,
    categoria:$('productCategory').value.trim()||'WD Founder',
    selo:$('productBadge').value.trim(),
    preco,
    precoAntigo:Number.isFinite(precoAntigo)?precoAntigo:0,
    estoque:Math.max(0,Number($('productStock').value)||0),
    ordem:Math.max(1,Number($('productOrder').value)||1),
    botao:$('productButton').value.trim()||'Ver item',
    link:$('productLink').value.trim(),
    imagem:$('productImage').value.trim(),
    descricao:$('productDescription').value.trim(),
    ativo:$('productActive').checked,
    atualizadoEm:serverTimestamp()
  };
  try{
    await setDoc(doc(db,'produtosVitrine',id),data,{merge:true});
    await audit('produto_vitrine_salvo',{produtoId:id,nome,preco});
    productStatus.textContent='Produto salvo e publicado.';
    await loadProducts();
    productId.value=id;
    renderProductForm();
  }catch(error){console.error(error);productStatus.textContent='Não foi possível salvar o produto.'}
}

async function removeProduct(){
  const id=productId.value;
  const product=products.find(item=>item.id===id);
  if(!id||!product)return productStatus.textContent='Selecione um produto existente.';
  if(!confirm(`Excluir ${product.nome||'este produto'} da vitrine?`))return;
  try{
    await deleteDoc(doc(db,'produtosVitrine',id));
    await audit('produto_vitrine_excluido',{produtoId:id,nome:product.nome||''});
    productStatus.textContent='Produto excluído.';
    await loadProducts();
  }catch(error){console.error(error);productStatus.textContent='Não foi possível excluir o produto.'}
}

level.addEventListener('change',loadBenefits);
$('saveBenefits').addEventListener('click',saveBenefits);
offerId.addEventListener('change',loadOffer);
$('saveOffer').addEventListener('click',saveOffer);
correctionClient.addEventListener('change',renderCorrection);
$('saveCorrection').addEventListener('click',saveCorrection);
$('resetCustomer').addEventListener('click',resetCustomer);
productId.addEventListener('change',renderProductForm);
$('newProduct').addEventListener('click',clearProductForm);
$('saveProduct').addEventListener('click',saveProduct);
$('deleteProduct').addEventListener('click',removeProduct);

loadBenefits();
loadOffer();
loadClients();
loadProducts();