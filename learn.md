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

## [2026-08-13] Authentication, Identity, and Session Management

**Phase:** Phase 3
**Files touched:** `security/auth.py`, `security/dependencies.py`, `backend/routes/auth.py`, `backend/main.py`, `backend/schemas/auth.py`, `database/session.py`

**What was built:**
Implemented FastAPI JWT authentication using `passlib[bcrypt]` and `PyJWT`. Created endpoints for `/login` and `/logout` with OAuth2 password flow. Added FastAPI dependencies to retrieve the current user from the database via token, and `require_role` for Role-Based Access Control. Set up the main FastAPI application.

**What it does / why it matters:**
This establishes the security perimeter for the Gateway. It ensures that every request to EAISG is authenticated and scoped to a specific identity and role, which feeds into rate-limiting, policy evaluation, and audit logging.

**How it connects:**
Relies on the `User` and `Session` database models from Phase 2. Forms the foundation for the Prompt Analyzer MVP (Phase 4), which requires an authenticated context to evaluate policy.

**Decisions & tradeoffs:**
We included the `refresh_token` storage in the database to support explicit session revocation, which is a requirement for enterprise adoption. Local password auth is implemented as the MVP, with SSO/SAML integration flagged for later extension.

## [2026-08-13] Prompt Analyzer MVP

**Phase:** Phase 4
**Files touched:** `backend/schemas/analyze.py`, `ai_engine/detectors/presidio_pii.py`, `ai_engine/detectors/regex_secret.py`, `policy_engine/evaluator.py`, `backend/routes/analyze.py`, `backend/main.py`

**What was built:**
Constructed the end-to-end deterministic prompt analyzer endpoint. This includes the PII detector (wrapping `presidio-analyzer`), a Regex/Entropy Secret Detector, and a Policy Evaluator that matches findings against database rules. The API endpoint `/api/v1/analyze/prompt` glues these together, hashing the prompt, running detectors, scoring risk, evaluating policy, persisting the findings to the DB, and producing an Audit Log.

**What it does / why it matters:**
This validates the core architectural loop of the gateway. We now have a functioning pipeline that can take a user's prompt, authenticate them, check the prompt for PII or hardcoded secrets, make a decision (ALLOW/BLOCK/WARN), and record everything in a compliant audit log without saving the raw prompt text.

**How it connects:**
Depends heavily on the Phase 2 database schema for persistence and the Phase 3 Auth layer to identify the user. This deterministic layer serves as the baseline for the future ML models (Phase 8) and LangGraph Agents (Phase 9) to sit on top of.

**Decisions & tradeoffs:**
We opted for a very simplistic regex implementation and a default English configuration for Presidio. The entropy calculation is unoptimized for MVP. Most importantly, the raw prompt is *hashed* but not saved in plain text in the `requests` table, adhering to the data-minimization principle outlined in the Threat Model.

## [2026-08-14] Deterministic Detectors & File Processing Pipeline

**Phase:** Phase 5 — Deterministic Detection Layer & Phase 6 — File Processing Pipeline
**Files touched:** `ai_engine/detectors/*`, `file_processor/*`, `backend/routes/analyze.py`, `requirements.txt`

**What was built:**
Expanded the deterministic detection layer by adding `SourceCodeDetector` and `FinancialLegalDetector`. Enhanced `PresidioPIIDetector` with context-window recognizers and `RegexSecretDetector` with an allowlist and AWS key validation.
Also built the file processing pipeline (`file_processor` module) to validate file sizes/extensions, scan for malware (using ClamAV), and safely extract text from PDFs, DOCXs, and XLSXs. Exposed a new `/api/v1/analyze/file` endpoint that runs the entire pipeline, followed by detection and policy evaluation.

**What it does / why it matters:**
This significantly broadens our risk coverage beyond basic PII/Secrets to include code and financial/legal text, matching the threat models for engineering and legal teams. The file processing pipeline ensures users can upload documents securely without risking server-side malware infection or unhandled format crashes, while applying the same strict data-minimization rules as the prompt analyzer.

**How it connects:**
The `/file` endpoint works parallel to the `/prompt` endpoint, hooking into the exact same policy and persistence layers (Phase 2 & Phase 11). The new detectors simply bolt into the existing aggregator pattern.

**Decisions & tradeoffs:**
We included the `pyclamd` scanner but wrapped it in a try-catch for local development so the app doesn't crash if ClamAV isn't running. We chose synchronous file processing for the MVP, knowing we'll need to move to Celery/background jobs when we handle larger files or when integrating ML models in future phases.

## [2026-08-14] Dataset Construction & Classical ML Baseline

**Phase:** Phase 7 — Dataset Construction & Phase 8 — ML Model Development
**Files touched:** `datasets/*`, `scripts/generate_dataset.py`, `ml/*`, `backend/routes/analyze.py`, `requirements.txt`

**What was built:**
We generated a synthetic dataset of ~175 structured examples to train the Classical ML Baseline. We built `train.py` using `scikit-learn` to fit a `TfidfVectorizer` and `LogisticRegression` pipeline. We wrapped the resulting `.joblib` model in an `MLClassifier` class and injected it into the API endpoints (`/prompt` and `/file`). We also established the project's first `MODEL_CARD.md` and `SOURCES.md`.

**What it does / why it matters:**
This represents the first probabilistic step on the "Comparison Ladder" for EAISG. While deterministic rules (regex/heuristics) are extremely precise for structured data like SSNs or AWS keys, they fail entirely at semantic intent. The Classical ML Baseline introduces the ability to categorize text conceptually (e.g., "this looks like a legal document") even if no specific keyword matches. 

**How it connects:**
The `MLClassifier` behaves identically to the deterministic detectors from the perspective of the `analyze.py` route. Findings are simply appended to the list and passed to the `PolicyEvaluator`. This architectural decision proves the plug-and-play nature of the detection layer.

**Decisions & tradeoffs:**
We opted for a synthetic, manually augmented dataset for the MVP to prove the pipeline without getting bogged down in external data sourcing and cleaning. The TF-IDF model is fast and interpretable, but lacks word-order awareness. The model is currently highly prone to overfitting the tiny synthetic dataset, and moving to a real dataset with a Transformer model is explicitly noted as the next evolution in the model card.

## [2026-08-14] LangGraph Multi-Agent Layer

**Phase:** Phase 9 — LangGraph Multi-Agent Layer
**Files touched:** `ai_engine/agents/*`, `backend/routes/analyze.py`, `requirements.txt`

**What was built:**
Implemented the final tier of the detection pipeline: an LLM-powered Reasoning Agent orchestrated by `langgraph`. The Graph orchestrator encapsulates the LLM calls and handles graceful degradation/circuit breaking. The `/analyze` API endpoints were updated to conditionally route requests into this graph *only* if the initial deterministic and ML risk scores fell into an ambiguous gray area (0.4 to 0.8).

**What it does / why it matters:**
This represents the most advanced capability of EAISG, but also the slowest and most expensive. By placing it behind a "confidence gate," we ensure that obvious violations (like a pasted API key) are blocked instantly for free, and obvious benign requests (like "hello") are allowed instantly. The LLM is reserved exclusively for nuanced context where a human reviewer would otherwise be needed.

**How it connects:**
It sits right before the Policy Evaluator in `analyze.py`. Its findings are merged into the overall findings list and re-aggregated, ensuring the LLM's deeper reasoning can override or confirm the weaker signals from the ML baseline.

**Decisions & tradeoffs:**
We opted for a graceful fallback approach. If the OpenAI API key is missing or the call times out, the graph does not crash the server. Instead, it injects an `AGENT_ERROR` finding and degrades gracefully. We are defaulting to `langchain-openai` for MVP, recognizing that a local model (via Ollama/vLLM) would be a critical future addition for data privacy.

## [2026-08-14] Risk Aggregation (Deep)

**Phase:** Phase 10 — Risk Aggregation
**Files touched:** `ai_engine/aggregator.py`, `backend/routes/analyze.py`, `backend/schemas/analyze.py`

**What was built:**
Replaced the naive `max()` risk score calculation with a dedicated `RiskAggregator` class. The aggregator deduplicates findings by category, identifies the highest base confidence for that category, and applies a `+0.15` boost for every *additional* independent detector that flagged the same category. The API response and the Audit Log now include an `aggregation_breakdown` field explaining the exact math behind the final score.

**What it does / why it matters:**
This allows EAISG to distinguish between a single weak signal and multiple independent signals pointing to the same conclusion. If the ML model *and* the regex detector *and* the LangGraph agent all think a prompt contains proprietary code, the risk score should be boosted closer to 1.0. Furthermore, saving the `aggregation_breakdown` directly to the Audit Log ensures that security analysts can trace exactly why the gateway blocked a request without having to guess which detector fired.

**How it connects:**
It sits centrally in the `analyze.py` route, getting called twice: once after the deterministic/ML layer to determine if the LangGraph agent should be invoked, and again after LangGraph finishes to calculate the definitive final score before Policy Evaluation.

**Decisions & tradeoffs:**
We opted for a Maximum-Severity with Agreement Boost approach rather than a Learned Aggregation Model (which would require a massive labeled dataset we don't have yet). The boost amount (`+0.15`) is currently hardcoded but could be exposed as a configuration variable in the future.

## [2026-08-14] Policy Engine (Deep)

**Phase:** Phase 11 — Policy Engine
**Files touched:** `policy_engine/manager.py`, `policy_engine/evaluator.py`, `backend/routes/analyze.py`, `database/models.py`, `scripts/test_policy_engine.py`

**What was built:**
Upgraded the Policy Engine from a simplistic rule-looper into a robust, conflict-aware, simulation-capable system. Created `PolicyManager` to handle policy lifecycle, which strictly checks for contradictions and unreachable rules before saving. Updated the `PolicyEvaluator` to support department- and role-level scoping, and removed the implicit "ALLOW" default in favor of an explicit, risk-based fallback mechanism.

**What it does / why it matters:**
This prevents a major vulnerability identified in the threat model: Policy Misconfiguration. By refusing to save contradictory rules, we prevent admins from silently breaking the gateway. The new risk-based defaults ensure that even if an admin forgets to write a rule for a specific new category, high-risk requests will still be blocked by default rather than allowed through a gap.

**How it connects:**
The `PolicyManager` sits behind the (upcoming) Dashboard APIs, guarding the database. The `PolicyEvaluator` remains the final decision gate in the `/analyze` route, but now receives the aggregate `risk_score` and `User` context from the router to make more intelligent fallback and scoping decisions.

**Decisions & tradeoffs:**
We opted for strict conflict prevention (blocking the save) rather than just warning the admin, prioritizing safety over convenience for the MVP. To ensure the local testing worked cleanly without breaking Postgres compatibility, we used SQLAlchemy's `.with_variant()` feature in `database/models.py` so the schema elegantly falls back from `JSONB` to standard `JSON` when run against SQLite.

## [2026-08-14] Sanitization (Inline Redaction)

**Phase:** Phase 12 — Sanitization
**Files touched:** `ai_engine/sanitizer.py`, `backend/routes/analyze.py`, `ai_engine/detectors/*`, `backend/schemas/analyze.py`

**What was built:**
Implemented inline data sanitization (redaction). Upgraded the regex and PII detectors to return precise string character offsets (`start_idx`, `end_idx`). Created a `Sanitizer` utility that processes these offsets in reverse order to safely replace sensitive strings with placeholders (e.g. `<AWS_ACCESS_KEY_REDACTED>`). The `/analyze` API route was updated to handle the `SANITIZE` policy action, which triggers this redaction.

**What it does / why it matters:**
This allows the gateway to act as an active Data Loss Prevention (DLP) tool rather than just a dumb firewall. Users can get their work done safely without being completely blocked just because they accidentally pasted an API key. We also implemented a mandatory Verification Loop: after sanitizing the text, it is re-evaluated by the detection pipeline. If it remains high-risk, the action escalates to `BLOCK`, preventing partial leaks.

**How it connects:**
Sits in the final stage of `analyze.py`, right after the `PolicyEvaluator` decides on `SANITIZE`. The redacted text is returned in the `AnalyzeResponse` API payload so the frontend can transparently show the user what was altered.

**Decisions & tradeoffs:**
We opted for irreversible redaction as the default posture, rather than format-preserving tokenization, to minimize risk surface for the MVP. The verification loop currently runs the deterministic and ML detectors again, but skips the LangGraph agent for speed, assuming the LLM is unnecessary if the deterministic detectors give it a clean bill of health post-redaction.

## [2026-08-14] Routing and Provider Adapters

**Phase:** Phase 13 — Routing and Provider Adapters
**Files touched:** `ai_engine/adapters/base.py`, `ai_engine/adapters/dummy.py`, `ai_engine/router.py`, `database/models.py`, `backend/routes/analyze.py`

**What was built:**
Implemented an intelligent Routing Manager to dispatch validated prompts to external AI providers. Added an abstract `ProviderAdapter` class and a `DummyAdapter` implementation to simulate latency and health statuses without hitting real APIs. The `AIDestination` schema was updated to include `trust_level` and `fallback_destination_id`. The `/analyze` endpoint was updated to invoke the router, forward the (potentially sanitized) text, and record the `provider_used` in the audit log.

**What it does / why it matters:**
This fulfills the requirement of building a resilient gateway. If a primary AI provider goes down, the router seamlessly falls back to a pre-approved secondary provider in the fallback chain. It also prepares the foundation for cost- and trust-level-based routing (e.g., ensuring highly sensitive, but permitted, queries only go to `INTERNAL` trust tier models).

**How it connects:**
Sits at the very end of `analyze.py`. Once the policy engine allows or sanitizes a request, the text is handed to `RoutingManager.route_request()`.

**Decisions & tradeoffs:**
We opted to use dummy adapters for the MVP rather than wiring up actual OpenAI or Anthropic SDKs. This keeps development fast, free, and completely local while fully validating the architectural fallback logic. We used an in-memory SQLite database in `scripts/test_router.py` to test the fallback chains in isolation.

## [2026-08-14] Gateway and API Design

**Phase:** Phase 14 — Gateway and API Design
**Files touched:** `backend/middleware/errors.py`, `backend/middleware/rate_limiter.py`, `backend/services/webhook.py`, `backend/main.py`, `backend/routes/analyze.py`, `scripts/test_gateway.py`

**What was built:**
Hardened the FastAPI backend to enterprise standards. Added a global exception handler to guarantee consistent JSON error schemas (`error_code`, `message`, `reference_id`) and prevent stack trace leaks. Implemented an in-memory token-bucket rate limiter (`@rate_limit`). Added request idempotency/deduplication in the `/analyze` routes by caching identical `raw_content_hash` requests for 5 minutes. Added an asynchronous Webhook Dispatcher that triggers when a request gets blocked with a critical risk score (>=0.8).

**What it does / why it matters:**
This protects the gateway from abuse (via rate limiting) and reduces unnecessary LLM compute costs (via deduplication). The structured errors make it easy for frontend clients to parse failures, and the webhook alerts lay the foundation for SIEM/SOC integrations, fulfilling the core security dashboard alerting requirement.

**How it connects:**
Errors wrap the entire FastAPI app in `main.py`. The rate limiter is applied as a decorator to the `/analyze` routes. Idempotency runs immediately upon receiving a payload, bypassing the rest of the detection pipeline on cache hits. The webhook fires right before returning the final response if the action was `BLOCK`.

**Decisions & tradeoffs:**
We used an in-memory token bucket for rate limiting instead of Redis to keep the MVP infrastructure simple. Similarly, the webhook dispatcher simulates the HTTP request with `asyncio.sleep` to prevent test failures without needing a real endpoint to hit. Both can easily be swapped for their production counterparts later.

## [2026-08-14] Response Analyzer

**Phase:** Phase 15 — Response Analyzer
**Files touched:** `ai_engine/detectors/response_detector.py`, `backend/routes/analyze.py`, `scripts/test_response_analyzer.py`

**What was built:**
Extended the gateway's protection to the *outbound* response generated by the AI provider. The `ResponseDetector` now flags hallucinated, unverified claims and malicious content. The API routes `/prompt` and `/file` were updated to parse the AI provider's response, evaluate it against the policy engine, and proactively block the response (replacing it with a generic `[BLOCKED BY RESPONSE ANALYZER]` message) if it violates policy, before returning it to the user. The `/prompt` endpoint was also updated to route the request to the AI provider, which was previously missing.

**What it does / why it matters:**
This catches "hallucinated" sensitive claims or dangerous advice generated by the AI itself, distinct from the response merely leaking pre-existing sensitive data. Even if a user asks a benign question, the AI might hallucinate a fake company policy or credential, which could be harmful if acted upon.

**How it connects:**
Sits at the very end of the `analyze.py` route, after the `RoutingManager` returns the AI response. It uses the same `RiskAggregator` and `PolicyEvaluator` as the prompt analyzer, ensuring consistent policy application across inbound and outbound traffic.

**Decisions & tradeoffs:**
We kept the prompt's `final_action` independent from the `response_action`. If a response is blocked, the prompt itself remains recorded as `ALLOW` but the `response_action` is logged as `BLOCK`. This clearly distinguishes between a malicious user request versus a rogue AI generation in the audit logs.

## [2026-08-14] Audit System and Compliance Mapping

**Phase:** Phase 16 — Audit System and Compliance Mapping
**Files touched:** `database/models.py`, `backend/routes/analyze.py`, `docs/COMPLIANCE.md`, `scripts/test_audit_immutability.py`

**What was built:**
Implemented application-layer strict immutability for all audit logs using SQLAlchemy's `before_update` and `before_delete` events on the `AuditLog` model. Enhanced the `analyze.py` endpoints to explicitly embed `request_id` and `user_id` inside the `meta_data` JSON for explicit correlation. Finally, drafted `docs/COMPLIANCE.md` which maps EAISG's technical controls directly to SOC 2 (Security/Confidentiality) and GDPR (Data Minimization/Erasure) frameworks, while explicitly defining the local vs. external data residency boundary.

**What it does / why it matters:**
This ensures that the gateway itself cannot be used to cover up a breach or a rogue administrative action. An immutable audit trail is a hard requirement for SOC 2, and by explicitly mapping our technical capabilities to regulatory frameworks, we make the system enterprise-ready for security and compliance reviewers.

**How it connects:**
The immutability sits at the lowest ORM layer (`models.py`), ensuring that no matter how the API or future Dashboard routes are designed, they cannot accidentally modify logs. The compliance document serves as the human-readable bridge explaining these controls.

**Decisions & tradeoffs:**
We opted for application-layer ORM immutability via SQLAlchemy events rather than PostgreSQL-level database triggers for the MVP. This keeps the logic database-agnostic (working equally well on SQLite for tests and Postgres for production) while still preventing any accidental application logic from mutating logs.
