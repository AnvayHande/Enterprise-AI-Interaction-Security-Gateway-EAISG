# `database/` Module

Responsibility: Persistence layer (PostgreSQL, SQLAlchemy).
Inputs: ORM objects, queries.
Outputs: Database records.
Explicitly DOES NOT DO: Caching, background job queuing.
