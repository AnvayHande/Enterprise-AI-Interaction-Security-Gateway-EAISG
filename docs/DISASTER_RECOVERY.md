# Disaster Recovery and Business Continuity Plan

## Recovery Time Objective (RTO)
**Target:** 4 Hours
The maximum acceptable downtime for the EAISG platform. If EAISG is down, fail-closed configurations will block all outbound AI interactions, severely impacting business productivity.

## Recovery Point Objective (RPO)
**Target:** 1 Hour
The maximum acceptable data loss (audit logs and policies).

## Backup Strategy
- **Database:** Full logical backup (`pg_dump`) taken daily. Incremental WAL archiving enabled in PostgreSQL for point-in-time recovery up to the last 5 minutes.
- **Secrets/Config:** Stored in a secure KMS/Vault. Configuration files are version controlled in the main repository.

## Disaster Recovery Runbook

### Scenario A: Complete Database Loss
1. Provision a new PostgreSQL instance.
2. Retrieve the latest nightly `pg_dump` from secure storage.
3. Restore the schema and data: `pg_restore -U postgres -d eaisg latest_backup.dump`
4. Apply WAL logs for point-in-time recovery if available.
5. Restart the backend services to re-establish connection pools.

### Scenario B: Cluster/Host Failure
1. Ensure the traffic is routed away from the failed zone in the load balancer.
2. Spin up a new host environment.
3. Deploy infrastructure via Docker Compose or Kubernetes manifests:
   `docker-compose -f docker-compose.prod.yml up -d`
4. Verify the new nodes connect to the external managed database.

### Scenario C: Compromised JWT Secret
1. Immediately generate a new JWT signing secret.
2. Update the environment variables in the production vault.
3. Force a rolling restart of all backend nodes to pick up the new secret.
4. **Note:** All existing user sessions will be invalidated. Users will need to log in again.
