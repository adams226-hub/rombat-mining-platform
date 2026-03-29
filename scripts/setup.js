// ============================================================
// SCRIPT DE SETUP COMPLET - Rombat Mining Platform
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF   = SUPABASE_URL?.replace('https://','').replace('.supabase.co','');

// Vérification
const missing = [];
if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
if (!SERVICE_KEY || SERVICE_KEY.includes('COLLE')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!ACCESS_TOKEN || ACCESS_TOKEN.includes('COLLE')) missing.push('SUPABASE_ACCESS_TOKEN');
if (missing.length) { console.error('❌ Manquant:', missing.join(', ')); process.exit(1); }

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── Exécute un seul bloc SQL via Management API ──────────────
async function runSQL(label, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    }
  );
  const body = await res.json();
  if (!res.ok) {
    const msg = (body?.message || body?.error || JSON.stringify(body)).substring(0, 120);
    // Ignorer les erreurs "déjà existant"
    if (msg.match(/already exists|42P07|42710|42701|duplicate/i)) {
      console.log(`   ⏭️  ${label} → déjà existant`);
      return true;
    }
    console.error(`   ❌ ${label} → ${msg}`);
    return false;
  }
  console.log(`   ✅ ${label}`);
  return true;
}

// ── MIGRATION : créer uniquement ce qui manque ───────────────
async function runMigration() {
  console.log('\n📦 ÉTAPE 1 : Migration SQL (nouvelles tables)...\n');

  const steps = [
    // 1. Créer ou compléter l'enum user_role
    ['Enum user_role', `
      DO $x$
      BEGIN
        CREATE TYPE user_role AS ENUM ('admin','directeur','chef_de_site','comptable','supervisor','operator','equipement');
      EXCEPTION
        WHEN duplicate_object THEN
          BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'equipement';
          EXCEPTION WHEN others THEN NULL;
          END;
      END $x$;
    `],

    // 2. Fonction updated_at
    ['Fonction update_updated_at_column', `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $f$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $f$ LANGUAGE plpgsql;
    `],

    // 3. Table PROFILES
    ['Table profiles', `
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
    `],

    // 4. Table PRODUCTION
    ['Table production', `
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
    `],

    // 5. Table PRODUCTION_DETAILS
    ['Table production_details', `
      CREATE TABLE IF NOT EXISTS production_details (
        id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        production_id UUID          NOT NULL REFERENCES production(id) ON DELETE CASCADE,
        dimension     VARCHAR(50)   NOT NULL,
        quantity      DECIMAL(12,3) NOT NULL DEFAULT 0,
        created_at    TIMESTAMP     DEFAULT NOW()
      );
    `],

    // 6. Table PRODUCTION_EXITS
    ['Table production_exits', `
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
    `],

    // 7. Table PRODUCTION_EXIT_DETAILS
    ['Table production_exit_details', `
      CREATE TABLE IF NOT EXISTS production_exit_details (
        id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        exit_id     UUID          NOT NULL REFERENCES production_exits(id) ON DELETE CASCADE,
        dimension   VARCHAR(50)   NOT NULL,
        quantity    DECIMAL(12,3) NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     DEFAULT NOW()
      );
    `],

    // 8. Table OBJECTIVES
    ['Table objectives', `
      CREATE TABLE IF NOT EXISTS objectives (
        id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        dimension   VARCHAR(50)   NOT NULL,
        site        VARCHAR(255)  DEFAULT 'all',
        period_type VARCHAR(20)   DEFAULT 'daily' CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
        value       DECIMAL(12,3) NOT NULL,
        unit        VARCHAR(10)   DEFAULT 'tonne',
        active      BOOLEAN       DEFAULT true,
        created_by  UUID          REFERENCES auth.users(id),
        created_at  TIMESTAMP     DEFAULT NOW(),
        updated_at  TIMESTAMP     DEFAULT NOW(),
        UNIQUE(dimension, site, period_type)
      );
    `],

    // 9. Colonne dimension sur stock_entry_details
    ['Colonne dimension sur stock_entry_details', `
      ALTER TABLE stock_entry_details ADD COLUMN IF NOT EXISTS dimension VARCHAR(50);
      ALTER TABLE stock_entry_details ALTER COLUMN dimension_id DROP NOT NULL;
    `],

    // 10. Colonne dimension sur stock_exit_details
    ['Colonne dimension sur stock_exit_details', `
      ALTER TABLE stock_exit_details ADD COLUMN IF NOT EXISTS dimension VARCHAR(50);
      ALTER TABLE stock_exit_details ALTER COLUMN dimension_id DROP NOT NULL;
    `],

    // 11. Rendre operator_id nullable dans fuel_transactions
    ['fuel_transactions operator_id nullable', `
      ALTER TABLE fuel_transactions ALTER COLUMN operator_id DROP NOT NULL;
    `],

    // 12. Rendre created_by nullable dans financial_transactions
    ['financial_transactions created_by nullable', `
      ALTER TABLE financial_transactions ALTER COLUMN created_by DROP NOT NULL;
    `],

    // 13. Fonction get_user_role()
    ['Fonction get_user_role', `
      CREATE OR REPLACE FUNCTION get_user_role()
      RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $f$
        SELECT role::TEXT FROM profiles WHERE id = auth.uid()
      $f$;
    `],

    // 14. RLS profiles
    ['RLS profiles', `
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "profiles_select" ON profiles;
      DROP POLICY IF EXISTS "profiles_insert" ON profiles;
      DROP POLICY IF EXISTS "profiles_update" ON profiles;
      DROP POLICY IF EXISTS "profiles_delete" ON profiles;
      CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid() OR get_user_role() = 'admin');
      CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR get_user_role() = 'admin');
      CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR get_user_role() = 'admin');
      CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (get_user_role() = 'admin');
    `],

    // 15. RLS production
    ['RLS production', `
      ALTER TABLE production ENABLE ROW LEVEL SECURITY;
      ALTER TABLE production_details ENABLE ROW LEVEL SECURITY;
      ALTER TABLE production_exits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE production_exit_details ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "production_select" ON production;
      DROP POLICY IF EXISTS "production_insert" ON production;
      DROP POLICY IF EXISTS "production_update" ON production;
      DROP POLICY IF EXISTS "production_delete" ON production;
      CREATE POLICY "production_select" ON production FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "production_insert" ON production FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
      CREATE POLICY "production_update" ON production FOR UPDATE USING (get_user_role() IN ('admin','directeur','supervisor'));
      CREATE POLICY "production_delete" ON production FOR DELETE USING (get_user_role() IN ('admin','directeur'));
      DROP POLICY IF EXISTS "prod_details_select" ON production_details;
      DROP POLICY IF EXISTS "prod_details_insert" ON production_details;
      CREATE POLICY "prod_details_select" ON production_details FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "prod_details_insert" ON production_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
      DROP POLICY IF EXISTS "prod_exits_select" ON production_exits;
      DROP POLICY IF EXISTS "prod_exits_insert" ON production_exits;
      CREATE POLICY "prod_exits_select" ON production_exits FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "prod_exits_insert" ON production_exits FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));
      DROP POLICY IF EXISTS "prod_exit_details_select" ON production_exit_details;
      DROP POLICY IF EXISTS "prod_exit_details_insert" ON production_exit_details;
      CREATE POLICY "prod_exit_details_select" ON production_exit_details FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "prod_exit_details_insert" ON production_exit_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    `],

    // 16. RLS autres tables
    ['RLS equipment, fuel, financial, stock, reports, objectives', `
      ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
      ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE stock_entry_details ENABLE ROW LEVEL SECURITY;
      ALTER TABLE stock_exits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE stock_exit_details ENABLE ROW LEVEL SECURITY;
      ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "equipment_select" ON equipment;
      DROP POLICY IF EXISTS "equipment_insert" ON equipment;
      CREATE POLICY "equipment_select" ON equipment FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "equipment_insert" ON equipment FOR INSERT WITH CHECK (get_user_role() IN ('admin','chef_de_site','equipement','directeur'));
      CREATE POLICY "equipment_update" ON equipment FOR UPDATE USING (get_user_role() IN ('admin','chef_de_site','equipement','directeur'));

      DROP POLICY IF EXISTS "fuel_select" ON fuel_transactions;
      DROP POLICY IF EXISTS "fuel_insert" ON fuel_transactions;
      CREATE POLICY "fuel_select" ON fuel_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "fuel_insert" ON fuel_transactions FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));

      DROP POLICY IF EXISTS "financial_select" ON financial_transactions;
      DROP POLICY IF EXISTS "financial_insert" ON financial_transactions;
      DROP POLICY IF EXISTS "financial_delete" ON financial_transactions;
      CREATE POLICY "financial_select" ON financial_transactions FOR SELECT USING (get_user_role() IN ('admin','directeur','comptable','equipement'));
      CREATE POLICY "financial_insert" ON financial_transactions FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','comptable'));
      CREATE POLICY "financial_delete" ON financial_transactions FOR DELETE USING (get_user_role() IN ('admin','directeur'));

      DROP POLICY IF EXISTS "stock_entries_select" ON stock_entries;
      DROP POLICY IF EXISTS "stock_entries_insert" ON stock_entries;
      CREATE POLICY "stock_entries_select" ON stock_entries FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "stock_entries_insert" ON stock_entries FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));

      DROP POLICY IF EXISTS "stock_entry_details_select" ON stock_entry_details;
      DROP POLICY IF EXISTS "stock_entry_details_insert" ON stock_entry_details;
      CREATE POLICY "stock_entry_details_select" ON stock_entry_details FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "stock_entry_details_insert" ON stock_entry_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

      DROP POLICY IF EXISTS "stock_exits_select" ON stock_exits;
      DROP POLICY IF EXISTS "stock_exits_insert" ON stock_exits;
      CREATE POLICY "stock_exits_select" ON stock_exits FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "stock_exits_insert" ON stock_exits FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor','operator'));

      DROP POLICY IF EXISTS "stock_exit_details_select" ON stock_exit_details;
      DROP POLICY IF EXISTS "stock_exit_details_insert" ON stock_exit_details;
      CREATE POLICY "stock_exit_details_select" ON stock_exit_details FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "stock_exit_details_insert" ON stock_exit_details FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

      DROP POLICY IF EXISTS "reports_select" ON reports;
      DROP POLICY IF EXISTS "reports_insert" ON reports;
      CREATE POLICY "reports_select" ON reports FOR SELECT USING (get_user_role() IN ('admin','directeur'));
      CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur'));

      DROP POLICY IF EXISTS "objectives_select" ON objectives;
      DROP POLICY IF EXISTS "objectives_insert" ON objectives;
      DROP POLICY IF EXISTS "objectives_update" ON objectives;
      CREATE POLICY "objectives_select" ON objectives FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "objectives_insert" ON objectives FOR INSERT WITH CHECK (get_user_role() IN ('admin','directeur','supervisor'));
      CREATE POLICY "objectives_update" ON objectives FOR UPDATE USING (get_user_role() IN ('admin','directeur','supervisor'));
    `],

    // 17. Trigger auto-profil à l'inscription
    ['Trigger on_auth_user_created', `
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $f$
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
      $f$;
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    `],

    // 18. Seed objectifs
    ['Seed objectifs par défaut', `
      INSERT INTO objectives (dimension, site, period_type, value, unit) VALUES
        ('Minerai','all','daily',300,'tonne'), ('Forage','all','daily',150,'tonne'),
        ('0/4','all','daily',200,'tonne'),     ('0/5','all','daily',180,'tonne'),
        ('0/6','all','daily',160,'tonne'),     ('5/15','all','daily',140,'tonne'),
        ('8/15','all','daily',120,'tonne'),    ('15/25','all','daily',100,'tonne'),
        ('4/6','all','daily',90,'tonne'),      ('10/14','all','daily',80,'tonne'),
        ('6/10','all','daily',70,'tonne'),     ('0/31,5','all','daily',60,'tonne')
      ON CONFLICT (dimension, site, period_type) DO NOTHING;
    `],
  ];

  let ok = 0;
  for (const [label, sql] of steps) {
    const success = await runSQL(label, sql);
    if (success) ok++;
  }
  console.log(`\n   ${ok}/${steps.length} étapes réussies`);
  return ok >= steps.length - 2;
}

// ── CRÉATION DES COMPTES ─────────────────────────────────────
const USERS = [
  { email:'admin@rombat.com',       password:'Admin@2026!',       profile:{username:'admin',      full_name:'Amp Mines et Carrières',    role:'admin',      department:'IT'} },
  { email:'directeur@rombat.com',   password:'Directeur@2026!',   profile:{username:'directeur',  full_name:'Directeur Général',        role:'directeur',  department:'Direction'} },
  { email:'chefsite@rombat.com',    password:'ChefSite@2026!',    profile:{username:'chefsite',   full_name:'Chef de Site Principal',   role:'chef_de_site',department:'Exploitation'} },
  { email:'comptable@rombat.com',   password:'Comptable@2026!',   profile:{username:'comptable',  full_name:'Comptable Principal',      role:'comptable',  department:'Finance'} },
  { email:'supervisor@rombat.com',  password:'Supervisor@2026!',  profile:{username:'supervisor', full_name:'Chef de Production',       role:'supervisor', department:'Production'} },
  { email:'operator1@rombat.com',   password:'Operator@2026!',    profile:{username:'operator1',  full_name:'Opérateur 1',              role:'operator',   department:'Mining'} },
  { email:'equipement@rombat.com',  password:'Equipement@2026!',  profile:{username:'equipement', full_name:'Responsable Équipement',   role:'equipement', department:'Équipement'} },
];

async function createUsers() {
  console.log('\n👥 ÉTAPE 2 : Création des comptes...\n');
  let success = 0;

  for (const u of USERS) {
    try {
      let userId;
      const { data, error } = await adminClient.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
        user_metadata: { full_name: u.profile.full_name, role: u.profile.role, username: u.profile.username }
      });

      if (error) {
        if (error.message.match(/already|exists/i)) {
          const { data: list } = await adminClient.auth.admin.listUsers();
          userId = list?.users?.find(x => x.email === u.email)?.id;
        } else throw error;
      } else {
        userId = data.user.id;
      }

      if (userId) {
        await adminClient.from('profiles').upsert({
          id: userId, username: u.profile.username, full_name: u.profile.full_name,
          role: u.profile.role, department: u.profile.department, is_active: true
        });
        console.log(`   ✅ ${u.email.padEnd(28)} → ${u.profile.role}`);
        success++;
      }
    } catch (err) {
      console.error(`   ❌ ${u.email} → ${err.message}`);
    }
  }
  return success;
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ROMBAT MINING - Setup Production     ║');
  console.log(`╠════════════════════════════════════════╣`);
  console.log(`║  Projet: ${PROJECT_REF.padEnd(30)}║`);
  console.log('╚════════════════════════════════════════╝');

  await runMigration();
  const created = await createUsers();

  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  ✅ ${created}/7 comptes créés               ║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  EMAIL                     MOT DE PASSE║');
  console.log('╠════════════════════════════════════════╣');
  for (const u of USERS) {
    const pwd = u.password.padEnd(16);
    console.log(`║  ${u.profile.role.padEnd(14)} ${pwd}      ║`);
  }
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Pattern: Role@2026!  (R majuscule)    ║');
  console.log('╠════════════════════════════════════════╣');
  console.log('║  🌐 http://localhost:4028               ║');
  console.log('╚════════════════════════════════════════╝\n');
}

main().catch(console.error);
