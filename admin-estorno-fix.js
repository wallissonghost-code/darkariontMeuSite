import { auth, db } from './firebase.js';
import { collection,getDocs,query,where,doc,deleteDoc,updateDoc,addDoc,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const levels=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];

function calculateFromPurchases(items){
  const credits=items.reduce((sum,item)=>sum+Math.max(0,Number(item.valor)||0),0);
  const totalStamps=items.reduce((sum,item)=>sum+Math.max(0,Number(item.carimbosGanhos)||Math.floor((Number(item.valor)||0)/100)),0);
  const vip=Math.min(9,Math.floor(totalStamps/10));
  const stamps=vip===9?Math.min(10,totalStamps-90):totalStamps%10;
  return {vip,carimbos:stamps,creditos};
}

async function refund(button){
  const purchaseId=button.dataset.id;
  if(!purchaseId)return;
  const allSnap=await getDocs(collection(db,'compras'));
  const purchaseDoc=allSnap.docs.find(d=>d.id===purchaseId);
  if(!purchaseDoc){alert('Esse lançamento não existe mais.');return;}
  const purchase={id:purchaseDoc.id,...purchaseDoc.data()};
  if(!confirm(`Excluir e estornar ${money(purchase.valor)} de ${purchase.clienteNome||purchase.clienteEmail||'cliente'}?\n\nA conta será recalculada usando somente as compras que continuarem no histórico.`))return;
  button.disabled=true;button.textContent='Recalculando...';
  try{
    await deleteDoc(doc(db,'compras',purchaseId));
    const remainingSnap=await getDocs(query(collection(db,'compras'),where('clienteId','==',purchase.clienteId)));
    const remaining=remainingSnap.docs.map(d=>({id:d.id,...d.data()}));
    const after=calculateFromPurchases(remaining);
    await updateDoc(doc(db,'usuarios',purchase.clienteId),{...after,atualizadoEm:serverTimestamp()});
    await addDoc(collection(db,'logs'),{tipo:'compra_excluida_recalculo_total',clienteId:purchase.clienteId,clienteNome:purchase.clienteNome||purchase.clienteEmail||'',compraId:purchaseId,valorEstornado:Number(purchase.valor)||0,depois:after,comprasRestantes:remaining.length,admin:{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''},criadoEm:serverTimestamp()});
    alert(`Estorno concluído.\n\nNovo status: LV${after.vip+1} — ${levels[after.vip]}\nCarimbos: ${after.carimbos}\nCréditos: ${money(after.creditos)}`);
    location.reload();
  }catch(error){console.error(error);alert(`Não foi possível concluir o estorno: ${error.message||'erro desconhecido'}`);button.disabled=false;button.textContent='Excluir e estornar';}
}

document.addEventListener('click',event=>{
  const button=event.target.closest('.delete-purchase');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();refund(button);
},true);