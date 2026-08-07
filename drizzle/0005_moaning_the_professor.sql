CREATE TABLE `job_compensations` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`job_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`member_id` text NOT NULL,
	`pay_type` text NOT NULL,
	`amount_minor` integer,
	`commission_basis_points` integer,
	`calculated_amount_minor` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending_completion' NOT NULL,
	`approved_by_member_id` text,
	`approved_at` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `job_assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `business_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_member_id`) REFERENCES `business_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_compensation_assignment_member` ON `job_compensations` (`assignment_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`display_name` text NOT NULL,
	`bank_name` text,
	`account_name` text,
	`account_number` text,
	`duitnow_id` text,
	`qr_attachment_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	`show_on_quotation` integer DEFAULT true NOT NULL,
	`show_on_invoice` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_methods_account_kind` ON `payment_methods` (`account_id`,`kind`);--> statement-breakpoint
CREATE TABLE `staff_pay_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`member_id` text NOT NULL,
	`pay_type` text NOT NULL,
	`flat_amount_minor` integer,
	`commission_basis_points` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `business_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_pay_rules_account_member` ON `staff_pay_rules` (`account_id`,`member_id`);