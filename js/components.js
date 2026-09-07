(function () {
  'use strict';

  var root = window.Arsenic = window.Arsenic || {};
  var utils = root.utils;
  var store = root.store;

  function pageName() {
    return (document.body && document.body.dataset.page) || 'home';
  }

  function isActive(key) {
    var page = pageName();
    if (key === 'shop') return page === 'shop' || page === 'product';
    return page === key;
  }

  function homeHref(anchor) {
    return pageName() === 'home' ? anchor : 'index.html' + anchor;
  }

  function navLink(label, href, key) {
    return '<a href="' + href + '" class="nav-link' + (isActive(key) ? ' active' : '') + '">' + label + '</a>';
  }

  function brandHTML() {
    return [
      '<a href="index.html" class="font-display leading-none">',
      '<span class="block text-[15px] tracking-wide font-semibold">ARSENIC</span>',
      '<span class="block text-[11px] tracking-[0.2em]" style="color:var(--primary)">ENERGIES</span>',
      '</a>'
    ].join('');
  }

  function searchIcon(size) {
    size = size || 18;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  }

  function profileIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>';
  }

  function cartIcon() {
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2A2 2 0 0 0 8.4 17H17a2 2 0 0 0 2-1.6L21 6H5"/></svg>';
  }

  function menuIcon() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  }

  function checkIcon() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#14100A" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  }

  function siteNavHTML() {
    return [
      '<nav id="site-nav" aria-label="Primary">',
      '<div class="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between py-5">',
      brandHTML(),
      '<div class="hidden lg:flex items-center gap-9">',
      navLink('Home', 'index.html', 'home'),
      navLink('Shop', 'shop.html', 'shop'),
      navLink('Solar Systems', 'shop.html?cat=solar-panels', 'solar'),
      navLink('Electronics', 'shop.html?cat=electronics', 'electronics'),
      navLink('Solutions', homeHref('#solutions'), 'solutions'),
      navLink('Contact', homeHref('#footer'), 'contact'),
      '</div>',
      '<div class="flex items-center gap-2">',
      '<button id="search-btn" class="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors" aria-label="Search products">',
      searchIcon(18),
      '</button>',
      '<button id="profile-btn" class="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors relative" aria-label="Account">',
      profileIcon(),
      '</button>',
      '<button id="cart-icon-btn" class="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors" aria-label="Open cart">',
      cartIcon(),
      '<span class="cart-count absolute -top-0.5 -right-0.5 items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold" style="background:var(--primary); color:#14100A; display:none;">0</span>',
      '</button>',
      '<button id="mobile-menu-btn" class="lg:hidden flex items-center justify-center w-10 h-10" aria-label="Open menu">',
      menuIcon(),
      '</button>',
      '</div>',
      '</div>',
      '</nav>'
    ].join('');
  }

  function mobileMenuHTML() {
    return [
      '<div id="mobile-overlay" class="fixed inset-0 bg-black/60 z-[110]" style="opacity:0;pointer-events:none;transition:opacity .35s ease"></div>',
      '<div id="mobile-drawer" class="fixed top-0 right-0 bottom-0 w-[82%] max-w-sm z-[120] p-6 flex flex-col" style="background:var(--surface)">',
      '<div class="flex justify-between items-center mb-8">',
      '<span class="font-display text-sm tracking-widest">MENU</span>',
      '<button id="mobile-menu-close" aria-label="Close menu" class="w-9 h-9 flex items-center justify-center">&times;</button>',
      '</div>',
      '<div class="flex flex-col gap-5 text-lg font-display">',
      '<a href="index.html">Home</a>',
      '<a href="shop.html">Shop</a>',
      '<a href="shop.html?cat=solar-panels">Solar Systems</a>',
      '<a href="shop.html?cat=electronics">Electronics</a>',
      '<a href="' + homeHref('#solutions') + '">Solutions</a>',
      '<a href="about.html">About</a>',
      '<a href="' + homeHref('#footer') + '">Contact</a>',
      '</div>',
      '</div>'
    ].join('');
  }

  function searchModalHTML() {
    return [
      '<div id="search-modal" class="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4" aria-hidden="true">',
      '<div id="search-overlay" class="absolute inset-0 bg-black/80"></div>',
      '<div class="modal-panel relative w-full max-w-2xl rounded-[var(--radius-md)] overflow-hidden" style="background:var(--surface)">',
      '<div class="p-5 border-b" style="border-color:var(--line)">',
      '<div class="flex items-center gap-3">',
      '<span style="color:var(--muted-2)">' + searchIcon(20) + '</span>',
      '<input id="search-modal-input" type="text" placeholder="Search products..." class="flex-1 bg-transparent border-0 outline-none text-base" style="color:var(--text)">',
      '<button id="search-close-btn" aria-label="Close search" class="w-8 h-8 flex items-center justify-center hover:text-[var(--primary)] transition-colors" style="color:var(--muted-2)">&times;</button>',
      '</div>',
      '</div>',
      '<div id="search-results" class="p-4 max-h-[60vh] overflow-y-auto">',
      '<p class="text-sm" style="color:var(--muted-2)">Type at least 2 characters to search...</p>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');
  }

  function profileModalHTML() {
    return [
      '<div id="profile-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4" aria-hidden="true">',
      '<div id="profile-overlay" class="absolute inset-0 bg-black/80"></div>',
      '<div class="modal-panel relative w-full max-w-md rounded-[var(--radius-md)] overflow-hidden" style="background:var(--surface)">',
      '<div class="flex items-center justify-between px-6 py-5 border-b" style="border-color:var(--line)">',
      '<h2 class="font-display text-lg">Account</h2>',
      '<button id="profile-close-btn" aria-label="Close profile" class="w-8 h-8 flex items-center justify-center hover:text-[var(--primary)] transition-colors" style="color:var(--muted-2)">&times;</button>',
      '</div>',
      '<div class="p-6">',
      '<div id="profile-display" style="display:none;">',
      '<div class="flex items-center gap-4 mb-6">',
      '<div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display" style="background:var(--primary); color:#14100A;" id="profile-avatar">U</div>',
      '<div>',
      '<p class="font-display text-lg" id="profile-name-display">User</p>',
      '<p class="text-sm" style="color:var(--muted-2)" id="profile-email-display">user@email.com</p>',
      '</div>',
      '</div>',
      '<div class="flex gap-3">',
      '<button id="profile-edit-btn" class="btn btn-outline flex-1">Profile</button>',
      '<button id="profile-logout-btn" class="btn btn-primary flex-1">Logout</button>',
      '</div>',
      '</div>',
      '<div id="auth-panel" style="display:none;">',
      '<div class="grid grid-cols-2 gap-2 p-1 rounded-md mb-5" style="background:#0B0F0E">',
      '<button type="button" class="btn btn-sm" data-auth-mode="login" id="auth-tab-login">Sign in</button>',
      '<button type="button" class="btn btn-sm btn-outline" data-auth-mode="register" id="auth-tab-register">Create account</button>',
      '</div>',
      '<form id="login-form" class="space-y-4">',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Email Address</label>',
      '<input id="login-email-input" type="email" autocomplete="email" required placeholder="Enter your email" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Password</label>',
      '<input id="login-password-input" type="password" autocomplete="current-password" required placeholder="Enter your password" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<label class="flex items-center gap-2 text-sm" style="color:var(--muted)"><input id="login-remember-input" type="checkbox" checked> Remember me</label>',
      '<button type="submit" class="btn btn-primary w-full">Sign in</button>',
      '</form>',
      '<form id="register-form" class="space-y-4" style="display:none;">',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Full Name</label>',
      '<input id="register-name-input" type="text" autocomplete="name" required placeholder="Enter your name" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Email Address</label>',
      '<input id="register-email-input" type="email" autocomplete="email" required placeholder="Enter your email" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Phone</label>',
      '<input id="register-phone-input" type="tel" autocomplete="tel" placeholder="Optional phone number" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Password</label>',
      '<input id="register-password-input" type="password" autocomplete="new-password" required minlength="8" placeholder="Create a password" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<label class="flex items-start gap-2 text-sm" style="color:var(--muted)"><input id="register-consent-input" type="checkbox" class="mt-1"> Send product updates and energy tips</label>',
      '<button type="submit" class="btn btn-primary w-full">Create account</button>',
      '</form>',
      '</div>',
      '<form id="profile-form" style="display:none;">',
      '<div class="space-y-4">',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Full Name</label>',
      '<input id="profile-name-input" type="text" required placeholder="Enter your name" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<div>',
      '<label class="text-sm" style="color:var(--muted-2)">Email Address</label>',
      '<input id="profile-email-input" type="email" required placeholder="Enter your email" class="mt-1.5 w-full bg-transparent border rounded-md px-4 py-3 text-sm" style="border-color:var(--line)">',
      '</div>',
      '<button id="profile-login-btn" type="submit" class="btn btn-primary w-full">Sign In</button>',
      '</div>',
      '</form>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');
  }

  function cartDrawerHTML() {
    return [
      '<div id="cart-overlay" class="fixed inset-0 bg-black/60 z-[150]"></div>',
      '<aside id="cart-drawer" class="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] z-[160] flex flex-col" style="background:var(--surface)" aria-label="Shopping cart">',
      '<div class="flex items-center justify-between px-5 py-5 border-b" style="border-color:var(--line)">',
      '<p class="font-display text-lg">Your cart</p>',
      '<button id="cart-close-btn" aria-label="Close cart" class="w-9 h-9 flex items-center justify-center">&times;</button>',
      '</div>',
      '<div id="cart-body" class="flex-1 overflow-y-auto"></div>',
      '<div id="cart-footer" class="p-5 border-t" style="border-color:var(--line)"></div>',
      '</aside>'
    ].join('');
  }

  function quickViewHTML() {
    return [
      '<div id="quickview-modal" class="fixed inset-0 z-[170] flex items-center justify-center p-4" aria-hidden="true">',
      '<div id="quickview-overlay" class="absolute inset-0 bg-black/70"></div>',
      '<div class="modal-panel relative w-full max-w-3xl rounded-[var(--radius-md)] overflow-hidden" style="background:var(--surface)">',
      '<button id="quickview-close-btn" aria-label="Close quick view" class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center" style="background:rgba(0,0,0,0.5)">&times;</button>',
      '<div id="quickview-content"></div>',
      '</div>',
      '</div>'
    ].join('');
  }

  function toastHTML() {
    return [
      '<div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[180] px-5 py-3 rounded-full flex items-center gap-2 text-sm" style="background:var(--primary); color:#14100A">',
      checkIcon(),
      '<span>Added to cart</span>',
      '</div>'
    ].join('');
  }

  function footerHTML() {
    return [
      '<footer id="footer" class="pt-20 pb-10" style="background:var(--bg)">',
      '<div class="max-w-[1400px] mx-auto px-6 lg:px-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-10">',
      '<div class="lg:col-span-1">',
      '<p class="font-display text-lg">ARSENIC ENERGIES</p>',
      '<p class="text-sm mt-3" style="color:var(--muted)">Powering Life. Anywhere. Anytime.</p>',
      '</div>',
      '<div>',
      '<p class="text-sm font-display mb-4" style="color:var(--muted-2)">Shop</p>',
      '<ul class="space-y-2.5 text-sm" style="color:var(--muted)">',
      '<li><a href="shop.html?cat=solar-panels" class="hover:text-white transition-colors">Solar Panels</a></li>',
      '<li><a href="shop.html?cat=inverters" class="hover:text-white transition-colors">Inverters</a></li>',
      '<li><a href="shop.html?cat=batteries" class="hover:text-white transition-colors">Batteries</a></li>',
      '<li><a href="shop.html?cat=solar-kits" class="hover:text-white transition-colors">Solar Kits</a></li>',
      '<li><a href="shop.html?cat=electronics" class="hover:text-white transition-colors">Electronics</a></li>',
      '<li><a href="shop.html?cat=electrical-products" class="hover:text-white transition-colors">Electrical Products</a></li>',
      '</ul>',
      '</div>',
      '<div>',
      '<p class="text-sm font-display mb-4" style="color:var(--muted-2)">Solutions</p>',
      '<ul class="space-y-2.5 text-sm" style="color:var(--muted)">',
      '<li><a href="' + homeHref('#solutions') + '" class="hover:text-white transition-colors">Home Energy</a></li>',
      '<li><a href="' + homeHref('#solutions') + '" class="hover:text-white transition-colors">Business Energy</a></li>',
      '<li><a href="' + homeHref('#solutions') + '" class="hover:text-white transition-colors">Backup Power</a></li>',
      '</ul>',
      '</div>',
      '<div>',
      '<p class="text-sm font-display mb-4" style="color:var(--muted-2)">Company</p>',
      '<ul class="space-y-2.5 text-sm" style="color:var(--muted)">',
      '<li><a href="about.html" class="hover:text-white transition-colors">About Us</a></li>',
      '<li><a href="' + homeHref('#footer') + '" class="hover:text-white transition-colors">Contact</a></li>',
      '<li><a href="faq.html" class="hover:text-white transition-colors">FAQs</a></li>',
      '<li><a href="terms.html" class="hover:text-white transition-colors">Terms</a></li>',
      '<li><a href="privacy.html" class="hover:text-white transition-colors">Privacy</a></li>',
      '</ul>',
      '</div>',
      '<div>',
      '<p class="text-sm font-display mb-4" style="color:var(--muted-2)">Contact</p>',
      '<ul class="space-y-2.5 text-sm" style="color:var(--muted)">',
      '<li>+254 700 000 000</li>',
      '<li>hello@arsenicenergies.com</li>',
      '<li>Nairobi, Kenya</li>',
      '</ul>',
      '<form id="sales-inquiry-form" class="mt-5 space-y-2">',
      '<label class="sr-only" for="sales-name">Name</label>',
      '<input id="sales-name" required placeholder="Your name" class="w-full bg-transparent border rounded-md px-3 py-2 text-sm" style="border-color:var(--line)">',
      '<label class="sr-only" for="sales-email">Email</label>',
      '<input id="sales-email" type="email" required placeholder="Email address" class="w-full bg-transparent border rounded-md px-3 py-2 text-sm" style="border-color:var(--line)">',
      '<label class="sr-only" for="sales-message">Message</label>',
      '<textarea id="sales-message" required rows="3" placeholder="Tell us what you need" class="w-full bg-transparent border rounded-md px-3 py-2 text-sm resize-none" style="border-color:var(--line)"></textarea>',
      '<button type="submit" class="btn btn-primary btn-sm w-full">Send to sales</button>',
      '</form>',
      '<div class="flex gap-3 mt-5">',
      '<a href="#" class="w-9 h-9 rounded-full border flex items-center justify-center hover:border-[var(--primary)] transition-colors" style="border-color:var(--line)" aria-label="Facebook">f</a>',
      '<a href="#" class="w-9 h-9 rounded-full border flex items-center justify-center hover:border-[var(--primary)] transition-colors" style="border-color:var(--line)" aria-label="Instagram">ig</a>',
      '<a href="#" class="w-9 h-9 rounded-full border flex items-center justify-center hover:border-[var(--primary)] transition-colors" style="border-color:var(--line)" aria-label="X">x</a>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="max-w-[1400px] mx-auto px-6 lg:px-10 mt-14 pt-8 border-t text-xs text-center" style="border-color:var(--line); color:var(--muted-2)">',
      '&copy; 2026 Arsenic Energies. All rights reserved.',
      '</div>',
      '</footer>'
    ].join('');
  }

  function categoryTileHTML(category) {
    return [
      '<a class="cat-tile" href="shop.html?cat=', utils.escapeAttr(category.slug), '">',
      '<img src="', utils.escapeAttr(category.img), '" alt="', utils.escapeAttr(category.name), '" loading="lazy">',
      '<span class="cat-border"></span>',
      '<span class="cat-content">',
      '<span class="text-xs uppercase tracking-wide mb-2" style="color:var(--primary)">', utils.escapeHTML(category.count || 0), ' products</span>',
      '<span class="font-display text-2xl">', utils.escapeHTML(category.name), '</span>',
      '<span class="text-sm mt-2 max-w-xs" style="color:var(--muted)">', utils.escapeHTML(category.desc || ''), '</span>',
      '<span class="cat-arrow mt-5" aria-hidden="true">-&gt;</span>',
      '</span>',
      '</a>'
    ].join('');
  }

  function productCardHTML(product) {
    var saved = store.Store.wishlist.indexOf(product.id) !== -1;
    var badgeClass = product.badgeType === 'orange' ? ' orange' : '';
    return [
      '<div class="product-card" data-product-id="', utils.escapeAttr(product.id), '">',
      '<div class="product-media">',
      product.badge ? '<span class="plate-tag' + badgeClass + '">' + utils.escapeHTML(product.badge) + '</span>' : '',
      '<button class="wishlist-btn', saved ? ' active' : '', '" data-wish="', utils.escapeAttr(product.id), '" aria-label="Toggle wishlist for ', utils.escapeAttr(product.name), '">',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="', saved ? '#F97316' : 'none', '" stroke="', saved ? '#F97316' : 'white', '" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.8 5.6 4.1 8 3.6 10.4 4.9 12 7c1.6-2.1 4-3.4 6.4-2.9 3.6.7 5.2 4.3 3.6 7.6C19.5 16.1 12 21 12 21z"/></svg>',
      '</button>',
      '<a href="product.html?id=', utils.escapeAttr(product.id), '"><img src="', utils.escapeAttr(product.img), '" alt="', utils.escapeAttr(product.name), '" loading="lazy"></a>',
      '<button class="quickview-btn" data-quickview="', utils.escapeAttr(product.id), '">Quick view</button>',
      '</div>',
      '<div class="p-4 flex flex-col gap-2 flex-1">',
      '<p class="text-xs uppercase tracking-wide" style="color:var(--muted-2)">', utils.escapeHTML(product.category), '</p>',
      '<a href="product.html?id=', utils.escapeAttr(product.id), '" class="font-display text-[15px] leading-snug hover:text-[var(--primary)] transition-colors">', utils.escapeHTML(product.name), '</a>',
      '<p class="text-[13px] clamp-2" style="color:var(--muted)">', utils.escapeHTML(product.desc), '</p>',
      '<div class="flex items-center gap-1.5">', utils.starRow(product.rating), '<span class="text-xs ml-1" style="color:var(--muted-2)">(', utils.escapeHTML(product.reviews || 0), ')</span></div>',
      '<div class="flex items-baseline gap-2 mt-1"><span class="price-now text-lg">', utils.money(product.price), '</span>',
      product.oldPrice ? '<span class="price-old">' + utils.money(product.oldPrice) + '</span>' : '',
      '</div>',
      '<button class="add-cart-btn btn btn-sm w-full mt-1" data-add-cart="', utils.escapeAttr(product.id), '" ', product.stock ? '' : 'disabled style="opacity:.4;cursor:not-allowed"', '>',
      product.stock ? 'Add to cart' : 'Out of stock',
      '</button>',
      '</div>',
      '</div>'
    ].join('');
  }

  function syncWishlistButtons() {
    var wishlist = store.readWishlist();
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

  function mount(selector, html) {
    var target = document.querySelector(selector);
    if (target) target.innerHTML = html;
  }

  function mountSharedLayout() {
    mount('[data-site-header]', siteNavHTML() + mobileMenuHTML());
    mount('[data-site-footer]', footerHTML());
    mount('[data-site-overlays]', searchModalHTML() + profileModalHTML() + cartDrawerHTML() + quickViewHTML() + toastHTML());
  }

  root.components = {
    mountSharedLayout: mountSharedLayout,
    productCardHTML: productCardHTML,
    categoryTileHTML: categoryTileHTML,
    syncWishlistButtons: syncWishlistButtons,
    footerHTML: footerHTML,
    siteNavHTML: siteNavHTML
  };
})();
