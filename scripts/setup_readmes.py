import os

readmes = {
    "frontend": "Responsibility: UI and Governance Dashboard.\nInputs: User interactions, API data from backend.\nOutputs: Rendered views, API requests.\nExplicitly DOES NOT DO: Data persistence, detection logic, or policy evaluation.",
    "backend": "Responsibility: Core API Gateway, authentication, routing, and request validation.\nInputs: HTTP requests (prompts, files).\nOutputs: HTTP responses, tasks to Celery/Redis.\nExplicitly DOES NOT DO: Actual ML inference, complex agent logic.",
    "ai_engine": "Responsibility: The security decision engine coordinating deterministic, ML, and agent layers.\nInputs: Normalized requests.\nOutputs: Risk scores, findings, decisions.\nExplicitly DOES NOT DO: HTTP request handling, database migrations.",
    "agents": "Responsibility: LangGraph orchestration for complex LLM reasoning.\nInputs: Ambiguous requests requiring contextual analysis.\nOutputs: Extracted context, specialized reasoning decisions.\nExplicitly DOES NOT DO: Fast deterministic matching, raw file parsing.",
    "file_processor": "Responsibility: Parsing, extracting, and OCRing various file formats.\nInputs: Raw files (PDF, DOCX, ZIP, etc.).\nOutputs: Clean extracted text, format metadata, malware scan results.\nExplicitly DOES NOT DO: Semantic security analysis of the extracted text.",
    "ml": "Responsibility: Model training, evaluation, and transformer inference.\nInputs: Datasets (for training), text (for inference).\nOutputs: Model weights, classification labels, confidence scores.\nExplicitly DOES NOT DO: Making the final policy decision.",
    "policy_engine": "Responsibility: Applying configured enterprise rules to findings.\nInputs: Extracted findings, risk scores, user metadata, current policy.\nOutputs: Final action (ALLOW, BLOCK, WARN).\nExplicitly DOES NOT DO: Generating the findings itself.",
    "database": "Responsibility: Persistence layer (PostgreSQL, SQLAlchemy).\nInputs: ORM objects, queries.\nOutputs: Database records.\nExplicitly DOES NOT DO: Caching, background job queuing.",
    "security": "Responsibility: Auth, JWT verification, encryption utilities.\nInputs: Credentials, tokens, sensitive strings.\nOutputs: Auth context, encrypted/decrypted strings.\nExplicitly DOES NOT DO: Threat detection on user prompts.",
    "tests": "Responsibility: Unit, integration, and E2E testing framework.\nInputs: Source code.\nOutputs: Test results, coverage reports.\nExplicitly DOES NOT DO: Production deployment tasks.",
    "datasets": "Responsibility: Storage and versioning of training and evaluation data.\nInputs: Raw collected data, synthetic data.\nOutputs: Versioned splits for ML training.\nExplicitly DOES NOT DO: Data processing logic.",
    "docker": "Responsibility: Containerization definitions and compose files.\nInputs: Dockerfiles.\nOutputs: Runnable containers.\nExplicitly DOES NOT DO: Application logic."
}

for folder, content in readmes.items():
    path = os.path.join("c:/Users/hemant hande/OneDrive/Desktop/EAISG", folder, "README.md")
    with open(path, "w") as f:
        f.write(f"# `{folder}/` Module\n\n{content}\n")

print("Module READMEs generated.")
