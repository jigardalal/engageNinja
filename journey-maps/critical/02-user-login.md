# Journey: User Login & Authentication

**Priority:** Critical
**User Type:** Registered user (not authenticated)
**Frequency:** Multiple times per session, several times per week
**Business Impact:** Core security and session management - enables access to platform
**Preconditions:** User has account created, user is not currently logged in

## Overview
User login is a critical authentication journey that allows registered users to access their workspace and continue using the platform. This is the primary way users return to the platform.

## Steps

### 1. Navigate to Login Page
- **From:** Home page, any page when not logged in
- **Action:** Navigate to `/login` or click "Login" button
- **Selectors:**
  - Primary: `data-testid="nav-login-button"`
  - Fallback: `a:has-text("Login")`
  - Recommendation: Add `data-testid="nav-login-button"`
- **Expected Result:** User arrives at login page
- **Assertions:**
  - Page URL is `/login`
  - Login form is visible
  - Email and password fields are present
  - "Sign Up" link is visible

### 2. Enter Email Address
- **From:** Login page
- **Action:** Fill email field with registered email
- **Selectors:**
  - Primary: `input[name="email"][type="email"]`
  - Fallback: `label:has-text("Email") + input`
  - Recommendation: Add `data-testid="login-email"`
- **Input Data:** `{email: "john@example.com"}`
- **Expected Result:** Email field value updates
- **Assertions:**
  - Input value is "john@example.com"
  - No validation error appears

### 3. Enter Password
- **From:** Login page
- **Action:** Fill password field
- **Selectors:**
  - Primary: `input[name="password"][type="password"]`
  - Fallback: `label:has-text("Password") + input`
  - Recommendation: Add `data-testid="login-password"`
- **Input Data:** `{password: "SecurePass123!"}`
- **Expected Result:** Password field is masked
- **Assertions:**
  - Input type is "password"
  - Password is not visible in plain text

### 4. Submit Login Form
- **From:** Login page
- **Action:** Click the login/submit button
- **Selectors:**
  - Primary: `button[type="submit"]`
  - Fallback: `button:has-text("Login")`
  - Recommendation: Add `data-testid="login-submit"`
- **Expected Result:** Form submission starts, loading state appears
- **Assertions:**
  - Submit button shows loading state
  - Button is disabled

### 5. Redirect to Tenant Selection or Dashboard
- **From:** Login page (after submission)
- **Action:** Wait for backend authentication
- **Expected Result:** User redirected based on their account configuration
- **Assertions:**
  - If user has 1 tenant: URL changes to `/dashboard`
  - If user has 2+ tenants: URL changes to `/tenants`
  - If platform admin: URL changes to `/admin`
  - Session cookie is set
  - User data is available in auth context

## Success Outcome
- User is authenticated and session is established
- User can access their dashboard or workspace selection page
- Session persists across page navigation
- User can see their profile/account information

## Alternative Paths

### Path 1: Login with Multiple Workspaces
- **Trigger:** User has access to multiple tenants
- **Outcome:** User lands on tenant selection page
- **Steps:** Same as main flow, but ends at `/tenants` instead of `/dashboard`

### Path 2: Login as Platform Admin
- **Trigger:** User has platform admin role
- **Outcome:** User lands on admin dashboard
- **Steps:** Same as main flow, but ends at `/admin` instead of `/dashboard`

### Path 3: "Remember Me" / Auto-login
- **Trigger:** User previously selected "Remember Me" and session still valid
- **Outcome:** Potential auto-login without form submission (if implemented)
- **Steps:** Not applicable if not implemented; document if feature exists

## Error Cases

### Error 1: Empty Email
- **Trigger:** User tries to submit without entering email
- **Expected Behavior:** Validation error appears
- **Selector:** `[data-testid="login-email-error"]`
- **Error Message:** "Email is required"
- **Recovery:** User fills in email

### Error 2: Empty Password
- **Trigger:** User tries to submit without entering password
- **Expected Behavior:** Validation error appears
- **Selector:** `[data-testid="login-password-error"]`
- **Error Message:** "Password is required"
- **Recovery:** User fills in password

### Error 3: Invalid Email Format
- **Trigger:** User enters invalid email format
- **Expected Behavior:** Validation error appears
- **Selector:** `[data-testid="login-email-error"]`
- **Error Message:** "Please enter a valid email address"
- **Recovery:** User corrects email format

### Error 4: Invalid Credentials
- **Trigger:** User enters email/password combination that doesn't exist or is incorrect
- **Expected Behavior:** Generic error message (don't reveal if email exists)
- **Selector:** `[data-testid="login-error"]`
- **Error Message:** "Invalid email or password"
- **Recovery:** User can retry login or click "Forgot Password"

### Error 5: Account Suspended
- **Trigger:** User account has been suspended/deactivated
- **Expected Behavior:** Error message explains account status
- **Selector:** `[data-testid="login-suspended-error"]`
- **Error Message:** "Your account has been suspended. Contact support"
- **Recovery:** User contacts support

### Error 6: Too Many Login Attempts
- **Trigger:** User tries to login multiple times with wrong credentials
- **Expected Behavior:** Account temporarily locked, error message shown
- **Selector:** `[data-testid="login-rate-limit-error"]`
- **Error Message:** "Too many failed login attempts. Please try again in 15 minutes"
- **Recovery:** User waits or contacts support

### Error 7: Network Error
- **Trigger:** Network request fails
- **Expected Behavior:** User-friendly error message
- **Selector:** `[data-testid="login-network-error"]`
- **Error Message:** "Network error. Please check your connection and try again"
- **Recovery:** User retries submission

### Error 8: Server Error
- **Trigger:** Backend server error occurs
- **Expected Behavior:** Generic error message
- **Selector:** `[data-testid="login-server-error"]`
- **Error Message:** "Something went wrong. Please try again later"
- **Recovery:** User retries or contacts support

### Error 9: Session Expired During Submission
- **Trigger:** Session expires between form submission and response
- **Expected Behavior:** Error message and user redirected to login
- **Selector:** `[data-testid="login-session-error"]`
- **Error Message:** "Your session has expired. Please login again"
- **Recovery:** User logs in again

## Selector Improvements Needed
- Email input: Add `data-testid="login-email"`
- Password input: Add `data-testid="login-password"`
- Submit button: Add `data-testid="login-submit"`
- Error container: Add `data-testid="login-error"`
- Email-specific error: Add `data-testid="login-email-error"`
- Password-specific error: Add `data-testid="login-password-error"`
- Signup link: Add `data-testid="login-signup-link"`
- Forgot password link: Add `data-testid="login-forgot-password-link"`

## Test Data Requirements
- Valid email with correct password
- Valid email with incorrect password
- Invalid email format
- Non-existent email
- Suspended account email
- Multiple test accounts with different tenant assignments
- Account with single workspace
- Account with multiple workspaces
- Platform admin account
