import { db } from './firebase.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
const level=document.getElementById('adminLevel');const field=document.getElementById('adminBenefits');const status=document.getElementById('adminStatus');
async function load(){const id=level.value;const s=await getDoc(doc(db,'niveis',id));field.value=s.exists()&&Array.isArray(s.data().beneficios)?s.data().beneficios.join('\n'):'';status.textContent='';}
async function save(){const beneficios=field.value.split('\n').map(x=>x.trim()).filter(Boolean);await setDoc(doc(db,'niveis',level.value),{beneficios,atualizadoEm:new Date().toISOString()},{merge:true});status.textContent='Benefícios salvos com sucesso.';}
level.addEventListener('change',load);document.getElementById('saveBenefits').addEventListener('click',save);load();