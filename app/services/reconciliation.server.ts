import { PaymentLifecycleState } from "@prisma/client";

import { writeAuditLog } from "~/services/audit.server";
import {
  determinePaymentOutcome,
  generateClickPesaToken,
  queryClickPesaPaymentStatus,
} from "~/services/clickpesa.server";
import { prisma } from "~/services/db.server";
import { requireReadyMerchantConfig } from "~/services/merchant-config.server";
import {
  pendingPaymentSession,
  rejectPaymentSession,
  resolvePaymentSession,
} from "~/services/shopify-payments.server";

export async function finalizePaymentSessionFromStatus(
  paymentSessionId: string,
  status: string,
  paymentReference?: string,
) {
  const session = await prisma.paymentSession.findUnique({
    where: { id: paymentSessionId },
    include: {
      shop: true,
    },
  });

  if (!session) {
    throw new Error("Payment session not found.");
  }

  const outcome = determinePaymentOutcome(status);

  if (outcome === "RESOLVED" && session.state !== PaymentLifecycleState.RESOLVED) {
    const response = await resolvePaymentSession({
      shopDomain: session.shop.shopDomain,
      gid: session.shopifyPaymentSessionGid,
      networkTransactionId: paymentReference,
    });

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: PaymentLifecycleState.RESOLVED,
        clickpesaStatus: status,
        clickpesaPaymentReference: paymentReference,
        resolvedAt: new Date(),
        nextActionRedirectUrl: response.nextActionRedirectUrl,
      },
    });
  } else if (
    outcome === "REJECTED" &&
    session.state !== PaymentLifecycleState.REJECTED
  ) {
    const response = await rejectPaymentSession({
      shopDomain: session.shop.shopDomain,
      gid: session.shopifyPaymentSessionGid,
      reason: "PROCESSING_ERROR",
      merchantMessage: "ClickPesa reported that the payment failed.",
    });

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: PaymentLifecycleState.REJECTED,
        clickpesaStatus: status,
        clickpesaPaymentReference: paymentReference,
        rejectedAt: new Date(),
        nextActionRedirectUrl: response.nextActionRedirectUrl,
      },
    });
  } else if (session.state !== PaymentLifecycleState.PENDING) {
    const response = await pendingPaymentSession({
      shopDomain: session.shop.shopDomain,
      gid: session.shopifyPaymentSessionGid,
      reason: "PARTNER_ACTION_REQUIRED",
      pendingExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: PaymentLifecycleState.PENDING,
        clickpesaStatus: status,
        clickpesaPaymentReference: paymentReference,
        pendingAt: new Date(),
        nextActionRedirectUrl: response.nextActionRedirectUrl,
      },
    });
  }

  await prisma.paymentStatusEvent.create({
    data: {
      paymentSessionId: session.id,
      source: "CLICKPESA",
      status,
      externalReference: paymentReference,
    },
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
      outcome,
    },
  });

  return prisma.paymentSession.findUnique({
    where: { id: session.id },
  });
}

export async function reconcilePaymentSession(paymentSessionId: string) {
  const session = await prisma.paymentSession.findUnique({
    where: { id: paymentSessionId },
    include: {
      shop: true,
    },
  });

  if (!session?.clickpesaOrderReference) {
    throw new Error("Payment session is missing ClickPesa order reference.");
  }

  const merchantConfig = await requireReadyMerchantConfig(session.shop.shopDomain);
  const token = await generateClickPesaToken({
    environment: merchantConfig.environment,
    clientId: merchantConfig.credentials.clientId,
    apiKey: merchantConfig.credentials.apiKey,
    checksumEnabled: merchantConfig.checksumEnabled,
    checksumKey: merchantConfig.credentials.checksumKey,
  });

  const payment = await queryClickPesaPaymentStatus(
    token,
    {
      environment: merchantConfig.environment,
      clientId: merchantConfig.credentials.clientId,
      apiKey: merchantConfig.credentials.apiKey,
      checksumEnabled: merchantConfig.checksumEnabled,
      checksumKey: merchantConfig.credentials.checksumKey,
    },
    session.clickpesaOrderReference,
  );

  await prisma.paymentSession.update({
    where: { id: session.id },
    data: {
      lastReconciledAt: new Date(),
      clickpesaStatus: payment?.status,
      clickpesaPaymentReference: payment?.paymentReference,
      state: PaymentLifecycleState.RECONCILING,
    },
  });

  if (payment?.status) {
    return finalizePaymentSessionFromStatus(
      session.id,
      payment.status,
      payment.paymentReference,
    );
  }

  return prisma.paymentSession.findUnique({
    where: { id: session.id },
  });
}
