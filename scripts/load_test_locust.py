from locust import HttpUser, task, between
import os

API_KEY = os.getenv('LOCUST_API_KEY', 'test-key')

class TFXUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def public_user(self):
        self.client.get("/api/public/user/user-1", headers={"x-api-key": API_KEY})

    @task
    def public_reputation(self):
        self.client.get("/api/public/reputation/user-1", headers={"x-api-key": API_KEY})
