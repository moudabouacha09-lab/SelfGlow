CREATE TABLE `daily_missions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`title_ar` text,
	`title_en` text,
	`xp_reward` integer,
	`coins_reward` integer,
	`completed` integer DEFAULT 0 NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exercise_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sets_completed` integer,
	`reps_per_set` text,
	`weight_per_set` text,
	`personal_record` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`muscle_group` text NOT NULL,
	`equipment_needed` text,
	`difficulty` text,
	`sets_default` integer,
	`reps_default` integer,
	`description_ar` text,
	`description_en` text,
	`video_url` text
);
--> statement-breakpoint
CREATE TABLE `hunter_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`rank` text DEFAULT 'E' NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`total_xp` integer DEFAULT 0 NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`last_workout_date` text,
	`last_penalty_date` text,
	`last_fully_completed_date` text,
	`bosses_defeated` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`best_weight` real,
	`best_reps` integer,
	`best_volume` real,
	`achieved_date` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`muscle_focus` text,
	`exercises` text,
	FOREIGN KEY (`plan_id`) REFERENCES `workout_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shadow_army` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`shadow_name` text NOT NULL,
	`arisen` integer DEFAULT 0 NOT NULL,
	`arisen_date` text,
	`coins_cost` integer NOT NULL,
	`bosses_required` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`age` integer,
	`weight` real,
	`height` real,
	`fitness_goal` text,
	`target_muscles` text,
	`fitness_level` text,
	`equipment` text,
	`language` text DEFAULT 'ar' NOT NULL,
	`created_at` integer,
	`awakening_shown` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`equipment` text,
	`goal` text,
	`generated_at` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`plan_day_id` integer,
	`date` text NOT NULL,
	`duration_minutes` integer,
	`xp_earned` integer,
	`coins_earned` integer,
	`total_volume` real,
	`completed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_day_id`) REFERENCES `plan_days`(`id`) ON UPDATE no action ON DELETE no action
);
