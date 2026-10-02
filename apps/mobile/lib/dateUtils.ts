export function formatDateString(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatISOString(isoString: string): string {
  return formatDateString(isoString);
}
