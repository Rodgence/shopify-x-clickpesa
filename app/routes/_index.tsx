import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";

import {
  assertValidShopDomain,
  getInstalledShop,
  normalizeShopDomain,
  verifyShopifyHmac,
} from "~/services/shopify-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  if (url.searchParams.has("hmac")) {
    if (!verifyShopifyHmac(url)) {
      throw new Response("Invalid Shopify install signature.", { status: 401 });
    }

    const shopDomain = assertValidShopDomain(url.searchParams.get("shop"));
    return redirect(`/auth?shop=${encodeURIComponent(shopDomain)}`);
  }

  const shopDomain = normalizeShopDomain(url.searchParams.get("shop"));
  if (shopDomain) {
    const shop = await getInstalledShop(shopDomain);
    const destination = shop?.accessToken
      ? `/app/onboarding?shop=${encodeURIComponent(shopDomain)}`
      : `/auth?shop=${encodeURIComponent(shopDomain)}`;

    return redirect(destination);
  }

  return json({
    shop: "",
  });
}

export default function IndexRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="grid">
      <section className="hero stack">
        <span className="badge">Shopify Offsite Payments Scaffold</span>
        <h1>ClickPesa for Shopify checkout.</h1>
        <p className="muted">
          This scaffold covers merchant configuration, payment-session creation,
          buyer redirect, ClickPesa webhook handling, reconciliation, and Shopify
          payment status mutations.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Form
            method="get"
            action="/auth"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <label style={{ minWidth: 280 }}>
              Shopify store domain
              <input
                name="shop"
                defaultValue={data.shop}
                placeholder="merchant.myshopify.com"
                required
              />
            </label>
            <button type="submit">Install on dev store</button>
          </Form>
          <Link className="button secondary" to="/app">
            Open Operations Dashboard
          </Link>
        </div>
        <p className="muted">
          Installing from Shopify will automatically start OAuth from this page when the
          app URL receives a signed install request.
        </p>
      </section>
    </main>
  );
}
