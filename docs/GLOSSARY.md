# Glossary of Terms & Guiding Principles

## Glossary

- **Deterministic detector** — a rule-based or pattern-matching component (regex, Presidio) whose output is fully explainable and reproducible given the same input, as opposed to a probabilistic model.
- **Finding** — a single structured output from any detector or agent, indicating a detected category, confidence, and severity for a specific piece of content.
- **Risk aggregation** — the process of combining multiple findings into a single overall risk score and level for a request.
- **Policy** — an administrator-defined, structured rule mapping a combination of conditions (findings, destination, department, role) to a decision.
- **Decision** — the final resolved outcome for a request: allow, warn, sanitize, redirect, require approval, or block.
- **Confidence gating** — the design pattern in the LangGraph layer where an expensive LLM-reasoning step is invoked only when deterministic and ML findings are insufficiently confident on their own.
- **Fail-closed** — a failure-handling posture where, when a component is unavailable or a result is uncertain, the system defaults to the more restrictive/safe outcome rather than the more permissive one.

## Guiding Architectural Principle
**"No Single Point of Judgment."**

No single detector, ML model, or reasoning agent should have unilateral authority to allow a request through or block it in isolation. 

The policy engine — a transparent, configurable, non-ML component — always makes the final call. It is informed by the findings and risk scores from the deterministic layers, the ML layer, and the LLM agent, but is never overridden by any individual detection component. This ensures that a bug in an ML classifier or a prompt injection against the reasoning agent cannot blindly bypass the organization's explicit security rules.
