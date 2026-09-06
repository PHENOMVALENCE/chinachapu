import { createHash, randomBytes, randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

export function createReference(): string {
  return `CC-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashRequestPayload(payload: unknown): string {
  return sha256(stableStringify(payload));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
