import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './fixtures/mockApi.js';

test.describe('base: layout, tema y rutas (T-6)', () => {
  test('Layout a 1440: menú plano de 232 px con 4 destinos, correo y Cerrar sesión', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link')).toHaveText(['Inicio', 'Tours', 'Categorías', 'Idiomas']);
    expect((await nav.boundingBox()).width).toBe(232);
    await expect(nav.getByText('admin@tropical-vitamin.com')).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('las pantallas actuales siguen funcionando dentro del Layout', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await nav.getByRole('link', { name: 'Tours' }).click();
    await expect(page).toHaveURL('/tours');
    await expect(page.getByText('tour-1', { exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Tours' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Categorías' }).click();
    await expect(page).toHaveURL('/categories');
    await nav.getByRole('link', { name: 'Idiomas' }).click();
    await expect(page).toHaveURL('/languages');
    await expect(page.getByText('Español').first()).toBeVisible();
  });

  test('tema Mesa negra: primario amarillo de 40 px, fondo base', async ({ page }) => {
    await mockApi(page);
    await page.goto('/no-existe');
    const button = page.getByRole('button', { name: 'Ir al inicio' });
    await expect(button).toHaveCSS('background-color', 'rgb(244, 185, 66)');
    await expect(button).toHaveCSS('color', 'rgb(10, 10, 10)');
    expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(40);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
    await button.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(button).toHaveCSS('outline-color', 'rgb(244, 185, 66)');
  });

  test('AC-27: ruta desconocida muestra "Esta página no existe." dentro del Layout', async ({ page }) => {
    await mockApi(page);
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { name: 'Esta página no existe.' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    await page.getByRole('button', { name: 'Ir al inicio' }).click();
    await expect(page).toHaveURL('/');
  });

  test('AC-27: sin sesión, una ruta desconocida lleva al login', async ({ page }) => {
    await mockApi(page, { authenticated: false });
    await page.goto('/no-existe');
    await expect(page).toHaveURL('/login');
  });

  test('AC-33: cada petición lleva Bearer; recargar con sesión se queda', async ({ page }) => {
    const { requests } = await mockApi(page);
    await page.goto('/tours');
    await expect(page.getByText('tour-1', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL('/tours');
    await expect(page.getByText('tour-1', { exact: true })).toBeVisible();
    const calls = requests.filter((r) => r.path === '/tours/all');
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const r of requests.filter((r) => !r.path.startsWith('/upload/') && r.path !== '/auth/login')) {
      expect(r.headers.authorization).toBe('Bearer token-de-prueba');
    }
  });

  test('AC-33: un 401 limpia la sesión y manda al login (guarda la ruta y el motivo)', async ({ page }) => {
    const api = await mockApi(page);
    api.override((r) => (r.path === '/tours/all' ? { status: 401, body: { message: 'Unauthorized' } } : undefined));
    await page.goto('/tours');
    await expect(page).toHaveURL('/login');
    expect(await page.evaluate(() => localStorage.getItem('adminToken'))).toBeNull();
    expect(await page.evaluate(() => history.state?.usr?.reason)).toBe('expired');
    expect(await page.evaluate(() => history.state?.usr?.from?.pathname)).toBe('/tours');
  });

  test('axe: Layout y NotFound sin serious/critical', async ({ page }) => {
    await mockApi(page);
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { name: 'Esta página no existe.' })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
});
