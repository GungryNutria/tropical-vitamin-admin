import { test, expect } from '@playwright/test';
import { open, noOverflow, expectNoBlockingAxe } from './fixtures/catalog.js';

// V9 Redes sociales (spec 007; D-1 a D-6). API simulada: GET /social/admin y PUT /social.
// AC-1, AC-2, AC-3, AC-5, AC-6, AC-7.
const field = (page, label) => page.getByLabel(label, { exact: true });
const toggle = (page, network) => page.getByRole('switch', { name: `Mostrar ${network} en la web` });
const saveNote = (page) => page.locator('#social-save-note');
const putRequests = (api) => api.requests.filter((r) => r.method === 'PUT' && r.path === '/social');

test.describe('Redes sociales', () => {
  test('AC-1: "Redes sociales" va en el menú después de Idiomas y abre /social', async ({ page }) => {
    await open(page, '/');
    const items = page.getByRole('navigation', { name: 'Principal' }).getByRole('link');
    await expect(items).toHaveText(['Inicio', 'Tours', 'Categorías', 'Idiomas', 'Redes sociales']);
    await page.getByRole('link', { name: 'Redes sociales' }).click();
    await expect(page).toHaveURL(/\/social$/);
    await expect(page.getByRole('heading', { name: 'Redes sociales', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Redes sociales' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('Estos enlaces aparecen en el pie de página y en Contacto de la web. Solo se muestran las redes con enlace y con "Mostrar en la web" encendido.')).toBeVisible();
  });

  test('AC-2: cada red dice si se muestra o se oculta y por qué; WhatsApp no tiene interruptor', async ({ page }) => {
    await open(page, '/social');
    await expect(field(page, 'Facebook')).toHaveValue('https://www.facebook.com/ejemplo');
    await expect(toggle(page, 'Facebook')).toBeChecked();
    await expect(toggle(page, 'Facebook')).toBeEnabled();
    await expect(page.getByText('Se muestra', { exact: true })).toBeVisible();

    await expect(field(page, 'Instagram')).toHaveValue('https://www.instagram.com/ejemplo');
    await expect(toggle(page, 'Instagram')).not.toBeChecked();
    await expect(toggle(page, 'Instagram')).toBeEnabled();
    await expect(page.getByText('Oculta', { exact: true })).toBeVisible();

    await expect(field(page, 'LinkedIn')).toHaveValue('');
    await expect(toggle(page, 'LinkedIn')).not.toBeChecked();
    await expect(toggle(page, 'LinkedIn')).toBeDisabled();
    await expect(page.getByText('Oculta: sin enlace', { exact: true })).toBeVisible();
    await expect(page.getByText('Agrega el enlace para poder mostrarla.')).toBeVisible();
    await expect(toggle(page, 'LinkedIn')).toHaveAccessibleDescription('Agrega el enlace para poder mostrarla.');

    await expect(page.getByRole('switch')).toHaveCount(3);
    await expect(field(page, 'WhatsApp *')).toHaveValue('52 984 168 1263');
    await expect(page.getByText('Obligatorio', { exact: true })).toBeVisible();
    await expect(page.getByText(/Es el número de todos los botones de WhatsApp de la web/)).toBeVisible();
    // Sin cambios no hay indicador de cambios.
    await expect(saveNote(page)).toHaveText('');
  });

  test('D-5 vacío: sin ninguna URL aparece el aviso fijo', async ({ page }) => {
    await open(page, '/social', {
      data: { social: { facebookUrl: null, facebookVisible: false, instagramUrl: null, instagramVisible: false, linkedinUrl: null, linkedinVisible: false, whatsappNumber: '529841681263' } },
    });
    await expect(page.getByText('Las redes sin enlace no se muestran en la web.')).toBeVisible();
    for (const n of ['Facebook', 'Instagram', 'LinkedIn']) await expect(toggle(page, n)).toBeDisabled();
  });

  test('AC-3: borrar el enlace con la red encendida la apaga, lo avisa en aria-live y marca cambios sin guardar', async ({ page }) => {
    const api = await open(page, '/social');
    await field(page, 'Facebook').fill('');
    await expect(toggle(page, 'Facebook')).not.toBeChecked();
    await expect(toggle(page, 'Facebook')).toBeDisabled();
    const note = page.locator('#social-facebook-switch-note');
    await expect(note).toHaveAttribute('aria-live', 'polite');
    await expect(note).toHaveText('Se apagó porque no hay enlace.');
    await expect(saveNote(page)).toContainText('Cambios sin guardar');
    // Al escribir de nuevo desaparece el aviso; el interruptor sigue apagado, pero ya se puede encender.
    await field(page, 'Facebook').fill('facebook.com/otra');
    await expect(note).toHaveText('');
    await expect(toggle(page, 'Facebook')).toBeEnabled();
    await expect(toggle(page, 'Facebook')).not.toBeChecked();
    expect(putRequests(api)).toHaveLength(0);
  });

  test('un enlace inválido no apaga el interruptor ni lo bloquea', async ({ page }) => {
    await open(page, '/social');
    await field(page, 'Facebook').fill('esto no es un enlace');
    await expect(toggle(page, 'Facebook')).toBeChecked();
    await expect(toggle(page, 'Facebook')).toBeEnabled();
    await expect(page.locator('#social-facebook-switch-note')).toHaveText('');
  });

  test('AC-5: normaliza al salir del campo y al guardar; los errores van bajo cada campo y en el resumen', async ({ page }) => {
    const api = await open(page, '/social');
    await field(page, 'Instagram').fill('instagram.com/x');
    await field(page, 'Instagram').blur();
    await expect(field(page, 'Instagram')).toHaveValue('https://instagram.com/x');

    // Tres errores a la vez: formato, dominio y WhatsApp corto.
    await field(page, 'Facebook').fill('hola');
    await field(page, 'Instagram').fill('https://www.facebook.com/ejemplo');
    await field(page, 'WhatsApp *').fill('12345');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Esto no parece un enlace. Pega la dirección completa de tu página.')).toBeVisible();
    await expect(page.getByText('Este enlace no es de Instagram. Revisa que empiece con instagram.com.')).toBeVisible();
    await expect(page.getByText('El número debe tener de 11 a 15 dígitos, con la lada del país.')).toBeVisible();
    await expect(field(page, 'Facebook')).toHaveAttribute('aria-invalid', 'true');
    const summary = page.getByRole('alert').filter({ hasText: 'Revisa 3 campos' });
    await expect(summary).toBeVisible();
    // El foco va al resumen, no a un campo.
    await expect(page.locator('div[tabindex="-1"]').filter({ hasText: 'Revisa 3 campos' })).toBeFocused();
    expect(putRequests(api)).toHaveLength(0);
    // El resumen lleva al campo.
    await summary.getByRole('button', { name: 'Instagram' }).click();
    await expect(page.locator('#social-instagramUrl')).toBeFocused();

    // WhatsApp vacío: mensaje propio.
    await field(page, 'WhatsApp *').fill('');
    await expect(page.getByText('Escribe el número de WhatsApp: es la forma principal de contacto.')).toBeVisible();

    // Arreglado: se normaliza (+, espacios y guiones) y se guarda.
    await field(page, 'Facebook').fill('facebook.com/x');
    await field(page, 'Instagram').fill('Instagram.com/y');
    await field(page, 'WhatsApp *').fill('+52 984-168-1263');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Cambios guardados', { exact: true })).toBeVisible();
    const [put] = putRequests(api);
    expect(JSON.parse(put.body)).toEqual({
      facebookUrl: 'https://facebook.com/x', facebookVisible: true,
      instagramUrl: 'https://instagram.com/y', instagramVisible: false,
      linkedinUrl: null, linkedinVisible: false,
      whatsappNumber: '529841681263',
    });
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa' })).toHaveCount(0);
    await expect(field(page, 'WhatsApp *')).toHaveValue('52 984 168 1263');
  });

  test('AC-5: un enlace de otra red da error de dominio y los dominios aceptados pasan', async ({ page }) => {
    await open(page, '/social');
    await field(page, 'LinkedIn').fill('facebook.com/x');
    await field(page, 'LinkedIn').blur();
    await expect(page.getByText('Este enlace no es de LinkedIn. Revisa que empiece con linkedin.com.')).toBeVisible();
    await field(page, 'LinkedIn').fill('m.linkedin.com/company/x');
    await field(page, 'LinkedIn').blur();
    await expect(field(page, 'LinkedIn')).toHaveValue('https://m.linkedin.com/company/x');
    await field(page, 'Facebook').fill('fb.com/x');
    await field(page, 'Facebook').blur();
    await expect(field(page, 'Facebook')).toHaveValue('https://fb.com/x');
    await expect(page.getByText(/Este enlace no es de/)).toHaveCount(0);
  });

  test('AC-6: "Abrir" va a una pestaña nueva con nombre claro y WhatsApp muestra la vista previa', async ({ page }) => {
    await open(page, '/social');
    const fb = page.getByRole('link', { name: 'Abrir Facebook en una pestaña nueva' });
    await expect(fb).toHaveAttribute('href', 'https://www.facebook.com/ejemplo');
    await expect(fb).toHaveAttribute('target', '_blank');
    await expect(fb).toHaveAttribute('rel', /noopener/);
    await expect(page.getByRole('link', { name: 'Abrir Instagram en una pestaña nueva' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir LinkedIn en una pestaña nueva' })).toHaveCount(0);
    const wa = page.getByRole('link', { name: 'Abrir WhatsApp en una pestaña nueva' });
    await expect(wa).toHaveAttribute('href', 'https://wa.me/529841681263');
    await expect(page.getByText('Vista previa del enlace:')).toContainText('wa.me/529841681263');
    // Con un número inválido no hay Abrir ni vista previa.
    await field(page, 'WhatsApp *').fill('123');
    await expect(wa).toHaveCount(0);
    await expect(page.getByText('Vista previa del enlace:')).toHaveCount(0);
  });

  test('AC-7: si falla el guardado, banner con Reintentar y lo escrito se conserva; al reintentar sale el aviso', async ({ page }) => {
    const api = await open(page, '/social');
    let fail = true;
    api.override((r) => (r.method === 'PUT' && r.path === '/social' && fail ? { status: 500, body: {} } : undefined));
    await field(page, 'LinkedIn').fill('linkedin.com/company/ejemplo');
    await toggle(page, 'LinkedIn').check();
    await page.getByRole('button', { name: 'Guardar' }).click();
    const banner = page.getByRole('alert').filter({ hasText: 'No se pudieron guardar los cambios. Revisa tu conexión e intenta de nuevo.' });
    await expect(banner).toBeVisible();
    await expect(field(page, 'LinkedIn')).toHaveValue('https://linkedin.com/company/ejemplo');
    await expect(toggle(page, 'LinkedIn')).toBeChecked();
    await expect(saveNote(page)).toContainText('Cambios sin guardar');
    fail = false;
    await banner.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Cambios guardados', { exact: true })).toBeVisible();
    await expect(banner).toHaveCount(0);
    await expect(saveNote(page)).toContainText('Guardado hace un momento');
    expect(putRequests(api)).toHaveLength(2);
    expect(JSON.parse(putRequests(api)[1].body)).toMatchObject({ linkedinUrl: 'https://linkedin.com/company/ejemplo', linkedinVisible: true });
  });

  test('si la API rechaza con `fields`, los códigos se muestran como mensajes bajo el campo', async ({ page }) => {
    const api = await open(page, '/social');
    api.override((r) => (r.method === 'PUT' && r.path === '/social'
      ? { status: 400, body: { statusCode: 400, code: 'INVALID_SOCIAL_SETTINGS', message: 'Revisa los campos marcados.', fields: { instagramUrl: 'DOMAIN', whatsappNumber: 'LENGTH' } } }
      : undefined));
    await field(page, 'Facebook').fill('facebook.com/nueva');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Este enlace no es de Instagram. Revisa que empiece con instagram.com.')).toBeVisible();
    await expect(page.getByText('El número debe tener de 11 a 15 dígitos, con la lada del país.')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa 2 campos' })).toBeVisible();
  });

  test('salir con cambios sin guardar pide confirmación', async ({ page }) => {
    await open(page, '/social');
    await field(page, 'Facebook').fill('facebook.com/cambio');
    await page.getByRole('link', { name: 'Tours' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Salir sin guardar?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(page).toHaveURL(/\/social$/);
  });

  test('si no cargan los datos hay un estado de error con Reintentar', async ({ page }) => {
    const api = await open(page, '/');
    api.override((r) => (r.path === '/social/admin' ? { status: 500, body: {} } : undefined));
    await page.getByRole('link', { name: 'Redes sociales' }).click();
    await expect(page.getByText('No pudimos cargar los datos.')).toBeVisible();
    api.override(() => undefined);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(field(page, 'Facebook')).toHaveValue('https://www.facebook.com/ejemplo');
  });

  test('a 390: sin scroll horizontal, Guardar fijo abajo y controles de 44 px', async ({ page }) => {
    await open(page, '/social', { width: 390, height: 844 });
    await expect(field(page, 'Facebook')).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
    const save = await page.getByRole('button', { name: 'Guardar' }).boundingBox();
    expect(save.height).toBeGreaterThanOrEqual(44);
    expect(save.y + save.height).toBeGreaterThan(844 - 24);
    const abrir = await page.getByRole('link', { name: 'Abrir Facebook en una pestaña nueva' }).boundingBox();
    expect(abrir.height).toBeGreaterThanOrEqual(44);
    expect((await field(page, 'Facebook').boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expectNoBlockingAxe(page);
  });
});
