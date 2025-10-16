-- Migration: ajouter les colonnes country_code et language sur la table people
-- Exécuter cette migration sur la base PostgreSQL utilisée par l'application CRM.

ALTER TABLE people
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
    ADD COLUMN IF NOT EXISTS language VARCHAR(5);

ALTER TABLE investors
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
    ADD COLUMN IF NOT EXISTS language VARCHAR(5);

ALTER TABLE fournisseurs
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
    ADD COLUMN IF NOT EXISTS language VARCHAR(5);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'people'
          AND column_name = 'country_code'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE people ALTER COLUMN country_code TYPE VARCHAR(2);
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'people'
          AND column_name = 'language'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE people ALTER COLUMN language TYPE VARCHAR(5);
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investors'
          AND column_name = 'country_code'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE investors ALTER COLUMN country_code TYPE VARCHAR(2);
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investors'
          AND column_name = 'language'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE investors ALTER COLUMN language TYPE VARCHAR(5);
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'fournisseurs'
          AND column_name = 'country_code'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE fournisseurs ALTER COLUMN country_code TYPE VARCHAR(2);
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'fournisseurs'
          AND column_name = 'language'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE fournisseurs ALTER COLUMN language TYPE VARCHAR(5);
    END IF;
END $$;

-- Index optionnels pour accélérer les filtrages par pays / langue
CREATE INDEX IF NOT EXISTS idx_people_country_code ON people (country_code);
CREATE INDEX IF NOT EXISTS idx_people_language ON people (language);
CREATE INDEX IF NOT EXISTS idx_investors_country_code ON investors (country_code);
CREATE INDEX IF NOT EXISTS idx_investors_language ON investors (language);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_country_code ON fournisseurs (country_code);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_language ON fournisseurs (language);
