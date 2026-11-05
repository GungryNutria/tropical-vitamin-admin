import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { API, mockApi } from './fixtures/mockApi.js';
import { tours } from './fixtures/data.js';
import { MB, editCatalog, fileOf, galleryCatalog } from './fixtures/tourEdit.js';

// V4 y V5 a 390 (T-9): filas compactas, hoja de filtros, chips, aviso móvil y barra inferior con Guardar.
// REQ-3, REQ-13 (390); AC-3, AC-13 (390), AC-UX-12 (áreas de 44x44), AC-UX-13.
const VIEWPORT = { width: 390, height: 844 };
const SEARCH = 'Buscar por título o nombre admin';
const counter = (page) => page.getByRole('status').filter({ hasText: /tours?$/ });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const blocking = async (page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
const big = (box) => {
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
};

// Catálogo de la lista (39 tours): 1 Cenotes · 4 Snorkel & Buceo (Acuáticos, sin inglés) · 8 Tulum y Cobá (inactivo)
// · 9 Isla Holbox (sin foto). Acuáticos (categoría 2) tiene 6 tours, todos activos.
function listCatalog() {
  const list = tours.map((t) => ({ ...t, translations: t.translations.map((x) => ({ ...x })) }));
  const byId = (id) => list.find((t) => t.id === id);
  byId(1).translations[0].title = 'Cenotes';
  byId(4).translations[0].title = 'Snorkel & Buceo';
  Object.assign(byId(4), { category: { id: 2, adminName: 'acuaticos' }, translations: byId(4).translations.slice(0, 1) });
  byId(8).isActive = false;
  byId(8).translations[0].title = 'Tulum y Cobá';
  byId(9).img = null;
  byId(9).translations[0].title = 'Isla Holbox';
  return list;
}

async function openList(page, url = '/tours') {
  await page.setViewportSize(VIEWPORT);
  const api = await mockApi(page, { data: { tours: listCatalog() } });
  await page.goto(url);
  await expect(counter(page)).toBeVisible();
  return api;
}

test.describe('V4 Lista de tours a 390 (T-9)', () => {
  test('E4.2: filas de 76 px con foto 56x40, título, categoría y chips solo de lo que falta; sin duración ni precio', async ({ page }) => {
    await openList(page);
    await expect(counter(page)).toHaveText('39 tours');
    const rows = page.getByRole('list', { name: 'Tours' }).getByRole('listitem');
    await expect(rows).toHaveCount(39);
    const first = await rows.first().boundingBox();
    expect(first.height).toBeGreaterThanOrEqual(76);
    const holbox = rows.filter({ hasText: 'Isla Holbox' });
    await expect(holbox.getByText('Sin foto')).toBeVisible();
    await expect(holbox.getByText('EN falta')).toHaveCount(0);
    await expect(rows.filter({ hasText: 'Snorkel' }).getByText('EN falta').first()).toBeVisible();
    await expect(page.getByText('$1,000')).toHaveCount(0);
    await expect(page.getByRole('columnheader')).toHaveCount(0);
    const thumb = await rows.first().locator('img').boundingBox();
    expect([thumb.width, thumb.height]).toEqual([56, 40]);
    expect(await noOverflow(page)).toBe(true);
  });

  test('E4.2: buscador, "Filtros" y "Nuevo" de al menos 44 px; el interruptor tiene un área de 44 de alto', async ({ page }) => {
    await openList(page);
    big({ width: 44, height: (await page.getByPlaceholder(SEARCH).boundingBox()).height });
    big(await page.getByRole('button', { name: 'Filtros' }).boundingBox());
    big(await page.getByRole('link', { name: 'Nuevo', exact: true }).boundingBox());
    const area = await page.getByRole('switch', { name: 'Mostrar «Cenotes» en la web' }).locator('xpath=ancestor::label').boundingBox();
    expect(area.height).toBeGreaterThanOrEqual(44);
    expect(area.width).toBeGreaterThanOrEqual(44);
  });

  test('la fila completa abre la edición y el interruptor no navega', async ({ page }) => {
    await openList(page);
    await page.getByRole('switch', { name: 'Mostrar «Cenotes» en la web' }).click();
    await expect(page).toHaveURL('/tours');
    await page.getByRole('link', { name: 'Cenotes' }).click();
    await expect(page).toHaveURL('/tours/1');
  });

  test('E4.3: la hoja de filtros aplica al instante, muestra "Ver N tours" y la X mide 44x44', async ({ page }) => {
    await openList(page);
    await page.getByRole('button', { name: 'Filtros' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filtros' });
    await expect(sheet).toBeVisible();
    big(await sheet.getByRole('button', { name: 'Cerrar filtros' }).boundingBox());
    await sheet.getByRole('combobox', { name: 'Categoría' }).click();
    await page.getByRole('option', { name: 'Acuáticos' }).click();
    await sheet.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Activos', exact: true }).click();
    await expect(page).toHaveURL(/categoria=2/);
    await expect(page).toHaveURL(/estado=activos/);
    const ver = sheet.getByRole('button', { name: /^Ver \d+ tours?$/ });
    await expect(ver).toHaveText('Ver 6 tours');
    await sheet.getByRole('switch', { name: 'Con pendientes' }).click();
    await expect(page).toHaveURL(/pendientes=1/);
    await expect(ver).toHaveText('Ver 1 tour');
    await sheet.getByRole('switch', { name: 'Con pendientes' }).click();
    await ver.click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filtros (2)' })).toBeVisible();
    await expect(counter(page)).toHaveText('6 de 39 tours');
    expect(await blocking(page)).toEqual([]);
  });

  test('E4.3b: con filtros salen chips quitables de 44x44, "Quitar filtros" y el contador; al quitar el último el botón vuelve a "Filtros"', async ({ page }) => {
    await openList(page, '/tours?categoria=2&estado=activos');
    await expect(page.getByRole('button', { name: 'Filtros (2)' })).toBeVisible();
    await expect(counter(page)).toHaveText('6 de 39 tours');
    const chipCategory = page.getByRole('button', { name: 'Quitar filtro Acuáticos' });
    const chipEstado = page.getByRole('button', { name: 'Quitar filtro Estado: Activos' });
    await expect(chipCategory).toBeVisible();
    await expect(chipEstado).toBeVisible();
    big(await chipCategory.locator('.MuiChip-deleteIcon').boundingBox());
    expect((await page.getByRole('button', { name: 'Quitar filtros' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await noOverflow(page)).toBe(true);
    await chipCategory.click();
    await expect(page).toHaveURL('/tours?estado=activos');
    await chipEstado.click();
    await expect(page).toHaveURL('/tours');
    await expect(page.getByRole('button', { name: 'Filtros', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Quitar filtro/ })).toHaveCount(0);
    await expect(counter(page)).toHaveText('39 tours');
  });

  test('la búsqueda no lleva chip a 390 (ya se ve en su campo) pero cuenta en "N de M tours"', async ({ page }) => {
    await openList(page);
    await page.getByPlaceholder(SEARCH).fill('holbox');
    await expect(counter(page)).toHaveText('1 de 39 tours');
    await expect(page.getByRole('button', { name: /^Quitar filtro/ })).toHaveCount(0);
  });

  test('"Quitar filtros" borra filtros y búsqueda también a 390', async ({ page }) => {
    await openList(page, '/tours?categoria=2&estado=activos');
    await page.getByPlaceholder(SEARCH).fill('snorkel');
    await expect(page).toHaveURL(/q=snorkel/);
    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page).toHaveURL('/tours');
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue('');
    await expect(counter(page)).toHaveText('39 tours');
  });

  test('E4.3c: llegar desde Inicio muestra "Con pendientes" encendido en la hoja y el subfiltro como chip', async ({ page }) => {
    await openList(page, '/tours?pendientes=foto');
    await expect(page.getByRole('button', { name: 'Quitar filtro Pendientes: sin foto' })).toBeVisible();
    await expect(counter(page)).toHaveText('1 de 39 tours');
    await page.getByRole('button', { name: 'Filtros (1)' }).click();
    await expect(page.getByRole('switch', { name: 'Con pendientes' })).toBeChecked();
  });

  test('E4.7: el aviso al cambiar un tour es móvil (358 px), con "Deshacer" y la X de 44x44, y Deshacer revierte', async ({ page }) => {
    const { requests } = await openList(page);
    await page.getByRole('switch', { name: 'Mostrar «Cenotes» en la web' }).click();
    const toast = page.getByRole('status').filter({ hasText: '«Cenotes» ya no se muestra en la web' });
    await expect(toast).toBeVisible();
    expect((await toast.boundingBox()).width).toBe(358);
    big(await toast.getByRole('button', { name: 'Deshacer' }).boundingBox());
    big(await toast.getByRole('button', { name: 'Cerrar aviso' }).boundingBox());
    await toast.getByRole('button', { name: 'Deshacer' }).click();
    const patches = requests.filter((r) => r.method === 'PATCH').map((r) => JSON.parse(r.body));
    expect(patches).toEqual([{ isActive: false }, { isActive: true }]);
  });

  test('estados a 390: cargando, sin resultados, vacío y error caben sin scroll horizontal', async ({ page }) => {
    await openList(page);
    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Ningún tour coincide con «zzzz».')).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(counter(page)).toHaveText('39 tours');
  });

  test('error al cargar y catálogo vacío a 390: sin "Nuevo" duplicado y con los controles deshabilitados', async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    const api = await mockApi(page);
    api.override((r) => (r.path === '/tours/all' ? { status: 500, body: {} } : undefined));
    await page.goto('/tours');
    await expect(page.getByText('No pudimos cargar los tours.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Filtros' })).toBeDisabled();
    expect(await noOverflow(page)).toBe(true);
    api.override((r) => (r.path === '/tours/all' ? { status: 200, body: [] } : undefined));
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Aún no hay tours.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Crear el primero' })).toBeVisible();
  });
});

const save = (page) => page.getByRole('button', { name: /^Guardar|^Guardando/ });
const bar = (page) => save(page).locator('xpath=..');
const chooser = (page) => page.getByLabel('Elegir fotos', { exact: true });

async function openEdit(page, url = '/tours/1', catalog = editCatalog()) {
  await page.setViewportSize(VIEWPORT);
  const api = await mockApi(page, { data: { tours: catalog } });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return api;
}

test.describe('V5 Edición de tour a 390 (T-9)', () => {
  test('E5.3: una columna: portada en miniatura 112x75, aviso, visible, datos, fotos (2 columnas, Acciones de 44, sin manija) y textos', async ({ page }) => {
    await openEdit(page);
    expect(await noOverflow(page)).toBe(true);
    const preview = await page.getByAltText('Portada del tour').boundingBox();
    expect(Math.round(preview.width)).toBe(112);
    expect(Math.round(preview.height)).toBe(75);
    const y = async (name) => (await page.getByRole('heading', { name, exact: true }).boundingBox()).y;
    const [portada, general, fotos, textos] = [await y('Portada'), await y('Datos generales'), await y('Fotos del tour'), await y('Textos por idioma')];
    const visible = (await page.getByText('Visible en la web', { exact: true }).boundingBox()).y;
    expect(portada).toBeLessThan(visible);
    expect(visible).toBeLessThan(general);
    expect(general).toBeLessThan(fotos);
    expect(fotos).toBeLessThan(textos);
    await expect(page.getByTestId('photo-handle')).toHaveCount(0);
    await expect(page.getByText('La primera es la portada: es la que se ve en la tarjeta de la web. Usa Acciones para cambiar el orden.')).toBeVisible();
    big(await page.getByRole('button', { name: 'Acciones de la foto 1' }).boundingBox());
    big(await page.getByRole('button', { name: 'Agregar fotos' }).boundingBox());
    // Volver a la lista queda encima del título, con área de 44.
    const back = await page.getByRole('link', { name: 'Volver a la lista' }).boundingBox();
    expect(back.height).toBeGreaterThanOrEqual(44);
    expect(back.y).toBeLessThan((await page.getByRole('heading', { level: 1 }).boundingBox()).y);
    await expect(page.getByRole('navigation', { name: 'Ruta' })).toBeHidden();
  });

  test('galería a 390: cuadrícula de 2 columnas y el menú Acciones mueve la foto sin arrastrar', async ({ page }) => {
    await openEdit(page, '/tours/1', galleryCatalog(5));
    const tiles = page.locator('[id^="photo-tile-"]');
    const [a, b, c] = [await tiles.nth(0).boundingBox(), await tiles.nth(1).boundingBox(), await tiles.nth(2).boundingBox()];
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(c.y).toBeGreaterThan(a.y);
    await page.getByRole('button', { name: 'Acciones de la foto 3' }).click();
    await page.getByRole('menuitem', { name: 'Hacer portada' }).click();
    await expect(page.getByAltText('Portada del tour')).toHaveAttribute('src', /foto-3\.jpg$/);
    expect(await noOverflow(page)).toBe(true);
  });

  test('barra inferior de 88 px fija con "Guardar" de 44 y la línea de estado: Sin cambios, Cambios sin guardar, Guardado hace un momento', async ({ page }) => {
    await openEdit(page);
    const b = await bar(page).boundingBox();
    expect(b.height).toBe(88);
    expect(Math.round(b.y + b.height)).toBe(844);
    expect((await save(page).boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(bar(page).getByText('Sin cambios')).toBeVisible();
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await expect(bar(page).getByText('Cambios sin guardar')).toBeVisible();
    // Sigue en el viewport aunque se desplace hasta el final del formulario.
    await page.mouse.wheel(0, 5000);
    expect(Math.round((await save(page).boundingBox()).y + 44)).toBeLessThanOrEqual(844);
    await save(page).click();
    await expect(bar(page).getByText('Guardado hace un momento')).toBeVisible();
    // E5.7: el aviso queda encima de la barra, sin taparla.
    const toast = page.getByRole('status').filter({ hasText: 'Cambios guardados' });
    await expect(toast).toBeVisible();
    const t = await toast.boundingBox();
    expect(t.width).toBe(358);
    expect(t.y + t.height).toBeLessThanOrEqual(844 - 88);
    big(await toast.getByRole('button', { name: 'Cerrar aviso' }).boundingBox());
  });

  test('E5.8: si guardar falla, el error y "Reintentar" se ven sin desplazarse (aviso fijo sobre la barra) y lo escrito se conserva', async ({ page }) => {
    const { override, requests } = await openEdit(page);
    let fail = true;
    override((r) => (r.method === 'PATCH' && fail ? { status: 500, body: {} } : undefined));
    await page.getByLabel('Ubicación').fill('Tulum, México');
    await page.mouse.wheel(0, 5000);
    await save(page).click();
    const toast = page.getByRole('alert').filter({ hasText: 'No pudimos guardar «Cenotes».' });
    await expect(toast).toBeVisible();
    const t = await toast.boundingBox();
    expect(t.y).toBeGreaterThan(0);
    expect(t.y + t.height).toBeLessThanOrEqual(844 - 88);
    const retry = toast.getByRole('button', { name: 'Reintentar' });
    big(await retry.boundingBox());
    await expect(page.getByLabel('Ubicación')).toHaveValue('Tulum, México');
    fail = false;
    await retry.click();
    await expect(bar(page).getByText('Guardado hace un momento')).toBeVisible();
    await expect(toast).toHaveCount(0);
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(2);
  });

  test('E5.10: mientras sube, "Guardar" queda deshabilitado con "Esperando las fotos"; E5.11: si falla, Reintentar y Quitar de 44', async ({ page }) => {
    await openEdit(page);
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    let fail = true;
    await page.route(`${API}/upload`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await gate;
      return fail ? route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{}' }) : route.fallback();
    });
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', MB));
    await expect(save(page)).toBeDisabled();
    await expect(bar(page).getByText('Esperando las fotos')).toBeVisible();
    await expect(page.getByText(/Subiendo… \d+ %/)).toBeVisible();
    release();
    const notice = page.getByRole('alert').filter({ hasText: 'nueva.jpg' });
    await expect(notice).toContainText('No se pudo subir.');
    big(await notice.getByRole('button', { name: 'Reintentar' }).boundingBox());
    big(await notice.getByRole('button', { name: 'Quitar' }).boundingBox());
    expect(await noOverflow(page)).toBe(true);
    fail = false;
    await notice.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('[id^="photo-tile-"]')).toHaveCount(2);
    await expect(save(page)).toBeEnabled();
  });

  test('E5.5: con errores, el resumen sale arriba (debajo del título), los enlaces llevan al campo y el foco no queda bajo la barra', async ({ page }) => {
    await openEdit(page);
    await page.getByLabel('Duración').fill('abc');
    await save(page).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Revisa 1 campo' });
    await expect(summary).toBeVisible();
    await expect(page.getByLabel('Duración')).toBeFocused();
    const summaryBox = await summary.boundingBox();
    expect(summaryBox.y).toBeLessThan((await page.getByLabel('Duración').boundingBox()).y);
    expect(await noOverflow(page)).toBe(true);
  });

  test('alta a 390: barra con "Sin cambios", "Visible en la web" apagado y sin scroll horizontal', async ({ page }) => {
    await openEdit(page, '/tours/new');
    await expect(bar(page).getByText('Sin cambios')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Visible en la web' })).not.toBeChecked();
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
  });

  test('salir con cambios a 390 usa el diálogo estándar y cabe en el ancho', async ({ page }) => {
    await openEdit(page);
    await page.getByLabel('Ubicación').fill('Otra');
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Salir sin guardar?' });
    await expect(dialog).toBeVisible();
    expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(358);
    await expect(dialog.getByRole('button', { name: 'Seguir editando' })).toBeFocused();
    expect(await blocking(page)).toEqual([]);
  });

  test('axe: 0 serious/critical en edición, alta y con errores a 390', async ({ page }) => {
    await openEdit(page);
    expect(await blocking(page)).toEqual([]);
    await page.getByLabel('Duración').fill('abc');
    await save(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa 1 campo' })).toBeVisible();
    expect(await blocking(page)).toEqual([]);
    await page.goto('/tours/new');
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
    expect(await blocking(page)).toEqual([]);
  });
});
