import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { listProducts } from '../api/products';
import { createSale } from '../api/sales';
import { verifyPassword } from '../api/auth';
import { formatCurrency } from '../utils/currency';

export default function SalesPOS() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authChecking, setAuthChecking] = useState(false);

  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      listProducts({ search, limit: 6 })
        .then((res) => setResults(res.data.data))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          category: product.category,
          form: product.form,
          price: product.price,
          quantity: 1,
          requiresPrescription: product.requiresPrescription,
        },
      ];
    });
    setSearch('');
    setResults([]);
  }

  function updateQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const needsAuthorization = cart.some((i) => i.requiresPrescription);

  async function submitSale() {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await createSale({
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customerName,
        paymentMethod,
      });
      setSuccess(`Sale ${res.data.txnNumber} completed — total ${formatCurrency(res.data.total)}`);
      setCart([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayClick() {
    if (cart.length === 0) return;
    if (needsAuthorization) {
      setAuthPassword('');
      setAuthError('');
      setAuthOpen(true);
      return;
    }
    submitSale();
  }

  async function handleAuthorize() {
    setAuthChecking(true);
    setAuthError('');
    try {
      const res = await verifyPassword(authPassword);
      if (!res.data.valid) {
        setAuthError(res.data.message || 'Incorrect password');
        return;
      }
      setAuthOpen(false);
      setAuthPassword('');
      submitSale();
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authorization check failed');
    } finally {
      setAuthChecking(false);
    }
  }

  return (
    <Layout title="Sales POS">
      <div className="flex flex-col lg:flex-row gap-lg h-full">
        <div className="flex-1 flex flex-col gap-md min-w-0">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-sm flex items-center gap-sm shadow-sm relative focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-secondary ml-sm">search</span>
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 text-body-md font-body-md placeholder:text-secondary text-on-surface py-sm px-sm outline-none"
              placeholder="Search medicine by name, NDC or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {results.length > 0 && (
            <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex justify-between items-center px-md py-sm hover:bg-[#F0F7FF] transition-colors text-left border-b border-outline-variant last:border-0"
                >
                  <div>
                    <p className="font-body-md text-body-md font-semibold text-on-surface">{p.name}</p>
                    <p className="font-body-sm text-body-sm text-secondary">
                      {p.category} &middot; Stock: {p.quantity}
                    </p>
                  </div>
                  <p className="font-data-mono text-data-mono text-on-surface">{formatCurrency(p.price)}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col shadow-sm overflow-hidden min-h-[300px]">
            <div className="bg-surface-container-low px-md py-sm flex items-center border-b border-outline-variant">
              <div className="flex-[3] font-label-caps text-label-caps text-secondary uppercase tracking-wider">Item</div>
              <div className="flex-1 text-center font-label-caps text-label-caps text-secondary uppercase tracking-wider">Qty</div>
              <div className="flex-1 text-right font-label-caps text-label-caps text-secondary uppercase tracking-wider">Price</div>
              <div className="flex-1 text-right font-label-caps text-label-caps text-secondary uppercase tracking-wider">Total</div>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 && (
                <p className="p-md font-body-sm text-body-sm text-on-surface-variant">Cart is empty — search for a product above.</p>
              )}
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className={`flex items-center px-md py-sm border-b border-surface-container group hover:bg-[#F0F7FF] transition-colors ${
                    item.requiresPrescription ? 'bg-error-container/10' : ''
                  }`}
                >
                  <div className="flex-[3] flex flex-col">
                    <div className="flex items-center gap-sm">
                      <span className="font-body-md text-on-surface font-semibold">{item.name}</span>
                      {item.requiresPrescription && (
                        <span
                          className="material-symbols-outlined text-error text-[16px]"
                          title="Prescription Required"
                        >
                          warning
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-secondary">
                      {item.category} &middot; {item.form}
                    </span>
                  </div>
                  <div className="flex-1 flex justify-center items-center gap-xs">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="w-6 h-6 rounded-md bg-surface-container-high flex items-center justify-center text-secondary hover:bg-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="font-data-mono text-data-mono px-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="w-6 h-6 rounded-md bg-surface-container-high flex items-center justify-center text-secondary hover:bg-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                  <div className="flex-1 text-right font-data-mono text-data-mono text-secondary">
                    {formatCurrency(item.price)}
                  </div>
                  <div className="flex-1 text-right font-data-mono text-data-mono font-semibold text-on-surface">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                  <div className="w-10 flex justify-end">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-error/70 hover:text-error transition-colors p-xs rounded-full hover:bg-error-container/50"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
            <span className="font-label-caps text-label-caps text-secondary uppercase">Customer</span>
            <input
              className="w-full mt-sm bg-surface border border-outline-variant rounded-lg p-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
            <span className="font-label-caps text-label-caps text-secondary uppercase">Payment Method</span>
            <select
              className="w-full mt-sm bg-surface border border-outline-variant rounded-lg p-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0px_4px_20px_rgba(15,82,186,0.08)] flex flex-col overflow-hidden flex-1 justify-between">
            <div className="p-md space-y-sm">
              <div className="flex justify-between items-center text-secondary">
                <span className="font-body-md">Subtotal</span>
                <span className="font-data-mono text-data-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-secondary border-b border-outline-variant pb-sm">
                <span className="font-body-md">GST (8%)</span>
                <span className="font-data-mono text-data-mono">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between items-end pt-sm">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total</span>
                <span className="font-display-lg text-display-lg text-primary font-bold tracking-tight">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            <div className="p-md bg-surface pt-0 mt-auto flex flex-col gap-sm">
              {error && (
                <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-tertiary-container/10 text-tertiary font-body-sm text-body-sm rounded-lg p-sm">
                  {success}
                </div>
              )}
              {needsAuthorization && cart.length > 0 && (
                <div className="flex items-center gap-xs font-body-sm text-body-sm text-error">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Admin authorization required before payment
                </div>
              )}
              <button
                onClick={handlePayClick}
                disabled={cart.length === 0 || submitting}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-headline-sm text-headline-sm py-md rounded-lg flex items-center justify-center gap-sm shadow-sm transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">{needsAuthorization ? 'lock' : 'payments'}</span>
                {submitting ? 'Processing...' : needsAuthorization ? `Authorize & Pay ${formatCurrency(total)}` : `Pay ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={authOpen}
        title="Admin Authorization Required"
        onClose={() => setAuthOpen(false)}
        footer={
          <>
            <button
              onClick={() => setAuthOpen(false)}
              className="bg-surface-container-high border border-outline text-on-surface font-body-md py-sm px-md rounded hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthorize}
              disabled={!authPassword || authChecking}
              className="bg-primary text-on-primary font-body-md py-sm px-md rounded hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {authChecking ? 'Verifying...' : 'Authorize & Pay'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            This sale includes one or more medicines that require a prescription. Enter the admin password to
            authorize this sale before payment is processed.
          </p>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Admin Password</label>
            <input
              type="password"
              autoFocus
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && authPassword && !authChecking && handleAuthorize()}
              className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          {authError && (
            <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-sm">
              {authError}
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
