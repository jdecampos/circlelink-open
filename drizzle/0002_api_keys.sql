CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "api_keys_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash"),
	CONSTRAINT "api_keys_prefix_check" CHECK ("api_keys"."prefix" ~ '^cl_[A-Za-z0-9_-]{8}$'),
	CONSTRAINT "api_keys_key_hash_check" CHECK ("api_keys"."key_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;