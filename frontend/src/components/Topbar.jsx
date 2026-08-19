import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import { listPrescriptions } from '../api/prescriptions';
import { getRecentPOResponses } from '../api/suppliers';
import { changePassword } from '../api/auth';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import Spinner from './Spinner';

const EMPTY_PW_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

const SEEN_KEYS_STORAGE = 'medtrack_notif_seen_keys';

function loadSeenKeys() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEYS_STORAGE) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeenKeys(set) {
  localStorage.setItem(SEEN_KEYS_STORAGE, JSON.stringify([...set]));
}

// Turns a PO's line items into a short "how much did they actually confirm" summary
// so the notification itself answers the question, not just "an order was approved."
function poQuantitySummary(po) {
  const lines = Array.isArray(po.items?.lines) ? po.items.lines : [];
  if (lines.length === 0) return '';
  const anyShort = lines.some((l) => l.fulfilledQuantity !== undefined && l.fulfilledQuantity < l.quantity);
  if (lines.length === 1) {
    const l = lines[0];
    return `: ${l.name} ${l.fulfilledQuantity ?? l.quantity}/${l.quantity}${anyShort ? ' — short' : ''}`;
  }
  const totalOrdered = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalFulfilled = lines.reduce((sum, l) => sum + (l.fulfilledQuantity ?? l.quantity), 0);
  return `: ${totalFulfilled}/${totalOrdered} units confirmed${anyShort ? ' — short on some items' : ''}`;
}

export default function Topbar({ title, onMenuClick, search, onSearchChange, searchPlaceholder }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwForm, setPwForm] = useState(EMPTY_PW_FORM);
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  function openPwModal() {
    setProfileOpen(false);
    setPwForm(EMPTY_PW_FORM);
    setPwError('');
    setPwModalOpen(true);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwSaving) return;
    setPwError('');
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New password and confirmation do not match');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      showToast('Password updated.');
      setPwModalOpen(false);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function fetchNotifications() {
    try {
      const [dashRes, presRes, poRes] = await Promise.all([
        getDashboard(),
        listPrescriptions(),
        getRecentPOResponses(),
      ]);
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
          // Count baked into the key so a change in how many are pending re-flags as new.
          key: `prescriptions-pending-${pendingCount}`,
          icon: 'prescriptions',
          text: `${pendingCount} prescription${pendingCount > 1 ? 's' : ''} awaiting verification`,
          to: '/prescriptions',
        });
      }
      (poRes.data || []).forEach((po) => {
        const approved = po.status === 'Approved';
        items.push({
          key: `po-${po.id}`,
          icon: approved ? 'check_circle' : 'cancel',
          text: `${po.supplier?.name || 'A supplier'} ${approved ? 'approved' : 'rejected'} ${po.poNumber}${
            approved ? poQuantitySummary(po) : ''
          }`,
          to: '/suppliers',
        });
      });

      const seenKeys = loadSeenKeys();
      const withSeenFlags = items.map((item) => ({ ...item, isNew: !seenKeys.has(item.key) }));

      setNotifications(withSeenFlags);
      setUnseenCount(withSeenFlags.filter((i) => i.isNew).length);
    } catch {
      setNotifications([]);
      setUnseenCount(0);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  function handleNotificationClick(n) {
    setNotifOpen(false);
    const seenKeys = loadSeenKeys();
    seenKeys.add(n.key);
    saveSeenKeys(seenKeys);
    setNotifications((prev) => prev.map((item) => (item.key === n.key ? { ...item, isNew: false } : item)));
    if (n.isNew) setUnseenCount((prev) => Math.max(0, prev - 1));
    navigate(n.to);
  }

  function openNotifications() {
    setNotifOpen((v) => !v);
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
            onClick={openNotifications}
            className="relative text-on-surface-variant hover:text-primary opacity-80 hover:opacity-100 transition-opacity p-sm rounded-full hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unseenCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex">
                <span className="absolute inline-flex h-full w-full rounded-full bg-error opacity-60 animate-ping"></span>
                <span className="relative inline-flex min-w-[16px] h-[16px] px-[3px] items-center justify-center bg-error text-white text-[10px] font-bold rounded-full border-2 border-surface leading-none">
                  {unseenCount > 9 ? '9+' : unseenCount}
                </span>
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
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full flex items-start gap-sm px-md py-sm text-left border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors ${
                        n.isNew ? 'bg-primary-fixed/20' : ''
                      }`}
                    >
                      <span className="material-symbols-outlined text-error text-[18px] mt-0.5">{n.icon}</span>
                      <span className="font-body-sm text-body-sm text-on-surface flex-1">{n.text}</span>
                      {n.isNew && (
                        <span className="shrink-0 font-label-caps text-[10px] uppercase tracking-wider bg-primary text-on-primary px-1.5 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-caps text-label-caps border border-outline-variant hover:ring-2 hover:ring-primary/20 transition-all"
          >
            {initials}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-sm w-56 bg-surface border border-outline-variant rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-md py-sm border-b border-outline-variant bg-surface-container-low">
                  <p className="font-body-sm text-body-sm font-semibold text-on-surface truncate">{user?.name}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user?.email}</p>
                </div>
                <button
                  onClick={openPwModal}
                  className="w-full flex items-center gap-sm px-md py-sm text-left font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  Change Password
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-sm px-md py-sm text-left font-body-sm text-body-sm text-error hover:bg-error-container/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={pwModalOpen} title="Change Password" onClose={() => setPwModalOpen(false)}>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Current Password</label>
            <input
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="w-full bg-surface border border-outline rounded-lg p-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="w-full bg-surface border border-outline rounded-lg p-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              className="w-full bg-surface border border-outline rounded-lg p-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          {pwError && (
            <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-sm">
              {pwError}
            </div>
          )}
          <div className="flex justify-end gap-sm mt-sm">
            <button
              type="submit"
              disabled={pwSaving}
              className="bg-primary text-on-primary font-body-md text-body-md py-sm px-md rounded-lg hover:bg-primary-container transition-colors disabled:opacity-60 flex items-center gap-sm"
            >
              {pwSaving && <Spinner />}
              {pwSaving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
