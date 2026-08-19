import client from './client';

export const login = (email, password) => client.post('/auth/login', { email, password });
export const register = (data) => client.post('/auth/register', data);
export const getMe = () => client.get('/auth/me');
export const verifyPassword = (password) => client.post('/auth/verify-password', { password });
export const changePassword = (currentPassword, newPassword) =>
  client.put('/auth/change-password', { currentPassword, newPassword });
