# Dataset Sources

This document tracks the origins and licensing of datasets used for training and evaluating the ML classifiers in EAISG.

## Baseline Synthetic Dataset (`v1_dataset.json`)

**Origin:** 
Programmatically generated via `scripts/generate_dataset.py` for the initial MVP. Contains a mix of hardcoded safe prompts, financial terminology, legal terminology, simulated PII, and source code heuristics. 

**License:**
Internal / MIT (generated specifically for this project).

**Description:**
This dataset is designed to provide a small but balanced set of examples for the Classical ML Baseline (TF-IDF + Logistic Regression). It acts as a proof-of-concept for the ML pipeline rather than a production-ready model dataset.

### Label Taxonomy (v1)
- `SAFE`: Harmless, benign queries or content.
- `FINANCIAL`: Mentions of EBITDA, earnings, wire transfers, etc.
- `LEGAL`: NDAs, lawsuits, settlements.
- `PII`: Simulated names, SSNs, phone numbers.
- `SOURCE_CODE`: Python, Java, JavaScript snippets.
- `CREDENTIALS`: API keys, tokens.
