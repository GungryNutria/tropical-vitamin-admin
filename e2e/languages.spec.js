import { test, expect } from '@playwright/test';
import { open, writes } from './fixtures/catalog.js';

// V7 Idiomas (REQ-24 a REQ-27; AC-21, AC-23, AC-24; D-3, D-11). API simulada.
const panel = (page) => page.getByRole('dialog', { name: /idioma/ });
const rowOf = (page, name) => page.locator('tbody tr').filter({ hasText: name });

test.describe('Idiomas', () => {
  test('REQ-24: nombre, código, estado y textos por idioma; es y en protegidos y sin eliminar', async ({ page }) => {
    await open(page, '/languages');
    await expect(page.getByRole('heading', { name: 'Idiomas', level: 1 })).toBeVisible();
    await expect(page.getByText('3 idiomas · 2 activos')).toBeVisible();
    await expect(rowOf(page, 'Español')).toContainText('es');
    await expect(rowOf(page, 'Español')).toContainText('Activo');
    await expect(rowOf(page, 'Español')).toContainText('39 de 39');
    await expect(rowOf(page, 'Español')).toContainText('10 de 10');
    await expect(rowOf(page, 'Français')).toContainText('Inactivo');
    await expect(rowOf(page, 'Français')).toContainText('12 de 39');
    await expect(rowOf(page, 'Français')).toContainText('3 de 10');
    await expect(rowOf(page, 'Español').getByText('Protegido')).toBeVisible();
    await expect(rowOf(page, 'English').getByText('Protegido')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar «Español»' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar «English»' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar «Français»' })).toBeVisible();
    await expect(page.getByText('Español e inglés los usa la web: no se pueden eliminar ni cambiar su código.')).toBeVisible();
  });

  test('AC-21: el código «EN» con `en` existente da error junto al campo y no llama a la API', async ({ page }) => {
    const api = await open(page, '/languages');
    await page.getByRole('button', { name: 'Nuevo idioma' }).click();
    await expect(page.getByText('2 letras, p. ej. fr')).toBeVisible();
    await page.getByLabel('Código').fill('EN');
    await page.getByLabel('Nombre').fill('Inglés bis');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ya existe un idioma con el código «en».').first()).toBeVisible();
    await expect(page.getByLabel('Código')).toHaveAttribute('aria-invalid', 'true');
    expect(writes(api.requests)).toEqual([]);
  });

  test('un idioma nuevo nace apagado y se crea con POST', async ({ page }) => {
    const api = await open(page, '/languages');
    await page.getByRole('button', { name: 'Nuevo idioma' }).click();
    await expect(page.getByRole('switch', { name: 'Idioma activo' })).not.toBeChecked();
    await page.getByLabel('Código').fill('pt');
    await page.getByLabel('Nombre').fill('Português');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Idioma «Português» guardado' })).toBeVisible();
    expect(writes(api.requests)).toEqual([{ method: 'POST', path: '/languages', body: { code: 'pt', name: 'Português', isActive: false } }]);
  });

  test('validación: código y nombre obligatorios, con resumen', async ({ page }) => {
    await open(page, '/languages');
    await page.getByRole('button', { name: 'Nuevo idioma' }).click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Revisa 2 campos' });
    await expect(alert).toContainText('Escribe el código del idioma.');
    await alert.getByRole('button', { name: 'Escribe el nombre del idioma.' }).click();
    await expect(page.getByLabel('Nombre')).toBeFocused();
  });

  test('AC-23: eliminar un idioma no protegido nombra el idioma, cuenta los textos y el foco empieza en Cancelar', async ({ page }) => {
    const api = await open(page, '/languages');
    await page.getByRole('button', { name: 'Eliminar «Français»' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Eliminar el idioma «Français»?' });
    await expect(dialog).toContainText('Se borrarán para siempre 12 textos de tours y 3 de categorías en Français.');
    await expect(dialog).toContainText('Esta acción no se puede deshacer.');
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    expect(writes(api.requests)).toEqual([]);
    await page.getByRole('button', { name: 'Eliminar «Français»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar idioma' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Idioma «Français» eliminado' })).toBeVisible();
    expect(writes(api.requests)).toEqual([{ method: 'DELETE', path: '/languages/3', body: null }]);
  });

  test('409 LANGUAGE_PROTECTED al eliminar: aviso con el motivo de la API, sin alert()', async ({ page }) => {
    const api = await open(page, '/languages');
    api.override((r) => (r.method === 'DELETE' ? { status: 409, body: { statusCode: 409, code: 'LANGUAGE_PROTECTED', message: 'El idioma fr lo usa la web y no se puede eliminar.' } } : undefined));
    await page.getByRole('button', { name: 'Eliminar «Français»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar idioma' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'El idioma fr lo usa la web y no se puede eliminar.' })).toBeVisible();
  });

  test('AC-23 / D-3 / D-11: el panel de es deshabilita el código y el interruptor, con la razón', async ({ page }) => {
    await open(page, '/languages');
    await page.getByRole('button', { name: 'Editar «Español»' }).click();
    await expect(panel(page).getByText('Lo usa la web: no se puede desactivar ni cambiar su código.')).toBeVisible();
    await expect(page.getByLabel('Código')).toBeDisabled();
    await expect(page.getByLabel('Código')).toHaveAccessibleDescription('Lo usa la web; no se puede cambiar.');
    const toggle = page.getByRole('switch', { name: 'Idioma activo' });
    await expect(toggle).toBeDisabled();
    await expect(toggle).toBeChecked();
    await expect(toggle).toHaveAccessibleDescription('Lo usa la web: no se puede desactivar ni cambiar su código.');
  });

  test('D-11: si la API responde 409 LANGUAGE_PROTECTED al guardar, el panel muestra el motivo y Reintentar', async ({ page }) => {
    const api = await open(page, '/languages');
    api.override((r) => (r.method === 'PATCH' ? { status: 409, body: { statusCode: 409, code: 'LANGUAGE_PROTECTED', message: 'El idioma en lo usa la web y no se puede cambiar.' } } : undefined));
    await page.getByRole('button', { name: 'Editar «English»' }).click();
    await page.getByLabel('Nombre').fill('English US');
    await page.getByRole('button', { name: 'Guardar' }).click();
    const banner = page.getByRole('alert').filter({ hasText: 'No se guardó' });
    await expect(banner).toContainText('El idioma en lo usa la web y no se puede cambiar.');
    await expect(banner.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(page.getByLabel('Nombre')).toHaveValue('English US');
  });

  test('AC-24: desactivar un idioma avisa antes de guardar; guardar manda isActive false', async ({ page }) => {
    const api = await open(page, '/languages', { frActive: true });
    await page.getByRole('button', { name: 'Editar «Français»' }).click();
    const warning = 'La web no cambia; este idioma deja de contar como pendiente.';
    await expect(page.getByText(warning)).toHaveCount(0);
    await page.getByRole('switch', { name: 'Idioma activo' }).click();
    await expect(page.getByText(warning)).toBeVisible();
    await expect(page.getByText('Ya no es obligatorio al guardar un tour o una categoría. Sus textos se conservan.')).toBeVisible();
    expect(writes(api.requests)).toEqual([]);
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Idioma «Français» guardado' })).toBeVisible();
    expect(writes(api.requests)).toEqual([{ method: 'PATCH', path: '/languages/3', body: { code: 'fr', name: 'Français', isActive: false } }]);
  });

  test('editar solo el nombre de es no envía isActive (evita el 409 LANGUAGE_PROTECTED)', async ({ page }) => {
    const api = await open(page, '/languages');
    await page.getByRole('button', { name: 'Editar «Español»' }).click();
    await page.getByLabel('Nombre').fill('Español MX');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Idioma «Español MX» guardado' })).toBeVisible();
    expect(writes(api.requests)).toEqual([{ method: 'PATCH', path: '/languages/1', body: { code: 'es', name: 'Español MX' } }]);
  });

  test('activar un idioma avisa cuántos tours y categorías quedan pendientes', async ({ page }) => {
    const api = await open(page, '/languages');
    await page.getByRole('button', { name: 'Editar «Français»' }).click();
    await page.getByRole('switch', { name: 'Idioma activo' }).click();
    await expect(page.getByText('Al activarlo, 27 tours y 7 categorías quedan pendientes en Français.')).toBeVisible();
    await expect(page.getByText('No podrás guardar un tour o una categoría sin su texto en Français.')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'guardado' })).toBeVisible();
    expect(writes(api.requests)[0].body.isActive).toBe(true);
  });

  test('cerrar el panel con cambios pregunta antes de descartar', async ({ page }) => {
    await open(page, '/languages');
    await page.getByRole('button', { name: 'Editar «Français»' }).click();
    await page.getByLabel('Nombre').fill('Français 2');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '¿Salir sin guardar?' })).toBeVisible();
  });
});
