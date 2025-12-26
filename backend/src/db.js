/**
 * Database Connection - PostgreSQL Only (Async/Await)
 * Refactored from synchronous deasync pattern to proper async/await
 *
 * Configuration:
 * - DATABASE_URL: PostgreSQL RDS connection string (required)
 * - Supports AWS RDS with SSL and connection pooling
 */

const { Pool } = require('pg');

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Example: postgresql://user:password@localhost:5432/engageninja'
  );
}

console.log('[DB] Using PostgreSQL with async/await');

// Create connection pool with AWS RDS optimizations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000, // Idle timeout
  connectionTimeoutMillis: 5000, // Connection timeout
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
  // Keep-alive for long-lived connections
  keepAlives: true,
  keepAliveInitialDelayMillis: 30000,
  // Application name for monitoring
  application_name: 'engageninja-backend'
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[DB Pool Error]', err);
});

// Convert placeholder format from SQLite (?) to PostgreSQL ($1, $2, ...)
const convertPlaceholders = (sql) => {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
};

// Database wrapper with async/await API
const db = {
  __type: 'postgres',
  __pool: pool,

  /**
   * Prepare and execute query
   * Usage: await db.prepare(sql).run(params)
   */
  prepare: (sql) => {
    return {
      /**
       * Execute query and return changes/lastID
       * Returns: { changes: number, lastID: any }
       */
      run: async (...params) => {
        const convertedSql = convertPlaceholders(sql);
        const result = await pool.query(convertedSql, params);
        return {
          changes: result.rowCount || 0,
          lastID: result.rows?.[0]?.id || null
        };
      },

      /**
       * Fetch single row
       * Returns: row object or null
       */
      get: async (...params) => {
        const convertedSql = convertPlaceholders(sql);
        const result = await pool.query(convertedSql, params);
        return result.rows[0] || null;
      },

      /**
       * Fetch all rows
       * Returns: array of rows
       */
      all: async (...params) => {
        const convertedSql = convertPlaceholders(sql);
        const result = await pool.query(convertedSql, params);
        return result.rows || [];
      }
    };
  },

  /**
   * Execute raw SQL (multiple statements)
   * Handles PostgreSQL DO $$ blocks properly
   */
  exec: async (sql) => {
    // Smart statement splitter that respects DO $$ blocks
    const statements = [];
    let current = '';
    let inDoBlock = false;
    let i = 0;

    while (i < sql.length) {
      const char = sql[i];

      // Check for DO $$ block start
      if (!inDoBlock && sql.substring(i, i + 5).toUpperCase() === 'DO $$') {
        inDoBlock = true;
        current += sql.substring(i, i + 5);
        i += 5;
      }
      // Check for DO $$ block end
      else if (inDoBlock && sql.substring(i, i + 4) === 'END $$') {
        current += sql.substring(i, i + 6); // Include the trailing semicolon
        i += 7; // Skip 'END $$;'
        inDoBlock = false;
        statements.push(current.trim());
        current = '';
      }
      // Regular statement terminator (semicolon, outside DO block)
      else if (!inDoBlock && char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
        i++;
      }
      // Regular character
      else {
        current += char;
        i++;
      }
    }

    // Add any remaining statement
    if (current.trim()) {
      statements.push(current.trim());
    }

    // Execute each statement sequentially
    for (let statement of statements) {
      // Remove SQL comments for analysis
      const cleanedStatement = statement
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .trim();

      // Skip empty statements (were only comments)
      if (!cleanedStatement) {
        continue;
      }

      // Skip PRAGMA statements (SQLite-only; PostgreSQL doesn't support them)
      if (/^\s*PRAGMA\s/i.test(cleanedStatement)) {
        continue;
      }

      await pool.query(cleanedStatement);
    }
  },

  /**
   * Execute query with transaction support
   * Usage: await db.transaction(async (client) => { ... })
   * Automatically commits on success, rolls back on error
   */
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create a transaction-scoped query wrapper that uses the transaction client
      const transactionDb = {
        prepare: (sql) => {
          return {
            run: async (...params) => {
              const convertedSql = convertPlaceholders(sql);
              const result = await client.query(convertedSql, params);
              return {
                changes: result.rowCount || 0,
                lastID: result.rows?.[0]?.id || null
              };
            },
            get: async (...params) => {
              const convertedSql = convertPlaceholders(sql);
              const result = await client.query(convertedSql, params);
              return result.rows[0] || null;
            },
            all: async (...params) => {
              const convertedSql = convertPlaceholders(sql);
              const result = await client.query(convertedSql, params);
              return result.rows || [];
            }
          };
        }
      };

      // Execute callback within transaction
      const result = await callback(transactionDb);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Close connection pool
   */
  close: async () => {
    return await pool.end();
  },

  /**
   * Health check - verify database connectivity
   */
  healthCheck: async () => {
    const result = await pool.query('SELECT NOW()');
    return result.rows[0];
  }
};

module.exports = db;
