import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { routing } from "../i18n/routing";

function getKeys(obj: any, prefix = ""): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys = keys.concat(getKeys(obj[key], `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

describe("i18n message catalogues", () => {
  it("have identical key sets as en.json", () => {
    const messagesDir = path.join(__dirname, "../messages");
    const enPath = path.join(messagesDir, "en.json");
    const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
    const enKeys = getKeys(enContent).sort();

    const locales = routing.locales.filter((l: string) => l !== "en");

    for (const locale of locales) {
      const localePath = path.join(messagesDir, `${locale}.json`);
      const localeContent = JSON.parse(fs.readFileSync(localePath, "utf-8"));
      const localeKeys = getKeys(localeContent).sort();

      expect(localeKeys).toEqual(enKeys);
    }
  });
});
