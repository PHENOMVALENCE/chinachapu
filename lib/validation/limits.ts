export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phoneDigits: { min: 7, max: 15 },
  quantity: { min: 1, max: 999 },
  customName: { min: 2, max: 150 },
  description: { max: 2000 },
  requestLines: { min: 1, max: 20 },
  imageBytes: 5 * 1024 * 1024,
  imageMegapixels: 20,
  pageSize: { default: 24, max: 100 },
  uploadAuthTtlMs: 10 * 60 * 1000,
  unclaimedUploadTtlMs: 24 * 60 * 60 * 1000,
  sessionTtlMs: 12 * 60 * 60 * 1000,
  ordersPerIpHour: 10,
  uploadsPerIpHour: 20,
  loginAttemptsWindowMs: 15 * 60 * 1000,
  loginAttemptsMax: 5,
} as const;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
