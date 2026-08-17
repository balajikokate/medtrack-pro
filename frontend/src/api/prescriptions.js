import client from './client';

export const listPrescriptions = (params) => client.get('/prescriptions', { params });
export const createPrescription = (data) => client.post('/prescriptions', data);
export const verifyPrescription = (id) => client.put(`/prescriptions/${id}/verify`);
export const updatePrescription = (id, data) => client.put(`/prescriptions/${id}`, data);
