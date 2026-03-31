import { PaymentKind, PaymentLifecycleState, Prisma } from "@prisma/client";

import { writeAuditLog } from "~/services/audit.server";
import {
  buildOrderReference,
  buildReturnUrl,
  createHostedCheckoutLink,
  generateClickPesaToken,
} from "~/services/clickpesa.server";
import { prisma } from "~/services/db.server";
import { requireReadyMerchantConfig } from "~/services/merchant-config.server";
import type { ShopifyOffsitePaymentRequest } from "~/types/payments";
import { getEnv } from "~/utils/env.server";
import type { ShopifyRequestContext } from "~/utils/shopify-request.server";

export async function createOffsitePaymentSession(
  payload: ShopifyOffsitePaymentRequest,
  context: ShopifyRequestContext,
) {
  const existingSession = await prisma.paymentSession.findUnique({
    where: {
      shopifyPaymentSessionId: payload.id,
    },
  });

  if (existingSession?.redirectUrl) {
    return {
      paymentSession: existingSession,
      redirectUrl: existingSession.redirectUrl,
      reused: true,
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
      paymentKind:
        payload.kind === "authorization"
          ? PaymentKind.AUTHORIZATION
          : PaymentKind.SALE,
      state: PaymentLifecycleState.RECEIVED,
      testMode: payload.test,
      merchantLocale: payload.merchant_locale,
      customerEmail: payload.customer?.email,
      customerPhone: payload.customer?.phone_number,
      billingAddress: payload.customer?.billing_address,
      shippingAddress: payload.customer?.shipping_address,
      cancelUrl:
        merchantConfig.cancelUrlOverride ?? payload.payment_method.data.cancel_url,
      metadata: {
        proposedAt: payload.proposed_at,
        clientDetails: payload.client_details,
      },
    },
  });

  const clickpesaOrderReference = buildOrderReference({
    shopId: created.shopId,
    shopifyPaymentSessionId: created.shopifyPaymentSessionId,
  });

  const token = await generateClickPesaToken({
    environment: merchantConfig.environment,
    clientId: merchantConfig.credentials.clientId,
    apiKey: merchantConfig.credentials.apiKey,
    checksumEnabled: merchantConfig.checksumEnabled,
    checksumKey: merchantConfig.credentials.checksumKey,
  });

  const callbackUrl =
    merchantConfig.returnUrlOverride ??
    buildReturnUrl(
      {
        id: created.id,
        clickpesaOrderReference,
      },
      callbackBaseUrl,
    );

  const clickPesaCheckout = await createHostedCheckoutLink(
    token,
    {
      environment: merchantConfig.environment,
      clientId: merchantConfig.credentials.clientId,
      apiKey: merchantConfig.credentials.apiKey,
      checksumEnabled: merchantConfig.checksumEnabled,
      checksumKey: merchantConfig.credentials.checksumKey,
    },
    {
      amount: Number(payload.amount),
      currency: payload.currency,
      orderReference: clickpesaOrderReference,
      callbackUrl,
      customer: {
        customerName: [
          payload.customer?.billing_address?.given_name,
          payload.customer?.billing_address?.family_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
        customerPhoneNumber: payload.customer?.phone_number,
        customerEmail: payload.customer?.email,
      },
      metadata: {
        shopifyPaymentSessionId: payload.id,
        shopDomain: context.shopDomain,
      },
    },
  );

  const redirectUrl = new URL(`/clickpesa/redirect/${created.id}`, callbackBaseUrl).toString();

  const paymentSession = await prisma.paymentSession.update({
    where: {
      id: created.id,
    },
    data: {
      clickpesaOrderReference,
      clickpesaCheckoutLink: clickPesaCheckout.checkoutLink,
      redirectUrl,
      state: PaymentLifecycleState.REDIRECT_READY,
    },
  });

  await prisma.paymentAttempt.create({
    data: {
      paymentSessionId: paymentSession.id,
      attemptNumber: 1,
      requestId: context.requestId,
      requestPayload: payload,
      responsePayload: clickPesaCheckout.rawResponse,
    },
  });

  await prisma.paymentStatusEvent.create({
    data: {
      paymentSessionId: paymentSession.id,
      source: "SHOPIFY",
      status: "REDIRECT_READY",
      externalReference: payload.id,
      rawPayload: payload,
    },
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
      clickpesaOrderReference,
    },
  });

  return {
    paymentSession,
    redirectUrl,
    reused: false,
  };
}
