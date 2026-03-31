import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

import { consumeShopifyAuthorizationCallback } from "~/services/shopify-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopDomain, clearStateCookie } =
    await consumeShopifyAuthorizationCallback(request);

  return redirect(
    `/app/onboarding?shop=${encodeURIComponent(shopDomain)}&installed=1`,
    {
      headers: {
        "Set-Cookie": clearStateCookie,
      },
    },
  );
}
