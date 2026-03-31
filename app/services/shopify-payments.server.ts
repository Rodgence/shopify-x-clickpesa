import { prisma } from "~/services/db.server";
import { getEnv } from "~/utils/env.server";

type ShopifyGraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<{
    message: string;
  }>;
};

type PaymentMutationResult = {
  nextActionRedirectUrl?: string;
};

async function getShopifyPaymentsEndpoint(shopDomain: string) {
  const env = getEnv();
  const version = env.SHOPIFY_PAYMENTS_API_VERSION;

  return `https://${shopDomain}/payments_apps/api/${version}/graphql.json`;
}

async function getShopifyAccessToken(shopDomain: string) {
  const env = getEnv();
  if (env.SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN) {
    return env.SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN;
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { accessToken: true },
  });

  if (!shop?.accessToken) {
    throw new Error(
      `No Shopify payments app access token available for ${shopDomain}.`,
    );
  }

  return shop.accessToken;
}

async function callPaymentsApi<TData>(
  shopDomain: string,
  query: string,
  variables: Record<string, unknown>,
) {
  const response = await fetch(await getShopifyPaymentsEndpoint(shopDomain), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getShopifyAccessToken(shopDomain)}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify Payments Apps API request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as ShopifyGraphqlResponse<TData>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((entry) => entry.message).join("; "));
  }

  return payload.data as TData;
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

export async function resolvePaymentSession(params: {
  shopDomain: string;
  gid: string;
  authorizationExpiresAt?: string;
  networkTransactionId?: string;
}) {
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

  const data = await callPaymentsApi<{
    paymentSessionResolve: {
      paymentSession?: {
        nextAction?: {
          context?: {
            redirectUrl?: string;
          };
        };
      };
      userErrors: Array<{ message: string }>;
    };
  }>(params.shopDomain, query, {
    id: params.gid,
    authorizationExpiresAt: params.authorizationExpiresAt,
    networkTransactionId: params.networkTransactionId,
  });

  const result = data.paymentSessionResolve;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join("; "));
  }

  return {
    nextActionRedirectUrl:
      result.paymentSession?.nextAction?.context?.redirectUrl,
  } satisfies PaymentMutationResult;
}

export async function pendingPaymentSession(params: {
  shopDomain: string;
  gid: string;
  reason:
    | "BUYER_ACTION_REQUIRED"
    | "PARTNER_ACTION_REQUIRED"
    | "NETWORK_ACTION_REQUIRED";
  pendingExpiresAt?: string;
}) {
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

  const data = await callPaymentsApi<{
    paymentSessionPending: {
      paymentSession?: {
        nextAction?: {
          context?: {
            redirectUrl?: string;
          };
        };
      };
      userErrors: Array<{ message: string }>;
    };
  }>(params.shopDomain, query, {
    id: params.gid,
    reason: params.reason,
    pendingExpiresAt: params.pendingExpiresAt,
  });

  const result = data.paymentSessionPending;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join("; "));
  }

  return {
    nextActionRedirectUrl:
      result.paymentSession?.nextAction?.context?.redirectUrl,
  } satisfies PaymentMutationResult;
}

export async function rejectPaymentSession(params: {
  shopDomain: string;
  gid: string;
  reason:
    | "PROCESSING_ERROR"
    | "CONFIRMATION_REJECTED"
    | "CALL_ISSUER"
    | "DO_NOT_HONOR"
    | "INSUFFICIENT_FUNDS";
  merchantMessage: string;
}) {
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

  const data = await callPaymentsApi<{
    paymentSessionReject: {
      paymentSession?: {
        nextAction?: {
          context?: {
            redirectUrl?: string;
          };
        };
      };
      userErrors: Array<{ message: string }>;
    };
  }>(params.shopDomain, query, {
    id: params.gid,
    reason: params.reason,
    merchantMessage: params.merchantMessage,
  });

  const result = data.paymentSessionReject;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join("; "));
  }

  return {
    nextActionRedirectUrl:
      result.paymentSession?.nextAction?.context?.redirectUrl,
  } satisfies PaymentMutationResult;
}

async function executeOperationMutation(
  shopDomain: string,
  query: string,
  variables: Record<string, unknown>,
  key:
    | "refundSessionResolve"
    | "refundSessionReject"
    | "captureSessionResolve"
    | "captureSessionReject"
    | "voidSessionResolve"
    | "voidSessionReject",
) {
  const data = await callPaymentsApi<
    Record<string, { userErrors: Array<{ message: string }> }>
  >(shopDomain, query, variables);

  const result = data[key];
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join("; "));
  }
}

export async function resolveRefundSession(shopDomain: string, gid: string) {
  return executeOperationMutation(
    shopDomain,
    `
      mutation ResolveRefundSession($id: ID!) {
        refundSessionResolve(id: $id) {
          userErrors {
            message
          }
        }
      }
    `,
    { id: gid },
    "refundSessionResolve",
  );
}

export async function rejectRefundSession(
  shopDomain: string,
  gid: string,
  merchantMessage: string,
) {
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
    "refundSessionReject",
  );
}

export async function resolveCaptureSession(shopDomain: string, gid: string) {
  return executeOperationMutation(
    shopDomain,
    `
      mutation ResolveCaptureSession($id: ID!) {
        captureSessionResolve(id: $id) {
          userErrors {
            message
          }
        }
      }
    `,
    { id: gid },
    "captureSessionResolve",
  );
}

export async function rejectCaptureSession(
  shopDomain: string,
  gid: string,
  merchantMessage: string,
) {
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
    "captureSessionReject",
  );
}

export async function resolveVoidSession(shopDomain: string, gid: string) {
  return executeOperationMutation(
    shopDomain,
    `
      mutation ResolveVoidSession($id: ID!) {
        voidSessionResolve(id: $id) {
          userErrors {
            message
          }
        }
      }
    `,
    { id: gid },
    "voidSessionResolve",
  );
}

export async function rejectVoidSession(
  shopDomain: string,
  gid: string,
  merchantMessage: string,
) {
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
    "voidSessionReject",
  );
}

export async function configurePaymentsApp(params: {
  shopDomain: string;
  ready: boolean;
  externalHandle?: string;
}) {
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

  const data = await callPaymentsApi<{
    paymentsAppConfigure: {
      paymentsAppConfiguration?: {
        externalHandle?: string | null;
        ready: boolean;
      };
      userErrors: Array<{ message: string }>;
    };
  }>(params.shopDomain, query, {
    externalHandle: params.externalHandle,
    ready: params.ready,
  });

  const result = data.paymentsAppConfigure;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join("; "));
  }

  return result.paymentsAppConfiguration;
}
