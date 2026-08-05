import {auth,db,storage} from './firebase.js';
import {updateProfile} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {doc,setDoc,serverTimestamp,deleteField} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {ref,deleteObject} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';

const removeButton=document.getElementById('removeProfilePhoto');
const changeButton=document.getElementById('profilePhotoButton');
const image=document.getElementById('profileAvatarImage');
const initials=document.getElementById('profileAvatarInitials');
const status=document.getElementById('profileStatus');
let busy=false;

function message(text,error=false){if(!status)return;status.textContent=text;status.style.color=error?'#c94b4b':'var(--account-gold,#d4af37)'}
function initialsFor(name){return String(name||'WD').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD'}
function clearLocal(uid){try{localStorage.removeItem(`wd-profile-photo:${uid}`);localStorage.removeItem(`wd-user:${uid}`);localStorage.removeItem(`wd-profile:${uid}`)}catch{}}
function clearVisual(name){if(image){image.hidden=true;image.removeAttribute('src')}if(initials){initials.textContent=initialsFor(name);initials.hidden=false}}

removeButton?.addEventListener('click',async()=>{
  const state=window.WDSession?.state;
  const user=state?.user||auth.currentUser;
  const profile=state?.profile||{};
  if(!user||busy)return;
  const hasPhoto=Boolean(image?.src&&!image.hidden)||Boolean(profile.foto)||Boolean(user.photoURL)||Boolean(localStorage.getItem(`wd-profile-photo:${user.uid}`));
  if(!hasPhoto){message('Sua conta já está sem foto de perfil.');return}
  if(!confirm('Remover sua foto de perfil e voltar para as iniciais?'))return;
  busy=true;removeButton.disabled=true;if(changeButton)changeButton.disabled=true;removeButton.textContent='Removendo…';
  const name=profile.nome||user.displayName||'WD';
  try{
    clearLocal(user.uid);
    clearVisual(name);
    await Promise.allSettled([
      updateProfile(user,{photoURL:null}),
      setDoc(doc(db,'usuarios',user.uid),{foto:deleteField(),atualizadoEm:serverTimestamp()},{merge:true}),
      deleteObject(ref(storage,`usuarios/${user.uid}/perfil.jpg`))
    ]);
    document.dispatchEvent(new CustomEvent('wd-profile-photo-updated',{detail:{foto:'',uid:user.uid,removed:true}}));
    message('Foto removida. Agora seu perfil usa as iniciais.');
  }catch(error){
    console.error('Erro ao remover foto:',error);
    message('A foto foi removida neste aparelho, mas a sincronização online falhou.',true);
  }finally{
    busy=false;removeButton.disabled=false;if(changeButton)changeButton.disabled=false;removeButton.textContent='Remover foto';
  }
});

window.WDSession?.subscribe(state=>{
  if(state.status!=='ready')return;
  const hasPhoto=Boolean(state.profile?.foto||state.user?.photoURL||localStorage.getItem(`wd-profile-photo:${state.user.uid}`));
  if(removeButton)removeButton.hidden=!hasPhoto;
});
