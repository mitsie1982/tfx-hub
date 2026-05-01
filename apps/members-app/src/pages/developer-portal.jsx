import React from 'react';

export default function DeveloperPortal() {
  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 24 }}>
      <h2>TFX Hub Developer Portal</h2>
      <p>Welcome to the TFX Hub API Developer Portal!</p>
      <ol>
        <li>Request your API key below.</li>
        <li>Review the <a href="/api/openapi.yaml" target="_blank" rel="noopener noreferrer">OpenAPI spec</a> and <a href="/api/publicApiDocs.md" target="_blank" rel="noopener noreferrer">API docs</a>.</li>
        <li>Download the <a href="/api/postman_collection.json" target="_blank" rel="noopener noreferrer">Postman collection</a> for quick testing.</li>
        <li>Generate SDKs with <code>generate_sdk.sh</code>.</li>
      </ol>
      <h3>API Key Self-Service</h3>
      <form method="POST" action="/api/request-api-key">
        <label>Email: <input type="email" name="email" required /></label>
        <button type="submit">Request API Key</button>
      </form>
      <h3>Support</h3>
      <ul>
        <li>Contact support for help, rate limit increases, or feature requests.</li>
        <li>Join our developer Slack/Teams for community and updates.</li>
      </ul>
    </div>
  );
}
