(function () {
  'use strict';

  window.AppState = {
    products: [],
    categories: [],
    orders: [],
    profile: null,
    setProducts: function (products) {
      this.products = Array.isArray(products) ? products : [];
    },
    setCategories: function (categories) {
      this.categories = Array.isArray(categories) ? categories : [];
    },
    setOrders: function (orders) {
      this.orders = Array.isArray(orders) ? orders : [];
    },
    setProfile: function (profile) {
      this.profile = profile || null;
    },
    refresh: async function () {
      var results = await Promise.all([
        window.API.getProducts(),
        window.API.getCategories(),
        window.API.getOrders(),
        window.API.getProfile()
      ]);
      this.setProducts(results[0]);
      this.setCategories(results[1]);
      this.setOrders(results[2]);
      this.setProfile(results[3]);
      return this;
    }
  };
})();
