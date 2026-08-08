CREATE TABLE `job_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`job_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`job_id` text NOT NULL,
	`catalog_item_id` text,
	`item_type` text NOT NULL,
	`description` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit` text NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`tax_rate_basis_points` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`cost_minor` integer,
	`commission_basis_points` integer,
	`amount_minor` integer NOT NULL,
	`added_during_job` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`assigned_member_id` text,
	`job_number` text NOT NULL,
	`category` text NOT NULL,
	`service_address` text NOT NULL,
	`request` text NOT NULL,
	`appointment_at` text,
	`technician` text,
	`internal_notes` text,
	`follow_up_at` text,
	`payment_term_days` integer,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`balance_minor` integer DEFAULT 0 NOT NULL,
	`quote_sent_at` text,
	`quote_accepted_at` text,
	`started_at` text,
	`completed_at` text,
	`closed_at` text,
	`cancellation_reason` text,
	`warranty_until` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_jobs`("id", "account_id", "customer_id", "assigned_member_id", "job_number", "category", "service_address", "request", "appointment_at", "technician", "internal_notes", "follow_up_at", "payment_term_days", "subtotal_minor", "discount_minor", "tax_minor", "total_minor", "balance_minor", "quote_sent_at", "quote_accepted_at", "started_at", "completed_at", "closed_at", "cancellation_reason", "warranty_until", "status", "created_at", "updated_at")
SELECT "id", "account_id", "customer_id", "assigned_member_id", "job_number", "category", "service_address", "request", "appointment_at", "technician", "internal_notes", "follow_up_at", "payment_term_days",
COALESCE((SELECT d."subtotal_minor" FROM "documents" d WHERE d."job_id" = jobs."id" AND d."kind" IN ('invoice', 'quotation') ORDER BY CASE d."kind" WHEN 'invoice' THEN 0 ELSE 1 END, d."created_at" DESC LIMIT 1), 0),
0,
COALESCE((SELECT d."tax_minor" FROM "documents" d WHERE d."job_id" = jobs."id" AND d."kind" IN ('invoice', 'quotation') ORDER BY CASE d."kind" WHEN 'invoice' THEN 0 ELSE 1 END, d."created_at" DESC LIMIT 1), 0),
COALESCE((SELECT d."total_minor" FROM "documents" d WHERE d."job_id" = jobs."id" AND d."kind" IN ('invoice', 'quotation') ORDER BY CASE d."kind" WHEN 'invoice' THEN 0 ELSE 1 END, d."created_at" DESC LIMIT 1), 0),
COALESCE((SELECT d."total_minor" FROM "documents" d WHERE d."job_id" = jobs."id" AND d."kind" IN ('invoice', 'quotation') ORDER BY CASE d."kind" WHEN 'invoice' THEN 0 ELSE 1 END, d."created_at" DESC LIMIT 1), 0),
NULL, NULL, NULL, "completed_at", NULL, NULL, NULL,
CASE "status" WHEN 'new' THEN 'draft' WHEN 'quoted' THEN 'quote_sent' WHEN 'confirmed' THEN 'quote_accepted' ELSE "status" END,
"created_at", "updated_at" FROM `jobs`;--> statement-breakpoint
DROP TABLE `jobs`;--> statement-breakpoint
ALTER TABLE `__new_jobs` RENAME TO `jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_account_number` ON `jobs` (`account_id`,`job_number`);--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `item_type` text DEFAULT 'service' NOT NULL;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `estimated_duration_minutes` integer;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `tax_rate_basis_points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `cost_minor` integer;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `commission_basis_points` integer;
