import client from './supplierPortalClient';

export const supplierLogin = (email, password) => client.post('/supplier-auth/login', { email, password });
export const getSupplierMe = () => client.get('/supplier-auth/me');
export const listMyPurchaseOrders = (params) => client.get('/supplier-portal/purchase-orders', { params });
export const listPendingPOIds = () => client.get('/supplier-portal/purchase-orders/pending-ids');
export const approvePurchaseOrder = (id, fulfilledQuantities = {}, batchExpiryDates = {}) =>
  client.put(`/supplier-portal/purchase-orders/${id}/approve`, { fulfilledQuantities, batchExpiryDates });
export const rejectPurchaseOrder = (id) => client.put(`/supplier-portal/purchase-orders/${id}/reject`);
