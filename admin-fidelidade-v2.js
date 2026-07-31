import { auth,db } from './firebase.js';
import { collection,getDocs,query,where,doc,getDoc,updateDoc,addDoc,deleteDoc,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { calcularFidelidade,money } from './regras-fidelidade.js';

const parseMoney=raw=>Number(String(raw||'').replace('R$','').replace(/\./g,'').replace(',','.').trim());
const totalDoCliente=async uid=>{const snap=await getDocs(query(collection(db,'compras'),where('clienteId','==',uid)));return snap.docs.reduce((s,d)=>s+Math.max(0,Number(d.data().valor)||0),0)};
const auditar=async(tipo,payload)=>addDoc(collection(db,'logs'),{tipo,...payload,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});

async function registrarCompraRapida(event){
  const button=event.target.closest('#savePurchase');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const uid=document.getElementById('clientSelect')?.value;
  const valor=parseMoney(document.getElementById('purchaseValue')?.value);
  const status=document.getElementById('purchaseStatus');
  if(!uid){status.textContent='Selecione um cliente.';return}
  if(!Number.isFinite(valor)||valor<=0){status.textContent='Informe um valor válido.';return}
  button.disabled=true;status.textContent='Registrando pela nova regra de níveis...';
  try{
    const userRef=doc(db,'usuarios',uid),userSnap=await getDoc(userRef);
    if(!userSnap.exists())throw new Error('Cliente não encontrado.');
    const user=userSnap.data(),totalAntes=await totalDoCliente(uid),antes=calcularFidelidade(totalAntes),depois=calcularFidelidade(totalAntes+valor);
    const compra=await addDoc(collection(db,'compras'),{clienteId:uid,clienteNome:user.nome||'',clienteEmail:user.email||'',telefone:user.telefone||'',valor,totalAntes,totalDepois:depois.totalGasto,carimbosAntes:antes.carimbos,carimbosDepois:depois.carimbos,vipAntes:antes.vip,vipDepois:depois.vip,criadoEm:serverTimestamp()});
    await updateDoc(userRef,{vip:depois.vip,carimbos:depois.carimbos,totalGasto:depois.totalGasto,atualizadoEm:serverTimestamp()});
    await auditar('compra_registrada',{clienteId:uid,compraId:compra.id,valor});
    status.textContent=`Compra registrada. LV${depois.vip} ${depois.nome} · ${depois.carimbos}/10 carimbos · total ${money(depois.totalGasto)}.`;
    document.getElementById('purchaseValue').value='';
    setTimeout(()=>location.reload(),900);
  }catch(error){console.error(error);status.textContent=`Erro: ${error.message||'não foi possível registrar.'}`;}finally{button.disabled=false}
}

async function estornar(event){
  const button=event.target.closest('.delete-purchase');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const id=button.dataset.id;
  if(!id)return;
  const compraRef=doc(db,'compras',id),compraSnap=await getDoc(compraRef);
  if(!compraSnap.exists()){alert('Este lançamento já não existe.');return}
  const compra={id,...compraSnap.data()};
  if(!confirm(`Excluir e estornar a compra de ${money(compra.valor)}?\n\nNível, carimbos e total gasto serão recalculados pelo histórico restante.`))return;
  button.disabled=true;button.textContent='Recalculando...';
  try{
    await deleteDoc(compraRef);
    const totalRestante=await totalDoCliente(compra.clienteId),resultado=calcularFidelidade(totalRestante);
    await updateDoc(doc(db,'usuarios',compra.clienteId),{vip:resultado.vip,carimbos:resultado.carimbos,totalGasto:totalRestante,atualizadoEm:serverTimestamp()});
    await auditar('compra_excluida_estornada',{clienteId:compra.clienteId,compraId:id,valorEstornado:Number(compra.valor)||0,depois:{vip:resultado.vip,carimbos:resultado.carimbos,totalGasto:totalRestante}});
    alert(`Estorno concluído.\n\nLV${resultado.vip} ${resultado.nome}\n${resultado.carimbos}/10 carimbos\nTotal em compras: ${money(totalRestante)}`);
    location.reload();
  }catch(error){console.error(error);alert(`Não foi possível estornar: ${error.message||'erro desconhecido'}`);button.disabled=false;button.textContent='Excluir e estornar';}
}

document.addEventListener('click',registrarCompraRapida,true);
document.addEventListener('click',estornar,true);
