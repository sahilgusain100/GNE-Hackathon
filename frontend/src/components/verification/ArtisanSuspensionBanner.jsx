import React, { useState } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  LifeBuoy,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  ChevronRight,
  X,
} from 'lucide-react'
import { submitArtisanAppealApi } from '../../services/artisan-api'

export default function ArtisanSuspensionBanner({
  currentUser,
  onAppealSubmitted,
  onContactSupport,
}) {
  const [appealModalOpen, setAppealModalOpen] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const aadhaarVer = currentUser?.aadhaarVerification || {}
  const appeal = currentUser?.appeal || { status: 'None' }

  const suspensionReason = aadhaarVer.suspensionReason || 'Account flagged for administrative compliance review.'
  const suspendedAt = aadhaarVer.suspendedAt
    ? new Date(aadhaarVer.suspendedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently'

  const handleAppealSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!explanation.trim() || explanation.trim().length < 20) {
      setErrorMsg('Please provide a detailed explanation of at least 20 characters.')
      return
    }

    try {
      setSubmitting(true)
      const res = await submitArtisanAppealApi(explanation.trim())
      if (res?.success) {
        setSuccessMsg('Your appeal has been successfully submitted to the SkillBridge Admin Team.')
        setExplanation('')
        if (onAppealSubmitted) {
          onAppealSubmitted(res.user)
        }
      } else {
        setErrorMsg(res?.message || 'Unable to submit appeal.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting appeal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-rose-200 bg-linear-to-br from-rose-50 via-white to-orange-50/40 p-6 sm:p-8 shadow-md">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-4 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-rose-950">
                  Account Temporarily Suspended
                </h3>
                <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-800/80">
                Suspension initiated on <strong>{suspendedAt}</strong> following an administrative review.
              </p>
            </div>
          </div>

          {/* Reason Card */}
          <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 backdrop-blur-xs space-y-1.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Administrative Reason for Review:
            </p>
            <p className="text-sm font-medium text-text-main italic leading-relaxed">
              &quot;{suspensionReason}&quot;
            </p>
          </div>

          {/* Scope Explanation: What is Restricted vs What is Protected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 space-y-1.5">
              <p className="font-bold text-rose-900 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-rose-600" />
                Temporary Restrictions:
              </p>
              <ul className="space-y-1 text-rose-800/90 pl-4 list-disc text-[11px]">
                <li>Cannot publish or create new product listings</li>
                <li>Customer checkout is paused for existing listings</li>
                <li>Cannot take on new industry bulk projects</li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 space-y-1.5">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Preserved &amp; Protected Data:
              </p>
              <ul className="space-y-1 text-emerald-800/90 pl-4 list-disc text-[11px]">
                <li>All profile data, workshop details, and photos remain safe</li>
                <li>Existing accumulated earnings and escrow funds are secure</li>
                <li>Full access to past orders, customer messages, and support</li>
              </ul>
            </div>
          </div>

          {/* Existing Appeal Status Banner if any */}
          {appeal?.status && appeal.status !== 'None' && (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-secondary" />
                  Appeal Status:
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    appeal.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : appeal.status === 'Rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {appeal.status}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong>Your statement: </strong> &quot;{appeal.explanation}&quot;
              </p>
              {appeal.adminResponse && (
                <div className="rounded-xl bg-surface-muted p-2.5 text-xs text-text-main border-l-3 border-secondary">
                  <strong>Admin Feedback: </strong> {appeal.adminResponse}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 md:min-w-56">
          <button
            type="button"
            onClick={() => setAppealModalOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>
              {appeal?.status && appeal.status !== 'None' ? 'View / Update Appeal' : 'Submit Review Appeal'}
            </span>
          </button>

          <button
            type="button"
            onClick={onContactSupport}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-900 shadow-2xs hover:bg-rose-50 transition cursor-pointer"
          >
            <LifeBuoy className="h-4 w-4 text-rose-600" />
            <span>Contact Support Desk</span>
          </button>
        </div>
      </div>

      {/* Appeal Submission Modal */}
      {appealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <FileText className="h-4 w-4" />
                </span>
                <h4 className="font-serif text-lg font-bold text-text-main">
                  Submit Review Appeal
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              If you believe this suspension is a misunderstanding, or have addressed the reason flagged below, please provide a clear statement explaining your case. The moderation committee reviews all artisan appeals within 24–48 hours.
            </p>

            <form onSubmit={handleAppealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1.5">
                  Detailed Explanation / Clarification *
                </label>
                <textarea
                  rows={5}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why your account should be restored, attach context regarding identity verification, or explain how you solved any issues..."
                  className="w-full rounded-xl border border-border bg-white p-3 text-xs text-text-main outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 placeholder:text-text-muted resize-none"
                />
                <span className="text-[11px] text-text-muted">
                  Minimum 20 characters ({explanation.length}/20)
                </span>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting || explanation.trim().length < 20}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Transmitting Appeal…</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Appeal to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
