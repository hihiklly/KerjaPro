CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`account_id` text,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`generation_id` text NOT NULL,
	`result_json` text NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`job_id` text,
	`document_id` text,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attachments_storage_key_unique` ON `attachments` (`storage_key`);--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`owner_name` text NOT NULL,
	`phone` text NOT NULL,
	`registration_no` text,
	`address` text,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`timezone` text DEFAULT 'Asia/Kuala_Lumpur' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`quotation_validity_days` integer DEFAULT 14 NOT NULL,
	`payment_terms` text DEFAULT 'Payment due on completion' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_business_owner` ON `business_profiles` (`owner_id`);--> statement-breakpoint
CREATE TABLE `completion_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`document_id` text NOT NULL,
	`service_date` text NOT NULL,
	`findings` text NOT NULL,
	`work_performed` text NOT NULL,
	`testing_results` text,
	`warranty` text,
	`recommendations` text,
	`technician` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completion_reports_document_id_unique` ON `completion_reports` (`document_id`);--> statement-breakpoint
CREATE TABLE `credit_ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`event_type` text NOT NULL,
	`amount` integer NOT NULL,
	`source` text NOT NULL,
	`payment_id` text,
	`subscription_id` text,
	`generation_id` text,
	`idempotency_key` text NOT NULL,
	`actor_id` text NOT NULL,
	`admin_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_entries_idempotency_key_unique` ON `credit_ledger_entries` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`whatsapp` text,
	`email` text,
	`service_address` text NOT NULL,
	`notes` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`document_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_version` ON `document_versions` (`document_id`,`version`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`job_id` text,
	`kind` text NOT NULL,
	`document_number` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`confirmed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_documents_account_number` ON `documents` (`account_id`,`document_number`);--> statement-breakpoint
CREATE TABLE `generation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`intent` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`duration_ms` integer,
	`cost_micros` integer,
	`idempotency_key` text NOT NULL,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_events_idempotency_key_unique` ON `generation_events` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`document_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`amount_minor` integer NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`job_number` text NOT NULL,
	`category` text NOT NULL,
	`service_address` text NOT NULL,
	`request` text NOT NULL,
	`appointment_at` text,
	`technician` text,
	`internal_notes` text,
	`follow_up_at` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_account_number` ON `jobs` (`account_id`,`job_number`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_payment_id` text,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`fee_minor` integer,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_payment_id_unique` ON `payments` (`provider_payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_idempotency_key_unique` ON `payments` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`monthly_price_minor` integer NOT NULL,
	`annual_price_minor` integer NOT NULL,
	`monthly_credits` integer NOT NULL,
	`config_json` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_code_unique` ON `plans` (`code`);--> statement-breakpoint
CREATE TABLE `quotation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`document_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit` text NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`amount_minor` integer NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`customer_id` text,
	`job_id` text,
	`type` text NOT NULL,
	`due_at` text NOT NULL,
	`note` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subscription_id` text,
	`status` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_provider_subscription_id_unique` ON `subscriptions` (`provider_subscription_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);