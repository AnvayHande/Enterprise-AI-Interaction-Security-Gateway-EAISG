import json
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'v1_dataset.json')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'baseline_model.joblib')

def train():
    print(f"Loading dataset from {DATASET_PATH}...")
    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)
        
    X = [item['text'] for item in data]
    y = [item['label'] for item in data]
    
    # Stratified split to ensure we have examples of each class in test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"Training on {len(X_train)} examples, testing on {len(X_test)}...")
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
        ('clf', LogisticRegression(class_weight='balanced', random_state=42, max_iter=1000))
    ])
    
    pipeline.fit(X_train, y_train)
    
    print("\n--- Evaluation on Test Set ---")
    y_pred = pipeline.predict(X_test)
    print(classification_report(y_test, y_pred))
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

if __name__ == '__main__':
    train()
