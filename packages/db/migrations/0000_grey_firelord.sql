CREATE TABLE IF NOT EXISTS "accounts" (
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hosts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hosts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"name" text NOT NULL,
	"game_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"duration" text NOT NULL,
	"format" text NOT NULL,
	"second_format" text,
	"break_ties" boolean DEFAULT false NOT NULL,
	"registration_type" text NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"require_teams" boolean DEFAULT false NOT NULL,
	"max_participants" integer,
	"start_date" timestamp NOT NULL,
	"is_tentative" boolean DEFAULT false NOT NULL,
	"require_check_in" boolean DEFAULT false NOT NULL,
	"shareable_slug" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_shareable_slug_unique" UNIQUE("shareable_slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"team_name" text,
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"seed" integer,
	"checked_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"round" integer NOT NULL,
	"match_number" integer NOT NULL,
	"participant1_id" text,
	"participant2_id" text,
	"winner_id" text,
	"next_match_id" text,
	"is_losers_bracket" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_members" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"user_id" text NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"is_qualified" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"table_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leagues" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"start_date" text,
	"start_time" text DEFAULT '19:00' NOT NULL,
	"regular_meetings" integer DEFAULT 7 NOT NULL,
	"playoff_meetings" integer DEFAULT 2 NOT NULL,
	"max_players" integer DEFAULT 32 NOT NULL,
	"race_to_8ball" integer DEFAULT 3 NOT NULL,
	"race_to_9ball" integer DEFAULT 7 NOT NULL,
	"number_of_tables" integer DEFAULT 15 NOT NULL,
	"first_table_number" integer DEFAULT 10 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"playoff_race_to" integer DEFAULT 3 NOT NULL,
	"playoff_game_type" text DEFAULT '8-ball' NOT NULL,
	"playoff_bracket" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_history" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"meeting_id" text NOT NULL,
	"meeting_number" integer NOT NULL,
	"table_number" integer NOT NULL,
	"player1_id" text,
	"player2_id" text,
	"score1" integer NOT NULL,
	"score2" integer NOT NULL,
	"winner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"table_number" integer NOT NULL,
	"player1_id" text,
	"player2_id" text,
	"score1" integer DEFAULT 0 NOT NULL,
	"score2" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"winner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_players" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"member_id" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"meeting_number" integer NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"scheduled_date" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hosts" ADD CONSTRAINT "hosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participants" ADD CONSTRAINT "participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_participant1_id_participants_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_participant2_id_participants_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_participants_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_tables" ADD CONSTRAINT "league_tables_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leagues" ADD CONSTRAINT "leagues_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_player1_id_league_members_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."league_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_player2_id_league_members_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."league_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_history" ADD CONSTRAINT "match_history_winner_id_league_members_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."league_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_tables" ADD CONSTRAINT "match_tables_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_tables" ADD CONSTRAINT "match_tables_player1_id_league_members_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."league_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_tables" ADD CONSTRAINT "match_tables_player2_id_league_members_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."league_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_tables" ADD CONSTRAINT "match_tables_winner_id_league_members_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."league_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_players" ADD CONSTRAINT "meeting_players_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_players" ADD CONSTRAINT "meeting_players_member_id_league_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."league_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "league_members_league_user_idx" ON "league_members" USING btree ("league_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "league_tables_league_table_idx" ON "league_tables" USING btree ("league_id","table_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_players_meeting_member_idx" ON "meeting_players" USING btree ("meeting_id","member_id");