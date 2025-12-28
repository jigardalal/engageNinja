# Additional High & Medium Priority Journeys

This document identifies additional journeys that should be created beyond the current 18 (6 critical + 8 high + 4 medium).

## Additional High Priority Journeys (8+ Recommended)

### 1. **View/Search Contact Details**
- **Priority:** High
- **User Type:** Member+
- **Frequency:** Weekly
- **Business Impact:** Contact information lookup
- **Key Steps:**
  - Navigate to contacts
  - Search/filter contacts
  - Click contact to view details
  - View full profile (phone, email, tags, history)
  - View contact message history
  - View contact campaign participation
- **Test Complexity:** High (multiple data views)
- **Selectors Needed:** 15+

### 2. **Delete Contact (Single & Bulk)**
- **Priority:** High
- **User Type:** Admin
- **Frequency:** Occasional
- **Business Impact:** Contact management, data cleanup
- **Key Steps:**
  - Select contact(s)
  - Click delete
  - Confirm deletion
  - Verify removal
  - Handle cascading effects (campaigns, messages)
- **Test Complexity:** High (permission checks, side effects)
- **Selectors Needed:** 12+

### 3. **View & Search Templates**
- **Priority:** High
- **User Type:** Member+
- **Frequency:** Multiple times per session
- **Business Impact:** Template reuse, campaign creation
- **Key Steps:**
  - Navigate to templates
  - Search/filter templates by name, channel
  - Click template to view details
  - View template preview
  - View template usage stats
- **Test Complexity:** Medium
- **Selectors Needed:** 10+

### 4. **Edit/Update Template**
- **Priority:** High
- **User Type:** Member+
- **Frequency:** Occasionally
- **Business Impact:** Template management
- **Key Steps:**
  - Navigate to templates
  - Find template
  - Click edit
  - Modify content
  - Update variables
  - Save changes
  - View updated campaigns using template (if applicable)
- **Test Complexity:** High
- **Selectors Needed:** 15+

### 5. **Delete Template**
- **Priority:** High
- **User Type:** Member+
- **Frequency:** Occasionally
- **Business Impact:** Template cleanup
- **Key Steps:**
  - Navigate to templates
  - Click delete on template
  - Confirm deletion (with warning if template in use)
  - Verify removal from list
  - Check campaigns no longer reference template
- **Test Complexity:** High (dependency checking)
- **Selectors Needed:** 10+

### 6. **View Team Members & Manage Permissions**
- **Priority:** High
- **User Type:** Admin
- **Frequency:** Monthly
- **Business Impact:** Team access management
- **Key Steps:**
  - Navigate to team settings
  - View all team members
  - See member roles and permissions
  - Filter members
  - View member activity/last login
  - Manage member access level
- **Test Complexity:** Medium
- **Selectors Needed:** 12+

### 7. **Resend Invitation to Team Member**
- **Priority:** High
- **User Type:** Admin
- **Frequency:** Occasional
- **Business Impact:** Onboarding
- **Key Steps:**
  - View pending invitations
  - Click resend on expired invitation
  - Resend email
  - Verify invitation status
- **Test Complexity:** Medium
- **Selectors Needed:** 8+

### 8. **View Campaign Draft States**
- **Priority:** High
- **User Type:** Member+
- **Frequency:** Occasional
- **Business Impact:** Campaign refinement
- **Key Steps:**
  - Navigate to campaigns
  - Filter to show drafts only
  - View draft campaigns
  - See which campaigns are ready to send
  - Compare drafts
- **Test Complexity:** Medium
- **Selectors Needed:** 10+

### 9. **Logout Flow**
- **Priority:** High
- **User Type:** Any
- **Frequency:** Daily (session end)
- **Business Impact:** Security, session management
- **Key Steps:**
  - Click user menu
  - Click logout
  - Confirm (if applicable)
  - Session ends
  - Redirected to login page
  - Session data cleared
- **Test Complexity:** Medium
- **Selectors Needed:** 8+

### 10. **View Billing/Invoice History**
- **Priority:** High
- **User Type:** Admin
- **Frequency:** Quarterly
- **Business Impact:** Financial tracking
- **Key Steps:**
  - Navigate to billing
  - View invoice history
  - Filter invoices by date
  - Click invoice to view details
  - Download PDF
  - View payment method
- **Test Complexity:** Medium
- **Selectors Needed:** 10+

---

## Additional Medium Priority Journeys (6+ Recommended)

### 1. **Advanced Contact Filtering**
- **Priority:** Medium
- **User Type:** Member+
- **Frequency:** Monthly
- **Business Impact:** Audience segmentation
- **Key Steps:**
  - Navigate to contacts
  - Click advanced filter
  - Set filter criteria (tags, name, date added, etc.)
  - Apply multiple filters
  - Save filter as preset
  - Clear filters
- **Test Complexity:** High (complex filtering logic)
- **Selectors Needed:** 15+

### 2. **Archive/Unarchive Campaigns**
- **Priority:** Medium
- **User Type:** Member+
- **Frequency:** Monthly
- **Business Impact:** Organization, performance
- **Key Steps:**
  - Navigate to campaigns
  - Select campaign
  - Click archive
  - Confirm archive
  - Verify removed from active list
  - View archived campaigns
  - Unarchive if needed
- **Test Complexity:** Medium
- **Selectors Needed:** 10+

### 3. **Archive/Unarchive Templates**
- **Priority:** Medium
- **User Type:** Member+
- **Frequency:** Monthly
- **Business Impact:** Template organization
- **Key Steps:**
  - Navigate to templates
  - Click archive on template
  - Confirm archive
  - View archived templates
  - Unarchive archived templates
- **Test Complexity:** Medium
- **Selectors Needed:** 8+

### 4. **Update Personal Profile**
- **Priority:** Medium
- **User Type:** Any
- **Frequency:** Rarely (quarterly)
- **Business Impact:** User preferences
- **Key Steps:**
  - Navigate to profile
  - Edit name
  - Edit email
  - Change password
  - Update phone
  - Save changes
- **Test Complexity:** Medium
- **Selectors Needed:** 12+

### 5. **Download Invoices as PDF**
- **Priority:** Medium
- **User Type:** Admin
- **Frequency:** Quarterly
- **Business Impact:** Financial records
- **Key Steps:**
  - Navigate to billing
  - View invoice
  - Click download
  - PDF generates and downloads
  - Verify PDF contains correct data
- **Test Complexity:** Medium
- **Selectors Needed:** 8+

### 6. **View Subscription Changes History**
- **Priority:** Medium
- **User Type:** Admin
- **Frequency:** Rarely (quarterly)
- **Business Impact:** Billing history
- **Key Steps:**
  - Navigate to billing
  - View subscription history
  - See all plan changes
  - View change dates and reasons
  - Filter by date range
- **Test Complexity:** Low
- **Selectors Needed:** 8+

### 7. **Configure Webhooks**
- **Priority:** Medium
- **User Type:** Admin
- **Frequency:** Once per integration
- **Business Impact:** System integration
- **Key Steps:**
  - Navigate to settings
  - Find webhooks section
  - Add webhook URL
  - Select events to trigger
  - Test webhook
  - Save configuration
  - View webhook logs
  - Delete webhook
- **Test Complexity:** High (integration testing)
- **Selectors Needed:** 15+

### 8. **Update Tenant Settings**
- **Priority:** Medium
- **User Type:** Admin
- **Frequency:** Occasionally
- **Business Impact:** Workspace configuration
- **Key Steps:**
  - Navigate to settings
  - Edit tenant name
  - Update business information
  - Configure timezone
  - Set notification preferences
  - Save changes
- **Test Complexity:** Medium
- **Selectors Needed:** 12+

---

## Summary

### Current State
- ✅ 6 Critical journeys (100%)
- ✅ 8 High priority journeys (100%)
- ✅ 4 Medium priority journeys (50%)
- **Total: 18 journeys with comprehensive documentation**

### Recommended Additions
- 🔄 10 Additional high-priority journeys (not yet documented)
- 🔄 8 Additional medium-priority journeys (not yet documented)
- **Total Recommended: 36 journeys**

### Implementation Recommendation

**Phase 1 (Complete):** ✅ 6 critical + 8 high + 4 medium
- Expected effort: 24 hours
- Test readiness: 50%

**Phase 2 (Recommended):** 10 additional high-priority journeys
- Expected effort: 20 hours
- Benefits: 90% test coverage of critical user paths

**Phase 3 (Recommended):** 8 additional medium-priority journeys
- Expected effort: 16 hours
- Benefits: 95%+ comprehensive coverage

**Phase 4 (Optional):** Low-priority edge cases
- Expected effort: 12 hours
- Benefits: Exhaustive documentation

---

## Priority Ranking for Phase 2 & 3

### Must Create First (High Value)
1. **View Contact Details** - Used before every contact action
2. **Delete Contact** - Common maintenance operation
3. **View/Search Templates** - Used every campaign
4. **Logout Flow** - Daily operation, security-critical
5. **Advanced Filtering** - Power user feature
6. **View Billing History** - Admin necessity

### Should Create Soon (Medium Value)
7. **Edit Template** - Template management
8. **Delete Template** - Cleanup operation
9. **View Team Members** - Admin operation
10. **Archive Campaigns** - Organization
11. **Update Profile** - User preference
12. **Download Invoice** - Financial

### Can Create Later (Lower Value)
13. **Resend Invitation** - Occasional
14. **Configure Webhooks** - Advanced integration
15. **View Draft Campaigns** - Campaign planning
16. **Update Tenant Settings** - Rare changes

---

## Next Steps

1. **Choose 5-6 high-priority journeys from Phase 2 list**
2. **Create markdown + JSON for each**
3. **Identify remaining selectors needed** (estimated 100+)
4. **Add to automated test suite**
5. **Coordinate with frontend team on selector implementation**

Would you like me to create markdown and JSON files for any of these additional journeys?
