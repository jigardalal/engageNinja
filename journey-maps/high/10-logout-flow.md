# Journey: Logout & End Session

**Priority:** High
**User Type:** Authenticated user (any role)
**Frequency:** Daily (at session end)
**Business Impact:** Security, session management
**Preconditions:** User is authenticated, logged in

## Overview
Users logout to end their session securely. This is a critical security flow ensuring proper session cleanup and preventing unauthorized access.

## Steps

### 1. Access User Menu
- **From:** Any authenticated page
- **Action:** Click user menu or profile icon
- **Selectors:**
  - Primary: `[data-testid="user-menu-button"]`
  - Fallback: `button.profile-menu`
- **Expected Result:** User menu dropdown opens
- **Assertions:**
  - Menu appears
  - Logout option visible
  - Other menu items visible (profile, settings, etc.)

### 2. Click Logout
- **From:** User menu
- **Action:** Click "Logout" option
- **Selectors:**
  - Primary: `[data-testid="logout-button"]`
  - Fallback: `a:has-text("Logout")`
- **Expected Result:** Logout process starts
- **Assertions:**
  - Menu closes
  - Loading indicator may appear
  - No error message

### 3. Session Ends
- **From:** Any authenticated page
- **Action:** Backend processes logout
- **Expected Result:** Session is terminated
- **Assertions:**
  - Session cookie cleared
  - Session data removed from backend
  - User state cleared
  - Active tenant context cleared

### 4. Redirect to Login
- **From:** After session ends
- **Action:** Automatic redirect
- **Expected Result:** User redirected to login page
- **Assertions:**
  - URL changes to `/login`
  - Login form displays
  - No authenticated content visible
  - Previous session data not accessible

### 5. Verify Logout Complete
- **From:** Login page
- **Action:** Attempt to access authenticated page directly
- **Selectors:**
  - Primary: `[data-testid="login-form"]`
  - Fallback: `form.login`
- **Expected Result:** Direct access denied
- **Assertions:**
  - Cannot access `/dashboard`
  - Cannot access `/contacts`
  - Redirected back to login
  - Session is truly ended

## Success Outcome
- User is logged out
- Session is securely ended
- User redirected to login page
- All session data cleared
- No residual authentication state

## Alternative Paths

### Path 1: Session Timeout Logout
- **Trigger:** Session expires due to inactivity
- **Outcome:** Automatic logout without user action
- **Steps:** Skip user action, go to session ends

### Path 2: Logout from Settings
- **Trigger:** User logs out from settings page
- **Outcome:** Same as main flow
- **Steps:** Navigate to settings, click logout

### Path 3: Multi-Tab Session Cleanup
- **Trigger:** User logs out in one tab
- **Outcome:** Other tabs should also be logged out
- **Steps:** Verify other tabs detect logout

## Error Cases

### Error 1: Logout Request Fails
- **Trigger:** Network error during logout
- **Expected Behavior:** Error message, retry available
- **Error Message:** "Failed to logout. Please try again"
- **Recovery:** User retries logout or closes tab

### Error 2: Session Already Expired
- **Trigger:** User tries to logout after session expired
- **Expected Behavior:** Graceful handling
- **Error Message:** "Session already ended" (optional)
- **Recovery:** Redirect to login

### Error 3: Server Error
- **Trigger:** Backend throws error during logout
- **Expected Behavior:** Error handled gracefully
- **Error Message:** "An error occurred. Please close your browser"
- **Recovery:** Close browser tab and reopen

### Error 4: Incomplete Cleanup
- **Trigger:** Session data not fully cleared
- **Expected Behavior:** Security concern - prevent
- **Error Message:** N/A (should never happen)
- **Recovery:** Manual cleanup on backend

## Selector Improvements Needed
- User menu button: Add `data-testid="user-menu-button"`
- Logout button: Add `data-testid="logout-button"`
- Login form: Add `data-testid="login-form"`
- Menu dropdown: Add `data-testid="user-dropdown-menu"`
- Profile link: Add `data-testid="user-profile-link"`
- Settings link: Add `data-testid="user-settings-link"`

## Test Data Requirements
- Active authenticated session
- Different user roles (member, admin, owner)
- Different browsers
- Multiple tabs/windows
- Session near timeout
- Network interruption scenarios

## Security Considerations

### Must Verify
- ✅ Session cookie removed
- ✅ Session data cleared from backend
- ✅ Active tenant context cleared
- ✅ Cannot access authenticated endpoints
- ✅ Cannot access cached pages via browser back button
- ✅ CSRF tokens invalidated
- ✅ User state not accessible to other users
- ✅ No sensitive data in logs

### Test Coverage
- Logout behavior on all authenticated pages
- Logout with open modals/popups
- Logout during active operations (campaign send, etc.)
- Multi-tab logout coordination
- Logout with network lag
