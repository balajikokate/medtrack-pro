import React, { useEffect, useState } from 'react';
import { useSupplierAuth } from '../../context/SupplierAuthContext';
import {
  listMyPurchaseOrders,
  listPendingPOIds,
  approvePurchaseOrder,
  rejectPurchaseOrder,
} from '../../api/supplierPortal';
import { formatCurrency } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';

function seenKey(supplierId) {
  return `medtrack_supplier_po_seen_${supplierId}`;
}

function loadSeenIds(supplierId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(supplierId)) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeenIds(supplierId, set) {
  localStorage.setItem(seenKey(supplierId), JSON.stringify([...set]));
}

const FILTER_TABS = [
  { key: '', label: 'All', countKey: 'all' },
  { key: 'Pending', label: 'Pending', countKey: 'Pending' },
  { key: 'Approved', label: 'Approved', countKey: 'Approved' },
  { key: 'Delivered', label: 'Delivered', countKey: 'Delivered' },
  { key: 'Rejected', label: 'Rejected', countKey: 'Rejected' },
  { key: 'Reassigned', label: 'Reassigned', countKey: 'Reassigned' },
];

const LIMIT = 5;

export default function SupplierDashboard() {
  const { showToast } = useToast();
  const { supplier, logout } = useSupplierAuth();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  // Independent of the current filter/page — always reflects total unseen Pending orders,
  // so the bell badge stays correct even while looking at "Delivered" or page 3.
  const [unseenCount, setUnseenCount] = useState(0);
  // Per-order draft of "how much can I actually supply" keyed by productId — lets a
  // supplier approve with less than what was ordered (or 0) instead of only a binary choice.
  const [fulfillDrafts, setFulfillDrafts] = useState({});
  // Per-order draft of the expiry date on the batch being supplied for each medicine —
  // required, since each delivery can carry a different expiry than stock already on hand.
  const [expiryDrafts, setExpiryDrafts] = useState({});

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await listMyPurchaseOrders({ status: statusFilter || undefined, page, limit: LIMIT });
      const seenIds = loadSeenIds(supplier.id);
      const data = res.data.data || [];
      const withFlags = data.map((o) => ({ ...o, isNew: o.status === 'Pending' && !seenIds.has(o.id) }));
      setOrders(withFlags);
      setTotal(res.data.total || 0);
      setCounts(res.data.counts || {});
      setFulfillDrafts((prev) => {
        const next = { ...prev };
        withFlags.forEach((o) => {
          if (o.status !== 'Pending' || next[o.id]) return;
          const lines = Array.isArray(o.items?.lines) ? o.items.lines : [];
          next[o.id] = Object.fromEntries(lines.map((l) => [l.productId, l.quantity]));
        });
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnseenCount() {
    try {
      const res = await listPendingPOIds();
      const seenIds = loadSeenIds(supplier.id);
      setUnseenCount(res.data.filter((id) => !seenIds.has(id)).length);
    } catch {
      // non-critical — leave badge as-is
    }
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  useEffect(() => {
    fetchUnseenCount();
    const interval = setInterval(fetchUnseenCount, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeFilter(key) {
    setStatusFilter(key);
    setPage(1);
  }

  function markSeen(orderId) {
    const seenIds = loadSeenIds(supplier.id);
    if (seenIds.has(orderId)) return;
    seenIds.add(orderId);
    saveSeenIds(supplier.id, seenIds);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, isNew: false } : o)));
    setUnseenCount((prev) => Math.max(0, prev - 1));
  }

  function setDraftQty(orderId, productId, qty) {
    setFulfillDrafts((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [productId]: Math.max(0, Number(qty) || 0) },
    }));
  }

  function setDraftExpiry(orderId, productId, date) {
    setExpiryDrafts((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [productId]: date },
    }));
  }

  async function handleApprove(order) {
    const draft = fulfillDrafts[order.id] || {};
    const expiry = expiryDrafts[order.id] || {};
    const lines = Array.isArray(order.items?.lines) ? order.items.lines : [];
    const missingExpiry = lines.some((l) => (draft[l.productId] ?? l.quantity) > 0 && !expiry[l.productId]);
    if (missingExpiry) {
      showToast('Enter the batch expiry date for every medicine you can supply.', 'error');
      return;
    }
    setActingId(order.id);
    setError('');
    try {
      await approvePurchaseOrder(order.id, draft, expiry);
      fetchOrders();
      fetchUnseenCount();
      showToast('Order approved.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(order) {
    setActingId(order.id);
    setError('');
    try {
      await rejectPurchaseOrder(order.id);
      fetchOrders();
      fetchUnseenCount();
      showToast('Order rejected.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setActingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="min-h-screen bg-background">
      <header className="flex justify-between items-center h-16 px-lg bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">local_shipping</span>
          <h1 className="font-headline-sm text-headline-sm text-primary font-bold">Supplier Portal</h1>
        </div>
        <div className="flex items-center gap-md">
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            {unseenCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex">
                <span className="absolute inline-flex h-full w-full rounded-full bg-error opacity-60 animate-ping"></span>
                <span className="relative inline-flex min-w-[16px] h-[16px] px-[3px] items-center justify-center bg-error text-white text-[10px] font-bold rounded-full border-2 border-surface leading-none">
                  {unseenCount > 9 ? '9+' : unseenCount}
                </span>
              </span>
            )}
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{supplier?.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-xs font-body-sm text-body-sm text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-lg space-y-lg">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background">Purchase Orders</h2>
          <p className="font-body-md text-body-md text-secondary mt-xs">
            Newest orders first. Review and respond to what's sent to you — click an unread order to mark it seen.
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
            {error}
          </div>
        )}

        <div className="bg-surface border border-outline-variant rounded-lg p-sm flex flex-wrap gap-sm">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => changeFilter(tab.key)}
              className={`shrink-0 font-label-caps text-label-caps px-md py-sm rounded-full flex items-center gap-xs uppercase tracking-wider transition-colors ${
                statusFilter === tab.key
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface text-on-surface-variant border border-outline-variant hover:bg-surface-variant'
              }`}
            >
              {tab.label}
              <span className="font-data-mono text-data-mono bg-outline-variant/50 px-xs rounded-sm">
                {counts[tab.countKey] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
          {loading && <p className="p-md font-body-sm text-on-surface-variant">Loading...</p>}
          {!loading && orders.length === 0 && (
            <p className="p-md font-body-sm text-on-surface-variant">No purchase orders here.</p>
          )}
          {!loading &&
            orders.map((o) => {
              const lines = Array.isArray(o.items?.lines) ? o.items.lines : [];
              const draft = fulfillDrafts[o.id] || {};
              const expiry = expiryDrafts[o.id] || {};
              const showFulfilled = o.status !== 'Pending' && lines.some((l) => l.fulfilledQuantity !== undefined);
              return (
                <div
                  key={o.id}
                  onClick={() => o.isNew && markSeen(o.id)}
                  className={`p-md border-b border-outline-variant last:border-0 ${o.isNew ? 'bg-primary-fixed/20 cursor-pointer' : ''}`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-sm mb-sm">
                    <div>
                      <div className="flex items-center gap-sm">
                        <p className="font-data-mono text-data-mono text-on-surface font-semibold">{o.poNumber}</p>
                        {o.isNew && (
                          <span className="font-label-caps text-[10px] uppercase tracking-wider bg-primary text-on-primary px-1.5 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary">
                        Needed by {new Date(o.neededByDate).toDateString()}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  {lines.length > 0 && (
                    <div className="mb-sm border border-outline-variant rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-surface-container-low">
                          <tr>
                            <th className="p-xs font-label-caps text-[10px] text-secondary uppercase">Medicine</th>
                            <th className="p-xs font-label-caps text-[10px] text-secondary uppercase text-right">Ordered</th>
                            {o.status === 'Pending' && (
                              <>
                                <th className="p-xs font-label-caps text-[10px] text-secondary uppercase text-right">
                                  You Can Supply
                                </th>
                                <th className="p-xs font-label-caps text-[10px] text-secondary uppercase text-right">
                                  Batch Expiry
                                </th>
                              </>
                            )}
                            {showFulfilled && (
                              <th className="p-xs font-label-caps text-[10px] text-secondary uppercase text-right">
                                Supplied
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="font-body-sm text-body-sm">
                          {lines.map((line, i) => (
                            <tr key={i} className="border-t border-outline-variant">
                              <td className="p-xs text-on-surface">{line.name}</td>
                              <td className="p-xs text-on-surface-variant text-right font-data-mono">{line.quantity}</td>
                              {o.status === 'Pending' && (
                                <>
                                  <td className="p-xs text-right" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={draft[line.productId] ?? line.quantity}
                                      onChange={(e) => setDraftQty(o.id, line.productId, e.target.value)}
                                      className="w-20 bg-surface border border-outline rounded px-xs py-0.5 text-right font-data-mono text-data-mono"
                                    />
                                  </td>
                                  <td className="p-xs text-right" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="date"
                                      value={expiry[line.productId] || ''}
                                      onChange={(e) => setDraftExpiry(o.id, line.productId, e.target.value)}
                                      className="w-36 bg-surface border border-outline rounded px-xs py-0.5 text-right font-data-mono text-data-mono"
                                    />
                                  </td>
                                </>
                              )}
                              {showFulfilled && (
                                <td className="p-xs text-right font-data-mono text-on-surface">
                                  {line.fulfilledQuantity ?? '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="font-data-mono text-data-mono text-on-surface mb-sm">{formatCurrency(o.amount)}</p>

                  {o.status === 'Pending' && (
                    <div className="flex gap-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleApprove(o)}
                        disabled={actingId === o.id}
                        className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-body-sm text-body-sm py-xs px-md rounded flex items-center gap-xs disabled:opacity-50"
                      >
                        {actingId === o.id ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                        {actingId === o.id ? 'Submitting...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(o)}
                        disabled={actingId === o.id}
                        className="bg-error-container text-on-error-container font-body-sm text-body-sm py-xs px-md rounded flex items-center gap-xs disabled:opacity-50"
                      >
                        {actingId === o.id ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">cancel</span>}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {!loading && total > 0 && (
            <div className="bg-surface border-t border-outline-variant px-md py-3 flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant font-body-sm">
                Page <span className="font-medium text-on-surface">{page}</span> of{' '}
                <span className="font-medium text-on-surface">{totalPages}</span> &middot; {total} results
              </p>
              <div className="flex gap-xs">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
