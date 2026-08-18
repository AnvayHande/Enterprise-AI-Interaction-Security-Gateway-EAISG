from locust import HttpUser, task, between
import json

class EAISGUser(HttpUser):
    # Simulates a user waiting 1 to 5 seconds between tasks
    wait_time = between(1, 5)
    
    # We'll need a valid token to test authenticated routes.
    # For a real load test, you'd fetch this in on_start or disable auth for load test environments.
    headers = {"Content-Type": "application/json"}

    @task(3)
    def analyze_prompt(self):
        """Simulate users sending prompts for analysis"""
        payload = {
            "user_id": 1,
            "destination_id": 1,
            "content": "Can you summarize the meeting notes for Q3?"
        }
        self.client.post("/api/v1/analyze/prompt", json=payload, headers=self.headers)

    @task(1)
    def view_dashboard(self):
        """Simulate admins viewing the dashboard overview"""
        self.client.get("/api/v1/dashboard/overview", headers=self.headers)

    @task(1)
    def view_findings(self):
        """Simulate admins viewing the findings page"""
        self.client.get("/api/v1/dashboard/findings", headers=self.headers)
