process.env.APP_PERSISTENCE = "isolated";
process.env.STORAGE_ADAPTER = "isolated";
process.env.APP_URL = "http://localhost:3000";
process.env.AUTH_SECRET = "ci-auth-secret-at-least-32-characters-long";
process.env.STAFF_ALLOWLIST = "staff@example.com";
process.env.DATABASE_URL = "postgresql://ci:ci@127.0.0.1:5432/ci";
process.env.TEST_STORE = `test-${process.pid}-${Date.now()}`;
