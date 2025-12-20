/**
 * WhatsApp Cloud API Integration Service
 * Handles all interactions with Meta WhatsApp Business API
 * Including template syncing and message sending with retries
 */

const https = require('https');

// Meta WhatsApp Business Cloud API base URL
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Fetch WhatsApp templates from Meta API
 * @param {string} resourceId - WhatsApp Business Account ID (preferred) or phone number ID
 * @param {string} accessToken - Meta API access token
 * @returns {Promise<Array>} Array of templates from Meta with components
 */
async function fetchTemplatesFromMeta(resourceId, accessToken) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${resourceId}/message_templates`;
    const urlObj = new URL(url);
    urlObj.searchParams.append('fields', 'name,status,language,components');

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
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
            const templates = parsed.data.map(t => {
              const bodyText = t.components ? extractBodyTemplate(t.components) : '';
              const header = t.components ? extractHeader(t.components) : null;
              const footer = t.components ? extractFooter(t.components) : null;
              const buttons = t.components ? extractButtons(t.components) : [];
              const bodyVariables = bodyText ? extractVariableNames(bodyText) : [];
              const headerVariables = header?.text ? extractVariableNames(header.text) : [];

              return {
                id: t.id,
                meta_template_id: t.id,
                name: t.name,
                status: t.status,
                language: t.language || 'en',
                variables: Array.from(new Set([...bodyVariables, ...headerVariables])),
                body_template: bodyText,
                header_type: header?.type || null,
                header_text: header?.text || null,
                header_variables: headerVariables,
                footer_text: footer?.text || null,
                buttons,
                body_variables: bodyVariables,
                created_at: new Date().toISOString()
              };
            });
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
 * Extract BODY text from components
 */
function extractBodyTemplate(components) {
  for (const component of components) {
    if (component.type === 'BODY' && component.text) {
      return component.text;
    }
  }
  return '';
}

function extractHeader(components) {
  for (const component of components) {
    if (component.type === 'HEADER') {
      return {
        type: component.format || 'TEXT',
        text: component.text || null
      };
    }
  }
  return null;
}

function extractFooter(components) {
  for (const component of components) {
    if (component.type === 'FOOTER' && component.text) {
      return { text: component.text };
    }
  }
  return '';
}

function extractButtons(components) {
  for (const component of components) {
    if (component.type === 'BUTTONS' && Array.isArray(component.buttons)) {
      return component.buttons.map(btn => ({
        type: btn.type,
        text: btn.text,
        url: btn.url || null,
        phone_number: btn.phone_number || null
      }));
    }
  }
  return [];
}

function extractVariableNames(text) {
  if (!text) return [];
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

/**
 * Send a WhatsApp message via Meta API
 * @param {string} phoneNumberId - WhatsApp phone number ID
 * @param {string} accessToken - Meta API access token
 * @param {string} recipientPhone - Recipient phone number in E.164 format
 * @param {Object} template - Template details (name, header/body variables, header_type)
 * @param {Object} variables - Object with variable values
 * @param {Object} media - Media payload (e.g., { header_link })
 * @returns {Promise<string>} Message ID from Meta
 */
async function sendWhatsAppMessage(phoneNumberId, accessToken, recipientPhone, template, variables = {}, media = {}) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    const urlObj = new URL(url);

    const templateName = typeof template === 'string' ? template : template?.name;
    const bodyVars = Array.isArray(template?.body_variables) ? template.body_variables : (template?.variables || []);
    const headerVars = Array.isArray(template?.header_variables) ? template.header_variables : [];
    const buttons = Array.isArray(template?.buttons) ? template.buttons : [];
    const headerType = template?.header_type || null;

    const bodyParameters = bodyVars.map(v => ({
      type: 'text',
      text: variables[v] !== undefined ? String(variables[v]) : ''
    })).filter(p => p.text !== undefined);

    const headerParameters = headerVars.map(v => ({
      type: 'text',
      text: variables[v] !== undefined ? String(variables[v]) : ''
    })).filter(p => p.text !== undefined);

    const body = {
      messaging_product: 'whatsapp',
      to: recipientPhone.replace(/[^0-9]/g, ''), // Remove formatting from phone
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US'
        }
      }
    };

    const components = [];
    if (headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      const link = media?.header_link;
      if (!link) {
        return reject(new Error('Missing media link for header'));
      }
      const mediaKey = headerType.toLowerCase();
      components.push({
        type: 'header',
        parameters: [
          {
            type: mediaKey,
            [mediaKey]: { link }
          }
        ]
      });
    } else if (headerParameters.length > 0) {
      components.push({
        type: 'header',
        parameters: headerParameters
      });
    }
    if (bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters
      });
    }
    // Button variables (URL buttons with placeholders)
    buttons.forEach((btn, idx) => {
      if (btn.type === 'URL' && typeof btn.url === 'string') {
        const btnVars = extractVariableNames(btn.url);
        if (btnVars.length > 0) {
          const firstVar = btnVars[0];
          const value = variables[firstVar] !== undefined ? String(variables[firstVar]) : '';
          components.push({
            type: 'button',
            sub_type: 'url',
            index: idx,
            parameters: [
              {
                type: 'text',
                text: value
              }
            ]
          });
        }
      }
    });

    if (components.length > 0) {
      body.template.components = components;
    }

    const jsonBody = JSON.stringify(body);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody),
        Authorization: `Bearer ${accessToken}`
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
    urlObj.searchParams.append('fields', 'id,display_phone_number');

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
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
            const code = parsed.error.code ? ` (${parsed.error.code})` : '';
            reject(new Error(parsed.error.message || `Invalid credentials${code}`));
          } else {
            reject(new Error('Unable to validate credentials'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      if (['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)) {
        return reject(new Error('Unable to reach WhatsApp API. Check network and token.'));
      }
      reject(error);
    });

    req.end();
  });
}

/**
 * Create a WhatsApp template via Meta API
 * @param {string} wabaId - WhatsApp Business Account ID
 * @param {string} accessToken - Meta API access token
 * @param {Object} templateData - Template configuration
 * @param {string} templateData.name - Template name (lowercase, alphanumeric, underscores)
 * @param {string} templateData.language - Template language code (default: 'en')
 * @param {string} templateData.category - Template category (MARKETING/UTILITY/AUTHENTICATION)
 * @param {Object} templateData.components - Components schema (HEADER, BODY, FOOTER, BUTTONS)
 * @returns {Promise<Object>} Created template info with id and status
 */
async function createTemplateInMeta(wabaId, accessToken, templateData) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${wabaId}/message_templates`;
    const urlObj = new URL(url);

    const body = {
      name: templateData.name,
      language: templateData.language || 'en',
      category: templateData.category || 'MARKETING',
      components: buildMetaComponents(templateData.components)
    };

    const jsonBody = JSON.stringify(body);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody),
        Authorization: `Bearer ${accessToken}`
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
            resolve({
              id: parsed.id,
              status: parsed.status || 'PENDING',
              category: parsed.category
            });
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

    req.write(jsonBody);
    req.end();
  });
}

/**
 * Delete a WhatsApp template via Meta API
 * @param {string} wabaId - WhatsApp Business Account ID
 * @param {string} templateName - Template name to delete
 * @param {string} accessToken - Meta API access token
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteTemplateFromMeta(wabaId, templateName, accessToken) {
  return new Promise((resolve, reject) => {
    const url = `${WHATSAPP_API_URL}/${wabaId}/message_templates`;
    const urlObj = new URL(url);
    urlObj.searchParams.append('name', templateName);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
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
          if (res.statusCode === 200 && (parsed.success || parsed.message === 'Template deleted')) {
            resolve(true);
          } else if (parsed.error) {
            reject(new Error(`Meta API Error: ${parsed.error.message || 'Unknown error'}`));
          } else {
            reject(new Error('Failed to delete template'));
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
 * Build Meta API components format from our internal schema
 * Converts our unified components schema to Meta's expected format
 * @param {Object} componentsSchema - Our internal components schema
 * @returns {Array} Meta API formatted components
 */
function buildMetaComponents(componentsSchema) {
  const components = [];

  // HEADER component (optional)
  if (componentsSchema.HEADER) {
    const header = {
      type: 'HEADER',
      format: componentsSchema.HEADER.format || componentsSchema.HEADER.type || 'TEXT'
    };

    if (header.format === 'TEXT') {
      header.text = componentsSchema.HEADER.text || '';
      if (componentsSchema.HEADER.example?.header_text) {
        header.example = componentsSchema.HEADER.example;
      }
    } else {
      // For IMAGE, VIDEO, DOCUMENT - no text needed
      if (componentsSchema.HEADER.example) {
        header.example = componentsSchema.HEADER.example;
      }
    }

    components.push(header);
  }

  // BODY component (required)
  if (componentsSchema.BODY) {
    const body = {
      type: 'BODY',
      text: componentsSchema.BODY.text || ''
    };

    if (componentsSchema.BODY.example?.body_text) {
      body.example = componentsSchema.BODY.example;
    }

    components.push(body);
  }

  // FOOTER component (optional)
  if (componentsSchema.FOOTER) {
    components.push({
      type: 'FOOTER',
      text: componentsSchema.FOOTER.text || ''
    });
  }

  // BUTTONS component (optional)
  if (componentsSchema.BUTTONS && Array.isArray(componentsSchema.BUTTONS.buttons)) {
    const buttons = componentsSchema.BUTTONS.buttons.map(btn => {
      const metaBtn = {
        type: btn.type || 'QUICK_REPLY',
        text: btn.text || ''
      };

      if (btn.type === 'URL' && btn.url) {
        metaBtn.url = btn.url;
      } else if (btn.type === 'PHONE_NUMBER' && btn.phone_number) {
        metaBtn.phone_number = btn.phone_number;
      }

      return metaBtn;
    });

    components.push({
      type: 'BUTTONS',
      buttons: buttons
    });
  }

  return components;
}

module.exports = {
  fetchTemplatesFromMeta,
  sendWhatsAppMessage,
  validateCredentials,
  createTemplateInMeta,
  deleteTemplateFromMeta,
  buildMetaComponents,
  WHATSAPP_API_URL
};
