(function () {
  'use strict';

  var root = window.Arsenic = window.Arsenic || {};
  var utils = root.utils;
  var store = root.store;
  var components = root.components;
  var pages = root.pages;
  var Store = store.Store;
  var toastTimer = null;
  var pendingCheckout = false;

  function get(id) {
    return document.getElementById(id);
  }

  function renderCartDrawer(cart) {
    var body = get('cart-body');
    var footer = get('cart-footer');
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
      var product = store.findProduct(item.id);
      if (!product) return '';
      return [
        '<div class="flex gap-3 px-5 py-4 border-b" style="border-color:var(--line)">',
        '<img src="', utils.escapeAttr(product.img), '" alt="', utils.escapeAttr(product.name), '" class="w-16 h-16 object-cover rounded-md flex-shrink-0">',
        '<div class="flex-1 min-w-0">',
        '<p class="text-sm font-medium truncate">', utils.escapeHTML(product.name), '</p>',
        '<p class="text-xs" style="color:var(--muted-2)">', utils.escapeHTML(product.category), '</p>',
        '<div class="flex items-center justify-between mt-2">',
        '<div class="qty-control flex items-center">',
        '<button class="px-2 py-1" data-cart-qty="', utils.escapeAttr(product.id), '" data-qty="', item.qty - 1, '" aria-label="Decrease quantity">-</button>',
        '<span class="px-2 text-sm">', item.qty, '</span>',
        '<button class="px-2 py-1" data-cart-qty="', utils.escapeAttr(product.id), '" data-qty="', item.qty + 1, '" aria-label="Increase quantity">+</button>',
        '</div>',
        '<span class="price-now text-sm">', utils.money(product.price * item.qty), '</span>',
        '</div>',
        '</div>',
        '<button data-cart-remove="', utils.escapeAttr(product.id), '" style="color:var(--muted-2)" class="hover:text-white transition-colors self-start" aria-label="Remove ', utils.escapeAttr(product.name), '">&times;</button>',
        '</div>'
      ].join('');
    }).join('');

    if (footer) {
      footer.innerHTML = [
        '<div class="flex items-center justify-between mb-4">',
        '<span style="color:var(--muted)">Subtotal</span>',
        '<span class="price-now text-lg">', utils.money(store.cartTotal(cart)), '</span>',
        '</div>',
        '<button class="btn btn-primary w-full" data-checkout>Proceed to Checkout</button>'
      ].join('');
    }
  }

  function updateCartUI() {
    var cart = store.readCart();
    var count = cart.reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);

    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    renderCartDrawer(cart);
  }

  function openCart() {
    var drawer = get('cart-drawer');
    var overlay = get('cart-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    var drawer = get('cart-drawer');
    var overlay = get('cart-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    var drawer = get('mobile-drawer');
    var overlay = get('mobile-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    var drawer = get('mobile-drawer');
    var overlay = get('mobile-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
    }
    document.body.style.overflow = '';
  }

  function openSearch() {
    var modal = get('search-modal');
    var input = get('search-modal-input');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      if (input) input.focus();
    }, 250);
  }

  function closeSearch() {
    var modal = get('search-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeProfile() {
    var modal = get('profile-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeQuickView() {
    var modal = get('quickview-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(message) {
    var toast = get('toast');
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

  function backendAuthEnabled() {
    return root.api && root.api.isEnabled();
  }

  function accountName(user) {
    if (!user) return '';
    return user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || '';
  }

  function cacheAccount(user) {
    if (!user) return;
    Store.setProfile({
      name: accountName(user),
      email: user.email,
      phone: user.phone || '',
      company: user.company || ''
    });
  }

  function setAuthMode(mode) {
    mode = mode === 'register' ? 'register' : 'login';
    var loginForm = get('login-form');
    var registerForm = get('register-form');
    var loginTab = get('auth-tab-login');
    var registerTab = get('auth-tab-register');
    if (loginForm) loginForm.style.display = mode === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = mode === 'register' ? 'block' : 'none';
    if (loginTab) loginTab.classList.toggle('btn-outline', mode !== 'login');
    if (registerTab) registerTab.classList.toggle('btn-outline', mode !== 'register');
  }

  function renderProfileState(mode) {
    var display = get('profile-display');
    var authPanel = get('auth-panel');
    var fallbackForm = get('profile-form');
    var user = backendAuthEnabled() ? root.api.getAuthUser() : Store.profile;

    if (!display || !fallbackForm) return;

    if (user) {
      display.style.display = 'block';
      if (authPanel) authPanel.style.display = 'none';
      fallbackForm.style.display = 'none';
      if (get('profile-name-display')) get('profile-name-display').textContent = accountName(user) || 'User';
      if (get('profile-email-display')) get('profile-email-display').textContent = user.email || '';
      if (get('profile-avatar')) get('profile-avatar').textContent = (accountName(user) || 'U').charAt(0).toUpperCase();
      return;
    }

    display.style.display = 'none';
    if (backendAuthEnabled()) {
      if (authPanel) authPanel.style.display = 'block';
      fallbackForm.style.display = 'none';
      setAuthMode(mode || 'login');
    } else {
      if (authPanel) authPanel.style.display = 'none';
      fallbackForm.style.display = 'block';
      if (get('profile-login-btn')) get('profile-login-btn').textContent = 'Continue';
    }
  }

  function openQuickView(id) {
    var product = store.findProduct(id);
    var content = get('quickview-content');
    var modal = get('quickview-modal');
    if (!product || !content || !modal) return;

    content.innerHTML = [
      '<div class="grid md:grid-cols-2 gap-0">',
      '<div class="relative" style="background:#0E1413">',
      '<img src="', utils.escapeAttr(product.img), '" alt="', utils.escapeAttr(product.name), '" class="w-full h-full object-cover" style="max-height:480px">',
      '</div>',
      '<div class="p-7 flex flex-col overflow-y-auto" style="max-height:480px">',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">', utils.escapeHTML(product.category), '</p>',
      '<h3 class="font-display text-2xl mt-1">', utils.escapeHTML(product.name), '</h3>',
      '<div class="flex items-baseline gap-2 mt-3"><span class="price-now text-2xl">', utils.money(product.price), '</span></div>',
      '<p class="text-sm mt-4" style="color:var(--muted)">', utils.escapeHTML(product.desc), '</p>',
      '<button class="btn btn-primary mt-6" data-add-cart="', utils.escapeAttr(product.id), '">Add to cart</button>',
      '<a href="product.html?id=', utils.escapeAttr(product.id), '" class="text-sm mt-4 underline underline-offset-4" style="color:var(--muted)">View details -&gt;</a>',
      '</div>',
      '</div>'
    ].join('');

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function performSearch(query) {
    var container = get('search-results');
    if (!container) return;

    if (!query || query.length < 2) {
      container.innerHTML = '<p class="text-sm" style="color:var(--muted-2)">Type at least 2 characters...</p>';
      return;
    }

    var needle = query.toLowerCase();
    var results = store.products().filter(function (product) {
      return product.name.toLowerCase().indexOf(needle) !== -1 ||
        product.category.toLowerCase().indexOf(needle) !== -1 ||
        product.desc.toLowerCase().indexOf(needle) !== -1;
    });

    if (!results.length) {
      container.innerHTML = '<div class="text-center py-8"><p class="text-sm" style="color:var(--muted)">No products found for "' + utils.escapeHTML(query) + '"</p></div>';
      return;
    }

    container.innerHTML = results.map(function (product) {
      return [
        '<a href="product.html?id=', utils.escapeAttr(product.id), '" class="flex items-center gap-4 p-3 rounded-md hover:bg-white/5 transition-colors group">',
        '<img src="', utils.escapeAttr(product.img), '" alt="', utils.escapeAttr(product.name), '" class="w-12 h-12 object-cover rounded-md flex-shrink-0">',
        '<div class="flex-1 min-w-0">',
        '<p class="text-sm font-medium truncate group-hover:text-[var(--primary)] transition-colors">', utils.escapeHTML(product.name), '</p>',
        '<p class="text-xs" style="color:var(--muted-2)">', utils.escapeHTML(product.category), '</p>',
        '</div>',
        '<span class="price-now text-sm">', utils.money(product.price), '</span>',
        '</a>'
      ].join('');
    }).join('');
  }

  function openProfile(mode) {
    var modal = get('profile-modal');
    if (!modal) return;
    renderProfileState(mode || 'login');

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    var nameInput = get('profile-name-input');
    var emailInput = get('profile-email-input');
    var name = nameInput ? nameInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';
    if (!name || !email) {
      showToast('Please fill in all fields');
      return;
    }
    if (backendAuthEnabled() && root.api.isAuthenticated()) {
      root.api.updateMe({ full_name: name }).then(function (user) {
        cacheAccount(user);
        renderProfileState();
        showToast('Profile updated');
      }).catch(function (error) {
        showToast('Profile error: ' + error.message);
      });
      return;
    }

    Store.setProfile({ name: name, email: email });
    closeProfile();
    showToast('Welcome, ' + name + '!');
  }

  function handleProfileLogout() {
    if (backendAuthEnabled() && root.api.isAuthenticated()) {
      root.api.logout().finally(function () {
        Store.setProfile(null);
        closeProfile();
        showToast('Logged out');
      });
      return;
    }
    Store.setProfile(null);
    closeProfile();
    showToast('Logged out');
  }

  function finishAuthentication(user, message) {
    cacheAccount(user);
    closeProfile();
    showToast(message);
    if (pendingCheckout) {
      pendingCheckout = false;
      setTimeout(startCheckout, 250);
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    if (!backendAuthEnabled()) return;
    var email = get('login-email-input') ? get('login-email-input').value.trim() : '';
    var password = get('login-password-input') ? get('login-password-input').value : '';
    var remember = get('login-remember-input') ? get('login-remember-input').checked : true;
    if (!email || !password) {
      showToast('Enter your email and password');
      return;
    }
    root.api.login({ email: email, password: password, remember: remember }).then(function (result) {
      finishAuthentication(result.user, 'Signed in');
    }).catch(function (error) {
      showToast('Sign in error: ' + error.message);
    });
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    if (!backendAuthEnabled()) return;
    var name = get('register-name-input') ? get('register-name-input').value.trim() : '';
    var email = get('register-email-input') ? get('register-email-input').value.trim() : '';
    var phone = get('register-phone-input') ? get('register-phone-input').value.trim() : '';
    var password = get('register-password-input') ? get('register-password-input').value : '';
    var consent = get('register-consent-input') ? get('register-consent-input').checked : false;
    if (!name || !email || !password) {
      showToast('Complete your account details');
      return;
    }
    root.api.register({
      full_name: name,
      email: email,
      phone: phone,
      password: password,
      marketing_consent: consent,
      remember: true
    }).then(function (result) {
      finishAuthentication(result.user, 'Account created');
    }).catch(function (error) {
      showToast('Signup error: ' + error.message);
    });
  }

  function startCheckout() {
    var cart = store.readCart();

    if (!cart.length) {
      showToast('Your cart is empty');
      return;
    }

    if (!root.api || !root.api.isEnabled()) {
      showToast('Secure checkout needs backend API setup');
      return;
    }

    if (!root.api.isAuthenticated()) {
      pendingCheckout = true;
      openProfile('login');
      showToast('Sign in or create an account to checkout');
      return;
    }

    showToast('Opening secure checkout...');
    root.api.createCheckoutSession({
      items: cart.map(function (item) {
        return { id: item.id, qty: item.qty };
      }),
      success_url: window.location.origin + window.location.pathname.replace(/[^/]*$/, 'checkout-success.html'),
      cancel_url: window.location.href
    }).then(function (result) {
      if (result && result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      showToast('Checkout session was not returned');
    }).catch(function (error) {
      showToast('Checkout error: ' + error.message);
    });
  }

  function submitSalesInquiry(form) {
    if (!root.api || !root.api.isEnabled()) {
      showToast('Sales email API is not configured yet');
      return;
    }

    var name = get('sales-name') ? get('sales-name').value.trim() : '';
    var email = get('sales-email') ? get('sales-email').value.trim() : '';
    var message = get('sales-message') ? get('sales-message').value.trim() : '';

    if (!name || !email || !message) {
      showToast('Please complete the sales form');
      return;
    }

    root.api.createInquiry({
      source: 'contact',
      name: name,
      email: email,
      subject: 'Website sales inquiry',
      message: message,
      metadata: {
        page: window.location.pathname
      }
    }).then(function () {
      form.reset();
      showToast('Message sent to sales');
    }).catch(function (error) {
      showToast('Message error: ' + error.message);
    });
  }

  function setupControls() {
    var nav = get('site-nav');
    function syncNav() {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    }
    syncNav();
    window.addEventListener('scroll', syncNav, { passive: true });

    var mobileOpen = get('mobile-menu-btn');
    var mobileClose = get('mobile-menu-close');
    var mobileOverlay = get('mobile-overlay');
    if (mobileOpen) mobileOpen.addEventListener('click', openMobileMenu);
    if (mobileClose) mobileClose.addEventListener('click', closeMobileMenu);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);

    var cartButton = get('cart-icon-btn');
    var cartClose = get('cart-close-btn');
    var cartOverlay = get('cart-overlay');
    if (cartButton) cartButton.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    var searchButton = get('search-btn');
    var searchClose = get('search-close-btn');
    var searchOverlay = get('search-overlay');
    var searchInput = get('search-modal-input');
    if (searchButton) searchButton.addEventListener('click', openSearch);
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    if (searchOverlay) searchOverlay.addEventListener('click', closeSearch);
    if (searchInput) {
      searchInput.addEventListener('input', utils.debounce(function (event) {
        performSearch(event.target.value);
      }, 220));
    }

    var profileButton = get('profile-btn');
    var profileClose = get('profile-close-btn');
    var profileOverlay = get('profile-overlay');
    var profileForm = get('profile-form');
    var loginForm = get('login-form');
    var registerForm = get('register-form');
    var profileLogout = get('profile-logout-btn');
    var profileEdit = get('profile-edit-btn');
    if (profileButton) profileButton.addEventListener('click', function () { openProfile('login'); });
    if (profileClose) profileClose.addEventListener('click', closeProfile);
    if (profileOverlay) profileOverlay.addEventListener('click', closeProfile);
    if (profileForm) profileForm.addEventListener('submit', handleProfileSubmit);
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
    if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);
    document.querySelectorAll('[data-auth-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        setAuthMode(button.getAttribute('data-auth-mode'));
      });
    });
    if (profileLogout) profileLogout.addEventListener('click', handleProfileLogout);
    if (profileEdit) {
      profileEdit.addEventListener('click', function () {
        var profile = backendAuthEnabled() ? root.api.getAuthUser() || {} : Store.profile || {};
        var display = get('profile-display');
        var form = get('profile-form');
        var authPanel = get('auth-panel');
        if (display) display.style.display = 'none';
        if (authPanel) authPanel.style.display = 'none';
        if (form) form.style.display = 'block';
        if (get('profile-name-input')) get('profile-name-input').value = accountName(profile) || '';
        if (get('profile-email-input')) get('profile-email-input').value = profile.email || '';
        if (get('profile-email-input')) get('profile-email-input').disabled = backendAuthEnabled();
        if (get('profile-login-btn')) get('profile-login-btn').textContent = backendAuthEnabled() ? 'Save Profile' : 'Continue';
      });
    }

    var quickviewOverlay = get('quickview-overlay');
    var quickviewClose = get('quickview-close-btn');
    if (quickviewOverlay) quickviewOverlay.addEventListener('click', closeQuickView);
    if (quickviewClose) quickviewClose.addEventListener('click', closeQuickView);

    var shopSearch = get('search-input');
    var sortSelect = get('sort-select');
    var instockFilter = get('filter-instock');
    var clearFilters = get('clear-filters');
    var categoryFilter = get('filter-category');

    if (shopSearch) {
      shopSearch.addEventListener('input', function (event) {
        pages.setShopFilter('search', event.target.value);
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', function (event) {
        pages.setShopFilter('sort', event.target.value);
      });
    }
    if (instockFilter) {
      instockFilter.addEventListener('change', function (event) {
        pages.setShopFilter('instock', event.target.checked);
      });
    }
    if (categoryFilter) {
      categoryFilter.addEventListener('change', function (event) {
        if (event.target.name === 'cat') pages.setShopFilter('cat', event.target.value);
      });
    }
    document.querySelectorAll('input[name="price"]').forEach(function (input) {
      input.addEventListener('change', function () {
        pages.setShopFilter('price', input.value);
      });
    });
    document.querySelectorAll('input[name="rating"]').forEach(function (input) {
      input.addEventListener('change', function () {
        pages.setShopFilter('rating', Number(input.value) || 0);
      });
    });
    if (clearFilters) clearFilters.addEventListener('click', pages.resetShopFilters);

    var newsletter = get('newsletter-form');
    if (newsletter) {
      newsletter.addEventListener('submit', function (event) {
        event.preventDefault();
        var email = get('newsletter-email') ? get('newsletter-email').value.trim() : '';
        if (root.api && root.api.isEnabled() && email) {
          root.api.createInquiry({
            source: 'contact',
            name: 'Newsletter subscriber',
            email: email,
            subject: 'Newsletter subscription',
            message: 'Please send product updates, energy tips, and new arrivals.',
            metadata: { form: 'newsletter' }
          }).catch(function () {});
        }
        newsletter.reset();
        showToast('Thanks for subscribing');
      });
    }

    var salesInquiry = get('sales-inquiry-form');
    if (salesInquiry) {
      salesInquiry.addEventListener('submit', function (event) {
        event.preventDefault();
        submitSalesInquiry(salesInquiry);
      });
    }

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
        openSearch();
      }
    });

    document.addEventListener('click', function (event) {
      var imageButton = event.target.closest('[data-product-image]');
      if (imageButton) {
        var mainImage = get('main-img');
        if (mainImage) mainImage.src = imageButton.getAttribute('data-product-image');
        return;
      }

      var productQty = event.target.closest('[data-pd-qty-change]');
      if (productQty) {
        pages.updateProductDetailQty(Number(productQty.getAttribute('data-pd-qty-change')) || 0);
        return;
      }

      var productAdd = event.target.closest('[data-pd-add]');
      if (productAdd && !productAdd.disabled) {
        Store.addToCart(productAdd.getAttribute('data-pd-add'), pages.currentProductDetailQty());
        return;
      }

      var productBuy = event.target.closest('[data-pd-buy]');
      if (productBuy && !productBuy.disabled) {
        Store.addToCart(productBuy.getAttribute('data-pd-buy'), pages.currentProductDetailQty());
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
        startCheckout();
      }
    });
  }

  function exposeGlobals() {
    window.PRODUCTS = store.products();
    window.CATEGORIES = store.categories();
    window.money = utils.money;
    window.starRow = utils.starRow;
    window.findProduct = store.findProduct;
    window.productCardHTML = components.productCardHTML;
    window.categoryTileHTML = components.categoryTileHTML;
    window.openCartFromHere = openCart;
    window.openCart = openCart;
    window.closeCart = closeCart;
    window.closeSearch = closeSearch;
    window.closeProfile = closeProfile;
    window.openQuickView = openQuickView;
    window.closeQuickView = closeQuickView;
    window.showToast = showToast;
    window.performSearch = performSearch;
    window.refreshCatalogGlobals = pages.refreshCatalogViews;
  }

  function init() {
    components.mountSharedLayout();
    store.saveCatalog(store.loadCatalog());
    exposeGlobals();
    pages.renderHome();
    pages.renderShop();
    pages.renderProductPage();
    setupControls();
    pages.setupCalculator();
    pages.setupReveal();
    pages.setupCounters();
    pages.setupTestimonials();
    updateCartUI();
    components.syncWishlistButtons();
    store.syncRemoteCatalog().then(function (changed) {
      if (changed) pages.refreshCatalogViews();
    });
    if (backendAuthEnabled() && root.api.isAuthenticated()) {
      root.api.me().then(cacheAccount).catch(function () {
        Store.setProfile(null);
      });
    }
  }

  root.ui = {
    updateCartUI: updateCartUI,
    openCart: openCart,
    closeCart: closeCart,
    openSearch: openSearch,
    closeSearch: closeSearch,
    openProfile: openProfile,
    closeProfile: closeProfile,
    openQuickView: openQuickView,
    closeQuickView: closeQuickView,
    showToast: showToast,
    performSearch: performSearch
  };

  exposeGlobals();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
