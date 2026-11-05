import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { API } from './fixtures/mockApi.js';
import { MB, fileOf, galleryCatalog, openTour, uploads, writes } from './fixtures/tourEdit.js';

// Fotos del tour (spec 006, T-3): REQ-13 a REQ-19, REQ-21; AC-10 a AC-14 y AC-16 (admin).
const save = (page) => page.getByRole('button', { name: 'Guardar' });
const chooser = (page) => page.getByLabel('Elegir fotos', { exact: true });
const tiles = (page) => page.locator('[id^="photo-tile-"]');
const actions = (page, n) => page.getByRole('button', { name: `Acciones de la foto ${n}` });
const cover = (page) => page.getByAltText('Portada del tour');
const visibleSwitch = (page) => page.getByRole('switch', { name: 'Visible en la web' });
const order = async (page) => (await tiles(page).evaluateAll((els) => els.map((el) => el.id.replace('photo-tile-', ''))));
const withOpen = async (page, count, options, url = '/tours/1') => openTour(page, url, { tours: galleryCatalog(count, options) });
const serious = async (page) => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact));

async function menuItem(page, photo, name) {
  await actions(page, photo).click();
  await page.getByRole('menuitem', { name }).click();
  await expect(page.getByRole('menu')).toHaveCount(0); // espera a que cierre el menú
}

test.describe('Fotos del tour: la sección (REQ-13, REQ-14, REQ-15)', () => {
  test('va entre Datos generales y Textos por idioma, con contador, ayuda, portada marcada y la misma foto en el riel', async ({ page }) => {
    await withOpen(page, 6);
    const y = async (name) => (await page.getByRole('heading', { name, exact: true }).boundingBox()).y;
    expect(await y('Datos generales')).toBeLessThan(await y('Fotos del tour'));
    expect(await y('Fotos del tour')).toBeLessThan(await y('Textos por idioma'));
    await expect(page.getByText('6 de 8 fotos · Recomendado: 5 o 6')).toBeVisible();
    await expect(page.getByText('La primera es la portada: es la que se ve en la tarjeta de la web. Arrastra o usa Acciones para cambiar el orden.')).toBeVisible();
    await expect(tiles(page)).toHaveCount(6);
    await expect(page.getByLabel('Foto 1 de 6, portada')).toBeVisible();
    await expect(page.getByLabel('Foto 2 de 6', { exact: true })).toBeVisible();
    await expect(tiles(page).first().getByText('Portada', { exact: true })).toBeVisible();
    await expect(page.getByText('Portada', { exact: true })).toHaveCount(2); // chip y título del riel
    await expect(cover(page)).toHaveAttribute('src', /foto-1\.jpg$/);
    await expect(page.getByText('Así se ve en la tarjeta')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agregar fotos' })).toBeVisible();
    await expect(page.getByText('Suelta aquí tus fotos o elige archivos')).toBeVisible();
  });

  test('D-9: la vista previa de la portada es 3:2 (288×192) con recorte cover', async ({ page }) => {
    await withOpen(page, 3);
    const box = await cover(page).boundingBox();
    expect(Math.round(box.width)).toBe(288);
    expect(Math.round(box.height)).toBe(192);
    await expect(cover(page)).toHaveCSS('object-fit', 'cover');
  });

  test('el selector es múltiple y solo acepta JPG, PNG, WebP y GIF', async ({ page }) => {
    await withOpen(page, 2);
    await expect(chooser(page)).toHaveAttribute('multiple', '');
    await expect(chooser(page)).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  });

  test('sin fotos: zona vacía con su texto, riel con "Sin foto" y portada vacía (D-A8)', async ({ page }) => {
    await withOpen(page, 0, { isActive: false });
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
    await expect(page.getByText('0 de 8 fotos · Recomendado: 5 o 6')).toBeVisible();
    await expect(page.getByText('JPG, PNG, WebP o GIF · menos de 10 MB cada una')).toBeVisible();
    await expect(page.getByText('Sin foto', { exact: true })).toBeVisible();
    await expect(page.getByText('Agrega fotos en Fotos del tour.')).toBeVisible();
    await expect(cover(page)).toHaveCount(0);
    await expect(tiles(page)).toHaveCount(0);
  });
});

test.describe('Orden y portada (REQ-14, REQ-17; AC-10)', () => {
  test('AC-10: con el menú Acciones se mueve, se hace portada, se anuncia y el foco sigue a la foto', async ({ page }) => {
    const { requests } = await withOpen(page, 4);
    await actions(page, 2).click();
    const items = page.getByRole('menuitem');
    await expect(items).toHaveText(['Hacer portada', 'Mover antes', 'Mover después', 'Eliminar']);
    await page.getByRole('menuitem', { name: 'Mover después' }).click();
    expect(await order(page)).toEqual(['foto-1.jpg', 'foto-3.jpg', 'foto-2.jpg', 'foto-4.jpg']);
    await expect(page.getByText('Foto movida a la posición 3 de 4.')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Acciones de la foto 3' })).toBeFocused();
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();

    await menuItem(page, 4, 'Hacer portada');
    expect(await order(page)).toEqual(['foto-4.jpg', 'foto-1.jpg', 'foto-3.jpg', 'foto-2.jpg']);
    await expect(page.getByLabel('Foto 1 de 4, portada')).toBeVisible();
    await expect(cover(page)).toHaveAttribute('src', /foto-4\.jpg$/); // el riel muestra esa misma foto
    await expect(page.getByText('Foto movida a la posición 1 de 4.')).toBeAttached();

    await menuItem(page, 2, 'Mover antes');
    expect(await order(page)).toEqual(['foto-1.jpg', 'foto-4.jpg', 'foto-3.jpg', 'foto-2.jpg']);

    expect(writes(requests)).toEqual([]); // nada llega al API hasta guardar (REQ-19)
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    const [patch] = writes(requests);
    expect(patch.body.images).toEqual(['foto-1.jpg', 'foto-4.jpg', 'foto-3.jpg', 'foto-2.jpg']);
    expect(patch.body).not.toHaveProperty('img');
  });

  test('AC-10: la primera no puede hacerse portada ni moverse antes; la última no se mueve después', async ({ page }) => {
    await withOpen(page, 3);
    await actions(page, 1).click();
    await expect(page.getByRole('menuitem', { name: 'Hacer portada' })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Mover antes' })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Mover después' })).toBeEnabled();
    await page.keyboard.press('Escape');
    await actions(page, 3).click();
    await expect(page.getByRole('menuitem', { name: 'Mover después' })).toBeDisabled();
  });

  test('AC-10: el menú se maneja con teclado', async ({ page }) => {
    await withOpen(page, 3);
    await actions(page, 2).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Hacer portada' })).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await order(page)).toEqual(['foto-2.jpg', 'foto-1.jpg', 'foto-3.jpg']);
  });

  test('a 1440 también se reordena arrastrando desde la manija', async ({ page }) => {
    await withOpen(page, 4);
    await expect(page.getByTestId('photo-handle')).toHaveCount(4);
    await page.getByTestId('photo-handle').nth(0).dragTo(tiles(page).nth(2));
    expect(await order(page)).toEqual(['foto-2.jpg', 'foto-3.jpg', 'foto-1.jpg', 'foto-4.jpg']);
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await expect(cover(page)).toHaveAttribute('src', /foto-2\.jpg$/);
  });

  test('bajo 1200 px no hay manija ni zona para soltar, y la ayuda no habla de arrastrar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await withOpen(page, 3);
    await expect(page.getByTestId('photo-handle')).toHaveCount(0);
    await expect(page.getByText('Suelta aquí tus fotos o elige archivos')).toHaveCount(0);
    await expect(page.getByText('La primera es la portada: es la que se ve en la tarjeta de la web. Usa Acciones para cambiar el orden.')).toBeVisible();
    await menuItem(page, 1, 'Mover después');
    expect(await order(page)).toEqual(['foto-2.jpg', 'foto-1.jpg', 'foto-3.jpg']);
  });
});

test.describe('Subir varias fotos (REQ-15, REQ-16; AC-11, AC-12)', () => {
  test('AC-12: 4 archivos (2 válidos, 1 de 10 MB o más, 1 HEIC): avance, motivos, Quitar y Guardar bloqueado', async ({ page }) => {
    const { requests } = await withOpen(page, 2);
    let release;
    const gate = new Promise((r) => { release = r; });
    await page.route(`${API}/upload`, async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback();
      await gate;
      return route.fallback();
    });
    await chooser(page).setInputFiles([
      fileOf('cenote-orilla.jpg', 'image/jpeg', 2 * MB),
      fileOf('cenote-grieta.jpg', 'image/jpeg', 2 * MB),
      fileOf('cenote-aereo.png', 'image/png', 14 * MB),
      fileOf('IMG_4021.heic', 'image/heic', 2 * MB),
    ]);
    await expect(page.getByText('cenote-orilla.jpg', { exact: true })).toBeVisible();
    await expect(page.getByText(/Subiendo… \d+ %/)).toHaveCount(2);
    await expect(page.getByRole('progressbar')).toHaveCount(2);
    const big = page.getByRole('alert').filter({ hasText: 'cenote-aereo.png' });
    await expect(big).toContainText('Esa foto pesa más de 10 MB. Elige una más ligera.');
    const heic = page.getByRole('alert').filter({ hasText: 'IMG_4021.heic' });
    await expect(heic).toContainText('Ese archivo es HEIC. Elige un JPG, PNG, WebP o GIF.');
    await expect(save(page)).toBeDisabled();
    await expect(page.getByText('Esperando las fotos')).toBeVisible();
    expect(uploads(requests)).toHaveLength(0); // los rechazados nunca se envían
    release();
    await expect(tiles(page)).toHaveCount(4);
    await expect(save(page)).toBeEnabled(); // los rechazados no bloquean
    expect(uploads(requests)).toHaveLength(2);
    expect((await order(page)).slice(0, 2)).toEqual(['foto-1.jpg', 'foto-2.jpg']);
    await big.getByRole('button', { name: 'Quitar' }).click();
    await heic.getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('4 de 8 fotos · Recomendado: 5 o 6')).toBeVisible();
  });

  test('AC-12: las subidas no llevan name (nombre único) y van en paralelo', async ({ page }) => {
    const { requests } = await withOpen(page, 1);
    await chooser(page).setInputFiles([fileOf('a.jpg', 'image/jpeg', MB), fileOf('b.jpg', 'image/jpeg', MB), fileOf('c.webp', 'image/webp', MB)]);
    await expect(tiles(page)).toHaveCount(4);
    const sent = uploads(requests);
    expect(sent).toHaveLength(3);
    expect(sent.every((u) => u.body.includes('name="file"') && !u.body.includes('name="name"'))).toBe(true);
    expect(new Set(await order(page)).size).toBe(4); // nombres distintos
  });

  test('AC-12: un archivo de exactamente 10 MB se rechaza (el API da 413) y uno apenas menor se sube', async ({ page }) => {
    const { requests } = await withOpen(page, 1);
    await chooser(page).setInputFiles(fileOf('justo.jpg', 'image/jpeg', 10 * MB));
    await expect(page.getByRole('alert').filter({ hasText: 'Esa foto pesa más de 10 MB.' })).toBeVisible();
    expect(uploads(requests)).toEqual([]);
    await chooser(page).setInputFiles(fileOf('casi.jpg', 'image/jpeg', 10 * MB - 1));
    await expect(tiles(page)).toHaveCount(2);
  });

  test('AC-12: con la red cortada sale "No se pudo subir." con Reintentar y Quitar; Reintentar sube el mismo archivo', async ({ page }) => {
    const { requests } = await withOpen(page, 2);
    let cut = true;
    await page.route(`${API}/upload`, (route) => (cut && route.request().method() === 'POST' ? route.abort() : route.fallback()));
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', MB));
    const failed = page.getByRole('alert').filter({ hasText: 'nueva.jpg' });
    await expect(failed).toContainText('No se pudo subir.');
    await expect(save(page)).toBeEnabled();
    cut = false;
    await failed.getByRole('button', { name: 'Reintentar' }).click();
    await expect(tiles(page)).toHaveCount(3);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(uploads(requests)).toHaveLength(1);
  });

  test('AC-12: un 413 del API se explica con el límite y solo ofrece Quitar', async ({ page }) => {
    const { override } = await withOpen(page, 2);
    override((r) => (r.method === 'POST' && r.path === '/upload' ? { status: 413, body: {} } : undefined));
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', 2 * MB));
    const failed = page.getByRole('alert').filter({ hasText: 'nueva.jpg' });
    await expect(failed).toContainText('Esa foto pesa más de 10 MB.');
    await expect(failed.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
    await failed.getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('AC-11: con 6 fotos y 4 archivos elegidos se suben 2 y el aviso dice que 2 no se agregaron', async ({ page }) => {
    const { requests } = await withOpen(page, 6);
    await chooser(page).setInputFiles(['a', 'b', 'c', 'd'].map((n) => fileOf(`${n}.jpg`, 'image/jpeg', MB)));
    await expect(tiles(page)).toHaveCount(8);
    expect(uploads(requests)).toHaveLength(2);
    await expect(page.getByText('Solo caben 2 fotos más; 2 no se agregaron.')).toBeVisible();
    await expect(page.getByText('8 de 8 fotos · Recomendado: 5 o 6')).toBeVisible();
  });

  test('AC-11: con 8 fotos, "Agregar fotos" está deshabilitado y dice por qué; al eliminar una se habilita', async ({ page }) => {
    await withOpen(page, 8);
    const add = page.getByRole('button', { name: 'Agregar fotos' });
    await expect(add).toBeDisabled();
    await expect(page.getByText('Llegaste al máximo de 8 fotos. Elimina una para agregar otra.')).toBeVisible();
    await expect(add).toHaveAccessibleDescription('Llegaste al máximo de 8 fotos. Elimina una para agregar otra.');
    await menuItem(page, 8, 'Eliminar');
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(add).toBeEnabled();
    await expect(page.getByText('Llegaste al máximo de 8 fotos.')).toHaveCount(0);
  });

  test('AC-11: soltar archivos sobre la zona usa el mismo camino que elegirlos', async ({ page }) => {
    const { requests } = await withOpen(page, 2);
    const data = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(1024)], 'soltada.jpg', { type: 'image/jpeg' }));
      return dt;
    });
    await page.getByText('Suelta aquí tus fotos o elige archivos').dispatchEvent('drop', { dataTransfer: data });
    await expect(tiles(page)).toHaveCount(3);
    expect(uploads(requests)).toHaveLength(1);
  });
});

test.describe('Eliminar (REQ-18; AC-13)', () => {
  test('AC-13: eliminar pasa por el diálogo; Cancelar conserva la foto y devuelve el foco', async ({ page }) => {
    await withOpen(page, 3);
    await menuItem(page, 2, 'Eliminar');
    const dialog = page.getByRole('dialog', { name: '¿Eliminar esta foto?' });
    await expect(dialog).toContainText('Se quita del tour al guardar.');
    await expect(dialog.getByText('Es la portada')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(tiles(page)).toHaveCount(3);
    await expect(actions(page, 2)).toBeFocused();
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
  });

  test('AC-13: si es la portada, el diálogo avisa; al confirmar la siguiente pasa a ser portada y el foco va a ella', async ({ page }) => {
    await withOpen(page, 3);
    await menuItem(page, 1, 'Eliminar');
    const dialog = page.getByRole('dialog', { name: '¿Eliminar esta foto?' });
    await expect(dialog).toContainText('Es la portada: la siguiente foto pasará a ser portada.');
    await expect(dialog.locator('img')).toHaveAttribute('src', /foto-1\.jpg$/);
    await dialog.getByRole('button', { name: 'Eliminar' }).click();
    expect(await order(page)).toEqual(['foto-2.jpg', 'foto-3.jpg']);
    await expect(page.getByLabel('Foto 1 de 2, portada')).toBeVisible();
    await expect(cover(page)).toHaveAttribute('src', /foto-2\.jpg$/);
    await expect(actions(page, 1)).toBeFocused();
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
  });

  test('AC-13: Esc cierra el diálogo sin eliminar', async ({ page }) => {
    await withOpen(page, 3);
    await menuItem(page, 3, 'Eliminar');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(tiles(page)).toHaveCount(3);
  });
});

test.describe('Nada cambia hasta Guardar (REQ-19; AC-14)', () => {
  test('AC-14: subir, reordenar y eliminar sin guardar no manda ningún PATCH; descartar tampoco; guardar manda uno solo', async ({ page }) => {
    const { requests } = await withOpen(page, 3);
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', MB));
    await expect(tiles(page)).toHaveCount(4);
    await menuItem(page, 4, 'Hacer portada');
    await menuItem(page, 3, 'Eliminar');
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    expect(writes(requests)).toEqual([]);
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await page.getByRole('button', { name: 'Salir y descartar' }).click();
    await expect(page).toHaveURL('/tours');
    expect(writes(requests)).toEqual([]);

    await page.goto('/tours/1');
    await chooser(page).setInputFiles(fileOf('nueva.jpg', 'image/jpeg', MB));
    await expect(tiles(page)).toHaveCount(4);
    await menuItem(page, 4, 'Hacer portada');
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests)).toHaveLength(1);
    expect(writes(requests)[0].body.images).toEqual(['6f1c2e0a-2.jpg', 'foto-1.jpg', 'foto-2.jpg', 'foto-3.jpg']);
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
  });

  test('AC-14: el tour sin cambios en las fotos manda el mismo orden que ya tenía', async ({ page }) => {
    const { requests } = await withOpen(page, 3);
    await page.getByLabel('Nombre admin').fill('cenotes-2');
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests)[0].body.images).toEqual(['foto-1.jpg', 'foto-2.jpg', 'foto-3.jpg']);
  });

  test('volver al orden original apaga "Cambios sin guardar"', async ({ page }) => {
    await withOpen(page, 3);
    await menuItem(page, 1, 'Mover después');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await menuItem(page, 2, 'Mover antes');
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0);
  });
});

test.describe('Sin fotos no se publica (REQ-21; AC-16)', () => {
  test('AC-16: sin fotos "Visible en la web" está deshabilitado con su ayuda; al subir una se habilita', async ({ page }) => {
    await withOpen(page, 0, { isActive: false });
    await expect(visibleSwitch(page)).toBeDisabled();
    await expect(visibleSwitch(page)).not.toBeChecked();
    await expect(page.getByText('Agrega al menos una foto para mostrar el tour en la web.')).toBeVisible();
    await expect(visibleSwitch(page)).toHaveAccessibleDescription('Agrega al menos una foto para mostrar el tour en la web.');
    await chooser(page).setInputFiles(fileOf('primera.jpg', 'image/jpeg', MB));
    await expect(tiles(page)).toHaveCount(1);
    await expect(visibleSwitch(page)).toBeEnabled();
    await expect(page.getByText('Oculto: los viajeros no lo ven.')).toBeVisible();
    await expect(cover(page)).toHaveAttribute('src', /6f1c2e0a-1\.jpg$/);
  });

  test('AC-16: un tour nuevo nace oculto, sin fotos y con el interruptor deshabilitado', async ({ page }) => {
    await openTour(page, '/tours/new');
    await expect(visibleSwitch(page)).toBeDisabled();
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
  });

  test('AC-16: quitar la última foto de un tour visible lo apaga, lo avisa y cuenta como cambio sin guardar', async ({ page }) => {
    const { requests } = await withOpen(page, 1);
    await expect(visibleSwitch(page)).toBeChecked();
    await menuItem(page, 1, 'Eliminar');
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(visibleSwitch(page)).not.toBeChecked();
    await expect(visibleSwitch(page)).toBeDisabled();
    const warning = page.getByRole('status').filter({ hasText: 'Se apagó "Visible en la web" porque el tour ya no tiene fotos.' });
    await expect(warning).toBeVisible();
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
    await expect(page.getByText('Sin foto', { exact: true })).toBeVisible();
    await save(page).click();
    await expect(page.getByText('Guardado hace un momento')).toBeVisible();
    expect(writes(requests)[0].body).toMatchObject({ isActive: false, images: [] });
    await expect(warning).toHaveCount(0);
  });

  test('AC-16: el aviso se va si se vuelve a subir una foto, y el interruptor sigue apagado', async ({ page }) => {
    await withOpen(page, 1);
    await menuItem(page, 1, 'Eliminar');
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Se apagó "Visible en la web"')).toBeVisible();
    await chooser(page).setInputFiles(fileOf('otra.jpg', 'image/jpeg', MB));
    await expect(tiles(page)).toHaveCount(1);
    await expect(page.getByText('Se apagó "Visible en la web"')).toHaveCount(0);
    await expect(visibleSwitch(page)).not.toBeChecked();
    await expect(visibleSwitch(page)).toBeEnabled();
  });

  test('AC-16: quitar todas las fotos de un tour oculto no muestra el aviso', async ({ page }) => {
    await withOpen(page, 1, { isActive: false });
    await menuItem(page, 1, 'Eliminar');
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
    await expect(page.getByText('Se apagó "Visible en la web"')).toHaveCount(0);
  });
});

test.describe('Errores del API al guardar', () => {
  const failWith = (override, status, body) => override((r) => (r.method === 'PATCH' ? { status, body } : undefined));

  test('409 TOUR_NEEDS_PHOTO: el banner dice qué hacer y lo escrito se conserva', async ({ page }) => {
    const { override } = await withOpen(page, 2);
    failWith(override, 409, { statusCode: 409, code: 'TOUR_NEEDS_PHOTO', message: 'Agrega al menos una foto para mostrar el tour en la web.' });
    await page.getByLabel('Nombre admin').fill('cenotes-2');
    await save(page).click();
    const banner = page.getByRole('alert').filter({ hasText: 'No se pudo guardar el tour' });
    await expect(banner).toContainText('No se guardó: para mostrar el tour en la web necesita al menos una foto. Agrega una o apaga "Visible en la web".');
    await expect(page.getByLabel('Nombre admin')).toHaveValue('cenotes-2');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
  });

  test('400 TOO_MANY_IMAGES', async ({ page }) => {
    const { override } = await withOpen(page, 2);
    failWith(override, 400, { statusCode: 400, code: 'TOO_MANY_IMAGES', message: 'Un tour admite como máximo 8 fotos.', max: 8 });
    await page.getByLabel('Nombre admin').fill('cenotes-2');
    await save(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo guardar el tour' })).toContainText('No se guardó: un tour admite como máximo 8 fotos. Elimina las que sobran.');
  });

  test('400 INVALID_IMAGES', async ({ page }) => {
    const { override } = await withOpen(page, 2);
    failWith(override, 400, { statusCode: 400, code: 'INVALID_IMAGES', message: 'Hay fotos con un nombre de archivo no válido.' });
    await page.getByLabel('Nombre admin').fill('cenotes-2');
    await save(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo guardar el tour' })).toContainText('No se guardó: alguna foto no se subió bien. Quítala y vuelve a subirla.');
  });

  test('400 INVALID_DURATION', async ({ page }) => {
    const { override } = await withOpen(page, 2);
    failWith(override, 400, { statusCode: 400, code: 'INVALID_DURATION', message: 'La duración debe ser un número entero de minutos, 1 o más.' });
    await page.getByLabel('Nombre admin').fill('cenotes-2');
    await save(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo guardar el tour' })).toContainText('Escribe la duración en minutos, como número entero de 1 o más, o déjala vacía.');
  });
});

test.describe('Accesibilidad (axe)', () => {
  test('axe: sin violaciones serias con galería, menú abierto, subiendo con errores, lleno y diálogo', async ({ page }) => {
    await withOpen(page, 6);
    expect(await serious(page)).toEqual([]);
    await actions(page, 3).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.waitForTimeout(400); // deja terminar el desvanecido del menú: axe mide el contraste final
    expect(await serious(page)).toEqual([]);
    await page.keyboard.press('Escape');

    let release;
    const gate = new Promise((r) => { release = r; });
    await page.route(`${API}/upload`, async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback();
      await gate;
      return route.fallback();
    });
    await chooser(page).setInputFiles([fileOf('a.jpg', 'image/jpeg', MB), fileOf('b.png', 'image/png', 14 * MB), fileOf('c.heic', 'image/heic', MB)]);
    await expect(page.getByRole('progressbar')).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveCount(2);
    expect(await serious(page)).toEqual([]);
    release();
    await expect(tiles(page)).toHaveCount(7);

    await menuItem(page, 1, 'Eliminar');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(400);
    expect(await serious(page)).toEqual([]);
  });

  test('axe: sin fotos y con 8 de 8', async ({ page }) => {
    await withOpen(page, 0, { isActive: false });
    expect(await serious(page)).toEqual([]);
    await page.goto('/tours/new');
    await expect(page.getByText('Este tour no tiene fotos.')).toBeVisible();
    expect(await serious(page)).toEqual([]);
    await openTour(page, '/tours/1', { tours: galleryCatalog(8) });
    await expect(page.getByText('Llegaste al máximo de 8 fotos.')).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });
});
