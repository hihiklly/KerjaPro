CREATE TABLE `job_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`job_id` text NOT NULL,
	`assigned_member_id` text NOT NULL,
	`assigned_by_member_id` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`instruction` text,
	`appointment_at` text,
	`notified_at` text,
	`ended_at` text,
	`end_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_member_id`) REFERENCES `business_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by_member_id`) REFERENCES `business_members`(`id`) ON UPDATE no action ON DELETE no action
);
