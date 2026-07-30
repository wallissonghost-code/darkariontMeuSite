import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const formLogin = document.getElementById("formLogin");
const formCadastro = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");

function mostrarMensagem(texto, erro = false) {
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.className = erro ? "mensagem erro" : "mensagem sucesso";
}

function traduzirErro(codigo) {
  const erros = {
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta. Tente entrar.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Confira sua internet.",
    "auth/operation-not-allowed": "O cadastro por e-mail ainda não foi ativado no Firebase.",
    "auth/unauthorized-domain": "O domínio do GitHub Pages ainda não foi autorizado no Firebase.",
    "permission-denied": "A conta foi criada, mas o Firestore bloqueou o cadastro dos dados. Publique as regras do banco."
  };
  return erros[codigo] || `Erro do Firebase: ${codigo || "desconhecido"}`;
}

if (formLogin) {
  formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const botao = formLogin.querySelector("button");
    botao.disabled = true;
    botao.textContent = "Entrando...";
    mostrarMensagem("");

    try {
      const credencial = await signInWithEmailAndPassword(auth, email, senha);
      const referencia = doc(db, "usuarios", credencial.user.uid);
      const usuarioDoc = await getDoc(referencia);
      if (!usuarioDoc.exists()) {
        await setDoc(referencia, {
          nome: credencial.user.displayName || "Cliente Founder",
          email: credencial.user.email,
          role: "cliente",
          vip: 0,
          carimbos: 0,
          creditos: 0,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        });
      }
      window.location.href = "home.html";
    } catch (erro) {
      console.error("Erro no login:", erro);
      mostrarMensagem(traduzirErro(erro.code), true);
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  });
}

if (formCadastro) {
  formCadastro.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmar = document.getElementById("confirmar").value;
    const botao = formCadastro.querySelector("button");

    if (nome.length < 2) return mostrarMensagem("Digite seu nome completo.", true);
    if (senha !== confirmar) return mostrarMensagem("As senhas não são iguais.", true);

    botao.disabled = true;
    botao.textContent = "Criando conta...";
    mostrarMensagem("");

    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(credencial.user, { displayName: nome });
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nome,
        email,
        role: "cliente",
        vip: 0,
        carimbos: 0,
        creditos: 0,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });
      mostrarMensagem("Conta criada com sucesso.");
      setTimeout(() => window.location.href = "home.html", 700);
    } catch (erro) {
      console.error("Erro no cadastro:", erro);
      mostrarMensagem(traduzirErro(erro.code), true);
      botao.disabled = false;
      botao.textContent = "Cadastrar";
    }
  });
}