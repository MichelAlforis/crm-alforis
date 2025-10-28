#!/usr/bin/env python3
"""
Test rapide de la configuration Outlook
Vérifie que les credentials Microsoft sont chargés
"""
import sys
sys.path.insert(0, 'crm-backend')

from core.config import settings

print("🔍 Vérification configuration Microsoft OAuth\n")

print(f"✓ CLIENT_ID: {settings.microsoft_client_id[:20]}..." if settings.microsoft_client_id else "✗ CLIENT_ID manquant")
print(f"✓ CLIENT_SECRET: {settings.microsoft_client_secret[:10]}..." if settings.microsoft_client_secret else "✗ CLIENT_SECRET manquant")
print(f"✓ REDIRECT_URI: {settings.microsoft_redirect_uri}")

if settings.microsoft_client_id and settings.microsoft_client_secret:
    print("\n✅ Configuration Outlook OK - Le service devrait être actif")

    # Test d'instanciation du service
    try:
        from services.outlook_integration import OutlookIntegration
        print("\n🧪 Test d'instanciation OutlookIntegration...")

        # Mock minimal de Session
        class MockDB:
            def query(self, *args): return self
            def filter(self, *args): return self
            def first(self): return None
            def add(self, obj): pass
            def commit(self): pass

        service = OutlookIntegration(MockDB())
        print(f"✅ OutlookIntegration instancié avec client_id={service.client_id[:20]}...")

        # Test génération URL
        auth_url = service.get_authorization_url("test_state")
        print(f"✅ URL d'autorisation générée: {auth_url[:80]}...")

    except Exception as e:
        print(f"❌ Erreur lors de l'instanciation: {e}")
else:
    print("\n⚠️  Configuration Outlook incomplète - Le service sera désactivé")
