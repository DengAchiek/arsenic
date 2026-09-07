(function () {
  'use strict';

  var now = new Date().toISOString();

  window.ARSENIC_SEED_DATA = {
    imageVersion: '2026-09-product-images',
    products: [
      {
        id: 'sp-550',
        name: 'Monocrystalline Panel 550W',
        category: 'Solar Panels',
        slug: 'solar-panels',
        price: 189,
        oldPrice: 219,
        rating: 4.8,
        reviews: 64,
        badge: 'New',
        badgeType: 'gold',
        img: 'assets/images/products/monocrystalline-solar-panel.png',
        img2: 'assets/images/products/complete-home-solar-kit.png',
        desc: 'High-efficiency monocrystalline cell panel built for maximum yield.',
        specs: {
          'Power output': '550W',
          Efficiency: '21.4%',
          'Cell type': 'Monocrystalline PERC',
          Warranty: '25 years',
          Dimensions: '2278 x 1134 x 35mm'
        },
        stock: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'inv-5k',
        name: 'Hybrid Solar Inverter 5KW',
        category: 'Inverters',
        slug: 'inverters',
        price: 640,
        oldPrice: null,
        rating: 4.6,
        reviews: 41,
        badge: null,
        badgeType: null,
        img: 'assets/images/products/hybrid-solar-inverter.png',
        img2: 'assets/images/products/complete-home-solar-kit.png',
        desc: 'Grid-tie and off-grid capable hybrid inverter with integrated MPPT.',
        specs: {
          Capacity: '5000W',
          Type: 'Hybrid, pure sine wave',
          'MPPT trackers': '2',
          Efficiency: '97.6%',
          Warranty: '5 years'
        },
        stock: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'bat-10k',
        name: 'Lithium Battery 10kWh',
        category: 'Batteries',
        slug: 'batteries',
        price: 2450,
        oldPrice: 2750,
        rating: 4.9,
        reviews: 88,
        badge: '-11%',
        badgeType: 'orange',
        img: 'assets/images/products/lifepo4-lithium-battery.png',
        img2: 'assets/images/products/complete-home-solar-kit.png',
        desc: 'LiFePO4 storage for daily cycling and dependable backup power.',
        specs: {
          Capacity: '10kWh',
          Chemistry: 'LiFePO4',
          'Cycle life': '6000+',
          Voltage: '51.2V',
          Warranty: '10 years'
        },
        stock: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'gen-port',
        name: 'Portable Solar Generator 1200W',
        category: 'Solar Kits',
        slug: 'solar-kits',
        price: 899,
        oldPrice: null,
        rating: 4.5,
        reviews: 29,
        badge: null,
        badgeType: null,
        img: 'assets/images/products/portable-solar-generator.png',
        img2: 'assets/images/products/complete-home-solar-kit.png',
        desc: 'All-in-one portable power station with a folding 120W panel.',
        specs: {
          Output: '1200W (2400W surge)',
          Capacity: '1024Wh',
          'Recharge time': '1.8 hrs (AC)',
          Ports: 'AC x3, USB-C x2, DC x2',
          Weight: '12kg'
        },
        stock: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'breaker-kit',
        name: 'Solar Protection Breaker Kit',
        category: 'Electrical Products',
        slug: 'electrical-products',
        price: 79,
        oldPrice: 95,
        rating: 4.4,
        reviews: 18,
        badge: null,
        badgeType: null,
        img: 'assets/images/products/solar-protection-breaker-kit.png',
        img2: 'assets/images/products/complete-home-solar-kit.png',
        desc: 'Breakers, surge protection, and isolators for small solar installs.',
        specs: {
          Rating: '63A',
          Voltage: '1000V DC',
          Includes: 'Breaker, SPD, isolator',
          Mounting: 'DIN rail',
          Warranty: '2 years'
        },
        stock: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'smart-meter',
        name: 'Smart Energy Monitor',
        category: 'Electronics',
        slug: 'electronics',
        price: 149,
        oldPrice: null,
        rating: 4.7,
        reviews: 36,
        badge: 'Popular',
        badgeType: 'gold',
        img: 'assets/images/products/smart-energy-monitor.png',
        img2: 'assets/images/products/smart-energy-monitor.png',
        desc: 'Track household energy use and spot heavy loads in real time.',
        specs: {
          Connectivity: 'Wi-Fi',
          Display: 'Mobile app and web',
          Circuits: 'Up to 16',
          Alerts: 'Usage and outage alerts',
          Warranty: '2 years'
        },
        stock: true,
        createdAt: now,
        updatedAt: now
      }
    ],
    categories: [
      {
        id: 'cat_1',
        name: 'Solar Panels',
        slug: 'solar-panels',
        count: 0,
        desc: 'High-efficiency panels for residential and commercial roofs.',
        img: 'assets/images/products/monocrystalline-solar-panel.png'
      },
      {
        id: 'cat_2',
        name: 'Inverters',
        slug: 'inverters',
        count: 0,
        desc: 'Reliable conversion and management of solar-generated power.',
        img: 'assets/images/products/hybrid-solar-inverter.png'
      },
      {
        id: 'cat_3',
        name: 'Batteries',
        slug: 'batteries',
        count: 0,
        desc: 'Storage for backup power and true energy independence.',
        img: 'assets/images/products/lifepo4-lithium-battery.png'
      },
      {
        id: 'cat_4',
        name: 'Solar Kits',
        slug: 'solar-kits',
        count: 0,
        desc: 'Complete packages sized to your household or site.',
        img: 'assets/images/products/complete-home-solar-kit.png'
      },
      {
        id: 'cat_5',
        name: 'Electrical Products',
        slug: 'electrical-products',
        count: 0,
        desc: 'Switches, cable, breakers, sockets, and connectors.',
        img: 'assets/images/products/solar-protection-breaker-kit.png'
      },
      {
        id: 'cat_6',
        name: 'Electronics',
        slug: 'electronics',
        count: 0,
        desc: 'Selected electronics and smart energy accessories.',
        img: 'assets/images/products/smart-energy-monitor.png'
      }
    ],
    orders: [],
    profile: null
  };
})();
