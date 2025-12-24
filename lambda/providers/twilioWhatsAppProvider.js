const twilio = require('twilio');

class TwilioWhatsAppProvider {
  constructor(credentials = {}, config = {}) {
    if (!credentials.accountSid || !credentials.authToken) {
      throw new Error('Twilio credentials are missing accountSid/authToken');
    }
    this.credentials = credentials;
    this.config = config;
    this.client = twilio(credentials.accountSid, credentials.authToken);
  }

  async send(payload) {
    const data = {
      from: payload.from || this.config.phone_number || 'whatsapp:+1234567890',
      body: payload.body
    };

    // WhatsApp addresses must start with 'whatsapp:'
    const to = payload.to || '';
    data.to = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (payload.messagingServiceSid || this.config.messaging_service_sid) {
      data.messagingServiceSid = payload.messagingServiceSid || this.config.messaging_service_sid;
    }

    if (payload.statusCallback || this.config.status_callback) {
      data.statusCallback = payload.statusCallback || this.config.status_callback;
    }

    return this.client.messages.create(data);
  }

  verifyWebhookSignature(signature, url, params) {
    return twilio.validateRequest(this.credentials.authToken, signature, url, params);
  }
}

module.exports = TwilioWhatsAppProvider;
