import { getLibsqlDatabase } from './libsql-adapter';
import { getSqliteDatabase, type DatabaseBinding } from './sqlite-adapter';

// Seleção do motor de banco de dados.
//
// - Produção (Vercel): defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN) para usar
//   o Turso/libSQL, compatível com ambiente serverless.
// - Desenvolvimento local: sem TURSO_DATABASE_URL, usa um arquivo SQLite local
//   via better-sqlite3 (nenhuma configuração extra necessária).
//
// Os dois adaptadores só carregam sua dependência pesada (o @libsql/client ou o
// better-sqlite3) quando efetivamente usados, então importar ambos aqui é seguro.
export function getD1(): DatabaseBinding {
  if (process.env.TURSO_DATABASE_URL?.trim()) {
    return getLibsqlDatabase();
  }
  return getSqliteDatabase();
}

export function getAuthEnvironment() {
  return {
    sessionSecret: process.env.AUTH_SESSION_SECRET ?? '',
    initialAdminEmail: (process.env.SPACE_ADMIN_EMAIL ?? '').trim().toLowerCase(),
    initialAdminPasswordHash: process.env.SPACE_ADMIN_PASSWORD_HASH ?? '',
    initialAdminPasswordSalt: process.env.SPACE_ADMIN_PASSWORD_SALT ?? '',
  };
}
