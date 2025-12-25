/**
 * Database Connection
 * Supports both SQLite (better-sqlite3) and PostgreSQL (pg)
 *
 * Configuration:
 * - If DATABASE_URL is set: Use PostgreSQL (AWS RDS)
 * - If DATABASE_PATH is set: Use SQLite (local file)
 * - Default: SQLite at backend/database.sqlite
 */

const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const deasync = require('deasync');

// Detect which database to use
const USE_POSTGRES = !!process.env.DATABASE_URL;
const envDbPath = process.env.DATABASE_PATH;
const DATABASE_PATH = envDbPath
  ? path.resolve(path.join(__dirname, '..'), envDbPath)
  : path.join(__dirname, '../database.sqlite');

let db;

if (USE_POSTGRES) {
  // ============================================================================
  // PostgreSQL Connection
  // ============================================================================

  console.log('[DB] Using PostgreSQL RDS');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: {
      rejectUnauthorized: false // Allow AWS RDS self-signed certificates
    }
  });

  // Helper to convert PostgreSQL results to SQLite-compatible format
  const convertResult = (pgResult) => ({
    changes: pgResult.rowCount || 0,
    lastID: pgResult.rows?.[0]?.id || null
  });

  // Create PostgreSQL adapter with sync-like interface using deasync
  db = {
    // Type indicator for conditional logic
    __type: 'postgres',
    __pool: pool,

    /**
     * Prepare and execute query (returns result object)
     * Usage: db.prepare(sql).run(params)
     */
    prepare: (sql) => {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      const convertPlaceholders = (sqlStr) => {
        let paramIndex = 1;
        const converted = sqlStr.replace(/\?/g, () => `$${paramIndex++}`);
        return converted;
      };

      return {
        run: (...params) => {
          let result = null;
          let error = null;
          let done = false;

          const convertedSql = convertPlaceholders(sql);
          const timeout = setTimeout(() => {
            if (!done) {
              done = true;
              error = new Error(`Query timeout: ${sql.substring(0, 80)}`);
            }
          }, 30000); // 30 second timeout

          pool.query(convertedSql, params).then(
            res => {
              clearTimeout(timeout);
              if (!done) {
                done = true;
                result = convertResult(res);
              }
            },
            err => {
              clearTimeout(timeout);
              if (!done) {
                done = true;
                error = err;
              }
            }
          ).catch(err => {
            clearTimeout(timeout);
            if (!done) {
              done = true;
              error = err;
            }
          });

          // Use deasync to wait for async operation synchronously
          deasync.loopWhile(() => !done);

          if (error) throw error;
          return result;
        },

        get: (...params) => {
          let result = null;
          let error = null;
          let done = false;

          const convertedSql = convertPlaceholders(sql);
          const timeout = setTimeout(() => {
            if (!done) {
              done = true;
              error = new Error(`Query timeout: ${sql.substring(0, 80)}`);
            }
          }, 30000); // 30 second timeout

          pool.query(convertedSql, params).then(
            res => {
              clearTimeout(timeout);
              if (!done) {
                done = true;
                result = res.rows[0] || null;
              }
            },
            err => {
              clearTimeout(timeout);
              if (!done) {
                done = true;
                error = err;
              }
            }
          ).catch(err => {
            clearTimeout(timeout);
            if (!done) {
              done = true;
              error = err;
            }
          });

          deasync.loopWhile(() => !done);

          if (error) throw error;
          return result;
        },

        all: (...params) => {
          // Handle PRAGMA statements (SQLite compatibility)
          if (/^\s*PRAGMA\s/i.test(sql)) {
            const match = sql.match(/table_info\((\w+)\)/i);
            if (match) {
              // Delegate to pragma() function
              const pragmaResult = db.pragma(sql);
              return pragmaResult || [];
            }
            // For other pragmas, return empty
            return [];
          }

          let result = null;
          let error = null;
          let done = false;

          const convertedSql = convertPlaceholders(sql);
          const timeout = setTimeout(() => {
            if (!done) {
              done = true;
              error = new Error(`Query timeout: ${sql.substring(0, 80)}`);
            }
          }, 30000); // 30 second timeout

          pool.query(convertedSql, params).then(
            res => {
              clearTimeout(timeout);
              if (!done) {
                done = true;
                result = res.rows;
              }
            },
            err => {
              clearTimeout(timeout);
              if (!done) {
                done = true;
                error = err;
              }
            }
          ).catch(err => {
            clearTimeout(timeout);
            if (!done) {
              done = true;
              error = err;
            }
          });

          deasync.loopWhile(() => !done);

          if (error) throw error;
          return result || [];
        }
      };
    },

    /**
     * Execute multiple statements
     * Properly handles PostgreSQL DO $$ ... END $$; blocks
     */
    exec: (sql) => {
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

      for (let statement of statements) {
        // Remove SQL comments (-- single-line and /* */ multi-line) for analysis
        // But keep original for execution
        const cleanedStatement = statement
          .replace(/--.*$/gm, '')  // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
          .trim();

        // Skip empty statements (were only comments)
        if (!cleanedStatement) {
          continue;
        }

        // Skip PRAGMA statements (SQLite-only; PostgreSQL doesn't support them)
        if (/^\s*PRAGMA\s/i.test(cleanedStatement)) {
          continue;
        }
        let done = false;
        let error = null;

        pool.query(cleanedStatement).then(
          () => { done = true; },
          err => { error = err; done = true; }
        );

        deasync.loopWhile(() => !done);

        if (error) throw error;
      }
    },

    /**
     * Close connection (async, but wait for it)
     */
    close: async () => {
      return await pool.end();
    },

    /**
     * pragma - compatibility with SQLite (maps to PostgreSQL queries)
     */
    pragma: (statement) => {
      // Map SQLite PRAGMA statements to PostgreSQL equivalents
      const match = statement.match(/table_info\((\w+)\)/i);
      if (match) {
        const tableName = match[1];
        // Query PostgreSQL information_schema for column info
        let result = null;
        let error = null;

        pool.query(`
          SELECT
            ordinal_position as cid,
            column_name as name,
            data_type as type,
            is_nullable = 'NO' as notnull,
            column_default as dflt_value,
            0 as pk
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]).then(
          res => { result = res.rows; },
          err => { error = err; }
        );

        deasync.loopWhile(() => result === null && error === null);
        if (error) throw error;
        return result || [];
      }
      // For other pragmas, return empty
      return [];
    }
  };

} else {
  // ============================================================================
  // SQLite Connection
  // ============================================================================

  console.log('[DB] Using SQLite at', DATABASE_PATH);

  db = new Database(DATABASE_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  db.__type = 'sqlite';
}

module.exports = db;
