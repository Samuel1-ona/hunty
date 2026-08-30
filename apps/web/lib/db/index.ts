/**
 * PostgreSQL client singleton.
 *
 * Uses the `postgres` package (https://github.com/porsager/postgres) which
 * automatically pools connections and is safe to import in Next.js serverless
 * functions — the pool is reused across warm invocations within the same
 * instance.
 *
 * The connection string is read from the DATABASE_URL environment variable.
 * If the variable is not set, a descriptive error is thrown at call time so
 * that misconfiguration surfaces early rather than appearing as a mysterious
 * runtime failure.
 */

import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

function getDb(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'Please configure it with your PostgreSQL connection string.'
    );
  }

  _sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    // Ensure the pool is not kept open between serverless invocations by
    // relying on the idle_timeout above rather than a persistent keep-alive.
    onnotice: () => {
      /* suppress */
    },
  });

  return _sql;
}

export { getDb };
