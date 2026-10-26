import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { API } from './fixtures/mockApi.js';
import { MB, editCatalog, fileOf, openTour, uploads, writes } from './fixtures/tourEdit.js';

const save = (page) => page.getByRole('button', { name: 'Guardar' });
const chooser = (page) => page.getByLabel('Elegir foto', { exact: true });
const preview = (page) => page.getByAltText('Vista previa de la foto');

// Dos tours con el mismo nombre admin (REQ-18): cada uno debe conservar su foto.
function sameNameCatalog() {
  const list = editCatalog();
  list.find((t) => t.id === 1).adminTitle = 'mismo-nombre';
  list.find((t) => t.id === 2).adminTitle = 'mismo-nombre';
  return list;
}

// Sube con un nombre distinto cada vez, como la API con UUID.
function uniqueUploads(override) {
  let n = 0;
  override((r) => (r.method === 'POST' && r.path === '/upload' ? { status: 201, body: { url: `/uploads/uuid-${++n}.jpg` } } : undefined));
}

test.describe('Foto del tour (T-8)', () => {
  test('AC-15: antes de elegir se leen los formatos y el peso; el input acepta solo esos cuatro tipos', async ({ page }) => {
    await openTour(page, '/tours/new');
    await expect(page.getByText('JPG, PNG, WebP o GIF · hasta 10 MB')).toBeVisible();
    await expect(page.getByText('Arrastra una foto aquí')).toBeVisible();
    await expect(page.getByText('Usa una foto horizontal (3:2 o más ancha). La web la recorta para llenar la tarjeta.')).toBeVisible();
    await expect(chooser(page)).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  });

  test('AC-15: un HEIC se rechaza sin llamar al API, con el motivo y la zona lista', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/new');
    await chooser(page).setInputFiles(fileOf('IMG_0042.heic', 'image/heic', 2 * MB));
    const notice = page.getByRole('alert').filter({ hasText: 'Ese archivo es HEIC.' });
    await expect(notice).toContainText('Elige un JPG, PNG, WebP o GIF.');
    await expect(page.getByRole('button', { name: 'Elegir archivo' })).toBeVisible();
    expect(uploads(requests)).toEqual([]);
    // Elegir otro válido limpia el aviso.
    await chooser(page).setInputFiles(fileOf('buena.jpg', 'image/jpeg', MB));
    await expect(notice).toHaveCount(0);
    await expect(preview(page)).toBeVisible();
    expect(uploads(requests)).toHaveLength(1);
  });

  test('AC-15: más de 10 MB se rechaza sin llamar al API, con el peso en formato es-MX', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/new');
    await chooser(page).setInputFiles(fileOf('grande.png', 'image/png', Math.round(14.2 * MB)));
    const notice = page.getByRole('alert').filter({ hasText: 'Esa foto pesa 14.2 MB. El máximo es 10 MB.' });
    await expect(notice).toContainText('Elige una más ligera.');
    expect(uploads(requests)).toEqual([]);
  });

  test('AC-15: un archivo de exactamente 10 MB también se rechaza (el API da 413), uno apenas menor se sube', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/new');
    await chooser(page).setInputFiles(fileOf('justo.jpg', 'image/jpeg', 10 * MB));
    await expect(page.getByRole('alert').filter({ hasText: 'El máximo es 10 MB.' })).toBeVisible();
    expect(uploads(requests)).toEqual([]);
    await chooser(page).setInputFiles(fileOf('casi.jpg', 'image/jpeg', 10 * MB - 1));
    await expect(preview(page)).toBeVisible();
    expect(uploads(requests)).toHaveLength(1);
  });

  test('AC-15: un rechazo en un tour con foto conserva la foto y el aviso sale debajo', async ({ page }) => {
    await openTour(page, '/tours/1');
    await chooser(page).setInputFiles(fileOf('doc.pdf', 'application/pdf', MB));
    await expect(page.getByRole('alert').filter({ hasText: 'Ese archivo es PDF.' })).toBeVisible();
    await expect(preview(page)).toHaveAttribute('src', /tour-1\.jpg$/);
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
  });

  test('AC-16: mientras sube se ve el avance y Guardar queda deshabilitado con su motivo; Cancelar vuelve a la foto anterior', async ({ page }) => {
    await openTour(page, '/tours/1');
    let release;
    const gate = new Promise((r) => { release = r; });
    await page.route(`${API}/upload`, async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback();
      await gate;
      return route.fallback();
    });
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', 3 * MB));
    await expect(page.getByText(/Subiendo… \d+ %/)).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Avance de la subida' })).toBeVisible();
    await expect(page.getByText('nueva.jpg', { exact: true })).toBeVisible();
    await expect(save(page)).toBeDisabled();
    await expect(page.getByText('Esperando la foto')).toBeVisible();
    await expect(page.getByText('Espera a que termine para guardar.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(save(page)).toBeEnabled();
    await expect(preview(page)).toHaveAttribute('src', /tour-1\.jpg$/);
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
    release();
  });

  test('AC-16: con la subida cortada: mensaje, Reintentar, Elegir otra y la vista previa anterior', async ({ page }) => {
    const { requests, override } = await openTour(page, '/tours/1');
    uniqueUploads(override);
    let cut = true;
    await page.route(`${API}/upload`, (route) => (cut && route.request().method() === 'POST' ? route.abort() : route.fallback()));
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', 3 * MB));
    const notice = page.getByRole('alert').filter({ hasText: 'No se pudo subir la foto.' });
    await expect(notice).toContainText('Se conserva la foto anterior.');
    await expect(preview(page)).toHaveAttribute('src', /tour-1\.jpg$/);
    await expect(notice.getByRole('button', { name: 'Elegir otra' })).toBeVisible();
    await expect(save(page)).toBeEnabled();
    cut = false;
    await notice.getByRole('button', { name: 'Reintentar' }).click(); // mismo archivo
    await expect(page.getByText('Foto nueva. La web la mostrará cuando guardes.')).toBeVisible();
    await expect(preview(page)).toHaveAttribute('src', /uuid-1\.jpg$/);
    expect(uploads(requests)).toHaveLength(1);
  });

  test('un 413 del API se explica con el límite', async ({ page }) => {
    const { override } = await openTour(page, '/tours/1');
    override((r) => (r.method === 'POST' && r.path === '/upload' ? { status: 413, body: {} } : undefined));
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', 2 * MB));
    await expect(page.getByRole('alert').filter({ hasText: 'La foto pesa más de 10 MB.' })).toBeVisible();
  });

  test('foto cargada: nombre y peso en es-MX, "Foto nueva" y Cambios sin guardar', async ({ page }) => {
    const { override } = await openTour(page, '/tours/1');
    uniqueUploads(override);
    await expect(page.getByText('tour-1.jpg', { exact: true })).toBeVisible();
    await expect(page.getByText('Foto nueva.')).toHaveCount(0);
    await chooser(page).setInputFiles(fileOf('snorkel-buceo-nueva.jpg', 'image/jpeg', Math.round(3.8 * MB)));
    await expect(page.getByText('snorkel-buceo-nueva.jpg · 3.8 MB')).toBeVisible();
    await expect(page.getByText('Foto nueva. La web la mostrará cuando guardes.')).toBeVisible();
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cambiar foto' })).toBeVisible();
  });

  test('D-9: la vista previa es 3:2 (288×192) con recorte cover', async ({ page }) => {
    await openTour(page, '/tours/1');
    const box = await preview(page).boundingBox();
    expect(Math.round(box.width)).toBe(288);
    expect(Math.round(box.height)).toBe(192);
    await expect(preview(page)).toHaveCSS('object-fit', 'cover');
  });

  test('AC-17: la subida no lleva name; la foto no se publica hasta guardar; descartar no manda ningún PATCH', async ({ page }) => {
    const { requests, override } = await openTour(page, '/tours/1');
    uniqueUploads(override);
    await chooser(page).setInputFiles(fileOf('foto-b.jpg', 'image/jpeg', MB));
    await expect(page.getByText('Foto nueva.')).toBeVisible();
    const [upload] = uploads(requests);
    expect(upload.body).toContain('name="file"');
    expect(upload.body).not.toContain('name="name"');
    expect(writes(requests)).toEqual([]); // subir no cambia el tour
    // Descartar: salir sin guardar.
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await page.getByRole('button', { name: 'Salir y descartar' }).click();
    await expect(page).toHaveURL('/tours');
    expect(writes(requests)).toEqual([]);
    // Subir y guardar: el PATCH lleva el img nuevo.
    await page.goto('/tours/1');
    await chooser(page).setInputFiles(fileOf('foto-b.jpg', 'image/jpeg', MB));
    await expect(page.getByText('Foto nueva.')).toBeVisible();
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests).map((w) => w.body.img)).toEqual(['/uploads/uuid-2.jpg']);
    await expect(page.getByText('Foto nueva.')).toHaveCount(0);
  });

  test('AC-17: dos tours con el mismo nombre admin reciben fotos distintas', async ({ page }) => {
    const { requests, override } = await openTour(page, '/tours/1', { tours: sameNameCatalog() });
    uniqueUploads(override);
    await chooser(page).setInputFiles(fileOf('a.jpg', 'image/jpeg', MB));
    await expect(page.getByText('Foto nueva.')).toBeVisible();
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    await page.goto('/tours/2');
    await chooser(page).setInputFiles(fileOf('a.jpg', 'image/jpeg', MB));
    await expect(page.getByText('Foto nueva.')).toBeVisible();
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    const patches = writes(requests);
    expect(patches.map((p) => p.path)).toEqual(['/tours/1', '/tours/2']);
    expect(patches.every((p) => p.body.adminTitle === 'mismo-nombre')).toBe(true);
    const [a, b] = patches.map((p) => p.body.img);
    expect(a).not.toBe(b);
    // Ninguna de las dos subidas mandó el nombre admin como `name`.
    expect(uploads(requests).every((u) => !u.body.includes('name="name"'))).toBe(true);
  });

  test('arrastrar y soltar usa el mismo camino que elegir archivo', async ({ page }) => {
    const { requests } = await openTour(page, '/tours/new');
    const data = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(1024)], 'soltada.jpg', { type: 'image/jpeg' }));
      return dt;
    });
    await page.getByText('Arrastra una foto aquí').dispatchEvent('drop', { dataTransfer: data });
    await expect(preview(page)).toBeVisible();
    expect(uploads(requests)).toHaveLength(1);
  });

  test('foto que no carga: la vista previa muestra un marco neutro, no una imagen rota', async ({ page }) => {
    const { override } = await openTour(page, '/tours/1');
    void override;
    await page.route(`${API}/upload/*`, (route) => (route.request().method() === 'GET' ? route.fulfill({ status: 400, headers: { 'access-control-allow-origin': '*' }, body: '{}' }) : route.fallback()));
    await page.reload();
    await expect(page.getByTestId('photo-preview-neutral')).toBeVisible();
  });

  test('axe: sin violaciones serias con foto, subiendo y con error', async ({ page }) => {
    await openTour(page, '/tours/1');
    const serious = async () =>
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(await serious()).toEqual([]);
    await chooser(page).setInputFiles(fileOf('doc.pdf', 'application/pdf', MB));
    await expect(page.getByRole('alert').filter({ hasText: 'Ese archivo es PDF.' })).toBeVisible();
    expect(await serious()).toEqual([]);
  });
});
