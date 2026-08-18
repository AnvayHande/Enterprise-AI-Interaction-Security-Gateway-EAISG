# Team Structure and RACI

Clear accountability is critical for cross-cutting security features. When a false positive occurs or a policy is tuned, there must be no ambiguity about who owns the resolution.

## Team Breakdown

1. **Security Engineering (Backend & ML)**
   - Owns the core `ai_engine`, LangGraph layer, and the ML Classifier.
   - Responsible for detector precision/recall tuning.
2. **Platform Engineering**
   - Owns the `docker/`, `scripts/`, CI/CD, and database layers.
   - Responsible for scaling the infrastructure and ensuring 99.9% uptime.
3. **Frontend & Product**
   - Owns the `frontend/` Dashboard and API routing.
   - Responsible for making the audit logs and policy configurations usable for analysts.

## RACI Matrix

**R**esponsible (Does the work) | **A**ccountable (Signs off) | **C**onsulted (Has input) | **I**nformed (Notified)

| Decision / Task | Security Eng | Platform Eng | Frontend / Product | InfoSec Leadership |
| :--- | :--- | :--- | :--- | :--- |
| **Tuning ML Risk Weights** | R, A | I | C | I |
| **Updating Global Policies** | C | I | R | A |
| **Database Schema Changes** | I | R, A | C | I |
| **Handling an Appeal Request** | C | I | R | A |
| **Deploying to Production** | C | R, A | C | I |
| **Adding a New AI Provider** | R | C | C | A |
