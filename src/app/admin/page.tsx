'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Scale,
  Percent,
  Check,
  X,
  Radio,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  Copy,
  Music2,
  Headphones,
  LayoutDashboard,
  ShieldAlert,
  Sliders,
  Wallet,
  Activity,
  Calendar,
  CreditCard,
  ChevronDown,
  Layers,
  ArrowUpDown,
  CircleDot,
  Clock,
  Sparkles,
  Mail,
  UserPlus,
  KeyRound,
  LogOut,
  Shield,
  Send
} from 'lucide-react';
import { AdminUser, AdminInvitation, AdminPermissions, AdminRole } from '@/services/adminAuthService';

interface AdminMetrics {
  totalGrossRevenue: number;
  platformRevenue: number;
  totalDjEarnings: number;
  totalVenueCommissions: number;
  totalEscrowHeldInDispute: number;
  totalRefundedToGuests: number;
  totalRequestsCount: number;
  verifiedRequestsCount: number;
  totalDjsCount: number;
  activeDjsCount: number;
  totalVenuesCount: number;
  openDisputesCount: number;
  totalDisputesCount: number;
}

interface AdminData {
  metrics: AdminMetrics;
  djs: Array<{
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    currentVenue?: { name?: string; address?: string };
    isAcceptingRequests: boolean;
    basePrice: number;
    paystackRecipientCode: string | null;
    paystackSubaccountCode: string | null;
    status: string;
  }>;
  venues: Array<{
    id: string;
    name: string;
    city: string;
    ownerEmail: string;
    commissionSplit: { venuePercentage: number; djPercentage: number; platformPercentage: number };
    totalRevenueGenerated: number;
    totalCommissionPaid: number;
    paystackSplitCode: string | null;
    paystackSubaccountCode: string | null;
    paystackRecipientCode: string | null;
    status: string;
  }>;
  disputes: Array<{
    id: string;
    requestId: string;
    referenceCode: string;
    guestName: string;
    djName: string;
    venueName: string;
    songTitle: string;
    amount: number;
    reason: string;
    status: 'open' | 'refunded' | 'resolved_to_dj';
    createdAt: string;
  }>;
  recentTransactions: Array<{
    id: string;
    reference: string;
    type: string;
    amount: number;
    description: string;
    direction: string;
    createdAt: string;
  }>;
  mode: string;
  defaultSplit?: {
    venuePercentage: number;
    djPercentage: number;
    platformPercentage: number;
  };
}

const SUPER_ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '8844';

export default function EnterpriseAdminDashboard() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [emailInput, setEmailInput] = useState<string>('admin@quemydj.com');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Active module
  const [activeSection, setActiveSection] = useState<'treasury' | 'disputes' | 'venues' | 'djs' | 'team'>('treasury');
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Team & Invitation State
  const [teamAdmins, setTeamAdmins] = useState<AdminUser[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<AdminInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('ops_admin');
  const [invitePerms, setInvitePerms] = useState<AdminPermissions>({
    treasury: false,
    disputes: true,
    venues: true,
    djs: true,
    manageAdmins: false,
  });
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [lastGeneratedInviteLink, setLastGeneratedInviteLink] = useState<string | null>(null);

  // Search & Filter state
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'topup' | 'request_payment' | 'refund'>('all');

  // Venue split editing
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [splitForm, setSplitForm] = useState({ dj: 70, venue: 20, platform: 10 });
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Platform Default Split Editing
  const [isEditingDefaultSplit, setIsEditingDefaultSplit] = useState(false);
  const [defaultSplitForm, setDefaultSplitForm] = useState({ dj: 70, venue: 20, platform: 10 });
  const [isSavingDefaultSplit, setIsSavingDefaultSplit] = useState(false);

  // Email Template Editor State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    id: string;
    name: string;
    headline: string;
    introText: string;
    subjectPattern: string;
    ctaText: string;
    secondaryNote: string;
  } | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('cuemydj_admin_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) {
          setCurrentAdmin(parsed);
        }
      }
    } catch {}
  }, []);

  const loadTeamData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/team');
      if (res.ok) {
        const json = await res.json();
        setTeamAdmins(json.admins || []);
        setTeamInvitations(json.invitations || []);
      }
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setAdminData(data);
        if (data.defaultSplit) {
          setDefaultSplitForm({
            dj: data.defaultSplit.djPercentage,
            venue: data.defaultSplit.venuePercentage,
            platform: data.defaultSplit.platformPercentage,
          });
        }
      } else {
        setFeedbackNotice({ type: 'error', msg: 'Unable to sync live records.' });
      }
      loadTeamData();
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Network failure contacting backend.' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadTeamData]);

  useEffect(() => {
    if (currentAdmin) {
      loadData();
    }
  }, [currentAdmin, loadData]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentAdmin(data.user);
        try {
          sessionStorage.setItem('cuemydj_admin_profile', JSON.stringify(data.user));
          sessionStorage.setItem('cuemydj_admin_auth', 'granted');
        } catch {}
      } else {
        setAuthError(data?.error || 'Invalid administrator email or password.');
      }
    } catch {
      setAuthError('Network error attempting sign in.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('cuemydj_admin_profile');
      sessionStorage.removeItem('cuemydj_admin_auth');
    } catch {}
    setCurrentAdmin(null);
    setPasswordInput('');
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsSendingInvite(true);
    setLastGeneratedInviteLink(null);

    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          permissions: invitePerms,
          invitedBy: currentAdmin?.id,
          invitedByName: currentAdmin?.name,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastGeneratedInviteLink(data.inviteLink);
        setFeedbackNotice({ type: 'success', msg: `Invitation link generated for ${inviteEmail}` });
        setInviteEmail('');
        loadTeamData();
      } else {
        setFeedbackNotice({ type: 'error', msg: data?.error || 'Failed to generate invitation' });
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Network error generating invitation' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPwd !== confirmNewPwd) {
      setPwdError('New passwords do not match.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentAdmin?.email,
          currentPassword: currentPwd,
          newPassword: newPwd,
          userType: 'admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPwdSuccess('Password changed successfully.');
        setCurrentPwd('');
        setNewPwd('');
        setConfirmNewPwd('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdSuccess(null);
        }, 1800);
      } else {
        setPwdError(data?.error || 'Failed to update password.');
      }
    } catch {
      setPwdError('Network error attempting password change.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleDisputeAction = async (disputeId: string, action: 'refund_guest' | 'release_to_dj') => {
    setResolvingId(disputeId);
    setFeedbackNotice(null);

    try {
      const res = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          action,
          resolvedBy: 'Super Admin',
          resolutionNote: action === 'refund_guest' ? 'Full refund granted to guest' : 'Dispute resolved in DJ favor',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackNotice({
          type: 'success',
          msg: action === 'refund_guest' ? 'Dispute settled: 100% refund credited.' : 'Dispute settled: Funds released to DJ payout balance.',
        });
        loadData();
      } else {
        setFeedbackNotice({ type: 'error', msg: data?.error || 'Arbitration failed.' });
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Arbitration error.' });
    } finally {
      setResolvingId(null);
      setTimeout(() => setFeedbackNotice(null), 5000);
    }
  };

  const handleSaveSplit = async (venueId: string) => {
    const total = splitForm.dj + splitForm.venue + splitForm.platform;
    if (total !== 100) {
      setFeedbackNotice({ type: 'error', msg: `Split percentages must sum to 100% (currently ${total}%).` });
      return;
    }

    try {
      const res = await fetch('/api/admin/venues/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId,
          commissionSplit: {
            venuePercentage: splitForm.venue,
            djPercentage: splitForm.dj,
            platformPercentage: splitForm.platform,
          },
          updatedBy: 'Super Admin',
        }),
      });

      if (res.ok) {
        setFeedbackNotice({ type: 'success', msg: 'Commission split updated and saved to Supabase.' });
        setEditingVenueId(null);
        loadData();
      } else {
        const err = await res.json();
        setFeedbackNotice({ type: 'error', msg: err?.error || 'Update failed.' });
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Network error saving split.' });
    }
  };

  const handleSaveDefaultSplit = async () => {
    const total = defaultSplitForm.dj + defaultSplitForm.venue + defaultSplitForm.platform;
    if (total !== 100) {
      setFeedbackNotice({ type: 'error', msg: `Default split percentages must sum to 100% (currently ${total}%).` });
      return;
    }

    setIsSavingDefaultSplit(true);
    try {
      const res = await fetch('/api/admin/splits/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          djPercentage: defaultSplitForm.dj,
          venuePercentage: defaultSplitForm.venue,
          platformPercentage: defaultSplitForm.platform,
          updatedBy: currentAdmin?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackNotice({ type: 'success', msg: 'Platform default commission split successfully updated!' });
        setIsEditingDefaultSplit(false);
        loadData();
      } else {
        setFeedbackNotice({ type: 'error', msg: data?.error || 'Failed to update default commission split.' });
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Network error saving default split.' });
    } finally {
      setIsSavingDefaultSplit(false);
    }
  };

  const handleOpenTemplateEditor = async (templateId: string) => {
    try {
      const res = await fetch(`/api/admin/emails/templates?type=${templateId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setEditingTemplateId(templateId);
          setTemplateForm({
            id: data.template.id,
            name: data.template.name,
            headline: data.template.headline,
            introText: data.template.introText,
            subjectPattern: data.template.subjectPattern,
            ctaText: data.template.ctaText,
            secondaryNote: data.template.secondaryNote,
          });
        }
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Failed to fetch email template details.' });
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm) return;

    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/admin/emails/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackNotice({ type: 'success', msg: `${templateForm.name} updated successfully!` });
        setEditingTemplateId(null);
        setTemplateForm(null);
      } else {
        setFeedbackNotice({ type: 'error', msg: data?.error || 'Failed to save template.' });
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Network error saving template.' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleResetTemplate = async (templateId: string) => {
    try {
      const res = await fetch('/api/admin/emails/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, action: 'reset' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackNotice({ type: 'success', msg: 'Template restored to factory default.' });
        setEditingTemplateId(null);
        setTemplateForm(null);
      }
    } catch {
      setFeedbackNotice({ type: 'error', msg: 'Failed to reset template.' });
    }
  };

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    if (!adminData?.recentTransactions) return [];
    return adminData.recentTransactions.filter((tx) => {
      const matchFilter = ledgerFilter === 'all' || tx.type === ledgerFilter;
      const q = ledgerSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.reference.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [adminData?.recentTransactions, ledgerFilter, ledgerSearch]);

  // Auth Screen: Email & Password (No PIN)
  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-zinc-900 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm border border-zinc-200/90 bg-white rounded-2xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-xs border border-zinc-200/40">
                <Image
                  src="/brand-logo-transparent.png"
                  alt="QueMyDJ"
                  width={32}
                  height={32}
                  priority
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-zinc-950 tracking-tight leading-tight">QueMyDJ Console</h1>
                <p className="text-[10px] text-zinc-500 font-medium">Powered by Zenbeatz &bull; Executive Ops</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              RBAC PROTECTED
            </span>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-600 tracking-wide uppercase">
                Admin Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="admin@quemydj.com"
                  className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-950 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-600 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-950 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-zinc-100 flex flex-col gap-2">
            <p className="text-[11px] text-zinc-400">
              Need access? Ask a Super Admin to invite your email.
            </p>
            <Link
              href="/"
              className="text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
            >
              &larr; Return to Guest Web App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const m = adminData?.metrics || {
    totalGrossRevenue: 0,
    platformRevenue: 0,
    totalDjEarnings: 0,
    totalVenueCommissions: 0,
    totalEscrowHeldInDispute: 0,
    totalRefundedToGuests: 0,
    totalRequestsCount: 0,
    verifiedRequestsCount: 0,
    totalDjsCount: 0,
    activeDjsCount: 0,
    totalVenuesCount: 0,
    openDisputesCount: 0,
    totalDisputesCount: 0,
  };

  const walletFundedTotal = adminData?.recentTransactions
    .filter((t) => t.type === 'topup')
    .reduce((s, t) => s + t.amount, 0) || 0;

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-zinc-900 flex flex-col font-sans antialiased">
      {/* 1. CLEAN EXECUTIVE HEADER (RESPONSIVE FOR ALL SCREEN SIZES) */}
      <header className="bg-white border-b border-zinc-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Logo and Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              <Link href="/admin" className="flex items-center gap-2.5 group">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-xs border border-zinc-200/40 flex-shrink-0 group-hover:scale-105 transition-all">
                  <Image
                    src="/brand-logo-transparent.png"
                    alt="QueMyDJ"
                    width={32}
                    height={32}
                    priority
                    className="object-contain p-0.5"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-zinc-950 group-hover:text-emerald-600 transition-colors leading-tight">
                    QueMyDJ
                  </span>
                  <span className="text-[9px] font-semibold tracking-wider text-zinc-400 uppercase -mt-0.5">
                    Powered by Zenbeatz
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation (Hidden on small mobile, visible on md+) */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: 'treasury', label: 'Treasury & Ledger', icon: LayoutDashboard, visible: currentAdmin?.permissions.treasury ?? true },
                { id: 'disputes', label: 'Umpire Chamber', icon: ShieldAlert, badge: m.openDisputesCount > 0 ? `${m.openDisputesCount}` : null, visible: currentAdmin?.permissions.disputes ?? true },
                { id: 'venues', label: 'Venues & Splits', icon: Building2, visible: currentAdmin?.permissions.venues ?? true },
                { id: 'djs', label: 'DJ Roster & Booths', icon: Headphones, visible: currentAdmin?.permissions.djs ?? true },
                { id: 'team', label: 'Admin Team', icon: Users, badge: teamInvitations.length > 0 ? `${teamInvitations.length}` : null, visible: currentAdmin?.permissions.manageAdmins ?? (currentAdmin?.role === 'super_admin') },
              ].filter(t => t.visible).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as typeof activeSection)}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${tab.id === 'disputes' ? 'bg-rose-500 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Links & User Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsRefreshing(true);
                  loadData();
                }}
                disabled={isRefreshing}
                title="Sync Database"
                className="h-8 px-2.5 sm:px-3 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>

              {/* Current Admin Pill, Key & Logout */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-zinc-200">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold text-zinc-900 leading-tight truncate max-w-[120px]">{currentAdmin?.name || 'Super Admin'}</p>
                  <p className="text-[10px] text-zinc-400 font-mono capitalize">{(currentAdmin?.role || 'super_admin').replace('_', ' ')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPwdError(null);
                    setPwdSuccess(null);
                    setIsPasswordModalOpen(true);
                  }}
                  title="Change Password"
                  className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out from Admin Console"
                  className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-500 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Tab Scroll Strip (Visible on mobile/tablet screens < md) */}
          <div className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-none py-2 border-t border-zinc-100 -mx-4 px-4 bg-zinc-50/50">
            {[
              { id: 'treasury', label: 'Treasury', icon: LayoutDashboard, visible: currentAdmin?.permissions.treasury ?? true },
              { id: 'disputes', label: 'Umpire', icon: ShieldAlert, badge: m.openDisputesCount > 0 ? `${m.openDisputesCount}` : null, visible: currentAdmin?.permissions.disputes ?? true },
              { id: 'venues', label: 'Venues', icon: Building2, visible: currentAdmin?.permissions.venues ?? true },
              { id: 'djs', label: 'DJs', icon: Headphones, visible: currentAdmin?.permissions.djs ?? true },
              { id: 'team', label: 'Team', icon: Users, badge: teamInvitations.length > 0 ? `${teamInvitations.length}` : null, visible: currentAdmin?.permissions.manageAdmins ?? (currentAdmin?.role === 'super_admin') },
            ].filter(t => t.visible).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as typeof activeSection)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-zinc-900 text-white font-bold shadow-xs'
                      : 'bg-white text-zinc-600 border border-zinc-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${tab.id === 'disputes' ? 'bg-rose-500 text-white' : 'bg-zinc-200 text-zinc-800'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm text-zinc-950">Change Admin Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-6 h-6 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {pwdError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}
              {pwdSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-600">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-600">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-600">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPwd}
                  onChange={(e) => setConfirmNewPwd(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="px-4 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {isChangingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Realtime Alert Banner */}
      {feedbackNotice && (
        <div className={`mx-4 sm:mx-6 lg:mx-8 mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 shadow-2xs ${
          feedbackNotice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedbackNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedbackNotice.msg}</span>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CANVAS (MOBILE-FIRST PADDING) */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1 space-y-6">
        {isLoading && !adminData ? (
          <div className="py-28 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-mono">Loading QueMyDJ executive data...</p>
          </div>
        ) : (
          <>
            {/* TAB: TREASURY & LEDGER */}
            {activeSection === 'treasury' && (
              <div className="space-y-6">
                {/* Unified Financial Ribbon */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/50">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Master Platform Treasury</h2>
                      <p className="text-[11px] text-zinc-500">
                        Live reconciliation of verified guest payments, digital wallet liquidity, and multi-party splits.
                      </p>
                    </div>

                    <div className="text-zinc-600 font-mono text-[11px]">
                      Wallet Liquidity: <strong className="text-zinc-950 font-bold">₦{walletFundedTotal.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* 4 Clean Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
                    {/* Gross Settled */}
                    <div className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 text-xs">
                        <span className="font-semibold">Gross Settled (GMV)</span>
                        <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-zinc-950">
                        ₦{m.totalGrossRevenue.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {m.verifiedRequestsCount} verified song request{m.verifiedRequestsCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    {/* Platform Cut */}
                    <div className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 text-xs">
                        <span className="font-semibold">QueMyDJ Cut ({adminData?.defaultSplit?.platformPercentage ?? 10}%)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">PLATFORM</span>
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-emerald-600">
                        ₦{m.platformRevenue.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-zinc-400">Retained in master Paystack account</p>
                    </div>

                    {/* DJ Payouts */}
                    <div className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 text-xs">
                        <span className="font-semibold">DJ Earnings ({adminData?.defaultSplit?.djPercentage ?? 70}%)</span>
                        <Headphones className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-zinc-950">
                        ₦{m.totalDjEarnings.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-zinc-400">Direct subaccount or NUBAN transfer</p>
                    </div>

                    {/* Venue Share */}
                    <div className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 text-xs">
                        <span className="font-semibold">Venue Host Share ({adminData?.defaultSplit?.venuePercentage ?? 20}%)</span>
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-zinc-950">
                        ₦{m.totalVenueCommissions.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-zinc-400">Nightclub partner commission</p>
                    </div>
                  </div>

                  {/* Split Distribution Bar */}
                  <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-4 text-zinc-600">
                      <span className="font-bold text-zinc-800">Platform Default:</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" /> DJ {adminData?.defaultSplit?.djPercentage ?? 70}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" /> Venue {adminData?.defaultSplit?.venuePercentage ?? 20}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Platform {adminData?.defaultSplit?.platformPercentage ?? 10}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-500">
                      <span>Escrow in dispute:</span>
                      <strong className="text-amber-800 font-mono font-bold">₦{m.totalEscrowHeldInDispute.toLocaleString()}</strong>
                    </div>
                  </div>
                </section>

                {/* Ledger Table Section */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-zinc-600" />
                        <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Immutable Transaction Ledger</h3>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Live records synchronized with Supabase <code className="text-emerald-700 font-mono font-semibold bg-emerald-50 px-1 py-0.5 rounded">public.wallet_transactions</code>
                      </p>
                    </div>

                    {/* Filter Pills & Search */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          placeholder="Search ref or memo..."
                          className="h-8 pl-8 pr-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="flex items-center rounded-lg bg-zinc-100 border border-zinc-200 p-0.5 text-[11px]">
                        {(['all', 'topup', 'request_payment', 'refund'] as const).map((filterKey) => (
                          <button
                            key={filterKey}
                            type="button"
                            onClick={() => setLedgerFilter(filterKey)}
                            className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                              ledgerFilter === filterKey
                                ? 'bg-white text-zinc-950 font-bold shadow-2xs'
                                : 'text-zinc-600 hover:text-zinc-950'
                            }`}
                          >
                            {filterKey === 'request_payment' ? 'Requests' : filterKey}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Clean Tabular Data (Responsive with horizontal touch scrolling on mobile) */}
                  <div className="border border-zinc-200 rounded-xl overflow-x-auto shadow-2xs scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-600 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4">Event &amp; Description</th>
                          <th className="py-2.5 px-4">Reference</th>
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                          <th className="py-2.5 px-4 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {filteredTxs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                              No ledger entries matching current filter.
                            </td>
                          </tr>
                        ) : (
                          filteredTxs.map((tx) => (
                            <tr key={tx.id} className="hover:bg-zinc-50/80 transition-colors">
                              <td className="py-3 px-4 font-semibold text-zinc-900">
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                                    tx.direction === 'credit'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {tx.direction === 'credit' ? (
                                      <ArrowDownLeft className="w-3.5 h-3.5" />
                                    ) : (
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                  <span className="truncate max-w-sm">{tx.description}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(tx.reference)}
                                  title="Copy reference code"
                                  className="hover:text-zinc-950 flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{tx.reference}</span>
                                  <Copy className="w-3 h-3 opacity-50 hover:opacity-100" />
                                  {copiedRef === tx.reference && (
                                    <span className="text-[9px] text-emerald-600 font-bold ml-1">Copied</span>
                                  )}
                                </button>
                              </td>

                              <td className="py-3 px-4">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold ${
                                  tx.type === 'topup'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : tx.type === 'refund'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>

                              <td className={`py-3 px-4 text-right font-mono font-bold text-[13px] ${
                                tx.direction === 'credit' ? 'text-emerald-600' : 'text-zinc-900'
                              }`}>
                                {tx.direction === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                              </td>

                              <td className="py-3 px-4 text-right text-[11px] text-zinc-500 font-mono">
                                {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {/* TAB: UMPIRE CHAMBER */}
            {activeSection === 'disputes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 tracking-tight">Playback Arbitration Chamber</h2>
                    <p className="text-xs text-zinc-500">
                      Guest complaints trigger automatic escrow freezes. Super Admin overrides release funds or issue instant refunds.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {adminData?.disputes.length} Case{adminData?.disputes.length === 1 ? '' : 's'} Logged
                  </span>
                </div>

                <div className="space-y-3">
                  {adminData?.disputes.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white border border-zinc-200/90 text-xs text-zinc-500 shadow-2xs">
                      No active disputes. All dancefloor requests verified cleanly.
                    </div>
                  ) : (
                    adminData?.disputes.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs hover:border-zinc-300 transition-all"
                      >
                        {/* Card Header Strip */}
                        <div className="p-5 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/40">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-bold text-zinc-950 text-sm tracking-tight">{d.songTitle}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${
                                d.status === 'open'
                                  ? 'bg-amber-100/70 text-amber-900 border border-amber-300/80'
                                  : d.status === 'refunded'
                                  ? 'bg-zinc-100 text-zinc-700 border border-zinc-300'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {d.status === 'open' ? 'Awaiting Umpire' : d.status.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Participant Context Pills */}
                            <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <span className="text-zinc-400">Guest:</span>
                                <strong className="text-zinc-800 font-semibold">{d.guestName}</strong>
                              </span>
                              <span className="text-zinc-300">•</span>
                              <span className="inline-flex items-center gap-1">
                                <span className="text-zinc-400">DJ:</span>
                                <strong className="text-zinc-800 font-semibold">{d.djName}</strong>
                              </span>
                              <span className="text-zinc-300">•</span>
                              <span className="inline-flex items-center gap-1">
                                <span className="text-zinc-400">Venue:</span>
                                <strong className="text-zinc-800 font-semibold">{d.venueName}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between gap-1 flex-shrink-0">
                            <div className="text-xl font-bold font-mono tracking-tight text-zinc-950">
                              ₦{d.amount.toLocaleString()}
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">
                              Ref: {d.referenceCode}
                            </span>
                          </div>
                        </div>

                        {/* Card Body: Clean Quote Box & Decision Action Bar */}
                        <div className="p-5 space-y-4">
                          <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70 text-xs text-zinc-700 space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <span>Guest Claim Statement</span>
                            </div>
                            <p className="text-zinc-600 pl-5 italic leading-relaxed">
                              &ldquo;{d.reason}&rdquo;
                            </p>
                          </div>

                          {/* Umpire Action Bar */}
                          {d.status === 'open' ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
                              <button
                                type="button"
                                disabled={resolvingId === d.id}
                                onClick={() => handleDisputeAction(d.id, 'refund_guest')}
                                className="h-9 px-4 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 hover:border-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                              >
                                {resolvingId === d.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>100% Refund to Guest</span>
                              </button>

                              <button
                                type="button"
                                disabled={resolvingId === d.id}
                                onClick={() => handleDisputeAction(d.id, 'release_to_dj')}
                                className="h-9 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                              >
                                {resolvingId === d.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                                <span>Release Escrow to DJ</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between pt-1 text-xs">
                              <span className="text-zinc-400 text-[11px]">Arbitration Concluded</span>
                              <span className="font-semibold text-zinc-700 capitalize flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                {d.status === 'refunded' ? '100% Credited to Guest Wallet' : 'Released to DJ Payout Balance'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: VENUES & SPLITS */}
            {activeSection === 'venues' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 tracking-tight">Partner Nightclubs &amp; Commission Matrix</h2>
                    <p className="text-xs text-zinc-500">
                      Configure custom negotiated splits and manage Paystack split codes per venue.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingDefaultSplit(!isEditingDefaultSplit)}
                    className="h-9 px-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEditingDefaultSplit ? 'Close Default Split Form' : 'Set Platform Default Split'}</span>
                  </button>
                </div>

                {/* Platform Default Split Config Card */}
                {isEditingDefaultSplit && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/40 p-5 space-y-4 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Sliders className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-950">Platform Default Split Commission</h3>
                          <p className="text-[11px] text-zinc-600">Applied automatically to all newly provisioned venues and unnegotiated dancefloor requests.</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                        GLOBAL BASELINE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-white border border-zinc-200 space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 flex items-center justify-between">
                          <span>DJ Share (%)</span>
                          <span className="text-cyan-600 font-bold font-mono">{defaultSplitForm.dj}%</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={defaultSplitForm.dj}
                          onChange={(e) => setDefaultSplitForm({ ...defaultSplitForm, dj: Number(e.target.value) })}
                          className="w-full text-sm p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-950 font-mono font-bold"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-zinc-200 space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 flex items-center justify-between">
                          <span>Venue Share (%)</span>
                          <span className="text-purple-600 font-bold font-mono">{defaultSplitForm.venue}%</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={defaultSplitForm.venue}
                          onChange={(e) => setDefaultSplitForm({ ...defaultSplitForm, venue: Number(e.target.value) })}
                          className="w-full text-sm p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-950 font-mono font-bold"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-zinc-200 space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 flex items-center justify-between">
                          <span>Platform Take (%)</span>
                          <span className="text-emerald-600 font-bold font-mono">{defaultSplitForm.platform}%</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={defaultSplitForm.platform}
                          onChange={(e) => setDefaultSplitForm({ ...defaultSplitForm, platform: Number(e.target.value) })}
                          className="w-full text-sm p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-950 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs">
                        <span className="text-zinc-500">Total: </span>
                        <span className={`font-mono font-bold ${defaultSplitForm.dj + defaultSplitForm.venue + defaultSplitForm.platform === 100 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {defaultSplitForm.dj + defaultSplitForm.venue + defaultSplitForm.platform}%
                        </span>
                        {defaultSplitForm.dj + defaultSplitForm.venue + defaultSplitForm.platform !== 100 && (
                          <span className="text-rose-600 ml-2 font-medium">(Must equal 100%)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDefaultSplit(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-950"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingDefaultSplit || defaultSplitForm.dj + defaultSplitForm.venue + defaultSplitForm.platform !== 100}
                          onClick={handleSaveDefaultSplit}
                          className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {isSavingDefaultSplit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Save Platform Default</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {adminData?.venues.map((venue) => {
                    const isEditing = editingVenueId === venue.id;
                    const split = venue.commissionSplit;

                    return (
                      <div
                        key={venue.id}
                        className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Top Strip with City & Status */}
                          <div className="p-5 pb-4 border-b border-zinc-100 bg-zinc-50/40 flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="font-bold text-zinc-950 text-sm tracking-tight truncate">{venue.name}</h3>
                              </div>
                              <p className="text-xs text-zinc-500 truncate pl-9">
                                {venue.city} • <span className="font-mono text-[11px] text-zinc-400">{venue.ownerEmail}</span>
                              </p>
                            </div>

                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold flex-shrink-0">
                              {venue.status.toUpperCase()}
                            </span>
                          </div>

                          {/* Split Breakdown & Routing Stats */}
                          <div className="p-5 space-y-4">
                            {/* Visual Proportional Split Bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Revenue Allocation</span>
                                <span className="font-mono text-xs font-bold text-zinc-900">
                                  {split.djPercentage} / {split.venuePercentage} / {split.platformPercentage}
                                </span>
                              </div>

                              <div className="h-2 rounded-full overflow-hidden flex bg-zinc-100">
                                <div style={{ width: `${split.djPercentage}%` }} className="bg-cyan-500" title={`DJ: ${split.djPercentage}%`} />
                                <div style={{ width: `${split.venuePercentage}%` }} className="bg-purple-500" title={`Venue: ${split.venuePercentage}%`} />
                                <div style={{ width: `${split.platformPercentage}%` }} className="bg-emerald-500" title={`Platform: ${split.platformPercentage}%`} />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                  <span>DJ {split.djPercentage}%</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  <span>Venue {split.venuePercentage}%</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Platform {split.platformPercentage}%</span>
                                </span>
                              </div>
                            </div>

                            {/* Paystack Rail Context Box */}
                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between text-xs">
                              <span className="text-zinc-600 font-medium">Paystack Rail</span>
                              <span className="font-mono text-[11px] font-semibold text-zinc-700 bg-white px-2 py-0.5 rounded border border-zinc-200">
                                {venue.paystackSubaccountCode || venue.paystackSplitCode || 'Platform Escrow'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Action / Form */}
                        <div className="p-5 pt-0">
                          {isEditing ? (
                            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-300 space-y-3">
                              <p className="text-xs font-bold text-zinc-950">Configure Split Percentages</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] text-zinc-600 font-semibold block mb-1">DJ %</label>
                                  <input
                                    type="number"
                                    value={splitForm.dj}
                                    onChange={(e) => setSplitForm({ ...splitForm, dj: Number(e.target.value) })}
                                    className="w-full text-xs p-2 rounded-lg bg-white border border-zinc-300 text-zinc-950 font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-zinc-600 font-semibold block mb-1">Venue %</label>
                                  <input
                                    type="number"
                                    value={splitForm.venue}
                                    onChange={(e) => setSplitForm({ ...splitForm, venue: Number(e.target.value) })}
                                    className="w-full text-xs p-2 rounded-lg bg-white border border-zinc-300 text-zinc-950 font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-zinc-600 font-semibold block mb-1">Platform %</label>
                                  <input
                                    type="number"
                                    value={splitForm.platform}
                                    onChange={(e) => setSplitForm({ ...splitForm, platform: Number(e.target.value) })}
                                    className="w-full text-xs p-2 rounded-lg bg-white border border-zinc-300 text-zinc-950 font-mono font-bold"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingVenueId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-950"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSplit(venue.id)}
                                  className="px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                  Save Matrix
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVenueId(venue.id);
                                setSplitForm({
                                  dj: split.djPercentage,
                                  venue: split.venuePercentage,
                                  platform: split.platformPercentage,
                                });
                              }}
                              className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs hover:border-zinc-300 flex items-center justify-center gap-1.5"
                            >
                              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Adjust Commission Split</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: DJ ROSTER */}
            {activeSection === 'djs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 tracking-tight">Resident DJ Roster &amp; Payout Rails</h2>
                    <p className="text-xs text-zinc-500">
                      Live duty statuses, active venues, base prices, and Paystack recipient codes.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {adminData?.djs.length} Registered DJ{adminData?.djs.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminData?.djs.map((dj) => (
                    <div
                      key={dj.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-zinc-950 text-sm">{dj.name}</h3>
                          <p className="text-xs text-zinc-500">@{dj.handle}</p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          dj.isAcceptingRequests
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {dj.isAcceptingRequests ? 'ON DUTY' : 'OFF DUTY'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600">Assigned Venue</span>
                          <span className="text-zinc-900 font-semibold">{dj.currentVenue?.name || 'Lounge Resident'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600">Base Track Price</span>
                          <span className="font-mono font-bold text-zinc-950">₦{dj.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600">Payout Recipient</span>
                          <span className="font-mono font-semibold text-blue-700">
                            {dj.paystackRecipientCode || 'Pending Link'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ADMIN TEAM & ROLES (INVITATION & PERMISSION SHARING) */}
            {activeSection === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 tracking-tight">Admin Team, Roles &amp; Permission Sharing</h2>
                    <p className="text-xs text-zinc-500">
                      Invite administrative officers, grant granular section access, and share menu permissions.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {teamAdmins.length} Active Admin{teamAdmins.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Invite Form Card */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 text-zinc-950 font-bold text-sm">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Invite New Administrative Officer</span>
                  </div>

                  <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Officer Work Email</label>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="e.g. ops@nightclub.ng"
                          className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Predefined Role Preset</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => {
                            const r = e.target.value as AdminRole;
                            setInviteRole(r);
                            if (r === 'finance_admin') {
                              setInvitePerms({ treasury: true, disputes: true, venues: true, djs: false, manageAdmins: false });
                            } else if (r === 'umpire_admin') {
                              setInvitePerms({ treasury: false, disputes: true, venues: false, djs: true, manageAdmins: false });
                            } else if (r === 'ops_admin') {
                              setInvitePerms({ treasury: false, disputes: false, venues: true, djs: true, manageAdmins: false });
                            } else if (r === 'super_admin') {
                              setInvitePerms({ treasury: true, disputes: true, venues: true, djs: true, manageAdmins: true });
                            }
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                        >
                          <option value="ops_admin">Operations Admin (Venues &amp; DJs)</option>
                          <option value="finance_admin">Finance Officer (Treasury, Ledger, Splits)</option>
                          <option value="umpire_admin">Umpire Officer (Dispute Arbitration &amp; Escrow)</option>
                          <option value="super_admin">Super Administrator (Full Unrestricted Access)</option>
                        </select>
                      </div>
                    </div>

                    {/* Granular Permission Sharing Toggles */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <p className="text-xs font-semibold text-zinc-800">Menu &amp; Section Permissions to Share:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {[
                          { key: 'treasury', label: 'Treasury & Ledger' },
                          { key: 'disputes', label: 'Umpire Chamber' },
                          { key: 'venues', label: 'Venues & Splits' },
                          { key: 'djs', label: 'DJ Roster' },
                          { key: 'manageAdmins', label: 'Admin Management' },
                        ].map((perm) => (
                          <label
                            key={perm.key}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                              invitePerms[perm.key as keyof AdminPermissions]
                                ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-semibold'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={invitePerms[perm.key as keyof AdminPermissions]}
                              onChange={(e) =>
                                setInvitePerms({
                                  ...invitePerms,
                                  [perm.key]: e.target.checked,
                                })
                              }
                              className="accent-emerald-600"
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[11px] text-zinc-400">
                        An email invitation with a secure 7-day token link will be created.
                      </p>
                      <button
                        type="submit"
                        disabled={isSendingInvite || !inviteEmail}
                        className="h-9 px-4 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {isSendingInvite ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Invitation Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Shareable Link Display */}
                  {lastGeneratedInviteLink && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span>Direct Invitation Activation Link</span>
                        <span className="text-[10px] font-mono text-emerald-700">Valid for 7 Days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={lastGeneratedInviteLink}
                          className="w-full text-xs font-mono bg-white border border-emerald-200 px-3 py-1.5 rounded-md text-emerald-950"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(lastGeneratedInviteLink)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          {copiedRef === lastGeneratedInviteLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedRef === lastGeneratedInviteLink ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <h3 className="font-bold text-sm text-zinc-950">Active Administrative Officers</h3>
                    <span className="text-xs text-zinc-500 font-mono">{teamAdmins.length} users</span>
                  </div>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {teamAdmins.map((admin) => (
                      <div key={admin.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                            {admin.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-950">{admin.name}</span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 capitalize">
                                {admin.role.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-zinc-500 text-[11px] font-mono">{admin.email}</p>
                          </div>
                        </div>

                        {/* Allowed Menus */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {admin.permissions.treasury && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px]">Treasury</span>
                          )}
                          {admin.permissions.disputes && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-mono text-[10px]">Umpire</span>
                          )}
                          {admin.permissions.venues && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px]">Venues</span>
                          )}
                          {admin.permissions.djs && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px]">DJs</span>
                          )}
                          {admin.permissions.manageAdmins && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px]">Manage Admins</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Invitations Table */}
                {teamInvitations.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                      <h3 className="font-bold text-sm text-zinc-950">Pending Invitations</h3>
                      <span className="text-xs text-amber-700 font-mono">{teamInvitations.length} pending</span>
                    </div>
                    <div className="divide-y divide-zinc-100 text-xs">
                      {teamInvitations.map((inv) => (
                        <div key={inv.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-900">{inv.email}</p>
                            <p className="text-[11px] text-zinc-400">
                              Invited as <span className="capitalize font-semibold text-zinc-600">{inv.role.replace('_', ' ')}</span> by {inv.invitedByName}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            PENDING ACCEPTANCE
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Templates Management & Editor Utility */}
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-950">QueMyDJ Production Email Templates</h4>
                      <p className="text-[11px] text-zinc-500">Edit headlines, messaging, call-to-action buttons, and preview live responsive HTML emails.</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold self-start sm:self-auto">
                      EDITABLE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { id: 'invite', name: 'Admin Invite Email', desc: 'Sent when inviting team officers with role permissions.' },
                      { id: 'receipt', name: 'Guest Receipt Email', desc: 'Sent after successful Paystack song request payment.' },
                      { id: 'payout', name: 'DJ Payout Email', desc: 'Sent when event session earnings are settled to bank account.' },
                    ].map((tpl) => (
                      <div key={tpl.id} className="p-3.5 rounded-xl border border-zinc-200/90 bg-zinc-50/50 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <h5 className="font-bold text-xs text-zinc-950">{tpl.name}</h5>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">{tpl.desc}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => handleOpenTemplateEditor(tpl.id)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                            <span>Edit Template</span>
                          </button>
                          <a
                            href={`/api/admin/emails/preview?type=${tpl.id}`}
                            target="_blank"
                            title="Preview rendered HTML in new tab"
                            className="py-1.5 px-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>Preview</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Template Editing Modal */}
                {editingTemplateId && templateForm && (
                  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-950">Edit {templateForm.name}</h3>
                            <p className="text-[11px] text-zinc-400">Customize email subject, copy, and action button</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplateId(null);
                            setTemplateForm(null);
                          }}
                          className="w-6 h-6 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700 block">Email Subject Pattern</label>
                          <input
                            type="text"
                            required
                            value={templateForm.subjectPattern}
                            onChange={(e) => setTemplateForm({ ...templateForm, subjectPattern: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                          />
                          <p className="text-[10px] text-zinc-400 font-mono">Variables available: {"{{role}}"}, {"{{songTitle}}"}, {"{{reference}}"}, {"{{currency}}"}, {"{{amount}}"}</p>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700 block">Main Headline</label>
                          <input
                            type="text"
                            required
                            value={templateForm.headline}
                            onChange={(e) => setTemplateForm({ ...templateForm, headline: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700 block">Introduction Text</label>
                          <textarea
                            rows={3}
                            required
                            value={templateForm.introText}
                            onChange={(e) => setTemplateForm({ ...templateForm, introText: e.target.value })}
                            className="w-full p-2.5 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-700 block">CTA Button Label</label>
                            <input
                              type="text"
                              required
                              value={templateForm.ctaText}
                              onChange={(e) => setTemplateForm({ ...templateForm, ctaText: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-700 block">Live Preview Link</label>
                            <a
                              href={`/api/admin/emails/preview?type=${editingTemplateId}`}
                              target="_blank"
                              className="h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-between"
                            >
                              <span>Open Render Preview</span>
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            </a>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700 block">Secondary Policy Note (Footer)</label>
                          <textarea
                            rows={2}
                            value={templateForm.secondaryNote}
                            onChange={(e) => setTemplateForm({ ...templateForm, secondaryNote: e.target.value })}
                            className="w-full p-2.5 rounded-lg border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 leading-relaxed text-[11px]"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => handleResetTemplate(editingTemplateId)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Reset to Default
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplateId(null);
                                setTemplateForm(null);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingTemplate}
                              className="h-8 px-4 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                            >
                              {isSavingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Save Template Changes</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
