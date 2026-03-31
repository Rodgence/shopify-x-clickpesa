import { json, type ActionFunctionArgs } from "@remix-run/node";

import { createOffsitePaymentSession } from "~/services/payment-session.server";
import { getIdempotentResponse, saveIdempotentResponse } from "~/utils/idempotency.server";
import { parseJsonRequest } from "~/utils/http.server";
import { assertShopifyOrigin, getShopifyRequestContext } from "~/utils/shopify-request.server";
import type { ShopifyOffsitePaymentRequest } from "~/types/payments";

export async function action({ request }: ActionFunctionArgs) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest<ShopifyOffsitePaymentRequest>(request);

  const existingResponse = await getIdempotentResponse<{ redirect_url: string }>(
    `payment-session:${context.shopDomain}`,
    body.id,
    body,
  );

  if (existingResponse) {
    return json(existingResponse);
  }

  const result = await createOffsitePaymentSession(body, context);
  const response = {
    redirect_url: result.redirectUrl,
  };

  await saveIdempotentResponse(
    `payment-session:${context.shopDomain}`,
    body.id,
    body,
    response,
  );

  return json(response);
}
