# Evaluation

`pnpm eval` scans six miniature repositories against separate `ground-truth.json` manifests. It reports serious-finding recall, misses, unexpected protected-rule findings, severity agreement, evidence validity, duplicate rate, and per-rule detection counts. The well-constructed fixture protects against selected false positives.

The harness fails when an expected serious issue is missed, a declared non-finding appears, evidence leaks the fixture secret or lacks file/line data, or duplicates survive. This is a small regression suite—not a statistically representative benchmark. Future datasets should be blind, larger, framework-diverse, and reviewed by multiple engineers.
