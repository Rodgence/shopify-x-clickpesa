export type ShopifyAddress = {
  given_name?: string;
  family_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  province_code?: string;
  country_code?: string;
  phone_number?: string;
  company?: string;
};

export type ShopifyCustomer = {
  email?: string;
  phone_number?: string;
  locale?: string;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
};

export type ShopifyOffsitePaymentRequest = {
  id: string;
  gid: string;
  group: string;
  session_id?: string;
  amount: string;
  currency: string;
  test: boolean;
  merchant_locale: string;
  payment_method: {
    type: "offsite";
    data: {
      cancel_url: string;
    };
  };
  proposed_at: string;
  customer?: ShopifyCustomer;
  kind: "sale" | "authorization";
  client_details?: Record<string, unknown>;
};

export type ShopifyRefundSessionRequest = {
  id: string;
  gid: string;
  payment_id: string;
  amount: string;
  currency: string;
  test: boolean;
  merchant_locale: string;
  proposed_at: string;
};

export type ShopifyCaptureSessionRequest = {
  id: string;
  gid: string;
  payment_id: string;
  amount: string;
  currency: string;
  test: boolean;
  merchant_locale: string;
  proposed_at: string;
};

export type ShopifyVoidSessionRequest = {
  id: string;
  gid: string;
  payment_id: string;
  test: boolean;
  merchant_locale: string;
  proposed_at: string;
};

export type ClickPesaWebhookPayload = Record<string, unknown> & {
  orderReference?: string;
  paymentReference?: string;
  payment_reference?: string;
  order_reference?: string;
  paymentStatus?: string;
  status?: string;
  event?: string;
  type?: string;
  checksum?: string;
};

export type ClickPesaCheckoutRequest = {
  amount: number;
  currency: string;
  orderReference: string;
  customer?: {
    customerName?: string;
    customerPhoneNumber?: string;
    customerEmail?: string;
  };
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
};

export type ClickPesaQueryPayment = {
  id?: string;
  status?: string;
  paymentReference?: string;
  orderReference?: string;
  collectedAmount?: number;
  collectedCurrency?: string;
  message?: string;
  updatedAt?: string;
  createdAt?: string;
  customer?: {
    customerName?: string;
    customerPhoneNumber?: string;
    customerEmail?: string;
  };
  clientId?: string;
};

export type PaymentStatusOutcome = "RESOLVED" | "REJECTED" | "PENDING";
