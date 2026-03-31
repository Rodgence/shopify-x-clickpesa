import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

import {
  assertValidShopDomain,
  beginShopifyAuthorization,
  getInstalledShop,
  verifyShopifyHmac,
} from "~/services/shopify-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  if (url.searchParams.has("hmac") && !verifyShopifyHmac(url)) {
    throw new Response("Invalid Shopify install signature.", { status: 401 });
  }

  const shopDomain = assertValidShopDomain(url.searchParams.get("shop"));
  const reauth = url.searchParams.get("reauth") === "1";
  const shop = await getInstalledShop(shopDomain);

  if (shop?.accessToken && !reauth) {
    return redirect(
      `/app/onboarding?shop=${encodeURIComponent(shopDomain)}&connected=1`,
    );
  }

  const { authorizationUrl, stateCookie } =
    await beginShopifyAuthorization(shopDomain);

  return redirect(authorizationUrl, {
    headers: {
      "Set-Cookie": stateCookie,
    },
  });
}
