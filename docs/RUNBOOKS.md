# Operational Runbooks

## 1. Malware Scanning Service Down

**Symptoms:**
- Requests containing file uploads fail with `503 Service Unavailable`.
- Logs show `ConnectionError: Unable to reach ClamAV service`.

**Immediate Mitigation:**
1. Check if the ClamAV container is running: `docker ps | grep clamav`
2. If down, restart the service: `docker-compose -f docker-compose.prod.yml restart clamav`
3. If the service is repeatedly crashing due to out-of-memory (OOM) errors, increase the memory limit in `docker-compose.prod.yml`. ClamAV requires at least 2GB of RAM.

**Fail-Closed Behavior:**
By default, the system fails CLOSED for malware scanning. If ClamAV is unavailable, all file uploads are rejected. To temporarily fail-open (NOT RECOMMENDED), update the environment variable `FAIL_OPEN_ON_SCANNER_DOWN=True`.

## 2. ML Inference Service Timeout

**Symptoms:**
- High latency on API requests containing large text payloads.
- Logs show `TimeoutError` in the ML classifier agent.

**Immediate Mitigation:**
1. Scale up the ML inference workers: `docker-compose -f docker-compose.prod.yml up -d --scale ml_worker=3`
2. Check GPU/CPU utilization on the host.
3. If requests must go through quickly, rely on deterministic rules temporarily by setting `BYPASS_ML_CLASSIFIER=True`.

## 3. Temporary Policy Disable

**Symptoms:**
- A legitimate business workflow is being blocked en masse (false positive spike).

**Immediate Mitigation:**
1. Navigate to the Governance Dashboard -> Policies.
2. Identify the misfiring policy rule.
3. Toggle the rule from `Active` to `Disabled` or change the action from `BLOCK` to `WARN`.
4. Ensure a Jira ticket is created to refine the deterministic detector or ML threshold for this policy before re-enabling.

## 4. Failed Request Reprocessing

**Symptoms:**
- Requests stuck in `PROCESSING` state due to transient background worker failure.

**Immediate Mitigation:**
1. Run the reprocessing script: `python scripts/reprocess_failed.py --hours 24`
2. This will re-queue tasks into Celery.
