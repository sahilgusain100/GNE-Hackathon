import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { createReviewApi } from '../../services/review-api'
import { uploadSupportFilesApi } from '../../services/support-api'
import ImageUploadArea from '../common/ImageUploadArea'

export const VerifiedReviewModal = ({ order, item, isOpen, onClose, onReviewSubmitted }) => {
  const [overallRating, setOverallRating] = useState(5)
  const [qualityRating, setQualityRating] = useState(5)
  const [packagingRating, setPackagingRating] = useState(5)
  const [deliveryRating, setDeliveryRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [reviewPhotos, setReviewPhotos] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !order || !item) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please write at least 5 characters in your review.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let validImages = []
      if (reviewPhotos.length > 0) {
        const uploaded = await uploadSupportFilesApi(reviewPhotos)
        validImages = uploaded.map((att) => (typeof att === 'string' ? att : att.url)).filter(Boolean)
      }

      const res = await createReviewApi({
        orderId: order.orderNumber || order._id || order.id,
        orderItemId: item.id || item._id,
        productId: item.productId || item.product || item.id,
        overallRating,
        qualityRating,
        packagingRating,
        deliveryRating,
        title: title.trim(),
        comment: comment.trim(),
        images: validImages,
      })

      if (res?.success) {
        onReviewSubmitted?.(res.review)
        onClose()
      } else {
        setError(res?.message || 'Could not post review.')
      }
    } catch (err) {
      setError(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating, setRating) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          className="p-1 cursor-pointer transition hover:scale-110"
          key={s}
          onClick={() => setRating(s)}
          type="button"
        >
          <Star
            className={`h-5 w-5 ${
              s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
        <button
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-full p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-text-main">
              Verified Patron Review
            </h2>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              <span>Verified Purchase · Order #{order.orderNumber || order.id}</span>
            </div>
          </div>
        </div>

        {/* Item info */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3 text-xs">
          {item.image && (
            <img
              alt={item.title || item.name}
              className="h-12 w-12 rounded-xl object-cover"
              src={item.image}
            />
          )}
          <div>
            <p className="font-bold text-text-main">{item.title || item.name}</p>
            <p className="text-text-muted text-[11px]">Artisan: {item.artisanName || 'SkillBridge Artisan'}</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {/* Overall rating */}
          <div className="rounded-2xl border border-border/70 bg-surface-muted/30 p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Overall Craft Experience
            </p>
            <div className="mt-1 flex justify-center">
              {renderStars(overallRating, setOverallRating)}
            </div>
          </div>

          {/* Detailed Criteria breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-border/60 p-3 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase text-text-muted">Product Quality</p>
              <div className="mt-1 flex justify-center">
                {renderStars(qualityRating, setQualityRating)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-text-muted">Packaging</p>
              <div className="mt-1 flex justify-center">
                {renderStars(packagingRating, setPackagingRating)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-text-muted">Delivery</p>
              <div className="mt-1 flex justify-center">
                {renderStars(deliveryRating, setDeliveryRating)}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-main">Review Headline</label>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Exquisite handcrafted finish!"
              type="text"
              value={title}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-main">Your Feedback</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary"
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other craft lovers about the texture, craftsmanship, and packaging..."
              required
              rows={3}
              value={comment}
            />
          </div>

          {/* Photo uploads */}
          <div>
            <ImageUploadArea
              helperText="Upload photographs of your received handmade item, packaging, and details."
              items={reviewPhotos}
              label="Customer Photos (Upload photos of received craft)"
              maxFiles={4}
              onChange={setReviewPhotos}
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
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Publishing…' : 'Publish Verified Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VerifiedReviewModal
