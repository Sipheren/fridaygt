-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PENDING', 'USER', 'ADMIN');
CREATE TYPE "TrackCategory" AS ENUM ('CIRCUIT', 'CITY_COURSE', 'DIRT', 'OVAL');
CREATE TYPE "CarCategory" AS ENUM ('N100', 'N200', 'N300', 'N400', 'N500', 'N600', 'N700', 'N800', 'N900', 'N1000', 'GR1', 'GR2', 'GR3', 'GR4', 'RALLY', 'KART', 'VISION_GT', 'OTHER');
CREATE TYPE "DriveType" AS ENUM ('FF', 'FR', 'MR', 'RR', 'AWD');
CREATE TYPE "RaceType" AS ENUM ('LAPS', 'TIME_TRIAL', 'ENDURANCE');
CREATE TYPE "StartType" AS ENUM ('GRID', 'ROLLING', 'FALSE_START_CHECK');
CREATE TYPE "BoostLevel" AS ENUM ('OFF', 'WEAK', 'STRONG');
CREATE TYPE "DamageLevel" AS ENUM ('NONE', 'LIGHT', 'HEAVY');
CREATE TYPE "PenaltyLevel" AS ENUM ('OFF', 'WEAK', 'DEFAULT', 'STRONG');
CREATE TYPE "WeatherType" AS ENUM ('FIXED', 'RANDOM', 'DYNAMIC');
CREATE TYPE "TimeOfDay" AS ENUM ('DAWN', 'MORNING', 'NOON', 'AFTERNOON', 'DUSK', 'NIGHT');
CREATE TYPE "AssistLevel" AS ENUM ('OFF', 'WEAK', 'DEFAULT', 'STRONG', 'PROHIBITED');
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LEFT', 'NO_SHOW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "length" DOUBLE PRECISION,
    "corners" INTEGER,
    "imageUrl" TEXT,
    "category" "TrackCategory" NOT NULL DEFAULT 'CIRCUIT',
    "isReverse" BOOLEAN NOT NULL DEFAULT false,
    "baseTrackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "year" INTEGER,
    "category" "CarCategory",
    "driveType" "DriveType",
    "displacement" INTEGER,
    "maxPower" INTEGER,
    "maxTorque" INTEGER,
    "weight" INTEGER,
    "pp" INTEGER,
    "imageUrl" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbySettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "laps" INTEGER,
    "raceType" "RaceType" NOT NULL DEFAULT 'LAPS',
    "startType" "StartType" NOT NULL DEFAULT 'GRID',
    "boostLevel" "BoostLevel" NOT NULL DEFAULT 'OFF',
    "tireWearMultiplier" INTEGER NOT NULL DEFAULT 1,
    "fuelConsumption" INTEGER NOT NULL DEFAULT 1,
    "requiredTires" TEXT,
    "mechanicalDamage" "DamageLevel" NOT NULL DEFAULT 'NONE',
    "penaltyLevel" "PenaltyLevel" NOT NULL DEFAULT 'DEFAULT',
    "lowMuSurface" BOOLEAN NOT NULL DEFAULT true,
    "wallCollisionPenalty" BOOLEAN NOT NULL DEFAULT true,
    "cornerCuttingPenalty" BOOLEAN NOT NULL DEFAULT true,
    "weather" "WeatherType" NOT NULL DEFAULT 'FIXED',
    "weatherChangeability" INTEGER NOT NULL DEFAULT 0,
    "timeOfDay" "TimeOfDay" NOT NULL DEFAULT 'NOON',
    "timeProgression" INTEGER NOT NULL DEFAULT 1,
    "abs" "AssistLevel" NOT NULL DEFAULT 'DEFAULT',
    "counterSteer" "AssistLevel" NOT NULL DEFAULT 'DEFAULT',
    "tractionControl" "AssistLevel" NOT NULL DEFAULT 'DEFAULT',
    "activeStabilityMgmt" "AssistLevel" NOT NULL DEFAULT 'DEFAULT',
    "drivingLine" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LobbySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LapTime" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "sessionId" TEXT,
    "notes" TEXT,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LapTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunListEntry" (
    "id" TEXT NOT NULL,
    "runListId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "trackId" TEXT NOT NULL,
    "carId" TEXT,
    "lobbySettingsId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunSession" (
    "id" TEXT NOT NULL,
    "runListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentEntryOrder" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunListEdit" (
    "id" TEXT NOT NULL,
    "runListId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunListEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE UNIQUE INDEX "Track_name_key" ON "Track"("name");
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");
CREATE INDEX "Track_slug_idx" ON "Track"("slug");
CREATE INDEX "Track_category_idx" ON "Track"("category");

CREATE UNIQUE INDEX "Car_slug_key" ON "Car"("slug");
CREATE INDEX "Car_slug_idx" ON "Car"("slug");
CREATE INDEX "Car_manufacturer_idx" ON "Car"("manufacturer");
CREATE INDEX "Car_category_idx" ON "Car"("category");

CREATE INDEX "LobbySettings_name_idx" ON "LobbySettings"("name");

CREATE INDEX "LapTime_userId_trackId_idx" ON "LapTime"("userId", "trackId");
CREATE INDEX "LapTime_userId_carId_trackId_idx" ON "LapTime"("userId", "carId", "trackId");
CREATE INDEX "LapTime_trackId_idx" ON "LapTime"("trackId");
CREATE INDEX "LapTime_carId_idx" ON "LapTime"("carId");
CREATE INDEX "LapTime_sessionId_idx" ON "LapTime"("sessionId");
CREATE INDEX "LapTime_createdAt_idx" ON "LapTime"("createdAt");

CREATE INDEX "RunList_createdById_idx" ON "RunList"("createdById");
CREATE INDEX "RunList_createdAt_idx" ON "RunList"("createdAt");

CREATE UNIQUE INDEX "RunListEntry_runListId_order_key" ON "RunListEntry"("runListId", "order");
CREATE INDEX "RunListEntry_runListId_idx" ON "RunListEntry"("runListId");

CREATE INDEX "RunSession_runListId_idx" ON "RunSession"("runListId");
CREATE INDEX "RunSession_date_idx" ON "RunSession"("date");
CREATE INDEX "RunSession_status_idx" ON "RunSession"("status");

CREATE UNIQUE INDEX "SessionAttendance_sessionId_userId_key" ON "SessionAttendance"("sessionId", "userId");
CREATE INDEX "SessionAttendance_sessionId_idx" ON "SessionAttendance"("sessionId");
CREATE INDEX "SessionAttendance_userId_idx" ON "SessionAttendance"("userId");

CREATE INDEX "RunListEdit_runListId_idx" ON "RunListEdit"("runListId");
CREATE INDEX "RunListEdit_userId_idx" ON "RunListEdit"("userId");
CREATE INDEX "RunListEdit_createdAt_idx" ON "RunListEdit"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Track" ADD CONSTRAINT "Track_baseTrackId_fkey" FOREIGN KEY ("baseTrackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LapTime" ADD CONSTRAINT "LapTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LapTime" ADD CONSTRAINT "LapTime_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LapTime" ADD CONSTRAINT "LapTime_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LapTime" ADD CONSTRAINT "LapTime_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RunSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RunList" ADD CONSTRAINT "RunList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RunListEntry" ADD CONSTRAINT "RunListEntry_runListId_fkey" FOREIGN KEY ("runListId") REFERENCES "RunList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunListEntry" ADD CONSTRAINT "RunListEntry_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunListEntry" ADD CONSTRAINT "RunListEntry_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RunListEntry" ADD CONSTRAINT "RunListEntry_lobbySettingsId_fkey" FOREIGN KEY ("lobbySettingsId") REFERENCES "LobbySettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RunSession" ADD CONSTRAINT "RunSession_runListId_fkey" FOREIGN KEY ("runListId") REFERENCES "RunList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RunSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunListEdit" ADD CONSTRAINT "RunListEdit_runListId_fkey" FOREIGN KEY ("runListId") REFERENCES "RunList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunListEdit" ADD CONSTRAINT "RunListEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
