# Cursor prompt: product list redesign

Implement the following design change in the existing ChinaChapu project. Read `AGENTS.md`, the current catalogue component, request context, upload limits, and the locally installed Next.js image documentation first. Preserve all existing backend, deployment, security, admin, and Snippe work. Work on a separate feature branch, commit small coherent changes, and open a PR.

## Required visual change

Replace the large multi-column product-card grid with a **single vertical list** at every screen size. Each product is one compact row with:

1. A real product photograph on the left.
2. Category label, product name, and a useful short description in the middle.
3. A clear orange **Place order** button on the right on desktop; below the text on mobile.

Desktop row: approximately 120–150px square image, flexible text area, and a consistently aligned action. Use a white surface, subtle border/divider, 12–16px corners, restrained shadow if needed, and 16–24px spacing. Keep the existing ChinaChapu orange, typography, and branding. At 360px use a 80–96px thumbnail with text/action alongside it; do not revert to tall cards or introduce horizontal scrolling. Let text wrap and rows grow naturally. Avoid fixed heights that clip descriptions.

Keep the category filters, search, result feedback, custom-product form, request review, and guest contact submission. Preserve ordering and pagination behavior. A list should be semantic `ul`/`li`; product names should be headings. Give each button an accessible product-specific name while keeping visible text “Place order”. Provide keyboard focus and adequate touch targets.

## What Place order means

The row button starts configuring that product; it must not submit an incomplete order or start payment. Expand the quantity/optional-notes/optional-photo editor directly below the selected row, or use an accessible dialog. The current distant editor below all products is inconvenient: bring the editor into view and move focus to quantity. One editor open at a time; preserve its values when validation fails. Save adds a line to the existing request; show a clear confirmation and updated count. Keep distinct notes/photos as separate lines. Final guest submission still requires name, email, and phone, and never requires an account.

No public prices, totals, discounts, shipping fees, ratings, stock promises, or payment buttons. Preserve private staff-quoted Snippe payment flows unchanged. Reference-photo upload limit is the shared `LIMITS.imageBytes` value (currently 4 MiB for Vercel); descriptions and photos remain optional.

## Photographs

Use the online-sourced local photos recorded in `data/image-manifest.json` and stored under `public/catalogue/`. Do not revert to the old SVG text placeholders. Every seeded product must have a relevant image. Preserve photographer/source/license metadata and the source notice in `docs/PRODUCT-IMAGE-SOURCES.md`.

These are representative stock photographs, not evidence of exact inventory or brand availability. Keep a short catalogue notice such as “Photos show example styles. Tell us your preferred details.” Do not infer specifications or brand claims from the photo. Owner-uploaded product images always take priority over seed images; do not overwrite them when reseeding.

Use `next/image` with explicit size or a fixed-aspect container, appropriate responsive `sizes`, meaningful alt text, and lazy loading below the fold. Keep the product visible using contain or a carefully chosen crop. Provide a neutral actual image fallback for broken assets without reintroducing huge text tiles. Do not add external hotlinks or random image endpoints when local assets already exist.

## Verification and handoff

- Verify 360px, 768px, and desktop: one row per product, visible photos/names/descriptions/actions, no clipped text or overflow.
- Search/filter and empty states still work. All 18 seeded products have photos; newly created admin products render uploaded images.
- Place order opens the correct product editor; quantity, notes, optional upload, add/remove/edit, custom-only request, and final guest submission still work.
- Test keyboard operation, focus restoration, image errors, and API failures. Ensure no client credentials or prices leak into public content.
- Run the existing lint, typecheck, tests, and production build; report actual results. Include before/after desktop and mobile screenshots in the PR.

Implement the list redesign only. Do not refactor unrelated services, change database credentials, alter live payment settings, or deploy over another agent's unfinished work.
