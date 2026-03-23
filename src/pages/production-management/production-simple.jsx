import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toastError, toastSuccess } from "../../utils/toast";
import AppLayout from "../../components/navigation/AppLayout";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

// Données initiales garanties
const INITIAL_DATA = [
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

export default function ProductionSimple() {
  const navigate = useNavigate();
  const [productionData, setProductionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Chargement simple et garanti
  useEffect(() => {
    try {
      setLoading(true);
      
      // Toujours utiliser localStorage - pas d'appels externes
      const storedData = localStorage.getItem('production_simple');
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setProductionData(parsedData);
        console.log('Production: Loaded from localStorage', parsedData.length, 'items');
      } else {
        // Initialiser avec les données garanties
        localStorage.setItem('production_simple', JSON.stringify(INITIAL_DATA));
        setProductionData(INITIAL_DATA);
        console.log('Production: Initialized with default data', INITIAL_DATA.length, 'items');
      }
      
    } catch (error) {
      console.error('Production loading error:', error);
      toastError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddProduction = () => {
    try {
      const form = document.getElementById('production-form');
      const formData = new FormData(form);
      
      const date = formData.get('date');
      const operator = formData.get('operator');
      const notes = formData.get('notes');
      
      if (!date || !operator) {
        toastError('Veuillez remplir les champs obligatoires');
        return;
      }

      // Créer la nouvelle entrée
      const newEntry = {
        id: Date.now().toString(),
        date: date,
        site: 'Site Principal',
        shift: 'Jour',
        operator: operator,
        notes: notes || '',
        dimensions: [
          { dimension: 'Minerai', quantity: parseFloat(formData.get('minerai') || 0) },
          { dimension: 'Forage', quantity: parseFloat(formData.get('forage') || 0) },
          { dimension: '0/4', quantity: parseFloat(formData.get('04') || 0) },
          { dimension: '0/5', quantity: parseFloat(formData.get('05') || 0) }
        ],
        total: 0
      };
      
      // Calculer le total
      newEntry.total = newEntry.dimensions.reduce((sum, dim) => sum + dim.quantity, 0);

      // Ajouter aux données existantes
      const updatedData = [...productionData, newEntry];
      
      // Sauvegarder dans localStorage
      localStorage.setItem('production_simple', JSON.stringify(updatedData));
      
      // Mettre à jour l'état
      setProductionData(updatedData);
      
      // Fermer le modal
      setShowAddModal(false);
      
      // Vider le formulaire
      form.reset();
      
      toastSuccess(`Production enregistrée: ${newEntry.total} tonnes`);
      
    } catch (error) {
      console.error('Add production error:', error);
      toastError('Erreur lors de l\'ajout');
    }
  };

  const handleDelete = (id) => {
    try {
      if (confirm('Êtes-vous sûr de vouloir supprimer cette production ?')) {
        const updatedData = productionData.filter(item => item.id !== id);
        localStorage.setItem('production_simple', JSON.stringify(updatedData));
        setProductionData(updatedData);
        toastSuccess('Production supprimée');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toastError('Erreur lors de la suppression');
    }
  };

  return (
    <AppLayout userRole="admin" userName="JD" userSite="RomBat Exploration & Mines">
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion de Production</h1>
              <p className="text-sm text-gray-600 mt-1">Suivi de la production minière</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="default"
                iconName="Plus"
                onClick={() => setShowAddModal(true)}
              >
                Ajouter Production
              </Button>
              <Button
                variant="outline"
                iconName="ArrowLeft"
                onClick={() => navigate('/')}
              >
                Retour
              </Button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Chargement...</p>
          </div>
        )}

        {/* Tableau */}
        {!loading && (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opérateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productionData.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.operator}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.total} tonnes</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Ajouter Production</h3>
              </div>
              
              <form id="production-form" className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Opérateur *</label>
                  <input
                    type="text"
                    name="operator"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minerai</label>
                    <input
                      type="number"
                      name="minerai"
                      step="0.1"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Forage</label>
                    <input
                      type="number"
                      name="forage"
                      step="0.1"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">0/4</label>
                    <input
                      type="number"
                      name="04"
                      step="0.1"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">0/5</label>
                    <input
                      type="number"
                      name="05"
                      step="0.1"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </form>
              
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
                
                <button
                  type="button"
                  onClick={handleAddProduction}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
