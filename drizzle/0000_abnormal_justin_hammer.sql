CREATE TYPE "public"."anime_format" AS ENUM('TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."anime_season" AS ENUM('WINTER', 'SPRING', 'SUMMER', 'FALL');--> statement-breakpoint
CREATE TYPE "public"."anime_source" AS ENUM('ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."anime_status" AS ENUM('FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp (6) with time zone,
	"refresh_token_expires_at" timestamp (6) with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anime" (
	"id" serial PRIMARY KEY NOT NULL,
	"format" "anime_format" DEFAULT 'OTHER' NOT NULL,
	"status" "anime_status" NOT NULL,
	"description" text,
	"start_date_day" integer,
	"start_date_month" integer,
	"start_date_year" integer,
	"end_date_day" integer,
	"end_date_month" integer,
	"end_date_year" integer,
	"season" "anime_season",
	"season_year" integer,
	"episodes" integer,
	"duration" integer,
	"source" "anime_source",
	"banner_image" text,
	"genres" text[],
	"tags" text[],
	"studio_id" integer,
	"is_adult" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anime_cover_image" (
	"anime_id" integer PRIMARY KEY NOT NULL,
	"extra_large" text,
	"large" text,
	"medium" text NOT NULL,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "anime_relation" (
	"id" serial PRIMARY KEY NOT NULL,
	"anime_id" integer NOT NULL,
	"related_anime_id" integer NOT NULL,
	"relation_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anime_title" (
	"anime_id" integer PRIMARY KEY NOT NULL,
	"romaji" text NOT NULL,
	"russian" text NOT NULL,
	"native" text,
	"english" text,
	"other" text[]
);
--> statement-breakpoint
CREATE TABLE "anime_trailer" (
	"id" serial PRIMARY KEY NOT NULL,
	"anime_id" integer NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text
);
--> statement-breakpoint
CREATE TABLE "episode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anime_id" integer NOT NULL,
	"number" integer NOT NULL,
	"duration" text,
	"thumbnail_url" text,
	"name" text,
	"description" text,
	"is_filler" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "episode_video" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"manifest_url" text NOT NULL,
	"container" text DEFAULT 'fmp4',
	"available_resolutions" text[],
	"voiceover_name" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "studio" (
	"id" serial PRIMARY KEY NOT NULL,
	"logo" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" varchar(255),
	"display_username" text,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime" ADD CONSTRAINT "anime_studio_id_studio_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studio"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_cover_image" ADD CONSTRAINT "anime_cover_image_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_relation" ADD CONSTRAINT "anime_relation_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_relation" ADD CONSTRAINT "anime_relation_related_anime_id_anime_id_fk" FOREIGN KEY ("related_anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_title" ADD CONSTRAINT "anime_title_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_trailer" ADD CONSTRAINT "anime_trailer_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode" ADD CONSTRAINT "episode_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_video" ADD CONSTRAINT "episode_video_episode_id_episode_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episode"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;