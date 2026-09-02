(function () {
  'use strict';

  window.AdminUI = {
    money: function (price) {
      return '$' + (Number(price) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };
})();
