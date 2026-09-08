FROM python:3.12-slim

ENV DJANGO_SERVE_FRONTEND=1
ENV DJANGO_FRONTEND_BUILD_DIR=/app/frontend
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY *.html /app/frontend/
COPY admin/ /app/frontend/admin/
COPY assets/ /app/frontend/assets/
COPY css/ /app/frontend/css/
COPY js/ /app/frontend/js/

RUN printf '%s\n' \
  "(function () {" \
  "  'use strict';" \
  "" \
  "  window.ARSENIC_BACKEND_CONFIG = window.ARSENIC_BACKEND_CONFIG || {" \
  "    apiBaseUrl: window.location.origin + '/api'," \
  "    authToken: ''" \
  "  };" \
  "})();" \
  > /app/frontend/js/backend-config.js

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD gunicorn arsenic_backend.wsgi:application --bind 0.0.0.0:${PORT:-8000}
