import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { miningService } from '../../config/supabase';
import Icon from 'components/AppIcon';
    path: '/production-management',
    time: '2h',
    icon: 'BarChart3',
    read: false,
  },
  {
    id: 4,
    type: 'info',
    title: 'Rapport Mensuel',
    message: 'Rapport de mars disponible pour export',
    path: '/reports',
    time: '3h',
    icon: 'FileText',
    read: true,
  },
];

const TYPE_STYLES = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-l-4 border-error',
    icon: 'var(--color-error)',
    badge: 'bg-error text-error-foreground',
    dot: 'bg-error',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-l-4 border-warning',
    icon: 'var(--color-warning)',
    badge: 'bg-warning text-warning-foreground',
    dot: 'bg-warning',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-l-4 border-blue-400',
    icon: '#3182CE',
    badge: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
  },
};

export default function AlertNotificationBadge({ className = '' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = alerts?.filter(a => !a?.read)?.length;
  const criticalCount = alerts?.filter(a => a?.type === 'critical' && !a?.read)?.length;

  // Charger les alertes depuis Supabase
  useEffect(() => {
    const loadAlerts = async () => {
      if (!user?.role) return;

      try {
        setLoading(true);
        // Pour l'instant, utiliser des données mockées transformées
        // TODO: Remplacer par appel API réel quand la table alerts sera remplie
        const mockAlerts = [
          {
            id: '1',
            type: 'critical',
            title: 'Stock Carburant Critique',
            message: 'Niveau carburant Site A: 12% restant',
            path: '/fuel-management',
            time: '5 min',
            icon: 'Fuel',
            read: false,
          },
          {
            id: '2',
            type: 'warning',
            title: 'Maintenance Requise',
            message: 'Excavatrice EX-003 - révision dans 48h',
            path: '/equipment-management',
            time: '1h',
            icon: 'Wrench',
            read: false,
          },
          {
            id: '3',
            type: 'warning',
            title: 'Objectif Production',
            message: 'Production journalière à 78% de l\'objectif',
            path: '/production-management',
            time: '2h',
            icon: 'BarChart3',
            read: false,
          },
          {
            id: '4',
            type: 'info',
            title: 'Rapport Mensuel',
            message: 'Rapport de mars disponible pour export',
            path: '/reports',
            time: '3h',
            icon: 'FileText',
            read: true,
          },
        ];

        setAlerts(mockAlerts);
      } catch (error) {
        console.error('Erreur chargement alertes:', error);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [user?.role]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef?.current && !panelRef?.current?.contains(e?.target)) {
        setPanelOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e?.key === 'Escape') setPanelOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleAlertClick = (alert) => {
    setAlerts(prev => prev?.map(a => a?.id === alert?.id ? { ...a, read: true } : a));
    setPanelOpen(false);
    navigate(alert?.path);
  };

  const handleMarkAllRead = () => {
    setAlerts(prev => prev?.map(a => ({ ...a, read: true })));
  };

  const handleDismiss = (e, alertId) => {
    e?.stopPropagation();
    setAlerts(prev => prev?.filter(a => a?.id !== alertId));
  };

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        onClick={() => setPanelOpen(prev => !prev)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-[250ms] ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications: ${unreadCount} non lues`}
        aria-expanded={panelOpen}
        aria-haspopup="true"
      >
        <Icon
          name="Bell"
          size={20}
          color={criticalCount > 0 ? 'var(--color-error)' : 'var(--color-secondary)'}
          strokeWidth={criticalCount > 0 ? 2.5 : 2}
        />
        {unreadCount > 0 && (
          <span
            className={[
              'absolute top-1 right-1 flex items-center justify-center rounded-full text-white font-semibold',
              criticalCount > 0 ? 'bg-error' : 'bg-warning',
            ]?.join(' ')}
            style={{
              minWidth: '16px',
              height: '16px',
              fontSize: '0.6rem',
              padding: '0 4px',
              fontFamily: 'var(--font-caption)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Pulse for critical */}
        {criticalCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error opacity-40 animate-ping" />
        )}
      </button>
      {/* Notification panel */}
      {panelOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-[200]"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
          }}
          role="dialog"
          aria-label="Panneau de notifications"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Icon name="Bell" size={16} color="var(--color-primary)" />
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
              >
                Alertes Opérationnelles
              </span>
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-semibold bg-primary text-primary-foreground"
                  style={{ fontFamily: 'var(--font-caption)' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs transition-colors duration-[250ms] ease-out hover:underline focus-visible:outline-none"
                style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-caption)' }}
              >
                Tout lire
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="max-h-80 overflow-y-auto">
            {alerts?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Icon name="CheckCircle" size={32} color="var(--color-success)" />
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-caption)' }}
                >
                  Aucune alerte active
                </p>
              </div>
            ) : (
              alerts?.map((alert) => {
                const styles = TYPE_STYLES?.[alert?.type] || TYPE_STYLES?.info;
                return (
                  <div
                    key={alert?.id}
                    onClick={() => handleAlertClick(alert)}
                    className={[
                      'flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-[250ms] ease-out border-b',
                      alert?.read ? 'opacity-60' : '',
                      styles?.border,
                    ]?.join(' ')}
                    style={{
                      borderBottomColor: 'var(--color-border)',
                      background: alert?.read ? 'transparent' : (alert?.type === 'critical' ? 'rgba(229,62,62,0.04)' : alert?.type === 'warning' ? 'rgba(214,158,46,0.04)' : 'rgba(49,130,206,0.04)'),
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e?.key === 'Enter' && handleAlertClick(alert)}
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
                      style={{ background: `${styles?.icon}15` }}
                    >
                      <Icon name={alert?.icon} size={15} color={styles?.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-xs font-semibold leading-tight"
                          style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
                        >
                          {alert?.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span
                            className="text-xs"
                            style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-caption)' }}
                          >
                            {alert?.time}
                          </span>
                          <button
                            onClick={(e) => handleDismiss(e, alert?.id)}
                            className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted transition-colors"
                            aria-label="Ignorer"
                          >
                            <Icon name="X" size={10} color="var(--color-muted-foreground)" />
                          </button>
                        </div>
                      </div>
                      <p
                        className="text-xs mt-0.5 leading-relaxed"
                        style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-caption)' }}
                      >
                        {alert?.message}
                      </p>
                    </div>
                    {!alert?.read && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${styles?.dot}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => { setPanelOpen(false); navigate('/executive-dashboard'); }}
              className="flex items-center gap-1.5 text-xs transition-colors duration-[250ms] ease-out hover:underline focus-visible:outline-none"
              style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-caption)' }}
            >
              <Icon name="ExternalLink" size={12} color="var(--color-primary)" />
              Voir toutes les alertes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}