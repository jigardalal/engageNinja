# Journey: Plan Upgrade & Billing Management

**Priority:** Critical
**User Type:** Authenticated admin user
**Frequency:** Once per plan change, several times during free trial
**Business Impact:** Revenue generation and free-to-paid conversion
**Preconditions:** User is authenticated, has admin role in tenant

## Overview
Billing management and plan upgrades are critical for SaaS revenue. Users manage subscriptions, view usage, and upgrade plans to access premium features.

## Steps

### 1. Navigate to Billing Page
- **From:** Settings page or navigation
- **Action:** Click on "Billing" tab in settings or navigate to `/settings?tab=billing`
- **Selectors:**
  - Primary: `[data-testid="billing-tab"]`
  - Fallback: `button:has-text("Billing")`
- **Expected Result:** Billing page loads
- **Assertions:**
  - URL contains `billing`
  - Current plan displays
  - Usage summary shows

### 2. View Current Plan & Usage
- **From:** Billing page
- **Action:** Review current subscription
- **Selectors:**
  - Primary: `[data-testid="current-plan-card"]`
  - Fallback: `div.plan-summary`
- **Expected Result:** Plan information displays
- **Assertions:**
  - Current plan name visible (e.g., "Free", "Starter")
  - Plan features listed
  - Usage metrics show (messages sent, contacts used, etc.)
  - Upgrade button visible if not on highest plan

### 3. View Pricing/Plan Comparison
- **From:** Billing page
- **Action:** Click "View Plans" or "Upgrade" button to see pricing
- **Selectors:**
  - Primary: `[data-testid="view-plans-button"]`
  - Fallback: `button:has-text("Upgrade")`
- **Expected Result:** Plan comparison modal or page opens
- **Assertions:**
  - All plans are displayed
  - Features compared side-by-side
  - Current plan is highlighted
  - Pricing for each tier shown

### 4. Select Upgrade Plan
- **From:** Plan comparison page
- **Action:** Click "Upgrade" button on desired plan
- **Selectors:**
  - Primary: `[data-testid="upgrade-plan-{planName}"]`
  - Fallback: `button:has-text("Upgrade to Starter")`
- **Input Data:** `{selectedPlan: "starter"}`
- **Expected Result:** Checkout page loads
- **Assertions:**
  - Selected plan shows in checkout summary
  - Pricing displays
  - Payment form is visible

### 5. Enter Payment Information
- **From:** Checkout/payment page
- **Action:** Fill in Stripe payment details
- **Selectors:**
  - Primary: `[data-testid="stripe-card-element"]`
  - Fallback: `div#card-element` (Stripe)
- **Input Data:** `{cardNumber: "4242424242424242", exp: "12/25", cvc: "123"}`
- **Expected Result:** Payment form is ready
- **Assertions:**
  - Stripe card element is visible
  - Form shows billing address (if required)

### 6. Review Order Summary
- **From:** Checkout page
- **Action:** Verify order details before payment
- **Selectors:**
  - Primary: `[data-testid="order-summary"]`
  - Fallback: `div.order-summary`
- **Expected Result:** Order summary displays
- **Assertions:**
  - Plan name shows
  - Monthly/yearly pricing visible
  - Total amount shows
  - Billing cycle shows

### 7. Submit Payment
- **From:** Checkout page
- **Action:** Click "Complete Purchase" or "Subscribe Now"
- **Selectors:**
  - Primary: `[data-testid="pay-button"]`
  - Fallback: `button:has-text("Subscribe")`
- **Expected Result:** Payment processing starts
- **Assertions:**
  - Button shows loading state
  - Button is disabled

### 8. Payment Confirmation
- **From:** Checkout page (after submission)
- **Action:** Wait for Stripe processing
- **Expected Result:** Redirect to success page
- **Assertions:**
  - URL changes to `/billing/success`
  - Success message displays
  - Confirmation details shown

## Success Outcome
- Subscription is created in Stripe
- Plan is updated in database
- User now has access to upgraded plan features
- Invoice is generated and emailed
- Billing page shows new plan as current

## Alternative Paths

### Path 1: Automatic Upgrade Trigger
- **Trigger:** User hits quota limit and needs to upgrade to continue
- **Outcome:** Upgrade prompt appears inline with feature lock
- **Steps:** Similar to main flow but initiates from blocked action

### Path 2: Downgrade Plan
- **Trigger:** User wants to move to lower tier
- **Outcome:** Confirmation dialog appears
- **Steps:** Confirm downgrade, effective date shown

## Error Cases

### Error 1: Invalid Card
- **Trigger:** User enters invalid card information
- **Error Message:** "Invalid card number"
- **Recovery:** User corrects card details

### Error 2: Card Declined
- **Trigger:** Stripe declines the card (insufficient funds, etc.)
- **Error Message:** "Your card was declined. Please try a different card"
- **Recovery:** User tries different card or contacts support

### Error 3: Invalid Billing Address
- **Trigger:** Billing address validation fails
- **Error Message:** "Please enter a valid billing address"
- **Recovery:** User corrects address

### Error 4: Network Error
- **Trigger:** Network fails during payment processing
- **Error Message:** "Network error. Please check your connection and try again"
- **Recovery:** User retries payment

### Error 5: Stripe API Error
- **Trigger:** Stripe API returns error
- **Error Message:** "Payment processing error. Please try again or contact support"
- **Recovery:** User retries or contacts support

### Error 6: Account Limit Exceeded
- **Trigger:** User exceeds Stripe account limits
- **Error Message:** "This plan is not available for your region. Contact support"
- **Recovery:** User contacts support

### Error 7: Duplicate Subscription
- **Trigger:** User already has active subscription
- **Error Message:** "You already have an active subscription"
- **Recovery:** User is redirected to billing management

## Selector Improvements Needed
- Billing tab: Add `data-testid="billing-tab"`
- Current plan card: Add `data-testid="current-plan-card"`
- View plans button: Add `data-testid="view-plans-button"`
- Plan upgrade buttons: Add `data-testid="upgrade-plan-{planName}"`
- Stripe card element: Add `data-testid="stripe-card-element"`
- Order summary: Add `data-testid="order-summary"`
- Payment submit: Add `data-testid="pay-button"`
- Billing error: Add `data-testid="billing-error"`
- Success page: Add `data-testid="billing-success-message"`

## Test Data Requirements
- Free tier user
- Trial user
- User on Starter plan
- User on Growth plan
- User on Pro plan
- User at quota limit
- Valid test card (4242424242424242)
- Invalid card (4000000000000002)
- Cards from different regions
- Different billing cycles (monthly, annual)
