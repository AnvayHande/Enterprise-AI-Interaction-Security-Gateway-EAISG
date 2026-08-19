# EAISG Performance, Capacity Planning, and Service-Level Objectives

This document outlines the performance expectations, sizing guidelines, and caching strategies for the Enterprise AI-Interaction Security Gateway (EAISG) to ensure stable, high-performance operation in a production environment.

## 1. Service-Level Objectives (SLOs)

We define our latency and availability targets explicitly, recognizing that requests requiring Large Language Model (LLM) reasoning will inherently take longer than deterministic evaluation.

### Availability Target
*   **API Uptime:** 99.9% (excluding planned maintenance).
*   **Fail-Open Target:** In the event of a catastrophic backend failure (e.g., Database or primary ML service unreachable), the proxy must default to its fail-open/fail-closed behavior within **500ms** to prevent cascading downstream timeouts.

### Latency Targets (95th Percentile)
1.  **Deterministic Fast Path (Regex/Presidio only):** `< 200ms`
    *   Applies to simple text prompts that clearly violate or pass policies without requiring ML/LLM escalation.
2.  **ML Evaluation Path:** `< 800ms`
    *   Applies to text prompts escalated to the local ML baseline classifier.
3.  **File Processing Path:** `< 2.5s`
    *   Applies to standard document uploads (PDF, DOCX) under 5MB.
4.  **LLM Reasoning Path (LangGraph):** `< 8s`
    *   Applies to ambiguous prompts falling in the risk score "gray area" (0.4 - 0.8), requiring external AI agent reasoning.

---

## 2. Capacity Planning

Estimates are based on a theoretical target organization of 5,000 employees actively using AI tools, averaging 10 prompts per user per day.

### Traffic Estimates
*   **Daily Requests:** ~50,000 requests/day.
*   **Average TPS (Transactions Per Second):** ~1.5 TPS during peak business hours.
*   **Peak Burst TPS:** ~15 TPS.

### Infrastructure Sizing
To handle peak loads with 2x headroom (30 TPS), the following baseline architecture is recommended:

| Component | Minimum Sizing | Scaling Metric |
| :--- | :--- | :--- |
| **FastAPI Backend Workers** | 4 instances (e.g., 2vCPU, 4GB RAM) | CPU Utilization (>60%) |
| **PostgreSQL Database** | 1 Primary + 1 Read Replica (4vCPU, 16GB RAM) | Connection Pool saturation (Max 200) |
| **ML Inference Service** | 2 instances (GPU-accelerated if possible) | Inference Queue length |
| **Redis Cache** | 1 instance (2GB RAM) | Memory Eviction Rate |

*   **Database Connections:** The SQLAlchemy pool size should be tuned to `pool_size=20`, `max_overflow=10` per worker instance to stay well within the database's 200 max connection limit.

---

## 3. Caching Strategy Detail

EAISG employs a multi-tiered caching strategy to minimize latency and reduce unnecessary computational/API costs.

### Tier 1: Request Deduplication
Identical requests (matching the `raw_content_hash`) made by the same user within a 5-minute window are short-circuited immediately. The previous findings and decisions are returned directly from the database.

### Tier 2: Component-Level Caching (`core.cache`)
For sub-components that are computationally expensive but highly deterministic, we utilize a TTL-based cache (currently in-memory, transitioning to Redis for multi-instance deployments).

*   **ML Classifier Outputs (`@cached("ml_classifier")`):** Identical text spans evaluated by the ML model are cached to avoid redundant CPU/GPU inference.
*   **Policy Evaluation (`@cached("policy_eval")`):** Calculating the final action for a specific `(findings, risk_score, user)` tuple is cached. The cache key generator explicitly serializes SQLAlchemy objects (like the `User` object) using their primary key to ensure high cache hit rates without memory address collisions.
