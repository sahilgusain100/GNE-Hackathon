import { useCallback, useEffect, useState } from 'react'
import { Lock, ShieldCheck, UserPlus, UserRound, XCircle } from 'lucide-react'
import AdminSupportPage from './AdminSupportPage'
import { useAuthDialog } from '../hooks/useAuthDialog'
import { staffLoginApi } from '../services/auth-api'
import {
  createSupportStaffApi,
  getSupportStaffApi,
  updateSupportStaffApi,
} from '../services/admin-support-api'

const isStaffAccount = (user) =>
  user?.accountType === 'admin' || user?.accountType === 'support'

const StaffManagementPanel = () => {
  const [staff, setStaff] = useState([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordDrafts, setPasswordDrafts] = useState({})
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadStaff = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getSupportStaffApi()
      setStaff(result.staff || [])
      setNotice('')
    } catch (error) {
      setNotice(error.message || 'Unable to load staff accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const handleCreateStaff = async (event) => {
    event.preventDefault()
    setNotice('')
    setIsSubmitting(true)
    try {
      await createSupportStaffApi({ name, email, password })
      setName('')
      setEmail('')
      setPassword('')
      setNotice('Staff account created. Share the credentials with the staff member securely.')
      await loadStaff()
    } catch (error) {
      setNotice(error.message || 'Unable to create staff account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStaff = async (staffMember, updates) => {
    setNotice('')
    try {
      await updateSupportStaffApi(staffMember._id, updates)
      setPasswordDrafts((previous) => ({
        ...previous,
        [staffMember._id]: '',
      }))
      await loadStaff()
    } catch (error) {
      setNotice(error.message || 'Unable to update staff account.')
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold text-text-main">Support staff accounts</h2>
          <p className="text-sm text-text-secondary">
            Only admins can create, reset, or deactivate staff logins.
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateStaff}>
        <label className="text-sm font-semibold text-text-main">
          Staff name
          <input
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="text-sm font-semibold text-text-main">
          Staff email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="text-sm font-semibold text-text-main">
          Temporary password
          <input
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <div className="flex items-end">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? 'Creating…' : 'Create staff login'}
          </button>
        </div>
      </form>

      {notice && (
        <p
          aria-live="polite"
          className="mt-4 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-main"
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-text-muted">
              <th className="px-3 py-2">Staff member</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reset password</th>
              <th className="px-3 py-2">Access</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-3 py-5 text-text-secondary" colSpan={4}>Loading staff…</td></tr>
            ) : staff.length === 0 ? (
              <tr><td className="px-3 py-5 text-text-secondary" colSpan={4}>No support staff accounts yet.</td></tr>
            ) : staff.map((member) => (
              <tr className="border-b border-border/70" key={member._id}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-text-main">{member.name}</p>
                  <p className="text-xs text-text-secondary">{member.email}</p>
                </td>
                <td className="px-3 py-3">
                  <span className={member.isActive ? 'text-emerald-700' : 'text-red-700'}>
                    {member.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <input
                      aria-label={`New password for ${member.name}`}
                      autoComplete="new-password"
                      className="w-40 rounded-lg border border-border px-2 py-1.5"
                      minLength={8}
                      onChange={(event) => setPasswordDrafts((previous) => ({
                        ...previous,
                        [member._id]: event.target.value,
                      }))}
                      placeholder="8+ characters"
                      type="password"
                      value={passwordDrafts[member._id] || ''}
                    />
                    <button
                      className="rounded-lg border border-border px-2 py-1.5 font-semibold disabled:opacity-50"
                      disabled={(passwordDrafts[member._id] || '').length < 8}
                      onClick={() => handleUpdateStaff(member, { password: passwordDrafts[member._id] })}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 font-semibold"
                    onClick={() => handleUpdateStaff(member, { isActive: !member.isActive })}
                    type="button"
                  >
                    {member.isActive ? <XCircle className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                    {member.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const StaffPortalPage = () => {
  const { currentUser, authenticate, logout } = useAuthDialog()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await staffLoginApi({ email, password })
      if (!isStaffAccount(result.user)) {
        throw new Error('This portal is for authorized admin and support staff only.')
      }
      authenticate(result.user)
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isStaffAccount(currentUser)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-7 shadow-card sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-serif text-3xl font-bold text-text-main">Staff portal</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in with credentials provided by the system administrator. Staff accounts cannot self-register.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-semibold text-text-main">
              Work email
              <input
                autoComplete="username"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block text-sm font-semibold text-text-main">
              Password
              <input
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error && (
              <p aria-live="polite" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <Lock className="h-4 w-4" />
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  const isAdmin = currentUser.accountType === 'admin'
  return (
    <div>
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/75">SkillBridge staff portal</p>
          <p className="font-bold">{isAdmin ? 'Administrator dashboard' : 'Support staff dashboard'}</p>
        </div>
        <button className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold hover:bg-white/10" onClick={logout} type="button">
          Sign out
        </button>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {isAdmin && <StaffManagementPanel />}
        <AdminSupportPage />
      </main>
    </div>
  )
}

export default StaffPortalPage
