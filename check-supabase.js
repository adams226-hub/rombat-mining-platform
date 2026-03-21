// Test rapide de connexion Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kuluihwgrppsziezqrws.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bHVpaHdncnBwc3ppZXpxcndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzc2NDksImV4cCI6MjA4OTY1MzY0OX0.hxcTNdiozovD5I3WtYsqvo4wb_bWNFchd7TMrU1-uHU';

console.log('🔍 TEST DE CONNEXION SUPABASE\n');
console.log('URL:', supabaseUrl);
console.log('Clé présente: ✅\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseConnection() {
  try {
    console.log('🔗 Test de connexion...');

    // Test basique de connexion
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = table vide
      throw error;
    }

    console.log('✅ Connexion réussie!');
    console.log('');

    // Vérifier les tables principales
    console.log('📊 Vérification des tables:');

    const tables = [
      'users', 'sites', 'equipment', 'material_dimensions',
      'stock_entries', 'fuel_transactions', 'maintenance',
      'financial_transactions', 'dashboard_stats'
    ];

    let allTablesExist = true;

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
          allTablesExist = false;
        } else {
          console.log(`✅ ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Erreur`);
        allTablesExist = false;
      }
    }

    console.log('');

    if (allTablesExist) {
      console.log('🎉 Toutes les tables sont présentes!');
      console.log('🚀 Votre base de données est prête pour la production.');
    } else {
      console.log('⚠️  Certaines tables sont manquantes.');
      console.log('📋 Exécutez database-schema.sql dans Supabase SQL Editor');
    }

    // Vérifier les données initiales
    console.log('\n👥 Vérification des données initiales:');

    const { data: users } = await supabase.from('users').select('*');
    console.log(`Utilisateurs: ${users?.length || 0}`);

    const { data: sites } = await supabase.from('sites').select('*');
    console.log(`Sites: ${sites?.length || 0}`);

    const { data: dimensions } = await supabase.from('material_dimensions').select('*');
    console.log(`Dimensions: ${dimensions?.length || 0}`);

  } catch (err) {
    console.error('❌ Erreur de connexion:', err.message);

    if (err.message.includes('ENOTFOUND')) {
      console.log('\n💡 Solution: Vérifiez l\'URL de votre projet Supabase');
    } else if (err.message.includes('JWT')) {
      console.log('\n💡 Solution: Régénérez votre clé anon dans Supabase');
    } else {
      console.log('\n💡 Solution: Vérifiez vos credentials dans .env');
    }
  }
}

checkSupabaseConnection();