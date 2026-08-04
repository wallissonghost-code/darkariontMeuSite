import {auth,db} from './firebase.js';
import {doc,getDoc,setDoc,serverTimestamp,collection,addDoc} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const status=$('rankAdminStatus');
const fields={weekly:[$('weekly1'),$('weekly2'),$('weekly3')],monthly:[$('monthly1'),$('monthly2'),$('monthly3')]};
const defaults={weekly:['Premiação em definição','Premiação em definição','Premiação em definição'],monthly:['Premiação em definição','Premiação em definição','Premiação em definição']};
function clean(value){return String(value||'').replace(/\s+/g,' ').trim()}
async function load(){try{const snap=await getDoc(doc(db,'configuracoes','rank'));const data=snap.exists()?snap.data():{};for(const cycle of ['weekly','monthly']){const values=Array.isArray(data[cycle])?data[cycle]:defaults[cycle];fields[cycle].forEach((field,index)=>field.value=values[index]||'')}status.textContent=snap.exists()?'Premiações atuais carregadas.':'Defina as primeiras premiações.'}catch(error){console.error(error);status.textContent='Não foi possível carregar as premiações.'}}
async function save(event){event.preventDefault();const weekly=fields.weekly.map(field=>clean(field.value)||'Premiação em definição');const monthly=fields.monthly.map(field=>clean(field.value)||'Premiação em definição');status.textContent='Salvando...';try{await setDoc(doc(db,'configuracoes','rank'),{minimumSpend:500,weekly,monthly,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.uid||''},{merge:true});await addDoc(collection(db,'logs'),{tipo:'rank_premiacoes_atualizadas',weekly,monthly,adminUid:auth.currentUser?.uid||'',criadoEm:serverTimestamp()});status.textContent='Premiações salvas. O Rank já usará os novos valores.'}catch(error){console.error(error);status.textContent='Não foi possível salvar as premiações.'}}
$('rankRewardsForm').addEventListener('submit',save);load();