import client from './client';

export const listSuppliers = () => client.get('/suppliers');
export const getSupplier = (id) => client.get(`/suppliers/${id}`);
export const createSupplier = (data) => client.post('/suppliers', data);
export const updateSupplier = (id, data) => client.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => client.delete(`/suppliers/${id}`);
export const createPurchaseOrder = (data) => client.post('/suppliers/purchase-orders', data);
export const reassignPurchaseOrder = (id, newSupplierId) =>
  client.post(`/suppliers/purchase-orders/${id}/reassign`, { newSupplierId });
export const getRecentPOResponses = () => client.get('/suppliers/purchase-orders/recent-responses');
export const receiveDelivery = (id) => client.post(`/suppliers/purchase-orders/${id}/receive`);
export const getSupplierStats = () => client.get('/suppliers/stats');
