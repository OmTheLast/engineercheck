# Analysis limitations and assumptions

- Static heuristics cannot see gateway policies, deployed environment values, database state, middleware composed elsewhere, cloud IAM, or actual user flows.
- Ownership, validation, rate limiting, query bounds, and timeouts can be hidden behind wrappers; these cases may require human verification.
- The scanner recognizes common TypeScript/JavaScript patterns, not every framework abstraction. Other stacks get limited generic checks.
- No dependency audit, reachability analysis, data-flow engine, browser accessibility audit, runtime test, or network call runs by default.
- The presence of tests or documentation is a strength signal, not proof of quality.
- Context defaults to unknown. Supplying context materially improves applicability decisions.
- Rule coverage is deliberately narrower than the full standard in v0.1. Unimplemented rules remain review prompts, not fabricated findings.
