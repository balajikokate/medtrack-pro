import axios from 'axios';

// Deliberately separate from the admin/staff client (api/client.js) and its own
// localStorage key — a supplier token must never be usable on admin routes or vice versa.
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('medtrack_supplier_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('medtrack_supplier_token');
      localStorage.removeItem('medtrack_supplier');
      if (window.location.pathname !== '/supplier/login') {
        window.location.href = '/supplier/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
