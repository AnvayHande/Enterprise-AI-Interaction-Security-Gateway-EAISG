# Enterprise AI Interaction Security Gateway (EAISG)

EAISG is a multi-agent framework designed to secure enterprise AI interactions by sitting between users and AI models, functioning similarly to an AI-specific Web Application Firewall or DLP system.

## Project Structure

*   **`frontend/`**: React + Vite UI for the Governance Dashboard.
*   **`backend/`**: FastAPI backend for Gateway & API.
*   **`ai_engine/`**: Core deterministic and ML-based detection logic.
*   **`agents/`**: LangGraph multi-agent orchestration.
*   **`file_processor/`**: File parsing, OCR, and extraction pipeline.
*   **`ml/`**: Model training, evaluation, and transformer management.
*   **`policy_engine/`**: Rule evaluation and decision making.
*   **`database/`**: PostgreSQL and SQLAlchemy models & migrations.
*   **`security/`**: Authentication, JWTs, and encryption helpers.
*   **`tests/`**: Unit, integration, and end-to-end tests.
*   **`datasets/`**: Data for training and evaluating ML models.
*   **`scripts/`**: Utility scripts for deployment and maintenance.
*   **`docs/`**: Project documentation and Architecture Decision Records (ADRs).
*   **`docker/`**: Container configurations for local dev and prod.

See `implementation.md` for the full build plan and `learn.md` for the running journal.
