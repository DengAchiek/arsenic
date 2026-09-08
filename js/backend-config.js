(function () {
  'use strict';

  var localHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  window.ARSENIC_BACKEND_CONFIG = window.ARSENIC_BACKEND_CONFIG || {
    apiBaseUrl: localHost ? 'http://127.0.0.1:8001/api' : '',
    authToken: ''
  };
})();
