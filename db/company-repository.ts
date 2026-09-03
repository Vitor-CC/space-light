import { getD1 } from '@/db';
import type { DatabaseBinding, DatabaseResult } from '@/db/sqlite-adapter';
import type {
  ClientCertificate,
  ClientDocument,
  ClientPortalData,
  ClientTraining,
} from '@/lib/client-portal-data';
import type {
  AuditEntry,
  CompanyClient,
  CompanyDashboardData,
  CompanyEmployee,
  CompanyFile,
  CompanyInstructor,
  CompanyInstructorAvailability,
  CompanyInstructorDocument,
  CompanyParticipant,
  CompanyTraining,
} from '@/lib/company-types';
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

export function ensurePortalSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  const d1 = getD1();
  schemaPromise = (async () => {
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
        active INTEGER NOT NULL DEFAULT 1,
        must_reset INTEGER NOT NULL DEFAULT 0,
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
        duration TEXT NOT NULL,
        location TEXT NOT NULL,
        instructor TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        participant_limit INTEGER NOT NULL DEFAULT 0,
        qr_token TEXT NOT NULL,
        qr_enabled INTEGER NOT NULL DEFAULT 1,
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
        status TEXT NOT NULL DEFAULT 'registered',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        document_id TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        job_title TEXT NOT NULL DEFAULT '',
        consent INTEGER NOT NULL DEFAULT 0,
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

    await ensureColumn(d1, 'users', 'instructor_id',
      'ALTER TABLE users ADD COLUMN instructor_id TEXT');
    await ensureColumn(d1, 'trainings', 'instructor_id',
      'ALTER TABLE trainings ADD COLUMN instructor_id TEXT');
    await ensureColumn(d1, 'users', 'is_owner',
      'ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0');
    const ownerEmail = (process.env.SPACE_ADMIN_EMAIL ?? '').trim().toLowerCase();
    if (ownerEmail) {
      await d1
        .prepare(`UPDATE users SET is_owner = 1 WHERE lower(email) = ? AND role = 'admin'`)
        .bind(ownerEmail)
        .run();
    }

    await d1.batch([
      d1.prepare(
        'CREATE INDEX IF NOT EXISTS idx_users_instructor_role ON users(instructor_id, role)',
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
    // PRAGMA optimize não é permitido no Turso (ele gerencia isso sozinho);
    // executa apenas no SQLite local.
    if (!process.env.TURSO_DATABASE_URL) {
      await d1.prepare('PRAGMA optimize').run();
    }
  })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  return schemaPromise;
}

async function ensureColumn(
  d1: DatabaseBinding,
  table: string,
  column: string,
  alterSql: string,
) {
  const result = await d1.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!rows(result).some((item) => item.name === column)) {
    await d1.prepare(alterSql).run();
  }
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset
      FROM users WHERE lower(email) = ? LIMIT 1`)
    .bind(normalizeEmail(email))
    .first<StoredUser>();
}

export async function findUserById(
  userId: string,
): Promise<StoredUser | null> {
  await ensurePortalSchema();
  return getD1()
    .prepare(`SELECT id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset
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

export async function createClientByAdmin(input: {
  name: string;
  legalName: string;
  document: string;
  unit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  createdByUserId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const id = makeId('client');
  const userId = makeId('user');
  const email = normalizeEmail(input.contactEmail);
  await d1.batch([
    d1
      .prepare(`INSERT INTO clients (
        id, name, legal_name, document, unit, contact_name, contact_email,
        contact_phone, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'invited', 'admin')`)
      .bind(
        id,
        input.name.trim(),
        input.legalName.trim(),
        input.document.trim(),
        input.unit.trim(),
        input.contactName.trim(),
        email,
        input.contactPhone.trim(),
      ),
    d1
      .prepare(`INSERT INTO users (
        id, client_id, name, email, password_hash, password_salt, role,
        active, must_reset
      ) VALUES (?, ?, ?, ?, ?, ?, 'client', 1, 1)`)
      .bind(
        userId,
        id,
        input.contactName.trim(),
        email,
        input.passwordHash,
        input.passwordSalt,
      ),
  ]);
  await writeAudit(
    input.createdByUserId,
    'client.access_invited',
    'client',
    id,
    { email },
  );
  return { id, userId, email, status: 'invited' as const };
}

export async function selfRegisterClient(input: {
  companyName: string;
  legalName: string;
  document: string;
  unit: string;
  contactName: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const email = normalizeEmail(input.email);
  const existing = await d1
    .prepare(
      'SELECT id FROM clients WHERE document = ? OR lower(contact_email) = ? LIMIT 1',
    )
    .bind(input.document.trim(), email)
    .first<{ id: string }>();
  if (existing) {
    throw new Error(
      'Já existe um cadastro para este CNPJ ou e-mail. Entre em contato com a Space Light.',
    );
  }

  const clientId = makeId('client');
  const userId = makeId('user');
  await d1.batch([
    d1
      .prepare(`INSERT INTO clients (
        id, name, legal_name, document, unit, contact_name, contact_email,
        contact_phone, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'self')`)
      .bind(
        clientId,
        input.companyName.trim(),
        input.legalName.trim(),
        input.document.trim(),
        input.unit.trim(),
        input.contactName.trim(),
        email,
        input.phone.trim(),
      ),
    d1
      .prepare(`INSERT INTO users (
        id, client_id, name, email, password_hash, password_salt, role,
        active, must_reset
      ) VALUES (?, ?, ?, ?, ?, ?, 'client', 0, 0)`)
      .bind(
        userId,
        clientId,
        input.contactName.trim(),
        email,
        input.passwordHash,
        input.passwordSalt,
      ),
  ]);
  await writeAudit(
    userId,
    'client.self_registered',
    'client',
    clientId,
    { email },
  );
  return clientId;
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
      ) VALUES (?, ?, ?, ?, ?, ?, 'instructor', 0, 0)`)
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
      specialties, base_city, status, source, created_at
      FROM instructors WHERE id = ? AND status != 'suspended' LIMIT 1`)
    .bind(currentUser.instructor_id)
    .first<CompanyInstructor>();
  if (!instructor) return null;

  const [trainingsResult, availabilityResult, participantsResult, documentsResult] =
    await Promise.all([
      d1
        .prepare(`SELECT t.id, t.client_id, t.instructor_id,
          c.name AS client_name, t.code, t.nr, t.title, t.training_date,
          t.duration, t.location, COALESCE(i.name, t.instructor) AS instructor,
          t.status, t.participant_limit, t.qr_token, t.qr_enabled,
          t.created_at,
          (SELECT count(*) FROM files f WHERE f.training_id = t.id) AS file_count,
          (SELECT count(*) FROM participants p WHERE p.training_id = t.id) AS participant_count
          FROM trainings t
          JOIN clients c ON c.id = t.client_id
          LEFT JOIN instructors i ON i.id = t.instructor_id
          WHERE t.instructor_id = ?
          ORDER BY t.training_date ASC`)
        .bind(instructor.id)
        .all<CompanyTraining>(),
      d1
        .prepare(`SELECT id, instructor_id, available_date, note, status, created_at
          FROM instructor_availability
          WHERE instructor_id = ? ORDER BY available_date ASC`)
        .bind(instructor.id)
        .all<InstructorAvailability>(),
      d1
        .prepare(`SELECT p.id, p.training_id, t.title AS training_title,
          t.nr AS training_nr, c.name AS client_name, p.full_name,
          p.document_id, p.email, p.phone, p.job_title, p.created_at
          FROM participants p
          JOIN trainings t ON t.id = p.training_id
          JOIN clients c ON c.id = t.client_id
          WHERE t.instructor_id = ?
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
    ]);

  return {
    instructor,
    trainings: rows(trainingsResult),
    availability: rows(availabilityResult),
    documents: rows(documentsResult),
    participants: rows(participantsResult),
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.availableDate)) {
    throw new Error('Informe uma data válida.');
  }
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

export async function startInstructorTraining(input: {
  instructorId: string;
  trainingId: string;
  userId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(`SELECT id, qr_token, status FROM trainings
      WHERE id = ? AND instructor_id = ? LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string; qr_token: string; status: string }>();
  if (!training) throw new Error('Treinamento não encontrado para este instrutor.');
  if (training.status === 'completed') {
    throw new Error('Este treinamento já foi concluído.');
  }
  await d1
    .prepare(`UPDATE trainings SET status = 'in_progress'
      WHERE id = ? AND instructor_id = ?`)
    .bind(input.trainingId, input.instructorId)
    .run();
  await writeAudit(
    input.userId,
    'training.started',
    'training',
    input.trainingId,
    {},
  );
  return { qrToken: training.qr_token, status: 'in_progress' as const };
}

export async function listInstructorTrainingParticipants(input: {
  instructorId: string;
  trainingId: string;
}) {
  await ensurePortalSchema();
  const result = await getD1()
    .prepare(`SELECT p.id, p.training_id, t.title AS training_title,
      t.nr AS training_nr, c.name AS client_name, p.full_name,
      p.document_id, p.email, p.phone, p.job_title, p.created_at
      FROM participants p
      JOIN trainings t ON t.id = p.training_id
      JOIN clients c ON c.id = t.client_id
      WHERE t.id = ? AND t.instructor_id = ?
      ORDER BY p.created_at DESC`)
    .bind(input.trainingId, input.instructorId)
    .all<CompanyParticipant>();
  return rows(result);
}

export async function completeInstructorTraining(input: {
  instructorId: string;
  trainingId: string;
  userId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(`SELECT id, status FROM trainings
      WHERE id = ? AND instructor_id = ? LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string; status: string }>();
  if (!training) throw new Error('Treinamento não encontrado para este instrutor.');
  if (training.status !== 'in_progress') {
    throw new Error('Só é possível encerrar um treinamento em andamento.');
  }
  await d1
    .prepare(`UPDATE trainings SET status = 'completed'
      WHERE id = ? AND instructor_id = ?`)
    .bind(input.trainingId, input.instructorId)
    .run();
  await writeAudit(input.userId, 'training.completed', 'training', input.trainingId, {});
  return { status: 'completed' as const };
}

export async function addParticipantByInstructor(input: {
  instructorId: string;
  trainingId: string;
  userId: string;
  participant: { fullName: string; documentId: string; email: string; phone: string; jobTitle: string };
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(`SELECT id, participant_limit,
      (SELECT count(*) FROM participants p WHERE p.training_id = trainings.id) AS participant_count
      FROM trainings WHERE id = ? AND instructor_id = ? LIMIT 1`)
    .bind(input.trainingId, input.instructorId)
    .first<{ id: string; participant_limit: number; participant_count: number }>();
  if (!training) throw new Error('Treinamento não encontrado para este instrutor.');
  if (!input.participant.fullName.trim() || !input.participant.documentId.trim()) {
    throw new Error('Informe ao menos o nome e o identificador do participante.');
  }
  if (training.participant_limit > 0 && training.participant_count >= training.participant_limit) {
    throw new Error('O limite de participantes deste treinamento foi atingido.');
  }
  const id = makeId('participant');
  try {
    await d1
      .prepare(`INSERT INTO participants (
        id, training_id, full_name, document_id, email, phone, job_title, consent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(
        id,
        training.id,
        input.participant.fullName.trim(),
        input.participant.documentId.trim(),
        normalizeEmail(input.participant.email),
        input.participant.phone.trim(),
        input.participant.jobTitle.trim(),
      )
      .run();
  } catch {
    throw new Error('Já existe um participante com este identificador nesta turma.');
  }
  await writeAudit(input.userId, 'participant.added_manually', 'participant', id, { trainingId: training.id });
  return { id };
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
      WHERE p.id = ? AND t.id = ? AND t.instructor_id = ? LIMIT 1`)
    .bind(input.participantId, input.trainingId, input.instructorId)
    .first<{ id: string }>();
  if (!participant) throw new Error('Participante não encontrado.');
  await d1.prepare(`DELETE FROM participants WHERE id = ?`).bind(input.participantId).run();
  await writeAudit(input.userId, 'participant.removed', 'participant', input.participantId, { trainingId: input.trainingId });
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
    .prepare(`SELECT id, name, email, is_owner, active, must_reset,
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
}) {
  await ensurePortalSchema();
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) throw new Error('Já existe uma conta com este e-mail.');
  const id = makeId('user');
  await getD1()
    .prepare(`INSERT INTO users (
      id, client_id, instructor_id, name, email, password_hash, password_salt,
      role, is_owner, active, must_reset
    ) VALUES (?, NULL, NULL, ?, ?, ?, ?, 'admin', 0, 1, 1)`)
    .bind(id, input.name.trim(), email, input.passwordHash, input.passwordSalt)
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

export async function getCompanyDashboardData(
  currentUser: { id: string; email: string; is_owner?: number },
): Promise<CompanyDashboardData> {
  await ensurePortalSchema();
  const d1 = getD1();
  const [clientsResult, instructorsResult, instructorAvailabilityResult, trainingsResult, filesResult, participantsResult] =
    await Promise.all([
      d1
        .prepare(
          `SELECT id, name, legal_name, document, unit, contact_name,
           contact_email, contact_phone, status, created_at
           FROM clients ORDER BY created_at DESC`,
        )
        .all<CompanyClient>(),
      d1
        .prepare(
          `SELECT id, name, document, email, phone, professional_registry,
           specialties, base_city, status, source, created_at
           FROM instructors ORDER BY created_at DESC`,
        )
        .all<CompanyInstructor>(),
      d1
        .prepare(
          `SELECT a.id, a.instructor_id, i.name AS instructor_name,
           a.available_date, a.note, a.status, a.created_at
           FROM instructor_availability a
           JOIN instructors i ON i.id = a.instructor_id
           WHERE a.status = 'available'
           ORDER BY a.available_date ASC`,
        )
        .all<CompanyInstructorAvailability>(),
      d1
        .prepare(
          `SELECT t.id, t.client_id, t.instructor_id, c.name AS client_name,
           t.code, t.nr, t.title, t.training_date, t.duration, t.location,
           COALESCE(i.name, t.instructor) AS instructor,
           t.status, t.participant_limit, t.qr_token, t.qr_enabled,
           t.created_at,
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
           f.object_key, f.content_type, f.size, f.kind, f.status, f.created_at
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
           p.document_id, p.email, p.phone, p.job_title, p.created_at
           FROM participants p
           JOIN trainings t ON t.id = p.training_id
           JOIN clients c ON c.id = t.client_id
           ORDER BY p.created_at DESC`,
        )
        .all<CompanyParticipant>(),
    ]);

  return {
    clients: rows(clientsResult),
    instructors: rows(instructorsResult),
    instructorAvailability: rows(instructorAvailabilityResult),
    trainings: rows(trainingsResult),
    files: rows(filesResult),
    participants: rows(participantsResult),
    currentUser: {
      id: currentUser.id,
      email: currentUser.email,
      isOwner: isOwnerByEmailOrFlag(currentUser.email, currentUser.is_owner),
    },
  };
}

export async function createTraining(input: {
  clientId: string;
  instructorId: string;
  nr: string;
  title: string;
  trainingDate: string;
  duration: string;
  location: string;
  participantLimit: number;
  createdByUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const client = await d1
    .prepare('SELECT id FROM clients WHERE id = ? LIMIT 1')
    .bind(input.clientId)
    .first<{ id: string }>();
  if (!client) throw new Error('Cliente não encontrado.');
  const instructor = await d1
    .prepare(`SELECT id, name FROM instructors
      WHERE id = ? AND status IN ('active', 'invited') LIMIT 1`)
    .bind(input.instructorId)
    .first<{ id: string; name: string }>();
  if (!instructor) throw new Error('Selecione um instrutor aprovado.');
  const id = makeId('training');
  const digits = input.nr.replace(/\D/g, '').padStart(2, '0');
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  const code = `SL-${input.trainingDate.slice(0, 4)}-${digits}-${suffix}`;
  const qrToken = `${code}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await d1
    .prepare(`INSERT INTO trainings (
      id, client_id, instructor_id, code, nr, title, training_date, duration,
      location, instructor, status, participant_limit, qr_token, qr_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, 1)`)
    .bind(
      id,
      input.clientId,
      instructor.id,
      code,
      input.nr.trim(),
      input.title.trim(),
      input.trainingDate,
      input.duration.trim(),
      input.location.trim(),
      instructor.name,
      input.participantLimit,
      qrToken,
    )
    .run();
  await writeAudit(
    input.createdByUserId,
    'training.created',
    'training',
    id,
    { clientId: input.clientId, instructorId: instructor.id },
  );
  return { id, code, qrToken };
}

export async function registerFileMetadata(input: {
  clientId: string;
  trainingId: string;
  files: Array<{ name: string; contentType: string; size: number }>;
  createdByUserId: string;
}) {
  await ensurePortalSchema();
  const d1 = getD1();
  const training = await d1
    .prepare(
      'SELECT id FROM trainings WHERE id = ? AND client_id = ? LIMIT 1',
    )
    .bind(input.trainingId, input.clientId)
    .first<{ id: string }>();
  if (!training) throw new Error('Selecione um cliente e treinamento válidos.');
  const statements = input.files.map((file) => {
    const id = makeId('file');
    return d1
      .prepare(`INSERT INTO files (
        id, client_id, training_id, name, object_key, content_type,
        size, kind, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered')`)
      .bind(
        id,
        input.clientId,
        input.trainingId,
        file.name,
        `registered/${input.clientId}/${input.trainingId}/${id}`,
        file.contentType || 'application/octet-stream',
        file.size,
        file.contentType.startsWith('image/') ? 'photo' : 'document',
      );
  });
  if (statements.length) await d1.batch(statements);
  await writeAudit(
    input.createdByUserId,
    'files.metadata_registered',
    'training',
    input.trainingId,
    { count: statements.length },
  );
  return { count: statements.length };
}

export async function findTrainingByToken(token: string) {
  await ensurePortalSchema();
  return getD1()
    .prepare(
      `SELECT t.id, t.client_id, t.instructor_id, c.name AS client_name, t.code, t.nr,
       t.title, t.training_date, t.duration, t.location, t.instructor,
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

export async function registerParticipant(
  token: string,
  input: {
    fullName: string;
    documentId: string;
    email: string;
    phone: string;
    jobTitle: string;
  },
) {
  const training = await findTrainingByToken(token);
  if (!training) throw new Error('Este formulário não está disponível.');
  if (
    training.participant_limit > 0 &&
    training.participant_count >= training.participant_limit
  ) {
    throw new Error('O limite de participantes deste treinamento foi atingido.');
  }
  const id = makeId('participant');
  await getD1()
    .prepare(`INSERT INTO participants (
      id, training_id, full_name, document_id, email, phone, job_title, consent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
    .bind(
      id,
      training.id,
      input.fullName.trim(),
      input.documentId.trim(),
      normalizeEmail(input.email),
      input.phone.trim(),
      input.jobTitle.trim(),
    )
    .run();
  return { id, training };
}

export async function getClientPortalData(
  clientId: string,
): Promise<ClientPortalData | null> {
  await ensurePortalSchema();
  const d1 = getD1();
  const organization = await d1
    .prepare(
      `SELECT id, legal_name, name, document, unit, contact_name,
       contact_email, contact_phone
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
    }>();
  if (!organization) return null;

  const [trainingResult, fileResult, certificateResult] = await Promise.all([
    d1
      .prepare(
        `SELECT t.id, t.client_id, t.code, t.nr, t.title, t.training_date,
         t.duration, t.location, t.instructor, t.status,
         (SELECT count(*) FROM participants p WHERE p.training_id = t.id) AS participant_count,
         (SELECT count(*) FROM files f WHERE f.training_id = t.id AND f.kind = 'photo') AS photo_count,
         (SELECT count(*) FROM files f WHERE f.training_id = t.id AND f.kind = 'document') AS document_count,
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
        duration: string;
        location: string;
        instructor: string;
        status: string;
        participant_count: number;
        photo_count: number;
        document_count: number;
        certificate_count: number;
      }>(),
    d1
      .prepare(
        `SELECT id, training_id, name, content_type, size, kind, created_at
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
  ]);

  const trainings: ClientTraining[] = rows(trainingResult).map((item) => ({
    id: item.id,
    clientId: item.client_id,
    code: item.code,
    nr: item.nr,
    title: item.title,
    date: item.training_date,
    dateLabel: formatDate(item.training_date),
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
  }));

  const documents: ClientDocument[] = rows(fileResult)
    .filter((item) => item.kind === 'document')
    .map((item) => ({
      id: item.id,
      clientId,
      trainingId: item.training_id,
      title: item.name,
      category: 'Documento do treinamento',
      format: fileFormat(item.content_type, item.name),
      size: formatSize(item.size),
      updatedAt: formatDate(item.created_at),
    }));

  const certificates: ClientCertificate[] = rows(certificateResult).map(
    (item) => ({
      id: item.id,
      clientId,
      trainingId: item.training_id,
      title: `Certificados — ${item.title}`,
      reference: `${item.nr} · Lote ${item.id.slice(-8).toUpperCase()}`,
      issuedAt: formatDate(item.generated_at),
      expiresAt: 'Conforme plano da empresa',
      quantity: item.participant_count,
    }),
  );

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
    },
    trainings,
    photos: [],
    documents,
    certificates,
  };
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
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00Z`);
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
