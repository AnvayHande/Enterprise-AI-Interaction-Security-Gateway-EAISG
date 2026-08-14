# Model Card: EAISG Classical ML Baseline

## Model Details
- **Architecture:** TF-IDF Vectorizer + Logistic Regression.
- **Library:** scikit-learn.
- **Objective:** Classify enterprise data risk into one of several categories (`SAFE`, `FINANCIAL`, `LEGAL`, `PII`, `SOURCE_CODE`, `CREDENTIALS`).
- **Version:** 1.0 (MVP)

## Intended Use
This model is intended to be used as one signal within the broader EAISG detection pipeline. It provides a semantic fallback for catching data that might evade the strict pattern-matching of the deterministic layer.

## Training Data
- **Dataset:** `datasets/v1_dataset.json` (Synthetic data).
- **Size:** ~175 examples.
- **Distribution:** Stratified across the 6 categories.

## Evaluation
- Evaluated on a 20% held-out test split.
- **Metrics (v1 MVP):** Due to the small synthetic dataset size, current precision and recall are artificially high (near 1.0 for most classes). 
- *A real-world evaluation dataset is required to establish true baseline performance.*

## Limitations
- **Context Length:** TF-IDF loses word order entirely, making it unable to capture complex semantic meaning or nuanced phrasing where order matters.
- **Overfitting Risk:** Given the tiny dataset size for the MVP, the model is highly likely to overfit to the specific vocabulary used in the synthetic generation.
- **Zero-Shot/OOD:** Cannot generalize to new categories or heavily obfuscated data.

## Recommendations for Phase 8 (v2)
- Replace this baseline with a Transformer model (e.g., DistilBERT) for true semantic understanding once a larger dataset is collected.
