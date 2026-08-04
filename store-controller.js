import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const root = document.querySelector('[data-view="store"]');
if (!root) throw new Error('Tela da loja não encontrada.');

const grid = root.querySelector('#productsGrid');
const search = root.querySelector('#storeSearch');
const category = root.querySelector('#storeCategory');
const pagination = root.querySelector('#storePagination');
const resultCount = root.querySelector('#storeResultCount');
const dialog = root.querySelector('#productDialog');
const dialogContent = root.querySelector('#dialogContent');
const dialogClose = root.querySelector('#dialogClose');

const PAGE_SIZE = 20;
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

let products = [];
let storeConfig = {};
let currentPage = 1;
let currentProduct = null;

function imagesOf(product) {
  const images = Array.isArray(product.imagens) && product.imagens.length ? product.imagens : (product.imagem ? [product.imagem] : []);
  return [...new Set(images.filter(Boolean))].slice(0, 5);
}

function sizesOf(product) {
  if (product.estoquePorTamanho && typeof product.estoquePorTamanho === 'object') {
    return Object.entries(product.estoquePorTamanho).filter(([, quantity]) => Number(quantity) > 0);
  }
  const sizes = Array.isArray(product.tamanhos) ? product.tamanhos.filter(Boolean) : [];
  return sizes.map((size, index) => [size, index === 0 ? Math.max(0, Number(product.estoque) || 0) : 0]).filter(([, quantity]) => quantity > 0);
}

function stockOf(product) {
  const sizes = sizesOf(product);
  return sizes.length ? sizes.reduce((total, [, quantity]) => total + Number(quantity || 0), 0) : Math.max(0, Number(product.estoque) || 0);
}

function discountOf(product) {
  const oldPrice = Number(product.precoAntigo || 0);
  const price = Number(product.preco || 0);
  return oldPrice > price && oldPrice > 0 ? Math.round((1 - price / oldPrice) * 100) : 0;
}

function priorityOf(product) {
  const label = String(product.selo || product.status || '').toLowerCase();
  if (label.includes('tend')) return 0;
  if (discountOf(product) || label.includes('promo') || label.includes('oferta')) return 1;
  if (label.includes('novo') || label.includes('new') || label.includes('novidade')) return 2;
  return 3;
}

function timestampOf(product) {
  const value = product.criadoEm || product.createdAt || product.dataCriacao || product.atualizadoEm;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return Number(value.seconds) * 1000;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareProducts(a, b) {
  const priority = priorityOf(a) - priorityOf(b);
  if (priority) return priority;
  const aOrder = Number.isFinite(Number(a.ordem)) ? Number(a.ordem) : 999999;
  const bOrder = Number.isFinite(Number(b.ordem)) ? Number(b.ordem) : 999999;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return timestampOf(b) - timestampOf(a) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
}

function filteredProducts() {
  const term = clean(search?.value).toLowerCase();
  const selectedCategory = category?.value || '';
  return products.filter(product => {
    const searchable = `${product.nome || ''} ${product.categoria || ''} ${product.descricao || ''} ${product.selo || ''}`.toLowerCase();
    return product.ativo !== false && (!selectedCategory || product.categoria === selectedCategory) && (!term || searchable.includes(term));
  }).sort(compareProducts);
}

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), pages);
  if (total <= PAGE_SIZE) {
    pagination.hidden = true;
    pagination.innerHTML = '';
    return;
  }
  pagination.hidden = false;
  pagination.innerHTML = `<button type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Anterior</button><span>${currentPage} / ${pages}</span><button type="button" data-page="${currentPage + 1}" ${currentPage === pages ? 'disabled' : ''}>Próxima ›</button>`;
}

function cardTemplate(product) {
  const images = imagesOf(product);
  const discount = discountOf(product);
  const stock = stockOf(product);
  const image = images[0]
    ? `<img src="${esc(images[0])}" alt="${esc(product.nome || 'Mercadoria')}" loading="lazy">`
    : '<span class="product-placeholder">WD</span>';
  const oldPrice = Number(product.precoAntigo || 0) > Number(product.preco || 0) ? `<del>${money(product.precoAntigo)}</del>` : '';
  return `<button class="product-card" type="button" data-product-id="${esc(product.id)}" data-priority="${priorityOf(product)}" data-stock="${stock}" aria-label="Abrir ${esc(product.nome || 'produto')}"><span class="product-media ${images[0] ? '' : 'no-image'}">${image}<span class="product-media-top">${product.selo ? `<span class="product-badge">${esc(product.selo)}</span>` : ''}</span>${images.length > 1 ? `<span class="photo-count">${images.length} fotos</span>` : ''}</span><span class="product-body"><span class="product-category">${esc(product.categoria || 'WD Founder')}</span><span class="product-title">${esc(product.nome || 'Mercadoria')}</span><span class="product-price-row"><span class="product-price">${oldPrice}<span class="product-price-line"><strong>${money(product.preco)}</strong>${discount ? `<span class="product-discount-inline">-${discount}%</span>` : ''}</span></span><span class="product-stock">${stock} un.</span></span></span></button>`;
}

function renderProducts() {
  const list = filteredProducts();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), pages);
  const visible = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  resultCount.textContent = list.length === 1 ? '1 produto' : `${list.length} produtos`;
  grid.innerHTML = visible.length ? visible.map(cardTemplate).join('') : '<div class="store-empty">Nenhuma mercadoria encontrada.</div>';
  renderPagination(list.length);
}

function whatsappUrl(product, size = '') {
  const phone = String(storeConfig.whatsappCompleto || '').replace(/\D/g, '');
  if (phone.length < 12 || phone.length > 13) return '';
  const greeting = clean(storeConfig.whatsappMensagem) || 'Olá! Tenho interesse neste produto:';
  const message = [greeting, '', `Produto: ${clean(product.nome) || 'Produto'}`, `Categoria: ${clean(product.categoria) || 'WD Founder'}`, `Valor: ${money(product.preco)}`, ...(size ? [`Tamanho: ${size}`] : []), '', 'Gostaria de mais informações e de finalizar meu pedido.'].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function closeDialog() {
  if (!dialog.open) return;
  dialog.close();
  currentProduct = null;
}

function openProduct(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;
  currentProduct = product;
  const images = imagesOf(product);
  const sizes = sizesOf(product);
  const discount = discountOf(product);
  const stock = stockOf(product);
  const gallery = images.length
    ? `<div class="detail-gallery"><div class="detail-thumbs">${images.map((src, index) => `<button type="button" data-thumb="${index}" class="${index === 0 ? 'active' : ''}"><img src="${esc(src)}" alt="Miniatura ${index + 1}"></button>`).join('')}</div><div class="detail-main-media"><div class="detail-slider">${images.map((src, index) => `<figure><img src="${esc(src)}" alt="${esc(product.nome || 'Produto')} - foto ${index + 1}"></figure>`).join('')}</div>${images.length > 1 ? '<button class="gallery-arrow gallery-prev" type="button">‹</button><button class="gallery-arrow gallery-next" type="button">›</button><span class="detail-counter">1/' + images.length + '</span>' : ''}</div></div>`
    : '<div class="detail-gallery no-image"><div class="detail-main-media"><span class="product-placeholder">WD</span></div></div>';

  dialogContent.innerHTML = `<div class="product-detail-layout">${gallery}<section class="detail-info"><div class="detail-meta-row"><span class="product-category">${esc(product.categoria || 'WD Founder')}</span>${product.selo ? `<span class="detail-badge">${esc(product.selo)}</span>` : ''}</div><h2>${esc(product.nome || 'Mercadoria')}</h2><p class="detail-description">${esc(product.descricao || 'Produto selecionado da coleção WD Founder.')}</p><div class="detail-price-block">${Number(product.precoAntigo || 0) > Number(product.preco || 0) ? `<del>${money(product.precoAntigo)}</del>` : ''}<div><strong>${money(product.preco)}</strong>${discount ? `<span>-${discount}%</span>` : ''}</div></div><div class="detail-stock"><span></span>${stock} unidades disponíveis</div>${sizes.length ? `<div class="detail-sizes"><strong>Tamanhos disponíveis</strong><div>${sizes.map(([size, quantity], index) => `<button type="button" class="${index === 0 ? 'selected' : ''}" data-size-choice="${esc(size)}"><b>${esc(size)}</b><small>${Number(quantity)} un.</small></button>`).join('')}</div></div>` : ''}<div class="detail-actions"><button class="detail-primary" type="button" data-action="whatsapp">Falar sobre este produto no WhatsApp</button><button class="detail-secondary" type="button" data-action="close">Continuar vendo produtos</button></div></section></div>`;

  if (!dialog.open) dialog.showModal();

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
  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => goTo(index)));
  dialogContent.querySelector('.gallery-prev')?.addEventListener('click', () => goTo(current - 1));
  dialogContent.querySelector('.gallery-next')?.addEventListener('click', () => goTo(current + 1));
}

function handleDialogClick(event) {
  const sizeButton = event.target.closest('[data-size-choice]');
  if (sizeButton) {
    dialogContent.querySelectorAll('[data-size-choice]').forEach(button => button.classList.remove('selected'));
    sizeButton.classList.add('selected');
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'close') {
    closeDialog();
    return;
  }
  if (action === 'whatsapp' && currentProduct) {
    const size = clean(dialogContent.querySelector('[data-size-choice].selected b')?.textContent);
    const url = whatsappUrl(currentProduct, size);
    if (!url) {
      alert('O WhatsApp da loja ainda não foi configurado corretamente pelo administrador.');
      return;
    }
    window.location.assign(url);
  }
}

async function loadStore() {
  try {
    const [productsSnapshot, configSnapshot] = await Promise.all([
      getDocs(collection(db, 'ofertas')),
      getDoc(doc(db, 'ofertas', '__config_loja'))
    ]);
    storeConfig = configSnapshot.exists() ? configSnapshot.data() : {};
    products = productsSnapshot.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })).filter(product => product.tipo === 'produto').sort(compareProducts);
    const categories = [...new Set(products.map(product => product.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    category.innerHTML = '<option value="">Todas as categorias</option>' + categories.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
    renderProducts();
  } catch (error) {
    console.error('Falha ao carregar a loja:', error);
    resultCount.textContent = '';
    grid.innerHTML = '<div class="store-empty">Não foi possível carregar as mercadorias agora.</div>';
  }
}

search.addEventListener('input', () => { currentPage = 1; renderProducts(); });
category.addEventListener('change', () => { currentPage = 1; renderProducts(); });
pagination.addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled) return;
  currentPage = Number(button.dataset.page) || 1;
  renderProducts();
  root.querySelector('.store-results-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
grid.addEventListener('click', event => {
  const card = event.target.closest('button.product-card[data-product-id]');
  if (card) openProduct(card.dataset.productId);
});
dialogContent.addEventListener('click', handleDialogClick);
dialogClose.addEventListener('click', closeDialog);
dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });

await loadStore();
