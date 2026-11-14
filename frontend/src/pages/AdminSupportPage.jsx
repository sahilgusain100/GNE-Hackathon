import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Flag,
  History,
  LifeBuoy,
  Lock,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import MarketplaceLayout from '../components/layout/MarketplaceLayout'
import { useAuthDialog } from '../hooks/useAuthDialog'
import {
  getSupportStatsApi,
  getAllTicketsAdminApi,
  assignTicketAdminApi,
  updateTicketStatusAdminApi,
  getAllDisputesAdminApi,
  getAllReportsAdminApi,
  updateReportStatusAdminApi,
  toggleArtisanVerificationApi,
} from '../services/admin-support-api'
import { getTicketByIdApi, replyToTicketApi } from '../services/support-api'
import { resolveDisputeApi } from '../services/dispute-api'
import AdminVerificationManager from '../components/verification/AdminVerificationManager'

const STATUS_PILLS = {
  Open: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Review': 'bg-purple-50 text-purple-700 border-purple-200',
  'Waiting for User': 'bg-amber-50 text-amber-800 border-amber-200',
  Escalated: 'bg-rose-50 text-rose-700 border-rose-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-gray-100 text-gray-700 border-gray-200',
}

const RESOLUTION_OPTIONS = [
  'No action required',
  'Partial refund',
  'Full refund',
  'Replacement',
  'Return and refund',
  'Rework or correction',
  'Mutual agreement between parties',
]

const AdminSupportPage = () => {
  const { currentUser } = useAuthDialog()

  const [activeTab, setActiveTab] = useState('tickets') // 'tickets', 'disputes', 'reports', 'verification'
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  // Tickets state
  const [tickets, setTickets] = useState([])
  const [ticketFilter, setTicketFilter] = useState({
    status: 'all',
    role: 'all',
    category: 'all',
    search: '',
  })
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketMessages, setTicketMessages] = useState([])
  const [staffReplyText, setStaffReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingStaffReply, setSendingStaffReply] = useState(false)

  // Disputes state
  const [disputes, setDisputes] = useState([])
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false)
  const [resolutionData, setResolutionData] = useState({
    resolutionType: 'Mutual agreement between parties',
    amount: 0,
    reason: '',
  })
  const [resolvingDispute, setResolvingDispute] = useState(false)

  // Reports state
  const [reports, setReports] = useState([])
  const [reportFilter, setReportFilter] = useState('all')

  // Verification state
  const [artisanIdInput, setArtisanIdInput] = useState('')
  const [verifyingArtisan, setVerifyingArtisan] = useState(false)
  const [verificationFeedback, setVerificationFeedback] = useState('')

  const loadStats = useCallback(async () => {
    try {
      const res = await getSupportStatsApi()
      if (res?.success) setStats(res.stats)
    } catch (error) {
      console.warn('Support statistics load error:', error.message)
    }
  }, [])

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (ticketFilter.status !== 'all') params.status = ticketFilter.status
      if (ticketFilter.role !== 'all') params.role = ticketFilter.role
      if (ticketFilter.category !== 'all') params.category = ticketFilter.category
      if (ticketFilter.search.trim()) params.search = ticketFilter.search.trim()

      const res = await getAllTicketsAdminApi(params)
      if (res?.success) setTickets(res.tickets || [])
    } catch (err) {
      console.warn('Admin load tickets error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [ticketFilter])

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAllDisputesAdminApi()
      if (res?.success) setDisputes(res.disputes || [])
    } catch (err) {
      console.warn('Admin load disputes error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (reportFilter !== 'all') params.status = reportFilter
      const res = await getAllReportsAdminApi(params)
      if (res?.success) setReports(res.reports || [])
    } catch (err) {
      console.warn('Admin load reports error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [reportFilter])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (activeTab === 'tickets') loadTickets()
    if (activeTab === 'disputes') loadDisputes()
    if (activeTab === 'reports') loadReports()
  }, [activeTab, loadTickets, loadDisputes, loadReports])

  // Select ticket to view message feed
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket)
    try {
      const res = await getTicketByIdApi(ticket.ticketId || ticket.id)
      if (res?.success) {
        setSelectedTicket(res.ticket)
        setTicketMessages(res.messages || [])
      }
    } catch (e) {
      console.warn('Ticket details error:', e.message)
    }
  }

  // Staff reply
  const handleStaffReply = async (e) => {
    e.preventDefault()
    if (!staffReplyText.trim() || !selectedTicket) return
    setSendingStaffReply(true)
    try {
      const res = await replyToTicketApi(selectedTicket.ticketId || selectedTicket.id, {
        message: staffReplyText.trim(),
        isInternalNote,
      })
      if (res?.success) {
        setStaffReplyText('')
        setIsInternalNote(false)
        const refreshed = await getTicketByIdApi(selectedTicket.ticketId || selectedTicket.id)
        if (refreshed?.success) {
          setSelectedTicket(refreshed.ticket)
          setTicketMessages(refreshed.messages || [])
        }
        await loadTickets()
        await loadStats()
      } else {
        alert(res?.message || 'Could not send reply.')
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply.')
    } finally {
      setSendingStaffReply(false)
    }
  }

  // Update Ticket Status by Admin
  const handleAdminUpdateStatus = async (status) => {
    if (!selectedTicket) return
    try {
      const res = await updateTicketStatusAdminApi(selectedTicket.ticketId || selectedTicket.id, {
        status,
        note: `Status updated to ${status} by ${currentUser?.name || 'Staff'}.`,
      })
      if (res?.success) {
        setSelectedTicket(res.ticket)
        await loadTickets()
        await loadStats()
      }
    } catch (err) {
      alert(err.message || 'Failed to update ticket status.')
    }
  }

  // Assign Ticket to Self
  const handleAssignToMe = async () => {
    if (!selectedTicket || !currentUser) return
    try {
      const res = await assignTicketAdminApi(selectedTicket.ticketId || selectedTicket.id, {
        handlerId: currentUser._id,
        handlerName: currentUser.name,
      })
      if (res?.success) {
        setSelectedTicket(res.ticket)
        await loadTickets()
      }
    } catch (err) {
      alert(err.message || 'Failed to assign ticket.')
    }
  }

  // Dispute Resolution submit
  const handleResolveDisputeSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDispute || !resolutionData.reason.trim()) {
      alert('Please state the official resolution reason.')
      return
    }

    setResolvingDispute(true)
    try {
      const res = await resolveDisputeApi(selectedDispute.disputeId || selectedDispute.id, {
        resolutionType: resolutionData.resolutionType,
        amount: Number(resolutionData.amount) || 0,
        reason: resolutionData.reason.trim(),
      })

      if (res?.success) {
        setResolutionModalOpen(false)
        setSelectedDispute(res.dispute)
        await loadDisputes()
        await loadStats()
        alert(`Dispute #${res.dispute.disputeId} marked as Resolved!`)
      } else {
        alert(res?.message || 'Could not resolve dispute.')
      }
    } catch (err) {
      alert(err.message || 'Failed to resolve dispute.')
    } finally {
      setResolvingDispute(false)
    }
  }

  // Action / Dismiss Report
  const handleReportAction = async (reportId, status, actionTaken = '') => {
    try {
      const res = await updateReportStatusAdminApi(reportId, {
        status,
        actionTaken,
        moderatorNotes: `Reviewed by ${currentUser?.name || 'Admin'}.`,
      })
      if (res?.success) {
        await loadReports()
        await loadStats()
      }
    } catch (err) {
      alert(err.message || 'Failed to update report.')
    }
  }

  // Toggle Artisan Verification
  const handleToggleVerification = async (artisanId, currentState) => {
    setVerifyingArtisan(true)
    setVerificationFeedback('')
    try {
      const res = await toggleArtisanVerificationApi(artisanId, {
        isVerified: !currentState,
      })
      if (res?.success) {
        setVerificationFeedback(res.message)
        await loadStats()
      } else {
        setVerificationFeedback(res?.message || 'Failed to toggle verification.')
      }
    } catch (err) {
      setVerificationFeedback(err.message || 'Verification update error.')
    } finally {
      setVerifyingArtisan(false)
    }
  }

  return (
    <MarketplaceLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>SkillBridge Support Portal</span>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
              Support, Complaints & Dispute Management
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Evidence-based mediation, ticket triage, dispute decision recording, and marketplace trust moderation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <Lock className="h-3.5 w-3.5" />
              <span>PCI-Compliant Escrow Shield</span>
            </span>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: 'Open Tickets', val: stats.openTickets, color: 'text-blue-700' },
              { label: 'Under Review', val: stats.underReviewTickets, color: 'text-purple-700' },
              { label: 'Escalated', val: stats.escalatedTickets, color: 'text-rose-700' },
              { label: 'Resolved', val: stats.resolvedTickets, color: 'text-emerald-700' },
              { label: 'Active Disputes', val: stats.activeDisputes, color: 'text-amber-800' },
              { label: 'Pending Reports', val: stats.pendingReports, color: 'text-red-700' },
              { label: 'Verified Artisans', val: `${stats.verifiedArtisans}/${stats.totalArtisans}`, color: 'text-secondary' },
            ].map((s) => (
              <div className="rounded-2xl border border-border/80 bg-surface p-3.5 text-center shadow-xs" key={s.label}>
                <p className={`text-xl font-extrabold ${s.color}`}>{s.val}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3">
          {[
            { id: 'tickets', label: 'Support Tickets Triage', icon: MessageSquare, count: tickets.length },
            { id: 'disputes', label: 'Order Disputes & Mediation', icon: ShieldAlert, count: disputes.length },
            { id: 'reports', label: 'Trust & Safety Reports', icon: Flag, count: reports.length },
            ...(currentUser?.accountType === 'admin'
              ? [{ id: 'verification', label: 'Artisan Verification Hub', icon: Award }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-border/70 bg-surface text-text-secondary hover:bg-surface-muted hover:text-text-main'
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: TICKETS MANAGEMENT
        ────────────────────────────────────────────────────────────── */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Tickets list */}
            <div className="col-span-12 lg:col-span-5 space-y-3">
              {/* Filter controls */}
              <div className="rounded-2xl border border-border/70 bg-surface p-3 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-text-muted" />
                  <input
                    className="w-full bg-transparent text-xs text-text-main outline-none placeholder:text-text-muted"
                    onChange={(e) => setTicketFilter((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder="Search by ID, user, order #..."
                    type="search"
                    value={ticketFilter.search}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-[11px]">
                  <select
                    className="rounded-lg border border-border bg-background px-2 py-1 text-text-main outline-none"
                    onChange={(e) => setTicketFilter((p) => ({ ...p, status: e.target.value }))}
                    value={ticketFilter.status}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Waiting for User">Waiting for User</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <select
                    className="rounded-lg border border-border bg-background px-2 py-1 text-text-main outline-none"
                    onChange={(e) => setTicketFilter((p) => ({ ...p, role: e.target.value }))}
                    value={ticketFilter.role}
                  >
                    <option value="all">All Roles</option>
                    <option value="customer">Customers</option>
                    <option value="artisan">Artisans</option>
                    <option value="industry">Industries</option>
                  </select>
                </div>
              </div>

              {/* Tickets Cards */}
              {loading ? (
                <div className="py-12 text-center text-xs text-text-muted">Loading tickets…</div>
              ) : tickets.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted border border-dashed rounded-2xl">
                  No tickets match the selected filters.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {tickets.map((t) => {
                    const pillClass = STATUS_PILLS[t.status] || STATUS_PILLS.Open
                    const isSelected = selectedTicket && (selectedTicket.ticketId === t.ticketId || selectedTicket.id === t.id)

                    return (
                      <div
                        className={`cursor-pointer rounded-2xl border p-3.5 transition shadow-xs ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/80 bg-surface hover:border-secondary/30'
                        }`}
                        key={t.ticketId || t.id}
                        onClick={() => handleSelectTicket(t)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            #{t.ticketId}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${pillClass}`}>
                            {t.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-bold text-text-main line-clamp-1">{t.subject}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                          <span>{t.userName} ({t.userRole})</span>
                          <span>{t.priority}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ticket Triage Panel */}
            <div className="col-span-12 lg:col-span-7">
              {selectedTicket ? (
                <div className="rounded-3xl border border-border/80 bg-surface shadow-card overflow-hidden">
                  {/* Top Bar */}
                  <div className="border-b border-border/70 p-5 bg-surface-muted/30">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary">
                          #{selectedTicket.ticketId}
                        </span>
                        <span className="ml-2 text-xs text-text-muted">
                          By <strong className="text-text-main">{selectedTicket.userName}</strong> ({selectedTicket.userRole})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text-main hover:bg-surface-muted cursor-pointer"
                          onClick={handleAssignToMe}
                          type="button"
                        >
                          Assign to Me
                        </button>

                        <select
                          className="rounded-xl border border-border bg-white px-2.5 py-1 text-xs font-bold text-text-main outline-none"
                          onChange={(e) => handleAdminUpdateStatus(e.target.value)}
                          value={selectedTicket.status}
                        >
                          <option value="Open">Open</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Waiting for User">Waiting for User</option>
                          <option value="Escalated">Escalated</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    <h2 className="mt-3 font-serif text-lg font-bold text-text-main">
                      {selectedTicket.subject}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                      <span>Category: <strong>{selectedTicket.category}</strong></span>
                      {selectedTicket.relatedOrderNumber && (
                        <span className="font-mono">Order: <strong>#{selectedTicket.relatedOrderNumber}</strong></span>
                      )}
                      <span>Handler: <strong>{selectedTicket.assignedHandlerName || 'Unassigned'}</strong></span>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="max-h-[380px] min-h-[200px] overflow-y-auto p-5 space-y-3 bg-background/30">
                    {ticketMessages.map((msg) => {
                      const isStaffUser = ['admin', 'support'].includes(msg.senderRole)

                      return (
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.isInternalNote
                              ? 'bg-yellow-50 border border-yellow-300 text-yellow-950'
                              : isStaffUser
                              ? 'bg-amber-50 border border-amber-200 text-amber-950 ml-6'
                              : 'bg-surface border border-border text-text-main mr-6'
                          }`}
                          key={msg.id || msg._id}
                        >
                          <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                            <span className="font-bold text-text-main">
                              {msg.senderName} ({msg.senderRole}) {msg.isInternalNote && '🔒 INTERNAL STAFF NOTE'}
                            </span>
                            <time>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Staff Reply Form */}
                  <form className="border-t border-border/70 p-4 bg-surface" onSubmit={handleStaffReply}>
                    <textarea
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-primary"
                      onChange={(e) => setStaffReplyText(e.target.value)}
                      placeholder="Write an official response or internal team note..."
                      rows={2}
                      value={staffReplyText}
                    />

                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                        <input
                          checked={isInternalNote}
                          className="rounded text-primary focus:ring-primary"
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          type="checkbox"
                        />
                        <span>Internal Note (Hidden from User)</span>
                      </label>

                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                        disabled={sendingStaffReply || !staffReplyText.trim()}
                        type="submit"
                      >
                        <Send className="h-3 w-3" />
                        <span>{sendingStaffReply ? 'Sending…' : 'Post Response'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border-strong bg-surface/50 p-12 text-center">
                  <LifeBuoy className="mx-auto h-8 w-8 text-secondary/60" />
                  <p className="mt-2 text-sm font-bold text-text-main">Select a Ticket to Review & Respond</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: DISPUTES MEDIATION
        ────────────────────────────────────────────────────────────── */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-surface p-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-text-main">
                  Order Claims & Fair Evidence Mediation
                </h3>
                <p className="text-xs text-text-muted">
                  Review customer claims and artisan counter-evidence side-by-side before issuing neutral resolution decisions.
                </p>
              </div>
              <button
                className="rounded-lg p-1.5 text-text-muted hover:text-text-main cursor-pointer"
                onClick={loadDisputes}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {disputes.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed rounded-2xl">
                No active order disputes found.
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((dsp) => (
                  <div
                    className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-4"
                    key={dsp.disputeId || dsp.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div>
                        <span className="font-mono text-sm font-bold text-primary">
                          #{dsp.disputeId}
                        </span>
                        <span className="ml-2 font-mono text-xs text-text-muted">
                          (Order #{dsp.orderNumber} · {dsp.productTitle})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                          {dsp.status}
                        </span>

                        {dsp.status !== 'Resolved' && (
                          <button
                            className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-105 cursor-pointer"
                            onClick={() => {
                              setSelectedDispute(dsp)
                              setResolutionModalOpen(true)
                            }}
                            type="button"
                          >
                            Record Resolution Decision
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Side-by-Side Perspectives: Customer Claim vs Artisan Defense */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Customer Side */}
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-rose-950">
                          <span>Claimant: {dsp.initiatorName} ({dsp.initiatorRole})</span>
                          <span className="text-[10px] bg-rose-100 px-2 py-0.5 rounded-full">{dsp.category}</span>
                        </div>
                        <p className="text-xs text-rose-900 leading-relaxed italic">
                          &quot;{dsp.customerExplanation}&quot;
                        </p>
                        <p className="text-[11px] font-bold text-rose-950">
                          Requested Resolution: <span className="underline">{dsp.requestedResolution}</span>
                        </p>
                        {dsp.customerEvidence && dsp.customerEvidence.length > 0 && (
                          <div className="pt-2 border-t border-rose-200 space-y-2">
                            <p className="text-[10px] font-bold uppercase text-rose-800">Submitted Evidence:</p>
                            <div className="flex flex-wrap gap-2">
                              {dsp.customerEvidence.map((ev, idx) => (
                                <a
                                  className="group relative flex flex-col items-center rounded-xl border border-rose-200 bg-white p-1.5 shadow-2xs hover:border-rose-400 transition-all"
                                  href={ev.url}
                                  key={idx}
                                  rel="noreferrer"
                                  target="_blank"
                                  title={ev.caption || `Proof Image ${idx + 1}`}
                                >
                                  <img
                                    alt={ev.caption || 'Evidence'}
                                    className="h-16 w-16 rounded-lg object-cover bg-rose-50"
                                    src={ev.url}
                                  />
                                  <span className="mt-1 max-w-[70px] truncate text-[10px] font-medium text-rose-900 group-hover:underline">
                                    {ev.caption || `Proof ${idx + 1}`}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Artisan Side */}
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                          <span>Artisan Respondent: {dsp.respondentName}</span>
                          <span className="text-[10px] bg-indigo-100 px-2 py-0.5 rounded-full">Fair Defense</span>
                        </div>
                        {dsp.artisanExplanation ? (
                          <>
                            <p className="text-xs text-indigo-900 leading-relaxed italic">
                              &quot;{dsp.artisanExplanation}&quot;
                            </p>
                            {dsp.artisanEvidence && dsp.artisanEvidence.length > 0 && (
                              <div className="pt-2 border-t border-indigo-200 space-y-2">
                                <p className="text-[10px] font-bold uppercase text-indigo-800">Artisan Dispatch Proof:</p>
                                <div className="flex flex-wrap gap-2">
                                  {dsp.artisanEvidence.map((ev, idx) => (
                                    <a
                                      className="group relative flex flex-col items-center rounded-xl border border-indigo-200 bg-white p-1.5 shadow-2xs hover:border-indigo-400 transition-all"
                                      href={ev.url}
                                      key={idx}
                                      rel="noreferrer"
                                      target="_blank"
                                      title={ev.caption || `Proof Document ${idx + 1}`}
                                    >
                                      <img
                                        alt={ev.caption || 'Artisan Proof'}
                                        className="h-16 w-16 rounded-lg object-cover bg-indigo-50"
                                        src={ev.url}
                                      />
                                      <span className="mt-1 max-w-[70px] truncate text-[10px] font-medium text-indigo-900 group-hover:underline">
                                        {ev.caption || `Proof ${idx + 1}`}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-indigo-800/80 italic">
                            Waiting for artisan response. Notice sent via notifications.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Official Resolution Summary if recorded */}
                    {dsp.resolution?.type && dsp.resolution.type !== 'None' && (
                      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <Award className="h-4 w-4" />
                          <span>Determined Resolution: {dsp.resolution.type}</span>
                        </div>
                        {dsp.resolution.amount > 0 && (
                          <p className="mt-1 font-mono font-bold">
                            Refund Amount: ₹{dsp.resolution.amount.toLocaleString('en-IN')} (Ref: {dsp.resolution.refundReference || 'Simulated'})
                          </p>
                        )}
                        <p className="mt-1 text-emerald-900 leading-relaxed">
                          Official Reason: {dsp.resolution.reason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: TRUST & SAFETY REPORTS
        ────────────────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-surface p-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-text-main">
                  Flagged Content & Policy Reports
                </h3>
                <p className="text-xs text-text-muted">
                  Investigate community reports regarding fake listings, harassment, or fraudulent accounts.
                </p>
              </div>

              <select
                className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs text-text-main outline-none"
                onChange={(e) => setReportFilter(e.target.value)}
                value={reportFilter}
              >
                <option value="all">All Reports</option>
                <option value="Pending">Pending</option>
                <option value="Investigating">Investigating</option>
                <option value="Action Taken">Action Taken</option>
                <option value="Dismissed">Dismissed</option>
              </select>
            </div>

            {reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed rounded-2xl">
                No policy reports found.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rpt) => (
                  <div
                    className="rounded-2xl border border-border/80 bg-surface p-4 space-y-2 shadow-xs"
                    key={rpt.reportId || rpt.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          #{rpt.reportId}
                        </span>
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                          {rpt.reason}
                        </span>
                        <span className="text-xs text-text-muted">
                          Target: {rpt.targetType} ({rpt.targetTitle || rpt.targetId})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold">
                          {rpt.status}
                        </span>

                        {rpt.status === 'Pending' && (
                          <div className="flex gap-1.5 ml-2">
                            <button
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 cursor-pointer"
                              onClick={() => handleReportAction(rpt.reportId || rpt.id, 'Action Taken', 'Listing unpublished / warning issued.')}
                              type="button"
                            >
                              Take Action
                            </button>
                            <button
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
                              onClick={() => handleReportAction(rpt.reportId || rpt.id, 'Dismissed', 'Dismissed as false report.')}
                              type="button"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      &quot;{rpt.description}&quot;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: ARTISAN VERIFICATION & MODERATION HUB
        ────────────────────────────────────────────────────────────── */}
        {activeTab === 'verification' && (
          <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-card">
            <AdminVerificationManager onStatsChanged={loadStats} />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODAL: RECORD DISPUTE RESOLUTION
        ────────────────────────────────────────────────────────────── */}
        {resolutionModalOpen && selectedDispute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl">
              <h3 className="font-serif text-lg font-bold text-text-main">
                Record Official Dispute Resolution: #{selectedDispute.disputeId}
              </h3>
              <p className="mt-1 text-xs text-text-muted">
                Order #{selectedDispute.orderNumber} · Both parties will be notified of this binding determination.
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleResolveDisputeSubmit}>
                <div>
                  <label className="text-xs font-bold text-text-main">Resolution Outcome</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-border bg-white p-2.5 text-xs text-text-main outline-none focus:border-primary"
                    onChange={(e) =>
                      setResolutionData((prev) => ({ ...prev, resolutionType: e.target.value }))
                    }
                    value={resolutionData.resolutionType}
                  >
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {['Partial refund', 'Full refund', 'Return and refund'].includes(resolutionData.resolutionType) && (
                  <div>
                    <label className="text-xs font-bold text-text-main">
                      Refund Amount (₹)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-text-main outline-none focus:border-primary font-mono"
                      min={0}
                      onChange={(e) =>
                        setResolutionData((prev) => ({ ...prev, amount: Number(e.target.value) }))
                      }
                      type="number"
                      value={resolutionData.amount}
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-text-main">
                    Official Decision Reason & Findings
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-xs text-text-main outline-none focus:border-primary"
                    onChange={(e) =>
                      setResolutionData((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="Explain the mediation findings, photo inspection result, and resolution steps..."
                    required
                    rows={4}
                    value={resolutionData.reason}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/70">
                  <button
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted cursor-pointer"
                    onClick={() => setResolutionModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                    disabled={resolvingDispute}
                    type="submit"
                  >
                    {resolvingDispute ? 'Recording…' : 'Record Final Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </MarketplaceLayout>
  )
}

export default AdminSupportPage
