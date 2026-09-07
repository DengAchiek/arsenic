(function () {
  'use strict';

  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    theme: {
      extend: {
        colors: {
          bg: '#0B0F0E',
          surface: '#121817',
          primary: '#F5B82E',
          secondary: '#F97316',
          green: '#22C55E',
          muted: '#A7B0AE',
          lightbg: '#F7F8F6'
        },
        fontFamily: {
          display: ['Space Grotesk', 'sans-serif'],
          sans: ['Inter', 'sans-serif']
        }
      }
    }
  };
})();
