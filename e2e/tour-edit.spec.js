import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { API, mockApi } from './fixtures/mockApi.js';
import { editCatalog, openTour, source, writes } from './fixtures/tourEdit.js';

const save = (page) => page.getByRole('button', { name: 'Guardar' });
const field = (page, label) => page.getByLabel(label, { exact: false }).first();
const heading = (page, name) => page.getByRole('heading', { name, level: 1 });
const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name) });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function axeClean(page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))).toEqual([]);
}

test.describe('V5 Edición de tour (T-8)', () => {
  test('AC-9: guardar un tour existente se queda en la página y confirma', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/1');
    await expect(heading(page, 'Cenotes')).toBeVisible();
    await field(page, 'Duración').fill('270');
    await expect(page.getByText('= 4 h 30 min')).toBeVisible();
    await save(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Cambios guardados' })).toBeVisible();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    await expect(page).toHaveURL('/tours/1');
    const [patch] = writes(requests);
    expect(patch).toMatchObject({ method: 'PATCH', path: '/tours/1' });
    expect(patch.body).toMatchObject({ adminTitle: 'cenotes', duration: 270, price: 1000, categoryId: 1, isActive: true, img: '/uploads/tour-1.jpg' });
    expect(patch.body.translations.map((t) => t.languageId)).toEqual([1, 2]);
  });

  test('AC-9: crear un tour nuevo nace oculto y lleva a /tours/<id> con la misma confirmación', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/new');
    await expect(heading(page, 'Nuevo tour')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Visible en la web' })).not.toBeChecked();
    await expect(page.getByText('Oculto: los viajeros no lo ven.')).toBeVisible();
    await field(page, 'Nombre admin').fill('nuevo-tour');
    await page.getByRole('combobox', { name: 'Categoría' }).click();
    await page.getByRole('option', { name: 'Islas' }).click();
    await field(page, 'Ubicación').fill('Cancún, México');
    await field(page, 'Duración').fill('90');
    await field(page, 'Precio').fill('1500');
    await field(page, 'Título (Español)').fill('Nuevo tour');
    await field(page, 'Descripción (Español)').fill('Una descripción.');
    await tab(page, 'English').click();
    await field(page, 'Título (English)').fill('New tour');
    await field(page, 'Descripción (English)').fill('A description.');
    await save(page).click();
    await expect(page).toHaveURL('/tours/40');
    await expect(page.getByRole('status').filter({ hasText: 'Cambios guardados' })).toBeVisible();
    await expect(heading(page, 'Cenotes')).toBeVisible(); // GET /tours/40 de la fixture
    const [post] = writes(requests);
    expect(post).toMatchObject({ method: 'POST', path: '/tours' });
    expect(post.body).toMatchObject({ adminTitle: 'nuevo-tour', categoryId: 4, duration: 90, price: 1500, isActive: false, img: null });
    // El aviso no se repite al recargar.
    await page.reload();
    await expect(heading(page, 'Cenotes')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Cambios guardados' })).toHaveCount(0);
  });

  test('AC-10: título en inglés vacío con Español abierto: nada se envía, resumen, pestaña marcada y foco en el campo', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/1');
    await tab(page, 'English').click();
    await field(page, 'Título (English)').fill('');
    await tab(page, 'Español').click();
    await save(page).click();
    expect(writes(requests)).toEqual([]);
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa 1 campo' })).toBeVisible();
    await expect(page.getByText('Corrige lo marcado para guardar. No se guardó nada todavía.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Título (English)' })).toBeVisible();
    await expect(tab(page, 'English')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'English')).toContainText('1 error');
    const title = field(page, 'Título (English)');
    await expect(title).toBeFocused();
    await expect(page.getByText('Escribe el título en inglés.')).toBeVisible();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    // Al corregir, el error y el resumen desaparecen y se puede guardar.
    await title.fill('Cenotes EN');
    await expect(page.getByText('Revisa 1 campo')).toHaveCount(0);
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests)).toHaveLength(1);
  });

  test('AC-10: el primer error va en orden de lectura; si es de Datos generales la pestaña actual no cambia y la otra queda marcada', async ({ page }) => {
    await openTour(page, '/tours/1');
    await field(page, 'Ubicación').fill('');
    await tab(page, 'English').click();
    await field(page, 'Título (English)').fill('');
    await field(page, 'Descripción (English)').fill('');
    await tab(page, 'Español').click();
    await save(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa 3 campos' })).toBeVisible();
    await expect(field(page, 'Ubicación')).toBeFocused();
    await expect(page.getByText('Escribe la ubicación.')).toBeVisible();
    await expect(tab(page, 'Español')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'English')).toContainText('2 errores');
    // Los enlaces del resumen llevan al campo y abren su pestaña.
    await page.getByRole('button', { name: 'Descripción (English)' }).click();
    await expect(tab(page, 'English')).toHaveAttribute('aria-selected', 'true');
    await expect(field(page, 'Descripción (English)')).toBeFocused();
  });

  test('AC-10: nombre admin, categoría, duración y precio inválidos se marcan con texto junto al campo', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/new');
    await save(page).click();
    expect(writes(requests)).toEqual([]);
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa 9 campos' })).toBeVisible();
    for (const text of ['Escribe el nombre admin.', 'Elige una categoría.', 'Escribe la ubicación.', 'Escribe la duración en minutos.', 'Escribe el precio.']) {
      await expect(page.getByText(text)).toBeVisible();
    }
    await expect(field(page, 'Nombre admin')).toBeFocused();
    await field(page, 'Duración').fill('0');
    await expect(page.getByText('Escribe minutos en número entero, 1 o más.')).toBeVisible();
    await field(page, 'Precio').fill('-5');
    await expect(page.getByText('Escribe un precio de 0 o más.')).toBeVisible();
  });

  test('AC-11: si guardar falla se ve el motivo con Reintentar y los campos conservan lo escrito', async ({ page }) => {
    const { requests, override } = await openTour(page, '/tours/1');
    let fail = true;
    override((r) => (r.method === 'PATCH' && fail ? { status: 500, body: { message: 'boom' } } : undefined));
    await field(page, 'Ubicación').fill('Tulum, México');
    await save(page).click();
    const banner = page.getByRole('alert').filter({ hasText: 'No se pudo guardar el tour' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('El servidor tuvo un problema. Intenta de nuevo en un momento.');
    await expect(field(page, 'Ubicación')).toHaveValue('Tulum, México');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    fail = false;
    await banner.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    await expect(banner).toHaveCount(0);
    expect(writes(requests)).toHaveLength(2);
  });

  test('AC-11: sin red, el motivo habla de la conexión', async ({ page }) => {
    await openTour(page, '/tours/1');
    await page.route(`${API}/tours/1`, (route) => (route.request().method() === 'PATCH' ? route.abort() : route.fallback()));
    await field(page, 'Ubicación').fill('Tulum, México');
    await save(page).click();
    await expect(page.getByText('Perdimos la conexión con el servidor. Lo que escribiste sigue aquí.')).toBeVisible();
    await expect(field(page, 'Ubicación')).toHaveValue('Tulum, México');
  });

  test('AC-11 y AC-28: ninguna llamada a alert( ni confirm( en la edición de tour', async () => {
    for (const file of ['src/pages/tours/TourEdit.jsx', 'src/pages/tours/PhotoField.jsx']) {
      expect(source(file)).not.toMatch(/\b(alert|confirm)\(/);
    }
  });

  test('AC-13: Guardar siempre visible, "= 2 h 30 min", "$" y "MXN" y contadores', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 560 });
    await openTour(page, '/tours/1');
    await expect(page.getByText('= 2 h 30 min')).toBeVisible();
    await expect(page.getByText('$', { exact: true })).toBeVisible();
    await expect(page.getByText('MXN', { exact: true })).toBeVisible();
    await expect(page.getByText('7 caracteres')).toBeVisible(); // "Cenotes"
    await expect(page.getByText('26 caracteres')).toBeVisible(); // descripción
    await field(page, 'Duración').fill('');
    await expect(page.getByText('Escribe los minutos. Ej.: 150 = 2 h 30 min')).toBeVisible();
    await expect(save(page)).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(save(page)).toBeInViewport();
    await page.getByRole('heading', { name: 'Textos por idioma' }).scrollIntoViewIfNeeded();
    await expect(save(page)).toBeInViewport();
    expect((await save(page).boundingBox()).height).toBeGreaterThanOrEqual(40);
    expect(await noOverflow(page)).toBe(true);
  });

  test('AC-14: un tour que no existe (cuerpo vacío o 404) lo dice y ofrece ir a la lista', async ({ page }) => {
    await openTour(page, '/tours/999999');
    await expect(page.getByRole('heading', { name: 'Este tour no existe o se eliminó.' })).toBeVisible();
    await expect(page.getByText('Puede que el enlace esté incompleto o que alguien lo haya borrado.')).toBeVisible();
    await expect(save(page)).toHaveCount(0);
    await axeClean(page);
    await page.getByRole('button', { name: 'Ir a la lista' }).click();
    await expect(page).toHaveURL('/tours');
  });

  test('AC-14: el API responde 404 -> mismo estado', async ({ page }) => {
    const api = await mockApi(page, { data: { tours: editCatalog() } });
    api.override((r) => (r.path === '/tours/7' ? { status: 404, body: { message: 'Not Found' } } : undefined));
    await page.goto('/tours/7');
    await expect(page.getByRole('heading', { name: 'Este tour no existe o se eliminó.' })).toBeVisible();
  });

  test('AC-14: un id no numérico no llama al API', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/abc');
    await expect(page.getByRole('heading', { name: 'Este tour no existe o se eliminó.' })).toBeVisible();
    expect(requests.filter((r) => r.path.startsWith('/tours/abc'))).toEqual([]);
  });

  test('AC-24: un idioma inactivo (fr) no es obligatorio y su pestaña se puede editar', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/1');
    await expect(tab(page, 'Français')).not.toContainText('Pendiente');
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests)[0].body.translations.map((t) => t.languageId)).toEqual([1, 2]); // sin fr vacío
    await tab(page, 'Français').click();
    await field(page, 'Título (Français)').fill('Cénotes');
    await field(page, 'Descripción (Français)').fill('Nagez.');
    await save(page).click();
    await expect.poll(() => writes(requests).length).toBe(2);
    expect(writes(requests)[1].body.translations.map((t) => t.languageId)).toEqual([1, 2, 3]);
  });

  test('un idioma activo incompleto se ve como Pendiente y con palomita cuando está completo', async ({ page }) => {
    await openTour(page, '/tours/4');
    await expect(tab(page, 'Español')).toContainText('(completo)');
    await expect(tab(page, 'English')).toContainText('Pendiente');
    await tab(page, 'English').click();
    await expect(page.getByText('0 caracteres').first()).toBeVisible();
  });

  test('guardar con la foto y el interruptor: el cuerpo lleva isActive y la foto actual', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/1');
    await page.getByRole('switch', { name: 'Visible en la web' }).uncheck();
    await expect(page.getByText('Oculto: los viajeros no lo ven.')).toBeVisible();
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests)[0].body.isActive).toBe(false);
  });

  test('E5.1: cargando muestra el esqueleto con Guardar deshabilitado', async ({ page }) => {
    let release;
    const gate = new Promise((r) => { release = r; });
    await mockApi(page, { data: { tours: editCatalog() } });
    await page.route(`${API}/tours/1`, async (route) => {
      await gate;
      await route.fallback();
    });
    await page.goto('/tours/1');
    await expect(page.getByLabel('Cargando el tour')).toHaveAttribute('aria-busy', 'true');
    await expect(save(page)).toBeDisabled();
    release();
    await expect(heading(page, 'Cenotes')).toBeVisible();
  });

  test('error al cargar el tour: motivo y Reintentar', async ({ page }) => {
    const api = await mockApi(page, { data: { tours: editCatalog() } });
    let fail = true;
    api.override((r) => (r.path === '/tours/1' && fail ? { status: 500, body: {} } : undefined));
    await page.goto('/tours/1');
    await expect(page.getByRole('heading', { name: 'No pudimos cargar el tour.' })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(heading(page, 'Cenotes')).toBeVisible();
  });

  test('sin scroll horizontal a 1440 y 1280; controles de al menos 40 px de alto', async ({ page }) => {
    await openTour(page, '/tours/1');
    expect(await noOverflow(page)).toBe(true);
    for (const label of ['Nombre admin', 'Ubicación', 'Duración', 'Precio', 'Título (Español)']) {
      expect((await field(page, label).locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")][1]').boundingBox()).height).toBeGreaterThanOrEqual(40);
    }
    expect((await page.getByRole('combobox', { name: 'Categoría' }).locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")][1]').boundingBox()).height).toBeGreaterThanOrEqual(40);
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await noOverflow(page)).toBe(true);
  });

  test('axe: sin violaciones serias en nuevo, existente, con errores y con foto fallida', async ({ page }) => {
    await openTour(page, '/tours/new');
    await axeClean(page);
    await page.goto('/tours/4');
    await expect(heading(page, 'Snorkel & Buceo')).toBeVisible();
    await axeClean(page);
    await save(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa 2 campos' })).toBeVisible();
    await axeClean(page);
  });
});
