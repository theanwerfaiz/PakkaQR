# PakkaQR — Build Pack (Start Here)

This folder is a complete specification for building **PakkaQR**: a free, open-source QR code generator whose codes **never expire**. It is written to be handed to an AI coding agent (e.g. Claude Code) to build the **full product in one go**.

> Name: **PakkaQR** (पक्का / پکا — "solid, guaranteed"). Tagline: *"QR codes that work. Pakka."*

## Read in this order

| # | File | What it covers |
|---|------|----------------|
| 1 | `CLAUDE.md` | Rules the agent must follow (copy to repo root) |
| 2 | `01_PRODUCT_REQUIREMENTS.md` | What to build: every feature, with acceptance criteria |
| 3 | `02_TECHNICAL_ARCHITECTURE.md` | Stack, folder structure, libraries, data flow |
| 4 | `03_QR_PAYLOAD_SPEC.md` | Exact data format for every QR type (critical for scanning) |
| 5 | `04_DESIGN_SYSTEM_AND_UX.md` | Look, layout, components, accessibility |
| 6 | `05_PAGES_AND_SEO.md` | Every page/route, titles, meta, structured data |
| 7 | `06_BUILD_PLAN_AND_TASKS.md` | Ordered task list with done-criteria |
| 8 | `07_TESTING_AND_QA.md` | Automated + manual test plan, release gate |
| 9 | `08_OPEN_SOURCE_AND_LAUNCH.md` | Repo setup, license, deploy, launch checklist |
| 10 | `09_CONTENT_AND_COPY.md` | All user-facing text, FAQ, Hindi strings |
| — | `claude-settings/settings.json` | Claude Code project settings (no co-author attribution) — copy to `/.claude/settings.json` |
| — | `templates/` | README, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT, SECURITY, issue templates |

## How to hand this to the agent

1. Create an empty Git repository.
2. Copy this whole folder into it as `/docs/spec/`, copy `CLAUDE.md` to the repo root, and copy `claude-settings/settings.json` to `/.claude/settings.json` (this turns off Claude's "Co-Authored-By" commit trailer).
3. Give the agent this instruction:

```
Read /CLAUDE.md, then every file in /docs/spec/ in the order listed in 00_START_HERE.md.
Build the complete product described there, following 06_BUILD_PLAN_AND_TASKS.md task by task.
Do not skip features or stop at an MVP. After each phase, run the tests in 07_TESTING_AND_QA.md
and fix failures before moving on. When finished, report which acceptance criteria pass and list
anything you could not complete and why.
```

## The one-sentence product

> Paste anything, get a beautiful QR code that works forever — no signup, no tracking, no watermark, nothing ever leaves your device.

## Assumptions made in this pack (change if you disagree)

- Name: PakkaQR. Domain, GitHub name and trademark still to be checked/registered by the owner.
- Primary audience: everyday users worldwide, with strong support for India (UPI, Hindi).
- Fully static site, no backend, no database, no accounts — ever. This is the product promise.
- Free forever. Money comes only from donations / sponsors (optional, unobtrusive).
- License: MIT.
- Languages at launch: English and Hindi, with a structure that makes adding more easy.
