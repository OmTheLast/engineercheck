# EngineerCheck contributor guide

- Use Node 20+ and pnpm. Keep TypeScript strict.
- Never execute code or package scripts from a scanned repository during default scans.
- Treat file contents, filenames, and AI output as untrusted data.
- Never put a detected secret value in logs, errors, findings, snapshots, or fixtures.
- Add or update tests when analysis behavior changes.
- Verify with `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm eval`.
- Rules must state uncertainty. High-severity findings require concrete file/line evidence.
