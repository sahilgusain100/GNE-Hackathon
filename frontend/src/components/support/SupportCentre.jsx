import React, { useEffect, useState, useRef } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Filter,
  HelpCircle,
  History,
  Image as ImageIcon,
  LifeBuoy,
  Lock,
  MessageSquare,
  Package,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  ThumbsUp,
  Truck,
  UploadCloud,
  User,
  X,
  XCircle,
} from 'lucide-react'
import {
  createTicketApi,
  getMyTicketsApi,
  getTicketByIdApi,
  replyToTicketApi,
  closeTicketApi,
  reopenTicketApi,
  rateTicketApi,
  uploadSupportFilesApi,
} from '../../services/support-api'
import { getMyDisputesApi, getDisputeByIdApi } from '../../services/dispute-api'
import { useAuthDialog } from '../../hooks/useAuthDialog'
import ImageUploadArea from '../common/ImageUploadArea'

const STATUS_THEMES = {
  Open: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Open',
  },
  'Under Review': {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    label: 'Under Review',
  },
  'Waiting for User': {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Waiting for You',
  },
  Escalated: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Escalated to Senior Mediation',
  },
  Resolved: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Resolved',
  },
  Closed: {
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
    label: 'Closed',
  },
}

const PRIORITY_THEMES = {
  Low: 'text-gray-600 bg-gray-50 border-gray-200',
  Medium: 'text-blue-700 bg-blue-50 border-blue-200',
  High: 'text-amber-800 bg-amber-50 border-amber-200',
  Urgent: 'text-red-700 bg-red-50 border-red-200',
}

const ROLE_CATEGORIES = {
  customer: [
    {
      id: 'Payment Issues',
      icon: CreditCard,
      title: 'Payment & Charges',
      subCategories: [
        'Payment deducted but order not confirmed',
        'Payment failed during Razorpay transaction',
        'Duplicate payment charged',
        'Refund not received in bank account',
        'Incorrect transaction amount',
      ],
    },
    {
      id: 'Product Quality Issues',
      icon: Award,
      title: 'Product Quality & Finishing',
      subCategories: [
        'Product damaged in transit',
        'Product significantly different from description',
        'Poor craftsmanship or finishing flaw',
        'Incorrect size, colour or specifications',
        'Missing items from parcel',
        'Product authenticity or material concerns',
      ],
    },
    {
      id: 'Delivery Issues',
      icon: Truck,
      title: 'Delivery & Shipping',
      subCategories: [
        'Order not delivered past estimated date',
        'Delayed delivery without tracking update',
        'Wrong product parcel delivered',
        'Incomplete order shipment',
        'Courier status marked delivered falsely',
      ],
    },
    {
      id: 'Other Issues',
      icon: HelpCircle,
      title: 'Returns & General Support',
      subCategories: [
        'Cancellation request',
        'Return request within policy window',
        'Refund request verification',
        'Artisan communication issues',
        'General marketplace inquiry',
      ],
    },
  ],
  artisan: [
    {
      id: 'Payment and Earnings',
      icon: CreditCard,
      title: 'Payouts & Earnings',
      subCategories: [
        'Payout not received after order dispatch',
        'Incorrect earnings / commission calculation',
        'Delayed weekly payout transfer',
        'Refund deducted unfairly from balance',
        'Order payment dispute inquiry',
      ],
    },
    {
      id: 'Customer Disputes',
      icon: ShieldAlert,
      title: 'Customer Claims & Protection',
      subCategories: [
        'Customer making false quality claims',
        'Customer reporting damage without evidence',
        'Unfair refund or return request',
        'Customer harassment or abusive behavior',
        'Customer refusing delivery of completed custom order',
      ],
    },
    {
      id: 'Order Management',
      icon: Package,
      title: 'Order Fulfillment & Specs',
      subCategories: [
        'Customer specified unrealistic delivery deadline',
        'Ambiguous custom order specifications',
        'Customer cancellation after materials were prepared',
        'Custom bulk order complication',
      ],
    },
    {
      id: 'Account and Technical Issues',
      icon: User,
      title: 'Artisan Account & Verification',
      subCategories: [
        'Artisan badge verification assistance',
        'Product listing & photo upload problem',
        'Dashboard or payment history error',
        'Trouble updating inventory or bank details',
      ],
    },
  ],
  industry: [
    {
      id: 'Bulk Order Disputes',
      icon: Package,
      title: 'Bulk Order Fulfillment',
      subCategories: [
        'Bulk order payment escrow dispute',
        'Artisan production / delivery delays',
        'Product quality inconsistencies in batch',
        'Quantity shortages in delivered consignment',
        'Incorrect specifications vs agreed contract',
      ],
    },
    {
      id: 'Work Assignment & Invoicing',
      icon: FileText,
      title: 'Work Orders & Mediation',
      subCategories: [
        'Work assignment milestone dispute',
        'Artisan communication failure',
        'Incomplete work order deliverables',
        'GST invoice / tax breakdown issue',
        'Request SkillBridge neutral mediation',
      ],
    },
    {
      id: 'Technical & Account',
      icon: HelpCircle,
      title: 'Corporate Account Support',
      subCategories: [
        'Corporate partner verification',
        'Bulk payment gateway inquiry',
        'Project dashboard issue',
      ],
    },
  ],
}

export const SupportCentre = ({ prefilledOrderId = null, prefilledOrderNumber = '' }) => {
  const { currentUser, openAuth } = useAuthDialog()
  const role = currentUser?.accountType || 'customer'
  const categories = ROLE_CATEGORIES[role] || ROLE_CATEGORIES.customer

  const [activeTab, setActiveTab] = useState('tickets') // 'tickets', 'create', 'disputes'
  const [tickets, setTickets] = useState([])
  const [disputes, setDisputes] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [ticketMessages, setTicketMessages] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [ticketFilterStatus, setTicketFilterStatus] = useState('all')

  // Create Ticket Form State
  const [formData, setFormData] = useState({
    category: categories[0]?.id || 'Payment Issues',
    subCategory: categories[0]?.subCategories[0] || '',
    subject: '',
    description: '',
    priority: 'Medium',
    relatedOrderNumber: prefilledOrderNumber || '',
  })
  const [ticketFiles, setTicketFiles] = useState([])
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [ticketError, setTicketError] = useState('')
  const [ticketSuccess, setTicketSuccess] = useState('')

  // Message Reply State
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState([])
  const [sendingReply, setSendingReply] = useState(false)
  const replyFileInputRef = useRef(null)

  // Reopen Modal State
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopening, setReopening] = useState(false)

  // Rating Modal State
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [ratingScore, setRatingScore] = useState(5)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  // Fetch Tickets
  const loadTickets = async () => {
    if (!currentUser) return
    setLoadingTickets(true)
    try {
      const params = {}
      if (ticketFilterStatus !== 'all') params.status = ticketFilterStatus
      const res = await getMyTicketsApi(params)
      if (res?.success) {
        setTickets(res.tickets || [])
      }
    } catch (err) {
      console.warn('Fetch tickets error:', err.message)
    } finally {
      setLoadingTickets(false)
    }
  }

  // Fetch Disputes
  const loadDisputes = async () => {
    if (!currentUser) return
    try {
      const res = await getMyDisputesApi()
      if (res?.success) {
        setDisputes(res.disputes || [])
      }
    } catch (err) {
      console.warn('Fetch disputes error:', err.message)
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadTickets()
      loadDisputes()
    }
  }, [currentUser, ticketFilterStatus])

  // Select ticket and load message thread
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket)
    setLoadingMessages(true)
    try {
      const res = await getTicketByIdApi(ticket.ticketId || ticket.id)
      if (res?.success) {
        setSelectedTicket(res.ticket)
        setTicketMessages(res.messages || [])
      }
    } catch (err) {
      console.warn('Load ticket messages error:', err.message)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Handle Create Ticket Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) {
      openAuth('login')
      return
    }

    if (!formData.subject.trim() || !formData.description.trim()) {
      setTicketError('Please provide a subject and detailed description.')
      return
    }

    setSubmittingTicket(true)
    setTicketError('')
    setTicketSuccess('')

    try {
      let attachments = []
      if (ticketFiles.length > 0) {
        const uploaded = await uploadSupportFilesApi(ticketFiles)
        attachments = uploaded.map((att, idx) => ({
          url: typeof att === 'string' ? att : att.url,
          name: att.name || ticketFiles[idx]?.name || `Supporting Photo ${idx + 1}`,
          fileType: att.fileType || ticketFiles[idx]?.fileType || 'image/jpeg',
          size: att.size || ticketFiles[idx]?.size || 0,
        }))
      }

      const payload = {
        category: formData.category,
        subCategory: formData.subCategory,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        relatedOrderId: formData.relatedOrderNumber.trim(),
        attachments,
      }

      const res = await createTicketApi(payload)
      if (res?.success) {
        setTicketSuccess(`Support ticket #${res.ticket?.ticketId} created!`)
        setFormData({
          category: categories[0]?.id || 'Payment Issues',
          subCategory: categories[0]?.subCategories[0] || '',
          subject: '',
          description: '',
          priority: 'Medium',
          relatedOrderNumber: '',
        })
        setTicketFiles([])
        await loadTickets()
        setTimeout(() => {
          setSelectedTicket(res.ticket)
          setActiveTab('tickets')
        }, 1200)
      } else {
        setTicketError(res?.message || 'Could not submit ticket.')
      }
    } catch (err) {
      setTicketError(err.message || 'Failed to submit ticket.')
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Handle Reply File Select
  const handleReplyFilesChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newItems = []
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 15MB file size limit.`)
        continue
      }
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        name: file.name,
        size: file.size,
        fileType: file.type || 'image/jpeg',
      })
    }

    setReplyFiles((prev) => [...prev, ...newItems].slice(0, 5))
    if (replyFileInputRef.current) replyFileInputRef.current.value = ''
  }

  const handleRemoveReplyFile = (idToRemove) => {
    setReplyFiles((prev) => prev.filter((item) => item.id !== idToRemove))
  }

  // Handle Reply Submit
  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket) return

    setSendingReply(true)
    try {
      let attachments = []
      if (replyFiles.length > 0) {
        const uploaded = await uploadSupportFilesApi(replyFiles)
        attachments = uploaded.map((att, idx) => ({
          url: typeof att === 'string' ? att : att.url,
          name: att.name || replyFiles[idx]?.name || `Attachment ${idx + 1}`,
          fileType: att.fileType || replyFiles[idx]?.fileType || 'image/jpeg',
          size: att.size || replyFiles[idx]?.size || 0,
        }))
      }

      const res = await replyToTicketApi(selectedTicket.ticketId || selectedTicket.id, {
        message: replyText.trim(),
        attachments,
      })

      if (res?.success) {
        setReplyText('')
        setReplyFiles([])
        // Refresh ticket thread
        const refreshed = await getTicketByIdApi(selectedTicket.ticketId || selectedTicket.id)
        if (refreshed?.success) {
          setSelectedTicket(refreshed.ticket)
          setTicketMessages(refreshed.messages || [])
        }
        await loadTickets()
      } else {
        alert(res?.message || 'Could not send reply.')
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply.')
    } finally {
      setSendingReply(false)
    }
  }

  // Handle Close Ticket
  const handleCloseTicket = async () => {
    if (!selectedTicket || !window.confirm('Are you sure you want to close this ticket?')) return
    try {
      const res = await closeTicketApi(selectedTicket.ticketId || selectedTicket.id, 'Closed by user.')
      if (res?.success) {
        setSelectedTicket(res.ticket)
        await loadTickets()
      }
    } catch (err) {
      alert(err.message || 'Failed to close ticket.')
    }
  }

  // Handle Reopen Ticket
  const handleReopenTicket = async (e) => {
    e.preventDefault()
    if (!reopenReason.trim() || !selectedTicket) return
    setReopening(true)
    try {
      const res = await reopenTicketApi(selectedTicket.ticketId || selectedTicket.id, reopenReason)
      if (res?.success) {
        setReopenModalOpen(false)
        setReopenReason('')
        setSelectedTicket(res.ticket)
        // Refresh thread
        const refreshed = await getTicketByIdApi(selectedTicket.ticketId || selectedTicket.id)
        if (refreshed?.success) {
          setTicketMessages(refreshed.messages || [])
        }
        await loadTickets()
      } else {
        alert(res?.message || 'Could not reopen ticket.')
      }
    } catch (err) {
      alert(err.message || 'Failed to reopen ticket.')
    } finally {
      setReopening(false)
    }
  }

  // Handle Rating Submit
  const handleRateSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTicket) return
    setSubmittingRating(true)
    try {
      const res = await rateTicketApi(selectedTicket.ticketId || selectedTicket.id, {
        score: ratingScore,
        feedback: ratingFeedback,
      })
      if (res?.success) {
        setRatingModalOpen(false)
        setSelectedTicket((prev) => ({ ...prev, rating: res.rating }))
        alert('Thank you for rating your support experience!')
      } else {
        alert(res?.message || 'Failed to record rating.')
      }
    } catch (err) {
      alert(err.message || 'Failed to record rating.')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="rounded-3xl border border-border/80 bg-surface p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-bold text-text-main">
          SkillBridge Central Support Centre
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-text-secondary">
          Please sign in to access personalized role support, submit tickets, track order inquiries, and view resolution decisions.
        </p>
        <button
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover cursor-pointer"
          onClick={() => openAuth('login')}
          type="button"
        >
          Sign In to Access Support
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-primary via-[#6d3215] to-[#4a210d] p-6 text-white shadow-card">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
              <LifeBuoy className="h-3.5 w-3.5 text-accent-light" />
              <span>SkillBridge Trust & Support Centre</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              {role === 'artisan'
                ? 'Artisan Protection & Support Hub'
                : role === 'industry'
                ? 'Corporate Industry Support & Mediation'
                : 'Customer Care & Resolution Centre'}
            </h1>
            <p className="mt-1 text-xs text-white/80">
              Fair, transparent assistance for orders, payments, quality claims, and disputes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-accent text-primary shadow-sm'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              onClick={() => {
                setActiveTab('create')
                setSelectedTicket(null)
              }}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Open Support Ticket</span>
            </button>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          <button
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-white text-primary shadow-xs'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => {
              setActiveTab('tickets')
              setSelectedTicket(null)
            }}
            type="button"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>My Support Tickets ({tickets.length})</span>
          </button>

          <button
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'disputes'
                ? 'bg-white text-primary shadow-xs'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => {
              setActiveTab('disputes')
              setSelectedTicket(null)
            }}
            type="button"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Order Disputes ({disputes.length})</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner for Artisans */}
      {role === 'artisan' && (
        <div className="flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-xs">
          <Shield className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-text-main">Fair Artisan Protection Policy</p>
            <p className="mt-0.5 text-text-secondary leading-relaxed">
              SkillBridge never penalizes or suspends artisan shops automatically upon customer complaints. Every case requires objective photo evidence, dispatch verification, and fair mediation before any resolution is decided.
            </p>
          </div>
        </div>
      )}

      {/* Role Protection Banner for Customers */}
      {role === 'customer' && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-4 text-xs">
          <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-900">SkillBridge Patron Buyer Protection</p>
            <p className="mt-0.5 text-emerald-800 leading-relaxed">
              Enjoy 7-day return eligibility and 14-day craftsmanship protection on all delivered orders. If an item arrives damaged, defective, or incorrect, our dispute team mediates a replacement or refund with verified proof.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: CREATE TICKET FORM
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-card">
          <div className="flex items-center justify-between border-b border-border/70 pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-text-main">
                Submit a Support Request
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Our team reviews inquiries within 24 hours. Choose the category matching your issue.
              </p>
            </div>
            <button
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-main cursor-pointer"
              onClick={() => setActiveTab('tickets')}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {ticketError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ticketError}</span>
            </div>
          )}

          {ticketSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-3.5 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{ticketSuccess}</span>
            </div>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleCreateSubmit}>
            {/* Category Selector Grid */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Select Issue Category
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = formData.category === cat.id
                  return (
                    <button
                      className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-secondary bg-secondary/10 shadow-xs'
                          : 'border-border/70 bg-background/50 hover:bg-surface-muted'
                      }`}
                      key={cat.id}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          category: cat.id,
                          subCategory: cat.subCategories[0] || '',
                        }))
                      }
                      type="button"
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-secondary text-white' : 'bg-surface text-secondary'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-text-main">{cat.title}</p>
                      <p className="text-[10px] text-text-muted">{cat.subCategories.length} common topics</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sub-Category Selector */}
            {(() => {
              const activeCatObj = categories.find((c) => c.id === formData.category)
              if (!activeCatObj || !activeCatObj.subCategories?.length) return null
              return (
                <div>
                  <label className="text-xs font-bold text-text-main">
                    Specific Problem Reason
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-text-main outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subCategory: e.target.value }))
                    }
                    value={formData.subCategory}
                  >
                    {activeCatObj.subCategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })()}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-text-main">
                  Related Order ID / Number (Optional)
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      relatedOrderNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g. ORD-1731600000-1234"
                  type="text"
                  value={formData.relatedOrderNumber}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-main">Urgency / Priority</label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-text-main outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  value={formData.priority}
                >
                  <option value="Low">Low - General Question</option>
                  <option value="Medium">Medium - Standard Inquiry</option>
                  <option value="High">High - Delivery / Quality Problem</option>
                  <option value="Urgent">Urgent - Payment Deducted / Lost Consignment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-main">
                Subject Line
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Brief summary of your request"
                required
                type="text"
                value={formData.subject}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-main">
                Detailed Description & Explanation
              </label>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-border bg-white p-3.5 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Please describe what happened, dates, and what assistance you require..."
                required
                rows={4}
                value={formData.description}
              />
            </div>

            <div>
              <ImageUploadArea
                items={ticketFiles}
                onChange={setTicketFiles}
                maxFiles={5}
                label="Supporting Photographs & Documents"
                helperText="Upload photographs of product damage, defective finishes, or invoices (up to 5 files, 15MB each)."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
                onClick={() => setActiveTab('tickets')}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:shadow hover:brightness-105 disabled:opacity-50 cursor-pointer"
                disabled={submittingTicket}
                type="submit"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submittingTicket ? 'Submitting…' : 'Submit Support Ticket'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: MY TICKETS LIST & CONVERSATION THREAD
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Tickets Sidebar / List */}
          <div className={`${selectedTicket ? 'hidden lg:block lg:col-span-5' : 'col-span-12'} space-y-4`}>
            {/* Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface p-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-secondary" />
                <span className="text-xs font-bold text-text-main">Status:</span>
                <select
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text-main outline-none focus:border-secondary"
                  onChange={(e) => setTicketFilterStatus(e.target.value)}
                  value={ticketFilterStatus}
                >
                  <option value="all">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Waiting for User">Waiting for You</option>
                  <option value="Escalated">Escalated</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <button
                aria-label="Refresh tickets"
                className="rounded-lg p-1 text-text-muted hover:text-text-main cursor-pointer"
                onClick={loadTickets}
                type="button"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Ticket Cards */}
            {loadingTickets ? (
              <div className="py-12 text-center text-xs text-text-muted">Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border-strong bg-surface/50 p-8 text-center">
                <LifeBuoy className="mx-auto h-8 w-8 text-secondary/60" />
                <p className="mt-2 text-sm font-bold text-text-main">No Support Tickets Found</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Have an issue with an order, payment, or craft? Open a ticket to receive help.
                </p>
                <button
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover cursor-pointer"
                  onClick={() => setActiveTab('create')}
                  type="button"
                >
                  Open Your First Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => {
                  const statusInfo = STATUS_THEMES[t.status] || STATUS_THEMES.Open
                  const priorityClass = PRIORITY_THEMES[t.priority] || PRIORITY_THEMES.Medium
                  const isCurrent = selectedTicket && (selectedTicket.ticketId === t.ticketId || selectedTicket.id === t.id)

                  return (
                    <div
                      className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                        isCurrent
                          ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/30'
                          : 'border-border/80 bg-surface hover:border-secondary/30'
                      }`}
                      key={t.ticketId || t.id}
                      onClick={() => handleSelectTicket(t)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          #{t.ticketId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorityClass}`}>
                            {t.priority}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusInfo.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-2 text-xs font-bold text-text-main line-clamp-1">
                        {t.subject}
                      </h3>
                      <p className="mt-1 text-[11px] text-text-muted line-clamp-2">
                        {t.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-text-muted">
                        <span>{t.category}</span>
                        <span>{new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ticket Detail / Conversation Thread */}
          <div className={`${selectedTicket ? 'col-span-12 lg:col-span-7' : 'hidden lg:block lg:col-span-7'}`}>
            {selectedTicket ? (
              <div className="rounded-3xl border border-border/80 bg-surface shadow-card overflow-hidden">
                {/* Header */}
                <div className="border-b border-border/70 p-5 bg-surface-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg p-1 text-text-muted hover:text-text-main lg:hidden cursor-pointer"
                        onClick={() => setSelectedTicket(null)}
                        type="button"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-xs font-bold text-primary">
                        #{selectedTicket.ticketId}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${(STATUS_THEMES[selectedTicket.status] || STATUS_THEMES.Open).bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${(STATUS_THEMES[selectedTicket.status] || STATUS_THEMES.Open).dot}`} />
                        <span>{(STATUS_THEMES[selectedTicket.status] || STATUS_THEMES.Open).label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedTicket.status === 'Resolved' && (
                        <button
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          onClick={() => setRatingModalOpen(true)}
                          type="button"
                        >
                          <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                          <span>{selectedTicket.rating?.score ? `${selectedTicket.rating.score}★ Rated` : 'Rate Experience'}</span>
                        </button>
                      )}

                      {['Resolved', 'Closed'].includes(selectedTicket.status) ? (
                        <button
                          className="inline-flex items-center gap-1 rounded-xl border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/20 cursor-pointer"
                          onClick={() => setReopenModalOpen(true)}
                          type="button"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Reopen</span>
                        </button>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted hover:text-error cursor-pointer"
                          onClick={handleCloseTicket}
                          type="button"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Close Ticket</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-3 font-serif text-lg font-bold text-text-main">
                    {selectedTicket.subject}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                    <span>Category: <strong className="text-text-main">{selectedTicket.category}</strong></span>
                    {selectedTicket.subCategory && <span>Reason: <strong className="text-text-main">{selectedTicket.subCategory}</strong></span>}
                    {selectedTicket.relatedOrderNumber && (
                      <span className="font-mono">Order: <strong>#{selectedTicket.relatedOrderNumber}</strong></span>
                    )}
                    <span>Opened: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="max-h-[440px] min-h-[220px] overflow-y-auto p-5 space-y-4 bg-background/30">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-text-muted">Loading conversation…</div>
                  ) : (
                    ticketMessages.map((msg) => {
                      const isMe = msg.sender === currentUser._id || msg.sender?.id === currentUser._id || msg.senderRole === currentUser.accountType
                      const isStaffUser = ['admin', 'support'].includes(msg.senderRole)

                      return (
                        <div
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          key={msg.id || msg._id}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                            <span className="font-bold text-text-main">{msg.senderName}</span>
                            <span className="uppercase text-[9px] px-1.5 py-0.2 rounded-full bg-surface border border-border">
                              {msg.senderRole}
                            </span>
                            <time>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs leading-relaxed ${
                              isStaffUser
                                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-amber-950'
                                : isMe
                                ? 'bg-primary text-white'
                                : 'bg-surface border border-border text-text-main'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>

                            {/* Attachments if any */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                                {msg.attachments.map((att, idx) => {
                                  const isImg =
                                    att.url &&
                                    (att.url.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) ||
                                      att.url.startsWith('data:image/') ||
                                      att.url.includes('/uploads/'))

                                  return (
                                    <a
                                      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] underline opacity-90 hover:opacity-100 transition-opacity ${
                                        isMe ? 'bg-black/15 text-white' : 'bg-surface-muted text-text-main'
                                      }`}
                                      href={att.url}
                                      key={idx}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {isImg ? (
                                        <img
                                          alt={att.name || 'Attachment'}
                                          className="h-4 w-4 rounded object-cover"
                                          src={att.url}
                                        />
                                      ) : (
                                        <ImageIcon className="h-3 w-3" />
                                      )}
                                      <span>{att.name || `Attachment ${idx + 1}`}</span>
                                    </a>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Reply Input Box */}
                {selectedTicket.status !== 'Closed' ? (
                  <form className="border-t border-border/70 p-4 bg-surface" onSubmit={handleSendReply}>
                    <textarea
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your response to the support team…"
                      rows={2}
                      value={replyText}
                    />

                    {/* Selected File Attachments Preview */}
                    {replyFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {replyFiles.map((item) => (
                          <div
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted/60 px-2 py-1 text-[11px] text-text-main shadow-2xs"
                            key={item.id}
                          >
                            {item.preview ? (
                              <img
                                alt={item.name}
                                className="h-4 w-4 rounded object-cover"
                                src={item.preview}
                              />
                            ) : (
                              <ImageIcon className="h-3 w-3 text-primary" />
                            )}
                            <span className="max-w-[120px] truncate font-medium">{item.name}</span>
                            <button
                              className="ml-1 text-text-muted hover:text-rose-600 cursor-pointer"
                              onClick={() => handleRemoveReplyFile(item.id)}
                              type="button"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <input
                        accept="image/*,.pdf"
                        className="hidden"
                        multiple
                        onChange={handleReplyFilesChange}
                        ref={replyFileInputRef}
                        type="file"
                      />

                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted hover:text-text-main transition-colors cursor-pointer"
                        onClick={() => replyFileInputRef.current?.click()}
                        type="button"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                        <span>Attach Images ({replyFiles.length}/5)</span>
                      </button>

                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                        disabled={sendingReply || (!replyText.trim() && replyFiles.length === 0)}
                        type="submit"
                      >
                        <Send className="h-3 w-3" />
                        <span>{sendingReply ? 'Sending…' : 'Send Reply'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-border/70 p-4 bg-surface-muted/30 text-center text-xs text-text-muted">
                    This ticket is closed. Click &quot;Reopen&quot; above if your issue remains unresolved.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border-strong bg-surface/50 p-12 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-secondary/60" />
                <p className="mt-2 text-sm font-bold text-text-main">Select a Ticket to View History</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Click on any ticket in the left list to review its status timeline and reply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ORDER DISPUTES TAB
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'disputes' && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-card">
          <div className="border-b border-border/70 pb-4">
            <h2 className="font-serif text-xl font-bold text-text-main">
              Order Disputes & Craft Claims
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Structured mediation between customers, artisans, and industries with evidence records and resolution summaries.
            </p>
          </div>

          {disputes.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600/70" />
              <p className="mt-3 font-serif text-base font-bold text-text-main">
                No Active Disputes on Record
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted leading-relaxed">
                All your orders and craft fulfillments are in good standing. If you experience an order quality or payment problem, you can raise a complaint directly from your order details page.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {disputes.map((dsp) => (
                <div
                  className="rounded-2xl border border-border/80 bg-background/50 p-5 shadow-xs transition hover:border-secondary/40"
                  key={dsp.disputeId || dsp.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">
                        #{dsp.disputeId}
                      </span>
                      <span className="ml-2 font-mono text-xs text-text-muted">
                        (Order #{dsp.orderNumber})
                      </span>
                    </div>

                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                      {dsp.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-text-muted">Item & Category</p>
                      <p className="text-xs font-bold text-text-main">{dsp.productTitle}</p>
                      <p className="text-xs text-secondary font-medium">{dsp.category}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase text-text-muted">Parties Involved</p>
                      <p className="text-xs text-text-main">
                        Claimant: <strong className="font-semibold">{dsp.initiatorName}</strong> ({dsp.initiatorRole})
                      </p>
                      <p className="text-xs text-text-main">
                        Artisan: <strong className="font-semibold">{dsp.respondentName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-surface p-3.5 border border-border/60 text-xs">
                    <p className="font-bold text-text-main">Claim Explanation:</p>
                    <p className="mt-1 text-text-secondary italic">&quot;{dsp.customerExplanation}&quot;</p>

                    {dsp.artisanExplanation && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <p className="font-bold text-secondary">Artisan Counter-Explanation:</p>
                        <p className="mt-1 text-text-secondary italic">&quot;{dsp.artisanExplanation}&quot;</p>
                      </div>
                    )}
                  </div>

                  {dsp.resolution?.type && dsp.resolution.type !== 'None' && (
                    <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-950">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Award className="h-4 w-4 text-emerald-700" />
                        <span>Official Resolution: {dsp.resolution.type}</span>
                      </div>
                      {dsp.resolution.amount > 0 && (
                        <p className="mt-1 font-mono font-bold">Refund Amount: ₹{dsp.resolution.amount.toLocaleString('en-IN')}</p>
                      )}
                      <p className="mt-1 text-emerald-900 leading-relaxed">{dsp.resolution.reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REOPEN TICKET
      ────────────────────────────────────────────────────────────── */}
      {reopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-text-main">
              Reopen Ticket #{selectedTicket?.ticketId}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Explain why the issue is still unresolved. Our mediation team will resume review.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleReopenTicket}>
              <textarea
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-text-main outline-none focus:border-secondary"
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="State your reason for reopening..."
                required
                rows={3}
                value={reopenReason}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
                  onClick={() => setReopenModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                  disabled={reopening || !reopenReason.trim()}
                  type="submit"
                >
                  {reopening ? 'Reopening…' : 'Submit Reopen Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RATE SUPPORT EXPERIENCE
      ────────────────────────────────────────────────────────────── */}
      {ratingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-text-main">
              Rate Support Experience
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              How satisfied were you with the resolution of ticket #{selectedTicket?.ticketId}?
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleRateSubmit}>
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    className="p-1 cursor-pointer transition hover:scale-110"
                    key={star}
                    onClick={() => setRatingScore(star)}
                    type="button"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= ratingScore
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-text-main outline-none focus:border-secondary"
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Optional feedback about the support handler's response..."
                rows={3}
                value={ratingFeedback}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
                  onClick={() => setRatingModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                  disabled={submittingRating}
                  type="submit"
                >
                  {submittingRating ? 'Saving…' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportCentre
