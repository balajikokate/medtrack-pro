import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getSettings, updateSettings } from '../api/settings';

export default function Settings() {
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
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await updateSettings(form);
      setForm(res.data);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
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
          </div>
          <div className="mt-lg flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>

        <section className="bg-white border border-outline-variant rounded-lg p-lg">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-md">System Automation</h3>
          <div className="flex flex-col gap-md">
            <ToggleRow
              title="Low Stock Alerts"
              description="Automatically notify suppliers when inventory falls below threshold."
              checked={form.lowStockAlerts}
              onChange={(v) => setForm({ ...form, lowStockAlerts: v })}
            />
            <ToggleRow
              title="Automated Backups"
              description="Perform daily secure backups of all prescription records to secure vault."
              checked={form.automatedBackups}
              onChange={(v) => setForm({ ...form, automatedBackups: v })}
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

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-container pb-md last:border-0 last:pb-0">
      <div>
        <h4 className="font-body-md text-body-md font-semibold text-on-surface">{title}</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  );
}
