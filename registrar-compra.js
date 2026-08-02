import { auth, db } from './firebase.js';
import { collection,getDocs,doc,writeBatch,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { calcularFidelidade,resolverFidelidade,bonusDaEvolucao,money } from './regras-fidelidade.js';

const $=id=>document.getElementById(id);
const select=$('quickClient');
const summary=$('quickClientSummary');
const valueInput=$('quickValue');
const creditInput=$('quickCredit');
const status=$('quickStatus');
const productSelect=$('productSelect');
const productSize=$('productSize');
const saleItems=$('saleItems');
let clients=[],products=[],cart=[],submitting=false,loaded=false,loadingPromise=null;

const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const shortUid=uid=>String(uid||'').slice(-6);
const totalCliente=id=>Math.max(0,Number(clients.find(client=>client.id===id)?.totalGasto)||0);
const stockMap=product=>product?.estoquePorTamanho&&typeof product.estoquePorTamanho==='object'?product.estoquePorTamanho:{};
const availableSizes=product=>Object.entries(stockMap(product)).filter(([,qty])=>Number(qty)>0).map(([size,qty])=>({size,qty:Number(qty)}));
const totalStock=product=>{const values=Object.values(stockMap(product));return values.length?values.reduce((sum,qty)=>sum+Math.max(0,Number(qty)||0),0):Math.max(0,Number(product?.estoque)||0)};
const progressoAtual=client=>resolverFidelidade(client,totalCliente(client.id));
const progressoDepois=(client,valorPago)=>{const atual=progressoAtual(client);const base=atual.manual?atual.totalEquivalente:totalCliente(client.id);return {atual,depois:calcularFidelidade(base+valorPago)}};

function carimbosGerados(antes,depois){if(depois.vip===antes.vip)return Math.max(0,depois.carimbos-antes.carimbos);let total=Math.max(0,10-antes.carimbos);if(depois.vip-antes.vip>1)total+=(depois.vip-antes.vip-1)*10;return total+depois.carimbos}
function atualizarOpcao(client,result){const option=[...select.options].find(item=>item.value===client.id);if(option)option.textContent=`${client.nome||client.email||'Membro'} · LV${result.vip} ${result.nome}${client.ajusteManualAtivo===true?' · MANUAL':''} · ${client.email||'sem e-mail'}`}
function cartTotal(){return cart.reduce((sum,item)=>sum+item.precoVenda*item.quantidade,0)}
function cartCost(){return cart.reduce((sum,item)=>sum+item.precoCusto*item.quantidade,0)}
function valores(){const manual=parseMoney(valueInput.value),cartValue=cartTotal(),total=cartValue>0?cartValue:(Number.isFinite(manual)&&manual>0?manual:0),credit=parseMoney(creditInput?.value);return{total,credito:Number.isFinite(credit)&&credit>0?credit:0}}

function renderCart(){
  if(!saleItems)return;
  saleItems.innerHTML=cart.length?cart.map((item,index)=>`<div class="sale-item"><div><strong>${item.nome}</strong><span>${item.categoria||'Produto'}${item.tamanho?` · Tam. ${item.tamanho}`:''} · ${item.quantidade} × ${money(item.precoVenda)}</span></div><strong>${money(item.quantidade*item.precoVenda)}</strong><button type="button" data-remove="${index}" aria-label="Remover item">×</button></div>`).join(''):'<div class="empty-items">Nenhum item adicionado. Você ainda pode lançar um valor manual.</div>';
  valueInput.readOnly=cart.length>0;
  if(cart.length)valueInput.value=cartTotal().toFixed(2).replace('.',',');
}

function render(){
  const client=clients.find(item=>item.id===select.value);
  const {total,credito}=valores();
  $('previewValue').textContent=money(total);
  if(!client){
    summary.innerHTML='<div><strong>Selecione um membro</strong><span>Os dados aparecem aqui.</span></div><span class="client-level">—</span>';
    $('previewStamps').textContent='0';$('previewCart').textContent='0 → 0/10';$('previewCurrent').textContent='LV0 MEMBRO';$('previewAfter').textContent='LV0 MEMBRO';$('walletBalance').textContent=money(0);$('previewCredit').textContent=money(0);$('previewPay').textContent=money(total);$('previewLoyalty').textContent=money(total);$('upgradeNote').classList.remove('is-visible');return;
  }
  const saldo=Math.max(0,Number(client.creditos)||0),creditoUsado=Math.min(credito,total,saldo),valorPago=Math.max(0,total-creditoUsado),{atual,depois}=progressoDepois(client,valorPago),gerados=carimbosGerados(atual,depois),bonus=bonusDaEvolucao(atual.vip,depois.vip);
  if(creditInput&&credito!==creditoUsado)creditInput.value=creditoUsado?creditoUsado.toFixed(2).replace('.',','):'';
  summary.innerHTML=`<div><strong>${client.nome||client.email||'Membro'}</strong><span>${client.email||'Sem e-mail'} · ID ${shortUid(client.id)}${atual.manual?' · Ajuste manual ativo':''}</span></div><span class="client-level">LV${atual.vip} ${atual.nome}</span>`;
  $('walletBalance').textContent=money(saldo);$('previewCredit').textContent=money(creditoUsado);$('previewPay').textContent=money(valorPago);$('previewLoyalty').textContent=money(valorPago);$('previewStamps').textContent=String(gerados);$('previewCart').textContent=`${atual.carimbos} → ${depois.carimbos}/10`;$('previewCurrent').textContent=`LV${atual.vip} ${atual.nome}`;$('previewAfter').textContent=`LV${depois.vip} ${depois.nome}`;
  const note=$('upgradeNote');note.textContent=depois.vip>atual.vip?`Subirá para LV${depois.vip} ${depois.nome} e receberá ${money(bonus)} de bônus.`:depois.proximo?`Faltarão ${money(depois.faltam)} de progresso para LV${depois.proximo.vip} ${depois.proximo.nome}.`:'Nível Founder mantido.';note.classList.toggle('is-visible',total>0);
}

function updateSizeOptions(){
  const product=products.find(item=>item.id===productSelect.value),sizes=product?availableSizes(product):[];
  if(!sizes.length){productSize.hidden=true;productSize.innerHTML='';return}
  productSize.hidden=false;
  productSize.innerHTML=sizes.map(item=>`<option value="${item.size}">${item.size} · ${item.qty} un.</option>`).join('');
}

function renderProductOptions(selected=''){
  products=products.filter(product=>product.ativo!==false&&totalStock(product)>0).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  productSelect.innerHTML='<option value="">Selecione uma mercadoria</option>'+products.map(product=>`<option value="${product.id}">${product.nome||'Produto'} · ${product.categoria||'Sem categoria'} · ${money(product.preco)} · estoque ${totalStock(product)}</option>`).join('');
  if(products.some(product=>product.id===selected))productSelect.value=selected;
  updateSizeOptions();
}

async function loadData({force=false}={}){
  if(loaded&&!force)return;
  if(loadingPromise)return loadingPromise;
  status.textContent='Carregando dados...';
  loadingPromise=(async()=>{
    try{
      const [usersSnap,productsSnap]=await Promise.all([getDocs(collection(db,'usuarios')),getDocs(collection(db,'ofertas'))]);
      clients=usersSnap.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
      products=productsSnap.docs.map(item=>({id:item.id,...item.data()})).filter(product=>product.tipo==='produto');
      select.innerHTML='<option value="">Selecione um membro</option>'+clients.map(client=>{const result=progressoAtual(client);return `<option value="${client.id}">${client.nome||client.email||'Membro'} · LV${result.vip} ${result.nome}${result.manual?' · MANUAL':''} · ${client.email||'sem e-mail'}</option>`}).join('');
      renderProductOptions();renderCart();render();status.textContent='';loaded=true;
    }catch(error){
      console.error('Falha ao abrir Registrar compra:',error);
      loaded=false;
      status.textContent='Não foi possível carregar os dados. Toque aqui para tentar novamente.';
      status.style.cursor='pointer';
      status.onclick=()=>{status.onclick=null;status.style.cursor='';loadData({force:true})};
    }finally{
      loadingPromise=null;
    }
  })();
  return loadingPromise;
}

function addProduct(){
  const product=products.find(item=>item.id===productSelect.value),qty=Math.max(1,Math.floor(Number($('productQty')?.value)||1));
  if(!product)return status.textContent='Selecione uma mercadoria.';
  const size=productSize.hidden?'':productSize.value,available=size?Number(stockMap(product)[size]||0):totalStock(product),key=`${product.id}::${size}`,existing=cart.find(item=>item.key===key),current=existing?.quantidade||0;
  if(current+qty>available)return status.textContent=`Estoque insuficiente${size?` no tamanho ${size}`:''}. Disponível: ${available}.`;
  if(existing)existing.quantidade+=qty;else cart.push({key,id:product.id,nome:product.nome||'Produto',categoria:product.categoria||'',tamanho:size,quantidade:qty,precoVenda:Math.max(0,Number(product.preco)||0),precoCusto:Math.max(0,Number(product.precoCusto)||0)});
  status.textContent='';renderCart();render();
}

function applyLocalStockSale(items){
  const grouped=new Map();
  items.forEach(item=>{const group=grouped.get(item.id)||[];group.push(item);grouped.set(item.id,group)});
  grouped.forEach((soldItems,productId)=>{
    const product=products.find(entry=>entry.id===productId);
    if(!product)return;
    const map={...stockMap(product)};
    let sold=0;
    soldItems.forEach(item=>{sold+=item.quantidade;if(item.tamanho)map[item.tamanho]=Math.max(0,Number(map[item.tamanho]||0)-item.quantidade)});
    product.estoquePorTamanho=map;
    product.estoque=Object.keys(map).length?Object.values(map).reduce((sum,qty)=>sum+Math.max(0,Number(qty)||0),0):Math.max(0,totalStock(product)-sold);
    product.vendidos=(Number(product.vendidos)||0)+sold;
  });
}

async function submit(){
  if(submitting)return;
  const client=clients.find(item=>item.id===select.value);if(!client)return status.textContent='Selecione um membro.';
  const {total,credito}=valores();if(!total)return status.textContent='Informe um valor válido.';
  const saldoAntes=Math.max(0,Number(client.creditos)||0),creditoUsado=Math.min(credito,total,saldoAntes);if(credito>saldoAntes)return status.textContent='O bônus usado é maior que o saldo disponível.';if(credito>total)return status.textContent='O bônus não pode ser maior que o total da compra.';
  for(const item of cart){const product=products.find(entry=>entry.id===item.id);if(!product)return status.textContent=`Produto ${item.nome} não encontrado. Atualize a tela.`;const available=item.tamanho?Number(stockMap(product)[item.tamanho]||0):totalStock(product);if(available<item.quantidade)return status.textContent=`Estoque insuficiente para ${item.nome}${item.tamanho?` (${item.tamanho})`:''}. Atualize a página.`}
  const saleSnapshot=cart.map(item=>({...item}));
  const valorPago=Math.max(0,total-creditoUsado),totalAntes=totalCliente(client.id),{atual:antes,depois}=progressoDepois(client,valorPago),totalDepoisReal=totalAntes+valorPago,bonusGerado=bonusDaEvolucao(antes.vip,depois.vip),saldoDepois=Math.max(0,saldoAntes-creditoUsado+bonusGerado),custoTotal=cartCost(),lucroEstimado=valorPago-custoTotal;
  submitting=true;const button=$('quickSubmit'),purchaseRef=doc(collection(db,'compras')),walletRef=doc(collection(db,'carteira_movimentos')),logRef=doc(collection(db,'logs')),batch=writeBatch(db);button.disabled=true;button.textContent='Registrando...';status.textContent='Confirmando movimentação...';
  try{
    batch.update(doc(db,'usuarios',client.id),{vip:depois.vip,carimbos:depois.carimbos,totalGasto:totalDepoisReal,creditos:saldoDepois,ajusteManualAtivo:client.ajusteManualAtivo===true,atualizadoEm:serverTimestamp()});
    const grouped=new Map();saleSnapshot.forEach(item=>{const group=grouped.get(item.id)||[];group.push(item);grouped.set(item.id,group)});
    for(const [productId,items] of grouped){const product=products.find(entry=>entry.id===productId),map={...stockMap(product)};let sold=0;for(const item of items){sold+=item.quantidade;if(item.tamanho)map[item.tamanho]=Math.max(0,Number(map[item.tamanho]||0)-item.quantidade)}const nextStock=Object.keys(map).length?Object.values(map).reduce((sum,qty)=>sum+Math.max(0,Number(qty)||0),0):Math.max(0,totalStock(product)-sold);batch.update(doc(db,'ofertas',productId),{estoque:nextStock,estoquePorTamanho:map,vendidos:(Number(product.vendidos)||0)+sold,atualizadoEm:serverTimestamp()})}
    batch.set(purchaseRef,{clienteId:client.id,clienteNome:client.nome||'',clienteEmail:client.email||'',telefone:client.telefone||'',valor:total,valorBruto:total,valorPago,valorFidelidade:valorPago,creditoUsado,custoTotal,lucroEstimado,itens:saleSnapshot.map(item=>({produtoId:item.id,nome:item.nome,categoria:item.categoria,tamanho:item.tamanho,quantidade:item.quantidade,precoVenda:item.precoVenda,precoCusto:item.precoCusto})),saldoBonusAntes:saldoAntes,saldoBonusDepois:saldoDepois,totalAntes,totalDepois:totalDepoisReal,carimbosGerados:carimbosGerados(antes,depois),carimbosAntes:antes.carimbos,carimbosDepois:depois.carimbos,vipAntes:antes.vip,vipDepois:depois.vip,ajusteManualAtivo:antes.manual===true,bonusGerado,criadoEm:serverTimestamp()});
    batch.set(walletRef,{clienteId:client.id,compraId:purchaseRef.id,tipo:'compra',creditoUsado,bonusGerado,saldoAntes,saldoDepois,descricao:`Compra de ${money(total)}`,criadoEm:serverTimestamp()});
    batch.set(logRef,{tipo:'compra_registrada',clienteId:client.id,clienteNome:client.nome||client.email||'',compraId:purchaseRef.id,valorTotal:total,valorPago,valorFidelidade:valorPago,creditoUsado,custoTotal,lucroEstimado,ajusteManualAtivo:antes.manual===true,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});
    await batch.commit();
    Object.assign(client,{vip:depois.vip,carimbos:depois.carimbos,totalGasto:totalDepoisReal,creditos:saldoDepois});
    applyLocalStockSale(saleSnapshot);
    atualizarOpcao(client,depois);
    const selectedProduct=productSelect.value;
    valueInput.value='';if(creditInput)creditInput.value='';cart=[];
    renderProductOptions(selectedProduct);renderCart();render();
    status.textContent='Venda registrada. Estoque, tamanhos, nível e Dashboard foram atualizados.';
  }catch(error){console.error(error);status.textContent='Não foi possível registrar. Nenhum dado parcial foi salvo.'}
  finally{submitting=false;button.disabled=false;button.textContent='Confirmar movimentação'}
}

saleItems?.addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button)return;cart.splice(Number(button.dataset.remove),1);valueInput.value=cart.length?cartTotal().toFixed(2).replace('.',','):'';renderCart();render()});
select?.addEventListener('change',render);
valueInput?.addEventListener('input',render);
creditInput?.addEventListener('input',render);
productSelect?.addEventListener('change',updateSizeOptions);
$('addProduct')?.addEventListener('click',addProduct);
$('useMaxCredit')?.addEventListener('click',()=>{const client=clients.find(item=>item.id===select.value),{total}=valores();if(!client||!total)return;creditInput.value=String(Math.min(total,Math.max(0,Number(client.creditos)||0))).replace('.',',');render()});
$('quickSubmit')?.addEventListener('click',submit);

requestAnimationFrame(()=>loadData());
