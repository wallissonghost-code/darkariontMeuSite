import './tab-lifecycle.js';
import { auth, db } from './firebase.js';
import { onAuthStateChanged, updateProfile, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc,onSnapshot,setDoc,serverTimestamp,collection,getDocs,query,where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { calcularFidelidade } from './regras-fidelidade.js';

const names=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const themes=[['#82705a','#29231d','#fff'],['#b87333','#55280f','#fff'],['#e8e8e8','#858585','#161616'],['#d4af37','#765508','#17120a'],['#8d62ef','#341477','#fff'],['#f1f2f3','#969da3','#111'],['#2471e8','#07316f','#fff'],['#333','#050505','#fff'],['#d14455','#6a0e1b','#fff'],['#3256b8','#10235d','#fff'],['#d8ad45','#76510b','#17110a']];
const form=document.getElementById('profileForm'),status=document.getElementById('profileStatus'),nomeInput=document.getElementById('nome'),telefoneInput=document.getElementById('telefone'),perfilNome=document.getElementById('perfilNome'),perfilEmail=document.getElementById('perfilEmail'),perfilNivel=document.getElementById('perfilNivel'),perfilTelefone=document.getElementById('perfilTelefone'),avatar=document.querySelector('.avatar'),resetPassword=document.getElementById('resetPassword'),darkModeToggle=document.getElementById('darkModeToggle');
let currentUser=null,unsubscribeProfile=null,unsubscribeAuth=null,formDirty=false,themeBusy=false,pendingTheme=null,vipCalculado=0,lastProfileData=null,starting=false;
const canRender=()=>window.AppFirebase?.canRender?.()!==false;
function msg(texto,erro=false){if(!canRender())return;status.textContent=texto;status.style.color=erro?'#d56a60':'var(--gold)'}
function iniciais(nome){return String(nome||'WD').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'WD'}
function aplicarNivel(vip){if(!canRender())return;const idx=Math.max(0,Math.min(10,Number(vip)||0));perfilNivel.textContent=`LV${idx} — ${names[idx]}`;const box=perfilNivel.closest('.profile-field');if(!box)return;const [a,b,t]=themes[idx];box.style.background=`linear-gradient(135deg,${a},${b})`;box.style.color=t;box.style.borderColor='rgba(255,255,255,.28)';box.classList.add('level-highlight')}
function temaLocal(uid){const value=localStorage.getItem(`wd-theme:${uid}`)||localStorage.getItem('wd-theme');return value==='dark'?'dark':value==='light'?'light':null}
function valorFidelidade(compra){return Math.max(0,Number(compra.valorFidelidade ?? compra.valorPago ?? compra.valor)||0)}
async function calcularVipReal(uid){const snap=await getDocs(query(collection(db,'compras'),where('clienteId','==',uid)));const total=snap.docs.reduce((s,d)=>s+valorFidelidade(d.data()),0);return calcularFidelidade(total)}
function renderProfile(user,data){if(!canRender())return;const vip=vipCalculado,nome=data.nome||user.displayName||'Cliente Founder',telefone=data.telefone||'',tema=pendingTheme||(data.tema==='dark'||data.tema==='light'?data.tema:temaLocal(user.uid)||'light');perfilNome.textContent=nome;perfilEmail.textContent=user.email||data.email||'Conta autenticada';perfilTelefone.textContent=telefone||'Não informado';if(!formDirty){nomeInput.value=nome==='Cliente Founder'?'':nome;telefoneInput.value=telefone}if(avatar)avatar.textContent=iniciais(nome);if(!themeBusy)darkModeToggle.checked=tema==='dark';window.aplicarTemaWD?.(tema,user.uid);aplicarNivel(vip)}

async function startProfile(){
  if(starting||!currentUser||!window.AppFirebase?.active)return;
  starting=true;unsubscribeProfile?.();unsubscribeProfile=null;
  try{const calc=await calcularVipReal(currentUser.uid);if(!window.AppFirebase?.active)return;vipCalculado=calc.vip}catch(error){if(canRender())console.error('Erro ao calcular nível real:',error)}finally{starting=false}
  if(!currentUser||!window.AppFirebase?.active)return;
  const ref=doc(db,'usuarios',currentUser.uid);
  unsubscribeProfile=onSnapshot(ref,async snap=>{
    lastProfileData=snap.exists()?snap.data():{};
    renderProfile(currentUser,lastProfileData);
    if(!snap.exists()&&window.AppFirebase?.active){await setDoc(ref,{nome:currentUser.displayName||'Cliente Founder',email:currentUser.email||'',telefone:'',role:'cliente',vip:vipCalculado,carimbos:0,creditos:0,totalGasto:0,tema:temaLocal(currentUser.uid)||'light',criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()},{merge:true})}
  },error=>{if(canRender()){console.error('Erro ao acompanhar perfil:',error);msg('Não foi possível sincronizar os dados da conta.',true)}});
}
function stopProfile(){unsubscribeProfile?.();unsubscribeProfile=null;starting=false}

nomeInput.addEventListener('input',()=>formDirty=true);telefoneInput.addEventListener('input',()=>formDirty=true);
darkModeToggle.addEventListener('change',async()=>{if(!currentUser||themeBusy||!window.AppFirebase?.active)return;const tema=darkModeToggle.checked?'dark':'light',anterior=tema==='dark'?'light':'dark';pendingTheme=tema;window.aplicarTemaWD?.(tema,currentUser.uid);themeBusy=true;darkModeToggle.disabled=true;try{await setDoc(doc(db,'usuarios',currentUser.uid),{tema,atualizadoEm:serverTimestamp()},{merge:true});localStorage.setItem(`wd-theme:${currentUser.uid}`,tema);localStorage.setItem('wd-theme',tema);msg(tema==='dark'?'Modo noturno ativado e salvo na sua conta.':'Modo claro ativado e salvo na sua conta.')}catch(error){console.error(error);pendingTheme=null;darkModeToggle.checked=anterior==='dark';window.aplicarTemaWD?.(anterior,currentUser.uid);msg('Não foi possível salvar a preferência de aparência.',true)}finally{themeBusy=false;darkModeToggle.disabled=false;setTimeout(()=>{pendingTheme=null},800)}});

unsubscribeAuth=onAuthStateChanged(auth,user=>{if(!user){stopProfile();if(window.AppFirebase?.active)location.replace('index.html');return}currentUser=user;if(window.AppFirebase?.active)startProfile()});
window.AppFirebase.register({start:()=>{if(lastProfileData&&currentUser)renderProfile(currentUser,lastProfileData);startProfile()},stop:stopProfile});

form.addEventListener('submit',async event=>{event.preventDefault();if(!currentUser||!window.AppFirebase?.active)return;const nome=nomeInput.value.trim(),telefone=telefoneInput.value.trim();if(nome.length<2)return msg('Informe um nome válido.',true);const botao=form.querySelector('button[type="submit"]');try{botao.disabled=true;botao.textContent='Salvando...';await updateProfile(currentUser,{displayName:nome});await setDoc(doc(db,'usuarios',currentUser.uid),{nome,telefone,email:currentUser.email||'',atualizadoEm:serverTimestamp()},{merge:true});formDirty=false;msg('Dados salvos permanentemente na sua conta.')}catch(error){console.error('Erro ao salvar perfil:',error);msg('Não foi possível salvar agora.',true)}finally{botao.disabled=false;botao.textContent='Salvar alterações'}});
resetPassword.addEventListener('click',async()=>{if(!currentUser?.email||!window.AppFirebase?.active)return;try{await sendPasswordResetEmail(auth,currentUser.email);msg('Enviamos o link de alteração de senha para seu e-mail.')}catch(error){console.error(error);msg('Não foi possível enviar o link de senha.',true)}});
window.addEventListener('pagehide',()=>{stopProfile();unsubscribeAuth?.();unsubscribeAuth=null},{once:true});
