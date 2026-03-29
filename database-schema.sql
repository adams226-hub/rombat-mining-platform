-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- TYPES ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'operator', 'viewer', 'directeur', 'chef_de_site', 'comptable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE equipment_type AS ENUM ('excavator', 'drill', 'conveyor', 'crusher', 'loader', 'truck', 'pump', 'generator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status AS ENUM ('active', 'maintenance', 'offline', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE exit_type AS ENUM ('sale', 'transfer', 'loss', 'sample', 'return');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE fuel_type AS ENUM ('diesel', 'essence', 'gasoil', 'hybrid', 'electric');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective', 'emergency', 'inspection', 'overhaul');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled', 'deferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE report_type AS ENUM ('production', 'financial', 'maintenance', 'safety', 'summary', 'audit', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('generating', 'completed', 'failed', 'scheduled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FONCTION UTILITAIRE : updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TABLES

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(50)  UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            user_role    NOT NULL,
    department      VARCHAR(100),
    phone           VARCHAR(20),
    avatar_url      TEXT,
    locale          VARCHAR(10) DEFAULT 'fr-FR',
    timezone        VARCHAR(50)  DEFAULT 'UTC',
    is_active       BOOLEAN      DEFAULT true,
    failed_attempts INTEGER      DEFAULT 0,
    locked_until    TIMESTAMP,
    last_login      TIMESTAMP,
    last_ip         INET,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_sessions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) NOT NULL UNIQUE,
    ip_address   INET,
    user_agent   TEXT,
    expires_at   TIMESTAMP NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(20)  UNIQUE,
    location    VARCHAR(255),
    latitude    DECIMAL(10, 7),
    longitude   DECIMAL(10, 7),
    description TEXT,
    manager_id  UUID REFERENCES users(id),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS equipment (
    id                     UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                   VARCHAR(255)   NOT NULL,
    type                   equipment_type NOT NULL,
    model                  VARCHAR(255),
    manufacturer           VARCHAR(255),
    serial_number          VARCHAR(100)   UNIQUE,
    site_id                UUID           REFERENCES sites(id),
    status                 equipment_status DEFAULT 'active',
    capacity               DECIMAL(10,2),
    purchase_date          DATE,
    purchase_cost          DECIMAL(12,2),
    warranty_expiry        DATE,
    insurance_expiry       DATE,
    last_maintenance       TIMESTAMP,
    next_maintenance       TIMESTAMP,
    maintenance_interval_h INTEGER DEFAULT 500,
    operating_hours        DECIMAL(10,2)  DEFAULT 0,
    fuel_consumption_rate  DECIMAL(8,2),
    co2_emission_rate      DECIMAL(8,2),
    notes                  TEXT,
    created_at             TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS material_dimensions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    unit        VARCHAR(20) DEFAULT 'tonnes',
    min_size_mm DECIMAL(6,2),
    max_size_mm DECIMAL(6,2),
    density     DECIMAL(6,3),
    is_active   BOOLEAN     DEFAULT true,
    sort_order  INTEGER     DEFAULT 0,
    created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_entries (
    id           UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date   DATE      NOT NULL,
    source       VARCHAR(255) NOT NULL,
    site_id      UUID      REFERENCES sites(id),
    equipment_id UUID      REFERENCES equipment(id),
    operator_id  UUID      REFERENCES users(id),
    shift        VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night')),
    weather_conditions VARCHAR(100),
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_stock_entries_updated_at
    BEFORE UPDATE ON stock_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS stock_entry_details (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_entry_id  UUID          NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
    dimension_id    UUID          NOT NULL REFERENCES material_dimensions(id),
    quantity        DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    quality_grade   VARCHAR(20)   CHECK (quality_grade IN ('A', 'B', 'C', 'D', 'rejected')),
    moisture_pct    DECIMAL(5,2)  CHECK (moisture_pct BETWEEN 0 AND 100),
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_entry_id, dimension_id)
);

CREATE TABLE IF NOT EXISTS clients (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    code           VARCHAR(50)  UNIQUE,
    contact_name   VARCHAR(255),
    email          VARCHAR(255),
    phone          VARCHAR(30),
    address        TEXT,
    tax_number     VARCHAR(100),
    credit_limit   DECIMAL(12,2),
    payment_terms  INTEGER DEFAULT 30,
    is_active      BOOLEAN  DEFAULT true,
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS stock_exits (
    id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    exit_date       DATE      NOT NULL,
    destination     VARCHAR(255) NOT NULL,
    exit_type       exit_type NOT NULL,
    site_id         UUID      REFERENCES sites(id),
    operator_id     UUID      REFERENCES users(id),
    client_name     VARCHAR(255),
    client_id       UUID      REFERENCES clients(id),
    order_reference VARCHAR(100),
    delivery_note   VARCHAR(100),
    vehicle_plate   VARCHAR(30),
    driver_name     VARCHAR(255),
    validated_by    UUID      REFERENCES users(id),
    validated_at    TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_stock_exits_updated_at
    BEFORE UPDATE ON stock_exits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS stock_exit_details (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_exit_id  UUID          NOT NULL REFERENCES stock_exits(id) ON DELETE CASCADE,
    dimension_id   UUID          NOT NULL REFERENCES material_dimensions(id),
    quantity       DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_price     DECIMAL(10,2) CHECK (unit_price >= 0),
    discount_pct   DECIMAL(5,2)  DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    total_price    DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - COALESCE(discount_pct, 0) / 100)) STORED,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_exit_id, dimension_id)
);

CREATE TABLE IF NOT EXISTS fuel_transactions (
    id                UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date  DATE      NOT NULL,
    equipment_id      UUID      NOT NULL REFERENCES equipment(id),
    fuel_type         fuel_type NOT NULL,
    quantity          DECIMAL(10,2)  NOT NULL CHECK (quantity > 0),
    cost_per_liter    DECIMAL(8,3)   NOT NULL CHECK (cost_per_liter > 0),
    total_cost        DECIMAL(12,2)  GENERATED ALWAYS AS (quantity * cost_per_liter) STORED,
    odometer_reading  DECIMAL(12,2),
    site_id           UUID      REFERENCES sites(id),
    operator_id       UUID      REFERENCES users(id),
    supplier          VARCHAR(255),
    invoice_reference VARCHAR(100),
    efficiency_rating DECIMAL(5,2),
    notes             TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_fuel_transactions_updated_at
    BEFORE UPDATE ON fuel_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ----------------------------------------
-- Table des maintenances
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS maintenance (
    id                    UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id          UUID              NOT NULL REFERENCES equipment(id),
    maintenance_type      maintenance_type  NOT NULL,
    priority              INTEGER           DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),  -- 1=critique, 5=faible (NOUVEAU)
    start_date            TIMESTAMP         NOT NULL,
    end_date              TIMESTAMP,
    duration_hours        DECIMAL(8,2) GENERATED ALWAYS AS (
        CASE 
            WHEN end_date IS NOT NULL THEN
                EXTRACT(EPOCH FROM (end_date - start_date)) / 3600
            ELSE NULL
        END
    ) STORED,                                     -- Calculé automatiquement (AMÉLIORATION)
    description           TEXT              NOT NULL,
    technician_id         UUID              REFERENCES users(id),
    external_contractor   VARCHAR(255),            -- Sous-traitant externe (NOUVEAU)
    parts_used            JSONB,                   -- JSON structuré (was TEXT)
    labor_cost            DECIMAL(10,2),
    parts_cost            DECIMAL(10,2),           -- Coût pièces séparé (NOUVEAU)
    total_cost            DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0)
    ) STORED,                                     -- Calculé automatiquement (AMÉLIORATION)
    downtime_hours        DECIMAL(8,2),
    status                maintenance_status DEFAULT 'planned',
    work_order_number     VARCHAR(100),            -- Numéro OT (NOUVEAU)
    next_maintenance_date TIMESTAMP,
    photos                TEXT[],                  -- URLs des photos (NOUVEAU)
    notes                 TEXT,
    created_at            TIMESTAMP         DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP         DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- Table des transactions financières
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS financial_transactions (
    id               UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE             NOT NULL,
    type             transaction_type NOT NULL,
    category         VARCHAR(100)     NOT NULL,
    subcategory      VARCHAR(100),                -- Sous-catégorie (NOUVEAU)
    description      TEXT             NOT NULL,
    amount           DECIMAL(12,2)    NOT NULL CHECK (amount > 0),
    currency         VARCHAR(3)       DEFAULT 'XOF',  -- Devise ISO 4217 (NOUVEAU)
    exchange_rate    DECIMAL(12,6)    DEFAULT 1,       -- Taux de change (NOUVEAU)
    amount_local     DECIMAL(12,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
    reference        VARCHAR(100),
    invoice_number   VARCHAR(100),                -- Numéro de facture (NOUVEAU)
    site_id          UUID             REFERENCES sites(id),
    client_id        UUID             REFERENCES clients(id),  -- Lié clients (NOUVEAU)
    client_supplier  VARCHAR(255),
    payment_method   VARCHAR(50)      CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money', 'card')),
    payment_status   payment_status   DEFAULT 'pending',
    due_date         DATE,
    paid_at          TIMESTAMP,                   -- Date de paiement effectif (NOUVEAU)
    tax_amount       DECIMAL(12,2)    DEFAULT 0,  -- Montant TVA (NOUVEAU)
    created_by       UUID             REFERENCES users(id),
    approved_by      UUID             REFERENCES users(id),
    approved_at      TIMESTAMP,                   -- Date d'approbation (NOUVEAU)
    notes            TEXT,
    created_at       TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- Table des objectifs de production (NOUVELLE)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS production_targets (
    id           UUID   PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id      UUID   REFERENCES sites(id),
    dimension_id UUID   REFERENCES material_dimensions(id),
    period_type  VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    period_start DATE   NOT NULL,
    period_end   DATE   NOT NULL,
    target_qty   DECIMAL(12,3) NOT NULL CHECK (target_qty > 0),
    target_revenue DECIMAL(15,2),
    created_by   UUID   REFERENCES users(id),
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- ----------------------------------------
-- Table des alertes (NOUVELLE)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         VARCHAR(255)   NOT NULL,
    message       TEXT           NOT NULL,
    severity      alert_severity NOT NULL DEFAULT 'info',
    status        alert_status   NOT NULL DEFAULT 'open',
    category      VARCHAR(100),  -- 'maintenance', 'stock', 'fuel', 'financial', 'safety'
    entity_type   VARCHAR(50),   -- Table concernée ex: 'equipment', 'stock_exits'
    entity_id     UUID,          -- ID de l'entité concernée
    site_id       UUID           REFERENCES sites(id),
    assigned_to   UUID           REFERENCES users(id),
    acknowledged_by UUID         REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved_by   UUID           REFERENCES users(id),
    resolved_at   TIMESTAMP,
    auto_generated BOOLEAN       DEFAULT false,  -- Créée par le système
    expires_at    TIMESTAMP,
    metadata      JSONB,         -- Données additionnelles structurées
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- Table des logs d'audit (NOUVELLE)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        REFERENCES users(id),
    username     VARCHAR(50),                      -- Dénormalisé pour conservation après suppression
    action       VARCHAR(50) NOT NULL,             -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'
    entity_table VARCHAR(100),                     -- Nom de la table concernée
    record_id    UUID,                             -- ID de l'enregistrement concerné
    old_values   JSONB,
    new_values   JSONB,
    ip_address   INET,
    user_agent   TEXT,
    success      BOOLEAN     DEFAULT true,
    error_msg    TEXT,
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------
-- Table des rapports
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(255)  NOT NULL,
    type         report_type   NOT NULL,
    period       VARCHAR(100)  NOT NULL,
    report_date  DATE          NOT NULL,
    status       report_status DEFAULT 'completed',
    format       VARCHAR(20)   DEFAULT 'PDF' CHECK (format IN ('PDF', 'Excel', 'CSV', 'JSON')),
    file_size    DECIMAL(10,2),
    file_path    TEXT,
    checksum     VARCHAR(64),   -- SHA256 du fichier pour intégrité (NOUVEAU)
    generated_by UUID          REFERENCES users(id),
    parameters   JSONB,
    error_log    TEXT,          -- Log d'erreur si échec (NOUVEAU)
    expires_at   TIMESTAMP,     -- Expiration automatique (NOUVEAU)
    download_count INTEGER DEFAULT 0,  -- Compteur de téléchargements (NOUVEAU)
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- Table des indicateurs de performance (KPIs)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date             DATE          NOT NULL,
    site_id               UUID          REFERENCES sites(id),
    total_production      DECIMAL(12,3) DEFAULT 0,
    total_revenue         DECIMAL(15,2) DEFAULT 0,
    total_expenses        DECIMAL(15,2) DEFAULT 0,
    net_profit            DECIMAL(15,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,  -- (NOUVEAU)
    profit_margin         DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_revenue > 0
            THEN ((total_revenue - total_expenses) / total_revenue) * 100
            ELSE 0
        END
    ) STORED,
    operating_hours       DECIMAL(10,2) DEFAULT 0,
    fuel_consumed         DECIMAL(10,2) DEFAULT 0,
    fuel_cost             DECIMAL(12,2) DEFAULT 0,  -- (NOUVEAU)
    maintenance_hours     DECIMAL(8,2)  DEFAULT 0,
    maintenance_cost      DECIMAL(12,2) DEFAULT 0,  -- (NOUVEAU)
    accidents_count       INTEGER       DEFAULT 0,
    near_misses_count     INTEGER       DEFAULT 0,  -- Presqu'accidents (NOUVEAU)
    efficiency_rate       DECIMAL(5,2),
    equipment_availability DECIMAL(5,2),
    created_at            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stat_date, site_id)
);

-- ========================================
-- INDEXES OPTIMISÉS
-- ========================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username   ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active     ON users(is_active) WHERE is_active = true;

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry  ON user_sessions(expires_at) WHERE revoked_at IS NULL;

-- Equipment
CREATE INDEX IF NOT EXISTS idx_equipment_site     ON equipment(site_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status   ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_type     ON equipment(type);
CREATE INDEX IF NOT EXISTS idx_equipment_maint    ON equipment(next_maintenance) WHERE status = 'active';

-- Stock
CREATE INDEX IF NOT EXISTS idx_stock_entries_date    ON stock_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_stock_entries_site    ON stock_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_exits_date      ON stock_exits(exit_date);
CREATE INDEX IF NOT EXISTS idx_stock_exits_client    ON stock_exits(client_id);
CREATE INDEX IF NOT EXISTS idx_stock_exit_details_dim ON stock_exit_details(dimension_id);

-- Fuel
CREATE INDEX IF NOT EXISTS idx_fuel_date       ON fuel_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fuel_equipment  ON fuel_transactions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_fuel_site       ON fuel_transactions(site_id);

-- Maintenance
CREATE INDEX IF NOT EXISTS idx_maint_equipment  ON maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maint_dates      ON maintenance(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_maint_status     ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maint_technician ON maintenance(technician_id);

-- Financial
CREATE INDEX IF NOT EXISTS idx_fin_date     ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fin_type     ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_fin_status   ON financial_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_fin_client   ON financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_due      ON financial_transactions(due_date) 
    WHERE payment_status IN ('pending', 'overdue');

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status   ON alerts(status) WHERE status IN ('open', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_site     ON alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity   ON alerts(entity_type, entity_id);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_table   ON audit_logs(entity_table, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_date    ON audit_logs(created_at);

-- Recherche textuelle
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON clients USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_equipment_name_trgm ON equipment USING gin(name gin_trgm_ops);

-- ========================================
-- VUES ANALYTIQUES
-- ========================================

-- Stock actuel par dimension
CREATE OR REPLACE VIEW current_stock AS
SELECT 
    md.id           AS dimension_id,
    md.name         AS dimension,
    md.unit,
    COALESCE(sed.total_entries, 0)                                            AS total_entries,
    COALESCE(sxd.total_exits, 0)                                              AS total_exits,
    COALESCE(sed.total_entries, 0) - COALESCE(sxd.total_exits, 0)            AS available_stock,
    COALESCE(sed.last_entry_date, NULL)                                       AS last_entry_date,
    COALESCE(sxd.last_exit_date, NULL)                                        AS last_exit_date
FROM material_dimensions md
LEFT JOIN (
    SELECT dimension_id,
           SUM(quantity)    AS total_entries,
           MAX(se.entry_date) AS last_entry_date
    FROM stock_entry_details sed
    JOIN stock_entries se ON sed.stock_entry_id = se.id
    GROUP BY dimension_id
) sed ON md.id = sed.dimension_id
LEFT JOIN (
    SELECT dimension_id,
           SUM(quantity)    AS total_exits,
           MAX(sx.exit_date) AS last_exit_date
    FROM stock_exit_details sxd
    JOIN stock_exits sx ON sxd.stock_exit_id = sx.id
    GROUP BY dimension_id
) sxd ON md.id = sxd.dimension_id
WHERE md.is_active = true
ORDER BY md.sort_order, md.name;

-- Performances des équipements
CREATE OR REPLACE VIEW equipment_performance AS
SELECT 
    e.id,
    e.name,
    e.type,
    e.status,
    e.operating_hours,
    e.fuel_consumption_rate                                           AS rated_fuel_rate,
    COALESCE(ft.total_consumption, 0)                                 AS total_fuel_consumed,
    COALESCE(ft.total_fuel_cost, 0)                                   AS total_fuel_cost,
    COALESCE(m.total_maintenance_hours, 0)                            AS total_maintenance_hours,
    COALESCE(m.total_maintenance_cost, 0)                             AS total_maintenance_cost,
    COALESCE(m.maintenance_count, 0)                                  AS maintenance_count,
    CASE 
        WHEN e.operating_hours > 0 THEN COALESCE(ft.total_consumption, 0) / e.operating_hours 
        ELSE 0 
    END                                                               AS actual_fuel_rate,
    -- Coût total de possession (TCO)
    COALESCE(e.purchase_cost, 0) 
        + COALESCE(ft.total_fuel_cost, 0) 
        + COALESCE(m.total_maintenance_cost, 0)                       AS total_cost_of_ownership,
    -- Disponibilité (hors maintenance)
    CASE
        WHEN (e.operating_hours + COALESCE(m.total_maintenance_hours, 0)) > 0 THEN
            e.operating_hours / (e.operating_hours + COALESCE(m.total_maintenance_hours, 0)) * 100
        ELSE 100
    END                                                               AS availability_pct
FROM equipment e
LEFT JOIN (
    SELECT equipment_id,
           SUM(quantity)   AS total_consumption,
           SUM(total_cost) AS total_fuel_cost
    FROM fuel_transactions
    GROUP BY equipment_id
) ft ON e.id = ft.equipment_id
LEFT JOIN (
    SELECT equipment_id,
           SUM(duration_hours)  AS total_maintenance_hours,
           SUM(total_cost)      AS total_maintenance_cost,
           COUNT(*)             AS maintenance_count
    FROM maintenance
    WHERE status = 'completed'
    GROUP BY equipment_id
) m ON e.id = m.equipment_id;

-- Rentabilité par client
CREATE OR REPLACE VIEW client_profitability AS
SELECT 
    c.id,
    c.name                                                            AS client_name,
    c.code,
    COUNT(DISTINCT sx.id)                                             AS total_orders,
    COALESCE(SUM(sxd.total_price), 0)                                 AS total_revenue,
    COALESCE(SUM(sxd.quantity), 0)                                    AS total_quantity,
    CASE 
        WHEN COUNT(DISTINCT sx.id) > 0 
        THEN COALESCE(SUM(sxd.total_price), 0) / COUNT(DISTINCT sx.id) 
        ELSE 0 
    END                                                               AS avg_order_value,
    MAX(sx.exit_date)                                                 AS last_order_date,
    COUNT(DISTINCT ft.id) FILTER (WHERE ft.payment_status = 'overdue') AS overdue_invoices
FROM clients c
LEFT JOIN stock_exits sx  ON c.id = sx.client_id
LEFT JOIN stock_exit_details sxd ON sx.id = sxd.stock_exit_id
LEFT JOIN financial_transactions ft ON c.id = ft.client_id AND ft.type = 'income'
GROUP BY c.id, c.name, c.code
ORDER BY total_revenue DESC;

-- Vue des alertes actives enrichies
CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    a.id,
    a.title,
    a.message,
    a.severity,
    a.category,
    a.entity_type,
    a.entity_id,
    s.name      AS site_name,
    u.full_name AS assigned_to_name,
    a.created_at,
    -- Âge de l'alerte
    EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 3600 AS age_hours
FROM alerts a
LEFT JOIN sites s ON a.site_id = s.id
LEFT JOIN users u ON a.assigned_to = u.id
WHERE a.status IN ('open', 'acknowledged')
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
ORDER BY 
    CASE a.severity 
        WHEN 'emergency' THEN 1 
        WHEN 'critical'  THEN 2 
        WHEN 'warning'   THEN 3 
        ELSE 4 
    END,
    a.created_at DESC;

-- Vue du tableau de bord mensuel
CREATE OR REPLACE VIEW monthly_dashboard AS
SELECT
    DATE_TRUNC('month', ds.stat_date)                   AS month,
    s.name                                              AS site_name,
    SUM(ds.total_production)                            AS total_production,
    SUM(ds.total_revenue)                               AS total_revenue,
    SUM(ds.total_expenses)                              AS total_expenses,
    SUM(ds.net_profit)                                  AS net_profit,
    AVG(ds.profit_margin)                               AS avg_profit_margin,
    SUM(ds.fuel_consumed)                               AS fuel_consumed,
    SUM(ds.fuel_cost)                                   AS fuel_cost,
    SUM(ds.maintenance_cost)                            AS maintenance_cost,
    AVG(ds.equipment_availability)                      AS avg_equipment_availability,
    SUM(ds.accidents_count)                             AS accidents,
    SUM(ds.near_misses_count)                           AS near_misses
FROM dashboard_stats ds
JOIN sites s ON ds.site_id = s.id
GROUP BY DATE_TRUNC('month', ds.stat_date), s.id, s.name
ORDER BY month DESC, s.name;

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment             ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_dimensions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entry_details   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exit_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_targets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_stats       ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id::text = auth.uid()::text
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profil propre
CREATE POLICY "users_self_select" ON users
    FOR SELECT USING (id::text = auth.uid()::text);

CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (id::text = auth.uid()::text)
    WITH CHECK (id::text = auth.uid()::text AND role = (SELECT role FROM users WHERE id::text = auth.uid()::text));

-- Admin : accès total
CREATE POLICY "admin_all_users" ON users
    FOR ALL USING (get_current_user_role() = 'admin');

-- Sessions
CREATE POLICY "sessions_own" ON user_sessions
    FOR ALL USING (user_id::text = auth.uid()::text);

-- Sites, équipements, dimensions : lecture pour tous les authentifiés
CREATE POLICY "auth_read_sites"       ON sites               FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_equipment"   ON equipment           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_dimensions"  ON material_dimensions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_clients"     ON clients             FOR SELECT USING (auth.role() = 'authenticated');

-- Écriture réservée à admin/supervisor
CREATE POLICY "admin_sup_write_sites"     ON sites      FOR ALL USING (get_current_user_role() IN ('admin', 'supervisor'));
CREATE POLICY "admin_sup_write_equipment" ON equipment  FOR ALL USING (get_current_user_role() IN ('admin', 'supervisor'));
CREATE POLICY "admin_sup_write_clients"   ON clients    FOR ALL USING (get_current_user_role() IN ('admin', 'supervisor'));

-- Stock : lecture authentifiés, écriture admin/supervisor/operator
CREATE POLICY "auth_read_stock_entries"    ON stock_entries      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_stock_exits"      ON stock_exits        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_entry_details"    ON stock_entry_details FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_exit_details"     ON stock_exit_details  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "op_write_stock_entries"  ON stock_entries     FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'supervisor', 'operator'));
CREATE POLICY "op_write_stock_exits"    ON stock_exits       FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'supervisor', 'operator'));
CREATE POLICY "admin_sup_mod_entries"   ON stock_entries     FOR UPDATE USING (get_current_user_role() IN ('admin', 'supervisor'));
CREATE POLICY "admin_sup_mod_exits"     ON stock_exits       FOR UPDATE USING (get_current_user_role() IN ('admin', 'supervisor'));

-- Finance : admin seulement
CREATE POLICY "admin_financial" ON financial_transactions
    FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "sup_read_financial" ON financial_transactions
    FOR SELECT USING (get_current_user_role() = 'supervisor');

-- Alertes
CREATE POLICY "auth_read_alerts" ON alerts
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_sup_write_alerts" ON alerts
    FOR ALL USING (get_current_user_role() IN ('admin', 'supervisor'));

-- Rapports
CREATE POLICY "auth_read_reports" ON reports
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_sup_write_reports" ON reports
    FOR ALL USING (get_current_user_role() IN ('admin', 'supervisor'));

-- ========================================
-- FONCTIONS MÉTIER
-- ========================================

-- Vérification du stock avant sortie
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_available DECIMAL(12,3);
    v_dimension_name VARCHAR(50);
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN sed.id IS NOT NULL THEN sed.quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN sxd.id IS NOT NULL THEN sxd.quantity ELSE 0 END), 0),
        md.name
    INTO v_available, v_dimension_name
    FROM material_dimensions md
    LEFT JOIN stock_entry_details sed ON md.id = sed.dimension_id
    LEFT JOIN stock_exit_details sxd  ON md.id = sxd.dimension_id
    WHERE md.id = NEW.dimension_id
    GROUP BY md.name;

    IF v_available IS NULL OR v_available < NEW.quantity THEN
        RAISE EXCEPTION 
            'Stock insuffisant pour la dimension "%" — Disponible: % t, Demandé: % t',
            v_dimension_name,
            COALESCE(v_available, 0),
            NEW.quantity
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_stock_availability ON stock_exit_details;
CREATE TRIGGER trigger_check_stock_availability
    BEFORE INSERT OR UPDATE ON stock_exit_details
    FOR EACH ROW EXECUTE FUNCTION check_stock_availability();

-- Génération automatique d'alertes maintenance
CREATE OR REPLACE FUNCTION auto_alert_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    -- Alerte si next_maintenance dans moins de 48h
    IF NEW.next_maintenance IS NOT NULL 
       AND NEW.next_maintenance <= NOW() + INTERVAL '48 hours'
       AND (OLD.next_maintenance IS NULL OR OLD.next_maintenance != NEW.next_maintenance) THEN
        INSERT INTO alerts (title, message, severity, category, entity_type, entity_id, auto_generated)
        VALUES (
            'Maintenance imminente : ' || NEW.name,
            'L''équipement "' || NEW.name || '" nécessite une maintenance avant le ' 
                || TO_CHAR(NEW.next_maintenance, 'DD/MM/YYYY HH24:MI'),
            CASE 
                WHEN NEW.next_maintenance <= NOW() THEN 'critical'
                ELSE 'warning'
            END,
            'maintenance',
            'equipment',
            NEW.id,
            true
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_alert_maintenance
    AFTER INSERT OR UPDATE OF next_maintenance ON equipment
    FOR EACH ROW EXECUTE FUNCTION auto_alert_maintenance();

-- Mise à jour du statut des paiements en retard
CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE financial_transactions
    SET payment_status = 'overdue', updated_at = NOW()
    WHERE payment_status = 'pending'
      AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Créer des alertes pour les impayés
    INSERT INTO alerts (title, message, severity, category, entity_type, entity_id, auto_generated)
    SELECT 
        'Facture en retard : ' || COALESCE(invoice_number, reference, id::text),
        'La transaction de ' || amount || ' ' || currency || ' est en retard depuis le ' || TO_CHAR(due_date, 'DD/MM/YYYY'),
        'warning',
        'financial',
        'financial_transactions',
        id,
        true
    FROM financial_transactions
    WHERE payment_status = 'overdue'
      AND updated_at::date = CURRENT_DATE  -- seulement ceux mis à jour aujourd'hui
    ON CONFLICT DO NOTHING;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Calcul des statistiques quotidiennes (amélioré)
CREATE OR REPLACE FUNCTION calculate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    site_record RECORD;
BEGIN
    FOR site_record IN SELECT id FROM sites WHERE is_active = true LOOP
        INSERT INTO dashboard_stats (
            stat_date, site_id,
            total_production, total_revenue, total_expenses,
            operating_hours, fuel_consumed, fuel_cost,
            maintenance_hours, maintenance_cost
        )
        SELECT
            target_date,
            site_record.id,
            -- Production
            COALESCE((
                SELECT SUM(sed.quantity)
                FROM stock_entry_details sed
                JOIN stock_entries se ON sed.stock_entry_id = se.id
                WHERE se.entry_date = target_date AND se.site_id = site_record.id
            ), 0),
            -- Revenus
            COALESCE((
                SELECT SUM(amount)
                FROM financial_transactions
                WHERE transaction_date = target_date AND type = 'income' AND site_id = site_record.id
            ), 0),
            -- Dépenses
            COALESCE((
                SELECT SUM(amount)
                FROM financial_transactions
                WHERE transaction_date = target_date AND type = 'expense' AND site_id = site_record.id
            ), 0),
            -- Heures opérationnelles
            COALESCE((
                SELECT SUM(operating_hours) FROM equipment WHERE site_id = site_record.id
            ), 0),
            -- Carburant consommé (litres)
            COALESCE((
                SELECT SUM(quantity) FROM fuel_transactions
                WHERE transaction_date = target_date AND site_id = site_record.id
            ), 0),
            -- Coût carburant
            COALESCE((
                SELECT SUM(total_cost) FROM fuel_transactions
                WHERE transaction_date = target_date AND site_id = site_record.id
            ), 0),
            -- Heures maintenance
            COALESCE((
                SELECT SUM(EXTRACT(EPOCH FROM (LEAST(end_date, target_date::timestamp + INTERVAL '1 day') - GREATEST(start_date, target_date::timestamp))) / 3600)
                FROM maintenance
                WHERE start_date::date <= target_date AND (end_date IS NULL OR end_date::date >= target_date)
                  AND equipment_id IN (SELECT id FROM equipment WHERE site_id = site_record.id)
                  AND status IN ('in_progress', 'completed')
            ), 0),
            -- Coût maintenance
            COALESCE((
                SELECT SUM(total_cost) FROM maintenance
                WHERE start_date::date = target_date AND status = 'completed'
                  AND equipment_id IN (SELECT id FROM equipment WHERE site_id = site_record.id)
            ), 0)
        ON CONFLICT (stat_date, site_id) DO UPDATE SET
            total_production      = EXCLUDED.total_production,
            total_revenue         = EXCLUDED.total_revenue,
            total_expenses        = EXCLUDED.total_expenses,
            operating_hours       = EXCLUDED.operating_hours,
            fuel_consumed         = EXCLUDED.fuel_consumed,
            fuel_cost             = EXCLUDED.fuel_cost,
            maintenance_hours     = EXCLUDED.maintenance_hours,
            maintenance_cost      = EXCLUDED.maintenance_cost;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction ROI équipement
CREATE OR REPLACE FUNCTION equipment_roi(p_equipment_id UUID)
RETURNS TABLE (
    equipment_name TEXT,
    purchase_cost DECIMAL,
    total_revenue DECIMAL,
    total_costs DECIMAL,
    roi_pct DECIMAL,
    payback_months NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.name::TEXT,
        e.purchase_cost,
        COALESCE(rev.total_revenue, 0),
        COALESCE(costs.total_costs, 0) + COALESCE(e.purchase_cost, 0),
        CASE 
            WHEN COALESCE(e.purchase_cost, 0) + COALESCE(costs.total_costs, 0) > 0 THEN
                ((COALESCE(rev.total_revenue, 0) - COALESCE(e.purchase_cost, 0) - COALESCE(costs.total_costs, 0))
                / (COALESCE(e.purchase_cost, 0) + COALESCE(costs.total_costs, 0))) * 100
            ELSE 0
        END,
        CASE
            WHEN COALESCE(rev.monthly_avg, 0) > 0 THEN
                COALESCE(e.purchase_cost, 0) / rev.monthly_avg
            ELSE NULL
        END
    FROM equipment e
    LEFT JOIN (
        SELECT 
            se.equipment_id,
            SUM(sxd.total_price)    AS total_revenue,
            SUM(sxd.total_price) / NULLIF(
                EXTRACT(MONTH FROM AGE(NOW(), MIN(se.entry_date::timestamp))), 0
            ) AS monthly_avg
        FROM stock_entries se
        JOIN stock_entry_details sed ON se.id = sed.stock_entry_id
        JOIN stock_exit_details sxd  ON sxd.dimension_id = sed.dimension_id
        JOIN stock_exits sx           ON sxd.stock_exit_id = sx.id
        WHERE se.equipment_id = p_equipment_id
        GROUP BY se.equipment_id
    ) rev ON e.id = rev.equipment_id
    LEFT JOIN (
        SELECT
            ft.equipment_id,
            SUM(ft.total_cost) + COALESCE(SUM(m.total_cost), 0) AS total_costs
        FROM fuel_transactions ft
        LEFT JOIN maintenance m ON ft.equipment_id = m.equipment_id AND m.status = 'completed'
        WHERE ft.equipment_id = p_equipment_id
        GROUP BY ft.equipment_id
    ) costs ON e.id = costs.equipment_id
    WHERE e.id = p_equipment_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DONNÉES INITIALES
-- ========================================

INSERT INTO material_dimensions (name, description, min_size_mm, max_size_mm, sort_order) VALUES
    ('0/5',   'Granulats fins de 0 à 5 mm (sable)',         0,  5,  1),
    ('5/15',  'Granulats de 5 à 15 mm (tout-venant)',        5, 15,  2),
    ('15/40', 'Granulats de 15 à 40 mm (moyen)',            15, 40,  3),
    ('40/80', 'Granulats grossiers de 40 à 80 mm',          40, 80,  4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO sites (name, code, location, description) VALUES
    ('Site A', 'SA', 'Carrière Nord', 'Site principal d''extraction'),
    ('Site B', 'SB', 'Carrière Sud',  'Site secondaire avec installation de concassage')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (username, email, password_hash, full_name, role, department) VALUES
    ('admin', 'admin@rombat.com', crypt('admin123', gen_salt('bf', 12)), 'Amp Mines et Carrières', 'admin', 'IT')
ON CONFLICT (username) DO NOTHING;

-- ========================================
-- COMMENTAIRES
-- ========================================

COMMENT ON TABLE users                  IS 'Utilisateurs du système avec rôles, sécurité et préférences';
COMMENT ON TABLE user_sessions          IS 'Sessions actives des utilisateurs (JWT/tokens)';
COMMENT ON TABLE sites                  IS 'Sites miniers avec géolocalisation et responsable';
COMMENT ON TABLE equipment              IS 'Équipements miniers avec TCO, garantie et alertes maintenance';
COMMENT ON TABLE clients                IS 'Clients avec plafond de crédit et conditions de paiement';
COMMENT ON TABLE stock_entries          IS 'Entrées de production avec poste et conditions météo';
COMMENT ON TABLE stock_exits            IS 'Sorties avec bon de livraison, chauffeur et validation';
COMMENT ON TABLE fuel_transactions      IS 'Consommation carburant avec référence facture fournisseur';
COMMENT ON TABLE maintenance            IS 'Interventions avec OT, durée calculée et coût total auto';
COMMENT ON TABLE financial_transactions IS 'Transactions financières multi-devises avec TVA';
COMMENT ON TABLE production_targets     IS 'Objectifs de production par site, dimension et période';
COMMENT ON TABLE alerts                 IS 'Alertes système auto et manuelles avec cycle de vie complet';
COMMENT ON TABLE audit_logs             IS 'Traçabilité complète des actions utilisateurs';
COMMENT ON TABLE dashboard_stats        IS 'KPIs quotidiens avec profit net et marges calculés';

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

DO $$
DECLARE
    v_tables INTEGER;
    v_views  INTEGER;
    v_funcs  INTEGER;
    v_idx    INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tables FROM information_schema.tables       WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO v_views  FROM information_schema.views        WHERE table_schema = 'public';
    SELECT COUNT(*) INTO v_funcs  FROM information_schema.routines     WHERE routine_schema = 'public';
    SELECT COUNT(*) INTO v_idx    FROM pg_indexes                      WHERE schemaname = 'public';

    RAISE NOTICE '==============================================';
    RAISE NOTICE '  ROMBAT Mining Platform v3.0 — Initialisé  ';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '  Tables créées    : %', v_tables;
    RAISE NOTICE '  Vues créées      : %', v_views;
    RAISE NOTICE '  Fonctions        : %', v_funcs;
    RAISE NOTICE '  Index            : %', v_idx;
    RAISE NOTICE '----------------------------------------------';
    RAISE NOTICE '  Compte admin     : admin@rombat.com';
    RAISE NOTICE '  Mot de passe     : admin123 (à changer !)';
    RAISE NOTICE '==============================================';
END $$;
