-- Migration: ajouter les colonnes country_code et language sur la table people
-- Exécuter cette migration sur la base PostgreSQL utilisée par l'application CRM.

ALTER TABLE people
    ADD COLUMN IF NOT EXISTS country_code CHAR(2),
    ADD COLUMN IF NOT EXISTS language CHAR(5);

-- Index optionnels pour accélérer les filtrages par pays / langue
CREATE INDEX IF NOT EXISTS idx_people_country_code ON people (country_code);
CREATE INDEX IF NOT EXISTS idx_people_language ON people (language);

-- Facultatif : si vous souhaitez appliquer la même logique aux organisations,
-- ajoutez les colonnes ci-dessous puis adaptez les modèles correspondants :
-- ALTER TABLE investors ADD COLUMN IF NOT EXISTS country_code CHAR(2);
-- ALTER TABLE investors ADD COLUMN IF NOT EXISTS language CHAR(5);
-- ALTER TABLE fournisseurs ADD COLUMN IF NOT EXISTS country_code CHAR(2);
-- ALTER TABLE fournisseurs ADD COLUMN IF NOT EXISTS language CHAR(5);
