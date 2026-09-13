def get_finding_explanation(category: str) -> str:
    """
    Returns a conversational explanation for why a specific data category 
    should not be shared with external AI providers.
    """
    explanations = {
        # PII
        "PII_UK_NHS": "Your NHS number is highly sensitive medical data. Sharing it can lead to identity theft and unauthorized access to your health records.",
        "PII_PHONE_NUMBER": "Sharing phone numbers can expose you to unwanted tracking, spam, or social engineering attacks.",
        "PII_DATE_TIME": "While seemingly harmless, dates or specific timeframes can be combined with other data to re-identify you.",
        "PII_US_BANK_NUMBER": "Bank account details can be directly used for financial fraud and unauthorized transactions.",
        "PII_US_DRIVER_LICENSE": "A driver's license number is a primary form of identification and highly valuable for identity theft.",
        "PII_EMAIL_ADDRESS": "Email addresses can be targeted for phishing campaigns or used to link your identity across different services.",
        "PII_PERSON": "Sharing personal names can compromise privacy, especially when associated with sensitive contexts.",
        
        # Secrets
        "SECRET_AWS_KEY": "AWS keys provide direct access to our cloud infrastructure. Exposing them can result in massive financial loss and severe data breaches.",
        "SECRET_API_KEY": "API keys act as passwords for services. If leaked, malicious actors can incur charges or access sensitive data on our behalf.",
        "SECRET_PASSWORD": "Hardcoded passwords are a critical security vulnerability. Never share credentials with external AI systems.",
        
        # Source Code
        "SOURCE_CODE": "Proprietary source code is intellectual property. Sharing it can expose internal logic, vulnerabilities, or trade secrets.",
        
        # Financial / Legal
        "FINANCIAL_CREDIT_CARD": "Credit card numbers can be immediately exploited for financial fraud.",
        "LEGAL_CONTRACT": "Legal contracts often contain confidential clauses and details that must remain internal.",
        
        # Default/Fallback
        "UNKNOWN": "This information was flagged by our security policies as potentially sensitive and risky to share with third parties."
    }
    
    # Try exact match, otherwise try prefix matching
    if category in explanations:
        return explanations[category]
        
    for key, text in explanations.items():
        if category.startswith(key):
            return text
            
    return explanations["UNKNOWN"]
