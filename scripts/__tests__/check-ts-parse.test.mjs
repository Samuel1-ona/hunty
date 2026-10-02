import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { findParseErrors } from "../check-ts-parse.mjs";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../check-ts-parse.mjs");

describe("check-ts-parse", () => {
  let dir;
  const file = (name, contents) => {
    const full = path.join(dir, name);
    writeFileSync(full, contents);
    return full;
  };

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), "ts-parse-"));
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("accepts valid TS and TSX", () => {
    const ts = file("ok.ts", "export const add = (a: number, b: number): number => a + b;\n");
    const tsx = file(
      "ok.tsx",
      "export function Hello({ name }: { name: string }) {\n  return <div>{name}</div>;\n}\n"
    );
    assert.deepEqual(findParseErrors([ts, tsx]), []);
  });

  it("does not type-check (type errors are ignored)", () => {
    const ts = file("typeerr.ts", 'const n: number = "not a number";\nexport default n;\n');
    assert.deepEqual(findParseErrors([ts]), []);
  });

  it("flags literal \\n escapes pasted into source", () => {
    const broken = file(
      "escaped.tsx",
      'import React from "react";\\nexport const X = () => <div />;\\n'
    );
    const errors = findParseErrors([broken]);
    assert.ok(errors.length > 0);
    assert.equal(errors[0].file, broken);
    assert.equal(errors[0].line, 1);
  });

  it("flags merge-conflict markers", () => {
    const broken = file(
      "conflict.ts",
      "export const a = 1;\n<<<<<<< HEAD\nexport const b = 2;\n=======\nexport const b = 3;\n>>>>>>> branch\n"
    );
    assert.ok(findParseErrors([broken]).length > 0);
  });

  it("flags JSX in a .ts file", () => {
    const broken = file("jsx.ts", "export const X = () => <div />;\n");
    assert.ok(findParseErrors([broken]).length > 0);
  });

  it("accepts declaration files", () => {
    const dts = file(
      "types.d.ts",
      'declare module "*.svg" {\n  const src: string;\n  export default src;\n}\nexport declare function f(): void;\n'
    );
    assert.deepEqual(findParseErrors([dts]), []);
  });

  it("reports unreadable files", () => {
    const errors = findParseErrors([path.join(dir, "missing.ts")]);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /Cannot read file/);
  });

  it("ignores non-TypeScript files", () => {
    const js = file("x.json", "{ not json");
    assert.deepEqual(findParseErrors([js]), []);
  });

  it("CLI exits 0 for valid files and 1 with file:line:col output for broken ones", () => {
    const ok = file("cli-ok.ts", "export const ok = true;\n");
    execFileSync(process.execPath, [SCRIPT, ok]);

    const broken = file("cli-bad.ts", "export const x = {;\n");
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, ok, broken], { stdio: "pipe" }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr.toString(), /cli-bad\.ts:1:\d+ /);
        return true;
      }
    );
  });
});
