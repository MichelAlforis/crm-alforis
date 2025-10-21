# ===========================================
# DOCKERFILE - FRONTEND NEXT.JS
# ===========================================
# Multi-stage build pour dev + production

# --- STAGE 1: BASE ---
FROM node:20-slim AS base

# Installer curl et bash pour healthchecks et scripts
RUN apt-get update && apt-get install -y --no-install-recommends curl bash && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# --- STAGE 2: DEVELOPMENT ---
FROM base AS development

# Installer TOUTES les dépendances (dev + prod)
RUN npm ci

# Copier le code source
COPY . .

# Rendre le script exécutable
RUN chmod +x scripts/dev-clean.sh

# Exposer le port
EXPOSE 3010

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD curl -f http://localhost:3010 || exit 1

# Démarrage en mode développement
CMD ["npm", "run", "dev"]

# --- STAGE 3: DEPENDENCIES (pour prod) ---
FROM base AS dependencies

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# --- STAGE 4: BUILD ---
FROM base AS builder

# Installer toutes les dépendances pour le build
RUN npm ci

# Copier le code source
COPY . .

# Arguments de build pour les variables d'environnement
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build de production
RUN npm run build

# --- STAGE 5: PRODUCTION ---
FROM node:20-slim AS production

# Installer curl pour healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Variables d'environnement de production
ENV NODE_ENV=production
ENV PORT=3010

# Créer un utilisateur non-root
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nextjs

# Copier les fichiers nécessaires depuis les stages précédents
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Changer l'utilisateur
USER nextjs

# Exposer le port
EXPOSE 3010

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD curl -f http://localhost:3010 || exit 1

# Démarrage du serveur Next.js
CMD ["npm", "start"]
