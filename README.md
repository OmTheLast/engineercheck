<h1 align="center">EngineerCheck</h1>

**Scan a JavaScript or TypeScript app for release-readiness findings with file evidence and explicit uncertainty.**

Node.js 20+. pnpm 11. Local static analysis; default scans execute no project code and contact no AI provider.

By Om Patnaik · repository created August 2026.

## Install

| Platform / path | Start here |
| --- | --- |
| From source | `pnpm install`, then `pnpm build` |

Run `pnpm scan /path/to/project` and inspect the HTML/JSON findings. To try a controlled example, scan `packages/test-fixtures/fixtures/well-constructed`.

```bash
pnpm scan packages/test-fixtures/fixtures/well-constructed
```

## Why

You need to inspect an app before release without treating a checklist as proof of safety. EngineerCheck reads bounded source files and applies documented heuristics. A clean report does not prove security, and the current release has no runtime or network AI adapter.

## Inspect findings in context

Pass a project-context JSON file or use `--interactive`. Findings explain their evidence and uncertainty; generated reports are also copied to `.engineercheck/reports` for dashboard history.

## Review the scan boundary

Default scans skip symlinks, binaries, generated/vendor trees, oversized files, and reads beyond the aggregate limit. Reports redact suspected values, but paths and findings can still be sensitive metadata.

## Notes from building it

I made evidence and uncertainty part of the report format rather than adding them after a scan. Fixture evaluation checks that the rules distinguish known examples without running the scanned code. I would require a documented runtime profile before adding executable checks.

## Commands

```bash
pnpm scan /path/to/project       # create a source-based report
pnpm scan /path/to/project --interactive  # supply project context
pnpm dashboard                   # open report history after building
pnpm eval                        # evaluate rules on fixtures
```

## Verify it yourself

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm eval
```

These checks cover source quality, schemas, analyzer behaviour, build output, and fixture evaluation. Inspect [analysis limitations](docs/analysis-limitations.md) before interpreting a passing fixture set as coverage of a real application.

## Credits, license and pointers

Built with TypeScript, pnpm, React/Vite, Vitest, and the packages named in `package.json`. No source license file is present. [Spec](docs/product-spec.md) · [Engineering standard](docs/engineering-standard.md).

[Full setup, original notes, and project history](README-DETAILS.md).
