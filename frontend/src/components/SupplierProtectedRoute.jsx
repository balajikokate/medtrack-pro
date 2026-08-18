import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSupplierAuth } from '../context/SupplierAuthContext';

export default function SupplierProtectedRoute({ children }) {
  const { supplier, loading } = useSupplierAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-on-surface-variant font-body-md">
        Loading...
      </div>
    );
  }

  if (!supplier) return <Navigate to="/supplier/login" replace />;
  return children;
}
