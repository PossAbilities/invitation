CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`card_title` text NOT NULL,
	`card_header` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`event_date` text NOT NULL,
	`start_time` text DEFAULT '09:00' NOT NULL,
	`end_time` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`host` text DEFAULT '' NOT NULL,
	`accent` text DEFAULT '#ec008c' NOT NULL,
	`logo_variant` text DEFAULT 'stacked' NOT NULL,
	`logo_size` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE TABLE `recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'staged' NOT NULL,
	`response_note` text,
	`party_size` integer,
	`sent_at` integer,
	`opened_at` integer,
	`responded_at` integer,
	`failure_reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipients_token_idx` ON `recipients` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipients_event_email_idx` ON `recipients` (`event_id`,`email`);--> statement-breakpoint
CREATE INDEX `recipients_event_idx` ON `recipients` (`event_id`);