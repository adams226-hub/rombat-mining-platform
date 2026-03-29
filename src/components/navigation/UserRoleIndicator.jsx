import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const ROLE_CONFIG = {
  admin: {
    label: 'Administrateur',
    shortLabel: 'Admin',
    color: 'var(--color-primary)',
    bgColor: 'rgba(44, 85, 48, 0.15)',
    icon: 'ShieldCheck',
  },
  directeur: {
    label: 'Directeur',
    shortLabel: 'Dir.',
    color: 'var(--color-accent)',
    bgColor: 'rgba(214, 158, 46, 0.15)',
    icon: 'TrendingUp',
  },
  chef_de_site: {
    label: 'Chef de Site',
    shortLabel: 'Chef',
    color: '#3182CE',
    bgColor: 'rgba(49, 130, 206, 0.15)',
    icon: 'HardHat',
  },
  comptable: {
    label: 'Comptable',
    shortLabel: 'Cpt.',
    color: '#805AD5',
    bgColor: 'rgba(128, 90, 213, 0.15)',
    icon: 'Calculator',
  },
};

export default function UserRoleIndicator({
  userRole = 'admin',
  userName = 'JD',
  userSite = 'Amp Mines et Carrieres Exploration & Mines',
  isCollapsed = false,
  onLogout,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const roleConfig = ROLE_CONFIG?.[userRole] || ROLE_CONFIG?.admin;
  const initials = userName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase()?.slice(0, 2);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(e?.target)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e?.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      navigate('/user-authentication');
    }
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    navigate('/administration');
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
    >
      <button
        onClick={() => setDropdownOpen(prev => !prev)}
        className={[
          'flex items-center gap-3 w-full transition-all duration-[250ms] ease-out',
          'hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isCollapsed ? 'justify-center p-3' : 'px-4 py-3',
        ]?.join(' ')}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        aria-label={`Utilisateur: ${userName}, Rôle: ${roleConfig?.label}`}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 font-heading font-600 text-sm"
          style={{
            background: roleConfig?.bgColor,
            color: roleConfig?.color,
            border: `1px solid ${roleConfig?.color}30`,
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
          }}
        >
          {initials}
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-sidebar-foreground)', fontFamily: 'var(--font-caption)' }}
            >
              {userName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: roleConfig?.bgColor,
                  color: roleConfig?.color,
                  fontFamily: 'var(--font-caption)',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                }}
              >
                {roleConfig?.label}
              </span>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <Icon
            name={dropdownOpen ? 'ChevronUp' : 'ChevronDown'}
            size={14}
            color="var(--color-sidebar-muted)"
            className="flex-shrink-0"
          />
        )}
      </button>
      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className={[
            'absolute bottom-full mb-2 rounded-lg shadow-xl border overflow-hidden z-[200]',
            isCollapsed ? 'left-full ml-2 w-56' : 'left-2 right-2',
          ]?.join(' ')}
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
          }}
          role="menu"
        >
          {/* User info header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
            >
              {userName}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-caption)' }}
            >
              {userSite}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Icon name={roleConfig?.icon} size={12} color={roleConfig?.color} />
              <span
                className="text-xs font-medium"
                style={{ color: roleConfig?.color, fontFamily: 'var(--font-caption)' }}
              >
                {roleConfig?.label}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={handleProfile}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all duration-[250ms] ease-out hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
              role="menuitem"
            >
              <Icon name="User" size={15} color="var(--color-secondary)" />
              Mon Profil
            </button>
            <button
              onClick={handleProfile}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all duration-[250ms] ease-out hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
              role="menuitem"
            >
              <Icon name="Settings" size={15} color="var(--color-secondary)" />
              Paramètres
            </button>
          </div>

          <div className="border-t py-1" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all duration-[250ms] ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50"
              style={{ color: 'var(--color-error)', fontFamily: 'var(--font-caption)' }}
              role="menuitem"
            >
              <Icon name="LogOut" size={15} color="var(--color-error)" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}