import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { LIMITS } from "@/lib/validation/limits";
import { cookieSecure, getConfig } from "./config";
import { getRepository } from "./db";
import { AppError } from "./errors";
import { createId } from "./ids";

export const SESSION_COOKIE = "cc_staff";
export const DRAFT_COOKIE = "cc_draft";

export type StaffSession = {
  staffId: string;
  email: string;
};

function secretKey() {
  return new TextEncoder().encode(getConfig().authSecret);
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createStaffSession(staff: StaffSession) {
  return new SignJWT(staff)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(staff.staffId)
    .setIssuedAt()
    .setExpirationTime(`${LIMITS.sessionTtlMs / 1000}s`)
    .sign(secretKey());
}

export async function readStaffSession(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.staffId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { staffId: payload.staffId, email: payload.email };
  } catch {
    return null;
  }
}

export async function requireStaff(): Promise<StaffSession> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  const session = await readStaffSession(token);
  if (!session) {
    throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  const allowlist = getConfig().allowlist;
  if (!allowlist.includes(session.email.toLowerCase())) {
    throw new AppError(403, "FORBIDDEN", "Staff access is required.");
  }
  return session;
}

export async function loginStaff(email: string, password: string): Promise<StaffSession> {
  const normalized = email.trim().toLowerCase();
  if (!getConfig().allowlist.includes(normalized)) {
    throw new AppError(403, "FORBIDDEN", "Staff access is required.");
  }
  const staff = await getRepository().getStaffByEmail(normalized);
  if (!staff || !(await verifyPassword(password, staff.passwordHash))) {
    throw new AppError(401, "UNAUTHORIZED", "Check your email and password.");
  }
  return { staffId: staff.id, email: staff.email };
}

export async function provisionStaff(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  return getRepository().upsertStaff({
    id: createId(),
    email: normalized,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  });
}

export async function getDraftOwnerHash(createIfMissing = true): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(DRAFT_COOKIE)?.value;
  if (existing) {
    return existing;
  }
  if (!createIfMissing) {
    throw new AppError(403, "FORBIDDEN", "Upload ownership could not be verified.");
  }
  const token = createId();
  jar.set(DRAFT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return token;
}
