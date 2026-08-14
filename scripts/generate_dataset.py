import json
import os
import random

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'v1_dataset.json')

# Basic synthetic examples for the MVP dataset
DATA = [
    # SAFE
    {"text": "Could you help me summarize this public article?", "label": "SAFE"},
    {"text": "What is the capital of France?", "label": "SAFE"},
    {"text": "Write a polite email to my team about the upcoming holiday.", "label": "SAFE"},
    {"text": "How do I center a div in CSS?", "label": "SAFE"},
    {"text": "Can you recommend some good sci-fi books?", "label": "SAFE"},
    {"text": "Translate 'hello' to Spanish.", "label": "SAFE"},
    {"text": "Explain quantum computing like I'm five.", "label": "SAFE"},
    {"text": "Draft a generic marketing copy for a new shoe launch.", "label": "SAFE"},
    {"text": "What are the health benefits of eating apples?", "label": "SAFE"},
    {"text": "Generate a list of 10 random words.", "label": "SAFE"},

    # FINANCIAL
    {"text": "Our Q3 EBITDA is down by 4%, please draft an explanation for the board.", "label": "FINANCIAL"},
    {"text": "Attached is the cash flow statement and balance sheet for last quarter.", "label": "FINANCIAL"},
    {"text": "Please initiate a wire transfer of $50,000 to routing number 123456789.", "label": "FINANCIAL"},
    {"text": "The profit margin on the new product line is extremely tight.", "label": "FINANCIAL"},
    {"text": "Summarize the proposed M&A strategy with our competitor.", "label": "FINANCIAL"},

    # LEGAL
    {"text": "This document is highly confidential and subject to NDA.", "label": "LEGAL"},
    {"text": "We are facing a lawsuit from a former employee, draft a response.", "label": "LEGAL"},
    {"text": "Review this settlement agreement for any loopholes.", "label": "LEGAL"},
    {"text": "The patent pending technology must not be disclosed.", "label": "LEGAL"},
    {"text": "This communication is privileged and confidential attorney-client work product.", "label": "LEGAL"},

    # PII
    {"text": "My phone number is 555-0198, call me.", "label": "PII"},
    {"text": "John Doe lives at 123 Main St, Springfield.", "label": "PII"},
    {"text": "Her social security number is 000-11-2222.", "label": "PII"},
    {"text": "Email alice.smith@example.com for more information.", "label": "PII"},
    {"text": "Patient DOB is 01/15/1980.", "label": "PII"},

    # SOURCE_CODE
    {"text": "def calculate_sum(a, b):\n    return a + b\nprint(calculate_sum(2,3))", "label": "SOURCE_CODE"},
    {"text": "import os\nfrom sys import argv\nclass MyScript:\n    pass", "label": "SOURCE_CODE"},
    {"text": "const x = 10;\nfunction doSomething() {\n console.log(x);\n}", "label": "SOURCE_CODE"},
    {"text": "public class HelloWorld { public static void main(String[] args) { System.out.println(\"Hi\"); } }", "label": "SOURCE_CODE"},
    {"text": "var data = [1, 2, 3]; data.forEach(d => console.log(d));", "label": "SOURCE_CODE"},

    # CREDENTIALS
    {"text": "Here is the access key: AKIAIOSFODNN7EXAMPLE", "label": "CREDENTIALS"},
    {"text": "Use this bearer token for auth: Bearer eyJhbGciOiJIUzI1NiIsInR5c...", "label": "CREDENTIALS"},
    {"text": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----", "label": "CREDENTIALS"},
    {"text": "github token ghP_1234567890abcdef1234567890abcdef1234", "label": "CREDENTIALS"},
    {"text": "slack integration token fake-slack-token-1234567890-abcdef", "label": "CREDENTIALS"}
]

# We will generate a slightly larger dataset by adding noise or slightly changing sentences
expanded_data = []

def augment(example):
    variations = [
        example["text"],
        f"Please analyze this: {example['text']}",
        f"{example['text']}. What do you think?",
        f"Can you summarize: {example['text']}",
        f"For my next task, {example['text']}"
    ]
    return [{"text": v, "label": example["label"]} for v in variations]

for item in DATA:
    expanded_data.extend(augment(item))

random.seed(42)
random.shuffle(expanded_data)

if __name__ == "__main__":
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    with open(DATASET_PATH, 'w') as f:
        json.dump(expanded_data, f, indent=2)
    print(f"Generated {len(expanded_data)} examples at {DATASET_PATH}")
