// app.js - Versión con modales personalizados, botones +/- y cart.html soporte
const TAX_RATE = 0.18;

const PRODUCTS = [
  { id: 1, title: 'Laptop Ultraligera 14"', price: 2599.00, stock: 5, img: 'images/product1.jpg', desc: '14" FHD, 8GB RAM, 256GB SSD', category: 'laptops' },
  { id: 2, title: 'Auriculares Inalámbricos', price: 249.90, stock: 12, img: 'images/product2.jpg', desc: 'Cancelación de ruido, 30h batería', category: 'audio' },
  { id: 3, title: 'Teclado Mecánico RGB', price: 199.50, stock: 8, img: 'images/product3.jpg', desc: 'Switches azules, conexión USB-C', category: 'perifericos' },
  { id: 4, title: 'Smartwatch Deportivo', price: 499.00, stock: 10, img: 'images/product4.jpg', desc: 'GPS integrado, pulsómetro', category: 'accesorios' },
  { id: 5, title: 'Monitor 27" 144Hz', price: 1199.00, stock: 4, img: 'images/product5.jpg', desc: 'IPS, 1ms, FreeSync', category: 'perifericos' },
  { id: 6, title: 'SSD NVMe 1TB', price: 399.00, stock: 18, img: 'images/product6.jpg', desc: 'Lectura 3500MB/s', category: 'almacenamiento' }
];

let cart = JSON.parse(localStorage.getItem('tiendatec_cart') || '[]');

// ---------- utilidades ----------
function normalizeText(s) {
  if (!s) return '';
  try {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  } catch (e) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
function toCents(value) { return Math.round((Number(value) + Number.EPSILON) * 100); }
function fromCents(cents) { return (cents / 100).toFixed(2); }
function persistCart() { localStorage.setItem('tiendatec_cart', JSON.stringify(cart)); }

// ---------- modal personalizado (alert/confirm reemplazados) ----------
function ensureModal() {
  let modal = document.getElementById('modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'modal';
  modal.className = 'modal hidden';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.innerHTML = `
    <div class="modal-content" role="document">
      <h3 id="modal-title"></h3>
      <div id="modal-desc"></div>
      <div class="modal-actions">
        <button id="modal-cancel" class="btn outline">Cancelar</button>
        <button id="modal-ok" class="btn primary">Aceptar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showModal({title='Aviso', message='', showCancel=true, okText='Aceptar', cancelText='Cancelar'}) {
  return new Promise(resolve => {
    const modal = ensureModal();
    const titleEl = modal.querySelector('#modal-title');
    const descEl = modal.querySelector('#modal-desc');
    const okBtn = modal.querySelector('#modal-ok');
    const cancelBtn = modal.querySelector('#modal-cancel');

    titleEl.textContent = title;
    descEl.textContent = message;
    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    okBtn.focus();

    function cleanup(result) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk(){ cleanup(true); }
    function onCancel(){ cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function showAlert(message, title='Aviso') {
  return showModal({title, message, showCancel:false, okText:'Aceptar', cancelText:''});
}

function showConfirm(message, title='Confirmar') {
  return showModal({title, message, showCancel:true, okText:'Sí', cancelText:'No'});
}

// ---------- renderizado productos ----------
function renderProducts(filterText = '', category = '') {
  const container = document.getElementById('products');
  const tableBody = document.querySelector('#products-table tbody');
  if (!container || !tableBody) return;
  container.innerHTML = '';
  tableBody.innerHTML = '';

  const normalizedFilter = normalizeText(filterText);
  const normalizedCat = normalizeText(category);

  const visible = PRODUCTS.filter(p => {
    const matchText = normalizeText(p.title + ' ' + p.desc).includes(normalizedFilter);
    const matchCat = !normalizedCat || normalizeText(p.category).includes(normalizedCat);
    return matchText && matchCat;
  });

  if (visible.length === 0) {
    container.innerHTML = `<p style="width:100%; color:var(--muted)">No se encontraron productos.</p>`;
  } else {
    visible.forEach(p => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.img}" alt="${p.title}">
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <div class="price">S/ ${Number(p.price).toFixed(2)}</div>
        <div class="actions">
          <button class="btn" data-add="${p.id}" aria-label="Agregar ${p.title} al carrito">Agregar al carrito</button>
          <button class="btn outline" data-view="${p.id}" aria-label="Ver detalles de ${p.title}">Ver</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  visible.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.title}</td>
      <td>S/ ${Number(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td><button class="btn small" data-add="${p.id}" aria-label="Agregar ${p.title} al carrito">Agregar</button></td>
    `;
    tableBody.appendChild(tr);
  });
}

// ---------- carrito ----------
function findCartItem(productId) { return cart.find(i => i.productId === productId); }

function addToCart(productId, qty = 1) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return showAlert('Producto no encontrado.');
  const existing = findCartItem(productId);
  if (existing) {
    if (existing.qty + qty > product.stock) return showAlert('No hay suficiente stock disponible.');
    existing.qty += qty;
  } else {
    if (qty > product.stock) return showAlert('No hay suficiente stock disponible.');
    cart.push({ productId, qty });
  }
  persistCart();
  updateCartUI();
  showToast(`${product.title} agregado al carrito.`);
}

async function removeFromCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const ok = await showConfirm(`¿Eliminar ${product.title} del carrito?`);
  if (!ok) return;
  cart = cart.filter(i => i.productId !== productId);
  persistCart();
  updateCartUI();
  showToast(`${product.title} eliminado.`);
}

function changeQty(productId, newQty) {
  const item = findCartItem(productId);
  const product = PRODUCTS.find(p => p.id === productId);
  if (!item || !product) return;
  const parsed = Number(newQty) || 1;
  const finalQty = Math.max(1, Math.min(product.stock, parsed));
  item.qty = finalQty;
  persistCart();
  updateCartUI();
}

function incQty(productId) {
  const item = findCartItem(productId);
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  if (item) {
    if (item.qty < product.stock) { item.qty += 1; persistCart(); updateCartUI(); }
  } else {
    cart.push({ productId, qty: 1 }); persistCart(); updateCartUI();
  }
}
function decQty(productId) {
  const item = findCartItem(productId);
  if (!item) return;
  if (item.qty > 1) { item.qty -= 1; persistCart(); updateCartUI(); }
  else { removeFromCart(productId); }
}

function clearCart() {
  return showConfirm('¿Vaciar todo el carrito?').then(ok => {
    if (!ok) return;
    cart = []; persistCart(); updateCartUI();
    showToast('Carrito vaciado.');
  });
}

function checkout() {
  if (cart.length === 0) return showAlert('El carrito está vacío.');
  const totals = calculateTotals();
  return showConfirm(`Confirmar compra. Total: S/ ${fromCents(totals.totalCents)}.`).then(ok => {
    if (!ok) return;
    cart = []; persistCart(); updateCartUI();
    showAlert('Compra realizada correctamente. ¡Gracias por tu compra!');
  });
}

// ---------- cálculos ----------
function calculateTotals() {
  let subtotalCents = 0;
  cart.forEach(item => {
    const p = PRODUCTS.find(x => x.id === item.productId);
    if (!p) return;
    subtotalCents += toCents(p.price) * item.qty;
  });
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents;
  return { subtotalCents, taxCents, totalCents };
}

// ---------- UI del carrito (drawer + page) ----------
function updateCartUI() {
  const openBtn = document.getElementById('open-cart');
  const count = cart.reduce((s, i) => s + i.qty, 0);
  if (openBtn) {
    openBtn.textContent = `🛒 Ver carrito (${count})`;
    openBtn.setAttribute('aria-label', `Abrir carrito, ${count} artículos`);
  }

  const drawerItems = document.getElementById('drawer-cart-items');
  if (drawerItems) {
    drawerItems.innerHTML = '';
    if (cart.length === 0) drawerItems.innerHTML = `<p style="color:var(--muted)">Tu carrito está vacío.</p>`;
    else {
      cart.forEach(item => {
        const p = PRODUCTS.find(x => x.id === item.productId);
        if (!p) return;
        const itemTotalCents = toCents(p.price) * item.qty;
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
          <img src="${p.img}" alt="${p.title}">
          <div style="flex:1">
            <strong style="display:block">${p.title}</strong>
            <div class="qty-controls" aria-label="Controles de cantidad para ${p.title}">
              <button class="btn" data-decrease="${p.id}" aria-label="Disminuir cantidad">−</button>
              <input type="number" min="1" max="${p.stock}" value="${item.qty}" data-qty="${p.id}" aria-label="Cantidad de ${p.title}">
              <button class="btn" data-increase="${p.id}" aria-label="Aumentar cantidad">+</button>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">S/ ${fromCents(itemTotalCents)}</div>
            <div style="margin-top:6px">
              <button class="btn outline" data-remove="${p.id}" aria-label="Eliminar ${p.title}">Eliminar</button>
            </div>
          </div>
        `;
        drawerItems.appendChild(el);
      });
    }
  }

  const pageItems = document.getElementById('cart-page-items');
  if (pageItems) {
    pageItems.innerHTML = '';
    if (cart.length === 0) {
      pageItems.innerHTML = `<p style="color:var(--muted)">Tu carrito está vacío.</p>`;
    } else {
      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>`;
      const tbody = document.createElement('tbody');
      cart.forEach(item => {
        const p = PRODUCTS.find(x => x.id === item.productId);
        if (!p) return;
        const itemTotal = (p.price * item.qty).toFixed(2);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.title}</td>
          <td>S/ ${p.price.toFixed(2)}</td>
          <td>
            <div class="qty-controls">
              <button class="btn" data-decrease="${p.id}" aria-label="Disminuir cantidad">−</button>
              <input type="number" min="1" max="${p.stock}" value="${item.qty}" data-qty="${p.id}" aria-label="Cantidad de ${p.title}">
              <button class="btn" data-increase="${p.id}" aria-label="Aumentar cantidad">+</button>
            </div>
          </td>
          <td>S/ ${itemTotal}</td>
          <td><button class="btn outline" data-remove="${p.id}" aria-label="Eliminar ${p.title}">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      pageItems.appendChild(table);
    }
  }

  const totals = calculateTotals();
  const drawerSubtotal = document.getElementById('drawer-subtotal');
  const drawerTax = document.getElementById('drawer-tax');
  const drawerTotal = document.getElementById('drawer-total');
  if (drawerSubtotal) drawerSubtotal.textContent = `S/ ${fromCents(totals.subtotalCents)}`;
  if (drawerTax) drawerTax.textContent = `S/ ${fromCents(totals.taxCents)}`;
  if (drawerTotal) drawerTotal.textContent = `S/ ${fromCents(totals.totalCents)}`;

  const pageSub = document.getElementById('page-subtotal');
  const pageTax = document.getElementById('page-tax');
  const pageTotal = document.getElementById('page-total');
  if (pageSub) pageSub.textContent = `S/ ${fromCents(totals.subtotalCents)}`;
  if (pageTax) pageTax.textContent = `S/ ${fromCents(totals.taxCents)}`;
  if (pageTotal) pageTotal.textContent = `S/ ${fromCents(totals.totalCents)}`;
}

// ---------- drawer open/close accessibility ----------
function openDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('overlay');
  if (!drawer || !overlay) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
  const btn = drawer.querySelector('.cart-header .btn') || drawer.querySelector('button');
  if (btn) btn.focus();
  const openBtn = document.getElementById('open-cart');
  if (openBtn) openBtn.setAttribute('aria-expanded','true');
}
function closeDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('overlay');
  if (!drawer || !overlay) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden','true');
  const openBtn = document.getElementById('open-cart');
  if (openBtn) openBtn.setAttribute('aria-expanded','false');
  if (openBtn) openBtn.focus();
}

// ---------- toast ----------
let toastTimer = null;
function showToast(message, ms = 1400) {
  let t = document.getElementById('tienda-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'tienda-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), ms);
}

// ---------- búsqueda y filtro ----------
function attachSearchAndFilter() {
  const search = document.getElementById('search');
  const cat = document.getElementById('category-filter');
  if (search) search.addEventListener('input', ()=> renderProducts(search.value || '', (cat && cat.value) || ''));
  if (cat) cat.addEventListener('change', ()=> renderProducts((search && search.value) || '', cat.value || ''));
}

// ---------- delegación de eventos ----------
function attachDelegation() {
  document.body.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      const id = Number(addBtn.dataset.add);
      if (!Number.isNaN(id)) addToCart(id);
      return;
    }
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      const id = Number(viewBtn.dataset.view);
      showAlert('Detalle no implementado. Producto id: ' + id);
      return;
    }
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      const id = Number(removeBtn.dataset.remove);
      if (!Number.isNaN(id)) removeFromCart(id);
      return;
    }
    const incBtn = e.target.closest('[data-increase]');
    if (incBtn) {
      const id = Number(incBtn.dataset.increase);
      if (!Number.isNaN(id)) incQty(id);
      return;
    }
    const decBtn = e.target.closest('[data-decrease]');
    if (decBtn) {
      const id = Number(decBtn.dataset.decrease);
      if (!Number.isNaN(id)) decQty(id);
      return;
    }
    const openCartBtn = e.target.closest('#open-cart');
    if (openCartBtn) { openDrawer(); return; }
    const closeCartBtn = e.target.closest('#close-cart');
    if (closeCartBtn) { closeDrawer(); return; }
    const checkoutDrawerBtn = e.target.closest('#checkout-drawer');
    if (checkoutDrawerBtn) { location.href = 'cart.html'; return; } // redirige a cart.html
  });

  document.body.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-qty]');
    if (!input) return;
    const id = Number(input.dataset.qty);
    const val = Number(input.value);
    if (!Number.isNaN(id)) changeQty(id, val);
  });
}

// ---------- inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartUI();
  attachSearchAndFilter();
  attachDelegation();

  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', closeDrawer);

  // respaldo: si existe el botón checkout-drawer, redirige (por si delegación no lo captó por alguna razón)
  const checkoutDrawer = document.getElementById('checkout-drawer');
  if (checkoutDrawer) {
    checkoutDrawer.addEventListener('click', () => { location.href = 'cart.html'; });
  }

  const clearBtn = document.getElementById('clear-cart');
  if (clearBtn) clearBtn.addEventListener('click', () => clearCart());

  // page-specific handlers (cart.html)
  const pageClear = document.getElementById('page-clear');
  if (pageClear) pageClear.addEventListener('click', ()=> clearCart());
  const pageCheckout = document.getElementById('page-checkout');
  if (pageCheckout) pageCheckout.addEventListener('click', ()=> checkout());
});
