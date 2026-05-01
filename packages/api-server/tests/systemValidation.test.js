// System Validation: End-to-end functional completeness tests
const request = require('supertest');
const { createApp } = require('../src/createApp');
const { createMemoryRepository } = require('../src/memoryRepository');
const { getAdminSigner } = require('../src/adminBlockchainAuth');
const { ethers } = require('ethers');

describe('System Validation (E2E)', () => {
  let app, repository;
  beforeAll(async () => {
    repository = createMemoryRepository();
    await repository.initialize({ seedDemoData: true });
    app = createApp({ repository, logger: { info: () => {}, error: () => {} } });
  });

  it('should require admin auth for /admin/notify', async () => {
    const res = await request(app).post('/admin/notify').send({ userId: 'user-1', message: 'Test' });
    expect(res.status).toBe(401);
  });

  it('should require API key for /api/public/user/:userId', async () => {
    const res = await request(app).get('/api/public/user/user-1');
    expect(res.status).toBe(401);
  });

  it('should enforce rate limiting', async () => {
    process.env.TFX_PUBLIC_API_KEYS = 'test-key';
    for (let i = 0; i < 60; i++) {
      await request(app).get('/api/public/user/user-1').set('x-api-key', 'test-key');
    }
    const res = await request(app).get('/api/public/user/user-1').set('x-api-key', 'test-key');
    expect(res.status).toBe(429);
  });

  it('should get/set blockchain reputation (mock)', async () => {
    // Mock contract
    jest.mock('../src/blockchainReputation', () => ({
      getReputationScore: async () => 42,
      setReputationScore: async () => true
    }));
    jest.mock('../src/adminBlockchainAuth', () => ({
      getAdminSigner: () => new ethers.Wallet('0x' + '1'.repeat(64))
    }));
    process.env.TFX_ADMIN_SECRET = 'test';
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ admin: true }, 'test');
    let res = await request(app).get('/admin/reputation/user-1').set('Authorization', `Bearer ${token}`);
    expect(res.body.score).toBe(42);
    res = await request(app).post('/admin/reputation/user-1').set('Authorization', `Bearer ${token}`).send({ score: 99 });
    expect(res.body.ok).toBe(true);
  });
});
