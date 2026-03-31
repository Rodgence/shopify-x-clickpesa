import { ClickPesaEnvironment } from "@prisma/client";

import { prisma } from "~/services/db.server";
import { decryptSecret, encryptSecret } from "~/utils/crypto.server";

export type MerchantConfigInput = {
  shopDomain: string;
  environment: ClickPesaEnvironment;
  callbackBaseUrl?: string;
  returnUrlOverride?: string;
  cancelUrlOverride?: string;
  supportEmail?: string;
  checksumEnabled: boolean;
  providerReady: boolean;
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
};

export type ResolvedMerchantConfig = {
  shopId: string;
  shopDomain: string;
  accessToken?: string | null;
  environment: ClickPesaEnvironment;
  callbackBaseUrl?: string | null;
  returnUrlOverride?: string | null;
  cancelUrlOverride?: string | null;
  supportEmail?: string | null;
  checksumEnabled: boolean;
  providerReady: boolean;
  credentials?: {
    clientId: string;
    apiKey: string;
    checksumKey?: string;
  };
};

export async function ensureShop(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain },
  });
}

export async function getMerchantConfig(shopDomain: string) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: {
      merchantConfig: {
        include: {
          credentials: true,
        },
      },
    },
  });

  if (!shop?.merchantConfig) {
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
    credentials: shop.merchantConfig.credentials
      ? {
          clientId: decryptSecret(
            shop.merchantConfig.credentials.encryptedClientId,
          ),
          apiKey: decryptSecret(shop.merchantConfig.credentials.encryptedApiKey),
          checksumKey: shop.merchantConfig.credentials.encryptedChecksumKey
            ? decryptSecret(shop.merchantConfig.credentials.encryptedChecksumKey)
            : undefined,
        }
      : undefined,
  } satisfies ResolvedMerchantConfig;
}

export async function requireReadyMerchantConfig(shopDomain: string) {
  const config = await getMerchantConfig(shopDomain);

  if (!config?.providerReady || !config.credentials) {
    throw new Response(
      "Merchant configuration is incomplete or provider is not marked ready.",
      { status: 422 },
    );
  }

  return config;
}

export async function upsertMerchantConfig(input: MerchantConfigInput) {
  const shop = await ensureShop(input.shopDomain);

  const merchantConfig = await prisma.merchantConfig.upsert({
    where: {
      shopId: shop.id,
    },
    create: {
      shopId: shop.id,
      environment: input.environment,
      callbackBaseUrl: input.callbackBaseUrl,
      returnUrlOverride: input.returnUrlOverride,
      cancelUrlOverride: input.cancelUrlOverride,
      supportEmail: input.supportEmail,
      checksumEnabled: input.checksumEnabled,
      isProviderReady: input.providerReady,
    },
    update: {
      environment: input.environment,
      callbackBaseUrl: input.callbackBaseUrl,
      returnUrlOverride: input.returnUrlOverride,
      cancelUrlOverride: input.cancelUrlOverride,
      supportEmail: input.supportEmail,
      checksumEnabled: input.checksumEnabled,
      isProviderReady: input.providerReady,
    },
  });

  if (input.clientId || input.apiKey || input.checksumKey !== undefined) {
    const existing = await prisma.clickPesaCredential.findUnique({
      where: {
        merchantConfigId: merchantConfig.id,
      },
    });

    const nextClientId =
      input.clientId ??
      (existing ? decryptSecret(existing.encryptedClientId) : undefined);
    const nextApiKey =
      input.apiKey ??
      (existing ? decryptSecret(existing.encryptedApiKey) : undefined);
    const nextChecksumKey =
      input.checksumKey !== undefined
        ? input.checksumKey
        : existing?.encryptedChecksumKey
          ? decryptSecret(existing.encryptedChecksumKey)
          : undefined;

    if (!nextClientId || !nextApiKey) {
      throw new Error("Client ID and API Key are required.");
    }

    await prisma.clickPesaCredential.upsert({
      where: {
        merchantConfigId: merchantConfig.id,
      },
      create: {
        merchantConfigId: merchantConfig.id,
        encryptedClientId: encryptSecret(nextClientId),
        encryptedApiKey: encryptSecret(nextApiKey),
        encryptedChecksumKey: nextChecksumKey
          ? encryptSecret(nextChecksumKey)
          : null,
      },
      update: {
        encryptedClientId: encryptSecret(nextClientId),
        encryptedApiKey: encryptSecret(nextApiKey),
        encryptedChecksumKey: nextChecksumKey
          ? encryptSecret(nextChecksumKey)
          : null,
      },
    });
  }

  return getMerchantConfig(input.shopDomain);
}
