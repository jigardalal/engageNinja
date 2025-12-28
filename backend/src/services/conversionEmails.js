/**
 * Conversion Email Service
 *
 * Automated email triggers for conversion events:
 * - Usage at 80% / 95% (warning / urgent)
 * - Milestone achievements (5, 10, 50 campaigns)
 * - Feature lock attempted 3+ times
 * - First campaign sent (congratulations)
 *
 * Uses the email service to send templated emails.
 */

const db = require('../db');
const emailService = require('./emailService');

/**
 * Check if tenant has high usage and send warning email
 * @param {number} tenantId - Tenant ID
 * @param {object} billingData - Usage and limit data
 */
async function checkUsageAndEmail(tenantId, billingData) {
  try {
    if (!billingData || !billingData.usage || !billingData.limits) {
      return;
    }

    const { usage, limits } = billingData;

    // Check each channel
    const channels = [
      { key: 'whatsapp_messages', name: 'WhatsApp', thresholds: [80, 95] },
      { key: 'emails', name: 'Email', thresholds: [80, 95] },
      { key: 'sms', name: 'SMS', thresholds: [80, 95] }
    ];

    for (const channel of channels) {
      const limit = limits[channel.key];
      if (!limit || limit === 0) continue;

      const percentage = (usage[channel.key] / limit) * 100;

      // Email at 95% (urgent)
      if (percentage >= 95) {
        await sendUsageWarningEmail(tenantId, channel.name, percentage, 'urgent');
      }
      // Email at 80% (warning)
      else if (percentage >= 80) {
        await sendUsageWarningEmail(tenantId, channel.name, percentage, 'warning');
      }
    }
  } catch (err) {
    console.error('Usage email check error:', err);
  }
}

/**
 * Send usage warning email
 */
async function sendUsageWarningEmail(tenantId, channel, percentage, severity) {
  try {
    // Check if we've already sent this email recently (within 24 hours)
    const recent = await db.query(
      `SELECT id FROM conversion_email_log
       WHERE tenant_id = $1 AND event_type = $2 AND channel = $3
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [tenantId, `usage_${severity}`, channel]
    );

    if (recent.rows.length > 0) {
      // Already sent recently, skip
      return;
    }

    // Get tenant info and admin email
    const tenantRes = await db.query(
      `SELECT id, name FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (!tenantRes.rows[0]) {
      return;
    }

    const tenant = tenantRes.rows[0];

    // Get tenant admin email
    const adminRes = await db.query(
      `SELECT u.email FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE ut.tenant_id = $1 AND ut.role = 'owner'
       LIMIT 1`,
      [tenantId]
    );

    if (!adminRes.rows[0]) {
      return;
    }

    const adminEmail = adminRes.rows[0].email;

    // Prepare email content
    const isUrgent = severity === 'urgent';
    const subject = isUrgent
      ? `🚨 Urgent: You're running out of ${channel} messages!`
      : `⚠️ Warning: You're approaching your ${channel} limit`;

    const message = isUrgent
      ? `You're at ${Math.round(percentage)}% of your ${channel} quota. Upgrade immediately to avoid interruptions.`
      : `You're at ${Math.round(percentage)}% of your ${channel} quota. At your current pace, you'll exceed your limit soon.`;

    const emailBody = `
      <h2>${subject}</h2>
      <p>Hi ${tenant.name},</p>
      <p>${message}</p>
      <p><a href="${process.env.FRONTEND_URL}/settings?tab=billing" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
        ${isUrgent ? 'Upgrade Now' : 'See Plans'}
      </a></p>
      <p>Don't let usage limits interrupt your campaigns!</p>
    `;

    // Send email
    await emailService.sendEmail({
      to: adminEmail,
      subject,
      htmlBody: emailBody,
      textBody: message
    });

    // Log that we sent this email
    await db.query(
      `INSERT INTO conversion_email_log (tenant_id, event_type, channel, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [tenantId, `usage_${severity}`, channel]
    );

    console.log(`Sent ${severity} usage email to ${adminEmail} for ${channel}`);
  } catch (err) {
    console.error('Error sending usage email:', err);
  }
}

/**
 * Check for milestone and send congratulations email
 * @param {number} tenantId - Tenant ID
 * @param {string} type - Milestone type ('campaigns', 'contacts', 'messages')
 * @param {number} value - Current value
 */
async function checkMilestoneAndEmail(tenantId, type, value) {
  try {
    const milestones = {
      campaigns: [5, 10, 50],
      contacts: [50, 100, 500],
      messages: [500, 1000, 5000]
    };

    const thresholds = milestones[type] || [];

    for (const threshold of thresholds) {
      if (value >= threshold && value < threshold + 1) {
        // User just hit this milestone
        await sendMilestoneEmail(tenantId, type, threshold);
      }
    }
  } catch (err) {
    console.error('Milestone email check error:', err);
  }
}

/**
 * Send milestone celebration email
 */
async function sendMilestoneEmail(tenantId, type, milestone) {
  try {
    // Check if already sent
    const recent = await db.query(
      `SELECT id FROM conversion_email_log
       WHERE tenant_id = $1 AND event_type = $2 AND metadata->>'milestone' = $3
       AND created_at > NOW() - INTERVAL '7 days'`,
      [tenantId, `milestone_${type}`, String(milestone)]
    );

    if (recent.rows.length > 0) {
      return;
    }

    // Get tenant and admin
    const tenantRes = await db.query(
      `SELECT name FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (!tenantRes.rows[0]) {
      return;
    }

    const tenant = tenantRes.rows[0];

    const adminRes = await db.query(
      `SELECT u.email FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE ut.tenant_id = $1 AND ut.role = 'owner'
       LIMIT 1`,
      [tenantId]
    );

    if (!adminRes.rows[0]) {
      return;
    }

    const adminEmail = adminRes.rows[0].email;

    // Prepare milestone message
    const milestoneMessages = {
      campaigns_5: {
        title: '🎯 5 Campaigns Down!',
        message: 'You\'re building momentum. Consider Starter plan to automate your workflows.'
      },
      campaigns_10: {
        title: '⚡ 10 Campaigns Mastered!',
        message: 'Pro users automate at this stage. Ready to scale?'
      },
      campaigns_50: {
        title: '🏆 50 Campaigns Achievement!',
        message: 'You\'re a messaging power user. Explore Pro features.'
      },
      contacts_50: {
        title: '👥 50 Contacts!',
        message: 'Your audience is growing. Consider larger plans.'
      },
      contacts_100: {
        title: '📈 100 Contacts!',
        message: 'Your network is expanding. Growth plan offers better tools.'
      },
      contacts_500: {
        title: '🌍 500 Contacts!',
        message: 'Advanced features like segmentation are available with Growth+'
      }
    };

    const key = `${type}_${milestone}`;
    const content = milestoneMessages[key] || { title: '🎉 Milestone!', message: '' };

    // Send email
    const emailBody = `
      <h2>${content.title}</h2>
      <p>Hi ${tenant.name},</p>
      <p>${content.message}</p>
      <p><a href="${process.env.FRONTEND_URL}/settings?tab=billing" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
        Explore Plans
      </a></p>
      <p>Keep up the great work!</p>
    `;

    await emailService.sendEmail({
      to: adminEmail,
      subject: `${content.title} 🎉`,
      htmlBody: emailBody,
      textBody: content.message
    });

    // Log
    await db.query(
      `INSERT INTO conversion_email_log (tenant_id, event_type, metadata, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [tenantId, `milestone_${type}`, JSON.stringify({ milestone })]
    );

    console.log(`Sent milestone email to ${adminEmail} for ${type}=${milestone}`);
  } catch (err) {
    console.error('Error sending milestone email:', err);
  }
}

/**
 * Check for feature lock attempts and send feature email
 * If user tries a locked feature 3+ times, suggest upgrade
 */
async function checkFeatureLockAndEmail(tenantId, feature) {
  try {
    // Count feature lock attempts in last 24 hours
    const attempts = await db.query(
      `SELECT COUNT(*) as count FROM conversion_events
       WHERE tenant_id = $1 AND event_type = 'FEATURE_LOCK_CLICKED'
       AND properties->>'feature' = $2
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [tenantId, feature]
    );

    if (parseInt(attempts.rows[0]?.count || 0) < 3) {
      return; // Less than 3 attempts
    }

    // Check if already sent recently
    const recent = await db.query(
      `SELECT id FROM conversion_email_log
       WHERE tenant_id = $1 AND event_type = 'feature_lock_reminder'
       AND metadata->>'feature' = $2
       AND created_at > NOW() - INTERVAL '48 hours'`,
      [tenantId, feature]
    );

    if (recent.rows.length > 0) {
      return;
    }

    // Send email
    const tenantRes = await db.query(
      `SELECT name FROM tenants WHERE id = $1`,
      [tenantId]
    );

    const tenant = tenantRes.rows[0];

    const adminRes = await db.query(
      `SELECT u.email FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE ut.tenant_id = $1 AND ut.role = 'owner'
       LIMIT 1`,
      [tenantId]
    );

    const adminEmail = adminRes.rows[0]?.email;
    if (!adminEmail) return;

    const featureName = feature.split('_').join(' ');

    const emailBody = `
      <h2>Ready for ${featureName}?</h2>
      <p>Hi ${tenant.name},</p>
      <p>We noticed you're trying to use ${featureName} multiple times. This feature is available on Starter and above.</p>
      <p>Upgrade now to unlock this and many other powerful features:</p>
      <ul>
        <li>Schedule campaigns to send at optimal times</li>
        <li>Advanced automation and workflows</li>
        <li>Bulk actions for faster management</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/settings?tab=billing" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
        Upgrade to Starter
      </a></p>
    `;

    await emailService.sendEmail({
      to: adminEmail,
      subject: `Unlock ${featureName} with Starter`,
      htmlBody: emailBody,
      textBody: `You're trying to use ${featureName}. Upgrade to unlock it.`
    });

    // Log
    await db.query(
      `INSERT INTO conversion_email_log (tenant_id, event_type, metadata, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [tenantId, 'feature_lock_reminder', JSON.stringify({ feature })]
    );

    console.log(`Sent feature lock email to ${adminEmail} for ${feature}`);
  } catch (err) {
    console.error('Error sending feature lock email:', err);
  }
}

module.exports = {
  checkUsageAndEmail,
  checkMilestoneAndEmail,
  checkFeatureLockAndEmail,
  sendUsageWarningEmail,
  sendMilestoneEmail,
  checkFeatureLockAndEmail
};
