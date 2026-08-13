# EAISG Security Scope and Threat Model

## 1. Overall Security Posture
EAISG operates on a principle of defense-in-depth and fail-closed-by-default for high-risk paths, while remaining human-reviewable for medium-risk paths. The system assumes that employees are generally well-meaning but occasionally careless, while acknowledging that malicious insiders and compromised accounts require structural safeguards. By layering deterministic detectors, ML classifiers, and explicit policy evaluation, EAISG ensures no single component unilaterally allows risky content, and every decision is fully auditable.

## 2. Threat Catalog
*   **Careless Exposure:** Employees inadvertently pasting PII, secrets, or confidential data into AI prompts.
*   **Deadline Evasion:** Employees knowingly bypassing policies due to perceived friction.
*   **Curiosity Testing:** Employees probing the system's boundaries to see what gets caught.
*   **Insider Exfiltration:** Deliberate attempts to leak data using obfuscation, splitting, or prompt injection.
*   **External Compromise:** Attackers using compromised accounts to exfiltrate data (requires anomaly detection/rate limiting).
*   **Credential Leakage via Indirect Reference:** Asking the AI to "use the API key in my last message" or referencing stored secrets.
*   **Cross-Request Correlation (Salami Slicing):** Reconstructing sensitive data via multiple small requests over time.
*   **Template Laundering:** Stripping identifying details from a document while leaving the sensitive substance intact.
*   **AI-Assisted Social Engineering:** Using AI to generate phishing or manipulative content.
*   **Shadow AI Usage:** Employees using ungoverned external AI tools (an acknowledged limitation, not a mitigatable threat).
*   **Policy Misconfiguration:** Overly permissive rules silently defeating the gateway.

## 3. Attack-Tree Analysis: Top Threats

### Goal: Exfiltrate a working production credential through an AI interaction
*   **Method 1:** Paste it directly into a prompt.
    *   *Mitigation:* Caught by deterministic secret detector (Regex/Entropy).
*   **Method 2:** Embed it in a larger code file.
    *   *Mitigation:* Caught by file processor + deterministic secret detector.
*   **Method 3:** Obfuscate with encoding or whitespace tricks.
    *   *Mitigation:* Addressed by ML classifier and (if ambiguous) LLM reasoning.
*   **Method 4:** Split across multiple requests.
    *   *Mitigation:* Cross-request context tracking / rate-limiting (Future phase).
*   **Method 5:** Indirect reference ("retrieve key from X").
    *   *Residual Risk:* Acknowledged gap in current design; difficult to detect without full external context.

### Goal: Exfiltrate proprietary source code
*   **Method 1:** Paste raw files.
    *   *Mitigation:* Caught by extension and syntax heuristics.
*   **Method 2:** Paste logic snippets via natural language.
    *   *Mitigation:* Tiered confidence approach; medium-confidence code triggers secondary scanning.
*   **Method 3:** Disguise file format (e.g., .txt extension).
    *   *Mitigation:* MIME type verification and content extraction analysis.

## 4. Explicit Non-Goals
*   **Detecting non-AI exfiltration:** EAISG does not monitor email, USB, or cloud storage.
*   **Providing legal advice:** The system enforces configured policy; it does not interpret laws (e.g., GDPR, HIPAA).
*   **Guaranteeing zero false negatives:** No detection system is perfect; overpromising undermines credibility.
*   **Replacing existing enterprise security:** EAISG is an AI-interaction-specific layer, not a replacement for endpoint security, IAM, or network firewalls.
