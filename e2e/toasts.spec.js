import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { open } from './fixtures/catalog.js';

// AC-25 (REQ-28): todo resultado exitoso se confirma con un aviso abajo a la derecha, apilado; AC-11 (REQ-28): 0 alert()/confirm().
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

test.describe('Avisos', () => {
  test('AC-25: dos avisos de éxito se apilan abajo a la derecha, el más nuevo abajo', async ({ page }) => {
    await open(page, '/categories'); // la API simulada no quita la fila: se puede eliminar dos veces
    const remove = async () => {
      await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    };
    await remove();
    await expect(page.getByRole('status').filter({ hasText: 'Categoría «Gastronomía» eliminada' })).toHaveCount(1);
    await remove();
    const toasts = page.getByRole('status').filter({ hasText: 'Categoría «Gastronomía» eliminada' });
    await expect(toasts).toHaveCount(2);
    const a = await toasts.first().boundingBox();
    const b = await toasts.last().boundingBox();
    const viewport = page.viewportSize();
    expect(b.y).toBeGreaterThan(a.y); // el nuevo, debajo
    expect(Math.abs(viewport.width - (a.x + a.width) - 24)).toBeLessThanOrEqual(2); // margen de 24 a la derecha
    expect(Math.abs(viewport.width - (b.x + b.width) - 24)).toBeLessThanOrEqual(2);
    expect(viewport.height - (b.y + b.height)).toBeLessThanOrEqual(40); // abajo
  });

  test('los avisos de éxito desaparecen solos a los 5 s; los de error persisten hasta cerrarlos', async ({ page }) => {
    const api = await open(page, '/categories');
    let failing = true;
    api.override((r) => (failing && r.method === 'DELETE' ? { status: 500, body: {} } : undefined));
    const remove = async () => {
      await page.getByRole('button', { name: 'Eliminar «Gastronomía»' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    };
    await remove();
    const error = page.getByRole('alert').filter({ hasText: 'No pudimos eliminar' });
    await expect(error).toBeVisible();
    failing = false;
    await remove();
    const ok = page.getByRole('status').filter({ hasText: 'eliminada' });
    await expect(ok).toBeVisible();
    await expect(ok).toBeHidden({ timeout: 7500 });
    await expect(error).toBeVisible();
    await error.getByRole('button', { name: 'Cerrar aviso' }).click();
    await expect(error).toBeHidden();
  });

  test('AC-11: no queda ninguna llamada a alert( ni confirm( en src/', () => {
    const offenders = walk('src')
      .filter((f) => /\.(jsx?|tsx?)$/.test(f))
      .filter((f) => /\b(window\.)?(alert|confirm)\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
