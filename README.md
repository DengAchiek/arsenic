# Arsenic Energies

Static storefront and local admin dashboard for a solar energy product catalog.

## Public Site

- `index.html` - Home page with hero, category grid, featured products, solutions, calculator, testimonials, and newsletter form.
- `shop.html` - Product catalog with category, price, availability, rating, text search, and sorting filters.
- `product.html` - Product detail page with gallery swap, specifications, quantity controls, cart actions, wishlist, reviews, and related products.
- `orders.html` - Authenticated customer order tracking with order status, payment status, products, totals, and details.
- `about.html`, `faq.html`, `privacy.html`, `terms.html` - Static content pages that reuse the shared site shell.

## Admin

- `admin/index.html` - Dashboard for catalog stats, products, categories, orders, and edit modals.
- `admin/js/api.js` - LocalStorage-backed catalog API with product/category CRUD and image upload as data URLs.
- `admin/js/store.js` - Admin state container that loads products, categories, orders, and profile data.
- `admin/js/components.js` - Admin formatting helpers.
- `admin/js/app.js` - Staff login gate, admin UI rendering, modal handling, form saving, tabs, and delete/edit actions.
- `admin/css/admin.css` - Admin-only dashboard styles.

## Shared Public JavaScript

- `js/data.js` - Seed products, categories, and catalog metadata.
- `js/tailwind-config.js` - Shared Tailwind CDN theme setup.
- `js/utils.js` - Shared helpers for storage, escaping, money formatting, slug generation, stars, and debounce.
- `js/store.js` - Public catalog, cart, wishlist, and profile state.
- `js/components.js` - Shared public shell and reusable product/category UI markup.
- `js/pages.js` - Page-specific rendering and page widgets.
- `js/main.js` - Public app bootstrap, event wiring, modals, cart drawer, search, profile, and global compatibility exports.

## Images

- `assets/images/products/` - Local generated catalog assets for the storefront product cards, category tiles, search results, quick view, and product detail gallery.

## Storage

The project uses browser `localStorage`:

- `ae_catalog_data` - Products, categories, orders, and profile seed data used by both public and admin views.
- `ae_cart` - Public shopping cart items.
- `ae_wishlist` - Saved product IDs.
- `ae_profile` - Lightweight public account profile.

## Production Backend

- `backend/` - Django + PostgreSQL commerce API for product/category updates, orders, Stripe Checkout, sales inquiries, email notifications, staff admin, audit logs, and Cloudflare-aware security settings.
- `js/backend-config.js` and `js/backend-api.js` - Optional frontend bridge. Leave `apiBaseUrl` blank for static demo mode, or set it to a deployed Django API such as `https://api.arsenicenergies.com/api`.
- `admin/index.html` - Staff-only dashboard when the backend API is enabled. Sign in with a Django user that has `is_staff=True`.
- Customer account login/register is required before secure checkout when the backend API is enabled.
- `checkout-success.html` - Stripe Checkout success return page with order review.
- `orders.html` - Customer order tracking page powered by the authenticated `/api/orders/` endpoints.
- `render.yaml` - Render Blueprint that deploys the static frontend, Django API, and PostgreSQL database as separate services with deploy filters.

See `backend/README.md` for backend setup and `docs/render-deployment.md` for Render deployment, Stripe webhook, SendGrid/AWS SES, and Cloudflare/R2 configuration.
