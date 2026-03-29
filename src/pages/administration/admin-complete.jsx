import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { miningService } from "../../config/supabase.js";

export default function AdminComplete() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // États des formulaires
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'operator',
    department: '',
    is_active: true
  });

  const [editUser, setEditUser] = useState({
    id: null,
    username: '',
    email: '',
    full_name: '',
    role: '',
    department: '',
    is_active: true
  });

  // Statistiques
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0
  });

  // Calculer les statistiques
  const calculateStats = (usersList) => {
    const stats = {
      totalUsers: usersList.length,
      activeUsers: usersList.filter(u => u.is_active !== false).length,
      inactiveUsers: usersList.filter(u => u.is_active === false).length,
      adminUsers: usersList.filter(u => u.role === 'admin').length
    };
    setStats(stats);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await miningService.getUsers('admin');
      
      if (result.error) {
        console.warn('Supabase error, using localStorage:', result.error.message);
        // Fallback localStorage
        const storedUsers = JSON.parse(localStorage.getItem('users_fallback') || '[]');
        setUsers(storedUsers);
        calculateStats(storedUsers);
      } else {
        setUsers(result.data || []);
        calculateStats(result.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      // Fallback localStorage
      const storedUsers = JSON.parse(localStorage.getItem('users_fallback') || '[]');
      setUsers(storedUsers);
      calculateStats(storedUsers);
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un utilisateur
  const handleAddUser = async () => {
    try {
      if (!newUser.username || !newUser.email || !newUser.full_name) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const result = await miningService.createUser('admin', {
        username: newUser.username,
        email: newUser.email,
        password_hash: 'temp_password_123',
        full_name: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        is_active: newUser.is_active
      });

      if (result.error) {
        console.warn('Supabase error, using localStorage:', result.error.message);
        // Fallback localStorage
        const users = JSON.parse(localStorage.getItem('users_fallback') || '[]');
        const payload = {
          id: Date.now().toString(),
          ...newUser,
          created_at: new Date().toISOString()
        };
        users.push(payload);
        localStorage.setItem('users_fallback', JSON.stringify(users));
        
        // Mettre à jour l'état et les stats
        const updatedUsers = [...users];
        setUsers(updatedUsers);
        calculateStats(updatedUsers);
      } else {
        await loadUsers(); // Recharger pour mettre à jour les stats
      }

      setShowAddModal(false);
      setNewUser({
        username: '',
        email: '',
        full_name: '',
        role: 'operator',
        department: '',
        is_active: true
      });
      alert('Utilisateur ajouté avec succès! Mot de passe temporaire: temp_password_123');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
      alert('Erreur lors de l\'ajout de l\'utilisateur: ' + (error.message || 'Erreur inconnue'));
    }
  };

  // Modifier un utilisateur
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditUser({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department || '',
      is_active: user.is_active !== false
    });
    setShowEditModal(true);
  };

  // Sauvegarder les modifications
  const handleSaveEdit = async () => {
    try {
      // Mettre à jour dans localStorage (fallback)
      const users = JSON.parse(localStorage.getItem('users_fallback') || '[]');
      const updatedUsers = users.map(u => 
        u.id === editUser.id ? { ...u, ...editUser } : u
      );
      localStorage.setItem('users_fallback', JSON.stringify(updatedUsers));
      
      setUsers(updatedUsers);
      calculateStats(updatedUsers);
      
      setShowEditModal(false);
      setSelectedUser(null);
      alert('Utilisateur modifié avec succès!');
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Erreur lors de la modification');
    }
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async (userId) => {
    try {
      if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
        // Supprimer dans localStorage (fallback)
        const users = JSON.parse(localStorage.getItem('users_fallback') || '[]');
        const updatedUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('users_fallback', JSON.stringify(updatedUsers));
        
        setUsers(updatedUsers);
        calculateStats(updatedUsers);
        
        alert('Utilisateur supprimé avec succès!');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Basculer le statut actif/inactif
  const toggleUserStatus = async (userId) => {
    try {
      const users = JSON.parse(localStorage.getItem('users_fallback') || '[]');
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, is_active: !u.is_active } : u
      );
      localStorage.setItem('users_fallback', JSON.stringify(updatedUsers));
      
      setUsers(updatedUsers);
      calculateStats(updatedUsers);
      
      alert('Statut de l\'utilisateur modifié avec succès!');
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  return (
    <AppLayout userRole="admin" userName="JD" userSite="Amp Mines et Carrieres Exploration & Mines">
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration Complète</h1>
              <p className="text-sm text-gray-600 mt-1">Gestion des utilisateurs avec statistiques en temps réel</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="default"
                iconName="Plus"
                onClick={() => setShowAddModal(true)}
              >
                Ajouter Utilisateur
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

        {/* Navigation par onglets */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tableau de Bord
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Gestion des Utilisateurs
              </button>
            </nav>
          </div>
        </div>

        {/* Onglet Tableau de Bord */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Cartes de statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Icon name="Users" className="text-white text-sm" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Utilisateurs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Icon name="Check" className="text-white text-sm" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Actifs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <Icon name="X" className="text-white text-sm" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Inactifs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.inactiveUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Icon name="Shield" className="text-white text-sm" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique de distribution des rôles */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Distribution des Rôles</h3>
              <div className="space-y-3">
                {['admin', 'supervisor', 'operator', 'directeur', 'chef_de_site', 'comptable', 'equipement'].map(role => {
                  const count = users.filter(u => u.role === role).length;
                  const percentage = users.length > 0 ? (count / users.length * 100).toFixed(1) : 0;
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                        <span className="ml-2 text-sm text-gray-500">({count})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Onglet Gestion des Utilisateurs */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Liste des Utilisateurs</h3>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Chargement...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Département</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active !== false ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={`mr-3 ${
                              user.is_active !== false 
                                ? 'text-yellow-600 hover:text-yellow-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {user.is_active !== false ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
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
            )}
          </div>
        )}

        {/* Modal Ajout Utilisateur */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Ajouter un Utilisateur</h3>
              </div>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom d'utilisateur *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom complet *</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="operator">Opérateur</option>
                    <option value="supervisor">Superviseur</option>
                    <option value="admin">Admin</option>
                    <option value="directeur">Directeur</option>
                    <option value="chef_de_site">Chef de Site</option>
                    <option value="comptable">Comptable</option>
                    <option value="equipement">Équipement</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Département</label>
                  <input
                    type="text"
                    value={newUser.department}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newUser.is_active}
                      onChange={(e) => setNewUser({...newUser, is_active: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Utilisateur actif</span>
                  </label>
                </div>
              </div>
              
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
                  onClick={handleAddUser}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modification Utilisateur */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Modifier un Utilisateur</h3>
              </div>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                  <input
                    type="text"
                    value={editUser.full_name}
                    onChange={(e) => setEditUser({...editUser, full_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle</label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="operator">Opérateur</option>
                    <option value="supervisor">Superviseur</option>
                    <option value="admin">Admin</option>
                    <option value="directeur">Directeur</option>
                    <option value="chef_de_site">Chef de Site</option>
                    <option value="comptable">Comptable</option>
                    <option value="equipement">Équipement</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Département</label>
                  <input
                    type="text"
                    value={editUser.department}
                    onChange={(e) => setEditUser({...editUser, department: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editUser.is_active}
                      onChange={(e) => setEditUser({...editUser, is_active: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Utilisateur actif</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
                
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
