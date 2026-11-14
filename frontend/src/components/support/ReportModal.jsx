import React, { useState } from 'react'
import { AlertCircle, Flag, ShieldAlert, X } from 'lucide-react'
import { createReportApi } from '../../services/report-api'
import { uploadSupportFilesApi } from '../../services/support-api'
import ImageUploadArea from '../common/ImageUploadArea'

const REPORT_REASONS = [
  'Fake product listing',
  'Fraudulent behaviour',
  'Harassment',
  'Misleading information',
  'Suspicious account',
  'Repeated policy violations',
  'Other',
]

export const ReportModal = ({
  targetType = 'Product',
  targetId,
  targetTitle = '',
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [description, setDescription] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !targetId) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide at least 10 characters explaining your concern.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let evidence = []
      if (evidenceFiles.length > 0) {
        const uploaded = await uploadSupportFilesApi(evidenceFiles)
        evidence = uploaded.map((att) => (typeof att === 'string' ? att : att.url)).filter(Boolean)
      }

      const res = await createReportApi({
        targetType,
        targetId: String(targetId),
        targetTitle,
        reason,
        description: description.trim(),
        evidence,
      })

      if (res?.success) {
        onReportSubmitted?.(res.report)
        alert('Thank you for helping keep SkillBridge safe. Our trust & safety team has received your report.')
        onClose()
      } else {
        setError(res?.message || 'Could not submit report.')
      }
    } catch (err) {
      setError(err.message || 'Failed to submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl sm:p-7">
        <button
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-full p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-700 border border-red-200">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-text-main">
              Report {targetType}
            </h2>
            <p className="text-xs text-text-muted">
              {targetTitle ? `Target: ${targetTitle}` : 'Trust & Marketplace Safety'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-bold text-text-main">Violation Reason</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-white p-2.5 text-xs text-text-main outline-none focus:border-secondary"
              onChange={(e) => setReason(e.target.value)}
              value={reason}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-text-main">
              Explain What You Observed
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details about why this listing or user violates community safety guidelines..."
              required
              rows={3}
              value={description}
            />
          </div>

          <div>
            <ImageUploadArea
              helperText="Upload screenshots of abusive messages, fraudulent listing copies, or deceptive behavior (up to 3 files)."
              items={evidenceFiles}
              label="Evidence Screenshot / Proof Document (Optional)"
              maxFiles={3}
              onChange={setEvidenceFiles}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
            <button
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Submitting…' : 'Submit Confidential Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportModal
