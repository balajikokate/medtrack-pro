import client from './client';

export const listSales = (params) => client.get('/sales', { params });
export const getRecentSales = () => client.get('/sales/recent');
export const createSale = (data) => client.post('/sales', data);
