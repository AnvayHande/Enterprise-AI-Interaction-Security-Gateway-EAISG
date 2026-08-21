# EAISG — Enterprise AI Interaction Security Gateway

## 1. The Core Problem
Companies need to control what information employees send to AI and what AI sends back. This applies not just to public tools like ChatGPT, but also to internal/private models (e.g., HR can only send salary data to the HR AI). The project is focused on **AI interaction governance**, acting as an "airport security checkpoint" for enterprise AI usage.

## 2. The Solution: EAISG
EAISG sits between the Employee and the Approved AI.

```text
Employee -> EAISG -> Approved AI
```

### 3. Comprehensive Interaction Inspection
An interaction is not just a text prompt; it can contain files (PDF, DOCX, XLSX, PPTX, Images, ZIP, Source Code). EAISG analyzes both the prompt and the accompanying files, as the prompt might be harmless while the file contains confidential data.

## 4. Interaction Flow
For the MVP, a controlled EAISG Web Application serves as the interface. Future enterprise deployments will support managed endpoints via proxies.

```text
Employee -> EAISG Web App -> Prompt + File -> Security Analysis -> Approved AI
```

## 5. Input Processing
Inputs are separated and processed accordingly:
- **Prompt**
- **File**: Different parsers handle specific formats (e.g., PyMuPDF for PDFs, python-docx for DOCX, openpyxl for XLSX, OCR for Images). Everything is normalized for the security engine.

## 6. The Security Engine
The engine scans for:
- **Personal Information (PII)**: Names, emails, phones, IDs.
- **Credentials**: API keys, passwords, tokens.
- **Source Code**: Proprietary logic, internal APIs.
- **Financial Information**: Salaries, revenue, bank data.
- **Legal Information**: Contracts, NDAs.
- **Other**: Company secrets, customer databases.

## 7. Hybrid Architecture
The system does not rely on a single LLM. It uses a hybrid approach:
1. **Rules/Tools**: Fast, explainable detection (e.g., Presidio, regex, YARA) for PII and secrets.
2. **Machine Learning**: Semantic classification (e.g., DistilBERT, DeBERTa) to understand context (e.g., recognizing "compensation structure").
3. **LLMs (LangGraph)**: Multi-agent orchestration for complex reasoning.

## 8. LangGraph Orchestrator
LangGraph acts as a supervisor coordinating specialized agents:
- PII Agent
- Code Agent
- Financial Agent
- Legal Agent
- Compliance Agent
- Malware Agent

## 9. Policy Engine
Decisions are context-aware, evaluating:
`Who is the user? + What is the data? + How risky is it? + Where is it going? + Company Policy`

Example: HR Manager sending Salary Data to HR AI = ALLOW. HR Manager sending Salary Data to Public AI = BLOCK/REDIRECT.

## 10. Final Decisions
EAISG can take multiple actions:
- **Allow**: Send to AI.
- **Warn**: Moderate risk, requires user confirmation.
- **Sanitize**: Redact sensitive info before sending.
- **Redirect**: Route from a public AI to an approved internal AI.
- **Require Approval**: Admin review needed.
- **Block**: Stop the interaction.

## 11. AI Routing
EAISG acts as an AI traffic controller, routing requests to the most appropriate AI (Coding AI, Legal AI, HR AI, etc.) based on content.

## 12. Bi-directional Inspection (Response Analyzer)
EAISG inspects the AI's response before returning it to the user to prevent the AI from generating problematic content (e.g., insecure coding advice, accidental internal credential leakage).

## 13. Summary Lifecycle
The complete flow encompasses Prompt/File processing -> Rules/ML/Tools detection -> LangGraph Supervisor & Agents -> Risk Aggregation -> Policy Engine decision -> AI Routing -> AI execution -> Response Analysis -> Audit Logging & Dashboard presentation.
