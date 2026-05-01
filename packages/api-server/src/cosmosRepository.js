// Cosmos DB repository with sharding (partition key = userId)
const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DB || 'tfxhub';
const containerId = process.env.COSMOS_CONTAINER || 'users';

const client = new CosmosClient({ endpoint, key });
const db = client.database(databaseId);
const container = db.container(containerId);

async function getUserById(userId) {
  const { resource } = await container.item(userId, userId).read();
  return resource;
}

async function upsertUser(user) {
  return container.items.upsert(user);
}

module.exports = { getUserById, upsertUser };
