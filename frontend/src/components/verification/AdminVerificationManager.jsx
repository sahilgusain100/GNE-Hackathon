import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  UserCheck,
  UserX,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X,
  Check,
} from 'lucide-react'
import {
  getArtisansVerificationQueueApi,
  getArtisanVerificationDetailApi,
  getAdminAadhaarDocumentUrl,
  approveArtisanVerificationApi,
  rejectArtisanVerificationApi,
  markArtisanSuspiciousApi,
  restoreArtisanAccountApi,
  reviewArtisanAppealApi,
  deactivateArtisanAccountApi,
} from '../../services/admin-support-api'
import { getAuthToken } from '../../services/auth-api'

const REJECTION_PRESETS = [
  'Document photograph is blurry, dark, or unreadable. Please photograph in bright lighting.',
  'Corners or edges of the Aadhaar card are cropped out. Please include full document.',
  'Name or details on Aadhaar card do not match the registered artisan profile.',
  'Incorrect document uploaded. Please upload an official government Aadhaar card.',
  'Uploaded image appears heavily edited or damaged.',
]

const SUSPICION_PRESETS = [
  'Suspected falsified or digitally manipulated Aadhaar document.',
  'Potential identity impersonation or unauthorized third-party credentials.',
  'Multiple conflicting identity submissions across linked accounts.',
  'Flagged during anti-fraud and compliance audit.',
]

function AdminAadhaarImageViewer({ artisanId, side, onEnlarge }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let isMounted = true
    let activeBlob = null

    async function fetchImage() {
      setLoading(true)
      setLoadError(null)
      try {
        const token = getAuthToken()
        const directUrl = getAdminAadhaarDocumentUrl(artisanId, side, token)
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const res = await fetch(directUrl, { headers })
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`)
        }

        const blob = await res.blob()
        if (isMounted) {
          activeBlob = URL.createObjectURL(blob)
          setBlobUrl(activeBlob)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          console.warn(`Admin Aadhaar ${side} load error:`, err.message)
          setLoadError(err.message)
          setLoading(false)
        }
      }
    }

    fetchImage()

    return () => {
      isMounted = false
      if (activeBlob) URL.revokeObjectURL(activeBlob)
    }
  }, [artisanId, side])

  const token = getAuthToken()
  const fallbackUrl = getAdminAadhaarDocumentUrl(artisanId, side, token)
  const displayUrl = blobUrl || fallbackUrl

  if (loading) {
    return (
      <div className="aspect-4/3 flex flex-col items-center justify-center rounded-xl bg-black/5 border border-border">
        <RefreshCw className="h-6 w-6 animate-spin text-secondary mb-2" />
        <span className="text-xs text-text-muted font-medium">Decrypting &amp; Loading Document...</span>
      </div>
    )
  }

  if (loadError && !blobUrl) {
    return (
      <div className="relative group overflow-hidden rounded-xl border border-border bg-black/5 aspect-4/3 flex flex-col items-center justify-center p-3 text-center">
        <img
          src={fallbackUrl}
          alt={`Aadhaar ${side}`}
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fb = document.getElementById(`fallback-err-${artisanId}-${side}`)
            if (fb) fb.style.display = 'flex'
          }}
          onLoad={(e) => {
            e.currentTarget.style.display = 'block'
            const fb = document.getElementById(`fallback-err-${artisanId}-${side}`)
            if (fb) fb.style.display = 'none'
          }}
        />
        <div id={`fallback-err-${artisanId}-${side}`} style={{ display: 'none' }} className="flex-col items-center justify-center gap-1">
          <AlertCircle className="h-6 w-6 text-red-500 mb-1" />
          <p className="text-xs font-bold text-text-main">Document image not accessible</p>
          <p className="text-[11px] text-text-muted max-w-56">{loadError}</p>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            type="button"
            onClick={() => onEnlarge(fallbackUrl)}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-text-main shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-surface-muted"
          >
            <Eye className="h-3.5 w-3.5" /> Enlarge View
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/5 aspect-4/3 flex items-center justify-center">
      <img
        src={displayUrl}
        alt={`Aadhaar ${side}`}
        className="h-full w-full object-contain"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={() => onEnlarge(displayUrl)}
          className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-text-main shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-surface-muted"
        >
          <Eye className="h-3.5 w-3.5" /> Enlarge View
        </button>
      </div>
    </div>
  )
}

export default function AdminVerificationManager({ onStatsChanged }) {
  const token = getAuthToken()

  // Queue state
  const [queue, setQueue] = useState([])
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    underReview: 0,
    suspended: 0,
    appeals: 0,
  })
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  // Inspection modal state
  const [selectedArtisan, setSelectedArtisan] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState(null)

  // Moderation action modal state
  // null | 'approve' | 'reject' | 'suspicious' | 'restore' | 'appeal' | 'deactivate'
  const [actionModal, setActionModal] = useState(null)
  const [actionReason, setActionReason] = useState('')
  const [actionInternalNotes, setActionInternalNotes] = useState('')
  const [appealDecision, setAppealDecision] = useState('approve')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Load verification queue
  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus !== 'all') params.status = filterStatus
      if (searchTerm.trim()) params.search = searchTerm.trim()

      const res = await getArtisansVerificationQueueApi(params)
      if (res?.success) {
        setQueue(res.artisans || [])
        if (res.counts) setCounts(res.counts)
      }
    } catch (err) {
      console.warn('Load verification queue failed:', err.message)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, searchTerm])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  // Open detail / review modal
  const handleOpenReview = async (artisan) => {
    setSelectedArtisan(artisan)
    setReviewModalOpen(true)
    setLoadingDetail(true)
    try {
      const res = await getArtisanVerificationDetailApi(artisan._id || artisan.id)
      if (res?.success && res.artisan) {
        setSelectedArtisan(res.artisan)
      }
    } catch (err) {
      console.warn('Failed to load artisan details:', err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Open specific action modal with defaults
  const openActionModal = (type) => {
    setActionModal(type)
    setActionReason('')
    setActionInternalNotes('')
    setActionError('')
    setAppealDecision('approve')

    if (type === 'reject') {
      setActionReason(REJECTION_PRESETS[0])
    } else if (type === 'suspicious') {
      setActionReason(SUSPICION_PRESETS[0])
    }
  }

  // Execute moderation actions
  const handleExecuteAction = async (e) => {
    e.preventDefault()
    if (!selectedArtisan) return

    setActionError('')
    const artisanId = selectedArtisan._id || selectedArtisan.id

    // Validations
    if ((actionModal === 'reject' || actionModal === 'suspicious') && !actionReason.trim()) {
      setActionError('A mandatory reason must be provided before proceeding.')
      return
    }

    try {
      setActionLoading(true)
      let res

      if (actionModal === 'approve') {
        res = await approveArtisanVerificationApi(artisanId, {
          note: actionReason.trim(),
          internalNotes: actionInternalNotes.trim(),
        })
      } else if (actionModal === 'reject') {
        res = await rejectArtisanVerificationApi(artisanId, {
          reason: actionReason.trim(),
          internalNotes: actionInternalNotes.trim(),
        })
      } else if (actionModal === 'suspicious') {
        res = await markArtisanSuspiciousApi(artisanId, {
          reason: actionReason.trim(),
          internalNotes: actionInternalNotes.trim(),
        })
      } else if (actionModal === 'restore') {
        res = await restoreArtisanAccountApi(artisanId, {
          reason: actionReason.trim() || 'Account restored following successful compliance review.',
          internalNotes: actionInternalNotes.trim(),
        })
      } else if (actionModal === 'appeal') {
        res = await reviewArtisanAppealApi(artisanId, {
          decision: appealDecision,
          response: actionReason.trim() || (appealDecision === 'approve' ? 'Appeal approved and account restored.' : 'Appeal rejected.'),
          internalNotes: actionInternalNotes.trim(),
        })
      } else if (actionModal === 'deactivate') {
        res = await deactivateArtisanAccountApi(artisanId, {
          reason: actionReason.trim() || 'Account permanently deactivated for policy violation.',
          internalNotes: actionInternalNotes.trim(),
        })
      }

      if (res?.success) {
        setActionModal(null)
        const updatedArtisan = res.artisan || res.user
        if (updatedArtisan) {
          setSelectedArtisan((prev) => ({ ...prev, ...updatedArtisan }))
        }
        await loadQueue()
        if (onStatsChanged) onStatsChanged()
      } else {
        setActionError(res?.message || 'Operation failed.')
      }
    } catch (err) {
      setActionError(err.message || 'Error executing action.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-text-main flex items-center gap-2">
            <span>Artisan Aadhaar Verification &amp; Moderation</span>
            <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary">
              Official Hub
            </span>
          </h2>
          <p className="mt-1 text-xs text-text-muted leading-relaxed">
            Inspect uploaded front &amp; back Aadhaar documents, verify artisan credentials, flag suspicious accounts, and review reinstatement appeals.
          </p>
        </div>

        <button
          type="button"
          onClick={loadQueue}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-text-main shadow-2xs hover:bg-surface-muted transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-secondary' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'All Requests', count: counts.total, color: 'text-text-main', border: 'border-border' },
          { label: 'Pending Review', count: counts.pending, color: 'text-amber-800', border: 'border-amber-200 bg-amber-50/40' },
          { label: 'Verified Artisans', count: counts.verified, color: 'text-emerald-700', border: 'border-emerald-200 bg-emerald-50/40' },
          { label: 'Rejected Submissions', count: counts.rejected, color: 'text-red-700', border: 'border-red-200 bg-red-50/40' },
          { label: 'Suspended Accounts', count: counts.suspended, color: 'text-rose-700', border: 'border-rose-200 bg-rose-50/40' },
          { label: 'Active Appeals', count: counts.appeals, color: 'text-purple-700', border: 'border-purple-200 bg-purple-50/40' },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-3.5 text-center shadow-2xs ${card.border}`}
          >
            <p className={`text-2xl font-black ${card.color}`}>{card.count}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search artisan by name, email, phone, or User ID..."
            className="w-full rounded-xl border border-border bg-white pl-9 pr-3.5 py-2 text-xs text-text-main outline-none focus:border-secondary transition"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted shrink-0 hidden sm:block" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-text-main outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">All Statuses ({counts.total})</option>
            <option value="Pending">Pending Review ({counts.pending})</option>
            <option value="Verified">Verified Only ({counts.verified})</option>
            <option value="Rejected">Rejected ({counts.rejected})</option>
            <option value="Suspended">Suspended / Flagged ({counts.suspended})</option>
            <option value="Appeals">Appeals Pending ({counts.appeals})</option>
          </select>
        </div>
      </div>

      {/* Queue Table */}
      {queue.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-text-muted">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-text-main">No verification requests found</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'No artisans match the selected filter criteria. Try resetting your search or filter.'
              : 'All submitted artisan Aadhaar documents have been reviewed.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-muted/60 text-text-muted font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Artisan</th>
                  <th className="px-4 py-3">Craft &amp; Location</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {queue.map((artisan) => {
                  const id = artisan._id || artisan.id
                  const verStatus = artisan.verificationStatus || 'Not Submitted'
                  const accStatus = artisan.accountStatus || 'Active'
                  const aadhaar = artisan.aadhaarVerification || {}
                  const hasFront = Boolean(aadhaar.hasFrontImage || aadhaar.frontImage)
                  const hasBack = Boolean(aadhaar.hasBackImage || aadhaar.backImage)
                  const hasAppeal = artisan.appeal?.status === 'Submitted' || artisan.appeal?.status === 'Under Review'

                  return (
                    <tr key={id} className="hover:bg-surface-muted/30 transition-colors">
                      {/* Artisan Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs uppercase">
                            {artisan.name?.charAt(0) || 'A'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-text-main truncate max-w-44">
                              {artisan.name}
                            </p>
                            <p className="text-[11px] text-text-muted truncate max-w-44 font-mono">
                              {artisan.email || artisan.phone || id.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Craft & Location */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-text-main truncate max-w-36">
                          {artisan.artCategory || 'Craft Artisan'}
                        </p>
                        <p className="text-[11px] text-text-muted truncate max-w-36">
                          {artisan.city || artisan.state || 'India'}
                        </p>
                      </td>

                      {/* Verification Status */}
                      <td className="px-4 py-3">
                        {verStatus === 'Verified' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                        {verStatus === 'Pending' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            <Clock className="h-3 w-3 animate-spin text-amber-600" /> Pending
                          </span>
                        )}
                        {verStatus === 'Rejected' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                        {verStatus === 'Under Review' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                            <AlertCircle className="h-3 w-3" /> Under Review
                          </span>
                        )}
                        {verStatus === 'Not Submitted' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                            Not Submitted
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="px-4 py-3">
                        {accStatus === 'Active' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                        {accStatus === 'Suspended' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold border border-rose-300">
                            <Lock className="h-3 w-3" /> Suspended
                          </span>
                        )}
                        {accStatus === 'Deactivated' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-bold">
                            Deactivated
                          </span>
                        )}
                        {hasAppeal && (
                          <span className="block mt-1 text-[10px] font-bold text-purple-700 uppercase tracking-tight">
                            Appeal Active ⚖️
                          </span>
                        )}
                      </td>

                      {/* Documents Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            title={hasFront ? 'Front Aadhaar Uploaded' : 'Missing Front'}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              hasFront ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-surface-muted text-text-muted'
                            }`}
                          >
                            {hasFront && <Check className="h-2.5 w-2.5 text-emerald-600" />} Front
                          </span>
                          <span
                            title={hasBack ? 'Back Aadhaar Uploaded' : 'Missing Back'}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              hasBack ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-surface-muted text-text-muted'
                            }`}
                          >
                            {hasBack && <Check className="h-2.5 w-2.5 text-emerald-600" />} Back
                          </span>
                        </div>
                      </td>

                      {/* Submitted Date */}
                      <td className="px-4 py-3 text-text-muted text-[11px]">
                        {aadhaar.submittedAt
                          ? new Date(aadhaar.submittedAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(artisan)}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover shadow-2xs transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ARTISAN VERIFICATION & MODERATION INSPECTION
      ────────────────────────────────────────────────────────────── */}
      {reviewModalOpen && selectedArtisan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-surface p-5 sm:p-7 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl font-bold text-text-main">
                      {selectedArtisan.name}
                    </h3>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-text-muted">
                      ID: {selectedArtisan._id || selectedArtisan.id}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedArtisan.email} · {selectedArtisan.phone || 'No phone'} · {selectedArtisan.artCategory || 'Artisan'} · Joined {selectedArtisan.createdAt ? new Date(selectedArtisan.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Status Pills */}
            <div className="flex flex-wrap items-center gap-3 bg-surface-muted/40 p-3.5 rounded-2xl border border-border">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-text-main">Verification Status:</span>
                <span className="font-bold text-secondary">{selectedArtisan.verificationStatus || 'Not Submitted'}</span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-text-main">Account Status:</span>
                <span
                  className={`font-bold ${
                    selectedArtisan.accountStatus === 'Suspended'
                      ? 'text-rose-700'
                      : selectedArtisan.accountStatus === 'Deactivated'
                      ? 'text-gray-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {selectedArtisan.accountStatus || 'Active'}
                </span>
                {selectedArtisan.accountStatus === 'Suspended' && (
                  <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                    Listings Paused
                  </span>
                )}
                {selectedArtisan.accountStatus === 'Deactivated' && (
                  <span className="rounded-full bg-gray-200 text-gray-800 px-2 py-0.5 text-[10px] font-bold">
                    Access Revoked
                  </span>
                )}
              </div>
              {selectedArtisan.aadhaarVerification?.rejectionReason && (
                <>
                  <span className="text-border">|</span>
                  <div className="text-xs text-red-700">
                    <strong>Last Rejection: </strong> {selectedArtisan.aadhaarVerification.rejectionReason}
                  </div>
                </>
              )}
              {selectedArtisan.aadhaarVerification?.suspensionReason && (
                <>
                  <span className="text-border">|</span>
                  <div className="text-xs text-rose-800">
                    <strong>Suspension Reason: </strong> {selectedArtisan.aadhaarVerification.suspensionReason}
                  </div>
                </>
              )}
            </div>

            {/* Document Previews */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Submitted Government Aadhaar Photographs
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side */}
                <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-text-main">
                    <span>Front Side Photograph</span>
                    {(selectedArtisan.aadhaarVerification?.hasFrontImage || selectedArtisan.aadhaarVerification?.frontImage) ? (
                      <span className="text-emerald-700 text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Available
                      </span>
                    ) : (
                      <span className="text-text-muted text-[11px]">Not Uploaded</span>
                    )}
                  </div>

                  {(selectedArtisan.aadhaarVerification?.hasFrontImage || selectedArtisan.aadhaarVerification?.frontImage) ? (
                    <AdminAadhaarImageViewer
                      artisanId={selectedArtisan._id || selectedArtisan.id}
                      side="front"
                      onEnlarge={(url) => setEnlargedImage(url)}
                    />
                  ) : (
                    <div className="aspect-4/3 flex flex-col items-center justify-center rounded-xl bg-surface border border-dashed border-border text-text-muted text-xs">
                      No front image uploaded
                    </div>
                  )}
                </div>

                {/* Back Side */}
                <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-text-main">
                    <span>Back Side Photograph</span>
                    {(selectedArtisan.aadhaarVerification?.hasBackImage || selectedArtisan.aadhaarVerification?.backImage) ? (
                      <span className="text-emerald-700 text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Available
                      </span>
                    ) : (
                      <span className="text-text-muted text-[11px]">Not Uploaded</span>
                    )}
                  </div>

                  {(selectedArtisan.aadhaarVerification?.hasBackImage || selectedArtisan.aadhaarVerification?.backImage) ? (
                    <AdminAadhaarImageViewer
                      artisanId={selectedArtisan._id || selectedArtisan.id}
                      side="back"
                      onEnlarge={(url) => setEnlargedImage(url)}
                    />
                  ) : (
                    <div className="aspect-4/3 flex flex-col items-center justify-center rounded-xl bg-surface border border-dashed border-border text-text-muted text-xs">
                      No back image uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Appeal Banner (if suspended with appeal) */}
            {selectedArtisan.appeal?.status && selectedArtisan.appeal.status !== 'None' && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-purple-900 uppercase tracking-wider">
                      Artisan Appeal For Reinstatement ⚖️
                    </span>
                    <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                      Status: {selectedArtisan.appeal.status}
                    </span>
                  </div>
                  {selectedArtisan.accountStatus === 'Suspended' && (
                    <button
                      type="button"
                      onClick={() => openActionModal('appeal')}
                      className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition cursor-pointer"
                    >
                      Judge Appeal
                    </button>
                  )}
                </div>
                <p className="text-xs text-purple-950 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-purple-200">
                  &quot;{selectedArtisan.appeal.explanation}&quot;
                </p>
                {selectedArtisan.appeal.adminResponse && (
                  <p className="text-[11px] text-purple-800">
                    <strong>Admin Determination: </strong> {selectedArtisan.appeal.adminResponse}
                  </p>
                )}
              </div>
            )}

            {/* Decision & Moderation History / Audit Logs */}
            {selectedArtisan.moderationAuditLogs?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Moderation Audit Trail &amp; History
                </h4>
                <div className="space-y-2 max-h-44 overflow-y-auto rounded-xl border border-border p-3 bg-surface-muted/20">
                  {selectedArtisan.moderationAuditLogs.map((log, idx) => (
                    <div key={idx} className="rounded-lg bg-surface p-2.5 text-xs border border-border/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{log.action}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(log.performedAt).toLocaleString()} by {log.performedByName || 'Admin'}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-text-secondary text-[11px]">
                          <strong>Reason: </strong> {log.reason}
                        </p>
                      )}
                      {log.internalNotes && (
                        <p className="text-text-muted text-[11px] italic bg-amber-50/50 p-1 rounded">
                          Internal Note: {log.internalNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moderation Action Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                {/* Approve Button */}
                <button
                  type="button"
                  onClick={() => openActionModal('approve')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve Verification</span>
                </button>

                {/* Reject Button */}
                <button
                  type="button"
                  onClick={() => openActionModal('reject')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject Documents</span>
                </button>

                {/* Mark Suspicious Button (Active accounts only) */}
                {selectedArtisan.accountStatus === 'Active' && (
                  <button
                    type="button"
                    onClick={() => openActionModal('suspicious')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Mark Suspicious &amp; Freeze</span>
                  </button>
                )}

                {/* Restore Account (if suspended or deactivated) */}
                {(selectedArtisan.accountStatus === 'Suspended' || selectedArtisan.accountStatus === 'Deactivated') && (
                  <button
                    type="button"
                    onClick={() => openActionModal('restore')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Restore Account</span>
                  </button>
                )}

                {/* Deactivate Permanently (if not already Deactivated) */}
                {selectedArtisan.accountStatus !== 'Deactivated' && (
                  <button
                    type="button"
                    onClick={() => openActionModal('deactivate')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 px-3 py-2 text-xs font-bold transition cursor-pointer"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    <span>Deactivate</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-MODAL: MODERATION DECISION CONFIRMATION & REASONS
      ────────────────────────────────────────────────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h4 className="font-serif text-lg font-bold text-text-main flex items-center gap-2">
                {actionModal === 'approve' && 'Confirm Verification Approval'}
                {actionModal === 'reject' && 'Reject Aadhaar Submission'}
                {actionModal === 'suspicious' && '⚠️ Mark Artisan as Suspicious'}
                {actionModal === 'restore' && 'Restore Artisan Account'}
                {actionModal === 'appeal' && 'Review Artisan Appeal'}
                {actionModal === 'deactivate' && 'Deactivate Artisan Account'}
              </h4>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Context Notice */}
            {actionModal === 'approve' && (
              <p className="text-xs text-text-secondary leading-relaxed">
                Approving this artisan will grant them the <strong>Verified Artisan</strong> trust badge, enable customer badge indicators on listings, and mark their account as Active.
              </p>
            )}

            {actionModal === 'reject' && (
              <p className="text-xs text-text-secondary leading-relaxed">
                Rejecting documents requires a <strong>mandatory rejection reason</strong> explaining what was wrong (e.g. blurry image). The artisan’s account will <strong>remain Active</strong> and they will be invited to upload corrected photographs.
              </p>
            )}

            {actionModal === 'suspicious' && (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  Warning: Administrative Account Suspension
                </p>
                <p className="leading-relaxed">
                  Marking this artisan as suspicious will set their account status to <strong>Suspended</strong> and verification to <strong>Under Review</strong>. This freezes their ability to publish listings, accept marketplace orders, or take industry contracts.
                </p>
              </div>
            )}

            {actionModal === 'restore' && (
              <p className="text-xs text-text-secondary leading-relaxed">
                Restoring this account will set their status back to <strong>Active</strong> and lift all restrictions on listings and marketplace ordering.
              </p>
            )}

            {actionModal === 'deactivate' && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <UserX className="h-4 w-4 text-red-600" />
                  Critical Warning: Permanent Account Deactivation
                </p>
                <p className="leading-relaxed">
                  Deactivating this artisan will terminate active sessions, block future logins, and permanently pull all of their listings from the marketplace.
                </p>
              </div>
            )}

            {actionModal === 'appeal' && (
              <div className="space-y-3">
                <div className="bg-surface-muted p-3 rounded-xl border text-xs">
                  <strong>Artisan Explanation: </strong>
                  &quot;{selectedArtisan?.appeal?.explanation}&quot;
                </div>
                <div>
                  <label className="text-xs font-bold text-text-main block mb-1">
                    Determination Choice
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="appealDec"
                        value="approve"
                        checked={appealDecision === 'approve'}
                        onChange={() => setAppealDecision('approve')}
                      />
                      Approve Appeal &amp; Restore Account
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold text-red-700">
                      <input
                        type="radio"
                        name="appealDec"
                        value="reject"
                        checked={appealDecision === 'reject'}
                        onChange={() => setAppealDecision('reject')}
                      />
                      Reject Appeal
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Presets (for Reject or Suspicious) */}
            {actionModal === 'reject' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Quick Select Reason
                </label>
                <select
                  className="w-full rounded-xl border border-border bg-white p-2 text-xs text-text-main outline-none"
                  onChange={(e) => setActionReason(e.target.value)}
                  value={actionReason}
                >
                  {REJECTION_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {actionModal === 'suspicious' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Suspicion Category / Preset
                </label>
                <select
                  className="w-full rounded-xl border border-border bg-white p-2 text-xs text-text-main outline-none"
                  onChange={(e) => setActionReason(e.target.value)}
                  value={actionReason}
                >
                  {SUSPICION_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  {(actionModal === 'reject' || actionModal === 'suspicious') ? 'Reason / Explanation *' : 'Reason / Note to Artisan (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter detailed reason sent to the artisan..."
                  className="w-full rounded-xl border border-border bg-white p-2.5 text-xs text-text-main outline-none focus:border-secondary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">
                  Private Internal Notes (Staff &amp; Compliance only — Never exposed to artisan)
                </label>
                <textarea
                  rows={2}
                  value={actionInternalNotes}
                  onChange={(e) => setActionInternalNotes(e.target.value)}
                  placeholder="Internal audit notes, forensic details, or investigator observations..."
                  className="w-full rounded-xl border border-border bg-white p-2 text-xs text-text-main outline-none focus:border-secondary resize-none"
                />
              </div>

              {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer ${
                    actionModal === 'suspicious' || actionModal === 'deactivate'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionModal === 'reject'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-primary hover:bg-primary-hover'
                  }`}
                >
                  {actionLoading ? 'Processing…' : 'Confirm Determination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LIGHTBOX: HIGH RESOLUTION DOCUMENT VIEWER
      ────────────────────────────────────────────────────────────── */}
      {enlargedImage && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] max-w-4xl w-full overflow-hidden rounded-3xl bg-surface p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-bold text-text-main">High Resolution Document Examination</span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-auto flex items-center justify-center min-h-[60vh] max-h-[75vh]">
              <img
                src={enlargedImage}
                alt="Enlarged Document"
                className="max-h-full max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
