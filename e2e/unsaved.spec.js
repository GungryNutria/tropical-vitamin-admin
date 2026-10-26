import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MB, fileOf, openTour, writes } from './fixtures/tourEdit.js';

const save = (page) => page.getByRole('button', { name: 'Guardar' });
const dialog = (page) => page.getByRole('dialog', { name: '¿Salir sin guardar?' });
const nav = (page) => page.getByRole('navigation', { name: 'Principal' });

test.describe('Cambios sin guardar (T-8, REQ-12)', () => {
  test('AC-12: con cambios se ve el indicador junto a Guardar; sin cambios no', async ({ page }) => {
    await openTour(page, '/tours/1');
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await page.getByLabel('Ubicación').fill('Cancún, México'); // vuelve al valor guardado
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
  });

  test('AC-12: volver a la lista con cambios pide confirmación con el foco en "Seguir editando"', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText('Tienes cambios sin guardar en «Cenotes».');
    await expect(dialog(page)).toContainText('Si sales ahora, se pierden.');
    await expect(page.getByRole('button', { name: 'Seguir editando' })).toBeFocused();
    await expect(page).toHaveURL('/tours/1');
    // Esc = seguir editando; el foco vuelve y lo escrito sigue ahí.
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL('/tours/1');
    await expect(page.getByLabel('Ubicación')).toHaveValue('Tulum, México');
    // "Salir y descartar" sale.
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await page.getByRole('button', { name: 'Salir y descartar' }).click();
    await expect(page).toHaveURL('/tours');
    await expect(page.getByRole('heading', { name: 'Tours', level: 1 })).toBeVisible();
  });

  test('AC-12: el menú lateral y las migas también piden confirmación; "Seguir editando" se queda', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await nav(page).getByRole('link', { name: 'Categorías' }).click();
    await expect(dialog(page)).toBeVisible();
    await page.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(page).toHaveURL('/tours/1');
    await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Tours' }).click();
    await expect(dialog(page)).toBeVisible();
    await page.getByRole('button', { name: 'Salir y descartar' }).click();
    await expect(page).toHaveURL('/tours');
  });

  test('AC-12: sin cambios no se pide confirmación', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page).toHaveURL('/tours');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('AC-12: después de guardar ya no se pide confirmación', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/1');
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    await nav(page).getByRole('link', { name: 'Tours' }).click();
    await expect(page).toHaveURL('/tours');
    expect(writes(requests)).toHaveLength(1);
  });

  test('AC-12: cambiar la foto cuenta como cambio sin guardar (E5.13)', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.getByLabel('Elegir foto', { exact: true }).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', MB));
    await expect(page.getByText('Foto nueva.')).toBeVisible();
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test('AC-12: un tour nuevo con algo escrito pide confirmación; vacío no', async ({ page }) => {
    await openTour(page, '/tours/new');
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page).toHaveURL('/tours');
    await page.goBack();
    await page.getByLabel('Nombre admin').fill('algo');
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test('AC-12: cerrar o recargar la pestaña con cambios dispara el aviso del navegador', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.getByLabel('Ubicación').fill('Tulum, México');
    // Playwright solo reporta el diálogo si el navegador realmente intenta salir.
    const closing = page.waitForEvent('dialog', { timeout: 5000 });
    await page.close({ runBeforeUnload: true });
    const d = await closing;
    expect(d.type()).toBe('beforeunload');
    await d.dismiss();
  });

  test('AC-12: el atrás del navegador con cambios también pregunta', async ({ page }) => {
    await openTour(page, '/tours');
    await page.getByRole('link', { name: 'Cenotes' }).first().click();
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await page.goBack();
    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveURL('/tours/1');
  });

  test('axe: el diálogo de salir sin violaciones serias', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(dialog(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))).toEqual([]);
  });
});
