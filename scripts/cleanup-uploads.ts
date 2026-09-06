import { cleanupExpiredUploads } from "../lib/server/services/uploads";

async function main() {
  const removed = await cleanupExpiredUploads();
  console.log(`Removed ${removed} expired unclaimed uploads.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
