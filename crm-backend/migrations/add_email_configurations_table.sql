-- Migration: Ajout de la table email_configurations
-- Date: 2025-01-XX
-- Description: Table pour stocker les configurations email avec clés API cryptées

CREATE TABLE IF NOT EXISTS email_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,

    -- Provider et configuration
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('resend', 'sendgrid', 'mailgun')),
    api_key_encrypted TEXT NOT NULL,
    provider_config TEXT, -- JSON crypté avec config additionnelle (ex: mailgun domain)

    -- Paramètres d'envoi
    from_name VARCHAR(100),
    from_email VARCHAR(255),
    reply_to VARCHAR(255),
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 120,
    batch_size INTEGER NOT NULL DEFAULT 500,
    track_opens BOOLEAN NOT NULL DEFAULT TRUE,
    track_clicks BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20),
    test_error TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Index unique partiel pour garantir une seule configuration active
CREATE UNIQUE INDEX unique_active_config ON email_configurations(is_active) WHERE is_active = TRUE;

-- Autres index
CREATE INDEX idx_email_configurations_is_active ON email_configurations(is_active);
CREATE INDEX idx_email_configurations_provider ON email_configurations(provider);

-- Commentaires
COMMENT ON TABLE email_configurations IS 'Configurations des fournisseurs d''email avec clés API cryptées';
COMMENT ON COLUMN email_configurations.api_key_encrypted IS 'Clé API cryptée avec Fernet';
COMMENT ON COLUMN email_configurations.provider_config IS 'Configuration additionnelle cryptée (JSON)';
