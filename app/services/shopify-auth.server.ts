import { randomBytes } from "node:crypto";

import { createCookie } from "@remix-run/node";

import { prisma } from "~/services/db.server";
import { hmacSha256, safeEqual } from "~/utils/crypto.server";
import { getEnv, requireEnv } from "~/utils/env.server";

const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

function getOauthStateCookie() {
  const env = getEnv();

  return createCookie("__clickpesa_shopify_oauth_state", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      env.NODE_ENV === "production" ||
      env.APP_URL.toLowerCase().startsWith("https://"),
    path: "/",
    maxAge: 60 * 5,
    secrets: [requireEnv("SHOPIFY_ADMIN_API_SECRET")],
  });
}

function encodeQueryComponent(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildSignaturePayload(url: URL) {
  return Array.from(url.searchParams.entries())
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .map(
      ([key, value]) =>
        `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`,
    )
    .sort()
    .join("&");
}

function buildRedirectUri() {
  return new URL("/auth/callback", requireEnv("APP_URL")).toString();
}

export function normalizeShopDomain(value: string | null) {
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

export function assertValidShopDomain(value: string | null) {
  const shopDomain = normalizeShopDomain(value);

  if (!shopDomain) {
    throw new Response("Invalid Shopify shop domain.", { status: 400 });
  }

  return shopDomain;
}

export function verifyShopifyHmac(url: URL) {
  const hmac = url.searchParams.get("hmac");
  if (!hmac) {
    return false;
  }

  const digest = hmacSha256(
    buildSignaturePayload(url),
    requireEnv("SHOPIFY_ADMIN_API_SECRET"),
  );

  return safeEqual(digest, hmac.toLowerCase());
}

export async function getInstalledShop(shopDomain: string) {
  return prisma.shop.findUnique({
    where: { shopDomain },
    select: {
      accessToken: true,
      installedAt: true,
    },
  });
}

export async function beginShopifyAuthorization(shopDomain: string) {
  const env = getEnv();
  const state = randomBytes(16).toString("hex");
  const authorizationUrl = new URL(
    `https://${shopDomain}/admin/oauth/authorize`,
  );

  authorizationUrl.searchParams.set(
    "client_id",
    requireEnv("SHOPIFY_ADMIN_API_KEY"),
  );
  authorizationUrl.searchParams.set("redirect_uri", buildRedirectUri());
  authorizationUrl.searchParams.set("state", state);

  if (env.SHOPIFY_APP_SCOPES.trim()) {
    authorizationUrl.searchParams.set("scope", env.SHOPIFY_APP_SCOPES.trim());
  }

  return {
    authorizationUrl: authorizationUrl.toString(),
    stateCookie: await getOauthStateCookie().serialize(state),
  };
}

export async function consumeShopifyAuthorizationCallback(request: Request) {
  const url = new URL(request.url);
  const shopDomain = assertValidShopDomain(url.searchParams.get("shop"));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    throw new Response("Missing Shopify OAuth callback parameters.", {
      status: 400,
    });
  }

  if (!verifyShopifyHmac(url)) {
    throw new Response("Invalid Shopify callback signature.", { status: 401 });
  }

  const cookieState = await getOauthStateCookie().parse(
    request.headers.get("Cookie"),
  );

  if (typeof cookieState !== "string" || !safeEqual(cookieState, state)) {
    throw new Response("Invalid Shopify OAuth state.", { status: 401 });
  }

  const accessToken = await exchangeShopifyAccessToken(shopDomain, code);
  const now = new Date();

  await prisma.shop.upsert({
    where: { shopDomain },
    update: {
      accessToken,
      installedAt: now,
    },
    create: {
      shopDomain,
      accessToken,
      installedAt: now,
    },
  });

  return {
    shopDomain,
    clearStateCookie: await getOauthStateCookie().serialize("", {
      maxAge: 0,
    }),
  };
}

async function exchangeShopifyAccessToken(shopDomain: string, code: string) {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireEnv("SHOPIFY_ADMIN_API_KEY"),
      client_secret: requireEnv("SHOPIFY_ADMIN_API_SECRET"),
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new Response(
      `Shopify OAuth token exchange failed with status ${response.status}.`,
      { status: 502 },
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
  };

  if (!payload.access_token) {
    throw new Response(
      "Shopify OAuth response did not include an access token.",
      { status: 502 },
    );
  }

  return payload.access_token;
}
