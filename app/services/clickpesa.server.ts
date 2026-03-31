import type { PaymentSession } from "@prisma/client";
import { ClickPesaEnvironment } from "@prisma/client";

import type {
  ClickPesaCheckoutRequest,
  ClickPesaQueryPayment,
  ClickPesaWebhookPayload,
  PaymentStatusOutcome,
} from "~/types/payments";
import { computePayloadChecksum, safeEqual } from "~/utils/crypto.server";
import { getEnv } from "~/utils/env.server";

export type ClickPesaCredentials = {
  environment: ClickPesaEnvironment;
  clientId: string;
  apiKey: string;
  checksumEnabled: boolean;
  checksumKey?: string;
};

function getClickPesaBaseUrl(environment: ClickPesaEnvironment) {
  const env = getEnv();

  return environment === ClickPesaEnvironment.LIVE
    ? env.CLICKPESA_LIVE_BASE_URL
    : env.CLICKPESA_SANDBOX_BASE_URL;
}

export async function generateClickPesaToken(credentials: ClickPesaCredentials) {
  const response = await fetch(
    `${getClickPesaBaseUrl(credentials.environment)}/generate-token`,
    {
      method: "POST",
      headers: {
        "client-id": credentials.clientId,
        "api-key": credentials.apiKey,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`ClickPesa token request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    success?: boolean;
    token?: string;
  };

  if (!data.success || !data.token) {
    throw new Error("ClickPesa did not return an authorization token.");
  }

  return data.token;
}

export async function createHostedCheckoutLink(
  token: string,
  credentials: ClickPesaCredentials,
  payload: ClickPesaCheckoutRequest,
) {
  const body: Record<string, unknown> = {
    amount: payload.amount,
    currency: payload.currency,
    orderReference: payload.orderReference,
    customer: payload.customer,
    callbackUrl: payload.callbackUrl,
    metadata: payload.metadata,
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(
      `ClickPesa hosted checkout request failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    checkoutLink?: string;
    url?: string;
    link?: string;
    [key: string]: unknown;
  };

  const checkoutLink = data.checkoutLink ?? data.url ?? data.link;
  if (!checkoutLink || typeof checkoutLink !== "string") {
    throw new Error("ClickPesa did not return a hosted checkout link.");
  }

  return {
    checkoutLink,
    rawResponse: data,
  };
}

export async function queryClickPesaPaymentStatus(
  token: string,
  credentials: ClickPesaCredentials,
  orderReference: string,
) {
  const response = await fetch(
    `${getClickPesaBaseUrl(credentials.environment)}/payments/${orderReference}`,
    {
      headers: {
        Authorization: token,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `ClickPesa payment status query failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as ClickPesaQueryPayment | ClickPesaQueryPayment[];
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}

export function buildOrderReference(session: {
  shopifyPaymentSessionId: string;
  shopId: string;
}) {
  const compactShop = session.shopId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
  const compactPayment = session.shopifyPaymentSessionId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 18);

  return `CP-${compactShop}-${compactPayment}`;
}

export function determinePaymentOutcome(status?: string | null): PaymentStatusOutcome {
  const normalized = status?.toUpperCase();

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

export function buildReturnUrl(
  session: Pick<PaymentSession, "id" | "clickpesaOrderReference">,
  callbackBaseUrl: string,
) {
  const url = new URL("/clickpesa/return", callbackBaseUrl);
  url.searchParams.set("sessionRef", session.id);

  if (session.clickpesaOrderReference) {
    url.searchParams.set("orderReference", session.clickpesaOrderReference);
  }

  return url.toString();
}

export function verifyClickPesaWebhook(
  payload: ClickPesaWebhookPayload,
  checksumKey?: string,
  headerSignature?: string | null,
) {
  if (!checksumKey) {
    return !headerSignature && !payload.checksum;
  }

  const receivedSignature =
    headerSignature ?? (typeof payload.checksum === "string" ? payload.checksum : null);

  if (!receivedSignature) {
    return false;
  }

  const { checksum, ...payloadWithoutChecksum } = payload;
  const computedSignature = computePayloadChecksum(payloadWithoutChecksum, checksumKey);
  return safeEqual(computedSignature, receivedSignature);
}

export function extractWebhookIdentifiers(payload: ClickPesaWebhookPayload) {
  const paymentReference =
    typeof payload.paymentReference === "string"
      ? payload.paymentReference
      : typeof payload.payment_reference === "string"
        ? payload.payment_reference
        : undefined;

  const orderReference =
    typeof payload.orderReference === "string"
      ? payload.orderReference
      : typeof payload.order_reference === "string"
        ? payload.order_reference
        : undefined;

  const status =
    typeof payload.status === "string"
      ? payload.status
      : typeof payload.paymentStatus === "string"
        ? payload.paymentStatus
        : typeof payload.event === "string"
          ? payload.event
          : undefined;

  const eventType =
    typeof payload.event === "string"
      ? payload.event
      : typeof payload.type === "string"
        ? payload.type
        : status;

  return {
    paymentReference,
    orderReference,
    status,
    eventType,
  };
}
