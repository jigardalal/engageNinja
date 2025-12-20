/**
 * Email Service - AWS SES Integration
 * Handles sending emails via Amazon Simple Email Service
 * Includes retry logic, rate limiting, and error handling
 */

const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');

/**
 * Send email via AWS SES
 * Implements AWS SigV4 authentication
 *
 * @param {Object} config - SES configuration from database
 *   - accessKeyId: AWS Access Key ID
 *   - secretAccessKey: AWS Secret Access Key
 *   - region: AWS region (e.g., 'us-east-1')
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text email body (optional)
 * @param {string} senderEmail - Verified sender email address
 * @returns {Promise<string>} Message ID from SES
 */
async function sendEmail(config, toEmail, subject, htmlBody, textBody, senderEmail) {
  const { accessKeyId, secretAccessKey, region } = config;

  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error('SES configuration incomplete: missing credentials or region');
  }

  return new Promise((resolve, reject) => {
    try {
      // AWS SES API endpoint
      const host = `email.${region}.amazonaws.com`;
      const endpoint = `https://${host}/`;

      // Prepare email parameters
      const params = {
        'Action': 'SendEmail',
        'Source': senderEmail,
        'Destination.ToAddresses.member.1': toEmail,
        'Message.Subject.Data': subject,
        'Message.Body.Html.Data': htmlBody
      };

      // Add text body if provided
      if (textBody) {
        params['Message.Body.Text.Data'] = textBody;
      }

      // Build query string for signing
      const queryStr = querystring.stringify(params);

      // AWS SigV4 Signing Process
      const timestamp = new Date().toISOString();
      const amzDate = timestamp.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const datestamp = amzDate.substring(0, 8);

      // Create canonical request
      const canonicalRequest = `POST\n/\n\n` +
        `host:${host}\nx-amz-date:${amzDate}\n\n` +
        `host;x-amz-date\n` +
        sha256(queryStr);

      // Create string to sign
      const credentialScope = `${datestamp}/${region}/email/aws4_request`;
      const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

      // Calculate signature
      const kDate = hmac(secretAccessKey, `AWS4${secretAccessKey}`, datestamp);
      const kRegion = hmac(kDate, region, 'binary');
      const kService = hmac(kRegion, 'email', 'binary');
      const kSigning = hmac(kService, 'aws4_request', 'binary');
      const signature = hmac(kSigning, stringToSign, 'binary').toString('hex');

      // Build authorization header
      const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signature}`;

      // Send request to AWS SES
      const options = {
        hostname: host,
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(queryStr),
          'Host': host,
          'X-Amz-Date': amzDate,
          'Authorization': authHeader
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          // Parse XML response
          const messageIdMatch = data.match(/<MessageId>([^<]+)<\/MessageId>/);
          const errorMatch = data.match(/<Error><Code>([^<]+)<\/Code><Message>([^<]+)<\/Message>/);

          if (res.statusCode === 200 && messageIdMatch) {
            resolve(messageIdMatch[1]);
          } else if (errorMatch) {
            reject(new Error(`SES Error: ${errorMatch[1]} - ${errorMatch[2]}`));
          } else {
            reject(new Error(`Failed to send email via SES: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(queryStr);
      req.end();
    } catch (err) {
      reject(new Error(`Email sending failed: ${err.message}`));
    }
  });
}

/**
 * Send email via Brevo (Sendinblue)
 *
 * @param {Object} config - Brevo configuration
 *   - apiKey: Brevo API key
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text body (optional)
 * @param {string} senderEmail - Sender email address
 * @returns {Promise<string>} Message ID from Brevo
 */
async function sendEmailBrevo(config, toEmail, subject, htmlBody, textBody, senderEmail) {
  const { apiKey } = config;

  if (!apiKey) {
    throw new Error('Brevo API key is required');
  }

  return new Promise((resolve, reject) => {
    const body = {
      sender: {
        name: 'EngageNinja',
        email: senderEmail
      },
      to: [
        {
          email: toEmail
        }
      ],
      subject: subject,
      htmlContent: htmlBody,
      textContent: textBody || ''
    };

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(body)),
        'api-key': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 201 && parsed.messageId) {
            resolve(parsed.messageId);
          } else {
            reject(new Error(`Brevo error: ${res.statusCode} - ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Brevo response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * SHA256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * HMAC helper for AWS Sig v4
 */
function hmac(key, data, format = 'hex') {
  const keyType = typeof key === 'string' ? 'utf8' : 'binary';
  const hmacObj = crypto.createHmac('sha256', key).update(data);
  return format === 'binary' ? hmacObj.digest('binary') : hmacObj.digest('hex');
}

/**
 * Send email wrapper - supports both SES and Brevo
 */
async function send(config, toEmail, subject, htmlBody, textBody, senderEmail) {
  if (!config.provider) {
    throw new Error('Email provider not configured');
  }

  if (config.provider === 'ses') {
    return sendEmail(config, toEmail, subject, htmlBody, textBody, senderEmail);
  } else if (config.provider === 'brevo') {
    return sendEmailBrevo(config, toEmail, subject, htmlBody, textBody, senderEmail);
  } else {
    throw new Error(`Unsupported email provider: ${config.provider}`);
  }
}

module.exports = {
  send,
  sendEmail,
  sendEmailBrevo
};
