import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi.js';
import { openTour } from './fixtures/tourEdit.js';

// Sesión (T-9): REQ-2, AC-2, AC-33. Un 401 manda al login con aviso y, tras entrar, de vuelta a la ruta.
const expire = (api, path) => api.override((r) => (r.path === path ? { status: 401, body: { message: 'Unauthorized' } } : undefined));
const enter = async (page) => {
  await page.locator('#login-email').fill('admin@tropical-vitamin.com');
  await page.locator('#login-password').fill('secreto-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
};

test.describe('Sesión vencida y regreso (T-9)', () => {
  test('AC-2: un 401 muestra el aviso y, al entrar de nuevo, vuelve a la lista con sus filtros', async ({ page }) => {
    const api = await mockApi(page);
    expire(api, '/tours/all');
    await page.goto('/tours?estado=inactivos');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Tu sesión terminó. Entra de nuevo para seguir.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('adminToken'))).toBeNull();
    api.override(() => undefined);
    await enter(page);
    await expect(page).toHaveURL('/tours?estado=inactivos');
    await expect(page.getByRole('button', { name: 'Quitar filtro Estado: Inactivos' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('adminToken'))).toBe('token-de-prueba');
  });

  test('AC-2: si vence al guardar un tour con cambios, va al login sin diálogo y vuelve al mismo tour', async ({ page }) => {
    const api = await openTour(page, '/tours/1');
    const title = page.getByLabel('Título (Español)');
    await expect(title).toHaveValue('Cenotes');
    await title.fill('Cenotes Plus');
    api.override((r) => (r.method === 'PATCH' ? { status: 401, body: { message: 'Unauthorized' } } : undefined));
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Tu sesión terminó. Entra de nuevo para seguir.')).toBeVisible();
    api.override(() => undefined);
    await enter(page);
    await expect(page).toHaveURL('/tours/1');
  });

  test('"Cerrar sesión" es una salida deliberada: sin aviso y, al entrar, va al inicio, no a la ruta anterior', async ({ page }) => {
    await mockApi(page);
    await page.goto('/tours');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Tu sesión terminó.')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('adminToken'))).toBeNull();
    await enter(page);
    await expect(page).toHaveURL('/');
  });

  test('AC-33: sin sesión, cualquier ruta privada (incluida una inexistente) lleva al login', async ({ page }) => {
    await mockApi(page, { authenticated: false });
    for (const path of ['/', '/tours', '/tours/4', '/categories', '/languages', '/no-existe']) {
      await page.goto(path);
      await expect(page).toHaveURL('/login');
    }
  });

  test('con sesión, /login no se queda: lleva al inicio', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });
});
