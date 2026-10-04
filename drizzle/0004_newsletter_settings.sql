CREATE TABLE "newsletter_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"provider" text,
	"key_ciphertext" text,
	"key_hint" text,
	"audience_id" text,
	"audience_name" text,
	"key_rejected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_settings_id_check" CHECK ("newsletter_settings"."id" = 1),
	CONSTRAINT "newsletter_settings_provider_check" CHECK ("newsletter_settings"."provider" is null or "newsletter_settings"."provider" in ('brevo', 'mailchimp', 'mailerlite', 'kit')),
	CONSTRAINT "newsletter_settings_key_check" CHECK ("newsletter_settings"."key_ciphertext" is null or (char_length("newsletter_settings"."key_ciphertext") <= 2048 and "newsletter_settings"."key_ciphertext" ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')),
	CONSTRAINT "newsletter_settings_key_hint_check" CHECK ("newsletter_settings"."key_hint" is null or char_length("newsletter_settings"."key_hint") = 4),
	CONSTRAINT "newsletter_settings_audience_check" CHECK ("newsletter_settings"."audience_id" is null or char_length("newsletter_settings"."audience_id") between 1 and 100),
	CONSTRAINT "newsletter_settings_audience_name_check" CHECK ("newsletter_settings"."audience_name" is null or char_length("newsletter_settings"."audience_name") <= 200),
	CONSTRAINT "newsletter_settings_enabled_check" CHECK (not "newsletter_settings"."enabled" or ("newsletter_settings"."provider" is not null and "newsletter_settings"."key_ciphertext" is not null and "newsletter_settings"."audience_id" is not null))
);
