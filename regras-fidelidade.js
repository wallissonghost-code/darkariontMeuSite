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
  if(!proximo){return {vip:10,nome:atual.nome,carimbos:10,valorCarimbo:0,totalGasto:total,faltam:0,proximo:null};}
  const faixa=proximo.minimo-atual.minimo;
  const valorCarimbo=faixa/10;
  const gastoNaFaixa=Math.max(0,total-atual.minimo);
  const carimbos=Math.max(0,Math.min(9,Math.floor(gastoNaFaixa/valorCarimbo)));
  const faltam=Math.max(0,proximo.minimo-total);
  return {vip:indice,nome:atual.nome,carimbos,valorCarimbo,totalGasto:total,faltam,proximo};
}

export function descreverRegra(totalGasto){
  const r=calcularFidelidade(totalGasto);
  if(!r.proximo)return 'Nível máximo alcançado';
  return `Cada carimbo neste nível exige ${money(r.valorCarimbo)} em compras.`;
}
