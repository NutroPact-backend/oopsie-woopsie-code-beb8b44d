# Bundle Analysis & Size Budget (INF-004)

## Generate a bundle treemap

```bash
ANALYZE=1 bun run build
open dist/bundle-stats.html
```

The treemap shows every JS chunk with raw / gzip / brotli sizes. Drill in
to spot:
- Duplicate copies of a library (e.g. two `lodash` versions)
- Admin-only deps leaking into the public bundle
- Polyfills / large icon packs that should be code-split

## Size budget

`SIZE_BUDGET_KB` (default **350 KB**) sets a soft warning ceiling. Vite
prints a warning during build when a single chunk's uncompressed size
exceeds `SIZE_BUDGET_KB × 3` (≈ 3× typical gzip ratio).

```bash
SIZE_BUDGET_KB=250 bun run build   # stricter budget
```

The budget is **non-fatal** — builds still succeed. Treat warnings as
review prompts: either split the route, lazy-load the dep, or accept
the cost and bump the budget.

## When to run

- Before a release: confirm no new chunk crossed the budget.
- After adding a heavy dep (chart lib, PDF lib, rich-text editor).
- Quarterly hygiene pass: look for unused legacy chunks.
