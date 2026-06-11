# Contributing

Thanks for helping improve Shrine Ops.

## Development Workflow

1. Fork the repository and create a feature branch.
2. Keep changes scoped to one logical topic per pull request.
3. Add or update tests for changed behavior when possible.
4. Run checks locally before opening a pull request.

## Local Checks

```bash
npm run lint
npm run test
npm run build
```

## Pull Request Guidelines

- Use a clear title and summary.
- Explain why the change is needed and how it was tested.
- Include screenshots for user-facing UI changes.
- Link related issues.

## Coding Guidelines

- Prefer TypeScript-first patterns.
- Keep components focused and composable.
- Keep server logic in `lib/actions` where practical.
- Avoid committing secrets or sensitive data.

## Commit Style

Conventional commits are recommended:

- `feat: add calendar staffing indicators`
- `fix: correct overtime threshold calculation`
- `docs: update onboarding instructions`