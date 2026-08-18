# Milestones, Schedule, and Build Order

## Build Order Strategy
The golden rule of EAISG is to **build the MVP first**, proving the core deterministic pipeline works end-to-end before adding intelligence. The build order reflects this:
1. API plumbing and basic file extraction.
2. Deterministic rules (Regex, Presidio).
3. The ML Classifier.
4. The LangGraph Multi-Agent reasoning layer.
5. Governance Dashboard.

## Expanded Milestones & Exit Criteria

### Milestone 1: The Transparent Proxy (Weeks 1-3)
- **Goal:** Pass API requests through EAISG to Anthropic/OpenAI without any detection.
- **Exit Criteria:** Users can authenticate via EAISG and receive a valid LLM response. The request and response are correctly logged to the PostgreSQL database with zero latency overhead.

### Milestone 2: Deterministic Enforcement (Weeks 4-7)
- **Goal:** Introduce basic PII and Secrets detection.
- **Exit Criteria:** A request containing a hardcoded credit card or AWS key is successfully blocked, and the reason is logged accurately. The system falls back cleanly if regex scanning fails.

### Milestone 3: Intelligent Classification (Weeks 8-11)
- **Goal:** Integrate the DeBERTa ML classifier for context-aware risk scoring.
- **Exit Criteria:** The ML model runs via an asynchronous celery worker and correctly tags "ambiguous" PII that deterministic rules missed. False-positive rates on internal HR files drop by 30%.

### Milestone 4: Multi-Agent Orchestration (Weeks 12-14)
- **Goal:** Integrate LangGraph for complex edge cases.
- **Exit Criteria:** The LLM reasoning agent is only invoked when both ML and Deterministic paths are marked as "Low Confidence". The agent successfully overrides a false positive.

### Milestone 5: Governance & Rollout (Weeks 15-16)
- **Goal:** Dashboard completion and load testing.
- **Exit Criteria:** InfoSec teams can view audit logs and toggle policies from the React Dashboard. Load testing proves the gateway can handle 1,000 requests/minute.

## 16-Week Schedule Summary
- **Phase 0-3:** Planning, Database, Auth (Weeks 1-2)
- **Phase 4-7:** Prompt Analyzer, Deterministic Layer, File Pipelines (Weeks 3-6)
- **Phase 8-11:** ML Model, LangGraph Agents, Risk Aggregation, Policies (Weeks 7-11)
- **Phase 12-16:** Sanitization, Provider Routing, Audit System (Weeks 12-14)
- **Phase 17-21:** Governance Dashboard, Testing, Deployment/DR (Weeks 15-16)
