# `policy_engine/` Module

Responsibility: Applying configured enterprise rules to findings.
Inputs: Extracted findings, risk scores, user metadata, current policy.
Outputs: Final action (ALLOW, BLOCK, WARN).
Explicitly DOES NOT DO: Generating the findings itself.
