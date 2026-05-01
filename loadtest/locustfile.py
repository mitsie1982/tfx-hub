from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def list_tasks(self):
        self.client.get("/api/tasks?organisationId=org-123", headers={"X-API-Key": "REPLACE_WITH_KEY"})

    @task
    def webhook(self):
        self.client.post("/api/webhooks", json={"event": "test"}, headers={"X-API-Key": "REPLACE_WITH_KEY"})
