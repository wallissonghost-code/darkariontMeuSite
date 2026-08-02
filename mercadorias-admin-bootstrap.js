// Inicializa Publicar mercadorias somente depois que a sessão administrativa estiver pronta.
async function iniciarPublicacao(){
  const status=document.getElementById('productStatus');
  try{
    if(!window.WDSession?.ready)throw new Error('Sessão ainda não inicializada.');
    const state=await window.WDSession.ready;
    if(state?.status!=='ready')throw new Error('Não foi possível confirmar a sessão administrativa.');
    await import('./mercadorias-admin.js?v=20260801-2335');
  }catch(error){
    console.error('[WD] Falha ao iniciar Publicar mercadorias:',error);
    if(status){
      status.innerHTML='Não foi possível iniciar o cadastro. <button type="button" id="retryStoreAdmin">Tentar novamente</button>';
      document.getElementById('retryStoreAdmin')?.addEventListener('click',()=>location.reload(),{once:true});
    }
  }
}

iniciarPublicacao();
