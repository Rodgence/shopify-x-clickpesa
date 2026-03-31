import { ClickPesaEnvironment } from "@prisma/client";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import { getMerchantConfig, upsertMerchantConfig } from "~/services/merchant-config.server";
import {
  getInstalledShop,
  normalizeShopDomain,
} from "~/services/shopify-auth.server";
import { configurePaymentsApp } from "~/services/shopify-payments.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shopDomain = normalizeShopDomain(url.searchParams.get("shop"));

  return json({
    shopDomain,
    merchantConfig: shopDomain ? await getMerchantConfig(shopDomain) : null,
    installStatus: shopDomain ? await getInstalledShop(shopDomain) : null,
    installed: url.searchParams.get("installed") === "1",
    connected: url.searchParams.get("connected") === "1",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const shopDomain = normalizeShopDomain(
    String(formData.get("shopDomain") ?? "").trim(),
  );

  if (!shopDomain) {
    return json({ ok: false as const, error: "A valid shop domain is required." }, { status: 400 });
  }

  try {
    const config = await upsertMerchantConfig({
      shopDomain,
      environment:
        String(formData.get("environment") ?? "SANDBOX") === "LIVE"
          ? ClickPesaEnvironment.LIVE
          : ClickPesaEnvironment.SANDBOX,
      callbackBaseUrl: String(formData.get("callbackBaseUrl") ?? "").trim() || undefined,
      returnUrlOverride: String(formData.get("returnUrlOverride") ?? "").trim() || undefined,
      cancelUrlOverride: String(formData.get("cancelUrlOverride") ?? "").trim() || undefined,
      supportEmail: String(formData.get("supportEmail") ?? "").trim() || undefined,
      checksumEnabled: formData.get("checksumEnabled") === "on",
      providerReady: formData.get("providerReady") === "on",
      clientId: String(formData.get("clientId") ?? "").trim() || undefined,
      apiKey: String(formData.get("apiKey") ?? "").trim() || undefined,
      checksumKey: formData.get("checksumKey") !== null
        ? String(formData.get("checksumKey") ?? "").trim() || undefined
        : undefined,
    });

    let paymentsAppConfigured = false;

    if (config?.accessToken) {
      await configurePaymentsApp({
        shopDomain,
        ready: config.providerReady,
        externalHandle: config.credentials?.clientId ?? config.shopDomain,
      });
      paymentsAppConfigured = true;
    }

    return json({
      ok: true as const,
      shopDomain,
      merchantConfig: config,
      paymentsAppConfigured,
    });
  } catch (error) {
    return json(
      {
        ok: false as const,
        error: error instanceof Error ? error.message : "Failed to save merchant configuration.",
      },
      { status: 500 },
    );
  }
}

export default function AppOnboardingRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const actionSuccess = actionData?.ok ? actionData : null;
  const actionError = actionData && !actionData.ok ? actionData.error : null;
  const merchantConfig = actionSuccess?.merchantConfig ?? data.merchantConfig;
  const hasShopifyInstall = Boolean(data.installStatus?.accessToken);

  return (
    <section className="panel stack">
      <div className="stack" style={{ gap: 4 }}>
        <h2>Merchant onboarding</h2>
        <p className="muted">
          Save the merchant shop domain, ClickPesa credentials, hosted callback base URL,
          and readiness state before enabling the payment method in Shopify.
        </p>
      </div>
      {data.installed ? (
        <div className="notice">
          Shopify install completed for <code>{data.shopDomain}</code>. Finish the
          ClickPesa credentials below, then mark the provider ready.
        </div>
      ) : null}
      {data.connected && !data.installed ? (
        <div className="notice">
          Shopify access is already connected for <code>{data.shopDomain}</code>.
        </div>
      ) : null}
      {actionError ? <div className="notice error">{actionError}</div> : null}
      {actionSuccess ? (
        <div className="notice">
          Saved configuration for <code>{actionSuccess.shopDomain}</code>
          {actionSuccess.paymentsAppConfigured ? ". Shopify provider status synced." : "."}
        </div>
      ) : null}
      {data.shopDomain ? (
        <div className={hasShopifyInstall ? "notice" : "notice error"}>
          {hasShopifyInstall ? (
            <>
              Shopify OAuth token stored for <code>{data.shopDomain}</code>.
            </>
          ) : (
            <>
              Shopify install is still pending for <code>{data.shopDomain}</code>. Start at <code>/auth?shop={data.shopDomain}</code> before enabling the provider.
            </>
          )}
        </div>
      ) : null}
      <Form method="post">
        <div className="grid two">
          <label>
            Shop domain
            <input name="shopDomain" defaultValue={data.shopDomain ?? merchantConfig?.shopDomain ?? ""} placeholder="merchant.myshopify.com" required />
          </label>
          <label>
            Environment
            <select name="environment" defaultValue={merchantConfig?.environment ?? "SANDBOX"}>
              <option value="SANDBOX">Sandbox</option>
              <option value="LIVE">Live</option>
            </select>
          </label>
          <label>
            ClickPesa client ID
            <input name="clientId" placeholder="Client ID" />
            <span>{merchantConfig?.credentials?.clientId ? "Stored value exists." : "Leave blank only when updating an existing merchant."}</span>
          </label>
          <label>
            ClickPesa API key
            <input name="apiKey" placeholder="API Key" />
            <span>{merchantConfig?.credentials?.apiKey ? "Stored value exists." : "Required on first save."}</span>
          </label>
          <label>
            Checksum key
            <input name="checksumKey" placeholder="Optional checksum key" />
          </label>
          <label>
            Callback base URL
            <input name="callbackBaseUrl" defaultValue={merchantConfig?.callbackBaseUrl ?? ""} placeholder="https://payments.example.com" />
          </label>
          <label>
            Return URL override
            <input name="returnUrlOverride" defaultValue={merchantConfig?.returnUrlOverride ?? ""} placeholder="https://payments.example.com/clickpesa/return" />
          </label>
          <label>
            Cancel URL override
            <input name="cancelUrlOverride" defaultValue={merchantConfig?.cancelUrlOverride ?? ""} placeholder="https://payments.example.com/clickpesa/cancel" />
          </label>
          <label>
            Support email
            <input name="supportEmail" type="email" defaultValue={merchantConfig?.supportEmail ?? ""} placeholder="ops@example.com" />
          </label>
        </div>
        <div className="grid two">
          <label>
            <span>Checksum verification</span>
            <input type="checkbox" name="checksumEnabled" defaultChecked={merchantConfig?.checksumEnabled ?? false} />
          </label>
          <label>
            <span>Provider ready</span>
            <input type="checkbox" name="providerReady" defaultChecked={merchantConfig?.providerReady ?? false} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit">Save merchant configuration</button>
        </div>
      </Form>
    </section>
  );
}
