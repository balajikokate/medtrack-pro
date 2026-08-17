import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory_2' },
  { to: '/pos', label: 'Sales POS', icon: 'point_of_sale' },
  { to: '/suppliers', label: 'Suppliers', icon: 'local_shipping' },
  { to: '/prescriptions', label: 'Prescriptions', icon: 'prescriptions' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/staff', label: 'Staff', icon: 'badge' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-md px-md py-sm rounded-lg font-body-md text-body-md transition-colors scale-95 active:scale-90 ${
      isActive
        ? 'bg-secondary-container text-on-secondary-container font-semibold'
        : 'text-secondary hover:bg-surface-container-low hover:text-primary'
    }`;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      <nav
        className={`flex flex-col h-screen py-lg px-md bg-surface border-r border-outline-variant fixed left-0 top-0 w-64 flex-shrink-0 z-40 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-md mb-xl px-sm">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined" data-weight="fill">
              local_pharmacy
            </span>
          </div>
          <div>
            <h1 className="text-headline-sm font-headline-sm font-bold text-primary truncate leading-tight">
              MedTrack Pro
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              Pharmacy Management
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass} onClick={onClose}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-lg border-t border-outline-variant space-y-sm">
          <NavLink to="/settings" className={linkClass} onClick={onClose}>
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-md px-md py-sm text-error hover:bg-error-container/30 transition-colors rounded-lg font-body-md text-body-md"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
