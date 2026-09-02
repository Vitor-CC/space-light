CREATE TABLE `instructor_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`instructor_id` text NOT NULL,
	`available_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_instructor_availability_date` ON `instructor_availability` (`instructor_id`,`available_date`);--> statement-breakpoint
CREATE INDEX `idx_instructor_availability_status_date` ON `instructor_availability` (`status`,`available_date`);--> statement-breakpoint
CREATE TABLE `instructors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`document` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`professional_registry` text DEFAULT '' NOT NULL,
	`specialties` text DEFAULT '' NOT NULL,
	`base_city` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'self' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_instructors_document` ON `instructors` (`document`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_instructors_email` ON `instructors` (`email`);--> statement-breakpoint
CREATE INDEX `idx_instructors_status_created` ON `instructors` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `trainings` ADD `instructor_id` text REFERENCES instructors(id);--> statement-breakpoint
CREATE INDEX `idx_trainings_instructor_date` ON `trainings` (`instructor_id`,`training_date`);--> statement-breakpoint
ALTER TABLE `users` ADD `instructor_id` text REFERENCES instructors(id);--> statement-breakpoint
CREATE INDEX `idx_users_instructor_role` ON `users` (`instructor_id`,`role`);