# CLAUDE.md — Agent Rules for PakkaQR

You are building PakkaQR. The full spec lives in `/docs/spec/`. Read all of it before writing code.

## Non-negotiable product rules

1. **No backend. Ever.** The site is 100% static. No API routes, no serverless functions, no database.
2. **Nothing leaves the device.** No user input, file, logo, CSV or image is ever sent over the network. No third-party scripts, fonts or CDNs at runtime — bundle everything.
3. **Static QR only.** Every generated code encodes its data directly. Never generate redirect/short links.
4. **No tracking by default.** No cookies, no analytics, no fingerprinting. (An optional, self-hosted, cookieless analytics hook may exist but must be OFF unless an env var enables it.)
5. **No signup, no watermark, no paywall, no limits** on size, count, or downloads.
6. **Every QR must scan.** Generated codes must decode back to the exact payload (see the built-in scan test in the PRD).

## Engineering rules

- TypeScript strict mode. No `any` unless commented with a reason.
- Follow the folder structure in `02_TECHNICAL_ARCHITECTURE.md`.
- Payload encoders are pure functions in `src/lib/payloads/`, each with unit tests covering the escaping rules in `03_QR_PAYLOAD_SPEC.md`.
- Pin exact dependency versions. Before adding any dependency, confirm its license is MIT, Apache-2.0, BSD or ISC and record it in `docs/DEPENDENCIES.md`. Prefer versions released more than two weeks ago.
- Accessibility: WCAG 2.2 AA. Every control keyboard-operable and labelled.
- All user-facing strings go through the i18n system — never hard-code text in components.
- Keep the initial JS for any page under 200 KB gzipped; lazy-load heavy features (batch, PDF, scanner).
- Write tests as you go. Do not move to the next phase with failing tests.

## Git attribution rules (strict)

The human owner is the only author and contributor of this project.

- **Never** add `Co-Authored-By:` trailers (for Claude, Anthropic, or anyone else) to any commit.
- **Never** add "Generated with Claude Code", "🤖", "Claude", "Anthropic" or any AI-attribution line to commit messages, PR titles/descriptions, tags, release notes, CHANGELOG, README, code comments, or file headers.
- **Never** list Claude or Anthropic as an author, contributor, maintainer or sponsor anywhere (README, CONTRIBUTING, package.json `author`/`contributors`, LICENSE, humans.txt, etc.).
- **Never** change git identity: do not run `git config user.name` / `user.email`, do not pass `--author`, and do not set `GIT_AUTHOR_*` / `GIT_COMMITTER_*` variables. Commits must use the owner's existing git config.
- Keep `.claude/settings.json` with `"includeCoAuthoredBy": false` in the repo root (provided in `docs/spec/claude-settings/`). Do not remove or override it.
- Before every commit, check the message: if it contains any of the above, rewrite it first. If a previous commit slipped through, tell the owner instead of rewriting published history.

## Workflow

- Work through `06_BUILD_PLAN_AND_TASKS.md` in order. Tick tasks off in that file as you complete them.
- Commit after each task with a clear message (`feat(wifi): add WiFi payload encoder + form`).
- If the spec is ambiguous, choose the option that best protects privacy and simplicity, note the decision in `docs/DECISIONS.md`, and continue — do not stop to ask.
- If something in the spec is technically impossible, document why in `docs/DECISIONS.md` and implement the closest safe alternative.

## Definition of done

All acceptance criteria in `01_PRODUCT_REQUIREMENTS.md` pass, the release gate in `07_TESTING_AND_QA.md` is green, and the site builds to static files that run from any static host.
