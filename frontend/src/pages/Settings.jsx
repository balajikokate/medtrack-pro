import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getSettings, updateSettings } from '../api/settings';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function Settings() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings()
      .then((res) => setForm(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load settings'));
  }, []);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await updateSettings(form);
      setForm(res.data);
      setMessage('Settings saved.');
      showToast('Settings saved.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save settings';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <Layout title="Settings">
        <div className="text-on-surface-variant font-body-md">Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout title="System Settings">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-lg">
        {error && (
          <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-tertiary-container/10 text-tertiary font-body-sm text-body-sm rounded-lg p-md">
            {message}
          </div>
        )}

        <section className="bg-white border border-outline-variant rounded-lg p-lg">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-md">Pharmacy Profile</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
            Update your core facility information used for invoicing and regulatory compliance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Field label="Facility Name" value={form.facilityName} onChange={(v) => setForm({ ...form, facilityName: v })} />
            <Field label="Tax ID / EIN" value={form.taxId} onChange={(v) => setForm({ ...form, taxId: v })} mono />
            <div className="md:col-span-2">
              <Field label="Store Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            </div>
            <Field
              label="Contact Number"
              value={form.contactNumber}
              onChange={(v) => setForm({ ...form, contactNumber: v })}
              mono
            />
            <Field
              label="Compliance Officer"
              value={form.complianceOfficer}
              onChange={(v) => setForm({ ...form, complianceOfficer: v })}
            />
            <div className="md:col-span-2">
              <Field
                label="Admin Notification Email"
                value={form.adminEmail}
                onChange={(v) => setForm({ ...form, adminEmail: v })}
              />
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                Where you're notified when a supplier approves or rejects a purchase order.
              </p>
            </div>
          </div>
          <div className="mt-lg flex justify-end items-center gap-md">
            {!isAdmin && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Only an admin can change facility settings.
              </p>
            )}
            {isAdmin && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors disabled:opacity-60 flex items-center gap-sm"
              >
                {saving && <Spinner />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </section>

        <section className="bg-white border border-outline-variant rounded-lg p-lg">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-md">System Status</h3>
          <div className="flex flex-col gap-md">
            <StatusRow
              title="Low Stock Detection"
              description="Products are automatically flagged Low Stock or Critical Low on the Inventory page once quantity drops below Min Level — always on, no setup needed."
            />
            <StatusRow
              title="Database Backups"
              description="Handled at the infrastructure level by your Postgres host, not by this app. If you're on Neon, point-in-time recovery is included automatically — check your plan's retention window."
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange, mono = false }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-caps text-label-caps text-on-surface uppercase">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-surface border border-outline rounded p-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
          mono ? 'font-data-mono text-data-mono' : 'font-body-md text-body-md'
        }`}
      />
    </div>
  );
}

function StatusRow({ title, description }) {
  return (
    <div className="flex items-start justify-between gap-md border-b border-surface-container pb-md last:border-0 last:pb-0">
      <div>
        <h4 className="font-body-md text-body-md font-semibold text-on-surface">{title}</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-tertiary bg-tertiary-container/10 border border-tertiary-container/20 px-sm py-xs rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
        Active
      </span>
    </div>
  );
}
