// Reglas de dominio compartidas por Inicio, las listas y los formularios (plan 004, "Reglas de dominio").
// Los contadores de Inicio y los indicadores de las listas usan estas mismas funciones.

export const PROTECTED_LANGUAGE_CODES = ['es', 'en'];

const isBlank = (value) => !value || !String(value).trim();

export const activeLanguages = (languages = []) => languages.filter((l) => l.isActive);

// Español primero, luego inglés, luego el resto en su orden (sort estable).
const languageRank = (l) => PROTECTED_LANGUAGE_CODES.indexOf(l.code) === -1 ? PROTECTED_LANGUAGE_CODES.length : PROTECTED_LANGUAGE_CODES.indexOf(l.code);
export const orderLanguages = (languages = []) => [...languages].sort((a, b) => languageRank(a) - languageRank(b));

// Estado de cada idioma activo sobre una lista de traducciones: completo si existe
// y todos los campos pedidos tienen texto tras trim().
function languageStatus(translations = [], languages = [], fields) {
  return activeLanguages(languages).map((language) => {
    const translation = translations.find((t) => t.languageId === language.id);
    const complete = !!translation && fields.every((f) => !isBlank(translation[f]));
    return { language, complete };
  });
}

export const tourLanguageStatus = (tour, languages) =>
  languageStatus(tour.translations, languages, ['title', 'description']);

export const categoryLanguageStatus = (category, languages) =>
  languageStatus(category.translations, languages, ['name', 'description']);

export const hasPendingTexts = (tour, languages) =>
  tourLanguageStatus(tour, languages).some((s) => !s.complete);

export const hasNoPhoto = (tour) => !tour.img;

export const categoryHasPendingTranslations = (category, languages) =>
  categoryLanguageStatus(category, languages).some((s) => !s.complete);

// Textos que borraría la cascada al eliminar un idioma.
export function textsByLanguage(languageId, tours = [], categories = []) {
  const count = (items) =>
    items.reduce((n, item) => n + (item.translations || []).filter((t) => t.languageId === languageId).length, 0);
  return { tours: count(tours), categories: count(categories) };
}

// Igual que categories.service.ts de la API (con trim para evitar falsos negativos).
export const normalizeAdminName = (s) => s.trim().toLowerCase().replace(/\s+/g, '-');
export const normalizeLanguageCode = (s) => s.trim().toLowerCase();

// excludeId: al editar se excluye el propio registro.
export const isDuplicateAdminName = (name, categories = [], excludeId = null) => {
  const normalized = normalizeAdminName(name);
  return categories.some((c) => c.id !== excludeId && normalizeAdminName(c.adminName) === normalized);
};

export const isDuplicateLanguageCode = (code, languages = [], excludeId = null) => {
  const normalized = normalizeLanguageCode(code);
  return languages.some((l) => l.id !== excludeId && normalizeLanguageCode(l.code) === normalized);
};

export const isProtectedLanguage = (language) => PROTECTED_LANGUAGE_CODES.includes(language.code);
