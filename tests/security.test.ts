import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('SECURITY.md', () => {
  const filePath = join(process.cwd(), 'SECURITY.md');

  it('should exist in the root directory', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('should contain the required sections', async () => {
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('## Reporting a Vulnerability');
    expect(content).toContain('## Supported Versions');
    expect(content).toContain('## Scope');
    expect(content).toContain('## Expected Response Time');
  });
});
