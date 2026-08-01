const params=new URLSearchParams(location.search);
const productId=params.get('product');

function openFocusedProduct(){
  if(!productId)return true;
  const card=document.querySelector(`[data-open-product="${CSS.escape(productId)}"]`);
  if(!card)return false;
  card.scrollIntoView({behavior:'smooth',block:'center'});
  window.setTimeout(()=>card.click(),260);
  params.delete('product');
  const next=`${location.pathname}?${params.toString()}`;
  history.replaceState(history.state,'',next.endsWith('?')?location.pathname:next);
  return true;
}

if(!openFocusedProduct()){
  const observer=new MutationObserver(()=>{if(openFocusedProduct())observer.disconnect()});
  observer.observe(document.getElementById('productsGrid')||document.body,{childList:true,subtree:true});
  window.setTimeout(()=>observer.disconnect(),10000);
}
