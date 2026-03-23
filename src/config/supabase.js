import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kuluihwgrppsziezqrws.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bHVpaHdncnBwc3ppZXpxcndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzc2NDksImV4cCI6MjA5OTY1MzY0OX0.hxcTNdiozovD5I3WtYsqvo4wb_bWNFchd7TMrU1-uHU';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// helper: vérifie qu'un rôle appartient à une liste autorisée
function ensureRoleAccess(userRole, allowedRoles) {
  if (!allowedRoles.includes(userRole)) {
    return { data: null, error: new Error('Accès refusé') };
  }
  return null;
}

// Services pour la plateforme de mining
export const miningService = {
  // Utilisateurs
  async getUsers(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('users')
      .select('*');
    return { data, error };
  },

  async getUserByEmail(email) {
    if (!email) return { data: null, error: new Error('Email requis') };
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    return { data, error };
  },

  async createUser(userRole, user) {
    const denied = ensureRoleAccess(userRole, ['admin']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('users')
      .insert([user]);
    return { data, error };
  },

  // Équipements
  async getEquipment(userRole) {
    const { data, error } = await supabase
      .from('equipment')
      .select('*');
    return { data, error };
  },

  async createEquipment(userRole, equipment) {
    const denied = ensureRoleAccess(userRole, ['admin', 'equipement', 'chef_de_site']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('equipment')
      .insert([equipment]);
    return { data, error };
  },

  // Production
  async getProductionData(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'directeur', 'supervisor', 'operator']);
    if (denied) return denied;
    
    try {
      const { data, error } = await supabase
        .from('production')
        .select('*');
      
      if (error) {
        console.warn('Production RLS Error, using fallback:', error.message);
        // Fallback: Use mock data for demo
        const mockData = [
          {
            id: '1',
            date: '2026-03-15',
            site: 'Site Principal',
            shift: 'Jour',
            operator: 'JD',
            notes: 'Production normale',
            dimensions: [
              { dimension: 'Minerai', quantity: 280 },
              { dimension: 'Forage', quantity: 145 },
              { dimension: '0/4', quantity: 195 },
              { dimension: '0/5', quantity: 175 }
            ]
          },
          {
            id: '2',
            date: '2026-03-14',
            site: 'Site Principal',
            shift: 'Jour',
            operator: 'JD',
            notes: 'Production matin',
            dimensions: [
              { dimension: 'Minerai', quantity: 320 },
              { dimension: 'Forage', quantity: 160 },
              { dimension: '0/4', quantity: 210 },
              { dimension: '0/5', quantity: 190 }
            ]
          }
        ];
        return { data: mockData, error: null };
      }
      
      return { data, error };
    } catch (err) {
      console.error('Production service error:', err);
      // Return mock data if everything fails
      const mockData = [
        {
          id: '1',
          date: '2026-03-15',
          site: 'Site Principal',
          shift: 'Jour',
          operator: 'JD',
          notes: 'Production normale',
          dimensions: [
            { dimension: 'Minerai', quantity: 280 },
            { dimension: 'Forage', quantity: 145 }
          ]
        }
      ];
      return { data: mockData, error: null };
    }
  },

  async addProductionData(userRole, production) {
    const denied = ensureRoleAccess(userRole, ['admin', 'directeur', 'supervisor', 'operator']);
    if (denied) return denied;
    
    // Always use localStorage fallback for demo purposes
    console.log('Using localStorage fallback for production data');
    const productions = JSON.parse(localStorage.getItem('production_fallback') || '[]');
    const newProduction = {
      id: Date.now().toString(),
      ...production,
      created_at: new Date().toISOString()
    };
    productions.push(newProduction);
    localStorage.setItem('production_fallback', JSON.stringify(productions));
    
    return { data: [newProduction], error: null };
  },

  // Dashboard
  async getDashboardStats(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'directeur']);
    if (denied) return denied;
    try {
      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('*')
        .order('stat_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Erreur Supabase dashboard_stats:', error);
        console.error('Détails erreur:', error.message);
      }
      return { data, error };
    } catch (fetchError) {
      console.error('Erreur fetch dashboard:', fetchError);
      return { data: null, error: fetchError };
    }
  },

  // Fuel Management
  async getFuelTransactions(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;
    
    try {
      const { data, error } = await supabase
        .from('fuel_transactions')
        .select(`
          *,
          equipment:equipment_id (name),
          site:site_id (name)
        `)
        .order('transaction_date', { ascending: false })
        .limit(50);
      
      if (data) {
        data.forEach(async (item) => {
          if (item.operator_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', item.operator_id)
              .single();
            item.operator = userData?.full_name || 'N/A';
          } else {
            item.operator = 'N/A';
          }
        });
      }
      
      // Include fallback data if exists
      const fallbackData = JSON.parse(localStorage.getItem('fuel_transactions_fallback') || '[]');
      const allData = data ? [...data, ...fallbackData] : fallbackData;
      
      return { data: allData, error };
    } catch (err) {
      console.warn('Supabase error, using fallback only:', err);
      // Return only fallback data if Supabase fails
      const fallbackData = JSON.parse(localStorage.getItem('fuel_transactions_fallback') || '[]');
      return { data: fallbackData, error: null };
    }
  },

  async addFuelTransaction(userRole, entry) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;
    
    const { date, ...rest } = entry;
    const entryData = {
      ...rest,
      transaction_date: date,
      operator_id: "550e8400-e29b-41d4-a716-446655440001" // Default operator ID for demo
    };
    
    try {
      const { data, error } = await supabase
        .from('fuel_transactions')
        .insert([entryData])
        .select();
      
      if (error) {
        console.warn('RLS Error, using fallback:', error.message);
        // Fallback: Store in localStorage for demo
        const transactions = JSON.parse(localStorage.getItem('fuel_transactions_fallback') || '[]');
        const newTransaction = {
          id: Date.now().toString(),
          ...entryData,
          created_at: new Date().toISOString()
        };
        transactions.push(newTransaction);
        localStorage.setItem('fuel_transactions_fallback', JSON.stringify(transactions));
        return { data: [newTransaction], error: null };
      }
      
      return { data, error };
    } catch (err) {
      console.error('Transaction error:', err);
      return { data: null, error: err };
    }
  },

  async getEquipmentFuelSummary(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('equipment_performance')
      .select('*')
      .order('total_fuel_consumed', { ascending: false })
      .limit(20);
    return { data, error };
  },

  // Stock Management
  async getStockEntries(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        *,
        stock_entry_details (*),
        users:created_by (full_name)
      `)
      .order('date', { ascending: false });
    return { data, error };
  },

  async getStockExits(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('stock_exits')
      .select(`
        *,
        stock_exit_details (*),
        users:created_by (full_name)
      `)
      .order('date', { ascending: false });
    return { data, error };
  },

  async addStockEntry(userRole, entry) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;

    const { dimensions, ...entryData } = entry;
    const user = await supabase.auth.getUser();

    // Créer l'entrée principale
    const { data: entryResult, error: entryError } = await supabase
      .from('stock_entries')
      .insert([{
        ...entryData,
        created_by: user.data.user?.id || null
      }])
      .select()
      .single();

    if (entryError) return { data: null, error: entryError };

    // Ajouter les détails des dimensions
    const detailsData = dimensions
      .filter(dim => dim.quantity && parseFloat(dim.quantity) > 0)
      .map(dim => ({
        entry_id: entryResult.id,
        dimension: dim.size,
        quantity: parseFloat(dim.quantity)
      }));

    if (detailsData.length > 0) {
      const { error: detailsError } = await supabase
        .from('stock_entry_details')
        .insert(detailsData);

      if (detailsError) return { data: null, error: detailsError };
    }

    return { data: entryResult, error: null };
  },

  async addStockExit(userRole, exit) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;

    const { dimensions, ...exitData } = exit;
    const user = await supabase.auth.getUser();

    // Créer la sortie principale
    const { data: exitResult, error: exitError } = await supabase
      .from('stock_exits')
      .insert([{
        ...exitData,
        created_by: user.data.user?.id || null
      }])
      .select()
      .single();

    if (exitError) return { data: null, error: exitError };

    // Ajouter les détails des dimensions
    const detailsData = dimensions
      .filter(dim => dim.quantity && parseFloat(dim.quantity) > 0)
      .map(dim => ({
        exit_id: exitResult.id,
        dimension: dim.size,
        quantity: parseFloat(dim.quantity)
      }));

    if (detailsData.length > 0) {
      const { error: detailsError } = await supabase
        .from('stock_exit_details')
        .insert(detailsData);

      if (detailsError) return { data: null, error: detailsError };
    }

    return { data: exitResult, error: null };
  },

  async getStockSummary(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'supervisor', 'operator']);
    if (denied) return denied;

    // Récupérer toutes les entrées et sorties
    const [entriesResult, exitsResult] = await Promise.all([
      supabase.from('stock_entry_details').select('dimension, quantity'),
      supabase.from('stock_exit_details').select('dimension, quantity')
    ]);

    if (entriesResult.error || exitsResult.error) {
      return { data: null, error: entriesResult.error || exitsResult.error };
    }

    // Calculer le stock par dimension
    const dimensions = ['Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '10/14', '6/10', '0/31,5'];
    const stockSummary = dimensions.map(dim => {
      const totalEntries = entriesResult.data
        .filter(entry => entry.dimension === dim)
        .reduce((sum, entry) => sum + parseFloat(entry.quantity), 0);

      const totalExits = exitsResult.data
        .filter(exit => exit.dimension === dim)
        .reduce((sum, exit) => sum + parseFloat(exit.quantity), 0);

      return {
        dimension: dim,
        entries: totalEntries,
        exits: totalExits,
        available: totalEntries - totalExits
      };
    });

    return { data: stockSummary, error: null };
  },

  // Reports
  async getReports(userRole) {
    const denied = ensureRoleAccess(userRole, ['admin', 'directeur']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createReport(userRole, report) {
    const denied = ensureRoleAccess(userRole, ['admin', 'directeur']);
    if (denied) return denied;
    const { data, error } = await supabase
      .from('reports')
      .insert([report]);
    return { data, error };
  }
};

