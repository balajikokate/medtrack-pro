import client from './client';

export const listProducts = (params) => client.get('/products', { params });
export const getProduct = (id) => client.get(`/products/${id}`);
export const createProduct = (data) => client.post('/products', data);
export const updateProduct = (id, data) => client.put(`/products/${id}`, data);
export const deleteProduct = (id) => client.delete(`/products/${id}`);
export const getLowStock = () => client.get('/products/low-stock');
export const getProductBatches = (id) => client.get(`/products/${id}/batches`);
