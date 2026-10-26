import { test, expect } from '@playwright/test';
import { open, writes } from './fixtures/catalog.js';
import { languages } from './fixtures/data.js';

// V6 Categorías (REQ-19 a REQ-23; AC-19 a AC-22; AC-UX-8). API simulada; D-2: guardado por partes.
const panel = (page) => page.getByRole('dialog', { name: /categoría/ });
const rowOf = (page, name) => page.locator('tbody tr').filter({ hasText: name });

test.describe('Categorías', () => {
  test('REQ-19: por fila nombre visible con nombre admin, descripción, tours e idiomas', async ({ page }) => {
    await open(page, '/categories');
    await expect(page.getByRole('heading', { name: 'Categorías', level: 1 })).toBeVisible();
    await expect(page.getByText('10 categorías', { exact: true })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(10);
    const islas = rowOf(page, 'Islas');
    await expect(islas).toContainText('islas');
    await expect(islas).toContainText('Tours de islas');
    await expect(islas.getByRole('cell').nth(2)).toHaveText('4');
    await expect(rowOf(page, 'Parques')).toContainText('ES');
    await expect(rowOf(page, 'Arqueológicos')).toContainText('EN falta');
    await expect(rowOf(page, 'Gastronomía').getByRole('cell').nth(2)).toHaveText('0');
  });

  test('?pendientes=1 muestra solo las que tienen traducciones pendientes, con chip quitable', async ({ page }) => {
    await open(page, '/categories?pendientes=1');
    await expect(page.getByText('1 de 10 categorías')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Quitar filtro Con pendientes' }).click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page.locator('tbody tr')).toHaveCount(10);
  });

  test('AC-19: un solo Guardar deja datos y traducciones guardados; ya no hay fila desplegable', async ({ page }) => {
    const api = await open(page, '/categories');
    await expect(page.getByRole('button', { name: /Expandir|Mostrar traducciones/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(1);
    await page.getByLabel('Descripción interna').fill('Parques para toda la familia');
    await page.getByLabel('Nombre visible (Español)').fill('Parques temáticos');
    await page.getByLabel('Nombre visible (English)').fill('Theme parks');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Categoría «Parques temáticos» guardada' })).toBeVisible();
    await expect(panel(page)).toBeHidden();
    expect(writes(api.requests)).toEqual([
      { method: 'PATCH', path: '/categories/5', body: { adminName: 'parques', description: 'Parques para toda la familia' } },
      { method: 'PATCH', path: '/categories/5/translations/1', body: { name: 'Parques temáticos', description: 'Tours de parques' } },
      { method: 'PATCH', path: '/categories/5/translations/2', body: { name: 'Theme parks', description: 'Parks tours' } },
    ]);
  });

  test('crear: POST de la categoría y de cada traducción activa; el idioma inactivo no es obligatorio (AC-24)', async ({ page }) => {
    const api = await open(page, '/categories');
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre admin').fill('Cenotes y cuevas');
    await page.getByLabel('Descripción interna').fill('Cuevas');
    await page.getByLabel('Nombre visible (Español)').fill('Cenotes y cuevas');
    await page.getByLabel('Descripción visible (Español)').fill('Cuevas mayas');
    await page.getByLabel('Nombre visible (English)').fill('Cenotes and caves');
    await page.getByLabel('Descripción visible (English)').fill('Mayan caves');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'guardada' })).toBeVisible();
    expect(writes(api.requests).map((w) => `${w.method} ${w.path}`)).toEqual([
      'POST /categories',
      'POST /categories/100/translations',
      'POST /categories/100/translations',
    ]);
  });

  test('AC-21: «Vida  Silvestre» con `vida-silvestre` existente da error junto al campo y no llama a la API', async ({ page }) => {
    const api = await open(page, '/categories');
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre admin').fill('Vida  Silvestre');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ya existe una categoría con ese nombre.').first()).toBeVisible();
    await expect(page.locator(':focus').getByRole('alert')).toContainText(/Revisa [0-9]+ campos/);
    await expect(page.getByLabel('Nombre admin')).toHaveAttribute('aria-invalid', 'true');
    expect(writes(api.requests)).toEqual([]);
  });

  test('al editar, el propio nombre admin no cuenta como duplicado', async ({ page }) => {
    const api = await open(page, '/categories');
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await page.getByLabel('Nombre admin').fill(' Parques ');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'guardada' })).toBeVisible();
    expect(writes(api.requests)[0].path).toBe('/categories/5');
  });

  test('validación: resumen con enlaces que llevan al campo (descripción visible incluida)', async ({ page }) => {
    await open(page, '/categories');
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre admin').fill('nueva');
    await page.getByLabel('Descripción interna').fill('x');
    await page.getByRole('button', { name: 'Guardar' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Revisa 4 campos' });
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Escribe la descripción en inglés.' }).click();
    await expect(page.getByLabel('Descripción visible (English)')).toBeFocused();
  });

  test('AC-20: si falla solo el inglés, dice qué se guardó y qué no, conserva lo escrito y Reintentar reenvía solo el inglés', async ({ page }) => {
    const api = await open(page, '/categories');
    let failEnglish = true;
    api.override((r) => (failEnglish && r.method === 'PATCH' && r.path === '/categories/5/translations/2' ? { status: 500, body: {} } : undefined));
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await page.getByLabel('Descripción interna').fill('Parques para toda la familia');
    await page.getByLabel('Nombre visible (Español)').fill('Parques temáticos');
    await page.getByLabel('Nombre visible (English)').fill('Theme parks');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const banner = page.getByRole('alert').filter({ hasText: 'No se guardó todo' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Se guardaron los datos y Español.');
    await expect(banner).toContainText('No se guardó English: No se pudo guardar.');
    await expect(page.locator(':focus').getByRole('alert')).toContainText('No se guardó todo');
    await expect(page.getByLabel('Nombre visible (English)')).toHaveValue('Theme parks');
    await expect(panel(page).getByText('No se guardó', { exact: true })).toHaveCount(1);
    await expect(panel(page).getByText('Guardado', { exact: true })).toHaveCount(2);

    failEnglish = false;
    const before = api.requests.length;
    await banner.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Categoría «Parques temáticos» guardada' })).toBeVisible();
    expect(writes(api.requests.slice(before))).toEqual([
      { method: 'PATCH', path: '/categories/5/translations/2', body: { name: 'Theme parks', description: 'Parks tours' } },
    ]);
  });

  test('AC-20: si fallan los datos no se envían traducciones y se dice por qué', async ({ page }) => {
    const api = await open(page, '/categories');
    api.override((r) => (r.method === 'PATCH' && r.path === '/categories/5' ? { status: 500, body: {} } : undefined));
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await page.getByLabel('Descripción interna').fill('Otra');
    await page.getByLabel('Nombre visible (English)').fill('Theme parks');
    await page.getByRole('button', { name: 'Guardar' }).click();
    const banner = page.getByRole('alert').filter({ hasText: 'No se guardó' });
    await expect(banner).toContainText('No se guardó los datos');
    await expect(banner).not.toContainText('Se guardaron');
    expect(writes(api.requests)).toHaveLength(1);
  });

  test('AC-22: eliminar una categoría con tours no ofrece borrar; dice cuántos tours y enlaza a ellos', async ({ page }) => {
    const api = await open(page, '/categories');
    await page.getByRole('button', { name: 'Eliminar «Islas»' }).click();
    const dialog = page.getByRole('dialog', { name: 'No se puede eliminar «Islas»' });
    await expect(dialog).toContainText('«Islas» tiene 4 tours. Muévelos a otra categoría antes de eliminarla.');
    await expect(dialog.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: 'Ver sus 4 tours' })).toHaveAttribute('href', '/tours?categoria=4');
    await expect(dialog.getByRole('button', { name: 'Entendido' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(writes(api.requests)).toEqual([]);
  });

  test('AC-22: sin tours, el diálogo nombra la categoría, el foco empieza en Cancelar y Eliminar borra', async ({ page }) => {
    const api = await open(page, '/categories');
    await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Eliminar la categoría «Gastronomía»?' });
    await expect(dialog).toContainText('Esta categoría no tiene tours. Se borrará con sus traducciones (Español y English).');
    await expect(dialog).toContainText('Esta acción no se puede deshacer.');
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    const color = await dialog.getByRole('button', { name: 'Eliminar' }).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).toBe('rgb(220, 38, 38)'); // peligro
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    expect(writes(api.requests)).toEqual([]);

    await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Categoría «Gastronomía» eliminada' })).toBeVisible();
    expect(writes(api.requests)).toEqual([{ method: 'DELETE', path: '/categories/10', body: null }]);
  });

  test('409 CATEGORY_HAS_TOURS con datos viejos: muestra el bloqueo con el tourCount de la API', async ({ page }) => {
    const api = await open(page, '/categories');
    api.override((r) => (r.method === 'DELETE' ? { status: 409, body: { statusCode: 409, code: 'CATEGORY_HAS_TOURS', message: 'x', tourCount: 3 } } : undefined));
    await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('dialog', { name: 'No se puede eliminar «Gastronomía»' })).toContainText('tiene 3 tours');
  });

  test('error al eliminar: aviso de error con Reintentar, sin alert()', async ({ page }) => {
    const api = await open(page, '/categories');
    api.override((r) => (r.method === 'DELETE' ? { status: 500, body: {} } : undefined));
    await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    const toast = page.getByRole('alert').filter({ hasText: 'No pudimos eliminar «Gastronomía»' });
    await expect(toast).toContainText('El servidor tuvo un problema.');
    await expect(toast.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });

  test('1440: los encabezados "Tours" e "Idiomas" no quedan pegados', async ({ page }) => {
    await open(page, '/categories');
    await expect(page.getByRole('columnheader', { name: 'Idiomas' })).toBeVisible();
    const ends = await page.evaluate(() => {
      const box = (name) => {
        const th = [...document.querySelectorAll('thead th')].find((x) => x.textContent.trim() === name);
        const range = document.createRange();
        range.selectNodeContents(th);
        return range.getBoundingClientRect();
      };
      return { tours: box('Tours').right, idiomas: box('Idiomas').left };
    });
    expect(ends.idiomas - ends.tours).toBeGreaterThanOrEqual(16);
  });

  test('el panel lista Español primero y English después aunque la API los entregue en otro orden', async ({ page }) => {
    await open(page, '/categories', { data: { languages: [languages[1], languages[2], languages[0]] } });
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    const names = await panel(page).locator('label[id^="cat-name-"]').allTextContents();
    expect(names.map((n) => n.replace(' *', ''))).toEqual(['Nombre visible (Español)', 'Nombre visible (English)', 'Nombre visible (Français)']);
  });

  test('un aviso de error no queda sobre el panel: abrir un panel lo cierra', async ({ page }) => {
    const api = await open(page, '/categories');
    api.override((r) => (r.method === 'DELETE' ? { status: 500, body: {} } : undefined));
    await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos eliminar «Gastronomía»' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos eliminar' })).toHaveCount(0);
  });

  test('cerrar el panel con cambios pregunta; sin cambios cierra directo', async ({ page }) => {
    await open(page, '/categories');
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(panel(page)).toBeHidden();
    await page.getByRole('button', { name: 'Editar «Parques»' }).click();
    await page.getByLabel('Nombre admin').fill('parques-2');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    const ask = page.getByRole('dialog', { name: '¿Salir sin guardar?' });
    await expect(ask).toContainText('Tienes cambios sin guardar en «Parques».');
    await expect(ask.getByRole('button', { name: 'Seguir editando' })).toBeFocused();
    await ask.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(panel(page)).toBeVisible();
  });

  test('la fila entera abre el panel y se resalta 2 s al guardar', async ({ page }) => {
    await open(page, '/categories');
    await rowOf(page, 'Parques').click();
    await expect(panel(page)).toBeVisible();
    await page.getByLabel('Descripción interna').fill('Otra');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(rowOf(page, 'Parques')).toHaveCSS('background-color', 'rgb(42, 37, 25)');
    await expect(rowOf(page, 'Parques')).not.toHaveCSS('background-color', 'rgb(42, 37, 25)', { timeout: 4000 });
  });
});
