import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { API, mockApi } from './fixtures/mockApi.js';

// V1 Login (T-9): E1.1 a E1.5 de R2 a 1440 y a 390. AC-1, AC-2, AC-3 (390), AC-UX-12 (44 px), AC-UX-17.
const email = (page) => page.locator('#login-email');
const password = (page) => page.locator('#login-password');
const box = (input) => input.locator('xpath=ancestor::div[contains(@class,"MuiOutlinedInput-root")]').boundingBox();
const enter = (page) => page.getByRole('button', { name: /^Entr/ });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const blocking = async (page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);

async function openLogin(page) {
  const api = await mockApi(page, { authenticated: false });
  await page.goto('/login');
  return api;
}

async function fill(page, mail = 'admin@tropical-vitamin.com', pass = 'secreto-123') {
  await email(page).fill(mail);
  await password(page).fill(pass);
}

test.describe('V1 Login (T-9)', () => {
  test('E1.1: logo, título, subtítulo, correo, contraseña con ojo y un solo primario "Entrar"', async ({ page }) => {
    await openLogin(page);
    await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible();
    await expect(page.getByText('Entra con tu correo y contraseña.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Tropical Vitamin' })).toBeVisible();
    await expect(email(page)).toHaveAttribute('type', 'email');
    await expect(password(page)).toHaveAttribute('type', 'password');
    await expect(enter(page)).toHaveText('Entrar');
    await expect(page.getByRole('alert')).toHaveCount(0);
    // 1440: tarjeta de 400 px con campos de 336.
    expect((await page.getByRole('main').boundingBox()).width).toBe(400);
    expect((await box(email(page))).width).toBe(336);
  });

  test('el ojo muestra y oculta la contraseña y cambia su nombre accesible', async ({ page }) => {
    await openLogin(page);
    await password(page).fill('secreto-123');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password(page)).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password(page)).toHaveAttribute('type', 'password');
  });

  test('AC-1: entrar con credenciales buenas lleva al inicio y guarda la sesión', async ({ page }) => {
    const { requests } = await openLogin(page);
    await fill(page);
    await enter(page).click();
    await expect(page).toHaveURL('/');
    expect(await page.evaluate(() => localStorage.getItem('adminToken'))).toBe('token-de-prueba');
    const login = requests.find((r) => r.path === '/auth/login');
    expect(JSON.parse(login.body)).toEqual({ email: 'admin@tropical-vitamin.com', password: 'secreto-123' });
  });

  test('E1.2: mientras entra, los campos y el botón se bloquean y el botón dice "Entrando…"', async ({ page }) => {
    await openLogin(page);
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    await page.route(`${API}/auth/login`, async (route) => {
      await gate;
      await route.fallback();
    });
    await fill(page);
    await enter(page).click();
    await expect(page.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
    await expect(email(page)).toBeDisabled();
    await expect(password(page)).toBeDisabled();
    expect(await email(page).inputValue()).toBe('admin@tropical-vitamin.com');
    release();
    await expect(page).toHaveURL('/');
  });

  test('E1.3: credenciales incorrectas dicen el motivo en texto, conservan el correo y dejan la contraseña vacía con el foco', async ({ page }) => {
    const api = await openLogin(page);
    api.override((r) => (r.path === '/auth/login' ? { status: 401, body: { message: 'Unauthorized' } } : undefined));
    await fill(page);
    await enter(page).click();
    await expect(page.getByRole('alert')).toHaveText('El correo o la contraseña no coinciden.');
    await expect(page).toHaveURL('/login');
    await expect(email(page)).toHaveValue('admin@tropical-vitamin.com');
    await expect(password(page)).toHaveValue('');
    await expect(password(page)).toBeFocused();
    await expect(password(page)).toHaveAttribute('aria-invalid', 'true');
    // Un 401 del login no es "sesión vencida": no sale ese aviso.
    await expect(page.getByText('Tu sesión terminó.')).toHaveCount(0);
    // Corregir y volver a entrar funciona y el aviso se va.
    api.override(() => undefined);
    await password(page).fill('bien');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/');
  });

  test('E1.4: sin conexión es un aviso distinto; volver a pulsar "Entrar" reintenta con lo escrito', async ({ page }) => {
    await openLogin(page);
    await page.route(`${API}/auth/login`, (route) => route.abort('connectionrefused'));
    await fill(page);
    await enter(page).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('No pudimos conectar con el servidor.');
    await expect(alert).toContainText('Revisa tu conexión e intenta de nuevo.');
    await expect(email(page)).toHaveValue('admin@tropical-vitamin.com');
    await expect(password(page)).toHaveValue('secreto-123');
    await page.unroute(`${API}/auth/login`);
    await enter(page).click();
    await expect(page).toHaveURL('/');
  });

  test('E1.5: llegar con el motivo "expired" muestra el aviso naranja sin bloquear el formulario', async ({ page }) => {
    const api = await mockApi(page);
    api.override((r) => (r.path === '/tours/all' ? { status: 401, body: { message: 'Unauthorized' } } : undefined));
    await page.goto('/tours');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Tu sesión terminó. Entra de nuevo para seguir.')).toBeVisible();
    await expect(enter(page)).toBeEnabled();
    await expect(email(page)).toBeEnabled();
  });

  test('un error del servidor (500) también se explica y no se confunde con credenciales', async ({ page }) => {
    const api = await openLogin(page);
    api.override((r) => (r.path === '/auth/login' ? { status: 500, body: {} } : undefined));
    await fill(page);
    await enter(page).click();
    await expect(page.getByRole('alert')).toContainText('El servidor tuvo un problema.');
    await expect(password(page)).toHaveValue('secreto-123');
  });

  test('390: sin tarjeta, campos y botón de 44 px de alto, sin scroll horizontal (AC-3, AC-UX-12)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLogin(page);
    expect(await noOverflow(page)).toBe(true);
    expect((await email(page).boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect((await box(email(page))).height).toBeGreaterThanOrEqual(44);
    expect((await password(page).boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect((await enter(page).boundingBox()).height).toBeGreaterThanOrEqual(44);
    const eye = await page.getByRole('button', { name: 'Mostrar contraseña' }).boundingBox();
    expect(eye.width).toBeGreaterThanOrEqual(44);
    expect(eye.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('main')).toHaveCSS('border-top-width', '0px');
    const card = await page.getByRole('main').boundingBox();
    expect(card.width).toBe(358);
  });

  test('barrido de anchos: sin scroll horizontal a 390, 768, 1280 y 1440, también con el aviso de sesión vencida', async ({ page }) => {
    await openLogin(page);
    for (const width of [390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await noOverflow(page), `ancho ${width}`).toBe(true);
    }
  });

  test('axe: 0 serious/critical en normal, con error y con sesión vencida', async ({ page }) => {
    const api = await openLogin(page);
    expect(await blocking(page)).toEqual([]);
    api.override((r) => (r.path === '/auth/login' ? { status: 401, body: {} } : undefined));
    await fill(page);
    await enter(page).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await blocking(page)).toEqual([]);
  });
});
