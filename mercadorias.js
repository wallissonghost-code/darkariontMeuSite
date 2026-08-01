import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const grid = document.getElementById('productsGrid');
const search = document.getElementById('storeSearch');
const category = document.getElementById('storeCategory');
const dialog = document.getElementById('productDialog');
const dialogContent = document.getElementById('dialogContent');

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
let items = [];

function imagesOf(product) {
  const list = Array.isArray(product.imagens) && product.imagens.length ? product.imagens : (product.imagem ? [product.imagem] : []);
  return [...new Set(list.filter(Boolean))].slice(0, 5);
}
function sizesOf(product) { return Array.isArray(product.tamanhos) ? product.tamanhos.filter(Boolean) : []; }
function discountOf(product) {
  const oldPrice = Number(product.precoAntigo || 0), price = Number(product.preco || 0);
  return oldPrice > price && oldPrice > 0 ? Math.round((1 - price / oldPrice) * 100) : 0;
}

function render() {
  const term = search.value.trim().toLowerCase();
  const selectedCategory = category.value;
  const filtered = items.filter(product => {
    const text = `${product.nome || ''} ${product.categoria || ''} ${product.descricao || ''}`.toLowerCase();
    return product.ativo !== false && (!selectedCategory || product.categoria === selectedCategory) && (!term || text.includes(term));
  });

  grid.innerHTML = filtered.map(product => {
    const images = imagesOf(product);
    const discount = discountOf(product);
    const image = images[0]
      ? `<img src="${esc(images[0])}" alt="${esc(product.nome || 'Mercadoria')}" loading="lazy" onerror="this.parentElement.classList.add('no-image');this.remove()">`
      : '<span class="product-placeholder">WD</span>';
    return `
      <article class="product-card" data-open-product="${esc(product.id)}" tabindex="0" role="button" aria-label="Ver ${esc(product.nome || 'produto')}">
        <div class="product-media ${images[0] ? '' : 'no-image'}">
          ${image}
          <div class="product-media-top">
            ${product.selo ? `<span class="product-badge">${esc(product.selo)}</span>` : ''}
            ${discount ? `<span class="product-discount">-${discount}%</span>` : ''}
          </div>
          ${images.length > 1 ? `<span class="photo-count">${images.length} fotos</span>` : ''}
        </div>
        <div class="product-body">
          <span class="product-category">${esc(product.categoria || 'WD Founder')}</span>
          <h3 class="product-title">${esc(product.nome || 'Mercadoria')}</h3>
          <div class="product-price-row">
            <div class="product-price">
              ${Number(product.precoAntigo || 0) > Number(product.preco || 0) ? `<del>${money(product.precoAntigo)}</del>` : ''}
              <strong>${money(product.preco)}</strong>
            </div>
            <span class="product-stock">${Math.max(0, Number(product.estoque) || 0)} un.</span>
          </div>
        </div>
      </article>`;
  }).join('') || '<div class="store-empty">Nenhuma mercadoria encontrada.</div>';
}

function openProduct(id) {
  const product = items.find(item => item.id === id);
  if (!product) return;
  const images = imagesOf(product), sizes = sizesOf(product), discount = discountOf(product);
  const gallery = images.length ? `
    <div class="detail-gallery">
      <div class="detail-thumbs">
        ${images.map((src, i) => `<button type="button" data-thumb="${i}" class="${i === 0 ? 'active' : ''}"><img src="${esc(src)}" alt="Miniatura ${i + 1}"></button>`).join('')}
      </div>
      <div class="detail-main-media">
        <div class="detail-slider">
          ${images.map((src, i) => `<figure><img src="${esc(src)}" alt="${esc(product.nome || 'Produto')} - foto ${i + 1}"></figure>`).join('')}
        </div>
        ${images.length > 1 ? `<button class="gallery-arrow gallery-prev" type="button" aria-label="Foto anterior">‹</button><button class="gallery-arrow gallery-next" type="button" aria-label="Próxima foto">›</button><span class="detail-counter">1/${images.length}</span>` : ''}
      </div>
    </div>` : '<div class="detail-gallery no-image"><div class="detail-main-media"><span class="product-placeholder">WD</span></div></div>';

  const contact = product.link
    ? `<a class="detail-primary" href="${esc(product.link)}" target="_blank" rel="noopener">${esc(product.botao || 'Falar sobre este item')}</a>`
    : '<button class="detail-primary" type="button" id="noContact">Consultar disponibilidade</button>';

  dialogContent.innerHTML = `
    <div class="product-detail-layout">
      ${gallery}
      <section class="detail-info">
        <div class="detail-meta-row">
          <span class="product-category">${esc(product.categoria || 'WD Founder')}</span>
          ${product.selo ? `<span class="detail-badge">${esc(product.selo)}</span>` : ''}
        </div>
        <h2>${esc(product.nome || 'Mercadoria')}</h2>
        <p class="detail-description">${esc(product.descricao || 'Produto selecionado da coleção WD Founder.')}</p>
        <div class="detail-price-block">
          ${Number(product.precoAntigo || 0) > Number(product.preco || 0) ? `<del>${money(product.precoAntigo)}</del>` : ''}
          <div><strong>${money(product.preco)}</strong>${discount ? `<span>-${discount}%</span>` : ''}</div>
        </div>
        <div class="detail-stock"><span></span>${Math.max(0, Number(product.estoque) || 0)} unidades disponíveis</div>
        ${sizes.length ? `<div class="detail-sizes"><strong>Escolha o tamanho</strong><div>${sizes.map((size, i) => `<button type="button" class="${i === 0 ? 'selected' : ''}">${esc(size)}</button>`).join('')}</div></div>` : ''}
        <div class="detail-actions">${contact}<button class="detail-secondary" type="button" id="closeDetail">Continuar vendo produtos</button></div>
      </section>
    </div>`;

  dialog.showModal();
  const slider = dialogContent.querySelector('.detail-slider');
  const thumbs = [...dialogContent.querySelectorAll('[data-thumb]')];
  const counter = dialogContent.querySelector('.detail-counter');
  let current = 0;
  const goTo = index => {
    if (!slider || !images.length) return;
    current = (index + images.length) % images.length;
    slider.scrollTo({ left: slider.clientWidth * current, behavior: 'smooth' });
    thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === current));
    if (counter) counter.textContent = `${current + 1}/${images.length}`;
  };
  slider?.addEventListener('scroll', () => {
    current = Math.round(slider.scrollLeft / (slider.clientWidth || 1));
    thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === current));
    if (counter) counter.textContent = `${current + 1}/${images.length}`;
  }, { passive: true });
  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => goTo(index)));
  dialogContent.querySelector('.gallery-prev')?.addEventListener('click', () => goTo(current - 1));
  dialogContent.querySelector('.gallery-next')?.addEventListener('click', () => goTo(current + 1));
  dialogContent.querySelectorAll('.detail-sizes button').forEach(button => button.addEventListener('click', () => {
    dialogContent.querySelectorAll('.detail-sizes button').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
  }));
  dialogContent.querySelector('#closeDetail')?.addEventListener('click', () => dialog.close());
  dialogContent.querySelector('#noContact')?.addEventListener('click', () => alert('Este item ainda não possui WhatsApp ou link cadastrado.'));
  dialog.onkeydown = event => {
    if (event.key === 'ArrowLeft') goTo(current - 1);
    if (event.key === 'ArrowRight') goTo(current + 1);
  };
}

try {
  const snapshot = await getDocs(collection(db, 'ofertas'));
  items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(product => product.tipo === 'produto').sort((a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999));
  const categories = [...new Set(items.map(product => product.categoria).filter(Boolean))].sort();
  category.innerHTML = '<option value="">Todas as categorias</option>' + categories.map(item => `<option>${esc(item)}</option>`).join('');
  render();
} catch (error) {
  console.error(error);
  grid.innerHTML = `<div class="store-empty">Não foi possível carregar as mercadorias agora.<small>${esc(error.code || '')}</small></div>`;
}

search.addEventListener('input', render);
category.addEventListener('change', render);
grid.addEventListener('click', event => { const card = event.target.closest('[data-open-product]'); if (card) openProduct(card.dataset.openProduct); });
grid.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-product]')) { event.preventDefault(); openProduct(event.target.dataset.openProduct); } });
document.getElementById('dialogClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });