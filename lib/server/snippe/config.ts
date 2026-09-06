import { getConfig } from "../config";
import { AppError } from "../errors";

export const SNIPPE_API_HOST = "https://api.snippe.sh";
export const SNIPPE_CHECKOUT_HOSTS = ["snippe.me"] as const;
export const SNIPPE_MIN_AMOUNT = 500;
export const SNIPPE_CURRENCY = "TZS";
export const SNIPPE_ACCOUNT_LIMIT_PER_MINUTE = 60;
export const WEBHOOK_SKEW_SECONDS = 300;

function read(name: string, fallback?: string): string | undefined {
  const value = process.env[name] ?? fallback;
  return value && value.length > 0 ? value : undefined;
}

export function isSnippeInitiationEnabled() {
  return read("SNIPPE_ENABLED") === "true";
}

export function getSnippeConfig() {
  const app = getConfig();
  const apiBaseUrl = (read("SNIPPE_API_BASE_URL", SNIPPE_API_HOST) ?? SNIPPE_API_HOST).replace(/\/$/, "");
  const webhookUrl =
    read("SNIPPE_WEBHOOK_URL") ?? `${app.appUrl.replace(/\/$/, "")}/api/webhooks/snippe`;

  return {
    enabled: isSnippeInitiationEnabled(),
    apiBaseUrl,
    apiKey: read("SNIPPE_API_KEY"),
    webhookSecret: read("SNIPPE_WEBHOOK_SECRET"),
    webhookUrl,
    appUrl: app.appUrl,
  };
}

export function requireSnippeApiKey() {
  const key = getSnippeConfig().apiKey;
  if (!key) {
    throw new AppError(500, "INTERNAL_ERROR", "Payment initiation is not configured.");
  }
  return key;
}

export function requireWebhookSecret() {
  const secret = getSnippeConfig().webhookSecret;
  if (!secret) {
    throw new AppError(500, "INTERNAL_ERROR", "Webhook verification is not configured.");
  }
  return secret;
}

export function assertAllowedCheckoutUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError(502, "INTERNAL_ERROR", "The payment provider returned an invalid checkout address.");
  }
  if (parsed.protocol !== "https:" || !SNIPPE_CHECKOUT_HOSTS.includes(parsed.hostname as (typeof SNIPPE_CHECKOUT_HOSTS)[number])) {
    throw new AppError(502, "INTERNAL_ERROR", "The payment provider returned an untrusted checkout address.");
  }
}

export function assertHttpsCallback(url: string, allowLocalHttp: boolean) {
  const parsed = new URL(url);
  if (parsed.protocol === "https:") return;
  if (allowLocalHttp && parsed.hostname === "localhost") return;
  throw new AppError(500, "INTERNAL_ERROR", "Payment callbacks must use HTTPS.");
}
