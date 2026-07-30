import { protegerPagina } from "./app.js";

protegerPagina({
  aoCarregar: async (_usuario, dados) => {
    const nome = document.getElementById("nomeUsuario");
    if (nome && dados?.nome) nome.textContent = dados.nome;
  }
});
