# Arsenic Energies Backend

Django + PostgreSQL API for the storefront catalog, admin product updates, Stripe Checkout, order processing, and sales communication.

## What It Provides

- Product and category CRUD through Django Admin and `/api/products/`, `/api/categories/`
- Public catalog endpoint at `/api/catalog/` using the same field names as the current static frontend
- Customer account registration, login, logout, and current-account endpoints
- Order records with customer snapshots, line items, totals, payment status, and admin status updates
- Authenticated Stripe Checkout session creation at `/api/checkout/session/`
- Verified Stripe webhook endpoint at `/api/payments/stripe/webhook/`
- Sales inquiry endpoint at `/api/inquiries/` with email notifications to sales
- Product image upload endpoint for authenticated staff users
- Audit logs for staff product, category, and order updates
- Production security settings for HTTPS, secure cookies, CORS, CSRF, throttling, and Cloudflare proxy headers

## Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d db
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_catalog
python manage.py runserver 8001
```

For quick local testing without PostgreSQL, leave `DATABASE_URL` unset and Django will use SQLite. Use PostgreSQL before production.

## Connect The Static Frontend

Edit `js/backend-config.js`:

```js
window.ARSENIC_BACKEND_CONFIG = {
  apiBaseUrl: 'https://api.arsenicenergies.com/api',
  authToken: ''
};
```

For the static admin dashboard, set `authToken` to a Django REST Framework token for a staff user. For production, Django Admin at `/admin/` is safer for staff operations because it uses Django sessions, CSRF protection, and staff permissions.

## Authentication

Customer checkout requires an account. The browser opens the Account modal when an unauthenticated user chooses checkout.

Endpoints:

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
PATCH /api/auth/me/
```

Registration creates both a Django user and a linked `Customer` profile. Login/register return a DRF token that the static frontend sends as:

```text
Authorization: Token <token>
```

When Checkout is created, the backend uses `request.user` and the linked customer profile. It does not trust browser-submitted customer identity or prices.

## Stripe

Set these in `.env`:

```bash
STRIPE_SECRET_KEY=sk_live_or_test_value
STRIPE_WEBHOOK_SECRET=whsec_value_from_stripe
FRONTEND_BASE_URL=https://arsenicenergies.com
BACKEND_BASE_URL=https://api.arsenicenergies.com
```

Configure the webhook in Stripe:

```text
https://api.arsenicenergies.com/api/payments/stripe/webhook/
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`

The checkout endpoint requires authentication and always builds line items from database product prices, not browser-submitted prices.

## Email: SendGrid Or AWS SES

SendGrid SMTP:

```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG...
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=Arsenic Energies <sales@arsenicenergies.com>
SALES_TEAM_EMAILS=sales@arsenicenergies.com
```

AWS SES SMTP:

```bash
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-ses-smtp-username
EMAIL_HOST_PASSWORD=your-ses-smtp-password
EMAIL_USE_TLS=True
```

Add SPF, DKIM, and DMARC records for the sending domain before going live.

## Cloudflare

Recommended Cloudflare settings:

- Proxy `arsenicenergies.com`, `www.arsenicenergies.com`, and `api.arsenicenergies.com`
- SSL/TLS mode: Full Strict
- Redirect HTTP to HTTPS
- WAF managed rules enabled
- Rate limit `/api/checkout/session/`, `/api/inquiries/`, `/admin/`, and auth endpoints
- Bot protection enabled for forms and checkout
- Cache static assets, but bypass cache for `/api/*` and `/admin/*`
- Pass `CF-Connecting-IP`; the backend uses it for audit logs

For product uploads, set `STORAGE_BACKEND=s3` and configure Cloudflare R2 with the S3-compatible env vars in `.env.example`.

## Security Checklist

- Use long random `DJANGO_SECRET_KEY`
- Keep `DJANGO_DEBUG=False`
- Restrict `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS`, and `DJANGO_CSRF_TRUSTED_ORIGINS`
- Use MFA for staff accounts
- Use staff permissions for catalog/order management
- Do not store card data; Stripe hosts card capture
- Verify Stripe webhook signatures
- Keep database backups encrypted
- Rotate API keys and SMTP credentials after staff changes
