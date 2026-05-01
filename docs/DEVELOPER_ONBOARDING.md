Developer Onboarding and API Key Lifecycle

1. Register an application via POST /developer/register with name and owner email.
2. Receive API key securely (displayed once). Store it in your secrets store.
3. Use API key in header X-API-Key for authenticated requests.
4. Rotate keys via POST /developer/{appId}/rotate. Old keys are invalidated immediately.
5. Revoke keys by removing the app or contacting support.
