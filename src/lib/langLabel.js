const NAMES = { es: 'español', en: 'inglés' };

// Idioma como se nombra en una frase ("en inglés"); los demás, con su nombre.
export const langLabel = (language) => NAMES[language.code] || language.name;

// "inglés", "español y inglés", "español, inglés y Français".
export function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export const plural = (n, one, many) => (n === 1 ? one : many);
