import React, { useState } from "react";
import AppLayout from "../../components/navigation/AppLayout";
import { supabase } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";
import { toastError } from "../../utils/toast";

const MODULE_CONFIG = {
  production: {
    label: 'Production',
    icon: '⛏️',
    table: 'production',
    dateCol: 'date',
    cols: [
      { key: 'date', label: 'Date' },
      { key: 'shift', label: 'Poste' },
      { key: 'total', label: 'Total (t)' },
      { key: 'operator_name', label: 'Opérateur' },
    ],
    operatorCol: 'operator_name',
  },
  equipment: {
    label: 'Équipement',
    icon: '🔧',
    table: 'equipment_operation_logs',
    dateCol: 'date',
    cols: [
      { key: 'date', label: 'Date' },
      { key: 'shift', label: 'Poste' },
      { key: 'machine_type', label: 'Type machine' },
      { key: 'counter_start', label: 'Cpt. Début' },
      { key: 'counter_end', label: 'Cpt. Fin' },
      { key: 'distance', label: 'Distance (km)' },
      { key: 'operator_name', label: 'Opérateur' },
    ],
    operatorCol: 'operator_name',
  },
  fuel: {
    label: 'Carburant',
    icon: '⛽',
    table: 'fuel_transactions',
    dateCol: 'transaction_date',
    cols: [
      { key: 'transaction_date', label: 'Date' },
      { key: 'fuel_type', label: 'Type' },
      { key: 'quantity', label: 'Quantité (L)' },
      { key: 'cost_per_liter', label: 'Prix/L (FCFA)' },
      { key: 'total_cost', label: 'Total (FCFA)' },
      { key: 'operator_name', label: 'Opérateur' },
      { key: 'supplier', label: 'Fournisseur' },
    ],
    operatorCol: 'operator_name',
  },
  accounting: {
    label: 'Comptabilité',
    icon: '💰',
    table: 'financial_transactions',
    dateCol: 'transaction_date',
    cols: [
      { key: 'transaction_date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Catégorie' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Montant (FCFA)' },
      { key: 'client_supplier', label: 'Client/Fourn.' },
      { key: 'payment_method', label: 'Paiement' },
    ],
    operatorCol: null,
  },
};

export default function DataExplorer() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('production');
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', operator: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const config = MODULE_CONFIG[activeModule];

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      let query = supabase
        .from(config.table)
        .select('*')
        .order(config.dateCol, { ascending: false })
        .limit(300);

      if (filters.dateFrom) query = query.gte(config.dateCol, filters.dateFrom);
      if (filters.dateTo) query = query.lte(config.dateCol, filters.dateTo);
      if (filters.operator && config.operatorCol)
        query = query.ilike(config.operatorCol, `%${filters.operator}%`);

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      toastError('Erreur: ' + err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = (key) => {
    setActiveModule(key);
    setResults([]);
    setSearched(false);
  };

  const handleReset = () => {
    setFilters({ dateFrom: '', dateTo: '', operator: '' });
    setResults([]);
    setSearched(false);
  };

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres Exploration & Mines">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
          Exploration des Données
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
          Filtrez et consultez les données de tous les modules
        </p>
      </div>

      <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--color-border)" }}>

          {/* Sélecteur de module */}
          <p className="text-xs font-medium mb-3" style={{ color: "var(--color-muted-foreground)" }}>MODULE</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(MODULE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleModuleChange(key)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: activeModule === key ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: activeModule === key ? "var(--color-primary)" : "transparent",
                  color: activeModule === key ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: activeModule === key ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>

          {/* Filtres */}
          <p className="text-xs font-medium mb-3" style={{ color: "var(--color-muted-foreground)" }}>FILTRES</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>Date début</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full p-2 rounded border text-sm"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>Date fin</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full p-2 rounded border text-sm"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>Opérateur</label>
              <input
                type="text"
                value={filters.operator}
                onChange={(e) => setFilters({ ...filters, operator: e.target.value })}
                placeholder="Nom de l'opérateur..."
                className="w-full p-2 rounded border text-sm"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 p-2 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-foreground)",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Chargement...' : 'Rechercher'}
              </button>
              {searched && (
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg text-sm"
                  style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="overflow-x-auto">
          {!searched ? (
            <div className="p-12 text-center" style={{ color: "var(--color-muted-foreground)" }}>
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">Sélectionnez un module et appliquez des filtres pour explorer les données</p>
            </div>
          ) : loading ? (
            <div className="p-12 text-center" style={{ color: "var(--color-muted-foreground)" }}>
              <p className="text-sm">Chargement...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center" style={{ color: "var(--color-muted-foreground)" }}>
              <p className="text-sm">Aucun résultat pour ces filtres</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                  <strong style={{ color: "var(--color-foreground)" }}>{results.length}</strong> résultat{results.length > 1 ? 's' : ''} — {config.label}
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    {config.cols.map(col => (
                      <th key={col.key} className="text-left p-3 text-xs font-medium whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={row.id || i} className="border-b hover:bg-muted/20" style={{ borderColor: "var(--color-border)" }}>
                      {config.cols.map(col => (
                        <td key={col.key} className="p-3 text-sm whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
                          {row[col.key] != null ? String(row[col.key]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
