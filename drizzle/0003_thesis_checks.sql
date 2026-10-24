CREATE TABLE `thesis_checks` (
	`slug` text NOT NULL,
	`condition` text NOT NULL,
	`checked_on` text NOT NULL,
	`checked_at` integer NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`detail` text NOT NULL,
	PRIMARY KEY(`slug`, `condition`, `checked_on`)
);
--> statement-breakpoint
CREATE INDEX `thesis_checks_day_idx` ON `thesis_checks` (`checked_on`);