import { createIsolatedRepository } from "./adapters/isolated-store";
import { createPrismaRepository } from "./adapters/prisma-store";
import { getConfig } from "./config";
import type { Repository } from "./repository";

let repository: Repository | undefined;
const testRepositories = new Map<string, Repository>();

export function getRepository(): Repository {
  if (process.env.VITEST && process.env.TEST_STORE) {
    const key = process.env.TEST_STORE;
    if (!testRepositories.has(key)) {
      testRepositories.set(key, createIsolatedRepository(key));
    }
    return testRepositories.get(key)!;
  }
  if (!repository) {
    const config = getConfig();
    repository =
      config.persistence === "postgres"
        ? createPrismaRepository()
        : createIsolatedRepository("default");
  }
  return repository;
}

export function resetRepositoryCache() {
  repository = undefined;
}
