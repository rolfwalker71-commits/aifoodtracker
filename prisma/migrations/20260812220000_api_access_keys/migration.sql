-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiAccessKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Standard',
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiAccessKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApiAccessKey_keyHash_key" ON "ApiAccessKey"("keyHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiAccessKey_userId_idx" ON "ApiAccessKey"("userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApiAccessKey_userId_fkey'
  ) THEN
    ALTER TABLE "ApiAccessKey"
      ADD CONSTRAINT "ApiAccessKey_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
