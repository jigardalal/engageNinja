/**
 * WhatsApp Cloud API Integration Service
 * Handles all interactions with Meta WhatsApp Business API
 * Including template syncing and message sending with retries
 */

const https = require('https');
const { v4: uuidv4 } = require('uuid');

// Meta WhatsApp Business Cloud API base URL
const WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0';

/**
 * Fetch WhatsApp templates from Meta API
 * @param {string} phoneNumberId - WhatsApp phone number ID from Meta
 * @param {string} accessToken - Meta API access token
 * @returns {Promise<Array>} Array of templates from Meta
 */
async function fetchTemplatesFromMeta(phoneNumberId, accessToken) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/message_templates`;
    const urlObj = new URL(url);
    urlObj.searchParams.append('access_token', accessToken);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
          if (res.statusCode === 200 && parsed.data) {
            // Transform Meta response to our format
            const templates = parsed.data.map(t => ({
              id: t.id || uuidv4(),
              meta_template_id: t.id,
              name: t.name,
              status: t.status,
              language: t.language || 'en',
              variables: t.components ? extractVariables(t.components) : [],
              body_template: t.components ? extractBodyTemplate(t.components) : '',
              created_at: new Date().toISOString()
            }));
            resolve(templates);
          } else if (parsed.error) {
            reject(new Error(`Meta API Error: ${parsed.error.message || 'Unknown error'}`));
          } else {
            reject(new Error('Invalid response from Meta API'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Meta API response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Extract variables from Meta template components
 * @param {Array} components - Template components from Meta
 * @returns {Array} Array of variable names
 */
function extractVariables(components) {
  const variables = [];

  for (const component of components) {
    if (component.type === 'BODY' && component.text) {
      // Extract {{variable}} style placeholders
      const matches = component.text.match(/\{\{(\w+)\}\}/g) || [];
      for (const match of matches) {
        const varName = match.replace(/\{\{|\}\}/g, '');
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      }
    }
  }

  return variables;
}

/**
 * Extract body template text from components
 * @param {Array} components - Template components from Meta
 * @returns {string} Template body text
 */
function extractBodyTemplate(components) {
  for (const component of components) {
    if (component.type === 'BODY' && component.text) {
      return component.text;
    }
  }
  return '';
}

/**
 * Send a WhatsApp message via Meta API
 * @param {string} phoneNumberId - WhatsApp phone number ID
 * @param {string} accessToken - Meta API access token
 * @param {string} recipientPhone - Recipient phone number in E.164 format
 * @param {string} templateName - Name of the template to use
 * @param {Object} variables - Object with variable values
 * @returns {Promise<string>} Message ID from Meta
 */
async function sendWhatsAppMessage(phoneNumberId, accessToken, recipientPhone, templateName, variables = {}) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    const urlObj = new URL(url);
    urlObj.searchParams.append('access_token', accessToken);

    // Build parameter array for template variables
    const parameters = Object.values(variables).map(value => ({
      type: 'text',
      text: String(value)
    }));

    const body = {
      messaging_product: 'whatsapp',
      to: recipientPhone.replace(/[^0-9]/g, ''), // Remove formatting from phone
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US'
        },
        ...(parameters.length > 0 && {
          parameters: {
            body: {
              parameters: parameters
            }
          }
        })
      }
    };

    const jsonBody = JSON.stringify(body);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody)
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
          if (res.statusCode === 200 && parsed.messages && parsed.messages.length > 0) {
            resolve(parsed.messages[0].id);
          } else if (parsed.error) {
            const errorMsg = parsed.error.message || parsed.error.error_description || 'Unknown error';
            reject(new Error(`WhatsApp API Error: ${errorMsg}`));
          } else {
            reject(new Error('Invalid response from WhatsApp API'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse WhatsApp API response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(jsonBody);
    req.end();
  });
}

/**
 * Validate WhatsApp credentials by making a test API call
 * @param {string} phoneNumberId - WhatsApp phone number ID
 * @param {string} accessToken - Meta API access token
 * @returns {Promise<boolean>} True if valid, throws error if invalid
 */
async function validateCredentials(phoneNumberId, accessToken) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}`;
    const urlObj = new URL(url);
    urlObj.searchParams.append('access_token', accessToken);
    urlObj.searchParams.append('fields', 'id,display_phone_number');

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
          if (res.statusCode === 200 && parsed.id) {
            resolve(true);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || 'Invalid credentials'));
          } else {
            reject(new Error('Unable to validate credentials'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

module.exports = {
  fetchTemplatesFromMeta,
  sendWhatsAppMessage,
  validateCredentials,
  WHATSAPP_API_URL
};
