-- CreateTable
CREATE TABLE "urls" (
    "id" TEXT NOT NULL,
    "shortCode" VARCHAR(6) NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "customAlias" VARCHAR(20),
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(255),
    "description" TEXT,
    "userAgent" VARCHAR(500),
    "referer" VARCHAR(500),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_analytics" (
    "id" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,
    "referer" TEXT,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(45),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "device" VARCHAR(50),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "urls_shortCode_key" ON "urls"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "urls_customAlias_key" ON "urls"("customAlias");

-- CreateIndex
CREATE INDEX "urls_shortCode_idx" ON "urls"("shortCode");

-- CreateIndex
CREATE INDEX "urls_customAlias_idx" ON "urls"("customAlias");

-- CreateIndex
CREATE INDEX "urls_expiresAt_idx" ON "urls"("expiresAt");

-- CreateIndex
CREATE INDEX "urls_createdAt_idx" ON "urls"("createdAt");

-- CreateIndex
CREATE INDEX "url_analytics_urlId_idx" ON "url_analytics"("urlId");

-- CreateIndex
CREATE INDEX "url_analytics_createdAt_idx" ON "url_analytics"("createdAt");
