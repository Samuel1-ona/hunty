/**
 * Bulk clue import from CSV (#1194).
 *
 * Parses a CSV of clues, validates each row against the Clue schema rules
 * (same constraints as validateClueDraft), and returns per-row results so
 * the UI can show a preview with offending rows highlighted before commit.
 *
 * Expected CSV columns (header row required):
 *   question, answer, points[, difficulty]
 *
 * - `question` and `answer` are required non-empty strings
 * - `points` must be a positive integer
 * - `difficulty` is optional; one of easy | medium | hard (default: medium)
 */

import type { Clue, ClueDifficulty } from "./types";

export interface CsvClueRow {
  row: number; // 1-based data row (excluding header)
  huntId: number;
  question: string;
  answer: string;
  points: number;
  difficulty?: ClueDifficulty;
}

export interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult {
  rows: CsvClueRow[];
  errors: CsvRowError[];
  ok: boolean;
}

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 500;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse raw CSV text into validated clue rows + per-row errors. */
export function parseCluesCsv(csvText: string, huntId: number): CsvImportResult {
  const rows: CsvClueRow[] = [];
  const errors: CsvRowError[] = [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows, errors: [{ row: 0, field: "file", message: "CSV is empty" }], ok: false };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const requiredCols = ["question", "answer", "points"];
  for (const col of requiredCols) {
    if (!header.includes(col)) {
      return {
        rows,
        errors: [{ row: 0, field: "header", message: `Missing required column "${col}"` }],
        ok: false,
      };
    }
  }

  const colIdx = (name: string) => header.indexOf(name);
  const qIdx = colIdx("question");
  const aIdx = colIdx("answer");
  const pIdx = colIdx("points");
  const dIdx = colIdx("difficulty");

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i; // 1-based data row
    const cells = splitCsvLine(lines[i]);
    let rowValid = true;

    const question = cells[qIdx] ?? "";
    const answer = aIdx >= 0 ? cells[aIdx] ?? "" : "";
    const pointsRaw = pIdx >= 0 ? cells[pIdx] ?? "" : "";
    const difficultyRaw = dIdx >= 0 ? cells[dIdx] ?? "" : "";

    if (!question) {
      errors.push({ row: rowNumber, field: "question", message: "Question is required" });
      rowValid = false;
    } else if (question.length > MAX_QUESTION_LENGTH) {
      errors.push({
        row: rowNumber,
        field: "question",
        message: `Question exceeds ${MAX_QUESTION_LENGTH} characters`,
      });
      rowValid = false;
    }

    if (!answer) {
      errors.push({ row: rowNumber, field: "answer", message: "Answer is required" });
      rowValid = false;
    } else if (answer.length > MAX_ANSWER_LENGTH) {
      errors.push({ row: rowNumber, field: "answer", message: `Answer exceeds ${MAX_ANSWER_LENGTH} characters` });
      rowValid = false;
    }

    const points = Number(pointsRaw);
    if (!pointsRaw || !Number.isInteger(points) || points <= 0) {
      errors.push({
        row: rowNumber,
        field: "points",
        message: `Points must be a positive integer (got "${pointsRaw}")`,
      });
      rowValid = false;
    }

    let difficulty: ClueDifficulty | undefined;
    if (difficultyRaw) {
      const normalized = difficultyRaw.toLowerCase();
      if (!VALID_DIFFICULTIES.has(normalized)) {
        errors.push({
          row: rowNumber,
          field: "difficulty",
          message: `Difficulty must be one of: ${[...VALID_DIFFICULTIES].join(", ")}`,
        });
        rowValid = false;
      } else {
        const cased = normalized[0].toUpperCase() + normalized.slice(1);
        difficulty = cased as ClueDifficulty;
      }
    }

    if (rowValid) {
      rows.push({ row: rowNumber, huntId, question, answer, points, difficulty });
    }
  }

  return { rows, errors, ok: errors.length === 0 && rows.length > 0 };
}
