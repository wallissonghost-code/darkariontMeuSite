// Inicializa Publicar mercadorias somente depois que a sessão administrativa estiver pronta.
const esperar=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

async function aguardarSessao(limiteMs=8000){
  const inicio=Date.now();
  while(!window.WDSession?.ready){
    if(Date.now()-inicio>limiteMs)throw new Error('Sessão não foi criada a tempo.');
    await esperar(50);
  }
  return window.WDSession.ready;
}

async function iniciarPublicacao(){
  const status=document.getElementById('productStatus');
  try{
    const state=await aguardarSessao();
    if(state?.status!=='ready')throw new Error('Não foi possível confirmar a sessão administrativa.');
    await import('./mercadorias-admin.js?v=20260801-2337');
  }catch(error){
    console.error('[WD] Falha ao iniciar Publicar mercadorias:',error);
    if(status){
      status.innerHTML='Não foi possível iniciar o cadastro. <button type="button" id="retryStoreAdmin">Tentar novamente</button>';
      document.getElementById('retryStoreAdmin')?.addEventListener('click',()=>location.reload(),{once:true});
    }
  }
}

iniciarPublicacao();
