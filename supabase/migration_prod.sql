-- ============================================================
-- MIGRATION PRODUCTION - Rombat Mining Platform
-- À exécuter dans Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Activer uuid-ossp si pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. AJOUT VALEURS MANQUANTES DANS LES ENUMS
-- ============================================================

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'equipement';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. FONCTION HELPER : get_user_role()
-- Récupère le rôle de l'utilisateur connecté via auth.uid()
-- SECURITY DEFINER = s'exécute en superuser pour éviter le chicken-and-egg RLS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- 3. TABLE PROFILES (liée à auth.users)
-- Remplace le rôle du système d'auth custom par Supabase Auth
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    VARCHAR(50)  UNIQUE,
  full_name   VARCHAR(255) NOT NULL,
  role        user_role    NOT NULL DEFAULT 'operator',
  department  VARCHAR(100),
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. TABLE PRODUCTION
-- (L'ancien code essayait de lire cette table mais elle n'existait pas)
-- ============================================================

CREATE TABLE IF NOT EXISTS production (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE          NOT NULL,
  site        VARCHAR(255)  NOT NULL,
  shift       VARCHAR(50),
  operator    VARCHAR(255),
  notes       TEXT,
  total       DECIMAL(12,3) DEFAULT 0,
  created_by  UUID          REFERENCES auth.users(id),
  created_at  TIMESTAMP     DEFAULT NOW(),
  updated_at  TIMESTAMP     DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_production_updated_at
  BEFORE UPDATE ON production
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. TABLE PRODUCTION_DETAILS
-- ============================================================

CREATE TABLE IF NOT EXISTS production_details (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_id UUID          NOT NULL REFERENCES production(id) ON DELETE CASCADE,
  dimension     VARCHAR(50)   NOT NULL,
  quantity      DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 6. TABLE PRODUCTION_EXITS (sorties de production)
-- ============================================================

CREATE TABLE IF NOT EXISTS production_exits (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE          NOT NULL,
  destination VARCHAR(255),
  exit_type   VARCHAR(50)   DEFAULT 'sale',
  client_name VARCHAR(255),
  notes       TEXT,
  total       DECIMAL(12,3) DEFAULT 0,
  created_by  UUID          REFERENCES auth.users(id),
  created_at  TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 7. TABLE PRODUCTION_EXIT_DETAILS
-- ============================================================

CREATE TABLE IF NOT EXISTS production_exit_details (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  exit_id     UUID          NOT NULL REFERENCES production_exits(id) ON DELETE CASCADE,
  dimension   VARCHAR(50)   NOT NULL,
  quantity    DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 8. TABLE OBJECTIVES
-- ============================================================

CREATE TABLE IF NOT EXISTS objectives (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  dimension   VARCHAR(50)   NOT NULL,
  site        VARCHAR(255)  DEFAULT 'all',
  period_type VARCHAR(20)   CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')) DEFAULT 'daily',
  value       DECIMAL(12,3) NOT NULL,
  unit        VARCHAR(10)   DEFAULT 'tonne',
  active      BOOLEAN       DEFAULT true,
  created_by  UUID          REFERENCES auth.users(id),
  created_at  TIMESTAMP     DEFAULT NOW(),
  updated_at  TIMESTAMP     DEFAULT NOW(),
  UNIQUE(dimension, site, period_type)
);

CREATE OR REPLACE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. CORRIGER LES TABLES DE DETAILS STOCK
-- (Ancien schéma utilise dimension_id UUID FK, le code utilise des strings)
-- ============================================================

-- stock_entry_details : rendre dimension_id optionnel + ajouter colonne dimension string
ALTER TABLE stock_entry_details ALTER COLUMN dimension_id DROP NOT NULL;
ALTER TABLE stock_entry_details ADD COLUMN IF NOT EXISTS dimension VARCHAR(50);

-- stock_exit_details : même chose
ALTER TABLE stock_exit_details ALTER COLUMN dimension_id DROP NOT NULL;
ALTER TABLE stock_exit_details ADD COLUMN IF NOT EXISTS dimension VARCHAR(50);

-- fuel_transactions : rendre operator_id optionnel (sera l'auth.uid())
ALTER TABLE fuel_transactions ALTER COLUMN operator_id DROP NOT NULL;

-- financial_transactions : rendre created_by optionnel
ALTER TABLE financial_transactions ALTER COLUMN created_by DROP NOT NULL;

-- ============================================================
-- 10. ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE production             ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_exits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_exit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives             ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entry_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exit_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. POLICIES RLS - PROFILES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (get_user_role() = 'admin');

-- ============================================================
-- 12. POLICIES RLS - PRODUCTION
-- ============================================================

DROP POLICY IF EXISTS "production_select" ON production;
DROP POLICY IF EXISTS "production_insert" ON production;
DROP POLICY IF EXISTS "production_update" ON production;
DROP POLICY IF EXISTS "production_delete" ON production;

CREATE POLICY "production_select" ON production
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "production_insert" ON production
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'supervisor', 'operator')
  );

CREATE POLICY "production_update" ON production
  FOR UPDATE USING (get_user_role() IN ('admin', 'directeur', 'supervisor'));

CREATE POLICY "production_delete" ON production
  FOR DELETE USING (get_user_role() IN ('admin', 'directeur'));

-- Production details (hérite des droits de la table parent)
DROP POLICY IF EXISTS "production_details_select" ON production_details;
DROP POLICY IF EXISTS "production_details_insert" ON production_details;
DROP POLICY IF EXISTS "production_details_delete" ON production_details;

CREATE POLICY "production_details_select" ON production_details
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "production_details_insert" ON production_details
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "production_details_delete" ON production_details
  FOR DELETE USING (get_user_role() IN ('admin', 'directeur'));

-- Production exits
DROP POLICY IF EXISTS "production_exits_select" ON production_exits;
DROP POLICY IF EXISTS "production_exits_insert" ON production_exits;
DROP POLICY IF EXISTS "production_exits_delete" ON production_exits;

CREATE POLICY "production_exits_select" ON production_exits
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "production_exits_insert" ON production_exits
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'supervisor', 'operator')
  );

CREATE POLICY "production_exits_delete" ON production_exits
  FOR DELETE USING (get_user_role() IN ('admin', 'directeur'));

-- Production exit details
DROP POLICY IF EXISTS "production_exit_details_select" ON production_exit_details;
DROP POLICY IF EXISTS "production_exit_details_insert" ON production_exit_details;

CREATE POLICY "production_exit_details_select" ON production_exit_details
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "production_exit_details_insert" ON production_exit_details
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 13. POLICIES RLS - EQUIPMENT
-- ============================================================

DROP POLICY IF EXISTS "equipment_select" ON equipment;
DROP POLICY IF EXISTS "equipment_insert" ON equipment;
DROP POLICY IF EXISTS "equipment_update" ON equipment;
DROP POLICY IF EXISTS "equipment_delete" ON equipment;

CREATE POLICY "equipment_select" ON equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "equipment_insert" ON equipment
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'chef_de_site', 'equipement', 'directeur')
  );

CREATE POLICY "equipment_update" ON equipment
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'chef_de_site', 'equipement', 'directeur')
  );

CREATE POLICY "equipment_delete" ON equipment
  FOR DELETE USING (get_user_role() = 'admin');

-- Maintenance
DROP POLICY IF EXISTS "maintenance_select" ON maintenance;
DROP POLICY IF EXISTS "maintenance_insert" ON maintenance;
DROP POLICY IF EXISTS "maintenance_update" ON maintenance;

CREATE POLICY "maintenance_select" ON maintenance
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "maintenance_insert" ON maintenance
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'chef_de_site', 'equipement', 'directeur', 'supervisor')
  );

CREATE POLICY "maintenance_update" ON maintenance
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'chef_de_site', 'equipement', 'directeur')
  );

-- ============================================================
-- 14. POLICIES RLS - FUEL
-- ============================================================

DROP POLICY IF EXISTS "fuel_select" ON fuel_transactions;
DROP POLICY IF EXISTS "fuel_insert" ON fuel_transactions;
DROP POLICY IF EXISTS "fuel_update" ON fuel_transactions;
DROP POLICY IF EXISTS "fuel_delete" ON fuel_transactions;

CREATE POLICY "fuel_select" ON fuel_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fuel_insert" ON fuel_transactions
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'supervisor', 'operator')
  );

CREATE POLICY "fuel_update" ON fuel_transactions
  FOR UPDATE USING (get_user_role() IN ('admin', 'directeur'));

CREATE POLICY "fuel_delete" ON fuel_transactions
  FOR DELETE USING (get_user_role() IN ('admin', 'directeur'));

-- ============================================================
-- 15. POLICIES RLS - FINANCIAL TRANSACTIONS
-- ============================================================

DROP POLICY IF EXISTS "financial_select" ON financial_transactions;
DROP POLICY IF EXISTS "financial_insert" ON financial_transactions;
DROP POLICY IF EXISTS "financial_update" ON financial_transactions;
DROP POLICY IF EXISTS "financial_delete" ON financial_transactions;

CREATE POLICY "financial_select" ON financial_transactions
  FOR SELECT USING (
    get_user_role() IN ('admin', 'directeur', 'comptable', 'equipement')
  );

CREATE POLICY "financial_insert" ON financial_transactions
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'comptable')
  );

CREATE POLICY "financial_update" ON financial_transactions
  FOR UPDATE USING (get_user_role() IN ('admin', 'directeur', 'comptable'));

CREATE POLICY "financial_delete" ON financial_transactions
  FOR DELETE USING (get_user_role() IN ('admin', 'directeur'));

-- ============================================================
-- 16. POLICIES RLS - STOCK
-- ============================================================

DROP POLICY IF EXISTS "stock_entries_select" ON stock_entries;
DROP POLICY IF EXISTS "stock_entries_insert" ON stock_entries;
DROP POLICY IF EXISTS "stock_entry_details_select" ON stock_entry_details;
DROP POLICY IF EXISTS "stock_entry_details_insert" ON stock_entry_details;
DROP POLICY IF EXISTS "stock_exits_select" ON stock_exits;
DROP POLICY IF EXISTS "stock_exits_insert" ON stock_exits;
DROP POLICY IF EXISTS "stock_exit_details_select" ON stock_exit_details;
DROP POLICY IF EXISTS "stock_exit_details_insert" ON stock_exit_details;

CREATE POLICY "stock_entries_select" ON stock_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_entries_insert" ON stock_entries
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'supervisor', 'operator')
  );

CREATE POLICY "stock_entry_details_select" ON stock_entry_details
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_entry_details_insert" ON stock_entry_details
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stock_exits_select" ON stock_exits
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_exits_insert" ON stock_exits
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'supervisor', 'operator')
  );

CREATE POLICY "stock_exit_details_select" ON stock_exit_details
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_exit_details_insert" ON stock_exit_details
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 17. POLICIES RLS - REPORTS
-- ============================================================

DROP POLICY IF EXISTS "reports_select" ON reports;
DROP POLICY IF EXISTS "reports_insert" ON reports;
DROP POLICY IF EXISTS "reports_update" ON reports;

CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (get_user_role() IN ('admin', 'directeur'));

CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'directeur'));

CREATE POLICY "reports_update" ON reports
  FOR UPDATE USING (get_user_role() IN ('admin', 'directeur'));

-- ============================================================
-- 18. OBJECTIVES - POLICIES RLS
-- ============================================================

DROP POLICY IF EXISTS "objectives_select" ON objectives;
DROP POLICY IF EXISTS "objectives_insert" ON objectives;
DROP POLICY IF EXISTS "objectives_update" ON objectives;
DROP POLICY IF EXISTS "objectives_delete" ON objectives;

CREATE POLICY "objectives_select" ON objectives
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "objectives_insert" ON objectives
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'directeur', 'supervisor')
  );

CREATE POLICY "objectives_update" ON objectives
  FOR UPDATE USING (get_user_role() IN ('admin', 'directeur', 'supervisor'));

CREATE POLICY "objectives_delete" ON objectives
  FOR DELETE USING (get_user_role() IN ('admin', 'directeur'));

-- ============================================================
-- 19. DONNÉES INITIALES : OBJECTIFS PAR DÉFAUT
-- ============================================================

INSERT INTO objectives (dimension, site, period_type, value, unit) VALUES
  ('Minerai',  'all', 'daily',   300, 'tonne'),
  ('Forage',   'all', 'daily',   150, 'tonne'),
  ('0/4',      'all', 'daily',   200, 'tonne'),
  ('0/5',      'all', 'daily',   180, 'tonne'),
  ('0/6',      'all', 'daily',   160, 'tonne'),
  ('5/15',     'all', 'daily',   140, 'tonne'),
  ('8/15',     'all', 'daily',   120, 'tonne'),
  ('15/25',    'all', 'daily',   100, 'tonne'),
  ('4/6',      'all', 'daily',    90, 'tonne'),
  ('10/14',    'all', 'daily',    80, 'tonne'),
  ('6/10',     'all', 'daily',    70, 'tonne'),
  ('0/31,5',   'all', 'daily',    60, 'tonne')
ON CONFLICT (dimension, site, period_type) DO NOTHING;

-- ============================================================
-- INSTRUCTIONS APRÈS MIGRATION :
--
-- 1. Dans Supabase Dashboard > Authentication > Settings :
--    - Désactiver "Email Confirmations" pour que les comptes admin
--      créés soient immédiatement actifs
--    - (optionnel) Configurer un email de bienvenue personnalisé
--
-- 2. Créer les comptes utilisateurs via le dashboard Supabase :
--    Authentication > Users > "Invite user" ou via l'app Admin
--
-- 3. Les comptes par défaut (admin, directeur, etc.) doivent être
--    créés manuellement via Authentication > Users dans Supabase,
--    puis un enregistrement dans la table "profiles" sera créé
--    automatiquement via la fonction trigger ci-dessous.
-- ============================================================

-- Trigger automatique : crée un profil quand un user s'inscrit
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operator'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
