import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FileText,
  Lock,
  Eye,
  Info,
} from 'lucide-react'
import {
  uploadAadhaarDocumentsApi,
  getVerificationStatusApi,
  getArtisanAadhaarDocumentUrl,
} from '../../services/artisan-api'
import { getAuthToken } from '../../services/auth-api'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

export default function AadhaarVerificationSection({ currentUser, onStatusUpdated }) {
  const [loading, setLoading] = useState(false)
  const [fetchingStatus, setFetchingStatus] = useState(true)
  const [statusData, setStatusData] = useState(null)

  // Local file selection state
  const [frontFile, setFrontFile] = useState(null)
  const [frontPreview, setFrontPreview] = useState(null)
  const [backFile, setBackFile] = useState(null)
  const [backPreview, setBackPreview] = useState(null)
  const [consentGiven, setConsentGiven] = useState(false)

  // Feedback & error states
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [previewModalImg, setPreviewModalImg] = useState(null)

  const token = getAuthToken()

  // Load latest verification status from backend
  const fetchStatus = async () => {
    try {
      setFetchingStatus(true)
      const res = await getVerificationStatusApi()
      if (res?.success) {
        setStatusData(res)
      }
    } catch (err) {
      console.warn('Failed to fetch verification status:', err)
    } finally {
      setFetchingStatus(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  // File selection handlers
  const handleFileSelect = (side, file) => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage(`Invalid format for ${side} side. Please select a JPG, JPEG, or PNG image.`)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File for ${side} side is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limit is 5MB.`)
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (side === 'front') {
      if (frontPreview && frontPreview.startsWith('blob:')) {
        URL.revokeObjectURL(frontPreview)
      }
      setFrontFile(file)
      setFrontPreview(previewUrl)
    } else {
      if (backPreview && backPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backPreview)
      }
      setBackFile(file)
      setBackPreview(previewUrl)
    }
  }

  const handleRemoveFile = (side) => {
    if (side === 'front') {
      if (frontPreview && frontPreview.startsWith('blob:')) {
        URL.revokeObjectURL(frontPreview)
      }
      setFrontFile(null)
      setFrontPreview(null)
    } else {
      if (backPreview && backPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backPreview)
      }
      setBackFile(null)
      setBackPreview(null)
    }
  }

  // Submit documents
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!frontFile || !backFile) {
      setErrorMessage('Both Front and Back photographs of your Aadhaar card are required.')
      return
    }

    if (!consentGiven) {
      setErrorMessage('Please confirm your consent for document verification before proceeding.')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('front', frontFile)
      formData.append('back', backFile)
      formData.append('consent', 'true')

      const res = await uploadAadhaarDocumentsApi(formData)
      if (res?.success) {
        setSuccessMessage('Aadhaar documents submitted successfully for administrative review.')
        setFrontFile(null)
        setBackFile(null)
        setConsentGiven(false)
        await fetchStatus()
        if (onStatusUpdated) onStatusUpdated(res.user)
      } else {
        setErrorMessage(res?.message || 'Failed to submit documents.')
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error uploading documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentStatus = statusData?.verificationStatus || currentUser?.verificationStatus || 'Not Submitted'
  const isSuspended = (statusData?.accountStatus || currentUser?.accountStatus) === 'Suspended'
  const rejectionReason = statusData?.aadhaarVerification?.rejectionReason || currentUser?.aadhaarVerification?.rejectionReason

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary/5 via-primary/5 to-surface p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-text-main">
                Artisan Identity & Aadhaar Verification
              </h3>
              <p className="text-xs text-text-muted">
                Official government document verification ensures community trust and unlocks verified seller privileges.
              </p>
            </div>
          </div>
        </div>

        {/* Current Status Pill */}
        <div className="shrink-0">
          {currentStatus === 'Verified' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 shadow-xs">
              <CheckCircle2 className="h-4 w-4" />
              Verified Artisan Account
            </span>
          )}
          {currentStatus === 'Pending' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-xs">
              <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
              Documents Under Review
            </span>
          )}
          {currentStatus === 'Rejected' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 shadow-xs">
              <ShieldAlert className="h-4 w-4" />
              Verification Rejected
            </span>
          )}
          {currentStatus === 'Under Review' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 shadow-xs">
              <AlertCircle className="h-4 w-4" />
              Administrative Review
            </span>
          )}
          {currentStatus === 'Not Submitted' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3.5 py-1.5 text-xs font-semibold text-text-muted">
              Not Yet Submitted
            </span>
          )}
        </div>
      </div>

      {/* Rejection Notice Banner */}
      {currentStatus === 'Rejected' && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 text-red-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <h4 className="font-bold text-sm">Action Needed: Aadhaar Submission Resubmission Required</h4>
          </div>
          <p className="text-xs text-red-800 leading-relaxed">
            Your previous verification request was not approved by the verification team for the following reason:
          </p>
          <div className="rounded-xl border border-red-200 bg-white p-3 text-xs font-medium text-red-900">
            &quot;{rejectionReason || 'Uploaded photograph was blurry or unreadable. Please upload clear photographs.'}&quot;
          </div>
          <p className="text-[11px] text-red-700">
            Please re-photograph your Aadhaar card in bright lighting and submit clear front and back images below.
          </p>
        </div>
      )}

      {/* Verified Status Banner */}
      {currentStatus === 'Verified' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h4 className="font-bold text-sm text-emerald-900">Government Identity Verified</h4>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Your Aadhaar document has been approved by SkillBridge administration. Your artisan account enjoys verified badges across customer product listings, access to direct bulk industry contracts, and fast-track payouts.
          </p>
          {(statusData?.aadhaarVerification?.hasFrontImage || statusData?.aadhaarVerification?.frontImage) && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalImg(getArtisanAadhaarDocumentUrl('front', token))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Front Document
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalImg(getArtisanAadhaarDocumentUrl('back', token))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Back Document
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Review Notice */}
      {currentStatus === 'Pending' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
            <h4 className="font-bold text-sm text-amber-900">Verification in Progress</h4>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your documents were securely received on{' '}
            <strong>
              {statusData?.aadhaarVerification?.submittedAt
                ? new Date(statusData.aadhaarVerification.submittedAt).toLocaleDateString()
                : 'recently'}
            </strong>
            . Our compliance team verifies documents within 24 hours. You can continue managing your shop and orders normally.
          </p>
          {(statusData?.aadhaarVerification?.hasFrontImage || statusData?.aadhaarVerification?.frontImage) && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPreviewModalImg(getArtisanAadhaarDocumentUrl('front', token))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100/50 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                Inspect Submitted Front
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalImg(getArtisanAadhaarDocumentUrl('back', token))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100/50 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                Inspect Submitted Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guidelines Card */}
      {currentStatus !== 'Verified' && (
        <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-text-main">
            <Info className="h-4 w-4 text-secondary" />
            Photograph Guidelines for Seamless Verification:
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Capture in a brightly lit space with zero flash glare
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Keep all 4 edges & corners of card clearly visible
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Ensure name, DOB, and address are crisp & readable
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Formats accepted: JPG, JPEG, PNG (Max 5MB each)
            </li>
          </ul>
        </div>
      )}

      {/* Upload Form - Shown when Not Submitted or Rejected */}
      {(currentStatus === 'Not Submitted' || currentStatus === 'Rejected') && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Front Side Upload */}
            <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-5 text-center transition hover:border-secondary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Aadhaar Front Side *
                </span>
                {frontFile && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                )}
              </div>

              {frontPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-black/5 aspect-4/3 flex items-center justify-center group">
                  <img
                    src={frontPreview}
                    alt="Aadhaar Front Preview"
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(frontPreview)}
                      className="rounded-lg bg-white/90 p-2 text-text-main hover:bg-white cursor-pointer shadow-sm"
                      title="Enlarge preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile('front')}
                      className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 cursor-pointer shadow-sm"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-4/3 flex flex-col items-center justify-center rounded-xl bg-surface-muted/50 p-4 border border-dashed border-border/80">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary mb-2">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-text-main">Photograph Front Side</p>
                  <p className="text-[11px] text-text-muted mt-1 max-w-52">
                    Showing your full photo, name, and government emblem
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-main shadow-xs hover:bg-surface-muted cursor-pointer transition">
                  <Upload className="h-3.5 w-3.5 text-secondary" />
                  <span>{frontFile ? 'Replace Photo' : 'Select Photo'}</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => handleFileSelect('front', e.target.files?.[0])}
                  />
                </label>
                {frontFile && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('front')}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Back Side Upload */}
            <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-5 text-center transition hover:border-secondary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Aadhaar Back Side *
                </span>
                {backFile && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                )}
              </div>

              {backPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-black/5 aspect-4/3 flex items-center justify-center group">
                  <img
                    src={backPreview}
                    alt="Aadhaar Back Preview"
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(backPreview)}
                      className="rounded-lg bg-white/90 p-2 text-text-main hover:bg-white cursor-pointer shadow-sm"
                      title="Enlarge preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile('back')}
                      className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 cursor-pointer shadow-sm"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-4/3 flex flex-col items-center justify-center rounded-xl bg-surface-muted/50 p-4 border border-dashed border-border/80">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary mb-2">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-text-main">Photograph Back Side</p>
                  <p className="text-[11px] text-text-muted mt-1 max-w-52">
                    Showing your official postal address and QR code
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-main shadow-xs hover:bg-surface-muted cursor-pointer transition">
                  <Upload className="h-3.5 w-3.5 text-secondary" />
                  <span>{backFile ? 'Replace Photo' : 'Select Photo'}</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => handleFileSelect('back', e.target.files?.[0])}
                  />
                </label>
                {backFile && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('back')}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Explicit Consent Checkbox */}
          <div className="rounded-2xl border border-border bg-surface p-4 flex items-start gap-3 shadow-2xs">
            <input
              type="checkbox"
              id="aadhaar-consent-checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-secondary focus:ring-secondary cursor-pointer"
            />
            <label htmlFor="aadhaar-consent-checkbox" className="text-xs text-text-secondary leading-relaxed cursor-pointer select-none">
              <strong className="text-text-main">Consent & Legal Declaration: </strong>
              I voluntarily consent to submit front and back photographs of my Aadhaar card to SkillBridge strictly for identity verification, community fraud prevention, and seller accreditation. I confirm that I am the lawful holder of this document. Documents are stored in secure, private directories and are never shared publicly.
            </label>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Single Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !frontFile || !backFile || !consentGiven}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-secondary-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Encrypting & Uploading Documents…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Lightbox / Preview Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] max-w-2xl w-full overflow-hidden rounded-2xl bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-bold text-text-main">Document Photograph Preview</span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewModalImg}
                alt="Enlarged Document"
                className="max-h-full max-w-full rounded-lg object-contain shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
