const { createApp } = require('./createApp');
const { createMemoryRepository } = require('./memoryRepository');
const { createMetaWhatsAppWebhookAdapter, createMetaWhatsAppSender } = require('./metaWhatsAppWebhook');
const { createPasswordResetNotifier } = require('./passwordResetNotifier');
const { createWhatsappContractorService } = require('./whatsappContractor');

module.exports = {
  createApp,
  createMemoryRepository,
  createMetaWhatsAppSender,
  createMetaWhatsAppWebhookAdapter,
  createPasswordResetNotifier,
  createWhatsappContractorService,
  createPostgresRepository: (...args) => require('./postgresRepository').createPostgresRepository(...args)
};
