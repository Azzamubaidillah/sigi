CREATE TABLE `macro_observations` (
	`series_id` text NOT NULL,
	`period` text NOT NULL,
	`value` real NOT NULL,
	PRIMARY KEY(`series_id`, `period`),
	FOREIGN KEY (`series_id`) REFERENCES `macro_series`(`series_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `macro_series` (
	`series_id` text PRIMARY KEY NOT NULL,
	`import_run_id` integer NOT NULL,
	`published_at` integer NOT NULL,
	`content_hash` text NOT NULL,
	`observation_count` integer NOT NULL,
	`latest_period` text NOT NULL,
	`latest_seen_at` integer NOT NULL,
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Every run before this migration checked the exchange's ownership page; the
-- default only labels those rows, and the code always sets the feed.
ALTER TABLE `fetch_runs` ADD `feed` text DEFAULT 'idx-s1' NOT NULL;--> statement-breakpoint
CREATE INDEX `fetch_runs_feed_idx` ON `fetch_runs` (`feed`,`id`);