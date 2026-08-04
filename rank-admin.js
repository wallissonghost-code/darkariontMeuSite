import {auth,db} from './firebase.js';
import {doc,getDoc,setDoc,serverTimestamp,collection,addDoc,getDocs,writeBatch} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {calcularFidelidade} from './regras-fidelidade.js';

const $=id=>document.getElementById(id);
const status=$('rankAdminStatus');
const fields={weekly:[$('weekly1'),$('weekly2'),$('weekly3')],monthly:[$('monthly1'),$('monthly2'),$('monthly3')]};
const defaults={weekly:['Premiação em definição','Premiação em definição','Premiação em definição'],monthly:['Premiação em definição','Premiação em definição','Premiação em definição']};
const ADMIN_ROLES=new Set(['admin','administrador','master']);
const FIXED_ADMINS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
function clean(value){return String(value||'').replace(/\s+/g,' ').trim()}
function hash(value,seed=2166136261){let result=seed;for(const char of String(value||'')){result^=char.charCodeAt(0);result=Math.imul(result,16777619)}return result>>>0}
function rankId(uid){const a=hash(uid).toString(36);const b=hash([...String(uid)].reverse().join(''),2246822519).toString(36);return `rank_${a}${b}`.slice(0,28)}
function initialOf(user){const source=String(user.nome||user.displayName||user.email||'W').trim();return (source.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/)?.[0]||'W').toUpperCase()}
function photoOf(user){for(const value of [user.foto,user.photoURL,user.photoUrl,user.fotoPerfil,user.fotoPerfilUrl,user.profilePhoto,user.avatar,user.avatarUrl,user.imagemPerfil,user.perfil?.foto,user.profile?.photoURL]){if(typeof value==='string'&&value.trim())return value.trim()}return ''}
function dateOf(value){if(value?.toDate)return value.toDate();if(value?.seconds)return new Date(Number(value.seconds)*1000);const date=new Date(value||0);return Number.isNaN(date.getTime())?new Date(0):date}
function weekKey(date=new Date()){const value=new Date(date);const day=(value.getDay()+6)%7;value.setHours(0,0,0,0);value.setDate(value.getDate()-day);return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`}
function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function purchaseValue(item){return Math.max(0,Number(item.valorFidelidade??item.valorPago??item.valor??0))}
function isAdminUser(uid,user){return FIXED_ADMINS.has(uid)||ADMIN_ROLES.has(String(user.role||'').toLowerCase())}

async function load(){try{let data={};const publicSnap=await getDoc(doc(db,'ofertas','__rank_config_public'));if(publicSnap.exists())data=publicSnap.data();else{const privateSnap=await getDoc(doc(db,'configuracoes','rank'));if(privateSnap.exists())data=privateSnap.data()}for(const cycle of ['weekly','monthly']){const values=Array.isArray(data[cycle])?data[cycle]:defaults[cycle];fields[cycle].forEach((field,index)=>field.value=values[index]||'')}status.textContent='Premiações carregadas. Sincronizando participantes...';await syncPublicRank();status.textContent='Premiações e participantes sincronizados.'}catch(error){console.error(error);status.textContent='Não foi possível carregar ou sincronizar o Rank.'}}

async function syncPublicRank(){
  const [usersSnap,purchasesSnap]=await Promise.all([getDocs(collection(db,'usuarios')),getDocs(collection(db,'compras'))]);
  const currentWeek=weekKey(),currentMonth=monthKey();
  const totals=new Map();
  purchasesSnap.docs.forEach(snapshot=>{const item=snapshot.data(),uid=String(item.clienteId||'');if(!uid)return;const current=totals.get(uid)||{weekSpent:0,monthSpent:0};const date=dateOf(item.criadoEm),value=purchaseValue(item);if(weekKey(date)===currentWeek)current.weekSpent+=value;if(monthKey(date)===currentMonth)current.monthSpent+=value;totals.set(uid,current)});
  let batch=writeBatch(db),count=0;
  const commitIfNeeded=async()=>{if(!count)return;await batch.commit();batch=writeBatch(db);count=0};
  for(const snapshot of usersSnap.docs){
    const user=snapshot.data(),spent=Math.max(0,Number(user.totalGasto)||0),admin=isAdminUser(snapshot.id,user);
    if(spent<500&&!admin)continue;
    const cycle=totals.get(snapshot.id)||{weekSpent:0,monthSpent:0};
    const realVip=calcularFidelidade(spent).vip;
    const manualVip=Math.max(0,Math.min(10,Number(user.vip)||0));
    const manualAdjusted=user.ajusteManualAtivo===true||manualVip!==realVip;
    batch.set(doc(db,'ofertas',rankId(snapshot.id)),{
      tipo:'rank_publico',
      initial:initialOf(user),
      photo:photoOf(user),
      realVip,
      manualVip,
      manualAdjusted,
      vip:realVip,
      admin,
      totalGasto:spent,
      weekKey:currentWeek,
      weekSpent:cycle.weekSpent,
      monthKey:currentMonth,
      monthSpent:cycle.monthSpent,
      updatedAt:serverTimestamp()
    },{merge:true});
    count++;
    if(count>=400)await commitIfNeeded();
  }
  await commitIfNeeded();
}

async function save(event){event.preventDefault();const weekly=fields.weekly.map(field=>clean(field.value)||'Premiação em definição');const monthly=fields.monthly.map(field=>clean(field.value)||'Premiação em definição');status.textContent='Salvando e sincronizando Rank...';try{const payload={tipo:'rank_config_publica',minimumSpend:500,weekly,monthly,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.uid||''};await Promise.all([setDoc(doc(db,'configuracoes','rank'),payload,{merge:true}),setDoc(doc(db,'ofertas','__rank_config_public'),payload,{merge:true})]);await syncPublicRank();await addDoc(collection(db,'logs'),{tipo:'rank_premiacoes_atualizadas',weekly,monthly,adminUid:auth.currentUser?.uid||'',criadoEm:serverTimestamp()});status.textContent='Premiações salvas e Rank público atualizado para todos os membros.'}catch(error){console.error(error);status.textContent='Não foi possível salvar ou sincronizar o Rank.'}}
$('rankRewardsForm').addEventListener('submit',save);load();
