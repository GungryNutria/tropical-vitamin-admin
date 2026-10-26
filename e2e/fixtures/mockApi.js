import { categories, languages, tours, user } from './data.js';

export const API = 'http://api.test';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

const json = (route, body, status = 200) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

// Una pequeña imagen válida para las fotos simuladas (GIF 1x1).
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Simula la API del admin con page.route. Devuelve `requests`, la bitácora de peticiones
 * ({ method, path, headers, body }), y `override(fn)` para cambiar respuestas en una prueba:
 * fn(request) devuelve { status, body } o undefined para dejar la respuesta normal.
 */
export async function mockApi(page, { authenticated = true, data = {} } = {}) {
  const { tours: tourData = tours, categories: categoryData = categories, languages: languageData = languages } = data;
  const requests = [];
  let override = () => undefined;

  if (authenticated) {
    await page.addInitScript((u) => {
      localStorage.setItem('adminToken', 'token-de-prueba');
      localStorage.setItem('adminUser', JSON.stringify(u));
    }, user);
  }

  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    const url = new URL(req.url());
    const path = url.pathname;
    const entry = { method: req.method(), path, headers: req.headers(), body: req.postData() };
    requests.push(entry);

    const forced = override(entry);
    if (forced) return json(route, forced.body ?? {}, forced.status ?? 200);

    if (req.method() === 'POST' && path === '/auth/login') return json(route, { access_token: 'token-de-prueba', user });
    if (path.startsWith('/upload/')) return route.fulfill({ status: 200, headers: cors, contentType: 'image/gif', body: PIXEL });
    if (req.method() === 'GET') {
      if (path === '/tours/all') return json(route, tourData);
      if (path === '/categories') return json(route, categoryData);
      if (path === '/languages') return json(route, languageData);
      const tourId = path.match(/^\/tours\/(\d+)$/);
      if (tourId) return json(route, tourData.find((t) => t.id === Number(tourId[1])) ?? null);
    }
    return json(route, {});
  });

  return { requests, override: (fn) => { override = fn; } };
}
