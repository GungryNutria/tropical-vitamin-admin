import { test, expect } from '@playwright/test';
import { API } from './fixtures/mockApi.js';
import { open } from './fixtures/catalog.js';

// V3 Inicio (REQ-4, REQ-27; AC-4, AC-18, AC-24; D-10): pendientes con los mismos números que las listas.
const items = (page) => page.getByRole('list', { name: 'Pendientes del catálogo' }).getByRole('listitem');
const row = (page, text) => items(page).filter({ hasText: text });
const tourCounter = (page) => page.getByRole('status').filter({ hasText: /tours?$/ });

test.describe('Inicio', () => {
  test('AC-4: tres pendientes (2, 3 y 1) abren la lista filtrada con ese mismo número de filas; el inactivo es informativo', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible();
    await expect(page.getByText('39 tours · 10 categorías · 2 idiomas activos')).toBeVisible();
    await expect(items(page)).toHaveCount(3);
    await expect(row(page, 'tours sin foto')).toContainText('2');
    await expect(row(page, 'tours con textos incompletos')).toContainText('3');
    await expect(row(page, 'tours con textos incompletos')).toContainText('Les falta el título o la descripción en inglés.');
    await expect(row(page, 'categoría con traducciones pendientes')).toContainText('1');
    await expect(page.getByText('1 tour inactivo · No se muestra en la web')).toBeVisible();

    await row(page, 'tours sin foto').click(); // toda la fila es clicable
    await expect(page).toHaveURL(/\/tours\?pendientes=foto$/);
    await expect(tourCounter(page)).toHaveText('2 de 39 tours');
    await expect(page.locator('tbody tr')).toHaveCount(2);

    await page.goBack();
    await page.getByRole('link', { name: /Ver tours: 3 tours con textos incompletos/ }).click();
    await expect(page).toHaveURL(/pendientes=textos$/);
    await expect(page.locator('tbody tr')).toHaveCount(3);

    await page.goBack();
    await page.getByRole('link', { name: /Ver categorías: 1 categoría/ }).click();
    await expect(page).toHaveURL(/\/categories\?pendientes=1$/);
    await expect(page.getByText('1 de 10 categorías')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);

    await page.goto('/');
    await page.getByRole('link', { name: 'Ver tours' }).last().click();
    await expect(page).toHaveURL(/\/tours\?estado=inactivos$/);
    await expect(tourCounter(page)).toHaveText('1 de 39 tours');
  });

  test('AC-4: sin pendientes (aunque haya un tour inactivo) dice que el catálogo está al día', async ({ page }) => {
    await open(page, '/', { clean: true });
    await expect(page.getByText('Todo al día')).toBeVisible();
    await expect(page.getByText('Todo el catálogo tiene foto y textos en todos los idiomas activos.')).toBeVisible();
    await expect(page.getByText('1 tour inactivo · No se muestra en la web')).toBeVisible();
    await expect(items(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver los tours' }).click();
    await expect(page).toHaveURL(/\/tours$/);
  });

  test('AC-24: un idioma inactivo no cuenta; activado, sus textos vacíos sí', async ({ page }) => {
    await open(page, '/', { frActive: true });
    await expect(page.getByText('3 idiomas activos')).toBeVisible();
    await expect(row(page, 'tours con textos incompletos')).toContainText('30');
    await expect(row(page, 'tours con textos incompletos')).toContainText('en inglés y Français');
    await expect(row(page, 'traducciones pendientes')).toContainText('8');
  });

  test('"Nuevo tour" lleva al alta', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('link', { name: 'Nuevo tour' }).click();
    await expect(page).toHaveURL(/\/tours\/new$/);
  });

  test('AC-18: los números coinciden con los de las listas de tours y categorías', async ({ page }) => {
    await open(page, '/tours?pendientes=1');
    // sin foto (2) + textos (3) = 5 tours distintos con pendientes
    await expect(tourCounter(page)).toHaveText('5 de 39 tours');
  });

  test('AC-26: cargando, error con Reintentar y con datos', async ({ page }) => {
    let fail = true;
    const api = await open(page, '/');
    await page.route(`${API}/tours/all`, async (route) => {
      if (fail) return route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{}' });
      return route.fallback();
    });
    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cargar los pendientes.' })).toBeVisible();
    await expect(page.getByText('Revisa tu conexión e intenta de nuevo.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo tour' })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(items(page)).toHaveCount(3);
    expect(api.requests.length).toBeGreaterThan(0);
  });

  test('AC-26: mientras carga muestra el esqueleto', async ({ page }) => {
    await open(page, '/');
    await page.route(`${API}/categories`, async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      return route.fallback();
    });
    await page.reload();
    await expect(page.getByLabel('Cargando')).toBeVisible();
    await expect(items(page)).toHaveCount(3);
  });
});
