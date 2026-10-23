CREATE TABLE `fetch_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`listed` integer NOT NULL,
	`fetched` integer NOT NULL,
	`error` text
);
--> statement-breakpoint
DROP TABLE `login_attempts`;--> statement-breakpoint
ALTER TABLE `source_files` RENAME COLUMN `uploaded_at` TO `fetched_at`;