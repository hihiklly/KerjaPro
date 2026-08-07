CREATE TABLE `business_members` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_account_user` ON `business_members` (`account_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `staff_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`name` text NOT NULL,
	`destination` text NOT NULL,
	`role` text DEFAULT 'worker' NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_invites_token_hash_unique` ON `staff_invites` (`token_hash`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `assigned_member_id` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `payment_term_days` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `completed_at` text;