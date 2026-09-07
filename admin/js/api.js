(function () {
  'use strict';

  var DATA_KEY = 'ae_catalog_data';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function seedCatalog() {
    return clone(window.ARSENIC_SEED_DATA || { products: [], categories: [], orders: [], profile: null });
  }

  function readCatalog() {
    try {
      var raw = localStorage.getItem(DATA_KEY);
      if (raw) {
        var catalog = normalize(JSON.parse(raw));
        if (catalog.__shouldPersist) {
          delete catalog.__shouldPersist;
          writeCatalog(catalog);
        }
        return catalog;
      }
    } catch (error) {
      // Fall through to seed data.
    }
    var seed = normalize(seedCatalog());
    writeCatalog(seed);
    return seed;
  }

  function writeCatalog(catalog) {
    var normalized = normalize(catalog);
    localStorage.setItem(DATA_KEY, JSON.stringify(normalized));
    window.PRODUCTS = normalized.products;
    window.CATEGORIES = normalized.categories;
    return normalized;
  }

  function backend() {
    return window.Arsenic && window.Arsenic.api && window.Arsenic.api.isEnabled() ? window.Arsenic.api : null;
  }

  function normalize(catalog) {
    catalog = catalog || seedCatalog();
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
      catalog.__shouldPersist = true;
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

  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function findIndexById(items, id) {
    return items.findIndex(function (item) {
      return item.id === id;
    });
  }

  window.API = {
    getProducts: function () {
      if (backend()) return backend().getProducts();
      return Promise.resolve(readCatalog().products);
    },
    getCategories: function () {
      if (backend()) return backend().getCategories();
      return Promise.resolve(readCatalog().categories);
    },
    getOrders: function () {
      if (backend()) return backend().getOrders();
      return Promise.resolve(readCatalog().orders);
    },
    getProfile: function () {
      return Promise.resolve(readCatalog().profile || null);
    },
    createProduct: function (data) {
      if (backend()) return backend().createProduct(data);
      var catalog = readCatalog();
      var now = new Date().toISOString();
      var item = Object.assign({}, data, {
        id: data.id || generateId('prod'),
        createdAt: now,
        updatedAt: now
      });
      catalog.products.push(item);
      writeCatalog(catalog);
      return Promise.resolve(item);
    },
    updateProduct: function (id, data) {
      if (backend()) return backend().updateProduct(id, data);
      var catalog = readCatalog();
      var index = findIndexById(catalog.products, id);
      if (index === -1) return Promise.reject(new Error('Product not found'));
      catalog.products[index] = Object.assign({}, catalog.products[index], data, {
        id: id,
        updatedAt: new Date().toISOString()
      });
      writeCatalog(catalog);
      return Promise.resolve(catalog.products[index]);
    },
    deleteProduct: function (id) {
      if (backend()) return backend().deleteProduct(id);
      var catalog = readCatalog();
      catalog.products = catalog.products.filter(function (product) {
        return product.id !== id;
      });
      writeCatalog(catalog);
      return Promise.resolve({ success: true });
    },
    createCategory: function (data) {
      if (backend()) return backend().createCategory(data);
      var catalog = readCatalog();
      var item = Object.assign({}, data, {
        id: data.id || generateId('cat')
      });
      catalog.categories.push(item);
      writeCatalog(catalog);
      return Promise.resolve(item);
    },
    updateCategory: function (id, data) {
      if (backend()) return backend().updateCategory(id, data);
      var catalog = readCatalog();
      var index = findIndexById(catalog.categories, id);
      if (index === -1) return Promise.reject(new Error('Category not found'));
      catalog.categories[index] = Object.assign({}, catalog.categories[index], data, { id: id });
      writeCatalog(catalog);
      return Promise.resolve(catalog.categories[index]);
    },
    deleteCategory: function (id) {
      if (backend()) return backend().deleteCategory(id);
      var catalog = readCatalog();
      catalog.categories = catalog.categories.filter(function (category) {
        return category.id !== id;
      });
      writeCatalog(catalog);
      return Promise.resolve({ success: true });
    },
    uploadImage: function (file) {
      if (backend()) return backend().uploadImage(file);
      return new Promise(function (resolve, reject) {
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        var reader = new FileReader();
        reader.onload = function (event) {
          resolve({
            url: event.target.result,
            filename: Date.now() + '_' + file.name,
            size: file.size,
            type: file.type
          });
        };
        reader.onerror = function () {
          reject(new Error('Could not read image'));
        };
        reader.readAsDataURL(file);
      });
    },
    _setMock: function (key, value) {
      var catalog = readCatalog();
      catalog[key] = value;
      writeCatalog(catalog);
    }
  };
})();
