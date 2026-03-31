-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT,
    "installedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MerchantConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "isProviderReady" BOOLEAN NOT NULL DEFAULT false,
    "checksumEnabled" BOOLEAN NOT NULL DEFAULT false,
    "callbackBaseUrl" TEXT,
    "returnUrlOverride" TEXT,
    "cancelUrlOverride" TEXT,
    "supportEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MerchantConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClickPesaCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantConfigId" TEXT NOT NULL,
    "encryptedClientId" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "encryptedChecksumKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClickPesaCredential_merchantConfigId_fkey" FOREIGN KEY ("merchantConfigId") REFERENCES "MerchantConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "shopifyPaymentSessionId" TEXT NOT NULL,
    "shopifyPaymentSessionGid" TEXT NOT NULL,
    "paymentGroupId" TEXT NOT NULL,
    "shopifySessionId" TEXT,
    "requestId" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentKind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RECEIVED',
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "merchantLocale" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "billingAddress" JSONB,
    "shippingAddress" JSONB,
    "cancelUrl" TEXT,
    "redirectUrl" TEXT,
    "clickpesaOrderReference" TEXT,
    "clickpesaPaymentReference" TEXT,
    "clickpesaCheckoutLink" TEXT,
    "clickpesaStatus" TEXT,
    "nextActionRedirectUrl" TEXT,
    "resolvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "pendingAt" DATETIME,
    "lastReconciledAt" DATETIME,
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentSessionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "requestId" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAttempt_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentSessionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalReference" TEXT,
    "rawPayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentStatusEvent_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT,
    "paymentSessionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'CLICKPESA',
    "idempotencyKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "rawBody" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WebhookEvent_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefundSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentSessionId" TEXT NOT NULL,
    "shopifyRefundSessionId" TEXT NOT NULL,
    "shopifyRefundSessionGid" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RefundSession_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentSessionId" TEXT NOT NULL,
    "shopifyCaptureSessionId" TEXT NOT NULL,
    "shopifyCaptureSessionGid" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaptureSession_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoidSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentSessionId" TEXT NOT NULL,
    "shopifyVoidSessionId" TEXT NOT NULL,
    "shopifyVoidSessionGid" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoidSession_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT,
    "paymentSessionId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "recordKey" TEXT NOT NULL,
    "checksum" TEXT,
    "response" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantConfig_shopId_key" ON "MerchantConfig"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickPesaCredential_merchantConfigId_key" ON "ClickPesaCredential"("merchantConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_shopifyPaymentSessionId_key" ON "PaymentSession"("shopifyPaymentSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_shopifyPaymentSessionGid_key" ON "PaymentSession"("shopifyPaymentSessionGid");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_clickpesaOrderReference_key" ON "PaymentSession"("clickpesaOrderReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_clickpesaPaymentReference_key" ON "PaymentSession"("clickpesaPaymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_paymentSessionId_attemptNumber_key" ON "PaymentAttempt"("paymentSessionId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_idempotencyKey_key" ON "WebhookEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "RefundSession_shopifyRefundSessionId_key" ON "RefundSession"("shopifyRefundSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundSession_shopifyRefundSessionGid_key" ON "RefundSession"("shopifyRefundSessionGid");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSession_shopifyCaptureSessionId_key" ON "CaptureSession"("shopifyCaptureSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSession_shopifyCaptureSessionGid_key" ON "CaptureSession"("shopifyCaptureSessionGid");

-- CreateIndex
CREATE UNIQUE INDEX "VoidSession_shopifyVoidSessionId_key" ON "VoidSession"("shopifyVoidSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VoidSession_shopifyVoidSessionGid_key" ON "VoidSession"("shopifyVoidSessionGid");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_recordKey_key" ON "IdempotencyRecord"("scope", "recordKey");
