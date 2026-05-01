// Azure Storage Queue integration
const { QueueServiceClient } = require('@azure/storage-queue');

const queueConnStr = process.env.AZURE_QUEUE_CONNECTION_STRING;
const queueName = process.env.AZURE_QUEUE_NAME || 'tfxjobs';
const queueClient = QueueServiceClient.fromConnectionString(queueConnStr).getQueueClient(queueName);

async function enqueueJob(payload) {
  await queueClient.sendMessage(Buffer.from(JSON.stringify(payload)).toString('base64'));
}

module.exports = { enqueueJob };
