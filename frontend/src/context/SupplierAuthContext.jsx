import React, { createContext, useContext, useEffect, useState } from 'react';
import * as portalApi from '../api/supplierPortal';

const SupplierAuthContext = createContext(null);

export function SupplierAuthProvider({ children }) {
  const [supplier, setSupplier] = useState(() => {
    const stored = localStorage.getItem('medtrack_supplier');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medtrack_supplier_token');
    if (!token) {
      setLoading(false);
      return;
    }
    portalApi
      .getSupplierMe()
      .then((res) => {
        setSupplier(res.data);
        localStorage.setItem('medtrack_supplier', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('medtrack_supplier_token');
        localStorage.removeItem('medtrack_supplier');
        setSupplier(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await portalApi.supplierLogin(email, password);
    localStorage.setItem('medtrack_supplier_token', res.data.token);
    localStorage.setItem('medtrack_supplier', JSON.stringify(res.data.supplier));
    setSupplier(res.data.supplier);
    return res.data.supplier;
  }

  function logout() {
    localStorage.removeItem('medtrack_supplier_token');
    localStorage.removeItem('medtrack_supplier');
    setSupplier(null);
  }

  return (
    <SupplierAuthContext.Provider value={{ supplier, login, logout, loading }}>
      {children}
    </SupplierAuthContext.Provider>
  );
}

export function useSupplierAuth() {
  return useContext(SupplierAuthContext);
}
