import requests
import json

base_url = "http://127.0.0.1:8000/api/v1"

print("1. Logging in as admin...")
auth_response = requests.post(
    f"{base_url}/auth/login",
    data={"username": "admin", "password": "admin"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)

if not auth_response.ok:
    print("Failed to login:", auth_response.text)
    exit(1)

token = auth_response.json()["access_token"]
print("Successfully logged in and got token.\n")

print("2. Sending highly sensitive prompt to the Gateway...")
prompt_payload = {
  "prompt": "Can you summarize this document? My secret AWS key is AKIA1234567890ABCDEF and my SSN is 840-02-1234.",
  "destination_id": 1
}

analyze_response = requests.post(
    f"{base_url}/analyze/prompt",
    json=prompt_payload,
    headers={"Authorization": f"Bearer {token}"}
)

if not analyze_response.ok:
    print("Failed to analyze prompt:", analyze_response.text)
    exit(1)

print("\n--- GATEWAY RESPONSE ---")
print(json.dumps(analyze_response.json(), indent=2))
print("------------------------\n")
print("Check your dashboard at http://localhost:5173/ to see this request logged!")
