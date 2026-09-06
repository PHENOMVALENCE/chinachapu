import { LEGACY_CART_KEY, REQUEST_DRAFT_KEY, type RequestLine } from "@/types/request";

function isDraftLine(value: unknown): value is RequestLine {
  if (!value || typeof value !== "object") return false;
  const line = value as RequestLine;
  return (
    typeof line.clientId === "string" &&
    (line.kind === "catalogue" || line.kind === "custom") &&
    typeof line.name === "string" &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1 &&
    line.quantity <= 999 &&
    !("price" in line)
  );
}

export function readRequestDraft(): RequestLine[] {
  if (typeof window === "undefined") return [];
  window.localStorage.removeItem(LEGACY_CART_KEY);
  try {
    const raw = window.sessionStorage.getItem(REQUEST_DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; lines?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.lines)) return [];
    return parsed.lines.filter(isDraftLine).map((line) => ({
      ...line,
      imagePreview: undefined,
      uploadError: undefined,
    }));
  } catch {
    window.sessionStorage.removeItem(REQUEST_DRAFT_KEY);
    return [];
  }
}

export function writeRequestDraft(lines: RequestLine[]) {
  if (typeof window === "undefined") return;
  const persistable = lines.map((line) => ({
    clientId: line.clientId,
    kind: line.kind,
    productId: line.productId,
    name: line.name,
    categoryId: line.categoryId,
    categoryName: line.categoryName,
    quantity: line.quantity,
    description: line.description,
    imageName: line.imageName,
    uploadId: line.uploadId,
  }));
  window.sessionStorage.setItem(
    REQUEST_DRAFT_KEY,
    JSON.stringify({ version: 1, lines: persistable })
  );
}

export function clearRequestDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REQUEST_DRAFT_KEY);
}
