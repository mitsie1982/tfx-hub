// services/backend/test/omnichannel_smoke.test.js
// Basic smoke tests for omnichannel endpoints (requires test runner like jest or mocha)

const request = require('supertest');
const express = require('express');
const omnichannel = require('../src/omnichannel_fallback');

const app = express();
app.use(express.json());
app.use('/api/omnichannel', omnichannel);

describe('Omnichannel smoke', () => {
  test('notify-member returns 200 for valid payload', async () => {
    const res = await request(app).post('/api/omnichannel/notify-member').send({ memberId: 'm1', channel: 'email', contact: 'test@example.com', taskId: 't1' });
    expect([200,201,204]).toContain(res.statusCode);
  });
});
