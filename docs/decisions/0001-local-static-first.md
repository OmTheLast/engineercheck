# ADR 0001: Local, static-first analysis

Status: accepted.

The analyzed repository is untrusted, so the default analyzer reads bounded source text without importing or executing it. This sacrifices runtime certainty for a predictable safety boundary. Runtime profiles may be added only as explicit, previewed, confirmed operations with time and output limits.
