CREATE TABLE `document_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`colour` text DEFAULT 'professional_blue' NOT NULL,
	`logo_attachment_id` text,
	`footer` text,
	`defaults_json` text DEFAULT '{}' NOT NULL,
	`is_default` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_templates_account_kind_name` ON `document_templates` (`account_id`,`kind`,`name`);--> statement-breakpoint
CREATE TABLE `service_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`code` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit` text NOT NULL,
	`standard_price_minor` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`tax_code` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_service_catalog_account_code` ON `service_catalog` (`account_id`,`code`);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `business_type` text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `master_role` text DEFAULT 'owner_worker' NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `email` text;