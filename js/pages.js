(function () {
  'use strict';

  var root = window.Arsenic = window.Arsenic || {};
  var utils = root.utils;
  var store = root.store;
  var components = root.components;
  var shopFilters = null;
  var productDetailQty = 1;
  var revealObserver = null;

  function renderHome() {
    var categoryGrid = document.getElementById('category-grid');
    if (categoryGrid) {
      categoryGrid.innerHTML = store.categories().map(components.categoryTileHTML).join('');
    }

    var featuredGrid = document.getElementById('featured-grid');
    if (featuredGrid) {
      featuredGrid.innerHTML = store.products().slice(0, 4).map(components.productCardHTML).join('');
    }
  }

  function renderShop() {
    var productGrid = document.getElementById('product-grid');
    var categoryFilter = document.getElementById('filter-category');
    if (!productGrid || !categoryFilter) return;

    if (!shopFilters) {
      var params = new URLSearchParams(window.location.search);
      shopFilters = {
        cat: params.get('cat') || 'all',
        search: '',
        price: 'all',
        rating: 0,
        instock: false,
        sort: 'featured'
      };
    }

    renderShopCategories();
    renderShopProducts();
  }

  function renderShopCategories() {
    var el = document.getElementById('filter-category');
    if (!el || !shopFilters) return;

    var allCategories = [{ name: 'All categories', slug: 'all' }].concat(store.categories());
    el.innerHTML = allCategories.map(function (category) {
      return [
        '<label class="flex items-center gap-2">',
        '<input type="radio" name="cat" value="', utils.escapeAttr(category.slug), '" ', shopFilters.cat === category.slug ? 'checked' : '', '>',
        utils.escapeHTML(category.name),
        '</label>'
      ].join('');
    }).join('');
  }

  function renderShopProducts() {
    var countEl = document.getElementById('results-count');
    var grid = document.getElementById('product-grid');
    var empty = document.getElementById('empty-state');
    if (!grid || !shopFilters) return;

    var list = store.products().filter(function (product) {
      if (shopFilters.cat !== 'all' && product.slug !== shopFilters.cat) return false;
      if (shopFilters.search) {
        var needle = shopFilters.search.toLowerCase();
        var haystack = [product.name, product.category, product.desc].join(' ').toLowerCase();
        if (haystack.indexOf(needle) === -1) return false;
      }
      if (shopFilters.price !== 'all') {
        var range = shopFilters.price.split('-').map(Number);
        if (product.price < range[0] || product.price > range[1]) return false;
      }
      if (shopFilters.instock && !product.stock) return false;
      if (product.rating < shopFilters.rating) return false;
      return true;
    });

    if (shopFilters.sort === 'price-asc') {
      list.sort(function (a, b) { return a.price - b.price; });
    } else if (shopFilters.sort === 'price-desc') {
      list.sort(function (a, b) { return b.price - a.price; });
    } else if (shopFilters.sort === 'rating') {
      list.sort(function (a, b) { return b.rating - a.rating; });
    }

    if (countEl) countEl.textContent = list.length + ' product' + (list.length === 1 ? '' : 's');
    grid.innerHTML = list.map(components.productCardHTML).join('');
    if (empty) empty.classList.toggle('hidden', list.length > 0);
    grid.classList.toggle('hidden', list.length === 0);
    components.syncWishlistButtons();
  }

  function resetShopFilters() {
    if (!shopFilters) return;
    shopFilters = {
      cat: 'all',
      search: '',
      price: 'all',
      rating: 0,
      instock: false,
      sort: 'featured'
    };

    var searchInput = document.getElementById('search-input');
    var sortSelect = document.getElementById('sort-select');
    var instockFilter = document.getElementById('filter-instock');
    var priceAll = document.querySelector('input[name="price"][value="all"]');
    var ratingAll = document.querySelector('input[name="rating"][value="0"]');

    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'featured';
    if (instockFilter) instockFilter.checked = false;
    if (priceAll) priceAll.checked = true;
    if (ratingAll) ratingAll.checked = true;

    renderShopCategories();
    renderShopProducts();
  }

  function setShopFilter(key, value) {
    if (!shopFilters) return;
    shopFilters[key] = value;
    renderShopProducts();
  }

  function renderProductPage() {
    var pageRoot = document.getElementById('product-root');
    if (!pageRoot) return;

    var currentProducts = store.products();
    var params = new URLSearchParams(window.location.search);
    var requestedId = params.get('id') || (currentProducts[0] ? currentProducts[0].id : '');
    var product = store.findProduct(requestedId) || currentProducts[0];
    productDetailQty = 1;

    if (!product) {
      pageRoot.innerHTML = '<div class="py-20"><h1 class="font-display text-3xl">Product not found</h1><a href="shop.html" class="btn btn-primary mt-6">Return to shop</a></div>';
      return;
    }

    document.title = product.name + ' - Arsenic Energies';
    var desc = document.getElementById('page-desc');
    var crumb = document.getElementById('crumb-cat');
    if (desc) desc.setAttribute('content', product.desc || '');
    if (crumb) {
      crumb.innerHTML = '<a href="shop.html?cat=' + utils.escapeAttr(product.slug) + '" class="hover:text-white transition-colors">' + utils.escapeHTML(product.category) + '</a> / <span class="text-white">' + utils.escapeHTML(product.name) + '</span>';
    }

    var specs = product.specs || {};
    pageRoot.innerHTML = [
      '<div class="reveal">',
      '<div class="rounded-[var(--radius-md)] overflow-hidden relative" style="background:#0E1413; aspect-ratio:1/1">',
      product.badge ? '<span class="plate-tag ' + (product.badgeType === 'orange' ? 'orange' : '') + '">' + utils.escapeHTML(product.badge) + '</span>' : '',
      '<img id="main-img" src="', utils.escapeAttr(product.img), '" alt="', utils.escapeAttr(product.name), '" class="w-full h-full object-cover">',
      '</div>',
      '<div class="grid grid-cols-2 gap-4 mt-4">',
      '<button data-product-image="', utils.escapeAttr(product.img), '" class="rounded-md overflow-hidden aspect-square border" style="border-color:var(--line)" aria-label="Show primary product image"><img src="', utils.escapeAttr(product.img), '" alt="" class="w-full h-full object-cover"></button>',
      '<button data-product-image="', utils.escapeAttr(product.img2 || product.img), '" class="rounded-md overflow-hidden aspect-square border" style="border-color:var(--line)" aria-label="Show alternate product image"><img src="', utils.escapeAttr(product.img2 || product.img), '" alt="" class="w-full h-full object-cover"></button>',
      '</div>',
      '</div>',
      '<div class="reveal">',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">', utils.escapeHTML(product.category), '</p>',
      '<h1 class="font-display text-3xl lg:text-4xl mt-2">', utils.escapeHTML(product.name), '</h1>',
      '<div class="flex items-center gap-2 mt-3">', utils.starRow(product.rating), '<span class="text-sm" style="color:var(--muted-2)">', utils.escapeHTML(product.rating), ' (', utils.escapeHTML(product.reviews || 0), ' reviews)</span></div>',
      '<div class="flex items-baseline gap-3 mt-5"><span class="price-now text-3xl">', utils.money(product.price), '</span>',
      product.oldPrice ? '<span class="price-old text-lg">' + utils.money(product.oldPrice) + '</span>' : '',
      '</div>',
      '<p class="mt-5 leading-relaxed" style="color:var(--muted)">', utils.escapeHTML(product.desc), '</p>',
      '<div class="mt-6 flex items-center gap-2 text-sm"><span class="w-2 h-2 rounded-full" style="background:', product.stock ? 'var(--green)' : '#6E7876', '"></span>', product.stock ? 'In stock, ready to ship' : 'Currently out of stock', '</div>',
      '<div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-b py-6" style="border-color:var(--line)">',
      Object.keys(specs).map(function (key) {
        return '<div style="color:var(--muted-2)">' + utils.escapeHTML(key) + '</div><div>' + utils.escapeHTML(specs[key]) + '</div>';
      }).join(''),
      '</div>',
      '<div class="flex items-center gap-3 mt-8">',
      '<div class="qty-control flex items-center">',
      '<button class="px-3 py-3" data-pd-qty-change="-1" aria-label="Decrease quantity">-</button>',
      '<span class="px-4 text-sm" id="pd-qty">1</span>',
      '<button class="px-3 py-3" data-pd-qty-change="1" aria-label="Increase quantity">+</button>',
      '</div>',
      '<button class="btn btn-primary flex-1" data-pd-add="', utils.escapeAttr(product.id), '" ', product.stock ? '' : 'disabled style="opacity:.4"', '>Add to cart</button>',
      '</div>',
      '<button class="btn btn-outline w-full mt-3" data-pd-buy="', utils.escapeAttr(product.id), '" ', product.stock ? '' : 'disabled style="opacity:.4"', '>Buy now</button>',
      '<button class="flex items-center gap-2 mt-6 text-sm" data-wish="', utils.escapeAttr(product.id), '" style="color:var(--muted)">',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.8 5.6 4.1 8 3.6 10.4 4.9 12 7c1.6-2.1 4-3.4 6.4-2.9 3.6.7 5.2 4.3 3.6 7.6C19.5 16.1 12 21 12 21z"/></svg>',
      'Save to wishlist',
      '</button>',
      '</div>'
    ].join('');

    var rev1 = document.getElementById('rev1-stars');
    var rev2 = document.getElementById('rev2-stars');
    if (rev1) rev1.innerHTML = utils.starRow(5);
    if (rev2) rev2.innerHTML = utils.starRow(4);

    var relatedGrid = document.getElementById('related-grid');
    if (relatedGrid) {
      var related = currentProducts
        .filter(function (item) { return item.slug === product.slug && item.id !== product.id; })
        .concat(currentProducts.filter(function (item) { return item.slug !== product.slug; }))
        .slice(0, 4);
      relatedGrid.innerHTML = related.map(components.productCardHTML).join('');
    }

    components.syncWishlistButtons();
  }

  function updateProductDetailQty(delta) {
    productDetailQty = Math.max(1, productDetailQty + delta);
    var qty = document.getElementById('pd-qty');
    if (qty) qty.textContent = productDetailQty;
  }

  function currentProductDetailQty() {
    return productDetailQty;
  }

  function setupCalculator() {
    var form = document.getElementById('calc-form');
    if (!form) return;

    var watts = {
      lights: 12,
      tvs: 90,
      fridges: 150,
      fans: 55,
      computers: 120,
      routers: 12,
      other: 100
    };

    function value(id) {
      var el = document.getElementById('calc-' + id);
      return Math.max(0, Number(el ? el.value : 0) || 0);
    }

    function setText(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function calculate() {
      var peakWatts =
        value('lights') * watts.lights +
        value('tvs') * watts.tvs +
        value('fridges') * watts.fridges +
        value('fans') * watts.fans +
        value('computers') * watts.computers +
        value('routers') * watts.routers +
        value('other') * watts.other;

      var hours = value('hours');
      var backup = value('backup');
      var daily = peakWatts * hours / 1000;
      var solar = Math.max(0.4, daily / 5 * 1.25);
      var inverter = Math.max(0.8, peakWatts / 1000 * 1.3);
      var battery = Math.max(1, peakWatts * backup / 1000 * 1.2);
      var panels = Math.max(1, Math.ceil(solar * 1000 / 550));

      setText('calc-hours-val', hours + ' hrs/day');
      setText('calc-backup-val', backup + ' hrs');
      setText('calc-daily', daily.toFixed(1) + ' kWh');
      setText('calc-solar', solar.toFixed(1) + ' kW');
      setText('calc-inverter', inverter.toFixed(1) + ' kW');
      setText('calc-battery', battery.toFixed(1) + ' kWh');
      setText('calc-panels', panels + (panels === 1 ? ' panel' : ' panels'));
    }

    form.addEventListener('input', calculate);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });
    calculate();
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
        el.classList.add('in-view');
      });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    function bindReveals() {
      document.querySelectorAll('.reveal:not([data-reveal-bound]), .reveal-stagger:not([data-reveal-bound])').forEach(function (el) {
        el.setAttribute('data-reveal-bound', 'true');
        revealObserver.observe(el);
      });
    }

    bindReveals();
    new MutationObserver(bindReveals).observe(document.body, { childList: true, subtree: true });
  }

  function setupCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    function run(counter) {
      var target = Number(counter.getAttribute('data-count')) || 0;
      var suffix = counter.getAttribute('data-suffix') || '';
      var start = performance.now();
      function frame(now) {
        var progress = Math.min(1, (now - start) / 900);
        counter.textContent = Math.round(target * progress).toLocaleString('en-US') + suffix;
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(run);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          run(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(function (counter) {
      observer.observe(counter);
    });
  }

  function setupTestimonials() {
    var track = document.getElementById('testi-track');
    if (!track) return;
    window.testiMove = function (direction) {
      var slides = track.children.length || 1;
      var index = Number(track.getAttribute('data-index')) || 0;
      index = (index + direction + slides) % slides;
      track.setAttribute('data-index', index);
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
    };
  }

  function orderDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function statusLabel(order) {
    return order.status_label || String(order.status || 'pending').replace(/_/g, ' ');
  }

  function paymentLabel(order) {
    return order.payment_status_label || String(order.payment_status || 'pending').replace(/_/g, ' ');
  }

  function detailKeyLabel(key) {
    return String(key || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function detailValue(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function orderExtraDetailHTML(title, value) {
    if (!value) return '';
    if (typeof value === 'string') {
      return value.trim() ? '<div><p class="font-display mb-1">' + utils.escapeHTML(title) + '</p><p style="color:var(--muted-2)">' + utils.escapeHTML(value) + '</p></div>' : '';
    }

    var rows = Object.keys(value).map(function (key) {
      var rowValue = detailValue(value[key]);
      if (!rowValue) return '';
      return [
        '<div class="flex justify-between gap-4">',
        '<span style="color:var(--muted-2)">', utils.escapeHTML(detailKeyLabel(key)), '</span>',
        '<span class="text-right">', utils.escapeHTML(rowValue), '</span>',
        '</div>'
      ].join('');
    }).filter(Boolean);

    if (!rows.length) return '';
    return [
      '<div>',
      '<p class="font-display mb-2">', utils.escapeHTML(title), '</p>',
      '<div class="space-y-1">', rows.join(''), '</div>',
      '</div>'
    ].join('');
  }

  function orderItemHTML(item) {
    var snapshot = item.product_snapshot || {};
    var image = snapshot.img || '';
    return [
      '<div class="flex gap-4 py-4 border-b last:border-b-0" style="border-color:var(--line)">',
      image ? '<img src="' + utils.escapeAttr(image) + '" alt="' + utils.escapeAttr(item.name) + '" class="w-16 h-16 object-cover rounded-md flex-shrink-0">' : '',
      '<div class="flex-1 min-w-0">',
      '<p class="font-display text-sm">', utils.escapeHTML(item.name || item.id), '</p>',
      '<p class="text-xs mt-1" style="color:var(--muted-2)">SKU ', utils.escapeHTML(item.id), ' · Qty ', utils.escapeHTML(item.quantity), '</p>',
      '<p class="text-xs mt-1" style="color:var(--muted)">Unit ', utils.money(item.unit_price), '</p>',
      '</div>',
      '<p class="price-now text-sm whitespace-nowrap">', utils.money(item.total), '</p>',
      '</div>'
    ].join('');
  }

  function orderTimelineHTML(order) {
    var steps = order.tracking_steps || [];
    if (!steps.length) return '';
    return [
      '<div class="mt-6 space-y-3">',
      steps.map(function (step) {
        var color = step.complete ? 'var(--primary)' : step.active ? 'var(--secondary)' : 'var(--line)';
        return [
          '<div class="flex gap-3">',
          '<span class="mt-1 w-3 h-3 rounded-full flex-shrink-0" style="background:', color, '"></span>',
          '<div>',
          '<p class="text-sm font-medium">', utils.escapeHTML(step.label), '</p>',
          step.timestamp ? '<p class="text-xs mt-0.5" style="color:var(--muted-2)">' + utils.escapeHTML(orderDate(step.timestamp)) + '</p>' : '',
          '</div>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function orderDetailHTML(order) {
    if (!order) {
      return '<div class="p-8 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface)"><p style="color:var(--muted)">Select an order to review its details.</p></div>';
    }

    var customer = order.customer || {};
    var extraDetails = [
      orderExtraDetailHTML('Shipping address', order.shipping_address),
      orderExtraDetailHTML('Billing address', order.billing_address),
      orderExtraDetailHTML('Order notes', order.notes)
    ].filter(Boolean).join('<div class="h-px" style="background:var(--line)"></div>');
    return [
      '<article class="rounded-[var(--radius-md)] border overflow-hidden" style="border-color:var(--line);background:var(--surface)">',
      '<div class="p-6 border-b" style="border-color:var(--line)">',
      '<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">',
      '<div>',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">Order</p>',
      '<h2 class="font-display text-2xl mt-1">#', utils.escapeHTML(String(order.id || '').slice(0, 8).toUpperCase()), '</h2>',
      '<p class="text-xs mt-2" style="color:var(--muted-2)">Placed ', utils.escapeHTML(orderDate(order.createdAt)), '</p>',
      '</div>',
      '<div class="flex flex-wrap gap-2">',
      '<span class="status-badge" style="background:rgba(245,184,46,0.15);color:var(--primary)">', utils.escapeHTML(statusLabel(order)), '</span>',
      '<span class="status-badge" style="background:rgba(34,197,94,0.14);color:var(--green)">', utils.escapeHTML(paymentLabel(order)), '</span>',
      '</div>',
      '</div>',
      orderTimelineHTML(order),
      '</div>',
      '<div class="p-6 grid lg:grid-cols-[1fr_260px] gap-8">',
      '<div>',
      '<h3 class="font-display text-lg mb-2">Order items</h3>',
      '<div>', (order.items || []).map(orderItemHTML).join(''), '</div>',
      '</div>',
      '<aside>',
      '<h3 class="font-display text-lg mb-3">Summary</h3>',
      '<div class="space-y-2 text-sm">',
      '<div class="flex justify-between"><span style="color:var(--muted)">Subtotal</span><span>', utils.money(order.subtotal), '</span></div>',
      '<div class="flex justify-between"><span style="color:var(--muted)">Shipping</span><span>', utils.money(order.shipping_total), '</span></div>',
      '<div class="flex justify-between"><span style="color:var(--muted)">Tax</span><span>', utils.money(order.tax_total), '</span></div>',
      '<div class="flex justify-between pt-3 mt-3 border-t font-display" style="border-color:var(--line)"><span>Total</span><span class="price-now">', utils.money(order.total), '</span></div>',
      '</div>',
      '<div class="mt-6 pt-5 border-t text-sm" style="border-color:var(--line)">',
      '<p class="font-display mb-2">Customer</p>',
      '<p>', utils.escapeHTML(customer.full_name || customer.email || ''), '</p>',
      '<p style="color:var(--muted-2)">', utils.escapeHTML(customer.email || ''), '</p>',
      customer.phone ? '<p style="color:var(--muted-2)">' + utils.escapeHTML(customer.phone) + '</p>' : '',
      '</div>',
      extraDetails ? '<div class="mt-6 pt-5 border-t text-sm space-y-5" style="border-color:var(--line)">' + extraDetails + '</div>' : '',
      '</aside>',
      '</div>',
      '</article>'
    ].join('');
  }

  function renderOrdersList(orders, selectedId) {
    if (!orders.length) {
      return [
        '<div class="p-8 rounded-[var(--radius-md)] border text-center" style="border-color:var(--line);background:var(--surface)">',
        '<p class="font-display text-xl">No orders yet</p>',
        '<p class="text-sm mt-2" style="color:var(--muted)">Your solar and energy orders will appear here after checkout.</p>',
        '<a href="shop.html" class="btn btn-primary mt-6">Shop products</a>',
        '</div>'
      ].join('');
    }

    return orders.map(function (order) {
      var active = order.id === selectedId;
      return [
        '<button type="button" data-order-detail="', utils.escapeAttr(order.id), '" class="w-full text-left p-4 rounded-[var(--radius-md)] border transition-colors" style="border-color:', active ? 'var(--primary)' : 'var(--line)', ';background:', active ? 'rgba(245,184,46,0.08)' : 'var(--surface)', '">',
        '<div class="flex items-start justify-between gap-3">',
        '<div>',
        '<p class="font-display">#', utils.escapeHTML(String(order.id || '').slice(0, 8).toUpperCase()), '</p>',
        '<p class="text-xs mt-1" style="color:var(--muted-2)">', utils.escapeHTML(orderDate(order.createdAt)), ' · ', utils.escapeHTML((order.items || []).length), ' item', (order.items || []).length === 1 ? '' : 's', '</p>',
        '</div>',
        '<span class="price-now text-sm">', utils.money(order.total), '</span>',
        '</div>',
        '<p class="text-xs mt-3" style="color:var(--primary)">', utils.escapeHTML(statusLabel(order)), '</p>',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderOrdersPage(selectedId) {
    var rootEl = document.getElementById('orders-root');
    var listEl = document.getElementById('orders-list');
    var detailEl = document.getElementById('orders-detail');
    if (!rootEl || !listEl || !detailEl) return;

    if (!root.api || !root.api.isEnabled()) {
      rootEl.innerHTML = '<div class="p-8 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface)"><p class="font-display text-xl">Order tracking needs the backend API.</p><p class="text-sm mt-2" style="color:var(--muted)">Configure js/backend-config.js to connect this page to Django.</p></div>';
      return;
    }

    if (!root.api.isAuthenticated()) {
      rootEl.innerHTML = [
        '<div class="p-8 rounded-[var(--radius-md)] border text-center" style="border-color:var(--line);background:var(--surface)">',
        '<p class="font-display text-2xl">Sign in to track orders</p>',
        '<p class="text-sm mt-2 max-w-lg mx-auto" style="color:var(--muted)">Your order history and detailed tracking are protected inside your account.</p>',
        '<button type="button" data-open-account="login" class="btn btn-primary mt-6">Sign in or create account</button>',
        '</div>'
      ].join('');
      return;
    }

    rootEl.classList.add('grid', 'lg:grid-cols-[360px_1fr]', 'gap-8');
    listEl.innerHTML = '<div class="p-6 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface);color:var(--muted)">Loading your orders...</div>';
    detailEl.innerHTML = orderDetailHTML(null);

    root.api.getOrders().then(function (orders) {
      selectedId = selectedId || new URLSearchParams(window.location.search).get('order') || (orders[0] && orders[0].id);
      listEl.innerHTML = renderOrdersList(orders, selectedId);
      var selected = orders.find(function (order) {
        return order.id === selectedId;
      });
      if (selected) {
        detailEl.innerHTML = orderDetailHTML(selected);
      } else if (selectedId) {
        showOrderDetail(selectedId);
      } else {
        detailEl.innerHTML = orderDetailHTML(null);
      }
    }).catch(function (error) {
      listEl.innerHTML = '';
      detailEl.innerHTML = '<div class="p-8 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface)"><p class="font-display text-xl">Could not load orders</p><p class="text-sm mt-2" style="color:var(--muted)">' + utils.escapeHTML(error.message) + '</p></div>';
    });
  }

  function showOrderDetail(id) {
    var detailEl = document.getElementById('orders-detail');
    if (!detailEl || !root.api || !root.api.isEnabled()) return;
    detailEl.innerHTML = '<div class="p-8 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface);color:var(--muted)">Loading order details...</div>';
    root.api.getOrder(id).then(function (order) {
      detailEl.innerHTML = orderDetailHTML(order);
      var listEl = document.getElementById('orders-list');
      if (listEl) {
        listEl.querySelectorAll('[data-order-detail]').forEach(function (button) {
          var active = button.getAttribute('data-order-detail') === id;
          button.style.borderColor = active ? 'var(--primary)' : 'var(--line)';
          button.style.background = active ? 'rgba(245,184,46,0.08)' : 'var(--surface)';
        });
      }
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', 'orders.html?order=' + encodeURIComponent(id));
      }
    }).catch(function (error) {
      detailEl.innerHTML = '<div class="p-8 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface)"><p class="font-display text-xl">Order not found</p><p class="text-sm mt-2" style="color:var(--muted)">' + utils.escapeHTML(error.message) + '</p></div>';
    });
  }

  function renderCheckoutSuccess() {
    var rootEl = document.getElementById('checkout-success-root');
    var detailEl = document.getElementById('checkout-order-detail');
    if (!rootEl || !detailEl) return;

    var params = new URLSearchParams(window.location.search);
    var orderId = params.get('order');
    if (!orderId) {
      detailEl.innerHTML = '';
      return;
    }

    store.Store.clearCart();

    if (!root.api || !root.api.isEnabled() || !root.api.isAuthenticated()) {
      detailEl.innerHTML = '<div class="mt-10 p-6 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface)"><p class="font-display text-xl">Sign in to review order details</p><p class="text-sm mt-2" style="color:var(--muted)">Use the same account from checkout to view the order summary and tracking.</p><button type="button" data-open-account="login" class="btn btn-primary mt-5">Sign in</button></div>';
      return;
    }

    detailEl.innerHTML = '<div class="mt-10 p-6 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface);color:var(--muted)">Loading order details...</div>';
    root.api.getOrder(orderId).then(function (order) {
      detailEl.innerHTML = '<div class="mt-10 text-left">' + orderDetailHTML(order) + '</div>';
      var trackLink = document.getElementById('track-order-link');
      if (trackLink) trackLink.href = 'orders.html?order=' + encodeURIComponent(order.id);
    }).catch(function (error) {
      detailEl.innerHTML = '<div class="mt-10 p-6 rounded-[var(--radius-md)] border" style="border-color:var(--line);background:var(--surface)"><p class="font-display text-xl">Could not load order details</p><p class="text-sm mt-2" style="color:var(--muted)">' + utils.escapeHTML(error.message) + '</p></div>';
    });
  }

  function refreshCatalogViews() {
    var catalog = store.loadCatalog();
    window.PRODUCTS = catalog.products;
    window.CATEGORIES = catalog.categories;
    renderHome();
    renderShop();
    renderProductPage();
    if (root.ui && root.ui.updateCartUI) root.ui.updateCartUI();
  }

  root.pages = {
    renderHome: renderHome,
    renderShop: renderShop,
    renderShopProducts: renderShopProducts,
    renderShopCategories: renderShopCategories,
    resetShopFilters: resetShopFilters,
    setShopFilter: setShopFilter,
    renderProductPage: renderProductPage,
    renderOrdersPage: renderOrdersPage,
    showOrderDetail: showOrderDetail,
    renderCheckoutSuccess: renderCheckoutSuccess,
    updateProductDetailQty: updateProductDetailQty,
    currentProductDetailQty: currentProductDetailQty,
    setupCalculator: setupCalculator,
    setupReveal: setupReveal,
    setupCounters: setupCounters,
    setupTestimonials: setupTestimonials,
    refreshCatalogViews: refreshCatalogViews
  };
})();
