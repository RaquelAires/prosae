CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`filename` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	`reads` integer DEFAULT 0 NOT NULL,
	`downloads` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shelves` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`book` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`bookmark` text DEFAULT '' NOT NULL
);
