const root=document.querySelector('[data-view="store"]');
if(root){
  const normalizeStock=()=>root.querySelectorAll('.product-stock').forEach(node=>{
    const number=(node.textContent.match(/\d+/)||[])[0];
    if(number)node.textContent=`Estoque: ${number}`;
  });
  normalizeStock();
  new MutationObserver(normalizeStock).observe(root.querySelector('#productsGrid')||root,{childList:true,subtree:true});
}
