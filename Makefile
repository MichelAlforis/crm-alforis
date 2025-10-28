# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CRM TPM Finance - Makefile Dev (macOS optimized)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.PHONY: help up up-fe up-api logs-api logs-fe clean status test restart build

# Default target
help:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "CRM TPM Finance - Commandes Dev"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🚀 Démarrage"
	@echo "  make up           Démarrer tous les services (API, DB, Redis)"
	@echo "  make up-fe        Démarrer avec le frontend"
	@echo "  make up-api       Démarrer seulement l'API"
	@echo "  make build        Rebuild complet"
	@echo ""
	@echo "📊 Monitoring"
	@echo "  make status       Voir l'état de tous les conteneurs"
	@echo "  make logs-api     Suivre les logs de l'API en temps réel"
	@echo "  make logs-fe      Suivre les logs du frontend en temps réel"
	@echo "  make test         Tester la stabilité (API + Frontend)"
	@echo ""
	@echo "🔧 Maintenance"
	@echo "  make restart      Redémarrer tous les services"
	@echo "  make restart-api  Redémarrer seulement l'API"
	@echo "  make restart-fe   Redémarrer seulement le frontend"
	@echo "  make clean        Arrêter et nettoyer (⚠️ supprime volumes)"
	@echo "  make stop         Arrêter sans nettoyer"
	@echo ""
	@echo "🧪 Diagnostics"
	@echo "  make diag-api     Diagnostic de stabilité API"
	@echo "  make diag-fe      Diagnostic frontend (volumes, Turbopack)"
	@echo "  make health       Vérifier la santé de tous les services"
	@echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Démarrage
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

up:
	@echo "🚀 Démarrage des services (API, DB, Redis)..."
	docker compose up -d

up-fe:
	@echo "🚀 Démarrage avec frontend..."
	docker compose --profile frontend up -d

up-api:
	@echo "🚀 Démarrage API uniquement..."
	docker compose up -d api

build:
	@echo "🔨 Rebuild complet..."
	docker compose down
	docker compose up -d --build

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Monitoring
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

status:
	@echo "📊 État des conteneurs:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|v1-"

logs-api:
	@echo "📋 Logs API (Ctrl+C pour quitter)..."
	docker compose logs -f --tail=200 api

logs-fe:
	@echo "📋 Logs Frontend (Ctrl+C pour quitter)..."
	docker compose logs -f --tail=200 frontend

health:
	@echo "🏥 Vérification santé des services..."
	@echo ""
	@echo "API:"
	@curl -sf http://localhost:8000/api/v1/health && echo "  ✅ UP" || echo "  ❌ DOWN"
	@echo ""
	@echo "Frontend:"
	@curl -sf -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3010 && echo "  ✅ UP" || echo "  ❌ DOWN"
	@echo ""
	@echo "Conteneurs:"
	@docker ps --filter name=v1- --format "  {{.Names}}: {{.Status}}"

test:
	@echo "🧪 Test de stabilité..."
	@echo ""
	@echo "1. API Health:"
	@curl -sf http://localhost:8000/api/v1/health > /dev/null && echo "  ✅ OK" || echo "  ❌ FAIL"
	@echo ""
	@echo "2. API RestartCount:"
	@echo "  $(shell docker inspect v1-api-1 --format='{{.RestartCount}}' 2>/dev/null || echo 'N/A')"
	@echo ""
	@echo "3. Frontend Status:"
	@docker inspect v1-frontend-1 > /dev/null 2>&1 && \
		(curl -sf -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3010) || echo "  Container not running"
	@echo ""
	@echo "4. Turbopack:"
	@docker compose logs --tail=100 frontend 2>/dev/null | grep -q "Turbopack" && echo "  ✅ Activé" || echo "  ⚠️  Non détecté"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Maintenance
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

restart:
	@echo "🔄 Redémarrage de tous les services..."
	docker compose restart

restart-api:
	@echo "🔄 Redémarrage API..."
	docker compose restart api

restart-fe:
	@echo "🔄 Redémarrage Frontend..."
	docker compose restart frontend

stop:
	@echo "⏸️  Arrêt des services..."
	docker compose down

clean:
	@echo "🧹 Nettoyage complet (⚠️  supprime les volumes)..."
	@read -p "Confirmer le nettoyage ? (y/N) " confirm && \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			docker compose down && docker system prune -af --volumes; \
		else \
			echo "Annulé."; \
		fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Diagnostics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

diag-api:
	@echo "🔍 Diagnostic API..."
	@echo ""
	@echo "RestartCount: $(shell docker inspect v1-api-1 --format='{{.RestartCount}}' 2>/dev/null || echo 'N/A')"
	@echo ""
	@echo "Commande active:"
	@docker inspect -f '{{json .Config.Cmd}}' v1-api-1 2>/dev/null | python3 -m json.tool || echo "Container not running"
	@echo ""
	@echo "Exclusions reload:"
	@docker inspect -f '{{json .Config.Cmd}}' v1-api-1 2>/dev/null | grep -o "reload-exclude" | wc -l | xargs -I {} echo "  {} patterns configurés"

diag-fe:
	@echo "🔍 Diagnostic Frontend..."
	@echo ""
	@echo "Volumes montés:"
	@docker inspect -f '{{json .Mounts}}' v1-frontend-1 2>/dev/null | python3 -m json.tool | grep -E "(Type|Destination)" | head -12 || echo "Container not running"
	@echo ""
	@echo "Turbopack:"
	@docker compose logs --tail=50 frontend 2>/dev/null | grep -E "Turbopack|Ready" | tail -3 || echo "No logs"
	@echo ""
	@echo "CSS global.css:"
	@docker exec v1-frontend-1 wc -l /app/styles/global.css 2>/dev/null || echo "File not found"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Aliases rapides
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

la: logs-api
lf: logs-fe
st: status
rs: restart
