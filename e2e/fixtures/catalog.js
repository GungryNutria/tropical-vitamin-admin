import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { categories, languages, tours } from './data.js';
import { mockApi } from './mockApi.js';

// Catálogo de Inicio, Categorías e Idiomas (T-10), copia profunda de la fixture base:
//  tours 1 y 2 sin foto · 3, 4 y 5 con el inglés en blanco · 6 inactivo · categoría 3 sin inglés
//  · fr (inactivo) con 12 textos de tours y 3 de categorías (para el borrado). Categorías con tours: todas (4 o 5);
//  la categoría 10 «Gastronomía» no tiene tours.
const fr = languages[2];

export function scenario({ frActive = false, clean = false } = {}) {
  const langs = languages.map((l) => ({ ...l, isActive: l.code === 'fr' ? frActive : l.isActive }));
  const cats = categories.map((c) => ({ ...c, _count: { ...c._count }, translations: c.translations.map((t) => ({ ...t })) }));
  const list = tours.map((t) => ({ ...t, translations: t.translations.map((x) => ({ ...x })) }));
  const byId = (id) => list.find((t) => t.id === id);
  if (!clean) {
    [1, 2].forEach((id) => (byId(id).img = null));
    [3, 4, 5].forEach((id) => (byId(id).translations[1].title = ''));
    cats[2].translations = cats[2].translations.slice(0, 1);
  }
  byId(6).isActive = false;
  for (let id = 1; id <= 12; id++) byId(id).translations.push({ languageId: 3, title: `Titre ${id}`, description: `Description ${id}`, language: fr });
  for (let i = 0; i < 3; i++) cats[i].translations.push({ languageId: 3, name: `Cat ${i}`, description: `Desc ${i}`, language: fr });
  cats.push({ id: 10, adminName: 'gastronomia', description: 'Comida local', _count: { tours: 0 }, translations: [
    { languageId: 1, name: 'Gastronomía', description: 'Sabores locales', language: languages[0] },
    { languageId: 2, name: 'Gastronomy', description: 'Local flavors', language: languages[1] },
  ] });
  return { tours: list, categories: cats, languages: langs };
}

export async function open(page, url, { width = 1440, height = 900, data = {}, ...options } = {}) {
  await page.setViewportSize({ width, height });
  const api = await mockApi(page, { data: { ...scenario(options), ...data } });
  // Un `alert`/`confirm` nativo es un fallo (REQ-28).
  page.on('dialog', (d) => {
    throw new Error(`Diálogo del navegador: ${d.message()}`);
  });
  await page.goto(url);
  return api;
}

export const writes = (requests) =>
  requests.filter((r) => ['POST', 'PATCH', 'DELETE'].includes(r.method)).map((r) => ({ method: r.method, path: r.path, body: r.body ? JSON.parse(r.body) : null }));

export const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

export async function expectNoBlockingAxe(page) {
  const found = (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(found).toEqual([]);
}
