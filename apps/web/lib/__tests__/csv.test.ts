import { describe, expect, it } from 'vitest';

import { parseClueCsv } from '@/lib/csv';

describe('parseClueCsv', () => {
  it('parses a simple CSV without header', () => {
    const result = parseClueCsv('What is 2+2?,4,10');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      question: 'What is 2+2?',
      answer: '4',
      points: 10,
    });
    expect(result.errors).toHaveLength(0);
  });

  it('parses a CSV with header', () => {
    const result = parseClueCsv('question,answer,points\nCapital of France?,Paris,20');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      question: 'Capital of France?',
      answer: 'Paris',
      points: 20,
    });
  });

  it('parses all columns including optional ones', () => {
    const result = parseClueCsv('Q?,A,15,Look up,Easy');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      question: 'Q?',
      answer: 'A',
      points: 15,
      hint: 'Look up',
      hintCost: 0,
      difficulty: 'Easy',
    });
  });

  it('handles quoted fields with commas', () => {
    const result = parseClueCsv('"What is the capital of France?","Paris, France",10');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].question).toBe('What is the capital of France?');
    expect(result.rows[0].answer).toBe('Paris, France');
  });

  it('collects errors per row', () => {
    const result = parseClueCsv(',,-1');
    expect(result.rows).toHaveLength(1);
    expect(result.errors.map((e) => e.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Question is required'),
        expect.stringContaining('Answer is required'),
        expect.stringContaining('Points must be a positive integer'),
      ])
    );
  });

  it('defaults points to 10 when missing and not invalid', () => {
    const result = parseClueCsv('Question,Answer');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].points).toBe(10);
  });

  it('skips empty lines', () => {
    const result = parseClueCsv('Q,A,5\n\nQ2,A2,10');
    expect(result.rows).toHaveLength(2);
  });
});
