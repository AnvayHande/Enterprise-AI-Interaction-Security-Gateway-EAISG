# Compliance Mapping and Data Residency

Enterprise AI Interaction Security Gateway (EAISG) is designed to operate securely within heavily regulated environments. This document maps the technical controls built into EAISG against standard compliance frameworks and outlines data residency characteristics.

## 1. Compliance Framework Mapping

### 1.1 SOC 2 (System and Organization Controls)

EAISG provides several capabilities that directly support SOC 2 Trust Services Criteria, particularly around **Security** and **Confidentiality**.

*   **Access Control (CC6.1, CC6.3):** 
    *   **Implementation:** Role-Based Access Control (RBAC) ensures that only authorized administrators can modify routing rules or policy engine configurations. All endpoints are secured via JWT authentication.
*   **Audit and Accountability (CC7.2):** 
    *   **Implementation:** Strict audit logging is enforced at the ORM layer. Any decision made by the gateway (ALLOW, BLOCK, SANITIZE) generates an immutable `AuditLog` entry. SQLAlchemy events prevent the modification or deletion of these logs by the application.
    *   **Traceability:** Each audit entry explicitly correlates the `request_id`, `user_id`, and exact findings, allowing security teams to reconstruct the entire decision pipeline.
*   **Change Management (CC8.1):** 
    *   **Implementation:** The Policy Engine prevents conflicting policies from being deployed and supports explicit versioning, ensuring that all changes to security controls are tracked, safe, and easily rolled back.

### 1.2 GDPR (General Data Protection Regulation)

EAISG acts as a crucial control layer for organizations processing EU citizen data, assisting in compliance with key GDPR principles.

*   **Data Minimization (Article 5(1)(c)):** 
    *   **Implementation:** EAISG strictly adheres to data minimization. Raw prompt text and file contents are **never** stored in the database. Instead, the system computes and stores a cryptographic hash (`raw_content_hash`) of the input, along with the classification findings.
*   **Right to Erasure / Right to be Forgotten (Article 17):** 
    *   **Implementation:** Because the raw text is not persisted, fulfilling an erasure request does not require scrubbing the gateway's audit logs for stray PII. The logs only contain metadata (e.g., "Request ID X contained PII") without the sensitive data itself.
*   **Security of Processing (Article 32):** 
    *   **Implementation:** The proactive DLP (Data Loss Prevention) capabilities—such as the deterministic `PresidioPIIDetector` and inline redaction via the `Sanitizer`—ensure that sensitive personal data is blocked or scrubbed before leaving the organizational boundary.

---

## 2. Data Residency

Data residency requirements mandate that certain data types remain within specific geographic or organizational boundaries. EAISG's hybrid architecture is designed to support strict data residency constraints.

### 2.1 Internal (On-Premises / Within VPC) Processing
The following components process data entirely within the organization's own infrastructure. No data is transmitted to external servers during these steps:
*   **Deterministic Detectors:** Presidio (PII), Regex (Secrets), Source Code, and Financial/Legal heuristics all run locally.
*   **File Processing Pipeline:** ClamAV malware scanning, text extraction (PDF, DOCX, XLSX), and validation are fully self-hosted.
*   **Classical ML Classifier:** The TF-IDF + Logistic Regression model is trained and runs inference locally within the gateway memory.
*   **Database and Audit Logs:** PostgreSQL persists all state, policies, and audit trails within the local VPC.

### 2.2 External Processing Boundary
Data *leaves* the organizational boundary only during the following specific operations:
*   **LLM Reasoning Agent (Graph Orchestrator):** If a request falls into an ambiguous risk score range (0.4 to 0.8), the LangGraph reasoning agent may invoke an external LLM (e.g., OpenAI API) to evaluate context.
*   **AI Destination Routing:** If a request is ALLOWED or SANITIZED, the gateway routes the prompt/file to the user's requested external AI provider (e.g., Anthropic, OpenAI).

### 2.3 Managing Residency Risk
To mitigate external processing risks for organizations with strict residency requirements, EAISG's **Routing Manager** supports:
1.  **Trust-Tier Routing:** Administrators can configure destinations with a `trust_level` (e.g., `INTERNAL`, `PUBLIC`). Highly sensitive departments (e.g., HR, Legal) can be governed by policies that strictly restrict their traffic to `INTERNAL` AI destinations only (such as locally hosted vLLM or Ollama instances).
2.  **Sanitization Enforcement:** PII and credentials can be irreversibly redacted before the content is allowed to cross the external boundary.
