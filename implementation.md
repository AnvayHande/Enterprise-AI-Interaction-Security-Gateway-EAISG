# EAISG — Implementation Plan (Exhaustive Edition)

**Enterprise AI Interaction Security Gateway (EAISG): A Multi-Agent Framework for Secure Enterprise AI Governance**

This is the maximally detailed, code-free build plan for EAISG. It goes beyond "what to build" into "what to build, why it exists, what breaks if you skip it, what the edge cases are, how it's governed, how it's tested, how it's operated, and how it's evaluated as a piece of research." `learn.md` remains the running log of what was actually implemented, referencing the section numbers below.

> **Golden rule, unchanged:** Build the MVP first, prove the core deterministic pipeline works end-to-end, then layer in files → ML → LangGraph → policy → dashboard → hardening → research evaluation. Depth of planning is not a license to build everything at once.

---

## Table of Contents

0. Executive Summary and Vision
0.1 Personas
0.2 Threat Actor Profiles
1. Technology Stack — Full Rationale, Alternatives, Licensing
2. System Definition and Design Philosophy
3. Phase 0 — Threat Modeling (Deep)
4. Phase 1 — Repository, Conventions, Documentation Standards
5. Phase 2 — Database Design (Deep)
6. Phase 3 — Authentication, Identity, Session Management
7. Phase 4 — The Prompt Analyzer MVP
8. Phase 5 — Deterministic Detection Layer (Deep)
9. Phase 6 — File Processing Pipeline (Deep)
10. Phase 7 — Dataset Construction (Deep)
11. Phase 8 — ML Model Development (Deep)
12. Phase 9 — LangGraph Multi-Agent Layer (Deep)
13. Phase 10 — Risk Aggregation (Deep)
14. Phase 11 — Policy Engine (Deep)
15. Phase 12 — Sanitization
16. Phase 13 — Routing and Provider Adapters
17. Phase 14 — Gateway and API Design
18. Phase 15 — Response Analyzer
19. Phase 16 — Audit System and Compliance Mapping
20. Phase 17 — Governance Dashboard (Deep, page-by-page)
21. Human-in-the-Loop Workflows
22. Phase 18 — Testing Strategy (Deep)
23. Phase 19 — Performance, Capacity Planning, SLOs
24. Phase 20 — Research Evaluation (Deep)
25. Phase 21 — Deployment, Reliability, Disaster Recovery
26. Security-of-the-Security-System (Meta-Security)
27. Cost Model
28. Team Structure and RACI
29. Milestones (Expanded)
30. 16-Week Schedule (Day-Level Detail)
31. Build Order
32. Demonstration Scenarios (Expanded)
33. Glossary of Terms
34. Guiding Architectural Principle

---

## 0. Executive Summary and Vision

EAISG exists to solve a problem that most enterprises currently have no structural answer for: employees interacting with AI systems — whether public chatbots, internal copilots, or third-party AI features embedded in SaaS tools — with no consistent checkpoint verifying that what they're sending is appropriate for where it's going. Today this is handled, if at all, through static acceptable-use policies that nobody reads, blanket bans on external AI tools that employees quietly route around anyway, or nothing at all. EAISG's premise is that this problem is structurally similar to a web application firewall or a data loss prevention (DLP) system, but for AI interactions specifically — and that it needs the same qualities those systems have: it must be fast enough not to be a productivity tax, accurate enough not to train employees to ignore its warnings, explainable enough that a security team can trust and act on its decisions, and configurable enough that different departments' very different risk tolerances can be expressed without rewriting the system.

The project's differentiated bet, architecturally, is that no single detection technique is sufficient on its own. Pure keyword/regex rules are fast and explainable but blind to context. A single large language model asked to "judge if this is safe" is contextually aware but slow, expensive, non-deterministic, unauditable, and itself vulnerable to prompt injection from the very content it's judging. EAISG's answer is to combine layers — deterministic detection, a purpose-trained classifier, and LLM reasoning reserved only for genuinely ambiguous cases — under an explicit orchestration graph and a transparent, enterprise-configurable policy layer that makes the actual business decision. This layered design is simultaneously an engineering decision (for cost and latency) and a research contribution (a comparison of these layers against each other becomes the evaluation section of the project).

### 0.1 Personas

Designing against concrete personas, even informally, prevents the system from being built for an imaginary "generic user."

**Priya, Marketing Employee.** Uses a public AI chatbot daily to draft social copy and summarize competitor content. Has no security background and no patience for friction. Wants a subtle, fast, mostly-invisible experience — she should barely notice EAISG exists unless she does something risky.

**Daniyar, Software Engineer.** Uses an AI coding assistant constantly. Frequently pastes real code, sometimes including config files, into prompts to get debugging help. Needs the system to distinguish "this is normal engineering work" from "this specific paste contains a live credential," because if EAISG blocks ordinary code-sharing too aggressively, he will find a workaround outside the gateway entirely — which is a worse outcome than a slightly imperfect system that stays in the loop.

**Farah, HR Manager.** Occasionally needs to use AI to help draft policies or summarize anonymized survey data, but must never send individual employee records anywhere ungoverned. Cares most about the system correctly recognizing spreadsheets and tabular PII.

**Omar, Security Analyst.** The internal consumer of the governance dashboard. Needs to be able to answer "why was this blocked" in under thirty seconds without reading raw logs, and needs to be able to spot patterns (a department, a user, a time window) rather than reviewing requests one at a time.

**Elena, Compliance/Legal Officer.** Needs the system's decisions to be defensible after the fact — if regulators or an internal audit ask "how did you prevent X," the audit trail and policy configuration need to answer that question without engineering involvement.

### 0.2 Threat Actor Profiles

Distinct from the technical threat model in Phase 0, it helps to reason about *who* is on the other side of each threat.

**The well-meaning but careless employee** — by far the most common source of incidents. Not malicious; simply didn't think about what was in the file they uploaded. Most of EAISG's value is captured just by defending against this actor.

**The rushed employee under deadline pressure** — knows the policy exists but is tempted to route around it because the "approved" path is slower. This actor is why UX and latency matter as much as detection accuracy: a system employees actively evade provides zero protection.

**The curious-but-not-malicious employee testing boundaries** — will occasionally try to see what the system catches, sometimes phrased as "just checking." Worth explicitly not treating as an attacker; a private warning is more appropriate than an escalation on first occurrence.

**The insider with intent to exfiltrate** — a genuinely malicious actor deliberately trying to move data out through an AI interaction because it may be less monitored than traditional channels (email, USB, cloud storage). This actor will actively try to evade detection — splitting content across multiple smaller requests, obfuscating credentials, renaming files, or embedding prompt-injection payloads designed to manipulate the LLM-based agents into approving something they shouldn't.

**The external attacker via a compromised account** — functionally similar to the insider-with-intent case from EAISG's perspective, but worth naming separately because it changes which mitigations matter (account compromise detection, anomalous behavior alerting, and rate limiting matter more here than content classification alone).

---

## 1. Technology Stack — Full Rationale, Alternatives, and Licensing Notes

| Layer | Primary Choice | Considered Alternatives | Why the Primary Choice Wins | Licensing/Cost Note |
|---|---|---|---|---|
| Backend framework | FastAPI | Django REST Framework, Flask | FastAPI's native async support matters because this gateway is fundamentally I/O-bound (waiting on file scans, ML inference, LLM calls); DRF's synchronous-first design and heavier ORM coupling add friction for this shape of workload; Flask lacks built-in request/response validation, which this project leans on heavily | MIT-licensed, free |
| ORM/migrations | SQLAlchemy 2.0 + Alembic | Django ORM, Tortoise ORM | SQLAlchemy's explicit, less "magic" query construction is preferable when writing complex policy-evaluation queries and JSONB filtering; Alembic gives reviewable, versioned migrations | MIT-licensed, free |
| Primary database | PostgreSQL | MySQL/MariaDB, MongoDB | Native JSONB support is essential for the flexible findings/policy-condition structures without needing a schema migration for every new detector category; strong transactional guarantees matter for audit-log integrity; MongoDB was considered for findings but rejected because policies and requests are inherently relational (joins across users, destinations, policies) | Open-source, free; hosting cost only |
| Cache/broker | Redis | Memcached, RabbitMQ (as broker) | Redis serves double duty as cache and Celery broker without adding a second infrastructure dependency; its data structures (sorted sets, TTL-based keys) map cleanly onto rate limiting | Open-source (BSD-derived for core), free; hosting cost only |
| Background jobs | Celery | arq, Dramatiq, RQ | Celery is the most battle-tested option with the richest ecosystem (retries, dead-letter queues, monitoring via Flower); arq is a lighter async-native alternative worth reconsidering if Celery's operational overhead proves too heavy for the team's size | BSD-licensed, free |
| PII detection | Microsoft Presidio | spaCy custom NER only, AWS Comprehend PII, GCP DLP API | Presidio is open-source, self-hostable (no data leaves the environment for detection itself, which matters given the product's own premise), and has a pluggable recognizer architecture for custom entity types; the cloud DLP APIs are strong but introduce exactly the kind of external data exposure EAISG is trying to prevent, plus recurring per-call cost | MIT-licensed, free; compute cost only |
| Secret detection | Custom regex bank informed by detect-secrets/gitleaks patterns | TruffleHog, GitHub secret scanning patterns | A custom, curated bank keeps false-positive tuning entirely in the team's control and avoids a dependency on an external tool's update cadence; patterns from established open-source tools are a reasonable starting reference, not a wholesale import | Reference tools are open-source; custom implementation is original |
| Malware scanning | ClamAV | VirusTotal API, commercial AV SDKs | Self-hosted, no per-scan cost, no need to transmit files to a third party (again consistent with the product's own premise); signature-based detection is explicitly acknowledged as a limitation (see Phase 0 scope) rather than hidden | GPL-licensed, free; note GPL implications if distributing EAISG itself as a packaged product |
| PDF processing | PyMuPDF + Tesseract OCR fallback | pdfplumber, pdfminer.six | PyMuPDF is significantly faster for text-layer extraction at scale and also provides page rasterization needed for the OCR fallback path in one library | PyMuPDF is AGPL/commercial dual-licensed — confirm license terms are acceptable for the deployment model before committing; pdfplumber (MIT) is the fallback if AGPL is a blocker |
| DOCX processing | python-docx | Apache Tika | python-docx gives structured paragraph/table access without standing up a separate Tika server process; Tika is worth reconsidering if the format surface expands significantly (e.g., legacy .doc, RTF) | MIT-licensed, free |
| XLSX processing | openpyxl + pandas | xlrd (legacy), Apache POI (Java) | openpyxl handles modern .xlsx natively; pandas adds convenient bulk analysis on top | MIT/BSD-licensed, free |
| Image OCR | Tesseract | Cloud Vision OCR, AWS Textract | Tesseract is self-hosted and free; cloud OCR APIs are more accurate on messy scans and worth revisiting for a "v2" if OCR accuracy becomes a measured bottleneck | Apache-licensed, free |
| Classical ML baseline | scikit-learn (TF-IDF + Logistic Regression/SVM) | XGBoost/LightGBM on hand-engineered features | TF-IDF + linear models is the standard, well-understood baseline for text classification and keeps the "baseline" genuinely simple, which matters for the research narrative (the point of a baseline is to be uncontroversial) | BSD-licensed, free |
| Transformer model | HuggingFace Transformers (DistilBERT → DeBERTa-v3) | Fine-tuned Sentence-BERT with a classification head, a smaller custom architecture | DistilBERT/DeBERTa are well-documented, well-supported multi-label-classification-ready architectures with strong community tooling for training and evaluation, avoiding time spent on custom architecture work that doesn't advance the project's actual contribution | Apache-2.0 licensed, free; compute cost for training/inference |
| Multi-agent orchestration | LangGraph | Custom hand-rolled agent loop, CrewAI, AutoGen | LangGraph's explicit graph structure (versus an implicit agent "loop") is what makes the system auditable — a reviewer can look at the graph definition and see exactly which agents run, in what order or parallelism, and under what conditions, which is central to the project's explainability goals | MIT-licensed, free |
| LLM provider access | Provider-agnostic adapter layer (Anthropic, OpenAI, local model support) | Direct coupling to a single provider's SDK | Avoiding vendor lock-in is both a resilience concern (provider outages, pricing changes, policy changes) and a security concern (routing certain categories to a locally hosted model with no external egress) | Provider API costs vary; local model hosting has compute cost instead |
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, Recharts | Vue, Svelte, Next.js | React has the deepest ecosystem for the specific component types needed (data tables, charts, form builders); Vite's dev server speed matters for iteration velocity; Next.js was considered but its server-rendering features aren't needed for an authenticated internal dashboard | MIT-licensed, free |
| Authentication | JWT + bcrypt, with SSO/SAML as a later extension | Session-cookie-based auth, OAuth-only | JWT keeps the API stateless and horizontally scalable without a shared session store; SSO/SAML integration (Phase 3 extension) is important for real enterprise adoption but not required for the MVP | Free; SSO/IdP integration may have vendor cost depending on the enterprise's existing identity provider |
| Containers | Docker + Docker Compose (dev), Kubernetes (optional production) | Podman, Nomad | Docker/Compose remains the most broadly understood baseline for a small team; Kubernetes should only be adopted once there's an actual operational need for it (multi-node scaling, rolling deployments at scale) — adopting it prematurely adds ops burden without benefit | Free; managed Kubernetes hosting has cost |
| CI/CD | GitHub Actions | GitLab CI, Jenkins | Free tier is generous for academic/small-team use and integrates directly with pull request workflows with no separate infrastructure to maintain | Free within usage limits |
| Observability | structlog, Prometheus + Grafana (later) | ELK stack, Datadog | Structured logs plus a metrics/dashboard pair covers the project's needs without the operational overhead of a full ELK deployment or the recurring cost of a commercial APM tool | Free (self-hosted); commercial APM has recurring cost |
| Secrets management (operational, not detection) | Environment variables + `.env` for MVP, HashiCorp Vault or cloud KMS for production hardening | Plaintext config files, hardcoded values (rejected outright) | `.env`-based config is appropriate for MVP/dev; a real enterprise deployment should graduate to a proper secrets manager with rotation support before handling real sensitive data | Vault is open-source (core); cloud KMS has usage-based cost |

---

## 2. System Definition and Design Philosophy

EAISG decomposes into three cooperating systems, and a fourth cross-cutting concern that touches all three.

**System A — Security Gateway.** The front door: authentication, request intake, file intake, validation, and routing. Contains zero detection logic — its job is plumbing and access control, nothing more. Keeping detection logic out of this layer means it can be tested, scaled, and reasoned about purely as an API/networking concern.

**System B — AI Security Decision Engine.** The intellectual core: deterministic detectors, the ML classifier, the LangGraph agent layer, risk aggregation. This is where the project's actual research contribution lives, and it should be structured so it could, in principle, be tested and evaluated as a standalone library independent of the web framework wrapped around it.

**System C — Governance Dashboard.** The visibility layer: audit logs, statistics, policy management UI. Consumes data produced by A and B; performs no detection of its own.

**Cross-cutting concern — Data Governance.** Not a "system" in the same sense, but a discipline that touches every layer: the rule that raw sensitive content is never persisted, that every persisted artifact is minimized to what's needed for audit and decision-making, and that retention periods and deletion capabilities are designed in from the start rather than retrofitted. This concern is elevated to its own section (Section 19.3, Compliance Mapping) precisely because it's easy to let it quietly erode as new features get added under deadline pressure.

### Design Philosophy Statements

**Fail toward safety, not toward convenience.** Every ambiguous design decision — what happens when a component is unavailable, what happens when confidence is low, what the default policy action is when no rule matches — should be resolved by asking "what's the safer failure mode," even when that failure mode is less convenient for the end user in the moment.

**Explainability is a feature, not a nice-to-have.** A decision the system cannot explain in plain language to a non-technical security analyst is a decision that erodes trust in the whole system over time. Every blocking or warning decision must be traceable to specific findings, specific confidence scores, and a specific policy rule.

**No single point of judgment.** No single detector, model, or agent should have unilateral authority to allow a request through. The policy engine — a transparent, configurable, non-ML component — always makes the final call, informed by but not overridden by any individual detection component.

**Minimize what's stored, maximize what's learned.** The system should retain enough information to explain and audit every decision indefinitely, while retaining as little of the actual sensitive content as possible. Hashes, categories, and confidence scores accomplish nearly everything raw content would, with far less residual risk.

---

## 3. Phase 0 — Threat Modeling (Deep)

### 3.1 Threat Catalog (Expanded)

Beyond the eight threats already identified, a more exhaustive first-pass catalog should include: **credential leakage via indirect reference** (a prompt that doesn't contain a secret directly but asks the AI to "use the API key in my last message" or references a secret stored elsewhere in a linked conversation history); **cross-request correlation risk** (no single request is risky in isolation, but a sequence of small requests from the same user, taken together, reconstructs a sensitive dataset — sometimes called a "salami slicing" exfiltration pattern); **template/boilerplate laundering** (an employee copies a real, sensitive document but strips just enough identifying detail to evade keyword-based detection while leaving the sensitive substance intact); **AI-assisted social engineering content generation** (an employee uses an approved AI to draft content that will itself be used for phishing or manipulation — arguably out of EAISG's core scope but worth explicitly deciding on); **shadow AI usage** (employees using AI tools entirely outside any channel EAISG can observe — importantly, this is a limitation to document, not a threat EAISG can directly mitigate, since it can only govern traffic that actually flows through the gateway); and **policy misconfiguration as its own threat category** (an overly permissive or incorrectly prioritized policy silently defeats the entire system — meaning the policy engine itself needs safeguards, discussed in Phase 11).

### 3.2 A Lightweight Attack-Tree Approach

For the two or three highest-severity threats (credential leakage and proprietary source code leakage are strong candidates), it is worth building an explicit attack tree during this phase: starting from the attacker's goal ("exfiltrate a working production credential through an AI interaction"), branch into the concrete methods available (paste it directly; paste it inside a larger code file; embed it in a file disguised as something else; split it across multiple requests; obfuscate it with encoding or whitespace tricks; reference it indirectly and ask the AI to retrieve it from elsewhere). Each branch should be mapped to which layer of EAISG is expected to catch it — direct pasting and code-file embedding map to the deterministic secret detector; obfuscation and splitting map to the ML classifier and, in ambiguous cases, LLM reasoning; indirect reference is explicitly noted as a residual risk the current design does not fully address, and documented as such rather than silently left as a gap.

### 3.3 Explicit Non-Goals (Expanded)

Beyond the previously listed exclusions, explicitly document that EAISG does not attempt to: detect exfiltration through channels other than the AI interaction path itself (email, cloud storage, USB, screen sharing); provide legal advice about whether a given data-sharing action actually violates a specific regulation (it enforces configured policy, it does not independently interpret law); guarantee zero false negatives (no detection system can, and claiming otherwise undermines the project's credibility); or replace an organization's existing DLP, endpoint security, or identity governance tooling — EAISG is a complementary, AI-interaction-specific layer, not a replacement for a broader security program.

### 3.4 Deliverable of This Phase

A written `docs/SCOPE.md` document containing: the full threat catalog, the attack-tree analysis for the top threats, the explicit non-goals list, and a one-paragraph statement of the system's overall security posture (defense-in-depth, fail-closed-by-default for high-risk paths, human-reviewable for medium-risk paths). This document should be treated as close to immutable — changes to scope should be deliberate, discussed, and dated, not casually edited as development proceeds.

---

## 4. Phase 1 — Repository, Conventions, and Documentation Standards

### 4.1 Repository Structure

(As previously defined: `frontend/`, `backend/`, `ai_engine/`, `agents/`, `file_processor/`, `ml/`, `policy_engine/`, `database/`, `security/`, `tests/`, `datasets/`, `scripts/`, `docs/`, `docker/`, plus root-level environment and orchestration files.) Additionally, a `docs/adr/` subfolder should hold Architecture Decision Records — short, dated documents capturing significant technical decisions (for example, "why PostgreSQL over MongoDB," or "why the risk weights were changed from X to Y after the first evaluation pass") in a consistent, lightweight format: context, decision, consequences. This is what prevents institutional knowledge about *why* something was built a certain way from being lost as the team or the codebase grows.

### 4.2 Naming and Style Conventions

Establish and document conventions before the codebase grows large enough that inconsistency becomes expensive to fix: consistent casing for API field names (snake_case for backend/API, camelCase translated at the frontend boundary is a common and defensible pattern); consistent naming for finding categories across every layer of the system (the exact same string, e.g. `SOURCE_CODE`, must be used by the detector, the database, the API response, and the frontend — any drift here silently breaks aggregation and dashboard filtering); and a documented severity taxonomy (LOW/MEDIUM/HIGH/CRITICAL) used identically everywhere rather than each component inventing its own scale.

### 4.3 Documentation Standards

Every module-level package (`security/`, `agents/`, `policy_engine/`, etc.) should carry a short README describing its responsibility boundary, its inputs and outputs, and what it explicitly does not do — mirroring the "narrow agent responsibility" principle from Phase 9 at the code-organization level, not just the runtime level. API documentation should be generated automatically from the FastAPI route definitions (which is effectively free given the framework choice) rather than maintained by hand in a separate document that will inevitably drift out of sync.

---

## 5. Phase 2 — Database Design (Deep)

### 5.1 Core Entities, Revisited With Additional Considerations

Beyond the six core tables described previously (users, ai_destinations, requests, findings, policies, audit_logs), a mature schema should also account for:

**Sessions or refresh tokens** (if moving beyond simple short-lived JWTs) to support explicit logout and token revocation — a pure stateless JWT design cannot revoke a token before its natural expiration, which is a meaningful gap for an admin who needs to immediately cut off a compromised account.

**Departments as a first-class entity** rather than a free-text field on the user table, once the organization is large enough that department names need to be consistent, filterable, and potentially hierarchical (a department belonging to a larger division, for example).

**Policy version history**, not just the current policy state — every change to a policy's conditions or action should be preserved as a historical version, both for audit purposes ("what was the policy in effect when this request was evaluated three months ago") and for rollback safety.

**Model registry metadata** — a lightweight table or structured log recording which version of the ML classifier (and which version of the training dataset) was active for any given time window, so that a request's stored risk score can always be traced back to the exact model that produced it.

**A data retention/deletion request table**, anticipating the operational need to honor "right to erasure" type requests — even though the design principle is to avoid storing raw sensitive content in the first place, hashes and metadata tied to a specific individual may still need to be purgeable on request.

### 5.2 Indexing Strategy

Beyond the obvious primary keys, deliberate indexing decisions matter as request volume grows: an index on `requests.user_id` and `requests.created_at` together supports the dashboard's most common query pattern (a user's or department's recent history); an index on `requests.request_hash` supports fast deduplication/caching lookups; an index on `findings.request_id` supports the common join used to render a request's full finding list; and a partial index on `policies.enabled` (or filtering enabled policies into a smaller, frequently-cached in-memory set rather than querying the full table on every request) keeps policy evaluation fast as the policy count grows.

### 5.3 Partitioning and Retention

Audit logs and requests are the tables most likely to grow unboundedly over time. From early on, plan for time-based partitioning (for example, monthly partitions) so that old data can be archived or purged efficiently without a full-table operation, and define an explicit retention policy (for example, detailed request-level data retained for a configurable period, after which only aggregated statistics are retained) rather than assuming infinite retention is acceptable or free.

### 5.4 The Data-Minimization Rule, Restated With Enforcement Mechanism

The rule that raw sensitive content is never stored should not rely purely on developer discipline — it should be enforced structurally where possible: for example, by having the persistence layer's write path for `findings.evidence` and `audit_logs.meta` pass through a dedicated redaction/summarization function rather than accepting arbitrary free-text, so that even an accidental attempt to log raw content is caught and truncated/redacted before it reaches the database.

### 5.5 Backup and Recovery

Define and document a backup cadence (e.g., automated daily snapshots with point-in-time recovery for the transactional database), and — importantly — actually test restoring from a backup at least once during development, since an untested backup strategy is not meaningfully different from having no backup strategy.

---

## 6. Phase 3 — Authentication, Identity, and Session Management

### 6.1 Core Flow

(As previously described: credential verification, bcrypt-hashed passwords, JWT issuance carrying identity, role, and department.) 

### 6.2 Extensions Worth Planning For Even If Not Built Immediately

**Multi-factor authentication** for privileged roles (security analyst, admin) at minimum, given that these accounts have broad visibility into organizational risk data and policy control. **Single sign-on / SAML or OIDC integration**, since a real enterprise deployment will almost never want to manage a separate password database — this should be designed as a pluggable identity provider interface from the start, even if the first implementation only supports local password auth, so that adding SSO later doesn't require reworking the authentication core. **Session/token revocation**, addressed via a short-lived access token paired with a longer-lived, database-tracked refresh token that can be explicitly invalidated, rather than relying purely on natural JWT expiration. **Password policy enforcement** (minimum complexity, breach-database checking against known-compromised passwords) for any deployment that does support local passwords at all.

### 6.3 Role-Based Access Control, Restated With Edge Cases

Beyond the four core roles, consider explicitly how role transitions are handled (what happens to a user's historical request visibility if their role or department changes), how a manager's "department-level aggregate visibility" is scoped precisely (aggregate statistics only, or drill-down into individual findings with the sensitive evidence redacted), and how role changes themselves are audited (a role escalation, especially to admin, should itself generate a high-visibility audit event).

### 6.4 Rate Limiting Tied to Identity

Authentication should feed directly into the rate-limiting strategy: limits should be enforced per-user (to catch a single compromised or malicious account attempting rapid-fire requests) and, separately, per-department or organization-wide (to catch coordinated or distributed abuse patterns that no single account limit would catch).

---

## 7. Phase 4 — The Prompt Analyzer MVP

(Unchanged in substance from the previous version of this document, restated for completeness.) This is the first genuinely end-to-end slice of the system: a single endpoint that accepts prompt text and a destination, normalizes it into the system's standard internal request representation, runs it through the deterministic detectors, computes a risk score, checks it against policy, and returns a decision. The purpose of building this first, in isolation from files, ML, and agents, is to validate the full request lifecycle — authentication, normalization, detection, aggregation, policy evaluation, persistence, and audit logging — against the simplest possible input, so that every subsequent phase is additive rather than requiring rework of the core loop.

### 7.1 Definition of Done for This Phase

This phase is not complete until: a harmless prompt reliably returns a low risk score and an allow decision; a prompt containing an obvious credential reliably returns a high/critical risk score and a block decision; every request, regardless of outcome, produces a corresponding audit log entry; and the full round trip (including authentication) is covered by at least one automated end-to-end test, not just manual verification.

---

## 8. Phase 5 — Deterministic Detection Layer (Deep)

### 8.1 PII Detection — Additional Considerations

Beyond the core entity types already listed, consider: **locale sensitivity** — a phone number or national identifier format that Presidio recognizes well for one country/locale may need custom recognizers for others, and the entity set actually enabled should be deliberately chosen based on the organization's actual geographic footprint rather than enabling every possible recognizer indiscriminately, which increases false-positive noise. **Confidence calibration** — Presidio's raw confidence scores should be validated against real examples specific to the organization's own document styles before being trusted at face value; a threshold that works well on Presidio's own test data may not transfer perfectly to, say, internal HR spreadsheet formats. **Context-window recognizers** — Presidio supports context words that boost confidence when nearby (for example, the word "SSN" near a number pattern) — these should be tuned using real organizational vocabulary, not left at defaults.

### 8.2 Secret Detection — Additional Considerations

**False-positive management is the central ongoing challenge** for this detector category, more than detection coverage itself, because overly broad patterns (especially the generic "any long random-looking string assigned to a variable" pattern) will otherwise fire constantly on legitimate configuration examples, test fixtures, and placeholder values. Beyond entropy scoring, consider maintaining an explicit **allowlist mechanism** for known-safe placeholder patterns (e.g., strings like "your_api_key_here" or well-known public test keys used in documentation) so that legitimate educational or example content doesn't generate constant noise. Consider also **secret-type-specific validation** where feasible — for example, an AWS access key ID has a specific checksum-like structure that can be partially validated beyond a simple prefix match, reducing false positives from coincidentally similar-looking strings.

### 8.3 Source Code Detection — Additional Considerations

Beyond extension and pattern heuristics, consider a **confidence-tiered approach**: a `.py` file extension alone is high-confidence code; a plaintext paste containing import statements and function definitions is medium-confidence code (since natural language discussing code, like a tutorial or a question *about* code, can superficially resemble code); and this tiering should feed into how aggressively secondary scanning (specifically re-running the secret detector) is triggered.

### 8.4 Financial and Legal Detection — Path to Maturity

The keyword-based v1 approach for both categories should have an explicit, planned upgrade path once the ML classifier exists: rather than discarding the keyword detectors, use them as one of several signals fed into the ML model's feature set or as a fast pre-filter that decides whether the more expensive semantic classifier needs to run at all, keeping the deterministic layer valuable even after ML is introduced rather than treating it as a purely temporary placeholder.

### 8.5 Multi-Language Considerations

If the organization operates in multiple languages, every detector in this layer needs an explicit decision about language coverage: Presidio's underlying NLP model needs to be configured for the relevant languages, keyword lists for financial/legal detection need to be either translated and maintained per-language or replaced with language-agnostic approaches, and this limitation, if not addressed, should be explicitly documented as a scope boundary (per Phase 0's principle of stating limitations plainly) rather than silently failing to detect risk in non-English content.

---

## 9. Phase 6 — File Processing Pipeline (Deep)

### 9.1 Pipeline Order, Restated With Failure Semantics at Each Step

At every step in the mandatory pipeline order (size validation, extension validation, MIME verification, hashing, malware scanning, safe extraction, content extraction, security analysis), define explicitly what happens on failure, not just on success: a size violation should reject immediately with a clear user-facing message, not a generic error; a MIME/extension mismatch should be treated as suspicious in itself (a `.pdf` file that is not actually a PDF is a stronger signal than an unrelated coincidence) and logged as such even before any content-level analysis occurs; a malware scan failure (the file is flagged) should immediately halt the pipeline and never proceed to content extraction; and any unhandled exception during content extraction (a corrupted file, an unsupported edge case within an otherwise-supported format) must resolve to the fail-closed behavior described in Phase 21 rather than silently skipping analysis and treating the file as safe by default.

### 9.2 Encoding and Internationalization Edge Cases

Text extraction across formats needs explicit handling of character encoding — a DOCX or PDF containing non-UTF-8 text, right-to-left scripts, or unusual Unicode constructs (including deliberately obfuscated Unicode homoglyphs, sometimes used to evade keyword matching by substituting visually similar characters from a different alphabet) should be normalized consistently before being passed to any detector, and normalization failures should be logged rather than silently producing garbled or partial text that then produces unreliable detection results.

### 9.3 Nested and Composite Documents

Beyond simple ZIP archives, consider explicitly how the pipeline handles: embedded objects within a DOCX or XLSX file (an Excel file with an embedded image containing text, or a Word document with an embedded spreadsheet); PDF attachments (a PDF can itself contain attached files); and email export formats (.eml/.msg files, if these are part of the organization's actual usage pattern, contain headers, body text, and potentially attachments that each need their own extraction path). Each of these should either be explicitly supported with its own extraction logic, or explicitly rejected/flagged as an unsupported format that cannot be safely analyzed — never silently processed as if it were a simple flat text file, since doing so would miss an entire embedded layer of potential risk.

### 9.4 Performance Characteristics by Format

Different formats have very different processing cost profiles, and this should inform both the background-job design and the user-facing experience: plain text and DOCX extraction is fast enough to feel synchronous; OCR (whether for scanned PDFs or images) is meaningfully slower and should always be handled as an asynchronous background job with a status-polling or webhook-based completion notification to the user, rather than holding an HTTP request open; and large ZIP archives with many contained files should have their per-file processing parallelized where the underlying infrastructure allows, with a defined ceiling on total processing time before returning a partial-results-with-warning response rather than leaving the user without feedback for an extended period.

### 9.5 Chain of Custody for Uploaded Files

For audit defensibility, maintain an explicit chain of custody for every uploaded file even though the raw content itself is not retained long-term: recording the file's hash, the time it was received, the time it was scanned, the scan result, the time content extraction completed, and the time (if applicable) the file was permanently deleted from any temporary processing storage. This turns "we processed and then discarded this file safely" from an implicit assumption into an explicitly auditable claim.

---

## 10. Phase 7 — Dataset Construction (Deep)

### 10.1 A Fuller Taxonomy

Beyond the nine core labels, consider whether sub-categorization within a category adds evaluative or operational value — for example, within CREDENTIAL, distinguishing a cloud-provider key from a database password from a generic API token may matter for routing decisions (a database password might warrant an internal-only workflow different from a generic SaaS API key). Introduce sub-labels only where they will actually be used by a downstream decision (routing or policy), not for their own sake, since every additional label increases the annotation burden during human verification.

### 10.2 Licensing Due Diligence for Public Datasets

Before incorporating any public dataset, explicitly check and document its license terms — some datasets restrict commercial use, redistribution, or derivative-model training, and a project that eventually becomes a real deployed product (rather than staying purely academic) needs this checked early rather than discovered as a blocker after a model has already been trained on non-compliant data. Maintain a `datasets/SOURCES.md` file listing every dataset used, its license, and the specific fields/subset actually incorporated.

### 10.3 Synthetic Data Generation — Process Detail

When generating synthetic enterprise scenarios with an LLM, deliberately vary: the department context (the same underlying risk category — financial data, say — should be generated in HR, Finance, Sales, and Engineering framings, since real risk doesn't cluster only in the "obvious" department); the phrasing register (formal versus casual, since real employee prompts span a wide range of writing styles); and the difficulty level, deliberately including borderline/ambiguous examples (content that a reasonable reviewer might genuinely disagree about) alongside clearly-safe and clearly-risky examples, since a model trained only on unambiguous examples will be poorly calibrated on the ambiguous cases that matter most in production.

### 10.4 Human Verification Process Detail

Structure the human review pass as a defined workflow, not an informal pass: each example should be reviewed by at least one human against a written labeling guideline (a short document defining, with examples, what qualifies as each category and where the boundaries lie); disagreements or genuinely ambiguous cases should be flagged for a second reviewer or discussion rather than resolved unilaterally; and inter-annotator agreement should be measured on a sample, since a labeling guideline that produces low agreement between reviewers indicates the category definitions themselves need refinement before the dataset can be trusted.

### 10.5 Bias and Representativeness Considerations

Actively check whether the dataset's synthetic and public-source examples skew toward particular writing styles, industries, or company sizes in ways that don't reflect the actual organization the system will be deployed in — a model trained predominantly on, say, US-centric financial terminology may under-detect equivalent risk expressed in different regional business vocabulary. This is both a fairness consideration and a pure accuracy consideration, since a skewed training set produces a model that performs unevenly across the organization's actual departments and use patterns.

### 10.6 Dataset Versioning

Treat the dataset itself as a versioned artifact, not a static file — every meaningful update (new examples added, labels corrected, a category redefined) should produce a new dataset version identifier, and every trained model should record exactly which dataset version it was trained against, so that "why did the model's behavior change" is always answerable by comparing dataset versions, not just model versions.

---

## 11. Phase 8 — ML Model Development (Deep)

### 11.1 The Comparison Ladder, Restated With Evaluation Discipline

At each rung of the ladder (rule-based, classical ML, transformer, single LLM, full multi-agent system), evaluate against the *exact same* held-out test set, using the *exact same* metrics, and record results in a single comparison table maintained throughout development rather than computed only once at the end — this allows tracking whether each added layer of complexity is actually earning its cost in latency and infrastructure, which is itself a meaningful finding for the research write-up even if the answer for some layer turns out to be "no, this didn't help enough to justify the added complexity."

### 11.2 Hyperparameter Tuning Discipline

Tune hyperparameters (learning rate, batch size, number of training epochs, regularization strength for the classical baseline) against the validation split only, and touch the held-out test split exactly once, at the very end, for the final reported numbers — repeatedly checking test-set performance during tuning and adjusting based on it is a subtle but serious form of overfitting to the test set that inflates reported performance beyond what the model will actually achieve on truly new data.

### 11.3 Model Calibration

A model's raw confidence outputs are not automatically well-calibrated probabilities — a model that outputs "0.9 confidence" should, ideally, actually be correct about 90% of the time when it says that. Consider a calibration pass (for example, temperature scaling or Platt scaling applied to the model's output layer) especially before those confidence scores are used directly as multipliers in the risk aggregator's scoring formula, since an uncalibrated model will otherwise silently distort the risk scores it feeds into.

### 11.4 Model Card

Produce a model card for the final trained classifier — a short, standardized document covering: what the model is trained to predict and on what data, its measured performance broken down by category (not just an aggregate number, since performance often varies significantly by category — PII detection is typically far more mature than legal-content detection, for example), known limitations and failure modes observed during evaluation, and the intended use case boundaries (this model is intended as one signal among several within EAISG's broader pipeline, not as a standalone risk-classification tool). This both documents the model responsibly and directly supports the explainability goals of the broader project.

### 11.5 Drift Monitoring and Retraining Triggers

Plan, even if not fully implemented in the MVP timeline, for how model drift will be detected over time — the distribution of real employee requests will shift as tools, projects, and business priorities change, and a model trained once and never revisited will gradually degrade. Define a lightweight monitoring approach (for example, periodically sampling recent production requests, having them human-reviewed, and comparing the model's predictions against those fresh human labels) and a rough retraining cadence or trigger condition (a measured accuracy drop beyond a defined threshold, or simply a fixed quarterly review).

### 11.6 Explainability at the Model Level

Beyond the system-level explainability the risk aggregator and policy engine provide (which category and confidence triggered which policy), consider whether feature-importance techniques appropriate to the specific model type in use (for example, coefficient inspection for the linear baseline, or attention-based or gradient-based attribution methods for the transformer) can surface *which specific words or spans* most influenced a given classification — this is a genuinely valuable addition to the audit trail ("the model flagged this as financial content primarily because of these three phrases") but should be treated as a stretch goal given its added complexity, not a blocking requirement for the MVP.

---

## 12. Phase 9 — LangGraph Multi-Agent Layer (Deep)

### 12.1 Failure Handling Within the Graph

Every node in the graph — not just the LLM-reasoning node — needs explicit failure handling: what happens if an individual agent throws an exception, times out, or returns malformed output should never crash the entire graph execution. Each agent invocation should be wrapped with a timeout appropriate to its expected latency (fast for deterministic-detector-backed agents, longer but still bounded for LLM-backed agents), and a node's failure should degrade gracefully — the aggregation step should be able to proceed with whatever findings did successfully complete, flagging the failed agent's absence itself as a data point (an "agent unavailable" finding with an appropriately cautious default severity) rather than either blocking the entire pipeline or silently treating a failed agent as having found nothing.

### 12.2 Circuit Breaking for the LLM Reasoning Step

Because the confidence-gated LLM reasoning step depends on an external provider (or a local model service) that can itself become slow or unavailable, wrap it with circuit-breaker behavior: if the LLM step has failed or timed out repeatedly within a recent window, temporarily stop attempting to invoke it and fall back directly to the deterministic-plus-ML decision path for a cooldown period, rather than letting every single ambiguous request individually wait out a timeout against a provider that is currently degraded.

### 12.3 Cost and Latency Budgeting

Treat LLM invocation as a budgeted resource, not an unlimited one: define an expected or maximum acceptable rate of LLM invocation per unit time (both for cost control and to keep aggregate system latency predictable), and monitor the actual confidence-gating trigger rate in production — if a much larger share of requests than expected is routing through the LLM reasoning step, that's a signal that either the deterministic/ML layers are miscalibrated (too many things registering as "low confidence") or that the confidence threshold itself needs tuning, and this should be treated as an operational metric worth dashboarding, not just a background implementation detail.

### 12.4 Expanded Agent Set (Beyond the Core Six)

Beyond PII, source code, financial, legal, compliance, and malware agents, consider whether additional specialized agents earn their keep as the system matures: a **cross-request correlation agent** (flagging when a sequence of a single user's recent requests, taken together, resembles a slow exfiltration pattern even though no single request is individually risky); a **destination-appropriateness agent** (reasoning specifically about whether the content's category matches what the target AI destination is approved for, as a check somewhat independent of pure content risk); and a **behavioral-anomaly agent** (flagging when a user's current request pattern is a significant deviation from their own historical baseline, which can catch account-compromise scenarios that content-based detection alone would miss). Each new agent should be added only when a specific, named threat from the Phase 0 threat catalog motivates it — resist adding agents speculatively.

### 12.5 Testing the Graph Itself

Beyond testing individual agents in isolation, the graph's control flow itself needs dedicated tests: confirming that the parallel fan-out genuinely executes agents concurrently rather than accidentally serially; confirming that the confidence-gating conditional edge correctly routes to the LLM-reasoning path only when it should; and confirming that a deliberately-failing agent (simulated for the test) does not prevent the graph from reaching a decision.

---

## 13. Phase 10 — Risk Aggregation (Deep)

### 13.1 Beyond Simple Weighted Sums

The initial linear weighted-sum scoring approach is a reasonable, explainable starting point, but should be explicitly treated as one candidate scoring function among several worth evaluating rather than the presumed final answer. Alternatives worth considering and comparing during the research evaluation phase include: a **maximum-severity-dominant approach** (the overall score is driven primarily by the single highest-severity finding rather than a sum, on the reasoning that one critical finding shouldn't be diluted by averaging against several low-severity ones); and a **learned aggregation model** (once enough labeled examples of "what a human reviewer would actually decide given this exact combination of findings" exist, a small model could learn the aggregation function itself rather than relying on hand-set weights) — this is explicitly a stretch goal appropriate for later in the project, once the simpler approaches have been evaluated and their specific shortcomings are understood.

### 13.2 Handling Conflicting or Redundant Findings

When multiple detectors flag overlapping content (for example, both the deterministic PII detector and the ML classifier flag the same span of text as PII), the aggregator needs an explicit deduplication or overlap-resolution strategy so that the same underlying risk isn't double-counted and inflating the score beyond what the actual content warrants — while still using agreement between independent detectors as a positive confidence signal (multiple independent detectors agreeing on the same finding is itself meaningful and can reasonably boost confidence, distinct from simply summing their individual weighted contributions).

### 13.3 Sensitivity Analysis

Before finalizing any weight or threshold configuration, run a sensitivity analysis against the evaluation dataset: for each weight, measure how much the overall precision/recall/false-negative-rate changes as that weight is varied within a reasonable range. This identifies which weights the system's behavior is most sensitive to (and therefore most worth careful tuning and documentation) versus which weights have comparatively little effect on outcomes (and therefore don't warrant extensive debate).

### 13.4 Transparency of the Aggregation Output

The aggregator's output should always include not just the final score and level, but a structured breakdown of exactly how that score was composed — which findings contributed, how much each contributed, and what contextual multipliers were applied — since this structured breakdown is precisely what feeds the explainability requirement in both the dashboard and the policy engine's decision rationale.

---

## 14. Phase 11 — Policy Engine (Deep)

### 14.1 Conflict Detection and Resolution

Beyond simple priority-ordering, the policy engine should actively help administrators avoid accidentally contradictory or redundant policies: when a new policy is created or edited through the dashboard, run a check against existing enabled policies to surface potential conflicts (two policies with overlapping conditions but different actions) or redundancies (a new policy whose conditions are a strict subset of an existing higher-priority policy, making it unreachable) before the policy is saved, rather than allowing silent misconfiguration to accumulate over time.

### 14.2 Policy Simulation Mode

Before a new or edited policy takes effect against live traffic, provide a simulation capability: allow an administrator to run a candidate policy change against a sample of recent historical requests and see exactly which of those requests would have received a different decision under the new policy, compared to what actually happened. This turns policy changes from a leap of faith into an evidence-based decision, and is particularly important precisely because policy misconfiguration was identified in Phase 0 as its own threat category — a poorly tested policy change is a realistic way for the entire system's protection to be silently weakened.

### 14.3 Policy Versioning and Rollback

Every saved policy change should be versioned (as noted in the database design phase), with a clear ability to view the history of changes to a given policy and roll back to a previous version if a change turns out to have unintended consequences. Policy changes, especially by admin users, should themselves generate a distinctly visible audit event.

### 14.4 Default Behavior When No Policy Matches

This deserves explicit, documented resolution rather than an implicit default: a reasonable approach is to tie the default action to the computed risk level itself rather than a single global default — for example, defaulting to allow only when the risk level is LOW and no policy matched, but defaulting to warn (never silently allow) when the risk level is MEDIUM or higher and no specific policy addressed it, on the reasoning that an unanticipated combination of findings at meaningful risk levels should surface for human awareness rather than pass through silently just because nobody wrote a rule for that exact combination in advance.

### 14.5 Department- and Role-Sensitive Policy Authoring

Since different departments legitimately have different risk profiles and different approved destinations (as the HR/Legal/Engineering examples throughout this document illustrate), the policy authoring interface in the dashboard should make department- and role-scoping a first-class, easy-to-use part of creating a policy, rather than an advanced option buried in a generic condition builder — this directly supports the realistic organizational need for differentiated policy without requiring a security administrator to hand-write complex condition logic for every department separately.

---

## 15. Phase 12 — Sanitization

### 15.1 Reversibility Considerations

Distinguish explicitly between **irreversible redaction** (replacing sensitive text with a generic placeholder, with no way to recover the original from the sanitized version alone) and **format-preserving, potentially reversible tokenization** (replacing a sensitive value with a token that could, under strict access control, be mapped back to the original — useful when a downstream process genuinely needs the real value restored later under controlled conditions). The default posture should be irreversible redaction; reversible tokenization should be treated as a deliberately scoped, tightly access-controlled exception rather than the default, given the additional risk surface a reversible mapping introduces.

### 15.2 Sanitization Quality and Verification

After sanitization, before the sanitized content is forwarded to an AI destination, re-run the detection layer against the *sanitized* output as a verification step — this catches cases where the sanitization process itself missed something (for example, a PII detector correctly redacted an email address but missed a phone number expressed in an unusual format nearby), rather than assuming sanitization is always complete and correct on the first pass.

### 15.3 User Transparency

When a request proceeds via sanitization rather than a full block, the user should be shown, at minimum, a summary of what was redacted and why (categories, not the original values), so that sanitization doesn't feel like a silent, unexplained modification of their content — this both builds trust in the system and helps the user learn what kinds of content trigger sanitization over time, gradually reducing how often it's needed at all.

---

## 16. Phase 13 — Routing and Provider Adapters

### 16.1 Routing Signals Beyond Category and Department

Beyond risk category and department, a mature router should also weigh: **destination trust level** (an explicit, administrator-configured trust tier per AI destination, distinct from the binary allowed/not-allowed flag, allowing more nuanced routing decisions than a simple allow-list); **cost** (different providers and models have meaningfully different per-token costs, and for low-risk, high-volume traffic, cost-aware routing to a cheaper model may be entirely appropriate); and **latency requirements** (an interactive chat use case has much tighter latency tolerance than a background batch-summarization use case, and the router can reasonably make different provider choices for each).

### 16.2 Fallback Chains

For resilience, define an explicit ordered fallback chain per routing scenario rather than a single hardcoded destination — if the primary approved provider for a given category is unavailable, the router should have a defined, pre-approved secondary option to fall back to (never falling back to an *unapproved* destination just because the approved one is down), and this fallback behavior itself should be visible in the audit log so that "why did this request go to provider B instead of provider A" is always answerable after the fact.

### 16.3 Adapter Health Checking

Each provider adapter should support a lightweight health check that the router can consult (or that a background process periodically checks and caches) so that routing decisions can proactively avoid a known-unavailable provider rather than discovering the failure only at the moment of an actual request and incurring that latency cost on the user's critical path.

---

## 17. Phase 14 — Gateway and API Design

### 17.1 API Versioning Strategy

Even for an internal system, adopt an explicit API versioning convention from the start (for example, a version segment in the URL path) so that breaking changes to the request/response contract can be introduced without silently breaking whatever frontend or integration clients already exist — retrofitting versioning onto an unversioned API later is far more disruptive than starting with it.

### 17.2 Rate Limiting Design Detail

Implement rate limiting using a token-bucket or sliding-window approach backed by Redis, with limits defined at multiple granularities simultaneously: per-user, per-department, and system-wide, since different abuse or overload scenarios are only visible at different granularities. Return clear, structured rate-limit information in response headers (remaining quota, reset time) so that legitimate clients can behave cooperatively rather than retrying blindly.

### 17.3 Idempotency and Deduplication

Because the same content might legitimately be submitted more than once (a user re-submitting after a network hiccup, or genuinely re-analyzing the same file), support request deduplication keyed on the content hash within a short time window — returning the previously computed decision rather than re-running the full pipeline — both as a performance optimization and to ensure consistent decisions for identical content submitted close together in time.

### 17.4 Webhook and Integration Support

For deeper enterprise integration beyond the dashboard UI, consider supporting outbound webhooks for significant events (a critical-risk block, specifically) so that the event can be forwarded into the organization's existing security information and event management (SIEM) tooling or alerting system (Slack, email, PagerDuty) rather than requiring security staff to actively monitor the EAISG dashboard to notice a critical event.

### 17.5 Error Response Design

Design a consistent, structured error response format across every endpoint (an error code, a human-readable message safe for end-user display, and an internal reference identifier that support/security staff can use to look up the full details server-side) — this both improves the frontend's ability to handle errors gracefully and reinforces the security principle that internal details should never leak through error messages.

---

## 18. Phase 15 — Response Analyzer

### 18.1 Beyond Secrets, PII, and Insecure-Advice Patterns

Extend response analysis to also check for: **hallucinated but confidently-stated sensitive-seeming claims** (the AI inventing what looks like a real internal policy, credential format, or dataset — not sensitive in the traditional sense, but potentially harmful if acted on as if it were real organizational fact, and worth at least flagging with a lower-severity "unverified claim" warning); and **policy-violating content generation** (the AI response itself containing content the organization has separately decided is inappropriate to generate at all, distinct from the response merely leaking pre-existing sensitive data).

### 18.2 Response Analysis Latency Trade-off

Explicitly acknowledge and design around the latency trade-off this introduces: analyzing the AI's response before returning it to the user necessarily adds to perceived response time. Mitigate this where possible by streaming the response to the user as it's generated while analysis runs concurrently on the streaming buffer, only interrupting the stream if a genuinely critical finding is detected mid-stream, rather than always waiting for the complete response before beginning analysis — while accepting that this streaming-analysis approach is meaningfully more complex to implement correctly than analyzing a complete response, and may be a reasonable phase-two optimization rather than an MVP requirement.

---

## 19. Phase 16 — Audit System and Compliance Mapping

### 19.1 Immutability

Audit log entries, once written, should never be updatable or deletable through the normal application data path — enforce this at the database level where possible (restricted update/delete permissions on the audit table for the application's regular database role, with any legitimate deletion, such as a retention-policy-driven purge, requiring a separate, explicitly privileged and itself-audited process) rather than relying solely on application-level discipline.

### 19.2 Correlation and Traceability

Every audit entry should carry enough correlated identifiers (request ID, user ID, and where relevant a policy ID or model version ID) that a security analyst can start from any single audit entry and reconstruct the complete chain of what happened — which detectors ran, what they found, what the aggregate score was, which policy fired, and what action resulted — without needing to separately cross-reference multiple systems by hand.

### 19.3 Compliance Mapping

Explicitly map EAISG's audit and data-handling capabilities against relevant frameworks the organization may need to demonstrate compliance with — this is documentation work, not new engineering, but it's high-value documentation. For a framework such as **GDPR**, map how the data-minimization principle (storing hashes and classifications rather than raw content) and the ability to honor erasure requests (Section 5.1) satisfy relevant articles. For **SOC 2**, map the audit logging, access control, and change-management (policy versioning) capabilities against the relevant trust service criteria. For industry-specific frameworks the deploying organization may care about (HIPAA if healthcare data is in scope, PCI-DSS if payment card data is in scope), explicitly note which categories of detection (PII, financial) are relevant and, just as importantly, explicitly note where EAISG's current scope does *not* fully satisfy a given framework's requirements on its own, consistent with the Phase 0 principle of stating limitations plainly rather than overclaiming compliance coverage.

### 19.4 Data Residency

For organizations with data residency requirements (data must remain within a specific geographic region), document explicitly where each component of the pipeline processes data — self-hosted components (Presidio, ClamAV, the ML classifier) keep data entirely within the organization's own infrastructure, while calls to an external LLM provider necessarily involve data leaving that boundary, which is precisely why the provider-adapter routing design (Phase 13) supporting a local-model option matters for organizations with strict residency constraints.

---

## 20. Phase 17 — Governance Dashboard (Deep, Page-by-Page)

### 20.1 Overview Page

Presents, at a glance: total requests processed within a selectable time window; counts broken down by decision (allowed, warned, sanitized, blocked); a risk-level distribution; and a time-series trend chart showing risk volume over the selected window, with the ability to spot sudden spikes that might indicate either a genuine emerging incident or a new source of false positives worth investigating. Include a small "attention needed" panel surfacing the handful of most recent critical-risk events specifically, since these are the events most likely to need immediate human attention and shouldn't require navigating away from the overview to discover.

### 20.2 Requests Page

A filterable, sortable, paginated table — filterable by user, department, destination, risk level, decision, and date range — where selecting any individual row opens a detail view showing the complete finding breakdown for that request, exactly which policy rule (if any) determined the outcome, and the full audit trail associated with it. Support exporting the current filtered view (as CSV, for instance) for offline analysis or reporting to stakeholders who don't need direct dashboard access.

### 20.3 Findings Page

A category-centric view, complementary to the request-centric Requests page — showing, across the selected time window, the relative frequency of each finding category, trends over time per category, and the ability to drill from a category into the specific requests that contributed to it. This view is what helps a security team answer "what's actually driving our risk right now" at an organizational level, distinct from investigating any single incident.

### 20.4 Policies Page

A policy list with enabled/disabled status and priority order visible at a glance, a structured (not raw-JSON) condition builder for creating and editing policies that mirrors the policy engine's underlying condition grammar, the conflict-detection warnings described in Phase 11.1 surfaced directly in this editing interface, the simulation capability described in Phase 11.2 accessible before saving a change, and a version history view per policy supporting rollback.

### 20.5 Users Page

Surfaces department- and user-level risk aggregates (never raw content) to help identify where additional training or review might be valuable — deliberately framed around identifying patterns worth addressing constructively (a department that could benefit from clearer guidance about an approved internal AI destination, for example) rather than framed punitively, consistent with the personas described in Section 0.1, where the goal is keeping well-meaning users within the governed system rather than driving them to work around it.

### 20.6 Settings Page

Administrative configuration not better suited to the Policies page specifically: AI destination catalog management (adding/editing/disabling destinations and their trust tiers), risk-weight and threshold configuration (Phase 10) with the sensitivity-analysis context available inline so an administrator changing a weight can see its historical effect before committing to the change, and user/role management.

### 20.7 Accessibility and Internationalization

The dashboard, as an internal tool used daily by security and compliance staff, should meet reasonable accessibility standards (keyboard navigability, sufficient color contrast, screen-reader-compatible chart alternatives such as accompanying data tables) rather than treating accessibility as optional for an "internal" tool — and if the organization operates across multiple languages, the dashboard's own UI text should be structured for translation from the start even if only one language is shipped initially.

---

## 21. Human-in-the-Loop Workflows

### 21.1 The Review Queue

For requests that land in an ambiguous middle ground — not clearly safe enough to auto-allow, not clearly severe enough to auto-block under current policy — introduce an explicit **APPROVAL** decision outcome (already anticipated in the decision-type list) that routes the request into a review queue rather than resolving it fully automatically. A designated reviewer (a manager, or a security analyst depending on policy configuration) can then approve or deny the specific request, optionally with a time-bounded SLA after which an unreviewed request either defaults to a safe fallback action or is escalated further.

### 21.2 Appeals and Override Workflow

When a request is blocked and the submitting user believes this was incorrect (a false positive), provide a lightweight in-product path to flag the decision for review, rather than requiring an out-of-band conversation with IT or security. Every such appeal should itself be tracked, and a pattern of frequent appeals against the same policy or detector is a strong, direct signal that the underlying rule or model needs tuning — this appeals data becomes a valuable feedback loop into both the ML retraining process (Section 11.5) and the risk-weight sensitivity analysis (Section 13.3).

### 21.3 Escalation and Notification

Define explicit escalation rules for the highest-severity events — a critical-risk block involving a live credential, for example, may warrant an immediate notification to the security team (via the webhook mechanism described in Section 17.4) rather than waiting to be discovered on the next dashboard review, distinguishing time-sensitive events that need active notification from routine events that are adequately handled by passive dashboard visibility.

---

## 22. Phase 18 — Testing Strategy (Deep)

### 22.1 Test Pyramid Discipline

Maintain a deliberate balance rather than over-investing in any single layer: a large base of fast, isolated unit tests covering individual detectors and pure logic (the risk aggregation formula, the policy condition evaluator); a smaller set of integration tests covering multi-component flows (upload through to decision); and a still smaller set of true end-to-end tests covering full user journeys through the actual API and, ideally, the actual frontend. Resist the common failure mode of writing mostly end-to-end tests because they feel more "real" — they are slow, brittle, and expensive to maintain relative to the confidence they provide per test.

### 22.2 Load Testing

Beyond correctness testing, run explicit load tests simulating realistic and above-realistic concurrent request volume against the full pipeline, specifically to validate the latency budgets and capacity assumptions defined in Phase 19, and to surface bottlenecks (a specific detector, the database connection pool, the ML inference service) before they're discovered in production under real load.

### 22.3 Adversarial and Red-Team Testing

Beyond the specific prompt-injection test cases already described, run a deliberate, time-boxed red-team exercise late in development where team members (or, ideally, someone not deeply involved in building the detection logic, to avoid blind spots) actively try to construct content that evades detection — splitting sensitive content across multiple smaller requests, using synonyms and paraphrasing to evade keyword matching, embedding sensitive content inside seemingly innocuous file formats, and combinations of these techniques. Document every successful evasion found, along with whether and how it was subsequently addressed — this red-team log becomes valuable both as engineering input and as material for the research write-up's limitations section.

### 22.4 Chaos and Failure-Mode Testing

Deliberately test the system's behavior when individual dependencies are unavailable or degraded — the ML service down, the LLM provider timing out, the malware scanner unreachable, the database under heavy load — verifying in each case that the documented fail-open/fail-closed behavior (Phase 21) actually occurs as designed, rather than assuming the failure-handling code paths work correctly just because they exist and were written with good intentions.

### 22.5 Regression Testing for Policy and Model Changes

Every time a risk weight, a policy, or the ML model itself is changed, re-run the full evaluation dataset (Phase 20) against the updated system and compare results to the previous version — catching unintended regressions (a policy tuned to fix one false positive that inadvertently introduces a false negative elsewhere) before the change reaches production, rather than relying on ad hoc spot-checking of a change's effects.

---

## 23. Phase 19 — Performance, Capacity Planning, and Service-Level Objectives

### 23.1 Defining Explicit SLOs

Rather than treating performance as something to optimize open-endedly, define concrete target service-level objectives early and measure against them throughout development: for example, a target that the deterministic-detection-only path (no file, no LLM reasoning needed) completes within a defined latency budget for the large majority of requests, a separate, more generous budget for file-processing-involving requests, and an explicit acknowledgment that requests routing through LLM reasoning will have a meaningfully higher and more variable latency, with its own separate, wider target.

### 23.2 Capacity Planning

Estimate expected request volume (peak concurrent users, requests per user per day, expected file-upload frequency and average file size) based on the target organization's actual size and AI usage patterns, and size infrastructure (database connection pool limits, background worker count, ML inference service instance count) against that estimate with explicit headroom for growth, rather than sizing infrastructure reactively only after performance problems are observed in production.

### 23.3 Caching Strategy Detail

Beyond simple identical-request-hash caching, consider caching at additional layers: caching the ML classifier's output for identical or near-identical text spans (useful when the same boilerplate content appears across many different requests, such as a common email signature or disclaimer); and caching resolved policy evaluation results for a given combination of risk findings and context, since policy evaluation, while typically fast, still involves repeated database or in-memory lookups that benefit from caching when the same combination recurs frequently.

---

## 24. Phase 20 — Research Evaluation (Deep)

### 24.1 Structuring the Evaluation as a Small Research Study

Approach this phase with the same rigor as a small empirical research paper, since that framing produces a stronger evaluation than treating it as an afterthought: a clearly stated research question (does a multi-layered, policy-governed multi-agent architecture measurably outperform simpler baselines on both accuracy and explainability for enterprise AI-interaction risk classification, and at what latency/cost trade-off); a clearly described methodology (dataset, splits, baselines, metrics); results presented with appropriate statistical context (not just point estimates — where feasible, report confidence intervals or at minimum multiple evaluation runs to characterize variance, particularly for any component involving LLM-based non-determinism); and an honest limitations section.

### 24.2 Ablation Studies

Beyond comparing the full ladder of baselines against the full system, run ablations *within* the full EAISG system itself — measuring performance with individual components removed or disabled (the system without the LLM-reasoning confidence gate, always using deterministic-plus-ML only; the system without the ML classifier, deterministic-plus-LLM only; the system with a single unified "everything agent" instead of the narrow specialized agents) to isolate exactly which architectural decisions are contributing measurable value versus which are more valuable for other reasons (explainability, maintainability) than raw accuracy.

### 24.3 Error Analysis

Beyond aggregate metrics, conduct a qualitative error analysis on a sample of the system's mistakes (both false positives and false negatives) from the test set — categorizing *why* each error occurred (an edge case in phrasing, a genuinely ambiguous example where reasonable humans might disagree, a gap in the training data's coverage of a particular scenario, a bug rather than a genuine model limitation) — since this qualitative analysis is often what a reviewer or grader finds most convincing evidence of genuine understanding of the system's behavior, more so than the headline metrics alone.

### 24.4 Human Evaluation of Explainability

Design a small, structured human evaluation rather than an informal one: recruit a handful of reviewers (ideally with at least some relevant background, though this can be relaxed for an academic project), have them review a shared set of blocked/flagged requests under two conditions — EAISG's full explanation (categories, confidence, triggering policy) versus a bare allow/block-only baseline — and have them rate, on a defined scale, how confident they'd feel acting on each explanation without further investigation. Report both the quantitative rating difference and representative qualitative feedback.

### 24.5 Threats to Validity

Explicitly discuss, in the written evaluation, the limitations of the evaluation itself: the synthetic portion of the dataset may not perfectly represent real-world request distributions; the evaluation dataset's size may limit statistical power for detecting smaller performance differences between baselines; and human evaluators for the explainability study, if drawn from the project team or a small convenience sample, may not perfectly represent an independent security analyst's judgment. Naming these limitations explicitly is a mark of rigor, not a weakness in the write-up.

---

## 25. Phase 21 — Deployment, Reliability, and Disaster Recovery

### 25.1 High Availability Considerations

For a production-grade deployment beyond the local Docker Compose development setup, plan for redundancy at each layer that could otherwise become a single point of failure: multiple backend API instances behind a load balancer; a managed or replicated PostgreSQL instance with automated failover; a Redis instance configured for persistence and, ideally, replication, given its role in both caching and background job coordination; and multiple instances of the ML inference service, particularly since it's likely to be the most computationally expensive and therefore most failure-prone-under-load component.

### 25.2 Disaster Recovery Plan

Beyond routine backups (Section 5.5), define and document an actual disaster recovery plan: a target recovery time objective (how long the system can reasonably be down before it materially impacts the organization) and recovery point objective (how much data loss, measured in time, is acceptable in the worst case), and a concrete runbook for restoring service from backups in the event of a catastrophic failure — and, as with backups themselves, this plan should be tested through an actual drill at least once rather than existing only as an untested document.

### 25.3 Rolling Deployments and Rollback

Design the deployment process to support zero- or near-zero-downtime rolling updates, and — critically — a fast, reliable rollback path if a new deployment introduces a regression, particularly given that a regression in this specific system could mean either a spike in false positives that damages user trust, or worse, a spike in false negatives that represents an actual security gap opening up. Given the security-critical nature of the system, consider a canary or staged rollout approach for significant changes (a new ML model version, a significant policy engine change) — deploying to a small percentage of traffic first and monitoring key metrics before a full rollout.

### 25.4 Secrets Rotation

Beyond simply keeping secrets out of source code (Section 25.5 of the prior version, restated here), define an actual rotation cadence and process for the secrets the system itself depends on (the JWT signing secret, database credentials, AI provider API keys) — an un-rotated secret that was ever exposed even once, even years ago, remains a standing risk indefinitely if never rotated.

### 25.5 Operational Runbooks

Produce short, practical runbooks for the most likely operational scenarios a real on-call engineer would face: what to do when the malware scanning service is down, what to do when the ML inference service is returning errors, what to do when a specific policy is suspected of misfiring and needs to be temporarily disabled, and how to manually re-process a request that failed midway through the pipeline. These runbooks turn tribal knowledge into something any team member can act on under pressure, rather than depending on whoever originally built that specific component being available at 2 a.m.

---

## 26. Security-of-the-Security-System (Meta-Security)

A system whose entire purpose is enforcing security controls must itself be held to at least as high a security standard as the systems it protects — this deserves explicit, dedicated attention rather than being assumed to follow automatically from generally good engineering practice.

**The gateway itself is a high-value target.** An attacker who compromises EAISG doesn't just gain access to one system — they gain the ability to silently approve their own exfiltration attempts by manipulating policy, or to gain broad visibility into what the organization considers sensitive by reading the findings/audit data. This motivates treating EAISG's own infrastructure with elevated security controls relative to a typical internal tool: stricter access control on who can modify policies or deploy changes, mandatory code review for any change touching the policy engine or risk aggregation logic, and monitoring specifically for anomalous administrative activity against EAISG itself (an admin account suddenly disabling several policies in quick succession, for example, should itself trigger an alert).

**The training data and model artifacts are sensitive assets.** The dataset used to train the ML classifier, by its very nature, contains examples of what sensitive enterprise content looks like — even if drawn substantially from public and synthetic sources, any real examples incorporated during later refinement need the same handling discipline as any other sensitive enterprise data, including access control on the dataset storage location itself.

**Dependency and supply-chain risk.** Given the number of open-source libraries this system depends on (Presidio, PyMuPDF, python-docx, scikit-learn, Transformers, LangGraph, and many more), maintain active dependency vulnerability scanning (already included in the CI pipeline) as an ongoing discipline, not a one-time setup step — a vulnerability disclosed in any of these libraries after initial development needs a defined process for prompt patching, not discovery only during the next unrelated deployment.

---

## 27. Cost Model

Even for an academic or early-stage project, sketching a rough cost model is valuable both for practical planning and as evidence of production-mindedness in a final write-up. Costs fall into several categories worth estimating separately: **compute infrastructure** (database, Redis, backend API, and — typically the largest single line item — ML inference hosting, especially if GPU-backed for the transformer model); **LLM provider usage costs**, which scale directly with how often the confidence-gated reasoning step actually triggers (this is precisely why Section 12.3's cost-budgeting discipline matters financially, not just architecturally); **storage costs**, which should remain modest given the deliberate data-minimization design (hashes and classifications are far cheaper to store at scale than raw documents would be); and **operational/labor cost**, which is often the largest true cost of running a system like this in practice but is easy to omit from a purely technical cost model — reviewing flagged requests, tuning policies, and responding to appeals all require ongoing human time from security and compliance staff. Presenting even a rough breakdown across these categories, and explicitly noting where the layered architecture (deterministic detection handling the bulk of traffic cheaply, ML handling a smaller share, LLM reasoning reserved for a small minority of genuinely ambiguous cases) is a direct cost-optimization decision and not just a latency one, strengthens the project's practical credibility.

---

## 28. Team Structure and RACI

Beyond the simple ownership table from the earlier version of this document, a RACI-style breakdown (Responsible, Accountable, Consulted, Informed) clarifies decision rights for cross-cutting concerns that don't belong to a single owner: for a decision like "what should the default risk weight for a credential finding be," the ML/dataset owner might be Responsible for proposing a data-driven answer, the whole team Accountable together (since this affects every downstream component), the security/file-processing owner Consulted (since they best understand the credential detector's real-world false-positive rate), and the dashboard owner simply Informed (since they need to know but aren't driving the decision). Establishing this pattern for the handful of genuinely cross-cutting decisions (risk weights, policy defaults, the scope document itself) prevents both decision paralysis and undocumented unilateral changes.

---

## 29. Milestones (Expanded)

Each milestone from the previous version now additionally carries an explicit **exit criteria** — the specific, checkable condition that must be true before the milestone is considered genuinely complete, not just "mostly working":

- **M1 — Foundation.** Exit criteria: a fresh clone of the repository, following only the README, can be brought up successfully via Docker Compose by someone who did not write the original setup.
- **M2 — Authentication.** Exit criteria: an automated test suite covers successful login, failed login, expired-token rejection, and at least one role-based access denial.
- **M3 — Prompt Scanning.** Exit criteria: the three demo scenarios involving prompt-only input (Section 32) all produce the expected result reliably across repeated runs.
- **M4 — File Scanning.** Exit criteria: all five core file formats (PDF, DOCX, XLSX, image, ZIP) have passing extraction tests, and the malware-scan-rejection path is verified with an actual test file (e.g., the EICAR test signature).
- **M5 — Machine Learning.** Exit criteria: the comparison table (Section 11.1) has real, recorded numbers for at least the rule-based and classical-ML rungs of the ladder, computed against a dataset that has completed the human-verification pass.
- **M6 — LangGraph.** Exit criteria: the parallel-execution graph is confirmed (via timing) to actually run agents concurrently, and the confidence-gating conditional edge is covered by a dedicated test.
- **M7 — Policy Engine.** Exit criteria: the five representative starter policies produce the correct decision against a corresponding set of test requests, and the conflict-detection check (Section 14.1) is functioning.
- **M8 — AI Integration.** Exit criteria: at least two distinct provider adapters are implemented and the router demonstrably sends different content categories to different providers in a test scenario.
- **M9 — Dashboard.** Exit criteria: every page listed in Section 20 is functional against real backend data, not placeholder/mock data.
- **M10 — Research Evaluation.** Exit criteria: the full metric suite, the ablation results, and the human explainability evaluation are all completed and written up, with limitations explicitly discussed.

---

## 30. 16-Week Schedule (Day-Level Detail for the First Four Weeks, Weekly Thereafter)

**Week 1 — Requirements and Threat Model.** Day 1–2: stakeholder/persona definition and initial threat brainstorm. Day 3–4: formalize the threat catalog and attack trees. Day 5: write and finalize `docs/SCOPE.md`.

**Week 2 — Architecture and Repository.** Day 1: finalize the tech stack decisions and write the corresponding ADRs. Day 2–3: scaffold the repository structure and Docker Compose skeleton. Day 4–5: get the backend and frontend skeletons running with a working health-check endpoint reachable from the frontend.

**Week 3 — Database and Authentication.** Day 1–2: implement and migrate the core schema. Day 3–4: implement login, JWT issuance, and the RBAC dependency. Day 5: write the authentication test suite.

**Week 4 — Prompt Gateway.** Day 1–2: implement the normalized request representation and the `/analyze` endpoint skeleton. Day 3–4: wire in Presidio and the secret detector. Day 5: verify the M3 exit criteria end-to-end.

**Weeks 5–16:** proceed per the phase-by-phase plan above, following the same weekly focus areas as the prior version of this document (PII/secret tuning; file processing; dataset creation; classical ML baseline; transformer model; LangGraph; risk and policy engine; AI routing and response validation; dashboard; integration and security testing; research experiments; optimization, documentation, and final demo), with each week's work measured explicitly against that phase's exit criteria from Section 29 rather than treated as complete once the code merely runs without error.

---

## 31. Recommended Build Order

Unchanged in substance: the plain FastAPI prompt-analysis flow first, proven fully working before file processing is added, before the ML classifier is added, before LangGraph is added, before the policy engine is added, before AI routing is added, before response analysis is added, before the dashboard is built. Each new layer sits on a foundation already independently verified to work, which is what keeps a project of this scope debuggable by a small team on a sixteen-week timeline.

---

## 32. Target Demonstration Scenarios (Expanded)

Beyond the four core scenarios already described (harmless prompt / allow; PII spreadsheet / block; source code with embedded secret / block; same salary file blocked on public AI but allowed on internal HR AI), a stronger final demonstration adds: a **sanitization scenario**, showing a prompt containing a name and email address being automatically redacted and successfully forwarded rather than outright blocked, to demonstrate the system's middle path; an **appeal scenario**, showing a user flagging a decision they believe is a false positive and a reviewer resolving it through the review queue described in Section 21; and a **resilience scenario**, showing the system continuing to make a reasonable, safe decision (falling back to deterministic-plus-ML) when the LLM provider is deliberately made unavailable during the demo, directly illustrating the fail-closed design philosophy in action rather than only describing it.

---

## 33. Glossary of Terms

**Deterministic detector** — a rule-based or pattern-matching component (regex, Presidio) whose output is fully explainable and reproducible given the same input, as opposed to a probabilistic model.

**Finding** — a single structured output from any detector or agent, indicating a detected category, confidence, and severity for a specific piece of content.

**Risk aggregation** — the process of combining multiple findings into a single overall risk score and level for a request.

**Policy** — an administrator-defined, structured rule mapping a combination of conditions (findings, destination, department, role) to a decision.

**Decision** — the final resolved outcome for a request: allow, warn, sanitize, redirect, require approval, or block.

**Confidence gating** — the design pattern in the LangGraph layer where an expensive LLM-reasoning step is invoked only when deterministic and ML findings are insufficiently confident on their own.

**Fail-closed** — a failure-handling posture where, when a component is unavailable or a result is uncertain, the system defaults to the more restrictive/safe outcome rather than the more permissive one.

**Sanitization** — automatically redacting or replacing sensitive spans of content so that a request can proceed with reduced risk rather than being blocked outright.

**Model card** — a standardized document describing a trained model's purpose, training data, measured performance, and known limitations.

**Ablation study** — an evaluation technique that measures a system's performance with individual components selectively removed, to isolate each component's actual contribution.

---

## 34. Guiding Architectural Principle (Restated, Unchanged, and Non-Negotiable)

Regardless of how much additional depth and nuance this document adds across every phase, the single principle that must survive all of it unchanged is this: EAISG must never become "an LLM that decides everything." Deterministic detection provides fast, explainable coverage for well-understood patterns. The ML classifier provides semantic understanding rules alone cannot achieve. LLM-based reasoning is reserved specifically for genuinely ambiguous cases, invoked deliberately and budgeted carefully, never as the default judge of every request. LangGraph orchestrates all of this into a single, inspectable, testable flow. The policy engine — transparent, configurable, and owned by the organization rather than implicit in a model's behavior — makes the actual enterprise decision. Every phase of added detail in this document exists in service of that one architecture, not as a replacement for it. Any deviation from this principle, however well-intentioned in the moment, should be treated as significant enough to require explicit discussion and a dated entry in `learn.md` explaining why it happened.
