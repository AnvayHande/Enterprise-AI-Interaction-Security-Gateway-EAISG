# EAISG Phase 20: Research Evaluation & Ablation Study
**Dataset Size:** 100 requests

| Configuration | Precision | Recall | F1 Score | Accuracy | Avg Latency (ms) |
|---------------|-----------|--------|----------|----------|------------------|
| `deterministic_only` | 1.0 | 0.6667 | 0.8 | 0.8 | 1.65ms |
| `ml_only` | 0.0 | 0.0 | 0.0 | 0.4 | 15.48ms |
| `full_system` | 1.0 | 1.0 | 1.0 | 1.0 | 25.49ms |