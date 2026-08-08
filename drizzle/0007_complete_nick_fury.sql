CREATE INDEX `idx_job_events_account_job` ON `job_events` (`account_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `idx_job_line_items_account_job` ON `job_line_items` (`account_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_account_status_appointment` ON `jobs` (`account_id`,`status`,`appointment_at`);