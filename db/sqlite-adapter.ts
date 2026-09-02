import type Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Carrega o better-sqlite3 de forma preguiçosa (só quando um banco local é aberto).
// Assim, importar este módulo não puxa o binário nativo — importante em ambientes
// serverless (Vercel), onde usamos o Turso/libSQL e o better-sqlite3 nunca é aberto.
const nodeRequire = createRequire(import.meta.url);
type DatabaseConstructor = new (
  filename: string,
  options?: Database.Options,
) => Database.Database;
function loadBetterSqlite(): DatabaseConstructor {
  return nodeRequire('better-sqlite3') as DatabaseConstructor;
}

export type DatabaseResult<T = unknown> = {
  results?: T[];
  success: boolean;
  meta?: {
    changes?: number;
    lastRowId?: number | bigint;
  };
};

export interface PreparedQuery {
  bind(...values: unknown[]): PreparedQuery;
  run<T = unknown>(): Promise<DatabaseResult<T>>;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<DatabaseResult<T>>;
}

export interface DatabaseBinding {
  prepare(sql: string): PreparedQuery;
  batch(statements: PreparedQuery[]): Promise<DatabaseResult[]>;
}

function normalizeValues(values: unknown[]) {
  return values.map((value) => (value === undefined ? null : value));
}

class SqlitePreparedQuery implements PreparedQuery {
  constructor(
    private readonly database: Database.Database,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): PreparedQuery {
    return new SqlitePreparedQuery(this.database, this.sql, normalizeValues(values));
  }

  async run<T = unknown>(): Promise<DatabaseResult<T>> {
    return this.execute<T>();
  }

  async first<T = unknown>(): Promise<T | null> {
    const statement = this.database.prepare(this.sql);
    return (statement.get(...this.values) as T | undefined) ?? null;
  }

  async all<T = unknown>(): Promise<DatabaseResult<T>> {
    const statement = this.database.prepare(this.sql);
    return {
      results: statement.all(...this.values) as T[],
      success: true,
    };
  }

  execute<T = unknown>(): DatabaseResult<T> {
    const statement = this.database.prepare(this.sql);
    if (statement.reader) {
      return {
        results: statement.all(...this.values) as T[],
        success: true,
      };
    }
    const result = statement.run(...this.values);
    return {
      success: true,
      meta: {
        changes: result.changes,
        lastRowId: result.lastInsertRowid,
      },
    };
  }
}

function databasePath() {
  const configured = process.env.DATABASE_PATH?.trim();
  return path.resolve(configured || path.join(process.cwd(), 'data', 'space-light.sqlite'));
}

function openDatabase() {
  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const BetterSqlite = loadBetterSqlite();
  const database = new BetterSqlite(file);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  return database;
}

class SqliteDatabaseBinding implements DatabaseBinding {
  constructor(private readonly database: Database.Database) {}

  prepare(sql: string): PreparedQuery {
    return new SqlitePreparedQuery(this.database, sql);
  }

  async batch(statements: PreparedQuery[]): Promise<DatabaseResult[]> {
    const transaction = this.database.transaction(() =>
      statements.map((statement) => {
        if (!(statement instanceof SqlitePreparedQuery)) {
          throw new Error('Invalid SQLite statement.');
        }
        return statement.execute();
      }),
    );
    return transaction();
  }
}

const globalDatabase = globalThis as typeof globalThis & {
  __spaceLightDatabase?: DatabaseBinding;
};

export function getSqliteDatabase(): DatabaseBinding {
  if (!globalDatabase.__spaceLightDatabase) {
    globalDatabase.__spaceLightDatabase = new SqliteDatabaseBinding(openDatabase());
  }
  return globalDatabase.__spaceLightDatabase;
}
