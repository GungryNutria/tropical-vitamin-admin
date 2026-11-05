// Reglas de redes sociales (spec 007, plan "Normalización"). Copia en JS de `social.rules.ts` de la API:
// la API es la garantía (REQ-12) y esta copia da respuesta inmediata en el formulario (D-3).
// Cada función devuelve { value, error }: `error` es un código (FORMAT | DOMAIN | REQUIRED | LENGTH) o null.

export const NETWORKS = [
  { key: 'facebook', label: 'Facebook', domains: ['facebook.com', 'fb.com'] },
  { key: 'instagram', label: 'Instagram', domains: ['instagram.com'] },
  { key: 'linkedin', label: 'LinkedIn', domains: ['linkedin.com'] },
];

// trim; vacío = null; sin http:// ni https:// se antepone https://.
export function normalizeUrl(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

// url vacía -> { value: null, error: null }. Se guarda `url.href` tal como queda tras el parseo.
export function checkUrl(network, raw) {
  const text = normalizeUrl(raw);
  if (text === null) return { value: null, error: null };
  let url;
  try {
    url = new URL(text);
  } catch {
    return { value: null, error: 'FORMAT' };
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return { value: null, error: 'FORMAT' };
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const { domains } = NETWORKS.find((n) => n.key === network);
  if (!domains.some((d) => host === d || host.endsWith(`.${d}`))) return { value: null, error: 'DOMAIN' };
  return { value: url.href, error: null };
}

// Se quitan espacios, guiones, +, paréntesis y puntos; quedan 11 a 15 dígitos.
export function normalizeWhatsapp(raw) {
  const digits = String(raw ?? '').replace(/[\s\-+().]/g, '');
  if (!digits) return { value: null, error: 'REQUIRED' };
  if (!/^\d{11,15}$/.test(digits)) return { value: null, error: 'LENGTH' };
  return { value: digits, error: null };
}

// Mensajes de §2 del brief por código.
export function errorText(code, network) {
  const net = NETWORKS.find((n) => n.key === network);
  switch (code) {
    case 'FORMAT':
      return 'Esto no parece un enlace. Pega la dirección completa de tu página.';
    case 'DOMAIN':
      return `Este enlace no es de ${net?.label}. Revisa que empiece con ${net?.domains[0]}.`;
    case 'REQUIRED':
      return 'Escribe el número de WhatsApp: es la forma principal de contacto.';
    case 'LENGTH':
      return 'El número debe tener de 11 a 15 dígitos, con la lada del país.';
    default:
      return null;
  }
}
