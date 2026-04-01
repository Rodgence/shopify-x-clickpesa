import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, redirect, json, createCookie } from "@remix-run/node";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, LiveReload, useLoaderData, Link, useActionData, Form } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { PrismaClient, ClickPesaEnvironment, PaymentLifecycleState, PaymentKind, Prisma } from "@prisma/client";
import { createHmac, timingSafeEqual, createDecipheriv, randomBytes, createCipheriv, createHash } from "node:crypto";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return isbot(request.headers.get("user-agent") || "") ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const stylesheet = "/assets/app-Gae4Zin_.css";
const links = () => [
  { rel: "stylesheet", href: stylesheet }
];
function App() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {}),
      /* @__PURE__ */ jsx(LiveReload, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
const prisma = global.__prisma__ ?? new PrismaClient({
  log: ["warn", "error"]
});
if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
async function writeAuditLog(input) {
  try {
    await prisma.auditLog.create({
      data: {
        shopId: input.shopId ?? void 0,
        paymentSessionId: input.paymentSessionId ?? void 0,
        level: input.level ?? "INFO",
        action: input.action,
        actor: input.actor,
        message: input.message,
        context: input.context ?? void 0
      }
    });
  } catch (error) {
    console.error("Failed to persist audit log", error);
  }
}
async function loader$9({ params }) {
  if (!params.sessionRef) {
    throw new Response("Missing payment session reference.", { status: 400 });
  }
  const session = await prisma.paymentSession.findUnique({
    where: { id: params.sessionRef }
  });
  if (!(session == null ? void 0 : session.clickpesaCheckoutLink)) {
    throw new Response("Hosted checkout link is not available.", { status: 404 });
  }
  if (session.state !== "REDIRECTED") {
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: "REDIRECTED"
      }
    });
    await writeAuditLog({
      shopId: session.shopId,
      paymentSessionId: session.id,
      action: "payment_session.redirected",
      actor: "system",
      message: "Redirected buyer to ClickPesa hosted checkout.",
      context: {
        clickpesaCheckoutLink: session.clickpesaCheckoutLink
      }
    });
  }
  return redirect(session.clickpesaCheckoutLink);
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
function getEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    SHOPIFY_APP_SCOPES: process.env.SHOPIFY_APP_SCOPES ?? "write_payment_gateways,write_payment_sessions",
    SHOPIFY_PAYMENTS_API_VERSION: process.env.SHOPIFY_PAYMENTS_API_VERSION ?? "2026-01",
    SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN: process.env.SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN ?? "",
    SHOPIFY_ADMIN_API_KEY: process.env.SHOPIFY_ADMIN_API_KEY ?? "",
    SHOPIFY_ADMIN_API_SECRET: process.env.SHOPIFY_ADMIN_API_SECRET ?? "",
    CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY ?? "",
    CLICKPESA_SANDBOX_BASE_URL: process.env.CLICKPESA_SANDBOX_BASE_URL ?? "https://api.clickpesa.com/third-parties",
    CLICKPESA_LIVE_BASE_URL: process.env.CLICKPESA_LIVE_BASE_URL ?? "https://api.clickpesa.com/third-parties",
    SHOPIFY_REQUIRE_MTLS: process.env.SHOPIFY_REQUIRE_MTLS ?? "true",
    SHOPIFY_MTLS_PROXY_HEADER: process.env.SHOPIFY_MTLS_PROXY_HEADER ?? "x-client-certificate-verified",
    SHOPIFY_MTLS_PROXY_SUCCESS_VALUE: process.env.SHOPIFY_MTLS_PROXY_SUCCESS_VALUE ?? "SUCCESS",
    JOB_SHARED_SECRET: process.env.JOB_SHARED_SECRET ?? "",
    CLICKPESA_SUPPORTS_REFUNDS: process.env.CLICKPESA_SUPPORTS_REFUNDS ?? "false",
    CLICKPESA_SUPPORTS_CAPTURES: process.env.CLICKPESA_SUPPORTS_CAPTURES ?? "false",
    CLICKPESA_SUPPORTS_VOIDS: process.env.CLICKPESA_SUPPORTS_VOIDS ?? "false"
  };
}
function requireEnv(name) {
  const value = getEnv()[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function getBooleanEnv(value) {
  return value.toLowerCase() === "true";
}
function decodeEncryptionKey() {
  const raw = requireEnv("CREDENTIAL_ENCRYPTION_KEY").trim();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be a 32-byte base64-encoded value."
    );
  }
  return key;
}
function encryptSecret(value) {
  const key = decodeEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}
function decryptSecret(value) {
  const [ivPart, tagPart, cipherPart] = value.split(":");
  if (!ivPart || !tagPart || !cipherPart) {
    throw new Error("Encrypted secret is malformed.");
  }
  const key = decodeEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherPart, "base64")),
    decipher.final()
  ]).toString("utf8");
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function hmacSha256(value, secret) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry2) => canonicalize(entry2)).join(",")}]`;
  }
  const objectValue = value;
  const keys = Object.keys(objectValue).filter((key) => objectValue[key] !== void 0).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(objectValue[key])}`).join(",")}}`;
}
function canonicalJson(value) {
  return canonicalize(value);
}
function computePayloadChecksum(payload, secret) {
  return hmacSha256(canonicalJson(payload), secret);
}
function getClickPesaBaseUrl(environment) {
  const env = getEnv();
  return environment === ClickPesaEnvironment.LIVE ? env.CLICKPESA_LIVE_BASE_URL : env.CLICKPESA_SANDBOX_BASE_URL;
}
async function generateClickPesaToken(credentials) {
  const response = await fetch(
    `${getClickPesaBaseUrl(credentials.environment)}/generate-token`,
    {
      method: "POST",
      headers: {
        "client-id": credentials.clientId,
        "api-key": credentials.apiKey
      }
    }
  );
  if (!response.ok) {
    throw new Error(`ClickPesa token request failed with status ${response.status}.`);
  }
  const data = await response.json();
  if (!data.success || !data.token) {
    throw new Error("ClickPesa did not return an authorization token.");
  }
  return data.token;
}
async function createHostedCheckoutLink(token, credentials, payload) {
  const body = {
    amount: payload.amount,
    currency: payload.currency,
    orderReference: payload.orderReference,
    customer: payload.customer,
    callbackUrl: payload.callbackUrl,
    metadata: payload.metadata
  };
  if (credentials.checksumEnabled && credentials.checksumKey) {
    body.checksum = computePayloadChecksum(body, credentials.checksumKey);
  }
  const response = await fetch(
    `${getClickPesaBaseUrl(credentials.environment)}/checkout-link/generate-checkout-url`,
    {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  if (!response.ok) {
    throw new Error(
      `ClickPesa hosted checkout request failed with status ${response.status}.`
    );
  }
  const data = await response.json();
  const checkoutLink = data.checkoutLink ?? data.url ?? data.link;
  if (!checkoutLink || typeof checkoutLink !== "string") {
    throw new Error("ClickPesa did not return a hosted checkout link.");
  }
  return {
    checkoutLink,
    rawResponse: data
  };
}
async function queryClickPesaPaymentStatus(token, credentials, orderReference) {
  const response = await fetch(
    `${getClickPesaBaseUrl(credentials.environment)}/payments/${orderReference}`,
    {
      headers: {
        Authorization: token
      }
    }
  );
  if (!response.ok) {
    throw new Error(
      `ClickPesa payment status query failed with status ${response.status}.`
    );
  }
  const data = await response.json();
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data;
}
function buildOrderReference(session) {
  const compactShop = session.shopId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
  const compactPayment = session.shopifyPaymentSessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  return `CP-${compactShop}-${compactPayment}`;
}
function determinePaymentOutcome(status) {
  const normalized = status == null ? void 0 : status.toUpperCase();
  if (!normalized) {
    return "PENDING";
  }
  if (["SUCCESS", "SETTLED", "PAID"].includes(normalized)) {
    return "RESOLVED";
  }
  if (["FAILED", "CANCELLED", "CANCELED", "DECLINED", "REJECTED"].includes(normalized)) {
    return "REJECTED";
  }
  return "PENDING";
}
function buildReturnUrl(session, callbackBaseUrl) {
  const url = new URL("/clickpesa/return", callbackBaseUrl);
  url.searchParams.set("sessionRef", session.id);
  if (session.clickpesaOrderReference) {
    url.searchParams.set("orderReference", session.clickpesaOrderReference);
  }
  return url.toString();
}
function verifyClickPesaWebhook(payload, checksumKey, headerSignature) {
  if (!checksumKey) {
    return !headerSignature && !payload.checksum;
  }
  const receivedSignature = headerSignature ?? (typeof payload.checksum === "string" ? payload.checksum : null);
  if (!receivedSignature) {
    return false;
  }
  const { checksum, ...payloadWithoutChecksum } = payload;
  const computedSignature = computePayloadChecksum(payloadWithoutChecksum, checksumKey);
  return safeEqual(computedSignature, receivedSignature);
}
function extractWebhookIdentifiers(payload) {
  const paymentReference = typeof payload.paymentReference === "string" ? payload.paymentReference : typeof payload.payment_reference === "string" ? payload.payment_reference : void 0;
  const orderReference = typeof payload.orderReference === "string" ? payload.orderReference : typeof payload.order_reference === "string" ? payload.order_reference : void 0;
  const status = typeof payload.status === "string" ? payload.status : typeof payload.paymentStatus === "string" ? payload.paymentStatus : typeof payload.event === "string" ? payload.event : void 0;
  const eventType = typeof payload.event === "string" ? payload.event : typeof payload.type === "string" ? payload.type : status;
  return {
    paymentReference,
    orderReference,
    status,
    eventType
  };
}
async function ensureShop(shopDomain) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain }
  });
}
async function getMerchantConfig(shopDomain) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: {
      merchantConfig: {
        include: {
          credentials: true
        }
      }
    }
  });
  if (!(shop == null ? void 0 : shop.merchantConfig)) {
    return null;
  }
  return {
    shopId: shop.id,
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    environment: shop.merchantConfig.environment,
    callbackBaseUrl: shop.merchantConfig.callbackBaseUrl,
    returnUrlOverride: shop.merchantConfig.returnUrlOverride,
    cancelUrlOverride: shop.merchantConfig.cancelUrlOverride,
    supportEmail: shop.merchantConfig.supportEmail,
    checksumEnabled: shop.merchantConfig.checksumEnabled,
    providerReady: shop.merchantConfig.isProviderReady,
    credentials: shop.merchantConfig.credentials ? {
      clientId: decryptSecret(
        shop.merchantConfig.credentials.encryptedClientId
      ),
      apiKey: decryptSecret(shop.merchantConfig.credentials.encryptedApiKey),
      checksumKey: shop.merchantConfig.credentials.encryptedChecksumKey ? decryptSecret(shop.merchantConfig.credentials.encryptedChecksumKey) : void 0
    } : void 0
  };
}
async function requireReadyMerchantConfig(shopDomain) {
  const config = await getMerchantConfig(shopDomain);
  if (!(config == null ? void 0 : config.providerReady) || !config.credentials) {
    throw new Response(
      "Merchant configuration is incomplete or provider is not marked ready.",
      { status: 422 }
    );
  }
  return config;
}
async function upsertMerchantConfig(input) {
  const shop = await ensureShop(input.shopDomain);
  const merchantConfig = await prisma.merchantConfig.upsert({
    where: {
      shopId: shop.id
    },
    create: {
      shopId: shop.id,
      environment: input.environment,
      callbackBaseUrl: input.callbackBaseUrl,
      returnUrlOverride: input.returnUrlOverride,
      cancelUrlOverride: input.cancelUrlOverride,
      supportEmail: input.supportEmail,
      checksumEnabled: input.checksumEnabled,
      isProviderReady: input.providerReady
    },
    update: {
      environment: input.environment,
      callbackBaseUrl: input.callbackBaseUrl,
      returnUrlOverride: input.returnUrlOverride,
      cancelUrlOverride: input.cancelUrlOverride,
      supportEmail: input.supportEmail,
      checksumEnabled: input.checksumEnabled,
      isProviderReady: input.providerReady
    }
  });
  if (input.clientId || input.apiKey || input.checksumKey !== void 0) {
    const existing = await prisma.clickPesaCredential.findUnique({
      where: {
        merchantConfigId: merchantConfig.id
      }
    });
    const nextClientId = input.clientId ?? (existing ? decryptSecret(existing.encryptedClientId) : void 0);
    const nextApiKey = input.apiKey ?? (existing ? decryptSecret(existing.encryptedApiKey) : void 0);
    const nextChecksumKey = input.checksumKey !== void 0 ? input.checksumKey : (existing == null ? void 0 : existing.encryptedChecksumKey) ? decryptSecret(existing.encryptedChecksumKey) : void 0;
    if (!nextClientId || !nextApiKey) {
      throw new Error("Client ID and API Key are required.");
    }
    await prisma.clickPesaCredential.upsert({
      where: {
        merchantConfigId: merchantConfig.id
      },
      create: {
        merchantConfigId: merchantConfig.id,
        encryptedClientId: encryptSecret(nextClientId),
        encryptedApiKey: encryptSecret(nextApiKey),
        encryptedChecksumKey: nextChecksumKey ? encryptSecret(nextChecksumKey) : null
      },
      update: {
        encryptedClientId: encryptSecret(nextClientId),
        encryptedApiKey: encryptSecret(nextApiKey),
        encryptedChecksumKey: nextChecksumKey ? encryptSecret(nextChecksumKey) : null
      }
    });
  }
  return getMerchantConfig(input.shopDomain);
}
async function getShopifyPaymentsEndpoint(shopDomain) {
  const env = getEnv();
  const version = env.SHOPIFY_PAYMENTS_API_VERSION;
  return `https://${shopDomain}/payments_apps/api/${version}/graphql.json`;
}
async function getShopifyAccessToken(shopDomain) {
  const env = getEnv();
  if (env.SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN) {
    return env.SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN;
  }
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { accessToken: true }
  });
  if (!(shop == null ? void 0 : shop.accessToken)) {
    throw new Error(
      `No Shopify payments app access token available for ${shopDomain}.`
    );
  }
  return shop.accessToken;
}
async function callPaymentsApi(shopDomain, query, variables) {
  var _a;
  const response = await fetch(await getShopifyPaymentsEndpoint(shopDomain), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getShopifyAccessToken(shopDomain)}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });
  if (!response.ok) {
    throw new Error(
      `Shopify Payments Apps API request failed with status ${response.status}.`
    );
  }
  const payload = await response.json();
  if ((_a = payload.errors) == null ? void 0 : _a.length) {
    throw new Error(payload.errors.map((entry2) => entry2.message).join("; "));
  }
  return payload.data;
}
const PAYMENT_SESSION_SELECTION = `
  paymentSession {
    id
    nextAction {
      action
      context {
        ... on PaymentSessionActionsRedirect {
          redirectUrl
        }
      }
    }
  }
  userErrors {
    field
    message
  }
`;
async function resolvePaymentSession(params) {
  var _a, _b, _c;
  const query = `
    mutation ResolvePaymentSession(
      $id: ID!
      $authorizationExpiresAt: DateTime
      $networkTransactionId: String
    ) {
      paymentSessionResolve(
        id: $id
        authorizationExpiresAt: $authorizationExpiresAt
        networkTransactionId: $networkTransactionId
      ) {
        ${PAYMENT_SESSION_SELECTION}
      }
    }
  `;
  const data = await callPaymentsApi(params.shopDomain, query, {
    id: params.gid,
    authorizationExpiresAt: params.authorizationExpiresAt,
    networkTransactionId: params.networkTransactionId
  });
  const result = data.paymentSessionResolve;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry2) => entry2.message).join("; "));
  }
  return {
    nextActionRedirectUrl: (_c = (_b = (_a = result.paymentSession) == null ? void 0 : _a.nextAction) == null ? void 0 : _b.context) == null ? void 0 : _c.redirectUrl
  };
}
async function pendingPaymentSession(params) {
  var _a, _b, _c;
  const query = `
    mutation PendingPaymentSession(
      $id: ID!
      $reason: PaymentSessionStatePendingReason!
      $pendingExpiresAt: DateTime
    ) {
      paymentSessionPending(
        id: $id
        reason: $reason
        pendingExpiresAt: $pendingExpiresAt
      ) {
        ${PAYMENT_SESSION_SELECTION}
      }
    }
  `;
  const data = await callPaymentsApi(params.shopDomain, query, {
    id: params.gid,
    reason: params.reason,
    pendingExpiresAt: params.pendingExpiresAt
  });
  const result = data.paymentSessionPending;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry2) => entry2.message).join("; "));
  }
  return {
    nextActionRedirectUrl: (_c = (_b = (_a = result.paymentSession) == null ? void 0 : _a.nextAction) == null ? void 0 : _b.context) == null ? void 0 : _c.redirectUrl
  };
}
async function rejectPaymentSession(params) {
  var _a, _b, _c;
  const query = `
    mutation RejectPaymentSession(
      $id: ID!
      $reason: PaymentSessionStateRejectedReason!
      $merchantMessage: String!
    ) {
      paymentSessionReject(
        id: $id
        reason: {
          code: $reason
          merchantMessage: $merchantMessage
        }
      ) {
        ${PAYMENT_SESSION_SELECTION}
      }
    }
  `;
  const data = await callPaymentsApi(params.shopDomain, query, {
    id: params.gid,
    reason: params.reason,
    merchantMessage: params.merchantMessage
  });
  const result = data.paymentSessionReject;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry2) => entry2.message).join("; "));
  }
  return {
    nextActionRedirectUrl: (_c = (_b = (_a = result.paymentSession) == null ? void 0 : _a.nextAction) == null ? void 0 : _b.context) == null ? void 0 : _c.redirectUrl
  };
}
async function executeOperationMutation(shopDomain, query, variables, key) {
  const data = await callPaymentsApi(shopDomain, query, variables);
  const result = data[key];
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry2) => entry2.message).join("; "));
  }
}
async function rejectRefundSession(shopDomain, gid, merchantMessage) {
  return executeOperationMutation(
    shopDomain,
    `
      mutation RejectRefundSession($id: ID!, $merchantMessage: String!) {
        refundSessionReject(
          id: $id
          reason: {
            code: PROCESSING_ERROR
            merchantMessage: $merchantMessage
          }
        ) {
          userErrors {
            message
          }
        }
      }
    `,
    { id: gid, merchantMessage },
    "refundSessionReject"
  );
}
async function rejectCaptureSession(shopDomain, gid, merchantMessage) {
  return executeOperationMutation(
    shopDomain,
    `
      mutation RejectCaptureSession($id: ID!, $merchantMessage: String!) {
        captureSessionReject(
          id: $id
          reason: {
            code: PROCESSING_ERROR
            merchantMessage: $merchantMessage
          }
        ) {
          userErrors {
            message
          }
        }
      }
    `,
    { id: gid, merchantMessage },
    "captureSessionReject"
  );
}
async function rejectVoidSession(shopDomain, gid, merchantMessage) {
  return executeOperationMutation(
    shopDomain,
    `
      mutation RejectVoidSession($id: ID!, $merchantMessage: String!) {
        voidSessionReject(
          id: $id
          reason: {
            code: PROCESSING_ERROR
            merchantMessage: $merchantMessage
          }
        ) {
          userErrors {
            message
          }
        }
      }
    `,
    { id: gid, merchantMessage },
    "voidSessionReject"
  );
}
async function configurePaymentsApp(params) {
  const query = `
    mutation ConfigurePaymentsApp($externalHandle: String, $ready: Boolean!) {
      paymentsAppConfigure(externalHandle: $externalHandle, ready: $ready) {
        paymentsAppConfiguration {
          externalHandle
          ready
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const data = await callPaymentsApi(params.shopDomain, query, {
    externalHandle: params.externalHandle,
    ready: params.ready
  });
  const result = data.paymentsAppConfigure;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry2) => entry2.message).join("; "));
  }
  return result.paymentsAppConfiguration;
}
async function finalizePaymentSessionFromStatus(paymentSessionId, status, paymentReference) {
  const session = await prisma.paymentSession.findUnique({
    where: { id: paymentSessionId },
    include: {
      shop: true
    }
  });
  if (!session) {
    throw new Error("Payment session not found.");
  }
  const outcome = determinePaymentOutcome(status);
  if (outcome === "RESOLVED" && session.state !== PaymentLifecycleState.RESOLVED) {
    const response = await resolvePaymentSession({
      shopDomain: session.shop.shopDomain,
      gid: session.shopifyPaymentSessionGid,
      networkTransactionId: paymentReference
    });
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: PaymentLifecycleState.RESOLVED,
        clickpesaStatus: status,
        clickpesaPaymentReference: paymentReference,
        resolvedAt: /* @__PURE__ */ new Date(),
        nextActionRedirectUrl: response.nextActionRedirectUrl
      }
    });
  } else if (outcome === "REJECTED" && session.state !== PaymentLifecycleState.REJECTED) {
    const response = await rejectPaymentSession({
      shopDomain: session.shop.shopDomain,
      gid: session.shopifyPaymentSessionGid,
      reason: "PROCESSING_ERROR",
      merchantMessage: "ClickPesa reported that the payment failed."
    });
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: PaymentLifecycleState.REJECTED,
        clickpesaStatus: status,
        clickpesaPaymentReference: paymentReference,
        rejectedAt: /* @__PURE__ */ new Date(),
        nextActionRedirectUrl: response.nextActionRedirectUrl
      }
    });
  } else if (session.state !== PaymentLifecycleState.PENDING) {
    const response = await pendingPaymentSession({
      shopDomain: session.shop.shopDomain,
      gid: session.shopifyPaymentSessionGid,
      reason: "PARTNER_ACTION_REQUIRED",
      pendingExpiresAt: new Date(Date.now() + 15 * 60 * 1e3).toISOString()
    });
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: PaymentLifecycleState.PENDING,
        clickpesaStatus: status,
        clickpesaPaymentReference: paymentReference,
        pendingAt: /* @__PURE__ */ new Date(),
        nextActionRedirectUrl: response.nextActionRedirectUrl
      }
    });
  }
  await prisma.paymentStatusEvent.create({
    data: {
      paymentSessionId: session.id,
      source: "CLICKPESA",
      status,
      externalReference: paymentReference
    }
  });
  await writeAuditLog({
    shopId: session.shopId,
    paymentSessionId: session.id,
    action: "payment_session.finalized",
    actor: "clickpesa",
    message: "Applied ClickPesa payment status to Shopify payment session.",
    context: {
      status,
      paymentReference,
      outcome
    }
  });
  return prisma.paymentSession.findUnique({
    where: { id: session.id }
  });
}
async function reconcilePaymentSession(paymentSessionId) {
  const session = await prisma.paymentSession.findUnique({
    where: { id: paymentSessionId },
    include: {
      shop: true
    }
  });
  if (!(session == null ? void 0 : session.clickpesaOrderReference)) {
    throw new Error("Payment session is missing ClickPesa order reference.");
  }
  const merchantConfig = await requireReadyMerchantConfig(session.shop.shopDomain);
  const token = await generateClickPesaToken({
    environment: merchantConfig.environment,
    clientId: merchantConfig.credentials.clientId,
    apiKey: merchantConfig.credentials.apiKey,
    checksumEnabled: merchantConfig.checksumEnabled,
    checksumKey: merchantConfig.credentials.checksumKey
  });
  const payment = await queryClickPesaPaymentStatus(
    token,
    {
      environment: merchantConfig.environment,
      clientId: merchantConfig.credentials.clientId,
      apiKey: merchantConfig.credentials.apiKey,
      checksumEnabled: merchantConfig.checksumEnabled,
      checksumKey: merchantConfig.credentials.checksumKey
    },
    session.clickpesaOrderReference
  );
  await prisma.paymentSession.update({
    where: { id: session.id },
    data: {
      lastReconciledAt: /* @__PURE__ */ new Date(),
      clickpesaStatus: payment == null ? void 0 : payment.status,
      clickpesaPaymentReference: payment == null ? void 0 : payment.paymentReference,
      state: PaymentLifecycleState.RECONCILING
    }
  });
  if (payment == null ? void 0 : payment.status) {
    return finalizePaymentSessionFromStatus(
      session.id,
      payment.status,
      payment.paymentReference
    );
  }
  return prisma.paymentSession.findUnique({
    where: { id: session.id }
  });
}
async function action$6({ request }) {
  var _a;
  const rawBody = await request.text();
  if (!rawBody) {
    throw new Response("Webhook body is required.", { status: 400 });
  }
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Response("Webhook body must be valid JSON.", { status: 400 });
  }
  const headerSignature = request.headers.get("x-clickpesa-signature") ?? request.headers.get("x-clickpesa-checksum");
  const headerEventId = request.headers.get("x-clickpesa-event-id") ?? request.headers.get("x-webhook-id");
  const identifiers = extractWebhookIdentifiers(payload);
  const session = identifiers.orderReference ? await prisma.paymentSession.findUnique({
    where: { clickpesaOrderReference: identifiers.orderReference },
    include: { shop: true }
  }) : identifiers.paymentReference ? await prisma.paymentSession.findFirst({
    where: { clickpesaPaymentReference: identifiers.paymentReference },
    include: { shop: true }
  }) : null;
  const merchantConfig = session ? await getMerchantConfig(session.shop.shopDomain) : null;
  const verified = verifyClickPesaWebhook(
    payload,
    (_a = merchantConfig == null ? void 0 : merchantConfig.credentials) == null ? void 0 : _a.checksumKey,
    headerSignature
  );
  const idempotencyKey = headerEventId ?? `${identifiers.eventType ?? "unknown"}:${identifiers.orderReference ?? "no-order"}:${identifiers.paymentReference ?? "no-payment"}:${identifiers.status ?? "no-status"}`;
  const existing = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey }
  });
  if (existing) {
    return json({ status: "duplicate" });
  }
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      shopId: session == null ? void 0 : session.shopId,
      paymentSessionId: session == null ? void 0 : session.id,
      idempotencyKey,
      eventType: identifiers.eventType ?? "UNKNOWN",
      verified,
      rawBody,
      payload
    }
  });
  try {
    if (session && verified && identifiers.status) {
      await finalizePaymentSessionFromStatus(
        session.id,
        identifiers.status,
        identifiers.paymentReference
      );
    }
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processedAt: /* @__PURE__ */ new Date()
      }
    });
    return json({ status: "ok", verified });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        errorMessage: error instanceof Error ? error.message : "Webhook processing failed."
      }
    });
    throw error;
  }
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: "Module" }));
async function action$5({ request }) {
  const authorization = request.headers.get("Authorization");
  const expected = getEnv().JOB_SHARED_SECRET;
  if (!expected || authorization !== `Bearer ${expected}`) {
    throw new Response("Unauthorized.", { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "25");
  const sessions = await prisma.paymentSession.findMany({
    where: {
      state: {
        in: ["PENDING", "REDIRECTED", "RECONCILING"]
      }
    },
    orderBy: {
      updatedAt: "asc"
    },
    take: Math.min(Math.max(limit, 1), 100)
  });
  const results = [];
  for (const session of sessions) {
    try {
      const reconciled = await reconcilePaymentSession(session.id);
      results.push({
        sessionId: session.id,
        state: (reconciled == null ? void 0 : reconciled.state) ?? session.state
      });
    } catch (error) {
      results.push({
        sessionId: session.id,
        error: error instanceof Error ? error.message : "Reconciliation failed."
      });
    }
  }
  return json({
    processed: results.length,
    results
  });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$8(_) {
  const merchants = await prisma.merchantConfig.findMany({
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      shop: true,
      credentials: {
        select: {
          id: true
        }
      }
    }
  });
  return json({ merchants });
}
function ClickPesaSettingsRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs("section", { className: "panel stack", children: [
    /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 4 }, children: [
      /* @__PURE__ */ jsx("h2", { children: "ClickPesa settings inventory" }),
      /* @__PURE__ */ jsx("p", { className: "muted", children: "Review which merchants have credentials stored, checksum verification enabled, and provider readiness switched on." })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { className: "table", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { children: "Shop" }),
        /* @__PURE__ */ jsx("th", { children: "Environment" }),
        /* @__PURE__ */ jsx("th", { children: "Credentials" }),
        /* @__PURE__ */ jsx("th", { children: "Checksum" }),
        /* @__PURE__ */ jsx("th", { children: "Ready" }),
        /* @__PURE__ */ jsx("th", { children: "Updated" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.merchants.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 6, children: /* @__PURE__ */ jsx("p", { className: "muted", children: "No merchant settings saved yet." }) }) }) : data.merchants.map((merchant) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 6 }, children: [
          /* @__PURE__ */ jsx("strong", { children: merchant.shop.shopDomain }),
          /* @__PURE__ */ jsx(Link, { to: `/app/onboarding?shop=${merchant.shop.shopDomain}`, children: "Edit configuration" })
        ] }) }),
        /* @__PURE__ */ jsx("td", { children: merchant.environment }),
        /* @__PURE__ */ jsx("td", { children: merchant.credentials ? "Stored" : "Missing" }),
        /* @__PURE__ */ jsx("td", { children: merchant.checksumEnabled ? "Enabled" : "Disabled" }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", { className: merchant.isProviderReady ? "badge" : "badge warn", children: merchant.isProviderReady ? "Ready" : "Blocked" }) }),
        /* @__PURE__ */ jsx("td", { children: new Date(merchant.updatedAt).toLocaleString() })
      ] }, merchant.id)) })
    ] }) })
  ] });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClickPesaSettingsRoute,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
function getOauthStateCookie() {
  const env = getEnv();
  return createCookie("__clickpesa_shopify_oauth_state", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production" || env.APP_URL.toLowerCase().startsWith("https://"),
    path: "/",
    maxAge: 60 * 5,
    secrets: [requireEnv("SHOPIFY_ADMIN_API_SECRET")]
  });
}
function encodeQueryComponent(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
function buildSignaturePayload(url) {
  return Array.from(url.searchParams.entries()).filter(([key]) => key !== "hmac" && key !== "signature").map(
    ([key, value]) => `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`
  ).sort().join("&");
}
function buildRedirectUri() {
  return new URL("/auth/callback", requireEnv("APP_URL")).toString();
}
function normalizeShopDomain(value) {
  if (!value) {
    return null;
  }
  let normalized = value.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.split("/")[0] ?? "";
  normalized = normalized.split("?")[0] ?? normalized;
  if (normalized && !normalized.includes(".")) {
    normalized = `${normalized}.myshopify.com`;
  }
  return SHOP_DOMAIN_PATTERN.test(normalized) ? normalized : null;
}
function assertValidShopDomain(value) {
  const shopDomain = normalizeShopDomain(value);
  if (!shopDomain) {
    throw new Response("Invalid Shopify shop domain.", { status: 400 });
  }
  return shopDomain;
}
function verifyShopifyHmac(url) {
  const hmac = url.searchParams.get("hmac");
  if (!hmac) {
    return false;
  }
  const digest = hmacSha256(
    buildSignaturePayload(url),
    requireEnv("SHOPIFY_ADMIN_API_SECRET")
  );
  return safeEqual(digest, hmac.toLowerCase());
}
async function getInstalledShop(shopDomain) {
  return prisma.shop.findUnique({
    where: { shopDomain },
    select: {
      accessToken: true,
      installedAt: true
    }
  });
}
async function beginShopifyAuthorization(shopDomain) {
  const env = getEnv();
  const state = randomBytes(16).toString("hex");
  const authorizationUrl = new URL(
    `https://${shopDomain}/admin/oauth/authorize`
  );
  authorizationUrl.searchParams.set(
    "client_id",
    requireEnv("SHOPIFY_ADMIN_API_KEY")
  );
  authorizationUrl.searchParams.set("redirect_uri", buildRedirectUri());
  authorizationUrl.searchParams.set("state", state);
  if (env.SHOPIFY_APP_SCOPES.trim()) {
    authorizationUrl.searchParams.set("scope", env.SHOPIFY_APP_SCOPES.trim());
  }
  return {
    authorizationUrl: authorizationUrl.toString(),
    stateCookie: await getOauthStateCookie().serialize(state)
  };
}
async function consumeShopifyAuthorizationCallback(request) {
  const url = new URL(request.url);
  const shopDomain = assertValidShopDomain(url.searchParams.get("shop"));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    throw new Response("Missing Shopify OAuth callback parameters.", {
      status: 400
    });
  }
  if (!verifyShopifyHmac(url)) {
    throw new Response("Invalid Shopify callback signature.", { status: 401 });
  }
  const cookieState = await getOauthStateCookie().parse(
    request.headers.get("Cookie")
  );
  if (typeof cookieState !== "string" || !safeEqual(cookieState, state)) {
    throw new Response("Invalid Shopify OAuth state.", { status: 401 });
  }
  const accessToken = await exchangeShopifyAccessToken(shopDomain, code);
  const now = /* @__PURE__ */ new Date();
  await prisma.shop.upsert({
    where: { shopDomain },
    update: {
      accessToken,
      installedAt: now
    },
    create: {
      shopDomain,
      accessToken,
      installedAt: now
    }
  });
  return {
    shopDomain,
    clearStateCookie: await getOauthStateCookie().serialize("", {
      maxAge: 0
    })
  };
}
async function exchangeShopifyAccessToken(shopDomain, code) {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: requireEnv("SHOPIFY_ADMIN_API_KEY"),
      client_secret: requireEnv("SHOPIFY_ADMIN_API_SECRET"),
      code
    }).toString()
  });
  if (!response.ok) {
    throw new Response(
      `Shopify OAuth token exchange failed with status ${response.status}.`,
      { status: 502 }
    );
  }
  const payload = await response.json();
  if (!payload.access_token) {
    throw new Response(
      "Shopify OAuth response did not include an access token.",
      { status: 502 }
    );
  }
  return payload.access_token;
}
async function loader$7({ request }) {
  const { shopDomain, clearStateCookie } = await consumeShopifyAuthorizationCallback(request);
  return redirect(
    `/app/onboarding?shop=${encodeURIComponent(shopDomain)}&installed=1`,
    {
      headers: {
        "Set-Cookie": clearStateCookie
      }
    }
  );
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
async function parseJsonRequest(request) {
  const rawBody = await request.text();
  if (!rawBody) {
    throw new Response("Request body is required.", { status: 400 });
  }
  try {
    return {
      rawBody,
      body: JSON.parse(rawBody)
    };
  } catch {
    throw new Response("Invalid JSON request body.", { status: 400 });
  }
}
function getShopifyRequestContext(request) {
  const shopDomain = request.headers.get("Shopify-Shop-Domain");
  const requestId = request.headers.get("Shopify-Request-Id");
  const apiVersion = request.headers.get("Shopify-Api-Version") ?? getEnv().SHOPIFY_PAYMENTS_API_VERSION;
  if (!shopDomain || !requestId) {
    throw new Response("Missing required Shopify request headers.", {
      status: 400
    });
  }
  return {
    shopDomain,
    requestId,
    apiVersion
  };
}
function assertShopifyOrigin(request) {
  const env = getEnv();
  if (!getBooleanEnv(env.SHOPIFY_REQUIRE_MTLS)) {
    return;
  }
  const verifiedHeader = request.headers.get(env.SHOPIFY_MTLS_PROXY_HEADER);
  if (verifiedHeader === env.SHOPIFY_MTLS_PROXY_SUCCESS_VALUE) {
    return;
  }
  throw new Response("Shopify client certificate verification failed.", {
    status: 401
  });
}
async function action$4({ request }) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest(request);
  const paymentSession = await prisma.paymentSession.findFirst({
    where: {
      OR: [
        { shopifyPaymentSessionId: body.payment_id },
        { shopifyPaymentSessionGid: body.payment_id }
      ]
    }
  });
  if (!paymentSession) {
    throw new Response("Payment session not found for capture request.", { status: 404 });
  }
  const supportsCaptures = getBooleanEnv(getEnv().CLICKPESA_SUPPORTS_CAPTURES);
  await prisma.captureSession.upsert({
    where: { shopifyCaptureSessionId: body.id },
    create: {
      paymentSessionId: paymentSession.id,
      shopifyCaptureSessionId: body.id,
      shopifyCaptureSessionGid: body.gid,
      amount: body.amount,
      currency: body.currency,
      state: supportsCaptures ? "PENDING" : "BLOCKED",
      payload: body
    },
    update: {
      amount: body.amount,
      currency: body.currency,
      state: supportsCaptures ? "PENDING" : "BLOCKED",
      payload: body
    }
  });
  await rejectCaptureSession(
    context.shopDomain,
    body.gid,
    supportsCaptures ? "Capture route is scaffolded but ClickPesa capture API integration is not implemented yet." : "Captures are blocked until ClickPesa capture support is confirmed."
  );
  await writeAuditLog({
    shopId: paymentSession.shopId,
    paymentSessionId: paymentSession.id,
    action: "capture_session.received",
    actor: "shopify",
    message: "Received capture session request and rejected it because provider-side support is not wired yet.",
    context: {
      captureSessionId: body.id,
      requestId: context.requestId
    }
  });
  return json({ status: "accepted" }, { status: 202 });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: "Module" }));
async function createOffsitePaymentSession(payload, context) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const existingSession = await prisma.paymentSession.findUnique({
    where: {
      shopifyPaymentSessionId: payload.id
    }
  });
  if (existingSession == null ? void 0 : existingSession.redirectUrl) {
    return {
      paymentSession: existingSession,
      redirectUrl: existingSession.redirectUrl,
      reused: true
    };
  }
  const merchantConfig = await requireReadyMerchantConfig(context.shopDomain);
  const callbackBaseUrl = merchantConfig.callbackBaseUrl ?? getEnv().APP_URL;
  const created = await prisma.paymentSession.create({
    data: {
      shopId: merchantConfig.shopId,
      shopifyPaymentSessionId: payload.id,
      shopifyPaymentSessionGid: payload.gid,
      paymentGroupId: payload.group,
      shopifySessionId: payload.session_id,
      requestId: context.requestId,
      amount: new Prisma.Decimal(payload.amount),
      currency: payload.currency,
      paymentKind: payload.kind === "authorization" ? PaymentKind.AUTHORIZATION : PaymentKind.SALE,
      state: PaymentLifecycleState.RECEIVED,
      testMode: payload.test,
      merchantLocale: payload.merchant_locale,
      customerEmail: (_a = payload.customer) == null ? void 0 : _a.email,
      customerPhone: (_b = payload.customer) == null ? void 0 : _b.phone_number,
      billingAddress: (_c = payload.customer) == null ? void 0 : _c.billing_address,
      shippingAddress: (_d = payload.customer) == null ? void 0 : _d.shipping_address,
      cancelUrl: merchantConfig.cancelUrlOverride ?? payload.payment_method.data.cancel_url,
      metadata: {
        proposedAt: payload.proposed_at,
        clientDetails: payload.client_details
      }
    }
  });
  const clickpesaOrderReference = buildOrderReference({
    shopId: created.shopId,
    shopifyPaymentSessionId: created.shopifyPaymentSessionId
  });
  const token = await generateClickPesaToken({
    environment: merchantConfig.environment,
    clientId: merchantConfig.credentials.clientId,
    apiKey: merchantConfig.credentials.apiKey,
    checksumEnabled: merchantConfig.checksumEnabled,
    checksumKey: merchantConfig.credentials.checksumKey
  });
  const callbackUrl = merchantConfig.returnUrlOverride ?? buildReturnUrl(
    {
      id: created.id,
      clickpesaOrderReference
    },
    callbackBaseUrl
  );
  const clickPesaCheckout = await createHostedCheckoutLink(
    token,
    {
      environment: merchantConfig.environment,
      clientId: merchantConfig.credentials.clientId,
      apiKey: merchantConfig.credentials.apiKey,
      checksumEnabled: merchantConfig.checksumEnabled,
      checksumKey: merchantConfig.credentials.checksumKey
    },
    {
      amount: Number(payload.amount),
      currency: payload.currency,
      orderReference: clickpesaOrderReference,
      callbackUrl,
      customer: {
        customerName: [
          (_f = (_e = payload.customer) == null ? void 0 : _e.billing_address) == null ? void 0 : _f.given_name,
          (_h = (_g = payload.customer) == null ? void 0 : _g.billing_address) == null ? void 0 : _h.family_name
        ].filter(Boolean).join(" ").trim(),
        customerPhoneNumber: (_i = payload.customer) == null ? void 0 : _i.phone_number,
        customerEmail: (_j = payload.customer) == null ? void 0 : _j.email
      },
      metadata: {
        shopifyPaymentSessionId: payload.id,
        shopDomain: context.shopDomain
      }
    }
  );
  const redirectUrl = new URL(`/clickpesa/redirect/${created.id}`, callbackBaseUrl).toString();
  const paymentSession = await prisma.paymentSession.update({
    where: {
      id: created.id
    },
    data: {
      clickpesaOrderReference,
      clickpesaCheckoutLink: clickPesaCheckout.checkoutLink,
      redirectUrl,
      state: PaymentLifecycleState.REDIRECT_READY
    }
  });
  await prisma.paymentAttempt.create({
    data: {
      paymentSessionId: paymentSession.id,
      attemptNumber: 1,
      requestId: context.requestId,
      requestPayload: payload,
      responsePayload: clickPesaCheckout.rawResponse
    }
  });
  await prisma.paymentStatusEvent.create({
    data: {
      paymentSessionId: paymentSession.id,
      source: "SHOPIFY",
      status: "REDIRECT_READY",
      externalReference: payload.id,
      rawPayload: payload
    }
  });
  await writeAuditLog({
    shopId: merchantConfig.shopId,
    paymentSessionId: paymentSession.id,
    action: "payment_session.created",
    actor: "shopify",
    message: "Created offsite payment session and generated hosted checkout redirect.",
    context: {
      requestId: context.requestId,
      redirectUrl,
      clickpesaOrderReference
    }
  });
  return {
    paymentSession,
    redirectUrl,
    reused: false
  };
}
async function getIdempotentResponse(scope, key, payload) {
  const record = await prisma.idempotencyRecord.findUnique({
    where: {
      scope_recordKey: {
        scope,
        recordKey: key
      }
    }
  });
  if (!record) {
    return null;
  }
  const checksum = sha256(JSON.stringify(payload));
  if (record.checksum && record.checksum !== checksum) {
    throw new Response("Idempotency key payload mismatch.", { status: 409 });
  }
  return record.response ?? null;
}
async function saveIdempotentResponse(scope, key, payload, response) {
  const checksum = sha256(JSON.stringify(payload));
  await prisma.idempotencyRecord.upsert({
    where: {
      scope_recordKey: {
        scope,
        recordKey: key
      }
    },
    create: {
      scope,
      recordKey: key,
      checksum,
      response
    },
    update: {
      checksum,
      response
    }
  });
}
async function action$3({ request }) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest(request);
  const existingResponse = await getIdempotentResponse(
    `payment-session:${context.shopDomain}`,
    body.id,
    body
  );
  if (existingResponse) {
    return json(existingResponse);
  }
  const result = await createOffsitePaymentSession(body, context);
  const response = {
    redirect_url: result.redirectUrl
  };
  await saveIdempotentResponse(
    `payment-session:${context.shopDomain}`,
    body.id,
    body,
    response
  );
  return json(response);
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: "Module" }));
async function action$2({ request }) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest(request);
  const paymentSession = await prisma.paymentSession.findFirst({
    where: {
      OR: [
        { shopifyPaymentSessionId: body.payment_id },
        { shopifyPaymentSessionGid: body.payment_id }
      ]
    }
  });
  if (!paymentSession) {
    throw new Response("Payment session not found for refund request.", { status: 404 });
  }
  const supportsRefunds = getBooleanEnv(getEnv().CLICKPESA_SUPPORTS_REFUNDS);
  await prisma.refundSession.upsert({
    where: { shopifyRefundSessionId: body.id },
    create: {
      paymentSessionId: paymentSession.id,
      shopifyRefundSessionId: body.id,
      shopifyRefundSessionGid: body.gid,
      amount: body.amount,
      currency: body.currency,
      state: supportsRefunds ? "PENDING" : "BLOCKED",
      payload: body
    },
    update: {
      amount: body.amount,
      currency: body.currency,
      state: supportsRefunds ? "PENDING" : "BLOCKED",
      payload: body
    }
  });
  await rejectRefundSession(
    context.shopDomain,
    body.gid,
    supportsRefunds ? "Refund route is scaffolded but ClickPesa refund API integration is not implemented yet." : "Refunds are blocked until ClickPesa refund support is confirmed."
  );
  await writeAuditLog({
    shopId: paymentSession.shopId,
    paymentSessionId: paymentSession.id,
    action: "refund_session.received",
    actor: "shopify",
    message: "Received refund session request and rejected it because provider-side support is not wired yet.",
    context: {
      refundSessionId: body.id,
      requestId: context.requestId
    }
  });
  return json({ status: "accepted" }, { status: 202 });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2
}, Symbol.toStringTag, { value: "Module" }));
async function action$1({ request }) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest(request);
  const paymentSession = await prisma.paymentSession.findFirst({
    where: {
      OR: [
        { shopifyPaymentSessionId: body.payment_id },
        { shopifyPaymentSessionGid: body.payment_id }
      ]
    }
  });
  if (!paymentSession) {
    throw new Response("Payment session not found for void request.", { status: 404 });
  }
  const supportsVoids = getBooleanEnv(getEnv().CLICKPESA_SUPPORTS_VOIDS);
  await prisma.voidSession.upsert({
    where: { shopifyVoidSessionId: body.id },
    create: {
      paymentSessionId: paymentSession.id,
      shopifyVoidSessionId: body.id,
      shopifyVoidSessionGid: body.gid,
      state: supportsVoids ? "PENDING" : "BLOCKED",
      payload: body
    },
    update: {
      state: supportsVoids ? "PENDING" : "BLOCKED",
      payload: body
    }
  });
  await rejectVoidSession(
    context.shopDomain,
    body.gid,
    supportsVoids ? "Void route is scaffolded but ClickPesa void API integration is not implemented yet." : "Voids are blocked until ClickPesa void support is confirmed."
  );
  await writeAuditLog({
    shopId: paymentSession.shopId,
    paymentSessionId: paymentSession.id,
    action: "void_session.received",
    actor: "shopify",
    message: "Received void session request and rejected it because provider-side support is not wired yet.",
    context: {
      voidSessionId: body.id,
      requestId: context.requestId
    }
  });
  return json({ status: "accepted" }, { status: 202 });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader$6({ request }) {
  const url = new URL(request.url);
  const sessionRef = url.searchParams.get("sessionRef");
  const orderReference = url.searchParams.get("orderReference");
  const session = sessionRef ? await prisma.paymentSession.findUnique({
    where: { id: sessionRef },
    include: { shop: true }
  }) : orderReference ? await prisma.paymentSession.findUnique({
    where: { clickpesaOrderReference: orderReference },
    include: { shop: true }
  }) : null;
  if (!session) {
    throw new Response("Payment session could not be resolved for cancellation.", {
      status: 404
    });
  }
  const mutation = await rejectPaymentSession({
    shopDomain: session.shop.shopDomain,
    gid: session.shopifyPaymentSessionGid,
    reason: "PROCESSING_ERROR",
    merchantMessage: "Buyer cancelled the ClickPesa hosted checkout."
  });
  await prisma.paymentSession.update({
    where: { id: session.id },
    data: {
      state: "CANCELLED",
      rejectedAt: /* @__PURE__ */ new Date(),
      clickpesaStatus: "CANCELLED",
      nextActionRedirectUrl: mutation.nextActionRedirectUrl
    }
  });
  await writeAuditLog({
    shopId: session.shopId,
    paymentSessionId: session.id,
    action: "payment_session.cancelled",
    actor: "buyer",
    message: "Buyer cancelled ClickPesa hosted checkout."
  });
  return redirect(
    mutation.nextActionRedirectUrl ?? new URL(`/clickpesa/return?sessionRef=${session.id}&status=CANCELLED`, url.origin).toString()
  );
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
async function loader$5({ request }) {
  const url = new URL(request.url);
  const sessionRef = url.searchParams.get("sessionRef");
  const orderReference = url.searchParams.get("orderReference");
  const status = url.searchParams.get("status");
  const paymentReference = url.searchParams.get("paymentReference") ?? void 0;
  const session = sessionRef ? await prisma.paymentSession.findUnique({
    where: { id: sessionRef }
  }) : orderReference ? await prisma.paymentSession.findUnique({
    where: { clickpesaOrderReference: orderReference }
  }) : null;
  if (!session) {
    throw new Response("Payment session could not be resolved from the return URL.", {
      status: 404
    });
  }
  const finalized = status ? await finalizePaymentSessionFromStatus(session.id, status, paymentReference) : await reconcilePaymentSession(session.id);
  return json({
    session: finalized,
    continueUrl: (finalized == null ? void 0 : finalized.nextActionRedirectUrl) ?? session.cancelUrl ?? null
  });
}
function describeState(state) {
  switch (state) {
    case "RESOLVED":
      return "Payment completed and Shopify has been updated.";
    case "REJECTED":
      return "Payment failed or was cancelled.";
    case "PENDING":
    case "RECONCILING":
      return "Payment is still being reconciled with ClickPesa.";
    default:
      return "Payment state is being checked.";
  }
}
function ClickPesaReturnRoute() {
  var _a, _b, _c, _d, _e, _f, _g;
  const data = useLoaderData();
  return /* @__PURE__ */ jsx("main", { className: "grid", children: /* @__PURE__ */ jsxs("section", { className: "panel stack", children: [
    /* @__PURE__ */ jsx(
      "span",
      {
        className: ((_a = data.session) == null ? void 0 : _a.state) === "RESOLVED" ? "badge" : ((_b = data.session) == null ? void 0 : _b.state) === "REJECTED" ? "badge danger" : "badge warn",
        children: ((_c = data.session) == null ? void 0 : _c.state) ?? "UNKNOWN"
      }
    ),
    /* @__PURE__ */ jsx("h1", { children: "ClickPesa payment return" }),
    /* @__PURE__ */ jsx("p", { className: "muted", children: describeState((_d = data.session) == null ? void 0 : _d.state) }),
    /* @__PURE__ */ jsxs("div", { className: "grid two", children: [
      /* @__PURE__ */ jsxs("div", { className: "panel stack", children: [
        /* @__PURE__ */ jsx("h2", { children: "Shopify session" }),
        /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("code", { children: (_e = data.session) == null ? void 0 : _e.shopifyPaymentSessionId }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "panel stack", children: [
        /* @__PURE__ */ jsx("h2", { children: "ClickPesa reference" }),
        /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("code", { children: ((_f = data.session) == null ? void 0 : _f.clickpesaPaymentReference) ?? ((_g = data.session) == null ? void 0 : _g.clickpesaOrderReference) ?? "Pending" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: [
      data.continueUrl ? /* @__PURE__ */ jsx("a", { className: "button", href: data.continueUrl, children: "Continue to Shopify" }) : null,
      /* @__PURE__ */ jsx(Link, { className: "button secondary", to: "/app", children: "Open operations dashboard" })
    ] })
  ] }) });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ClickPesaReturnRoute,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$4({ request }) {
  const url = new URL(request.url);
  const shopDomain = normalizeShopDomain(url.searchParams.get("shop"));
  return json({
    shopDomain,
    merchantConfig: shopDomain ? await getMerchantConfig(shopDomain) : null,
    installStatus: shopDomain ? await getInstalledShop(shopDomain) : null,
    installed: url.searchParams.get("installed") === "1",
    connected: url.searchParams.get("connected") === "1"
  });
}
async function action({ request }) {
  var _a;
  const formData = await request.formData();
  const shopDomain = normalizeShopDomain(
    String(formData.get("shopDomain") ?? "").trim()
  );
  if (!shopDomain) {
    return json({ ok: false, error: "A valid shop domain is required." }, { status: 400 });
  }
  try {
    const config = await upsertMerchantConfig({
      shopDomain,
      environment: String(formData.get("environment") ?? "SANDBOX") === "LIVE" ? ClickPesaEnvironment.LIVE : ClickPesaEnvironment.SANDBOX,
      callbackBaseUrl: String(formData.get("callbackBaseUrl") ?? "").trim() || void 0,
      returnUrlOverride: String(formData.get("returnUrlOverride") ?? "").trim() || void 0,
      cancelUrlOverride: String(formData.get("cancelUrlOverride") ?? "").trim() || void 0,
      supportEmail: String(formData.get("supportEmail") ?? "").trim() || void 0,
      checksumEnabled: formData.get("checksumEnabled") === "on",
      providerReady: formData.get("providerReady") === "on",
      clientId: String(formData.get("clientId") ?? "").trim() || void 0,
      apiKey: String(formData.get("apiKey") ?? "").trim() || void 0,
      checksumKey: formData.get("checksumKey") !== null ? String(formData.get("checksumKey") ?? "").trim() || void 0 : void 0
    });
    let paymentsAppConfigured = false;
    if (config == null ? void 0 : config.accessToken) {
      await configurePaymentsApp({
        shopDomain,
        ready: config.providerReady,
        externalHandle: ((_a = config.credentials) == null ? void 0 : _a.clientId) ?? config.shopDomain
      });
      paymentsAppConfigured = true;
    }
    return json({
      ok: true,
      shopDomain,
      merchantConfig: config,
      paymentsAppConfigured
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save merchant configuration."
      },
      { status: 500 }
    );
  }
}
function AppOnboardingRoute() {
  var _a, _b, _c;
  const data = useLoaderData();
  const actionData = useActionData();
  const actionSuccess = (actionData == null ? void 0 : actionData.ok) ? actionData : null;
  const actionError = actionData && !actionData.ok ? actionData.error : null;
  const merchantConfig = (actionSuccess == null ? void 0 : actionSuccess.merchantConfig) ?? data.merchantConfig;
  const hasShopifyInstall = Boolean((_a = data.installStatus) == null ? void 0 : _a.accessToken);
  return /* @__PURE__ */ jsxs("section", { className: "panel stack", children: [
    /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 4 }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Merchant onboarding" }),
      /* @__PURE__ */ jsx("p", { className: "muted", children: "Save the merchant shop domain, ClickPesa credentials, hosted callback base URL, and readiness state before enabling the payment method in Shopify." })
    ] }),
    data.installed ? /* @__PURE__ */ jsxs("div", { className: "notice", children: [
      "Shopify install completed for ",
      /* @__PURE__ */ jsx("code", { children: data.shopDomain }),
      ". Finish the ClickPesa credentials below, then mark the provider ready."
    ] }) : null,
    data.connected && !data.installed ? /* @__PURE__ */ jsxs("div", { className: "notice", children: [
      "Shopify access is already connected for ",
      /* @__PURE__ */ jsx("code", { children: data.shopDomain }),
      "."
    ] }) : null,
    actionError ? /* @__PURE__ */ jsx("div", { className: "notice error", children: actionError }) : null,
    actionSuccess ? /* @__PURE__ */ jsxs("div", { className: "notice", children: [
      "Saved configuration for ",
      /* @__PURE__ */ jsx("code", { children: actionSuccess.shopDomain }),
      actionSuccess.paymentsAppConfigured ? ". Shopify provider status synced." : "."
    ] }) : null,
    data.shopDomain ? /* @__PURE__ */ jsx("div", { className: hasShopifyInstall ? "notice" : "notice error", children: hasShopifyInstall ? /* @__PURE__ */ jsxs(Fragment, { children: [
      "Shopify OAuth token stored for ",
      /* @__PURE__ */ jsx("code", { children: data.shopDomain }),
      "."
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      "Shopify install is still pending for ",
      /* @__PURE__ */ jsx("code", { children: data.shopDomain }),
      ". Start at ",
      /* @__PURE__ */ jsxs("code", { children: [
        "/auth?shop=",
        data.shopDomain
      ] }),
      " before enabling the provider."
    ] }) }) : null,
    /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid two", children: [
        /* @__PURE__ */ jsxs("label", { children: [
          "Shop domain",
          /* @__PURE__ */ jsx("input", { name: "shopDomain", defaultValue: data.shopDomain ?? (merchantConfig == null ? void 0 : merchantConfig.shopDomain) ?? "", placeholder: "merchant.myshopify.com", required: true })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Environment",
          /* @__PURE__ */ jsxs("select", { name: "environment", defaultValue: (merchantConfig == null ? void 0 : merchantConfig.environment) ?? "SANDBOX", children: [
            /* @__PURE__ */ jsx("option", { value: "SANDBOX", children: "Sandbox" }),
            /* @__PURE__ */ jsx("option", { value: "LIVE", children: "Live" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "ClickPesa client ID",
          /* @__PURE__ */ jsx("input", { name: "clientId", placeholder: "Client ID" }),
          /* @__PURE__ */ jsx("span", { children: ((_b = merchantConfig == null ? void 0 : merchantConfig.credentials) == null ? void 0 : _b.clientId) ? "Stored value exists." : "Leave blank only when updating an existing merchant." })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "ClickPesa API key",
          /* @__PURE__ */ jsx("input", { name: "apiKey", placeholder: "API Key" }),
          /* @__PURE__ */ jsx("span", { children: ((_c = merchantConfig == null ? void 0 : merchantConfig.credentials) == null ? void 0 : _c.apiKey) ? "Stored value exists." : "Required on first save." })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Checksum key",
          /* @__PURE__ */ jsx("input", { name: "checksumKey", placeholder: "Optional checksum key" })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Callback base URL",
          /* @__PURE__ */ jsx("input", { name: "callbackBaseUrl", defaultValue: (merchantConfig == null ? void 0 : merchantConfig.callbackBaseUrl) ?? "", placeholder: "https://payments.example.com" })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Return URL override",
          /* @__PURE__ */ jsx("input", { name: "returnUrlOverride", defaultValue: (merchantConfig == null ? void 0 : merchantConfig.returnUrlOverride) ?? "", placeholder: "https://payments.example.com/clickpesa/return" })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Cancel URL override",
          /* @__PURE__ */ jsx("input", { name: "cancelUrlOverride", defaultValue: (merchantConfig == null ? void 0 : merchantConfig.cancelUrlOverride) ?? "", placeholder: "https://payments.example.com/clickpesa/cancel" })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Support email",
          /* @__PURE__ */ jsx("input", { name: "supportEmail", type: "email", defaultValue: (merchantConfig == null ? void 0 : merchantConfig.supportEmail) ?? "", placeholder: "ops@example.com" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid two", children: [
        /* @__PURE__ */ jsxs("label", { children: [
          /* @__PURE__ */ jsx("span", { children: "Checksum verification" }),
          /* @__PURE__ */ jsx("input", { type: "checkbox", name: "checksumEnabled", defaultChecked: (merchantConfig == null ? void 0 : merchantConfig.checksumEnabled) ?? false })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          /* @__PURE__ */ jsx("span", { children: "Provider ready" }),
          /* @__PURE__ */ jsx("input", { type: "checkbox", name: "providerReady", defaultChecked: (merchantConfig == null ? void 0 : merchantConfig.providerReady) ?? false })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: /* @__PURE__ */ jsx("button", { type: "submit", children: "Save merchant configuration" }) })
    ] })
  ] });
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: AppOnboardingRoute,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3({ request }) {
  const { shopDomain, clearStateCookie } = await consumeShopifyAuthorizationCallback(request);
  return redirect(
    `/app/onboarding?shop=${encodeURIComponent(shopDomain)}&installed=1`,
    {
      headers: {
        "Set-Cookie": clearStateCookie
      }
    }
  );
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
async function loader$2(_) {
  const [shopCount, paymentCount, unresolvedCount, recentSessions] = await Promise.all([
    prisma.shop.count(),
    prisma.paymentSession.count(),
    prisma.paymentSession.count({
      where: {
        state: {
          in: ["RECEIVED", "REDIRECT_READY", "REDIRECTED", "PENDING", "RECONCILING"]
        }
      }
    }),
    prisma.paymentSession.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        shop: true
      }
    })
  ]);
  return json({
    shopCount,
    paymentCount,
    unresolvedCount,
    recentSessions
  });
}
function badgeClass(state) {
  if (["RESOLVED"].includes(state)) {
    return "badge";
  }
  if (["REJECTED", "FAILED", "CANCELLED"].includes(state)) {
    return "badge danger";
  }
  return "badge warn";
}
function AppDashboardRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "grid", children: [
    /* @__PURE__ */ jsxs("section", { className: "panel stack", children: [
      /* @__PURE__ */ jsx("h2", { children: "Operations snapshot" }),
      /* @__PURE__ */ jsxs("div", { className: "kpis", children: [
        /* @__PURE__ */ jsxs("div", { className: "kpi", children: [
          /* @__PURE__ */ jsx("small", { children: "Merchants configured" }),
          /* @__PURE__ */ jsx("strong", { children: data.shopCount })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "kpi", children: [
          /* @__PURE__ */ jsx("small", { children: "Payment sessions" }),
          /* @__PURE__ */ jsx("strong", { children: data.paymentCount })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "kpi", children: [
          /* @__PURE__ */ jsx("small", { children: "Open investigations" }),
          /* @__PURE__ */ jsx("strong", { children: data.unresolvedCount })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "panel stack", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 4 }, children: [
          /* @__PURE__ */ jsx("h2", { children: "Recent payment sessions" }),
          /* @__PURE__ */ jsx("p", { className: "muted", children: "Review the latest payment attempts and drill into pending or failed cases." })
        ] }),
        /* @__PURE__ */ jsx(Link, { className: "button secondary", to: "/app/onboarding", children: "Add merchant configuration" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { className: "table", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Shop" }),
          /* @__PURE__ */ jsx("th", { children: "Shopify session" }),
          /* @__PURE__ */ jsx("th", { children: "Amount" }),
          /* @__PURE__ */ jsx("th", { children: "State" }),
          /* @__PURE__ */ jsx("th", { children: "ClickPesa ref" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: data.recentSessions.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 5, children: /* @__PURE__ */ jsx("p", { className: "muted", children: "No payment sessions have been created yet." }) }) }) : data.recentSessions.map((session) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: session.shop.shopDomain }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", { children: session.shopifyPaymentSessionId }) }),
          /* @__PURE__ */ jsxs("td", { children: [
            session.currency,
            " ",
            session.amount.toString()
          ] }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", { className: badgeClass(session.state), children: session.state }) }),
          /* @__PURE__ */ jsx("td", { children: session.clickpesaPaymentReference ?? session.clickpesaOrderReference ?? "-" })
        ] }, session.id)) })
      ] }) })
    ] })
  ] });
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AppDashboardRoute,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
async function loader$1({ request }) {
  const url = new URL(request.url);
  if (url.searchParams.has("hmac")) {
    if (!verifyShopifyHmac(url)) {
      throw new Response("Invalid Shopify install signature.", { status: 401 });
    }
    const shopDomain2 = assertValidShopDomain(url.searchParams.get("shop"));
    return redirect(`/auth?shop=${encodeURIComponent(shopDomain2)}`);
  }
  const shopDomain = normalizeShopDomain(url.searchParams.get("shop"));
  if (shopDomain) {
    const shop = await getInstalledShop(shopDomain);
    const destination = (shop == null ? void 0 : shop.accessToken) ? `/app/onboarding?shop=${encodeURIComponent(shopDomain)}` : `/auth?shop=${encodeURIComponent(shopDomain)}`;
    return redirect(destination);
  }
  return json({
    shop: ""
  });
}
function IndexRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsx("main", { className: "grid", children: /* @__PURE__ */ jsxs("section", { className: "hero stack", children: [
    /* @__PURE__ */ jsx("span", { className: "badge", children: "Shopify Offsite Payments Scaffold" }),
    /* @__PURE__ */ jsx("h1", { children: "ClickPesa for Shopify checkout." }),
    /* @__PURE__ */ jsx("p", { className: "muted", children: "This scaffold covers merchant configuration, payment-session creation, buyer redirect, ClickPesa webhook handling, reconciliation, and Shopify payment status mutations." }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs(
        Form,
        {
          method: "get",
          action: "/auth",
          style: {
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end"
          },
          children: [
            /* @__PURE__ */ jsxs("label", { style: { minWidth: 280 }, children: [
              "Shopify store domain",
              /* @__PURE__ */ jsx(
                "input",
                {
                  name: "shop",
                  defaultValue: data.shop,
                  placeholder: "merchant.myshopify.com",
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ jsx("button", { type: "submit", children: "Install on dev store" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Link, { className: "button secondary", to: "/app", children: "Open Operations Dashboard" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "muted", children: "Installing from Shopify will automatically start OAuth from this page when the app URL receives a signed install request." })
  ] }) });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: IndexRoute,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader({ request }) {
  const url = new URL(request.url);
  if (url.searchParams.has("hmac") && !verifyShopifyHmac(url)) {
    throw new Response("Invalid Shopify install signature.", { status: 401 });
  }
  const shopDomain = assertValidShopDomain(url.searchParams.get("shop"));
  const reauth = url.searchParams.get("reauth") === "1";
  const shop = await getInstalledShop(shopDomain);
  if ((shop == null ? void 0 : shop.accessToken) && !reauth) {
    return redirect(
      `/app/onboarding?shop=${encodeURIComponent(shopDomain)}&connected=1`
    );
  }
  const { authorizationUrl, stateCookie } = await beginShopifyAuthorization(shopDomain);
  return redirect(authorizationUrl, {
    headers: {
      "Set-Cookie": stateCookie
    }
  });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader
}, Symbol.toStringTag, { value: "Module" }));
function AppLayoutRoute() {
  return /* @__PURE__ */ jsxs("main", { className: "grid", children: [
    /* @__PURE__ */ jsxs("section", { className: "hero stack", children: [
      /* @__PURE__ */ jsx("span", { className: "badge", children: "ClickPesa Payments App" }),
      /* @__PURE__ */ jsx("h1", { children: "Merchant onboarding and payment operations." }),
      /* @__PURE__ */ jsx("p", { className: "muted", children: "Use the pages below to save ClickPesa credentials, inspect recent payment sessions, and validate the offsite flow before Shopify review." })
    ] }),
    /* @__PURE__ */ jsxs("nav", { children: [
      /* @__PURE__ */ jsx(Link, { to: "/app", children: "Dashboard" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/onboarding", children: "Onboarding" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/settings/clickpesa", children: "ClickPesa Settings" }),
      /* @__PURE__ */ jsx(Link, { to: "/", children: "Landing Page" })
    ] }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AppLayoutRoute
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BXY2KftY.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-hBIZhcvt.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes/clickpesa.redirect.$sessionRef": { "id": "routes/clickpesa.redirect.$sessionRef", "parentId": "root", "path": "clickpesa/redirect/:sessionRef", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/clickpesa.redirect._sessionRef-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.clickpesa.application": { "id": "routes/webhooks.clickpesa.application", "parentId": "root", "path": "webhooks/clickpesa/application", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.clickpesa.application-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/jobs.reconcile-payment-status": { "id": "routes/jobs.reconcile-payment-status", "parentId": "root", "path": "jobs/reconcile-payment-status", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/jobs.reconcile-payment-status-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.settings.clickpesa": { "id": "routes/app.settings.clickpesa", "parentId": "routes/app", "path": "settings/clickpesa", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings.clickpesa-DqnF1BTW.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes/auth.shopify.callback": { "id": "routes/auth.shopify.callback", "parentId": "routes/auth", "path": "shopify/callback", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.shopify.callback-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.capture-session": { "id": "routes/app.capture-session", "parentId": "routes/app", "path": "capture-session", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.capture-session-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.payment-session": { "id": "routes/app.payment-session", "parentId": "routes/app", "path": "payment-session", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.payment-session-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.refund-session": { "id": "routes/app.refund-session", "parentId": "routes/app", "path": "refund-session", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.refund-session-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.void-session": { "id": "routes/app.void-session", "parentId": "routes/app", "path": "void-session", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.void-session-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/clickpesa.cancel": { "id": "routes/clickpesa.cancel", "parentId": "root", "path": "clickpesa/cancel", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/clickpesa.cancel-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/clickpesa.return": { "id": "routes/clickpesa.return", "parentId": "root", "path": "clickpesa/return", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/clickpesa.return-C-oZx6rn.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes/app.onboarding": { "id": "routes/app.onboarding", "parentId": "routes/app", "path": "onboarding", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.onboarding-CkE-YavC.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes/auth.callback": { "id": "routes/auth.callback", "parentId": "routes/auth", "path": "callback", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.callback-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-BjyE5vwC.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-BTiMIUWi.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] }, "routes/auth": { "id": "routes/auth", "parentId": "root", "path": "auth", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app-CWtFz0Pd.js", "imports": ["/assets/components-Bfy28bxK.js"], "css": [] } }, "url": "/assets/manifest-6439920e.js", "version": "6439920e" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": false, "v3_relativeSplatPath": false, "v3_throwAbortReason": false, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/clickpesa.redirect.$sessionRef": {
    id: "routes/clickpesa.redirect.$sessionRef",
    parentId: "root",
    path: "clickpesa/redirect/:sessionRef",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.clickpesa.application": {
    id: "routes/webhooks.clickpesa.application",
    parentId: "root",
    path: "webhooks/clickpesa/application",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/jobs.reconcile-payment-status": {
    id: "routes/jobs.reconcile-payment-status",
    parentId: "root",
    path: "jobs/reconcile-payment-status",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/app.settings.clickpesa": {
    id: "routes/app.settings.clickpesa",
    parentId: "routes/app",
    path: "settings/clickpesa",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/auth.shopify.callback": {
    id: "routes/auth.shopify.callback",
    parentId: "routes/auth",
    path: "shopify/callback",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/app.capture-session": {
    id: "routes/app.capture-session",
    parentId: "routes/app",
    path: "capture-session",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.payment-session": {
    id: "routes/app.payment-session",
    parentId: "routes/app",
    path: "payment-session",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app.refund-session": {
    id: "routes/app.refund-session",
    parentId: "routes/app",
    path: "refund-session",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app.void-session": {
    id: "routes/app.void-session",
    parentId: "routes/app",
    path: "void-session",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/clickpesa.cancel": {
    id: "routes/clickpesa.cancel",
    parentId: "root",
    path: "clickpesa/cancel",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/clickpesa.return": {
    id: "routes/clickpesa.return",
    parentId: "root",
    path: "clickpesa/return",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.onboarding": {
    id: "routes/app.onboarding",
    parentId: "routes/app",
    path: "onboarding",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/auth.callback": {
    id: "routes/auth.callback",
    parentId: "routes/auth",
    path: "callback",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route14
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route15
  },
  "routes/auth": {
    id: "routes/auth",
    parentId: "root",
    path: "auth",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
