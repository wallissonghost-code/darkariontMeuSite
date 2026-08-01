import { db } from './firebase.js';
import { doc,getDoc,setDoc,serverTimestamp,collection,getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

let state={ready:false,user:null,waiting:[],notifications:[],products:[]};
let initPromise=null;
const emit=()=>document.dispatchEvent(new CustomEvent('wd-commerce-change',{detail:getCommerceState()}));
const safeArray=value=>Array.isArray(value)?value:[];
const now=()=>new Date().toISOString();
const stockOf=product=>Math.max(0,Number(product?.estoque)||0);

export function getCommerceState(){return {...state,waiting:[...state.waiting],notifications:[...state.notifications],products:[...state.products]}}

async function saveUserData(extra={}){
  if(!state.user)return;
  await setDoc(doc(db,'usuarios',state.user.uid),{
    carrinhoEspera:state.waiting,
    notificacoes:state.notifications,
    comercioAtualizadoEm:serverTimestamp(),
    ...extra
  },{merge:true});
}

async function syncRestocks(){
  let changed=false;
  const productMap=new Map(state.products.map(product=>[product.id,product]));
  state.waiting=state.waiting.map(item=>{
    const product=productMap.get(item.productId);
    const available=stockOf(product)>0;
    if(available&&!item.notificadoDisponivel){
      state.notifications.unshift({
        id:`restock-${item.productId}-${Date.now()}`,
        type:'restock',
        productId:item.productId,
        title:'Produto disponível novamente',
        message:`${product?.nome||item.nome||'Seu produto'} voltou ao estoque.`,
        image:(Array.isArray(product?.imagens)&&product.imagens[0])||product?.imagem||item.image||'',
        createdAt:now(),
        read:false
      });
      changed=true;
      return {...item,nome:product?.nome||item.nome,image:(Array.isArray(product?.imagens)&&product.imagens[0])||product?.imagem||item.image||'',notificadoDisponivel:true,disponivel:true};
    }
    if(!available&&item.disponivel){changed=true;return {...item,disponivel:false,notificadoDisponivel:false}}
    return {...item,disponivel:available};
  });
  state.notifications=state.notifications.slice(0,50);
  if(changed)await saveUserData();
}

export async function initMemberCommerce(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    const session=await window.WDSession.ready;
    if(session.status!=='ready')return getCommerceState();
    state.user=session.user;
    const [userSnap,productsSnap]=await Promise.all([
      getDoc(doc(db,'usuarios',state.user.uid)),
      getDocs(collection(db,'ofertas'))
    ]);
    const data=userSnap.exists()?userSnap.data():{};
    state.waiting=safeArray(data.carrinhoEspera);
    state.notifications=safeArray(data.notificacoes);
    state.products=productsSnap.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.tipo==='produto'&&item.ativo!==false);
    await syncRestocks();
    state.ready=true;
    emit();
    return getCommerceState();
  })().catch(error=>{initPromise=null;throw error});
  return initPromise;
}

export async function addToWaiting(product){
  await initMemberCommerce();
  if(!state.user||!product?.id)return;
  const exists=state.waiting.some(item=>item.productId===product.id);
  if(!exists){
    const image=(Array.isArray(product.imagens)&&product.imagens[0])||product.imagem||'';
    state.waiting.unshift({productId:product.id,nome:product.nome||'Produto',image,addedAt:now(),disponivel:stockOf(product)>0,notificadoDisponivel:stockOf(product)>0});
    await saveUserData();
    emit();
  }
}

export async function removeFromWaiting(productId){
  await initMemberCommerce();
  state.waiting=state.waiting.filter(item=>item.productId!==productId);
  await saveUserData();
  emit();
}

export async function markNotificationsRead(){
  await initMemberCommerce();
  let changed=false;
  state.notifications=state.notifications.map(item=>{if(item.read)return item;changed=true;return {...item,read:true}});
  if(changed)await saveUserData();
  emit();
}
