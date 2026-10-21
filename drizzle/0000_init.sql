CREATE TABLE `gate_results` (
	`import_run_id` integer NOT NULL,
	`gate` text NOT NULL,
	`verdict` text NOT NULL,
	`detail` text NOT NULL,
	PRIMARY KEY(`import_run_id`, `gate`),
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`file_sha256` text NOT NULL,
	`parser_version` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`parse_error` text,
	`record_date` text,
	`row_count` integer,
	`issuer_count` integer,
	`holder_count` integer,
	`content_hash` text,
	`correction` integer NOT NULL,
	FOREIGN KEY (`file_sha256`) REFERENCES `source_files`(`sha256`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `import_runs_source_idx` ON `import_runs` (`source_id`,`id`);--> statement-breakpoint
CREATE INDEX `import_runs_file_idx` ON `import_runs` (`file_sha256`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`scope` text PRIMARY KEY NOT NULL,
	`failure_count` integer NOT NULL,
	`first_failure_at` integer NOT NULL,
	`locked_until` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ownership_holdings` (
	`record_date` text NOT NULL,
	`row_number` integer NOT NULL,
	`share_code` text NOT NULL,
	`issuer_name` text NOT NULL,
	`investor_name` text NOT NULL,
	`investor_type` text,
	`local_foreign` text,
	`nationality` text,
	`domicile` text,
	`shares_scripless` integer NOT NULL,
	`shares_scrip` integer NOT NULL,
	`shares_total` integer NOT NULL,
	`percent_hundredths` integer NOT NULL,
	PRIMARY KEY(`record_date`, `row_number`),
	FOREIGN KEY (`record_date`) REFERENCES `ownership_months`(`record_date`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ownership_holdings_code_idx` ON `ownership_holdings` (`share_code`,`record_date`);--> statement-breakpoint
CREATE TABLE `ownership_months` (
	`record_date` text PRIMARY KEY NOT NULL,
	`import_run_id` integer NOT NULL,
	`published_at` integer NOT NULL,
	`content_hash` text NOT NULL,
	`row_count` integer NOT NULL,
	`issuer_count` integer NOT NULL,
	`holder_count` integer NOT NULL,
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publish_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`action` text NOT NULL,
	`record_date` text,
	`import_run_id` integer NOT NULL,
	`replaced_import_run_id` integer,
	`reason` text,
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`replaced_import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `s1_staged_rows` (
	`import_run_id` integer NOT NULL,
	`row_number` integer NOT NULL,
	`share_code` text NOT NULL,
	`issuer_name` text NOT NULL,
	`investor_name` text NOT NULL,
	`investor_type` text,
	`local_foreign` text,
	`nationality` text,
	`domicile` text,
	`shares_scripless` integer NOT NULL,
	`shares_scrip` integer NOT NULL,
	`shares_total` integer NOT NULL,
	`percent_hundredths` integer NOT NULL,
	PRIMARY KEY(`import_run_id`, `row_number`),
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_files` (
	`sha256` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`original_name` text NOT NULL,
	`byte_size` integer NOT NULL,
	`stored_name` text NOT NULL,
	`source_url` text NOT NULL,
	`accessed_on` text NOT NULL,
	`uploaded_at` integer NOT NULL
);
