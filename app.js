import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

export function protegerPagina({ admin = false, aoCarregar } = {}) {
  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      window.location.replace("index.html");
      return;
    }
    try {
      const snap = await getDoc(doc(db, "usuarios", usuario.uid));
      const dados = snap.exists() ? snap.data() : null;
      if (admin && (!dados || dados.role !== "admin")) {
        alert("Acesso permitido somente para administradores.");
        window.location.replace("home.html");
        return;
      }
      if (typeof aoCarregar === "function") await aoCarregar(usuario, dados);
    } catch (erro) {
      console.error("Erro ao carregar usuário:", erro);
      alert("Não foi possível carregar sua conta.");
    }
  });
}

export async function sair() {
  await signOut(auth);
  window.location.replace("index.html");
}

window.sair = sair;
