const AWS = require('aws-sdk');

class SESEmailProvider {
  constructor(credentials = {}, config = {}) {
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error('SES credentials are missing accessKeyId/secretAccessKey');
    }

    this.credentials = credentials;
    this.config = config;

    this.ses = new AWS.SES({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region || config.region || 'us-east-1'
    });
  }

  async send(payload) {
    const params = {
      Source: payload.fromEmail || this.config.from_email || 'noreply@engageninja.app',
      Destination: {
        ToAddresses: [payload.to]
      },
      Message: {
        Subject: {
          Data: payload.subject || 'Message',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: payload.htmlBody || payload.body || '',
            Charset: 'UTF-8'
          },
          Text: {
            Data: payload.textBody || payload.body || '',
            Charset: 'UTF-8'
          }
        }
      }
    };

    // Add configuration set if specified (for bounce/complaint tracking)
    if (payload.configurationSet || this.config.configuration_set) {
      params.ConfigurationSetName = payload.configurationSet || this.config.configuration_set;
    }

    const result = await this.ses.sendEmail(params).promise();

    return {
      success: true,
      messageId: result.MessageId,
      status: 'sent'
    };
  }

  async verify() {
    try {
      const params = {
        Source: this.config.from_email || 'test@example.com'
      };

      await this.ses.getAccountSendingEnabled({}).promise();

      return {
        success: true,
        message: 'SES email provider verified'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SESEmailProvider;
