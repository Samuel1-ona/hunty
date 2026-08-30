// Tests for bulk clue CSV import (#1194).

import { parseCluesCsv } from '../clueCsvImport';

const HEADER = 'question,answer,points,difficulty\n';

describe('parseCluesCsv (#1194)', () => {
  test('parses valid rows', () => {
    const csv = `${HEADER}What has keys but no locks?,A piano,10,Medium\nWhere is the clock?,By the door,5,Easy`;
    const r = parseCluesCsv(csv, 1);
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      row: 1,
      huntId: 1,
      question: 'What has keys but no locks?',
      answer: 'A piano',
      points: 10,
      difficulty: 'Medium',
    });
  });

  test('flags missing question with offending row number', () => {
    const csv = `${HEADER},some answer,10\n"Q2","A2",5`;
    const r = parseCluesCsv(csv, 1);
    expect(r.ok).toBe(false);
    expect(r.errors).toContainEqual({
      row: 1,
      field: 'question',
      message: 'Question is required',
    });
    // Row 2 is still valid and parsed
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].row).toBe(2);
  });

  test('flags non-positive points', () => {
    const csv = `${HEADER}Q,A,0`;
    const r = parseCluesCsv(csv, 1);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === 'points')).toBe(true);
  });

  test('rejects invalid difficulty values', () => {
    const csv = `${HEADER}Q,A,10,impossible`;
    const r = parseCluesCsv(csv, 1);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === 'difficulty')).toBe(true);
  });

  test('reports missing required column in header', () => {
    const csv = 'question,answer\nQ,A';
    const r = parseCluesCsv(csv, 1);
    expect(r.ok).toBe(false);
    expect(r.errors[0].field).toBe('header');
    expect(r.errors[0].message).toContain('points');
  });

  test('handles empty file', () => {
    const r = parseCluesCsv('', 1);
    expect(r.ok).toBe(false);
  });
});
