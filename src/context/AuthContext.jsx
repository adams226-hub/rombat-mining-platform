import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Liste des utilisateurs par défaut + utilisateurs dynamiques
const DEFAULT_USERS = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    email: "admin@rombat.com",
    full_name: "Administrateur ROMBAT",
    role: "admin",
    department: "IT"
  },
  {
    id: 2,
    username: "directeur",
    password: "dir123",
    email: "directeur@rombat.com",
    full_name: "Directeur Général",
    role: "directeur",
    department: "Direction"
  },
  {
    id: 3,
    username: "chefsite",
    password: "chef123",
    email: "chefsite@rombat.com",
    full_name: "Chef de Site Principal",
    role: "chef_de_site",
    department: "Exploitation"
  },
  {
    id: 4,
    username: "comptable",
    password: "comp123",
    email: "comptable@rombat.com",
    full_name: "Comptable Principal",
    role: "comptable",
    department: "Finance"
  },
  {
    id: 5,
    username: "supervisor",
    password: "sup123",
    email: "supervisor@rombat.com",
    full_name: "Chef de Production",
    role: "supervisor",
    department: "Production"
  },
  {
    id: 6,
    username: "operator1",
    password: "op123",
    email: "operator1@rombat.com",
    full_name: "Opérateur 1",
    role: "operator",
    department: "Mining"
  },
  {
    id: 7,
    username: "equipement",
    password: "equip123",
    email: "equipement@rombat.com",
    full_name: "Responsable Équipement",
    role: "equipement",
    department: "Équipement"
  }
];

// Fonction pour obtenir tous les utilisateurs (par défaut + dynamiques)
const getAllUsers = () => {
  const dynamicUsers = JSON.parse(localStorage.getItem('users_fallback') || '[]');
  return [...DEFAULT_USERS, ...dynamicUsers];
};

// Configuration des routes accessibles par rôle
const ROLE_PERMISSIONS = {
  admin: ['/', '/executive-dashboard', '/production-management', '/equipment-management', '/fuel-management', '/accounting', '/reports', '/administration', '/stock-management'],
  directeur: ['/', '/executive-dashboard', '/production-management', '/equipment-management', '/fuel-management', '/accounting', '/reports', '/stock-management'],
  chef_de_site: ['/equipment-management'],
  comptable: ['/accounting'],
  equipement: ['/equipment-management'],
  supervisor: ['/production-management', '/stock-management'], // Supervisor n'accède PAS au dashboard
  operator: ['/production-management', '/stock-management']
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si un utilisateur est déjà connecté
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const allUsers = getAllUsers(); // Utiliser les utilisateurs par défaut + dynamiques
    const foundUser = allUsers.find(u => u.username === username && u.password === password);
    if (foundUser) {
      const userData = { ...foundUser };
      delete userData.password; // Ne pas stocker le mot de passe
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    }
    return { success: false, error: 'Identifiants incorrects' };
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  const hasAccess = (path) => {
    if (!user) return false;
    const allowedPaths = ROLE_PERMISSIONS[user.role] || [];
    return allowedPaths.includes(path);
  };

  const getDefaultRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
      case 'directeur':
      case 'chef_de_site':
        return '/equipment-management';
      case 'comptable':
        return '/accounting';
      case 'equipement':
        return '/equipment-management';
      case 'supervisor':
      case 'operator':
        return '/production-management';
      default:
        return '/executive-dashboard';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      hasAccess,
      getDefaultRoute,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
