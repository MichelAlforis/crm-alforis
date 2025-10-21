-- Migration: Ajout des colonnes pour stocker les API keys chiffrées
-- Date: 2025-10-21
-- Description: Permet aux utilisateurs de configurer leurs propres API keys depuis le frontend

-- Ajouter colonnes pour stocker les clés API chiffrées
ALTER TABLE ai_configuration
ADD COLUMN IF NOT EXISTS encrypted_anthropic_key TEXT,
ADD COLUMN IF NOT EXISTS encrypted_openai_key TEXT,
ADD COLUMN IF NOT EXISTS encrypted_ollama_url TEXT,
ADD COLUMN IF NOT EXISTS api_keys_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS api_keys_updated_by INTEGER REFERENCES users(id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ai_config_keys_updated
ON ai_configuration(api_keys_updated_at DESC);

-- Commentaires pour documentation
COMMENT ON COLUMN ai_configuration.encrypted_anthropic_key IS 'Clé API Anthropic Claude chiffrée (Fernet AES-256)';
COMMENT ON COLUMN ai_configuration.encrypted_openai_key IS 'Clé API OpenAI chiffrée (Fernet AES-256)';
COMMENT ON COLUMN ai_configuration.encrypted_ollama_url IS 'URL Ollama chiffrée (si custom)';
COMMENT ON COLUMN ai_configuration.api_keys_updated_at IS 'Dernière mise à jour des clés API';
COMMENT ON COLUMN ai_configuration.api_keys_updated_by IS 'Utilisateur ayant mis à jour les clés';
