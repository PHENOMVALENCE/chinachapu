import { createIsolatedRepository } from "../lib/server/adapters/isolated-store";
import { createPrismaRepository } from "../lib/server/adapters/prisma-store";
import { hashPassword } from "../lib/server/auth";
import { createId } from "../lib/server/ids";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run staff:provision -- email@example.com 'password'");
    process.exit(1);
  }
  const repo =
    process.env.APP_PERSISTENCE === "postgres"
      ? createPrismaRepository()
      : createIsolatedRepository("default");
  await repo.upsertStaff({
    id: createId(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  console.log(`Provisioned staff ${email}. Add this email to STAFF_ALLOWLIST.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
