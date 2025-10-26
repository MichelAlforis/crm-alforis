# ===========================================
# DOCKERFILE - BACKEND FASTAPI
# ===========================================
# Multi-stage build pour dev + production

# --- STAGE 1: BASE ---
FROM python:3.11-slim AS base

# --- Bonnes pratiques ---
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    PIP_PREFER_BINARY=1

# Dépendances système:
#  - libpq-dev/libpq5: psycopg2-binary
#  - libssl-dev/libffi-dev: crypto
#  - build-essential/gcc: compile si wheel absente
#  - libjpeg/zlib/freetype: reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq5 \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libfreetype6-dev \
    curl \
    supervisor \
    postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN python -m pip install --upgrade pip setuptools wheel

# --- STAGE 2: DEVELOPMENT ---
FROM base AS development

# Installer les dépendances AVANT de copier le code (meilleur cache)
COPY requirements.txt .
# OPTIMISATION: Utiliser le cache pip pour accélérer les rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copie du code (après les deps pour profiter du cache)
COPY . .

# Dossiers
RUN mkdir -p /app/uploads /app/backups /app/logs /var/log/supervisor \
 && adduser --disabled-password --gecos "" appuser \
 && chown -R appuser:appuser /app

# Copier la configuration supervisord
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Pour dev, on reste en mode simple (pas de supervisord)
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=40s \
  CMD python -c 'import urllib.request; urllib.request.urlopen("http://localhost:8000/api/v1/health")' || exit 1

# Mode développement avec auto-reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- STAGE 3: PRODUCTION ---
FROM base AS production

# Installer les dépendances
COPY requirements.txt .
# OPTIMISATION: Cache pip pour production aussi
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copie du code
COPY . .

# Dossiers et permissions
RUN mkdir -p /app/uploads /app/backups /app/logs /var/log/supervisor \
 && adduser --disabled-password --gecos "" appuser \
 && chown -R appuser:appuser /app

# Copier la configuration supervisord et scripts
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY scripts/backup-db.sh /app/scripts/backup-db.sh
COPY scripts/restore-db.sh /app/scripts/restore-db.sh
RUN chmod +x /app/scripts/*.sh

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=60s \
  CMD python -c 'import urllib.request; urllib.request.urlopen("http://localhost:8000/api/v1/health")' || exit 1

# Mode production avec supervisord (gère API + workers)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
