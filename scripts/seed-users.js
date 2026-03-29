// ============================================================
// SCRIPT DE SEED - Création des utilisateurs de test
//
// USAGE :
//   1. Ajouter dans .env : SUPABASE_SERVICE_ROLE_KEY=<ta clé service_role>
//   2. node scripts/seed-users.js
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config(); // Charge le .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes dans .env :');
  console.error('   VITE_SUPABASE_URL =', supabaseUrl ? '✓' : '✗ MANQUANT');
  console.error('   SUPABASE_SERVICE_ROLE_KEY =', serviceRoleKey ? '✓' : '✗ MANQUANT');
  console.error('\n→ Ajoute SUPABASE_SERVICE_ROLE_KEY dans ton fichier .env');
  console.error('→ Supabase Dashboard > Settings > API > service_role');
  process.exit(1);
}

// Client avec la clé service_role (contourne le RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS = [
  {
    email: 'admin@rombat.com',
    password: 'Admin@2026!',
    profile: { username: 'admin', full_name: 'Amp Mines et Carrières', role: 'admin', department: 'IT' }
  },
  {
    email: 'directeur@rombat.com',
    password: 'Directeur@2026!',
    profile: { username: 'directeur', full_name: 'Directeur Général', role: 'directeur', department: 'Direction' }
  },
  {
    email: 'chefsite@rombat.com',
    password: 'ChefSite@2026!',
    profile: { username: 'chefsite', full_name: 'Chef de Site Principal', role: 'chef_de_site', department: 'Exploitation' }
  },
  {
    email: 'comptable@rombat.com',
    password: 'Comptable@2026!',
    profile: { username: 'comptable', full_name: 'Comptable Principal', role: 'comptable', department: 'Finance' }
  },
  {
    email: 'supervisor@rombat.com',
    password: 'Supervisor@2026!',
    profile: { username: 'supervisor', full_name: 'Chef de Production', role: 'supervisor', department: 'Production' }
  },
  {
    email: 'operator1@rombat.com',
    password: 'Operator@2026!',
    profile: { username: 'operator1', full_name: 'Opérateur 1', role: 'operator', department: 'Mining' }
  },
  {
    email: 'equipement@rombat.com',
    password: 'Equipement@2026!',
    profile: { username: 'equipement', full_name: 'Responsable Équipement', role: 'equipement', department: 'Équipement' }
  }
];

async function seedUsers() {
  console.log('🚀 Création des utilisateurs Rombat...\n');
  let success = 0;
  let errors = 0;

  for (const u of USERS) {
    try {
      // Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true, // Confirmer l'email automatiquement
        user_metadata: {
          full_name: u.profile.full_name,
          role: u.profile.role,
          username: u.profile.username
        }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`⚠️  ${u.email} - déjà existant, mise à jour du profil...`);
          // Récupérer l'ID existant et mettre à jour le profil
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const existing = existingUser?.users?.find(eu => eu.email === u.email);
          if (existing) {
            await supabase.from('profiles').upsert({
              id: existing.id,
              ...u.profile,
              is_active: true
            });
            console.log(`   ✓ Profil mis à jour`);
          }
          success++;
          continue;
        }
        throw authError;
      }

      // Insérer / mettre à jour le profil avec le bon rôle
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        username: u.profile.username,
        full_name: u.profile.full_name,
        role: u.profile.role,
        department: u.profile.department,
        is_active: true
      });

      if (profileError) throw profileError;

      console.log(`✅ ${u.email} → rôle: ${u.profile.role}`);
      success++;
    } catch (err) {
      console.error(`❌ ${u.email} - Erreur: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ ${success} utilisateur(s) créé(s) avec succès`);
  if (errors > 0) console.log(`❌ ${errors} erreur(s)`);
  console.log(`========================================`);
  console.log('\n📋 IDENTIFIANTS DE CONNEXION :');
  console.log('========================================');
  for (const u of USERS) {
    console.log(`\n  Rôle: ${u.profile.role}`);
    console.log(`  Email:    ${u.email}`);
    console.log(`  Password: ${u.password}`);
  }
  console.log('\n========================================');
  console.log('🌐 Frontend: http://localhost:4028');
}

seedUsers().catch(console.error);
