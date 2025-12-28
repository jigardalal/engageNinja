# Journey: Configure Communication Channels (WhatsApp/Email)

**Priority:** High
**User Type:** Authenticated admin user
**Frequency:** Once per channel setup, occasional updates
**Business Impact:** Critical for platform functionality - enables sending
**Preconditions:** User is authenticated, has admin role

## Overview
Admins configure WhatsApp Business API and Email integration to enable messaging capabilities. This is a one-time setup that unlocks core product features.

## Steps

### 1. Navigate to Channel Settings
- **From:** Settings page
- **Action:** Click "Channels" tab in settings
- **Selectors:**
  - Primary: `[data-testid="settings-tab-channels"]`
  - Fallback: `button:has-text("Channels")`
- **Expected Result:** Channels settings page loads
- **Assertions:**
  - Tab is active
  - Channel options display (WhatsApp, Email)
  - Configuration cards show for each

### 2. View WhatsApp Configuration Status
- **From:** Channels settings
- **Action:** Review WhatsApp integration status
- **Selectors:**
  - Primary: `[data-testid="whatsapp-card"]`
  - Fallback: `div.whatsapp-config`
- **Expected Result:** WhatsApp card shows current status
- **Assertions:**
  - Status indicator shows (Connected/Disconnected)
  - Phone number shows (if connected)
  - Setup button shows (if not connected)
  - Test button shows (if connected)

### 3. Click Configure WhatsApp
- **From:** Channel settings
- **Action:** Click "Configure" for WhatsApp
- **Selectors:**
  - Primary: `[data-testid="whatsapp-configure"]`
  - Fallback: `button:has-text("Configure")`
- **Expected Result:** WhatsApp setup modal opens
- **Assertions:**
  - Setup instructions display
  - API credential fields shown
  - Integration steps numbered

### 4. Enter WhatsApp API Credentials
- **From:** WhatsApp configuration modal
- **Action:** Fill in API credentials (Phone Number ID, Business Account ID, etc.)
- **Selectors:**
  - Primary: `[data-testid="whatsapp-phone-id"]`
  - Fallback: `input[name="phoneNumberId"]`
- **Input Data:** `{phoneNumberId: "123456789", businessId: "987654321", accessToken: "token..."}`
- **Expected Result:** Fields populate
- **Assertions:**
  - Values display in inputs
  - Sensitive token masked after entry

### 5. Test WhatsApp Connection
- **From:** WhatsApp configuration modal
- **Action:** Click "Test Connection" to verify credentials
- **Selectors:**
  - Primary: `[data-testid="whatsapp-test"]`
  - Fallback: `button:has-text("Test")`
- **Expected Result:** Connection test runs
- **Assertions:**
  - Loading indicator appears
  - Success or error message shows
  - Phone number confirmed (if successful)

### 6. Save WhatsApp Configuration
- **From:** WhatsApp configuration modal
- **Action:** Click "Save" after successful test
- **Selectors:**
  - Primary: `[data-testid="whatsapp-save"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Configuration saved
- **Assertions:**
  - Modal closes
  - WhatsApp card shows "Connected"
  - Success notification appears

### 7. Configure Email Integration
- **From:** Channels settings
- **Action:** Click "Configure" for Email
- **Selectors:**
  - Primary: `[data-testid="email-configure"]`
  - Fallback: `button:has-text("Configure")`
- **Expected Result:** Email setup modal opens
- **Assertions:**
  - Provider options shown (SES, SendGrid, etc.)
  - Setup instructions display

### 8. Select Email Provider
- **From:** Email configuration modal
- **Action:** Choose email service provider
- **Selectors:**
  - Primary: `[data-testid="email-provider-{provider}"]`
  - Fallback: `button:has-text("{provider}")`
- **Input Data:** `{provider: "ses"}`
- **Expected Result:** Provider selected
- **Assertions:**
  - Provider shows as selected
  - Provider-specific credentials requested

### 9. Enter Email Credentials
- **From:** Email configuration modal
- **Action:** Fill in email provider API credentials
- **Selectors:**
  - Primary: `[data-testid="email-access-key"]`
  - Fallback: `input[name="accessKey"]`
- **Input Data:** `{accessKey: "AKIA...", secretKey: "..."`
- **Expected Result:** Credentials entered
- **Assertions:**
  - Fields populate
  - Secrets masked

### 10. Configure Email Settings
- **From:** Email configuration modal
- **Action:** Set email-specific options (sender name, from address)
- **Selectors:**
  - Primary: `[data-testid="email-from-address"]`
  - Fallback: `input[name="fromAddress"]`
- **Input Data:** `{fromAddress: "noreply@example.com", fromName: "Company Name"}`
- **Expected Result:** Settings configured
- **Assertions:**
  - From address displays
  - From name displays

### 11. Test Email Configuration
- **From:** Email configuration modal
- **Action:** Send test email
- **Selectors:**
  - Primary: `[data-testid="email-test"]`
  - Fallback: `button:has-text("Send Test")`
- **Expected Result:** Test email sent
- **Assertions:**
  - Success message shows
  - Test email receives in inbox

### 12. Save Email Configuration
- **From:** Email configuration modal
- **Action:** Save email settings
- **Selectors:**
  - Primary: `[data-testid="email-save"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Configuration saved
- **Assertions:**
  - Modal closes
  - Email card shows "Connected"
  - Both channels now ready

## Success Outcome
- WhatsApp and Email channels are configured
- Credentials validated and stored securely
- Users can send campaigns via both channels
- Platform is fully operational

## Error Cases

### Error 1: Invalid WhatsApp Credentials
- **Trigger:** Phone ID or access token invalid
- **Error Message:** "Invalid WhatsApp credentials"
- **Recovery:** User re-enters correct credentials

### Error 2: Connection Test Failed
- **Trigger:** API endpoint unreachable or credentials rejected
- **Error Message:** "Failed to connect to WhatsApp. Check credentials"
- **Recovery:** User verifies credentials and retries

### Error 3: Email Provider Not Supported
- **Trigger:** Selected provider not available
- **Error Message:** "Email provider not supported"
- **Recovery:** User selects different provider

### Error 4: Invalid Email Sender Address
- **Trigger:** From address not verified with provider
- **Error Message:** "Email address not verified with {provider}"
- **Recovery:** User verifies address with provider and retries

### Error 5: Rate Limits Exceeded
- **Trigger:** Too many tests or configuration attempts
- **Error Message:** "Rate limit exceeded. Try again in 5 minutes"
- **Recovery:** User waits before retrying

## Selector Improvements Needed
- Channels tab: Add `data-testid="settings-tab-channels"`
- WhatsApp card: Add `data-testid="whatsapp-card"`
- WhatsApp configure: Add `data-testid="whatsapp-configure"`
- WhatsApp credentials: Add `data-testid="whatsapp-phone-id"`, etc.
- WhatsApp test: Add `data-testid="whatsapp-test"`
- WhatsApp save: Add `data-testid="whatsapp-save"`
- Email configure: Add `data-testid="email-configure"`
- Email provider buttons: Add `data-testid="email-provider-{provider}"`
- Email credentials: Add `data-testid="email-access-key"`
- Email test: Add `data-testid="email-test"`
- Email save: Add `data-testid="email-save"`

## Test Data Requirements
- Valid WhatsApp Business Account credentials
- Valid Email Provider API credentials
- Invalid credentials for error testing
- Multiple providers (SES, SendGrid, Brevo)
- Verified and unverified email addresses
