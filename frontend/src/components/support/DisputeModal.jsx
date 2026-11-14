import React, { useState } from 'react'
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { raiseDisputeApi } from '../../services/dispute-api'
import { uploadSupportFilesApi } from '../../services/support-api'
import ImageUploadArea from '../common/ImageUploadArea'

const DISPUTE_CATEGORIES = [
  'Product damaged in transit',
  'Product different from description',
  'Poor craftsmanship or finishing',
  'Incorrect size, colour or specifications',
  'Missing items from parcel',
  'Delivery delay / incomplete order',
  'Authenticity or material concerns',
  'Bulk order quantity shortage',
  'Bulk order specification inconsistency',
]

const RESOLUTION_OPTIONS = [
  { id: 'Return and refund', label: 'Return & Full Refund' },
  { id: 'Replacement', label: 'Artisan Replacement' },
  { id: 'Partial refund', label: 'Partial Refund (Keep Item)' },
  { id: 'Full refund', label: 'Full Refund without Return' },
  { id: 'Rework or correction', label: 'Rework or Correction by Artisan' },
  { id: 'Mutual agreement between parties', label: 'Mutual Mediation Agreement' },
]

export const DisputeModal = ({ order, item, isOpen, onClose, onDisputeCreated }) => {
  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0])
  const [requestedResolution, setRequestedResolution] = useState('Return and refund')
  const [explanation, setExplanation] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !order) return null

  const targetItem = item || (order.items && order.items[0]) || {}

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!explanation.trim() || explanation.trim().length < 15) {
      setError('Please provide at least 15 characters explaining the issue in detail.')
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
          caption: evidenceFiles[idx]?.caption || att.name || `Proof photo ${idx + 1}`,
          fileType: att.fileType || evidenceFiles[idx]?.fileType || 'image/jpeg',
        }))
      }

      const payload = {
        orderId: order.orderNumber || order._id || order.id,
        orderItemId: targetItem.id || targetItem._id || '',
        category,
        requestedResolution,
        customerExplanation: explanation.trim(),
        evidence: validEvidence,
      }

      const res = await raiseDisputeApi(payload)
      if (res?.success) {
        onDisputeCreated?.(res.dispute)
        onClose()
      } else {
        setError(res?.message || 'Could not submit dispute.')
      }
    } catch (err) {
      setError(err.message || 'Failed to submit dispute.')
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

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-text-main">
              Raise Order Dispute / Return
            </h2>
            <p className="text-xs text-text-muted">
              Order #{order.orderNumber || order.id} · Craft Protection Policy
            </p>
          </div>
        </div>

        {/* Policy notice banner */}
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>SkillBridge Post-Delivery Protection Policy</span>
          </div>
          <p className="mt-0.5 text-emerald-800 leading-relaxed text-[11px]">
            Complaints are governed by a 7-day return window and 14-day quality dispute policy. The assigned artisan will be notified and given the opportunity to present their craftsmanship records and counter-evidence.
          </p>
        </div>

        {/* Target Item summary */}
        {targetItem && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3 text-xs">
            {targetItem.image && (
              <img
                alt={targetItem.title || targetItem.name}
                className="h-12 w-12 rounded-xl object-cover"
                src={targetItem.image}
              />
            )}
            <div>
              <p className="font-bold text-text-main">{targetItem.title || targetItem.name}</p>
              <p className="text-text-muted text-[11px]">
                Maker: {targetItem.artisanName || 'Artisan'} · Qty: {targetItem.quantity || 1}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-bold text-text-main">Issue Category</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-white p-2.5 text-xs text-text-main outline-none focus:border-secondary"
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              {DISPUTE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-text-main">Requested Resolution</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-white p-2.5 text-xs text-text-main outline-none focus:border-secondary"
              onChange={(e) => setRequestedResolution(e.target.value)}
              value={requestedResolution}
            >
              {RESOLUTION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-text-main">
              Detailed Explanation of the Problem
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary"
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain clearly what flaw, damage, specification issue or delay occurred..."
              required
              rows={3}
              value={explanation}
            />
          </div>

          {/* Evidence Upload Component */}
          <div>
            <ImageUploadArea
              allowCaption={true}
              helperText="Upload photos showing product defect, damaged parcel, or wrong item. Add a caption describing each photo."
              items={evidenceFiles}
              label="Photographic Proof & Inspection Evidence"
              maxFiles={5}
              onChange={setEvidenceFiles}
            />
            <p className="mt-2 text-[10px] text-text-muted">
              Evidence is locked after submission to ensure tamper-proof mediation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
            <button
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 disabled:opacity-50 cursor-pointer"
              disabled={submitting}
              type="submit"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{submitting ? 'Submitting Dispute…' : 'Submit Dispute Claim'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DisputeModal
