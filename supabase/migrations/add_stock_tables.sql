-- Création des tables pour la gestion des stocks
-- Migration: add_stock_tables.sql

-- Table pour les entrées de stock
CREATE TABLE IF NOT EXISTS stock_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date            DATE NOT NULL,
    source          VARCHAR(255) NOT NULL,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les détails des entrées par dimension
CREATE TABLE IF NOT EXISTS stock_entry_details (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
    dimension       VARCHAR(50) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les sorties de stock
CREATE TABLE IF NOT EXISTS stock_exits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date            DATE NOT NULL,
    destination     VARCHAR(255) NOT NULL,
    exit_type       exit_type DEFAULT 'sale',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les détails des sorties par dimension
CREATE TABLE IF NOT EXISTS stock_exit_details (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exit_id         UUID NOT NULL REFERENCES stock_exits(id) ON DELETE CASCADE,
    dimension       VARCHAR(50) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Triggers pour updated_at
CREATE TRIGGER update_stock_entries_updated_at
    BEFORE UPDATE ON stock_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_exits_updated_at
    BEFORE UPDATE ON stock_exits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_stock_entries_date ON stock_entries(date);
CREATE INDEX IF NOT EXISTS idx_stock_exits_date ON stock_exits(date);
CREATE INDEX IF NOT EXISTS idx_stock_entry_details_entry_id ON stock_entry_details(entry_id);
CREATE INDEX IF NOT EXISTS idx_stock_exit_details_exit_id ON stock_exit_details(exit_id);