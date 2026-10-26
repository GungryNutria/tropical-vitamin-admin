import { test, expect } from '@playwright/test';
import { formatDuration, formatPrice } from '../src/lib/format.js';
import {
  categoryHasPendingTranslations,
  hasNoPhoto,
  hasPendingTexts,
  isDuplicateAdminName,
  isDuplicateLanguageCode,
  normalizeAdminName,
  textsByLanguage,
} from '../src/lib/catalog.js';
import { categories, languages, tours } from './fixtures/data.js';

test.describe('format.js', () => {
  test('formatDuration', () => {
    expect(formatDuration(150)).toBe('2 h 30 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(250)).toBe('4 h 10 min');
    expect(formatDuration(undefined)).toBe('');
  });

  test('formatPrice', () => {
    expect(formatPrice(1000)).toBe('$1,000 MXN');
    expect(formatPrice('850.5')).toBe('$850.5 MXN');
    expect(formatPrice(undefined)).toBe('');
  });
});

test.describe('catalog.js', () => {
  test('pendientes de textos: idioma activo sin traducción o con campos vacíos', () => {
    const complete = tours[0];
    const noEnglish = { ...complete, translations: [complete.translations[0]] };
    const blankTitle = {
      ...complete,
      translations: [complete.translations[0], { ...complete.translations[1], title: '   ' }],
    };
    expect(hasPendingTexts(complete, languages)).toBe(false);
    expect(hasPendingTexts(noEnglish, languages)).toBe(true);
    expect(hasPendingTexts(blankTitle, languages)).toBe(true);
    // fr está inactivo: no cuenta como pendiente.
    expect(languages.find((l) => l.code === 'fr').isActive).toBe(false);
  });

  test('sin foto y categoría con traducciones pendientes', () => {
    expect(hasNoPhoto({ img: null })).toBe(true);
    expect(hasNoPhoto({ img: '/uploads/a.jpg' })).toBe(false);
    expect(categoryHasPendingTranslations(categories[0], languages)).toBe(false);
    expect(categoryHasPendingTranslations({ ...categories[0], translations: [] }, languages)).toBe(true);
  });

  test('textos por idioma (los que borra la cascada)', () => {
    expect(textsByLanguage(2, tours, categories)).toEqual({ tours: 39, categories: 9 });
    expect(textsByLanguage(3, tours, categories)).toEqual({ tours: 0, categories: 0 });
  });

  test('normalización y duplicados', () => {
    expect(normalizeAdminName('  Snorkel   Tours ')).toBe('snorkel-tours');
    const existing = [{ id: 1, adminName: 'snorkel-tours' }];
    expect(isDuplicateAdminName('Snorkel Tours', existing)).toBe(true);
    expect(isDuplicateAdminName('Snorkel Tours', existing, 1)).toBe(false);
    expect(isDuplicateLanguageCode(' EN ', languages)).toBe(true);
    expect(isDuplicateLanguageCode('de', languages)).toBe(false);
  });
});
