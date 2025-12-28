# Journey: User Signup & Account Creation

**Priority:** Critical
**User Type:** Anonymous visitor
**Frequency:** Once per user (high volume on marketing)
**Business Impact:** Entry point to platform - directly affects conversion and user acquisition
**Preconditions:** User is on home page or marketing pages, not logged in

## Overview
This is the critical first-time user onboarding journey. Users provide account information and create their first workspace/tenant during signup. This is a major conversion point.

## Steps

### 1. Navigate to Signup Page
- **From:** Home page, any marketing page
- **Action:** Click "Sign Up" button or navigate to `/signup`
- **Selectors:**
  - Primary: `data-testid="nav-signup-button"`
  - Fallback: `a:has-text("Sign Up")`
  - Recommendation: Add `data-testid="nav-signup-button"` to navbar signup link
- **Expected Result:** User arrives at signup form page
- **Assertions:**
  - Page URL contains `/signup`
  - Signup form is visible
  - All form fields are present (first name, last name, company name, email, phone, password, confirm password)

### 2. Fill Personal Information
- **From:** Signup page
- **Action:** Fill in first name field
- **Selectors:**
  - Primary: `input[name="firstName"]`
  - Fallback: `label:has-text("First Name") + input`
  - Recommendation: Add `data-testid="signup-first-name"`
- **Input Data:** `{firstName: "John"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Input value is "John"
  - No validation error appears

### 3. Fill Last Name
- **From:** Signup page
- **Action:** Fill in last name field
- **Selectors:**
  - Primary: `input[name="lastName"]`
  - Fallback: `label:has-text("Last Name") + input`
  - Recommendation: Add `data-testid="signup-last-name"`
- **Input Data:** `{lastName: "Smith"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Input value is "Smith"

### 4. Fill Company/Workspace Name
- **From:** Signup page
- **Action:** Fill in company name field
- **Selectors:**
  - Primary: `input[name="companyName"]`
  - Fallback: `label:has-text("Company") + input`
  - Recommendation: Add `data-testid="signup-company-name"`
- **Input Data:** `{companyName: "Acme Corp"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Input value is "Acme Corp"

### 5. Fill Email Address
- **From:** Signup page
- **Action:** Fill in email field
- **Selectors:**
  - Primary: `input[name="email"][type="email"]`
  - Fallback: `label:has-text("Email") + input`
  - Recommendation: Add `data-testid="signup-email"`
- **Input Data:** `{email: "john@example.com"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Input value contains valid email format

### 6. Fill Phone Number
- **From:** Signup page
- **Action:** Fill in phone field
- **Selectors:**
  - Primary: `input[name="phone"]`
  - Fallback: `label:has-text("Phone") + input`
  - Recommendation: Add `data-testid="signup-phone"`
- **Input Data:** `{phone: "+1234567890"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Input value is "+1234567890"

### 7. Fill Password
- **From:** Signup page
- **Action:** Fill in password field
- **Selectors:**
  - Primary: `input[name="password"][type="password"]`
  - Fallback: `label:has-text("Password") + input`
  - Recommendation: Add `data-testid="signup-password"`
- **Input Data:** `{password: "SecurePass123!"}`
- **Expected Result:** Password field is masked
- **Assertions:**
  - Input type is "password"
  - Visual indicator shows password strength (if implemented)

### 8. Confirm Password
- **From:** Signup page
- **Action:** Fill in password confirmation field
- **Selectors:**
  - Primary: `input[name="confirmPassword"][type="password"]`
  - Fallback: `label:has-text("Confirm Password") + input`
  - Recommendation: Add `data-testid="signup-confirm-password"`
- **Input Data:** `{confirmPassword: "SecurePass123!"}`
- **Expected Result:** Field value is masked
- **Assertions:**
  - Input type is "password"

### 9. Accept Terms & Conditions
- **From:** Signup page
- **Action:** Check the terms & conditions checkbox
- **Selectors:**
  - Primary: `input[type="checkbox"][name="acceptTerms"]`
  - Fallback: `label:has-text("I agree to") + input`
  - Recommendation: Add `data-testid="signup-accept-terms"` to checkbox
- **Expected Result:** Checkbox is checked
- **Assertions:**
  - Checkbox is checked (`:checked` pseudo-selector)
  - No validation error appears

### 10. Complete ReCAPTCHA
- **From:** Signup page
- **Action:** Complete ReCAPTCHA verification
- **Selectors:**
  - Primary: `iframe[src*="recaptcha"]`
  - Fallback: `div.g_recaptcha`
  - Recommendation: Ensure ReCAPTCHA is always present
- **Expected Result:** ReCAPTCHA token is obtained
- **Assertions:**
  - ReCAPTCHA iframe is visible
  - Submit button is enabled after completion

### 11. Submit Signup Form
- **From:** Signup page
- **Action:** Click signup submit button
- **Selectors:**
  - Primary: `button[type="submit"]`
  - Fallback: `button:has-text("Create Account")`
  - Recommendation: Add `data-testid="signup-submit"`
- **Expected Result:** Form submission initiated, loading state appears
- **Assertions:**
  - Submit button shows loading state (disabled, spinner visible)
  - No navigation yet (waiting for backend response)

### 12. Account Created Successfully
- **From:** Signup page (after form submission)
- **Action:** Wait for backend response
- **Expected Result:** User is redirected to tenants selection or dashboard
- **Assertions:**
  - Page URL changes to `/tenants` or `/dashboard`
  - Success message appears (if applicable)
  - User session is established

## Success Outcome
- User account is created in the system
- First workspace/tenant is created with user as owner
- User is logged in and authenticated
- User can access dashboard and start using the platform

## Alternative Paths

### Path 1: Signup from Pricing Page
- **Trigger:** User clicks "Get Started" on pricing page
- **Outcome:** User arrives at signup with plan context awareness
- **Steps:** Same as main flow, but with pre-selected plan preference

### Path 2: Signup from Marketing CTAs
- **Trigger:** User clicks any "Sign Up" CTA on marketing pages
- **Outcome:** User arrives at signup, may have referral/campaign tracking
- **Steps:** Same as main flow

## Error Cases

### Error 1: Empty First Name
- **Trigger:** User tries to submit form without entering first name
- **Expected Behavior:** Validation error appears, form not submitted
- **Selector:** `[data-testid="signup-error"]` or similar error container
- **Error Message:** "First name is required"
- **Recovery:** User fills in first name and resubmits

### Error 2: Empty Company Name
- **Trigger:** User tries to submit without entering company name
- **Expected Behavior:** Validation error appears
- **Selector:** Error message near company name field
- **Error Message:** "Company or workspace name is required"
- **Recovery:** User fills in company name

### Error 3: Invalid Email Format
- **Trigger:** User enters invalid email (e.g., "notanemail")
- **Expected Behavior:** Validation error appears
- **Selector:** `[data-testid="signup-email-error"]` or inline error
- **Error Message:** "Please enter a valid email address"
- **Recovery:** User corrects email format

### Error 4: Password Too Short/Weak
- **Trigger:** User enters password that doesn't meet requirements
- **Expected Behavior:** Password strength indicator shows, error message appears
- **Selector:** `[data-testid="signup-password-error"]`
- **Error Message:** "Password must be at least 8 characters with uppercase, lowercase, number, and symbol"
- **Recovery:** User enters stronger password

### Error 5: Passwords Don't Match
- **Trigger:** User enters different values in password and confirm password
- **Expected Behavior:** Error appears when they blur confirm password field or submit
- **Selector:** `[data-testid="signup-confirm-error"]`
- **Error Message:** "Passwords do not match"
- **Recovery:** User corrects confirm password field

### Error 6: Email Already Exists
- **Trigger:** User tries to signup with email already in system
- **Expected Behavior:** Backend returns error, error message displayed
- **Selector:** `[data-testid="signup-email-exists-error"]`
- **Error Message:** "Email already registered. Please login or use a different email"
- **Recovery:** User can click "Login" link or try different email

### Error 7: Terms Not Accepted
- **Trigger:** User tries to submit form without checking terms checkbox
- **Expected Behavior:** Error message appears
- **Selector:** `[data-testid="signup-terms-error"]`
- **Error Message:** "You must accept the terms and conditions"
- **Recovery:** User checks the checkbox

### Error 8: ReCAPTCHA Failed
- **Trigger:** ReCAPTCHA verification fails
- **Expected Behavior:** Error message appears, user cannot submit
- **Selector:** `[data-testid="recaptcha-error"]`
- **Error Message:** "Please verify that you are not a robot"
- **Recovery:** User retries ReCAPTCHA

### Error 9: Network Error
- **Trigger:** Network request fails during form submission
- **Expected Behavior:** User-friendly error message, form remains editable
- **Selector:** `[data-testid="signup-network-error"]`
- **Error Message:** "Network error. Please check your connection and try again"
- **Recovery:** User retries submission

### Error 10: Server Error (500)
- **Trigger:** Backend server error occurs
- **Expected Behavior:** Generic error message (don't expose stack traces)
- **Selector:** `[data-testid="signup-server-error"]`
- **Error Message:** "Something went wrong. Please try again later"
- **Recovery:** User retries or contacts support

## Selector Improvements Needed
- Email input: Add `data-testid="signup-email"`
- Password input: Add `data-testid="signup-password"`
- Confirm password input: Add `data-testid="signup-confirm-password"`
- First name input: Add `data-testid="signup-first-name"`
- Last name input: Add `data-testid="signup-last-name"`
- Company name input: Add `data-testid="signup-company-name"`
- Phone input: Add `data-testid="signup-phone"`
- Submit button: Add `data-testid="signup-submit"`
- Terms checkbox: Add `data-testid="signup-accept-terms"`
- Error messages: Add consistent `data-testid="signup-error"` to all error containers
- Login link: Add `data-testid="signup-login-link"`

## Test Data Requirements
- Valid email (not already in system)
- Strong password meeting complexity requirements
- Various company names to test unique constraint
- Valid phone numbers in different formats
- Duplicate email addresses to test existing user error
