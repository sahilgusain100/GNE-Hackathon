import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  getExpertEvaluationQueueApi,
  startProductEvaluationApi,
  submitProductEvaluationApi,
  verifyExpertStatusApi,
} from '../../services/expert-api'

const CRITERIA_CONFIG = [
  {
    key: 'productQuality',
    label: 'Product Quality & Materials',
    desc: 'Durability, raw material quality, structural strength, and authentic texture.',
  },
  {
    key: 'creativityOriginality',
    label: 'Creativity & Originality',
    desc: 'Distinctiveness of design, cultural authenticity, uniqueness, and artistic flair.',
  },
  {
    key: 'craftsmanship',
    label: 'Craftsmanship & Skill Technique',
    desc: 'Precision in handwork, mastery of traditional tools, weave/carve density.',
  },
  {
    key: 'designFinishing',
    label: 'Design & Finishing',
    desc: 'Edge treatment, symmetry, aesthetic appeal, neatness of seams or borders.',
  },
  {
    key: 'marketPotential',
    label: 'Market Potential & Commercial Appeal',
    desc: 'Readiness for retail/export, pricing viability, appeal to modern buyers.',
  },
]

const CRAFT_CATEGORIES = [
  'All',
  'Textiles & Handloom',
  'Phulkari & Embroidery',
  'Pottery & Ceramics',
  'Woodwork & Carving',
  'Jewelry & Beading',
  'Metal & Brass Craft',
  'Leather Craft',
  'Jute & Natural Fiber',
  'Painting & Folk Art',
  'Organic & Food Craft',
]

const ExpertEvaluationStudio = ({ currentUser, onUserUpdated }) => {
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, evaluated: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending') // 'pending' | 'evaluated' | 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Verification state
  const isVerified = Boolean(currentUser?.isVerified)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationNotice, setVerificationNotice] = useState('')

  // Evaluation modal state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Full-size image modal state & controls
  const [fullSizeViewer, setFullSizeViewer] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    title: '',
    artisan: '',
    category: '',
  })
  const [zoomLevel, setZoomLevel] = useState(1) // 1, 1.5, 2, 2.5, 3

  // Scores state (1 to 10 for each criterion)
  const [scores, setScores] = useState({
    productQuality: 8,
    creativityOriginality: 8,
    craftsmanship: 8,
    designFinishing: 8,
    marketPotential: 8,
  })
  const [feedback, setFeedback] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [recommendedPrice, setRecommendedPrice] = useState('')
  const [verdict, setVerdict] = useState('Evaluated') // 'Evaluated' | 'Rejected'

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  // Helper to extract list of images from product safely
  const getProductImages = useCallback((product) => {
    if (!product) return []
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean)
    }
    if (product.image) {
      return [product.image]
    }
    return []
  }, [])

  // Open full size viewer with safe image list
  const openFullSizeViewer = useCallback((index = 0, product = selectedProduct) => {
    if (!product) return
    const images = getProductImages(product)
    if (!images.length) return

    setFullSizeViewer({
      isOpen: true,
      images,
      currentIndex: Math.max(0, Math.min(index, images.length - 1)),
      title: product.title || product.name || 'Artisan Craft',
      artisan: product.artisan || 'Rural Artisan',
      category: product.category || '',
    })
    setZoomLevel(1)
  }, [getProductImages, selectedProduct])

  const closeFullSizeViewer = useCallback(() => {
    setFullSizeViewer((prev) => ({ ...prev, isOpen: false }))
    setZoomLevel(1)
  }, [])

  const handleNextFullSizeImage = useCallback(() => {
    setFullSizeViewer((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }))
    setZoomLevel(1)
  }, [])

  const handlePrevFullSizeImage = useCallback(() => {
    setFullSizeViewer((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }))
    setZoomLevel(1)
  }, [])

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 1))
  const handleResetZoom = () => setZoomLevel(1)

  // Lock background body scroll whenever evaluation modal or full size viewer is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedProduct || fullSizeViewer.isOpen)
    if (isAnyModalOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalHtmlOverflow = document.documentElement.style.overflow
      const originalPaddingRight = document.body.style.paddingRight

      // Compensate for scrollbar width to prevent background layout jump
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`
      }

      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [selectedProduct, fullSizeViewer.isOpen])

  // Handle keyboard shortcuts (Escape to close, Left/Right arrows to navigate images)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (fullSizeViewer.isOpen) {
        if (e.key === 'Escape') {
          closeFullSizeViewer()
        } else if (e.key === 'ArrowRight' && fullSizeViewer.images.length > 1) {
          handleNextFullSizeImage()
        } else if (e.key === 'ArrowLeft' && fullSizeViewer.images.length > 1) {
          handlePrevFullSizeImage()
        }
      } else if (selectedProduct) {
        if (e.key === 'Escape') {
          setSelectedProduct(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    fullSizeViewer.isOpen,
    fullSizeViewer.images.length,
    selectedProduct,
    closeFullSizeViewer,
    handleNextFullSizeImage,
    handlePrevFullSizeImage,
  ])

  // Calculate live computed overall score
  const computedOverall = (
    (scores.productQuality +
      scores.creativityOriginality +
      scores.craftsmanship +
      scores.designFinishing +
      scores.marketPotential) /
    5
  ).toFixed(1)

  // Load evaluation queue
  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getExpertEvaluationQueueApi({
        status: statusFilter,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchQuery || undefined,
      })

      if (res?.success && Array.isArray(res.queue)) {
        setQueue(res.queue)
        if (res.stats) setStats(res.stats)
      } else {
        setQueue([])
      }
    } catch (err) {
      console.warn('Queue loading error:', err)
      setQueue([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, selectedCategory, searchQuery])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  // Handle self-verification for expert testing
  const handleVerifyExpert = async () => {
    setIsVerifying(true)
    setVerificationNotice('')
    try {
      const res = await verifyExpertStatusApi()
      if (res?.success) {
        setVerificationNotice('Expert account verified successfully! You can now evaluate products.')
        if (typeof onUserUpdated === 'function' && res.user) {
          onUserUpdated(res.user)
        }
      }
    } catch (err) {
      setVerificationNotice(err.message || 'Failed to verify expert account.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Open evaluation modal for a product
  const handleOpenEvaluationModal = (product) => {
    setSubmitError('')
    setSubmitSuccess('')
    setActiveImageIndex(0)

    // Mark as "Under Evaluation" if pending
    if (product.evaluationStatus === 'Pending Review' && isVerified) {
      startProductEvaluationApi(product.id || product._id).catch(() => null)
    }

    // Prefill if this expert already evaluated
    const existing = (product.evaluationsList || []).find((ev) => {
      const expId = ev.expertId || ev.expert?._id || ev.expert
      return expId && expId.toString() === currentUser?.id?.toString()
    })

    if (existing) {
      setScores({
        productQuality: existing.productQuality || 8,
        creativityOriginality: existing.creativityOriginality || 8,
        craftsmanship: existing.craftsmanship || 8,
        designFinishing: existing.designFinishing || 8,
        marketPotential: existing.marketPotential || 8,
      })
      setFeedback(existing.feedback || '')
      setSuggestions(existing.suggestions || '')
      setRecommendedPrice(existing.recommendedPrice ? String(existing.recommendedPrice) : '')
      setVerdict(existing.status === 'Rejected' ? 'Rejected' : 'Evaluated')
    } else {
      setScores({
        productQuality: 8,
        creativityOriginality: 8,
        craftsmanship: 8,
        designFinishing: 8,
        marketPotential: 8,
      })
      setFeedback('')
      setSuggestions('')
      setRecommendedPrice(product.price ? String(product.price) : '')
      setVerdict('Evaluated')
    }

    setSelectedProduct(product)
  }

  // Submit evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!isVerified) {
      setSubmitError('Only verified experts are allowed to evaluate products. Please complete verification first.')
      return
    }

    if (!feedback.trim()) {
      setSubmitError('Please provide written expert feedback for the artisan.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        productQuality: scores.productQuality,
        creativityOriginality: scores.creativityOriginality,
        craftsmanship: scores.craftsmanship,
        designFinishing: scores.designFinishing,
        marketPotential: scores.marketPotential,
        feedback: feedback.trim(),
        suggestions: suggestions.trim(),
        recommendedPrice: recommendedPrice ? Number(recommendedPrice) : null,
        verdict,
      }

      const res = await submitProductEvaluationApi(
        selectedProduct.id || selectedProduct._id,
        payload
      )

      if (res?.success) {
        setSubmitSuccess(
          verdict === 'Rejected'
            ? 'Evaluation feedback saved as rejected.'
            : 'Evaluation submitted successfully! The artisan and industrialists can now view this ranking.'
        )

        setTimeout(() => {
          setSelectedProduct(null)
          loadQueue()
        }, 1300)
      } else {
        throw new Error(res?.message || 'Failed to submit evaluation.')
      }
    } catch (err) {
      setSubmitError(err.message || 'An error occurred while saving the evaluation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScoreChange = (key, value) => {
    const num = Math.max(1, Math.min(10, parseInt(value, 10) || 1))
    setScores((prev) => ({ ...prev, [key]: num }))
  }

  return (
    <div className="space-y-6">
      {/* Verification Guard Banner */}
      {!isVerified && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Expert Verification Required</p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Only verified experts can submit official craft evaluations and product rankings. Complete your verification to unlock scoring tools.
              </p>
              {verificationNotice && (
                <p className="text-xs font-semibold text-emerald-700 mt-2">
                  {verificationNotice}
                </p>
              )}
            </div>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
            disabled={isVerifying}
            onClick={handleVerifyExpert}
            type="button"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Activate Verified Status
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-muted text-text-secondary hover:text-text-main'
            }`}
            onClick={() => setStatusFilter('pending')}
            type="button"
          >
            Waiting for Evaluation ({stats.pending})
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              statusFilter === 'evaluated'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-muted text-text-secondary hover:text-text-main'
            }`}
            onClick={() => setStatusFilter('evaluated')}
            type="button"
          >
            Evaluated Archive ({stats.evaluated})
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-muted text-text-secondary hover:text-text-main'
            }`}
            onClick={() => setStatusFilter('all')}
            type="button"
          >
            All Items ({stats.total})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <select
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-text-main outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            onChange={(e) => setSelectedCategory(e.target.value)}
            value={selectedCategory}
          >
            {CRAFT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <div className="relative min-w-44 flex-1 sm:w-56">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              className="w-full rounded-xl border border-border bg-white pl-9 pr-3.5 py-2 text-xs text-text-main outline-none placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search craft title..."
              type="text"
              value={searchQuery}
            />
          </div>
          <button
            aria-label="Refresh queue"
            className="rounded-xl border border-border p-2 text-text-muted hover:bg-surface-muted hover:text-text-main transition cursor-pointer"
            onClick={loadQueue}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Queue Grid */}
      {isLoading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-card">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          <p className="text-sm font-semibold text-text-muted">Loading evaluation queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <Award className="h-8 w-8" />
          </div>
          <h4 className="mt-4 font-serif text-lg font-bold text-text-main">
            {statusFilter === 'pending'
              ? 'No Products Waiting for Evaluation'
              : 'No matching craft pieces found'}
          </h4>
          <p className="mt-1 max-w-md text-xs text-text-secondary leading-relaxed">
            {statusFilter === 'pending'
              ? 'All submitted artisan products have been appraised. Check back soon for new submissions from rural women artisans.'
              : 'Try adjusting your search query or filter settings.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((item) => {
            const primaryImg = item.image || (item.images && item.images[0]) || ''
            const isEvaluated = item.evaluationStatus === 'Evaluated'
            const crit = item.evaluationCriteriaAverages || {}

            return (
              <div
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card transition-all hover:border-secondary/40 hover:shadow-card-hover"
                key={item.id || item._id}
              >
                {/* Image Stage */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
                  {primaryImg ? (
                    <img
                      alt={item.title || item.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={primaryImg}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-muted">
                      <ImageIcon className="h-10 w-10 text-text-muted/40" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute left-3 top-3">
                    {item.evaluationStatus === 'Pending Review' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50/95 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-xs backdrop-blur-xs">
                        <Clock className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                        Awaiting Review
                      </span>
                    ) : item.evaluationStatus === 'Under Evaluation' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-50/95 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-xs backdrop-blur-xs">
                        <Eye className="h-3.5 w-3.5 animate-pulse text-indigo-600" />
                        Under Evaluation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/95 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs backdrop-blur-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Evaluated ({item.averageEvaluationRating?.toFixed(1) || '-'}/10)
                      </span>
                    )}
                  </div>

                  {/* View Full Size Option on Card */}
                  {primaryImg && (
                    <button
                      className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:scale-105 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        openFullSizeViewer(0, item)
                      }}
                      title="Inspect full size image"
                      type="button"
                    >
                      <Maximize2 className="h-3.5 w-3.5 text-secondary" />
                      Full Size
                    </button>
                  )}

                  {item.images && item.images.length > 1 && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                      {item.images.length} photos
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                      {item.category}
                    </span>
                    {item.price > 0 && (
                      <span className="font-serif text-sm font-bold text-text-main">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <h4 className="mt-1 font-serif text-lg font-bold text-text-main group-hover:text-primary transition-colors line-clamp-1">
                    {item.title || item.name}
                  </h4>

                  <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                    {item.description || 'Artisan submitted craft piece for evaluation.'}
                  </p>

                  {/* Artisan Metadata Pill */}
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/50 p-2 text-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {item.artisan ? item.artisan[0] : 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text-main">
                        {item.artisan || 'Rural Artisan'}
                      </p>
                      <p className="truncate text-[10px] text-text-muted flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location || 'India'}
                      </p>
                    </div>
                  </div>

                  {/* Scores Summary if evaluated */}
                  {isEvaluated && (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-50/60 p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Current Rating:</span>
                        <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700">
                          <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                          {item.averageEvaluationRating?.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800/80">
                        <span>Quality: {crit.productQuality?.toFixed(1) || '-'}</span>
                        <span>Craft: {crit.craftsmanship?.toFixed(1) || '-'}</span>
                        <span>Market: {crit.marketPotential?.toFixed(1) || '-'}</span>
                      </div>
                    </div>
                  )}

                  {/* Action CTA */}
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3">
                    <button
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                        item.hasEvaluatedByMe
                          ? 'bg-surface border border-border text-text-main hover:bg-surface-muted'
                          : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                      onClick={() => handleOpenEvaluationModal(item)}
                      type="button"
                    >
                      <Award className="h-4 w-4 text-secondary" />
                      {item.hasEvaluatedByMe
                        ? 'Update My Evaluation'
                        : isEvaluated
                        ? 'Add Peer Evaluation'
                        : 'Evaluate Product'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================
          MODAL: Expert Evaluation Scoring Interface
      ======================================================== */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProduct(null)
          }}
        >
          <form
            className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden overscroll-contain"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmitEvaluation}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between border-b border-border p-5 sm:px-7 shrink-0 bg-surface">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <Award className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-text-main">
                    Professional Craft Evaluation
                  </h3>
                  <p className="text-xs text-text-muted">
                    Appraise product quality, finish, and commercial viability for women artisans.
                  </p>
                </div>
              </div>
              <button
                aria-label="Close modal"
                className="rounded-xl p-2 text-text-muted hover:bg-surface-muted hover:text-text-main transition cursor-pointer"
                onClick={() => setSelectedProduct(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto overscroll-contain flex-1 p-5 sm:p-7 space-y-6">
              {submitError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  {submitSuccess}
                </div>
              )}

              {/* Product Overview Stage */}
              <div className="grid grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)] gap-5 rounded-2xl border border-border bg-surface-muted/30 p-4">
                {/* Product Gallery View */}
                <div className="flex flex-col">
                  <div
                    className="group/img relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface-muted cursor-zoom-in shadow-xs"
                    onClick={() => openFullSizeViewer(activeImageIndex, selectedProduct)}
                    title="Click to view full size image"
                  >
                    <img
                      alt={selectedProduct.title || selectedProduct.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                      src={
                        (selectedProduct.images && selectedProduct.images[activeImageIndex]) ||
                        selectedProduct.image ||
                        ''
                      }
                    />
                    {/* Hover indicator for full size */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs shadow-md">
                        <Maximize2 className="h-3.5 w-3.5 text-secondary" />
                        View Full Size
                      </span>
                    </div>
                  </div>

                  {/* Explicit View Full Size button */}
                  <button
                    className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-text-main shadow-2xs hover:bg-surface-muted hover:border-secondary transition cursor-pointer"
                    onClick={() => openFullSizeViewer(activeImageIndex, selectedProduct)}
                    type="button"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-secondary" />
                    <span>Inspect Full Size Image</span>
                  </button>

                  {/* Thumbnails */}
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
                      {selectedProduct.images.map((img, i) => (
                        <button
                          className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer ${
                            activeImageIndex === i
                              ? 'border-secondary scale-105 shadow-xs'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          key={i}
                          onClick={() => setActiveImageIndex(i)}
                          type="button"
                        >
                          <img alt="" className="h-full w-full object-cover" src={img} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product & Artisan Info */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                        {selectedProduct.category}
                      </span>
                      {selectedProduct.price > 0 && (
                        <span className="font-serif text-sm font-bold text-text-main">
                          Artisan Expected: ₹{selectedProduct.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 font-serif text-lg font-bold text-text-main">
                      {selectedProduct.title || selectedProduct.name}
                    </h4>
                    <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                      {selectedProduct.description || 'No description provided by artisan.'}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-border/80 pt-2.5 text-xs text-text-muted flex items-center justify-between">
                    <span>Crafted by: <strong className="text-text-main">{selectedProduct.artisan}</strong></span>
                    <span>📍 {selectedProduct.location || 'India'}</span>
                  </div>
                </div>
              </div>

              {/* Live Rating Score Indicator */}
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-primary-hover p-4 text-white shadow-xs">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                    Live Computed Rating (Average of 5 Criteria)
                  </p>
                  <p className="font-serif text-3xl font-bold">
                    {computedOverall} <span className="text-sm font-normal text-white/70">/ 10</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
                    <Star className="h-4 w-4 fill-secondary text-secondary" />
                    {(Number(computedOverall) / 2).toFixed(1)} Stars
                  </div>
                  <p className="mt-1 text-[11px] text-white/70">Scale: 1 (Poor) to 10 (Mastercraft)</p>
                </div>
              </div>

              {/* The 5 Criteria Sliders */}
              <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Rate the 5 Evaluation Criteria (Score 1 to 10)
                </h4>

                {CRITERIA_CONFIG.map(({ key, label, desc }) => (
                  <div className="border-b border-border/70 pb-3.5 last:border-0 last:pb-0" key={key}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-text-main">{label}</span>
                        <p className="text-[11px] text-text-muted">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-10 items-center justify-center rounded-lg bg-secondary/15 font-serif text-sm font-bold text-primary">
                          {scores[key]}
                        </span>
                        <span className="text-xs text-text-muted">/ 10</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-text-muted">1</span>
                      <input
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-muted accent-primary"
                        max="10"
                        min="1"
                        onChange={(e) => handleScoreChange(key, e.target.value)}
                        step="1"
                        type="range"
                        value={scores[key]}
                      />
                      <span className="text-[11px] font-semibold text-text-muted">10</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Written Feedback */}
              <div>
                <label className="block text-xs font-bold text-text-main">
                  Written Feedback for Artisan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-text-main outline-none placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share a detailed constructive evaluation: praising the craftsmanship strengths, color palette, tradition, and execution..."
                  required
                  rows={3}
                  value={feedback}
                />
              </div>

              {/* Suggestions for Improvement & Recommended Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-main">
                    Suggestions for Improvement
                  </label>
                  <textarea
                    className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2 text-xs text-text-main outline-none placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                    onChange={(e) => setSuggestions(e.target.value)}
                    placeholder="e.g. Reinforce the inner seams; refine edge stitching to increase durability..."
                    rows={2}
                    value={suggestions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main">
                    Recommended Retail Valuation (₹) <span className="font-normal text-text-muted">(Optional)</span>
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2 text-xs text-text-main outline-none placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                    min="0"
                    onChange={(e) => setRecommendedPrice(e.target.value)}
                    placeholder="e.g. 1800"
                    type="number"
                    value={recommendedPrice}
                  />
                  <p className="mt-1 text-[10px] text-text-muted">
                    Suggest fair pricing to empower the artisan in negotiations with industrialists.
                  </p>
                </div>
              </div>

              {/* Status / Verdict */}
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-text-main">Evaluation Verdict</p>
                  <p className="text-[11px] text-text-muted">
                    Confirm whether this product meets SkillBridge craftsmanship standards.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      verdict === 'Evaluated'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-surface border border-border text-text-muted'
                    }`}
                    onClick={() => setVerdict('Evaluated')}
                    type="button"
                  >
                    ✓ Approve & Score
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      verdict === 'Rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-surface border border-border text-text-muted'
                    }`}
                    onClick={() => setVerdict('Rejected')}
                    type="button"
                  >
                    ✕ Request Revisions
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer (Fixed at bottom) */}
            <div className="border-t border-border p-4 sm:px-7 flex items-center justify-end gap-3 shrink-0 bg-surface">
              <button
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition cursor-pointer"
                onClick={() => setSelectedProduct(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-hover disabled:opacity-50 transition cursor-pointer"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Evaluation...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 text-secondary" />
                    Submit Professional Evaluation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          FULL SIZE IMAGE INSPECTOR LIGHTBOX MODAL
      ======================================================== */}
      {fullSizeViewer.isOpen && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-md overscroll-contain select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFullSizeViewer()
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 sm:px-6 backdrop-blur-sm shrink-0 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
                <Maximize2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-bold text-white">
                    {fullSizeViewer.title}
                  </h4>
                  {fullSizeViewer.category && (
                    <span className="hidden sm:inline-block rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                      {fullSizeViewer.category}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60 truncate">
                  Artisan: <strong className="text-white/90">{fullSizeViewer.artisan}</strong> • High-Resolution Full Size View
                </p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1 text-xs text-white">
                <button
                  className="rounded p-1 hover:bg-white/15 disabled:opacity-40 transition cursor-pointer"
                  disabled={zoomLevel <= 1}
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  type="button"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-1 font-mono text-[11px] font-bold min-w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  className="rounded p-1 hover:bg-white/15 disabled:opacity-40 transition cursor-pointer"
                  disabled={zoomLevel >= 3}
                  onClick={handleZoomIn}
                  title="Zoom In"
                  type="button"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {zoomLevel > 1 && (
                  <button
                    className="ml-1 rounded p-1 hover:bg-white/15 text-secondary transition cursor-pointer"
                    onClick={handleResetZoom}
                    title="Reset Zoom (Fit to Screen)"
                    type="button"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Open in New Tab Button */}
              {fullSizeViewer.images[fullSizeViewer.currentIndex] && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                  href={fullSizeViewer.images[fullSizeViewer.currentIndex]}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="Open original image in full screen new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-secondary" />
                  <span className="hidden sm:inline">Open Original</span>
                </a>
              )}

              {/* Close Button */}
              <button
                className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 hover:text-rose-300 transition cursor-pointer ml-1"
                onClick={closeFullSizeViewer}
                title="Close Full Size View (Esc)"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Image Stage */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-auto p-4 sm:p-8 overscroll-contain"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeFullSizeViewer()
            }}
          >
            {/* Previous Arrow */}
            {fullSizeViewer.images.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-3 text-white shadow-lg backdrop-blur-xs hover:bg-black/85 hover:scale-110 active:scale-95 transition cursor-pointer"
                onClick={handlePrevFullSizeImage}
                title="Previous Image (Left Arrow)"
                type="button"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next Arrow */}
            {fullSizeViewer.images.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-3 text-white shadow-lg backdrop-blur-xs hover:bg-black/85 hover:scale-110 active:scale-95 transition cursor-pointer"
                onClick={handleNextFullSizeImage}
                title="Next Image (Right Arrow)"
                type="button"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Full Image */}
            <div className="flex items-center justify-center max-h-full max-w-full">
              <img
                alt={`${fullSizeViewer.title} - Image ${fullSizeViewer.currentIndex + 1}`}
                className={`max-h-[75vh] max-w-[90vw] object-contain rounded-lg transition-transform duration-200 select-none ${
                  zoomLevel > 1 ? 'cursor-grab' : 'cursor-zoom-in'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setZoomLevel((prev) => (prev > 1 ? 1 : 2))
                }}
                src={fullSizeViewer.images[fullSizeViewer.currentIndex]}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
                title={zoomLevel > 1 ? 'Click to reset zoom (100%)' : 'Click to zoom in (200%)'}
              />
            </div>
          </div>

          {/* Bottom Bar: Thumbnails & Image Counter */}
          <div className="border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-sm shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/70">
                Photo {fullSizeViewer.currentIndex + 1} of {fullSizeViewer.images.length}
              </span>
              <span className="text-[11px] text-white/40 hidden sm:inline">
                • Click image to toggle 2x zoom • Use Arrow keys to navigate
              </span>
            </div>

            {/* Thumbnails Row */}
            {fullSizeViewer.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                {fullSizeViewer.images.map((img, idx) => (
                  <button
                    className={`h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                      fullSizeViewer.currentIndex === idx
                        ? 'border-secondary scale-105 shadow-md'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                    key={idx}
                    onClick={() => {
                      setFullSizeViewer((prev) => ({ ...prev, currentIndex: idx }))
                      setZoomLevel(1)
                    }}
                    type="button"
                  >
                    <img alt="" className="h-full w-full object-cover" src={img} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpertEvaluationStudio
