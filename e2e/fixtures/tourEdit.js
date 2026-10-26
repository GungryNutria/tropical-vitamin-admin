import { readFileSync } from 'node:fs';
import { mockApi } from './mockApi.js';
import { tours } from './data.js';

// Catálogo para la edición (V5): tour 1 completo (es y en), tour 4 "Snorkel & Buceo" sin inglés, tour 40 para el alta.
export function editCatalog() {
  const list = tours.map((t) => ({ ...t, translations: t.translations.map((x) => ({ ...x })) }));
  const byId = (id) => list.find((t) => t.id === id);
  Object.assign(byId(1), { adminTitle: 'cenotes', categoryId: 1, duration: 150, price: 1000, location: 'Cancún, México' });
  byId(1).translations[0] = { ...byId(1).translations[0], title: 'Cenotes', description: 'Nada en aguas cristalinas.' };
  byId(1).translations[1] = { ...byId(1).translations[1], title: 'Cenotes EN', description: 'Swim in clear water.' };
  Object.assign(byId(4), { adminTitle: 'snorkel-buceo', categoryId: 2, duration: 240, category: { id: 2, adminName: 'acuaticos' } });
  byId(4).translations = [{ ...byId(4).translations[0], title: 'Snorkel & Buceo', description: 'Nada entre peces y corales.' }];
  list.push({ ...byId(1), id: 40, adminTitle: 'nuevo-tour' });
  return list;
}

export async function openTour(page, url, { tours: data = editCatalog() } = {}) {
  const api = await mockApi(page, { data: { tours: data } });
  await page.goto(url);
  return api;
}

export const writes = (requests) =>
  requests.filter((r) => ['POST', 'PATCH'].includes(r.method) && r.path !== '/upload').map((r) => ({ method: r.method, path: r.path, body: JSON.parse(r.body) }));

export const uploads = (requests) => requests.filter((r) => r.method === 'POST' && r.path === '/upload');

export const fileOf = (name, mimeType, bytes) => ({ name, mimeType, buffer: Buffer.alloc(bytes) });

export const MB = 1024 * 1024;

export const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
