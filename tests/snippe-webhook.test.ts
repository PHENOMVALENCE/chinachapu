import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseSnippeEvent, verifySnippeSignature } from "@/lib/server/snippe/webhook";
import { AppError } from "@/lib/server/errors";

const secret = "whsec_test_secret";
const body = JSON.stringify({
  id: "evt_1",
  type: "payment.completed",
  api_version: "2026-01-25",
  data: {
    reference: "pi_1",
    session_reference: "sess_1",
    status: "completed",
    amount: { value: 5000, currency: "TZS" },
    settlement: { gross: { value: 5000, currency: "TZS" }, net: { value: 4900, currency: "TZS" } },
  },
});

function sign(raw: string, timestamp: string, key = secret) {
  return createHmac("sha256", key).update(`${timestamp}.${raw}`).digest("hex");
}

describe("snippe webhook signatures", () => {
  it("accepts a valid current signature over raw whitespace", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(() =>
      verifySnippeSignature({ rawBody: body, timestamp, signature: sign(body, timestamp), secret })
    ).not.toThrow();
  });

  it("rejects malformed, short, non-hex, missing, stale, future, and wrong-secret signatures", () => {
    const now = Math.floor(Date.now() / 1000);
    const good = sign(body, String(now));
    expect(() =>
      verifySnippeSignature({ rawBody: body, timestamp: null, signature: good, secret, nowSeconds: now })
    ).toThrow(AppError);
    expect(() =>
      verifySnippeSignature({ rawBody: body, timestamp: String(now), signature: "abc", secret, nowSeconds: now })
    ).toThrow(AppError);
    expect(() =>
      verifySnippeSignature({
        rawBody: body,
        timestamp: String(now),
        signature: "z".repeat(64),
        secret,
        nowSeconds: now,
      })
    ).toThrow(AppError);
    expect(() =>
      verifySnippeSignature({
        rawBody: body,
        timestamp: String(now - 400),
        signature: sign(body, String(now - 400)),
        secret,
        nowSeconds: now,
      })
    ).toThrow(AppError);
    expect(() =>
      verifySnippeSignature({
        rawBody: body,
        timestamp: String(now + 400),
        signature: sign(body, String(now + 400)),
        secret,
        nowSeconds: now,
      })
    ).toThrow(AppError);
    expect(() =>
      verifySnippeSignature({
        rawBody: body,
        timestamp: String(now),
        signature: sign(body, String(now), "other"),
        secret,
        nowSeconds: now,
      })
    ).toThrow(AppError);
  });

  it("parses amount objects and does not treat net as the quote total", () => {
    const event = parseSnippeEvent(JSON.parse(body));
    expect(event.data.amount).toBe(5000);
    expect(event.data.gross).toBe(5000);
    expect(event.data.gross).not.toBe(4900);
  });
});
