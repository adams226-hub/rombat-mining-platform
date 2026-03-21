import React, { useState, useEffect } from "react";
import { parseObjective, formatObjective, calculateProgress, calculateStock } from "../../utils/objectiveParser";
import { toastError, toastSuccess } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";
import AppLayout from "../../components/navigation/AppLayout";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

export default function ProductionManagement() {
  const navigate = useNavigate();
  const [productionData, setProductionData] = useState([]);
  const [exitData, setExitData] = useState([]); // Nouveau: suivi des sorties
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showObjectivesModal, setShowObjectivesModal] = useState(false);
  const [objectives, setObjectives] = useState({
    dimensions: {
      'Minerai': {daily: {value: 300, unit: 'tonne'}},
      'Forage': {daily: {value: 150, unit: 'tonne'}},
      '0/4': {daily: {value: 200, unit: 'tonne'}},
      '0/5': {daily: {value: 180, unit: 'tonne'}},
      '0/6': {daily: {value: 160, unit: 'tonne'}},
      '5/15': {daily: {value: 140, unit: 'tonne'}},
      '8/15': {daily: {value: 120, unit: 'tonne'}},
      '15/25': {daily: {value: 100, unit: 'tonne'}},
      '4/6': {daily: {value: 90, unit: 'tonne'}},
      '10/14': {daily: {value: 80, unit: 'tonne'}},
      '6/10': {daily: {value: 70, unit: 'tonne'}},
      '0/31,5': {daily: {value: 60, unit: 'tonne'}}
    }
  });

  // Liste cohérente des dimensions
  const DIMENSIONS_LIST = [
    'Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '10/14', '6/10', '0/31,5'
  ];

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    site: 'Site Principal',
    shift: 'Jour',
    operator: '',
    notes: '',
    dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: 0 }))
  });

  const [newExit, setNewExit] = useState({
    date: '',
    destination: '',
    exit_type: 'sale',
    dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: '' })),
    client_name: '',
    notes: ''
  });

  useEffect(() => {
    loadProductionData();
  }, []);

  // Recalculer le stock chaque fois que les données de production ou de sortie changent
  useEffect(() => {
    if (productionData.length > 0 || exitData.length > 0) {
      const stockCalculations = calculateStock(productionData, exitData);
      setStockData(stockCalculations);
    }
  }, [productionData, exitData]);

  const loadProductionData = async () => {
    try {
      setLoading(true);
      const { user } = useAuth();
      const { data, error } = await miningService.getProductionData(user?.role);
      
      if (error) {
        console.error('Erreur chargement production:', error);
        toastError('Erreur lors du chargement des données de production');
        return;
      }
      
      if (data) {
        setProductionData(data);
      }
    } catch (err) {
      console.error('Erreur:', err);
      toastError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };


  const loadStockData = async () => {
    // Calculer le stock en fonction des données de production et de sortie
    const stockCalculations = calculateStock(productionData, exitData);
    setStockData(stockCalculations);
  };

  const handleAddProduction = async () => {
    try {
      if (!newEntry.date || !newEntry.site || !newEntry.operator) {
        alert('Veuillez remplir les champs obligatoires');
        return;
      }

      const hasQuantities = newEntry.dimensions.some(dim => dim.quantity && parseFloat(dim.quantity) > 0);
      if (!hasQuantities) {
        alert('Veuillez saisir au moins une quantité');
        return;
      }

      const total = newEntry.dimensions.reduce((sum, dim) => 
        sum + (parseFloat(dim.quantity) || 0), 0
      );

      const entryToAdd = {
        id: Date.now(),
        date: newEntry.date,
        site: newEntry.site,
        shift: newEntry.shift,
        operator: newEntry.operator,
        dimensions: newEntry.dimensions.map(dim => ({
          dimension: dim.dimension,
          quantity: parseFloat(dim.quantity) || 0
        })),
        total: total,
        notes: newEntry.notes
      };

      const updatedProduction = [...productionData, entryToAdd];
      setProductionData(updatedProduction);
      
      // Mettre à jour le stock de manière cumulative
      const stockCalculations = calculateStock(updatedProduction, exitData);
      setStockData(stockCalculations);
      
      // Réinitialiser le formulaire
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        site: 'Site Principal',
        shift: 'Jour',
        operator: '',
        notes: '',
        dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: 0 }))
      });
      
      setShowAddModal(false);
      alert(`Production enregistrée: ${total} tonnes`);
      
    } catch (error) {
      console.error("Erreur ajout production:", error);
      alert("Erreur lors de l'enregistrement de la production");
    }
  };

  const handleAddExit = async () => {
    try {
      if (!newExit.date || !newExit.destination) {
        alert('Veuillez remplir les champs obligatoires');
        return;
      }

      const hasQuantities = newExit.dimensions.some(dim => dim.quantity && parseFloat(dim.quantity) > 0);
      if (!hasQuantities) {
        alert('Veuillez saisir au moins une quantité');
        return;
      }

      // Vérification du stock disponible
      for (const dim of newExit.dimensions) {
        if (dim.quantity && parseFloat(dim.quantity) > 0) {
          const stockDim = stockData.find(s => s.dimension === dim.dimension);
          if (stockDim && parseFloat(dim.quantity) > stockDim.available) {
            alert(`Stock insuffisant pour la dimension ${dim.dimension}. Disponible: ${stockDim.available} tonnes`);
            return;
          }
        }
      }

      const total = newExit.dimensions.reduce((sum, dim) => 
        sum + (parseFloat(dim.quantity) || 0), 0
      );

      // Créer l'entrée de sortie
      const exitToAdd = {
        id: Date.now(),
        date: newExit.date,
        destination: newExit.destination,
        exit_type: newExit.exit_type,
        dimensions: newExit.dimensions.map(dim => ({
          dimension: dim.dimension,
          quantity: parseFloat(dim.quantity) || 0
        })),
        client_name: newExit.client_name,
        notes: newExit.notes,
        total: total
      };

      // Enregistrer la sortie dans exitData
      const updatedExits = [...exitData, exitToAdd];
      setExitData(updatedExits);
      
      // Recalculer le stock de manière cumulative
      const stockCalculations = calculateStock(productionData, updatedExits);
      setStockData(stockCalculations);
      
      // Réinitialiser le formulaire
      setNewExit({
        date: '',
        destination: '',
        exit_type: 'sale',
        dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: '' })),
        client_name: '',
        notes: ''
      });
      
      setShowExitModal(false);
      alert(`Sortie de stock enregistrée: ${total} tonnes`);
      
    } catch (error) {
      console.error("Erreur ajout sortie:", error);
      alert("Erreur lors de l'enregistrement de la sortie");
    }
  };

  const totalProduction = productionData.reduce((sum, item) => sum + item.total, 0);
  const totalStock = stockData.reduce((sum, item) => sum + item.available, 0);

  if (loading) {
    return (
      <AppLayout userRole="admin" userName="JD" userSite="RomBat Exploration & Mines">
        <div className="flex items-center justify-center h-64">
          <p style={{ color: "var(--color-muted-foreground)" }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole="admin" userName="JD" userSite="RomBat Exploration & Mines">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Gestion de Production
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Saisie de production et suivi du stock par dimension
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowAddModal(true)}
          >
            Saisie Production
          </Button>
          <Button
            variant="outline"
            iconName="Target"
            iconPosition="left"
            onClick={() => setShowObjectivesModal(true)}
          >
            Objectifs
          </Button>
          <Button
            variant="outline"
            iconName="Package"
            iconPosition="left"
            onClick={() => setShowExitModal(true)}
          >
            Sortie Stock
          </Button>
          <Button
            variant="outline"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={() => navigate("/")}
          >
            Retour
          </Button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Icon name="TrendingUp" size={20} color="#22c55e" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Production Totale</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalProduction.toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Icon name="Package" size={20} color="#22c55e" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Stock Disponible</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalStock.toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}>
              <Icon name="Calendar" size={20} color="#3182CE" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Saisies Aujourd'hui</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {productionData.filter(p => p.date === '2026-03-05').length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(214,158,46,0.12)" }}>
              <Icon name="Activity" size={20} color="var(--color-warning)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Moyenne/Saisie</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {productionData.length > 0 ? (totalProduction / productionData.length).toFixed(1) : 0} t
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau du stock par dimension */}
      <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
            Stock par Dimension
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Dimension</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Entrées Cumulées</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Sorties Cumulées</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Stock Disponible</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((item, index) => (
                <tr key={index} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-4">
                    <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                      {item.dimension}
                    </span>
                  </td>
                  <td className="p-4" style={{ color: "var(--color-success)", fontWeight: 'bold' }}>
                    +{item.entries.toFixed(1)} t
                  </td>
                  <td className="p-4" style={{ color: "var(--color-error)", fontWeight: 'bold' }}>
                    -{item.exits.toFixed(1)} t
                  </td>
                  <td className="p-4" style={{ color: "var(--color-foreground)", fontWeight: 'bold' }}>
                    {item.available.toFixed(1)} t
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" 
                      style={{ 
                        background: item.available > 100 ? "rgba(34,197,94,0.12)" : item.available > 50 ? "rgba(214,158,46,0.12)" : "rgba(239,68,68,0.12)",
                        color: item.available > 100 ? "var(--color-success)" : item.available > 50 ? "var(--color-warning)" : "var(--color-error)"
                      }}>
                      {item.available > 100 ? 'Bon' : item.available > 50 ? 'Faible' : 'Critique'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique des productions */}
      <div className="rounded-xl border mt-6" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
            Historique des Productions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Date</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Site</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Opérateur</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Total</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {productionData.map((item) => (
                <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.date}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.site}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.operator}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)", fontWeight: 'bold' }}>
                    {item.total.toFixed(1)} t
                  </td>
                  <td className="p-4">
                    <div className="text-xs">
                      {item.dimensions.map(dim => (
                        <div key={dim.dimension} style={{ color: "var(--color-muted-foreground)" }}>
                          {dim.dimension}: {dim.quantity}t
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Saisie Production */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4 sticky top-0 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
              Saisie de Production
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Site *
                  </label>
                  <input
                    type="text"
                    value={newEntry.site}
                    onChange={(e) => setNewEntry({...newEntry, site: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Carrière Nord"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Poste
                  </label>
                  <select
                    value={newEntry.shift}
                    onChange={(e) => setNewEntry({...newEntry, shift: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  >
                    <option value="jour">Jour</option>
                    <option value="nuit">Nuit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Opérateur *
                  </label>
                  <input
                    type="text"
                    value={newEntry.operator}
                    onChange={(e) => setNewEntry({...newEntry, operator: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Jean Dupont"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                  Production par dimension (tonnes)
                </label>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                  {newEntry.dimensions.map((dim, index) => (
                    <div key={index}>
                      <label className="block text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>
                        {dim.dimension}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={dim.quantity}
                        onChange={(e) => {
                          const updatedDims = [...newEntry.dimensions];
                          updatedDims[index].quantity = e.target.value;
                          setNewEntry({...newEntry, dimensions: updatedDims});
                        }}
                        className="w-full p-2 rounded border"
                        style={{ 
                          borderColor: "var(--color-border)",
                          background: "var(--color-background)",
                          color: "var(--color-foreground)"
                        }}
                        placeholder="0.0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ 
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-foreground)"
                  }}
                  rows="3"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end sticky bottom-0 bg-card pt-4 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={handleAddProduction}
              >
                Enregistrer la Production
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sortie Stock */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4 sticky top-0 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
              Sortie de Stock
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newExit.date}
                    onChange={(e) => setNewExit({...newExit, date: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={newExit.destination}
                    onChange={(e) => setNewExit({...newExit, destination: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Client A"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Type de sortie
                  </label>
                  <select
                    value={newExit.exit_type}
                    onChange={(e) => setNewExit({...newExit, exit_type: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  >
                    <option value="sale">Vente</option>
                    <option value="transfer">Transfert</option>
                    <option value="loss">Perte</option>
                    <option value="sample">Échantillon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Client
                  </label>
                  <input
                    type="text"
                    value={newExit.client_name}
                    onChange={(e) => setNewExit({...newExit, client_name: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Société ABC"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                  Quantités par dimension (tonnes)
                </label>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                  {newExit.dimensions.map((dim, index) => {
                    const stockDim = stockData.find(s => s.dimension === dim.dimension);
                    return (
                      <div key={index}>
                        <label className="block text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>
                          {dim.dimension} (Disponible: {stockDim?.available.toFixed(1) || 0} t)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          max={stockDim?.available || 0}
                          value={dim.quantity}
                          onChange={(e) => {
                            const updatedDims = [...newExit.dimensions];
                            updatedDims[index].quantity = e.target.value;
                            setNewExit({...newExit, dimensions: updatedDims});
                          }}
                          className="w-full p-2 rounded border"
                          style={{ 
                            borderColor: "var(--color-border)",
                            background: "var(--color-background)",
                            color: "var(--color-foreground)"
                          }}
                          placeholder="0.0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={newExit.notes}
                  onChange={(e) => setNewExit({...newExit, notes: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ 
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-foreground)"
                  }}
                  rows="3"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end sticky bottom-0 bg-card pt-4 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <Button
                variant="outline"
                onClick={() => setShowExitModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={handleAddExit}
              >
                Enregistrer la Sortie
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Objectifs de Production */}
      {showObjectivesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4 sticky top-0 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
              Objectifs de Production par Dimension
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {DIMENSIONS_LIST.map(dimension => (
                <div key={dimension}>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    {dimension} (tonnes/jour)
                  </label>
                  <input
                    type="number"
                    value={objectives.dimensions[dimension]?.daily?.value || 0}
                    onChange={(e) => {
                      const newObjectives = {...objectives};
                      if (!newObjectives.dimensions[dimension]) {
                        newObjectives.dimensions[dimension] = {daily: {value: 0, unit: 'tonne'}};
                      }
                      newObjectives.dimensions[dimension].daily.value = parseFloat(e.target.value) || 0;
                      setObjectives(newObjectives);
                    }}
                    className="w-full p-2 rounded border"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6 justify-end sticky bottom-0 bg-card pt-4 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <Button
                variant="outline"
                onClick={() => setShowObjectivesModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  alert("Objectifs sauvegardés avec succès !");
                  setShowObjectivesModal(false);
                }}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
