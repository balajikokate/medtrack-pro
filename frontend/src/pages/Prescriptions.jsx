import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { listPrescriptions, verifyPrescription, createPrescription } from '../api/prescriptions';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  type: 'digital',
  patientName: '',
  doctorName: '',
  medication: '',
  quantity: 30,
  dateIssued: new Date().toISOString().slice(0, 10),
};

export default function Prescriptions() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canVerify = user?.role === 'admin' || user?.role === 'pharmacist';
  const [prescriptions, setPrescriptions] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, verified: 0, expired: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  async function fetchData() {
    try {
      const res = await listPrescriptions({ search, status: statusFilter });
      setPrescriptions(res.data.data);
      setCounts(res.data.counts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load prescriptions');
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  async function handleVerify(id) {
    if (verifyingId) return;
    setVerifyingId(id);
    try {
      await verifyPrescription(id);
      fetchData();
      showToast('Prescription verified.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to verify';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleCreate() {
    if (saving) return;
    setSaving(true);
    try {
      await createPrescription(form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      fetchData();
      showToast('Prescription added.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create prescription';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  const filterTabs = [
    { key: '', label: 'All', count: counts.all },
    { key: 'Pending', label: 'Pending Verification', count: counts.pending },
    { key: 'Verified', label: 'Verified', count: counts.verified },
    { key: 'Expired', label: 'Expired', count: counts.expired },
  ];

  return (
    <Layout title="Inventory System">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background mb-xs">Prescription Management</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Verify and manage active prescriptions.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-primary text-on-primary font-body-md text-body-md py-sm px-md rounded flex items-center gap-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Prescription
        </button>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
          {error}
        </div>
      )}

      <div className="bg-surface border border-outline-variant rounded p-sm flex flex-col lg:flex-row gap-md items-center shadow-sm">
        <div className="relative w-full lg:w-96 flex-1">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            className="w-full pl-xl pr-sm py-sm bg-surface border border-outline-variant rounded focus:border-primary focus:ring-2 focus:ring-primary-fixed focus:outline-none font-body-md text-body-md text-on-surface placeholder:text-outline transition-all"
            placeholder="Search by Rx ID, Patient, or Doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-sm w-full lg:w-auto overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 font-label-caps text-label-caps px-md py-sm rounded-full flex items-center gap-xs uppercase tracking-wider transition-colors ${
                statusFilter === tab.key
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface text-on-surface-variant border border-outline-variant hover:bg-surface-variant'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="font-data-mono text-data-mono bg-outline-variant/50 px-xs rounded-sm ml-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline-variant font-label-caps text-label-caps text-secondary uppercase tracking-wider">
            <tr>
              <th className="px-md py-sm font-medium w-12 text-center">Type</th>
              <th className="px-md py-sm font-medium">Rx ID</th>
              <th className="px-md py-sm font-medium">Patient</th>
              <th className="px-md py-sm font-medium">Doctor</th>
              <th className="px-md py-sm font-medium">Medication</th>
              <th className="px-md py-sm font-medium text-right">Date Issued</th>
              <th className="px-md py-sm font-medium text-center">Status</th>
              <th className="px-md py-sm font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant">
            {prescriptions.length === 0 && (
              <tr>
                <td colSpan="8" className="p-md text-center font-body-sm text-on-surface-variant">
                  No prescriptions found.
                </td>
              </tr>
            )}
            {prescriptions.map((rx) => (
              <tr key={rx.id} className="hover:bg-[#F0F7FF] transition-colors">
                <td className="px-md py-md text-center">
                  <span className="material-symbols-outlined text-outline">
                    {rx.type === 'digital' ? 'phone_iphone' : 'description'}
                  </span>
                </td>
                <td className="px-md py-md font-data-mono text-data-mono text-secondary">{rx.rxId}</td>
                <td className="px-md py-md font-medium">{rx.patientName}</td>
                <td className="px-md py-md text-on-surface-variant">{rx.doctorName}</td>
                <td className="px-md py-md">
                  <div className="flex flex-col gap-xs">
                    <span>{rx.medication}</span>
                    <span className="font-data-mono text-data-mono text-secondary">QTY: {rx.quantity}</span>
                  </div>
                </td>
                <td className="px-md py-md font-data-mono text-data-mono text-right text-secondary">
                  {rx.dateIssued?.slice(0, 10)}
                </td>
                <td className="px-md py-md text-center">
                  <StatusBadge status={rx.status} />
                </td>
                <td className="px-md py-md text-right">
                  {rx.status === 'Pending' && canVerify ? (
                    <button
                      onClick={() => handleVerify(rx.id)}
                      disabled={verifyingId === rx.id}
                      className="bg-tertiary-container text-on-tertiary font-body-sm text-body-sm px-md py-xs rounded hover:bg-tertiary transition-colors inline-flex items-center gap-xs disabled:opacity-50"
                    >
                      {verifyingId === rx.id ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                      {verifyingId === rx.id ? 'Verifying...' : 'Verify'}
                    </button>
                  ) : (
                    <span className="text-secondary font-body-sm text-body-sm">&mdash;</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title="New Prescription"
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
              onClick={handleCreate}
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
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Type</label>
            <select
              className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="digital">Digital</option>
              <option value="physical">Physical</option>
            </select>
          </div>
          <Field label="Patient Name" value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
          <Field label="Doctor Name" value={form.doctorName} onChange={(v) => setForm({ ...form, doctorName: v })} />
          <Field label="Medication" value={form.medication} onChange={(v) => setForm({ ...form, medication: v })} />
          <Field
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(v) => setForm({ ...form, quantity: Number(v) })}
          />
          <Field
            label="Date Issued"
            type="date"
            value={form.dateIssued}
            onChange={(v) => setForm({ ...form, dateIssued: v })}
          />
        </div>
      </Modal>
    </Layout>
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
