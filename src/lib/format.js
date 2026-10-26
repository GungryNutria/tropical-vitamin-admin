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

// 1000 -> "$1,000 MXN"
export function formatPrice(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  return `$${priceNumber.format(value)} MXN`;
}
