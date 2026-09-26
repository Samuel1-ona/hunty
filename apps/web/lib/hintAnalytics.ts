import type { HintUsage } from "./progressiveHints";

const STORAGE_KEY = "hunty_hint_usage";

export function recordHintUsage(usage: HintUsage): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);

    const records: HintUsage[] = existing
      ? JSON.parse(existing)
      : [];

    records.push(usage);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    );
  } catch {
    // Analytics must never break gameplay.
  }
}

export function getHintUsage(): HintUsage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);

    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}
