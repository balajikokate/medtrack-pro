import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { listProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { listSuppliers } from '../api/suppliers';

const EMPTY_FORM = {
  name: '',
  form: '',
  category: '',
  ndc: '',
  batchNo: '',
  expiryDate: '',
  quantity: 0,
  minLevel: 10,
  price: 0,
  requiresPrescription: false,
  supplierId: '',
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [suppliers, setSuppliers] = useState([]);
  const limit = 10;

  useEffect(() => {
    listSuppliers().then((res) => setSuppliers(res.data)).catch(() => {});
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await listProducts({ search, category, status, page, limit });
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, status, page]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      form: p.form || '',
      category: p.category,
      ndc: p.ndc || '',
      batchNo: p.batchNo || '',
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
      quantity: p.quantity,
      minLevel: p.minLevel,
      price: p.price,
      requiresPrescription: p.requiresPrescription,
      supplierId: p.supplierId || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await createProduct(form);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Layout title="Inventory System">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-md bg-surface-container-lowest p-md rounded-xl border border-outline-variant">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Medication Inventory</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Manage stock levels, expiry dates, and categories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-sm w-full lg:w-auto">
          <input
            className="bg-surface border border-outline-variant text-on-surface font-body-sm text-body-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Search name, NDC, batch..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="bg-surface border border-outline-variant text-on-surface font-body-sm text-body-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="critical_low">Critical Low</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={openCreate}
            className="bg-primary text-on-primary font-body-sm text-body-sm rounded-lg py-2 px-4 hover:bg-primary-container transition-colors flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
          {error}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-outline-variant text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Name</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Category</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Batch No</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Supplier</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Expiry Date</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Quantity</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Status</th>
                <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {loading && (
                <tr>
                  <td colSpan="8" className="p-md text-center font-body-sm text-on-surface-variant">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-md text-center font-body-sm text-on-surface-variant">
                    No products found.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#F0F7FF] transition-colors group">
                  <td className="px-md py-4 whitespace-nowrap">
                    <div className="font-body-md text-body-md font-semibold text-on-surface">{p.name}</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">{p.form}</div>
                  </td>
                  <td className="px-md py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-body-sm text-body-sm bg-surface-container text-on-surface-variant">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-md py-4 whitespace-nowrap font-data-mono text-data-mono text-on-surface-variant">
                    {p.batchNo}
                  </td>
                  <td className="px-md py-4 whitespace-nowrap font-body-sm text-body-sm text-on-surface-variant">
                    {p.supplier?.name || <span className="text-outline">—</span>}
                  </td>
                  <td className="px-md py-4 whitespace-nowrap font-data-mono text-data-mono text-on-surface-variant">
                    {p.expiryDate?.slice(0, 10)}
                  </td>
                  <td className="px-md py-4 whitespace-nowrap font-data-mono text-data-mono text-on-surface text-right">
                    {p.quantity.toLocaleString()}
                  </td>
                  <td className="px-md py-4 whitespace-nowrap">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-md py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-secondary hover:text-primary transition-colors p-1 rounded hover:bg-surface-container-highest"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-secondary hover:text-error transition-colors p-1 rounded hover:bg-error-container"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Product' : 'Add Product'}
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
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Form (e.g. Tablets)" value={form.form} onChange={(v) => setForm({ ...form, form: v })} />
          <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} required />
          <Field label="NDC" value={form.ndc} onChange={(v) => setForm({ ...form, ndc: v })} mono />
          <Field label="Batch No" value={form.batchNo} onChange={(v) => setForm({ ...form, batchNo: v })} mono />
          <Field
            label="Expiry Date"
            type="date"
            value={form.expiryDate}
            onChange={(v) => setForm({ ...form, expiryDate: v })}
            required
          />
          <Field
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(v) => setForm({ ...form, quantity: Number(v) })}
            mono
          />
          <Field
            label="Min Level"
            type="number"
            value={form.minLevel}
            onChange={(v) => setForm({ ...form, minLevel: Number(v) })}
            mono
          />
          <Field
            label="Price (₹)"
            type="number"
            value={form.price}
            onChange={(v) => setForm({ ...form, price: Number(v) })}
            mono
          />
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-label-caps text-on-surface uppercase">Supplier</label>
            <select
              className="w-full bg-surface border border-outline rounded p-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-sm mt-lg">
            <input
              type="checkbox"
              checked={form.requiresPrescription}
              onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
            />
            <span className="font-body-md text-body-md text-on-surface">Requires Prescription</span>
          </label>
        </div>
      </Modal>
    </Layout>
  );
}

function Field({ label, value, onChange, type = 'text', mono = false, required = false }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-caps text-label-caps text-on-surface uppercase">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-surface border border-outline rounded p-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
          mono ? 'font-data-mono text-data-mono' : 'font-body-md text-body-md'
        }`}
      />
    </div>
  );
}
