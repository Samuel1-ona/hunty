/**
 * Lightweight in-memory SQL mock for testing PostgreSQL-backed modules.
 *
 * Intercepts tagged-template calls from the `postgres` driver and performs
 * in-memory CRUD operations so that functions backed by `getDb()` can be
 * tested without a real database.
 *
 * Supports: SELECT (with WHERE, OR, ORDER BY, LIMIT, COUNT, GROUP BY,
 * DISTINCT ON), INSERT (with ON CONFLICT ... DO UPDATE, EXCLUDED refs),
 * UPDATE (with RETURNING), DELETE (with RETURNING).
 */

export interface Row {
  [key: string]: unknown;
}

export type MockSql = (strings: readonly string[], ...values: unknown[]) => Promise<Row[]>;

export function createMockSql(tables: Record<string, Row[]>): MockSql {
  function toTemplateStrings(strings: readonly string[], values: unknown[]): string {
    let sql = "";
    for (let i = 0; i < strings.length; i++) {
      sql += strings[i];
      if (i < values.length) {
        const v = values[i];
        if (v === null || v === undefined) sql += "NULL";
        else if (typeof v === "string") sql += `'${v}'`;
        else if (Array.isArray(v)) sql += `'{${v.join(",")}}'`;
        else if (typeof v === "object") sql += `'${JSON.stringify(v)}'`;
        else sql += String(v);
      }
    }
    return sql;
  }

  function parseValue(raw: string): unknown {
    if (raw === undefined || raw === "NULL" || raw === "null") return null;
    if (raw === "true") return true;
    if (raw === "false") return false;
    if (raw.startsWith("'") && raw.endsWith("'")) {
      const inner = raw.slice(1, -1);
      // Distinguish PostgreSQL array literals {a,b} from JSON objects {"k":"v"}
      // Arrays have no colons inside braces; JSON objects do.
      if (inner.startsWith("{") && inner.endsWith("}") && !inner.includes(":")) {
        return inner.slice(1, -1).split(",").filter(Boolean);
      }
      return inner;
    }
    if (!Number.isNaN(Number(raw)) && raw !== "") return Number(raw);
    // Handle NOW() function calls - return current timestamp
    if (raw === "NOW()" || raw === "now()") return new Date();
    return raw;
  }

  function evalWhere(row: Row, condStr: string): boolean {
    // Handle OR-separated groups
    const orGroups = condStr.split(/\s+OR\s+/i);
    for (const group of orGroups) {
      if (evalAndGroup(row, group)) return true;
    }
    return false;
  }

  function evalAndGroup(row: Row, condStr: string): boolean {
    const parts = condStr.split(/\s+AND\s+/i);
    for (const part of parts) {
      const trimmed = part.trim();
      // Handle col = ANY('{...}')
      const anyMatch = trimmed.match(/(\w+)\s*=\s*ANY\('\{([^}]*)\}'\)/i);
      if (anyMatch) {
        const col = anyMatch[1].toLowerCase();
        const vals = anyMatch[2].split(",").map((v) => parseValue(v.trim()));
        if (!vals.includes(row[col])) return false;
        continue;
      }
      // Handle >
      const gt = trimmed.match(/(\w+)\s*>\s*(.+)/i);
      if (gt) {
        const col = gt[1].toLowerCase();
        const val = parseValue(gt[2].trim());
        const rowVal = row[col];
        // Handle both numbers and Date objects
        const rowNum =
          typeof rowVal === "object" && rowVal instanceof Date ? rowVal.getTime() : rowVal;
        const valNum = typeof val === "object" && val instanceof Date ? val.getTime() : val;
        if (typeof rowNum !== "number" || typeof valNum !== "number") return false;
        if (rowNum <= valNum) return false;
        continue;
      }
      // Handle <
      const lt = trimmed.match(/(\w+)\s*<\s*(.+)/i);
      if (lt) {
        const col = lt[1].toLowerCase();
        const val = parseValue(lt[2].trim());
        const rowVal = row[col];
        // Handle both numbers and Date objects
        const rowNum =
          typeof rowVal === "object" && rowVal instanceof Date ? rowVal.getTime() : rowVal;
        const valNum = typeof val === "object" && val instanceof Date ? val.getTime() : val;
        if (typeof rowNum !== "number" || typeof valNum !== "number") return false;
        if (rowNum >= valNum) return false;
        continue;
      }
      // Handle !=
      const neq = trimmed.match(/(\w+)\s*!=\s*(.+)/i);
      if (neq) {
        const col = neq[1].toLowerCase();
        const val = parseValue(neq[2].trim());
        if (row[col] === val) return false;
        continue;
      }
      // Handle <>
      const neqAlt = trimmed.match(/(\w+)\s*<>\s*(.+)/i);
      if (neqAlt) {
        const col = neqAlt[1].toLowerCase();
        const val = parseValue(neqAlt[2].trim());
        if (row[col] === val) return false;
        continue;
      }
      const eq = trimmed.match(/(\w+)\s*=\s*(.+)/i);
      if (!eq) continue;
      const col = eq[1].toLowerCase();
      const val = parseValue(eq[2].trim());
      if (row[col] !== val) return false;
    }
    return true;
  }

  function parseWhere(sql: string): string | null {
    const m = sql.match(/WHERE\s+(.+?)(?:\s+(?:ORDER|LIMIT|RETURNING|GROUP)|$)/i);
    return m ? m[1].trim() : null;
  }

  function applyWhere(rows: Row[], whereStr: string | null): Row[] {
    if (!whereStr) return rows;
    return rows.filter((r) => evalWhere(r, whereStr));
  }

  function parseOrderBy(sql: string): { col: string; asc: boolean } | null {
    const m = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (!m) return null;
    return { col: m[1].toLowerCase(), asc: !m[2] || m[2].toUpperCase() === "ASC" };
  }

  function parseLimit(sql: string): number | null {
    const m = sql.match(/LIMIT\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function findTable(sql: string): string | null {
    const lower = sql.toLowerCase();
    for (const name of Object.keys(tables)) {
      if (lower.includes(name)) return name;
    }
    return null;
  }

  function applyOrderBy(rows: Row[], ob: { col: string; asc: boolean } | null): Row[] {
    if (!ob) return rows;
    return [...rows].sort((a, b) => {
      const av = a[ob.col] as number | string;
      const bv = b[ob.col] as number | string;
      if (av < bv) return ob.asc ? -1 : 1;
      if (av > bv) return ob.asc ? 1 : -1;
      return 0;
    });
  }

  function parseSet(sql: string): Record<string, string> | null {
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
    if (!setMatch) return null;
    const setters: Record<string, string> = {};
    const pairs = setMatch[1].split(",");
    for (const pair of pairs) {
      const eq = pair.match(/(\w+)\s*=\s*(.+)/i);
      if (!eq) continue;
      setters[eq[1].toLowerCase()] = eq[2].trim();
    }
    return setters;
  }

  function applySetters(row: Row, setters: Record<string, string>, insertRow?: Row): void {
    for (const [col, rawVal] of Object.entries(setters)) {
      // Handle EXCLUDED.col references — use the value from the INSERT row
      const excludedMatch = rawVal.match(/^EXCLUDED\.(\w+)$/i);
      if (excludedMatch && insertRow) {
        row[col] = insertRow[excludedMatch[1].toLowerCase()];
        continue;
      }
      // Handle table.col.inc patterns (e.g. anti_cheat_tracking.attempt_count + 1)
      const incMatch = rawVal.match(/\w+\.(\w+)\s*\+\s*(\d+)/i);
      if (incMatch) {
        row[col] = (row[incMatch[1]] as number) + Number(incMatch[2]);
        continue;
      }
      row[col] = parseValue(rawVal);
    }
  }

  function parseValues(sql: string): Record<string, unknown> | null {
    const colMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
    if (!colMatch) return null;
    const cols = colMatch[1].split(",").map((c) => c.trim().toLowerCase());

    const valSection = sql.match(/VALUES\s*\((.+?)\)(?:\s+ON|\s*$)/is);
    if (!valSection) return null;

    const rawVals: string[] = [];
    let current = "";
    let inSingle = false;
    let inBrace = false;
    for (const ch of valSection[1]) {
      if (ch === "'" && !inBrace) {
        inSingle = !inSingle;
        current += ch;
      } else if (ch === "{" && !inSingle) {
        inBrace = true;
        current += ch;
      } else if (ch === "}" && inBrace) {
        inBrace = false;
        current += ch;
      } else if (ch === "," && !inSingle && !inBrace) {
        rawVals.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) rawVals.push(current.trim());

    const row: Row = {};
    for (let i = 0; i < cols.length; i++) {
      row[cols[i]] = parseValue(rawVals[i]);
    }
    return row;
  }

  function handleSelect(sql: string): Row[] {
    const upper = sql.toUpperCase();

    // Handle GROUP BY with aggregates (must be checked before COUNT)
    const groupByMatch = sql.match(/GROUP\s+BY\s+([\w,\s]+)/i);
    if (groupByMatch) {
      const table = findTable(sql);
      if (!table) return [];
      const whereStr = parseWhere(sql);
      const rows = applyWhere(tables[table], whereStr);
      const groupCols = groupByMatch[1].split(",").map((c) => c.trim().toLowerCase());

      // Parse SELECT columns to find aggregates
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/is);
      const selectClause = selectMatch ? selectMatch[1] : "";

      // Group rows
      const groups = new Map<string, Row[]>();
      for (const row of rows) {
        const key = groupCols.map((c) => String(row[c])).join("||");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      const result: Row[] = [];
      for (const [, groupRows] of groups) {
        const out: Row = {};
        for (const gc of groupCols) {
          out[gc] = groupRows[0][gc];
        }
        // Parse aggregates: COUNT(*)::int AS count, MAX(col) AS alias, COUNT(DISTINCT col) AS count
        const countAgg = selectClause.match(/COUNT\(\s*\*?\s*\)\s*(?:::(\w+))?\s*(?:AS\s+(\w+))?/i);
        if (countAgg) {
          out[countAgg[2] || "count"] = groupRows.length;
        }
        const countDistinctAgg = selectClause.match(
          /COUNT\s*\(\s*DISTINCT\s+(\w+)\s*\)\s*(?:::(\w+))?\s*(?:AS\s+(\w+))?/i
        );
        if (countDistinctAgg) {
          const col = countDistinctAgg[1].toLowerCase();
          const distinctValues = new Set(groupRows.map((r) => r[col]));
          out[countDistinctAgg[3] || "count"] = distinctValues.size;
        }
        const maxAgg = selectClause.match(/MAX\((\w+)\)\s*(?:AS\s+(\w+))?/i);
        if (maxAgg) {
          const col = maxAgg[1].toLowerCase();
          out[maxAgg[2] || col] = Math.max(...groupRows.map((r) => r[col] as number));
        }
        result.push(out);
      }
      return result;
    }

    // Handle COUNT(DISTINCT col) without GROUP BY (check before general COUNT)
    const countDistinctMatch = sql.match(
      /COUNT\s*\(\s*DISTINCT\s+(\w+)\s*\)(?:\s*::\w+)?\s*(?:AS\s+(\w+))?/i
    );
    if (countDistinctMatch) {
      const table = findTable(sql);
      if (!table) return [{ count: 0 }];
      const whereStr = parseWhere(sql);
      const rows = applyWhere(tables[table], whereStr);
      const col = countDistinctMatch[1].toLowerCase();
      const distinctValues = new Set(rows.map((r) => r[col]));
      const alias = countDistinctMatch[2] || "count";
      return [{ [alias]: distinctValues.size }];
    }

    // Handle COUNT(*) (only if not COUNT(DISTINCT))
    if (upper.includes("COUNT(") && !upper.includes("DISTINCT")) {
      const table = findTable(sql);
      if (!table) return [{ count: 0 }];
      const whereStr = parseWhere(sql);
      const rows = applyWhere(tables[table], whereStr);
      return [{ count: rows.length }];
    }

    // Handle DISTINCT ON
    const distinctOn = sql.match(/DISTINCT\s+ON\s*\((\w+)\)/i);
    if (distinctOn) {
      const table = findTable(sql);
      if (!table) return [];
      const whereStr = parseWhere(sql);
      const ob = parseOrderBy(sql);
      let rows = applyWhere(tables[table], whereStr);
      rows = applyOrderBy(rows, ob);
      const seen = new Set<unknown>();
      const unique: Row[] = [];
      for (const r of rows) {
        const key = r[distinctOn[1].toLowerCase()];
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(r);
        }
      }
      return unique;
    }

    // Standard SELECT
    const table = findTable(sql);
    if (!table) return [];
    const whereStr = parseWhere(sql);
    const ob = parseOrderBy(sql);
    const limit = parseLimit(sql);
    let rows = [...tables[table]];
    rows = applyWhere(rows, whereStr);
    rows = applyOrderBy(rows, ob);
    if (limit !== null) rows = rows.slice(0, limit);
    return rows;
  }

  function handleInsert(sql: string): Row[] {
    const tblMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    if (!tblMatch) return [];
    const table = tblMatch[1].toLowerCase();
    if (!tables[table]) tables[table] = [];

    const rowData = parseValues(sql);
    if (!rowData) return [];

    // Handle ON CONFLICT ... DO UPDATE
    if (sql.toUpperCase().includes("ON CONFLICT")) {
      const conflictMatch = sql.match(/ON\s+CONFLICT\s*\((\w+)\)/i);
      const conflictCol = conflictMatch ? conflictMatch[1].toLowerCase() : null;

      if (conflictCol && rowData[conflictCol] !== undefined) {
        const existing = tables[table].find((r) => r[conflictCol] === rowData[conflictCol]);
        if (existing) {
          const setClause = sql.match(/DO\s+UPDATE\s+SET\s+(.+?)(?:\s*$)/is);
          if (setClause) {
            const setters = parseSet(`SET ${setClause[1]} WHERE 1=1`) ?? {};
            applySetters(existing, setters, rowData);
          }
          return [existing];
        }
      }

      tables[table].push(rowData);
      return [rowData];
    }

    tables[table].push(rowData);
    return [];
  }

  function handleUpdate(sql: string): Row[] {
    const tblMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tblMatch) return [];
    const table = tblMatch[1].toLowerCase();
    if (!tables[table]) return [];

    const setters = parseSet(sql);
    if (!setters) return [];

    const whereStr = parseWhere(sql);
    const matched = applyWhere(tables[table], whereStr);
    for (const row of matched) {
      applySetters(row, setters);
    }
    return sql.toUpperCase().includes("RETURNING") ? matched : [];
  }

  function handleDelete(sql: string): Row[] {
    const tblMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (!tblMatch) return [];
    const table = tblMatch[1].toLowerCase();
    if (!tables[table]) return [];

    const whereStr = parseWhere(sql);
    const matched = applyWhere(tables[table], whereStr);
    tables[table] = tables[table].filter((r) => !evalWhere(r, whereStr || "1=1"));
    return sql.toUpperCase().includes("RETURNING") ? matched : [];
  }

  function mockSql(strings: readonly string[], ...values: unknown[]): Promise<Row[]> {
    const sql = toTemplateStrings(strings, values);
    const upper = sql.trim().toUpperCase();

    if (upper.startsWith("SELECT")) {
      return Promise.resolve(handleSelect(sql));
    }
    if (upper.startsWith("INSERT")) {
      return Promise.resolve(handleInsert(sql));
    }
    if (upper.startsWith("UPDATE")) {
      return Promise.resolve(handleUpdate(sql));
    }
    if (upper.startsWith("DELETE")) {
      return Promise.resolve(handleDelete(sql));
    }
    return Promise.resolve([]);
  }

  return mockSql;
}

/** Reset all tables to empty state. */
export function resetTables(tables: Record<string, Row[]>): void {
  for (const key of Object.keys(tables)) {
    tables[key] = [];
  }
}
