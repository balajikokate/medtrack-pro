import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { listStaff, createStaff, updateStaff, getStaffStats } from '../api/staff';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const ROLES = ['Lead Pharmacist', 'Staff Pharmacist', 'Pharmacy Tech', 'Intern'];
const EMPTY_FORM = { name: '', role: ROLES[2], licenseId: '', email: '', phone: '', onDuty: true };

function initials(name) {
  return name
    .split(' ')
    .filter((w) => w.length > 1 || /[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}

export default function Staff() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'pharmacist';
  const canAdd = user?.role === 'admin';
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  async function fetchData() {
    try {
      const res = await listStaff({ role: roleFilter, status: statusFilter });
      setStaff(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff');
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    getStaffStats().then((res) => setStats(res.data)).catch(() => {});
  }, []);

  async function toggleDuty(member) {
    if (togglingId) return;
    setTogglingId(member.id);
    try {
      await updateStaff(member.id, { onDuty: !member.onDuty });
      fetchData();
      showToast(`${member.name} marked ${!member.onDuty ? 'on' : 'off'} duty.`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateStaff(editingId, form);
      } else {
        await createStaff(form);
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchData();
      getStaffStats().then((res) => setStats(res.data));
      showToast(editingId ? 'Staff member updated.' : 'Staff member added.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save staff member';
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

  function openEditModal(member) {
    setEditingId(member.id);
    setForm({
      name: member.name || '',
      role: member.role || ROLES[2],
      licenseId: member.licenseId || '',
      email: member.email || '',
      phone: member.phone || '',
      onDuty: member.onDuty,
    });
    setModalOpen(true);
  }

  return (
    <Layout title="Staff Directory">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-background mb-xs">Staff Directory</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Manage pharmacy personnel, roles, and current duty status.
          </p>
        </div>
        {canAdd && (
          <button
            onClick={openAddModal}
            className="bg-primary text-on-primary font-body-md text-body-md rounded py-sm px-md flex items-center justify-center gap-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined">person_add</span>
            Add Staff Member
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col justify-between h-24">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Staff</span>
            <span className="font-display-lg text-display-lg text-on-background">{stats.totalStaff}</span>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col justify-between h-24">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">On Duty Now</span>
            <div className="flex items-center gap-sm">
              <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
              <span className="font-display-lg text-display-lg text-on-background">{stats.onDuty}</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col justify-between h-24">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Lead Pharmacists</span>
            <span className="font-display-lg text-display-lg text-on-background">{stats.leadPharmacists}</span>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col justify-between h-24">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Pending Reviews</span>
            <span className="font-display-lg text-display-lg text-on-background">{stats.pendingReviews}</span>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface flex-wrap gap-sm">
          <div className="flex gap-sm">
            <select
              className="border border-outline-variant rounded bg-surface-container-lowest font-body-sm text-body-sm text-on-surface py-xs px-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="border border-outline-variant rounded bg-surface-container-lowest font-body-sm text-body-sm text-on-surface py-xs px-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="on_duty">On Duty</option>
              <option value="off_duty">Off Duty</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant uppercase">Name & Role</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant uppercase">License / ID</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant uppercase">Contact</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant uppercase">Status</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-[#F0F7FF] transition-colors group">
                  <td className="py-md px-md">
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-sm text-headline-sm">
                        {initials(s.name)}
                      </div>
                      <div>
                        <p className="font-body-md text-body-md font-medium text-on-background">{s.name}</p>
                        <p className="font-body-sm text-body-sm text-primary">{s.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-md px-md font-data-mono text-data-mono text-on-surface-variant">{s.licenseId}</td>
                  <td className="py-md px-md">
                    <div className="flex flex-col space-y-xs">
                      <a className="font-data-mono text-data-mono text-on-surface-variant hover:text-primary" href={`mailto:${s.email}`}>
                        {s.email}
                      </a>
                      <a className="font-data-mono text-data-mono text-on-surface-variant hover:text-primary" href={`tel:${s.phone}`}>
                        {s.phone}
                      </a>
                    </div>
                  </td>
                  <td className="py-md px-md">
                    <button
                      onClick={() => toggleDuty(s)}
                      disabled={togglingId === s.id || !canManage}
                      className={`inline-flex items-center gap-xs px-sm py-xs rounded-full font-label-caps text-label-caps uppercase border transition-colors disabled:opacity-50 ${
                        s.onDuty
                          ? 'bg-tertiary-container/10 text-tertiary border-tertiary-container/20'
                          : 'bg-surface-variant text-on-surface-variant border-outline-variant'
                      }`}
                    >
                      {togglingId === s.id ? (
                        <Spinner />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${s.onDuty ? 'bg-tertiary-container' : 'bg-outline'}`}></span>
                      )}
                      {s.onDuty ? 'On Duty' : 'Off Duty'}
                    </button>
                  </td>
                  <td className="py-md px-md">
                    {canManage && (
                      <button
                        onClick={() => openEditModal(s)}
                        className="flex items-center gap-xs text-primary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-primary-fixed/30 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-md px-md font-body-sm text-on-surface-variant">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col divide-y divide-outline-variant bg-surface-container-lowest">
          {staff.map((s) => (
            <div key={s.id} className="p-md space-y-sm">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-sm">
                  <div className="w-10 h-10 rounded bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-sm text-headline-sm">
                    {initials(s.name)}
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-background">{s.name}</p>
                    <p className="font-body-sm text-body-sm text-primary">{s.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleDuty(s)}
                  disabled={togglingId === s.id || !canManage}
                  className={`inline-flex items-center gap-xs px-sm py-xs rounded-full font-label-caps text-label-caps uppercase border disabled:opacity-50 ${
                    s.onDuty
                      ? 'bg-tertiary-container/10 text-tertiary border-tertiary-container/20'
                      : 'bg-surface-variant text-on-surface-variant border-outline-variant'
                  }`}
                >
                  {togglingId === s.id && <Spinner />}
                  {s.onDuty ? 'On Duty' : 'Off Duty'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-sm pt-xs">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">License</p>
                  <p className="font-data-mono text-data-mono text-on-background">{s.licenseId}</p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Phone</p>
                  <p className="font-data-mono text-data-mono text-on-background">{s.phone}</p>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => openEditModal(s)}
                  className="flex items-center gap-xs text-primary font-body-sm text-body-sm py-xs px-sm rounded hover:bg-primary-fixed/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Staff Member' : 'Add Staff Member'}
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
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Role</label>
            <select
              className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Field label="License / ID" value={form.licenseId} onChange={(v) => setForm({ ...form, licenseId: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
      </Modal>
    </Layout>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-caps text-label-caps text-on-surface uppercase">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
      />
    </div>
  );
}
