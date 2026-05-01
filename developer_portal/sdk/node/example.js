// developer_portal/sdk/node/example.js
const TfxHubClient = require('./index');
(async () => {
  const client = new TfxHubClient({ baseUrl: 'http://localhost:3000', apiKey: 'REPLACE_WITH_KEY' });
  const tasks = await client.listTasks('org-123');
  console.log('Tasks:', tasks);
})();
