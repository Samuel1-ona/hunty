/**
 * Vitest stub for next-auth/jwt.
 *
 * next-auth is a runtime dependency that requires a properly configured
 * NextAuth setup (NEXTAUTH_SECRET, etc.).  In the test environment the
 * package may not be installed, so Vite's import-analysis fails when any
 * route module transitively imports this package.
 *
 * This file is wired as an alias in vitest.config.ts so Vite resolves the
 * import to this stub instead of the real (absent) package.  Route tests
 * that need to exercise the auth logic mock `@/lib/api/adminAuth` directly
 * and never call getToken, so this stub only needs to exist to satisfy the
 * module graph during static analysis.
 */

export async function getToken(_options: unknown): Promise<null> {
  return null;
}
