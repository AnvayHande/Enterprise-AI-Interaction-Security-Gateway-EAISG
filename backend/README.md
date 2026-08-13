# `backend/` Module

Responsibility: Core API Gateway, authentication, routing, and request validation.
Inputs: HTTP requests (prompts, files).
Outputs: HTTP responses, tasks to Celery/Redis.
Explicitly DOES NOT DO: Actual ML inference, complex agent logic.
