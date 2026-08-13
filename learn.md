# EAISG — Learn Log

This file is the running journal for the project. `implementation.md` says what to build and in what order; **this file explains what was actually built, in plain language, every time code is written or changed.**

## How this file works

Every time a piece of code is added or changed, a new dated entry gets appended below using this template:

```
## [YYYY-MM-DD] <short title of what changed>

**Phase:** (from implementation.md, e.g. "Phase 4 — Prompt Analyzer")
**Files touched:** path/to/file1.py, path/to/file2.py

**What was built:**
Plain-language description of the change — no jargon dump, explain it like
you're catching a teammate up.

**What it does / why it matters:**
What problem this solves, how it fits into the pipeline, what would break
without it.

**How it connects:**
What calls this / what this calls — its place in the request lifecycle.

**Decisions & tradeoffs:**
Anything non-obvious: why this library, why this approach over an
alternative, known limitations, TODOs left on purpose.
```

Rules for keeping this useful:
- Newest entries go at the **bottom**, so the file reads top-to-bottom as project history.
- Entries are written *after* something works, not as a plan (the plan lives in `implementation.md`).
- If a milestone in `implementation.md` gets checked off, note it here too — link the entry that completed it.
- Keep entries short enough to actually read later. Explain the "what" and "why," not a line-by-line diff.

---

## [2026-08-13] Initial Project Scaffolding

**Phase:** Phase 0 — Threat Modeling & Phase 1 — Repository, Conventions, Documentation Standards
**Files touched:** `.gitignore`, `README.md`, `docs/SCOPE.md`, module-level `README.md` files.

**What was built:**
Initialized the Git repository, scaffolded the directory structure (`frontend/`, `backend/`, `ai_engine/`, etc.), created the explicit threat model (`docs/SCOPE.md`), and added responsibility boundary `README.md` files to every module.

**What it does / why it matters:**
Provides the skeleton for the entire project. Setting explicit module boundaries early prevents the codebase from becoming a tangled monolith. The `SCOPE.md` file serves as the definitive reference for what threats we are actually trying to catch, and crucially, which ones we explicitly are not.

**How it connects:**
This lays the foundation for all subsequent code. The Git initialization allows us to follow the `ANTIGRAVITY_GIT_INSTRUCTIONS.md` commit structure.

**Decisions & tradeoffs:**
We opted for a monolithic repository structure over micro-repos for ease of orchestration and full-stack testing in the early MVP phases. `docs/SCOPE.md` acts as an immutable anchor to prevent scope creep.

## [2026-08-13] Database Models and Config

**Phase:** Phase 2 — Database Design
**Files touched:** `database/models.py`, `database/config.py`, `alembic/env.py`, `requirements.txt`

**What was built:**
Configured the Python virtual environment and installed database dependencies (`sqlalchemy`, `alembic`, `psycopg2`). Designed the full PostgreSQL schema using SQLAlchemy 2.0 `Mapped` declarative base. Initialized Alembic and hooked it up to the DB config and our `models.Base`.

**What it does / why it matters:**
Provides the explicit data persistence structures for users, policies, AI destinations, requests, findings, and audit logs. The tables map exactly to Phase 2, including JSONB types for flexible findings and conditions.

**How it connects:**
This serves as the underlying state layer for the Gateway APIs (Phase 3 and 4) and the Policy Engine. Alembic provides structured schema versioning.

**Decisions & tradeoffs:**
We opted for synchronous `psycopg2` during model definition, but `asyncpg` is installed if the FastAPI application needs asynchronous queries later. We used `JSONB` for `policies.conditions` and `audit_logs.meta_data` to ensure schema flexibility without full table migrations.
