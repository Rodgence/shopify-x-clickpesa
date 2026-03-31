export function getEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    SHOPIFY_APP_SCOPES:
      process.env.SHOPIFY_APP_SCOPES ?? "write_payment_gateways,write_payment_sessions",
    SHOPIFY_PAYMENTS_API_VERSION:
      process.env.SHOPIFY_PAYMENTS_API_VERSION ?? "2026-01",
    SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN:
      process.env.SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN ?? "",
    SHOPIFY_ADMIN_API_KEY: process.env.SHOPIFY_ADMIN_API_KEY ?? "",
    SHOPIFY_ADMIN_API_SECRET: process.env.SHOPIFY_ADMIN_API_SECRET ?? "",
    CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY ?? "",
    CLICKPESA_SANDBOX_BASE_URL:
      process.env.CLICKPESA_SANDBOX_BASE_URL ??
      "https://api.clickpesa.com/third-parties",
    CLICKPESA_LIVE_BASE_URL:
      process.env.CLICKPESA_LIVE_BASE_URL ??
      "https://api.clickpesa.com/third-parties",
    SHOPIFY_REQUIRE_MTLS: process.env.SHOPIFY_REQUIRE_MTLS ?? "true",
    SHOPIFY_MTLS_PROXY_HEADER:
      process.env.SHOPIFY_MTLS_PROXY_HEADER ?? "x-client-certificate-verified",
    SHOPIFY_MTLS_PROXY_SUCCESS_VALUE:
      process.env.SHOPIFY_MTLS_PROXY_SUCCESS_VALUE ?? "SUCCESS",
    JOB_SHARED_SECRET: process.env.JOB_SHARED_SECRET ?? "",
    CLICKPESA_SUPPORTS_REFUNDS:
      process.env.CLICKPESA_SUPPORTS_REFUNDS ?? "false",
    CLICKPESA_SUPPORTS_CAPTURES:
      process.env.CLICKPESA_SUPPORTS_CAPTURES ?? "false",
    CLICKPESA_SUPPORTS_VOIDS: process.env.CLICKPESA_SUPPORTS_VOIDS ?? "false",
  };
}

export function requireEnv(name: keyof ReturnType<typeof getEnv>) {
  const value = getEnv()[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBooleanEnv(value: string) {
  return value.toLowerCase() === "true";
}
