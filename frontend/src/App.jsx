import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import PlatformPage from './pages/PlatformPage'
import SolutionsPage from './pages/SolutionsPage'
import PricingPage from './pages/PricingPage'
import ComparisonPage from './pages/ComparisonPage'
import ResourcesPage from './pages/ResourcesPage'
import SecurityPage from './pages/SecurityPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import DashboardPage from './pages/DashboardPage'
import ContactsPage from './pages/ContactsPage'
import { ContactDetailPage } from './pages/ContactDetailPage'
import CampaignsPage from './pages/CampaignsPage'
import CreateCampaignPage from './pages/CreateCampaignPage'
import CampaignDetailPage from './pages/CampaignDetailPage'
import TagsPage from './pages/TagsPage'
import SettingsPage from './pages/SettingsPage'
import TenantProfilePage from './pages/TenantProfilePage'
import ProfilePage from './pages/ProfilePage'
import TemplatesPage from './pages/TemplatesPage'
import CreateTemplatePage from './pages/CreateTemplatePage'
import TemplateDetailPage from './pages/TemplateDetailPage'
import TenantsPage from './pages/TenantsPage'
import { TeamPage } from './pages/TeamPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import UsagePage from './pages/UsagePage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { TenantDetailPage } from './pages/admin/TenantDetailPage'
import { AuditLogPage } from './pages/admin/AuditLogPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { UserDetailPage } from './pages/admin/UserDetailPage'
import { AdminTagsPage } from './pages/admin/AdminTagsPage'
import { AdminPlansPage } from './pages/admin/AdminPlansPage'
import BillingSuccessPage from './pages/BillingSuccessPage'
import BillingFailurePage from './pages/BillingFailurePage'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/demo" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/failure" element={<BillingFailurePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <ContactsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tags"
            element={
              <ProtectedRoute>
                <TagsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/:id"
            element={
              <ProtectedRoute>
                <ContactDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute>
                <CreateCampaignPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <ProtectedRoute>
                <CampaignDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <CreateCampaignPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants"
            element={
              <ProtectedRoute>
                <TenantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usage"
            element={
              <ProtectedRoute requiredRole="admin">
                <UsagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/channels"
            element={
              <ProtectedRoute>
                <Navigate to="/settings?tab=channels" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/tenant"
            element={
              <ProtectedRoute requiredRole="admin">
                <Navigate to="/settings?tab=tenant" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/billing"
            element={
              <ProtectedRoute requiredRole="admin">
                <Navigate to="/settings?tab=billing" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/create"
            element={
              <ProtectedRoute>
                <CreateTemplatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/:id"
            element={
              <ProtectedRoute>
                <TemplateDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/:id/edit"
            element={
              <ProtectedRoute>
                <CreateTemplatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute requiredRole="admin">
                <TeamPage />
              </ProtectedRoute>
            }
          />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/plans"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <AdminPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <Navigate to="/admin" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tenants/:tenantId"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <TenantDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:userId"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <UserDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tags"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <AdminTagsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  )
}
