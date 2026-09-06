import { beforeEach, describe, expect, it, vi } from "vitest";
const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }));
vi.mock("@vercel/blob", () => blob);
import { createBlobStorage } from "@/lib/server/storage";

beforeEach(() => vi.clearAllMocks());
describe("hosted media isolation", () => {
  it("writes reference uploads privately and serves them through a staff route", async () => {
    const storage = createBlobStorage();
    await storage.put("private", "reference/test.webp", Buffer.from("image"), "image/webp");
    expect(blob.put).toHaveBeenCalledWith("private/reference/test.webp", expect.any(Buffer),
      expect.objectContaining({ access: "private", addRandomSuffix: false }));
    expect(await storage.signedReadUrl("reference/test.webp")).toMatch(/^\/api\/admin\/media/);
  });
  it("rejects traversal keys before contacting storage", async () => {
    await expect(createBlobStorage().get("public", "../reference/test.webp")).rejects.toMatchObject({ status: 400 });
    expect(blob.get).not.toHaveBeenCalled();
  });
  it("returns a not-found response when a blob is absent", async () => {
    blob.get.mockResolvedValue(null);
    await expect(createBlobStorage().get("private", "reference/test.webp")).rejects.toMatchObject({ status: 404 });
  });
});
