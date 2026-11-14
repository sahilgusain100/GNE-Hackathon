import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { respondToDisputeApi } from '../../services/dispute-api'
import { uploadSupportFilesApi } from '../../services/support-api'
import ImageUploadArea from '../common/ImageUploadArea'

export const ArtisanDisputeResponseModal = ({
  dispute,
  isOpen,
  onClose,
  onResponseSubmitted,
}) => {
  const [explanation, setExplanation] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !dispute) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!explanation.trim() || explanation.trim().length < 10) {
      setError('Please provide at least 10 characters explaining your perspective and craft details.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let validEvidence = []
      if (evidenceFiles.length > 0) {
        const uploaded = await uploadSupportFilesApi(evidenceFiles)
        validEvidence = uploaded.map((att, idx) => ({
          url: typeof att === 'string' ? att : att.url,
          caption: evidenceFiles[idx]?.caption || att.name || `Artisan craftsmanship proof ${idx + 1}`,
          fileType: att.fileType || evidenceFiles[idx]?.fileType || 'image/jpeg',
        }))
      }

      const res = await respondToDisputeApi(dispute.disputeId || dispute.id || dispute._id, {
        artisanExplanation: explanation.trim(),
        evidence: validEvidence,
      })

      if (res?.success) {
        onResponseSubmitted?.(res.dispute)
        alert('Your response and counter-evidence have been recorded securely. SkillBridge support will review both sides impartially.')
        onClose()
      } else {
        setError(res?.message || 'Could not submit response.')
      }
    } catch (err) {
      setError(err.message || 'Failed to submit response.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
        <button
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-full p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-text-main">
              Artisan Dispute Defense
            </h2>
            <p className="text-xs text-text-muted">
              Dispute #{dispute.disputeId} · Order #{dispute.orderNumber}
            </p>
          </div>
        </div>

        {/* Protection Assurance */}
        <div className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-3.5 text-xs text-secondary-900">
          <p className="font-bold text-text-main">Fair Artisan Protection Notice</p>
          <p className="mt-0.5 text-text-secondary leading-relaxed text-[11px]">
            Your shop is protected against unfair claims. Present your craft records, packaging photos, or postal receipts below. Our support mediators review all evidence objectively before making decisions.
          </p>
        </div>

        {/* Customer claim overview */}
        <div className="mt-4 rounded-2xl border border-border/80 bg-background/60 p-4 text-xs space-y-2">
          <div className="flex justify-between font-bold text-text-main">
            <span>Customer Claim: {dispute.category}</span>
            <span className="text-secondary font-medium">By {dispute.initiatorName}</span>
          </div>
          <p className="italic text-text-secondary leading-relaxed bg-surface p-2.5 rounded-xl border border-border/60">
            &quot;{dispute.customerExplanation}&quot;
          </p>
          {dispute.customerEvidence && dispute.customerEvidence.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <span className="font-semibold text-text-main">Customer Photos: </span>
              {dispute.customerEvidence.map((ev, i) => (
                <a
                  className="underline text-primary mr-2"
                  href={ev.url}
                  key={i}
                  rel="noreferrer"
                  target="_blank"
                >
                  Photo {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-bold text-text-main">
              Your Craftsmanship Explanation & Defense
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary"
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain the finishing technique used, inspection prior to packaging, dispatch details, or why the claim may be inaccurate..."
              required
              rows={4}
              value={explanation}
            />
          </div>

          <div>
            <ImageUploadArea
              allowCaption={true}
              helperText="Upload photos showing your pre-shipment condition, packaging, or postal weigh-in receipts. Add a caption for each."
              items={evidenceFiles}
              label="Counter-Evidence Photographs (Pre-dispatch photos, receipts, workshop records)"
              maxFiles={5}
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-secondary-hover disabled:opacity-50 cursor-pointer"
              disabled={submitting}
              type="submit"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{submitting ? 'Submitting Defense…' : 'Submit Official Defense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ArtisanDisputeResponseModal
