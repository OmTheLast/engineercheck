# Threat model

## Assets and adversaries

Assets include source code, local credentials, report integrity, workstation availability, and developer trust. A scanned repository may intentionally contain huge files, symlinks, binaries, terminal escapes, prompt injection, secret bait, malformed text, or scripts designed to execute during tooling.

## Controls

- The default path only traverses directories and reads bounded text; it never imports, builds, installs, or runs the target.
- Symlinks and common vendor/generated directories are skipped. Per-file, total-byte, and file-count limits bound work.
- Secret evidence is pattern-redacted; reports must still be handled as sensitive.
- HTML evidence is escaped. JSON is schema validated.
- AI is disabled. Future providers must minimize/redact excerpts and treat repository prose as data, not instructions.
- Runtime capability requires an explicit flag and a displayed, confirmed, timeout-limited command plan. No such command profile is implemented in v0.1.

## Residual risks

Path races, unusual encodings, terminal control characters in filenames, novel secret formats, false positives, and maliciously complex but size-bounded inputs remain possible. Run against untrusted repositories with ordinary OS-level isolation and least privilege.
