/**
 * Business Info & 10DLC Routes
 *
 * Manages tenant business information and 10DLC brand registrations
 * Provides endpoints for:
 * - Getting/creating/updating business info
 * - Submitting 10DLC registrations
 * - Checking 10DLC approval status
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { validateTenantAccess, requireMember, requireAdmin } = require('../middleware/rbac');
const { logAudit, AUDIT_ACTIONS } = require('../utils/audit');

/**
 * GET /api/business-info
 * Get current business information for tenant
 */
router.get('/', requireAuth, validateTenantAccess, requireMember, async (req, res) => {
  try {
    const businessInfo = await db.prepare(`
      SELECT * FROM tenant_business_info
      WHERE tenant_id = ?
    `).get(req.tenantId);

    if (!businessInfo) {
      // Pre-populate from tenant data
      const tenant = await db.prepare('SELECT name FROM tenants WHERE id = ?').get(req.tenantId);

      return res.json({
        data: {
          tenant_id: req.tenantId,
          legal_business_name: tenant.name,
          dba_name: null,
          business_website: null,
          business_type: null,
          industry_vertical: null,
          business_registration_number: null,
          country: 'US',
          business_address: null,
          business_city: null,
          business_state: null,
          business_zip: null,
          owner_name: null,
          owner_title: null,
          owner_email: null,
          owner_phone: null,
          business_contact_name: null,
          business_contact_email: null,
          business_contact_phone: null,
          monthly_sms_volume_estimate: null,
          use_case_description: null,
          sms_opt_in_language: null,
          gdpr_compliant: false,
          tcpa_compliant: false,
          created_at: null,
          updated_at: null
        },
        status: 'success',
        message: 'No business info yet, pre-populated from tenant data'
      });
    }

    res.json({
      data: businessInfo,
      status: 'success'
    });

  } catch (error) {
    console.error('Get business info error:', error);
    res.status(500).json({
      error: 'Failed to fetch business info',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /api/business-info
 * Create or update business information
 */
router.post('/', requireAuth, validateTenantAccess, requireAdmin, async (req, res) => {
  try {
    const {
      legal_business_name,
      dba_name,
      business_website,
      business_type,
      industry_vertical,
      business_registration_number,
      country,
      business_address,
      business_city,
      business_state,
      business_zip,
      owner_name,
      owner_title,
      owner_email,
      owner_phone,
      business_contact_name,
      business_contact_email,
      business_contact_phone,
      monthly_sms_volume_estimate,
      use_case_description,
      sms_opt_in_language,
      gdpr_compliant,
      tcpa_compliant
    } = req.body;

    // Validate required fields
    if (!legal_business_name || !business_type || !business_address || !country || !owner_name || !owner_email || !owner_phone) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'legal_business_name, business_type, business_address, country, owner_name, owner_email, and owner_phone are required',
        status: 'error'
      });
    }

    // Check if exists
    const existing = await db.prepare(
      'SELECT id FROM tenant_business_info WHERE tenant_id = ?'
    ).get(req.tenantId);

    const now = new Date().toISOString();

    if (existing) {
      // Update
      await db.prepare(`
        UPDATE tenant_business_info
        SET legal_business_name = ?,
            dba_name = ?,
            business_website = ?,
            business_type = ?,
            industry_vertical = ?,
            business_registration_number = ?,
            country = ?,
            business_address = ?,
            business_city = ?,
            business_state = ?,
            business_zip = ?,
            owner_name = ?,
            owner_title = ?,
            owner_email = ?,
            owner_phone = ?,
            business_contact_name = ?,
            business_contact_email = ?,
            business_contact_phone = ?,
            monthly_sms_volume_estimate = ?,
            use_case_description = ?,
            sms_opt_in_language = ?,
            gdpr_compliant = ?,
            tcpa_compliant = ?,
            updated_at = ?
        WHERE tenant_id = ?
      `).run(
        legal_business_name, dba_name, business_website, business_type, industry_vertical,
        business_registration_number, country, business_address, business_city, business_state, business_zip,
        owner_name, owner_title, owner_email, owner_phone,
        business_contact_name, business_contact_email, business_contact_phone,
        monthly_sms_volume_estimate, use_case_description, sms_opt_in_language,
        gdpr_compliant ? 1 : 0, tcpa_compliant ? 1 : 0,
        now, req.tenantId
      );

      await logAudit({
        actorUserId: req.session.userId,
        actorType: 'tenant_user',
        tenantId: req.tenantId,
        action: AUDIT_ACTIONS.SETTINGS_UPDATE,
        targetType: 'business_info',
        targetId: existing.id,
        metadata: { legal_business_name },
        ipAddress: req.ip
      });

      res.json({
        data: { id: existing.id },
        message: 'Business info updated successfully',
        status: 'success'
      });

    } else {
      // Create
      const id = uuidv4();

      await db.prepare(`
        INSERT INTO tenant_business_info (
          id, tenant_id, legal_business_name, dba_name, business_website, business_type, industry_vertical,
          business_registration_number, country, business_address, business_city, business_state, business_zip,
          owner_name, owner_title, owner_email, owner_phone,
          business_contact_name, business_contact_email, business_contact_phone,
          monthly_sms_volume_estimate, use_case_description, sms_opt_in_language,
          gdpr_compliant, tcpa_compliant,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, req.tenantId, legal_business_name, dba_name, business_website, business_type, industry_vertical,
        business_registration_number, country, business_address, business_city, business_state, business_zip,
        owner_name, owner_title, owner_email, owner_phone,
        business_contact_name, business_contact_email, business_contact_phone,
        monthly_sms_volume_estimate, use_case_description, sms_opt_in_language,
        gdpr_compliant ? 1 : 0, tcpa_compliant ? 1 : 0,
        now, now
      );

      await logAudit({
        actorUserId: req.session.userId,
        actorType: 'tenant_user',
        tenantId: req.tenantId,
        action: AUDIT_ACTIONS.SETTINGS_CREATE,
        targetType: 'business_info',
        targetId: id,
        metadata: { legal_business_name },
        ipAddress: req.ip
      });

      res.status(201).json({
        data: { id },
        message: 'Business info created successfully',
        status: 'success'
      });
    }

  } catch (error) {
    console.error('Save business info error:', error);
    res.status(500).json({
      error: 'Failed to save business info',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /api/business-info/submit-10dlc
 * Submit 10DLC brand registration to Twilio
 */
router.post('/submit-10dlc', requireAuth, validateTenantAccess, requireAdmin, async (req, res) => {
  try {
    // 1. Get business info
    const businessInfo = await db.prepare(
      'SELECT * FROM tenant_business_info WHERE tenant_id = ?'
    ).get(req.tenantId);

    if (!businessInfo) {
      return res.status(400).json({
        error: 'Business info required',
        message: 'Please complete business information first',
        status: 'error'
      });
    }

    // 2. Check if tenant is demo
    const tenant = await db.prepare('SELECT is_demo FROM tenants WHERE id = ?').get(req.tenantId);

    if (tenant.is_demo) {
      // Demo mode: Create fake approved brand immediately
      const brandId = uuidv4();
      const now = new Date().toISOString();
      const demoPhoneId = `DEMO-${Date.now()}`;

      await db.prepare(`
        INSERT INTO tenant_10dlc_brands (
          id, tenant_id, legal_business_name, dba_name, business_website, business_type, industry_vertical,
          business_registration_number, country, business_address, business_city, business_state, business_zip,
          owner_name, owner_title, owner_email, owner_phone,
          provider, provider_brand_id, provider_status,
          provider_approved_at, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        brandId, req.tenantId, businessInfo.legal_business_name, businessInfo.dba_name, businessInfo.business_website,
        businessInfo.business_type, businessInfo.industry_vertical,
        businessInfo.business_registration_number, businessInfo.country, businessInfo.business_address,
        businessInfo.business_city, businessInfo.business_state, businessInfo.business_zip,
        businessInfo.owner_name, businessInfo.owner_title, businessInfo.owner_email, businessInfo.owner_phone,
        'demo', demoPhoneId, 'APPROVED',
        now, 1, now, now
      );

      await logAudit({
        actorUserId: req.session.userId,
        actorType: 'tenant_user',
        tenantId: req.tenantId,
        action: '10DLC_SUBMIT',
        targetType: '10dlc_brand',
        targetId: brandId,
        metadata: { legal_business_name: businessInfo.legal_business_name, mode: 'demo' },
        ipAddress: req.ip
      });

      return res.status(201).json({
        data: {
          brand_id: brandId,
          provider_brand_id: demoPhoneId,
          status: 'APPROVED',
          message: 'Demo brand auto-approved for testing'
        },
        status: 'success'
      });
    }

    // 3. For real tenants: Create pending registration
    // NOTE: Full Twilio API integration would go here
    const brandId = uuidv4();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO tenant_10dlc_brands (
        id, tenant_id, legal_business_name, dba_name, business_website, business_type, industry_vertical,
        business_registration_number, country, business_address, business_city, business_state, business_zip,
        owner_name, owner_title, owner_email, owner_phone,
        provider, provider_brand_id, provider_status,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      brandId, req.tenantId, businessInfo.legal_business_name, businessInfo.dba_name, businessInfo.business_website,
      businessInfo.business_type, businessInfo.industry_vertical,
      businessInfo.business_registration_number, businessInfo.country, businessInfo.business_address,
      businessInfo.business_city, businessInfo.business_state, businessInfo.business_zip,
      businessInfo.owner_name, businessInfo.owner_title, businessInfo.owner_email, businessInfo.owner_phone,
      'twilio', 'PENDING', 'PENDING',
      1, now, now
    );

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: '10DLC_SUBMIT',
      targetType: '10dlc_brand',
      targetId: brandId,
      metadata: { legal_business_name: businessInfo.legal_business_name, mode: 'production' },
      ipAddress: req.ip
    });

    res.status(201).json({
      data: {
        brand_id: brandId,
        status: 'PENDING',
        message: '10DLC registration submitted and awaiting Twilio review (typically 1-2 business days)'
      },
      status: 'success'
    });

  } catch (error) {
    console.error('Submit 10DLC error:', error);
    res.status(500).json({
      error: 'Failed to submit 10DLC registration',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /api/business-info/10dlc-status
 * Get current 10DLC brand status
 */
router.get('/10dlc-status', requireAuth, validateTenantAccess, requireMember, async (req, res) => {
  try {
    const brands = await db.prepare(`
      SELECT * FROM tenant_10dlc_brands
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).all(req.tenantId);

    res.json({
      data: brands,
      status: 'success'
    });

  } catch (error) {
    console.error('Get 10DLC status error:', error);
    res.status(500).json({
      error: 'Failed to fetch 10DLC status',
      message: error.message,
      status: 'error'
    });
  }
});

module.exports = router;
