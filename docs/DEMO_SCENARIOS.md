# Target Demonstration Scenarios

This document outlines the structured demonstration paths used to validate EAISG's capabilities to stakeholders and auditors.

## Scenario 1: The Harmless Prompt (Allow)
- **Actor:** Employee drafting an email.
- **Payload:** "Help me rephrase this email to be more professional: 'I think the new project timeline is too tight and we might miss the deadline.'"
- **Expected Outcome:** `ALLOW`. Deterministic and ML layers immediately score the risk near 0. Latency is < 50ms. The prompt is forwarded to the AI provider unchanged.

## Scenario 2: PII Spreadsheet Upload (Block)
- **Actor:** HR Manager summarizing feedback.
- **Payload:** A .xlsx file upload containing names, employee IDs, and salary bands.
- **Expected Outcome:** `BLOCK`. File extraction pipeline (Celery) parses the spreadsheet. Presidio deterministic detector flags multiple high-confidence PII entities. Policy engine triggers a mandatory block.

## Scenario 3: Proprietary Source Code (Block)
- **Actor:** Software Engineer debugging.
- **Payload:** A code snippet containing a hardcoded AWS Access Key.
- **Expected Outcome:** `BLOCK`. Custom regex/secret detector flags the credential with 100% confidence. Policy engine immediately halts the request.

## Scenario 4: Contextual Routing (Allow Internal, Block Public)
- **Actor:** HR Manager using an internal model.
- **Payload:** The same .xlsx file from Scenario 2.
- **Expected Outcome:** `ALLOW`. The policy engine evaluates the destination (`internal-hr-copilot` vs `public-chatgpt`) and matches an exception policy granting HR role access to internal models for PII processing.

## Scenario 5: Sanitization (Modify)
- **Actor:** Marketing Employee.
- **Payload:** "Write a bio for our new CEO, John Doe (johndoe@enterprise.com)."
- **Expected Outcome:** `SANITIZE`. Deterministic detection catches the name and email. The policy enforces PII scrubbing for public chatbots. The gateway modifies the payload to "Write a bio for our new CEO, [PERSON] ([EMAIL])" and forwards it.

## Scenario 6: The Appeal Workflow
- **Actor:** Software Engineer.
- **Payload:** A snippet of mock test data containing fake API keys.
- **Expected Outcome:** `BLOCK`, followed by an `APPEAL`. The user is blocked but submits an appeal asserting the keys are synthetic test data. A Security Analyst reviews the request in the Governance Dashboard, approves it, and the user's workflow is unblocked.

## Scenario 7: System Resilience (Fail-Closed)
- **Actor:** Any user.
- **Payload:** A highly ambiguous, obfuscated prompt designed to bypass keyword rules.
- **Expected Outcome:** The LLM Provider used for the LangGraph Reasoning Agent is deliberately taken offline for the demo. The ML classifier marks the request as "Medium Confidence." Because the reasoning agent is unreachable, the system falls back to `BLOCK` (Fail-Closed), demonstrating that the gateway will not default to `ALLOW` when uncertain or degraded.
