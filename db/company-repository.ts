import { getD1 } from '@/db';
import { itensDoTexto, type ChecklistDaNorma, type MarcaDoChecklist } from '@/lib/checklist';
import type { TipoDeFoto } from '@/lib/fotos';
import { formatarCpf, formatarRg, problemaCpf, problemaRg } from '@/lib/documentos';
import { INSTRUCTOR_DOCUMENT_CATEGORIES } from '@/lib/instructor-documents';
import { clientePedeLogin } from '@/lib/login-do-participante';
import { nomeCertificadoAluno, PREFIXO_CERTIFICADO_ALUNO } from '@/lib/nome-certificado';
import { codigoDaTurma, normalizarSigla, SIGLA_REGRA, siglaValida, sugerirSigla } from '@/lib/sigla';
import { normalizarUsuario, USUARIO_REGRA, usuarioValido } from '@/lib/usuario';
import type { DatabaseBinding, DatabaseResult } from '@/db/sqlite-adapter';
import type {
  ClientCertificate,
  ClientDocument,
  ClientParticipant,
  ClientPhoto,
  ClientPortalData,
  ClientTraining,
  ClientTrainingRequest,
} from '@/lib/client-portal-data';
import type {
  AttendanceListData,
  AuditEntry,
  CheckinResult,
  CompanyClient,
  CompanyDashboardData,
  CompanyEmployee,
  CompanyFile,
  CompanyInstructor,
  CompanyInstructorAvailability,
  CompanyInstructorDocument,
  CompanyParticipant,
  CompanySiteLead,
  CompanyClientDocument,
  CompanyDocumentRequest,
  CompanyProgramTemplate,
  CompanyTraining,
  CompanyTrainingRequest,
} from '@/lib/company-types';
import type { Proposta } from '@/lib/site-novo/proposta';
import type {
  InstructorAvailability,
  InstructorDashboardData,
} from '@/lib/instructor-types';

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client' | 'instructor';
  client_id: string | null;
  instructor_id: string | null;
  password_hash: string;
  password_salt: string;
  active: number;
  must_reset: number;
  is_owner: number;
  /** Login da empresa (role client). Instrutor e equipe entram por e-mail. */
  username: string | null;
};

let schemaPromise: Promise<void> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function rows<T>(result: DatabaseResult<T>): T[] {
  return result.results ?? [];
}

/**
 * Versão do schema abaixo. AUMENTE ESTE NÚMERO ao acrescentar qualquer tabela,
 * índice ou coluna nova — o banco que já estiver nesta versão pula a migração
 * inteira, então sem o incremento a mudança não chega a quem já tem dados.
 *
 * Existe porque a migração custa uma ida ao banco por verificação de coluna, e
 * em produção (Turso, pela rede) isso somava ~15 idas em sequência a cada
 * arranque frio da função, antes de qualquer trabalho útil.
 *
 * ATENÇÃO: a produção está na versão 7, gravada pelo portal novo que ficou
 * pouco tempo no ar — à frente deste número. Subir daqui não faz a migração
 * rodar lá, e passar de 7 faria ela rodar inteira e tentar recriar
 * `idx_users_email` e `idx_clients_contact_email` como UNIQUE, que aquele
 * portal derrubou de propósito porque o e-mail repete entre clientes.
 * Coluna nova vai por COLUNAS_POR_MARCADOR, não por este número.
 */
const SCHEMA_VERSION = 6;

/** Data no formato do banco e do <input type="date">. */
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Colunas criadas depois da versão 1 do schema.
 *
 * O endereço da edificação foi adicionado por ensureColumn e se perdeu quando a
 * migração virou marcador de versão: as colunas saíram do ALTER mas não entraram
 * no CREATE TABLE, então o atestado ficou sem endereço para imprimir. Estão nos
 * dois lugares agora — aqui, para quem já tem dados, e no CREATE TABLE acima,
 * para banco novo.
 */
const ALTERACOES_APOS_V1 = [
  "ALTER TABLE clients ADD COLUMN address TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clients ADD COLUMN district TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clients ADD COLUMN city TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clients ADD COLUMN state TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clients ADD COLUMN postal_code TEXT NOT NULL DEFAULT ''",
];

/** Lê os marcadores de controle criando a tabela deles na mesma ida. */
async function lerMarcadores(d1: DatabaseBinding) {
  const [, gravados] = await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`),
    d1.prepare('SELECT key, value FROM schema_meta'),
  ]);
  const mapa = new Map<string, string>();
  for (const linha of rows<{ key: string; value: string }>(gravados as DatabaseResult<{ key: string; value: string }>)) {
    mapa.set(linha.key, linha.value);
  }
  return mapa;
}

/**
 * Colunas que entram por marcador próprio, e não pelo número da versão.
 *
 * O número da versão não serve para isto: a produção está numa versão à frente
 * (ver o comentário de SCHEMA_VERSION), então subir o número não faz a migração
 * rodar lá — e forçá-la a rodar reexecutaria índices antigos que hoje não valem
 * mais. Cada coluna tem então o seu próprio marcador, e como os marcadores já
 * vêm lidos de `schema_meta`, quem já migrou não paga nenhuma ida extra.
 */
const COLUNAS_POR_MARCADOR = [
  // Tema da turma: o assunto que o instrutor precisa saber para se preparar.
  {
    marcador: 'col_trainings_theme',
    tabela: 'trainings',
    coluna: 'theme',
    alter: "ALTER TABLE trainings ADD COLUMN theme TEXT NOT NULL DEFAULT ''",
  },
  // Validade do certificado em meses (0 = não informada). Só aparece no
  // portal — o PDF do certificado não muda — e alimenta as reciclagens.
  {
    marcador: 'col_trainings_validity_months',
    tabela: 'trainings',
    coluna: 'validity_months',
    alter: 'ALTER TABLE trainings ADD COLUMN validity_months INTEGER NOT NULL DEFAULT 0',
  },
  // Cargo do funcionário da Space, mostrado no pé do menu da gestão.
  {
    marcador: 'col_users_job_title',
    tabela: 'users',
    coluna: 'job_title',
    alter: "ALTER TABLE users ADD COLUMN job_title TEXT NOT NULL DEFAULT ''",
  },
  // Sigla do cliente (PETZ-JAC): forma o código da turma, PETZ-JAC-03.
  {
    marcador: 'col_clients_short_code',
    tabela: 'clients',
    coluna: 'short_code',
    alter: "ALTER TABLE clients ADD COLUMN short_code TEXT NOT NULL DEFAULT ''",
  },
  // Tipo da turma: 'formacao' ou 'reciclagem' ('' = não informado). Só no portal.
  {
    marcador: 'col_trainings_kind',
    tabela: 'trainings',
    coluna: 'kind',
    alter: "ALTER TABLE trainings ADD COLUMN kind TEXT NOT NULL DEFAULT ''",
  },
  // Foto de perfil do instrutor, do funcionário da Space e logo do cliente:
  // chave do arquivo em disco ('' = sem foto, o avatar mostra as iniciais).
  {
    marcador: 'col_instructors_photo_key',
    tabela: 'instructors',
    coluna: 'photo_key',
    alter: "ALTER TABLE instructors ADD COLUMN photo_key TEXT NOT NULL DEFAULT ''",
  },
  {
    marcador: 'col_users_photo_key',
    tabela: 'users',
    coluna: 'photo_key',
    alter: "ALTER TABLE users ADD COLUMN photo_key TEXT NOT NULL DEFAULT ''",
  },
  {
    marcador: 'col_clients_logo_key',
    tabela: 'clients',
    coluna: 'logo_key',
    alter: "ALTER TABLE clients ADD COLUMN logo_key TEXT NOT NULL DEFAULT ''",
  },
  // Login interno do participante, pedido só por cliente Amazon no QR.
  {
    marcador: 'col_participants_employee_login',
    tabela: 'participants',
    coluna: 'employee_login',
    alter: "ALTER TABLE participants ADD COLUMN employee_login TEXT NOT NULL DEFAULT ''",
  },
];

/**
 * Tabelas novas, pelo mesmo motivo das colunas acima: o CREATE TABLE do lote
 * principal só roda em banco abaixo da versão corrente, e a produção já está
 * nela. CREATE TABLE IF NOT EXISTS é idempotente, então pode rodar sempre.
 */
const TABELAS_POR_MARCADOR = [
  // Pedido de nova turma feito pelo cliente no portal ("Solicitar treinamento").
  {
    marcador: 'tab_training_requests',
    tabela: 'training_requests',
    criar: `CREATE TABLE IF NOT EXISTS training_requests (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      nr TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      participants INTEGER NOT NULL DEFAULT 0,
      preferred_period TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      based_on_training_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  // Conteúdo programático padrão por norma, salvo pela equipe na criação de turma.
  {
    marcador: 'tab_program_templates',
    tabela: 'program_templates',
    criar: `CREATE TABLE IF NOT EXISTS program_templates (
      nr TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  // Checklist operacional por norma: os itens, um por linha, definidos pela equipe.
  {
    marcador: 'tab_checklist_templates',
    tabela: 'checklist_templates',
    criar: `CREATE TABLE IF NOT EXISTS checklist_templates (
      nr TEXT PRIMARY KEY,
      items TEXT NOT NULL,
      updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  // Item do checklist marcado numa turma. Guarda o texto do item: se a equipe
  // muda a lista da norma depois, a marca de um item que saiu deixa de contar.
  {
    marcador: 'tab_training_checklist',
    tabela: 'training_checklist',
    criar: `CREATE TABLE IF NOT EXISTS training_checklist (
      training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      done_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      done_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (training_id, item)
    )`,
  },
  // Documento avulso do cliente (laudo etc.), enviado pela equipe fora de turma.
  {
    marcador: 'tab_client_documents',
    tabela: 'client_documents',
    criar: `CREATE TABLE IF NOT EXISTS client_documents (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      request_id TEXT,
      title TEXT NOT NULL,
      name TEXT NOT NULL,
      object_key TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  // Pedido de documento avulso feito pelo cliente no portal ("Solicitar documento").
  {
    marcador: 'tab_document_requests',
    tabela: 'document_requests',
    criar: `CREATE TABLE IF NOT EXISTS document_requests (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      document_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at TEXT
    )`,
  },
  // Pedido de proposta feito no site ("Solicitar proposta"), de quem ainda não
  // é cliente. Aparece nas Solicitações da equipe com a origem "Site".
  {
    marcador: 'tab_site_leads',
    tabela: 'site_leads',
    criar: `CREATE TABLE IF NOT EXISTS site_leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      document TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      company_size TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      trainings TEXT NOT NULL DEFAULT '',
      participants INTEGER NOT NULL DEFAULT 0,
      modality TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
];

async function tabelasPorMarcador(d1: DatabaseBinding, marcadores: Map<string, string>) {
  for (const { marcador, tabela, criar } of TABELAS_POR_MARCADOR) {
    if (marcadores.has(marcador)) continue;
    try {
      await d1.prepare(criar).run();
    } catch { /* confere abaixo */ }
    const existe = await d1
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .bind(tabela)
      .first<{ name: string }>();
    if (!existe) continue;
    await d1
      .prepare(`INSERT INTO schema_meta (key, value) VALUES (?, datetime('now'))
        ON CONFLICT(key) DO NOTHING`)
      .bind(marcador)
      .run();
    marcadores.set(marcador, 'ok');
  }
}

async function colunasPorMarcador(d1: DatabaseBinding, marcadores: Map<string, string>) {
  for (const { marcador, tabela, coluna, alter } of COLUNAS_POR_MARCADOR) {
    if (marcadores.has(marcador)) continue;
    // Uma por vez e fora de lote: "duplicate column" é esperado em banco novo,
    // que já nasce com a coluna no CREATE TABLE, e em lote derrubaria o resto.
    try {
      await d1.prepare(alter).run();
    } catch { /* coluna já existe */ }
    // O marcador só é gravado com a coluna confirmada. Engolir o erro do ALTER
    // sem conferir gravaria "já fiz" para uma coluna que não existe, e quem
    // fosse lê-la quebraria para sempre. Sem confirmação, tenta de novo depois.
    const info = await d1.prepare(`PRAGMA table_info(${tabela})`).all<{ name: string }>();
    if (!rows(info).some((item) => item.name === coluna)) continue;
    await d1
      .prepare(`INSERT INTO schema_meta (key, value) VALUES (?, datetime('now'))
        ON CONFLICT(key) DO NOTHING`)
      .bind(marcador)
      .run();
    marcadores.set(marcador, 'ok');
  }
}

export function ensurePortalSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  const d1 = getD1();
  schemaPromise = (async () => {
    const ownerEmailAtual = (process.env.SPACE_ADMIN_EMAIL ?? '').trim().toLowerCase();
    const marcadores = await lerMarcadores(d1);
    // Antes do atalho de versão: coluna por marcador precisa chegar também em
    // banco que já está na versão corrente, que é o caso da produção.
    await colunasPorMarcador(d1, marcadores);
    await tabelasPorMarcador(d1, marcadores);
    // Banco já na versão corrente e com o mesmo dono configurado: nada a fazer.
    if (
      Number(marcadores.get('version') ?? 0) >= SCHEMA_VERSION &&
      (marcadores.get('owner_email') ?? '') === ownerEmailAtual
    ) {
      return;
    }
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        legal_name TEXT NOT NULL,
        document TEXT NOT NULL,
        unit TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        district TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        state TEXT NOT NULL DEFAULT '',
        postal_code TEXT NOT NULL DEFAULT '',
        short_code TEXT NOT NULL DEFAULT '',
        logo_key TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'invited',
        source TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS instructors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        document TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        professional_registry TEXT NOT NULL DEFAULT '',
        specialties TEXT NOT NULL DEFAULT '',
        base_city TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        source TEXT NOT NULL DEFAULT 'self',
        photo_key TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS instructor_documents (
        id TEXT PRIMARY KEY,
        instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        object_key TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        instructor_id TEXT REFERENCES instructors(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client',
        is_owner INTEGER NOT NULL DEFAULT 0,
        username TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        must_reset INTEGER NOT NULL DEFAULT 0,
        job_title TEXT NOT NULL DEFAULT '',
        photo_key TEXT NOT NULL DEFAULT '',
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS trainings (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        instructor_id TEXT REFERENCES instructors(id) ON DELETE SET NULL,
        code TEXT NOT NULL,
        nr TEXT NOT NULL,
        title TEXT NOT NULL,
        training_date TEXT NOT NULL,
        training_dates TEXT NOT NULL DEFAULT '',
        internal_label TEXT NOT NULL DEFAULT '',
        theme TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT '',
        validity_months INTEGER NOT NULL DEFAULT 0,
        content_program TEXT NOT NULL DEFAULT '',
        duration TEXT NOT NULL,
        location TEXT NOT NULL,
        instructor TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        participant_limit INTEGER NOT NULL DEFAULT 0,
        qr_token TEXT NOT NULL,
        qr_enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      // Um registro por DIA do treinamento. Existe porque cada dia pode ter um
      // instrutor diferente, e o certificado sai com a assinatura do último.
      d1.prepare(`CREATE TABLE IF NOT EXISTS training_sessions (
        id TEXT PRIMARY KEY,
        training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        session_date TEXT NOT NULL,
        start_time TEXT NOT NULL DEFAULT '',
        end_time TEXT NOT NULL DEFAULT '',
        instructor_id TEXT REFERENCES instructors(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS instructor_availability (
        id TEXT PRIMARY KEY,
        instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
        available_date TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'available',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        object_key TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        kind TEXT NOT NULL,
        session_id TEXT,
        status TEXT NOT NULL DEFAULT 'registered',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        document_id TEXT NOT NULL,
        rg TEXT NOT NULL DEFAULT '',
        birth_date TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        job_title TEXT NOT NULL DEFAULT '',
        employee_login TEXT NOT NULL DEFAULT '',
        consent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      // Check-in do aluno em cada dia da turma, feito pelo QR. O certificado só
      // sai para quem tem uma linha aqui em TODOS os dias.
      d1.prepare(`CREATE TABLE IF NOT EXISTS session_attendance (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS certificate_batches (
        id TEXT PRIMARY KEY,
        training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        participant_count INTEGER NOT NULL DEFAULT 0,
        generated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL REFERENCES certificate_batches(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        verification_code TEXT NOT NULL,
        file_key TEXT,
        issued_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_document ON clients(document)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_contact_email ON clients(contact_email)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_clients_status_created ON clients(status, created_at)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_instructors_document ON instructors(document)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_instructors_email ON instructors(email)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_instructors_status_created ON instructors(status, created_at)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_documents_object_key ON instructor_documents(object_key)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_instructor_documents_instructor_category ON instructor_documents(instructor_id, category)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_users_client_role ON users(client_id, role)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_trainings_code ON trainings(code)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_trainings_qr_token ON trainings(qr_token)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_trainings_client_date ON trainings(client_id, training_date)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_training_sessions_day ON training_sessions(training_id, day_number)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_training_sessions_instructor_date ON training_sessions(instructor_id, session_date)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_files_object_key ON files(object_key)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_files_training_created ON files(training_id, created_at)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_files_client_kind ON files(client_id, kind)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_training_document ON participants(training_id, document_id)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_participants_training_created ON participants(training_id, created_at)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_session_attendance_day ON session_attendance(session_id, participant_id)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_session_attendance_participant ON session_attendance(participant_id)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_certificate_batches_training ON certificate_batches(training_id, created_at)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_batch_participant ON certificates(batch_id, participant_id)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at)',
      ),
    ]);

    // Colunas acrescentadas depois da criação original das tabelas.
    // Antes cada uma custava um PRAGMA próprio, em sequência, repetindo a mesma
    // tabela até cinco vezes; agora é uma leitura por tabela, em paralelo.
    const COLUNAS_EXTRAS: { tabela: string; coluna: string; alter: string }[] = [
      { tabela: 'users', coluna: 'instructor_id', alter: 'ALTER TABLE users ADD COLUMN instructor_id TEXT' },
      { tabela: 'users', coluna: 'is_owner', alter: 'ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0' },
      // Login da empresa. Guardado já normalizado (minúsculo), então o índice
      // único comum basta; conta sem nome (NULL) não conflita com outra.
      { tabela: 'users', coluna: 'username', alter: 'ALTER TABLE users ADD COLUMN username TEXT' },
      { tabela: 'trainings', coluna: 'instructor_id', alter: 'ALTER TABLE trainings ADD COLUMN instructor_id TEXT' },
      { tabela: 'trainings', coluna: 'training_dates', alter: "ALTER TABLE trainings ADD COLUMN training_dates TEXT NOT NULL DEFAULT ''" },
      // Nome interno da turma: serve para diferenciar duas turmas do mesmo
      // treinamento. NUNCA sai em documento — o certificado usa 'title'.
      { tabela: 'trainings', coluna: 'internal_label', alter: "ALTER TABLE trainings ADD COLUMN internal_label TEXT NOT NULL DEFAULT ''" },
      { tabela: 'trainings', coluna: 'content_program', alter: "ALTER TABLE trainings ADD COLUMN content_program TEXT NOT NULL DEFAULT ''" },
      // Tema da turma: o assunto que o instrutor precisa saber para se preparar.
      // Vai na mensagem de escala e não sai em documento nenhum.
      // trainings.theme não entra aqui: vai por COLUNAS_POR_MARCADOR, porque
      // esta lista só roda quando a migração roda, e na produção ela não roda.
      // Dia do treinamento a que o arquivo pertence (a foto da lista assinada).
      { tabela: 'files', coluna: 'session_id', alter: 'ALTER TABLE files ADD COLUMN session_id TEXT' },
      { tabela: 'participants', coluna: 'rg', alter: "ALTER TABLE participants ADD COLUMN rg TEXT NOT NULL DEFAULT ''" },
      { tabela: 'participants', coluna: 'birth_date', alter: "ALTER TABLE participants ADD COLUMN birth_date TEXT NOT NULL DEFAULT ''" },
      // Endereço da edificação: sai impresso no atestado de treinamento.
      { tabela: 'clients', coluna: 'address', alter: "ALTER TABLE clients ADD COLUMN address TEXT NOT NULL DEFAULT ''" },
      { tabela: 'clients', coluna: 'district', alter: "ALTER TABLE clients ADD COLUMN district TEXT NOT NULL DEFAULT ''" },
      { tabela: 'clients', coluna: 'city', alter: "ALTER TABLE clients ADD COLUMN city TEXT NOT NULL DEFAULT ''" },
      { tabela: 'clients', coluna: 'state', alter: "ALTER TABLE clients ADD COLUMN state TEXT NOT NULL DEFAULT ''" },
      { tabela: 'clients', coluna: 'postal_code', alter: "ALTER TABLE clients ADD COLUMN postal_code TEXT NOT NULL DEFAULT ''" },
    ];
    const tabelas = [...new Set(COLUNAS_EXTRAS.map((item) => item.tabela))];
    const existentes = new Map(
      await Promise.all(
        tabelas.map(async (tabela) => {
          const info = await d1.prepare(`PRAGMA table_info(${tabela})`).all<{ name: string }>();
          return [tabela, new Set(rows(info).map((coluna) => coluna.name))] as const;
        }),
      ),
    );
    const faltando = COLUNAS_EXTRAS.filter(
      (item) => !existentes.get(item.tabela)?.has(item.coluna),
    );
    // ALTER TABLE não aceita "IF NOT EXISTS", por isso a checagem acima.
    if (faltando.length > 0) {
      await d1.batch(faltando.map((item) => d1.prepare(item.alter)));
    }

    if (ownerEmailAtual) {
      await d1
        .prepare(`UPDATE users SET is_owner = 1 WHERE lower(email) = ? AND role = 'admin'`)
        .bind(ownerEmailAtual)
        .run();
    }

    await d1.batch([
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_users_instructor_role ON users(instructor_id, role)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_trainings_instructor_date ON trainings(instructor_id, training_date)',
      ),
      d1.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_availability_date ON instructor_availability(instructor_id, available_date)',
      ),
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_instructor_availability_status_date ON instructor_availability(status, available_date)',
      ),
    ]);
    // CREATE TABLE IF NOT EXISTS não mexe em tabela que já existe, então banco
    // com dados só recebe coluna nova por ALTER. Roda apenas quando o marcador
    // de versão está atrasado, e o erro de coluna repetida é esperado em quem
    // já foi migrado — por isso cada uma vai sozinha, não em lote.
    for (const alteracao of ALTERACOES_APOS_V1) {
      try {
        await d1.prepare(alteracao).run();
      } catch { /* coluna já existe */ }
    }

    await criarSessoesDeTurmasAntigas(d1);
    if (!marcadores.has('attendance_backfill')) {
      await registrarPresencaDeInscritosAntigos(d1);
    }

    // PRAGMA optimize não é permitido no Turso (ele gerencia isso sozinho);
    // executa apenas no SQLite local.
    if (!process.env.TURSO_DATABASE_URL) {
      await d1.prepare('PRAGMA optimize').run();
    }

    // Só no fim: se algo acima falhar, a versão não é gravada e o próximo
    // arranque refaz a migração inteira em vez de pular por engano.
    await d1.batch([
      d1
        .prepare(`INSERT INTO schema_meta (key, value) VALUES ('version', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
        .bind(String(SCHEMA_VERSION)),
      d1
        .prepare(`INSERT INTO schema_meta (key, value) VALUES ('owner_email', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
        .bind(ownerEmailAtual),
      d1.prepare(`INSERT INTO schema_meta (key, value) VALUES ('attendance_backfill', datetime('now'))
        ON CONFLICT(key) DO NOTHING`),
    ]);
  })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  return schemaPromise;
}


/**
 * Turmas criadas antes da tabela de dias ganham uma sessão por data, todas com
 * o instrutor que a turma já tinha. Só toca em turma que ainda não tem sessão,
 * então repetir a migração não duplica nada.
 */
async function criarSessoesDeTurmasAntigas(d1: DatabaseBinding) {
  const pendentes = await d1
    .prepare(`SELECT t.id, t.training_date, t.training_dates, t.instructor_id, t.status
      FROM trainings t
      WHERE NOT EXISTS (SELECT 1 FROM training_sessions s WHERE s.training_id = t.id)`)
    .all<{ id: string; training_date: string; training_dates: string; instructor_id: string | null; status: string }>();
  const insercoes = [];
  for (const turma of rows(pendentes)) {
    for (const [indice, data] of datasDaTurma(turma).entries()) {
      insercoes.push(
        d1
          .prepare(`INSERT INTO training_sessions (
            id, training_id, day_number, session_date, start_time, end_time, instructor_id, status
          ) VALUES (?, ?, ?, ?, '', '', ?, ?)`)
          .bind(makeId('session'), turma.id, indice + 1, data, turma.instructor_id, turma.status),
      );
    }
  }
  if (insercoes.length > 0) await d1.batch(insercoes);
}

/**
 * Inscritos de antes do check-in diário não têm presença gravada, e sem ela
 * regerar os documentos de uma turma antiga apagaria todos os certificados.
 * Ganham presença nos dias já iniciados ou concluídos; dia ainda agendado
 * continua exigindo check-in. Roda uma vez só (marcador attendance_backfill):
 * repetida mais tarde, daria presença a quem faltou num dia aberto depois.
 */
async function registrarPresencaDeInscritosAntigos(d1: DatabaseBinding) {
  await d1
    .prepare(`INSERT OR IGNORE INTO session_attendance (id, session_id, participant_id)
      SELECT 'attendance-' || lower(hex(randomblob(16))), s.id, p.id
      FROM participants p
      JOIN training_sessions s ON s.training_id = p.training_id
      WHERE s.status != 'scheduled'`)
    .run();
}

/** As datas gravadas na turma, em ordem, com recuo para a data principal. */
function datasDaTurma(turma: { training_date: string; training_dates: string }): string[] {
  let datas: string[] = [];
  try {
    datas = turma.training_dates ? (JSON.parse(turma.training_dates) as string[]) : [];
  } catch { datas = []; }
  if (!Array.isArray(datas) || datas.length === 0) datas = [turma.training_date];
  return datas.filter(Boolean);
}

/**
 * O instrutor enxerga a turma quando tem ao menos um DIA dela atribuído.
 * Antes o vínculo era a coluna trainings.instructor_id, que só cabe um.
 */
const INSTRUTOR_NA_TURMA = `EXISTS (SELECT 1 FROM training_sessions s
  WHERE s.training_id = t.id AND s.instructor_id = ?)`;

/** CPF sem pontuação: é o que liga o mesmo aluno entre turmas diferentes. */
function cpfNu(coluna: string) {
  return `replace(replace(replace(${coluna}, '.', ''), '-', ''), ' ', '')`;
}

/**
 * Turmas que valem crédito de dia entre si (a partir da turma do aluno, alias
 * p): mesma norma, cliente, título, carga horária e mesmo número de dias. O
 * número de dias entra porque o "dia 2" de uma turma de 2 dias não é o mesmo
 * conteúdo do "dia 2" de uma de 3.
 */
const TURMAS_EQUIVALENTES = `SELECT te.id FROM trainings te
    JOIN trainings tb ON tb.id = p.training_id
    WHERE te.nr = tb.nr AND te.client_id = tb.client_id
      AND te.title = tb.title AND te.duration = tb.duration
      AND (SELECT count(*) FROM training_sessions s9 WHERE s9.training_id = te.id)
        = (SELECT count(*) FROM training_sessions s9 WHERE s9.training_id = tb.id)`;

/**
 * A PESSOA do aluno p (mesmo CPF) tem presença num dia de mesmo número que o
 * dia `s`, em qualquer turma equivalente. Depende de `s` e `p` estarem no
 * escopo de quem usa.
 */
const PRESENCA_DA_PESSOA_NO_DIA = `SELECT 1 FROM session_attendance a
    JOIN participants pp ON pp.id = a.participant_id
    JOIN training_sessions ss ON ss.id = a.session_id
    WHERE ${cpfNu('pp.document_id')} = ${cpfNu('p.document_id')}
      AND ss.day_number = s.day_number
      AND ss.training_id IN (${TURMAS_EQUIVALENTES})`;

/**
 * Condição do certificado: nenhum dia da turma ficou sem presença da pessoa.
 * Os dias podem ter sido feitos em turmas equivalentes diferentes — quem fez o
 * dia 1 numa turma e o dia 2 em outra está completo.
 */
const PRESENTE_EM_TODOS_OS_DIAS = `NOT EXISTS (SELECT 1 FROM training_sessions s
  WHERE s.training_id = p.training_id
  AND NOT EXISTS (${PRESENCA_DA_PESSOA_NO_DIA}))`;

/**
 * A turma onde a pessoa fez o ÚLTIMO dia (o prático): é ela que certifica e
 * documenta. Fez o último dia em mais de uma turma equivalente? Vale a mais
 * recente.
 */
const TURMA_QUE_CERTIFICA = `(SELECT ss.training_id FROM session_attendance a
    JOIN participants pp ON pp.id = a.participant_id
    JOIN training_sessions ss ON ss.id = a.session_id
    WHERE ${cpfNu('pp.document_id')} = ${cpfNu('p.document_id')}
      AND ss.day_number = (SELECT max(s8.day_number) FROM training_sessions s8 WHERE s8.training_id = p.training_id)
      AND ss.training_id IN (${TURMAS_EQUIVALENTES})
    ORDER BY ss.session_date DESC, ss.training_id DESC LIMIT 1)`;

/** O aluno entra nos documentos DESTA turma, e não nos da turma equivalente. */
const CERTIFICA_NESTA_TURMA = `p.training_id = ${TURMA_QUE_CERTIFICA}`;

/**
 * Dias cumpridos e dias da turma (alias p). Conta os dias da PESSOA entre
 * turmas equivalentes: senão a gestão veria 1/3 para quem já está completo.
 */
const COLUNAS_PRESENCA = `(SELECT count(*) FROM training_sessions s
    WHERE s.training_id = p.training_id AND EXISTS (${PRESENCA_DA_PESSOA_NO_DIA})) AS days_present,
  (SELECT count(*) FROM training_sessions s WHERE s.training_id = p.training_id) AS days_total`;

/** Ids dos dias em que a pessoa tem presença, separados por vírgula (chamada do instrutor). */
const DIAS_PRESENTES = `(SELECT group_concat(sa.session_id) FROM session_attendance sa
    WHERE sa.participant_id = p.id) AS present_sessions`;

export type TrainingSessionRow = {
  id: string;
  training_id: string;
  day_number: number;
  session_date: string;
  start_time: string;
  end_time: string;
  instructor_id: string | null;
  instructor_name: string | null;
  status: string;
};

export async function listTrainingSessions(trainingId: string): Promise<TrainingSessionRow[]> {
  const result = await getD1()
    .prepare(`SELECT s.id, s.training_id, s.day_number, s.session_date, s.start_time,
      s.end_time, s.instructor_id, i.name AS instructor_name, s.status
      FROM training_sessions s
      LEFT JOIN instructors i ON i.id = s.instructor_id
      WHERE s.training_id = ? ORDER BY s.day_number ASC`)
    .bind(trainingId)
    .all<TrainingSessionRow>();
  return rows(result);
}

/**
 * A turma é o resumo dos dias dela: status, datas e — o que importa para o
 * certificado — o instrutor do ÚLTIMO dia concluído, que é quem assina.
 *
 * Chamar sempre que uma sessão mudar. Devolve `concluiuAgora` para quem chama
 * saber se é a hora de emitir os documentos: emitir no fim de cada dia era
 * justamente o defeito.
 */
export async function sincronizarTurma(trainingId: string) {
  const d1 = getD1();
  const sessoes = await listTrainingSessions(trainingId);
  if (sessoes.length === 0) return { concluiuAgora: false, status: 'scheduled' as const };

  const anterior = await d1
    .prepare('SELECT status FROM trainings WHERE id = ? LIMIT 1')
    .bind(trainingId)
    .first<{ status: string }>();

  const concluidas = sessoes.filter((dia) => dia.status === 'completed');
  const status = concluidas.length === sessoes.length
    ? 'completed'
    : sessoes.some((dia) => dia.status !== 'scheduled') ? 'in_progress' : 'scheduled';

  // Quem assina é o instrutor do último dia dado. Enquanto nenhum dia terminou,
  // vale o último dia que já tem instrutor escalado.
  const referencia = [...concluidas].reverse().find((dia) => dia.instructor_id)
    ?? [...sessoes].reverse().find((dia) => dia.instructor_id)
    ?? null;

  const datas = sessoes.map((dia) => dia.session_date);
  await d1
    .prepare(`UPDATE trainings SET status = ?, training_date = ?, training_dates = ?,
      instructor_id = ?, instructor = ? WHERE id = ?`)
    .bind(
      status,
      datas[0],
      JSON.stringify(datas),
      referencia?.instructor_id ?? null,
      referencia?.instructor_name ?? '',
      trainingId,
    )
    .run();

  return { concluiuAgora: status === 'completed' && anterior?.status !== 'completed', status };
}

/** Existe foto da lista assinada arquivada nesta turma? */
export async function temListaAssinada(trainingId: string) {
  const linha = await getD1()
    .prepare("SELECT count(*) AS total FROM files WHERE training_id = ? AND kind = 'attendance'")
    .bind(trainingId)
    .first<{ total: number }>();
  return (linha?.total ?? 0) > 0;
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset, username
      FROM users WHERE lower(email) = ? LIMIT 1`)
    .bind(normalizeEmail(email))
    .first<StoredUser>();
}

/** Empresa entra pelo nome de usuário, e só contas de cliente têm um. */
export async function findClientUserByUsername(
  username: string,
): Promise<StoredUser | null> {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset, username
      FROM users WHERE username = ? AND role = 'client' LIMIT 1`)
    .bind(normalizarUsuario(username))
    .first<StoredUser>();
}

export async function findUserById(
  userId: string,
): Promise<StoredUser | null> {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset, username
      FROM users WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<StoredUser>();
}

export async function bootstrapAdmin(input: {
  email: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const id = makeId('admin');
  await getD1()
    .prepare(`INSERT INTO users (
      id, client_id, name, email, password_hash, password_salt, role,
      is_owner, active, must_reset, last_login_at
    ) VALUES (?, NULL, 'Equipe Space Light', ?, ?, ?, 'admin', 1, 1, 1, datetime('now'))`)
    .bind(
      id,
      normalizeEmail(input.email),
      input.passwordHash,
      input.passwordSalt,
    )
    .run();
  return findUserById(id);
}

export async function recordLogin(userId: string) {
  await ensurePortalSchema();
  await getD1()
    .prepare(
      `UPDATE users SET last_login_at = datetime('now') WHERE id = ?`,
    )
    .bind(userId)
    .run();
  const user = await findUserById(userId);
  if (user?.client_id) {
    await getD1()
      .prepare(`UPDATE clients
        SET status = 'active', updated_at = datetime('now')
        WHERE id = ? AND status = 'invited'`)
      .bind(user.client_id)
      .run();
  }
}

export async function updateUserPassword(input: {
  userId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  await getD1()
    .prepare(`UPDATE users
      SET password_hash = ?, password_salt = ?, must_reset = 0
      WHERE id = ?`)
    .bind(input.passwordHash, input.passwordSalt, input.userId)
    .run();
}

async function findUserForReset(target: {
  userId?: string;
  clientId?: string;
  instructorId?: string;
}): Promise<StoredUser | null> {
  if (target.userId) return findUserById(target.userId);
  const column = target.clientId ? 'client_id' : target.instructorId ? 'instructor_id' : null;
  const value = target.clientId ?? target.instructorId;
  if (!column || !value) return null;
  return getD1()
    .prepare(`SELECT id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset, username
      FROM users WHERE ${column} = ? ORDER BY created_at ASC LIMIT 1`)
    .bind(value)
    .first<StoredUser>();
}

export async function resetUserPasswordByAdmin(input: {
  userId?: string;
  clientId?: string;
  instructorId?: string;
  passwordHash: string;
  passwordSalt: string;
  byUserId: string;
  actorIsOwner: boolean;
}) {
  await ensurePortalSchema();
  const target = await findUserForReset(input);
  if (!target) throw new Error('Este cadastro ainda não tem uma conta de acesso.');
  if (target.id === input.byUserId) {
    throw new Error('Para trocar a própria senha, use a página Definir senha.');
  }
  if (target.role === 'admin' && !input.actorIsOwner) {
    throw new Error('Somente o dono pode redefinir a senha de um funcionário.');
  }
  if (isOwnerByEmailOrFlag(target.email, target.is_owner)) {
    throw new Error('A senha do dono só pode ser trocada pelo próprio dono.');
  }
  await getD1()
    .prepare(`UPDATE users
      SET password_hash = ?, password_salt = ?, must_reset = 1
      WHERE id = ?`)
    .bind(input.passwordHash, input.passwordSalt, target.id)
    .run();
  await writeAudit(input.byUserId, 'user.password_reset', 'user', target.id, {
    email: target.email,
    role: target.role,
  });
  return {
    userId: target.id,
    name: target.name,
    email: target.email,
    username: target.username ?? null,
    active: target.active === 1,
  };
}

/** Valida o formato e garante que nenhuma outra conta já usa o nome. */
async function exigirUsuarioLivre(valor: string, exceptoUserId?: string) {
  const username = normalizarUsuario(valor);
  if (!usuarioValido(username)) throw new Error(`Nome de usuário inválido. ${USUARIO_REGRA}`);
  const dono = await getD1()
    .prepare('SELECT id FROM users WHERE username = ? LIMIT 1')
    .bind(username)
    .first<{ id: string }>();
  if (dono && dono.id !== exceptoUserId) {
    throw new Error('Este nome de usuário já está em uso por outra empresa.');
  }
  return username;
}

/** A Space define ou troca o nome de usuário da empresa. Sem ele, a empresa não entra. */
export async function setClientUsername(input: { clientId: string; username: string; byUserId: string }) {
  await ensurePortalSchema();
  const conta = await findUserForReset({ clientId: input.clientId });
  if (!conta || conta.role !== 'client') throw new Error('Este cliente ainda não tem uma conta de acesso.');
  const username = await exigirUsuarioLivre(input.username, conta.id);
  await getD1().prepare('UPDATE users SET username = ? WHERE id = ?').bind(username, conta.id).run();
  await writeAudit(input.byUserId, 'client.username_set', 'client', input.clientId, {
    username,
    anterior: conta.username ?? null,
  });
  return { ok: true as const, username };
}

export async function approveClientAccess(
  clientId: string,
  approvedByUserId: string,
) {
  await ensurePortalSchema();
  const d1 = getD1();
  await d1.batch([
    d1
      .prepare(`UPDATE clients
        SET status = 'active', updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'`)
      .bind(clientId),
    d1
      .prepare(
        `UPDATE users SET active = 1 WHERE client_id = ? AND role = 'client'`,
      )
      .bind(clientId),
  ]);
  await writeAudit(
    approvedByUserId,
    'client.access_approved',
    'client',
    clientId,
    {},
  );
}

/**
 * Sigla que o cliente vai usar. Informada: valida e exige que esteja livre.
 * Vazia: sugere pelo nome e, se já existir, acrescenta 2, 3... até achar livre.
 */
async function siglaParaCliente(d1: DatabaseBinding, informada: string, nome: string, excetoId: string | null) {
  const ocupada = async (sigla: string) => Boolean(await d1
    .prepare('SELECT id FROM clients WHERE short_code = ? AND id != ? LIMIT 1')
    .bind(sigla, excetoId ?? '')
    .first<{ id: string }>());
  const pedida = normalizarSigla(informada ?? '');
  if (pedida) {
    if (!siglaValida(pedida)) throw new Error(`Sigla inválida. ${SIGLA_REGRA}`);
    if (await ocupada(pedida)) throw new Error(`A sigla ${pedida} já é de outro cliente.`);
    return pedida;
  }
  const base = sugerirSigla(nome) || 'CLI';
  for (let n = 1; ; n++) {
    const candidata = normalizarSigla(n === 1 ? base : `${base.slice(0, 10)}${n}`);
    if (siglaValida(candidata) && !(await ocupada(candidata))) return candidata;
  }
}

export async function createClientByAdmin(input: {
  name: string;
  legalName: string;
  document: string;
  unit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  username: string;
  /** Sigla do código das turmas; vazia = sugerida pelo nome. */
  shortCode?: string;
  createdByUserId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const id = makeId('client');
  const userId = makeId('user');
  const email = normalizeEmail(input.contactEmail);
  const username = await exigirUsuarioLivre(input.username);
  const sigla = await siglaParaCliente(d1, input.shortCode ?? '', input.name, null);
  await d1.batch([
    d1
      .prepare(`INSERT INTO clients (
        id, name, legal_name, document, unit, contact_name, contact_email,
        contact_phone, short_code, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'invited', 'admin')`)
      .bind(
        id,
        input.name.trim(),
        input.legalName.trim(),
        input.document.trim(),
        input.unit.trim(),
        input.contactName.trim(),
        email,
        input.contactPhone.trim(),
        sigla,
      ),
    d1
      .prepare(`INSERT INTO users (
        id, client_id, name, email, username, password_hash, password_salt, role,
        active, must_reset
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'client', 1, 1)`)
      .bind(
        userId,
        id,
        input.contactName.trim(),
        email,
        username,
        input.passwordHash,
        input.passwordSalt,
      ),
  ]);
  await writeAudit(
    input.createdByUserId,
    'client.access_invited',
    'client',
    id,
    { email, username },
  );
  return { id, userId, email, username, status: 'invited' as const };
}

export async function createInstructorByAdmin(input: {
  name: string;
  document: string;
  email: string;
  phone: string;
  professionalRegistry: string;
  specialties: string;
  baseCity: string;
  createdByUserId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const instructorId = makeId('instructor');
  const userId = makeId('user');
  const email = normalizeEmail(input.email);
  await d1.batch([
    d1
      .prepare(`INSERT INTO instructors (
        id, name, document, email, phone, professional_registry,
        specialties, base_city, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'admin')`)
      .bind(
        instructorId,
        input.name.trim(),
        input.document.trim(),
        email,
        input.phone.trim(),
        input.professionalRegistry.trim(),
        input.specialties.trim(),
        input.baseCity.trim(),
      ),
    d1
      .prepare(`INSERT INTO users (
        id, instructor_id, name, email, password_hash, password_salt,
        role, active, must_reset
      ) VALUES (?, ?, ?, ?, ?, ?, 'instructor', 1, 1)`)
      .bind(
        userId,
        instructorId,
        input.name.trim(),
        email,
        input.passwordHash,
        input.passwordSalt,
      ),
  ]);
  await writeAudit(
    input.createdByUserId,
    'instructor.access_created',
    'instructor',
    instructorId,
    { email },
  );
  return { instructorId, userId, email };
}

export async function selfRegisterInstructor(input: {
  name: string;
  document: string;
  email: string;
  phone: string;
  professionalRegistry: string;
  specialties: string;
  baseCity: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const email = normalizeEmail(input.email);
  const existing = await d1
    .prepare(`SELECT id FROM instructors
      WHERE document = ? OR lower(email) = ? LIMIT 1`)
    .bind(input.document.trim(), email)
    .first<{ id: string }>();
  if (existing) throw new Error('Já existe um instrutor com este CPF ou e-mail.');

  const instructorId = makeId('instructor');
  const userId = makeId('user');
  await d1.batch([
    d1
      .prepare(`INSERT INTO instructors (
        id, name, document, email, phone, professional_registry,
        specialties, base_city, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'self')`)
      .bind(
        instructorId,
        input.name.trim(),
        input.document.trim(),
        email,
        input.phone.trim(),
        input.professionalRegistry.trim(),
        input.specialties.trim(),
        input.baseCity.trim(),
      ),
    d1
      .prepare(`INSERT INTO users (
        id, instructor_id, name, email, password_hash, password_salt,
        role, active, must_reset
      ) VALUES (?, ?, ?, ?, ?, ?, 'instructor', 1, 0)`)
      .bind(
        userId,
        instructorId,
        input.name.trim(),
        email,
        input.passwordHash,
        input.passwordSalt,
      ),
  ]);
  await writeAudit(
    userId,
    'instructor.self_registered',
    'instructor',
    instructorId,
    { email },
  );
  return instructorId;
}

export async function approveInstructorAccess(
  instructorId: string,
  approvedByUserId: string,
) {
  await ensurePortalSchema();
  const d1 = getD1();
  await d1.batch([
    d1
      .prepare(`UPDATE instructors
        SET status = 'active', updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'`)
      .bind(instructorId),
    d1
      .prepare(`UPDATE users SET active = 1
        WHERE instructor_id = ? AND role = 'instructor'`)
      .bind(instructorId),
  ]);
  await writeAudit(
    approvedByUserId,
    'instructor.access_approved',
    'instructor',
    instructorId,
    {},
  );
}

export async function getInstructorDashboardData(
  currentUser: StoredUser,
): Promise<InstructorDashboardData | null> {
  await ensurePortalSchema();
  if (!currentUser.instructor_id) return null;
  const d1 = getD1();
  const instructor = await d1
    .prepare(`SELECT id, name, document, email, phone, professional_registry,
      specialties, base_city, status, source, photo_key, created_at
      FROM instructors WHERE id = ? AND status != 'suspended' LIMIT 1`)
    .bind(currentUser.instructor_id)
    .first<CompanyInstructor>();
  if (!instructor) return null;

  const [trainingsResult, availabilityResult, participantsResult, documentsResult, sessoes, checklistsResult, marcasResult] =
    await Promise.all([
      d1
        .prepare(`SELECT t.id, t.client_id, t.instructor_id,
          c.name AS client_name, t.code, t.nr, t.title, t.internal_label, t.training_date,
          t.duration, t.location, COALESCE(i.name, t.instructor) AS instructor,
          t.status, t.participant_limit, t.qr_token, t.qr_enabled,
          t.created_at,
          (SELECT count(*) FROM files f WHERE f.training_id = t.id) AS file_count,
          (SELECT count(*) FROM participants p WHERE p.training_id = t.id) AS participant_count
          FROM trainings t
          JOIN clients c ON c.id = t.client_id
          LEFT JOIN instructors i ON i.id = t.instructor_id
          WHERE ${INSTRUTOR_NA_TURMA}
          ORDER BY t.training_date ASC`)
        .bind(instructor.id)
        .all<CompanyTraining>(),
      // Escalado na data: a disponibilidade some e fica só o treinamento. Se ele
      // sair do dia, ela volta — por isso filtra aqui em vez de apagar.
      d1
        .prepare(`SELECT a.id, a.instructor_id, a.available_date, a.note, a.status, a.created_at
          FROM instructor_availability a
          WHERE a.instructor_id = ?
          AND NOT EXISTS (SELECT 1 FROM training_sessions s
            WHERE s.instructor_id = a.instructor_id AND s.session_date = a.available_date)
          ORDER BY a.available_date ASC`)
        .bind(instructor.id)
        .all<InstructorAvailability>(),
      d1
        .prepare(`SELECT p.id, p.training_id, t.title AS training_title,
          t.nr AS training_nr, c.name AS client_name, p.full_name,
          p.document_id, p.rg, p.birth_date, p.email, p.phone, p.job_title, p.employee_login, p.created_at,
          ${COLUNAS_PRESENCA},
          ${DIAS_PRESENTES}
          FROM participants p
          JOIN trainings t ON t.id = p.training_id
          JOIN clients c ON c.id = t.client_id
          WHERE ${INSTRUTOR_NA_TURMA}
          ORDER BY p.created_at DESC`)
        .bind(instructor.id)
        .all<CompanyParticipant>(),
      d1
        .prepare(`SELECT id, instructor_id, name, content_type, size, category,
          status, created_at
          FROM instructor_documents
          WHERE instructor_id = ? ORDER BY created_at DESC`)
        .bind(instructor.id)
        .all<CompanyInstructorDocument>(),
      sessoesPorTurma(d1, instructor.id),
      d1.prepare('SELECT nr, items FROM checklist_templates').all<ChecklistDaNorma>(),
      d1
        .prepare(`SELECT c.training_id, c.item FROM training_checklist c
          JOIN trainings t ON t.id = c.training_id
          WHERE ${INSTRUTOR_NA_TURMA}`)
        .bind(instructor.id)
        .all<MarcaDoChecklist>(),
    ]);

  return {
    instructor,
    trainings: rows(trainingsResult).map((turma) => ({ ...turma, sessions: sessoes.get(turma.id) ?? [] })),
    availability: rows(availabilityResult),
    documents: rows(documentsResult),
    participants: rows(participantsResult),
    checklistTemplates: rows(checklistsResult),
    checklistMarks: rows(marcasResult),
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
    },
  };
}

export async function saveInstructorAvailability(input: {
  instructorId: string;
  userId: string;
  availableDate: string;
  note: string;
}) {
  await ensurePortalSchema();
  if (!DATA_ISO.test(input.availableDate)) {
    throw new Error('Informe uma data válida.');
  }
  const escalado = await getD1()
    .prepare('SELECT 1 AS ok FROM training_sessions WHERE instructor_id = ? AND session_date = ? LIMIT 1')
    .bind(input.instructorId, input.availableDate)
    .first<{ ok: number }>();
  if (escalado) throw new Error('Você já tem treinamento neste dia: ele aparece no calendário como treinamento.');
  const id = makeId('availability');
  await getD1()
    .prepare(`INSERT INTO instructor_availability (
      id, instructor_id, available_date, note, status
    ) VALUES (?, ?, ?, ?, 'available')
    ON CONFLICT(instructor_id, available_date)
    DO UPDATE SET note = excluded.note, status = 'available'`)
    .bind(id, input.instructorId, input.availableDate, input.note.trim())
    .run();
  await writeAudit(
    input.userId,
    'instructor.availability_saved',
    'instructor',
    input.instructorId,
    { date: input.availableDate },
  );
  return { ok: true as const };
}

export async function removeInstructorAvailability(input: {
  instructorId: string;
  availabilityId: string;
  userId: string;
}) {
  await ensurePortalSchema();
  await getD1()
    .prepare(`DELETE FROM instructor_availability
      WHERE id = ? AND instructor_id = ?`)
    .bind(input.availabilityId, input.instructorId)
    .run();
  await writeAudit(
    input.userId,
    'instructor.availability_removed',
    'instructor_availability',
    input.availabilityId,
    {},
  );
}

/**
 * O dia deste instrutor nesta turma: o primeiro ainda não concluído, ou o
 * último que ele deu. É sobre ele que iniciar e encerrar agem.
 */
async function diaDoInstrutor(trainingId: string, instructorId: string) {
  const sessoes = await listTrainingSessions(trainingId);
  const minhas = sessoes.filter((dia) => dia.instructor_id === instructorId);
  if (minhas.length === 0) return null;
  const atual = minhas.find((dia) => dia.status !== 'completed') ?? minhas[minhas.length - 1];
  return { atual, sessoes, minhas };
}

export async function startInstructorTraining(input: {
  instructorId: string;
  trainingId: string;
  userId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(`SELECT t.id, t.qr_token FROM trainings t WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string; qr_token: string }>();
  if (!training) throw new Error('Treinamento não encontrado para este instrutor.');
  const dia = await diaDoInstrutor(input.trainingId, input.instructorId);
  if (!dia) throw new Error('Nenhum dia deste treinamento está atribuído a você.');
  if (dia.atual.status === 'completed') {
    throw new Error('Todos os seus dias neste treinamento já foram concluídos.');
  }
  await d1
    .prepare("UPDATE training_sessions SET status = 'in_progress' WHERE id = ?")
    .bind(dia.atual.id)
    .run();
  await sincronizarTurma(input.trainingId);
  await writeAudit(
    input.userId,
    'training.started',
    'training',
    input.trainingId,
    { dia: dia.atual.day_number },
  );
  return { qrToken: training.qr_token, status: 'in_progress' as const, day: dia.atual.day_number };
}

export async function listInstructorTrainingParticipants(input: {
  instructorId: string;
  trainingId: string;
}) {
  await ensurePortalSchema();
  const result = await getD1()
    .prepare(`SELECT p.id, p.training_id, t.title AS training_title,
      t.nr AS training_nr, c.name AS client_name, p.full_name,
      p.document_id, p.rg, p.birth_date, p.email, p.phone, p.job_title, p.employee_login, p.created_at,
          ${COLUNAS_PRESENCA},
          ${DIAS_PRESENTES}
      FROM participants p
      JOIN trainings t ON t.id = p.training_id
      JOIN clients c ON c.id = t.client_id
      WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA}
      ORDER BY p.created_at DESC`)
    .bind(input.trainingId, input.instructorId)
    .all<CompanyParticipant>();
  return rows(result);
}

/**
 * Encerra o DIA do instrutor. A turma só fecha — e só então os documentos são
 * emitidos — quando o último dia é encerrado.
 *
 * A folha de presença é impressa no 1º dia com uma coluna por data e assinada
 * ao longo do treinamento, então a foto dela é cobrada apenas no último dia.
 */
export async function completeInstructorTraining(input: {
  instructorId: string;
  trainingId: string;
  userId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const dia = await diaDoInstrutor(input.trainingId, input.instructorId);
  if (!dia) throw new Error('Treinamento não encontrado para este instrutor.');
  if (dia.atual.status === 'completed') {
    throw new Error('Este dia do treinamento já foi encerrado.');
  }

  const ultimoPendente = dia.sessoes.every(
    (outro) => outro.id === dia.atual.id || outro.status === 'completed',
  );
  if (ultimoPendente && !(await temListaAssinada(input.trainingId))) {
    throw new Error(
      'Envie a foto da lista de presença assinada antes de encerrar o treinamento.',
    );
  }

  await d1
    .prepare("UPDATE training_sessions SET status = 'completed' WHERE id = ?")
    .bind(dia.atual.id)
    .run();
  const { concluiuAgora } = await sincronizarTurma(input.trainingId);
  await writeAudit(input.userId, 'training.day_completed', 'training', input.trainingId, {
    dia: dia.atual.day_number,
    turmaConcluida: concluiuAgora,
  });

  if (!concluiuAgora) {
    const restantes = dia.sessoes.filter(
      (outro) => outro.id !== dia.atual.id && outro.status !== 'completed',
    ).length;
    return { status: 'in_progress' as const, certificates: 0, trainingCompleted: false, remainingDays: restantes };
  }

  // Só na virada da turma: quem estava na lista de presença é quem recebe.
  const emitidos = await issueCertificateBatch({
    trainingId: input.trainingId,
    byUserId: input.userId,
  });
  return { status: 'completed' as const, certificates: emitidos, trainingCompleted: true, remainingDays: 0 };
}

/**
 * A Space fecha a turma quando o instrutor sumiu. Aqui a foto da lista é aviso,
 * não trava — quem confirma assume, e fica registrado.
 */
export async function completeTrainingByAdmin(input: {
  trainingId: string;
  byUserId: string;
  semLista?: boolean;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const sessoes = await listTrainingSessions(input.trainingId);
  if (sessoes.length === 0) throw new Error('Treinamento não encontrado.');
  const pendentes = sessoes.filter((dia) => dia.status !== 'completed');
  if (pendentes.length === 0) throw new Error('Este treinamento já está concluído.');

  const listaEnviada = await temListaAssinada(input.trainingId);
  if (!listaEnviada && !input.semLista) throw new Error('SEM_LISTA');

  await d1.batch(
    pendentes.map((dia) =>
      d1.prepare("UPDATE training_sessions SET status = 'completed' WHERE id = ?").bind(dia.id),
    ),
  );
  const { concluiuAgora } = await sincronizarTurma(input.trainingId);
  await writeAudit(input.byUserId, 'training.completed_by_company', 'training', input.trainingId, {
    dias: pendentes.map((dia) => dia.day_number),
    semListaAssinada: !listaEnviada,
  });
  const emitidos = await issueCertificateBatch({
    trainingId: input.trainingId,
    byUserId: input.byUserId,
  });
  return { concluiuAgora, certificates: emitidos, listaEnviada };
}

/**
 * A Space encerra um dia só, quando o instrutor não fechou o dele. Se for o
 * último dia aberto, vale a mesma regra de `completeTrainingByAdmin`: sem a
 * lista assinada, só com confirmação.
 */
export async function completeSessionByAdmin(input: {
  trainingId: string;
  sessionId: string;
  byUserId: string;
  semLista?: boolean;
}) {
  await ensurePortalSchema();
  const sessoes = await listTrainingSessions(input.trainingId);
  const dia = sessoes.find((sessao) => sessao.id === input.sessionId);
  if (!dia) throw new Error('Dia não encontrado nesta turma.');
  if (dia.status === 'completed') throw new Error('Este dia já foi encerrado.');
  const ultimoAberto = sessoes.every((outro) => outro.id === dia.id || outro.status === 'completed');
  const listaEnviada = await temListaAssinada(input.trainingId);
  if (ultimoAberto && !listaEnviada && !input.semLista) throw new Error('SEM_LISTA');

  await getD1()
    .prepare("UPDATE training_sessions SET status = 'completed' WHERE id = ?")
    .bind(dia.id)
    .run();
  const { concluiuAgora } = await sincronizarTurma(input.trainingId);
  await writeAudit(input.byUserId, 'training.day_completed_by_company', 'training', input.trainingId, {
    dia: dia.day_number,
    turmaConcluida: concluiuAgora,
    semListaAssinada: ultimoAberto && !listaEnviada,
  });
  if (!concluiuAgora) return { concluiuAgora: false, certificates: 0, listaEnviada };
  const certificates = await issueCertificateBatch({
    trainingId: input.trainingId,
    byUserId: input.byUserId,
  });
  return { concluiuAgora: true, certificates, listaEnviada };
}

/**
 * Renomeia a identificação da turma. É só o nome interno: o título impresso no
 * certificado continua sendo `title` e não muda por aqui.
 */
export async function renameTraining(input: {
  trainingId: string;
  internalLabel: string;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const existe = await getD1()
    .prepare('SELECT id FROM trainings WHERE id = ? LIMIT 1')
    .bind(input.trainingId)
    .first<{ id: string }>();
  if (!existe) throw new Error('Treinamento não encontrado.');
  const identificacao = input.internalLabel.trim().slice(0, 120);
  await getD1()
    .prepare('UPDATE trainings SET internal_label = ? WHERE id = ?')
    .bind(identificacao, input.trainingId)
    .run();
  await writeAudit(input.byUserId, 'training.renamed', 'training', input.trainingId, {
    identificacao,
  });
  return { ok: true as const };
}

/** A Space escala (ou troca) o instrutor, a data e o horário de um dia. */
export async function updateTrainingSession(input: {
  trainingId: string;
  sessionId: string;
  instructorId?: string | null;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const atual = await d1
    .prepare('SELECT id FROM training_sessions WHERE id = ? AND training_id = ? LIMIT 1')
    .bind(input.sessionId, input.trainingId)
    .first<{ id: string }>();
  if (!atual) throw new Error('Dia do treinamento não encontrado.');

  if (input.instructorId) {
    const instrutor = await d1
      .prepare("SELECT id FROM instructors WHERE id = ? AND status IN ('active', 'invited') LIMIT 1")
      .bind(input.instructorId)
      .first<{ id: string }>();
    if (!instrutor) throw new Error('Selecione um instrutor aprovado.');
  }
  if (input.sessionDate !== undefined && !DATA_ISO.test(input.sessionDate)) {
    throw new Error('Informe uma data válida para o dia.');
  }

  const campos: string[] = [];
  const valores: (string | null)[] = [];
  if (input.instructorId !== undefined) { campos.push('instructor_id = ?'); valores.push(input.instructorId || null); }
  if (input.sessionDate !== undefined) { campos.push('session_date = ?'); valores.push(input.sessionDate); }
  if (input.startTime !== undefined) { campos.push('start_time = ?'); valores.push(input.startTime.trim()); }
  if (input.endTime !== undefined) { campos.push('end_time = ?'); valores.push(input.endTime.trim()); }
  if (campos.length === 0) return { ok: true as const };

  await d1
    .prepare(`UPDATE training_sessions SET ${campos.join(', ')} WHERE id = ?`)
    .bind(...valores, input.sessionId)
    .run();
  // Trocar a data pode mudar a ordem: "Dia 1" é sempre o primeiro no calendário.
  if (input.sessionDate !== undefined) await renumerarDias(input.trainingId);
  await sincronizarTurma(input.trainingId);
  await writeAudit(input.byUserId, 'training.session_updated', 'training', input.trainingId, {
    sessionId: input.sessionId,
  });
  return { ok: true as const };
}

/**
 * Congela o lote: a quantidade sai da lista de presença no momento do
 * encerramento. Reencerrar não duplica — o lote é atualizado.
 */
export async function issueCertificateBatch(input: { trainingId: string; byUserId: string }) {
  const d1 = getD1();
  const total = await d1
    .prepare(`SELECT count(*) AS total FROM participants p
      WHERE p.training_id = ? AND ${PRESENTE_EM_TODOS_OS_DIAS} AND ${CERTIFICA_NESTA_TURMA}`)
    .bind(input.trainingId)
    .first<{ total: number }>();
  const quantidade = total?.total ?? 0;

  const existente = await d1
    .prepare('SELECT id FROM certificate_batches WHERE training_id = ? LIMIT 1')
    .bind(input.trainingId)
    .first<{ id: string }>();

  if (existente) {
    await d1
      .prepare(`UPDATE certificate_batches
        SET participant_count = ?, status = 'generated', generated_at = datetime('now')
        WHERE id = ?`)
      .bind(quantidade, existente.id)
      .run();
  } else {
    await d1
      .prepare(`INSERT INTO certificate_batches (id, training_id, status, participant_count, generated_at)
        VALUES (?, ?, 'generated', ?, datetime('now'))`)
      .bind(makeId('batch'), input.trainingId, quantidade)
      .run();
  }
  await writeAudit(input.byUserId, 'certificates.issued', 'training', input.trainingId, {
    participantes: quantidade,
  });
  return quantidade;
}

/** Substitui o PDF de certificados do treinamento nos documentos da turma. */
export async function replaceCertificateDocument(input: {
  trainingId: string;
  clientId: string;
  name: string;
  objectKey: string;
  size: number;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const anteriores = await d1
    .prepare(`SELECT id, object_key FROM files
      WHERE training_id = ? AND kind = 'document' AND name = ?`)
    .bind(input.trainingId, input.name)
    .all<{ id: string; object_key: string }>();
  await d1
    .prepare(`DELETE FROM files WHERE training_id = ? AND kind = 'document' AND name = ?`)
    .bind(input.trainingId, input.name)
    .run();
  const id = makeId('file');
  await d1
    .prepare(`INSERT INTO files (
      id, client_id, training_id, name, object_key, content_type, size, kind, status
    ) VALUES (?, ?, ?, ?, ?, 'application/pdf', ?, 'document', 'stored')`)
    .bind(id, input.clientId, input.trainingId, input.name, input.objectKey, input.size)
    .run();
  await writeAudit(input.byUserId, 'certificates.published', 'training', input.trainingId, {
    arquivo: input.name,
  });
  return { id, substituidos: rows(anteriores).map((item) => item.object_key) };
}

/** Cliente do treinamento, para saber onde arquivar o PDF. */
export async function findTrainingClientId(trainingId: string) {
  await ensurePortalSchema();
  const row = await getD1()
    .prepare('SELECT client_id FROM trainings WHERE id = ? LIMIT 1')
    .bind(trainingId)
    .first<{ client_id: string }>();
  return row?.client_id ?? null;
}

export async function addParticipantByInstructor(input: {
  instructorId: string;
  trainingId: string;
  userId: string;
  participant: { fullName: string; documentId: string; rg?: string; birthDate?: string; email: string; phone: string; jobTitle?: string; employeeLogin?: string };
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(`SELECT t.id FROM trainings t WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string }>();
  if (!training) throw new Error('Treinamento não encontrado para este instrutor.');
  if (!input.participant.fullName.trim() || !input.participant.documentId.trim()) {
    throw new Error('Informe ao menos o nome e o identificador do participante.');
  }
  const problemaDocumento = problemaCpf(input.participant.documentId) ?? problemaRg(input.participant.rg ?? '');
  if (problemaDocumento) throw new Error(problemaDocumento);
  // Checado antes da regra dos dias: quem já está na lista não é "aluno novo".
  if (await acharInscrito(training.id, input.participant.documentId)) {
    throw new Error('Já existe um participante com este identificador nesta turma.');
  }
  // Quem entra na lista durante a aula conta como presente no dia aberto. Quem
  // chega depois do 1º dia entra do mesmo jeito: o que decide o certificado é
  // ter todos os dias cumpridos, não a porta de entrada.
  const dia = await diaAbertoParaCheckin(training.id);
  const id = makeId('participant');
  try {
    await d1
      .prepare(`INSERT INTO participants (
        id, training_id, full_name, document_id, rg, birth_date, email, phone, job_title, employee_login, consent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(
        id,
        training.id,
        input.participant.fullName.trim(),
        formatarCpf(input.participant.documentId),
        formatarRg(input.participant.rg ?? '', input.participant.documentId),
        (input.participant.birthDate ?? '').trim(),
        normalizeEmail(input.participant.email),
        input.participant.phone.trim(),
        (input.participant.jobTitle ?? '').trim(),
        (input.participant.employeeLogin ?? '').trim(),
      )
      .run();
  } catch {
    throw new Error('Já existe um participante com este identificador nesta turma.');
  }
  await writeAudit(input.userId, 'participant.added_manually', 'participant', id, { trainingId: training.id });
  const checkin = dia
    ? await registrarCheckin(training.id, { id, full_name: input.participant.fullName.trim() }, dia)
    : null;
  return { id, checkin };
}

export async function removeParticipantByInstructor(input: {
  instructorId: string;
  trainingId: string;
  participantId: string;
  userId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const participant = await d1
    .prepare(`SELECT p.id FROM participants p
      JOIN trainings t ON t.id = p.training_id
      WHERE p.id = ? AND t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`)
    .bind(input.participantId, input.trainingId, input.instructorId)
    .first<{ id: string }>();
  if (!participant) throw new Error('Participante não encontrado.');
  await d1.batch([
    d1.prepare('DELETE FROM session_attendance WHERE participant_id = ?').bind(input.participantId),
    d1.prepare('DELETE FROM participants WHERE id = ?').bind(input.participantId),
  ]);
  await writeAudit(input.userId, 'participant.removed', 'participant', input.participantId, { trainingId: input.trainingId });
}

// ---------------------------------------------------------------------------
// Edição pela gestão: a Space altera qualquer dado de empresa, instrutor,
// treinamento e lista de presença. Tudo fica registrado na Atividade.
// ---------------------------------------------------------------------------

export async function updateClientByAdmin(input: {
  clientId: string;
  byUserId: string;
  name: string;
  legalName: string;
  document: string;
  unit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Ausente = mantém a sigla atual. */
  shortCode?: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const campos = {
    name: (input.name ?? '').trim(),
    legalName: (input.legalName ?? '').trim(),
    document: (input.document ?? '').trim(),
    unit: (input.unit ?? '').trim(),
    contactName: (input.contactName ?? '').trim(),
    contactEmail: normalizeEmail(input.contactEmail ?? ''),
    contactPhone: (input.contactPhone ?? '').trim(),
  };
  if (!campos.name || !campos.legalName || !campos.document || !campos.unit || !campos.contactName || !campos.contactEmail) {
    throw new Error('Preencha todos os campos obrigatórios.');
  }
  const existe = await d1.prepare('SELECT id FROM clients WHERE id = ? LIMIT 1').bind(input.clientId).first<{ id: string }>();
  if (!existe) throw new Error('Cliente não encontrado.');
  const outroCliente = await d1
    .prepare('SELECT name FROM clients WHERE (document = ? OR lower(contact_email) = ?) AND id != ? LIMIT 1')
    .bind(campos.document, campos.contactEmail, input.clientId)
    .first<{ name: string }>();
  if (outroCliente) throw new Error(`Já existe outro cliente com este CNPJ ou e-mail (${outroCliente.name}).`);
  // O e-mail da conta da empresa acompanha o de contato, e não pode ser o de
  // outra conta (instrutor ou equipe). client_id nulo precisa do IS NULL: a
  // comparação com NULL não é verdadeira nem falsa e esconderia o conflito.
  const outraConta = await d1
    .prepare(`SELECT id FROM users WHERE lower(email) = ?
      AND (client_id IS NULL OR client_id != ? OR role != 'client') LIMIT 1`)
    .bind(campos.contactEmail, input.clientId)
    .first<{ id: string }>();
  if (outraConta) throw new Error('Este e-mail já é usado por outra conta de acesso.');
  // Trocar a sigla não mexe no código das turmas que já existem: só as novas usam a nova.
  const atual = await d1.prepare('SELECT short_code FROM clients WHERE id = ?').bind(input.clientId).first<{ short_code: string }>();
  const siglaAtual = atual?.short_code ?? '';
  const sigla = input.shortCode === undefined || normalizarSigla(input.shortCode) === siglaAtual
    ? siglaAtual
    : await siglaParaCliente(d1, input.shortCode, campos.name, input.clientId);
  await d1.batch([
    d1
      .prepare(`UPDATE clients SET name = ?, legal_name = ?, document = ?, unit = ?, contact_name = ?,
        contact_email = ?, contact_phone = ?, short_code = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(campos.name, campos.legalName, campos.document, campos.unit, campos.contactName,
        campos.contactEmail, campos.contactPhone, sigla, input.clientId),
    d1
      .prepare("UPDATE users SET email = ?, name = ? WHERE client_id = ? AND role = 'client'")
      .bind(campos.contactEmail, campos.contactName, input.clientId),
  ]);
  await writeAudit(input.byUserId, 'client.updated_by_company', 'client', input.clientId, { nome: campos.name });
  return { ok: true as const };
}

export async function updateInstructorByAdmin(input: {
  instructorId: string;
  byUserId: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  professionalRegistry: string;
  specialties: string;
  baseCity: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const campos = {
    name: (input.name ?? '').trim(),
    document: (input.document ?? '').trim(),
    email: normalizeEmail(input.email ?? ''),
    phone: (input.phone ?? '').trim(),
    professionalRegistry: (input.professionalRegistry ?? '').trim(),
    specialties: (input.specialties ?? '').trim(),
    baseCity: (input.baseCity ?? '').trim(),
  };
  if (!campos.name || !campos.document || !campos.email) throw new Error('Informe nome, CPF e e-mail do instrutor.');
  const existe = await d1.prepare('SELECT id FROM instructors WHERE id = ? LIMIT 1').bind(input.instructorId).first<{ id: string }>();
  if (!existe) throw new Error('Instrutor não encontrado.');
  const outroInstrutor = await d1
    .prepare('SELECT name FROM instructors WHERE (document = ? OR lower(email) = ?) AND id != ? LIMIT 1')
    .bind(campos.document, campos.email, input.instructorId)
    .first<{ name: string }>();
  if (outroInstrutor) throw new Error(`Já existe outro instrutor com este CPF ou e-mail (${outroInstrutor.name}).`);
  const outraConta = await d1
    .prepare(`SELECT id FROM users WHERE lower(email) = ?
      AND (instructor_id IS NULL OR instructor_id != ? OR role != 'instructor') LIMIT 1`)
    .bind(campos.email, input.instructorId)
    .first<{ id: string }>();
  if (outraConta) throw new Error('Este e-mail já é usado por outra conta de acesso.');
  await d1.batch([
    d1
      .prepare(`UPDATE instructors SET name = ?, document = ?, email = ?, phone = ?, professional_registry = ?,
        specialties = ?, base_city = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(campos.name, campos.document, campos.email, campos.phone, campos.professionalRegistry,
        campos.specialties, campos.baseCity, input.instructorId),
    // O e-mail é o login dele: trocar aqui troca o acesso.
    d1
      .prepare("UPDATE users SET name = ?, email = ? WHERE instructor_id = ? AND role = 'instructor'")
      .bind(campos.name, campos.email, input.instructorId),
  ]);
  // O nome sai impresso nos documentos: as turmas dele pegam o nome novo.
  const turmas = await d1
    .prepare('SELECT DISTINCT training_id FROM training_sessions WHERE instructor_id = ?')
    .bind(input.instructorId)
    .all<{ training_id: string }>();
  for (const linha of rows(turmas)) await sincronizarTurma(linha.training_id);
  await writeAudit(input.byUserId, 'instructor.updated_by_company', 'instructor', input.instructorId, { nome: campos.name });
  return { ok: true as const };
}

export async function updateTrainingByAdmin(input: {
  trainingId: string;
  byUserId: string;
  clientId: string;
  nr: string;
  title: string;
  duration: string;
  location: string;
  contentProgram: string;
  theme?: string;
  /** Tipo da turma; ausente = não mexe. */
  kind?: string;
  /** Meses de validade do certificado; ausente = não mexe. */
  validityMonths?: number;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const campos = {
    clientId: (input.clientId ?? '').trim(),
    nr: (input.nr ?? '').trim(),
    title: (input.title ?? '').trim(),
    duration: (input.duration ?? '').trim(),
    location: (input.location ?? '').trim(),
    contentProgram: (input.contentProgram ?? '').trim(),
    theme: (input.theme ?? '').trim(),
  };
  const meses = input.validityMonths === undefined ? null : Math.trunc(Number(input.validityMonths));
  if (meses !== null && (!Number.isFinite(meses) || meses < 0 || meses > 120)) throw new Error('Validade inválida.');
  if (!campos.clientId || !campos.nr || !campos.title || !campos.duration || !campos.location) {
    throw new Error('Preencha cliente, norma, título, carga horária e endereço.');
  }
  const turma = await d1
    .prepare('SELECT client_id FROM trainings WHERE id = ? LIMIT 1')
    .bind(input.trainingId)
    .first<{ client_id: string }>();
  if (!turma) throw new Error('Treinamento não encontrado.');
  const cliente = await d1.prepare('SELECT id FROM clients WHERE id = ? LIMIT 1').bind(campos.clientId).first<{ id: string }>();
  if (!cliente) throw new Error('Cliente não encontrado.');
  await d1.batch([
    d1
      .prepare(`UPDATE trainings SET client_id = ?, nr = ?, title = ?, duration = ?, location = ?,
        content_program = ?, theme = ? WHERE id = ?`)
      .bind(campos.clientId, campos.nr, campos.title, campos.duration, campos.location, campos.contentProgram, campos.theme, input.trainingId),
    // Arquivos seguem a turma: o cliente novo passa a vê-los no portal dele.
    d1.prepare('UPDATE files SET client_id = ? WHERE training_id = ?').bind(campos.clientId, input.trainingId),
    ...(meses === null ? [] : [d1.prepare('UPDATE trainings SET validity_months = ? WHERE id = ?').bind(meses, input.trainingId)]),
    ...(input.kind === undefined ? [] : [d1.prepare('UPDATE trainings SET kind = ? WHERE id = ?').bind(tipoDaTurma(input.kind), input.trainingId)]),
  ]);
  await writeAudit(input.byUserId, 'training.updated', 'training', input.trainingId, {
    clienteTrocado: turma.client_id !== campos.clientId,
  });
  return { ok: true as const };
}

/**
 * Dias numerados pela data. Passa por números negativos para não esbarrar no
 * índice único (turma, dia) no meio da troca.
 */
async function renumerarDias(trainingId: string) {
  const d1 = getD1();
  const result = await d1
    .prepare('SELECT id FROM training_sessions WHERE training_id = ? ORDER BY session_date ASC, day_number ASC')
    .bind(trainingId)
    .all<{ id: string }>();
  const ids = rows(result).map((linha) => linha.id);
  if (ids.length === 0) return;
  await d1.batch([
    ...ids.map((id, indice) => d1.prepare('UPDATE training_sessions SET day_number = ? WHERE id = ?').bind(-(indice + 1), id)),
    ...ids.map((id, indice) => d1.prepare('UPDATE training_sessions SET day_number = ? WHERE id = ?').bind(indice + 1, id)),
  ]);
}

export async function addTrainingDayByAdmin(input: {
  trainingId: string;
  byUserId: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorId: string | null;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  if (!DATA_ISO.test(input.date ?? '')) throw new Error('Informe uma data válida para o dia.');
  const turma = await d1.prepare('SELECT id FROM trainings WHERE id = ? LIMIT 1').bind(input.trainingId).first<{ id: string }>();
  if (!turma) throw new Error('Treinamento não encontrado.');
  if (input.instructorId) {
    const instrutor = await d1
      .prepare("SELECT id FROM instructors WHERE id = ? AND status IN ('active', 'invited') LIMIT 1")
      .bind(input.instructorId)
      .first<{ id: string }>();
    if (!instrutor) throw new Error('Selecione um instrutor aprovado.');
  }
  const repetido = await d1
    .prepare('SELECT id FROM training_sessions WHERE training_id = ? AND session_date = ? LIMIT 1')
    .bind(input.trainingId, input.date)
    .first<{ id: string }>();
  if (repetido) throw new Error('Esta turma já tem um dia nesta data.');
  const maior = await d1
    .prepare('SELECT COALESCE(MAX(day_number), 0) AS n FROM training_sessions WHERE training_id = ?')
    .bind(input.trainingId)
    .first<{ n: number }>();
  await d1
    .prepare(`INSERT INTO training_sessions (
      id, training_id, day_number, session_date, start_time, end_time, instructor_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`)
    .bind(makeId('session'), input.trainingId, Number(maior?.n ?? 0) + 1, input.date,
      (input.startTime ?? '').trim(), (input.endTime ?? '').trim(), input.instructorId || null)
    .run();
  await renumerarDias(input.trainingId);
  await sincronizarTurma(input.trainingId);
  await writeAudit(input.byUserId, 'training.day_added', 'training', input.trainingId, { data: input.date });
  return { ok: true as const };
}

export async function removeTrainingDayByAdmin(input: { trainingId: string; sessionId: string; byUserId: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  const sessoes = await listTrainingSessions(input.trainingId);
  const dia = sessoes.find((item) => item.id === input.sessionId);
  if (!dia) throw new Error('Dia do treinamento não encontrado.');
  if (sessoes.length === 1) throw new Error('A turma precisa de pelo menos um dia. Para cancelar tudo, exclua o treinamento.');
  const presencas = await d1
    .prepare('SELECT count(*) AS n FROM session_attendance WHERE session_id = ?')
    .bind(dia.id)
    .first<{ n: number }>();
  await d1.batch([
    d1.prepare('DELETE FROM session_attendance WHERE session_id = ?').bind(dia.id),
    d1.prepare('UPDATE files SET session_id = NULL WHERE session_id = ?').bind(dia.id),
    d1.prepare('DELETE FROM training_sessions WHERE id = ?').bind(dia.id),
  ]);
  await renumerarDias(input.trainingId);
  await sincronizarTurma(input.trainingId);
  await writeAudit(input.byUserId, 'training.day_removed', 'training', input.trainingId, {
    dia: dia.day_number,
    data: dia.session_date,
    presencasRemovidas: Number(presencas?.n ?? 0),
  });
  return { ok: true as const };
}

type DadosParticipanteGestao = {
  fullName: string;
  documentId: string;
  rg: string;
  birthDate: string;
  email: string;
  phone: string;
  /** Saiu dos formulários em 26/09/2026: sem ele, a edição mantém o que já havia. */
  jobTitle?: string;
  /** Login interno, só de cliente Amazon. Sem ele, a edição mantém o atual. */
  employeeLogin?: string;
};

function validarParticipante(dados: DadosParticipanteGestao) {
  if (!(dados.fullName ?? '').trim()) throw new Error('Informe o nome completo do participante.');
  const problema = problemaCpf(dados.documentId ?? '') ?? problemaRg(dados.rg ?? '');
  if (problema) throw new Error(problema);
}

/** A gestão inclui na lista sem as travas do check-in; a presença é marcada à parte. */
export async function addParticipantByAdmin(input: {
  trainingId: string;
  byUserId: string;
  participant: DadosParticipanteGestao;
}) {
  await ensurePortalSchema();
  const turma = await getD1().prepare('SELECT id FROM trainings WHERE id = ? LIMIT 1').bind(input.trainingId).first<{ id: string }>();
  if (!turma) throw new Error('Treinamento não encontrado.');
  validarParticipante(input.participant);
  if (await acharInscrito(input.trainingId, input.participant.documentId)) {
    throw new Error('Já existe um participante com este CPF nesta turma.');
  }
  const id = makeId('participant');
  const dados = input.participant;
  await getD1()
    .prepare(`INSERT INTO participants (
      id, training_id, full_name, document_id, rg, birth_date, email, phone, job_title, employee_login, consent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .bind(id, input.trainingId, dados.fullName.trim(), formatarCpf(dados.documentId), formatarRg(dados.rg, dados.documentId),
      (dados.birthDate ?? '').trim(), normalizeEmail(dados.email ?? ''), (dados.phone ?? '').trim(), (dados.jobTitle ?? '').trim(),
      (dados.employeeLogin ?? '').trim())
    .run();
  await writeAudit(input.byUserId, 'participant.added_by_company', 'participant', id, { trainingId: input.trainingId });
  return { id };
}

export async function updateParticipantByAdmin(input: {
  participantId: string;
  byUserId: string;
  participant: DadosParticipanteGestao;
}) {
  await ensurePortalSchema();
  const atual = await getD1()
    .prepare('SELECT id, training_id FROM participants WHERE id = ? LIMIT 1')
    .bind(input.participantId)
    .first<{ id: string; training_id: string }>();
  if (!atual) throw new Error('Participante não encontrado.');
  validarParticipante(input.participant);
  const mesmoCpf = await acharInscrito(atual.training_id, input.participant.documentId);
  if (mesmoCpf && mesmoCpf.id !== atual.id) throw new Error('Já existe outro participante com este CPF nesta turma.');
  const dados = input.participant;
  await getD1()
    // Campo que o formulário não mandou fica como estava (COALESCE com null).
    .prepare(`UPDATE participants SET full_name = ?, document_id = ?, rg = ?, birth_date = ?, email = ?,
      phone = ?, job_title = COALESCE(?, job_title), employee_login = COALESCE(?, employee_login) WHERE id = ?`)
    .bind(dados.fullName.trim(), formatarCpf(dados.documentId), formatarRg(dados.rg, dados.documentId),
      (dados.birthDate ?? '').trim(), normalizeEmail(dados.email ?? ''), (dados.phone ?? '').trim(),
      dados.jobTitle === undefined ? null : dados.jobTitle.trim(),
      dados.employeeLogin === undefined ? null : dados.employeeLogin.trim(), atual.id)
    .run();
  await writeAudit(input.byUserId, 'participant.updated_by_company', 'participant', atual.id, { trainingId: atual.training_id });
  return { ok: true as const };
}

export async function removeParticipantByAdmin(input: { participantId: string; byUserId: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  const atual = await d1
    .prepare('SELECT id, training_id, full_name FROM participants WHERE id = ? LIMIT 1')
    .bind(input.participantId)
    .first<{ id: string; training_id: string; full_name: string }>();
  if (!atual) throw new Error('Participante não encontrado.');
  await d1.batch([
    d1.prepare('DELETE FROM session_attendance WHERE participant_id = ?').bind(atual.id),
    d1.prepare('DELETE FROM participants WHERE id = ?').bind(atual.id),
  ]);
  await writeAudit(input.byUserId, 'participant.removed_by_company', 'participant', atual.id, {
    trainingId: atual.training_id,
    nome: atual.full_name,
  });
  return { ok: true as const };
}

/**
 * A gestão marca ou desmarca a presença de um dia. Sem as travas do check-in:
 * é o caminho para quem esteve na aula e não conseguiu escanear o QR.
 */
export async function setAttendanceByAdmin(input: {
  participantId: string;
  sessionId: string;
  present: boolean;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const alvo = await d1
    .prepare(`SELECT p.id, p.training_id, s.day_number FROM participants p
      JOIN training_sessions s ON s.training_id = p.training_id
      WHERE p.id = ? AND s.id = ? LIMIT 1`)
    .bind(input.participantId, input.sessionId)
    .first<{ id: string; training_id: string; day_number: number }>();
  if (!alvo) throw new Error('Participante ou dia não encontrado nesta turma.');
  if (input.present) {
    await d1
      .prepare('INSERT OR IGNORE INTO session_attendance (id, session_id, participant_id) VALUES (?, ?, ?)')
      .bind(makeId('attendance'), input.sessionId, input.participantId)
      .run();
  } else {
    await d1
      .prepare('DELETE FROM session_attendance WHERE session_id = ? AND participant_id = ?')
      .bind(input.sessionId, input.participantId)
      .run();
  }
  await writeAudit(input.byUserId, 'attendance.set_by_company', 'participant', input.participantId, {
    trainingId: alvo.training_id,
    dia: alvo.day_number,
    presente: input.present,
  });
  return { ok: true as const };
}

/**
 * Chamada em campo: o instrutor marca presente ou ausente no dia DELE, com o
 * dia já iniciado. É o mesmo registro do check-in pelo QR — marcar presente
 * aqui equivale ao aluno ter lido o QR; ausente apaga a presença do dia.
 */
export async function setAttendanceByInstructor(input: {
  instructorId: string;
  trainingId: string;
  participantId: string;
  present: boolean;
  userId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const turma = await d1
    .prepare(`SELECT t.id FROM trainings t WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string }>();
  if (!turma) throw new Error('Treinamento não encontrado para este instrutor.');
  const dia = await diaDoInstrutor(input.trainingId, input.instructorId);
  if (!dia) throw new Error('Nenhum dia deste treinamento está atribuído a você.');
  if (dia.atual.status !== 'in_progress') {
    throw new Error(dia.atual.status === 'completed' ? 'O seu dia já foi encerrado.' : 'Inicie o seu dia antes de fazer a chamada.');
  }
  const aluno = await d1
    .prepare('SELECT id FROM participants WHERE id = ? AND training_id = ? LIMIT 1')
    .bind(input.participantId, input.trainingId)
    .first<{ id: string }>();
  if (!aluno) throw new Error('Participante não encontrado nesta turma.');
  if (input.present) {
    await d1
      .prepare('INSERT OR IGNORE INTO session_attendance (id, session_id, participant_id) VALUES (?, ?, ?)')
      .bind(makeId('attendance'), dia.atual.id, input.participantId)
      .run();
  } else {
    await d1
      .prepare('DELETE FROM session_attendance WHERE session_id = ? AND participant_id = ?')
      .bind(dia.atual.id, input.participantId)
      .run();
  }
  await writeAudit(input.userId, 'attendance.set_by_instructor', 'participant', input.participantId, {
    trainingId: input.trainingId,
    dia: dia.atual.day_number,
    presente: input.present,
  });
  return { ok: true as const, sessionId: dia.atual.id };
}

/** Validade do certificado da turma, em meses (0 = não informada). Só portal. */
export async function setTrainingValidity(input: { trainingId: string; months: number; byUserId: string }) {
  await ensurePortalSchema();
  const meses = Math.trunc(Number(input.months));
  if (!Number.isFinite(meses) || meses < 0 || meses > 120) throw new Error('Validade inválida.');
  const result = await getD1()
    .prepare('UPDATE trainings SET validity_months = ? WHERE id = ?')
    .bind(meses, input.trainingId)
    .run();
  if (!result.meta?.changes) throw new Error('Treinamento não encontrado.');
  await writeAudit(input.byUserId, 'training.validity_set', 'training', input.trainingId, { meses });
  return { ok: true as const };
}

export const STATUS_SOLICITACAO = ['open', 'scheduled', 'declined'] as const;
export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number];

/** Pedido de nova turma feito pela empresa no portal. */
export async function createTrainingRequest(input: {
  clientId: string;
  userId: string;
  nr: string;
  title: string;
  participants: number;
  preferredPeriod: string;
  location: string;
  notes: string;
  basedOnTrainingId?: string | null;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const nr = (input.nr ?? '').trim();
  if (!nr) throw new Error('Escolha a norma do treinamento.');
  const participantes = Math.trunc(Number(input.participants) || 0);
  if (participantes < 0 || participantes > 9999) throw new Error('Número de participantes inválido.');
  let base: string | null = null;
  if (input.basedOnTrainingId) {
    const turma = await findTrainingForClient({ clientId: input.clientId, trainingId: input.basedOnTrainingId });
    base = turma ? input.basedOnTrainingId : null;
  }
  const id = makeId('request');
  await d1
    .prepare(`INSERT INTO training_requests (
      id, client_id, requested_by, nr, title, participants, preferred_period,
      location, notes, based_on_training_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`)
    .bind(
      id,
      input.clientId,
      input.userId,
      nr,
      (input.title ?? '').trim().slice(0, 200),
      participantes,
      (input.preferredPeriod ?? '').trim().slice(0, 200),
      (input.location ?? '').trim().slice(0, 300),
      (input.notes ?? '').trim().slice(0, 2000),
      base,
    )
    .run();
  await writeAudit(input.userId, 'training_request.created', 'training_request', id, { nr, participantes });
  return { id };
}

export async function setTrainingRequestStatus(input: { requestId: string; status: string; byUserId: string }) {
  await ensurePortalSchema();
  if (!STATUS_SOLICITACAO.includes(input.status as StatusSolicitacao)) throw new Error('Situação inválida.');
  const result = await getD1()
    .prepare('UPDATE training_requests SET status = ? WHERE id = ?')
    .bind(input.status, input.requestId)
    .run();
  if (!result.meta?.changes) throw new Error('Solicitação não encontrada.');
  await writeAudit(input.byUserId, 'training_request.status', 'training_request', input.requestId, { status: input.status });
  return { ok: true as const };
}

/**
 * Conteúdo programático padrão de uma norma: vale para as próximas turmas dela.
 * Texto vazio apaga o padrão da equipe, e a norma volta ao do catálogo.
 */
export async function saveProgramTemplate(input: { nr: string; content: string; byUserId: string }) {
  await ensurePortalSchema();
  const nr = (input.nr ?? '').trim().slice(0, 60);
  if (!nr) throw new Error('Norma não informada.');
  const content = (input.content ?? '').trim().slice(0, 8000);
  const d1 = getD1();
  if (!content) {
    await d1.prepare('DELETE FROM program_templates WHERE nr = ?').bind(nr).run();
  } else {
    await d1
      .prepare(`INSERT INTO program_templates (nr, content, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(nr) DO UPDATE SET content = excluded.content, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
      .bind(nr, content, input.byUserId)
      .run();
  }
  await writeAudit(input.byUserId, 'program_template.saved', 'program_template', nr, { tamanho: content.length });
  return { ok: true as const };
}

/* ─── Foto de perfil e logo ──────────────────────────────────────────────── */

const COLUNA_DA_FOTO = {
  instrutor: { tabela: 'instructors', coluna: 'photo_key' },
  equipe: { tabela: 'users', coluna: 'photo_key' },
  cliente: { tabela: 'clients', coluna: 'logo_key' },
} as const;

/** Chave do arquivo da foto; '' quando não tem, null quando o dono não existe. */
export async function getPhotoKey(tipo: TipoDeFoto, id: string) {
  await ensurePortalSchema();
  if (!Object.hasOwn(COLUNA_DA_FOTO, tipo)) return null;
  const { tabela, coluna } = COLUNA_DA_FOTO[tipo];
  const linha = await getD1().prepare(`SELECT ${coluna} AS chave FROM ${tabela} WHERE id = ? LIMIT 1`).bind(id).first<{ chave: string }>();
  return linha ? linha.chave ?? '' : null;
}

/** Grava a chave nova ('' remove) e devolve a anterior, para a rota apagar o arquivo velho. */
export async function setPhotoKey(input: { tipo: TipoDeFoto; id: string; chave: string; byUserId: string }) {
  const anterior = await getPhotoKey(input.tipo, input.id);
  if (anterior === null) throw new Error('Cadastro não encontrado.');
  const { tabela, coluna } = COLUNA_DA_FOTO[input.tipo];
  await getD1().prepare(`UPDATE ${tabela} SET ${coluna} = ? WHERE id = ?`).bind(input.chave, input.id).run();
  await writeAudit(input.byUserId, input.chave ? 'photo.updated' : 'photo.removed', tabela.replace(/s$/, ''), input.id, {});
  return { anterior };
}

/* ─── Checklist operacional da turma ─────────────────────────────────────── */

/** A equipe define os itens do checklist de uma norma. Lista vazia apaga o checklist dela. */
export async function saveChecklistTemplate(input: { nr: string; items: string; byUserId: string }) {
  await ensurePortalSchema();
  const nr = (input.nr ?? '').trim().slice(0, 60);
  if (!nr) throw new Error('Norma não informada.');
  const itens = itensDoTexto(input.items).slice(0, 40);
  const d1 = getD1();
  if (!itens.length) {
    await d1.prepare('DELETE FROM checklist_templates WHERE nr = ?').bind(nr).run();
  } else {
    await d1
      .prepare(`INSERT INTO checklist_templates (nr, items, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(nr) DO UPDATE SET items = excluded.items, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
      .bind(nr, itens.join('\n'), input.byUserId)
      .run();
  }
  await writeAudit(input.byUserId, 'checklist_template.saved', 'checklist_template', nr, { itens: itens.length });
  return { ok: true as const };
}

/**
 * Marca ou desmarca um item do checklist da turma. Com `instructorId`, só vale
 * para instrutor escalado em algum dia dela; sem, é a equipe.
 */
export async function setTrainingChecklistItem(input: { trainingId: string; item: string; done: boolean; byUserId: string; instructorId?: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  const turma = input.instructorId
    ? await d1.prepare(`SELECT t.nr FROM trainings t WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`).bind(input.trainingId, input.instructorId).first<{ nr: string }>()
    : await d1.prepare('SELECT nr FROM trainings WHERE id = ? LIMIT 1').bind(input.trainingId).first<{ nr: string }>();
  if (!turma) throw new Error('Turma não encontrada.');
  const modelo = await d1.prepare('SELECT items FROM checklist_templates WHERE nr = ? LIMIT 1').bind(turma.nr).first<{ items: string }>();
  const item = (input.item ?? '').trim();
  if (!itensDoTexto(modelo?.items ?? '').includes(item)) throw new Error('Este item não está no checklist da norma.');
  if (input.done) {
    await d1
      .prepare('INSERT OR IGNORE INTO training_checklist (training_id, item, done_by) VALUES (?, ?, ?)')
      .bind(input.trainingId, item, input.byUserId)
      .run();
  } else {
    await d1.prepare('DELETE FROM training_checklist WHERE training_id = ? AND item = ?').bind(input.trainingId, item).run();
  }
  return { ok: true as const };
}

/* ─── Documentos avulsos (laudo etc.) e pedidos de documento ─────────────── */

const STATUS_PEDIDO_DOCUMENTO = ['open', 'sent', 'declined'] as const;

/** O cliente pede um documento que não é de turma (ex.: laudo de insalubridade). */
export async function createDocumentRequest(input: { clientId: string; userId: string; title: string; notes: string }) {
  await ensurePortalSchema();
  const title = (input.title ?? '').trim().slice(0, 200);
  if (!title) throw new Error('Diga qual documento você precisa.');
  const id = makeId('docreq');
  await getD1()
    .prepare(`INSERT INTO document_requests (id, client_id, requested_by, title, notes, status)
      VALUES (?, ?, ?, ?, ?, 'open')`)
    .bind(id, input.clientId, input.userId, title, (input.notes ?? '').trim().slice(0, 2000))
    .run();
  await writeAudit(input.userId, 'document_request.created', 'document_request', id, { title });
  return { id };
}

export async function setDocumentRequestStatus(input: { requestId: string; status: string; byUserId: string }) {
  await ensurePortalSchema();
  if (!STATUS_PEDIDO_DOCUMENTO.includes(input.status as (typeof STATUS_PEDIDO_DOCUMENTO)[number])) throw new Error('Situação inválida.');
  const result = await getD1()
    .prepare(`UPDATE document_requests SET status = ?, answered_at = CASE WHEN ? = 'open' THEN NULL ELSE datetime('now') END WHERE id = ?`)
    .bind(input.status, input.status, input.requestId)
    .run();
  if (!result.meta?.changes) throw new Error('Pedido não encontrado.');
  await writeAudit(input.byUserId, 'document_request.status', 'document_request', input.requestId, { status: input.status });
  return { ok: true as const };
}

/**
 * Registra o documento já gravado no disco. Se responde a um pedido do mesmo
 * cliente, o pedido fecha como "enviado" e aponta para o documento.
 */
export async function registerClientDocument(input: {
  id: string;
  clientId: string;
  requestId: string | null;
  title: string;
  name: string;
  objectKey: string;
  contentType: string;
  size: number;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  let pedido: string | null = null;
  if (input.requestId) {
    const achado = await d1.prepare('SELECT id FROM document_requests WHERE id = ? AND client_id = ? LIMIT 1').bind(input.requestId, input.clientId).first<{ id: string }>();
    if (!achado) throw new Error('O pedido escolhido não é deste cliente.');
    pedido = achado.id;
  }
  const comandos = [
    d1
      .prepare(`INSERT INTO client_documents (id, client_id, request_id, title, name, object_key, content_type, size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(input.id, input.clientId, pedido, input.title.trim().slice(0, 200), input.name, input.objectKey, input.contentType, input.size, input.byUserId),
  ];
  if (pedido) {
    comandos.push(d1
      .prepare(`UPDATE document_requests SET status = 'sent', document_id = ?, answered_at = datetime('now') WHERE id = ?`)
      .bind(input.id, pedido));
  }
  await d1.batch(comandos);
  await writeAudit(input.byUserId, 'client_document.uploaded', 'client', input.clientId, { documento: input.id, titulo: input.title, pedido });
  return { id: input.id };
}

type LinhaDocumentoAvulso = { id: string; client_id: string; request_id: string | null; title: string; name: string; object_key: string; content_type: string; size: number; created_at: string };

/** Só a equipe e o próprio cliente abrem o documento avulso. */
export async function findClientDocumentForUser(input: { documentId: string; user: StoredUser }) {
  await ensurePortalSchema();
  const doc = await getD1()
    .prepare('SELECT id, client_id, request_id, title, name, object_key, content_type, size, created_at FROM client_documents WHERE id = ? LIMIT 1')
    .bind(input.documentId)
    .first<LinhaDocumentoAvulso>();
  if (!doc) return null;
  if (input.user.role === 'admin') return doc;
  if (input.user.role === 'client' && input.user.client_id === doc.client_id) return doc;
  return null;
}

/** Apaga a linha e devolve a chave, para a rota apagar o arquivo. Pedido respondido por ele volta a ficar em aberto. */
export async function deleteClientDocument(input: { documentId: string; byUserId: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  const doc = await d1.prepare('SELECT id, client_id, object_key, request_id FROM client_documents WHERE id = ? LIMIT 1').bind(input.documentId).first<{ id: string; client_id: string; object_key: string; request_id: string | null }>();
  if (!doc) throw new Error('Documento não encontrado.');
  await d1.batch([
    d1.prepare('DELETE FROM client_documents WHERE id = ?').bind(doc.id),
    d1.prepare(`UPDATE document_requests SET status = 'open', document_id = NULL, answered_at = NULL WHERE document_id = ?`).bind(doc.id),
  ]);
  await writeAudit(input.byUserId, 'client_document.deleted', 'client', doc.client_id, { documento: doc.id });
  return { objectKey: doc.object_key };
}

const TABELA_DA_SOLICITACAO = { portal: 'training_requests', site: 'site_leads', documento: 'document_requests' } as const;
export type OrigemDaSolicitacao = keyof typeof TABELA_DA_SOLICITACAO;

/**
 * A equipe exclui uma solicitação de qualquer origem. A linha inteira vai para
 * o registro de atividade antes de sair, para dar para saber o que foi pedido.
 * Documento já enviado em resposta a um pedido continua com o cliente.
 */
export async function deleteRequest(input: { origem: OrigemDaSolicitacao; requestId: string; byUserId: string }) {
  await ensurePortalSchema();
  // O nome da tabela entra no SQL: só vale uma das três chaves, nada herdado.
  if (!Object.hasOwn(TABELA_DA_SOLICITACAO, input.origem)) throw new Error('Tipo de solicitação inválido.');
  const tabela = TABELA_DA_SOLICITACAO[input.origem];
  const d1 = getD1();
  const linha = await d1.prepare(`SELECT * FROM ${tabela} WHERE id = ? LIMIT 1`).bind(input.requestId).first<Record<string, unknown>>();
  if (!linha) throw new Error('Solicitação não encontrada.');
  const comandos = [d1.prepare(`DELETE FROM ${tabela} WHERE id = ?`).bind(input.requestId)];
  if (input.origem === 'documento') {
    comandos.push(d1.prepare('UPDATE client_documents SET request_id = NULL WHERE request_id = ?').bind(input.requestId));
  }
  await d1.batch(comandos);
  await writeAudit(input.byUserId, `${tabela.replace(/s$/, '')}.deleted`, tabela.replace(/s$/, ''), input.requestId, linha);
  return { ok: true as const };
}

/** Grava o pedido de proposta do formulário do site. Os dados já chegam validados. */
export async function registerSiteLead(input: Proposta & { id: string; origem: string }) {
  await ensurePortalSchema();
  await getD1()
    .prepare(`INSERT INTO site_leads (
      id, name, email, phone, company, document, job_title, company_size, state,
      trainings, participants, modality, deadline, message, origin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      input.id,
      input.nome,
      input.email,
      input.celular,
      input.empresa,
      input.cnpj,
      input.cargo,
      input.tamanho,
      input.uf,
      input.treinamentos.join(','),
      Number(input.participantes) || 0,
      input.modalidade,
      input.prazo,
      input.mensagem,
      input.origem,
    )
    .run();
  return { id: input.id };
}

export async function setSiteLeadStatus(input: { leadId: string; status: string; byUserId: string }) {
  await ensurePortalSchema();
  if (!STATUS_SOLICITACAO.includes(input.status as StatusSolicitacao)) throw new Error('Situação inválida.');
  const result = await getD1()
    .prepare('UPDATE site_leads SET status = ? WHERE id = ?')
    .bind(input.status, input.leadId)
    .run();
  if (!result.meta?.changes) throw new Error('Pedido não encontrado.');
  await writeAudit(input.byUserId, 'site_lead.status', 'site_lead', input.leadId, { status: input.status });
  return { ok: true as const };
}

/** Cargo do funcionário da Space: o dono edita o de qualquer um; cada um, o seu. */
export async function updateEmployeeJobTitle(input: { userId: string; jobTitle: string; byUserId: string; byOwner: boolean }) {
  await ensurePortalSchema();
  if (!input.byOwner && input.userId !== input.byUserId) throw new Error('Só o dono altera o cargo de outra pessoa.');
  const cargo = (input.jobTitle ?? '').trim().slice(0, 80);
  const result = await getD1()
    .prepare("UPDATE users SET job_title = ? WHERE id = ? AND role = 'admin'")
    .bind(cargo, input.userId)
    .run();
  if (!result.meta?.changes) throw new Error('Funcionário não encontrado.');
  await writeAudit(input.byUserId, 'employee.job_title_set', 'user', input.userId, {});
  return { ok: true as const };
}

/** Dados do aviso ao cliente de que os certificados estão no portal. */
export async function getCertificateNoticeInfo(trainingId: string) {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT c.contact_email, c.contact_name, t.nr, t.title, t.code,
      (SELECT cb.participant_count FROM certificate_batches cb
       WHERE cb.training_id = t.id AND cb.status = 'generated'
       ORDER BY cb.generated_at DESC LIMIT 1) AS quantity
      FROM trainings t JOIN clients c ON c.id = t.client_id WHERE t.id = ? LIMIT 1`)
    .bind(trainingId)
    .first<{ contact_email: string; contact_name: string; nr: string; title: string; code: string; quantity: number | null }>();
}

export async function getAttendanceListData(input: {
  trainingId: string;
  user: { id: string; role: string; instructor_id: string | null };
}): Promise<AttendanceListData | null> {
  await ensurePortalSchema();
  const d1 = getD1();
  const isAdmin = input.user.role === 'admin';
  const training = await d1
    .prepare(`SELECT t.id, c.name AS client_name, t.location, t.duration,
      COALESCE(i.name, t.instructor) AS instructor, t.nr, t.title,
      t.training_date, t.training_dates, t.content_program, t.instructor_id,
      CASE WHEN ${INSTRUTOR_NA_TURMA} THEN 1 ELSE 0 END AS meu
      FROM trainings t
      JOIN clients c ON c.id = t.client_id
      LEFT JOIN instructors i ON i.id = t.instructor_id
      WHERE t.id = ? LIMIT 1`)
    .bind(input.user.instructor_id ?? '', input.trainingId)
    .first<{
      id: string; client_name: string; location: string; duration: string;
      instructor: string; nr: string; title: string; training_date: string;
      training_dates: string; content_program: string; instructor_id: string | null;
      meu: number;
    }>();
  if (!training) return null;
  // Qualquer instrutor escalado para um dos dias imprime a lista da turma.
  if (!isAdmin && training.meu !== 1) return null;
  let dates: string[] = [];
  try {
    dates = training.training_dates ? (JSON.parse(training.training_dates) as string[]) : [];
  } catch { dates = []; }
  if (!Array.isArray(dates) || dates.length === 0) dates = [training.training_date];
  const participantsResult = await d1
    .prepare(`SELECT full_name, document_id, rg, birth_date
      FROM participants WHERE training_id = ?
      ORDER BY full_name COLLATE NOCASE ASC`)
    .bind(input.trainingId)
    .all<{ full_name: string; document_id: string; rg: string; birth_date: string }>();
  return {
    training: {
      id: training.id,
      client_name: training.client_name,
      location: training.location,
      duration: training.duration,
      instructor: training.instructor,
      nr: training.nr,
      title: training.title,
      dates,
      content_program: training.content_program,
    },
    participants: rows(participantsResult),
  };
}

export async function updateInstructorProfile(input: {
  instructorId: string;
  userId: string;
  name: string;
  phone: string;
  professionalRegistry: string;
  specialties: string;
  baseCity: string;
}) {
  await ensurePortalSchema();
  if (!input.name.trim()) throw new Error('Informe o nome.');
  const d1 = getD1();
  await d1.batch([
    d1
      .prepare(`UPDATE instructors SET name = ?, phone = ?, professional_registry = ?,
        specialties = ?, base_city = ?, updated_at = datetime('now')
        WHERE id = ?`)
      .bind(
        input.name.trim(),
        input.phone.trim(),
        input.professionalRegistry.trim(),
        input.specialties.trim(),
        input.baseCity.trim(),
        input.instructorId,
      ),
    d1.prepare('UPDATE users SET name = ? WHERE id = ?').bind(input.name.trim(), input.userId),
  ]);
  await writeAudit(input.userId, 'instructor.profile_updated', 'instructor', input.instructorId, {});
}

/**
 * O cliente edita só o que é dele no dia a dia. Razão social, CNPJ e nome de
 * exibição ficam de fora porque saem impressos na lista de presença; e-mail
 * fica de fora porque é o login.
 */
export async function updateClientProfile(input: {
  clientId: string;
  userId: string;
  unit: string;
  contactName: string;
  contactPhone: string;
}) {
  await ensurePortalSchema();
  if (!input.contactName.trim()) throw new Error('Informe o nome do responsável.');
  if (!input.unit.trim()) throw new Error('Informe a unidade ou cidade.');
  await getD1()
    .prepare(`UPDATE clients
      SET unit = ?, contact_name = ?, contact_phone = ?, updated_at = datetime('now')
      WHERE id = ?`)
    .bind(input.unit.trim(), input.contactName.trim(), input.contactPhone.trim(), input.clientId)
    .run();
  await writeAudit(input.userId, 'client.profile_updated', 'client', input.clientId, {
    contactName: input.contactName.trim(),
  });
}

// ---------------------------------------------------------------------------
// Documentos obrigatórios do instrutor
// ---------------------------------------------------------------------------

export type InstructorDocumentRow = {
  id: string;
  instructor_id: string;
  name: string;
  object_key: string;
  content_type: string;
  size: number;
  category: string;
  status: string;
  created_at: string;
};

export async function listInstructorDocuments(instructorId: string): Promise<InstructorDocumentRow[]> {
  await ensurePortalSchema();
  const result = await getD1()
    .prepare(`SELECT id, instructor_id, name, object_key, content_type, size,
      category, status, created_at
      FROM instructor_documents WHERE instructor_id = ?
      ORDER BY created_at DESC`)
    .bind(instructorId)
    .all<InstructorDocumentRow>();
  return rows(result);
}

/** Reenviar substitui o anterior da mesma categoria: vale sempre o último. */
export async function replaceInstructorDocument(input: {
  instructorId: string;
  category: string;
  name: string;
  objectKey: string;
  contentType: string;
  size: number;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const previous = await d1
    .prepare('SELECT id, object_key FROM instructor_documents WHERE instructor_id = ? AND category = ?')
    .bind(input.instructorId, input.category)
    .all<{ id: string; object_key: string }>();
  await d1
    .prepare('DELETE FROM instructor_documents WHERE instructor_id = ? AND category = ?')
    .bind(input.instructorId, input.category)
    .run();
  const id = makeId('idoc');
  await d1
    .prepare(`INSERT INTO instructor_documents (
      id, instructor_id, name, object_key, content_type, size, category, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`)
    .bind(id, input.instructorId, input.name, input.objectKey, input.contentType, input.size, input.category)
    .run();
  await writeAudit(input.byUserId, 'instructor.document_uploaded', 'instructor', input.instructorId, {
    category: input.category,
  });
  return { id, replaced: rows(previous).map((item) => item.object_key) };
}

/** Só o dono do documento e a equipe Space podem abrir. */
export async function findInstructorDocumentForUser(input: {
  documentId: string;
  user: StoredUser;
}): Promise<InstructorDocumentRow | null> {
  await ensurePortalSchema();
  const document = await getD1()
    .prepare(`SELECT id, instructor_id, name, object_key, content_type, size,
      category, status, created_at
      FROM instructor_documents WHERE id = ? LIMIT 1`)
    .bind(input.documentId)
    .first<InstructorDocumentRow>();
  if (!document) return null;
  if (input.user.role === 'admin') return document;
  if (input.user.role === 'instructor' && input.user.instructor_id === document.instructor_id) {
    return document;
  }
  return null;
}

export async function setInstructorDocumentStatus(input: {
  documentId: string;
  status: 'approved' | 'rejected';
  byUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const document = await d1
    .prepare('SELECT id, instructor_id, category FROM instructor_documents WHERE id = ? LIMIT 1')
    .bind(input.documentId)
    .first<{ id: string; instructor_id: string; category: string }>();
  if (!document) throw new Error('Documento não encontrado.');
  await d1
    .prepare('UPDATE instructor_documents SET status = ? WHERE id = ?')
    .bind(input.status, input.documentId)
    .run();
  await writeAudit(
    input.byUserId,
    input.status === 'approved' ? 'instructor.document_approved' : 'instructor.document_rejected',
    'instructor',
    document.instructor_id,
    { category: document.category },
  );

  if (input.status === 'approved') {
    const liberado = await activateInstructorIfDocumentsApproved({
      instructorId: document.instructor_id,
      byUserId: input.byUserId,
    });
    return { activated: liberado };
  }
  return { activated: false };
}

/**
 * Aprovado o último documento que faltava, o acesso se libera sozinho. A Space
 * Light ainda pode liberar na mão pelo botão "Aprovar acesso", quando quiser
 * adiantar alguém.
 */
export async function activateInstructorIfDocumentsApproved(input: {
  instructorId: string;
  byUserId: string;
}) {
  const d1 = getD1();
  const placeholders = INSTRUCTOR_DOCUMENT_CATEGORIES.map(() => '?').join(', ');
  const aprovados = await d1
    .prepare(`SELECT count(DISTINCT category) AS total FROM instructor_documents
      WHERE instructor_id = ? AND status = 'approved' AND category IN (${placeholders})`)
    .bind(input.instructorId, ...INSTRUCTOR_DOCUMENT_CATEGORIES)
    .first<{ total: number }>();
  if ((aprovados?.total ?? 0) < INSTRUCTOR_DOCUMENT_CATEGORIES.length) return false;

  const instrutor = await d1
    .prepare('SELECT status FROM instructors WHERE id = ? LIMIT 1')
    .bind(input.instructorId)
    .first<{ status: string }>();
  if (instrutor?.status !== 'pending') return false;

  await d1.batch([
    d1
      .prepare(`UPDATE instructors SET status = 'active', updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'`)
      .bind(input.instructorId),
    d1
      .prepare(`UPDATE users SET active = 1
        WHERE instructor_id = ? AND role = 'instructor'`)
      .bind(input.instructorId),
  ]);
  await writeAudit(
    input.byUserId,
    'instructor.access_approved',
    'instructor',
    input.instructorId,
    { motivo: 'documentos aprovados' },
  );
  return true;
}

export async function listAllInstructorDocuments(): Promise<InstructorDocumentRow[]> {
  await ensurePortalSchema();
  const result = await getD1()
    .prepare(`SELECT id, instructor_id, name, object_key, content_type, size,
      category, status, created_at
      FROM instructor_documents ORDER BY created_at DESC`)
    .all<InstructorDocumentRow>();
  return rows(result);
}

// ---------------------------------------------------------------------------
// Certificados
// ---------------------------------------------------------------------------

export type CertificateData = {
  training: {
    id: string;
    nr: string;
    title: string;
    duration: string;
    /** 'formacao', 'reciclagem' ou '' (turma sem tipo informado). */
    kind: string;
    dates: string[];
  };
  client: {
    legalName: string;
    document: string;
    address: string;
    district: string;
    city: string;
    state: string;
  };
  instructor: {
    name: string;
    registry: string;
    signatureDocumentId: string | null;
  };
  /** Só quem fez check-in em todos os dias: é quem recebe certificado. */
  participants: { fullName: string; rg: string; documentId: string; birthDate: string }[];
  /** Inscritos que faltaram algum dia e ficaram de fora dos documentos. */
  participantsWithMissingDays: number;
  /** Inscritos completos que se certificam noutra turma, a do último dia deles. */
  participantsCertifiedElsewhere: number;
};

/**
 * Só monta os dados. Quem chama é que decide se pode: a página restringe ao
 * admin e a publicação é disparada por quem já foi autorizado antes.
 */
export async function getCertificateData(input: {
  trainingId: string;
}): Promise<CertificateData | null> {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(`SELECT t.id, t.nr, t.title, t.duration, t.kind, t.training_date, t.training_dates,
      t.instructor_id, t.client_id, c.legal_name, c.document AS client_document,
      c.address, c.district, c.city, c.state,
      COALESCE(i.name, t.instructor) AS instructor_name,
      COALESCE(i.professional_registry, '') AS instructor_registry
      FROM trainings t
      JOIN clients c ON c.id = t.client_id
      LEFT JOIN instructors i ON i.id = t.instructor_id
      WHERE t.id = ? LIMIT 1`)
    .bind(input.trainingId)
    .first<{
      id: string; nr: string; title: string; duration: string; kind: string | null;
      training_date: string; training_dates: string; instructor_id: string | null;
      client_id: string; legal_name: string; client_document: string;
      address: string; district: string; city: string; state: string;
      instructor_name: string; instructor_registry: string;
    }>();
  if (!training) return null;


  let dates: string[] = [];
  try {
    dates = training.training_dates ? (JSON.parse(training.training_dates) as string[]) : [];
  } catch { dates = []; }
  if (!Array.isArray(dates) || dates.length === 0) dates = [training.training_date];

  // A assinatura do instrutor é o documento "signature" já aprovado pela Space.
  let signatureDocumentId: string | null = null;
  if (training.instructor_id) {
    const assinatura = await d1
      .prepare(`SELECT id FROM instructor_documents
        WHERE instructor_id = ? AND category = 'signature' AND status = 'approved'
        ORDER BY created_at DESC LIMIT 1`)
      .bind(training.instructor_id)
      .first<{ id: string }>();
    signatureDocumentId = assinatura?.id ?? null;
  }

  // Só quem cumpriu todos os dias — podendo tê-los feito em turmas equivalentes
  // — E que se certifica nesta turma, que é a do último dia. Quem fechou o
  // treinamento em outra turma sai nos documentos de lá, não nos daqui.
  const participantsResult = await d1
    .prepare(`SELECT p.full_name, p.rg, p.document_id, p.birth_date,
      ${PRESENTE_EM_TODOS_OS_DIAS} AS completo,
      ${CERTIFICA_NESTA_TURMA} AS certifica_aqui
      FROM participants p
      WHERE p.training_id = ? ORDER BY p.full_name COLLATE NOCASE ASC`)
    .bind(input.trainingId)
    .all<{ full_name: string; rg: string; document_id: string; birth_date: string; completo: number; certifica_aqui: number }>();
  const inscritos = rows(participantsResult);
  const completos = inscritos.filter((item) => Number(item.completo) === 1 && Number(item.certifica_aqui) === 1);

  return {
    training: {
      id: training.id,
      nr: training.nr,
      title: training.title,
      duration: training.duration,
      kind: training.kind ?? '',
      dates,
    },
    client: {
      legalName: training.legal_name,
      document: training.client_document ?? '',
      address: training.address ?? '',
      district: training.district ?? '',
      city: training.city ?? '',
      state: training.state ?? '',
    },
    instructor: {
      name: training.instructor_name,
      registry: training.instructor_registry,
      signatureDocumentId,
    },
    participantsWithMissingDays: inscritos.filter((item) => Number(item.completo) !== 1).length,
    participantsCertifiedElsewhere: inscritos.filter((item) => Number(item.completo) === 1 && Number(item.certifica_aqui) !== 1).length,
    participants: completos.map((item) => ({
      fullName: item.full_name,
      rg: item.rg,
      documentId: item.document_id,
      birthDate: item.birth_date ?? '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Endereço da edificação (usado no atestado de treinamento)
// ---------------------------------------------------------------------------

export type ClientAddress = {
  address: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
};

export const EMPTY_CLIENT_ADDRESS: ClientAddress = {
  address: '', district: '', city: '', state: '', postalCode: '',
};

export async function updateClientAddress(input: {
  clientId: string;
  byUserId: string;
  address: ClientAddress;
}) {
  await ensurePortalSchema();
  await getD1()
    .prepare(`UPDATE clients
      SET address = ?, district = ?, city = ?, state = ?, postal_code = ?,
          updated_at = datetime('now')
      WHERE id = ?`)
    .bind(
      input.address.address.trim(),
      input.address.district.trim(),
      input.address.city.trim(),
      input.address.state.trim().toUpperCase().slice(0, 2),
      input.address.postalCode.trim(),
      input.clientId,
    )
    .run();
  await writeAudit(input.byUserId, 'client.address_updated', 'client', input.clientId, {});
}

export async function getClientAddress(clientId: string): Promise<ClientAddress> {
  await ensurePortalSchema();
  const row = await getD1()
    .prepare('SELECT address, district, city, state, postal_code FROM clients WHERE id = ? LIMIT 1')
    .bind(clientId)
    .first<{ address: string; district: string; city: string; state: string; postal_code: string }>();
  if (!row) return EMPTY_CLIENT_ADDRESS;
  return {
    address: row.address ?? '',
    district: row.district ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    postalCode: row.postal_code ?? '',
  };
}

// ---------------------------------------------------------------------------
// Exclusões
// ---------------------------------------------------------------------------

export async function deleteTrainingByAdmin(input: { trainingId: string; byUserId: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  // O ON DELETE CASCADE já daria conta, mas depende de foreign_keys ligado —
  // apagar explicitamente evita dia órfão aparecendo na agenda.
  await d1.batch([
    d1
      .prepare('DELETE FROM session_attendance WHERE session_id IN (SELECT id FROM training_sessions WHERE training_id = ?)')
      .bind(input.trainingId),
    d1.prepare('DELETE FROM training_sessions WHERE training_id = ?').bind(input.trainingId),
    d1.prepare('DELETE FROM training_checklist WHERE training_id = ?').bind(input.trainingId),
    d1.prepare('DELETE FROM trainings WHERE id = ?').bind(input.trainingId),
  ]);
  await writeAudit(input.byUserId, 'training.deleted', 'training', input.trainingId, {});
}

export async function deleteClientByAdmin(input: { clientId: string; byUserId: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  await d1.batch([
    d1.prepare("DELETE FROM users WHERE client_id = ? AND role = 'client'").bind(input.clientId),
    d1.prepare('DELETE FROM clients WHERE id = ?').bind(input.clientId),
  ]);
  await writeAudit(input.byUserId, 'client.deleted', 'client', input.clientId, {});
}

export async function deleteInstructorByAdmin(input: { instructorId: string; byUserId: string }) {
  await ensurePortalSchema();
  const d1 = getD1();
  // Os dias dele voltam a ficar sem escala, e o nome sai da turma: deixar o
  // nome de um instrutor excluído gravado sairia impresso nos documentos.
  const afetadas = await d1
    .prepare('SELECT DISTINCT training_id FROM training_sessions WHERE instructor_id = ?')
    .bind(input.instructorId)
    .all<{ training_id: string }>();
  await d1.batch([
    d1.prepare('UPDATE training_sessions SET instructor_id = NULL WHERE instructor_id = ?').bind(input.instructorId),
    d1.prepare("DELETE FROM users WHERE instructor_id = ? AND role = 'instructor'").bind(input.instructorId),
    d1.prepare('DELETE FROM instructors WHERE id = ?').bind(input.instructorId),
  ]);
  for (const linha of rows(afetadas)) await sincronizarTurma(linha.training_id);
  await writeAudit(input.byUserId, 'instructor.deleted', 'instructor', input.instructorId, {});
}

export async function deleteEmployeeByOwner(input: { userId: string; byUserId: string }) {
  await ensurePortalSchema();
  const target = await findUserById(input.userId);
  if (!target || target.role !== 'admin') throw new Error('Funcionário não encontrado.');
  if (isOwnerByEmailOrFlag(target.email, target.is_owner)) throw new Error('A conta do dono não pode ser excluída.');
  if (target.id === input.byUserId) throw new Error('Você não pode excluir a própria conta.');
  await getD1().prepare("DELETE FROM users WHERE id = ? AND role = 'admin'").bind(input.userId).run();
  await writeAudit(input.byUserId, 'employee.deleted', 'user', input.userId, {});
}

// ---------------------------------------------------------------------------
// Equipe Space Light (funcionários) e auditoria
// ---------------------------------------------------------------------------

export function isOwnerByEmailOrFlag(email: string, isOwnerFlag?: number): boolean {
  if (isOwnerFlag === 1) return true;
  const ownerEmail = (process.env.SPACE_ADMIN_EMAIL ?? '').trim().toLowerCase();
  return Boolean(ownerEmail) && email.trim().toLowerCase() === ownerEmail;
}

export async function listEmployees(): Promise<CompanyEmployee[]> {
  await ensurePortalSchema();
  const result = await getD1()
    .prepare(`SELECT id, name, email, is_owner, active, must_reset, job_title,
      last_login_at, created_at
      FROM users WHERE role = 'admin'
      ORDER BY is_owner DESC, created_at ASC`)
    .all<CompanyEmployee>();
  return rows(result);
}

export async function createEmployeeByOwner(input: {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdByUserId: string;
  jobTitle?: string;
}) {
  await ensurePortalSchema();
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) throw new Error('Já existe uma conta com este e-mail.');
  const id = makeId('user');
  await getD1()
    .prepare(`INSERT INTO users (
      id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset, job_title
    ) VALUES (?, NULL, NULL, ?, ?, ?, ?, 'admin', 0, 1, 1, ?)`)
    .bind(id, input.name.trim(), email, input.passwordHash, input.passwordSalt, (input.jobTitle ?? '').trim().slice(0, 80))
    .run();
  await writeAudit(input.createdByUserId, 'employee.created', 'user', id, { email });
  return { userId: id, email };
}

export async function setEmployeeActive(input: {
  userId: string;
  active: boolean;
  byUserId: string;
}) {
  await ensurePortalSchema();
  const target = await findUserById(input.userId);
  if (!target || target.role !== 'admin') {
    throw new Error('Funcionário não encontrado.');
  }
  if (isOwnerByEmailOrFlag(target.email, target.is_owner)) {
    throw new Error('A conta do dono não pode ser desativada.');
  }
  await getD1()
    .prepare(`UPDATE users SET active = ? WHERE id = ? AND role = 'admin'`)
    .bind(input.active ? 1 : 0, input.userId)
    .run();
  await writeAudit(
    input.byUserId,
    input.active ? 'employee.activated' : 'employee.deactivated',
    'user',
    input.userId,
    {},
  );
}

export async function listAuditLogs(limit = 60): Promise<AuditEntry[]> {
  await ensurePortalSchema();
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 60, 1), 200);
  const result = await getD1()
    .prepare(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata,
      a.created_at, u.name AS actor_name, u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${safeLimit}`)
    .all<AuditEntry>();
  return rows(result);
}

/** Os dias de todas as turmas, agrupados por turma, numa consulta só. */
async function sessoesPorTurma(d1: DatabaseBinding, instructorId?: string) {
  const consulta = instructorId
    ? `SELECT s.id, s.training_id, s.day_number, s.session_date, s.start_time,
        s.end_time, s.instructor_id, i.name AS instructor_name, s.status
       FROM training_sessions s
       LEFT JOIN instructors i ON i.id = s.instructor_id
       WHERE EXISTS (SELECT 1 FROM training_sessions meu
         WHERE meu.training_id = s.training_id AND meu.instructor_id = ?)
       ORDER BY s.day_number ASC`
    : `SELECT s.id, s.training_id, s.day_number, s.session_date, s.start_time,
        s.end_time, s.instructor_id, i.name AS instructor_name, s.status
       FROM training_sessions s
       LEFT JOIN instructors i ON i.id = s.instructor_id
       ORDER BY s.day_number ASC`;
  const preparada = d1.prepare(consulta);
  const resultado = await (instructorId ? preparada.bind(instructorId) : preparada).all<TrainingSessionRow>();
  const mapa = new Map<string, TrainingSessionRow[]>();
  for (const dia of rows(resultado)) {
    const lista = mapa.get(dia.training_id);
    if (lista) lista.push(dia); else mapa.set(dia.training_id, [dia]);
  }
  return mapa;
}

export async function getCompanyDashboardData(
  currentUser: { id: string; email: string; is_owner?: number },
): Promise<CompanyDashboardData> {
  await ensurePortalSchema();
  const d1 = getD1();
  const [clientsResult, instructorsResult, instructorAvailabilityResult, trainingsResult, filesResult, participantsResult, sessoes, presencasResult, requestsResult, siteLeadsResult, perfil, avulsosResult, pedidosDocResult, programasResult, checklistsResult, marcasResult] =
    await Promise.all([
      d1
        .prepare(
          `SELECT id, name, legal_name, document, unit, contact_name,
           contact_email, contact_phone, address, district, city, state,
           postal_code, short_code, logo_key, status, created_at,
           (SELECT u.username FROM users u WHERE u.client_id = clients.id AND u.role = 'client'
            ORDER BY u.created_at ASC LIMIT 1) AS username
           FROM clients ORDER BY name COLLATE NOCASE ASC`,
        )
        .all<CompanyClient>(),
      d1
        .prepare(
          `SELECT id, name, document, email, phone, professional_registry,
           specialties, base_city, status, source, photo_key, created_at
           FROM instructors ORDER BY name COLLATE NOCASE ASC`,
        )
        .all<CompanyInstructor>(),
      d1
        .prepare(
          `SELECT a.id, a.instructor_id, i.name AS instructor_name,
           a.available_date, a.note, a.status, a.created_at
           FROM instructor_availability a
           JOIN instructors i ON i.id = a.instructor_id
           WHERE a.status = 'available'
           AND NOT EXISTS (SELECT 1 FROM training_sessions s
             WHERE s.instructor_id = a.instructor_id AND s.session_date = a.available_date)
           ORDER BY a.available_date ASC`,
        )
        .all<CompanyInstructorAvailability>(),
      d1
        .prepare(
          `SELECT t.id, t.client_id, t.instructor_id, c.name AS client_name,
           t.code, t.nr, t.title, t.internal_label, t.theme, t.kind, t.training_date, t.duration, t.location, t.content_program,
           COALESCE(i.name, t.instructor) AS instructor,
           t.status, t.participant_limit, t.qr_token, t.qr_enabled,
           t.created_at, t.validity_months,
           (SELECT max(cb.generated_at) FROM certificate_batches cb
            WHERE cb.training_id = t.id AND cb.status = 'generated') AS certificate_generated_at,
           (SELECT count(*) FROM files f WHERE f.training_id = t.id) AS file_count,
           (SELECT count(*) FROM participants p WHERE p.training_id = t.id) AS participant_count
           FROM trainings t
           JOIN clients c ON c.id = t.client_id
           LEFT JOIN instructors i ON i.id = t.instructor_id
           ORDER BY t.training_date DESC`,
        )
        .all<CompanyTraining>(),
      d1
        .prepare(
          `SELECT f.id, f.client_id, c.name AS client_name, f.training_id,
           t.title AS training_title, t.nr AS training_nr, f.name,
           f.object_key, f.content_type, f.size, f.kind, f.session_id, f.status, f.created_at
           FROM files f
           JOIN clients c ON c.id = f.client_id
           JOIN trainings t ON t.id = f.training_id
           ORDER BY f.created_at DESC`,
        )
        .all<CompanyFile>(),
      d1
        .prepare(
          `SELECT p.id, p.training_id, t.title AS training_title,
           t.nr AS training_nr, c.name AS client_name, p.full_name,
           p.document_id, p.rg, p.birth_date, p.email, p.phone, p.job_title, p.employee_login, p.created_at,
          ${COLUNAS_PRESENCA}
           FROM participants p
           JOIN trainings t ON t.id = p.training_id
           JOIN clients c ON c.id = t.client_id
           ORDER BY p.created_at DESC`,
        )
        .all<CompanyParticipant>(),
      sessoesPorTurma(d1),
      // Presença por dia de cada aluno: a gestão marca e desmarca na lista.
      d1.prepare('SELECT participant_id, session_id FROM session_attendance').all<{ participant_id: string; session_id: string }>(),
      d1
        .prepare(`SELECT r.id, r.client_id, c.name AS client_name, u.name AS requested_by_name,
           r.nr, r.title, r.participants, r.preferred_period, r.location, r.notes,
           r.based_on_training_id, r.status, r.created_at
           FROM training_requests r
           JOIN clients c ON c.id = r.client_id
           LEFT JOIN users u ON u.id = r.requested_by
           ORDER BY r.created_at DESC`)
        .all<CompanyTrainingRequest>(),
      d1
        .prepare(`SELECT id, name, email, phone, company, document, job_title, company_size,
           state, trainings, participants, modality, deadline, message, origin, status, created_at
           FROM site_leads ORDER BY created_at DESC`)
        .all<CompanySiteLead>(),
      d1.prepare('SELECT name, job_title, photo_key FROM users WHERE id = ? LIMIT 1').bind(currentUser.id).first<{ name: string; job_title: string; photo_key: string }>(),
      d1
        .prepare(`SELECT d.id, d.client_id, c.name AS client_name, d.request_id, d.title, d.name, d.content_type, d.size, d.created_at
           FROM client_documents d JOIN clients c ON c.id = d.client_id ORDER BY d.created_at DESC`)
        .all<CompanyClientDocument>(),
      d1
        .prepare(`SELECT r.id, r.client_id, c.name AS client_name, u.name AS requested_by_name, r.title, r.notes, r.status, r.document_id, r.created_at
           FROM document_requests r JOIN clients c ON c.id = r.client_id LEFT JOIN users u ON u.id = r.requested_by
           ORDER BY r.created_at DESC`)
        .all<CompanyDocumentRequest>(),
      d1
        .prepare(`SELECT p.nr, p.content, p.updated_at, u.name AS updated_by_name
           FROM program_templates p LEFT JOIN users u ON u.id = p.updated_by`)
        .all<CompanyProgramTemplate>(),
      d1.prepare('SELECT nr, items FROM checklist_templates').all<ChecklistDaNorma>(),
      d1.prepare('SELECT training_id, item FROM training_checklist').all<MarcaDoChecklist>(),
    ]);

  return {
    clients: rows(clientsResult),
    instructors: rows(instructorsResult),
    instructorAvailability: rows(instructorAvailabilityResult),
    trainings: rows(trainingsResult).map((turma) => ({ ...turma, sessions: sessoes.get(turma.id) ?? [] })),
    files: rows(filesResult),
    participants: rows(participantsResult),
    attendance: rows(presencasResult),
    requests: rows(requestsResult),
    siteLeads: rows(siteLeadsResult),
    clientDocuments: rows(avulsosResult),
    documentRequests: rows(pedidosDocResult),
    programTemplates: rows(programasResult),
    checklistTemplates: rows(checklistsResult),
    checklistMarks: rows(marcasResult),
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    currentUser: {
      id: currentUser.id,
      email: currentUser.email,
      name: perfil?.name ?? 'Equipe Space Light',
      jobTitle: perfil?.job_title ?? '',
      photoKey: perfil?.photo_key ?? '',
      isOwner: isOwnerByEmailOrFlag(currentUser.email, currentUser.is_owner),
    },
  };
}

export type NovoDiaDeTreinamento = {
  date: string;
  startTime?: string;
  endTime?: string;
  instructorId?: string | null;
};

/**
 * A turma nasce com um registro por dia. O instrutor é opcional de propósito:
 * a data costuma ser fechada com o cliente antes de haver escala, e num
 * treinamento de vários dias cada dia pode acabar com um instrutor diferente.
 */
/**
 * Código da turma: sigla do cliente + número da turma dele (PETZ-JAC-03).
 * Cliente sem sigla ganha uma agora. O número parte da quantidade de turmas
 * do cliente e sobe até achar um código livre (turma apagada deixa buraco,
 * e sigla trocada recomeça a contagem sem colidir).
 */
async function proximoCodigoDeTurma(d1: DatabaseBinding, clientId: string) {
  const cliente = await d1.prepare('SELECT name, short_code FROM clients WHERE id = ?').bind(clientId).first<{ name: string; short_code: string }>();
  let sigla = cliente?.short_code ?? '';
  if (!sigla) {
    sigla = await siglaParaCliente(d1, '', cliente?.name ?? '', clientId);
    await d1.prepare('UPDATE clients SET short_code = ? WHERE id = ?').bind(sigla, clientId).run();
  }
  const total = await d1.prepare('SELECT count(*) AS n FROM trainings WHERE client_id = ?').bind(clientId).first<{ n: number }>();
  for (let numero = Number(total?.n ?? 0) + 1; ; numero++) {
    const code = codigoDaTurma(sigla, numero);
    if (!(await d1.prepare('SELECT id FROM trainings WHERE code = ? LIMIT 1').bind(code).first<{ id: string }>())) return code;
  }
}

/** Tipo da turma aceito pelo banco; qualquer outra coisa fica como não informado. */
function tipoDaTurma(valor: string | undefined) {
  return valor === 'formacao' || valor === 'reciclagem' ? valor : '';
}

export async function createTraining(input: {
  clientId: string;
  nr: string;
  /** Título que sai impresso no certificado. */
  title: string;
  /** Nome interno da turma; nunca sai em documento. */
  internalLabel?: string;
  /** Assunto da turma, para o instrutor saber o que preparar. */
  theme?: string;
  /** 'formacao' ou 'reciclagem'; outro valor vira não informado. */
  kind?: string;
  days: NovoDiaDeTreinamento[];
  contentProgram: string;
  duration: string;
  location: string;
  createdByUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const client = await d1
    .prepare('SELECT id FROM clients WHERE id = ? LIMIT 1')
    .bind(input.clientId)
    .first<{ id: string }>();
  if (!client) throw new Error('Cliente não encontrado.');

  const dias = (input.days ?? [])
    .map((dia) => ({
      date: (dia.date ?? '').trim(),
      startTime: (dia.startTime ?? '').trim(),
      endTime: (dia.endTime ?? '').trim(),
      instructorId: dia.instructorId || null,
    }))
    .filter((dia) => DATA_ISO.test(dia.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (dias.length === 0) throw new Error('Informe ao menos uma data para o treinamento.');

  // Confere de uma vez só os instrutores escalados na criação, se houver.
  const escalados = [...new Set(dias.map((dia) => dia.instructorId).filter(Boolean))] as string[];
  const nomes = new Map<string, string>();
  if (escalados.length > 0) {
    const marcadores = escalados.map(() => '?').join(', ');
    const encontrados = await d1
      .prepare(`SELECT id, name FROM instructors
        WHERE id IN (${marcadores}) AND status IN ('active', 'invited')`)
      .bind(...escalados)
      .all<{ id: string; name: string }>();
    for (const linha of rows(encontrados)) nomes.set(linha.id, linha.name);
    if (nomes.size !== escalados.length) throw new Error('Selecione um instrutor aprovado.');
  }

  const primaryDate = dias[0].date;
  const id = makeId('training');
  const code = await proximoCodigoDeTurma(d1, input.clientId);
  const qrToken = `${code}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  // Vale o instrutor do último dia: é ele quem assina o certificado.
  const ultimoEscalado = [...dias].reverse().find((dia) => dia.instructorId);

  await d1.batch([
    d1
      .prepare(`INSERT INTO trainings (
        id, client_id, instructor_id, code, nr, title, internal_label, theme, kind, training_date, training_dates,
        content_program, duration, location, instructor, status, participant_limit, qr_token, qr_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0, ?, 1)`)
      .bind(
        id,
        input.clientId,
        ultimoEscalado?.instructorId ?? null,
        code,
        input.nr.trim(),
        input.title.trim(),
        (input.internalLabel ?? '').trim(),
        (input.theme ?? '').trim(),
        tipoDaTurma(input.kind),
        primaryDate,
        JSON.stringify(dias.map((dia) => dia.date)),
        (input.contentProgram ?? '').trim(),
        input.duration.trim(),
        input.location.trim(),
        ultimoEscalado ? nomes.get(ultimoEscalado.instructorId as string) ?? '' : '',
        qrToken,
      ),
    ...dias.map((dia, indice) =>
      d1
        .prepare(`INSERT INTO training_sessions (
          id, training_id, day_number, session_date, start_time, end_time, instructor_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`)
        .bind(makeId('session'), id, indice + 1, dia.date, dia.startTime, dia.endTime, dia.instructorId),
    ),
  ]);

  await writeAudit(
    input.createdByUserId,
    'training.created',
    'training',
    id,
    { clientId: input.clientId, dias: dias.length },
  );
  return { id, code, qrToken };
}


// ---------------------------------------------------------------------------
// Arquivos com conteúdo real (Vercel Blob)
// ---------------------------------------------------------------------------

export type StoredFileRow = {
  id: string;
  client_id: string;
  training_id: string;
  name: string;
  object_key: string;
  content_type: string;
  size: number;
  kind: string;
  status: string;
  created_at: string;
};

export function newFileId() {
  return makeId('file');
}

/** Confere se o treinamento é mesmo do instrutor logado. */
export async function findTrainingForInstructor(input: {
  trainingId: string;
  instructorId: string;
}) {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT t.id, t.client_id, t.nr, t.title, t.status
      FROM trainings t WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string; client_id: string; nr: string; title: string; status: string }>();
}

export async function registerStoredFile(input: {
  fileId: string;
  clientId: string;
  trainingId: string;
  name: string;
  objectKey: string;
  contentType: string;
  size: number;
  kind: 'photo' | 'document' | 'attendance';
  sessionId?: string | null;
  createdByUserId: string;
}) {
  await ensurePortalSchema();
  await getD1()
    .prepare(`INSERT INTO files (
      id, client_id, training_id, name, object_key, content_type,
      size, kind, session_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'stored')`)
    .bind(
      input.fileId,
      input.clientId,
      input.trainingId,
      input.name,
      input.objectKey,
      input.contentType,
      input.size,
      input.kind,
      input.sessionId ?? null,
    )
    .run();
  await writeAudit(input.createdByUserId, 'file.uploaded', 'training', input.trainingId, {
    fileId: input.fileId,
    kind: input.kind,
  });
}

/** Devolve o arquivo cru para o admin poder apagá-lo do Blob antes da linha. */
/** Confere que o treinamento é mesmo daquele cliente antes de anexar arquivo. */
export async function findTrainingForClient(input: { clientId: string; trainingId: string }) {
  await ensurePortalSchema();
  return getD1()
    .prepare('SELECT id, client_id FROM trainings WHERE id = ? AND client_id = ? LIMIT 1')
    .bind(input.trainingId, input.clientId)
    .first<{ id: string; client_id: string }>();
}

export async function findFileById(fileId: string): Promise<StoredFileRow | null> {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT id, client_id, training_id, name, object_key, content_type,
      size, kind, status, created_at
      FROM files WHERE id = ? LIMIT 1`)
    .bind(fileId)
    .first<StoredFileRow>();
}

export async function deleteFileRow(input: { fileId: string; byUserId: string }) {
  await ensurePortalSchema();
  await getD1().prepare('DELETE FROM files WHERE id = ?').bind(input.fileId).run();
  await writeAudit(input.byUserId, 'file.deleted', 'file', input.fileId, {});
}

export async function listTrainingFiles(trainingId: string): Promise<StoredFileRow[]> {
  await ensurePortalSchema();
  const result = await getD1()
    .prepare(`SELECT id, client_id, training_id, name, object_key, content_type,
      size, kind, status, created_at
      FROM files WHERE training_id = ? ORDER BY created_at DESC`)
    .bind(trainingId)
    .all<StoredFileRow>();
  return rows(result);
}

/**
 * Devolve o arquivo apenas se o usuário puder vê-lo: admin vê tudo,
 * cliente vê o da própria empresa, instrutor vê o das próprias turmas.
 */
export async function findFileForUser(input: {
  fileId: string;
  user: StoredUser;
}): Promise<StoredFileRow | null> {
  await ensurePortalSchema();
  const file = await getD1()
    .prepare(`SELECT id, client_id, training_id, name, object_key, content_type,
      size, kind, status, created_at
      FROM files WHERE id = ? LIMIT 1`)
    .bind(input.fileId)
    .first<StoredFileRow>();
  if (!file) return null;
  const { user } = input;
  if (user.role === 'admin') return file;
  if (user.role === 'client') {
    return user.client_id && user.client_id === file.client_id ? file : null;
  }
  if (user.role === 'instructor' && user.instructor_id) {
    // Documento do cliente não é do escopo do instrutor, mesmo na turma dele.
    // A lista assinada é exceção: foi ele quem enviou, e é o comprovante do
    // trabalho dele. Fica arquivada como documento, mas continua acessível.
    if (file.kind !== 'photo' && file.kind !== 'attendance') return null;
    const owned = await getD1()
      .prepare(`SELECT t.id FROM trainings t WHERE t.id = ? AND ${INSTRUTOR_NA_TURMA} LIMIT 1`)
      .bind(file.training_id, user.instructor_id)
      .first<{ id: string }>();
    return owned ? file : null;
  }
  return null;
}


// ---------------------------------------------------------------------------
// Redefinição de senha por e-mail (token de uso único)
// ---------------------------------------------------------------------------

/**
 * Emite um token novo e invalida os anteriores do mesmo usuário.
 * Devolve null se o usuário já pediu demais nos últimos minutos, para que
 * a rota não vire uma máquina de disparar e-mail.
 */
export async function createPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  ttlMinutes: number;
}): Promise<{ expiresAt: string } | null> {
  await ensurePortalSchema();
  const d1 = getD1();
  const recent = await d1
    .prepare(`SELECT count(*) AS total FROM password_reset_tokens
      WHERE user_id = ? AND created_at > datetime('now', '-15 minutes')`)
    .bind(input.userId)
    .first<{ total: number }>();
  if ((recent?.total ?? 0) >= 3) return null;

  await d1
    .prepare(`UPDATE password_reset_tokens SET used_at = datetime('now')
      WHERE user_id = ? AND used_at IS NULL`)
    .bind(input.userId)
    .run();
  await d1
    .prepare(`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', ?))`)
    .bind(makeId('reset'), input.userId, input.tokenHash, `+${input.ttlMinutes} minutes`)
    .run();
  const created = await d1
    .prepare(`SELECT expires_at FROM password_reset_tokens
      WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(input.userId)
    .first<{ expires_at: string }>();
  return { expiresAt: created?.expires_at ?? '' };
}

/** Só diz se o token serve; não consome. Usado para desenhar a tela. */
export async function findValidResetToken(tokenHash: string) {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT t.id, t.user_id, u.name, u.email
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ? AND t.used_at IS NULL
        AND t.expires_at > datetime('now') AND u.active = 1
      LIMIT 1`)
    .bind(tokenHash)
    .first<{ id: string; user_id: string; name: string; email: string }>();
}

/** Troca a senha e queima o token, em uma coisa só. */
export async function consumePasswordResetToken(input: {
  tokenHash: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const token = await findValidResetToken(input.tokenHash);
  if (!token) throw new Error('Este link expirou ou já foi usado. Peça um novo.');
  const d1 = getD1();
  await d1
    .prepare(`UPDATE users SET password_hash = ?, password_salt = ?, must_reset = 0
      WHERE id = ?`)
    .bind(input.passwordHash, input.passwordSalt, token.user_id)
    .run();
  await d1
    .prepare(`UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`)
    .bind(token.id)
    .run();
  await writeAudit(token.user_id, 'user.password_self_reset', 'user', token.user_id, {
    email: token.email,
  });
  return { userId: token.user_id, email: token.email };
}

export async function findTrainingByToken(token: string) {
  await ensurePortalSchema();
  return getD1()
    .prepare(
      `SELECT t.id, t.client_id, t.instructor_id, c.name AS client_name,
       c.legal_name AS client_legal_name, t.code, t.nr,
       t.title, t.internal_label, t.training_date, t.duration, t.location, t.instructor,
       t.status, t.participant_limit, t.qr_token, t.qr_enabled, t.created_at,
       0 AS file_count,
       (SELECT count(*) FROM participants p WHERE p.training_id = t.id) AS participant_count
       FROM trainings t
       JOIN clients c ON c.id = t.client_id
       WHERE t.qr_token = ? AND t.qr_enabled = 1
       LIMIT 1`,
    )
    .bind(token)
    .first<CompanyTraining>();
}

/** Hoje no fuso da Space: a função roda em UTC, e à noite já seria amanhã. */
function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/**
 * O dia que recebe o check-in: o que o instrutor iniciou (se dois ficaram
 * abertos, o de hoje ou o mais recente); sem nenhum iniciado, o dia com a data
 * de hoje. Fora disso o QR não marca presença.
 */
async function diaAbertoParaCheckin(trainingId: string) {
  const sessoes = await listTrainingSessions(trainingId);
  const hoje = hojeEmSaoPaulo();
  const iniciados = sessoes.filter((dia) => dia.status === 'in_progress');
  return iniciados.find((dia) => dia.session_date === hoje)
    ?? iniciados[iniciados.length - 1]
    ?? sessoes.find((dia) => dia.session_date === hoje)
    ?? null;
}

const SEM_DIA_ABERTO =
  'Nenhum dia deste treinamento está aberto para check-in agora. Fale com o instrutor.';

/** CPF só com dígitos: "123.456.789-00" e "12345678900" são a mesma pessoa. */
function documentoNormalizado(valor: string) {
  const digitos = valor.replace(/\D/g, '');
  return digitos || valor.trim().toLowerCase();
}

/**
 * O inscrito da turma com este CPF. Compara sem pontuação: se o aluno digitasse
 * diferente no 2º dia e virasse outro cadastro, cada metade ficaria com dia
 * faltando e nenhuma receberia certificado.
 */
async function acharInscrito(trainingId: string, documentId: string) {
  const alvo = documentoNormalizado(documentId);
  if (!alvo) return null;
  const result = await getD1()
    .prepare('SELECT id, full_name, document_id FROM participants WHERE training_id = ?')
    .bind(trainingId)
    .all<{ id: string; full_name: string; document_id: string }>();
  return rows(result).find((item) => documentoNormalizado(item.document_id) === alvo) ?? null;
}

/** Grava a presença do aluno no dia. Repetir no mesmo dia só confirma. */
async function registrarCheckin(
  trainingId: string,
  participante: { id: string; full_name: string },
  dia: TrainingSessionRow,
): Promise<CheckinResult> {
  const d1 = getD1();
  const jaTinha = await d1
    .prepare('SELECT 1 AS ok FROM session_attendance WHERE session_id = ? AND participant_id = ? LIMIT 1')
    .bind(dia.id, participante.id)
    .first<{ ok: number }>();
  if (!jaTinha) {
    await d1
      .prepare('INSERT OR IGNORE INTO session_attendance (id, session_id, participant_id) VALUES (?, ?, ?)')
      .bind(makeId('attendance'), dia.id, participante.id)
      .run();
  }
  const contagem = await d1
    .prepare(`SELECT
      (SELECT count(*) FROM training_sessions WHERE training_id = ?) AS total,
      (SELECT count(*) FROM session_attendance a
        JOIN training_sessions s ON s.id = a.session_id
        WHERE a.participant_id = ? AND s.training_id = ?) AS presentes`)
    .bind(trainingId, participante.id, trainingId)
    .first<{ total: number; presentes: number }>();
  return {
    participantId: participante.id,
    fullName: participante.full_name,
    day: dia.day_number,
    totalDays: Number(contagem?.total ?? 0),
    daysPresent: Number(contagem?.presentes ?? 0),
    alreadyCheckedIn: Boolean(jaTinha),
  };
}

/**
 * Check-in só com o CPF, para quem já se inscreveu num dia anterior. Sem
 * cadastro na turma, devolve `found: false` e o formulário pede os dados.
 */
export async function checkinParticipant(token: string, documentId: string) {
  const training = await findTrainingByToken(token);
  if (!training) throw new Error('Este formulário não está disponível.');
  const problemaDocumento = problemaCpf(documentId);
  if (problemaDocumento) throw new Error(problemaDocumento);
  const dia = await diaAbertoParaCheckin(training.id);
  if (!dia) throw new Error(SEM_DIA_ABERTO);
  const inscrito = await acharInscrito(training.id, documentId);
  if (!inscrito) {
    // Aluno novo, inclusive depois do 1º dia: segue para o cadastro.
    return { found: false as const, checkin: null };
  }
  return { found: true as const, checkin: await registrarCheckin(training.id, inscrito, dia) };
}

export async function registerParticipant(
  token: string,
  input: {
    fullName: string;
    documentId: string;
    rg?: string;
    birthDate?: string;
    email: string;
    phone: string;
    /** Saiu do formulário do QR em 26/09/2026; fica para quem ainda mandar. */
    jobTitle?: string;
    employeeLogin?: string;
  },
) {
  const training = await findTrainingByToken(token);
  if (!training) throw new Error('Este formulário não está disponível.');
  // CPF e RG completos, só com números; a pontuação é colocada ao gravar.
  const problemaDocumento = problemaCpf(input.documentId) ?? problemaRg(input.rg ?? '');
  if (problemaDocumento) throw new Error(problemaDocumento);
  const login = (input.employeeLogin ?? '').trim();
  if (clientePedeLogin([training.client_name, training.client_legal_name]) && !login) {
    throw new Error('Informe o seu login da Amazon.');
  }
  const dia = await diaAbertoParaCheckin(training.id);
  if (!dia) throw new Error(SEM_DIA_ABERTO);
  // Já inscrito num dia anterior: vale como check-in, sem duplicar o cadastro.
  const inscrito = await acharInscrito(training.id, input.documentId);
  if (inscrito) {
    return { id: inscrito.id, training, checkin: await registrarCheckin(training.id, inscrito, dia) };
  }
  const id = makeId('participant');
  await getD1()
    .prepare(`INSERT INTO participants (
      id, training_id, full_name, document_id, rg, birth_date, email, phone, job_title, employee_login, consent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .bind(
      id,
      training.id,
      input.fullName.trim(),
      formatarCpf(input.documentId),
      formatarRg(input.rg ?? '', input.documentId),
      (input.birthDate ?? '').trim(),
      normalizeEmail(input.email),
      input.phone.trim(),
      (input.jobTitle ?? '').trim(),
      login,
    )
    .run();
  return {
    id,
    training,
    checkin: await registrarCheckin(training.id, { id, full_name: input.fullName.trim() }, dia),
  };
}

export async function getClientPortalData(
  clientId: string,
): Promise<ClientPortalData | null> {
  await ensurePortalSchema();
  const d1 = getD1();
  const organization = await d1
    .prepare(
      `SELECT id, legal_name, name, document, unit, contact_name,
       contact_email, contact_phone, logo_key
       FROM clients WHERE id = ? AND status != 'suspended' LIMIT 1`,
    )
    .bind(clientId)
    .first<{
      id: string;
      legal_name: string;
      name: string;
      document: string;
      unit: string;
      contact_name: string;
      contact_email: string;
      contact_phone: string;
      logo_key: string;
    }>();
  if (!organization) return null;

  const [trainingResult, fileResult, certificateResult, participantResult, requestResult, avulsoResult, pedidoDocResult] = await Promise.all([
    d1
      .prepare(
        `SELECT t.id, t.client_id, t.code, t.nr, t.title, t.internal_label, t.training_date,
         t.training_dates, t.duration, t.location, t.instructor, t.status, t.validity_months,
         (SELECT max(s.session_date) FROM training_sessions s WHERE s.training_id = t.id) AS last_session,
         (SELECT count(*) FROM training_sessions s WHERE s.training_id = t.id) AS days_total,
         (SELECT count(*) FROM participants p WHERE p.training_id = t.id) AS participant_count,
         (SELECT count(*) FROM files f WHERE f.training_id = t.id AND f.kind = 'photo') AS photo_count,
         (SELECT count(*) FROM files f WHERE f.training_id = t.id AND f.kind IN ('document', 'attendance')) AS document_count,
         (SELECT count(*) FROM certificates ce
          JOIN certificate_batches cb ON cb.id = ce.batch_id
          WHERE cb.training_id = t.id) AS certificate_count
         FROM trainings t WHERE t.client_id = ?
         ORDER BY t.training_date DESC`,
      )
      .bind(clientId)
      .all<{
        id: string;
        client_id: string;
        code: string;
        nr: string;
        title: string;
        training_date: string;
        training_dates: string;
        duration: string;
        location: string;
        instructor: string;
        status: string;
        validity_months: number | null;
        last_session: string | null;
        days_total: number;
        participant_count: number;
        photo_count: number;
        document_count: number;
        certificate_count: number;
      }>(),
    d1
      .prepare(
        `SELECT id, training_id, name, content_type, size, kind, status, created_at
         FROM files WHERE client_id = ? ORDER BY created_at DESC`,
      )
      .bind(clientId)
      .all<{
        id: string;
        training_id: string;
        name: string;
        content_type: string;
        size: number;
        kind: string;
        status: string;
        created_at: string;
      }>(),
    d1
      .prepare(
        `SELECT cb.id, cb.training_id, t.title, t.nr, cb.generated_at,
         cb.participant_count
         FROM certificate_batches cb
         JOIN trainings t ON t.id = cb.training_id
         WHERE t.client_id = ? AND cb.status = 'generated'
         ORDER BY cb.generated_at DESC`,
      )
      .bind(clientId)
      .all<{
        id: string;
        training_id: string;
        title: string;
        nr: string;
        generated_at: string;
        participant_count: number;
      }>(),
    // Participantes da turma para a empresa: nome, função e presença. CPF, RG,
    // nascimento e contato ficam só com a equipe Space.
    d1
      .prepare(
        `SELECT p.id, p.training_id, p.full_name, p.job_title, p.employee_login, t.nr,
         ${COLUNAS_PRESENCA}
         FROM participants p
         JOIN trainings t ON t.id = p.training_id
         WHERE t.client_id = ?
         ORDER BY p.full_name COLLATE NOCASE ASC`,
      )
      .bind(clientId)
      .all<{
        id: string;
        training_id: string;
        full_name: string;
        job_title: string;
        employee_login: string;
        nr: string;
        days_present: number;
        days_total: number;
      }>(),
    d1
      .prepare(
        `SELECT id, nr, title, participants, preferred_period, status, created_at
         FROM training_requests WHERE client_id = ? ORDER BY created_at DESC`,
      )
      .bind(clientId)
      .all<{
        id: string;
        nr: string;
        title: string;
        participants: number;
        preferred_period: string;
        status: string;
        created_at: string;
      }>(),
    d1
      .prepare('SELECT id, title, name, content_type, size, created_at FROM client_documents WHERE client_id = ? ORDER BY created_at DESC')
      .bind(clientId)
      .all<{ id: string; title: string; name: string; content_type: string; size: number; created_at: string }>(),
    d1
      .prepare('SELECT id, title, notes, status, created_at FROM document_requests WHERE client_id = ? ORDER BY created_at DESC')
      .bind(clientId)
      .all<{ id: string; title: string; notes: string; status: string; created_at: string }>(),
  ]);

  const trainings: ClientTraining[] = rows(trainingResult).map((item) => {
    const lastDate = item.last_session || datasDaTurma(item).slice(-1)[0] || item.training_date;
    const validityMonths = Number(item.validity_months ?? 0);
    return {
      id: item.id,
      clientId: item.client_id,
      code: item.code,
      nr: item.nr,
      title: item.title,
      date: item.training_date,
      // Turma de vários dias mostra todos eles, não só o primeiro.
      dateLabel: datasDaTurma(item).map((dia) => formatDate(dia)).join(' · '),
      duration: item.duration,
      location: item.location,
      instructor: item.instructor,
      status:
        item.status === 'completed'
          ? 'Concluído'
          : item.status === 'in_progress'
            ? 'Em andamento'
            : 'Agendado',
      participantCount: item.participant_count,
      photoCount: item.photo_count,
      documentCount: item.document_count,
      certificateCount: item.certificate_count,
      lastDate,
      daysTotal: Math.max(1, item.days_total),
      validityMonths,
      expiresAt: item.status === 'completed' && validityMonths > 0 ? somarMeses(lastDate, validityMonths) : null,
    };
  });

  const arquivosGuardados = rows(fileResult).filter((item) => item.status === 'stored');

  const photos: ClientPhoto[] = arquivosGuardados
    .filter((item) => item.kind === 'photo')
    .map((item) => ({
      id: item.id,
      clientId,
      trainingId: item.training_id,
      src: `/api/files/${item.id}`,
      alt: item.name,
      dateLabel: formatDate(item.created_at),
      createdAt: item.created_at,
    }));

  const documents: ClientDocument[] = arquivosGuardados
    .filter((item) => item.kind === 'document' || item.kind === 'attendance')
    .map((item) => ({
      id: item.id,
      clientId,
      trainingId: item.training_id,
      title: item.name,
      category: item.kind === 'attendance' ? 'Lista de presença assinada' : 'Documento do treinamento',
      format: fileFormat(item.content_type, item.name),
      size: formatSize(item.size),
      updatedAt: formatDate(item.created_at),
      createdAt: item.created_at,
      isCertificate: item.name.startsWith(PREFIXO_CERTIFICADO_ALUNO),
    }));

  // O PDF de cada aluno é achado pelo nome, que é o mesmo que o gerador usa.
  const certificadoPorNome = new Map<string, string>();
  for (const doc of documents) {
    if (doc.isCertificate && doc.trainingId) certificadoPorNome.set(`${doc.trainingId}|${doc.title}`, doc.id);
  }
  const participants: ClientParticipant[] = rows(participantResult).map((item) => ({
    id: item.id,
    trainingId: item.training_id,
    fullName: item.full_name,
    jobTitle: item.job_title,
    employeeLogin: item.employee_login ?? '',
    daysPresent: item.days_present,
    daysTotal: item.days_total,
    certificateFileId: certificadoPorNome.get(`${item.training_id}|${nomeCertificadoAluno(item.full_name, item.nr)}`) ?? null,
  }));

  const certificates: ClientCertificate[] = rows(certificateResult).map(
    (item) => {
      const turma = trainings.find((t) => t.id === item.training_id);
      return {
        id: item.id,
        clientId,
        trainingId: item.training_id,
        title: `Certificados — ${item.title}`,
        reference: `${item.nr} · Lote ${item.id.slice(-8).toUpperCase()}`,
        issuedAt: formatDate(item.generated_at),
        expiresAt: turma?.expiresAt ? formatDate(turma.expiresAt) : 'Não informada',
        quantity: item.participant_count,
      };
    },
  );

  const requests: ClientTrainingRequest[] = rows(requestResult).map((item) => ({
    id: item.id,
    nr: item.nr,
    title: item.title,
    participants: item.participants,
    preferredPeriod: item.preferred_period,
    status: item.status,
    createdAt: item.created_at,
  }));

  const avulsos = rows(avulsoResult).map((item) => ({
    id: item.id,
    title: item.title,
    format: fileFormat(item.content_type, item.name),
    size: formatSize(item.size),
    createdAt: item.created_at,
    updatedAt: formatDate(item.created_at),
  }));
  const documentRequests = rows(pedidoDocResult).map((item) => ({ id: item.id, title: item.title, notes: item.notes, status: item.status, createdAt: item.created_at }));

  return {
    organization: {
      id: organization.id,
      legalName: organization.legal_name,
      displayName: organization.name,
      document: organization.document,
      unit: organization.unit,
      contactName: organization.contact_name,
      contactRole: 'Responsável da empresa',
      email: organization.contact_email,
      phone: organization.contact_phone,
      logoKey: organization.logo_key ?? '',
    },
    trainings,
    photos,
    documents,
    certificates,
    participants,
    requests,
    avulsos,
    documentRequests,
  };
}

/** YYYY-MM-DD + N meses, sem passar por fuso (31/01 + 1 mês = 28 ou 29/02). */
function somarMeses(iso: string, meses: number) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dia, ultimo));
  return alvo.toISOString().slice(0, 10);
}

async function writeAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  await getD1()
    .prepare(`INSERT INTO audit_logs (
      id, user_id, action, entity_type, entity_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(
      makeId('audit'),
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
    )
    .run();
}

function formatDate(value: string) {
  // Datas puras vêm como 2026-09-04; carimbos do banco, como 2026-09-04 00:59:32.
  const normalized = value.includes('T')
    ? value
    : value.includes(' ')
      ? `${value.replace(' ', 'T')}Z`
      : `${value}T12:00:00Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}

function fileFormat(contentType: string, name: string) {
  if (contentType === 'application/pdf') return 'PDF';
  const extension = name.split('.').pop();
  return extension?.toUpperCase() || 'Arquivo';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
