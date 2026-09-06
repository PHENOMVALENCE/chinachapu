import { getSnippeConfig, requireSnippeApiKey } from "./config";
import {
  SnippeTransportError,
  type CreateSessionInput,
  type SnippePayment,
  type SnippeSession,
  type SnippeTransport,
} from "./types";

export function createHttpTransport(fetchImpl: typeof fetch = fetch): SnippeTransport {
  return {
    async request({ method, path, body, headers }) {
      const config = getSnippeConfig();
      const response = await fetchImpl(`${config.apiBaseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${requireSnippeApiKey()}`,
          "Content-Type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
      }
      const headerMap: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerMap[key.toLowerCase()] = value;
      });
      return { status: response.status, headers: headerMap, body: parsed };
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readSession(body: unknown): SnippeSession {
  const root = asRecord(body);
  const data = asRecord(root.data ?? root);
  return {
    reference: String(data.reference ?? ""),
    status: data.status as SnippeSession["status"],
    amount: Number(data.amount),
    currency: String(data.currency ?? "TZS"),
    checkoutUrl: String(data.checkout_url ?? ""),
    expiresAt: data.expires_at ? String(data.expires_at) : null,
    paymentReference: data.payment_reference ? String(data.payment_reference) : null,
  };
}

function readPaymentAmount(data: Record<string, unknown>): { amount: number; currency: string; gross?: number } {
  const amount = asRecord(data.amount);
  const settlement = asRecord(data.settlement);
  const gross = asRecord(settlement.gross);
  return {
    amount: Number(amount.value ?? data.amount),
    currency: String(amount.currency ?? data.currency ?? "TZS"),
    gross: typeof gross.value === "number" ? gross.value : undefined,
  };
}

function readPayment(body: unknown): SnippePayment {
  const root = asRecord(body);
  const data = asRecord(root.data ?? root);
  const money = readPaymentAmount(data);
  return {
    reference: String(data.reference ?? ""),
    status: data.status as SnippePayment["status"],
    amount: money.amount,
    currency: money.currency,
    sessionReference: data.session_reference ? String(data.session_reference) : null,
    completedAt: data.completed_at ? String(data.completed_at) : null,
    settlementGross: money.gross ?? null,
  };
}

function throwIfFailed(result: { status: number; headers: Record<string, string>; body: unknown }) {
  if (result.status >= 200 && result.status < 300) return;
  const reset = result.headers["x-ratelimit-reset"];
  throw new SnippeTransportError(
    result.status,
    "The payment provider rejected the request.",
    reset ? Number(reset) : undefined
  );
}

export function createSnippeAdapter(transport: SnippeTransport) {
  return {
    async createSession(input: CreateSessionInput) {
      const result = await transport.request({
        method: "POST",
        path: "/api/v1/sessions",
        body: {
          amount: input.amount,
          currency: input.currency,
          allowed_methods: ["mobile_money"],
          allow_custom_amount: false,
          customer: input.customer,
          redirect_url: input.redirectUrl,
          webhook_url: input.webhookUrl,
          description: input.description,
          metadata: input.metadata,
          expires_in: input.expiresIn,
        },
      });
      throwIfFailed(result);
      return readSession(result.body);
    },
    async getSession(reference: string) {
      const result = await transport.request({
        method: "GET",
        path: `/api/v1/sessions/${encodeURIComponent(reference)}`,
      });
      throwIfFailed(result);
      return readSession(result.body);
    },
    async cancelSession(reference: string) {
      const result = await transport.request({
        method: "POST",
        path: `/api/v1/sessions/${encodeURIComponent(reference)}/cancel`,
      });
      throwIfFailed(result);
    },
    async getPayment(reference: string) {
      const result = await transport.request({
        method: "GET",
        path: `/v1/payments/${encodeURIComponent(reference)}`,
      });
      throwIfFailed(result);
      return readPayment(result.body);
    },
  };
}

export type SnippeAdapter = ReturnType<typeof createSnippeAdapter>;

let adapter: SnippeAdapter | undefined;

export function getSnippeAdapter() {
  adapter ??= createSnippeAdapter(createHttpTransport());
  return adapter;
}

export function setSnippeAdapterForTests(next: SnippeAdapter | undefined) {
  adapter = next;
}
