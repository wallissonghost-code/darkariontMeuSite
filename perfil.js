import { protegerPagina } from "./app.js";

const niveis = ["BRONZE", "SILVER", "GOLD", "PREMIUM", "PLATINUM", "SELECT", "BLACK", "ELITE", "PRIME", "FOUNDER"];

protegerPagina({
  aoCarregar: async (usuario, dados) => {
    const vip = Math.min(9, Math.max(0, Number(dados?.vip || 0)));
    const carimbos = Math.min(10, Math.max(0, Number(dados?.carimbos || 0)));
    document.getElementById("perfilNome").textContent = dados?.nome || usuario.displayName || "Cliente Founder";
    document.getElementById("perfilEmail").textContent = usuario.email || dados?.email || "";
    document.getElementById("perfilNivel").textContent = `VIP ${vip + 1}`;
    document.getElementById("perfilNivelNome").textContent = niveis[vip];
    document.getElementById("perfilProgresso").textContent = `${carimbos} / 10 carimbos para evoluir`;
    document.getElementById("perfilBarra").style.width = `${carimbos * 10}%`;
    const iniciais = (dados?.nome || usuario.displayName || "WD").split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
    document.getElementById("perfilAvatar").textContent = iniciais;
  }
});
