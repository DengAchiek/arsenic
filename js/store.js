(function () {
  'use strict';

  var root = window.Arsenic = window.Arsenic || {};
  var utils = root.utils;
  var DATA_KEY = 'ae_catalog_data';
  var CART_KEY = 'ae_cart';
  var WISHLIST_KEY = 'ae_wishlist';
  var PROFILE_KEY = 'ae_profile';

  function seedCatalog() {
    return utils.clone(window.ARSENIC_SEED_DATA || {
      products: [],
      categories: [],
      orders: [],
      profile: null
    });
  }

  function normalizeCatalog(data) {
    var catalog = data || seedCatalog();
    var seed = seedCatalog();
    catalog.products = Array.isArray(catalog.products) ? catalog.products : [];
    catalog.categories = Array.isArray(catalog.categories) ? catalog.categories : [];
    catalog.orders = Array.isArray(catalog.orders) ? catalog.orders : [];
    if (seed.imageVersion && catalog.imageVersion !== seed.imageVersion) {
      catalog.products = catalog.products.map(function (product) {
        var seedProduct = seed.products.find(function (item) {
          return item.id === product.id;
        });
        return seedProduct ? Object.assign({}, product, {
          img: seedProduct.img,
          img2: seedProduct.img2,
          updatedAt: seedProduct.updatedAt
        }) : product;
      });
      catalog.categories = catalog.categories.map(function (category) {
        var seedCategory = seed.categories.find(function (item) {
          return item.id === category.id;
        });
        return seedCategory ? Object.assign({}, category, {
          img: seedCategory.img
        }) : category;
      });
      catalog.imageVersion = seed.imageVersion;
    }
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
    var stored = utils.readJSON(DATA_KEY, null);
    if (!stored) {
      stored = seedCatalog();
      utils.writeJSON(DATA_KEY, stored);
    }
    return normalizeCatalog(stored);
  }

  function saveCatalog(data) {
    var normalized = normalizeCatalog(data);
    utils.writeJSON(DATA_KEY, normalized);
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

  function findProduct(id) {
    return products().find(function (product) {
      return product.id === id;
    }) || null;
  }

  function readCart() {
    return utils.readJSON(CART_KEY, []);
  }

  function saveCart(cart) {
    utils.writeJSON(CART_KEY, cart);
    if (root.ui && root.ui.updateCartUI) root.ui.updateCartUI();
  }

  function readWishlist() {
    return utils.readJSON(WISHLIST_KEY, []);
  }

  function saveWishlist(wishlist) {
    utils.writeJSON(WISHLIST_KEY, wishlist);
    if (root.components && root.components.syncWishlistButtons) {
      root.components.syncWishlistButtons();
    }
  }

  function cartTotal(cart) {
    return cart.reduce(function (sum, item) {
      var product = findProduct(item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function toast(message) {
    if (root.ui && root.ui.showToast) root.ui.showToast(message);
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
      return utils.readJSON(PROFILE_KEY, null);
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
      toast('Added ' + product.name + ' to cart');
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
        toast(product ? 'Saved ' + product.name : 'Saved to wishlist');
      } else {
        wishlist.splice(index, 1);
        toast(product ? 'Removed ' + product.name : 'Removed from wishlist');
      }
      saveWishlist(wishlist);
    },
    setProfile: function (profile) {
      if (profile) utils.writeJSON(PROFILE_KEY, profile);
      else localStorage.removeItem(PROFILE_KEY);
    },
    replaceCatalog: function (catalog) {
      return saveCatalog(catalog);
    }
  };

  root.store = {
    Store: Store,
    loadCatalog: loadCatalog,
    saveCatalog: saveCatalog,
    products: products,
    categories: categories,
    findProduct: findProduct,
    readCart: readCart,
    saveCart: saveCart,
    readWishlist: readWishlist,
    saveWishlist: saveWishlist,
    cartTotal: cartTotal
  };

  window.Store = Store;
})();
