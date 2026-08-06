/* Garante a inicialização do status mesmo se o evento de autenticação ocorreu antes do script */
(function bootSystemStatus(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    const role=document.documentElement.dataset.role;
    const ready=document.documentElement.dataset.authState==='ready'||document.body.classList.contains('wd-auth-ready');
    if(role==='admin'&&ready){
      document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{admin:true,role:'admin',replayed:true}}));
      clearInterval(timer);
      return;
    }
    if(attempts>=40)clearInterval(timer);
  },150);
})();
