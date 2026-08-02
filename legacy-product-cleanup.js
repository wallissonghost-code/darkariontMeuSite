import { db } from './firebase.js';
import { collection,getDocs,deleteDoc,doc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
const normalize=value=>String(value||'').trim().toLocaleLowerCase('pt-BR');
const targets=new Set(['casaco liso','teste 2 nike']);
try{
  const snapshot=await getDocs(collection(db,'produtos'));
  const matches=snapshot.docs.filter(item=>targets.has(normalize(item.data()?.nome)));
  await Promise.all(matches.map(item=>deleteDoc(doc(db,'produtos',item.id))));
  if(matches.length)console.info(`[WD] ${matches.length} produto(s) legado(s) removido(s).`);
}catch(error){
  console.warn('[WD] Limpeza do estoque legado não pôde ser concluída.',error?.code||error);
}
