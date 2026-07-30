import { auth, db } from './firebase.js';
import { onAuthStateChanged, updateProfile, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const names=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const themes=[['#b87333','#55280f','#fff'],['#e8e8e8','#858585','#161616'],['#d4af37','#765508','#17120a'],['#8d62ef','#341477','#fff'],['#f1f2f3','#969da3','#111'],['#2471e8','#07316f','#fff'],['#333','#050505','#fff'],['#d14455','#6a0e1b','#fff'],['#3256b8','#10235d','#fff'],['#d8ad45','#76510b','#17110a']];

const form=document.getElementById('profileForm');
const status=document.getElementById('profileStatus');
const nomeInput=document.getElementById('nome');
const telefoneInput=document.getElementById('telefone');
const perfilNome=document.getElementById('perfilNome');
const perfilEmail=document.getElementById('perfilEmail');
const perfilNivel=document.getElementById('perfilNivel');
const perfilTelefone=document.getElementById('perfilTelefone');
const avatar=document.querySelector('.avatar');
const resetPassword=document.getElementById('resetPassword');
let currentUser=null;
let unsubscribeProfile=null;
let formDirty=false;

function msg(texto,erro=false){status.textContent=texto;status.style.color=erro?'#a83d32':'var(--gold)'}
function iniciais(nome){return String(nome||'WD').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'WD'}
function aplicarNivel(vip){
  perfilNivel.textContent=`LV${vip+1} — ${names[vip]}`;
  const box=perfilNivel.closest('.profile-field');
  if(!box)return;
  const [a,b,t]=themes[vip];
  box.style.background=`linear-gradient(135deg,${a},${b})`;
  box.style.color=t;
  box.style.borderColor='rgba(255,255,255,.28)';
  box.classList.add('level-highlight');
}
function renderProfile(user,data){
  const vip=Math.max(0,Math.min(9,Number(data.vip)||0));
  const nome=data.nome||user.displayName||'Cliente Founder';
  const telefone=data.telefone||'';
  perfilNome.textContent=nome;
  perfilEmail.textContent=user.email||data.email||'Conta autenticada';
  perfilTelefone.textContent=telefone||'Não informado';
  if(!formDirty){nomeInput.value=nome==='Cliente Founder'?'':nome;telefoneInput.value=telefone}
  if(avatar)avatar.textContent=iniciais(nome);
  aplicarNivel(vip);
}

nomeInput.addEventListener('input',()=>formDirty=true);
telefoneInput.addEventListener('input',()=>formDirty=true);

onAuthStateChanged(auth,async user=>{
  if(!user){location.replace('index.html');return}
  currentUser=user;
  unsubscribeProfile?.();
  const ref=doc(db,'usuarios',user.uid);
  unsubscribeProfile=onSnapshot(ref,async snap=>{
    const data=snap.exists()?snap.data():{};
    renderProfile(user,data);
    if(!snap.exists()){
      await setDoc(ref,{nome:user.displayName||'Cliente Founder',email:user.email||'',telefone:'',role:'cliente',vip:0,carimbos:0,creditos:0,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()},{merge:true});
    }
  },error=>{console.error('Erro ao acompanhar perfil:',error);msg('Não foi possível sincronizar os dados da conta.',true)});
});

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!currentUser)return;
  const nome=nomeInput.value.trim();
  const telefone=telefoneInput.value.trim();
  if(nome.length<2)return msg('Informe um nome válido.',true);
  const botao=form.querySelector('button[type="submit"]');
  try{
    botao.disabled=true;botao.textContent='Salvando...';
    await updateProfile(currentUser,{displayName:nome});
    await setDoc(doc(db,'usuarios',currentUser.uid),{nome,telefone,email:currentUser.email||'',atualizadoEm:serverTimestamp()},{merge:true});
    formDirty=false;
    msg('Dados salvos permanentemente na sua conta.');
  }catch(error){console.error('Erro ao salvar perfil:',error);msg('Não foi possível salvar agora. Verifique as regras do Firestore.',true)}
  finally{botao.disabled=false;botao.textContent='Salvar alterações'}
});

resetPassword.addEventListener('click',async()=>{
  if(!currentUser?.email)return;
  try{await sendPasswordResetEmail(auth,currentUser.email);msg('Enviamos o link de alteração de senha para seu e-mail.')}
  catch(error){console.error(error);msg('Não foi possível enviar o link de senha.',true)}
});
