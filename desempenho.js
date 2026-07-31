import { db } from './firebase.js';
import { collection,getDocs,doc,updateDoc,serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const levels=['BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const asDate=v=>{try{return v?.toDate?v.toDate():new Date(v)}catch{return null}};
const sameDay=(a,b)=>a&&b&&a.toDateString()===b.toDateString();
const daysAgo=(d,n)=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-n);return x};
let members=[];

function classify(last){if(!last)return {key:'inactive',label:'INATIVO'};const diff=(Date.now()-last.getTime())/86400000;if(diff<=30)return {key:'active',label:'ATIVO'};if(diff<=60)return {key:'attention',label:'EM ATENÇÃO'};return {key:'inactive',label:'INATIVO'}}
function spendLabel(total){if(total>=5000)return 'ALTO VALOR';if(total>=1500)return 'RECORRENTE';if(total>0)return 'EM DESENVOLVIMENTO';return 'SEM COMPRAS'}
function dateLabel(d){return d?d.toLocaleDateString('pt-BR'):'Nenhuma compra'}
function calculate(purchases){const credits=purchases.reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);const totalStamps=purchases.reduce((s,p)=>s+Math.max(0,Number(p.carimbosGanhos)||Math.floor((Number(p.valor)||0)/100)),0);const vip=Math.min(9,Math.floor(totalStamps/10));const stamps=vip===9?Math.min(10,totalStamps-90):totalStamps%10;return {credits,totalStamps,vip,stamps}}

async function repairEmptyAccounts(users,purchases){
  const jobs=[];
  for(const u of users){
    const own=purchases.filter(p=>p.clienteId===u.id);
    if(own.length===0&&(Number(u.vip)||Number(u.carimbos)||Number(u.creditos))){
      jobs.push(updateDoc(doc(db,'usuarios',u.id),{vip:0,carimbos:0,creditos:0,atualizadoEm:serverTimestamp(),sincronizadoEm:serverTimestamp()}));
      u.vip=0;u.carimbos=0;u.creditos=0;
    }
  }
  if(jobs.length)await Promise.all(jobs);
}

async function load(){
  const [usersSnap,purchasesSnap]=await Promise.all([getDocs(collection(db,'usuarios')),getDocs(collection(db,'compras'))]);
  const purchases=purchasesSnap.docs.map(d=>({id:d.id,...d.data(),date:asDate(d.data().criadoEm)}));
  const users=usersSnap.docs.map(d=>({id:d.id,...d.data()}));
  await repairEmptyAccounts(users,purchases);
  members=users.map(u=>{
    const own=purchases.filter(p=>p.clienteId===u.id).sort((a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0));
    const calc=calculate(own),last=own[0]?.date||null;
    return {...u,purchases:own,totalSpent:calc.credits,lastPurchase:last,purchaseCount:own.length,activity:classify(last),calculatedVip:calc.vip,calculatedStamps:calc.stamps,calculatedCredits:calc.credits,isDifferent:(Number(u.vip)||0)!==calc.vip||(Number(u.carimbos)||0)!==calc.stamps||(Number(u.creditos)||0)!==calc.credits};
  });
  renderKpis(purchases);renderCharts(purchases);renderMembers();
}

function renderKpis(purchases){const now=new Date(),weekStart=daysAgo(now,6),monthStart=new Date(now.getFullYear(),now.getMonth(),1);const today=purchases.filter(p=>sameDay(p.date,now)),week=purchases.filter(p=>p.date&&p.date>=weekStart),month=purchases.filter(p=>p.date&&p.date>=monthStart),sum=a=>a.reduce((s,p)=>s+Number(p.valor||0),0);document.getElementById('revenueToday').textContent=money(sum(today));document.getElementById('salesToday').textContent=`${today.length} venda(s)`;document.getElementById('revenueWeek').textContent=money(sum(week));document.getElementById('salesWeek').textContent=`${week.length} venda(s)`;document.getElementById('revenueMonth').textContent=money(sum(month));document.getElementById('salesMonth').textContent=`${month.length} venda(s)`;document.getElementById('averageTicket').textContent=money(month.length?sum(month)/month.length:0);document.getElementById('activeMembers').textContent=members.filter(m=>m.activity.key==='active').length;document.getElementById('inactiveMembers').textContent=members.filter(m=>m.activity.key==='inactive').length}
function renderCharts(purchases){const now=new Date(),days=[];for(let i=6;i>=0;i--){const d=daysAgo(now,i),total=purchases.filter(p=>sameDay(p.date,d)).reduce((s,p)=>s+Number(p.valor||0),0);days.push({d,total})}const max=Math.max(1,...days.map(x=>x.total));document.getElementById('weekChart').innerHTML=days.map(x=>`<div class="day-bar"><div class="bar-track"><span class="bar-fill" style="height:${Math.max(3,(x.total/max)*100)}%"></span></div><strong>${x.d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</strong><span>${money(x.total)}</span></div>`).join('');const counts=levels.map((_,i)=>members.filter(m=>m.calculatedVip===i).length),levelMax=Math.max(1,...counts);document.getElementById('levelChart').innerHTML=counts.map((c,i)=>`<div class="level-row"><strong>LV${i+1} ${levels[i]}</strong><div class="level-track"><div class="level-fill" style="width:${(c/levelMax)*100}%"></div></div><span>${c}</span></div>`).join('')}

function renderMembers(){
  const q=document.getElementById('memberSearch').value.trim().toLowerCase(),status=document.getElementById('activityFilter').value,sort=document.getElementById('sortMembers').value;
  let list=members.filter(m=>{const hay=`${m.nome||''} ${m.email||''} ${m.telefone||''}`.toLowerCase();return (!q||hay.includes(q))&&(status==='all'||m.activity.key===status)});
  if(sort==='spent')list.sort((a,b)=>b.totalSpent-a.totalSpent);if(sort==='recent')list.sort((a,b)=>(b.lastPurchase?.getTime()||0)-(a.lastPurchase?.getTime()||0));if(sort==='name')list.sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));if(sort==='level')list.sort((a,b)=>b.calculatedVip-a.calculatedVip);
  document.getElementById('membersSummary').textContent=`${list.length} de ${members.length} membro(s) exibido(s)`;
  document.getElementById('membersList').innerHTML=list.length?list.map(m=>`<article class="member-card"><div class="member-top"><div><h3>${m.nome||'Cliente sem nome'}</h3><p>${m.email||'Sem e-mail'}${m.telefone?` · ${m.telefone}`:''}</p></div><span class="status-badge status-${m.activity.key}">${m.activity.label}</span></div>${m.isDifferent&&m.purchaseCount>0?'<div class="sync-warning">Atenção: o cadastro manual está diferente do histórico. Use “Corrigir conta” para revisar.</div>':''}<div class="member-meta"><div><span>Nível pelo histórico</span><strong>LV${m.calculatedVip+1} ${levels[m.calculatedVip]}</strong></div><div><span>Total gasto</span><strong>${money(m.totalSpent)}</strong></div><div><span>Compras</span><strong>${m.purchaseCount}</strong></div><div><span>Última compra</span><strong>${dateLabel(m.lastPurchase)}</strong></div></div><div class="member-meta"><div><span>Perfil</span><strong>${spendLabel(m.totalSpent)}</strong></div><div><span>Ticket médio</span><strong>${money(m.purchaseCount?m.totalSpent/m.purchaseCount:0)}</strong></div><div><span>Carimbos pelo histórico</span><strong>${m.calculatedStamps}/10</strong></div><div><span>Créditos pelo histórico</span><strong>${money(m.calculatedCredits)}</strong></div></div><div class="member-actions"><a class="open-admin" href="perfil-admin.html?cliente=${encodeURIComponent(m.id)}">Corrigir conta</a><a class="open-delete" href="excluir-cliente.html?cliente=${encodeURIComponent(m.id)}">Excluir conta</a></div></article>`).join(''):'<div class="loading-state">Nenhum membro encontrado com esses filtros.</div>';
}

document.getElementById('memberSearch').addEventListener('input',renderMembers);document.getElementById('activityFilter').addEventListener('change',renderMembers);document.getElementById('sortMembers').addEventListener('change',renderMembers);document.getElementById('refreshInsights').addEventListener('click',load);load().catch(error=>{console.error(error);document.getElementById('membersList').innerHTML='<div class="loading-state">Não foi possível carregar os dados. Verifique as regras administrativas do Firestore.</div>'});