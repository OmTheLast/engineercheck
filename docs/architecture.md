# Architecture

The CLI and dashboard depend on shared packages rather than duplicating analysis logic.

1. `report-schema` owns Zod-validated context, finding, evidence, and report contracts.
2. `standards` owns the machine-readable, versioned v0.1 rules.
3. `analyzer` inventories bounded text input, detects the stack, executes deterministic rules, deduplicates candidates, gates release, and renders HTML.
4. `ai-provider` defines the disabled-by-default extension boundary.
5. `cli` coordinates context, output, and dashboard history.
6. `dashboard` validates and presents saved report JSON. It never scans repositories itself.
7. `test-fixtures` keeps flawed inputs and ground truth separate from rule code.

The default trust boundary ends before any repository execution. File contents and names are untrusted. Evidence excerpts are escaped in HTML and secret-like values are redacted before entering findings.
