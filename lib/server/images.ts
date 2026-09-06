import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, LIMITS } from "@/lib/validation/limits";
import { AppError } from "./errors";

const signatures: Array<{ mime: (typeof ALLOWED_IMAGE_TYPES)[number]; test: (bytes: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    test: (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mime: "image/png",
    test: (bytes) =>
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47,
  },
  {
    mime: "image/webp",
    test: (bytes) =>
      bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP",
  },
];

export function detectImageType(bytes: Buffer) {
  if (bytes.slice(0, 256).includes(Buffer.from("<svg", "utf8")) || bytes.includes(Buffer.from("<?xml", "utf8"))) {
    throw new AppError(415, "UNSUPPORTED_MEDIA", "SVG files are not allowed.");
  }
  const match = signatures.find((entry) => entry.test(bytes));
  if (!match) {
    throw new AppError(415, "UNSUPPORTED_MEDIA", "Use a JPEG, PNG, or WebP image.");
  }
  return match.mime;
}

export async function processImage(bytes: Buffer) {
  if (bytes.byteLength > LIMITS.imageBytes) {
    throw new AppError(413, "PAYLOAD_TOO_LARGE", "Images must be 5 MiB or smaller.");
  }
  const detected = detectImageType(bytes);
  const pipeline = sharp(bytes, { limitInputPixels: LIMITS.imageMegapixels * 1_000_000, failOn: "error" });
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new AppError(415, "UNSUPPORTED_MEDIA", "The image could not be read.");
  }
  if (width * height > LIMITS.imageMegapixels * 1_000_000) {
    throw new AppError(415, "UNSUPPORTED_MEDIA", "Images may not exceed 20 megapixels.");
  }
  const output = await sharp(bytes, { limitInputPixels: LIMITS.imageMegapixels * 1_000_000 })
    .rotate()
    .resize({ width: Math.min(width, 2000), height: Math.min(height, 2000), fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: output.data,
    mime: "image/webp" as const,
    width: output.info.width,
    height: output.info.height,
    sourceType: detected,
  };
}
