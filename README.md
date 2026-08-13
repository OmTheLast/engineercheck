# EngineerCheck

EngineerCheck is a local-first release-readiness reviewer for TypeScript/JavaScript web applications. It combines cautious static heuristics with an evidence-first engineering standard. It does **not** claim that a clean report proves a system safe.

## Install and use

Prerequisites: Node.js 20+ and pnpm 11.

```bash
pnpm install
pnpm build
pnpm scan /path/to/project
```

During development, run the source CLI directly:

```bash
pnpm scan /path/to/project --context ./project-context.json --output ./engineercheck-report --format html,json
pnpm scan /path/to/project --interactive
pnpm --filter @engineercheck/dashboard dev
pnpm dashboard
```

The production dashboard defaults to `http://127.0.0.1:4173` and reads `.engineercheck/reports` from the current directory. Build it before starting the dashboard.

## Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm eval
```

## Safety boundary

Default scans read bounded text files only. Symlinks, binaries, generated/vendor directories, files over 512 KB, and repositories over the aggregate read limit are skipped. EngineerCheck does not run package scripts or application code, print detected secret values, upload files, audit dependencies, or contact an AI provider. `--runtime-checks` is explicit; this release has no runtime profile and tells the user that it ran no commands. `--ai` likewise explains that no network adapter is enabled.

Reports are written to the selected output directory and copied into `.engineercheck/reports` for dashboard history. Treat reports as sensitive metadata even though suspected values are redacted.

See [product spec](docs/product-spec.md), [architecture](docs/architecture.md), [standard](docs/engineering-standard.md), and [limitations](docs/analysis-limitations.md).
