(function () {
  'use strict';

  var editingProductId = null;
  var editingCategoryId = null;
  var adminEventsBound = false;

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function get(id) {
    return document.getElementById(id);
  }

  function money(value) {
    if (window.AdminUI && window.AdminUI.money) return window.AdminUI.money(value);
    return '$' + (Number(value) || 0).toFixed(2);
  }

  function mediaURL(src) {
    if (!src || /^(https?:|data:|\/)/.test(src)) return src || '';
    return src.indexOf('../') === 0 ? src : '../' + src;
  }

  function showToast(message) {
    var toast = get('toast');
    if (!toast) return;
    var span = toast.querySelector('span');
    if (span) span.textContent = message;
    toast.style.transform = 'translateY(0)';
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () {
      toast.style.transform = 'translateY(140%)';
    }, 2600);
  }

  function backendAPI() {
    return window.Arsenic && window.Arsenic.api && window.Arsenic.api.isEnabled() ? window.Arsenic.api : null;
  }

  function showLoginError(message) {
    var error = get('admin-login-error');
    if (!error) return;
    error.textContent = message || '';
    error.style.display = message ? 'block' : 'none';
  }

  function setLoginBusy(isBusy) {
    var button = get('admin-login-submit');
    if (!button) return;
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Signing in...' : 'Sign in';
  }

  function showAdminLogin(message) {
    var auth = get('admin-auth');
    var app = get('admin-app');
    if (auth) auth.style.display = 'flex';
    if (app) app.style.display = 'none';
    showLoginError(message || '');
  }

  function showAdminApp(user) {
    var auth = get('admin-auth');
    var app = get('admin-app');
    var current = get('admin-current-user');
    if (auth) auth.style.display = 'none';
    if (app) app.style.display = 'block';
    if (current) {
      current.innerHTML = [
        '<p class="font-display text-sm">', escapeHTML(user.name || user.email || 'Admin'), '</p>',
        '<p class="text-xs" style="color:var(--muted-2)">', escapeHTML(user.email || ''), '</p>'
      ].join('');
    }
    showLoginError('');
  }

  async function verifyAdminSession() {
    var api = backendAPI();
    if (!api) {
      showAdminLogin('Backend API is required for admin login. Configure js/backend-config.js.');
      return false;
    }
    if (!api.isAuthenticated()) {
      showAdminLogin('');
      return false;
    }

    try {
      var user = await api.me();
      if (!user || !user.is_staff) {
        showAdminLogin('This account is not a staff admin.');
        return false;
      }
      showAdminApp(user);
      return true;
    } catch (error) {
      showAdminLogin('Session expired. Please sign in again.');
      return false;
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    var api = backendAPI();
    if (!api) {
      showLoginError('Backend API is required for admin login. Configure js/backend-config.js.');
      return;
    }

    var email = get('admin-email-input') ? get('admin-email-input').value.trim() : '';
    var password = get('admin-password-input') ? get('admin-password-input').value : '';
    var remember = get('admin-remember-input') ? get('admin-remember-input').checked : true;
    if (!email || !password) {
      showLoginError('Enter your admin email and password.');
      return;
    }

    setLoginBusy(true);
    showLoginError('');
    try {
      var result = await api.login({ email: email, password: password, remember: remember });
      if (!result.user || !result.user.is_staff) {
        api.clearSession();
        showAdminLogin('This account is not a staff admin.');
        return;
      }
      showAdminApp(result.user);
      showToast('Signed in');
      await loadAdminData();
    } catch (error) {
      showLoginError(error.message || 'Could not sign in.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleAdminLogout() {
    var api = backendAPI();
    try {
      if (api && api.isAuthenticated()) await api.logout();
    } catch (error) {
      if (api) api.clearSession();
    }
    window.AppState.setProducts([]);
    window.AppState.setCategories([]);
    window.AppState.setOrders([]);
    window.AppState.setProfile(null);
    showAdminLogin('');
    showToast('Logged out');
  }

  async function loadAdminData() {
    await window.AppState.refresh();

    var products = window.AppState.products;
    var categories = window.AppState.categories;
    var orders = window.AppState.orders;

    get('stat-products').textContent = products.length;
    get('stat-categories').textContent = categories.length;
    get('stat-orders').textContent = orders.length;
    get('stat-instock').textContent = products.filter(function (product) {
      return product.stock;
    }).length;

    renderProducts(products);
    renderCategories(categories);
    renderOrders(orders);
  }

  function renderProducts(products) {
    var body = get('products-table-body');
    if (!body) return;

    if (!products.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--muted-2)">No products yet</td></tr>';
      return;
    }

    body.innerHTML = products.map(function (product) {
      return [
        '<tr>',
        '<td><img src="', escapeHTML(mediaURL(product.img)), '" alt="', escapeHTML(product.name), '" class="w-10 h-10 object-cover rounded-md"></td>',
        '<td class="font-medium">', escapeHTML(product.name), '</td>',
        '<td style="color:var(--muted-2)">', escapeHTML(product.category), '</td>',
        '<td>', money(product.price), '</td>',
        '<td><span class="status-badge ', product.stock ? 'status-instock' : 'status-outofstock', '">', product.stock ? 'In Stock' : 'Out of Stock', '</span></td>',
        '<td>',
        '<button class="btn-admin btn-admin-outline text-sm px-3 py-1" data-edit-product="', escapeHTML(product.id), '">Edit</button> ',
        '<button class="btn-admin btn-admin-danger text-sm px-3 py-1" data-delete-product="', escapeHTML(product.id), '">Delete</button>',
        '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function renderCategories(categories) {
    var body = get('categories-table-body');
    if (!body) return;

    if (!categories.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--muted-2)">No categories yet</td></tr>';
      return;
    }

    body.innerHTML = categories.map(function (category) {
      return [
        '<tr>',
        '<td><img src="', escapeHTML(mediaURL(category.img)), '" alt="', escapeHTML(category.name), '" class="w-10 h-10 object-cover rounded-md"></td>',
        '<td class="font-medium">', escapeHTML(category.name), '</td>',
        '<td style="color:var(--muted-2)">', escapeHTML(category.slug), '</td>',
        '<td>', escapeHTML(category.count || 0), '</td>',
        '<td>',
        '<button class="btn-admin btn-admin-outline text-sm px-3 py-1" data-edit-category="', escapeHTML(category.id), '">Edit</button> ',
        '<button class="btn-admin btn-admin-danger text-sm px-3 py-1" data-delete-category="', escapeHTML(category.id), '">Delete</button>',
        '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function renderOrders(orders) {
    var body = get('orders-table-body');
    if (!body) return;

    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--muted-2)">No orders yet</td></tr>';
      return;
    }

    body.innerHTML = orders.map(function (order) {
      return [
        '<tr>',
        '<td class="font-mono text-sm">', escapeHTML(order.id), '</td>',
        '<td>', escapeHTML(order.items ? order.items.length : 0), ' items</td>',
        '<td>', money(order.total), '</td>',
        '<td><span class="status-badge" style="background:rgba(245,184,46,0.15);color:var(--primary)">', escapeHTML(order.status || 'Pending'), '</span></td>',
        '<td style="color:var(--muted-2)">', escapeHTML(order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''), '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function setActiveTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(function (button) {
      var active = button.dataset.tab === tabName;
      button.style.color = active ? 'var(--text)' : 'var(--muted-2)';
      button.style.borderBottom = active ? '2px solid var(--primary)' : 'none';
    });
    document.querySelectorAll('.tab-content').forEach(function (content) {
      content.style.display = content.id === 'tab-' + tabName ? 'block' : 'none';
    });
  }

  function openProductModal(product) {
    product = product || null;
    editingProductId = product ? product.id : null;

    var modal = get('product-modal');
    var title = get('product-modal-title');
    var categorySelect = get('prod-category');
    if (!modal || !categorySelect) return;

    title.textContent = product ? 'Edit Product' : 'Add Product';
    categorySelect.innerHTML = window.AppState.categories.map(function (category) {
      var selected = product && product.slug === category.slug ? 'selected' : '';
      return '<option value="' + escapeHTML(category.slug) + '" ' + selected + '>' + escapeHTML(category.name) + '</option>';
    }).join('');

    get('prod-name').value = product ? product.name || '' : '';
    get('prod-price').value = product ? product.price || '' : '';
    get('prod-oldprice').value = product ? product.oldPrice || '' : '';
    get('prod-desc').value = product ? product.desc || '' : '';
    get('prod-img').value = product ? product.img || '' : '';
    get('prod-specs').value = product && product.specs ? JSON.stringify(product.specs, null, 2) : '';
    get('prod-rating').value = product ? product.rating || 4.5 : 4.5;
    get('prod-reviews').value = product ? product.reviews || 0 : 0;
    get('prod-badge').value = product ? product.badge || '' : '';
    get('prod-stock').value = product && product.stock === false ? 'false' : 'true';
    get('product-form-id').value = product ? product.id : '';
    modal.style.display = 'flex';
  }

  function closeProductModal() {
    var modal = get('product-modal');
    var form = get('product-form');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    editingProductId = null;
  }

  async function saveProduct(event) {
    event.preventDefault();

    try {
      var categorySelect = get('prod-category');
      var selectedCategory = window.AppState.categories.find(function (category) {
        return category.slug === categorySelect.value;
      });
      var specs = get('prod-specs').value.trim() ? JSON.parse(get('prod-specs').value) : {};
      var name = get('prod-name').value.trim();
      var price = Number(get('prod-price').value);

      if (!name || !Number.isFinite(price)) {
        showToast('Enter a valid product name and price');
        return;
      }

      var data = {
        name: name,
        category: selectedCategory ? selectedCategory.name : categorySelect.options[categorySelect.selectedIndex].textContent,
        slug: selectedCategory ? selectedCategory.slug : slugify(categorySelect.value),
        price: price,
        oldPrice: Number(get('prod-oldprice').value) || null,
        desc: get('prod-desc').value.trim(),
        img: get('prod-img').value.trim(),
        img2: get('prod-img').value.trim(),
        specs: specs,
        rating: Number(get('prod-rating').value) || 4.5,
        reviews: Number(get('prod-reviews').value) || 0,
        badge: get('prod-badge').value.trim() || null,
        badgeType: get('prod-badge').value.trim().indexOf('%') !== -1 ? 'orange' : 'gold',
        stock: get('prod-stock').value === 'true'
      };

      if (editingProductId) {
        await window.API.updateProduct(editingProductId, data);
        showToast('Product updated successfully');
      } else {
        await window.API.createProduct(data);
        showToast('Product added successfully');
      }

      closeProductModal();
      await loadAdminData();
    } catch (error) {
      showToast(error instanceof SyntaxError ? 'Specs must be valid JSON' : 'Error: ' + error.message);
    }
  }

  function editProduct(id) {
    var product = window.AppState.products.find(function (item) {
      return item.id === id;
    });
    if (product) openProductModal(product);
  }

  async function deleteProduct(id) {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await window.API.deleteProduct(id);
      showToast('Product deleted');
      await loadAdminData();
    } catch (error) {
      showToast('Error: ' + error.message);
    }
  }

  function openCategoryModal(category) {
    category = category || null;
    editingCategoryId = category ? category.id : null;

    get('category-modal').style.display = 'flex';
    get('category-modal-title').textContent = category ? 'Edit Category' : 'Add Category';
    get('cat-name').value = category ? category.name || '' : '';
    get('cat-slug').value = category ? category.slug || '' : '';
    get('cat-desc').value = category ? category.desc || '' : '';
    get('cat-img').value = category ? category.img || '' : '';
    get('cat-form-id').value = category ? category.id : '';
  }

  function closeCategoryModal() {
    var modal = get('category-modal');
    var form = get('category-form');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    editingCategoryId = null;
  }

  async function saveCategory(event) {
    event.preventDefault();

    var name = get('cat-name').value.trim();
    var slug = get('cat-slug').value.trim() || slugify(name);
    if (!name || !slug) {
      showToast('Enter a valid category name and slug');
      return;
    }

    var data = {
      name: name,
      slug: slug,
      desc: get('cat-desc').value.trim(),
      img: get('cat-img').value.trim(),
      count: 0
    };

    try {
      if (editingCategoryId) {
        await window.API.updateCategory(editingCategoryId, data);
        showToast('Category updated successfully');
      } else {
        await window.API.createCategory(data);
        showToast('Category added successfully');
      }
      closeCategoryModal();
      await loadAdminData();
    } catch (error) {
      showToast('Error: ' + error.message);
    }
  }

  function editCategory(id) {
    var category = window.AppState.categories.find(function (item) {
      return item.id === id;
    });
    if (category) openCategoryModal(category);
  }

  async function deleteCategory(id) {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await window.API.deleteCategory(id);
      showToast('Category deleted');
      await loadAdminData();
    } catch (error) {
      showToast('Error: ' + error.message);
    }
  }

  async function handleImageUpload(input, targetId) {
    var file = input.files && input.files[0];
    if (!file) return;

    try {
      var result = await window.API.uploadImage(file);
      get(targetId).value = result.url;
      showToast('Image uploaded successfully');
    } catch (error) {
      showToast('Upload failed: ' + error.message);
    }
  }

  function setupAdminEvents() {
    if (adminEventsBound) return;
    adminEventsBound = true;

    var loginForm = get('admin-login-form');
    var logoutButton = get('admin-logout-btn');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleAdminLogout);

    document.querySelectorAll('.tab-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        setActiveTab(button.dataset.tab);
      });
    });

    var categoryName = get('cat-name');
    var categorySlug = get('cat-slug');
    if (categoryName && categorySlug) {
      categoryName.addEventListener('input', function () {
        if (!editingCategoryId) categorySlug.value = slugify(categoryName.value);
      });
    }

    document.addEventListener('click', function (event) {
      var editProductButton = event.target.closest('[data-edit-product]');
      var deleteProductButton = event.target.closest('[data-delete-product]');
      var editCategoryButton = event.target.closest('[data-edit-category]');
      var deleteCategoryButton = event.target.closest('[data-delete-category]');

      if (editProductButton) editProduct(editProductButton.dataset.editProduct);
      if (deleteProductButton) deleteProduct(deleteProductButton.dataset.deleteProduct);
      if (editCategoryButton) editCategory(editCategoryButton.dataset.editCategory);
      if (deleteCategoryButton) deleteCategory(deleteCategoryButton.dataset.deleteCategory);
    });
  }

  async function bootAdminState() {
    if (!window.AppState || !window.API) return;
    setupAdminEvents();
    setActiveTab('categories');
    var hasAccess = await verifyAdminSession();
    if (hasAccess) await loadAdminData();
  }

  window.openProductModal = openProductModal;
  window.closeProductModal = closeProductModal;
  window.saveProduct = saveProduct;
  window.openCategoryModal = openCategoryModal;
  window.closeCategoryModal = closeCategoryModal;
  window.saveCategory = saveCategory;
  window.handleImageUpload = handleImageUpload;
  window.loadAdminData = loadAdminData;
  window.showToast = showToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdminState);
  } else {
    bootAdminState();
  }
})();
