import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const grid = document.getElementById('productsGrid');
const search = document.getElementById('storeSearch');
const category = document.getElementById('storeCategory');
const dialog = document.getElementById('productDialog');
const dialogContent = document.getElementById('dialogContent');

const money = value => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[character]));

let items = [];

function imagesOf(product) {
  const source = Array.isArray(product.imagens) && product.imagens.length
    ? product.imagens
    : product.imagem
      ? [product.imagem]
      : [];

  return [...new Set(source.filter(Boolean))].slice(0, 5);
}

function sizesOf(product) {
  return Array.isArray(product.tamanhos)
    ? product.tamanhos.filter(Boolean)
    : [];
}

function render() {
  const term = search.value.trim().toLowerCase();
  const selectedCategory = category.value;

  const filtered = items.filter(product => {
    const searchable = `${product.nome || ''} ${product.categoria || ''} ${product.descricao || ''}`.toLowerCase();
    return product.ativo !== false
      && (!selectedCategory || product.categoria === selectedCategory)
      && (!term || searchable.includes(term));
  });

  grid.innerHTML = filtered.map(product => {
    const images = imagesOf(product);
    const sizes = sizesOf(product);
    const image = images[0]
      ? `<img src="${esc(images[0])}" alt="${esc(product.nome || 'Mercadoria')}" loading="lazy" onerror="this.parentElement.classList.add('no-image');this.remove()">`
      : '<span>WD</span>';
    const oldPrice = Number(product.precoAntigo || 0) > Number(product.preco || 0)
      ? `<del>${money(product.precoAntigo)}</del>`
      : '';

    return `
      <article class="product-card">
        <button class="product-media ${images[0] ? '' : 'no-image'}" type="button" data-open-product="${esc(product.id)}">
          ${image}
          ${product.selo ? `<span class="product-badge">${esc(product.selo)}</span>` : ''}
          ${images.length > 1 ? `<span class="photo-count">1/${images.length}</span>` : ''}
        </button>
        <div class="product-body">
          <span class="product-category">${esc(product.categoria || 'WD Founder')}</span>
          <h3 class="product-title">${esc(product.nome || 'Mercadoria')}</h3>
          <p class="product-description">${esc(product.descricao || '')}</p>
          ${sizes.length ? `<div class="size-preview">${sizes.slice(0, 4).map(size => `<span>${esc(size)}</span>`).join('')}</div>` : ''}
          <div class="product-card-footer">
            <div class="product-price-row">
              <div class="product-price">${oldPrice}<strong>${money(product.preco)}</strong></div>
              <span class="product-stock">${Math.max(0, Number(product.estoque) || 0)} em estoque</span>
            </div>
            <button class="product-action" type="button" data-open-product="${esc(product.id)}">
              <span>${esc(product.botao || 'Ver detalhes')}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('') || '<div class="store-empty">Nenhuma mercadoria encontrada.</div>';
}

function openProduct(id) {
  const product = items.find(item => item.id === id);
  if (!product) return;

  const images = imagesOf(product);
  const sizes = sizesOf(product);
  const oldPrice = Number(product.precoAntigo || 0) > Number(product.preco || 0)
    ? `<del>${money(product.precoAntigo)}</del>`
    : '';

  const gallery = images.length
    ? `
      <div class="dialog-gallery-wrap">
        <div class="dialog-gallery">
          ${images.map((source, index) => `
            <figure><img src="${esc(source)}" alt="${esc(product.nome || 'Produto')} - foto ${index + 1}"></figure>
          `).join('')}
        </div>
        ${images.length > 1 ? `
          <button class="gallery-arrow gallery-prev" type="button" aria-label="Foto anterior">‹</button>
          <button class="gallery-arrow gallery-next" type="button" aria-label="Próxima foto">›</button>
        ` : ''}
      </div>
      <div class="gallery-dots">
        ${images.map((_, index) => `<button type="button" aria-label="Ir para foto ${index + 1}"${index === 0 ? ' class="active"' : ''}></button>`).join('')}
      </div>
    `
    : '<div class="dialog-gallery no-image"><figure><span>WD</span></figure></div>';

  const contact = product.link
    ? `<a class="dialog-contact" href="${esc(product.link)}" target="_blank" rel="noopener">Falar sobre este item</a>`
    : '<button class="dialog-contact" type="button" id="noContact">Consultar disponibilidade</button>';

  dialogContent.innerHTML = `
    ${gallery}
    <div class="dialog-body">
      <span class="product-category">${esc(product.categoria || 'WD Founder')}</span>
      <h2>${esc(product.nome || 'Mercadoria')}</h2>
      <p>${esc(product.descricao || '')}</p>
      ${sizes.length ? `
        <div class="dialog-sizes">
          <strong>Escolha o tamanho</strong>
          <div>${sizes.map((size, index) => `<button type="button" class="${index === 0 ? 'selected' : ''}">${esc(size)}</button>`).join('')}</div>
        </div>
      ` : ''}
      <div class="dialog-price">${oldPrice}<strong>${money(product.preco)}</strong><span>${Math.max(0, Number(product.estoque) || 0)} em estoque</span></div>
      ${contact}
    </div>
  `;

  dialog.showModal();

  const galleryElement = dialogContent.querySelector('.dialog-gallery');
  const dots = [...dialogContent.querySelectorAll('.gallery-dots button')];
  let currentIndex = 0;

  function goTo(index) {
    if (!galleryElement || !images.length) return;
    currentIndex = Math.max(0, Math.min(images.length - 1, index));
    galleryElement.scrollTo({ left: galleryElement.clientWidth * currentIndex, behavior: 'smooth' });
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === currentIndex));
  }

  galleryElement?.addEventListener('scroll', () => {
    const width = galleryElement.clientWidth || 1;
    currentIndex = Math.round(galleryElement.scrollLeft / width);
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === currentIndex));
  }, { passive: true });

  dialogContent.querySelector('.gallery-prev')?.addEventListener('click', () => {
    goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  });

  dialogContent.querySelector('.gallery-next')?.addEventListener('click', () => {
    goTo(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  });

  dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));

  dialogContent.querySelectorAll('.dialog-sizes button').forEach(button => {
    button.addEventListener('click', () => {
      dialogContent.querySelectorAll('.dialog-sizes button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  dialogContent.querySelector('#noContact')?.addEventListener('click', () => {
    alert('Este item ainda não possui WhatsApp ou link cadastrado.');
  });

  dialog.onkeydown = event => {
    if (event.key === 'ArrowLeft') goTo(currentIndex - 1);
    if (event.key === 'ArrowRight') goTo(currentIndex + 1);
  };
}

try {
  const snapshot = await getDocs(collection(db, 'ofertas'));
  items = snapshot.docs
    .map(document => ({ id: document.id, ...document.data() }))
    .filter(product => product.tipo === 'produto')
    .sort((first, second) => (Number(first.ordem) || 999) - (Number(second.ordem) || 999));

  const categories = [...new Set(items.map(product => product.categoria).filter(Boolean))].sort();
  category.innerHTML = '<option value="">Todas as categorias</option>'
    + categories.map(item => `<option>${esc(item)}</option>`).join('');

  render();
} catch (error) {
  console.error(error);
  grid.innerHTML = `<div class="store-empty">Não foi possível carregar as mercadorias agora.<small>${esc(error.code || '')}</small></div>`;
}

search.addEventListener('input', render);
category.addEventListener('change', render);
grid.addEventListener('click', event => {
  const target = event.target.closest('[data-open-product]');
  if (target) openProduct(target.dataset.openProduct);
});
document.getElementById('dialogClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
