import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import { listPrescriptions } from '../api/prescriptions';

export default function Topbar({ title, onMenuClick, search, onSearchChange, searchPlaceholder }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function fetchNotifications() {
    try {
      const [dashRes, presRes] = await Promise.all([getDashboard(), listPrescriptions()]);
      const items = [];
      (dashRes.data.restockList || []).forEach((p) =>
        items.push({
          key: `stock-${p.id}`,
          icon: 'inventory_2',
          text: `${p.name} is low on stock (${p.quantity} left)`,
          to: '/inventory',
        })
      );
      (dashRes.data.expiringList || []).forEach((p) =>
        items.push({
          key: `expiry-${p.id}`,
          icon: 'event_busy',
          text: `${p.name} expires ${p.expiryDate?.slice(0, 10)}`,
          to: '/inventory',
        })
      );
      const pendingCount = presRes.data.counts?.pending ?? presRes.data.data?.length ?? 0;
      if (pendingCount > 0) {
        items.push({
          key: 'prescriptions-pending',
          icon: 'prescriptions',
          text: `${pendingCount} prescription${pendingCount > 1 ? 's' : ''} awaiting verification`,
          to: '/prescriptions',
        });
      }
      setNotifications(items);
    } catch {
      setNotifications([]);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  function goTo(to) {
    setNotifOpen(false);
    navigate(to);
  }

  return (
    <header className="flex justify-between items-center h-16 px-lg w-full bg-surface border-b border-outline-variant flex-shrink-0 z-10">
      <div className="flex items-center gap-md">
        <button
          className="md:hidden text-on-surface-variant p-sm rounded-md hover:bg-surface-container"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="font-headline-sm text-headline-sm text-primary font-bold">{title}</h2>
      </div>

      {onSearchChange && (
        <div className="hidden sm:flex flex-1 max-w-md mx-lg">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              className="w-full pl-[36px] pr-sm py-sm bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline-variant"
              placeholder={searchPlaceholder || 'Search...'}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-md">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative text-on-surface-variant hover:text-primary opacity-80 hover:opacity-100 transition-opacity p-sm rounded-full hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-[3px] flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full border-2 border-surface">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-sm w-80 max-h-96 overflow-y-auto bg-surface border border-outline-variant rounded-lg shadow-lg z-50">
                <div className="px-md py-sm border-b border-outline-variant bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <p className="p-md font-body-sm text-body-sm text-on-surface-variant">
                    Nothing needs your attention right now.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => goTo(n.to)}
                      className="w-full flex items-start gap-sm px-md py-sm text-left border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-error text-[18px] mt-0.5">{n.icon}</span>
                      <span className="font-body-sm text-body-sm text-on-surface">{n.text}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-caps text-label-caps border border-outline-variant">
          {initials}
        </div>
      </div>
    </header>
  );
}
