// 150 -> "2 h 30 min", 120 -> "2 h", 45 -> "45 min"
export function formatDuration(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return '';
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const priceNumber = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

// "1500" -> "1,500"; lo que no es número se devuelve igual.
export function formatAmount(raw) {
  const text = String(raw ?? '').trim();
  return text !== '' && Number.isFinite(Number(text)) ? priceNumber.format(Number(text)) : raw;
}

// 1000 -> "$1,000 MXN"
export function formatPrice(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  return `$${priceNumber.format(value)} MXN`;
}

const sizeNumber = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// 3984588 -> "3.8 MB" (es-MX: punto decimal); menos de 1 MB -> "512 KB"
export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '';
  if (value >= 1024 * 1024) return `${sizeNumber.format(value / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}
