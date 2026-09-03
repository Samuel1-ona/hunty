/**
 * Smoke test: every route.ts under apps/web/app/api must be importable
 * and must export at least one HTTP method handler (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS).
 *
 * Issue #1121: six route files currently fail to parse. This test will
 * catch any such failure the moment a broken route lands.
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

// Root of apps/web — __dirname is apps/web/app/api/__tests__
const WEB_ROOT = path.resolve(__dirname, "../../../");
const API_ROOT = path.resolve(WEB_ROOT, "app/api");

function findRouteFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    // Exclude __tests__ directory
    if (file === "__tests__") continue;
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findRouteFiles(filePath));
    } else if (file === "route.ts") {
      results.push(filePath);
    }
  }
  return results;
}

describe("API route smoke tests", () => {
  const routeFiles = findRouteFiles(API_ROOT);

  // Sanity: make sure we actually found some route files
  it("finds at least one route.ts file", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  // One test per route file
  for (const routeFile of routeFiles) {
    const relativePath = path.relative(WEB_ROOT, routeFile);

    it(`${relativePath} — can be imported and exports an HTTP handler`, async () => {
      // This will throw (and fail the test) if the file has a parse/syntax error
      let mod: Record<string, unknown>;
      try {
        mod = await import(routeFile);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Failed to import ${relativePath}:\n  ${message}`
        );
      }

      // Assert at least one named HTTP method export is present
      const exportedMethods = HTTP_METHODS.filter((method) => typeof mod[method] === "function");

      expect(
        exportedMethods.length,
        `${relativePath} must export at least one of: ${HTTP_METHODS.join(", ")}.` +
          ` Found exports: ${Object.keys(mod).join(", ") || "(none)"}`
      ).toBeGreaterThan(0);
    });
  }
});
