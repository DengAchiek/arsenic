(function () {
  'use strict';

  var DATA_KEY = 'ae_catalog_data';
  var CART_KEY = 'ae_cart';
  var WISHLIST_KEY = 'ae_wishlist';
  var PROFILE_KEY = 'ae_profile';
  var toastTimer = null;
  var revealObserver = null;
  var shopFilters = null;
  var productDetailQty = 1;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function seedCatalog() {
    var seed = window.ARSENIC_SEED_DATA || { products: [], categories: [], orders: [], profile: null };
    return clone(seed);
  }

  function normalizeCatalog(data) {
    var catalog = data || seedCatalog();
    catalog.products = Array.isArray(catalog.products) ? catalog.products : [];
    catalog.categories = Array.isArray(catalog.categories) ? catalog.categories : [];
    catalog.orders = Array.isArray(catalog.orders) ? catalog.orders : [];
    catalog.categories = catalog.categories.map(function (category) {
      return Object.assign({}, category, {
        count: catalog.products.filter(function (product) {
          return product.slug === category.slug;
        }).length
      });
    });
    return catalog;
  }

  function loadCatalog() {
    var stored = readJSON(DATA_KEY, null);
    if (!stored) {
      stored = seedCatalog();
      writeJSON(DATA_KEY, stored);
    }
    return normalizeCatalog(stored);
  }

  function saveCatalog(data) {
    var normalized = normalizeCatalog(data);
    writeJSON(DATA_KEY, normalized);
    window.PRODUCTS = normalized.products;
    window.CATEGORIES = normalized.categories;
    return normalized;
  }

  function products() {
    return loadCatalog().products;
  }

  function categories() {
    return loadCatalog().categories;
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHTML(value);
  }

  function money(price) {
    var value = Number(price) || 0;
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function findProduct(id) {
    return products().find(function (product) {
      return product.id === id;
    }) || null;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function starRow(rating) {
    var out = '';
    var rounded = Math.round(Number(rating) || 0);
    for (var i = 1; i <= 5; i += 1) {
      out += '<svg width="13" height="13" viewBox="0 0 20 20" class="' + (i <= rounded ? 'star' : 'star-off') + '" fill="currentColor" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6L10 14.9 4.6 17.8l1.3-6L1.3 7.7l6.1-.6z"/></svg>';
    }
    return out;
  }

  function categoryTileHTML(category) {
    return [
      '<a class="cat-tile" href="shop.html?cat=', escapeAttr(category.slug), '">',
      '<img src="', escapeAttr(category.img), '" alt="', escapeAttr(category.name), '" loading="lazy">',
      '<span class="cat-border"></span>',
      '<span class="cat-content">',
      '<span class="text-xs uppercase tracking-wide mb-2" style="color:var(--primary)">', escapeHTML(category.count || 0), ' products</span>',
      '<span class="font-display text-2xl">', escapeHTML(category.name), '</span>',
      '<span class="text-sm mt-2 max-w-xs" style="color:var(--muted)">', escapeHTML(category.desc || ''), '</span>',
      '<span class="cat-arrow mt-5" aria-hidden="true">-&gt;</span>',
      '</span>',
      '</a>'
    ].join('');
  }

  function productCardHTML(product) {
    var saved = Store.wishlist.indexOf(product.id) !== -1;
    var badgeClass = product.badgeType === 'orange' ? ' orange' : '';
    return [
      '<div class="product-card" data-product-id="', escapeAttr(product.id), '">',
      '<div class="product-media">',
      product.badge ? '<span class="plate-tag' + badgeClass + '">' + escapeHTML(product.badge) + '</span>' : '',
      '<button class="wishlist-btn', saved ? ' active' : '', '" data-wish="', escapeAttr(product.id), '" aria-label="Toggle wishlist for ', escapeAttr(product.name), '">',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="', saved ? '#F97316' : 'none', '" stroke="', saved ? '#F97316' : 'white', '" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.8 5.6 4.1 8 3.6 10.4 4.9 12 7c1.6-2.1 4-3.4 6.4-2.9 3.6.7 5.2 4.3 3.6 7.6C19.5 16.1 12 21 12 21z"/></svg>',
      '</button>',
      '<a href="product.html?id=', escapeAttr(product.id), '"><img src="', escapeAttr(product.img), '" alt="', escapeAttr(product.name), '" loading="lazy"></a>',
      '<button class="quickview-btn" data-quickview="', escapeAttr(product.id), '">Quick view</button>',
      '</div>',
      '<div class="p-4 flex flex-col gap-2 flex-1">',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">', escapeHTML(product.category), '</p>',
      '<a href="product.html?id=', escapeAttr(product.id), '" class="font-display text-[15px] leading-snug hover:text-[var(--primary)] transition-colors">', escapeHTML(product.name), '</a>',
      '<p class="text-[13px] clamp-2" style="color:var(--muted)">', escapeHTML(product.desc), '</p>',
      '<div class="flex items-center gap-1.5">', starRow(product.rating), '<span class="text-xs ml-1" style="color:var(--muted-2)">(', escapeHTML(product.reviews || 0), ')</span></div>',
      '<div class="flex items-baseline gap-2 mt-1"><span class="price-now text-lg">', money(product.price), '</span>',
      product.oldPrice ? '<span class="price-old">' + money(product.oldPrice) + '</span>' : '',
      '</div>',
      '<button class="add-cart-btn btn btn-sm w-full mt-1" data-add-cart="', escapeAttr(product.id), '" ', product.stock ? '' : 'disabled style="opacity:.4;cursor:not-allowed"', '>',
      product.stock ? 'Add to cart' : 'Out of stock',
      '</button>',
      '</div>',
      '</div>'
    ].join('');
  }

  function readCart() {
    return readJSON(CART_KEY, []);
  }

  function saveCart(cart) {
    writeJSON(CART_KEY, cart);
    updateCartUI();
  }

  function readWishlist() {
    return readJSON(WISHLIST_KEY, []);
  }

  function saveWishlist(wishlist) {
    writeJSON(WISHLIST_KEY, wishlist);
    syncWishlistButtons();
  }

  var Store = {
    get products() {
      return products();
    },
    get categories() {
      return categories();
    },
    get cart() {
      return readCart();
    },
    get wishlist() {
      return readWishlist();
    },
    get profile() {
      return readJSON(PROFILE_KEY, null);
    },
    addToCart: function (id, qty) {
      var product = findProduct(id);
      if (!product || !product.stock) return;
      var count = Math.max(1, Number(qty) || 1);
      var cart = readCart();
      var item = cart.find(function (entry) {
        return entry.id === id;
      });
      if (item) item.qty += count;
      else cart.push({ id: id, qty: count });
      saveCart(cart);
      showToast('Added ' + product.name + ' to cart');
    },
    updateQty: function (id, qty) {
      var count = Number(qty) || 0;
      var cart = readCart();
      if (count < 1) {
        cart = cart.filter(function (entry) {
          return entry.id !== id;
        });
      } else {
        cart = cart.map(function (entry) {
          return entry.id === id ? { id: entry.id, qty: count } : entry;
        });
      }
      saveCart(cart);
    },
    removeFromCart: function (id) {
      saveCart(readCart().filter(function (entry) {
        return entry.id !== id;
      }));
    },
    clearCart: function () {
      saveCart([]);
    },
    toggleWishlist: function (id) {
      var product = findProduct(id);
      var wishlist = readWishlist();
      var index = wishlist.indexOf(id);
      if (index === -1) {
        wishlist.push(id);
        showToast(product ? 'Saved ' + product.name : 'Saved to wishlist');
      } else {
        wishlist.splice(index, 1);
        showToast(product ? 'Removed ' + product.name : 'Removed from wishlist');
      }
      saveWishlist(wishlist);
    },
    setProfile: function (profile) {
      if (profile) writeJSON(PROFILE_KEY, profile);
      else localStorage.removeItem(PROFILE_KEY);
    },
    replaceCatalog: function (catalog) {
      return saveCatalog(catalog);
    }
  };

  function cartTotal(cart) {
    return cart.reduce(function (sum, item) {
      var product = findProduct(item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function updateCartUI() {
    var cart = readCart();
    var count = cart.reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);

    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    renderCartDrawer(cart);
  }

  function renderCartDrawer(cart) {
    var body = document.getElementById('cart-body');
    var footer = document.getElementById('cart-footer');
    if (!body) return;

    if (!cart.length) {
      body.innerHTML = [
        '<div class="flex flex-col items-center justify-center h-full text-center gap-3 py-20 px-6">',
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-2)" stroke-width="1.4" aria-hidden="true"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2A2 2 0 0 0 8.4 17H17a2 2 0 0 0 2-1.6L21 6H5"/></svg>',
        '<p style="color:var(--muted)" class="text-sm">Your cart is empty.</p>',
        '<a href="shop.html" class="btn btn-outline btn-sm mt-2">Shop products</a>',
        '</div>'
      ].join('');
      if (footer) footer.innerHTML = '';
      return;
    }

    body.innerHTML = cart.map(function (item) {
      var product = findProduct(item.id);
      if (!product) return '';
      return [
        '<div class="flex gap-3 px-5 py-4 border-b" style="border-color:var(--line)">',
        '<img src="', escapeAttr(product.img), '" alt="', escapeAttr(product.name), '" class="w-16 h-16 object-cover rounded-md flex-shrink-0">',
        '<div class="flex-1 min-w-0">',
        '<p class="text-sm font-medium truncate">', escapeHTML(product.name), '</p>',
        '<p class="text-xs" style="color:var(--muted-2)">', escapeHTML(product.category), '</p>',
        '<div class="flex items-center justify-between mt-2">',
        '<div class="qty-control flex items-center">',
        '<button class="px-2 py-1" data-cart-qty="', escapeAttr(product.id), '" data-qty="', item.qty - 1, '" aria-label="Decrease quantity">-</button>',
        '<span class="px-2 text-sm">', item.qty, '</span>',
        '<button class="px-2 py-1" data-cart-qty="', escapeAttr(product.id), '" data-qty="', item.qty + 1, '" aria-label="Increase quantity">+</button>',
        '</div>',
        '<span class="price-now text-sm">', money(product.price * item.qty), '</span>',
        '</div>',
        '</div>',
        '<button data-cart-remove="', escapeAttr(product.id), '" style="color:var(--muted-2)" class="hover:text-white transition-colors self-start" aria-label="Remove ', escapeAttr(product.name), '">x</button>',
        '</div>'
      ].join('');
    }).join('');

    if (footer) {
      footer.innerHTML = [
        '<div class="flex items-center justify-between mb-4">',
        '<span style="color:var(--muted)">Subtotal</span>',
        '<span class="price-now text-lg">', money(cartTotal(cart)), '</span>',
        '</div>',
        '<button class="btn btn-primary w-full" data-checkout>Proceed to Checkout</button>'
      ].join('');
    }
  }

  function openCart() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    var drawer = document.getElementById('mobile-drawer');
    var overlay = document.getElementById('mobile-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    var drawer = document.getElementById('mobile-drawer');
    var overlay = document.getElementById('mobile-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
    }
    document.body.style.overflow = '';
  }

  function closeSearch() {
    var modal = document.getElementById('search-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeProfile() {
    var modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeQuickView() {
    var modal = document.getElementById('quickview-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var span = toast.querySelector('span');
    if (span) span.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.style.transform = 'translateY(140%)';
      toast.classList.remove('show');
    }, 2600);
  }

  function openQuickView(id) {
    var product = findProduct(id);
    var content = document.getElementById('quickview-content');
    var modal = document.getElementById('quickview-modal');
    if (!product || !content || !modal) return;

    content.innerHTML = [
      '<div class="grid md:grid-cols-2 gap-0">',
      '<div class="relative" style="background:#0E1413">',
      '<img src="', escapeAttr(product.img), '" alt="', escapeAttr(product.name), '" class="w-full h-full object-cover" style="max-height:480px">',
      '</div>',
      '<div class="p-7 flex flex-col overflow-y-auto" style="max-height:480px">',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">', escapeHTML(product.category), '</p>',
      '<h3 class="font-display text-2xl mt-1">', escapeHTML(product.name), '</h3>',
      '<div class="flex items-baseline gap-2 mt-3"><span class="price-now text-2xl">', money(product.price), '</span></div>',
      '<p class="text-sm mt-4" style="color:var(--muted)">', escapeHTML(product.desc), '</p>',
      '<button class="btn btn-primary mt-6" data-add-cart="', escapeAttr(product.id), '">Add to cart</button>',
      '<a href="product.html?id=', escapeAttr(product.id), '" class="text-sm mt-4 underline underline-offset-4" style="color:var(--muted)">View details -&gt;</a>',
      '</div>',
      '</div>'
    ].join('');

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function performSearch(query) {
    var container = document.getElementById('search-results');
    if (!container) return;

    if (!query || query.length < 2) {
      container.innerHTML = '<p class="text-sm" style="color:var(--muted-2)">Type at least 2 characters...</p>';
      return;
    }

    var needle = query.toLowerCase();
    var results = products().filter(function (product) {
      return product.name.toLowerCase().indexOf(needle) !== -1 ||
        product.category.toLowerCase().indexOf(needle) !== -1 ||
        product.desc.toLowerCase().indexOf(needle) !== -1;
    });

    if (!results.length) {
      container.innerHTML = '<div class="text-center py-8"><p class="text-sm" style="color:var(--muted)">No products found for "' + escapeHTML(query) + '"</p></div>';
      return;
    }

    container.innerHTML = results.map(function (product) {
      return [
        '<a href="product.html?id=', escapeAttr(product.id), '" class="flex items-center gap-4 p-3 rounded-md hover:bg-white/5 transition-colors group">',
        '<img src="', escapeAttr(product.img), '" alt="', escapeAttr(product.name), '" class="w-12 h-12 object-cover rounded-md flex-shrink-0">',
        '<div class="flex-1 min-w-0">',
        '<p class="text-sm font-medium truncate group-hover:text-[var(--primary)] transition-colors">', escapeHTML(product.name), '</p>',
        '<p class="text-xs" style="color:var(--muted-2)">', escapeHTML(product.category), '</p>',
        '</div>',
        '<span class="price-now text-sm">', money(product.price), '</span>',
        '</a>'
      ].join('');
    }).join('');
  }

  function openProfile() {
    var modal = document.getElementById('profile-modal');
    var display = document.getElementById('profile-display');
    var form = document.getElementById('profile-form');
    var profile = Store.profile;
    if (!modal || !display || !form) return;

    if (profile) {
      display.style.display = 'block';
      form.style.display = 'none';
      var name = document.getElementById('profile-name-display');
      var email = document.getElementById('profile-email-display');
      var avatar = document.getElementById('profile-avatar');
      if (name) name.textContent = profile.name || 'User';
      if (email) email.textContent = profile.email || '';
      if (avatar) avatar.textContent = (profile.name || 'U').charAt(0).toUpperCase();
    } else {
      display.style.display = 'none';
      form.style.display = 'block';
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    var nameInput = document.getElementById('profile-name-input');
    var emailInput = document.getElementById('profile-email-input');
    var name = nameInput ? nameInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';
    if (!name || !email) {
      showToast('Please fill in all fields');
      return;
    }
    Store.setProfile({ name: name, email: email });
    closeProfile();
    showToast('Welcome, ' + name + '!');
  }

  function handleProfileLogout() {
    Store.setProfile(null);
    closeProfile();
    showToast('Logged out');
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  function renderHome() {
    var categoryGrid = document.getElementById('category-grid');
    if (categoryGrid) {
      categoryGrid.innerHTML = categories().map(categoryTileHTML).join('');
    }

    var featuredGrid = document.getElementById('featured-grid');
    if (featuredGrid) {
      featuredGrid.innerHTML = products().slice(0, 4).map(productCardHTML).join('');
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

    var allCategories = [{ name: 'All categories', slug: 'all' }].concat(categories());
    el.innerHTML = allCategories.map(function (category) {
      return [
        '<label class="flex items-center gap-2">',
        '<input type="radio" name="cat" value="', escapeAttr(category.slug), '" ', shopFilters.cat === category.slug ? 'checked' : '', '>',
        escapeHTML(category.name),
        '</label>'
      ].join('');
    }).join('');
  }

  function renderShopProducts() {
    var countEl = document.getElementById('results-count');
    var grid = document.getElementById('product-grid');
    var empty = document.getElementById('empty-state');
    if (!grid || !shopFilters) return;

    var list = products().filter(function (product) {
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
    grid.innerHTML = list.map(productCardHTML).join('');
    if (empty) empty.classList.toggle('hidden', list.length > 0);
    grid.classList.toggle('hidden', list.length === 0);
    syncWishlistButtons();
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

  function renderProductPage() {
    var root = document.getElementById('product-root');
    if (!root) return;

    var currentProducts = products();
    var params = new URLSearchParams(window.location.search);
    var requestedId = params.get('id') || (currentProducts[0] ? currentProducts[0].id : '');
    var product = findProduct(requestedId) || currentProducts[0];
    productDetailQty = 1;

    if (!product) {
      root.innerHTML = '<div class="py-20"><h1 class="font-display text-3xl">Product not found</h1><a href="shop.html" class="btn btn-primary mt-6">Return to shop</a></div>';
      return;
    }

    document.title = product.name + ' - Arsenic Energies';
    var desc = document.getElementById('page-desc');
    var crumb = document.getElementById('crumb-cat');
    if (desc) desc.setAttribute('content', product.desc || '');
    if (crumb) {
      crumb.innerHTML = '<a href="shop.html?cat=' + escapeAttr(product.slug) + '" class="hover:text-white transition-colors">' + escapeHTML(product.category) + '</a> / <span class="text-white">' + escapeHTML(product.name) + '</span>';
    }

    var specs = product.specs || {};
    root.innerHTML = [
      '<div class="reveal">',
      '<div class="rounded-[var(--radius-md)] overflow-hidden relative" style="background:#0E1413; aspect-ratio:1/1">',
      product.badge ? '<span class="plate-tag ' + (product.badgeType === 'orange' ? 'orange' : '') + '">' + escapeHTML(product.badge) + '</span>' : '',
      '<img id="main-img" src="', escapeAttr(product.img), '" alt="', escapeAttr(product.name), '" class="w-full h-full object-cover">',
      '</div>',
      '<div class="grid grid-cols-2 gap-4 mt-4">',
      '<button data-product-image="', escapeAttr(product.img), '" class="rounded-md overflow-hidden aspect-square border" style="border-color:var(--line)" aria-label="Show primary product image"><img src="', escapeAttr(product.img), '" alt="" class="w-full h-full object-cover"></button>',
      '<button data-product-image="', escapeAttr(product.img2 || product.img), '" class="rounded-md overflow-hidden aspect-square border" style="border-color:var(--line)" aria-label="Show alternate product image"><img src="', escapeAttr(product.img2 || product.img), '" alt="" class="w-full h-full object-cover"></button>',
      '</div>',
      '</div>',
      '<div class="reveal">',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">', escapeHTML(product.category), '</p>',
      '<h1 class="font-display text-3xl lg:text-4xl mt-2">', escapeHTML(product.name), '</h1>',
      '<div class="flex items-center gap-2 mt-3">', starRow(product.rating), '<span class="text-sm" style="color:var(--muted-2)">', escapeHTML(product.rating), ' (', escapeHTML(product.reviews || 0), ' reviews)</span></div>',
      '<div class="flex items-baseline gap-3 mt-5"><span class="price-now text-3xl">', money(product.price), '</span>',
      product.oldPrice ? '<span class="price-old text-lg">' + money(product.oldPrice) + '</span>' : '',
      '</div>',
      '<p class="mt-5 leading-relaxed" style="color:var(--muted)">', escapeHTML(product.desc), '</p>',
      '<div class="mt-6 flex items-center gap-2 text-sm"><span class="w-2 h-2 rounded-full" style="background:', product.stock ? 'var(--green)' : '#6E7876', '"></span>', product.stock ? 'In stock, ready to ship' : 'Currently out of stock', '</div>',
      '<div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-b py-6" style="border-color:var(--line)">',
      Object.keys(specs).map(function (key) {
        return '<div style="color:var(--muted-2)">' + escapeHTML(key) + '</div><div>' + escapeHTML(specs[key]) + '</div>';
      }).join(''),
      '</div>',
      '<div class="flex items-center gap-3 mt-8">',
      '<div class="qty-control flex items-center">',
      '<button class="px-3 py-3" data-pd-qty-change="-1" aria-label="Decrease quantity">-</button>',
      '<span class="px-4 text-sm" id="pd-qty">1</span>',
      '<button class="px-3 py-3" data-pd-qty-change="1" aria-label="Increase quantity">+</button>',
      '</div>',
      '<button class="btn btn-primary flex-1" data-pd-add="', escapeAttr(product.id), '" ', product.stock ? '' : 'disabled style="opacity:.4"', '>Add to cart</button>',
      '</div>',
      '<button class="btn btn-outline w-full mt-3" data-pd-buy="', escapeAttr(product.id), '" ', product.stock ? '' : 'disabled style="opacity:.4"', '>Buy now</button>',
      '<button class="flex items-center gap-2 mt-6 text-sm" data-wish="', escapeAttr(product.id), '" style="color:var(--muted)">',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.8 5.6 4.1 8 3.6 10.4 4.9 12 7c1.6-2.1 4-3.4 6.4-2.9 3.6.7 5.2 4.3 3.6 7.6C19.5 16.1 12 21 12 21z"/></svg>',
      'Save to wishlist',
      '</button>',
      '</div>'
    ].join('');

    var rev1 = document.getElementById('rev1-stars');
    var rev2 = document.getElementById('rev2-stars');
    if (rev1) rev1.innerHTML = starRow(5);
    if (rev2) rev2.innerHTML = starRow(4);

    var relatedGrid = document.getElementById('related-grid');
    if (relatedGrid) {
      var related = currentProducts
        .filter(function (item) { return item.slug === product.slug && item.id !== product.id; })
        .concat(currentProducts.filter(function (item) { return item.slug !== product.slug; }))
        .slice(0, 4);
      relatedGrid.innerHTML = related.map(productCardHTML).join('');
    }

    syncWishlistButtons();
  }

  function updateProductDetailQty(delta) {
    productDetailQty = Math.max(1, productDetailQty + delta);
    var qty = document.getElementById('pd-qty');
    if (qty) qty.textContent = productDetailQty;
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

  function syncWishlistButtons() {
    var wishlist = readWishlist();
    document.querySelectorAll('[data-wish]').forEach(function (button) {
      var active = wishlist.indexOf(button.getAttribute('data-wish')) !== -1;
      button.classList.toggle('active', active);
      var icon = button.querySelector('svg');
      if (icon) {
        icon.setAttribute('fill', active ? '#F97316' : 'none');
        icon.setAttribute('stroke', active ? '#F97316' : 'currentColor');
      }
    });
  }

  function setupControls() {
    var nav = document.getElementById('site-nav');
    function syncNav() {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    }
    syncNav();
    window.addEventListener('scroll', syncNav, { passive: true });

    var mobileOpen = document.getElementById('mobile-menu-btn');
    var mobileClose = document.getElementById('mobile-menu-close');
    var mobileOverlay = document.getElementById('mobile-overlay');
    if (mobileOpen) mobileOpen.addEventListener('click', openMobileMenu);
    if (mobileClose) mobileClose.addEventListener('click', closeMobileMenu);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);

    var cartButton = document.getElementById('cart-icon-btn');
    var cartClose = document.getElementById('cart-close-btn');
    var cartOverlay = document.getElementById('cart-overlay');
    if (cartButton) cartButton.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    var searchButton = document.getElementById('search-btn');
    var searchClose = document.getElementById('search-close-btn');
    var searchOverlay = document.getElementById('search-overlay');
    var searchInput = document.getElementById('search-modal-input');
    if (searchButton) {
      searchButton.addEventListener('click', function () {
        var modal = document.getElementById('search-modal');
        if (modal) modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(function () {
          if (searchInput) searchInput.focus();
        }, 250);
      });
    }
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    if (searchOverlay) searchOverlay.addEventListener('click', closeSearch);
    if (searchInput) searchInput.addEventListener('input', debounce(function (event) {
      performSearch(event.target.value);
    }, 220));

    var profileButton = document.getElementById('profile-btn');
    var profileClose = document.getElementById('profile-close-btn');
    var profileOverlay = document.getElementById('profile-overlay');
    var profileForm = document.getElementById('profile-form');
    var profileLogout = document.getElementById('profile-logout-btn');
    if (profileButton) profileButton.addEventListener('click', openProfile);
    if (profileClose) profileClose.addEventListener('click', closeProfile);
    if (profileOverlay) profileOverlay.addEventListener('click', closeProfile);
    if (profileForm) profileForm.addEventListener('submit', handleProfileSubmit);
    if (profileLogout) profileLogout.addEventListener('click', handleProfileLogout);

    var quickviewOverlay = document.getElementById('quickview-overlay');
    var quickviewClose = document.getElementById('quickview-close-btn');
    if (quickviewOverlay) quickviewOverlay.addEventListener('click', closeQuickView);
    if (quickviewClose) quickviewClose.addEventListener('click', closeQuickView);

    var shopSearch = document.getElementById('search-input');
    var sortSelect = document.getElementById('sort-select');
    var instockFilter = document.getElementById('filter-instock');
    var clearFilters = document.getElementById('clear-filters');
    var categoryFilter = document.getElementById('filter-category');

    if (shopSearch) {
      shopSearch.addEventListener('input', function (event) {
        if (!shopFilters) return;
        shopFilters.search = event.target.value;
        renderShopProducts();
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', function (event) {
        if (!shopFilters) return;
        shopFilters.sort = event.target.value;
        renderShopProducts();
      });
    }
    if (instockFilter) {
      instockFilter.addEventListener('change', function (event) {
        if (!shopFilters) return;
        shopFilters.instock = event.target.checked;
        renderShopProducts();
      });
    }
    if (categoryFilter) {
      categoryFilter.addEventListener('change', function (event) {
        if (!shopFilters || event.target.name !== 'cat') return;
        shopFilters.cat = event.target.value;
        renderShopProducts();
      });
    }
    document.querySelectorAll('input[name="price"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!shopFilters) return;
        shopFilters.price = input.value;
        renderShopProducts();
      });
    });
    document.querySelectorAll('input[name="rating"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!shopFilters) return;
        shopFilters.rating = Number(input.value) || 0;
        renderShopProducts();
      });
    });
    if (clearFilters) clearFilters.addEventListener('click', resetShopFilters);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeCart();
        closeSearch();
        closeProfile();
        closeQuickView();
        closeMobileMenu();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (searchButton) searchButton.click();
      }
    });

    document.addEventListener('click', function (event) {
      var imageButton = event.target.closest('[data-product-image]');
      if (imageButton) {
        var mainImage = document.getElementById('main-img');
        if (mainImage) mainImage.src = imageButton.getAttribute('data-product-image');
        return;
      }

      var productQty = event.target.closest('[data-pd-qty-change]');
      if (productQty) {
        updateProductDetailQty(Number(productQty.getAttribute('data-pd-qty-change')) || 0);
        return;
      }

      var productAdd = event.target.closest('[data-pd-add]');
      if (productAdd && !productAdd.disabled) {
        Store.addToCart(productAdd.getAttribute('data-pd-add'), productDetailQty);
        return;
      }

      var productBuy = event.target.closest('[data-pd-buy]');
      if (productBuy && !productBuy.disabled) {
        Store.addToCart(productBuy.getAttribute('data-pd-buy'), productDetailQty);
        openCart();
        return;
      }

      var cartQty = event.target.closest('[data-cart-qty]');
      if (cartQty) {
        Store.updateQty(cartQty.getAttribute('data-cart-qty'), Number(cartQty.getAttribute('data-qty')));
        return;
      }

      var cartRemove = event.target.closest('[data-cart-remove]');
      if (cartRemove) {
        Store.removeFromCart(cartRemove.getAttribute('data-cart-remove'));
        return;
      }

      var addCart = event.target.closest('[data-add-cart]');
      if (addCart && !addCart.disabled) {
        Store.addToCart(addCart.getAttribute('data-add-cart'), Number(addCart.getAttribute('data-qty')) || 1);
        if (addCart.closest('#quickview-modal')) closeQuickView();
        return;
      }

      var wish = event.target.closest('[data-wish]');
      if (wish) {
        event.preventDefault();
        Store.toggleWishlist(wish.getAttribute('data-wish'));
        return;
      }

      var quickview = event.target.closest('[data-quickview]');
      if (quickview) {
        event.preventDefault();
        openQuickView(quickview.getAttribute('data-quickview'));
        return;
      }

      if (event.target.closest('[data-checkout]')) {
        showToast('Checkout coming soon!');
      }
    });
  }

  function exposeGlobals() {
    window.Store = Store;
    window.PRODUCTS = products();
    window.CATEGORIES = categories();
    window.money = money;
    window.starRow = starRow;
    window.findProduct = findProduct;
    window.productCardHTML = productCardHTML;
    window.categoryTileHTML = categoryTileHTML;
    window.openCartFromHere = openCart;
    window.openCart = openCart;
    window.closeCart = closeCart;
    window.closeSearch = closeSearch;
    window.closeProfile = closeProfile;
    window.openQuickView = openQuickView;
    window.closeQuickView = closeQuickView;
    window.showToast = showToast;
    window.performSearch = performSearch;
    window.refreshCatalogGlobals = function () {
      var catalog = loadCatalog();
      window.PRODUCTS = catalog.products;
      window.CATEGORIES = catalog.categories;
      renderHome();
      renderShop();
      renderProductPage();
      updateCartUI();
    };
  }

  function init() {
    saveCatalog(loadCatalog());
    exposeGlobals();
    renderHome();
    renderShop();
    renderProductPage();
    setupControls();
    setupCalculator();
    setupReveal();
    setupCounters();
    setupTestimonials();
    updateCartUI();
    syncWishlistButtons();
  }

  exposeGlobals();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
