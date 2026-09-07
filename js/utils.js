(function () {
  'use strict';

  var root = window.Arsenic = window.Arsenic || {};

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
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

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function money(price) {
    var value = Number(price) || 0;
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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

  root.utils = {
    clone: clone,
    readJSON: readJSON,
    writeJSON: writeJSON,
    escapeHTML: escapeHTML,
    escapeAttr: escapeHTML,
    money: money,
    slugify: slugify,
    starRow: starRow,
    debounce: debounce
  };
})();
