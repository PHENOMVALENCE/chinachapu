import { SNIPPE_CURRENCY, SNIPPE_MIN_AMOUNT } from "../snippe/config";

export function formatTzs(amount: number) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: SNIPPE_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function assertTzsAmount(amount: number) {
  if (!Number.isInteger(amount) || amount < SNIPPE_MIN_AMOUNT) {
    throw new Error("invalid-amount");
  }
}
