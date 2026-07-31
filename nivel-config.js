export const LEVELS=[
  {level:0,name:'MEMBRO',min:0},
  {level:1,name:'BRONZE',min:500},
  {level:2,name:'SILVER',min:1500},
  {level:3,name:'GOLD',min:2500},
  {level:4,name:'PREMIUM',min:4000},
  {level:5,name:'PLATINUM',min:6000},
  {level:6,name:'SELECT',min:9000},
  {level:7,name:'BLACK',min:13000},
  {level:8,name:'ELITE',min:18000},
  {level:9,name:'PRIME',min:25000},
  {level:10,name:'FOUNDER',min:35000}
];

export function accountFromSpent(totalSpent){
  const total=Math.max(0,Number(totalSpent)||0);
  let current=LEVELS[0];
  for(const level of LEVELS){
    if(total>=level.min)current=level;
    else break;
  }
  if(current.level===10){
    return {vip:10,level:10,name:'FOUNDER',stamps:10,totalSpent:total,next:null,remaining:0,stampValue:0};
  }
  const next=LEVELS[current.level+1];
  const range=next.min-current.min;
  const spentInside=Math.max(0,total-current.min);
  const stampValue=range/10;
  const stamps=Math.max(0,Math.min(9,Math.floor(spentInside/stampValue)));
  return {vip:current.level,level:current.level,name:current.name,stamps,totalSpent:total,next,remaining:Math.max(0,next.min-total),stampValue};
}

export const moneyBR=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
