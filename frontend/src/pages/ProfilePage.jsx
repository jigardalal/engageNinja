import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Alert,
  Select,
  toast
} from '../components/ui'
import { User, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { timezoneOptions } from '../data/timezones'

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [profile, setProfile] = useState({ name: '', email: '', first_name: '', last_name: '', phone: '', timezone: '' })
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    // hydrate from auth and API
    const load = async () => {
      setProfile({
        name: user?.name || '',
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone: user?.phone || '',
        timezone: user?.timezone || ''
      })
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setProfile({
            name: data.name || data.full_name || user?.name || '',
            email: data.email || user?.email || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            timezone: data.timezone || ''
          })
        }
      } catch (err) {
        console.error('Profile fetch failed', err)
      }
    }
    load()
  }, [user])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileMessage('')
    setProfileError('')
    try {
      setSavingProfile(true)
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profile.name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          timezone: profile.timezone
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to update profile')
      }
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully',
        variant: 'success'
      })
      setProfileMessage('Profile updated')
    } catch (err) {
      const errorMsg = err.message || 'Could not save profile'
      setProfileError(errorMsg)
      toast({
        title: 'Failed to update profile',
        description: errorMsg,
        variant: 'error'
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')
    if (!passwords.next || passwords.next.length < 8) {
      const errorMsg = 'New password must be at least 8 characters'
      setPasswordError(errorMsg)
      toast({
        title: 'Invalid password',
        description: errorMsg,
        variant: 'error'
      })
      return
    }
    if (passwords.next !== passwords.confirm) {
      const errorMsg = 'Passwords do not match'
      setPasswordError(errorMsg)
      toast({
        title: 'Passwords do not match',
        description: errorMsg,
        variant: 'error'
      })
      return
    }
    try {
      setChangingPassword(true)
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.next
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to change password')
      }
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
        variant: 'success'
      })
      setPasswordMessage('Password updated')
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (err) {
      const errorMsg = err.message || 'Could not change password'
      setPasswordError(errorMsg)
      toast({
        title: 'Failed to change password',
        description: errorMsg,
        variant: 'error'
      })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <AppShell hideTitleBlock title="Profile" subtitle="Manage your account info and password">
      <PageHeader
        icon={User}
        title="Profile & security"
        description="Update your personal info and change your password in one place."
        helper="Changes apply across your tenant"
      />
      {!isAuthenticated && (
        <Alert variant="warning" className="mb-4">You are not signed in.</Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary-500" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>Update your name and view your email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError && <Alert variant="error">{profileError}</Alert>}
            {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
            <form className="space-y-3" onSubmit={handleProfileSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={profile.first_name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={profile.last_name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Optional phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={profile.timezone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, timezone: e.target.value }))}
                >
                  <option value="">Select a timezone</option>
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary-500" />
              <CardTitle>Password</CardTitle>
            </div>
            <CardDescription>Change your password to keep your account secure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError && <Alert variant="error">{passwordError}</Alert>}
            {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
            <form className="space-y-3" onSubmit={handlePasswordChange}>
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, next: e.target.value }))}
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword ? 'Updating...' : 'Update password'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPasswords({ current: '', next: '', confirm: '' })}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
