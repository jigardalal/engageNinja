const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  path.join(__dirname, './smoke.js'),
  path.join(__dirname, './contacts-crud.js'),
  path.join(__dirname, './whatsapp-campaign.js'),
  path.join(__dirname, './email-campaign.js'),
  path.join(__dirname, './settings-templates.js'),
  path.join(__dirname, './settings-connect-email.js'),
  path.join(__dirname, './settings-whatsapp-connect.js'),
  path.join(__dirname, './campaign-mapping-persistence.js'),
  path.join(__dirname, './campaign-archive-filter.js'),
  path.join(__dirname, './campaign-resend-duplicate.js'),
  path.join(__dirname, './contacts-bulk-tags.js'),
  path.join(__dirname, './campaign-button-vars.js'),
  path.join(__dirname, './campaign-metrics-card.js'),
  path.join(__dirname, './templates-view-preview.js')
];

for (const script of scripts) {
  console.log(`\n▶ Running ${path.basename(script)}...`);
  const result = spawnSync('node', [script], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${path.basename(script)} failed with code ${result.status}. Aborting suite.`);
    process.exit(result.status || 1);
  }
}

console.log('\n✅ All UI tests passed.');
