# Product specification

## Problem and outcome

AI-assisted builders can produce convincing interfaces without the evidence an experienced reviewer needs before release. EngineerCheck turns repository evidence and project context into an explainable release recommendation, prioritized fixes, verification steps, unknowns, and existing strengths.

The primary journey is: answer or supply project context → statically scan a local repository → open JSON/HTML output or local dashboard → inspect file-and-line evidence → fix and verify → rescan. Version 0.1 is optimized for TypeScript/JavaScript, React/Next.js, Supabase/Firebase, and Vercel/Netlify.

Success means a beginner can act on a report while a senior engineer can audit its evidence and uncertainty. A numerical overall score is intentionally absent.

## Non-goals

The MVP is not a penetration test, proof of safety, SaaS backend, GitHub integration, runtime sandbox, dependency advisory service, or generic chatbot. It does not replace threat modeling, code review, staging tests, or production monitoring.
