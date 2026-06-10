export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function getLocalDateTimestamp(dateString: string): number {
  return parseLocalDate(dateString).getTime();
}

export function formatLocalDate(dateString: string, locale = "pt-BR"): string {
  return parseLocalDate(dateString).toLocaleDateString(locale);
}
