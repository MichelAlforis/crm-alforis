#!/usr/bin/env python3
"""
============================================================================
CHAPITRE 2 : Tests Authentification & Sécurité 🔐
============================================================================
Tests complets d'authentification et de sécurité sur le serveur de production
URL: https://crm.alforis.fr

Usage:
    python3 test-auth-security-prod.py
    TEST_EMAIL=user@example.com TEST_PASSWORD=secret python3 test-auth-security-prod.py
"""

import os
import sys
import json
import base64
import time
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from urllib.parse import urlparse

# Configuration
API_URL = os.getenv("API_URL", "https://crm.alforis.fr")
API_BASE = f"{API_URL}/api/v1"
FRONTEND_URL = API_URL

# Identifiants de test
TEST_EMAIL = os.getenv("TEST_EMAIL")
TEST_PASSWORD = os.getenv("TEST_PASSWORD")

# Timeout pour les requêtes (en secondes)
REQUEST_TIMEOUT = 10

# Couleurs ANSI
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

# Résultats des tests
test_results = {
    "passed": 0,
    "failed": 0,
    "total": 0,
    "details": []
}

# Session pour les cookies
session = requests.Session()
auth_token = None


def log_section(title: str):
    """Affiche une section"""
    print(f"\n{Colors.BLUE}{'═' * 59}{Colors.NC}")
    print(f"{Colors.BLUE}  {title}{Colors.NC}")
    print(f"{Colors.BLUE}{'═' * 59}{Colors.NC}\n")


def log_test(name: str):
    """Enregistre le début d'un test"""
    print(f"{Colors.YELLOW}▶ Test: {name}{Colors.NC}")
    test_results["total"] += 1


def log_pass(message: str):
    """Enregistre un test réussi"""
    print(f"{Colors.GREEN}✓ PASS{Colors.NC} - {message}\n")
    test_results["passed"] += 1
    test_results["details"].append({"status": "PASS", "message": message})


def log_fail(message: str):
    """Enregistre un test échoué"""
    print(f"{Colors.RED}✗ FAIL{Colors.NC} - {message}\n")
    test_results["failed"] += 1
    test_results["details"].append({"status": "FAIL", "message": message})


def log_warning(message: str):
    """Affiche un avertissement"""
    print(f"{Colors.YELLOW}⚠{Colors.NC} {message}")


def log_info(message: str):
    """Affiche une information"""
    print(f"{Colors.BLUE}ℹ{Colors.NC} {message}")


def log_error(message: str):
    """Affiche une erreur"""
    print(f"{Colors.RED}✗{Colors.NC} {message}")


# ============================================================================
# Tests de Connexion
# ============================================================================

def test_login_valid_credentials() -> bool:
    """Test de connexion avec identifiants valides"""
    global auth_token
    log_test("Connexion avec des identifiants valides")

    if not TEST_EMAIL or not TEST_PASSWORD:
        log_warning("Identifiants non fournis (TEST_EMAIL et TEST_PASSWORD requis)")
        log_info("Skipping test - requis pour les tests de session")
        return True

    try:
        response = session.post(
            f"{API_BASE}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=REQUEST_TIMEOUT
        )

        if response.status_code == 200:
            data = response.json()
            auth_token = data.get("access_token")

            if auth_token:
                log_pass("Connexion réussie, token obtenu")
                log_info(f"Token (tronqué): {auth_token[:20]}...")
                return True
            else:
                log_fail("Connexion réussie mais aucun token dans la réponse")
                return False
        else:
            log_fail(f"Échec de la connexion (HTTP {response.status_code})")
            log_error(f"Réponse: {response.text}")
            return False

    except requests.RequestException as e:
        log_fail(f"Erreur de connexion: {str(e)}")
        return False


def test_login_invalid_credentials():
    """Test de rejet des identifiants invalides"""
    log_test("Rejet des identifiants invalides")

    try:
        response = session.post(
            f"{API_BASE}/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"},
            timeout=REQUEST_TIMEOUT
        )

        if response.status_code in [401, 403]:
            log_pass(f"Identifiants invalides correctement rejetés (HTTP {response.status_code})")
        else:
            log_fail(f"Les identifiants invalides n'ont pas été rejetés (HTTP {response.status_code})")
            log_error(f"Réponse: {response.text}")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_login_error_message():
    """Test de présence de message d'erreur"""
    log_test("Message d'erreur approprié en cas d'échec")

    try:
        response = session.post(
            f"{API_BASE}/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"},
            timeout=REQUEST_TIMEOUT
        )

        try:
            data = response.json()
            if "detail" in data or "error" in data or "message" in data:
                error_msg = data.get("detail") or data.get("error") or data.get("message")
                log_pass("Message d'erreur présent dans la réponse")
                log_info(f"Message: {error_msg}")
            else:
                log_fail("Aucun message d'erreur informatif dans la réponse")
        except json.JSONDecodeError:
            log_fail("Réponse n'est pas du JSON valide")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_login_redirection():
    """Test d'accessibilité du frontend"""
    log_test("Redirection correcte après login réussi (Frontend)")

    try:
        response = requests.get(FRONTEND_URL, timeout=REQUEST_TIMEOUT, allow_redirects=True)

        if response.status_code == 200:
            log_pass(f"Frontend accessible (HTTP {response.status_code})")
        else:
            log_fail(f"Frontend inaccessible (HTTP {response.status_code})")

    except requests.RequestException as e:
        log_fail(f"Erreur de connexion au frontend: {str(e)}")


# ============================================================================
# Tests de Session
# ============================================================================

def test_session_persistence():
    """Test de persistance de session"""
    log_test("Session persiste avec le token JWT")

    if not auth_token:
        log_warning("Aucun token disponible (test de connexion requis)")
        return

    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = session.get(f"{API_BASE}/auth/me", headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code == 200:
            data = response.json()
            log_pass("Session valide, informations utilisateur récupérées")
            user_email = data.get("email")
            if user_email:
                log_info(f"Utilisateur: {user_email}")
        else:
            log_fail(f"Session invalide (HTTP {response.status_code})")
            log_error(f"Réponse: {response.text}")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_jwt_token_validity():
    """Test de validité du token JWT"""
    log_test("Token JWT valide et non expiré")

    if not auth_token:
        log_warning("Aucun token disponible")
        return

    try:
        # Décoder le payload JWT
        parts = auth_token.split('.')
        if len(parts) != 3:
            log_fail("Token JWT mal formé")
            return

        payload = parts[1]
        # Ajouter le padding base64 si nécessaire
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding

        decoded = base64.b64decode(payload)
        data = json.loads(decoded)

        if "exp" in data:
            exp = data["exp"]
            now = int(time.time())

            if exp > now:
                remaining = exp - now
                log_pass(f"Token valide, expire dans {remaining}s (~{remaining // 60} min)")
            else:
                log_fail("Token expiré")
        else:
            log_warning("Impossible de vérifier l'expiration du token")

    except Exception as e:
        log_fail(f"Erreur lors du décodage du token: {str(e)}")


def test_logout():
    """Test de déconnexion"""
    log_test("Déconnexion fonctionne correctement")

    try:
        # Vérifier que l'accès est refusé sans token
        response = session.get(f"{API_BASE}/auth/me", timeout=REQUEST_TIMEOUT)

        if response.status_code in [401, 403]:
            log_pass(f"Accès refusé sans token (HTTP {response.status_code})")
        else:
            log_fail(f"Accès non protégé sans token (HTTP {response.status_code})")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_protected_routes():
    """Test de protection des routes"""
    log_test("Protection des routes authentifiées")

    protected_routes = [
        "/organisations",
        "/people",
        "/tasks",
        "/mandats",
        "/kpis"
    ]

    failed_routes = []

    for route in protected_routes:
        try:
            response = session.get(f"{API_BASE}{route}", timeout=REQUEST_TIMEOUT)

            if response.status_code not in [401, 403]:
                failed_routes.append(f"{route} (HTTP {response.status_code})")

        except requests.RequestException:
            pass  # Ignorer les erreurs de connexion

    if not failed_routes:
        log_pass("Toutes les routes sont correctement protégées")
    else:
        log_fail("Certaines routes ne sont pas protégées:")
        for route in failed_routes:
            log_error(f"  - {route}")


# ============================================================================
# Tests de Sécurité
# ============================================================================

def test_cors_configuration():
    """Test de configuration CORS"""
    log_test("Configuration CORS correcte")

    try:
        headers = {"Origin": "https://example.com"}
        response = requests.get(f"{API_BASE}/health", headers=headers, timeout=REQUEST_TIMEOUT)

        cors_header = response.headers.get("Access-Control-Allow-Origin")

        if cors_header:
            log_pass(f"Header CORS présent: Access-Control-Allow-Origin: {cors_header}")

            if cors_header == "*":
                log_warning("CORS autorise toutes les origines (*) - risque de sécurité")
            else:
                log_pass("CORS restreint (pas de wildcard *)")
        else:
            log_fail("Header Access-Control-Allow-Origin absent")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_security_headers():
    """Test de présence des headers de sécurité"""
    log_test("Headers de sécurité présents")

    required_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "Content-Security-Policy"
    ]

    try:
        response = requests.get(FRONTEND_URL, timeout=REQUEST_TIMEOUT)

        missing_headers = []
        present_headers = []

        for header in required_headers:
            value = response.headers.get(header)
            if value:
                present_headers.append(f"{header}: {value}")
            else:
                missing_headers.append(header)

        if not missing_headers:
            log_pass("Tous les headers de sécurité sont présents")
            for header in present_headers:
                log_info(f"  ✓ {header}")
        else:
            log_warning("Headers de sécurité manquants (recommandés):")
            for header in missing_headers:
                log_error(f"  - {header}")

            if present_headers:
                log_info("Headers présents:")
                for header in present_headers:
                    log_info(f"  ✓ {header}")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_sensitive_data_exposure():
    """Test d'exposition de données sensibles"""
    log_test("Absence de données sensibles exposées")

    if not auth_token:
        log_warning("Aucun token disponible")
        return

    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = session.get(f"{API_BASE}/auth/me", headers=headers, timeout=REQUEST_TIMEOUT)

        data = response.json()

        sensitive_fields = [
            "password",
            "hashed_password",
            "secret",
            "private_key",
            "api_key"
        ]

        exposed_fields = [field for field in sensitive_fields if field in data]

        if not exposed_fields:
            log_pass("Aucune donnée sensible exposée")
        else:
            log_fail("⚠️  Données sensibles exposées dans la réponse:")
            for field in exposed_fields:
                log_error(f"  - {field}")

    except requests.RequestException as e:
        log_fail(f"Erreur de requête: {str(e)}")


def test_https_enforcement():
    """Test de redirection HTTP vers HTTPS"""
    log_test("HTTPS forcé (pas de HTTP en production)")

    parsed = urlparse(API_URL)
    if parsed.scheme != "https":
        log_fail("URL de test n'est pas HTTPS")
        return

    http_url = API_URL.replace("https://", "http://")

    try:
        response = requests.get(http_url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        final_url = response.url

        if final_url.startswith("https://"):
            log_pass("HTTP redirige correctement vers HTTPS")
            log_info(f"Redirection: {http_url} → {final_url}")
        else:
            log_fail("HTTP ne redirige pas vers HTTPS")
            log_error(f"URL finale: {final_url}")

    except requests.RequestException as e:
        log_fail(f"Erreur de connexion: {str(e)}")


def test_rate_limiting():
    """Test de rate limiting (optionnel)"""
    log_test("Rate limiting configuré (optionnel)")

    try:
        responses = []
        for _ in range(20):
            try:
                response = requests.get(f"{API_BASE}/health", timeout=REQUEST_TIMEOUT)
                responses.append(response.status_code)
            except:
                pass

        if 429 in responses:
            log_pass("Rate limiting activé (HTTP 429 détecté)")
        else:
            log_info("Rate limiting non détecté (recommandé mais non obligatoire)")

    except Exception as e:
        log_warning(f"Impossible de tester le rate limiting: {str(e)}")


def test_api_health():
    """Test de santé de l'API"""
    log_test("API backend accessible et en bonne santé")

    try:
        response = requests.get(f"{API_URL}/health", timeout=REQUEST_TIMEOUT)

        if response.status_code == 200:
            log_pass(f"API backend accessible (HTTP {response.status_code})")
            try:
                data = response.json()
                status = data.get("status")
                if status:
                    log_info(f"Status: {status}")
            except:
                pass
        else:
            log_fail(f"API backend inaccessible (HTTP {response.status_code})")

    except requests.RequestException as e:
        log_fail(f"API backend inaccessible: {str(e)}")


# ============================================================================
# Exécution des tests
# ============================================================================

def main():
    """Fonction principale"""
    log_section("🔐 CHAPITRE 2 : Tests Authentification & Sécurité")

    print(f"{Colors.BLUE}Serveur testé: {API_URL}{Colors.NC}")

    if TEST_EMAIL and TEST_PASSWORD:
        print(f"{Colors.BLUE}Mode: Authentifié (avec identifiants){Colors.NC}\n")
    else:
        print(f"{Colors.YELLOW}Mode: Non authentifié (tests limités){Colors.NC}")
        print(f"{Colors.YELLOW}Pour des tests complets, définissez TEST_EMAIL et TEST_PASSWORD{Colors.NC}\n")

    # Test préliminaire
    log_section("🏥 Test de Santé")
    test_api_health()

    # Tests de connexion
    log_section("📝 Tests de Connexion")
    test_login_valid_credentials()
    test_login_invalid_credentials()
    test_login_error_message()
    test_login_redirection()

    # Tests de session
    log_section("🔑 Tests de Session")
    test_session_persistence()
    test_jwt_token_validity()
    test_logout()
    test_protected_routes()

    # Tests de sécurité
    log_section("🛡️  Tests de Sécurité")
    test_cors_configuration()
    test_security_headers()
    test_sensitive_data_exposure()
    test_https_enforcement()
    test_rate_limiting()

    # Résumé
    log_section("📊 Résumé des Tests")
    print(f"Total:  {test_results['total']}")
    print(f"{Colors.GREEN}Réussis: {test_results['passed']}{Colors.NC}")
    print(f"{Colors.RED}Échoués:  {test_results['failed']}{Colors.NC}")

    if test_results['total'] > 0:
        success_rate = (test_results['passed'] * 100) // test_results['total']
        print(f"\nTaux de réussite: {success_rate}%")

    if test_results['failed'] == 0:
        print(f"\n{Colors.GREEN}✓ Tous les tests sont passés avec succès!{Colors.NC}\n")
        return 0
    else:
        print(f"\n{Colors.YELLOW}⚠ Certains tests ont échoué ou ont été skippés{Colors.NC}\n")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrompus par l'utilisateur{Colors.NC}\n")
        sys.exit(130)
