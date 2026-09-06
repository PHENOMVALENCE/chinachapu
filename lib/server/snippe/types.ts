export type SnippeSessionStatus = "pending" | "active" | "completed" | "expired" | "cancelled";
export type SnippePaymentStatus = "pending" | "completed" | "failed" | "voided" | "expired";

export type CreateSessionInput = {
  amount: number;
  currency: "TZS";
  description: string;
  customer: { name: string; phone: string; email: string };
  redirectUrl: string;
  webhookUrl: string;
  expiresIn: number;
  metadata: Record<string, string>;
};

export type SnippeSession = {
  reference: string;
  status: SnippeSessionStatus;
  amount: number;
  currency: string;
  checkoutUrl: string;
  expiresAt: string | null;
  paymentReference?: string | null;
};

export type SnippePayment = {
  reference: string;
  status: SnippePaymentStatus;
  amount: number;
  currency: string;
  sessionReference?: string | null;
  completedAt?: string | null;
  settlementGross?: number | null;
};

export type SnippeTransport = {
  request(input: {
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<{ status: number; headers: Record<string, string>; body: unknown }>;
};

export class SnippeTransportError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}
