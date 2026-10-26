import { test, expect } from '@playwright/test';
import { API } from './fixtures/mockApi.js';
import { expectNoBlockingAxe, noOverflow, open } from './fixtures/catalog.js';

// Axe sin serious/critical y barrido de anchos de Inicio, Categorías e Idiomas (T-10; RNF-3, RNF-4; AC-UX-12).
test.describe('Accesibilidad (axe)', () => {
  test('Inicio: con pendientes, al día y con error', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('list', { name: 'Pendientes del catálogo' })).toBeVisible();
    await expectNoBlockingAxe(page);
    await open(page, '/', { clean: true });
    await expect(page.getByText('Todo al día')).toBeVisible();
    await expectNoBlockingAxe(page);
    await page.route(`${API}/categories`, (route) => route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{}' }));
    await page.reload();
    await expect(page.getByText('No pudimos cargar los pendientes.')).toBeVisible();
    await expectNoBlockingAxe(page);
  });

  test('Categorías: lista, panel con errores, bloqueo y confirmación de borrado', async ({ page }) => {
    await open(page, '/categories');
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expectNoBlockingAxe(page);
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /Revisa/ })).toBeVisible();
    await expectNoBlockingAxe(page);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Eliminar «Islas»' }).click();
    await expect(page.getByRole('button', { name: 'Entendido' })).toBeFocused();
    await expectNoBlockingAxe(page);
    await page.getByRole('button', { name: 'Entendido' }).click();
    await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
    await expect(page.getByRole('dialog', { name: /¿Eliminar/ }).getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await expectNoBlockingAxe(page);
  });

  test('Categorías: panel con guardado parcial', async ({ page }) => {
    const api = await open(page, '/categories');
    api.override((r) => (r.path === '/categories/5/translations/2' && r.method === 'PATCH' ? { status: 500, body: {} } : undefined));
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await page.getByLabel('Descripción interna').fill('Otra');
    await page.getByLabel('Nombre visible (English)').fill('Theme parks');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se guardó todo' })).toBeVisible();
    await expectNoBlockingAxe(page);
  });

  test('Idiomas: lista, panel (nuevo, protegido, desactivar) y borrado', async ({ page }) => {
    await open(page, '/languages', { frActive: true });
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await expectNoBlockingAxe(page);
    await page.getByRole('button', { name: 'Editar «Español»' }).click();
    await expectNoBlockingAxe(page);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Editar «Français»' }).click();
    await page.getByRole('switch', { name: 'Idioma activo' }).click();
    await expect(page.getByText('La web no cambia; este idioma deja de contar como pendiente.')).toBeVisible();
    await expectNoBlockingAxe(page);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Salir y descartar' }).click();
    await page.getByRole('button', { name: 'Eliminar «Français»' }).click();
    await expect(page.getByRole('dialog', { name: /¿Eliminar el idioma/ }).getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await expectNoBlockingAxe(page);
  });
});

test.describe('Barrido de anchos (sin scroll horizontal)', () => {
  for (const width of [1440, 1280, 768, 390]) {
    for (const [name, url, ready] of [
      ['Inicio', '/', (p) => p.getByRole('list', { name: 'Pendientes del catálogo' })],
      ['Categorías', '/categories', (p) => p.getByLabel('Categorías', { exact: true })],
      ['Idiomas', '/languages', (p) => p.getByLabel('Idiomas', { exact: true })],
    ]) {
      test(`${name} a ${width}`, async ({ page }) => {
        await open(page, url, { width, height: 844 });
        await expect(ready(page)).toBeVisible();
        expect(await noOverflow(page)).toBe(true);
        await expectNoBlockingAxe(page);
      });
    }
  }

  test('a 390 el panel de categoría ocupa la pantalla y no desborda; sus controles miden 44', async ({ page }) => {
    await open(page, '/categories', { width: 390, height: 844 });
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar categoría' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.width).toBe(390);
    expect(await noOverflow(page)).toBe(true);
    for (const name of ['Cerrar panel', 'Cancelar', 'Guardar']) {
      const b = await dialog.getByRole('button', { name }).boundingBox();
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await expectNoBlockingAxe(page);
  });

  test('a 390 las acciones de las tarjetas miden 44 y el idioma muestra sus conteos', async ({ page }) => {
    await open(page, '/languages', { width: 390, height: 844 });
    await expect(page.getByText('Textos de tours: 12 de 39 · de categorías: 3 de 10')).toBeVisible();
    for (const name of ['Editar «Français»', 'Eliminar «Français»']) {
      const b = await page.getByRole('button', { name }).boundingBox();
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });
});
