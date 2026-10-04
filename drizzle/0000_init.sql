CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_clicks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "link_clicks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"link_id" uuid NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_clicks_source_check" CHECK (char_length("link_clicks"."source") <= 20)
);
--> statement-breakpoint
CREATE TABLE "app_owner" (
	"email" text PRIMARY KEY NOT NULL,
	CONSTRAINT "app_owner_email_check" CHECK ("app_owner"."email" = lower("app_owner"."email"))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_check" CHECK (char_length(btrim("categories"."name")) between 1 and 24)
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'link' NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_type_check" CHECK ("links"."type" in ('link', 'featured', 'product')),
	CONSTRAINT "links_title_check" CHECK (char_length(btrim("links"."title")) between 1 and 70),
	CONSTRAINT "links_url_check" CHECK (char_length("links"."url") <= 2048 and "links"."url" ~* '^(https?://[^\s/]+\.[^\s]+|mailto:[^\s]+)$'),
	CONSTRAINT "links_description_check" CHECK (char_length("links"."description") <= 140),
	CONSTRAINT "links_price_check" CHECK (char_length("links"."price") <= 20)
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"handle" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"theme" text DEFAULT 'clair' NOT NULL,
	"link_shape" text DEFAULT 'pilule' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_id_check" CHECK ("profile"."id" = 1),
	CONSTRAINT "profile_name_check" CHECK (char_length("profile"."name") <= 40),
	CONSTRAINT "profile_handle_check" CHECK ("profile"."handle" ~ '^[a-z0-9._-]{0,30}$'),
	CONSTRAINT "profile_bio_check" CHECK (char_length("profile"."bio") <= 160),
	CONSTRAINT "profile_location_check" CHECK (char_length("profile"."location") <= 40),
	CONSTRAINT "profile_socials_check" CHECK (jsonb_typeof("profile"."socials") = 'object' and not jsonb_path_exists("profile"."socials", '$.* ? (@ != "" && !(@ like_regex "^(https://|http://|mailto:)" flag "i"))')),
	CONSTRAINT "profile_theme_check" CHECK ("profile"."theme" in ('clair', 'sombre')),
	CONSTRAINT "profile_link_shape_check" CHECK ("profile"."link_shape" in ('pilule', 'arrondi', 'carre'))
);
--> statement-breakpoint
CREATE TABLE "newsletter_queue" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "newsletter_queue_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() + interval '15 minutes' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_queue_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_queue_email_check" CHECK ("newsletter_queue"."email" = lower("newsletter_queue"."email") and char_length("newsletter_queue"."email") <= 254 and "newsletter_queue"."email" ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
	CONSTRAINT "newsletter_queue_source_check" CHECK ("newsletter_queue"."source" in ('tiktok', 'instagram', 'facebook', 'linkedin', 'x', 'youtube', 'snapchat', 'threads', 'direct')),
	CONSTRAINT "newsletter_queue_attempts_check" CHECK ("newsletter_queue"."attempts" >= 0),
	CONSTRAINT "newsletter_queue_last_error_check" CHECK (char_length("newsletter_queue"."last_error") <= 500)
);
--> statement-breakpoint
CREATE TABLE "newsletter_stats" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"lost_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_stats_id_check" CHECK ("newsletter_stats"."id" = 1),
	CONSTRAINT "newsletter_stats_lost_count_check" CHECK ("newsletter_stats"."lost_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "link_clicks_link_id_idx" ON "link_clicks" USING btree ("link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_key" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "links_category_id_idx" ON "links" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "links_position_idx" ON "links" USING btree ("position");--> statement-breakpoint
CREATE INDEX "newsletter_queue_next_attempt_idx" ON "newsletter_queue" USING btree ("next_attempt_at");