import client from './client';

export const listStaff = (params) => client.get('/staff', { params });
export const createStaff = (data) => client.post('/staff', data);
export const updateStaff = (id, data) => client.put(`/staff/${id}`, data);
export const deleteStaff = (id) => client.delete(`/staff/${id}`);
export const getStaffStats = () => client.get('/staff/stats');
