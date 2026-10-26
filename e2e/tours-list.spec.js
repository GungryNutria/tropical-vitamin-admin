import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './fixtures/mockApi.js';
import { tours } from './fixtures/data.js';

// Catálogo de la lista (V4): los 39 tours de la fixture con casos concretos para AC-5 a AC-8 y AC-18.
//  1 Cenotes (150 min, Naturaleza) · 4 Snorkel & Buceo (Acuáticos, sin inglés) · 8 Tulum y Cobá (inactivo)
//  9 Isla Holbox (sin foto) · 12 inglés en blanco (textos pendientes) · 39 título de ~60 caracteres.
const LONG_TITLE = 'Aventura completa de snorkel, cenotes y arqueología en el Caribe';
function catalog() {
  const list = tours.map((t) => ({ ...t, translations: t.translations.map((x) => ({ ...x })) }));
  const byId = (id) => list.find((t) => t.id === id);
  const setTitle = (id, title, adminTitle) => {
    byId(id).translations[0].title = title;
    byId(id).adminTitle = adminTitle;
  };
  setTitle(1, 'Cenotes', 'cenotes');
  setTitle(4, 'Snorkel & Buceo', 'snorkel-buceo');
  Object.assign(byId(4), { category: { id: 2, adminName: 'acuaticos' }, translations: byId(4).translations.slice(0, 1) });
  setTitle(5, 'Chichén Itzá', 'chichen-itza');
  setTitle(8, 'Tulum y Cobá', 'tulum-coba');
  byId(8).isActive = false;
  setTitle(9, 'Isla Holbox', 'holbox');
  byId(9).img = null;
  byId(12).translations[1].title = '   ';
  setTitle(39, LONG_TITLE, 'aventura-completa');
  return list;
}

const SEARCH = 'Buscar por título o nombre admin';
const row = (page, adminTitle) => page.getByText(adminTitle, { exact: true }).locator('xpath=ancestor::tr');
const switchOf = (page, title) => page.getByRole('switch', { name: `Mostrar «${title}» en la web` });
const counter = (page) => page.getByRole('status').filter({ hasText: /tours?$/ });
const patches = (requests) => requests.filter((r) => r.method === 'PATCH').map((r) => ({ path: r.path, body: JSON.parse(r.body) }));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function open(page, url = '/tours') {
  const api = await mockApi(page, { data: { tours: catalog() } });
  await page.goto(url);
  return api;
}

test.describe('V4 Lista de tours (T-7)', () => {
  test('AC-5: cada fila muestra foto, título, nombre admin, categoría, duración, precio, idiomas y activo; la fila completa abre la edición', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Tours', level: 1 })).toBeVisible();
    await expect(page.getByRole('columnheader')).toHaveText(['Foto', 'Tour', 'Categoría', 'Duración', 'Precio', 'Idiomas', 'Activo']);
    const r = row(page, 'cenotes');
    await expect(r.getByRole('link', { name: 'Cenotes' })).toBeVisible();
    await expect(r.getByText('cenotes', { exact: true })).toBeVisible();
    await expect(r.getByText('Naturaleza')).toBeVisible();
    await expect(r.getByText('2 h 30 min')).toBeVisible();
    await expect(r.getByText('$1,000 MXN')).toBeVisible();
    await expect(r.getByText('ES', { exact: true })).toBeVisible();
    await expect(r.getByText('EN', { exact: true })).toBeVisible();
    await expect(r.locator('img')).toHaveCount(1);
    await expect(switchOf(page, 'Cenotes')).toBeChecked();
    expect((await r.boundingBox()).height).toBe(52);
    // Clic en cualquier parte de la fila (aquí, la zona de la categoría) abre su edición.
    await r.click({ position: { x: 640, y: 26 } });
    await expect(page).toHaveURL('/tours/1');
  });

  test('AC-5: la fila se abre con teclado y el interruptor no abre la edición', async ({ page }) => {
    await open(page);
    await row(page, 'cenotes').getByRole('link', { name: 'Cenotes' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/tours/1');
    await page.goBack();
    await switchOf(page, 'Cenotes').click();
    await expect(page).toHaveURL('/tours');
  });

  test('AC-5: el título largo se recorta con puntos suspensivos y conserva el texto completo', async ({ page }) => {
    await open(page);
    const link = page.getByRole('link', { name: LONG_TITLE });
    await expect(link).toHaveAttribute('title', LONG_TITLE);
    expect(await link.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
    expect(await noOverflow(page)).toBe(true);
  });

  test('AC-6: buscar por título o por nombre admin deja solo los que coinciden; abrir uno toma 1 clic', async ({ page }) => {
    await open(page);
    await expect(counter(page)).toHaveText('39 tours');
    await page.getByRole('textbox', { name: SEARCH }).fill('buce');
    await expect(page.getByRole('row')).toHaveCount(2); // encabezado + 1
    await expect(counter(page)).toHaveText('1 de 39 tours');
    await expect(page.getByRole('button', { name: 'Quitar filtro Búsqueda: buce' })).toBeVisible();
    await expect(page).toHaveURL('/tours?q=buce');
    // Sin distinguir acentos, y por nombre admin.
    await page.getByRole('textbox', { name: SEARCH }).fill('chichen');
    await expect(row(page, 'chichen-itza')).toBeVisible();
    await page.getByRole('textbox', { name: SEARCH }).fill('holbox');
    await expect(page.getByRole('row')).toHaveCount(2);
    await page.getByRole('link', { name: 'Isla Holbox' }).click();
    await expect(page).toHaveURL('/tours/9');
  });

  test('AC-6: «snorkle» sin coincidencias nombra la búsqueda y ofrece quitar los filtros', async ({ page }) => {
    await open(page);
    await page.getByRole('textbox', { name: SEARCH }).fill('snorkle');
    await expect(page.getByText('Ningún tour coincide con «snorkle».')).toBeVisible();
    await expect(page.getByText('Revisa la ortografía o prueba con menos palabras.')).toBeVisible();
    await expect(counter(page)).toHaveText('0 de 39 tours');
    await page.getByRole('button', { name: 'Quitar filtros' }).last().click();
    await expect(counter(page)).toHaveText('39 tours');
    await expect(page.getByRole('textbox', { name: SEARCH })).toHaveValue('');
    await expect(page).toHaveURL('/tours');
  });

  test('AC-6: categoría, estado y "Con pendientes" se combinan, viven en la URL y salen como chips quitables', async ({ page }) => {
    await open(page);
    await page.getByRole('combobox', { name: 'Categoría' }).click();
    await page.getByRole('option', { name: 'Acuáticos' }).click();
    await page.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Activos', exact: true }).click();
    const toggle = page.getByRole('button', { name: 'Con pendientes', exact: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL('/tours?categoria=2&estado=activos&pendientes=1');
    await expect(page.getByRole('combobox', { name: 'Estado' })).toHaveText('Estado: Activos');
    await expect(counter(page)).toHaveText('1 de 39 tours');
    await expect(row(page, 'snorkel-buceo')).toBeVisible();
    for (const name of ['Categoría: Acuáticos', 'Estado: Activos', 'Con pendientes']) {
      await expect(page.getByRole('button', { name: `Quitar filtro ${name}` })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Quitar filtro Estado: Activos' }).click();
    await expect(page).toHaveURL('/tours?categoria=2&pendientes=1');
    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page).toHaveURL('/tours');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC-6 y AC-18: los filtros que llegan por URL (foto, textos, 1, inactivos) cuentan lo mismo que los indicadores', async ({ page }) => {
    await open(page, '/tours?pendientes=foto');
    await expect(counter(page)).toHaveText('1 de 39 tours');
    await expect(page.getByRole('button', { name: 'Quitar filtro Sin foto' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Con pendientes', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.goto('/tours?pendientes=textos');
    await expect(counter(page)).toHaveText('2 de 39 tours');
    await expect(page.getByRole('button', { name: 'Quitar filtro Textos pendientes' })).toBeVisible();
    await page.goto('/tours?pendientes=1');
    await expect(counter(page)).toHaveText('3 de 39 tours');
    await expect(page.getByText('EN falta')).toHaveCount(2);
    await page.goto('/tours?estado=inactivos');
    await expect(counter(page)).toHaveText('1 de 39 tours');
    await expect(row(page, 'tulum-coba')).toBeVisible();
  });

  test('AC-18: sin abrir registros se ve qué tours tienen textos incompletos y cuáles no tienen foto; el idioma inactivo no cuenta', async ({ page }) => {
    await open(page);
    await expect(page.getByText('EN falta')).toHaveCount(2); // tour 4 (sin traducción) y tour 12 (inglés en blanco)
    await expect(row(page, 'snorkel-buceo').getByText('EN falta')).toBeVisible();
    await expect(row(page, 'holbox').getByText('Sin foto')).toBeVisible();
    await expect(page.getByText('Sin foto')).toHaveCount(1);
    await expect(page.getByText('FR')).toHaveCount(0);
  });

  test('AC-7: apagar un tour lo guarda en 1 acción, avisa con Deshacer y deshacer lo vuelve a activar en la API', async ({ page }) => {
    const { requests } = await open(page);
    const sw = switchOf(page, 'Snorkel & Buceo');
    await expect(sw).toBeChecked();
    await sw.click();
    await expect(sw).not.toBeChecked();
    await expect(page.getByRole('status').filter({ hasText: '«Snorkel & Buceo» ya no se muestra en la web' })).toBeVisible();
    expect(patches(requests)).toEqual([{ path: '/tours/4', body: { isActive: false } }]);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(sw).toBeChecked();
    await expect.poll(() => patches(requests)).toEqual([
      { path: '/tours/4', body: { isActive: false } },
      { path: '/tours/4', body: { isActive: true } },
    ]);
    await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0);
  });

  test('AC-7: el aviso de éxito se va a los 5 s y encender un tour dice que ya se muestra', async ({ page }) => {
    await open(page);
    await switchOf(page, 'Tulum y Cobá').click();
    const toast = page.getByRole('status').filter({ hasText: '«Tulum y Cobá» ya se muestra en la web' });
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 7000 });
  });

  test('AC-7: si la API falla, el interruptor vuelve a su posición y aparece Reintentar', async ({ page }) => {
    const api = await open(page);
    let fail = true;
    api.override((r) => (r.method === 'PATCH' && fail ? { status: 500, body: { message: 'boom' } } : undefined));
    const sw = switchOf(page, 'Snorkel & Buceo');
    await sw.click();
    const alert = page.getByRole('alert').filter({ hasText: 'No pudimos cambiar «Snorkel & Buceo».' });
    await expect(alert).toBeVisible();
    await expect(sw).toBeChecked();
    // El error se queda hasta cerrarlo o reintentar.
    await page.waitForTimeout(5500);
    await expect(alert).toBeVisible();
    fail = false;
    await alert.getByRole('button', { name: 'Reintentar' }).click();
    await expect(sw).not.toBeChecked();
    await expect(alert).toBeHidden();
    await expect(page.getByText('«Snorkel & Buceo» ya no se muestra en la web')).toBeVisible();
  });

  test('AC-8: una foto que no carga muestra la miniatura neutra, no un hueco', async ({ page }) => {
    const api = await mockApi(page, { data: { tours: catalog() } });
    api.override((r) => (r.path.startsWith('/upload/') ? { status: 400, body: { message: 'no existe' } } : undefined));
    await page.goto('/tours');
    await expect(row(page, 'cenotes')).toBeVisible();
    // 38 con foto rota + 1 sin foto = 39 miniaturas neutras y ninguna imagen visible.
    await expect(page.getByTestId('tour-thumb-neutral')).toHaveCount(39);
    await expect(page.locator('tbody img')).toHaveCount(0);
  });

  test('AC-26 (lista): carga con esqueleto, contador en esqueleto y controles deshabilitados', async ({ page }) => {
    await mockApi(page, { data: { tours: catalog() } });
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route('**/tours/all', async (route) => { await gate; await route.fallback(); });
    await page.goto('/tours');
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect(counter(page)).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: SEARCH })).toHaveAttribute('disabled', '');
    await expect(page.getByRole('button', { name: 'Con pendientes' })).toHaveAttribute('disabled', '');
    await expect(page.getByRole('combobox', { name: 'Categoría' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('combobox', { name: 'Estado' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('link', { name: 'Nuevo tour' })).toBeVisible();
    release();
    await expect(counter(page)).toHaveText('39 tours');
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: SEARCH })).toBeEnabled();
  });

  test('AC-26 (lista): error con Reintentar, sin contador y con controles deshabilitados', async ({ page }) => {
    const api = await mockApi(page, { data: { tours: catalog() } });
    let fail = true;
    api.override((r) => (r.path === '/tours/all' && fail ? { status: 500, body: {} } : undefined));
    await page.goto('/tours');
    await expect(page.getByText('No pudimos cargar los tours.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Revisa tu conexión e intenta de nuevo.')).toBeVisible();
    await expect(counter(page)).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: SEARCH })).toHaveAttribute('disabled', '');
    await expect(page.getByRole('button', { name: 'Con pendientes' })).toHaveAttribute('disabled', '');
    fail = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(counter(page)).toHaveText('39 tours', { timeout: 10000 });
  });

  test('AC-26 (lista): catálogo vacío ofrece "Crear el primero" y no repite "Nuevo tour"', async ({ page }) => {
    await mockApi(page, { data: { tours: [] } });
    await page.goto('/tours');
    await expect(page.getByText('Aún no hay tours.')).toBeVisible();
    await expect(page.getByText('Crea el primero y aparecerá en la web cuando lo actives.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo tour' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Crear el primero' }).click();
    await expect(page).toHaveURL('/tours/new');
  });

  test('"Nuevo tour" lleva a /tours/new', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Nuevo tour' }).click();
    await expect(page).toHaveURL('/tours/new');
  });

  test('sin scroll horizontal a 1440 y 1280', async ({ page }) => {
    await open(page);
    await expect(row(page, 'cenotes')).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await noOverflow(page)).toBe(true);
  });

  test('controles de 40 px de alto como mínimo a 1440', async ({ page }) => {
    await open(page);
    await expect(row(page, 'cenotes')).toBeVisible();
    for (const loc of [
      page.getByRole('textbox', { name: SEARCH }),
      page.getByRole('combobox', { name: 'Categoría' }),
      page.getByRole('combobox', { name: 'Estado' }),
      page.getByRole('button', { name: 'Con pendientes' }),
      page.getByRole('link', { name: 'Nuevo tour' }),
    ]) {
      expect((await loc.boundingBox()).height).toBeGreaterThanOrEqual(40);
    }
  });

  test.describe('axe: 0 serious/critical', () => {
    const blocking = async (page) => {
      const { violations } = await new AxeBuilder({ page }).analyze();
      return violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
    };

    test('con datos y filtrada', async ({ page }) => {
      await open(page);
      await expect(row(page, 'cenotes')).toBeVisible();
      expect(await blocking(page)).toEqual([]);
      await page.goto('/tours?estado=activos&pendientes=1');
      await expect(row(page, 'snorkel-buceo')).toBeVisible();
      expect(await blocking(page)).toEqual([]);
    });

    test('sin resultados', async ({ page }) => {
      await open(page, '/tours?q=snorkle');
      await expect(page.getByText('Ningún tour coincide con «snorkle».')).toBeVisible();
      expect(await blocking(page)).toEqual([]);
    });

    test('catálogo vacío', async ({ page }) => {
      await mockApi(page, { data: { tours: [] } });
      await page.goto('/tours');
      await expect(page.getByText('Aún no hay tours.')).toBeVisible();
      expect(await blocking(page)).toEqual([]);
    });

    test('error al cargar', async ({ page }) => {
      const api = await mockApi(page);
      api.override((r) => (r.path === '/tours/all' ? { status: 500, body: {} } : undefined));
      await page.goto('/tours');
      await expect(page.getByText('No pudimos cargar los tours.')).toBeVisible({ timeout: 10000 });
      expect(await blocking(page)).toEqual([]);
    });
  });
});
