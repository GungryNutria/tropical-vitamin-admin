import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './fixtures/mockApi.js';
import { editCatalog } from './fixtures/tourEdit.js';

// Menú y avisos (T-9): V2 a 390 (barra superior y cajón), V8 (no encontrada y pila de avisos), barrido de anchos.
// REQ-3, REQ-30; AC-3, AC-27, AC-30, AC-UX-12, AC-UX-13.
const menuButton = (page) => page.getByRole('button', { name: 'Abrir menú' });
const nav = (page) => page.getByRole('navigation', { name: 'Principal' });
const counter = (page) => page.getByRole('status').filter({ hasText: /tours?$/ });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const blocking = async (page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);

async function open(page, url, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  const api = await mockApi(page, { data: { tours: editCatalog() } });
  await page.goto(url);
  return api;
}

test.describe('V2 Menú: barra superior y cajón a 390 (T-9)', () => {
  test('a 1280 y 1440 el menú es el lateral de 232 px y no hay botón de menú', async ({ page }) => {
    for (const width of [1280, 1440]) {
      await open(page, '/tours', width);
      await expect(nav(page)).toBeVisible();
      expect((await nav(page).boundingBox()).width).toBe(232);
      await expect(menuButton(page)).toHaveCount(0);
    }
  });

  test('E2.2 cerrado: barra de 56 px con botón de menú de 44x44, título de la vista y "Nuevo" de 44 de alto', async ({ page }) => {
    await open(page, '/tours');
    const bar = page.getByRole('banner');
    expect((await bar.boundingBox()).height).toBe(56);
    const button = await menuButton(page).boundingBox();
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    await expect(bar.getByText('Tours', { exact: true })).toBeVisible();
    await expect(nav(page)).toHaveCount(0);
    const nuevo = page.getByRole('link', { name: 'Nuevo', exact: true });
    await expect(nuevo).toBeVisible();
    expect((await nuevo.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect((await nuevo.boundingBox()).x + (await nuevo.boundingBox()).width).toBeLessThanOrEqual(390 - 16 + 1);
    // Un solo primario por vista: el encabezado de la página no repite "Nuevo tour".
    await expect(page.getByRole('link', { name: 'Nuevo tour' })).toHaveCount(0);
    expect(await noOverflow(page)).toBe(true);
  });

  test('el título de la barra sigue a la vista; "Nuevo" va en la barra de Inicio y la lista de tours, no en la edición (T-10: Inicio lleva "Nuevo tour")', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('banner').getByText('Inicio', { exact: true })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Nuevo', exact: true })).toHaveCount(1);
    await page.goto('/tours/1');
    await expect(page.getByRole('banner').getByText('Tours', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo', exact: true })).toHaveCount(0);
  });

  test('E2.2 abierto: pantalla completa con los 4 destinos de 52 px, el activo marcado, correo y "Cerrar sesión" de 52 px', async ({ page }) => {
    await open(page, '/tours');
    await menuButton(page).click();
    await expect(nav(page)).toBeVisible();
    const links = nav(page).getByRole('link');
    await expect(links).toHaveText(['Inicio', 'Tours', 'Categorías', 'Idiomas']);
    for (const link of await links.all()) expect((await link.boundingBox()).height).toBe(52);
    await expect(nav(page).getByRole('link', { name: 'Tours' })).toHaveAttribute('aria-current', 'page');
    await expect(nav(page).getByText('admin@tropical-vitamin.com')).toBeVisible();
    expect((await nav(page).getByRole('button', { name: 'Cerrar sesión' }).boundingBox()).height).toBe(52);
    const close = await page.getByRole('button', { name: 'Cerrar menú' }).boundingBox();
    expect(close.width).toBeGreaterThanOrEqual(44);
    expect(close.height).toBeGreaterThanOrEqual(44);
    expect(Math.round((await nav(page).boundingBox()).width)).toBe(390);
    expect(await blocking(page)).toEqual([]);
  });

  test('el cajón cierra con la X y con Esc, devuelve el foco al botón de menú y atrapa el foco mientras está abierto', async ({ page }) => {
    await open(page, '/tours');
    await menuButton(page).click();
    await page.getByRole('button', { name: 'Cerrar menú' }).click();
    await expect(nav(page)).toHaveCount(0);
    await menuButton(page).click();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement.closest('nav'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(nav(page)).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();
  });

  test('elegir un destino navega y cierra el cajón; "Cerrar sesión" lleva al login', async ({ page }) => {
    await open(page, '/tours');
    await menuButton(page).click();
    await nav(page).getByRole('link', { name: 'Categorías' }).click();
    await expect(page).toHaveURL('/categories');
    await expect(nav(page)).toHaveCount(0);
    await expect(page.getByRole('banner').getByText('Categorías', { exact: true })).toBeVisible();
    await menuButton(page).click();
    await nav(page).getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('768 también usa la barra y el cajón; al crecer a 1280 se cierra y aparece el menú lateral', async ({ page }) => {
    await open(page, '/tours', 768);
    await menuButton(page).click();
    await expect(nav(page)).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 844 });
    await expect(menuButton(page)).toHaveCount(0);
    expect((await nav(page).boundingBox()).width).toBe(232);
  });
});

test.describe('V8 Globales (T-9)', () => {
  test('E8.1: ruta inexistente a 390 con barra, mensaje, ayuda e "Ir al inicio" como único primario', async ({ page }) => {
    await open(page, '/no-existe');
    await expect(page.getByRole('heading', { name: 'Esta página no existe.' })).toBeVisible();
    await expect(page.getByText('Puede que el enlace esté incompleto o que la página se haya movido.')).toBeVisible();
    await expect(page.getByRole('banner').getByText('Tropical Vitamin')).toBeVisible();
    expect((await page.getByRole('button', { name: 'Ir al inicio' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await noOverflow(page)).toBe(true);
    expect(await blocking(page)).toEqual([]);
  });

  test('E8.2: los avisos se apilan abajo a la derecha (margen 24, separación 8), el más nuevo abajo; el de error persiste', async ({ page }) => {
    const api = await open(page, '/tours', 1440);
    await page.getByRole('switch', { name: /Mostrar «.*» en la web/ }).first().click({ force: true });
    api.override((r) => (r.method === 'PATCH' ? { status: 500, body: {} } : undefined));
    await page.getByRole('switch', { name: /Mostrar «.*» en la web/ }).nth(1).click({ force: true });
    const toasts = page.getByTestId('toasts').locator('> div');
    await expect(toasts).toHaveCount(2);
    const [first, second] = [await toasts.nth(0).boundingBox(), await toasts.nth(1).boundingBox()];
    expect(second.y).toBeGreaterThan(first.y);
    expect(Math.round(second.y - (first.y + first.height))).toBe(8);
    expect(Math.round(1440 - (second.x + second.width))).toBe(24);
    expect(Math.round(844 - (second.y + second.height))).toBe(24);
    expect(first.width).toBe(540);
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cambiar' })).toBeVisible();
    await page.waitForTimeout(5600);
    await expect(toasts).toHaveCount(1); // el de éxito se fue a los 5 s, el de error se queda
    await expect(page.getByRole('alert')).toContainText('No pudimos cambiar');
  });

  test('toast móvil: ancho completo (358), "Deshacer" y la X de 44x44 en la fila de abajo, sin scroll horizontal', async ({ page }) => {
    await open(page, '/tours');
    await page.getByRole('switch', { name: /Mostrar «.*» en la web/ }).first().click({ force: true });
    const toast = page.getByRole('status').filter({ hasText: /se muestra en la web/ });
    await expect(toast).toBeVisible();
    const box = await toast.boundingBox();
    expect(box.width).toBe(358);
    expect(Math.round(844 - (box.y + box.height))).toBe(16);
    const undo = await toast.getByRole('button', { name: 'Deshacer' }).boundingBox();
    const x = await toast.getByRole('button', { name: 'Cerrar aviso' }).boundingBox();
    for (const target of [undo, x]) {
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(44);
    }
    expect(x.y).toBeGreaterThan((await toast.getByText(/se muestra/).boundingBox()).y);
    expect(await noOverflow(page)).toBe(true);
    await toast.getByRole('button', { name: 'Cerrar aviso' }).click();
    await expect(toast).toHaveCount(0);
    expect(await counter(page).count()).toBe(1);
  });
});

test.describe('Barrido de anchos (AC-UX-13)', () => {
  const routes = ['/tours', '/tours/1', '/tours/new', '/no-existe'];
  for (const width of [390, 768, 1280, 1440]) {
    test(`${width}: sin scroll horizontal en lista, edición, alta y no encontrada`, async ({ page }) => {
      await open(page, '/tours', width);
      for (const route of routes) {
        await page.goto(route);
        await expect(page.getByRole('heading').first()).toBeAttached();
        await expect(page.getByLabel('Cargando')).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        expect(await noOverflow(page), `${route} a ${width}`).toBe(true);
      }
    });
  }
});
