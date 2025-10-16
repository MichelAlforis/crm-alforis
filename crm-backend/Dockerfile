# Dockerfile
FROM python:3.11-slim

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
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip + install deps Python
COPY requirements.txt .
RUN python -m pip install --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r requirements.txt

# Copie du code
COPY . .

# Dossiers, user non-root, healthcheck
RUN mkdir -p /app/uploads /app/backups \
 && adduser --disabled-password --gecos "" appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:8000/health || exit 1

# Dev: --reload ; Prod: enlève --reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
