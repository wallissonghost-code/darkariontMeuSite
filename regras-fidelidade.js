export const NIVEIS=[
  {vip:0,nome:'MEMBRO',minimo:0},
  {vip:1,nome:'BRONZE',minimo:500},
  {vip:2,nome:'SILVER',minimo:1500},
  {vip:3,nome:'GOLD',minimo:2500},
  {vip:4,nome:'PREMIUM',minimo:4000},
  {vip:5,nome:'PLATINUM',minimo:6000},
  {vip:6,nome:'SELECT',minimo:9000},
  {vip:7,nome:'BLACK',minimo:13000},
  {vip:8,nome:'ELITE',minimo:18000},
  {vip:9,nome:'PRIME',minimo:25000},
  {vip:10,nome:'FOUNDER',minimo:35000}
];

export const BONUS_POR_NIVEL=100;
export const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export function calcularFidelidade(totalGasto){
  const total=Math.max(0,Number(totalGasto)||0);
  let indice=0;
  for(let i=0;i<NIVEIS.length;i++){
    if(total>=NIVEIS[i].minimo)indice=i;
    else break;
  }
  const atual=NIVEIS[indice];
  const proximo=NIVEIS[indice+1]||null;
  if(!proximo)return {vip:10,nome:atual.nome,carimbos:10,valorCarimbo:0,totalGasto:total,faltam:0,proximo:null};
  const faixa=proximo.minimo-atual.minimo;
  const valorCarimbo=faixa/10;
  const gastoNaFaixa=Math.max(0,total-atual.minimo);
  const carimbos=Math.max(0,Math.min(9,Math.floor(gastoNaFaixa/valorCarimbo)));
  return {vip:indice,nome:atual.nome,carimbos,valorCarimbo,totalGasto:total,faltam:Math.max(0,proximo.minimo-total),proximo};
}

export function totalEquivalenteNivel(vip=0,carimbos=0){
  const nivel=Math.max(0,Math.min(10,Number(vip)||0));
  if(nivel===10)return NIVEIS[10].minimo;
  const atual=NIVEIS[nivel];
  const proximo=NIVEIS[nivel+1];
  const faixa=proximo.minimo-atual.minimo;
  const selos=Math.max(0,Math.min(9,Number(carimbos)||0));
  return atual.minimo+(faixa/10)*selos;
}

export function resolverFidelidade(data={},totalCalculado=null){
  if(data.ajusteManualAtivo===true){
    const vip=Math.max(0,Math.min(10,Number(data.vip)||0));
    const carimbos=vip===10?10:Math.max(0,Math.min(9,Number(data.carimbos)||0));
    const equivalente=totalEquivalenteNivel(vip,carimbos);
    return {...calcularFidelidade(equivalente),vip,nome:NIVEIS[vip].nome,carimbos,totalGasto:Math.max(0,Number(data.totalGasto)||0),manual:true,totalEquivalente:equivalente};
  }
  return {...calcularFidelidade(totalCalculado??data.totalGasto),manual:false};
}

export function calcularCarteira(data={},novoVip=0){
  const vipAtual=Math.max(0,Math.min(10,Number(data.vip)||0));
  const baseSalva=Number(data.bonusBaseVip);
  const bonusBaseVip=Number.isFinite(baseSalva)?Math.max(0,Math.min(10,baseSalva)):vipAtual;
  const automaticoAnterior=Math.max(0,Number(data.bonusNivel)||0);
  const bonusManualSalvo=Number(data.bonusManual);
  const bonusManual=Number.isFinite(bonusManualSalvo)?Math.max(0,bonusManualSalvo):Math.max(0,(Number(data.creditos)||0)-automaticoAnterior);
  const bonusNivel=Math.max(0,(Math.max(0,Math.min(10,Number(novoVip)||0))-bonusBaseVip)*BONUS_POR_NIVEL);
  return {bonusBaseVip,bonusManual,bonusNivel,creditos:bonusManual+bonusNivel};
}

export function bonusDaEvolucao(vipAntes,vipDepois){
  return Math.max(0,(Number(vipDepois)||0)-(Number(vipAntes)||0))*BONUS_POR_NIVEL;
}

export function descreverRegra(totalGasto){
  const r=calcularFidelidade(totalGasto);
  if(!r.proximo)return 'Nível máximo alcançado';
  return `Cada carimbo neste nível exige ${money(r.valorCarimbo)} em compras.`;
}
