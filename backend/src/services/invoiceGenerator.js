/**
 * Invoice Generator Service
 * Generates PDF invoices from HTML templates
 */

const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class InvoiceGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '../../templates/invoices/invoice.html');
    this.storageDir = path.join(__dirname, '../../invoices');
    this.ensureStorageDirectory();
  }

  /**
   * Ensure invoices directory exists
   */
  ensureStorageDirectory() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF
   * @param {Object} invoiceData - Invoice data to render
   * @returns {Promise<string>} - Path to generated PDF
   */
  async generateInvoice(invoiceData) {
    try {
      // Validate required fields
      this.validateInvoiceData(invoiceData);

      // Read and compile template
      const templateHTML = fs.readFileSync(this.templatePath, 'utf8');
      const template = handlebars.compile(templateHTML);

      // Prepare data with formatted values
      const data = this.formatInvoiceData(invoiceData);

      // Render HTML with data
      const html = template(data);

      // Generate PDF
      const pdfPath = await this.htmlToPdf(html, data);

      console.log(`📄 Invoice generated: ${pdfPath}`);
      return pdfPath;
    } catch (error) {
      console.error('❌ Failed to generate invoice:', error.message);
      throw error;
    }
  }

  /**
   * Generate invoice PDF as buffer (no storage)
   * Used for streaming to client without saving to disk
   * @param {Object} invoiceData - Invoice data to render
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateInvoiceBuffer(invoiceData) {
    try {
      // Validate required fields
      this.validateInvoiceData(invoiceData);

      // Read and compile template
      const templateHTML = fs.readFileSync(this.templatePath, 'utf8');
      const template = handlebars.compile(templateHTML);

      // Prepare data with formatted values
      const data = this.formatInvoiceData(invoiceData);

      // Render HTML with data
      const html = template(data);

      // Generate PDF buffer
      const pdfBuffer = await this.htmlToPdfBuffer(html, data);

      console.log(`📄 Invoice generated (streamed): ${invoiceData.invoiceNumber}`);
      return pdfBuffer;
    } catch (error) {
      console.error('❌ Failed to generate invoice buffer:', error.message);
      throw error;
    }
  }

  /**
   * Convert HTML to PDF buffer using Puppeteer (no disk storage)
   */
  async htmlToPdfBuffer(html, data) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF as buffer (no file path = returns buffer)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });

      await browser.close();
      return pdfBuffer;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Convert HTML to PDF using Puppeteer (with disk storage)
   */
  async htmlToPdf(html, data) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Determine PDF filename
      const filename = this.generateFilename(data.tenantId, data.invoiceNumber);
      const filepath = path.join(this.storageDir, filename);

      // Generate PDF
      await page.pdf({
        path: filepath,
        format: 'A4',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });

      await browser.close();
      return filepath;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Format invoice data for template
   */
  formatInvoiceData(invoiceData) {
    const planPrice = parseFloat(invoiceData.planPrice) / 100; // Convert cents to dollars
    const negotiatedPrice = parseFloat(invoiceData.negotiatedPrice) / 100;
    const discountAmount = planPrice - negotiatedPrice;
    const isPaid = invoiceData.status?.toLowerCase() === 'paid';

    return {
      // Invoice details
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: this.formatDate(invoiceData.invoiceDate),
      dueDate: this.formatDate(invoiceData.dueDate),
      isPaid: isPaid,

      // Tenant info
      tenantId: invoiceData.tenantId,
      tenantName: invoiceData.tenantName || 'Customer',
      tenantEmail: invoiceData.tenantEmail || '',
      tenantAddress: invoiceData.tenantAddress || '',

      // Plan and pricing
      planName: invoiceData.planName || 'Plan',
      planPrice: planPrice.toFixed(2),
      negotiatedPrice: negotiatedPrice.toFixed(2),
      finalPrice: negotiatedPrice.toFixed(2),

      // Discount
      discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : null,
      discountPercent: discountAmount > 0 ? ((discountAmount / planPrice) * 100).toFixed(1) : 0,

      // Payment
      status: invoiceData.status?.toUpperCase() || 'PENDING',
      paymentMethod: invoiceData.paymentMethod || 'Credit Card (Stripe)',
      paidDate: invoiceData.paidDate ? this.formatDate(invoiceData.paidDate) : '-',
      stripeInvoiceId: invoiceData.stripeInvoiceId || '-',

      // Meta
      currentYear: new Date().getFullYear()
    };
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Generate invoice filename
   */
  generateFilename(tenantId, invoiceNumber) {
    // Format: tenant-id_invoice-number.pdf
    // Example: 1ef5ec70_INV-2025-0001.pdf
    const safeName = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    return `${tenantId}_${safeName}.pdf`;
  }

  /**
   * Generate invoice number
   */
  static generateInvoiceNumber(invoiceId) {
    // Format: INV-YYYY-XXXXXX
    // Example: INV-2025-000001
    const now = new Date();
    const year = now.getFullYear();
    // Use first 6 chars of invoice ID for uniqueness
    const sequence = invoiceId.substring(0, 6).toUpperCase();
    return `INV-${year}-${sequence}`;
  }

  /**
   * Validate invoice data
   */
  validateInvoiceData(data) {
    const required = ['invoiceNumber', 'tenantId', 'tenantName', 'planName', 'planPrice', 'negotiatedPrice'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Get invoice file path
   */
  getInvoicePath(tenantId, invoiceNumber) {
    const filename = this.generateFilename(tenantId, invoiceNumber);
    return path.join(this.storageDir, filename);
  }

  /**
   * Check if invoice PDF exists
   */
  invoiceExists(tenantId, invoiceNumber) {
    const filepath = this.getInvoicePath(tenantId, invoiceNumber);
    return fs.existsSync(filepath);
  }

  /**
   * Get invoice PDF as buffer (for download)
   */
  getInvoicePDF(tenantId, invoiceNumber) {
    const filepath = this.getInvoicePath(tenantId, invoiceNumber);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Invoice not found: ${invoiceNumber}`);
    }
    return fs.readFileSync(filepath);
  }

  /**
   * Delete invoice PDF
   */
  deleteInvoice(tenantId, invoiceNumber) {
    const filepath = this.getInvoicePath(tenantId, invoiceNumber);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`🗑️  Invoice deleted: ${filepath}`);
    }
  }
}

module.exports = InvoiceGenerator;
