import { createRequire } from 'node:module';

import type { Client, InArgs, Row } from '@libsql/client';

import type { DatabaseBinding, DatabaseResult, PreparedQuery } from './sqlite-adapter';

// Usa o cliente "web" do libSQL: 100% JavaScript, sem binário nativo — ideal para
// serverless (Vercel). Só fala com o Turso remoto (o que é exatamente nosso caso
// em produção). É carregado de forma preguiçosa (só quando o Turso é usado), para
// que importar este módulo seja seguro mesmo antes de instalar a dependência.
const nodeRequire = createRequire(import.meta.url);
function loadCreateClient(): typeof import('@libsql/client/web').createClient {
  return (nodeRequire('@libsql/client/web') as typeof import('@libsql/client/web')).createClient;
}

// Adaptador para libSQL / Turso.
//
// Implementa exatamente a mesma interface `DatabaseBinding` usada pelo
// adaptador local de SQLite, para que o restante do código (db/company-repository.ts)
// funcione sem qualquer alteração. A escolha entre este adaptador e o
// better-sqlite3 local é feita em db/index.ts, com base nas variáveis de ambiente.

function normalizeArgs(values: unknown[]): InArgs {
  // libSQL não aceita `undefined`; converte para NULL, igual ao adaptador local.
  return values.map((value) => (value === undefined ? null : value)) as InArgs;
}

function rowToObject<T>(row: Row, columns: string[]): T {
  const object: Record<string, unknown> = {};
  for (let index = 0; index < columns.length; index += 1) {
    object[columns[index]] = row[index];
  }
  return object as T;
}

class LibsqlPreparedQuery implements PreparedQuery {
  constructor(
    private readonly client: Client,
    readonly sql: string,
    readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): PreparedQuery {
    return new LibsqlPreparedQuery(this.client, this.sql, values);
  }

  args(): InArgs {
    return normalizeArgs(this.values);
  }

  async run<T = unknown>(): Promise<DatabaseResult<T>> {
    const result = await this.client.execute({ sql: this.sql, args: this.args() });
    const hasRows = result.rows.length > 0;
    return {
      success: true,
      results: hasRows
        ? result.rows.map((row) => rowToObject<T>(row, result.columns))
        : undefined,
      meta: {
        changes: Number(result.rowsAffected),
        lastRowId: result.lastInsertRowid,
      },
    };
  }

  async first<T = unknown>(): Promise<T | null> {
    const result = await this.client.execute({ sql: this.sql, args: this.args() });
    const [row] = result.rows;
    return row ? rowToObject<T>(row, result.columns) : null;
  }

  async all<T = unknown>(): Promise<DatabaseResult<T>> {
    const result = await this.client.execute({ sql: this.sql, args: this.args() });
    return {
      results: result.rows.map((row) => rowToObject<T>(row, result.columns)),
      success: true,
    };
  }
}

class LibsqlDatabaseBinding implements DatabaseBinding {
  constructor(private readonly client: Client) {}

  prepare(sql: string): PreparedQuery {
    return new LibsqlPreparedQuery(this.client, sql);
  }

  async batch(statements: PreparedQuery[]): Promise<DatabaseResult[]> {
    const prepared = statements.map((statement) => {
      if (!(statement instanceof LibsqlPreparedQuery)) {
        throw new Error('Invalid libSQL statement.');
      }
      return { sql: statement.sql, args: statement.args() };
    });

    const results = await this.client.batch(prepared, 'write');
    return results.map((result) => {
      const hasRows = result.rows.length > 0;
      return {
        success: true,
        results: hasRows
          ? result.rows.map((row) => rowToObject(row, result.columns))
          : undefined,
        meta: {
          changes: Number(result.rowsAffected),
          lastRowId: result.lastInsertRowid,
        },
      };
    });
  }
}

function createLibsqlClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL não definida. Configure a URL do banco Turso para usar o adaptador libSQL.',
    );
  }
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const createClient = loadCreateClient();
  return createClient({ url, authToken });
}

const globalDatabase = globalThis as typeof globalThis & {
  __spaceLightLibsql?: DatabaseBinding;
};

export function getLibsqlDatabase(): DatabaseBinding {
  if (!globalDatabase.__spaceLightLibsql) {
    globalDatabase.__spaceLightLibsql = new LibsqlDatabaseBinding(createLibsqlClient());
  }
  return globalDatabase.__spaceLightLibsql;
}
