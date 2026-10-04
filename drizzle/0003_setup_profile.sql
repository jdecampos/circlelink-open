CREATE TABLE "app_setup" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_setup_id_check" CHECK ("app_setup"."id" = 1),
	CONSTRAINT "app_setup_code_hash_check" CHECK ("app_setup"."code_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "avatar_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "show_credit" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatar_url_check" CHECK (char_length("profile"."avatar_url") <= 2048 and ("profile"."avatar_url" = '' or "profile"."avatar_url" ~* '^https://[^\s/]+\.[^\s]+$'));