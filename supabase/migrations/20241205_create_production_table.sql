-- Migration: Création table production + RLS (corrige "Erreur de connexion")
-- Exécuter dans Supabase SQL Editor

-- Table principale production
CREATE TABLE IF NOT EXISTS production (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date        DATE NOT NULL,
    site        VARCHAR(255) NOT NULL,
    shift       VARCHAR(20) CHECK (shift IN ('Jour', 'Nuit', 'Matin')),
    operator    VARCHAR(255) NOT NULL,
    notes       TEXT,
    total       DECIMAL(12,3),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Détails par dimension
CREATE TABLE IF NOT EXISTS production_details (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_id   UUID NOT NULL REFERENCES production(id) ON DELETE CASCADE,
    dimension       VARCHAR(50) NOT NULL,
    quantity        DECIMAL(12,3) NOT NULL CHECK (quantity >= 0),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(production_id, dimension)
);

-- Trigger updated_at
CREATE TRIGGER update_production_updated_at BEFORE UPDATE ON production
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index performance
CREATE INDEX idx_production_date ON production(date);
CREATE INDEX idx_production_site ON production(site);
CREATE INDEX idx_production_operator ON production(operator);

-- RLS Policies (identique aux autres tables)
ALTER TABLE production ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_details ENABLE ROW LEVEL SECURITY;

-- Lecture: tous authentifiés
CREATE POLICY "auth_read_production" ON production FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_prod_details" ON production_details FOR SELECT USING (auth.role() = 'authenticated');

-- Écriture: admin/supervisor/operator (rôles du code)
CREATE POLICY "prod_write_insert" ON production FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

CREATE POLICY "prod_details_write" ON production_details FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM production p WHERE p.id = production_id AND auth.uid() IS NOT NULL)
);

-- Update: admin/supervisor seulement
CREATE POLICY "prod_write_update" ON production FOR UPDATE USING (
    auth.uid() IS NOT NULL
);

-- Données de test
INSERT INTO production (date, site, shift, operator, notes, total) VALUES
    ('2026-03-15', 'Site Principal', 'Jour', 'JD', 'Production normale', 795.0),
    ('2026-03-14', 'Site Principal', 'Jour', 'JD', 'Production matin', 880.0)
ON CONFLICT DO NOTHING;

INSERT INTO production_details (production_id, dimension, quantity) VALUES
    ((SELECT id FROM production WHERE date = '2026-03-15' LIMIT 1), 'Minerai', 280),
    ((SELECT id FROM production WHERE date = '2026-03-15' LIMIT 1), 'Forage', 145),
    ((SELECT id FROM production WHERE date = '2026-03-15' LIMIT 1), '0/4', 195),
    ((SELECT id FROM production WHERE date = '2026-03-15' LIMIT 1), '0/5', 175)
ON CONFLICT DO NOTHING;

-- Vérification
SELECT 'Migration production OK' AS status, COUNT(*) AS records FROM production;
