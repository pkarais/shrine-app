# Agent Instructions

## Build & Verify
```bash
# Kill dev server first to avoid .next cache corruption
npx next build
# Restart dev server after build
npm run dev
```

## Key Conventions
- No FK joins in `.select()` — use batch profile fetches instead
- All staff dropdowns must filter to `["operations", "security"]` roles
- `"use client"` components using `useSearchParams()` must be wrapped in `<Suspense>`
- Server actions go in `lib/actions/`
- Constants go in `constants/index.ts`
