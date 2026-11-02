export function formatCurrency(value, rateBasis = null) {
  if (value === null || value === undefined || isNaN(Number(value))) return '-';
  const num = Number(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);

  if (!rateBasis) return formatted;
  if (rateBasis === 'hour') return `${formatted}/hr`;
  if (rateBasis === 'week') return `${formatted}/wk`;
  if (rateBasis === 'year') return `${formatted}/yr`;
  return `${formatted} (${rateBasis})`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return '0%';
  const num = Number(value);
  return `${Math.round(num)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

export function calculateDaysLeft(expiresOn) {
  if (!expiresOn) return null;
  try {
    const exp = new Date(expiresOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exp - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
