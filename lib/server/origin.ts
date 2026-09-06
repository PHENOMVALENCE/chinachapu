import { getConfig } from "./config";
import { AppError } from "./errors";

export function assertSameOrigin(request: Request) {
  const { appUrl } = getConfig();
  const allowed = new URL(appUrl);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || (referer ? new URL(referer).origin : null);
  if (!candidate) {
    throw new AppError(403, "FORBIDDEN", "This action must come from the site.");
  }
  const url = new URL(candidate);
  if (url.origin === allowed.origin) {
    return;
  }
  if (process.env.NODE_ENV !== "production" && url.hostname === "localhost" && allowed.hostname === "localhost") {
    return;
  }
  throw new AppError(403, "FORBIDDEN", "This action must come from the site.");
}
