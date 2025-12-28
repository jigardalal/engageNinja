# Journey: Invite Team Member & Manage Roles

**Priority:** High
**User Type:** Authenticated admin user
**Frequency:** Occasional (monthly for growing teams)
**Business Impact:** Team collaboration, multi-user access
**Preconditions:** User is authenticated, has admin role, team page accessible

## Overview
Workspace admins invite team members to collaborate on campaigns. Invitations are sent via email, members can accept and join workspace with assigned roles.

## Steps

### 1. Navigate to Team Settings
- **From:** Settings page or sidebar
- **Action:** Click "Team" in navigation or navigate to team settings
- **Selectors:**
  - Primary: `[data-testid="nav-team"]`
  - Fallback: `a:has-text("Team")`
- **Expected Result:** Team management page loads
- **Assertions:**
  - Page URL is `/team`
  - Team members list visible
  - "Invite Member" button visible

### 2. Click Invite Member Button
- **From:** Team page
- **Action:** Click "Invite Member" or "+ Add Member"
- **Selectors:**
  - Primary: `[data-testid="invite-member-button"]`
  - Fallback: `button:has-text("Invite")`
- **Expected Result:** Invite modal opens
- **Assertions:**
  - Modal displays
  - Email input field visible
  - Role selector visible
  - Send button visible

### 3. Enter Member Email
- **From:** Invite modal
- **Action:** Enter email address of person to invite
- **Selectors:**
  - Primary: `[data-testid="invite-email"]`
  - Fallback: `input[placeholder*="Email"]`
- **Input Data:** `{email: "team@example.com"}`
- **Expected Result:** Email field populated
- **Assertions:**
  - Email displays in input field
  - Field validates email format

### 4. Select Member Role
- **From:** Invite modal
- **Action:** Choose role for invited member
- **Selectors:**
  - Primary: `[data-testid="invite-role"]`
  - Fallback: `select[name="role"]`
- **Input Data:** `{role: "member"}`
- **Expected Result:** Role selected
- **Assertions:**
  - Role dropdown shows selected value
  - Role description shows (viewer/member/admin)

### 5. Review Permissions
- **From:** Invite modal
- **Action:** Review what permissions role includes
- **Selectors:**
  - Primary: `[data-testid="role-permissions"]`
  - Fallback: `div.permissions-info`
- **Expected Result:** Permissions display for selected role
- **Assertions:**
  - Permissions listed for role
  - Restrictions shown (e.g., viewers can't send campaigns)

### 6. Send Invitation
- **From:** Invite modal
- **Action:** Click "Send Invite" button
- **Selectors:**
  - Primary: `[data-testid="send-invite-button"]`
  - Fallback: `button:has-text("Send")`
- **Expected Result:** Invitation sent
- **Assertions:**
  - Modal closes or shows success
  - Invitation email sent to recipient
  - Member appears in list with "Pending" status

### 7. View Team Members List
- **From:** Team page
- **Action:** Review list of current team members
- **Selectors:**
  - Primary: `[data-testid="team-members-list"]`
  - Fallback: `table.members`
- **Expected Result:** All team members display
- **Assertions:**
  - Member name/email shows
  - Member role shows
  - Member status shows (Active/Pending)
  - Join date shows
  - Action buttons visible

### 8. Change Member Role
- **From:** Team members list
- **Action:** Click on role dropdown for existing member
- **Selectors:**
  - Primary: `[data-testid="member-role-{userId}"]`
  - Fallback: `select[name="role-{userId}"]`
- **Input Data:** `{userId: 123, newRole: "admin"}`
- **Expected Result:** Role dropdown opens
- **Assertions:**
  - Available roles display
  - Current role highlighted

### 9. Confirm Role Change
- **From:** Role dropdown
- **Action:** Select new role to update
- **Selectors:**
  - Primary: `[data-testid="role-option-{role}"]`
  - Fallback: `option:has-text("{role}")`
- **Expected Result:** Role selection submitted
- **Assertions:**
  - Role updates in list
  - Confirmation appears (optional)

### 10. Remove Team Member
- **From:** Team members list
- **Action:** Click delete/remove button for member
- **Selectors:**
  - Primary: `[data-testid="member-remove-{userId}"]`
  - Fallback: `button:has-text("Remove")`
- **Expected Result:** Confirmation dialog appears
- **Assertions:**
  - Confirmation message shows
  - "Confirm" and "Cancel" buttons visible
  - Warning about data access

### 11. Confirm Member Removal
- **From:** Removal confirmation dialog
- **Action:** Click "Confirm" to remove member
- **Selectors:**
  - Primary: `[data-testid="confirm-remove-button"]`
  - Fallback: `button:has-text("Confirm")`
- **Expected Result:** Member removed
- **Assertions:**
  - Member disappears from list
  - Success message shows (optional)
  - Member loses access to workspace

## Success Outcome
- Team members are invited and can join workspace
- Members have appropriate role-based access
- Admin can manage team composition
- Team collaboration enabled

## Alternative Paths

### Path 1: Invite Multiple Members at Once
- **Trigger:** Admin wants to bulk invite
- **Outcome:** CSV upload or multiple email fields
- **Steps:** Similar but handles multiple emails

### Path 2: Resend Invitation
- **Trigger:** Invitation expires or member didn't receive
- **Outcome:** Resend button available on pending members
- **Steps:** Shortened flow - just resend

## Error Cases

### Error 1: Invalid Email Format
- **Trigger:** User enters invalid email address
- **Expected Behavior:** Validation error
- **Error Message:** "Please enter a valid email address"
- **Recovery:** User corrects email

### Error 2: User Already Member
- **Trigger:** Email is already a team member
- **Expected Behavior:** Error or confirmation to re-invite
- **Error Message:** "This user is already a team member"
- **Recovery:** User tries different email or skips

### Error 3: User Already Invited
- **Trigger:** Invitation already sent to this email
- **Expected Behavior:** Warning shown
- **Error Message:** "Invitation already sent. You can resend it"
- **Recovery:** User resends or cancels

### Error 4: Email Send Failed
- **Trigger:** Email service fails
- **Expected Behavior:** Error shown, user can retry
- **Error Message:** "Failed to send invitation email. Please try again"
- **Recovery:** User retries sending

### Error 5: Insufficient Permissions
- **Trigger:** User without admin role tries to invite
- **Expected Behavior:** Access denied
- **Error Message:** "Only admins can invite team members"
- **Recovery:** User contacts workspace admin

### Error 6: Team Limit Exceeded
- **Trigger:** Workspace team limit reached
- **Expected Behavior:** Error with upgrade prompt
- **Error Message:** "Team member limit reached. Upgrade to add more"
- **Recovery:** User upgrades plan

## Selector Improvements Needed
- Team nav: Add `data-testid="nav-team"`
- Invite button: Add `data-testid="invite-member-button"`
- Invite email input: Add `data-testid="invite-email"`
- Invite role select: Add `data-testid="invite-role"`
- Send invite button: Add `data-testid="send-invite-button"`
- Members list: Add `data-testid="team-members-list"`
- Member row: Add `data-testid="member-row-{userId}"`
- Member role selector: Add `data-testid="member-role-{userId}"`
- Remove button: Add `data-testid="member-remove-{userId}"`
- Confirm remove: Add `data-testid="confirm-remove-button"`
- Role permissions info: Add `data-testid="role-permissions"`

## Test Data Requirements
- Inviting new user (no account)
- Inviting existing user
- Changing role (viewer → member → admin)
- Removing member
- Team with 1, 5, 10+ members
- Different role levels (viewer, member, admin, owner)
- Pending invitations
- Expired invitations (if applicable)
