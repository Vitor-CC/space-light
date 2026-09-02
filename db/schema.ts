import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const createdAt = text('created_at')
  .notNull()
  .default(sql`(datetime('now'))`);

export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    legalName: text('legal_name').notNull(),
    document: text('document').notNull(),
    unit: text('unit').notNull(),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull().default(''),
    status: text('status').notNull().default('invited'),
    source: text('source').notNull().default('admin'),
    createdAt,
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_clients_document').on(table.document),
    uniqueIndex('idx_clients_contact_email').on(table.contactEmail),
    index('idx_clients_status_created').on(table.status, table.createdAt),
  ],
);

export const instructors = sqliteTable(
  'instructors',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    document: text('document').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull().default(''),
    professionalRegistry: text('professional_registry').notNull().default(''),
    specialties: text('specialties').notNull().default(''),
    baseCity: text('base_city').notNull().default(''),
    status: text('status').notNull().default('pending'),
    source: text('source').notNull().default('self'),
    createdAt,
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('idx_instructors_document').on(table.document),
    uniqueIndex('idx_instructors_email').on(table.email),
    index('idx_instructors_status_created').on(table.status, table.createdAt),
  ],
);

export const instructorDocuments = sqliteTable(
  'instructor_documents',
  {
    id: text('id').primaryKey(),
    instructorId: text('instructor_id')
      .notNull()
      .references(() => instructors.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    category: text('category').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_instructor_documents_object_key').on(table.objectKey),
    index('idx_instructor_documents_instructor_category').on(
      table.instructorId,
      table.category,
    ),
  ],
);

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    instructorId: text('instructor_id').references(() => instructors.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    passwordSalt: text('password_salt').notNull(),
    role: text('role').notNull().default('client'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    mustReset: integer('must_reset', { mode: 'boolean' })
      .notNull()
      .default(false),
    lastLoginAt: text('last_login_at'),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_users_email').on(table.email),
    index('idx_users_client_role').on(table.clientId, table.role),
    index('idx_users_instructor_role').on(table.instructorId, table.role),
  ],
);

export const trainings = sqliteTable(
  'trainings',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    instructorId: text('instructor_id').references(() => instructors.id, {
      onDelete: 'set null',
    }),
    code: text('code').notNull(),
    nr: text('nr').notNull(),
    title: text('title').notNull(),
    trainingDate: text('training_date').notNull(),
    duration: text('duration').notNull(),
    location: text('location').notNull(),
    instructor: text('instructor').notNull(),
    status: text('status').notNull().default('scheduled'),
    participantLimit: integer('participant_limit').notNull().default(0),
    qrToken: text('qr_token').notNull(),
    qrEnabled: integer('qr_enabled', { mode: 'boolean' })
      .notNull()
      .default(true),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_trainings_code').on(table.code),
    uniqueIndex('idx_trainings_qr_token').on(table.qrToken),
    index('idx_trainings_client_date').on(
      table.clientId,
      table.trainingDate,
    ),
    index('idx_trainings_instructor_date').on(
      table.instructorId,
      table.trainingDate,
    ),
  ],
);

export const instructorAvailability = sqliteTable(
  'instructor_availability',
  {
    id: text('id').primaryKey(),
    instructorId: text('instructor_id')
      .notNull()
      .references(() => instructors.id, { onDelete: 'cascade' }),
    availableDate: text('available_date').notNull(),
    note: text('note').notNull().default(''),
    status: text('status').notNull().default('available'),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_instructor_availability_date').on(
      table.instructorId,
      table.availableDate,
    ),
    index('idx_instructor_availability_status_date').on(
      table.status,
      table.availableDate,
    ),
  ],
);

export const files = sqliteTable(
  'files',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    trainingId: text('training_id')
      .notNull()
      .references(() => trainings.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('registered'),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_files_object_key').on(table.objectKey),
    index('idx_files_training_created').on(
      table.trainingId,
      table.createdAt,
    ),
    index('idx_files_client_kind').on(table.clientId, table.kind),
  ],
);

export const participants = sqliteTable(
  'participants',
  {
    id: text('id').primaryKey(),
    trainingId: text('training_id')
      .notNull()
      .references(() => trainings.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    documentId: text('document_id').notNull(),
    email: text('email').notNull().default(''),
    phone: text('phone').notNull().default(''),
    jobTitle: text('job_title').notNull().default(''),
    consent: integer('consent', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_participants_training_document').on(
      table.trainingId,
      table.documentId,
    ),
    index('idx_participants_training_created').on(
      table.trainingId,
      table.createdAt,
    ),
  ],
);

export const certificateBatches = sqliteTable(
  'certificate_batches',
  {
    id: text('id').primaryKey(),
    trainingId: text('training_id')
      .notNull()
      .references(() => trainings.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    participantCount: integer('participant_count').notNull().default(0),
    generatedAt: text('generated_at'),
    createdAt,
  },
  (table) => [
    index('idx_certificate_batches_training').on(
      table.trainingId,
      table.createdAt,
    ),
  ],
);

export const certificates = sqliteTable(
  'certificates',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => certificateBatches.id, { onDelete: 'cascade' }),
    participantId: text('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    verificationCode: text('verification_code').notNull(),
    fileKey: text('file_key'),
    issuedAt: text('issued_at'),
    createdAt,
  },
  (table) => [
    uniqueIndex('idx_certificates_verification_code').on(
      table.verificationCode,
    ),
    uniqueIndex('idx_certificates_batch_participant').on(
      table.batchId,
      table.participantId,
    ),
  ],
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: text('metadata').notNull().default('{}'),
    createdAt,
  },
  (table) => [
    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    index('idx_audit_logs_user_created').on(table.userId, table.createdAt),
  ],
);
