import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  getSupplierStats,
  createPurchaseOrder,
  reassignPurchaseOrder,
  receiveDelivery,
} from '../api/suppliers';
import { listProducts } from '../api/products';
import { formatCurrency } from '../utils/currency';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  vendorId: '',
  name: '',
  categories: '',
  leadTimeDays: 3,
  rating: 4.5,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  portalPassword: '',
};

const EMPTY_PO_FORM = { supplierId: '', neededByDate: '', lineItems: [{ productId: '', quantity: 1 }] };
const EMPTY_REASSIGN_FORM = { poId: '', newSupplierId: '' };

export default function Suppliers() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'pharmacist';
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poForm, setPoForm] = useState(EMPTY_PO_FORM);
  const [poError, setPoError] = useState('');
  const [poSaving, setPoSaving] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignForm, setReassignForm] = useState(EMPTY_REASSIGN_FORM);
  const [reassignError, setReassignError] = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);
  const [poPage, setPoPage] = useState(1);
  const PO_PAGE_SIZE = 5;

  async function fetchSuppliers() {
    try {
      const res = await listSuppliers();
      setSuppliers(res.data);
      if (res.data.length && !selectedId) setSelectedId(res.data[0].id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load suppliers');
    }
  }

  useEffect(() => {
    fetchSuppliers();
    getSupplierStats().then((res) => setStats(res.data)).catch(() => {});
    listProducts({ limit: 1000 }).then((res) => setProducts(res.data.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setPoPage(1);
    getSupplier(selectedId).then((res) => setDetail(res.data)).catch(() => {});
  }, [selectedId]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const { portalPassword, ...rest } = form;
      const payload = {
        ...rest,
        categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
      };
      // Only send a password if the admin actually typed one — an empty field
      // during Edit must never wipe out an existing supplier login.
      if (portalPassword) payload.password = portalPassword;
      if (editingId) {
        await updateSupplier(editingId, payload);
        if (selectedId === editingId) getSupplier(editingId).then((res) => setDetail(res.data));
      } else {
        await createSupplier(payload);
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchSuppliers();
      showToast(editingId ? 'Supplier updated.' : 'Supplier added.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save supplier';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(supplier) {
    setEditingId(supplier.id);
    setForm({
      vendorId: supplier.vendorId || '',
      name: supplier.name || '',
      categories: (supplier.categories || []).join(', '),
      leadTimeDays: supplier.leadTimeDays ?? 3,
      rating: supplier.rating ?? 4.5,
      contactName: supplier.contactName || '',
      contactEmail: supplier.contactEmail || '',
      contactPhone: supplier.contactPhone || '',
      portalPassword: '',
    });
    setModalOpen(true);
  }

  function addPoLine() {
    setPoForm((f) => ({ ...f, lineItems: [...f.lineItems, { productId: '', quantity: 1 }] }));
  }

  function removePoLine(index) {
    setPoForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== index) }));
  }

  function updatePoLine(index, field, value) {
    setPoForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li, i) => (i === index ? { ...li, [field]: value } : li)),
    }));
  }

  function poTotal() {
    return poForm.lineItems.reduce((sum, li) => {
      const product = products.find((p) => p.id === li.productId);
      return sum + (product ? product.price * (Number(li.quantity) || 0) : 0);
    }, 0);
  }

  async function handleCreatePO() {
    setPoError('');
    const validLines = poForm.lineItems.filter((li) => li.productId && Number(li.quantity) > 0);
    if (!poForm.supplierId || !poForm.neededByDate) {
      setPoError('Supplier and needed-by date are required');
      return;
    }
    if (validLines.length === 0) {
      setPoError('Add at least one medicine with a quantity');
      return;
    }
    setPoSaving(true);
    try {
      await createPurchaseOrder({
        supplierId: poForm.supplierId,
        neededByDate: poForm.neededByDate,
        lineItems: validLines.map((li) => ({ productId: li.productId, quantity: Number(li.quantity) })),
      });
      setPoModalOpen(false);
      setPoForm(EMPTY_PO_FORM);
      if (selectedId === poForm.supplierId) {
        setPoPage(1);
        getSupplier(selectedId).then((res) => setDetail(res.data));
      }
      getSupplierStats().then((res) => setStats(res.data));
      showToast('Purchase order created — supplier notified.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create purchase order';
      setPoError(msg);
      showToast(msg, 'error');
    } finally {
      setPoSaving(false);
    }
  }

  function openReassignModal(poId) {
    setReassignForm({ poId, newSupplierId: '' });
    setReassignError('');
    setReassignModalOpen(true);
  }

  async function handleReassign() {
    if (reassignSaving) return;
    setReassignError('');
    if (!reassignForm.newSupplierId) {
      setReassignError('Choose a supplier to reassign to');
      return;
    }
    setReassignSaving(true);
    try {
      await reassignPurchaseOrder(reassignForm.poId, reassignForm.newSupplierId);
      setReassignModalOpen(false);
      if (selectedId) getSupplier(selectedId).then((res) => setDetail(res.data));
      showToast('Order reassigned — new supplier notified.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reassign order';
      setReassignError(msg);
      showToast(msg, 'error');
    } finally {
      setReassignSaving(false);
    }
  }

  async function handleReceiveDelivery(poId) {
    if (deliveringId) return;
    if (!window.confirm('Confirm this delivery has physically arrived? This will add the confirmed quantities to your inventory.')) {
      return;
    }
    setDeliveringId(poId);
    try {
      await receiveDelivery(poId);
      if (selectedId) getSupplier(selectedId).then((res) => setDetail(res.data));
      showToast('Delivery received — inventory updated.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark as delivered', 'error');
    } finally {
      setDeliveringId(null);
    }
  }

  return (
    <Layout title="Inventory System">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background">Supplier Directory</h2>
          <p className="font-body-md text-body-md text-secondary mt-xs">
            Manage vendors, lead times, and active purchase orders.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="bg-primary text-on-primary font-body-md text-body-md py-sm px-lg rounded flex items-center justify-center gap-sm hover:bg-surface-tint transition-colors w-full sm:w-auto"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add Supplier
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <StatBox label="Active Suppliers" value={stats.activeSuppliers} icon="storefront" />
          <StatBox label="Pending Orders" value={stats.pendingOrders} icon="pending_actions" />
          <StatBox label="Avg Lead Time" value={`${stats.avgLeadTime} days`} icon="schedule" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-1 bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col h-[600px]">
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Directory</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {suppliers.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`p-md border-b border-outline-variant cursor-pointer transition-colors ${
                  selectedId === s.id
                    ? 'border-l-4 border-l-primary bg-primary-fixed/30'
                    : 'hover:bg-surface-container-low'
                }`}
              >
                <div className="flex justify-between items-start mb-xs">
                  <h4 className="font-headline-sm text-body-lg font-bold text-on-surface">{s.name}</h4>
                  <StatusBadge status={s.status} />
                </div>
                <div className="font-body-sm text-body-sm text-secondary mb-sm">
                  {s.categories.join(', ')}
                </div>
                <div className="flex justify-between text-body-sm font-body-sm">
                  <span className="text-secondary">
                    Lead Time: <span className="font-data-mono text-data-mono text-on-surface">{s.leadTimeDays} days</span>
                  </span>
                  <span className="text-secondary">Rating: {s.rating}/5</span>
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="p-md font-body-sm text-body-sm text-on-surface-variant">No suppliers yet.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-lg">
          {detail ? (
            <>
              <div className="bg-surface border border-outline-variant rounded-lg p-lg">
                <div className="flex justify-between items-start mb-lg">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">{detail.name}</h3>
                    <p className="font-body-md text-body-md text-secondary">
                      ID: <span className="font-data-mono text-data-mono">{detail.vendorId}</span>
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => openEditModal(detail)}
                      className="flex items-center gap-xs text-primary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-primary-fixed/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-secondary mt-0.5">mail</span>
                    <div>
                      <div className="font-body-sm text-body-sm text-secondary">Primary Contact</div>
                      <div className="font-body-md text-body-md text-on-surface">{detail.contactName}</div>
                      <div className="font-body-md text-body-md text-primary">{detail.contactEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-secondary mt-0.5">phone</span>
                    <div>
                      <div className="font-body-sm text-body-sm text-secondary">Support Line</div>
                      <div className="font-data-mono text-data-mono text-on-surface">{detail.contactPhone}</div>
                      {detail.phoneExt && (
                        <div className="font-body-sm text-body-sm text-secondary">Ext. {detail.phoneExt}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
                <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Purchase Orders</h3>
                  {canManage && (
                    <button
                      onClick={() => {
                        setPoForm({ ...EMPTY_PO_FORM, supplierId: detail.id });
                        setPoError('');
                        setPoModalOpen(true);
                      }}
                      className="flex items-center gap-xs text-primary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-primary-fixed/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Create Purchase Order
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-lowest border-b border-outline-variant">
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">PO Number</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">Needed By</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">Status</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase text-right">Amount</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">Reminders</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md">
                      {detail.orders?.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-sm font-body-sm text-on-surface-variant">
                            No purchase orders yet.
                          </td>
                        </tr>
                      )}
                      {detail.orders?.slice((poPage - 1) * PO_PAGE_SIZE, poPage * PO_PAGE_SIZE).map((o) => {
                        const lines = Array.isArray(o.items?.lines) ? o.items.lines : [];
                        const isExpanded = expandedPoId === o.id;
                        return (
                          <React.Fragment key={o.id}>
                            <tr className="border-b border-outline-variant hover:bg-[#F0F7FF] transition-colors">
                              <td className="p-sm">
                                <button
                                  onClick={() => setExpandedPoId(isExpanded ? null : o.id)}
                                  disabled={lines.length === 0}
                                  className="flex items-center gap-xs font-data-mono text-data-mono text-on-surface disabled:cursor-default"
                                >
                                  {lines.length > 0 && (
                                    <span className="material-symbols-outlined text-[16px] text-secondary">
                                      {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                  )}
                                  {o.poNumber}
                                </button>
                              </td>
                              <td className="p-sm text-on-surface-variant">
                                {o.neededByDate ? new Date(o.neededByDate).toDateString() : '—'}
                              </td>
                              <td className="p-sm">
                                <StatusBadge status={o.status} />
                              </td>
                              <td className="p-sm font-data-mono text-data-mono text-on-surface text-right">
                                {formatCurrency(o.amount)}
                              </td>
                              <td className="p-sm text-on-surface-variant">{o.reminderCount || 0} sent</td>
                              <td className="p-sm">
                                {canManage && o.status === 'Approved' && (
                                  <button
                                    onClick={() => handleReceiveDelivery(o.id)}
                                    disabled={deliveringId === o.id}
                                    className="flex items-center gap-xs text-tertiary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-tertiary-fixed/30 transition-colors whitespace-nowrap disabled:opacity-50"
                                  >
                                    {deliveringId === o.id ? (
                                      <Spinner />
                                    ) : (
                                      <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                                    )}
                                    {deliveringId === o.id ? 'Receiving...' : 'Mark as Delivered'}
                                  </button>
                                )}
                                {canManage && o.reassignmentAvailable && (
                                  <button
                                    onClick={() => openReassignModal(o.id)}
                                    className="flex items-center gap-xs text-error font-body-sm text-body-sm py-xs px-sm rounded hover:bg-error-container/30 transition-colors whitespace-nowrap"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">redo</span>
                                    Reassign
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                                <td colSpan="6" className="p-sm">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr>
                                        <th className="p-xs font-label-caps text-[10px] text-secondary uppercase">Medicine</th>
                                        <th className="p-xs font-label-caps text-[10px] text-secondary uppercase text-right">Ordered</th>
                                        <th className="p-xs font-label-caps text-[10px] text-secondary uppercase text-right">
                                          Approved Qty
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((line, i) => (
                                        <tr key={i} className="border-t border-outline-variant">
                                          <td className="p-xs text-on-surface font-body-sm">{line.name}</td>
                                          <td className="p-xs text-on-surface-variant text-right font-data-mono text-body-sm">
                                            {line.quantity}
                                          </td>
                                          <td className="p-xs text-right font-data-mono text-body-sm">
                                            {line.fulfilledQuantity === undefined ? (
                                              <span className="text-on-surface-variant">— awaiting response —</span>
                                            ) : line.fulfilledQuantity < line.quantity ? (
                                              <span className="text-error font-semibold">
                                                {line.fulfilledQuantity} (short by {line.quantity - line.fulfilledQuantity})
                                              </span>
                                            ) : (
                                              <span className="text-tertiary font-semibold">{line.fulfilledQuantity}</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {detail.orders?.length > 0 && (
                  <div className="bg-surface border-t border-outline-variant px-md py-3 flex items-center justify-between">
                    <p className="text-body-sm text-on-surface-variant font-body-sm">
                      Page <span className="font-medium text-on-surface">{poPage}</span> of{' '}
                      <span className="font-medium text-on-surface">
                        {Math.max(1, Math.ceil(detail.orders.length / PO_PAGE_SIZE))}
                      </span>{' '}
                      &middot; {detail.orders.length} results
                    </p>
                    <div className="flex gap-xs">
                      <button
                        disabled={poPage <= 1}
                        onClick={() => setPoPage((p) => p - 1)}
                        className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        disabled={poPage >= Math.ceil(detail.orders.length / PO_PAGE_SIZE)}
                        onClick={() => setPoPage((p) => p + 1)}
                        className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-surface border border-outline-variant rounded-lg p-lg text-on-surface-variant font-body-md">
              Select a supplier to view details.
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Supplier' : 'Add Supplier'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="bg-surface-container-high border border-outline text-on-surface font-body-md py-sm px-md rounded hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-sm"
            >
              {saving && <Spinner />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <Field label="Vendor ID" value={form.vendorId} onChange={(v) => setForm({ ...form, vendorId: v })} />
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field
            label="Categories (comma separated)"
            value={form.categories}
            onChange={(v) => setForm({ ...form, categories: v })}
          />
          <Field
            label="Lead Time (days)"
            type="number"
            value={form.leadTimeDays}
            onChange={(v) => setForm({ ...form, leadTimeDays: Number(v) })}
          />
          <Field label="Contact Name" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
          <Field label="Contact Email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} />
          <Field label="Contact Phone" value={form.contactPhone} onChange={(v) => setForm({ ...form, contactPhone: v })} />
          <div className="sm:col-span-2">
            <Field
              label={editingId ? 'Portal Password (leave blank to keep unchanged)' : 'Portal Password (optional)'}
              type="password"
              value={form.portalPassword}
              onChange={(v) => setForm({ ...form, portalPassword: v })}
            />
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
              Set this so the supplier can log in to the Supplier Portal at{' '}
              <span className="font-data-mono text-data-mono">/supplier/login</span> using their Contact Email
              above. Leave blank if they shouldn't have portal access.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={poModalOpen}
        title="Create Purchase Order"
        onClose={() => setPoModalOpen(false)}
        footer={
          <>
            <button
              onClick={() => setPoModalOpen(false)}
              className="bg-surface-container-high border border-outline text-on-surface font-body-md py-sm px-md rounded hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePO}
              disabled={poSaving}
              className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-sm"
            >
              {poSaving && <Spinner />}
              {poSaving ? 'Creating...' : 'Create & Notify Supplier'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          {poError && (
            <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-sm">
              {poError}
            </div>
          )}
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Supplier</label>
            <select
              className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface"
              value={poForm.supplierId}
              onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
            >
              <option value="">— Select a supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Needed By Date"
            type="date"
            value={poForm.neededByDate}
            onChange={(v) => setPoForm({ ...poForm, neededByDate: v })}
          />

          <div className="flex flex-col gap-sm">
            <div className="flex justify-between items-center">
              <label className="font-label-caps text-label-caps text-on-surface uppercase">Medicines</label>
              <button
                onClick={addPoLine}
                className="flex items-center gap-xs text-primary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-primary-fixed/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Medicine
              </button>
            </div>
            {poForm.lineItems.map((li, i) => {
              const product = products.find((p) => p.id === li.productId);
              return (
                <div key={i} className="flex gap-sm items-center">
                  <select
                    className="flex-1 bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface"
                    value={li.productId}
                    onChange={(e) => updatePoLine(i, 'productId', e.target.value)}
                  >
                    <option value="">— Select medicine —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.price)}/unit)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={li.quantity}
                    onChange={(e) => updatePoLine(i, 'quantity', e.target.value)}
                    className="w-24 bg-surface border border-outline rounded p-sm font-data-mono text-data-mono text-on-surface text-right"
                  />
                  <span className="w-24 font-data-mono text-data-mono text-secondary text-right">
                    {product ? formatCurrency(product.price * (Number(li.quantity) || 0)) : '—'}
                  </span>
                  <button
                    onClick={() => removePoLine(i)}
                    disabled={poForm.lineItems.length === 1}
                    className="text-secondary hover:text-error transition-colors p-1 rounded disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center border-t border-outline-variant pt-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total</span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold">
              {formatCurrency(poTotal())}
            </span>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant">
            An email will be sent to the supplier's contact address asking them to approve or reject this order in
            the Supplier Portal. When they approve, the quantities they confirm are added straight to your
            inventory.
          </p>
        </div>
      </Modal>

      <Modal
        open={reassignModalOpen}
        title="Reassign Purchase Order"
        onClose={() => setReassignModalOpen(false)}
        footer={
          <>
            <button
              onClick={() => setReassignModalOpen(false)}
              className="bg-surface-container-high border border-outline text-on-surface font-body-md py-sm px-md rounded hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReassign}
              disabled={reassignSaving}
              className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-sm"
            >
              {reassignSaving && <Spinner />}
              {reassignSaving ? 'Reassigning...' : 'Reassign'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            This supplier hasn't responded after two reminders. Choose a different supplier to send this order to
            instead — the original order will be marked Reassigned and a new one created.
          </p>
          {reassignError && (
            <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-sm">
              {reassignError}
            </div>
          )}
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">New Supplier</label>
            <select
              className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface"
              value={reassignForm.newSupplierId}
              onChange={(e) => setReassignForm({ ...reassignForm, newSupplierId: e.target.value })}
            >
              <option value="">— Select a supplier —</option>
              {suppliers
                .filter((s) => s.id !== selectedId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-lg flex flex-col justify-between">
      <div className="flex items-center justify-between text-secondary mb-md">
        <span className="font-body-sm text-body-sm uppercase tracking-wider">{label}</span>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="font-display-lg text-display-lg text-on-background">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-caps text-label-caps text-on-surface uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
      />
    </div>
  );
}
