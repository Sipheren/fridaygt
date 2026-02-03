


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "next_auth";


ALTER SCHEMA "next_auth" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."AssistLevel" AS ENUM (
    'OFF',
    'WEAK',
    'DEFAULT',
    'STRONG',
    'PROHIBITED'
);


ALTER TYPE "public"."AssistLevel" OWNER TO "postgres";


CREATE TYPE "public"."AttendanceStatus" AS ENUM (
    'PRESENT',
    'LEFT',
    'NO_SHOW'
);


ALTER TYPE "public"."AttendanceStatus" OWNER TO "postgres";


CREATE TYPE "public"."BoostLevel" AS ENUM (
    'OFF',
    'WEAK',
    'STRONG'
);


ALTER TYPE "public"."BoostLevel" OWNER TO "postgres";


CREATE TYPE "public"."CarCategory" AS ENUM (
    'N100',
    'N200',
    'N300',
    'N400',
    'N500',
    'N600',
    'N700',
    'N800',
    'N900',
    'N1000',
    'GR1',
    'GR2',
    'GR3',
    'GR4',
    'RALLY',
    'KART',
    'VISION_GT',
    'OTHER'
);


ALTER TYPE "public"."CarCategory" OWNER TO "postgres";


CREATE TYPE "public"."DamageLevel" AS ENUM (
    'NONE',
    'LIGHT',
    'HEAVY'
);


ALTER TYPE "public"."DamageLevel" OWNER TO "postgres";


CREATE TYPE "public"."DriveType" AS ENUM (
    'FF',
    'FR',
    'MR',
    'RR',
    'AWD'
);


ALTER TYPE "public"."DriveType" OWNER TO "postgres";


CREATE TYPE "public"."PenaltyLevel" AS ENUM (
    'OFF',
    'WEAK',
    'DEFAULT',
    'STRONG'
);


ALTER TYPE "public"."PenaltyLevel" OWNER TO "postgres";


CREATE TYPE "public"."RaceType" AS ENUM (
    'LAPS',
    'TIME_TRIAL',
    'ENDURANCE'
);


ALTER TYPE "public"."RaceType" OWNER TO "postgres";


CREATE TYPE "public"."SessionStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."SessionStatus" OWNER TO "postgres";


CREATE TYPE "public"."StartType" AS ENUM (
    'GRID',
    'ROLLING',
    'FALSE_START_CHECK'
);


ALTER TYPE "public"."StartType" OWNER TO "postgres";


CREATE TYPE "public"."TimeOfDay" AS ENUM (
    'DAWN',
    'MORNING',
    'NOON',
    'AFTERNOON',
    'DUSK',
    'NIGHT'
);


ALTER TYPE "public"."TimeOfDay" OWNER TO "postgres";


CREATE TYPE "public"."TrackCategory" AS ENUM (
    'CIRCUIT',
    'CITY_COURSE',
    'DIRT',
    'OVAL'
);


ALTER TYPE "public"."TrackCategory" OWNER TO "postgres";


CREATE TYPE "public"."UserRole" AS ENUM (
    'PENDING',
    'USER',
    'ADMIN'
);


ALTER TYPE "public"."UserRole" OWNER TO "postgres";


CREATE TYPE "public"."WeatherType" AS ENUM (
    'FIXED',
    'RANDOM',
    'DYNAMIC'
);


ALTER TYPE "public"."WeatherType" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "next_auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "next_auth"."uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_expired_tokens"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    DELETE FROM "VerificationToken" WHERE "expires_at" < NOW();
  END;
  $$;


ALTER FUNCTION "public"."clean_expired_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_race_members_atomic"("member_ids" "text"[], "new_order" integer[], "updated_by_id" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    _member_id text;
    _new_order_val integer;
    _index integer;
  BEGIN
    -- Validate input arrays
    IF member_ids IS NULL OR new_order IS NULL THEN
      RAISE EXCEPTION 'member_ids and new_order cannot be null';
    END IF;

    IF array_length(member_ids, 1) != array_length(new_order, 1) THEN
      RAISE EXCEPTION 'member_ids and new_order must have the same length';
    END IF;

    -- Update each member's order with row-level locking
    FOR _index IN 1..array_length(member_ids, 1) LOOP
      _member_id := member_ids[_index];
      _new_order_val := new_order[_index];

      UPDATE "RaceMember"
      SET
        "order" = _new_order_val,
        "updatedat" = CURRENT_TIMESTAMP,
        "updatedbyid" = updated_by_id
      WHERE id = _member_id;
    END LOOP;
  END;
  $$;


ALTER FUNCTION "public"."reorder_race_members_atomic"("member_ids" "text"[], "new_order" integer[], "updated_by_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_races_atomic"("race_ids" "text"[], "new_order" integer[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    race_index int;
BEGIN
    -- Validate input arrays
    IF array_length(race_ids, 1) IS NULL OR array_length(new_order, 1) IS NULL THEN
        RAISE EXCEPTION 'Input arrays cannot be null';
    END IF;

    IF array_length(race_ids, 1) != array_length(new_order, 1) THEN
        RAISE EXCEPTION 'Race IDs and order arrays must have the same length';
    END IF;

    -- Lock all races to prevent concurrent updates
    -- This prevents other transactions from modifying these rows
    PERFORM id FROM "Race"
    WHERE id = ANY(race_ids)
    FOR UPDATE;

    -- Update each race with its new order
    FOR race_index IN array_lower(race_ids, 1)..array_upper(race_ids, 1) LOOP
        UPDATE "Race"
        SET "order" = new_order[race_index],
            "updatedAt" = NOW()
        WHERE id = race_ids[race_index];

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Race with ID % not found', race_ids[race_index];
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."reorder_races_atomic"("race_ids" "text"[], "new_order" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_next_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    INSERT INTO "public"."User" (
      id,
      email,
      name,
      role,
      gamertag,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.name,
      'PENDING',
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."sync_next_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_part_category_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_part_category_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_part_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_part_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tuning_section_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tuning_section_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tuning_setting_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tuning_setting_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "next_auth"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "userId" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "providerAccountId" "text" NOT NULL,
    "refresh_token" "text",
    "access_token" "text",
    "expires_at" bigint,
    "token_type" "text",
    "scope" "text",
    "id_token" "text",
    "session_state" "text"
);


ALTER TABLE "next_auth"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "next_auth"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "userId" "uuid" NOT NULL,
    "expires" timestamp with time zone NOT NULL,
    "sessionToken" "text" NOT NULL
);


ALTER TABLE "next_auth"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "next_auth"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "email" "text",
    "emailVerified" timestamp with time zone,
    "image" "text"
);


ALTER TABLE "next_auth"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "next_auth"."verification_tokens" (
    "identifier" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires" timestamp with time zone NOT NULL
);


ALTER TABLE "next_auth"."verification_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Account" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "providerAccountId" "text" NOT NULL,
    "refresh_token" "text",
    "access_token" "text",
    "expires_at" integer,
    "token_type" "text",
    "scope" "text",
    "id_token" "text",
    "session_state" "text"
);


ALTER TABLE "public"."Account" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Car" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "manufacturer" "text" NOT NULL,
    "year" integer,
    "category" "public"."CarCategory",
    "driveType" "public"."DriveType",
    "displacement" integer,
    "maxPower" integer,
    "maxTorque" integer,
    "weight" integer,
    "pp" integer,
    "imageUrl" "text",
    "country" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Car" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CarBuild" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "carId" "text" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "isPublic" boolean DEFAULT false,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "finalDrive" "text",
    "gear1" "text",
    "gear2" "text",
    "gear3" "text",
    "gear4" "text",
    "gear5" "text",
    "gear6" "text",
    "gear7" "text",
    "gear8" "text",
    "gear9" "text",
    "gear10" "text",
    "gear11" "text",
    "gear12" "text",
    "gear13" "text",
    "gear14" "text",
    "gear15" "text",
    "gear16" "text",
    "gear17" "text",
    "gear18" "text",
    "gear19" "text",
    "gear20" "text"
);


ALTER TABLE "public"."CarBuild" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CarBuildSetting" (
    "id" "text" NOT NULL,
    "buildId" "text" NOT NULL,
    "category" character varying(50) NOT NULL,
    "setting" character varying(100) NOT NULL,
    "value" character varying(100) NOT NULL,
    "settingId" "uuid" NOT NULL
);


ALTER TABLE "public"."CarBuildSetting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CarBuildUpgrade" (
    "id" "text" NOT NULL,
    "buildId" "text" NOT NULL,
    "category" character varying(50) NOT NULL,
    "part" character varying(100) NOT NULL,
    "partId" "uuid" NOT NULL,
    "value" "text"
);


ALTER TABLE "public"."CarBuildUpgrade" OWNER TO "postgres";


COMMENT ON COLUMN "public"."CarBuildUpgrade"."value" IS 'Selected value for dropdown parts (GT Auto, Custom Parts). Null for checkbox parts.';



CREATE TABLE IF NOT EXISTS "public"."LapTime" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "trackId" "text" NOT NULL,
    "carId" "text" NOT NULL,
    "timeMs" integer NOT NULL,
    "sessionId" "text",
    "notes" "text",
    "conditions" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "buildId" "text" NOT NULL,
    "sessionType" "text" DEFAULT 'R'::"text",
    "buildName" "text",
    CONSTRAINT "LapTime_sessionType_check" CHECK (("sessionType" = ANY (ARRAY['Q'::"text", 'R'::"text"])))
);


ALTER TABLE "public"."LapTime" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."LobbySettings" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "laps" integer,
    "raceType" "public"."RaceType" DEFAULT 'LAPS'::"public"."RaceType" NOT NULL,
    "startType" "public"."StartType" DEFAULT 'GRID'::"public"."StartType" NOT NULL,
    "boostLevel" "public"."BoostLevel" DEFAULT 'OFF'::"public"."BoostLevel" NOT NULL,
    "tireWearMultiplier" integer DEFAULT 1 NOT NULL,
    "fuelConsumption" integer DEFAULT 1 NOT NULL,
    "requiredTires" "text",
    "mechanicalDamage" "public"."DamageLevel" DEFAULT 'NONE'::"public"."DamageLevel" NOT NULL,
    "penaltyLevel" "public"."PenaltyLevel" DEFAULT 'DEFAULT'::"public"."PenaltyLevel" NOT NULL,
    "lowMuSurface" boolean DEFAULT true NOT NULL,
    "wallCollisionPenalty" boolean DEFAULT true NOT NULL,
    "cornerCuttingPenalty" boolean DEFAULT true NOT NULL,
    "weather" "public"."WeatherType" DEFAULT 'FIXED'::"public"."WeatherType" NOT NULL,
    "weatherChangeability" integer DEFAULT 0 NOT NULL,
    "timeOfDay" "public"."TimeOfDay" DEFAULT 'NOON'::"public"."TimeOfDay" NOT NULL,
    "timeProgression" integer DEFAULT 1 NOT NULL,
    "abs" "public"."AssistLevel" DEFAULT 'DEFAULT'::"public"."AssistLevel" NOT NULL,
    "counterSteer" "public"."AssistLevel" DEFAULT 'DEFAULT'::"public"."AssistLevel" NOT NULL,
    "tractionControl" "public"."AssistLevel" DEFAULT 'DEFAULT'::"public"."AssistLevel" NOT NULL,
    "activeStabilityMgmt" "public"."AssistLevel" DEFAULT 'DEFAULT'::"public"."AssistLevel" NOT NULL,
    "drivingLine" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."LobbySettings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Note" (
    "id" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "content" "text" DEFAULT ''::"text",
    "color" character varying(7) DEFAULT '#fef08a'::character varying,
    "positionX" integer DEFAULT 0,
    "positionY" integer DEFAULT 0,
    "width" character varying(20) DEFAULT 'medium'::character varying,
    "pinned" boolean DEFAULT false,
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "createdBy" "text" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "updatedAt" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."Note" OWNER TO "postgres";


COMMENT ON TABLE "public"."Note" IS 'Collaborative sticky notes board for team members';



CREATE TABLE IF NOT EXISTS "public"."Part" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "categoryId" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "updatedAt" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."Part" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."PartCategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "displayOrder" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "updatedAt" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."PartCategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Race" (
    "id" "text" NOT NULL,
    "trackId" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "createdById" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "laps" integer,
    "weather" character varying(20),
    "isActive" boolean DEFAULT false NOT NULL,
    "order" integer
);


ALTER TABLE "public"."Race" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Race"."createdById" IS 'ID of user who created the race';



COMMENT ON COLUMN "public"."Race"."createdAt" IS 'Timestamp when race was created';



COMMENT ON COLUMN "public"."Race"."updatedAt" IS 'Timestamp when race was last updated';



CREATE TABLE IF NOT EXISTS "public"."RaceCar" (
    "id" "text" NOT NULL,
    "raceId" "text" NOT NULL,
    "carId" "text" NOT NULL,
    "buildId" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."RaceCar" OWNER TO "postgres";


COMMENT ON COLUMN "public"."RaceCar"."raceId" IS 'ID of the race';



COMMENT ON COLUMN "public"."RaceCar"."carId" IS 'ID of the car';



COMMENT ON COLUMN "public"."RaceCar"."buildId" IS 'ID of the car build (optional)';



CREATE TABLE IF NOT EXISTS "public"."RaceMember" (
    "id" "text" NOT NULL,
    "raceid" "text" NOT NULL,
    "userid" "text" NOT NULL,
    "order" integer NOT NULL,
    "partid" "uuid" NOT NULL,
    "createdat" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedat" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedbyid" "text"
);


ALTER TABLE "public"."RaceMember" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RunList" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdById" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT false,
    "isLive" boolean DEFAULT false
);


ALTER TABLE "public"."RunList" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RunListEdit" (
    "id" "text" NOT NULL,
    "runListId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "action" "text" NOT NULL,
    "details" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."RunListEdit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RunListEntry" (
    "id" "text" NOT NULL,
    "runListId" "text" NOT NULL,
    "order" integer NOT NULL,
    "trackId" "text" NOT NULL,
    "carId" "text",
    "lobbySettingsId" "text",
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "buildId" "text",
    "raceId" "text"
);


ALTER TABLE "public"."RunListEntry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RunListEntryCar" (
    "id" "text" NOT NULL,
    "runListEntryId" "text" NOT NULL,
    "carId" "text" NOT NULL,
    "buildId" "text",
    "createdAt" "text" DEFAULT "now"() NOT NULL,
    "updatedAt" "text" DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."RunListEntryCar" OWNER TO "postgres";


COMMENT ON TABLE "public"."RunListEntryCar" IS 'Links run list entries to cars with optional builds';



COMMENT ON COLUMN "public"."RunListEntryCar"."buildId" IS 'Optional build for this car in this race';



CREATE TABLE IF NOT EXISTS "public"."RunSession" (
    "id" "text" NOT NULL,
    "runListId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "date" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "currentEntryOrder" integer,
    "status" "public"."SessionStatus" DEFAULT 'SCHEDULED'::"public"."SessionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."RunSession" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" "text" NOT NULL,
    "sessionToken" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "expires" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SessionAttendance" (
    "id" "text" NOT NULL,
    "sessionId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "status" "public"."AttendanceStatus" DEFAULT 'PRESENT'::"public"."AttendanceStatus" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone
);


ALTER TABLE "public"."SessionAttendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Track" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "location" "text",
    "length" double precision,
    "corners" integer,
    "imageUrl" "text",
    "category" "public"."TrackCategory" DEFAULT 'CIRCUIT'::"public"."TrackCategory" NOT NULL,
    "isReverse" boolean DEFAULT false NOT NULL,
    "baseTrackId" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "baseName" "text",
    "layout" "text"
);


ALTER TABLE "public"."Track" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TuningSection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "displayOrder" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "updatedAt" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."TuningSection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TuningSetting" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sectionId" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "defaultValue" character varying(100),
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "updatedAt" timestamp without time zone DEFAULT "now"(),
    "inputType" character varying(20) DEFAULT 'text'::character varying,
    "decimalPlaces" integer,
    "minValue" numeric(10,2),
    "maxValue" numeric(10,2),
    "step" numeric(10,4),
    "unit" character varying(20),
    "options" "text"[],
    "displayValue" character varying(100),
    "displayOrder" integer
);


ALTER TABLE "public"."TuningSetting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    "name" "text",
    "image" "text",
    "role" "public"."UserRole" DEFAULT 'PENDING'::"public"."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gamertag" "text",
    "adminNotified" boolean DEFAULT false
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."VerificationToken" (
    "identifier" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires" timestamp(3) without time zone NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:15:00'::interval)
);


ALTER TABLE "public"."VerificationToken" OWNER TO "postgres";


ALTER TABLE ONLY "next_auth"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "next_auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "next_auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "next_auth"."verification_tokens"
    ADD CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token");



ALTER TABLE ONLY "public"."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CarBuildSetting"
    ADD CONSTRAINT "CarBuildSetting_buildId_category_setting_key" UNIQUE ("buildId", "category", "setting");



ALTER TABLE ONLY "public"."CarBuildSetting"
    ADD CONSTRAINT "CarBuildSetting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CarBuildUpgrade"
    ADD CONSTRAINT "CarBuildUpgrade_buildId_category_part_key" UNIQUE ("buildId", "category", "part");



ALTER TABLE ONLY "public"."CarBuildUpgrade"
    ADD CONSTRAINT "CarBuildUpgrade_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CarBuild"
    ADD CONSTRAINT "CarBuild_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Car"
    ADD CONSTRAINT "Car_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."LapTime"
    ADD CONSTRAINT "LapTime_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."LobbySettings"
    ADD CONSTRAINT "LobbySettings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PartCategory"
    ADD CONSTRAINT "PartCategory_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."PartCategory"
    ADD CONSTRAINT "PartCategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Part"
    ADD CONSTRAINT "Part_categoryId_name_key" UNIQUE ("categoryId", "name");



ALTER TABLE ONLY "public"."Part"
    ADD CONSTRAINT "Part_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RaceCar"
    ADD CONSTRAINT "RaceCar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RaceMember"
    ADD CONSTRAINT "RaceMember_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RaceMember"
    ADD CONSTRAINT "RaceMember_raceid_userid_key" UNIQUE ("raceid", "userid");



ALTER TABLE ONLY "public"."Race"
    ADD CONSTRAINT "Race_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RunListEdit"
    ADD CONSTRAINT "RunListEdit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RunListEntryCar"
    ADD CONSTRAINT "RunListEntryCar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RunList"
    ADD CONSTRAINT "RunList_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RunSession"
    ADD CONSTRAINT "RunSession_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SessionAttendance"
    ADD CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Track"
    ADD CONSTRAINT "Track_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TuningSection"
    ADD CONSTRAINT "TuningSection_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."TuningSection"
    ADD CONSTRAINT "TuningSection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TuningSetting"
    ADD CONSTRAINT "TuningSetting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TuningSetting"
    ADD CONSTRAINT "TuningSetting_sectionId_name_key" UNIQUE ("sectionId", "name");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



CREATE INDEX "accounts_user_id_idx" ON "next_auth"."accounts" USING "btree" ("userId");



CREATE UNIQUE INDEX "sessions_session_token_idx" ON "next_auth"."sessions" USING "btree" ("sessionToken");



CREATE INDEX "sessions_user_id_idx" ON "next_auth"."sessions" USING "btree" ("userId");



CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account" USING "btree" ("provider", "providerAccountId");



CREATE INDEX "Account_userId_idx" ON "public"."Account" USING "btree" ("userId");



CREATE INDEX "CarBuildSetting_settingId_idx" ON "public"."CarBuildSetting" USING "btree" ("settingId");



CREATE INDEX "CarBuildUpgrade_partId_idx" ON "public"."CarBuildUpgrade" USING "btree" ("partId");



CREATE INDEX "Car_category_idx" ON "public"."Car" USING "btree" ("category");



CREATE INDEX "Car_manufacturer_idx" ON "public"."Car" USING "btree" ("manufacturer");



CREATE INDEX "Car_slug_idx" ON "public"."Car" USING "btree" ("slug");



CREATE UNIQUE INDEX "Car_slug_key" ON "public"."Car" USING "btree" ("slug");



CREATE INDEX "LapTime_buildId_idx" ON "public"."LapTime" USING "btree" ("buildId");



CREATE INDEX "LapTime_carId_idx" ON "public"."LapTime" USING "btree" ("carId");



CREATE INDEX "LapTime_createdAt_idx" ON "public"."LapTime" USING "btree" ("createdAt");



CREATE INDEX "LapTime_sessionId_idx" ON "public"."LapTime" USING "btree" ("sessionId");



CREATE INDEX "LapTime_sessionType_idx" ON "public"."LapTime" USING "btree" ("sessionType");



CREATE INDEX "LapTime_trackId_idx" ON "public"."LapTime" USING "btree" ("trackId");



CREATE INDEX "LapTime_userId_carId_trackId_idx" ON "public"."LapTime" USING "btree" ("userId", "carId", "trackId");



CREATE INDEX "LapTime_userId_trackId_idx" ON "public"."LapTime" USING "btree" ("userId", "trackId");



CREATE INDEX "LobbySettings_name_idx" ON "public"."LobbySettings" USING "btree" ("name");



CREATE INDEX "Part_categoryId_idx" ON "public"."Part" USING "btree" ("categoryId");



CREATE INDEX "Part_isActive_idx" ON "public"."Part" USING "btree" ("isActive");



CREATE INDEX "Part_name_idx" ON "public"."Part" USING "btree" ("name");



CREATE INDEX "RaceCar_buildid_idx" ON "public"."RaceCar" USING "btree" ("buildId");



CREATE INDEX "RaceCar_carid_idx" ON "public"."RaceCar" USING "btree" ("carId");



CREATE UNIQUE INDEX "RaceCar_raceId_buildId_key" ON "public"."RaceCar" USING "btree" ("raceId", "buildId");



CREATE INDEX "RaceCar_raceid_idx" ON "public"."RaceCar" USING "btree" ("raceId");



CREATE INDEX "RaceMember_updatedbyid_idx" ON "public"."RaceMember" USING "btree" ("updatedbyid");



CREATE INDEX "Race_createdbyid_idx" ON "public"."Race" USING "btree" ("createdById");



CREATE INDEX "Race_isActive_idx" ON "public"."Race" USING "btree" ("isActive");



CREATE INDEX "Race_laps_idx" ON "public"."Race" USING "btree" ("laps");



CREATE INDEX "Race_trackid_idx" ON "public"."Race" USING "btree" ("trackId");



CREATE INDEX "Race_weather_idx" ON "public"."Race" USING "btree" ("weather");



CREATE INDEX "RunListEdit_createdAt_idx" ON "public"."RunListEdit" USING "btree" ("createdAt");



CREATE INDEX "RunListEdit_runListId_idx" ON "public"."RunListEdit" USING "btree" ("runListId");



CREATE INDEX "RunListEdit_userId_idx" ON "public"."RunListEdit" USING "btree" ("userId");



CREATE INDEX "RunListEntryCar_carId_idx" ON "public"."RunListEntryCar" USING "btree" ("carId");



CREATE UNIQUE INDEX "RunListEntryCar_entry_car_unique" ON "public"."RunListEntryCar" USING "btree" ("runListEntryId", "carId");



CREATE INDEX "RunListEntryCar_runListEntryId_idx" ON "public"."RunListEntryCar" USING "btree" ("runListEntryId");



CREATE INDEX "RunListEntry_runListId_idx" ON "public"."RunListEntry" USING "btree" ("runListId");



CREATE UNIQUE INDEX "RunListEntry_runListId_order_key" ON "public"."RunListEntry" USING "btree" ("runListId", "order");



CREATE INDEX "RunList_createdAt_idx" ON "public"."RunList" USING "btree" ("createdAt");



CREATE INDEX "RunList_createdById_idx" ON "public"."RunList" USING "btree" ("createdById");



CREATE INDEX "RunList_isActive_idx" ON "public"."RunList" USING "btree" ("isActive") WHERE ("isActive" = true);



CREATE INDEX "RunList_isLive_idx" ON "public"."RunList" USING "btree" ("isLive") WHERE ("isLive" = true);



CREATE INDEX "RunSession_date_idx" ON "public"."RunSession" USING "btree" ("date");



CREATE INDEX "RunSession_runListId_idx" ON "public"."RunSession" USING "btree" ("runListId");



CREATE INDEX "RunSession_status_idx" ON "public"."RunSession" USING "btree" ("status");



CREATE INDEX "SessionAttendance_sessionId_idx" ON "public"."SessionAttendance" USING "btree" ("sessionId");



CREATE UNIQUE INDEX "SessionAttendance_sessionId_userId_key" ON "public"."SessionAttendance" USING "btree" ("sessionId", "userId");



CREATE INDEX "SessionAttendance_userId_idx" ON "public"."SessionAttendance" USING "btree" ("userId");



CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session" USING "btree" ("sessionToken");



CREATE INDEX "Session_userId_idx" ON "public"."Session" USING "btree" ("userId");



CREATE INDEX "Track_baseName_idx" ON "public"."Track" USING "btree" ("baseName");



CREATE INDEX "Track_category_idx" ON "public"."Track" USING "btree" ("category");



CREATE UNIQUE INDEX "Track_name_key" ON "public"."Track" USING "btree" ("name");



CREATE INDEX "Track_slug_idx" ON "public"."Track" USING "btree" ("slug");



CREATE UNIQUE INDEX "Track_slug_key" ON "public"."Track" USING "btree" ("slug");



CREATE INDEX "TuningSetting_isActive_idx" ON "public"."TuningSetting" USING "btree" ("isActive");



CREATE INDEX "TuningSetting_name_idx" ON "public"."TuningSetting" USING "btree" ("name");



CREATE INDEX "TuningSetting_sectionId_idx" ON "public"."TuningSetting" USING "btree" ("sectionId");



CREATE INDEX "User_email_idx" ON "public"."User" USING "btree" ("email");



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



CREATE INDEX "User_role_idx" ON "public"."User" USING "btree" ("role");



CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken" USING "btree" ("identifier", "token");



CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken" USING "btree" ("token");



CREATE INDEX "idx_car_build_car" ON "public"."CarBuild" USING "btree" ("carId");



CREATE INDEX "idx_car_build_public" ON "public"."CarBuild" USING "btree" ("isPublic");



CREATE INDEX "idx_car_build_setting_build" ON "public"."CarBuildSetting" USING "btree" ("buildId");



CREATE INDEX "idx_car_build_upgrade_build" ON "public"."CarBuildUpgrade" USING "btree" ("buildId");



CREATE INDEX "idx_car_build_user" ON "public"."CarBuild" USING "btree" ("userId");



CREATE INDEX "idx_lap_time_build" ON "public"."LapTime" USING "btree" ("buildId");



CREATE INDEX "idx_notes_created_at" ON "public"."Note" USING "btree" ("createdAt" DESC);



CREATE INDEX "idx_notes_created_by" ON "public"."Note" USING "btree" ("createdBy");



CREATE INDEX "idx_notes_pinned" ON "public"."Note" USING "btree" ("pinned") WHERE ("pinned" = true);



CREATE INDEX "idx_race_member_race" ON "public"."RaceMember" USING "btree" ("raceid", "order");



CREATE INDEX "idx_race_order" ON "public"."Race" USING "btree" ("order");



CREATE INDEX "idx_run_list_entry_build" ON "public"."RunListEntry" USING "btree" ("buildId");



CREATE UNIQUE INDEX "idx_user_gamertag_unique" ON "public"."User" USING "btree" ("gamertag") WHERE ("gamertag" IS NOT NULL);



CREATE INDEX "idx_verification_token_expires_at" ON "public"."VerificationToken" USING "btree" ("expires_at");



CREATE OR REPLACE TRIGGER "on_next_auth_user_created" AFTER INSERT ON "next_auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_next_auth_user"();



CREATE OR REPLACE TRIGGER "part_updated_at" BEFORE UPDATE ON "public"."Part" FOR EACH ROW EXECUTE FUNCTION "public"."update_part_updated_at"();



CREATE OR REPLACE TRIGGER "partcategory_updated_at" BEFORE UPDATE ON "public"."PartCategory" FOR EACH ROW EXECUTE FUNCTION "public"."update_part_category_updated_at"();



CREATE OR REPLACE TRIGGER "tuningsection_updated_at" BEFORE UPDATE ON "public"."TuningSection" FOR EACH ROW EXECUTE FUNCTION "public"."update_tuning_section_updated_at"();



CREATE OR REPLACE TRIGGER "tuningsetting_updated_at" BEFORE UPDATE ON "public"."TuningSetting" FOR EACH ROW EXECUTE FUNCTION "public"."update_tuning_setting_updated_at"();



ALTER TABLE ONLY "next_auth"."accounts"
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "next_auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "next_auth"."sessions"
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "next_auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CarBuildSetting"
    ADD CONSTRAINT "CarBuildSetting_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "public"."CarBuild"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CarBuildSetting"
    ADD CONSTRAINT "CarBuildSetting_settingId_fk" FOREIGN KEY ("settingId") REFERENCES "public"."TuningSetting"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."CarBuildUpgrade"
    ADD CONSTRAINT "CarBuildUpgrade_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "public"."CarBuild"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CarBuildUpgrade"
    ADD CONSTRAINT "CarBuildUpgrade_partId_fk" FOREIGN KEY ("partId") REFERENCES "public"."Part"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."CarBuild"
    ADD CONSTRAINT "CarBuild_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CarBuild"
    ADD CONSTRAINT "CarBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."LapTime"
    ADD CONSTRAINT "LapTime_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."LapTime"
    ADD CONSTRAINT "LapTime_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."RunSession"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."LapTime"
    ADD CONSTRAINT "LapTime_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."Track"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."LapTime"
    ADD CONSTRAINT "LapTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Part"
    ADD CONSTRAINT "Part_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."PartCategory"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."RaceCar"
    ADD CONSTRAINT "RaceCar_buildid_fkey" FOREIGN KEY ("buildId") REFERENCES "public"."CarBuild"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RaceCar"
    ADD CONSTRAINT "RaceCar_carid_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RaceCar"
    ADD CONSTRAINT "RaceCar_raceid_fkey" FOREIGN KEY ("raceId") REFERENCES "public"."Race"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RaceMember"
    ADD CONSTRAINT "RaceMember_partid_fkey" FOREIGN KEY ("partid") REFERENCES "public"."Part"("id");



ALTER TABLE ONLY "public"."RaceMember"
    ADD CONSTRAINT "RaceMember_raceid_fkey" FOREIGN KEY ("raceid") REFERENCES "public"."Race"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RaceMember"
    ADD CONSTRAINT "RaceMember_updatedbyid_fkey" FOREIGN KEY ("updatedbyid") REFERENCES "public"."User"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RaceMember"
    ADD CONSTRAINT "RaceMember_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Race"
    ADD CONSTRAINT "Race_createdbyid_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Race"
    ADD CONSTRAINT "Race_trackid_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."Track"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunListEdit"
    ADD CONSTRAINT "RunListEdit_runListId_fkey" FOREIGN KEY ("runListId") REFERENCES "public"."RunList"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunListEdit"
    ADD CONSTRAINT "RunListEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunListEntryCar"
    ADD CONSTRAINT "RunListEntryCar_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "public"."CarBuild"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RunListEntryCar"
    ADD CONSTRAINT "RunListEntryCar_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunListEntryCar"
    ADD CONSTRAINT "RunListEntryCar_runListEntryId_fkey" FOREIGN KEY ("runListEntryId") REFERENCES "public"."RunListEntry"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "public"."CarBuild"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_lobbySettingsId_fkey" FOREIGN KEY ("lobbySettingsId") REFERENCES "public"."LobbySettings"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_raceid_fkey" FOREIGN KEY ("raceId") REFERENCES "public"."Race"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_runListId_fkey" FOREIGN KEY ("runListId") REFERENCES "public"."RunList"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunListEntry"
    ADD CONSTRAINT "RunListEntry_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."Track"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RunList"
    ADD CONSTRAINT "RunList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."RunSession"
    ADD CONSTRAINT "RunSession_runListId_fkey" FOREIGN KEY ("runListId") REFERENCES "public"."RunList"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SessionAttendance"
    ADD CONSTRAINT "SessionAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."RunSession"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SessionAttendance"
    ADD CONSTRAINT "SessionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Track"
    ADD CONSTRAINT "Track_baseTrackId_fkey" FOREIGN KEY ("baseTrackId") REFERENCES "public"."Track"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."TuningSetting"
    ADD CONSTRAINT "TuningSetting_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."TuningSection"("id") ON DELETE RESTRICT;



ALTER TABLE "next_auth"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "next_auth_accounts: Service role can delete" ON "next_auth"."accounts" FOR DELETE USING (true);



CREATE POLICY "next_auth_accounts: Service role can insert" ON "next_auth"."accounts" FOR INSERT WITH CHECK (true);



CREATE POLICY "next_auth_accounts: Service role can update" ON "next_auth"."accounts" FOR UPDATE USING (true);



CREATE POLICY "next_auth_accounts: Users can view own accounts" ON "next_auth"."accounts" FOR SELECT USING ((("auth"."uid"())::"text" = ("userId")::"text"));



CREATE POLICY "next_auth_sessions: Service role can delete" ON "next_auth"."sessions" FOR DELETE USING (true);



CREATE POLICY "next_auth_sessions: Service role can insert" ON "next_auth"."sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "next_auth_sessions: Service role can update" ON "next_auth"."sessions" FOR UPDATE USING (true);



CREATE POLICY "next_auth_sessions: Users can view own sessions" ON "next_auth"."sessions" FOR SELECT USING ((("auth"."uid"())::"text" = ("userId")::"text"));



CREATE POLICY "next_auth_users: Service role can insert" ON "next_auth"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "next_auth_users: Users can update own profile" ON "next_auth"."users" FOR UPDATE USING ((("auth"."uid"())::"text" = ("id")::"text"));



CREATE POLICY "next_auth_users: Users can view own profile" ON "next_auth"."users" FOR SELECT USING ((("auth"."uid"())::"text" = ("id")::"text"));



CREATE POLICY "next_auth_verification_tokens: Service role full access" ON "next_auth"."verification_tokens" USING (true) WITH CHECK (true);



ALTER TABLE "next_auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "next_auth"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "next_auth"."verification_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Account" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Accounts: Users can delete own accounts" ON "public"."Account" FOR DELETE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Accounts: Users can insert own accounts" ON "public"."Account" FOR INSERT WITH CHECK (("userId" = "public"."current_user_id"()));



CREATE POLICY "Accounts: Users can update own accounts" ON "public"."Account" FOR UPDATE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Accounts: Users can view own accounts" ON "public"."Account" FOR SELECT USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Allow authenticated to read race cars" ON "public"."RaceCar" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to read races" ON "public"."Race" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow creators and admins to delete races" ON "public"."Race" FOR DELETE TO "authenticated" USING ((("createdById" = ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."email" = "auth"."email"()))) OR (( SELECT "User"."role"
   FROM "public"."User"
  WHERE ("User"."email" = "auth"."email"())) = 'ADMIN'::"public"."UserRole")));



CREATE POLICY "Allow creators and admins to update races" ON "public"."Race" FOR UPDATE TO "authenticated" USING ((("createdById" = ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."email" = "auth"."email"()))) OR (( SELECT "User"."role"
   FROM "public"."User"
  WHERE ("User"."email" = "auth"."email"())) = 'ADMIN'::"public"."UserRole"))) WITH CHECK ((("createdById" = ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."email" = "auth"."email"()))) OR (( SELECT "User"."role"
   FROM "public"."User"
  WHERE ("User"."email" = "auth"."email"())) = 'ADMIN'::"public"."UserRole")));



CREATE POLICY "Allow delete to Part" ON "public"."Part" FOR DELETE USING (true);



CREATE POLICY "Allow delete to PartCategory" ON "public"."PartCategory" FOR DELETE USING (true);



CREATE POLICY "Allow delete to TuningSection" ON "public"."TuningSection" FOR DELETE USING (true);



CREATE POLICY "Allow delete to TuningSetting" ON "public"."TuningSetting" FOR DELETE USING (true);



CREATE POLICY "Allow insert to Part" ON "public"."Part" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert to PartCategory" ON "public"."PartCategory" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert to TuningSection" ON "public"."TuningSection" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert to TuningSetting" ON "public"."TuningSetting" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow race car modifications for race owners" ON "public"."RaceCar" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."Race"
  WHERE (("Race"."id" = "RaceCar"."raceId") AND (("Race"."createdById" = ( SELECT "User"."id"
           FROM "public"."User"
          WHERE ("User"."email" = "auth"."email"()))) OR (( SELECT "User"."role"
           FROM "public"."User"
          WHERE ("User"."email" = "auth"."email"())) = 'ADMIN'::"public"."UserRole")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Race"
  WHERE (("Race"."id" = "RaceCar"."raceId") AND (("Race"."createdById" = ( SELECT "User"."id"
           FROM "public"."User"
          WHERE ("User"."email" = "auth"."email"()))) OR (( SELECT "User"."role"
           FROM "public"."User"
          WHERE ("User"."email" = "auth"."email"())) = 'ADMIN'::"public"."UserRole"))))));



CREATE POLICY "Allow read access to Part" ON "public"."Part" FOR SELECT USING (true);



CREATE POLICY "Allow read access to PartCategory" ON "public"."PartCategory" FOR SELECT USING (true);



CREATE POLICY "Allow read access to TuningSection" ON "public"."TuningSection" FOR SELECT USING (true);



CREATE POLICY "Allow read access to TuningSetting" ON "public"."TuningSetting" FOR SELECT USING (true);



CREATE POLICY "Allow service role all access on race cars" ON "public"."RaceCar" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role all access on races" ON "public"."Race" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow update to Part" ON "public"."Part" FOR UPDATE USING (true);



CREATE POLICY "Allow update to PartCategory" ON "public"."PartCategory" FOR UPDATE USING (true);



CREATE POLICY "Allow update to TuningSection" ON "public"."TuningSection" FOR UPDATE USING (true);



CREATE POLICY "Allow update to TuningSetting" ON "public"."TuningSetting" FOR UPDATE USING (true);



CREATE POLICY "Attendance: Public read access" ON "public"."SessionAttendance" FOR SELECT USING (true);



CREATE POLICY "Attendance: Users can join sessions" ON "public"."SessionAttendance" FOR INSERT WITH CHECK (("userId" = "public"."current_user_id"()));



CREATE POLICY "Attendance: Users can leave sessions" ON "public"."SessionAttendance" FOR DELETE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Attendance: Users can update own attendance" ON "public"."SessionAttendance" FOR UPDATE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "BuildSettings: Users can manage own build settings" ON "public"."CarBuildSetting" USING ((EXISTS ( SELECT 1
   FROM "public"."CarBuild"
  WHERE (("CarBuild"."id" = "CarBuildSetting"."buildId") AND ("CarBuild"."userId" = "public"."current_user_id"())))));



CREATE POLICY "BuildSettings: Viewable if build is viewable" ON "public"."CarBuildSetting" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."CarBuild"
  WHERE (("CarBuild"."id" = "CarBuildSetting"."buildId") AND (("CarBuild"."isPublic" = true) OR ("CarBuild"."userId" = "public"."current_user_id"()))))));



CREATE POLICY "BuildUpgrades: Users can manage own build upgrades" ON "public"."CarBuildUpgrade" USING ((EXISTS ( SELECT 1
   FROM "public"."CarBuild"
  WHERE (("CarBuild"."id" = "CarBuildUpgrade"."buildId") AND ("CarBuild"."userId" = "public"."current_user_id"())))));



CREATE POLICY "BuildUpgrades: Viewable if build is viewable" ON "public"."CarBuildUpgrade" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."CarBuild"
  WHERE (("CarBuild"."id" = "CarBuildUpgrade"."buildId") AND (("CarBuild"."isPublic" = true) OR ("CarBuild"."userId" = "public"."current_user_id"()))))));



CREATE POLICY "Builds: Public builds viewable by anyone" ON "public"."CarBuild" FOR SELECT USING ((("isPublic" = true) OR ("userId" = "public"."current_user_id"())));



CREATE POLICY "Builds: Users can create builds" ON "public"."CarBuild" FOR INSERT WITH CHECK (("userId" = "public"."current_user_id"()));



CREATE POLICY "Builds: Users can delete own builds" ON "public"."CarBuild" FOR DELETE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Builds: Users can update own builds" ON "public"."CarBuild" FOR UPDATE USING (("userId" = "public"."current_user_id"()));



ALTER TABLE "public"."Car" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."CarBuild" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."CarBuildSetting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."CarBuildUpgrade" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Cars: Public read access" ON "public"."Car" FOR SELECT USING (true);



ALTER TABLE "public"."LapTime" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "LapTimes: Public read access" ON "public"."LapTime" FOR SELECT USING (true);



CREATE POLICY "LapTimes: Users can delete own lap times" ON "public"."LapTime" FOR DELETE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "LapTimes: Users can insert own lap times" ON "public"."LapTime" FOR INSERT WITH CHECK (("userId" = "public"."current_user_id"()));



CREATE POLICY "LapTimes: Users can update own lap times" ON "public"."LapTime" FOR UPDATE USING (("userId" = "public"."current_user_id"()));



ALTER TABLE "public"."LobbySettings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "LobbySettings: Public read access" ON "public"."LobbySettings" FOR SELECT USING (true);



CREATE POLICY "LobbySettings: Users can create lobby settings" ON "public"."LobbySettings" FOR INSERT WITH CHECK (("public"."current_user_id"() IS NOT NULL));



CREATE POLICY "LobbySettings: Users can delete lobby settings" ON "public"."LobbySettings" FOR DELETE USING (("public"."current_user_id"() IS NOT NULL));



CREATE POLICY "LobbySettings: Users can update lobby settings" ON "public"."LobbySettings" FOR UPDATE USING (("public"."current_user_id"() IS NOT NULL));



ALTER TABLE "public"."Note" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Only admins can delete race members" ON "public"."RaceMember" FOR DELETE USING ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Only admins can insert race members" ON "public"."RaceMember" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Only admins can update race members" ON "public"."RaceMember" FOR UPDATE USING ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"));



ALTER TABLE "public"."Part" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."PartCategory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Race" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Race members are viewable by everyone" ON "public"."RaceMember" FOR SELECT USING (true);



ALTER TABLE "public"."RaceCar" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RaceMember" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RunList" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RunListEdit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "RunListEdits: Users can log edits to own run lists" ON "public"."RunListEdit" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunListEdit"."runListId") AND ("RunList"."createdById" = "public"."current_user_id"())))));



CREATE POLICY "RunListEdits: Viewable if run list is viewable" ON "public"."RunListEdit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunListEdit"."runListId") AND (("RunList"."isPublic" = true) OR ("RunList"."createdById" = "public"."current_user_id"()))))));



CREATE POLICY "RunListEntries: Users can manage own run list entries" ON "public"."RunListEntry" USING ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunListEntry"."runListId") AND ("RunList"."createdById" = "public"."current_user_id"())))));



CREATE POLICY "RunListEntries: Viewable if run list is viewable" ON "public"."RunListEntry" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunListEntry"."runListId") AND (("RunList"."isPublic" = true) OR ("RunList"."createdById" = "public"."current_user_id"()))))));



ALTER TABLE "public"."RunListEntry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RunListEntryCar" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "RunListEntryCar: Users can manage own run list entry cars" ON "public"."RunListEntryCar" USING ((EXISTS ( SELECT 1
   FROM ("public"."RunList"
     JOIN "public"."RunListEntry" ON (("RunListEntry"."runListId" = "RunList"."id")))
  WHERE (("RunListEntry"."id" = "RunListEntryCar"."runListEntryId") AND ("RunList"."createdById" = "public"."current_user_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."RunList"
     JOIN "public"."RunListEntry" ON (("RunListEntry"."runListId" = "RunList"."id")))
  WHERE (("RunListEntry"."id" = "RunListEntryCar"."runListEntryId") AND ("RunList"."createdById" = "public"."current_user_id"())))));



CREATE POLICY "RunListEntryCar: Viewable if run list is viewable" ON "public"."RunListEntryCar" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."RunList"
     JOIN "public"."RunListEntry" ON (("RunListEntry"."runListId" = "RunList"."id")))
  WHERE (("RunListEntry"."id" = "RunListEntryCar"."runListEntryId") AND (("RunList"."isPublic" = true) OR ("RunList"."createdById" = "public"."current_user_id"()))))));



CREATE POLICY "RunLists: Public lists viewable by anyone" ON "public"."RunList" FOR SELECT USING ((("isPublic" = true) OR ("createdById" = "public"."current_user_id"())));



CREATE POLICY "RunLists: Users can create run lists" ON "public"."RunList" FOR INSERT WITH CHECK (("createdById" = "public"."current_user_id"()));



CREATE POLICY "RunLists: Users can delete own run lists" ON "public"."RunList" FOR DELETE USING (("createdById" = "public"."current_user_id"()));



CREATE POLICY "RunLists: Users can update own run lists" ON "public"."RunList" FOR UPDATE USING (("createdById" = "public"."current_user_id"()));



ALTER TABLE "public"."RunSession" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Session" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."SessionAttendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Sessions: Public read access" ON "public"."RunSession" FOR SELECT USING (true);



CREATE POLICY "Sessions: Users can create sessions from own run lists" ON "public"."RunSession" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunSession"."runListId") AND ("RunList"."createdById" = "public"."current_user_id"())))));



CREATE POLICY "Sessions: Users can delete own sessions" ON "public"."RunSession" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunSession"."runListId") AND ("RunList"."createdById" = "public"."current_user_id"())))));



CREATE POLICY "Sessions: Users can delete own sessions" ON "public"."Session" FOR DELETE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Sessions: Users can insert own sessions" ON "public"."Session" FOR INSERT WITH CHECK (("userId" = "public"."current_user_id"()));



CREATE POLICY "Sessions: Users can update own sessions" ON "public"."RunSession" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."RunList"
  WHERE (("RunList"."id" = "RunSession"."runListId") AND ("RunList"."createdById" = "public"."current_user_id"())))));



CREATE POLICY "Sessions: Users can update own sessions" ON "public"."Session" FOR UPDATE USING (("userId" = "public"."current_user_id"()));



CREATE POLICY "Sessions: Users can view own sessions" ON "public"."Session" FOR SELECT USING (("userId" = "public"."current_user_id"()));



ALTER TABLE "public"."Track" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Tracks: Public read access" ON "public"."Track" FOR SELECT USING (true);



ALTER TABLE "public"."TuningSection" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."TuningSetting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users: Allow service role inserts" ON "public"."User" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users: Delete restricted" ON "public"."User" FOR DELETE USING (false);



CREATE POLICY "Users: Public data viewable by anyone" ON "public"."User" FOR SELECT USING (true);



CREATE POLICY "Users: Users can update own profile" ON "public"."User" FOR UPDATE USING (("id" = "public"."current_user_id"()));



ALTER TABLE "public"."VerificationToken" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "VerificationTokens: Public delete for auth flow" ON "public"."VerificationToken" FOR DELETE USING (true);



CREATE POLICY "VerificationTokens: Public insert for auth flow" ON "public"."VerificationToken" FOR INSERT WITH CHECK (true);



CREATE POLICY "VerificationTokens: Public read for auth flow" ON "public"."VerificationToken" FOR SELECT USING (true);



CREATE POLICY "notes_delete_own_or_admin" ON "public"."Note" FOR DELETE USING ((("createdBy" = "public"."current_user_id"()) OR ("public"."current_user_id"() IN ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."role" = 'ADMIN'::"public"."UserRole")))));



CREATE POLICY "notes_insert_authenticated" ON "public"."Note" FOR INSERT WITH CHECK (("public"."current_user_id"() IS NOT NULL));



CREATE POLICY "notes_select_all" ON "public"."Note" FOR SELECT USING (true);



CREATE POLICY "notes_update_own_or_admin" ON "public"."Note" FOR UPDATE USING ((("createdBy" = "public"."current_user_id"()) OR ("public"."current_user_id"() IN ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."role" = 'ADMIN'::"public"."UserRole")))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "next_auth" TO "anon";
GRANT USAGE ON SCHEMA "next_auth" TO "authenticated";
GRANT ALL ON SCHEMA "next_auth" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "next_auth"."uid"() TO "anon";
GRANT ALL ON FUNCTION "next_auth"."uid"() TO "authenticated";
GRANT ALL ON FUNCTION "next_auth"."uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_expired_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_race_members_atomic"("member_ids" "text"[], "new_order" integer[], "updated_by_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_race_members_atomic"("member_ids" "text"[], "new_order" integer[], "updated_by_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_race_members_atomic"("member_ids" "text"[], "new_order" integer[], "updated_by_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_races_atomic"("race_ids" "text"[], "new_order" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_races_atomic"("race_ids" "text"[], "new_order" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_races_atomic"("race_ids" "text"[], "new_order" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_next_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_next_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_next_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_part_category_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_part_category_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_part_category_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_part_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_part_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_part_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tuning_section_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tuning_section_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tuning_section_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tuning_setting_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tuning_setting_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tuning_setting_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "next_auth"."accounts" TO "anon";
GRANT ALL ON TABLE "next_auth"."accounts" TO "authenticated";
GRANT ALL ON TABLE "next_auth"."accounts" TO "service_role";



GRANT ALL ON TABLE "next_auth"."sessions" TO "anon";
GRANT ALL ON TABLE "next_auth"."sessions" TO "authenticated";
GRANT ALL ON TABLE "next_auth"."sessions" TO "service_role";



GRANT ALL ON TABLE "next_auth"."users" TO "anon";
GRANT ALL ON TABLE "next_auth"."users" TO "authenticated";
GRANT ALL ON TABLE "next_auth"."users" TO "service_role";



GRANT ALL ON TABLE "next_auth"."verification_tokens" TO "anon";
GRANT ALL ON TABLE "next_auth"."verification_tokens" TO "authenticated";
GRANT ALL ON TABLE "next_auth"."verification_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."Account" TO "anon";
GRANT ALL ON TABLE "public"."Account" TO "authenticated";
GRANT ALL ON TABLE "public"."Account" TO "service_role";



GRANT ALL ON TABLE "public"."Car" TO "anon";
GRANT ALL ON TABLE "public"."Car" TO "authenticated";
GRANT ALL ON TABLE "public"."Car" TO "service_role";



GRANT ALL ON TABLE "public"."CarBuild" TO "anon";
GRANT ALL ON TABLE "public"."CarBuild" TO "authenticated";
GRANT ALL ON TABLE "public"."CarBuild" TO "service_role";



GRANT ALL ON TABLE "public"."CarBuildSetting" TO "anon";
GRANT ALL ON TABLE "public"."CarBuildSetting" TO "authenticated";
GRANT ALL ON TABLE "public"."CarBuildSetting" TO "service_role";



GRANT ALL ON TABLE "public"."CarBuildUpgrade" TO "anon";
GRANT ALL ON TABLE "public"."CarBuildUpgrade" TO "authenticated";
GRANT ALL ON TABLE "public"."CarBuildUpgrade" TO "service_role";



GRANT ALL ON TABLE "public"."LapTime" TO "anon";
GRANT ALL ON TABLE "public"."LapTime" TO "authenticated";
GRANT ALL ON TABLE "public"."LapTime" TO "service_role";



GRANT ALL ON TABLE "public"."LobbySettings" TO "anon";
GRANT ALL ON TABLE "public"."LobbySettings" TO "authenticated";
GRANT ALL ON TABLE "public"."LobbySettings" TO "service_role";



GRANT ALL ON TABLE "public"."Note" TO "anon";
GRANT ALL ON TABLE "public"."Note" TO "authenticated";
GRANT ALL ON TABLE "public"."Note" TO "service_role";



GRANT ALL ON TABLE "public"."Part" TO "anon";
GRANT ALL ON TABLE "public"."Part" TO "authenticated";
GRANT ALL ON TABLE "public"."Part" TO "service_role";



GRANT ALL ON TABLE "public"."PartCategory" TO "anon";
GRANT ALL ON TABLE "public"."PartCategory" TO "authenticated";
GRANT ALL ON TABLE "public"."PartCategory" TO "service_role";



GRANT ALL ON TABLE "public"."Race" TO "anon";
GRANT ALL ON TABLE "public"."Race" TO "authenticated";
GRANT ALL ON TABLE "public"."Race" TO "service_role";



GRANT ALL ON TABLE "public"."RaceCar" TO "anon";
GRANT ALL ON TABLE "public"."RaceCar" TO "authenticated";
GRANT ALL ON TABLE "public"."RaceCar" TO "service_role";



GRANT ALL ON TABLE "public"."RaceMember" TO "anon";
GRANT ALL ON TABLE "public"."RaceMember" TO "authenticated";
GRANT ALL ON TABLE "public"."RaceMember" TO "service_role";



GRANT ALL ON TABLE "public"."RunList" TO "anon";
GRANT ALL ON TABLE "public"."RunList" TO "authenticated";
GRANT ALL ON TABLE "public"."RunList" TO "service_role";



GRANT ALL ON TABLE "public"."RunListEdit" TO "anon";
GRANT ALL ON TABLE "public"."RunListEdit" TO "authenticated";
GRANT ALL ON TABLE "public"."RunListEdit" TO "service_role";



GRANT ALL ON TABLE "public"."RunListEntry" TO "anon";
GRANT ALL ON TABLE "public"."RunListEntry" TO "authenticated";
GRANT ALL ON TABLE "public"."RunListEntry" TO "service_role";



GRANT ALL ON TABLE "public"."RunListEntryCar" TO "anon";
GRANT ALL ON TABLE "public"."RunListEntryCar" TO "authenticated";
GRANT ALL ON TABLE "public"."RunListEntryCar" TO "service_role";



GRANT ALL ON TABLE "public"."RunSession" TO "anon";
GRANT ALL ON TABLE "public"."RunSession" TO "authenticated";
GRANT ALL ON TABLE "public"."RunSession" TO "service_role";



GRANT ALL ON TABLE "public"."Session" TO "anon";
GRANT ALL ON TABLE "public"."Session" TO "authenticated";
GRANT ALL ON TABLE "public"."Session" TO "service_role";



GRANT ALL ON TABLE "public"."SessionAttendance" TO "anon";
GRANT ALL ON TABLE "public"."SessionAttendance" TO "authenticated";
GRANT ALL ON TABLE "public"."SessionAttendance" TO "service_role";



GRANT ALL ON TABLE "public"."Track" TO "anon";
GRANT ALL ON TABLE "public"."Track" TO "authenticated";
GRANT ALL ON TABLE "public"."Track" TO "service_role";



GRANT ALL ON TABLE "public"."TuningSection" TO "anon";
GRANT ALL ON TABLE "public"."TuningSection" TO "authenticated";
GRANT ALL ON TABLE "public"."TuningSection" TO "service_role";



GRANT ALL ON TABLE "public"."TuningSetting" TO "anon";
GRANT ALL ON TABLE "public"."TuningSetting" TO "authenticated";
GRANT ALL ON TABLE "public"."TuningSetting" TO "service_role";



GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";



GRANT ALL ON TABLE "public"."VerificationToken" TO "anon";
GRANT ALL ON TABLE "public"."VerificationToken" TO "authenticated";
GRANT ALL ON TABLE "public"."VerificationToken" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "next_auth" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


