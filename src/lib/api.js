import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_URL });

let onUnauthorized = () => {};
// El handler recibe el motivo ('expired') para que el login muestre el aviso.
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) onUnauthorized('expired');
    return Promise.reject(error);
  },
);

export default api;

// Mensaje en lenguaje llano para un error de axios (plan 004, "Errores -> mensaje").
// duplicateHint: en crear/editar categoría o idioma un 500 suele ser un nombre o código repetido.
export function errorMessage(err, { duplicateHint = false } = {}) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (!err?.response) return 'Perdimos la conexión con el servidor. Lo que escribiste sigue aquí.';
  if (status === 400) {
    const detail = typeof data?.message === 'string' ? ` ${data.message}` : '';
    return `Algún dato no es válido. Revisa los campos marcados.${detail}`;
  }
  if (status === 409 && typeof data?.message === 'string') return data.message;
  if (status === 413) return 'La foto pesa más de 10 MB.';
  if (status === 500 && duplicateHint) return 'No se pudo guardar. Puede que ya exista otro con ese nombre o código.';
  return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
}
