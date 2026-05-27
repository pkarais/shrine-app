# Agent Instructions

## Dev Restart Protocol (MANDATORY)
Before EVERY `npx next build` or `npm run dev`, run:
```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
```

Then start fresh:
```bash
npx next build
# after build succeeds, start dev (auto-syncs Google Calendar then starts):
npm run dev
```

Never skip the kill step — stale node processes lock `.next/trace` (EPERM) and hold port 3000. The dev server must be started in a NEW powershell window so it survives the tool timeout:
```powershell
Start-Process powershell.exe -ArgumentList "-NoExit -Command &{Set-Location '<project-path>'; npm run dev}" -WindowStyle Normal
```

## Key Conventions
- No FK joins in `.select()` — use batch profile fetches instead
- All staff dropdowns must filter to `["operations", "security"]` roles
- `"use client"` components using `useSearchParams()` must be wrapped in `<Suspense>`
- Server actions go in `lib/actions/`
- Constants go in `constants/index.ts`
