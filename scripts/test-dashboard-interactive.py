#!/usr/bin/env python3
"""
============================================================================
CHAPITRE 3 : Tests Dashboard & API Endpoints 📊 (Version Interactive)
============================================================================
Tests pour diagnostiquer les problèmes du dashboard (erreurs 404, 500).

Usage:
    python3 test-dashboard-interactive.py
"""

import os
import sys
import json
import getpass
import requests
from typing import Dict, Optional
from datetime import datetime

# Configuration
API_URL = os.getenv("API_URL", "https://crm.alforis.fr")
API_BASE = f"{API_URL}/api/v1"
REQUEST_TIMEOUT = 10

# Couleurs ANSI
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    BOLD = '\033[1m'
    NC = '\033[0m'

# Résultats
test_results = {"passed": 0, "failed": 0, "total": 0, "details": []}
session = requests.Session()
auth_token = None


def print_header():
    """Affiche l'en-tête"""
    print(f"\n{Colors.CYAN}{'═' * 70}{Colors.NC}")
    print(f"{Colors.CYAN}{Colors.BOLD}   📊 CHAPITRE 3 : Tests Dashboard & API Endpoints   {Colors.NC}")
    print(f"{Colors.CYAN}{'═' * 70}{Colors.NC}\n")


def log_section(title: str):
    """Affiche une section"""
    print(f"\n{Colors.BLUE}{'─' * 70}{Colors.NC}")
    print(f"{Colors.BLUE}  {title}{Colors.NC}")
    print(f"{Colors.BLUE}{'─' * 70}{Colors.NC}\n")


def log_test(name: str):
    """Début d'un test"""
    print(f"{Colors.YELLOW}▶ Test: {name}{Colors.NC}")
    test_results["total"] += 1


def log_pass(message: str):
    """Test réussi"""
    print(f"{Colors.GREEN}✓ PASS{Colors.NC} - {message}\n")
    test_results["passed"] += 1
    test_results["details"].append({"status": "PASS", "message": message})


def log_fail(message: str, details: Optional[str] = None):
    """Test échoué"""
    print(f"{Colors.RED}✗ FAIL{Colors.NC} - {message}")
    if details:
        print(f"  {Colors.RED}Details: {details}{Colors.NC}\n")
    else:
        print()
    test_results["failed"] += 1
    test_results["details"].append({"status": "FAIL", "message": message, "details": details})


def log_info(message: str):
    """Information"""
    print(f"  ℹ {message}")


def authenticate() -> bool:
    """Authentification interactive"""
    global auth_token

    log_section("🔐 Authentification")

    # Essayer d'abord les variables d'environnement
    email = os.getenv("CRM_EMAIL")
    password = os.getenv("CRM_PASSWORD")

    if not email or not password:
        print(f"{Colors.CYAN}Saisissez vos identifiants :{Colors.NC}")
        try:
            email = input(f"  Email: ").strip()
            password = getpass.getpass(f"  Password: ")
        except EOFError:
            log_fail("Aucun identifiant fourni (ni en env vars, ni en input)")
            log_info("Utilisez: CRM_EMAIL=xxx CRM_PASSWORD=xxx python3 script.py")
            return False

    log_test("Authentification avec identifiants")

    try:
        response = session.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=REQUEST_TIMEOUT
        )

        if response.status_code == 200:
            data = response.json()
            auth_token = data.get("access_token")
            if auth_token:
                log_pass(f"Authentification réussie (token obtenu)")
                log_info(f"Token: {auth_token[:20]}...")
                return True
            else:
                log_fail("Token non trouvé dans la réponse")
                return False
        else:
            log_fail(f"Authentification échouée (HTTP {response.status_code})", response.text[:200])
            return False

    except Exception as e:
        log_fail(f"Erreur lors de l'authentification", str(e))
        return False


def test_endpoint(endpoint: str, description: str, expected_fields: Optional[list] = None) -> Optional[Dict]:
    """Teste un endpoint API"""
    log_test(f"{description} - GET {endpoint}")

    try:
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        response = session.get(
            f"{API_BASE}{endpoint}",
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )

        log_info(f"Status: HTTP {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()
                log_pass(f"Endpoint {endpoint} accessible")

                # Vérifier les champs attendus
                if expected_fields:
                    missing = [f for f in expected_fields if f not in data]
                    if missing:
                        log_info(f"⚠️  Champs manquants: {', '.join(missing)}")
                    else:
                        log_info(f"✓ Tous les champs attendus présents")

                # Afficher un aperçu des données
                if isinstance(data, dict):
                    log_info(f"Clés retournées: {', '.join(list(data.keys())[:10])}")
                    if 'total' in data:
                        log_info(f"Total items: {data['total']}")
                elif isinstance(data, list):
                    log_info(f"Nombre d'items: {len(data)}")

                return data
            except json.JSONDecodeError as e:
                log_fail(f"Réponse non-JSON", str(e))
                return None
        elif response.status_code == 404:
            log_fail(f"Endpoint non trouvé (404)", f"URL: {API_BASE}{endpoint}")
            return None
        elif response.status_code == 500:
            log_fail(f"Erreur serveur (500)", response.text[:500])
            return None
        else:
            log_fail(f"Erreur HTTP {response.status_code}", response.text[:500])
            return None

    except requests.exceptions.Timeout:
        log_fail(f"Timeout après {REQUEST_TIMEOUT}s")
        return None
    except Exception as e:
        log_fail(f"Erreur lors de la requête", str(e))
        return None


def test_dashboard_endpoints():
    """Teste tous les endpoints du dashboard"""

    log_section("📊 Tests des Endpoints Dashboard")

    # 1. Test organisations
    test_endpoint("/organisations", "Liste des organisations", ["items", "total"])

    # 2. Test mandats
    test_endpoint("/mandats", "Liste des mandats", ["items", "total"])

    # 3. Test tasks (PROBLÈME SIGNALÉ)
    log_info("⚠️  Endpoint signalé avec erreur 500")
    test_endpoint("/tasks", "Liste des tâches", ["items", "total"])

    # 4. Test tasks with filters
    test_endpoint("/tasks?view=today", "Tâches du jour", ["items", "total"])
    test_endpoint("/tasks?view=overdue", "Tâches en retard", ["items", "total"])

    # 5. Test people
    test_endpoint("/people", "Liste des personnes", ["items", "total"])

    # 6. Test AI statistics (PROBLÈME SIGNALÉ avec double /api/v1)
    log_info("⚠️  Endpoint signalé avec erreur 404 (double /api/v1)")
    test_endpoint("/ai/statistics", "Statistiques AI", [
        "total_suggestions",
        "pending_suggestions",
        "total_executions"
    ])

    # 7. Test AI suggestions
    test_endpoint("/ai/suggestions", "Suggestions AI")

    # 8. Test dashboard stats
    test_endpoint("/dashboards/stats/global", "Stats dashboard globales")


def print_summary():
    """Affiche le résumé des tests"""
    print(f"\n{Colors.CYAN}{'═' * 70}{Colors.NC}")
    print(f"{Colors.CYAN}{Colors.BOLD}   📈 RÉSUMÉ DES TESTS   {Colors.NC}")
    print(f"{Colors.CYAN}{'═' * 70}{Colors.NC}\n")

    total = test_results["total"]
    passed = test_results["passed"]
    failed = test_results["failed"]

    success_rate = (passed / total * 100) if total > 0 else 0

    print(f"  Total des tests : {total}")
    print(f"  {Colors.GREEN}✓ Réussis     : {passed}{Colors.NC}")
    print(f"  {Colors.RED}✗ Échoués     : {failed}{Colors.NC}")
    print(f"\n  Taux de succès : {success_rate:.1f}%\n")

    if failed > 0:
        print(f"{Colors.RED}Tests échoués :{Colors.NC}")
        for detail in test_results["details"]:
            if detail["status"] == "FAIL":
                print(f"  • {detail['message']}")
                if detail.get("details"):
                    print(f"    → {detail['details'][:100]}")

    print(f"\n{Colors.CYAN}{'═' * 70}{Colors.NC}\n")


def main():
    """Point d'entrée principal"""
    print_header()

    # Authentification
    if not authenticate():
        print(f"\n{Colors.RED}❌ Authentification échouée. Arrêt des tests.{Colors.NC}\n")
        sys.exit(1)

    # Tests des endpoints
    test_dashboard_endpoints()

    # Résumé
    print_summary()

    # Code de sortie
    sys.exit(0 if test_results["failed"] == 0 else 1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Tests interrompus par l'utilisateur{Colors.NC}\n")
        sys.exit(130)
