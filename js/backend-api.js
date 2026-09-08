(function () {
  'use strict';

  var root = window.Arsenic = window.Arsenic || {};
  var config = window.ARSENIC_BACKEND_CONFIG || {};
  var TOKEN_KEY = 'ae_auth_token';
  var USER_KEY = 'ae_auth_user';

  function baseUrl() {
    return String(config.apiBaseUrl || '').replace(/\/+$/, '');
  }

  function isEnabled() {
    return baseUrl().length > 0;
  }

  function csrfToken() {
    var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function headers(extra) {
    var out = extra || {};
    var token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || config.authToken || '';
    var csrf = csrfToken();
    if (token) out.Authorization = 'Token ' + token;
    if (csrf) out['X-CSRFToken'] = csrf;
    return out;
  }

  function request(path, options) {
    if (!isEnabled()) return Promise.reject(new Error('Backend API is not configured'));
    options = options || {};
    var body = options.body;
    var requestHeaders = headers(options.headers || {});

    if (body && !(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    return fetch(baseUrl() + path, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: requestHeaders,
      body: body
    }).then(function (response) {
      if (response.status === 204) return null;
      return response.json().then(function (data) {
        if (!response.ok) {
          var message = data.detail || data.error || JSON.stringify(data);
          if (response.status === 401) clearSession();
          throw new Error(message);
        }
        return data;
      });
    });
  }

  function setSession(data, remember) {
    var storage = remember ? localStorage : sessionStorage;
    clearSession();
    if (data && data.token) storage.setItem(TOKEN_KEY, data.token);
    if (data && data.user) {
      storage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return null;
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  function readUser() {
    var raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function isAuthenticated() {
    return Boolean(sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || config.authToken);
  }

  function uploadImage(file) {
    var form = new FormData();
    form.append('file', file);
    return request('/products/upload_image/', {
      method: 'POST',
      body: form
    });
  }

  root.api = {
    isEnabled: isEnabled,
    isAuthenticated: isAuthenticated,
    getAuthUser: readUser,
    clearSession: clearSession,
    request: request,
    register: function (data) {
      var remember = data.remember !== false;
      var payload = Object.assign({}, data);
      delete payload.remember;
      return request('/auth/register/', { method: 'POST', body: payload }).then(function (result) {
        setSession(result, remember);
        return result;
      });
    },
    login: function (data) {
      var remember = data.remember !== false;
      var payload = Object.assign({}, data);
      delete payload.remember;
      return request('/auth/login/', { method: 'POST', body: payload }).then(function (result) {
        setSession(result, remember);
        return result;
      });
    },
    logout: function () {
      return request('/auth/logout/', { method: 'POST' }).finally(clearSession);
    },
    me: function () {
      return request('/auth/me/').then(function (user) {
        var storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        storage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      });
    },
    updateMe: function (data) {
      return request('/auth/me/', { method: 'PATCH', body: data }).then(function (user) {
        var storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        storage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      });
    },
    getCatalog: function () {
      return request('/catalog/');
    },
    getProducts: function () {
      return request('/products/');
    },
    getCategories: function () {
      return request('/categories/');
    },
    getOrders: function () {
      return request('/orders/');
    },
    getOrder: function (id) {
      return request('/orders/' + encodeURIComponent(id) + '/');
    },
    createProduct: function (data) {
      return request('/products/', { method: 'POST', body: data });
    },
    updateProduct: function (id, data) {
      return request('/products/' + encodeURIComponent(id) + '/', { method: 'PATCH', body: data });
    },
    deleteProduct: function (id) {
      return request('/products/' + encodeURIComponent(id) + '/', { method: 'DELETE' });
    },
    createCategory: function (data) {
      return request('/categories/', { method: 'POST', body: data });
    },
    updateCategory: function (id, data) {
      return request('/categories/' + encodeURIComponent(id) + '/', { method: 'PATCH', body: data });
    },
    deleteCategory: function (id) {
      return request('/categories/' + encodeURIComponent(id) + '/', { method: 'DELETE' });
    },
    uploadImage: uploadImage,
    createCheckoutSession: function (data) {
      return request('/checkout/session/', { method: 'POST', body: data });
    },
    createInquiry: function (data) {
      return request('/inquiries/', { method: 'POST', body: data });
    }
  };
})();
