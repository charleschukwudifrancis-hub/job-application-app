CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "Profile" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "JobBoard" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Application" ADD COLUMN "ownerId" TEXT;

CREATE UNIQUE INDEX "Profile_ownerId_key" ON "Profile"("ownerId");
DROP INDEX "JobBoard_provider_slug_key";
CREATE UNIQUE INDEX "JobBoard_ownerId_provider_slug_key" ON "JobBoard"("ownerId", "provider", "slug");
DROP INDEX "JobBoard_active_idx";
CREATE INDEX "JobBoard_ownerId_active_idx" ON "JobBoard"("ownerId", "active");
DROP INDEX "Application_status_updatedAt_idx";
CREATE INDEX "Application_ownerId_status_updatedAt_idx" ON "Application"("ownerId", "status", "updatedAt");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobBoard" ADD CONSTRAINT "JobBoard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
