/**
 * Minimal CSV parser for clue imports.
 *
 * Supports:
 * - Comma-separated values
 * - Optional header row
 * - Quoted fields containing commas, newlines, or escaped quotes
 */

export interface CsvRow {
  question: string
  answer: string
  points: number
  hint?: string
  hintCost?: number
  difficulty?: string
}

export interface CsvParseResult {
  rows: CsvRow[]
  errors: { row: number; message: string }[]
}

export function parseClueCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { rows: [], errors: [] }
  }

  const firstLine = lines[0]
  const hasHeader = /question\s*[,|]|answer\s*[,|]|points\s*[,|]/i.test(firstLine)
  const startIndex = hasHeader ? 1 : 0
  const rows: CsvRow[] = []
  const errors: { row: number; message: string }[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const rowNumber = i + 1
    const fields = splitCsvLine(lines[i])
    if (fields.length < 2) {
      errors.push({ row: rowNumber, message: "Row must have at least question and answer" })
      continue
    }

    const [rawQuestion, rawAnswer, rawPoints, rawHint, rawHintCost, rawDifficulty] = fields

    if (!rawQuestion.trim()) {
      errors.push({ row: rowNumber, message: "Question is required" })
    }
    if (!rawAnswer.trim()) {
      errors.push({ row: rowNumber, message: "Answer is required" })
    }

    const points = rawPoints ? parseInt(rawPoints, 10) : NaN
    if (!rawPoints.trim() || Number.isNaN(points) || points < 1) {
      errors.push({ row: rowNumber, message: "Points must be a positive integer" })
    }

    const hintCost = rawHintCost ? parseInt(rawHintCost, 10) : undefined
    if (rawHintCost && (!Number.isInteger(hintCost) || hintCost < 0)) {
      errors.push({ row: rowNumber, message: "Hint cost must be a non-negative integer" })
    }

    const difficulty = rawDifficulty?.trim()
    if (difficulty && !["Easy", "Medium", "Hard"].includes(difficulty)) {
      errors.push({ row: rowNumber, message: "Difficulty must be Easy, Medium, or Hard" })
    }

    rows.push({
      question: rawQuestion.trim(),
      answer: rawAnswer.trim(),
      points: Number.isNaN(points) ? 10 : points,
      hint: rawHint?.trim() || undefined,
      hintCost: Number.isNaN(hintCost!) ? 0 : (hintCost ?? 0),
      difficulty: difficulty as CsvRow["difficulty"],
    })
  }

  return { rows, errors }
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}
