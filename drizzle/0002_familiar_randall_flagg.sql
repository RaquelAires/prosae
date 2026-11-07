CREATE TABLE `moderation` (
	`book` text PRIMARY KEY NOT NULL,
	`blocked` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`book`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`book` text NOT NULL,
	`title` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL
);
