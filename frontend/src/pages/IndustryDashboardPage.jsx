import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  AlertCircle,
  Award,
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  Info,
  LifeBuoy,
  MapPin,
  PackagePlus,
  Printer,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react'
import {
  createPaymentOrderApi,
  verifyPaymentApi,
  reportPaymentFailureApi,
} from '../services/payment-api'
import { loadRazorpayScript } from '../utils/razorpay'
import { getRankedArtisanProductsApi } from '../services/marketplace-api'
import IndustryLayout from '../components/layout/IndustryLayout'
import { useAuthDialog } from '../hooks/useAuthDialog'
import DisputeModal from '../components/support/DisputeModal'
import { getArtisansApi } from '../services/auth-api'
import { getAccountHomePath } from '../utils/account-routing'
import {
  analyzeProjectApi,
  createIndustryProjectApi,
  updateIndustryProjectApi,
  assignProjectToArtisanApi,
  getAvailableArtisansForIndustryApi,
  getIndustryDashboardApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../services/industry-api'

const inputClass =
  'mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-3 text-text-main outline-none transition placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/25'

const ACCEPTED_STATUSES = [
  'Accepted',
  'Processing',
  'Ready to ship',
  'Shipped',
  'Completed',
]

function getStatusStyle(status) {
  if (ACCEPTED_STATUSES.includes(status)) {
    return 'bg-green-50 text-success border-success/30'
  }
  if (status === 'Rejected') return 'bg-red-50 text-error border-error/30'
  return 'bg-amber-50 text-amber-800 border-amber-200'
}

const IndustryDashboardPage = () => {
  const { currentUser } = useAuthDialog()

  const [artisans, setArtisans] = useState([])
  const [orders, setOrders] = useState([])
  const [rankedProducts, setRankedProducts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0)
  const [stats, setStats] = useState({
    totalRequests: 0,
    awaitingResponse: 0,
    acceptedByArtisans: 0,
    completedProjects: 0,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Payment Integration States
  const [payingOrderId, setPayingOrderId] = useState(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [confirmPaymentOrder, setConfirmPaymentOrder] = useState(null)
  const [paymentReceiptModal, setPaymentReceiptModal] = useState(null)
  const [modalError, setModalError] = useState('')
  const [disputeModalOrder, setDisputeModalOrder] = useState(null)

  // Intelligent Matching & Editing States
  const [editingRequirement, setEditingRequirement] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [assigningArtisanId, setAssigningArtisanId] = useState(null)

  // Smart Responsible Analysis State
  const [analysisData, setAnalysisData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [formFields, setFormFields] = useState({
    artisanId: '',
    title: '',
    category: '',
    quantity: 1,
    unitPrice: 500,
    duration: '30 days',
    deadline: '',
    requiredQualityLevel: 'Any',
    preferredLocation: '',
    details: '',
  })

  // Load registered artisans from backend
  const loadArtisans = useCallback(async () => {
    try {
      const res = await getAvailableArtisansForIndustryApi()
      if (Array.isArray(res?.artisans) && res.artisans.length) {
        setArtisans(res.artisans)
        return
      }
    } catch {
      // fallback to auth artisans
    }
    try {
      const authArtisans = await getArtisansApi()
      if (Array.isArray(authArtisans)) {
        setArtisans(authArtisans)
      }
    } catch {
      setArtisans([])
    }
  }, [])

  // Load dashboard, orders and notifications from backend API
  const refreshBackendData = useCallback(async () => {
    if (!currentUser || currentUser.accountType !== 'industry') return

    try {
      const res = await getIndustryDashboardApi()
      if (res?.success) {
        if (res.stats) {
          setStats(res.stats)
          setUnreadNotifsCount(res.stats.unreadNotificationsCount || 0)
        }
        if (Array.isArray(res.recentNotifications)) {
          setNotifications(res.recentNotifications)
        }
        if (Array.isArray(res.availableArtisans) && res.availableArtisans.length) {
          setArtisans(res.availableArtisans)
        }

        // Merge backend projects & orders with complete payment statuses
        const backendOrders = Array.isArray(res.orders) ? res.orders : []
        const backendProjects = Array.isArray(res.projects)
          ? res.projects.map((p) => {
              const matchedOrder = backendOrders.find(
                (bo) =>
                  bo._id === p.orderRef ||
                  bo.id === p.orderRef ||
                  bo.orderNumber === p.orderRef ||
                  (bo.items?.[0]?.name === p.title &&
                    bo.assignedArtisan?.name === p.assignedArtisan?.name)
              )
              return {
                id: p.id || p._id,
                _id: p._id,
                orderRef: p.orderRef || matchedOrder?._id,
                orderNumber: matchedOrder?.orderNumber || p.orderNumber || p.id,
                createdAt: p.createdAt,
                deadline: p.deadline,
                duration: p.duration,
                durationDays: p.durationDays,
                specifications: p.specifications,
                requiredQualityLevel: p.requiredQualityLevel || 'Any',
                preferredLocation: p.preferredLocation || '',
                matchedArtisans: Array.isArray(p.matchedArtisans) ? p.matchedArtisans : [],
                rawStatus: p.status,
                items: [
                  {
                    name: p.title,
                    category: p.category,
                    artisan: p.assignedArtisan?.name || 'Open / Unassigned',
                    price: p.unitPrice,
                    quantity: p.quantity,
                    status: p.status,
                  },
                ],
                subtotal: p.totalBudget || p.unitPrice * p.quantity,
                total: p.totalBudget || p.unitPrice * p.quantity,
                totalAmount: p.totalBudget || p.unitPrice * p.quantity,
                status: p.status === 'Open' ? 'Awaiting response' : p.status,
                paymentStatus: matchedOrder?.paymentStatus || p.paymentStatus || 'pending',
                razorpayPaymentId: matchedOrder?.razorpayPaymentId || p.razorpayPaymentId || '',
                paidAt: matchedOrder?.paidAt || p.paidAt || null,
                assignedArtisan: p.assignedArtisan || {},
                responsibleAnalysis: p.responsibleAnalysis,
              }
            })
          : []

        const combined = [...backendProjects]
        backendOrders.forEach((bo) => {
          if (!combined.some((p) => p.id === bo.id || p.orderRef === bo._id || p.orderRef === bo.id)) {
            combined.push({
              ...bo,
              orderRef: bo._id,
              total: bo.total || bo.totalAmount,
              paymentStatus: bo.paymentStatus || 'pending',
              razorpayPaymentId: bo.razorpayPaymentId || '',
              paidAt: bo.paidAt || null,
            })
          }
        })
        setOrders(combined)
        getRankedArtisanProductsApi({ limit: 6 })
          .then((rankedRes) => {
            if (rankedRes?.success && Array.isArray(rankedRes.products)) {
              setRankedProducts(rankedRes.products)
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      console.warn('Backend industry fetch error:', err.message)
    }
  }, [currentUser])

  // Periodic polling for realtime acceptance updates
  useEffect(() => {
    loadArtisans()
    refreshBackendData()

    const intervalId = window.setInterval(refreshBackendData, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadArtisans, refreshBackendData])

  const acceptedOrders = useMemo(
    () => orders.filter((order) => ACCEPTED_STATUSES.includes(order.status)),
    [orders],
  )

  // Trigger On-The-Fly Project Feasibility & Responsible Project Analysis
  const handleAnalyzeProject = async () => {
    if (!formFields.title || !formFields.category) {
      setNotice('Please provide at least a project title and category to run analysis.')
      setNoticeIsError(true)
      return
    }

    setIsAnalyzing(true)
    setNotice('')
    try {
      const res = await analyzeProjectApi({
        title: formFields.title,
        category: formFields.category,
        quantity: Number(formFields.quantity) || 1,
        unitPrice: Number(formFields.unitPrice) || 0,
        duration: formFields.duration || '30 days',
        deadline: formFields.deadline || null,
        specifications: formFields.details || '',
      })

      if (res?.analysis) {
        setAnalysisData(res.analysis)
      }
    } catch (err) {
      console.warn('Backend analysis API offline, using local heuristics:', err.message)
      // Local fallback analysis
      const qty = Number(formFields.quantity) || 1
      const price = Number(formFields.unitPrice) || 500
      setAnalysisData({
        feasibilityScore: 88,
        feasibilityStatus: 'High Feasibility',
        fairWageRating: price >= 400 ? 'Fair Wage Verified' : 'Standard Compensation',
        fairWageScore: price >= 400 ? 92 : 75,
        effectiveHourlyRate: Math.round(price * 0.4),
        estimatedLaborHours: qty * 8,
        suggestedPricePerUnit: Math.max(price, 450),
        suggestedDurationDays: Math.max(qty * 2, 14),
        sustainabilityIndex: {
          score: 86,
          badge: 'Fair Craft Certified 🌿',
        },
        analysisSummary: `Project analysis indicates good feasibility. The offered price of ₹${price}/unit provides ethical compensation for artisanal craftsmanship.`,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle Mark Single Notification Read
  const handleMarkNotificationRead = async (id) => {
    try {
      await markNotificationReadApi(id)
    } catch (e) {
      console.warn('Mark notif read error:', e.message)
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n._id === id ? { ...n, isRead: true } : n))
    )
    setUnreadNotifsCount((prev) => Math.max(0, prev - 1))
  }

  // Handle Mark All Notifications Read
  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsReadApi()
    } catch (e) {
      console.warn('Mark all notifs read error:', e.message)
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadNotifsCount(0)
  }

  // ==========================================
  // PAYMENT HANDLERS (RAZORPAY INTEGRATION)
  // ==========================================
  const handleProceedPayment = async (orderToPay) => {
    if (!orderToPay) return
    const targetOrderId = orderToPay.orderRef || orderToPay.id || orderToPay._id
    setIsProcessingPayment(true)
    setPayingOrderId(orderToPay.id || orderToPay._id)
    setModalError('')
    setNotice('')
    setNoticeIsError(false)

    try {
      // 1. Ensure Razorpay Checkout SDK script is loaded
      const isScriptLoaded = await loadRazorpayScript()
      if (!isScriptLoaded || typeof window.Razorpay === 'undefined') {
        throw new Error(
          'Could not load the Razorpay checkout interface. Please check your internet connection or use Simulate Test Payment.'
        )
      }

      // 2. Initialize payment order on backend
      const response = await createPaymentOrderApi({ existingOrderId: targetOrderId })
      if (!response?.success || !response.razorpayOrderId) {
        throw new Error(response?.message || 'Unable to initialize payment order on server.')
      }

      const { razorpayOrderId, amount, currency, keyId, orderNumber } = response
      if (razorpayOrderId.startsWith('order_test_')) {
        throw new Error(
          'Razorpay could not create a checkout order. Check that the matching test Key ID and Key Secret are set in backend/.env, restart the backend, or use Simulate Test Payment for local testing.'
        )
      }

      // 3. Configure Razorpay checkout modal
      const options = {
        key: keyId,
        amount,
        currency: currency || 'INR',
        name: 'SkillBridge',
        description: `Payment for ${orderToPay.items?.[0]?.name || 'Production Order'} to ${orderToPay.assignedArtisan?.name || 'Artisan'}`,
        order_id: razorpayOrderId,
        prefill: {
          name: currentUser.contactName || currentUser.name || '',
          email: currentUser.email || '',
          contact: currentUser.phone || '',
        },
        notes: {
          orderId: targetOrderId,
          orderNumber: orderNumber || orderToPay.id,
          artisanName: orderToPay.assignedArtisan?.name || '',
          industryName: currentUser.name || '',
        },
        theme: {
          color: '#8B4513',
        },
        handler: async function (paymentResponse) {
          try {
            setIsProcessingPayment(true)
            const verifyRes = await verifyPaymentApi({
              orderId: targetOrderId,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            })

            if (verifyRes?.success) {
              setNotice(
                `🎉 Payment of ₹${orderToPay.total?.toLocaleString('en-IN')} verified successfully! Artisan ${
                  orderToPay.assignedArtisan?.name || ''
                } has received your payment. Transaction ID: ${paymentResponse.razorpay_payment_id}`
              )
              setNoticeIsError(false)
              setConfirmPaymentOrder(null)

              setPaymentReceiptModal({
                ...orderToPay,
                paymentStatus: 'paid',
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                paidAt: new Date(),
                orderNumber: orderNumber || orderToPay.id,
              })

              await refreshBackendData()
            } else {
              throw new Error(verifyRes?.message || 'Payment signature verification failed.')
            }
          } catch (vErr) {
            console.error('Payment verification error:', vErr)
            setModalError(vErr.message || 'Payment verification failed.')
            setNotice(vErr.message || 'Payment verification failed.')
            setNoticeIsError(true)
          } finally {
            setIsProcessingPayment(false)
            setPayingOrderId(null)
          }
        },
        modal: {
          ondismiss: function () {
            reportPaymentFailureApi({
              orderId: targetOrderId,
              razorpay_order_id: razorpayOrderId,
              error: { description: 'Payment modal closed by user.' },
            }).catch(() => {})
            setNotice('Payment window was closed. You can retry whenever you are ready.')
            setIsProcessingPayment(false)
            setPayingOrderId(null)
          },
        },
      }

      const rzpInstance = new window.Razorpay(options)
      rzpInstance.on('payment.failed', function (failureData) {
        reportPaymentFailureApi({
          orderId: targetOrderId,
          razorpay_order_id: razorpayOrderId,
          error: failureData?.error,
        }).catch(() => {})
        setModalError(failureData?.error?.description || 'Payment failed.')
        setIsProcessingPayment(false)
        setPayingOrderId(null)
      })

      rzpInstance.open()
    } catch (err) {
      console.error('Checkout error:', err)
      setModalError(err.message || 'Unable to open checkout.')
      setIsProcessingPayment(false)
      setPayingOrderId(null)
    }
  }

  // Seamless Simulation Fallback (for instant test verification)
  const handleSimulatePayment = async (orderToPay) => {
    if (!orderToPay) return
    const targetOrderId = orderToPay.orderRef || orderToPay.id || orderToPay._id
    setIsProcessingPayment(true)
    setPayingOrderId(orderToPay.id || orderToPay._id)
    setModalError('')
    setNotice('')
    setNoticeIsError(false)

    try {
      const initRes = await createPaymentOrderApi({ existingOrderId: targetOrderId })
      const orderNumber = initRes?.orderNumber || orderToPay.id

      const testRazorpayOrderId = initRes?.razorpayOrderId || `order_test_${Date.now()}`
      const testPaymentId = `pay_test_${Date.now()}`

      const verifyRes = await verifyPaymentApi({
        orderId: targetOrderId,
        razorpay_order_id: testRazorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'simulated_test_signature',
      })

      if (verifyRes?.success) {
        setNotice(
          `🎉 Test payment of ₹${orderToPay.total?.toLocaleString('en-IN')} completed and verified! Artisan ${
            orderToPay.assignedArtisan?.name || ''
          } has received your payment. Transaction ID: ${testPaymentId}`
        )
        setNoticeIsError(false)
        setConfirmPaymentOrder(null)

        setPaymentReceiptModal({
          ...orderToPay,
          paymentStatus: 'paid',
          razorpayPaymentId: testPaymentId,
          paidAt: new Date(),
          orderNumber,
        })

        await refreshBackendData()
      } else {
        throw new Error(verifyRes?.message || 'Simulated payment verification failed.')
      }
    } catch (err) {
      console.error('Simulate payment error:', err)
      setModalError(err.message || 'Simulation payment failed.')
      setNotice(err.message || 'Payment verification failed.')
      setNoticeIsError(true)
    } finally {
      setIsProcessingPayment(false)
      setPayingOrderId(null)
    }
  }

  if (!currentUser) {
    return <Navigate replace to="/industry/auth" />
  }
  if (currentUser.accountType !== 'industry') {
    return <Navigate replace to={getAccountHomePath(currentUser)} />
  }

  // Handle Form Submit: Create Requirement & Run Auto-Matching
  const handleCreateOrder = async (event) => {
    event.preventDefault()
    setNotice('')
    setNoticeIsError(false)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const artisanId = formData.get('artisanId') || ''
    const artisan = artisanId ? artisans.find((entry) => entry.id === artisanId || entry._id === artisanId) : null

    const quantity = Number(formData.get('quantity')) || 1
    const unitPrice = Number(formData.get('unitPrice')) || 0
    const title = String(formData.get('title')).trim()
    const category = String(formData.get('category')).trim()
    const duration = String(formData.get('duration')).trim() || '30 days'
    const details = String(formData.get('details')).trim()
    const deadline = String(formData.get('deadline'))
    const requiredQualityLevel = String(formData.get('requiredQualityLevel') || 'Any')
    const preferredLocation = String(formData.get('preferredLocation') || '').trim()

    // Create project in backend with automatic intelligent matching
    try {
      const res = await createIndustryProjectApi({
        title,
        category,
        quantity,
        unitPrice,
        duration,
        deadline,
        requiredQualityLevel,
        preferredLocation,
        specifications: details,
        assignedArtisanId: artisan ? (artisan.id || artisan._id) : null,
      });

      if (res?.success) {
        const matchesCount = res.project?.matchedArtisans?.length || 0;
        setNotice(
          artisan
            ? `Requirement created and assigned to ${artisan.name} successfully at ₹${unitPrice}/item for ${duration}. The artisan has received your request.`
            : `Requirement submitted! Skill Bridge has automatically evaluated and ranked ${matchesCount} eligible artisans based on your specifications.`
        );
      } else {
        throw new Error(res?.message || 'Failed to submit requirement.');
      }
    } catch (apiErr) {
      console.error('Backend project creation error:', apiErr.message);
      setNotice(apiErr.message || 'The requirement could not be submitted.');
      setNoticeIsError(true);
    }

    await refreshBackendData();
    setFormOpen(false)
    setAnalysisData(null)
    setIsSubmitting(false)
    event.currentTarget.reset()
  }

  // Handle Update Requirement & Automatically Recalculate Matches
  const handleUpdateRequirement = async (event) => {
    event.preventDefault()
    if (!editingRequirement) return
    setIsUpdating(true)
    setNotice('')
    setNoticeIsError(false)

    const formData = new FormData(event.currentTarget)
    const updateData = {
      title: String(formData.get('title')).trim(),
      category: String(formData.get('category')).trim(),
      quantity: Number(formData.get('quantity')) || 1,
      unitPrice: Number(formData.get('unitPrice')) || 0,
      duration: String(formData.get('duration')).trim() || '30 days',
      deadline: String(formData.get('deadline')),
      requiredQualityLevel: String(formData.get('requiredQualityLevel') || 'Any'),
      preferredLocation: String(formData.get('preferredLocation') || '').trim(),
      specifications: String(formData.get('details')).trim(),
    }

    try {
      const res = await updateIndustryProjectApi(
        editingRequirement.id || editingRequirement._id,
        updateData
      )
      if (res?.success) {
        const matchesCount = res.project?.matchedArtisans?.length || 0
        setNotice(
          `✅ Requirement updated! Skill Bridge has automatically recalculated matches and re-ranked ${matchesCount} artisans.`
        )
        setEditingRequirement(null)
        await refreshBackendData()
      } else {
        throw new Error(res?.message || 'Failed to update requirement.')
      }
    } catch (err) {
      console.error('Update requirement error:', err)
      setNotice(err.message || 'Failed to update requirement.')
      setNoticeIsError(true)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle 1-Click Assignment of a Matched Artisan
  const handleAssignMatchedArtisan = async (orderOrProject, matchedArtisan) => {
    if (!orderOrProject || !matchedArtisan) return
    const targetProjectId = orderOrProject.id || orderOrProject._id
    setAssigningArtisanId(matchedArtisan.artisanId)
    setNotice('')
    setNoticeIsError(false)

    try {
      const res = await assignProjectToArtisanApi(targetProjectId, {
        artisanId: matchedArtisan.artisanId,
        agreedPrice:
          matchedArtisan.quotedPrice ||
          orderOrProject.unitPrice ||
          orderOrProject.items?.[0]?.price,
        agreedDuration: `${matchedArtisan.estimatedDeliveryDays || 30} days`,
        deadline: orderOrProject.deadline,
        specifications: orderOrProject.specifications,
      })

      if (res?.success) {
        setNotice(
          `🎉 Production order assigned to ${matchedArtisan.name} successfully! They have been notified immediately.`
        )
        await refreshBackendData()
      } else {
        throw new Error(res?.message || 'Failed to assign project to artisan.')
      }
    } catch (err) {
      console.error('Assign artisan error:', err)
      setNotice(err.message || 'Failed to assign project to artisan.')
      setNoticeIsError(true)
    } finally {
      setAssigningArtisanId(null)
    }
  }

  const artisanCategories = [
    ...new Set(artisans.map((artisan) => artisan.artCategory).filter(Boolean)),
  ]

  return (
    <IndustryLayout>
      <main className="w-full px-4 py-6 sm:px-8 sm:py-9 lg:px-12">
        {/* Workspace Banner */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="relative overflow-hidden bg-primary px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="absolute -right-12 -top-32 h-72 w-72 rounded-full border border-white/10" />
            <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">
                  Industry partner workspace
                </p>
                <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
                  Welcome, {currentUser.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                  Assign custom projects to master artisans according to price and
                  time duration, analyze responsible craft metrics, and receive instant acceptance notifications.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Notification Bell with Badge */}
                <button
                  className="relative inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                  onClick={() => setNotifDrawerOpen((prev) => !prev)}
                  type="button"
                >
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                  {unreadNotifsCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-primary">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>

                <Link
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                  to="/support"
                >
                  <LifeBuoy className="h-4 w-4 text-accent-light" />
                  <span>Support & Mediation</span>
                </Link>

                <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white">
                  <Building2 aria-hidden="true" className="h-4 w-4" />
                  {currentUser.industry || 'Industry partner'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
            <div>
              <p className="font-semibold text-text-main">
                {currentUser.contactName || currentUser.name}
              </p>
              <p className="mt-0.5 text-sm text-text-muted">{currentUser.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                onClick={() => {
                  setNotice('')
                  setFormOpen((isOpen) => !isOpen)
                }}
                type="button"
              >
                <PackagePlus aria-hidden="true" className="h-4 w-4" />
                {formOpen ? 'Close requirement form' : 'Submit a new requirement'}
              </button>
            </div>
          </div>
        </section>

        {/* Real-time Notification Panel */}
        {notifDrawerOpen && (
          <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-secondary" />
                <h3 className="font-serif text-lg font-semibold text-text-main">
                  Artisan Acceptance & Status Updates
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {unreadNotifsCount > 0 && (
                  <button
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={handleMarkAllNotificationsRead}
                    type="button"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-muted"
                  onClick={() => setNotifDrawerOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {notifications.length ? (
                notifications.map((notif) => (
                  <div
                    className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition ${
                      notif.isRead
                        ? 'border-border bg-background/60 text-text-secondary'
                        : 'border-secondary/30 bg-secondary/5 text-text-main'
                    }`}
                    key={notif.id || notif._id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-main">{notif.title}</p>
                        <p className="mt-1 text-sm leading-5">{notif.message}</p>
                        <p className="mt-2 text-xs text-text-muted">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!notif.isRead && (
                      <button
                        aria-label="Mark read"
                        className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-main"
                        onClick={() => handleMarkNotificationRead(notif.id || notif._id)}
                        title="Mark as read"
                        type="button"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-text-muted">
                  No notifications yet. You will be notified the instant an artisan accepts your assigned order.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Metrics Grid */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-medium text-text-secondary">Total requests</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-text-main">
              {stats.totalRequests || orders.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-medium text-text-secondary">Awaiting response</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-text-main">
              {stats.awaitingResponse ||
                orders.filter(
                  (o) => o.status === 'Awaiting response' || o.status === 'Awaiting artisan response'
                ).length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-medium text-text-secondary">In production</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-success">
              {stats.acceptedByArtisans || acceptedOrders.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-medium text-text-secondary">Completed orders</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-primary">
              {stats.completedProjects ||
                orders.filter((o) => o.status === 'Completed').length}
            </p>
          </div>
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-medium text-secondary">Payments settled</p>
            <p className="mt-3 font-serif text-2xl font-bold text-text-main">
              ₹{(stats.totalAmountPaid ?? orders.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + (o.total || 0), 0)).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {orders.filter((o) => o.paymentStatus === 'paid').length} order(s) paid
            </p>
          </div>
        </section>

        {/* Live Acceptance Status Banner */}
        <section
          aria-live="polite"
          className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${
            acceptedOrders.length
              ? 'border-success/30 bg-green-50 text-success'
              : 'border-border bg-surface text-text-secondary'
          }`}
          role="status"
        >
          <BellRing aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {acceptedOrders.length
                ? `${acceptedOrders.length} artisan ${acceptedOrders.length === 1 ? 'has' : 'have'} accepted your production orders.`
                : 'Acceptance notifications'}
            </p>
            <p className="mt-1 text-sm leading-6">
              {acceptedOrders.length
                ? 'Accepted offers and production progress update automatically from the backend.'
                : 'You will receive immediate notifications here and in your inbox as soon as an artisan accepts an assigned request.'}
            </p>
          </div>
        </section>

        {notice && (
          <p
            className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
              noticeIsError
                ? 'border-error/30 bg-red-50 text-error'
                : 'border-success/30 bg-green-50 text-success'
            }`}
            role={noticeIsError ? 'alert' : 'status'}
          >
            {notice}
          </p>
        )}

        {/* Assignment & Project Creation Form with Live Analysis */}
        {formOpen && (
          <form
            className="mt-5 grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:grid-cols-2 sm:p-8"
            onSubmit={handleCreateOrder}
          >
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    Submit Craft Requirements & Auto-Match Artisans
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold text-text-main">
                    Describe your craft requirements
                  </h2>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-3.5 py-2 text-sm font-medium text-secondary transition hover:bg-secondary/20"
                  disabled={isAnalyzing}
                  onClick={handleAnalyzeProject}
                  type="button"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing…' : 'Analyse project feasibility'}
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Provide your requirements below. Skill Bridge automatically identifies and ranks the most suitable
                artisans from MongoDB based on price fit, delivery capacity, verified quality, ratings, and experience.
              </p>
            </div>

            {/* Smart Responsible Analysis Card */}
            {analysisData && (
              <div className="sm:col-span-2 rounded-xl border border-secondary/30 bg-secondary/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-secondary" />
                    <h4 className="font-semibold text-text-main">
                      Responsible Project Feasibility Analysis
                    </h4>
                  </div>
                  <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
                    {analysisData.sustainabilityIndex?.badge || 'Fair Craft Certified'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface p-3.5">
                    <p className="text-xs text-text-muted">Feasibility Score</p>
                    <p className="mt-1 text-lg font-bold text-success">
                      {analysisData.feasibilityScore}% · {analysisData.feasibilityStatus}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3.5">
                    <p className="text-xs text-text-muted">Fair Wage Assessment</p>
                    <p className="mt-1 text-lg font-bold text-primary">
                      {analysisData.fairWageRating}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3.5">
                    <p className="text-xs text-text-muted">Turnaround & Labor Hours</p>
                    <p className="mt-1 text-lg font-bold text-text-main">
                      ~{analysisData.estimatedLaborHours} hrs ({analysisData.suggestedDurationDays} days suggested)
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {analysisData.analysisSummary}
                </p>

                {/* Recommended Artisans */}
                {Array.isArray(analysisData.recommendedArtisans) &&
                  analysisData.recommendedArtisans.length > 0 && (
                    <div className="mt-4 border-t border-secondary/20 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                        Top recommended artisans for this project
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {analysisData.recommendedArtisans.map((art) => (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-main transition hover:border-secondary hover:bg-secondary/10"
                            key={art.artisanId || art.name}
                            onClick={() => {
                              setFormFields((prev) => ({
                                ...prev,
                                artisanId: art.artisanId,
                              }))
                              const selectElem = document.querySelector('select[name="artisanId"]')
                              if (selectElem) selectElem.value = art.artisanId
                            }}
                            type="button"
                          >
                            <span className="font-semibold text-secondary">
                              {art.matchScore}% Match
                            </span>
                            <span>{art.name}</span>
                            <span className="text-text-muted">({art.artCategory})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {artisans.length ? (
              <>
                <label className="text-sm font-medium text-text-main sm:col-span-2">
                  Artisan assignment mode
                  <select
                    className={inputClass}
                    defaultValue=""
                    name="artisanId"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, artisanId: e.target.value }))
                    }
                  >
                    <option value="">✨ Automatically match & rank eligible artisans (Recommended)</option>
                    {artisans.length > 0 && (
                      <optgroup label="Or select a specific artisan directly">
                        {artisans.map((artisan) => (
                          <option key={artisan.id || artisan._id} value={artisan.id || artisan._id}>
                            {artisan.name} · {artisan.artCategory || 'Craft'} {artisan.city ? `(${artisan.city})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span className="mt-1 block text-xs text-text-muted">
                    Skill Bridge will automatically evaluate all eligible artisans across 5 normalized parameters (Price, Delivery Capacity, Quality, Rating, and Experience) upon submission.
                  </span>
                </label>

                <label className="text-sm font-medium text-text-main">
                  Requirement or product name
                  <input
                    className={inputClass}
                    maxLength={100}
                    name="title"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Handwoven cotton table runners"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Craft specialization / category
                  <select
                    className={inputClass}
                    defaultValue=""
                    name="category"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, category: e.target.value }))
                    }
                    required
                  >
                    <option disabled value="">Choose a craft category</option>
                    {artisanCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                    <option>Textiles & Handloom</option>
                    <option>Pottery & Ceramics</option>
                    <option>Woodcraft & Carving</option>
                    <option>Jewelry & Metalcraft</option>
                    <option>Leather & Footwear</option>
                    <option>Other handmade craft</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-text-main">
                  Required quantity
                  <input
                    className={inputClass}
                    defaultValue={1}
                    min="1"
                    name="quantity"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    required
                    type="number"
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Maximum budget / offer per unit (₹)
                  <input
                    className={inputClass}
                    defaultValue={500}
                    min="1"
                    name="unitPrice"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, unitPrice: e.target.value }))
                    }
                    required
                    type="number"
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Expected timeline / duration
                  <input
                    className={inputClass}
                    defaultValue="30 days"
                    name="duration"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, duration: e.target.value }))
                    }
                    placeholder="e.g. 14 days, 3 weeks, 1 month"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Expected delivery deadline
                  <input
                    className={inputClass}
                    min={new Date().toISOString().slice(0, 10)}
                    name="deadline"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, deadline: e.target.value }))
                    }
                    required
                    type="date"
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Required quality level
                  <select
                    className={inputClass}
                    defaultValue="Any"
                    name="requiredQualityLevel"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, requiredQualityLevel: e.target.value }))
                    }
                  >
                    <option value="Any">Any Quality Level (Flexible)</option>
                    <option value="Standard">Standard Handmade Quality</option>
                    <option value="High">High Quality (Expert Verified)</option>
                    <option value="Master / Heritage">Master / Heritage Craft Grade</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-text-main">
                  Preferred location (Optional)
                  <input
                    className={inputClass}
                    maxLength={100}
                    name="preferredLocation"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, preferredLocation: e.target.value }))
                    }
                    placeholder="e.g. Jaipur, Rajasthan, Kashmir, or blank for any"
                  />
                </label>

                <label className="text-sm font-medium text-text-main sm:col-span-2">
                  Specifications & instructions
                  <textarea
                    className={inputClass}
                    maxLength={1000}
                    name="details"
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, details: e.target.value }))
                    }
                    placeholder="Specify dimensions, organic/natural materials, colors, packaging requirements, or ethical craft specifications"
                    required
                    rows="3"
                  />
                </label>

                <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-surface-muted p-4">
                  <div>
                    <p className="text-xs text-text-muted">Total project budget</p>
                    <p className="font-serif text-xl font-bold text-text-main">
                      ₹{((Number(formFields.quantity) || 1) * (Number(formFields.unitPrice) || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                    <Info className="h-4 w-4 text-secondary" />
                    Artisans will be automatically ranked from highest to lowest compatibility upon submission
                  </span>
                </div>

                <button
                  className="min-h-11 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 cursor-pointer"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Evaluating & Submitting Requirement…' : 'Submit Requirement & Auto-Match Artisans'}
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong bg-background px-5 py-8 text-center sm:col-span-2">
                <Store aria-hidden="true" className="mx-auto h-8 w-8 text-secondary" />
                <h3 className="mt-3 font-serif text-xl font-semibold text-text-main">
                  No artisan accounts yet
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Artisans need to register before you can assign a custom production request.
                </p>
              </div>
            )}
          </form>
        )}

        {/* Top Expert-Rated Artisan Products (Rankings) */}
        {rankedProducts.length > 0 && (
          <section className="mt-5 rounded-2xl border border-secondary/20 bg-gradient-to-br from-surface to-secondary/5 p-5 shadow-card sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
                  <Award className="h-3.5 w-3.5" />
                  Certified Craft Quality
                </div>
                <h2 className="mt-2 font-serif text-2xl font-bold text-text-main">
                  Top Expert-Evaluated Artisan Products
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Appraised and verified by master craftspeople for superior craftsmanship, design, and market appeal.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rankedProducts.map((prod) => (
                <div
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition hover:border-secondary/40 hover:shadow-card"
                  key={prod.id || prod._id}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
                    {prod.image ? (
                      <img
                        alt={prod.title || prod.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        src={prod.image}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-text-muted">
                        No image
                      </div>
                    )}
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-950/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 backdrop-blur-xs">
                      <Star className="h-3 w-3 fill-emerald-400 text-emerald-400" />
                      {prod.averageEvaluationRating?.toFixed(1)}/10
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                      {prod.category}
                    </span>
                    <h4 className="mt-1 font-serif text-base font-bold text-text-main line-clamp-1">
                      {prod.title || prod.name}
                    </h4>
                    <p className="text-xs text-text-muted">
                      By <strong className="text-text-main">{prod.artisan}</strong> · {prod.location}
                    </p>

                    <div className="mt-3 border-t border-border/70 pt-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">₹{(prod.price || 0).toLocaleString('en-IN')}</span>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition cursor-pointer"
                        onClick={() => {
                          setFormOpen(true)
                          setFormFields((prev) => ({
                            ...prev,
                            artisanId: prod.ownerId || prod.artisanId || prev.artisanId,
                            title: `Bulk order: ${prod.title || prod.name}`,
                            category: prod.category || prev.category,
                            unitPrice: prod.price || prev.unitPrice,
                          }))
                        }}
                        type="button"
                      >
                        Commission Order →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assigned Orders & Projects List */}
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-secondary">ORDER & PROJECT MANAGEMENT</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-text-main">
                Assigned projects and production orders
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Track artisan acceptance notifications, progress, and delivery timelines.
              </p>
            </div>
          </div>

          {orders.length ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const item = order.items?.[0]
                const assignedArtisan = order.assignedArtisan || {}
                const isAccepted = ACCEPTED_STATUSES.includes(order.status)
                const analysis = order.responsibleAnalysis

                return (
                  <article
                    className="overflow-hidden rounded-xl border border-border bg-background transition hover:border-secondary/30"
                    key={order.id || order._id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4 sm:px-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                            Assigned production request
                          </p>
                          {analysis?.sustainabilityIndex?.badge && (
                            <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                              {analysis.sustainabilityIndex.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 font-semibold text-text-main">{item?.name}</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {order.id} · Assigned to {assignedArtisan.name || item?.artisan}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {order.status === 'Completed' && (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                              order.paymentStatus === 'paid'
                                ? 'bg-green-50 text-success border-success/30'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            {order.paymentStatus === 'paid' ? 'Paid via Razorpay' : 'Payment Due'}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${getStatusStyle(order.status)}`}
                        >
                          {isAccepted ? (
                            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                          ) : order.status === 'Rejected' ? (
                            <XCircle aria-hidden="true" className="h-4 w-4" />
                          ) : (
                            <Clock3 aria-hidden="true" className="h-4 w-4" />
                          )}
                          {isAccepted ? `Accepted (${order.status})` : order.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                      <div>
                        <p className="text-sm font-semibold text-text-main">Request details</p>
                        <p className="mt-2 text-sm text-text-secondary">
                          {item?.category} · Quantity {item?.quantity}
                        </p>
                        <p className="mt-1 text-sm font-medium text-text-main">
                          ₹{item?.price?.toLocaleString('en-IN')} per item · Total offer ₹{order.total?.toLocaleString('en-IN')}
                        </p>
                        {order.duration && (
                          <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                            <Clock3 className="h-4 w-4 text-secondary" />
                            Agreed duration: {order.duration}
                          </p>
                        )}
                        {order.deadline && (
                          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                            <CalendarDays aria-hidden="true" className="h-4 w-4 text-secondary" />
                            Delivery requested by {new Date(`${order.deadline.slice(0, 10)}T12:00:00`).toLocaleDateString()}
                          </p>
                        )}
                        {order.requiredQualityLevel && order.requiredQualityLevel !== 'Any' && (
                          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                            <Award className="h-4 w-4 text-secondary" />
                            Target quality level: <strong className="font-semibold text-text-main">{order.requiredQualityLevel}</strong>
                          </p>
                        )}
                        {order.preferredLocation && (
                          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                            <MapPin className="h-4 w-4 text-secondary" />
                            Preferred region: <strong className="font-semibold text-text-main">{order.preferredLocation}</strong>
                          </p>
                        )}
                        {order.specifications && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                            {order.specifications}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-text-muted">
                          Created on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        {(!assignedArtisan.name ||
                          assignedArtisan.name === 'Open / Unassigned' ||
                          order.status === 'Open' ||
                          order.status === 'Awaiting response') && (
                          <div className="mt-3">
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/20 transition cursor-pointer"
                              onClick={() => setEditingRequirement(order)}
                              type="button"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit Requirement & Recalculate Matches
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-surface p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-text-main">
                            {assignedArtisan.name && assignedArtisan.name !== 'Open / Unassigned'
                              ? 'Artisan contact'
                              : 'Requirement Status'}
                          </p>
                          {isAccepted ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Accepted & verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                              <Sparkles className="h-3 w-3" /> Auto-Matching Active
                            </span>
                          )}
                        </div>

                        {assignedArtisan.name && assignedArtisan.name !== 'Open / Unassigned' ? (
                          <>
                            <p className="mt-2 font-medium text-text-main">
                              {assignedArtisan.name || item?.artisan}
                            </p>
                            {assignedArtisan.artCategory && (
                              <p className="text-xs text-text-secondary">
                                Craft: {assignedArtisan.artCategory}
                              </p>
                            )}
                            {assignedArtisan.email && (
                              <a
                                className="mt-2 block break-all text-sm text-primary hover:underline"
                                href={`mailto:${assignedArtisan.email}`}
                              >
                                {assignedArtisan.email}
                              </a>
                            )}
                            {assignedArtisan.phone && (
                              <p className="mt-1 text-sm text-text-muted">
                                Phone: {assignedArtisan.phone}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-text-secondary">
                            This requirement is open. Eligible artisans have been evaluated across price fit, delivery capacity, quality, rating, and experience, and are ranked below. Select any artisan to assign production.
                          </p>
                        )}

                        {analysis?.feasibilityScore && (
                          <div className="mt-3 border-t border-border pt-2 text-xs text-text-secondary">
                            <span>Feasibility score: </span>
                            <span className="font-bold text-success">
                              {analysis.feasibilityScore}%
                            </span>
                            {analysis.fairWageRating && (
                              <span className="ml-2 font-medium text-primary">
                                · {analysis.fairWageRating}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Intelligently Matched Artisans (Ranked by Compatibility) */}
                    {Array.isArray(order.matchedArtisans) && order.matchedArtisans.length > 0 && (
                      <div className="border-t border-border bg-gradient-to-b from-surface to-background/50 p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-secondary" />
                              <h4 className="font-serif text-lg font-bold text-text-main">
                                Intelligently Matched Artisans (Ranked by Compatibility)
                              </h4>
                            </div>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              Evaluated and ranked on Price Fit (25%), Delivery Capacity (20%), Verified Quality (25%), Customer Rating (15%), and Experience (15%).
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              {order.matchedArtisans.filter((m) => m.isEssentialMatch).length} Full Matches
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                              {order.matchedArtisans.filter((m) => !m.isEssentialMatch).length} Partial Matches
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          {order.matchedArtisans.map((artisan, index) => {
                            const isBest = artisan.isBestMatch || index === 0
                            const isCurrentlyAssigned =
                              order.assignedArtisan?.id === artisan.artisanId ||
                              order.assignedArtisan?._id === artisan.artisanId ||
                              (order.assignedArtisan?.name && order.assignedArtisan.name === artisan.name)

                            return (
                              <div
                                key={artisan.artisanId || artisan.name}
                                className={`rounded-xl border p-4 sm:p-5 transition ${
                                  isBest
                                    ? 'border-amber-400/80 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 shadow-md ring-2 ring-amber-400/20'
                                    : 'border-border bg-surface hover:border-secondary/40 shadow-xs'
                                }`}
                              >
                                {/* Best Match Banner */}
                                {isBest && (
                                  <div className="mb-3 flex items-center justify-between border-b border-amber-200 pb-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider shadow-xs">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      Best Overall Match · #{index + 1} Ranked
                                    </span>
                                    <span className="text-xs font-semibold text-amber-900">
                                      Highest Multi-Parameter Compatibility
                                    </span>
                                  </div>
                                )}

                                {/* Artisan Header & Core Info */}
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex items-center gap-3.5">
                                    {artisan.avatar ? (
                                      <img
                                        src={artisan.avatar}
                                        alt={artisan.name}
                                        className="h-12 w-12 rounded-full object-cover border border-border shadow-xs"
                                      />
                                    ) : (
                                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base border border-primary/20">
                                        {artisan.name ? artisan.name.slice(0, 2).toUpperCase() : 'AR'}
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-serif text-base font-bold text-text-main">
                                          {artisan.name}
                                        </h5>
                                        {artisan.isVerified && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                            <ShieldCheck className="h-3 w-3 text-sky-600" />
                                            Verified Artisan
                                          </span>
                                        )}
                                        <span className="inline-flex items-center rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                                          {artisan.specialization}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-center gap-3 text-xs text-text-muted flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3 text-secondary" />
                                          {[artisan.city, artisan.state].filter(Boolean).join(', ') || 'India'}
                                        </span>
                                        <span>·</span>
                                        <span>{artisan.experience || `${artisan.experienceYears} yrs experience`}</span>
                                        <span>·</span>
                                        <span>{artisan.completedProjects} completed project(s)</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-right">
                                    <div>
                                      <span className="font-serif text-2xl font-extrabold text-emerald-700">
                                        {artisan.overallMatchPercentage}%
                                      </span>
                                      <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                        Match Score
                                      </span>
                                    </div>
                                    <div>
                                      {artisan.isEssentialMatch ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                          Full Match
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                          Partial Match
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* 5-Parameter Metrics Grid */}
                                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 text-xs">
                                  {/* 1. Price */}
                                  <div className="rounded-lg border border-border bg-background p-2.5">
                                    <span className="text-[10px] uppercase font-bold text-text-muted block">Quoted Price</span>
                                    <span className="font-bold text-sm text-text-main block mt-0.5">
                                      ₹{artisan.quotedPrice?.toLocaleString('en-IN')}/unit
                                    </span>
                                    <span className="text-[11px] text-text-muted block mt-0.5">
                                      Total: ₹{(artisan.quotedPrice * (order.items?.[0]?.quantity || 1)).toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  {/* 2. Delivery */}
                                  <div className="rounded-lg border border-border bg-background p-2.5">
                                    <span className="text-[10px] uppercase font-bold text-text-muted block">Delivery Time</span>
                                    <span className="font-bold text-sm text-text-main block mt-0.5">
                                      ~{artisan.estimatedDeliveryDays} days
                                    </span>
                                    <span className="text-[11px] text-text-muted block mt-0.5">
                                      {artisan.estimatedDeliveryDate
                                        ? new Date(artisan.estimatedDeliveryDate).toLocaleDateString()
                                        : 'On schedule'}
                                    </span>
                                  </div>

                                  {/* 3. Quality */}
                                  <div className="rounded-lg border border-border bg-background p-2.5">
                                    <span className="text-[10px] uppercase font-bold text-text-muted block">Quality Score</span>
                                    <span className="font-bold text-sm text-emerald-700 block mt-0.5">
                                      {artisan.qualityScore != null ? `${artisan.qualityScore}/10` : 'Unverified'}
                                    </span>
                                    <span className="text-[11px] text-text-muted block mt-0.5">
                                      {artisan.hasVerifiedQuality ? 'Expert Verified' : 'Audit Pending'}
                                    </span>
                                  </div>

                                  {/* 4. Rating */}
                                  <div className="rounded-lg border border-border bg-background p-2.5">
                                    <span className="text-[10px] uppercase font-bold text-text-muted block">Customer Rating</span>
                                    <span className="font-bold text-sm text-amber-700 block mt-0.5">
                                      {artisan.customerRating != null ? `★ ${artisan.customerRating}` : 'No reviews'}
                                    </span>
                                    <span className="text-[11px] text-text-muted block mt-0.5">
                                      {artisan.reviewCount ? `${artisan.reviewCount} review(s)` : 'New Artisan'}
                                    </span>
                                  </div>

                                  {/* 5. Experience */}
                                  <div className="rounded-lg border border-border bg-background p-2.5 col-span-2 sm:col-span-1">
                                    <span className="text-[10px] uppercase font-bold text-text-muted block">Experience</span>
                                    <span className="font-bold text-sm text-text-main block mt-0.5">
                                      {artisan.experience || `${artisan.experienceYears} yrs`}
                                    </span>
                                    <span className="text-[11px] text-text-muted block mt-0.5">
                                      {artisan.completedProjects} project(s)
                                    </span>
                                  </div>
                                </div>

                                {/* Recommendation Explanation */}
                                <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-muted p-2.5 text-xs text-text-secondary border border-border/60">
                                  <Info className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                                  <p className="leading-relaxed">
                                    <strong className="text-text-main font-semibold">Recommendation: </strong>
                                    {artisan.recommendationReason}
                                  </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
                                  <span className="text-xs text-text-muted">
                                    Ranked #{index + 1} based on multi-parameter normalization
                                  </span>
                                  <div>
                                    {isCurrentlyAssigned ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 text-emerald-800 px-3.5 py-1.5 text-xs font-bold border border-emerald-300">
                                        <Check className="h-3.5 w-3.5" /> Currently Assigned to this Artisan
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={assigningArtisanId === artisan.artisanId}
                                        onClick={() => handleAssignMatchedArtisan(order, artisan)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 transition shadow-xs disabled:opacity-60 cursor-pointer"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        {assigningArtisanId === artisan.artisanId
                                          ? 'Assigning…'
                                          : order.assignedArtisan?.name && order.assignedArtisan.name !== 'Open / Unassigned'
                                          ? `Switch Assignment to ${artisan.name}`
                                          : `Assign Project to ${artisan.name} →`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Integrated Payment Action Strip */}
                    <div className="border-t border-border bg-surface px-5 py-4 sm:px-6">
                      {order.status === 'Completed' ? (
                        order.paymentStatus === 'paid' ? (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-success">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-success">
                                  Payment Completed · ₹{(order.total || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Paid via Razorpay Test Mode · ID:{' '}
                                  <span className="font-mono font-medium text-text-secondary">
                                    {order.razorpayPaymentId || 'pay_verified'}
                                  </span>
                                  {order.paidAt && ` · ${new Date(order.paidAt).toLocaleString()}`}
                                </p>
                              </div>
                            </div>
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-main shadow-xs transition hover:bg-surface-muted hover:border-secondary"
                              onClick={() => setPaymentReceiptModal(order)}
                              type="button"
                            >
                              <Receipt className="h-3.5 w-3.5 text-secondary" />
                              View Payment Receipt
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                                <WalletCards className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-amber-950">
                                  Order Completed by Artisan! 🎉 Payment is now due.
                                </p>
                                <p className="text-xs text-amber-800">
                                  {assignedArtisan.name || 'Artisan'} has finished production. Please release payment of ₹
                                  {(order.total || 0).toLocaleString('en-IN')} via Razorpay.
                                </p>
                              </div>
                            </div>
                            <button
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                              disabled={isProcessingPayment && payingOrderId === (order.id || order._id)}
                              onClick={() => {
                                setModalError('')
                                setConfirmPaymentOrder(order)
                              }}
                              type="button"
                            >
                              <CreditCard className="h-4 w-4" />
                              {isProcessingPayment && payingOrderId === (order.id || order._id)
                                ? 'Processing…'
                                : `Make Payment (₹${(order.total || 0).toLocaleString('en-IN')})`}
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                          <span className="flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-secondary shrink-0" />
                            Payment of ₹{(order.total || 0).toLocaleString('en-IN')} will be unlocked as soon as {assignedArtisan.name || 'artisan'} marks this order as Completed.
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-secondary">
                              Stage: {order.status}
                            </span>
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/50 cursor-pointer"
                              onClick={() => setDisputeModalOrder(order)}
                              type="button"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Report Issue / Dispute</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border-strong bg-background px-5 py-10 text-center">
              <PackagePlus aria-hidden="true" className="mx-auto h-9 w-9 text-secondary" />
              <h3 className="mt-3 font-serif text-xl font-semibold text-text-main">
                No orders assigned yet
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">
                Create a production request with price and duration, assign it to an artisan,
                and track acceptance notifications here.
              </p>
            </div>
          )}
        </section>
        {/* Payment Confirmation Modal */}
        {confirmPaymentOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
              <button
                aria-label="Close"
                className="absolute right-4 top-4 rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-text-main"
                onClick={() => {
                  setConfirmPaymentOrder(null)
                  setModalError('')
                }}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-text-main">
                    Complete Order Payment
                  </h3>
                  <p className="text-xs text-text-muted">
                    Order Ref: #{confirmPaymentOrder.id || confirmPaymentOrder._id}
                  </p>
                </div>
              </div>

              {/* Order & Artisan Details */}
              <div className="mt-5 space-y-3 rounded-xl border border-border bg-background p-4 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-muted">Product / Project:</span>
                  <span className="font-semibold text-text-main">
                    {confirmPaymentOrder.items?.[0]?.name}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-muted">Master Artisan:</span>
                  <span className="font-semibold text-primary">
                    {confirmPaymentOrder.assignedArtisan?.name || confirmPaymentOrder.items?.[0]?.artisan}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-muted">Quantity & Unit Price:</span>
                  <span className="text-text-main">
                    {confirmPaymentOrder.items?.[0]?.quantity} unit(s) × ₹
                    {(confirmPaymentOrder.items?.[0]?.price || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-base font-bold text-text-main">
                  <span>Total Amount Payable:</span>
                  <span className="text-emerald-700">
                    ₹{(confirmPaymentOrder.total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Razorpay Trust Badge */}
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-secondary/30 bg-secondary/5 px-3.5 py-2.5 text-xs text-text-secondary">
                <ShieldCheck className="h-4 w-4 text-secondary shrink-0" />
                <span>
                  Processed securely via <strong>Razorpay Test Mode</strong>. Instant verification and artisan payout settlement.
                </span>
              </div>

              {modalError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-error/30 bg-red-50 p-3 text-xs text-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
                <button
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface-muted"
                  disabled={isProcessingPayment}
                  onClick={() => {
                    setConfirmPaymentOrder(null)
                    setModalError('')
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary/20 disabled:opacity-60"
                  disabled={isProcessingPayment}
                  onClick={() => handleSimulatePayment(confirmPaymentOrder)}
                  title="Quick instant test payment simulation without third-party popups"
                  type="button"
                >
                  {isProcessingPayment ? 'Processing…' : 'Simulate Test Payment'}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  disabled={isProcessingPayment}
                  onClick={() => handleProceedPayment(confirmPaymentOrder)}
                  type="button"
                >
                  <CreditCard className="h-4 w-4" />
                  {isProcessingPayment
                    ? 'Processing…'
                    : `Pay ₹${(confirmPaymentOrder.total || 0).toLocaleString('en-IN')} via Razorpay`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Receipt Modal */}
        {paymentReceiptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
              <button
                aria-label="Close"
                className="absolute right-4 top-4 rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-text-main print:hidden"
                onClick={() => setPaymentReceiptModal(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-serif text-2xl font-bold tracking-tight text-primary">
                      SkillBridge
                    </span>
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      Industry Payment Receipt
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-green-50 px-3 py-1 text-xs font-bold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    PAID · SUCCESS
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-text-muted">Transaction / Payment ID:</p>
                  <p className="mt-0.5 font-mono font-bold text-text-main">
                    {paymentReceiptModal.razorpayPaymentId || 'pay_test_verified'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Order Reference:</p>
                  <p className="mt-0.5 font-mono font-bold text-text-main">
                    {paymentReceiptModal.orderNumber || paymentReceiptModal.id}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Payment Date & Time:</p>
                  <p className="mt-0.5 text-text-main">
                    {paymentReceiptModal.paidAt
                      ? new Date(paymentReceiptModal.paidAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Payment Gateway:</p>
                  <p className="mt-0.5 text-text-main">Razorpay Secure Test Mode</p>
                </div>
              </div>

              {/* Billing parties */}
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-background p-4 text-xs">
                <div>
                  <p className="font-semibold text-text-secondary uppercase tracking-wider">Paid To (Artisan)</p>
                  <p className="mt-1 font-bold text-sm text-text-main">
                    {paymentReceiptModal.assignedArtisan?.name || paymentReceiptModal.items?.[0]?.artisan}
                  </p>
                  {paymentReceiptModal.assignedArtisan?.artCategory && (
                    <p className="text-text-muted">Craft: {paymentReceiptModal.assignedArtisan.artCategory}</p>
                  )}
                  {paymentReceiptModal.assignedArtisan?.email && (
                    <p className="text-text-muted">{paymentReceiptModal.assignedArtisan.email}</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-text-secondary uppercase tracking-wider">Paid By (Industry)</p>
                  <p className="mt-1 font-bold text-sm text-text-main">{currentUser.name}</p>
                  <p className="text-text-muted">{currentUser.contactName || currentUser.industry}</p>
                  <p className="text-text-muted">{currentUser.email}</p>
                </div>
              </div>

              {/* Line items table */}
              <div className="mt-4 overflow-hidden rounded-xl border border-border text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-muted text-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Item Specification</th>
                      <th className="px-3 py-2 font-semibold text-center">Qty</th>
                      <th className="px-3 py-2 font-semibold text-right">Unit Price</th>
                      <th className="px-3 py-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-3 py-2.5 font-medium text-text-main">
                        {paymentReceiptModal.items?.[0]?.name}
                        <span className="block text-[10px] text-text-muted">
                          {paymentReceiptModal.items?.[0]?.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-text-secondary">
                        {paymentReceiptModal.items?.[0]?.quantity || 1}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">
                        ₹{(paymentReceiptModal.items?.[0]?.price || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-text-main">
                        ₹{(paymentReceiptModal.total || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-border bg-surface-muted/50 font-bold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-text-main">
                        Total Amount Paid:
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700 text-sm">
                        ₹{(paymentReceiptModal.total || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="mt-4 text-center text-xs text-text-muted">
                Thank you for empowering ethical craft preservation and honoring fair wages through SkillBridge.
              </p>

              {/* Receipt Footer Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 print:hidden">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text-main hover:bg-surface-muted"
                  onClick={() => window.print()}
                  type="button"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save Receipt
                </button>
                <button
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                  onClick={() => setPaymentReceiptModal(null)}
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Requirement & Automatic Match Recalculation Modal */}
        {editingRequirement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
              <button
                aria-label="Close"
                className="absolute right-4 top-4 rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-text-main"
                onClick={() => setEditingRequirement(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-text-main">
                    Edit Requirement & Recalculate Matches
                  </h3>
                  <p className="text-xs text-text-muted">
                    Skill Bridge will automatically re-evaluate and re-rank all eligible artisans once saved.
                  </p>
                </div>
              </div>

              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdateRequirement}>
                <label className="text-sm font-medium text-text-main sm:col-span-2">
                  Requirement title
                  <input
                    className={inputClass}
                    defaultValue={editingRequirement.items?.[0]?.name || editingRequirement.title}
                    maxLength={100}
                    name="title"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Craft category
                  <select
                    className={inputClass}
                    defaultValue={editingRequirement.items?.[0]?.category || editingRequirement.category}
                    name="category"
                    required
                  >
                    {artisanCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                    <option>Textiles & Handloom</option>
                    <option>Pottery & Ceramics</option>
                    <option>Woodcraft & Carving</option>
                    <option>Jewelry & Metalcraft</option>
                    <option>Leather & Footwear</option>
                    <option>Other handmade craft</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-text-main">
                  Required quantity
                  <input
                    className={inputClass}
                    defaultValue={editingRequirement.items?.[0]?.quantity || editingRequirement.quantity || 1}
                    min="1"
                    name="quantity"
                    required
                    type="number"
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Maximum budget / offer per item (₹)
                  <input
                    className={inputClass}
                    defaultValue={editingRequirement.items?.[0]?.price || editingRequirement.unitPrice || 500}
                    min="1"
                    name="unitPrice"
                    required
                    type="number"
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Delivery timeline / duration
                  <input
                    className={inputClass}
                    defaultValue={editingRequirement.duration || '30 days'}
                    name="duration"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Delivery deadline
                  <input
                    className={inputClass}
                    defaultValue={editingRequirement.deadline ? new Date(editingRequirement.deadline).toISOString().slice(0, 10) : ''}
                    min={new Date().toISOString().slice(0, 10)}
                    name="deadline"
                    required
                    type="date"
                  />
                </label>

                <label className="text-sm font-medium text-text-main">
                  Required quality level
                  <select
                    className={inputClass}
                    defaultValue={editingRequirement.requiredQualityLevel || 'Any'}
                    name="requiredQualityLevel"
                  >
                    <option value="Any">Any Quality Level (Flexible)</option>
                    <option value="Standard">Standard Handmade Quality</option>
                    <option value="High">High Quality (Expert Verified)</option>
                    <option value="Master / Heritage">Master / Heritage Craft Grade</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-text-main sm:col-span-2">
                  Preferred location (Optional)
                  <input
                    className={inputClass}
                    defaultValue={editingRequirement.preferredLocation || ''}
                    name="preferredLocation"
                    placeholder="e.g. Jaipur, Rajasthan, or leave blank for anywhere"
                  />
                </label>

                <label className="text-sm font-medium text-text-main sm:col-span-2">
                  Specifications & instructions
                  <textarea
                    className={inputClass}
                    defaultValue={editingRequirement.specifications || ''}
                    maxLength={1000}
                    name="details"
                    rows="3"
                  />
                </label>

                <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-border">
                  <button
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-muted"
                    onClick={() => setEditingRequirement(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
                    disabled={isUpdating}
                    type="submit"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isUpdating ? 'Recalculating Matches…' : 'Save & Recalculate Matches'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dispute Modal for Industry bulk orders */}
        <DisputeModal
          isOpen={Boolean(disputeModalOrder)}
          item={disputeModalOrder?.items?.[0] || disputeModalOrder}
          onClose={() => setDisputeModalOrder(null)}
          onDisputeCreated={() => {
            refreshBackendData()
            alert('Industry claim submitted. Central mediation team will review your bulk order inquiry.')
          }}
          order={disputeModalOrder}
        />
      </main>
    </IndustryLayout>
  )
}

export default IndustryDashboardPage
