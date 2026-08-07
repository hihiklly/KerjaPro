CREATE TABLE `customer_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`invoice_document_id` text NOT NULL,
	`receipt_number` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`received_at` text NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`reversed_at` text,
	`reversal_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_payments_idempotency_key_unique` ON `customer_payments` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customer_payments_receipt` ON `customer_payments` (`account_id`,`receipt_number`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`supplier` text,
	`description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`category` text NOT NULL,
	`incurred_at` text NOT NULL,
	`attachment_id` text,
	`recorded_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `tax_identification_no` text;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `sst_registration_no` text;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `msic_code` text;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `business_activity` text;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `financial_year_end` text DEFAULT '12-31' NOT NULL;