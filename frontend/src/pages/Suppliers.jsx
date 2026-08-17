import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { listSuppliers, getSupplier, createSupplier, updateSupplier, getSupplierStats } from '../api/suppliers';
import { formatCurrency } from '../utils/currency';

const EMPTY_FORM = {
  vendorId: '',
  name: '',
  categories: '',
  leadTimeDays: 3,
  rating: 4.5,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getSupplier(selectedId).then((res) => setDetail(res.data)).catch(() => {});
  }, [selectedId]);

  async function handleSave() {
    try {
      const payload = {
        ...form,
        categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
      };
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
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
    });
    setModalOpen(true);
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
        <button
          onClick={openAddModal}
          className="bg-primary text-on-primary font-body-md text-body-md py-sm px-lg rounded flex items-center justify-center gap-sm hover:bg-surface-tint transition-colors w-full sm:w-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Supplier
        </button>
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
                  <button
                    onClick={() => openEditModal(detail)}
                    className="flex items-center gap-xs text-primary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-primary-fixed/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
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
                <div className="p-md border-b border-outline-variant bg-surface-container-low">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Purchase Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-lowest border-b border-outline-variant">
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">PO Number</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">Date</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase">Status</th>
                        <th className="p-sm font-label-caps text-label-caps text-secondary uppercase text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md">
                      {detail.orders?.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-sm font-body-sm text-on-surface-variant">
                            No purchase orders yet.
                          </td>
                        </tr>
                      )}
                      {detail.orders?.map((o) => (
                        <tr key={o.id} className="border-b border-outline-variant hover:bg-[#F0F7FF] transition-colors">
                          <td className="p-sm font-data-mono text-data-mono text-on-surface">{o.poNumber}</td>
                          <td className="p-sm text-on-surface-variant">{o.date?.slice(0, 10)}</td>
                          <td className="p-sm">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="p-sm font-data-mono text-data-mono text-on-surface text-right">
                            {formatCurrency(o.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors"
            >
              Save
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
