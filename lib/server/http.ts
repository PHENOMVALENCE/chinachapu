import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { flattenZodFields, rejectMonetaryFields } from "@/lib/validation/fields";
import { AppError, errorEnvelope } from "./errors";

export function jsonError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const response = NextResponse.json(errorEnvelope(error), { status: error.status });
    applyPrivacyHeaders(response);
    if (error.status === 429) {
      response.headers.set("Retry-After", "3600");
    }
    return response;
  }
  if (error instanceof ZodError) {
    const appError = new AppError(
      422,
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      flattenZodFields(error)
    );
    const response = NextResponse.json(errorEnvelope(appError), { status: 422 });
    applyPrivacyHeaders(response);
    return response;
  }
  const response = NextResponse.json(
    errorEnvelope(new AppError(500, "INTERNAL_ERROR", "Something went wrong. Try again.")),
    { status: 500 }
  );
  applyPrivacyHeaders(response);
  return response;
}

export function jsonOk<T>(body: T, status = 200, privateResponse = false): NextResponse {
  const response = NextResponse.json(body, { status });
  if (privateResponse) {
    applyPrivacyHeaders(response);
  }
  return response;
}

export function applyPrivacyHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function guardUnexpectedMoney(body: unknown) {
  const moneyFields = rejectMonetaryFields(body);
  if (moneyFields.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields.", {
      form: "Unexpected fields were removed. Resubmit without prices or payment data.",
    });
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}
