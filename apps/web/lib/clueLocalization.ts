export type LocaleTextMap = Partial<Record<string, string>>;

export function normalizeLocale(locale?: string | null): string {
  const normalized = (locale ?? "en").trim().toLowerCase().replace(/_/g, "-");
  return normalized.split("-")[0] || "en";
}

export function resolveLocalizedText(
  translations: LocaleTextMap | undefined,
  locale: string | null | undefined,
  fallbackText?: string
): string {
  const rawFallback = typeof fallbackText === "string" ? fallbackText.trim() : "";
  if (!translations || Object.keys(translations).length === 0) {
    return rawFallback;
  }

  const candidates = [...new Set([normalizeLocale(locale), "en", normalizeLocale("en")])];
  for (const candidate of candidates) {
    const value = translations[candidate];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(translations)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return rawFallback;
}

export function getRuntimeLocale(): string {
  if (typeof window === "undefined") {
    return "en";
  }

  const pathname = window.location.pathname || "/";
  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  if (localeMatch?.[1]) {
    return localeMatch[1].toLowerCase();
  }

  const documentLocale = document.documentElement.lang || navigator.language || "en";
  return normalizeLocale(documentLocale);
}
