function extractIncomingText(message) {
  if (!message) {
    return '';
  }

  if (message.text && message.text.body) {
    return String(message.text.body);
  }

  if (message.button && message.button.text) {
    return String(message.button.text);
  }

  if (message.interactive && message.interactive.button_reply) {
    return String(message.interactive.button_reply.title || message.interactive.button_reply.id || '');
  }

  if (message.interactive && message.interactive.list_reply) {
    return String(message.interactive.list_reply.title || message.interactive.list_reply.id || '');
  }

  return '';
}

function buildMetaReplyPayload({ to, text, options = [] }) {
  if (!to || !text) {
    throw new Error('to and text are required');
  }

  const normalizedOptions = Array.isArray(options)
    ? options.map((option) => String(option || '').trim()).filter(Boolean)
    : [];

  if (normalizedOptions.length >= 1 && normalizedOptions.length <= 3) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: normalizedOptions.map((option, index) => ({
            type: 'reply',
            reply: {
              id: `option-${index + 1}`,
              title: option.slice(0, 20)
            }
          }))
        }
      }
    };
  }

  if (normalizedOptions.length >= 4 && normalizedOptions.length <= 10) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: 'Choose',
          sections: [{
            title: 'Options',
            rows: normalizedOptions.map((option, index) => ({
              id: `option-${index + 1}`,
              title: option.slice(0, 24),
              description: `Reply with ${option}`.slice(0, 72)
            }))
          }]
        }
      }
    };
  }

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };
}

function createMetaWhatsAppSender(options = {}) {
  const logger = options.logger || { info() {}, warn() {}, error() {} };
  const fetchImpl = options.fetchImpl || global.fetch;
  const accessToken = options.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = options.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = options.apiVersion || process.env.WHATSAPP_GRAPH_API_VERSION || 'v18.0';
  const baseUrl = options.baseUrl || process.env.WHATSAPP_GRAPH_API_BASE_URL || `https://graph.facebook.com/${apiVersion}`;

  return {
    async sendText({ to, text }) {
      return this.sendReply({ to, text, options: [] });
    },

    async sendReply({ to, text, options = [] }) {
      const payload = buildMetaReplyPayload({ to, text, options });

      if (!fetchImpl || !accessToken || !phoneNumberId) {
        logger.info('meta whatsapp reply logged locally', { to, text, options, payload });
        return { channel: 'log', to, text, options, payload };
      }

      const response = await fetchImpl(`${baseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Meta WhatsApp send failed with ${response.status}`);
      }

      const result = await response.json();
      logger.info('meta whatsapp reply sent', { to, type: payload.type });
      return { channel: 'meta', payload: result, request: payload };
    }
  };
}

function collectInboundMessages(payload) {
  const entries = Array.isArray(payload && payload.entry) ? payload.entry : [];
  const items = [];

  entries.forEach((entry) => {
    const changes = Array.isArray(entry && entry.changes) ? entry.changes : [];
    changes.forEach((change) => {
      const value = change && change.value ? change.value : {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      messages.forEach((message) => {
        const text = extractIncomingText(message);
        if (message.from && text) {
          items.push({
            phoneNumber: String(message.from),
            message: text,
            raw: message
          });
        }
      });
    });
  });

  return items;
}

function createMetaWhatsAppWebhookAdapter(options = {}) {
  const logger = options.logger || { info() {}, warn() {}, error() {} };
  const contractorService = options.contractorService;
  const serviceRouter = options.serviceRouter;
  const verifyToken = options.verifyToken || process.env.WHATSAPP_WEBHOOK_TOKEN;
  const sender = options.sender || createMetaWhatsAppSender({ logger, fetchImpl: options.fetchImpl });

  if (!contractorService || typeof contractorService.handleIncomingMessage !== 'function') {
    throw new Error('contractorService.handleIncomingMessage is required');
  }

  return {
    verify(query = {}) {
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      if (mode === 'subscribe' && verifyToken && token === verifyToken) {
        return { ok: true, challenge: String(challenge || '') };
      }

      return { ok: false };
    },

    async processPayload(payload) {
      const inboundMessages = collectInboundMessages(payload);
      const replies = [];

      for (const inbound of inboundMessages) {
        const targetService = serviceRouter
          ? await serviceRouter({ phoneNumber: inbound.phoneNumber, message: inbound.message, raw: inbound.raw })
          : contractorService;
        const activeService = targetService && typeof targetService.handleIncomingMessage === 'function'
          ? targetService
          : contractorService;
        const reply = await activeService.handleIncomingMessage({
          phoneNumber: inbound.phoneNumber,
          message: inbound.message
        });

        replies.push({ phoneNumber: inbound.phoneNumber, reply });

        if (reply && reply.reply) {
          if (sender.sendReply) {
            await sender.sendReply({ to: inbound.phoneNumber, text: reply.reply, options: reply.options || [] });
          } else {
            await sender.sendText({ to: inbound.phoneNumber, text: reply.reply });
          }
        }
      }

      logger.info('meta whatsapp webhook processed', { count: inboundMessages.length });
      return { processed: inboundMessages.length, replies };
    }
  };
}

module.exports = {
  buildMetaReplyPayload,
  collectInboundMessages,
  createMetaWhatsAppSender,
  createMetaWhatsAppWebhookAdapter,
  extractIncomingText
};