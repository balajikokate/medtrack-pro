import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupplierAuth } from '../../context/SupplierAuthContext';
import Spinner from '../../components/Spinner';

export default function SupplierLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useSupplierAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/supplier');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-md">
      <div className="w-full max-w-sm bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_20px_rgba(15,82,186,0.08)] p-xl">
        <div className="flex flex-col items-center gap-sm mb-lg text-center">
          <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined text-[28px]">local_shipping</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-primary font-bold mt-sm">Supplier Portal</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">MedTrack Pro — Purchase Order Approvals</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg p-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg p-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-sm w-full bg-primary hover:bg-primary-container text-on-primary rounded-lg py-sm px-md flex items-center justify-center gap-sm font-body-md text-body-md transition-colors shadow-sm disabled:opacity-60"
          >
            {loading && <Spinner />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-lg">
          Use the email and password your pharmacy set up for you. Contact them if you don't have one yet.
        </p>
      </div>
    </div>
  );
}
