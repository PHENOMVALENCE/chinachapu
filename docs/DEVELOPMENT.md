# Development and operations

## Current baseline

Imported template: Next.js `^16.0.9`, React `^19.2.2`, TypeScript, Tailwind 4. `package-lock.json` controls exact installation. No database, upload service, admin authentication, or tests are configured. The only workflow creates GitHub releases for `v*` tags; it does not test or deploy the app.

```sh
npm ci
npm run dev
```

Use Node.js 22 LTS as the proposed baseline. Run Next.js on port 3000; XAMPP is not needed. For production, `npm run build` then `npm start` requires a Node-capable host. Do not use static export or GitHub Pages for the planned backend.

## First implementation fixes

- `npm run lint` currently invokes `next lint`; replace with ESLint CLI and align `eslint-config-next` (currently 15.2.1) with the selected Next.js version. Next.js 16 removes `next lint` and does not lint as part of build: [upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16).
- Audit installed dependency/security status and choose a supported patched release, updating lockfile in its own commit. Do not assume template versions are release-ready.
- Add typecheck, unit/integration, and browser-test scripts and CI. Expected gates: install, lint, typecheck, tests, build. These scripts do not all exist yet.
- Test existing localStorage hydration and malformed saved cart handling when replacing `CartContext`; migrate/discard old monetary cart state.

## Planned environment contract

Names below are proposed adapter inputs, not active application settings. Cursor should add a documented `.env.example` with placeholders and explicitly unignore that file while preserving secret env ignores after provider selection.

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Server-only PostgreSQL connection |
| APP_URL | Canonical origin for same-origin checks/auth redirects |
| AUTH_SECRET | Server-only session secret; add chosen provider credentials separately |
| STORAGE_ENDPOINT / STORAGE_REGION | Object-store connection |
| STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY | Server-only restricted storage credentials |
| STORAGE_PUBLIC_BUCKET / STORAGE_PRIVATE_BUCKET | Catalogue/reference separation |
| STORAGE_PUBLIC_BASE_URL | Public catalogue media origin |

Document shared rate-limit storage configuration once selected. Validate required configuration at startup. No credentials in `NEXT_PUBLIC_*`. Provide migration, seed, staff-provisioning, and cleanup commands once implemented; do not invent executable commands before scripts exist.

## Launch checklist

- Select host, database, storage, staff authentication, and shared rate-limit provider; record concrete setup and recovery instructions.
- Provision separate development/production resources, TLS, private bucket policy, storage CORS for the exact site origin, and least-privilege service credentials.
- Run reviewed migrations and repeatable seeds; seed no customer data or default admin password. Provision owner staff identity through the chosen auth system.
- Verify catalogue licenses and replace template branding, claims, and external links. Confirm name, contacts, categories, and privacy wording with owner.
- Approve a retention duration and deletion process for orders/photos; do not retain indefinitely by accident. Schedule orphan cleanup and alert on failures.
- Enable database backups and test restoration alongside media recovery. Log request IDs/status/timing, not names, emails, phone numbers, notes, or signed URLs.
- Run the full acceptance plan against production-like persistence, sessions, and storage, including restart durability.
- Deploy with migrations compatible with the previous release where possible; document backup/restore and application rollback before destructive schema changes. Verify guest request → admin view after deployment.

Documentation-phase validation is limited to repository/docs checks; it does not establish build or runtime health.
