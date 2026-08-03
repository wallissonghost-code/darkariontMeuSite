import { db } from './firebase.js';
import { doc,getDoc,setDoc,serverTimestamp,collection,getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

let state={ready:false,user:null,waiting:[],notifications:[],products:[]};
let initPromise=null;
let saveQueue=Promise.resolve();
const emit=()=>document.dispatchEvent(new CustomEvent('wd-commerce-change',{detail:getCommerceState()}));
const safeArray=value=>Array.isArray(value)?value:[];
const now=()=>new Date().toISOString();
const stockOf=product=>Math.max(0,Number(product?.estoque)||0);
const localKey=uid=>`wd-commerce:${uid}`;
function readLocal(uid){try{return JSON.parse(localStorage.getItem(localKey(uid))||'{}')}catch{return {}}}
function writeLocal(){if(!state.user)return;try{localStorage.setItem(localKey(state.user.uid),JSON.stringify({waiting:state.waiting,notifications:state.notifications}))}catch(error){console.warn('Não foi possível atualizar o cache local do comércio:',error)}}

export function getCommerceState(){return {...state,waiting:[...state.waiting],notifications:[...state.notifications],products:[...state.products]}}

function saveUserData(extra={}){
  if(!state.user)return Promise.resolve();
  writeLocal();
  const uid=state.user.uid;
  const payload={
    carrinhoEspera:state.waiting.map(item=>({...item})),
    notificacoes:state.notifications.map(item=>({...item})),
    ...extra
  };
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
    try{
      await setDoc(doc(db,'usuarios',uid),{
        ...payload,
        comercioAtualizadoEm:serverTimestamp()
      },{merge:true});
    }catch(error){
      console.warn('Carrinho salvo localmente; sincronização Firebase indisponível:',error);
    }
  });
  return saveQueue;
}

async function syncRestocks(){
  let changed=false;
  const productMap=new Map(state.products.map(product=>[product.id,product]));
  const nextWaiting=[];
  for(const item of state.waiting){
    const product=productMap.get(item.productId);
    const available=stockOf(product)>0;
    if(available){
      const alreadyNotified=state.notifications.some(notification=>notification.type==='restock'&&notification.productId===item.productId);
      if(!alreadyNotified){
        state.notifications.unshift({id:`restock-${item.productId}-${Date.now()}`,type:'restock',productId:item.productId,title:'Produto disponível novamente',message:`${product?.nome||item.nome||'Seu produto'} voltou ao estoque.`,image:(Array.isArray(product?.imagens)&&product.imagens[0])||product?.imagem||item.image||'',createdAt:now(),read:false});
      }
      changed=true;
      continue;
    }
    nextWaiting.push({...item,disponivel:false,notificadoDisponivel:false});
  }
  if(nextWaiting.length!==state.waiting.length)changed=true;
  state.waiting=nextWaiting;
  state.notifications=state.notifications.slice(0,50);
  if(changed){writeLocal();emit();await saveUserData()}
}

export async function initMemberCommerce(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    const session=await window.WDSession.ready;
    if(session.status!=='ready')return getCommerceState();
    state.user=session.user;
    const local=readLocal(state.user.uid);
    let remote={};
    try{const userSnap=await getDoc(doc(db,'usuarios',state.user.uid));remote=userSnap.exists()?userSnap.data():{}}catch(error){console.warn('Usando carrinho local:',error)}
    state.waiting=Object.prototype.hasOwnProperty.call(remote,'carrinhoEspera')?safeArray(remote.carrinhoEspera):safeArray(local.waiting);
    state.notifications=Object.prototype.hasOwnProperty.call(remote,'notificacoes')?safeArray(remote.notificacoes):safeArray(local.notifications);
    try{const productsSnap=await getDocs(collection(db,'ofertas'));state.products=productsSnap.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.tipo==='produto'&&item.ativo!==false)}catch(error){console.error('Não foi possível consultar estoque para notificações:',error);state.products=[]}
    await syncRestocks();
    state.ready=true;
    writeLocal();
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
    state.waiting.unshift({productId:product.id,nome:product.nome||'Produto',image,addedAt:now(),disponivel:false,notificadoDisponivel:false});
    writeLocal();emit();await saveUserData();
  }
}

export async function removeFromWaiting(productId){
  await initMemberCommerce();
  const previousLength=state.waiting.length;
  state.waiting=state.waiting.filter(item=>item.productId!==productId);
  if(state.waiting.length===previousLength)return;
  writeLocal();emit();await saveUserData();
}

export async function removeNotification(notificationId){
  await initMemberCommerce();
  const previousLength=state.notifications.length;
  state.notifications=state.notifications.filter(item=>item.id!==notificationId);
  if(state.notifications.length===previousLength)return;
  writeLocal();emit();await saveUserData();
}

export async function markNotificationsRead(){
  await initMemberCommerce();
  let changed=false;
  state.notifications=state.notifications.map(item=>{if(item.read)return item;changed=true;return {...item,read:true}});
  if(!changed){emit();return}
  writeLocal();emit();await saveUserData();
}
