# Render Deployment

This project is packaged for Render as separate services instead of one monolithic app.

## Services

- `arsenic-energies-web` - Render Static Site for the public storefront and static admin shell.
- `arsenic-energies-api` - Render Python Web Service for Django REST API, Django Admin, Stripe, email, and order processing.
- `arsenic-postgres` - Render PostgreSQL database used only by the Django service.

The split is defined in `render.yaml`. Each service has a `buildFilter` so unrelated changes do not redeploy everything:

- Frontend redeploys for changes to root HTML pages, `admin/`, `assets/`, `css/`, `js/`, or the frontend build script.
- Backend redeploys for changes under `backend/`.

## Deploy From GitHub

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Render will read `render.yaml` and create the static site, API service, and PostgreSQL database.
4. In the generated services, confirm the public URLs. If Render assigns different hostnames than the blueprint values, update these env vars:

```text
arsenic-energies-web:
ARSENIC_API_BASE_URL=https://<api-service-hostname>/api

arsenic-energies-api:
FRONTEND_BASE_URL=https://<static-site-hostname>
BACKEND_BASE_URL=https://<api-service-hostname>
DJANGO_ALLOWED_HOSTS=<api-service-hostname>,api.arsenicenergies.com
DJANGO_CORS_ALLOWED_ORIGINS=https://<static-site-hostname>,https://arsenicenergies.com,https://www.arsenicenergies.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://<static-site-hostname>,https://<api-service-hostname>,https://arsenicenergies.com,https://www.arsenicenergies.com,https://api.arsenicenergies.com
```

## If Render Looks For `Dockerfile`

If the logs show:

```text
failed to read dockerfile: open Dockerfile: no such file or directory
```

the service was created as a Docker service from the repository root instead of from the Blueprint's Python/static service definitions.

The repo includes a root `Dockerfile` now so that setup can still build the Django API. For the non-monolithic deployment requested here, use the Blueprint in `render.yaml` so Render creates:

- a Static Site for the frontend
- a Python Web Service for the Django API
- a PostgreSQL database

If you keep a manually created Docker service, the root `Dockerfile` now packages the frontend as well, so that service can serve the storefront at `/` and the Django API at `/api/`. This is a compatibility fallback for manually created Render Docker services.

For the non-monolithic deployment, keep using the Blueprint so the frontend and backend remain independently deployed.

## If You See `Api Root` In The Browser

The `Api Root` screen is the Django REST API, not the public storefront. It is expected at:

```text
https://<api-service-hostname>/api/
```

The storefront must be opened from the separate Static Site service URL, for example:

```text
https://<static-site-hostname>/
```

If the URL is named `arsenic-web.onrender.com` but shows `Api Root`, that Render service is running the backend API. Create or open the separate static frontend service, then set:

```text
arsenic-energies-web:
ARSENIC_API_BASE_URL=https://<api-service-hostname>/api

arsenic-energies-api:
FRONTEND_BASE_URL=https://<static-site-hostname>
```

When `FRONTEND_BASE_URL` points to a different production host, the API service root redirects visitors to the storefront. The `/api/` path continues to show the API router intentionally.

If you created only one Docker service named `arsenic-web`, rebuild after commit `Serve storefront from Render Docker fallback` or later. That Docker fallback serves:

```text
https://arsenic-web.onrender.com/        storefront
https://arsenic-web.onrender.com/api/    Django REST API
https://arsenic-web.onrender.com/admin/  Django Admin
```

## Required Secret Values

Render will prompt for env vars marked `sync: false` in `render.yaml`.

Stripe:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Email via SendGrid or AWS SES SMTP:

```text
EMAIL_HOST
EMAIL_HOST_USER
EMAIL_HOST_PASSWORD
DEFAULT_FROM_EMAIL
SALES_TEAM_EMAILS
```

For SendGrid, use:

```text
EMAIL_HOST=smtp.sendgrid.net
EMAIL_HOST_USER=apikey
EMAIL_PORT=587
EMAIL_USE_TLS=True
```

For AWS SES, use the SES SMTP host, username, and password for your AWS region.

## Stripe Webhook

After the API service is live, configure this webhook in Stripe:

```text
https://<api-service-hostname>/api/payments/stripe/webhook/
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`

## Initial Data

The API service runs:

```text
python manage.py migrate
python manage.py seed_catalog
```

`migrate` runs before each deploy. `seed_catalog` is configured as an initial deploy hook so the first deployment has product/category data.

## Product Upload Storage

The blueprint defaults to `STORAGE_BACKEND=local` so the deployment can start without extra storage secrets. Render service disks are not a long-term product-media strategy for this storefront.

For durable product uploads, set up Cloudflare R2 or S3-compatible storage and update:

```text
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_STORAGE_BUCKET_NAME
AWS_S3_ENDPOINT_URL
AWS_S3_CUSTOM_DOMAIN
AWS_S3_REGION_NAME=auto
```

## Local Parity

The VS Code task `Run Full Local App` mirrors the same split:

- Static storefront: `http://127.0.0.1:8000`
- Django API/Admin: `http://127.0.0.1:8001`

Django Admin remains available at:

```text
http://127.0.0.1:8001/admin/
```
