import { test, expect } from '@playwright/test';
import { API } from './fixtures/mockApi.js';
import { open } from './fixtures/catalog.js';

// AC-26 (REQ-29): Inicio, Categorías e Idiomas tienen cargando, vacío, error con Reintentar y con datos
// (Tours y Edición de tour están en tours-list y tour-edit). AC-UX-9.
const fail = (page, path, state) =>
  page.route(`${API}${path}`, (route) => (state.on ? route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{}' }) : route.fallback()));
const slow = (page, path) =>
  page.route(`${API}${path}`, async (route) => {
    await new Promise((r) => setTimeout(r, 700));
    return route.fallback();
  });

test.describe('Estados de Categorías', () => {
  test('cargando: esqueleto; después, datos', async ({ page }) => {
    await open(page, '/categories');
    await slow(page, '/categories');
    await page.reload();
    await expect(page.getByLabel('Cargando')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva categoría' })).toBeHidden();
    await expect(page.locator('tbody tr')).toHaveCount(10);
  });

  test('error: mensaje con Reintentar que vuelve a pedir los datos', async ({ page }) => {
    const state = { on: true };
    await open(page, '/categories');
    await fail(page, '/categories', state);
    await page.reload();
    const error = page.getByRole('alert').filter({ hasText: 'No pudimos cargar las categorías.' });
    await expect(error).toContainText('Revisa tu conexión e intenta de nuevo.');
    state.on = false;
    await error.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(10);
  });

  test('vacío: sin icono, sin primario en el encabezado y "Crear la primera" abre el panel', async ({ page }) => {
    await open(page, '/categories', { data: { categories: [] } });
    await expect(page.getByText('Aún no hay categorías.')).toBeVisible();
    await expect(page.getByText('Crea la primera para organizar tus tours.')).toBeVisible();
    await expect(page.locator('[data-testid="ImageOutlinedIcon"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nueva categoría' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Crear la primera' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva categoría' })).toBeVisible();
  });
});

test.describe('Estados de Idiomas', () => {
  test('cargando y con datos', async ({ page }) => {
    await open(page, '/languages');
    await slow(page, '/languages');
    await page.reload();
    await expect(page.getByLabel('Cargando')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(3);
  });

  test('error con Reintentar (también si falla solo el conteo de tours)', async ({ page }) => {
    const state = { on: true };
    await open(page, '/languages');
    await fail(page, '/tours/all', state);
    await page.reload();
    const error = page.getByRole('alert').filter({ hasText: 'No pudimos cargar los idiomas.' });
    await expect(error).toBeVisible();
    state.on = false;
    await error.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(3);
  });
});
