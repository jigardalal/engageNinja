# UX/UI Modernization Report

## A) Page-by-page modernization plan

This section catalogues every file under `frontend/src/pages/**`, frames its role, and prescribes the shadcn-aligned modernization work needed to meet the growable, glassy EngageNinja aesthetic.

### Pages inventory
- frontend/src/pages/AboutPage.jsx
- frontend/src/pages/AcceptInvitePage.jsx
- frontend/src/pages/admin/AdminDashboard.jsx
- frontend/src/pages/admin/AdminPlansPage.jsx
- frontend/src/pages/admin/AdminTagsPage.jsx
- frontend/src/pages/admin/AdminUsersPage.jsx
- frontend/src/pages/admin/AuditLogPage.jsx
- frontend/src/pages/admin/TenantBillingTab.jsx
- frontend/src/pages/admin/TenantDetailPage.jsx
- frontend/src/pages/admin/TenantEditForm.jsx
- frontend/src/pages/admin/UserDetailPage.jsx
- frontend/src/pages/BillingFailurePage.jsx
- frontend/src/pages/BillingPage.jsx
- frontend/src/pages/BillingSuccessPage.jsx
- frontend/src/pages/CampaignDetailPage.jsx
- frontend/src/pages/CampaignsPage.jsx
- frontend/src/pages/ComparisonPage.jsx
- frontend/src/pages/ContactDetailPage.jsx
- frontend/src/pages/ContactPage.jsx
- frontend/src/pages/ContactsPage.jsx
- frontend/src/pages/CreateCampaignPage.jsx
- frontend/src/pages/CreateTemplatePage.jsx
- frontend/src/pages/DashboardPage.jsx
- frontend/src/pages/HomePage.jsx
- frontend/src/pages/InvoicesPage.jsx
- frontend/src/pages/LoginPage.jsx
- frontend/src/pages/PlatformPage.jsx
- frontend/src/pages/PricingPage.jsx
- frontend/src/pages/PrivacyPage.jsx
- frontend/src/pages/TermsPage.jsx
- frontend/src/pages/ProfilePage.jsx
- frontend/src/pages/ResourcesPage.jsx
- frontend/src/pages/SecurityPage.jsx
- frontend/src/pages/SettingsPage.jsx
- frontend/src/pages/SignupPage.jsx
- frontend/src/pages/SolutionsPage.jsx
- frontend/src/pages/TagsPage.jsx
- frontend/src/pages/TeamPage.jsx
- frontend/src/pages/TenantProfilePage.jsx
- frontend/src/pages/TenantsPage.jsx
- frontend/src/pages/TemplatesPage.jsx
- frontend/src/pages/TemplateDetailPage.jsx
- frontend/src/pages/UsagePage.jsx
### `frontend/src/pages/AboutPage.jsx`
1) Purpose: Tell the EngageNinja story, explain mission, and share how the team and values align with multi-channel operations.
2) Current layout pattern: Hero statement plus stacked Card placeholders for Team, Values, and Careers; minimal hierarchy.
3) Modernization plan:
   - Replace the hero with `PageHeader` (icon, description, helper copy) and add CTA buttons for demos and pricing.
   - Introduce glass cards for values, stats, and initiatives so the story flows in a primary/secondary grid instead of equal placeholders.
4) Shadcn replacement plan:
   - Use `PageHeader`, `Card` (glass variant), `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent` for every block.
   - Replace hero CTAs with `PrimaryAction`/`SecondaryAction`, and add `Badge` chips for tone-setting metadata.
5) Icon plan: hero icon uses `Users`, the “Why EngageNinja” action block uses `Flag`, and values can use `Sparkles`, `Trophy`, and `Compass` for emphasis.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via marketing top nav → hero summary sets the Platform/Solutions story.
   - Primary action directs to demo/contact, secondary to Pricing or Platform deep dive.
8) Complexity estimate: M

### `frontend/src/pages/AcceptInvitePage.jsx`
1) Purpose: Surface the invitation acceptance flow that lets a user claim a tenant slot and optionally sign up or log in.
2) Current layout pattern: Gradient backdrop with a centered custom card and bespoke spinner/alert states handled inline.
3) Modernization plan:
   - Wrap the experience in a glass `Card` with a condensed page header and spacing that matches the rest of the admin shell.
   - Replace custom inline spinner/alerts with `LoadingState`, `ErrorState`, and a success `EmptyState` with iconography and CTA buttons.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardTitle`, and `CardContent` for the form layout.
   - Replace the raw spinner with `LoadingState`, success copy with `EmptyState`, and rely on `Button` + `Input` + `Alert` from `components/ui`.
5) Icon plan: Use `ShieldCheck` or `Users` inside the success state and `LoadingState` icon to reinforce trust.
6) States checklist: Loading (Y – switch to `LoadingState`), Empty (N), Error (Y – `ErrorState`), Success (Y – `EmptyState` or success card).
7) Navigation cues:
   - Entry via `/accept-invite?token=` shared in email or Slack.
   - CTA after acceptance routes to `/dashboard` or prompts login/signup if the token requires auth.
8) Complexity estimate: M

### `frontend/src/pages/admin/AdminDashboard.jsx`
1) Purpose: Platform admin landing page summarizing tenants, users, and quick creation controls.
2) Current layout pattern: `AppShell` header plus a stats grid, card-based filters, tables, and inline dialogs coded with raw markup.
3) Modernization plan:
   - Introduce a `PageHeader` inside the shell to mirror the workspace header (icon, summary, actions) before the stats grid.
   - Convert stats/filter sections into glass `Card`s and move the tenant list/table into the shared `Table` primitive with consistent row actions.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Badge`, and `Table` components for stats, filters, and the tenant list.
   - Replace custom buttons with `Button` variants and move modals to `Dialog` + `States` utilities for loading/error handling.
5) Icon plan: hero/icon uses `ShieldCheck`, filtering cards can lean on `ArrowPathIcon`/`UsersIcon` from Heroicons, row actions get `ChevronRight` decorations.
6) States checklist: Loading (Y – wrap data fetch with `LoadingState`), Empty (Y – show `EmptyState` when no tenants), Error (Y – `ErrorState`), Success (N).
7) Navigation cues:
   - Entry from the Platform Admin nav or account dropdown → stats panel gives quick pulse.
   - Next actions are creating tenants, jumping to audit logs, or drilling into tenant detail.
8) Complexity estimate: L

### `frontend/src/pages/admin/AdminPlansPage.jsx`
1) Purpose: Platform pricing configuration for admins controlling tiers, quotas, and billing defaults.
2) Current layout pattern: `AppShell` with stacked headings, plain form rows, and long tables done with manual markup.
3) Modernization plan:
   - Add a `PageHeader` hero that explains plan management, hero actions for templates or export, and glass reference cards for quota facts.
   - Rebuild the tiers list with `Card` grids and the edit table with `Table` primitives so row actions and statuses are consistent.
4) Shadcn replacement plan:
   - Use `Card`, `Badge`, and `Table` to house plan summaries and `Button`/`Input` for the edit form.
   - Replace custom alerts with `Alert` and `States` components when fetching or saving plans.
5) Icon plan: hero can use `CreditCardIcon`, anchor sections can use `Sparkles` for benefits, and `ShieldCheck` for compliance notes.
6) States checklist: Loading (Y), Empty (Y – show `EmptyState` when no tier), Error (Y), Success (Y – `EmptyState` or subtle toast indicating saved state).
7) Navigation cues:
   - Entry happens via Admin nav → the hero explains the plan context before the table.
   - Next action links to create tier and jump to tenant pricing previews.
8) Complexity estimate: L

### `frontend/src/pages/admin/AdminTagsPage.jsx`
1) Purpose: Manage the global tag taxonomy that spans tenants (tags, categories, visibility).
2) Current layout pattern: Admin shell with form rows and lists built from plain `div`s and `Button`s.
3) Modernization plan:
   - Introduce glass cards summarizing tag usage and default behaviour before the list.
   - Convert the list into a `Table` with filter toolbar, tag chips, and consistent row/multi-select actions.
4) Shadcn replacement plan:
   - Use `Card` for the header copy, `Table` for the tag list, and `Badge` for tag types.
   - `Button`, `Input`, and `States` handle creation errors/loading instead of inline elements.
5) Icon plan: Use `TagIcon` or `Hash` for hero/section icons and `Sparkles` for featured tags.
6) States checklist: Loading (Y – `LoadingState`), Empty (Y – `EmptyState` with CTA), Error (Y), Success (Y).
7) Navigation cues:
   - Entry via admin nav under Tags; CTA invites creating new tag or linking to impacted tenants.
   - Next action is to edit a tag row or navigate to Tenant detail to inspect usage.
8) Complexity estimate: M

### `frontend/src/pages/admin/AdminUsersPage.jsx`
1) Purpose: Platform user roster overview and bulk role changes for admins.
2) Current layout pattern: App shell, search bar, and manual user rows built with `div`s and inline status labels.
3) Modernization plan:
   - Add a `PageHeader` hero with `ShieldCheck` icon to emphasize governance and quick links to invite more admins.
   - Introduce `Table` rows with responsive columns, row actions (view, impersonate), and glass cards for insights (pending invites, active users).
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Button`, `Badge`, and `States` for data states instead of ad-hoc markup.
   - Replace modals with `Dialog` and toast patterns inside `components/ui` when mutating roles.
5) Icon plan: hero uses `UsersIcon`, stats can lean on `IdentificationIcon`, and row actions include `ArrowRightOnRectangleIcon`.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (Y). 
7) Navigation cues:
   - Entry from admin nav (Users) → hero summarizes admin controls.
   - Next actions are to filter by role, edit invites, or jump to tenant-specific users.
8) Complexity estimate: L

### `frontend/src/pages/admin/AuditLogPage.jsx`
1) Purpose: Display all platform-level events for compliance review.
2) Current layout pattern: App shell with table of log entries, filters, and raw pagination.
3) Modernization plan:
   - Layer in a `PageHeader` with a `ClipboardDocumentListIcon`, highlight the retention policy, and surface Export + Refine actions.
   - Use glass cards for filter pills and wrap the log table in a `Card` with sticky headers.
4) Shadcn replacement plan:
   - Replace the custom table with the shared `Table` primitives, and use `Badge`/`Alert` for severity tags.
   - Wrap filter actions/exports into `Button` components and the detail snapshot into `Dialog` if needed.
5) Icon plan: hero uses `ClipboardDocumentListIcon`, severity states use `AlertTriangleIcon`, and each row can display a tiny `ShieldCheckIcon` for trusted events.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (N).
7) Navigation cues:
   - Entry from the Platform Admin dropdown → hero sets expectations for audit review.
   - Next actions are filtering by tenant, exporting, or clicking into a log row for details.
8) Complexity estimate: M

### `frontend/src/pages/admin/TenantBillingTab.jsx`
1) Purpose: Show billing status, invoices, and plan assignments for a single tenant within the admin detail view.
2) Current layout pattern: Inline blocks listing plan/invoice details with ad-hoc spacing.
3) Modernization plan:
   - Replace text-heavy sections with glass cards for plan summary, invoice list, and payment actions.
   - Use `Card` + `Table` components to present invoices and align buttons with the shared styles.
4) Shadcn replacement plan:
   - Leverage `Card`, `CardHeader`, `CardContent`, `Badge`, and `Table` for each section, plus `Button` for actions like downloading PDFs.
   - Surface fetch states with `LoadingState`/`ErrorState` when hitting invoice APIs.
5) Icon plan: employ `CreditCardIcon` for plan card, `ArrowDownCircleIcon` for outstanding invoices, and `ShieldCheckIcon` for compliance notes.
6) States checklist: Loading (Y), Empty (Y for no invoices), Error (Y), Success (Y for payment updates).
7) Navigation cues:
   - Entry from Tenant detail tabs; hero area already contextualized inside AppShell.
   - Next action is to download an invoice, export usage, or adjust the assigned plan.
8) Complexity estimate: M

### `frontend/src/pages/admin/TenantDetailPage.jsx`
1) Purpose: Manage a tenant’s settings, users, billing, and overview from the platform admin context.
2) Current layout pattern: AppShell with mixed sections, modals, and repeated AppShell wrappers for modal states.
3) Modernization plan:
   - Deduplicate hero content via `PageHeader` and surface tenant metadata in glass cards (status, plan, admins).
   - Replace scattered tables/forms with structured `Card`/`Table` sections and align dialogs with the `Dialog` primitive.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Badge`, `Table`, `Button`, and `Dialog` to standardize every section and modal.
   - Leverage `States` (Loading, Error, Empty) around tenant fetches and use `Alert` for permission warnings.
5) Icon plan: hero with `BuildingOffice2Icon`, status cards with `ShieldCheckIcon`, and action buttons with `ArrowRightOnRectangleIcon`.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (Y for updates).
7) Navigation cues:
   - Entry via Admin nav → breadcrumbs indicate Platform vs Tenant context.
   - Next actions include toggling tenant status, editing details, or drilling into billing tabs.
8) Complexity estimate: L

### `frontend/src/pages/admin/TenantEditForm.jsx`
1) Purpose: Provide a modal/form for editing tenant metadata inside admin view.
2) Current layout pattern: Inline form with text inputs, status toggles, and bespoke spacing.
3) Modernization plan:
   - Convert to a `Dialog` anchored from tenant detail with `PageHeader`-style summary and grouped controls.
   - Highlight approval states with subtle glass surfaces and `Badge` chips.
4) Shadcn replacement plan:
   - Use `Dialog`, `Card`, `Label`, `Input`, `Button`, and `Badge` to achieve consistent spacing and actions.
   - Show validation/submit states with `States.ErrorState` and `Button` `loading` props.
5) Icon plan: Add `IdentificationIcon` (Heroicons) or `PenSquareIcon` to signal the editing context.
6) States checklist: Loading (Y), Empty (N), Error (Y), Success (Y – show success copy or toast).
7) Navigation cues:
   - Triggered from Tenant detail card/action menu → context remains within admin shell.
   - Next action is saving changes or canceling back to the tenant overview.
8) Complexity estimate: M

### `frontend/src/pages/admin/UserDetailPage.jsx`
1) Purpose: Show platform user details, roles, tokens, and audit trail for admins.
2) Current layout pattern: AppShell with sections for profile/details and manual action buttons.
3) Modernization plan:
   - Replace header with `PageHeader` (icon/text) describing the record and add CTA (reset password, view audit logs).
   - Lay out the info panels in glass `Card`s (profile, roles, sessions, audit) instead of raw tables.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Button`, `Badge`, and `States` to unify fetch states and action responses.
   - Wrap destructive actions in `Dialog`/`Alert` and rely on the shared `Table` for session lists.
5) Icon plan: Use `IdentificationIcon` for the hero, `LockClosedIcon` for credentials, and `ShieldCheckIcon` for admin status.
6) States checklist: Loading (Y), Empty (Y for missing audit entries), Error (Y), Success (Y for updates).
7) Navigation cues:
   - Entry via Admin Users nav, then hero sets context before showing activity.
   - Next actions include toggling roles, emailing the user, or returning to the dashboard.
8) Complexity estimate: M

### `frontend/src/pages/BillingFailurePage.jsx`
1) Purpose: Surface a clean failure state after Stripe declines or a payment error occurs.
2) Current layout pattern: `AppShell` wrapper with plain content and manual text blocks, no glass styling.
3) Modernization plan:
   - Introduce a `PageHeader` and a glass `Card` summarizing the failure, suggested next steps, and contact info.
   - Replace raw buttons with `Button`/`PrimaryAction` and include an `Alert` style for urgency.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Button`, `Alert`, and `States.ErrorState` as needed.
   - Offer CTA flows (retry link, contact billing) inside `Button` components.
5) Icon plan: Use `XCircle` or `AlertTriangle` to emphasize the failure headline.
6) States checklist: Loading (N), Empty (N), Error (Y – repeated message), Success (N).
7) Navigation cues:
   - Entry from billing webhook or redirect after failed payment.
   - Next action is to retry payment, contact support, or download invoice if available.
8) Complexity estimate: S

### `frontend/src/pages/BillingPage.jsx`
1) Purpose: Tenant billing hub showing plans, payment method, usage, and invoice history.
2) Current layout pattern: `AppShell` with stacked headings, form-like controls, and lists coded via divs and tables.
3) Modernization plan:
   - Use a `PageHeader` referencing billing status, highlight current plan in a glass card, and provide hero CTAs (update card, view invoices).
   - Segment the page into a primary payment panel and secondary invoice/usage lists using glass Cards and `Table`.
4) Shadcn replacement plan:
   - Replace raw forms with `Input`, `Label`, `Button`, and wrap sections in `Card` + `CardContent`.
   - Use `Table` primitives for invoices plus `Alert` for delinquency warnings and `States` for loading invoices.
5) Icon plan: hero icon uses `CreditCardIcon`, plan card can use `ShieldCheck`, and invoices can use `DocumentTextIcon`.
6) States checklist: Loading (Y for API calls), Empty (Y for zero invoices), Error (Y), Success (Y for saved card updates).
7) Navigation cues:
   - Entry from tenant settings or banner linking to billing/she plan.
   - Next actions include updating payment method, downloading past invoices, or contacting finance.
8) Complexity estimate: M

### `frontend/src/pages/BillingSuccessPage.jsx`
1) Purpose: Confirm a successful payment after checkout or billing update.
2) Current layout pattern: AppShell with plain success messaging and grouped links.
3) Modernization plan:
   - Wrap the success text inside a glass `Card` with `PageHeader` styling and icons that reinforce trust.
   - Offer secondary cards linking to invoices or usage insights so the hero doesn’t feel empty.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Button`, and `States.EmptyState` or `LoadingState` transitions depending on fetch needs.
   - Keep CTA buttons consistent with the rest of the tenant UI.
5) Icon plan: Use `CheckCircle` or `ShieldCheck` in the hero, plus `DocumentTextIcon` in the invoice shortcut.
6) States checklist: Loading (N), Empty (N), Error (N), Success (Y – show confirmation card).
7) Navigation cues:
   - Entry follows a successful Stripe webhook or user action.
   - Next actions are to download the invoice, adjust plan, or visit usage dashboards.
8) Complexity estimate: S

### `frontend/src/pages/CampaignDetailPage.jsx`
1) Purpose: Campaign workspace detailing templates, send history, and KPI tiles.
2) Current layout pattern: `AppShell` with stacked sections, tables, and nested components built from raw markup.
3) Modernization plan:
   - Introduce a `PageHeader` hero plus glass primary/secondary cards (overview and timeline) so the metrics and rows break into columns.
   - Replace custom grids with `Card` + `Table` setups, reuse `States` for loading/resend statuses, and keep CTA buttons aligned.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Table`, `Button`, `Badge`, and `States` to unify the data surfaces.
   - Replace local modal controls with `Dialog` + `ActionButtons` for actions like paused/resend.
5) Icon plan: hero uses `Megaphone` or `Sparkles`, secondary KPI cards leverage `BarChart3`, and timeline rows can use `Activity` icons.
6) States checklist: Loading (Y), Empty (Y for no recipients), Error (Y), Success (Y for resends/sends).
7) Navigation cues:
   - Accessed from Campaigns nav/CTA; hero anchors context and indicates campaign status.
   - Next actions include editing the campaign, replaying, or drilling into contact detail.
8) Complexity estimate: L

### `frontend/src/pages/CampaignsPage.jsx`
1) Purpose: Workspace for launching WhatsApp/email campaigns, viewing quotas, filtering by status, and previewing insights.
2) Current layout pattern: `AppShell` with toolbar, grid of cards, and table sections using bespoke markup.
3) Modernization plan:
   - Position a `PageHeader` plus a split layout (primary workspace listing campaigns, secondary KPI panel) aligned with glass styling.
   - Replace the card grid with a single `Table` plus supporting cards for KPI metrics, empty states, and CTA actions.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Badge`, `Button`, and `States` for filters, statuses, and results.
   - Standardize bulk actions with `PrimaryAction`/`SecondaryAction` and rely on the shared `Dialog` for confirmations.
5) Icon plan: hero uses `Megaphone`, KPI cards use `BarChart3`/`ShieldCheck`, and empty states highlight `Activity`.
6) States checklist: Loading (Y), Empty (Y when no campaigns), Error (Y), Success (Y after creation).
7) Navigation cues:
   - Entry from Dashboard or nav; toolbar invites creating new campaigns or filtering by channel.
   - Next action toggles between WhatsApp/email granular filters, editing a campaign, or viewing analytics.
8) Complexity estimate: L

### `frontend/src/pages/ComparisonPage.jsx`
1) Purpose: Compare EngageNinja with competitors across features/capabilities.
2) Current layout pattern: MarketingShell with hero, cards, and feature grid already featuring glass accents.
3) Modernization plan:
   - Validate that the hero uses `PageHeader`, keep glass cards for comparison details, and enhance iconography for clarity.
   - Ensure CTA actions point to Pricing/Signup and add subtle glass backgrounds to the feature list.
4) Shadcn replacement plan:
   - Continue using `Card`, `Badge`, and `Button` primitives; update any remaining legacy markup to `CardContent` and `CardFooter` structure.
   - Keep `Link` wrappers inside `PrimaryAction`/`SecondaryAction` to standardize CTA styles.
5) Icon plan: hero uses `ShieldCheck` or `Sparkles`, feature rows get consistent Lucide icons, and CTA group includes `ArrowRight` cues.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via marketing nav → hero quickly differentiates Platform vs Tenant contexts.
   - Next action invites visitors to schedule demos or review pricing with `PrimaryAction`.
8) Complexity estimate: M

### `frontend/src/pages/ContactDetailPage.jsx`
1) Purpose: Show contact profile, consent status, and engagement history for a selected customer.
2) Current layout pattern: `AppShell` with form-like panels and repeated `div`s for activity tables.
3) Modernization plan:
   - Add a `PageHeader` summarizing contact status, highlight consent badges, and provide hero actions (send message, edit).
   - Split the view into primary contact info cards and secondary activity tables, all wrapped in glass `Card`s.
4) Shadcn replacement plan:
   - Use `Card`, `CardContent`, `Label`, `Input`, `Badge`, and `Table` for detail sections.
   - Use `States` components for loading the contact and resource fetching, and `Dialog` for editing consent.
5) Icon plan: hero icon can be `User`, status chips keep `ShieldCheck`, and activity items can use `MessageSquare`/`Clock` icons.
6) States checklist: Loading (Y), Empty (Y if contact removed), Error (Y), Success (Y after edits).
7) Navigation cues:
   - Entry via Contacts table select or quick action → hero keeps the workspace context.
   - Next action toggles editing, see campaigns, or adjust consent toggles.
8) Complexity estimate: M

### `frontend/src/pages/ContactPage.jsx`
1) Purpose: Capture demos, support requests, and highlight immediate support channels.
2) Current layout pattern: MarketingShell with hero prima plus single contact form card.
3) Modernization plan:
   - Keep the `PageHeader` hero with icon/description and allow dual CTA actions for Start Free and Pricing.
   - Structure the layout into a primary contact form card and a secondary support details card, both in glass, followed by quick tiles.
4) Shadcn replacement plan:
   - Rely on `Card`, `CardHeader`, `CardContent`, `Label`, `Input`, `Button`, and shared spacing utils.
   - Replace custom textarea styles with the Input baseline (matching placeholder, focus states) and use Buttons for actions.
5) Icon plan: `MessageSquare` crowns the hero, `Phone`, `CalendarCheck`, and `Users` illustrate support tiles.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via marketing nav or footer CTA → hero invites short forms.
   - Next action is a demo booking hit or hitting Start Free/Request Pricing for faster onboarding.
8) Complexity estimate: M

### `frontend/src/pages/ContactsPage.jsx`
1) Purpose: Display and manage customer contacts, segments, and tags within the tenant workspace.
2) Current layout pattern: `AppShell` with toolbar, grid of cards, tables, dialog, and custom pagination; suffers from markup errors.
3) Modernization plan:
   - Make the hero a `PageHeader` with search CTA, add loading/empty states via `States`, and reorganize the grid into primary contact table plus sidebar insight cards.
   - Standardize pagination, filters, and modals using shared primitives for spacing and consistency.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Button`, `Badge`, `Input`, `Dialog`, and `States` instead of hand-rolled HTML.
   - Replace custom dropdowns with accessible `Label` + `Input` combos and align buttons with `PrimaryAction`/`SecondaryAction` for bulk actions.
5) Icon plan: hero uses `UsersIcon`, filters use `Filter`/`Tag` icons, and empty states highlight `Search` icon.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (Y).
7) Navigation cues:
   - Entry via tenant nav → hero shows search and upload actions.
   - Next actions include creating a contact, filtering by tags, or exporting data.
8) Complexity estimate: L

### `frontend/src/pages/CreateCampaignPage.jsx`
1) Purpose: Guided campaign creation experience with steps for channels, templates, scheduling, and QA.
2) Current layout pattern: AppShell with a multi-section form, custom grid of fields, and in-place preview panels.
3) Modernization plan:
   - Ensure the top uses `PageHeader` and the workspace splits into a primary form panel plus secondary meta/preview glass card, respecting the new foundations.
   - Replace bespoke inputs with the shared `Input`, use `Card` groupings per step, and adopt consistent button hierarchy for Next/Back/Save.
4) Shadcn replacement plan:
   - Leverage `Label` + `Input`, `Card`, `CardHeader`, `Button`, `Badge`, and `States` to highlight validations.
   - Use `Dialog` only for necessary modals (e.g., template chooser) and unify action buttons via `PrimaryAction`/`SecondaryAction`.
5) Icon plan: hero uses `Megaphone`, steps use `ListChecks`, `Calendar` icons, and decision CTAs feature `Play` or `Sparkles` cues.
6) States checklist: Loading (Y), Empty (N), Error (Y), Success (Y).
7) Navigation cues:
   - Entry from Campaigns list → hero shows current workflow with breadcrumbs.
   - Next actions include saving drafts, previewing the campaign, or returning to the workspace.
8) Complexity estimate: L

### `frontend/src/pages/CreateTemplatePage.jsx`
1) Purpose: Template builder for WhatsApp/email/SMS sequences within the tenant workspace.
2) Current layout pattern: AppShell with multiple sections, editor panels, and custom form controls.
3) Modernization plan:
   - Use `PageHeader` for the hero, align each step within glass `Card`s, and surface CTA actions for saving/testing.
   - Replace raw textareas/generated code blocks with structured fields using `Label` and `Input`, and highlight preview/resend panels with glass cards.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `Badge`, `Button`, `Input`, `Dialog`, and `States` for each form area.
   - Standardize attachments or channel toggles with `Button` groups (Primary/Secondary actions).
5) Icon plan: hero uses `ClipboardCheck`, channel toggles can show `MessageCircle`, `Mail`, and `Zap` (if available) icons.
6) States checklist: Loading (Y), Empty (N), Error (Y), Success (Y).
7) Navigation cues:
   - Entry from Templates list or Settings → hero reminds users of template rules.
   - Next actions are to save draft, preview on WhatsApp, or send a test.
8) Complexity estimate: L

### `frontend/src/pages/DashboardPage.jsx`
1) Purpose: Tenant home base showing KPIs, open tasks, and quick actions for campaigns/contacts.
2) Current layout pattern: AppShell with multiple card grids, stats, and custom widgets (some recent updates may already embraced new hero/layouts).
3) Modernization plan:
   - Keep a `PageHeader` summarizing workspace, then build a dual-panel layout (primary workspace + secondary insights) with glass cards per guideline.
   - Strive for one primary chart/table and a smaller insight panel, converting the multi-card grid into at least two logical sections.
4) Shadcn replacement plan:
   - Use `Card`, `Badge`, `Button`, `Table`, and `States` for KPIs, lists, and status indicators instead of ad-hoc boxes.
   - Standardize CTA buttons with `PrimaryAction`/`SecondaryAction` and move to `Dialog`/`Alert` for risky actions.
5) Icon plan: hero uses `BarChart3`, KPI cards use `Sparkles`/`ShieldCheck`, and quick actions include `Plus` icons.
6) States checklist: Loading (Y), Empty (Y for cards without data), Error (Y for data fetch), Success (Y for actions like resolved tasks).
7) Navigation cues:
   - Entry from AppShell nav gap; hero shows overall health of WhatsApp/email campaigns.
   - Next actions are to create campaigns, sync contacts, or open usage dashboards.
8) Complexity estimate: L

### `frontend/src/pages/HomePage.jsx`
1) Purpose: Marketing landing page capturing platform promise, hero CTA, and feature highlights.
2) Current layout pattern: MarketingShell with hero, feature stripes, and cards (already modernized with glass touches per prior work).
3) Modernization plan:
   - Validate that the hero uses `PageHeader`, that callouts keep glass cards, and that there is clear CTA to Platform/Solutions.
   - Add icon-led feature rows, glass metrics, and highlight trust signals with badges.
4) Shadcn replacement plan:
   - Continue using `Card`, `Button`, `Badge`, and `Link` wrappers inside `PrimaryAction`/`SecondaryAction` to ensure consistent typographic rhythm.
   - Ensure feature lists use `CardContent` blocks and maintain spacing with `CardDescription`.
5) Icon plan: hero icon `Sparkles`, feature cards rely on `Lucide` icons already in place, and CTA actions can use `ArrowRight` variants.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry through root URL or nav (Platform/Solutions); hero segues to Platform vs Tenant IA.
   - Next actions are scheduling a demo, watching a video, or exploring Pricing.
8) Complexity estimate: M

### `frontend/src/pages/InvoicesPage.jsx`
1) Purpose: Tenant invoice archive where users download receipts and check statuses.
2) Current layout pattern: `AppShell` with intro text and list of invoices; currently manual markup for the list.
3) Modernization plan:
   - Use `PageHeader`, show clarifying metadata (billing period), and present invoices inside a `Table` plus glass cards to explain payment terms.
   - Add filter chips or date selectors alongside the table for faster finds.
4) Shadcn replacement plan:
   - Use `Card`, `CardContent`, `Table`, `Badge`, `Button`, and `States` to display invoice rows, statuses, and call-to-action downloads.
   - Replace plain `<ul>` lists with the `Table` primitive for consistent responsive behavior.
5) Icon plan: hero icon `DocumentText`, statuses use `CheckCircle` or `AlertTriangle`, download actions use `ArrowDown`. 
6) States checklist: Loading (Y for API), Empty (Y for no invoices), Error (Y), Success (N).
7) Navigation cues:
   - Entry from Billing nav or CTA → hero emphasises usage vs plan.
   - Next actions include downloading PDFs, emailing finance, or moving to the Billing page.
8) Complexity estimate: M

### `frontend/src/pages/LoginPage.jsx`
1) Purpose: Authenticate users (platform admins and tenant members) with clear context about roles and test credentials.
2) Current layout pattern: Gradient page with a centered `Card` that holds the form, alerts, and credential snippets.
3) Modernization plan:
   - Keep the centered `Card` but align spacing/typography with the new spacing scale, add a subtle hero header inside the card, and introduce `States.ErrorState` for failures.
   - Build the credential list as structured `CardContent` blocks (maybe collapsed per role) and maintain consistent button sizing.
4) Shadcn replacement plan:
   - Continue using `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Input`, `Label`, `Button`, and upgrade alerts to `States.ErrorState` when appropriate.
   - Add `Badge` or `Alert` icons to highlight test credentials.
5) Icon plan: Use `LockIcon` or `ShieldCheck` in the card header to reinforce security.
6) States checklist: Loading (Y – while logging in), Empty (N), Error (Y), Success (Y – redirect).
7) Navigation cues:
   - Entry via `/login` or redirects from workspace, hero explains current platform context.
   - Next actions are logging in, toggling to signup, or contacting support via CTA links.
8) Complexity estimate: M

### `frontend/src/pages/PlatformPage.jsx`
1) Purpose: Highlight EngageNinja’s platform capabilities for multi-channel campaigns, dashboards, and governance.
2) Current layout pattern: MarketingShell with hero, glass cards, KPIs, and a help sidebar (already matching the new aesthetic).
3) Modernization plan:
   - Validate hero `PageHeader` + CTA arms and continue using glass KPI cards and `Card` stacks for sections.
   - Ensure supporting copy uses `CardDescription` and the sidebar stays in the “secondary panel” role.
4) Shadcn replacement plan:
   - Continue leveraging `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `Badge`, and `Button` for feature explanations.
   - Replace any remaining raw divs with properly structured `CardContent` containers.
5) Icon plan: hero uses `Layers`/`BarChart3`, strengths list includes `ShieldCheck`, `Sparkles`, and `Database` to align with Platform messaging.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry from marketing nav; the hero or badge differentiates Platform vs Tenant story.
   - Next action drives visitors to Pricing, Comparison, or Resources.
8) Complexity estimate: M

### `frontend/src/pages/PricingPage.jsx`
1) Purpose: Present the pricing tiers and FAQ for EngageNinja.
2) Current layout pattern: MarketingShell with hero, billing toggle, tier grid, FAQ, and alert (already structured around shared components).
3) Modernization plan:
   - Confirm hero uses `PageHeader`, keep billing toggle polish, and ensure each tier remains a glass card with consistent CTA buttons.
   - Refresh FAQ and alert sections with `Card`+`Alert` combos, leaving room for new copy or metrics.
4) Shadcn replacement plan:
   - Maintain use of `Card`, `CardContent`, `CardHeader`, `Badge`, `Button`, `PrimaryAction`, `SecondaryAction`, and `Alert`.
   - Keep inline `Check` icons with `CardContent` bullet lists.
5) Icon plan: hero uses `CreditCard`, FAQ uses `Sparkles`, and `Check` icons accent features.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via Pricing nav; hero CTA toggles between monthly/yearly and includes plan action buttons.
   - Next actions include booking a demo or signing up.
8) Complexity estimate: M

### `frontend/src/pages/PrivacyPage.jsx`
1) Purpose: Reassure visitors about data handling, collection, and retention practices.
2) Current layout pattern: MarketingShell with hero and stacked content sections (now upgraded to hero + glass cards).
3) Modernization plan:
   - Keep the `PageHeader`, data highlight cards, and policy sections within glass panels, ensuring clarity around requests and access controls.
   - Maintain the CTA button linking to contact/privacy team while keeping hero metadata clean.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `CardTitle`, `Badge`, and `Button` in each section.
   - Replace free-form `<p>` groups with structured `CardContent` text so spacing is uniform.
5) Icon plan: hero uses `ShieldCheck`, highlight cards use `Database`, `Lock`, and `KeyRound` icons.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via Privacy nav or footer; hero sets tone for policies.
   - Next actions include emailing the privacy team or reviewing billing documents.
8) Complexity estimate: M

### `frontend/src/pages/ProfilePage.jsx`
1) Purpose: Let the authenticated user update personal info, timezone, and password within their tenant context.
2) Current layout pattern: `AppShell` with `PageHeader`, two cards for profile + password forms, and inline alerts (already aligned with shared primitives).
3) Modernization plan:
   - Strengthen the grid spacing by marking the cards as glass variant and ensure the form spacing follows the shared scale.
   - Keep the hero description, but add icon-led helper text for password security and use `States` for fetch/save statuses.
4) Shadcn replacement plan:
   - Continue using `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Button`, `Input`, `Label`, and `Alert`/`States` for messaging.
   - Replace the native `<select>` with a styled list that uses shared classes and ensure buttons use `PrimaryAction`/`SecondaryAction` semantics.
5) Icon plan: hero uses `User`, password card uses `KeyRound`, and alerts can include `ShieldCheck` for success.
6) States checklist: Loading (Y for profile fetch), Empty (N), Error (Y), Success (Y for updates).
7) Navigation cues:
   - Entry from account dropdown or AppShell nav; hero keeps the profile identity center.
   - Next action is saving info, changing password, or logging out via the dropdown.
8) Complexity estimate: M

### `frontend/src/pages/ResourcesPage.jsx`
1) Purpose: Surface knowledge base, guides, and proofs to help customers implement EngageNinja.
2) Current layout pattern: MarketingShell with hero, cards, and grid of resource tiles (already following glassy style).
3) Modernization plan:
   - Keep a `PageHeader` hero, ensure resource cards stay glass, and pair each tile with consistent typography and `Badge` labels.
   - Add an icon-led metrics strip or CTA to submit a support request if manual guidance is needed.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Badge`, `Button`, and `Link` `PrimaryAction`s for each resource item.
   - Maintain consistent spacing via `CardDescription` and avoid raw `<div>` lists wherever possible.
5) Icon plan: hero uses `BookOpen`, resource cards leverage `Sparkles`/`ShieldCheck`, and CTA uses `ArrowRight` icons.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry through Resources nav; each card invites visitors to tutorials or downloads.
   - Next actions include scheduling hands-on help or bookmarking the resource.
8) Complexity estimate: M

### `frontend/src/pages/SecurityPage.jsx`
1) Purpose: Communicate security posture, compliance focus, and operational controls for EngageNinja.
2) Current layout pattern: MarketingShell with hero plus grid of cards; now replaced with PageHeader + glass cards/w stats.
3) Modernization plan:
   - Ensure the hero uses `PageHeader`, highlight compliance insights via glass metrics, and keep the strategic pillars in secondary cards.
   - Pair each focus area with icon-labeled cards and maintain CTA flows to contact or pricing.
4) Shadcn replacement plan:
   - Use `PageHeader`, `Card`, `CardHeader`, `CardContent`, `Badge`, `Button`, and `Fields` (via `CardTitle`/`CardDescription`).
   - Surface insights inside `Card`s and wrap hero actions with `PrimaryAction`/`SecondaryAction`.
5) Icon plan: hero uses `ShieldCheck`, stats use `ShieldStar`/`Database`, and pillars use `Lock`, `ClipboardCheck`, and `KeyRound` icons.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via Security nav; hero draws attention to compliance and trust signals.
   - Next actions include contacting security or reviewing the SOC 2 plan.
8) Complexity estimate: M

### `frontend/src/pages/SettingsPage.jsx`
1) Purpose: Tenant settings portal unifying channels, integrations, templates, tags, billing, and team controls.
2) Current layout pattern: AppShell with tabs and a large settings form; lots of custom sections and modals.
3) Modernization plan:
   - Introduce a persistent `PageHeader`, tiered sections (Primary workspace + secondary details), and consistent card/accordion structures for each tab.
   - Ensure each tab's controls align with the shared form layout rules, and stateful sections use `States` comps.
4) Shadcn replacement plan:
   - Standardize on `Card`, `CardHeader`, `CardContent`, `Label`, `Input`, `Button`, `Table`, `Dialog`, and `States` across tabs rather than bespoke markup.
   - Use `Navigation` pills for tab selection and move repeated `Button` patterns into `PrimaryAction`/`SecondaryAction` wrappers.
5) Icon plan: Use `Cog6Tooth` for the hero, `ShieldCheck` for security channels, `CreditCardIcon` for billing, and `UserGroupIcon` for team sections.
6) States checklist: Loading (Y), Empty (Y for each tab w/ no data), Error (Y), Success (Y for saves).
7) Navigation cues:
   - Entry from the account dropdown or nav; tabs split Platform vs Tenant scopes but share the hero.
   - Next actions are toggling channel settings, updating billing, or copying API keys.
8) Complexity estimate: L

### `frontend/src/pages/SignupPage.jsx`
1) Purpose: Collect new tenant signup data and route users into the workspace or onboarding.
2) Current layout pattern: Likely a centered card with form fields and contextual copy (similar to login).
3) Modernization plan:
   - Center the form inside a glass `Card`, add hero copy with `PageHeader` features, and keep CTA/secondary options for login.
   - Clearly show steps (plan selection, contact info) and use `States` for validation and API feedback.
4) Shadcn replacement plan:
   - Use `Card`, `Input`, `Label`, `Button`, `Badge`, and `Alert` or `States` components for success/failure.
   - Ensure the form uses the same spacing scale and button variants as the login page.
5) Icon plan: Add `Sparkles` or `ShieldCheck` to the hero to reinforce trust.
6) States checklist: Loading (Y), Empty (N), Error (Y), Success (Y).
7) Navigation cues:
   - Entry via `/signup` or marketing hero CTA.
   - Next actions include filling out the form, navigating to login, or contacting support.
8) Complexity estimate: M

### `frontend/src/pages/SolutionsPage.jsx`
1) Purpose: Explain how EngageNinja solves industry-specific challenges for marketing/operations teams.
2) Current layout pattern: MarketingShell with hero, solution sections, and CTA blocks that already follow the glass-modern style.
3) Modernization plan:
   - Keep the hero as a `PageHeader`, highlight verticals in glass cards, and ensure CTA buttons link to relevant features or demos.
   - Add icon-led story cards and small highlight badges for metrics or customer proof.
4) Shadcn replacement plan:
   - Continue using `Card`, `CardHeader`, `CardContent`, `Badge`, and `Button` per tile.
   - Replace ad-hoc stat rows with `CardContent` grids and consistent `CardDescription` text.
5) Icon plan: Use `Sparkles`, `Layers`, or `ShieldCheck` icons to differentiate use cases, and tie CTAs to `ArrowRight` accents.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry sits under Solutions nav linking to targeted pain points.
   - Next actions include scheduling a walkthrough or exploring resources relevant to each vertical.
8) Complexity estimate: M

### `frontend/src/pages/TagsPage.jsx`
1) Purpose: Provide tenant-specific tag management for organizing contacts and campaigns.
2) Current layout pattern: `AppShell` with tag list/grid and settings controls, currently using a mix of custom buttons and cards.
3) Modernization plan:
   - Add a `PageHeader`, incorporate a consistent toolbar (search, filters), and show tag clusters in a `Table` or glass chips grid.
   - Keep the secondary panel for tag usage insights or quick actions.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Button`, `Input`, `Badge`, and `States` to replace ad-hoc markup.
   - Use `Dialog` for creation/edit flows and `ActionButtons` for bulk actions.
5) Icon plan: hero uses `TagIcon`, tag rows use `Hash`, and CTAs include `Plus` or `ArrowRight` icons.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (Y).
7) Navigation cues:
   - Entry via Settings dropdown → hero reaffirms the tenant scope.
   - Next actions: add or edit tags, run batch operations, inspect usage.
8) Complexity estimate: M

### `frontend/src/pages/TeamPage.jsx`
1) Purpose: Admin view for tenant teams (members, roles, invitations).
2) Current layout pattern: `AppShell` with lists/forms for members, invites, and role toggles.
3) Modernization plan:
   - Provide a `PageHeader` hero, split the screen into workspace (member table) and insight panel (pending invites), and use glass cards to host actions.
   - Standardize the invite form using `Label` + `Input` and show modals/dialogs with `Dialog`.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Button`, `Badge`, and `States` for the member list, along with `Dialog` for invite flows.
   - Replace custom toggles with `Button` groups and `Badge` statuses.
5) Icon plan: hero uses `UserGroupIcon`, member rows use `ShieldCheckIcon` for admins, and invites highlight `MailIcon`.
6) States checklist: Loading (Y), Empty (Y for no members), Error (Y), Success (Y for invites sent).
7) Navigation cues:
   - Entry via tenant settings nav (Team tab); hero highlights collaboration and roles.
   - Next actions: invite team members, change roles, or revoke access.
8) Complexity estimate: M

### `frontend/src/pages/TenantProfilePage.jsx`
1) Purpose: Display tenant-level metadata, API keys, region settings, and integrations for admins.
2) Current layout pattern: AppShell with multiple sections, forms, and tables; may include modals for API keys.
3) Modernization plan:
   - Use `PageHeader`, highlight tenant status badges, and organize panels into glass cards for metadata, API keys, webhooks, and region controls.
   - Standardize forms (Label + Input), and elevate toggles into card-footers.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Badge`, `Button`, `Input`, and `States` for each subsection.
   - Wrap API key creation in `Dialog` and show copy-to-clipboard actions via `Button` variants.
5) Icon plan: hero uses `BuildingOffice2Icon`, API key cards use `KeyRound`, and webhooks use `BoltIcon`.
6) States checklist: Loading (Y), Empty (Y for missing keys), Error (Y), Success (Y for edits).
7) Navigation cues:
   - Entry from tenant settings or admin shell; hero describes the tenant profile focus.
   - Next actions include regenerating keys, updating region, or copying connection info.
8) Complexity estimate: L

### `frontend/src/pages/TenantsPage.jsx`
1) Purpose: Allow users with multiple tenants to switch between them and see quick metrics per tenant.
2) Current layout pattern: `AppShell` showing a table/list of tenants with statuses, search, and switch buttons.
3) Modernization plan:
   - Build a `PageHeader` hero, add glass cards for each tenant summary, and keep the table/list accessible with `Table` components.
   - Surface platform role indicators with badges and include CTA to request access.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Badge`, `Button`, `States`, and `Dialog` for invitation flows.
   - Replace manual search controls with `Input` + `Button` combos.
5) Icon plan: hero uses `BuildingOffice2Icon`, status chips use `ShieldCheck`, and switch buttons use `ArrowRightOnRectangleIcon`.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (Y when switching tenants).
7) Navigation cues:
   - Entry from account menu or `/tenants` route; hero underscores multi-tenant access.
   - Next actions: switch tenants, request access, or reach out to admins.
8) Complexity estimate: M

### `frontend/src/pages/TemplatesPage.jsx`
1) Purpose: Template management hub with lists of WhatsApp/email templates, statuses, and approval flows.
2) Current layout pattern: `AppShell` with table/list, filters, and CTA buttons; uses custom markup for approvals.
3) Modernization plan:
   - Add `PageHeader`, primary workspace list, and secondary insight panel (e.g., pending approvals) using glass cards.
   - Uniformly use `Table` for the list, present statuses via `Badge`, and show CTA to create new templates.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Badge`, `Button`, `Dialog`, and `States` to handle filters, statuses, and modal confirmations.
   - Replace ad-hoc checkboxes with consistent `Button` groups and `Input` for search.
5) Icon plan: hero uses `ClipboardList` or `Sparkles`, pending approvals use `Clock` icons, and CTAs use `PlusCircle`.
6) States checklist: Loading (Y), Empty (Y), Error (Y), Success (Y when approvals change).
7) Navigation cues:
   - Entry from Settings or Templates nav; hero introduces the template workflow.
   - Next actions include creating a template, approving, or editing.
8) Complexity estimate: M

### `frontend/src/pages/TemplateDetailPage.jsx`
1) Purpose: Provide detailed view of a single template with channel previews, approvals, and send history.
2) Current layout pattern: `AppShell` with multiple sections, form controls, preview toggles, and tables.
3) Modernization plan:
   - Use `PageHeader` to present the template name plus quick status badges and embed preview/approvals inside glass cards.
   - Align preview toggles and channel selectors with card-footers or pill groups, and keep timeline tables standardized.
4) Shadcn replacement plan:
   - Use `Card`, `Table`, `Badge`, `Button`, `Input`, `Dialog`, and `States` for confirmations.
   - Convert preview panes to dedicated card bodies with consistent spacing.
5) Icon plan: hero uses `ClipboardCheck`, channel tabs use `MessageCircle`/`MailIcon`, and approvals use `ShieldCheck`.
6) States checklist: Loading (Y), Empty (Y when no approvals), Error (Y), Success (Y after updates).
7) Navigation cues:
   - Entry from Templates list; hero continues to remind which template is active.
   - Next actions involve editing, resending to test contacts, or cloning.
8) Complexity estimate: L

### `frontend/src/pages/UsagePage.jsx`
1) Purpose: Admin-only view for usage dashboards, quotas, and tenant/vercel metrics.
2) Current layout pattern: `AppShell` with charts, tables, and manual indicator rows.
3) Modernization plan:
   - Introduce a `PageHeader`, glass cards for quota status, and a secondary insights column per the “primary workspace + secondary” rule.
   - Use `Table` plus `Card` components for detailed usage events, update the timeline with `States`, and maintain CTA to reset quotas or export data.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `Badge`, `Table`, `Button`, and `States` to represent usage metrics consistently.
   - Replace custom chart captions with `CardDescription`/`Badge` combos.
5) Icon plan: hero uses `ArrowTrendingUpIcon`, quota cards use `ShieldCheck`, and alerts use `AlertTriangleIcon`.
6) States checklist: Loading (Y), Empty (Y for zero usage), Error (Y), Success (Y for exports).
7) Navigation cues:
   - Entry via nav (Usage) restricted to admins; hero clarifies platform role.
   - Next actions include exporting logs, drilling into tenants, or refreshing usage.
8) Complexity estimate: L
### `frontend/src/pages/TermsPage.jsx`
1) Purpose: Publish the Terms of Service that all tenants agree to.
2) Current layout pattern: Marketing shell with hero and stacked policy cards (recently sanitized into glass sections).
3) Modernization plan:
   - Keep the `PageHeader`, reinforce hero messaging with the `Scales` icon, and spread policy sections into a grid of glass `Card`s.
   - Add a secondary CTA card linking to contact/legal questions and ensure each headline uses `CardTitle` + `CardDescription`.
4) Shadcn replacement plan:
   - Use `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `Button`, and `Badge` consistently.
   - Align policy paragraphs with `CardContent` spacing and ensure hero CTAs wrap inside `PrimaryAction`/`SecondaryAction`.
5) Icon plan: hero uses `Scales`, policy cards use `ShieldCheck`, `FileAlert`, and `Handshake` icons to differentiate sections.
6) States checklist: Loading (N), Empty (N), Error (N), Success (N).
7) Navigation cues:
   - Entry via Terms nav or footer; hero explains how terms govern Platform vs Tenant scopes.
   - Next actions are to contact legal, read the privacy page, or view billing policies.
8) Complexity estimate: M

## B) Custom → Shadcn conversion map

- **Buttons & CTAs**
  - Custom: `<button className="bg-primary rounded-full px-5 py-2 text-white">Save</button>`
  - Shadcn:
    ```jsx
    <PrimaryAction>Save</PrimaryAction>
    ```
    (Wrap legacy anchors inside `PrimaryAction`/`SecondaryAction` for consistent hover/press states.)
  - Search tip: `rg "<button className=\\"bg-primary" frontend/src/pages`

- **Form fields & labels**
  - Custom: `<label className="text-xs">Email</label><input className="border" />`
  - Shadcn:
    ```jsx
    <Label htmlFor="email">Email</Label>
    <Input id="email" placeholder="email@company.com" />
    ```
    (Combine `Label` + `Input` for accessible focus outlines and consistent spacing.)
  - Search tip: `rg "<label className=\\".*text-xs" frontend/src/pages`

- **Cards & surface panels**
  - Custom: `<div className="rounded-2xl border border-white/10 p-6">...</div>`
  - Shadcn:
    ```jsx
    <Card variant="glass" className="space-y-4">
      <CardHeader>...</CardHeader>
      <CardContent>...</CardContent>
    </Card>
    ```
  - Search tip: `rg "rounded-2xl border" frontend/src/pages`

- **Tables & list layouts**
  - Custom: `<div className="grid grid-cols-4">` with manual headers/rows.
  - Shadcn:
    ```jsx
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>...</TableBody>
    </Table>
    ```
  - Search tip: `rg "<tr" frontend/src/pages | head`

- **States (loading/empty/error)**
  - Custom: inline spinner `<div className="animate-spin" />` and copy.
  - Shadcn:
    ```jsx
    <LoadingState message="Fetching contacts" />
    <EmptyState title="No campaigns yet" />
    <ErrorState title="Oops" />
    ```
  - Search tip: `rg "animate-spin" frontend/src/pages`
## C) Design system rules
- **Spacing scale:** Use multiples of 8px (8/16/24/32/40) for gutters and stack spacing; apply 24px padding inside cards and 16px between sections to keep layouts airy without rescaling per page.
- **Typography scale:** Hero titles stay at 3xl/4xl, section headings use 2xl, body copy at 1rem with 1.5 line-height, and metadata/muted text at 0.8rem; apply `CardTitle`/`CardDescription` helpers to enforce these sizes.
- **Button hierarchy:** Primary `Button`/`PrimaryAction` for high-impact CTAs, secondary `Button` for ghost/outline tasks, `GhostAction` for tertiary links, and `DestructiveAction` for irreversible steps; always include hover/focus outlines to match existing variants.
- **Form layout:** Pair every field with `Label`, then use `Input` (and styled `textarea` classes when needed); show errors via `States.ErrorState` or inline text below the field, and keep buttons clustered right/bottom.
- **Table rules:** Wrap tables with a toolbar that includes filters/actions, use `TableHeader`/`TableBody` from `components/ui`, keep responsive wrappers (min-width), and add row actions via icon buttons in the last column.
- **Glassmorphism rules:** Only use `Card` with `variant="glass"` for hero panels, secondary insights, or modal surfaces; avoid glass behind dense data (tables/forms) to keep legibility high.
## D) Navigation evaluation (presentation only)
- **Current Platform vs Tenant nav tree**
  - Marketing/top nav: `Navbar` exposes Platform, Solutions, Pricing, Comparison, Resources, Security, About, plus Login/Signup controls and theme toggle.
  - Tenant nav (AppShell): `NavPills` with Dashboard, Contacts, Campaigns, (Usage when user is owner/admin) plus dropdowns for Settings (Channels, Tenant Profile, Tags, Templates, Team, Billing) and optional admin scopes (Admin Console, Tenants, Plans, Users, Audit Logs, Tags).
  - Admin nav: `NavPills` switch to Platform Admin, Tenants, Plans, Users, Audit Logs, Tags and includes account menus for switching between admin/tenant views.

- **Option A – Keep top nav**
  - Scan-ability: 4 (top nav already organizes marketing content clearly).
  - Depth: 3 (nested tenant/admin tasks tucked into dropdowns).
  - Workspace: 4 (AppShell nav stays fixed at the top, retaining momentum).
  - Growth: 3 (hard to add new categories without crowding the nav).
  - Mobile: 3 (dropdowns and hamburger manage overflow but could be tighter).
  - Summary: Keep the top nav for marketing, but polish dropdown cues and use icon badges for new sections.

- **Option B – Hybrid (top scope switcher + sidebar)**
  - Scan-ability: 5 (scope switcher plus sidebar distinctly separate scopes).
  - Depth: 5 (sidebar surfaces Platform + Tenant + Admin items without drop-down menus).
  - Workspace: 4 (sidebar adds horizontal real estate but can collapse).
  - Growth: 5 (easy to extend with new sidebar groups or badges).
  - Mobile: 3 (requires responsive collapse and swipe management, but manageable).
  - Summary: Minimal change plan—keep top nav for marketing, add a collapsible sidebar inside AppShell for tenant/admin nav, and sync the Platform vs Tenant scope switcher with AppShell header states.

- **Option C – Sidebar-only**
  - Scan-ability: 3 (sidebar removed from marketing, forcing deeper discovery).
  - Depth: 4 (sidebar can nest, but switching between Platform/Tenant requires extra steps).
  - Workspace: 5 (dedicated sidebar frees up horizontal slices for workspaces).
  - Growth: 4 (new entries easily slotted into expansion panels).
  - Mobile: 2 (sidebars consume screen space and need drawer handling).
  - Summary: Too disruptive for marketing visitors; keeping marketing nav separate while adding a tenant/admin sidebar is more practical.

**Recommendation:** Option B (hybrid). Keep the marketing top nav intact, then add an in-app sidebar inside `AppShell` that mirrors the `NavPills` + settings/admin dropdowns, with subtle collapse/expand behavior. This approach requires linking the sidebar’s active state with the current scope (Platform vs Tenant) and ensuring mobile views fall back to existing top nav/hamburger behavior.
## E) Phased implementation plan

### Phase 0 – Foundation
- **Goals:** Build shared layout/interaction primitives (PageHeader, glass Card/dialog variants, shared button hierarchy, and states) so every page can adopt the same vocabulary.
- **Files touched:** `frontend/src/components/layout/PageHeader.jsx`, `frontend/src/components/ui/Card.jsx`, `../ui/Dialog.jsx`, `../ui/States.jsx`, `../ui/ActionButtons.jsx`, and `../ui/index.js` exports.
- **Acceptance checklist:** Hero cards render with `variant="glass"`, buttons use `PrimaryAction`/`SecondaryAction`, dialogs and cards share the new blur treatment, and `States` components cover loading/empty/error across sample pages.

### Phase 1 – Top five workspaces
- **Goals:** Modernize the tenant workbench pages that deliver the most touchpoints: `DashboardPage`, `ContactsPage`, `CampaignsPage`, `TemplateDetailPage`/`TemplatesPage`, and `SettingsPage`.
- **Files touched:** `frontend/src/pages/DashboardPage.jsx`, `ContactsPage.jsx`, `CampaignsPage.jsx`, `TemplatesPage.jsx`, `TemplateDetailPage.jsx`, `SettingsPage.jsx`, plus any shared helpers they pull in.
- **Acceptance checklist:** Each page features a `PageHeader`, the two-panel (primary workspace + secondary insights) layout, unified tables/cards, and clear CTAs/icons.

### Phase 2 – Long tail
- **Goals:** Modernize remaining marketing pages, admin consoles, signup/login flows, billing/usage pages, and miscellaneous tenant flows (Profiles, Tenants, Team, Billing/Invoices, Terms, Privacy, etc.).
- **Files touched:** The rest of `frontend/src/pages/**`, including marketing (Home, Platform, Solutions, Pricing, Comparison, Resources, Security, About, Contact, Privacy, Terms), auth flows (LoginPage, SignupPage, AcceptInvitePage), billing (BillingPage, BillingSuccessPage, BillingFailurePage, InvoicesPage, UsagePage), admin sections (`admin/*`), and profile/tenant management pages.
- **Acceptance checklist:** Every page uses the new design tokens, `Card`/`PageHeader` layout, iconography, button hierarchy, and state treatments; the marketing vs workspace IA remains unchanged, and nav cues use the recommended hybrid strategy.
