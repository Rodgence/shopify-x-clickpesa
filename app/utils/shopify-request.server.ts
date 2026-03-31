import { getBooleanEnv, getEnv } from "~/utils/env.server";

export type ShopifyRequestContext = {
  shopDomain: string;
  requestId: string;
  apiVersion: string;
};

export function getShopifyRequestContext(request: Request): ShopifyRequestContext {
  const shopDomain = request.headers.get("Shopify-Shop-Domain");
  const requestId = request.headers.get("Shopify-Request-Id");
  const apiVersion =
    request.headers.get("Shopify-Api-Version") ??
    getEnv().SHOPIFY_PAYMENTS_API_VERSION;

  if (!shopDomain || !requestId) {
    throw new Response("Missing required Shopify request headers.", {
      status: 400,
    });
  }

  return {
    shopDomain,
    requestId,
    apiVersion,
  };
}

export function assertShopifyOrigin(request: Request) {
  const env = getEnv();

  if (!getBooleanEnv(env.SHOPIFY_REQUIRE_MTLS)) {
    return;
  }

  const verifiedHeader = request.headers.get(env.SHOPIFY_MTLS_PROXY_HEADER);
  if (verifiedHeader === env.SHOPIFY_MTLS_PROXY_SUCCESS_VALUE) {
    return;
  }

  throw new Response("Shopify client certificate verification failed.", {
    status: 401,
  });
}
