# EAISG Cost Model

The layered architecture of EAISG is specifically designed to balance security efficacy with cost efficiency. Rather than running every request through an expensive LLM to judge its safety, EAISG cascades through increasingly expensive detection layers.

## 1. Compute Infrastructure (Fixed & Scaling Cost)
- **Database (PostgreSQL) & Redis:** Standard managed instances. Fixed monthly cost based on instance size (approx. $100-$300/month for a mid-sized enterprise).
- **Backend API & Workers:** Standard compute nodes (ECS, EKS, or EC2). Scales horizontally with request volume.
- **ML Inference Hosting:** The highest infrastructure cost. Hosting a fine-tuned DeBERTa/DistilBERT model requires memory-optimized or small GPU instances. Cost varies from $150-$500/month depending on traffic and instance type.

## 2. LLM Provider Usage (Variable Cost)
- **LangGraph Reasoning Agent:** Because the deterministic rules (Presidio/Regex) and the ML classifier catch 90-95% of traffic cheaply, the LLM reasoning step is only invoked for ambiguous or high-risk cases ("Confidence Gating").
- Assuming an average enterprise volume of 50,000 AI interactions/day:
  - 45,000 requests are handled by deterministic/ML layers (Cost: $0 API usage).
  - 5,000 requests are routed to Anthropic/OpenAI for reasoning.
  - At an average of $0.005 per reasoning transaction, the monthly API cost is roughly $750/month.
- **Architectural win:** If all 50k requests were sent to the LLM, the API cost would be $7,500/month. The tiered architecture yields a 90% cost reduction.

## 3. Storage Costs
- EAISG practices aggressive data minimization. Raw payloads are discarded after processing. Only request metadata, findings (JSON), and hashes are stored. Storage costs are negligible (<$20/month).

## 4. Operational & Human Cost
- The Dashboard, Audit Logs, and Human-in-the-Loop workflows reduce the manual review burden for Security Analysts. The cost of labor is optimized by ensuring false-positive appeals are handled asynchronously via the UI rather than ad-hoc ticketing systems.
