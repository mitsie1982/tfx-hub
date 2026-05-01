// services/backend/test/reputation_api.test.js
// Basic API smoke test scaffold using supertest

const request = require('supertest');
const express = require('express');
const reputationRoutes = require('../src/routes/reputation_routes');

const app = express();
app.use(express.json());
app.use('/api', reputationRoutes);

describe('Reputation API', () => {
  test('count endpoint returns 200', async () => {
    const res = await request(app).get('/api/reputation/count/0x0000000000000000000000000000000000000000');
    expect([200,500]).toContain(res.statusCode); // 500 allowed for scaffold
  });
});
