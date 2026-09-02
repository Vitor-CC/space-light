CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_created` ON `audit_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `certificate_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`training_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`generated_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_certificate_batches_training` ON `certificate_batches` (`training_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`verification_code` text NOT NULL,
	`file_key` text,
	`issued_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `certificate_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_certificates_verification_code` ON `certificates` (`verification_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_certificates_batch_participant` ON `certificates` (`batch_id`,`participant_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`legal_name` text NOT NULL,
	`document` text NOT NULL,
	`unit` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`contact_phone` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`source` text DEFAULT 'admin' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clients_document` ON `clients` (`document`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clients_contact_email` ON `clients` (`contact_email`);--> statement-breakpoint
CREATE INDEX `idx_clients_status_created` ON `clients` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`training_id` text NOT NULL,
	`name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_files_object_key` ON `files` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_files_training_created` ON `files` (`training_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_files_client_kind` ON `files` (`client_id`,`kind`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`training_id` text NOT NULL,
	`full_name` text NOT NULL,
	`document_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`consent` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_participants_training_document` ON `participants` (`training_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `idx_participants_training_created` ON `participants` (`training_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`code` text NOT NULL,
	`nr` text NOT NULL,
	`title` text NOT NULL,
	`training_date` text NOT NULL,
	`duration` text NOT NULL,
	`location` text NOT NULL,
	`instructor` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`participant_limit` integer DEFAULT 0 NOT NULL,
	`qr_token` text NOT NULL,
	`qr_enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_trainings_code` ON `trainings` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_trainings_qr_token` ON `trainings` (`qr_token`);--> statement-breakpoint
CREATE INDEX `idx_trainings_client_date` ON `trainings` (`client_id`,`training_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`must_reset` integer DEFAULT false NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_client_role` ON `users` (`client_id`,`role`);