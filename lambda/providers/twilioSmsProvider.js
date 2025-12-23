const twilio = require('twilio');

class TwilioSmsProvider {
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
      to: payload.to,
      body: payload.body
    };

    if (payload.messagingServiceSid || this.config.messaging_service_sid) {
      data.messagingServiceSid = payload.messagingServiceSid || this.config.messaging_service_sid;
    } else if (payload.from || this.config.phone_number) {
      data.from = payload.from || this.config.phone_number;
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

module.exports = TwilioSmsProvider;
