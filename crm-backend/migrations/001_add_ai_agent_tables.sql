-- Migration: Add AI Agent tables
-- Date: 2025-10-21
-- Description: Creates tables for AI suggestions, executions, configurations, and cache

-- ==============================================
-- AI Suggestions Table
-- ==============================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Entity reference
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,

    -- Suggestion content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    suggestion_data JSONB NOT NULL,

    -- AI metadata
    confidence_score FLOAT,
    ai_provider VARCHAR(20) NOT NULL DEFAULT 'claude',
    ai_model VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,

    -- Review
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Application
    auto_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Execution reference
    execution_id INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for ai_suggestions
CREATE INDEX idx_ai_suggestions_type ON ai_suggestions(type);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_entity ON ai_suggestions(entity_type, entity_id);
CREATE INDEX idx_ai_suggestions_confidence ON ai_suggestions(confidence_score DESC);
CREATE INDEX idx_ai_suggestions_created ON ai_suggestions(created_at DESC);

-- ==============================================
-- AI Executions Table
-- ==============================================
CREATE TABLE IF NOT EXISTS ai_executions (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Configuration
    config JSONB,
    ai_provider VARCHAR(20) NOT NULL DEFAULT 'claude',
    ai_model VARCHAR(100),

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds FLOAT,

    -- Results
    total_items_processed INTEGER DEFAULT 0,
    total_suggestions_created INTEGER DEFAULT 0,
    total_suggestions_applied INTEGER DEFAULT 0,

    -- AI metrics
    total_prompt_tokens INTEGER DEFAULT 0,
    total_completion_tokens INTEGER DEFAULT 0,
    estimated_cost_usd FLOAT,

    -- Logs and errors
    execution_logs JSONB,
    error_message TEXT,
    error_details JSONB,

    -- User reference
    triggered_by INTEGER REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for ai_executions
CREATE INDEX idx_ai_executions_task_type ON ai_executions(task_type);
CREATE INDEX idx_ai_executions_status ON ai_executions(status);
CREATE INDEX idx_ai_executions_created ON ai_executions(created_at DESC);
CREATE INDEX idx_ai_executions_triggered_by ON ai_executions(triggered_by);

-- Foreign key for ai_suggestions.execution_id
ALTER TABLE ai_suggestions
ADD CONSTRAINT fk_ai_suggestions_execution
FOREIGN KEY (execution_id) REFERENCES ai_executions(id) ON DELETE SET NULL;

-- ==============================================
-- AI Configurations Table
-- ==============================================
CREATE TABLE IF NOT EXISTS ai_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    -- Activation
    is_active BOOLEAN DEFAULT TRUE,

    -- AI Provider
    ai_provider VARCHAR(20) NOT NULL DEFAULT 'claude',
    ai_model VARCHAR(100),
    api_key_name VARCHAR(100),

    -- Auto-apply rules
    auto_apply_enabled BOOLEAN DEFAULT FALSE,
    auto_apply_confidence_threshold FLOAT DEFAULT 0.95,

    -- Detection thresholds
    duplicate_similarity_threshold FLOAT DEFAULT 0.85,
    quality_score_threshold FLOAT DEFAULT 0.70,

    -- Limits
    max_suggestions_per_execution INTEGER DEFAULT 100,
    max_tokens_per_request INTEGER DEFAULT 4000,
    rate_limit_requests_per_minute INTEGER DEFAULT 10,

    -- Budget
    daily_budget_usd FLOAT,
    monthly_budget_usd FLOAT,

    -- Notifications
    notify_on_suggestions BOOLEAN DEFAULT TRUE,
    notify_on_errors BOOLEAN DEFAULT TRUE,
    notification_user_ids JSONB,

    -- Advanced config
    custom_prompts JSONB,
    rules JSONB,

    -- Usage statistics
    total_executions INTEGER DEFAULT 0,
    total_suggestions INTEGER DEFAULT 0,
    total_cost_usd FLOAT DEFAULT 0.0,
    last_execution_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for ai_configurations
CREATE INDEX idx_ai_configurations_active ON ai_configurations(is_active);
CREATE INDEX idx_ai_configurations_name ON ai_configurations(name);

-- ==============================================
-- AI Cache Table
-- ==============================================
CREATE TABLE IF NOT EXISTS ai_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(64) UNIQUE NOT NULL,
    request_type VARCHAR(50) NOT NULL,

    -- Request and response
    request_data JSONB NOT NULL,
    response_data JSONB NOT NULL,

    -- Metadata
    ai_provider VARCHAR(20) NOT NULL,
    ai_model VARCHAR(100),
    confidence_score FLOAT,

    -- Cache management
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for ai_cache
CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_type ON ai_cache(request_type);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);

-- ==============================================
-- Triggers for updated_at
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
CREATE TRIGGER update_ai_suggestions_updated_at
    BEFORE UPDATE ON ai_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_executions_updated_at
    BEFORE UPDATE ON ai_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_configurations_updated_at
    BEFORE UPDATE ON ai_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_cache_updated_at
    BEFORE UPDATE ON ai_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Initial Data
-- ==============================================

-- Insert default configuration
INSERT INTO ai_configurations (
    name,
    description,
    is_active,
    ai_provider,
    ai_model,
    auto_apply_enabled,
    auto_apply_confidence_threshold,
    duplicate_similarity_threshold,
    quality_score_threshold,
    max_suggestions_per_execution,
    daily_budget_usd,
    monthly_budget_usd
) VALUES (
    'default',
    'Configuration par défaut de l''agent IA',
    TRUE,
    'claude',
    'claude-3-5-sonnet-20241022',
    FALSE,
    0.95,
    0.85,
    0.70,
    100,
    10.0,
    300.0
) ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- Comments
-- ==============================================

COMMENT ON TABLE ai_suggestions IS 'Suggestions générées par l''agent IA (doublons, enrichissement, qualité)';
COMMENT ON TABLE ai_executions IS 'Historique des exécutions de l''agent IA avec métriques';
COMMENT ON TABLE ai_configurations IS 'Configuration et paramètres de l''agent IA';
COMMENT ON TABLE ai_cache IS 'Cache des résultats IA pour optimiser les coûts';

COMMENT ON COLUMN ai_suggestions.confidence_score IS 'Score de confiance de l''IA (0.0 à 1.0)';
COMMENT ON COLUMN ai_suggestions.suggestion_data IS 'Données structurées de la suggestion (JSON)';
COMMENT ON COLUMN ai_executions.estimated_cost_usd IS 'Coût estimé de l''exécution en USD';
COMMENT ON COLUMN ai_cache.hit_count IS 'Nombre de fois que le cache a été réutilisé';
