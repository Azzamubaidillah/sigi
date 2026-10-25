CREATE TABLE `news_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`publisher` text NOT NULL,
	`title` text NOT NULL,
	`published_at` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_items_url_unique` ON `news_items` (`url`);--> statement-breakpoint
CREATE INDEX `news_items_published_idx` ON `news_items` (`published_at`);