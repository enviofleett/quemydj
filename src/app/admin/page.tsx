'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCueApp } from '@/context/CueAppContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  ListMusic,
  Wallet,
  Settings,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  ExternalLink,
  ChevronRight,
  Radio,
  Sliders,
  Disc3,
  Moon,
  Sun,
  LogOut,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { djs, requests } = useCueApp();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'djs' | 'venues' | 'requests' | 'payouts' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Platform Commission & Financial Mock Stats
  const [platformFeePercent, setPlatformFeePercent] = useState(15);
  const [minBasePrice, setMinBasePrice] = useState(3000);
  const [isAutoPayoutEnabled, setIsAutoPayoutEnabled] = useState(true);

  // Compute financial metrics from real session requests
  const uniqueRequests = requests;

  const totalGrossRevenue = uniqueRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
  const platformRevenue = Math.round(totalGrossRevenue * (platformFeePercent / 100));
  const djEarningsTotal = totalGrossRevenue - platformRevenue;
  const totalCompletedRequests = uniqueRequests.filter((r) => r.status === 'played').length;
  const totalPendingRequests = uniqueRequests.filter((r) => r.status === 'playing' || r.status === 'accepted' || r.status === 'new_request' || r.status === 'waiting').length;
  const totalRefundedRequests = uniqueRequests.filter((r) => r.status === 'refunded' || r.status === 'declined').length;

  // Mock Payout Requests from DJs
  const [payoutList, setPayoutList] = useState([
    {
      id: 'PAY-9041',
      djName: 'DJ Spinall (Kofi Beats)',
      bankName: 'Access Bank',
      accountNumber: '0129****89',
      amount: 145000,
      status: 'pending',
      date: 'Today, 02:45 AM',
      reference: 'PAYSTACK-TRX-882194',
    },
    {
      id: 'PAY-8921',
      djName: 'DJ Cuppy Live',
      bankName: 'Zenith Bank',
      accountNumber: '2049****12',
      amount: 98000,
      status: 'completed',
      date: 'Yesterday, 11:30 PM',
      reference: 'PAYSTACK-TRX-771239',
    },
    {
      id: 'PAY-8812',
      djName: 'DJ Neptune',
      bankName: 'GTBank',
      accountNumber: '0281****55',
      amount: 215000,
      status: 'completed',
      date: 'Nov 11, 2026',
      reference: 'PAYSTACK-TRX-661298',
    },
  ]);

  const handleApprovePayout = (id: string) => {
    setPayoutList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'completed' } : p))
    );
  };

  const handleRejectPayout = (id: string) => {
    setPayoutList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
    );
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-emerald-500 selection:text-black">
      {/* ============================================================== */}
      {/* 1. SIDEBAR NAVIGATION                                         */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-64 bg-[#0d0f14] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* Brand header */}
          <div className="p-5 flex items-center justify-between border-b border-white/[0.08]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                <Image
                  src="/brand-logo-transparent.png"
                  alt="QueMyDJ Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="font-black text-lg text-white tracking-tight block">
                  QueMyDJ
                </span>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase block">
                  SUPER ADMIN
                </span>
              </div>
            </Link>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview &amp; Metrics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('djs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'djs'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Resident DJs ({djs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('venues')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'venues'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Venues &amp; Clubs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>Live Song Requests</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payouts')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'payouts'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4" />
                <span>DJ Payouts</span>
              </div>
              {payoutList.filter((p) => p.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-extrabold">
                  {payoutList.filter((p) => p.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Platform Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom System Info */}
        <div className="p-4 border-t border-white/[0.08] space-y-3">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Environment</span>
              <span className="font-mono text-emerald-400 font-bold">Production</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Paystack Hook</span>
              <span className="font-mono text-white">Active</span>
            </div>
          </div>

          <Link
            href="/dj/workstation"
            className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <Disc3 className="w-4 h-4 text-emerald-400" />
            <span>Open DJ Booth Console</span>
          </Link>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT AREA                                           */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#08090d]">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/[0.08] px-6 lg:px-8 flex items-center justify-between bg-[#0b0d12]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-white tracking-tight capitalize">
              {activeTab === 'overview' && 'Platform Overview & Performance'}
              {activeTab === 'djs' && 'Resident DJs & Performers'}
              {activeTab === 'venues' && 'Active Club Venues & Tables'}
              {activeTab === 'requests' && 'Live Song Request Audit'}
              {activeTab === 'payouts' && 'DJ Settlement & Paystack Payouts'}
              {activeTab === 'settings' && 'Platform Fee & Global Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Socket Connected</span>
            </div>

            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-all"
            >
              Exit to App
            </Link>
          </div>
        </header>

        {/* Tab Content Body */}
        <div className="p-6 lg:p-8 space-y-8 flex-1 overflow-y-auto">
          {/* ========================================================== */}
          {/* TAB 1: OVERVIEW & KEY METRICS                               */}
          {/* ========================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Financial Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                    <span>Total Gross Volume</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-black text-white">
                    ₦{totalGrossRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+24.8% from last weekend</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                    <span>Platform Commission ({platformFeePercent}%)</span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-black text-emerald-400">
                    ₦{platformRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-medium">
                    Auto-deducted per guest request
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                    <span>DJ Net Balance</span>
                    <Disc3 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-black text-white">
                    ₦{djEarningsTotal.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-medium">
                    Ready for DJ bank withdrawals
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                    <span>Total Request Volume</span>
                    <ListMusic className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-black text-white">
                    {uniqueRequests.length} tracks
                  </div>
                  <div className="text-[11px] text-zinc-400 font-medium">
                    {totalCompletedRequests} played &bull; {totalRefundedRequests} refunded
                  </div>
                </div>
              </div>

              {/* Live Request Flow & DJ Status Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active DJs Quick Table */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Active Resident DJs</h3>
                      <p className="text-xs text-zinc-400">Live booth status and tonight&apos;s request rates</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('djs')}
                      className="text-xs text-emerald-400 hover:underline font-bold"
                    >
                      View All ({djs.length}) &rarr;
                    </button>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {djs.map((dj) => (
                      <div key={dj.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={dj.avatarUrl}
                            alt={dj.name}
                            className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">{dj.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Verified
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400 block truncate">
                              {dj.currentVenue.name} &bull; {dj.currentVenue.city}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-emerald-400">
                            ₦{(dj.liveSession?.basePrice || 5000).toLocaleString()}/track
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Code: <span className="font-mono font-bold text-white">{dj.liveSession?.passcode || 'LIVE'}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payout Quick Actions */}
                <div className="p-6 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">Pending Settlements</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {payoutList.filter((p) => p.status === 'pending').length} Actions
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      DJ earnings ready for Paystack transfer to registered commercial bank accounts.
                    </p>

                    <div className="space-y-2.5 pt-2">
                      {payoutList.slice(0, 2).map((item) => (
                        <div key={item.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{item.djName}</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ₦{item.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                            <span>{item.bankName} &bull; {item.accountNumber}</span>
                            <span className="text-amber-400 font-semibold capitalize">{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('payouts')}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all"
                  >
                    Manage Payout Queue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: RESIDENT DJS MANAGEMENT                             */}
          {/* ========================================================== */}
          {activeTab === 'djs' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Resident DJ Directory</h2>
                  <p className="text-xs text-zinc-400">Manage DJ verification, commission tiers, and live booth settings</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search DJ name or handle..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl bg-[#0f1117] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* DJ Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {djs
                  .filter((dj) => dj.name.toLowerCase().includes(searchQuery.toLowerCase()) || dj.handle.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((dj) => (
                    <div key={dj.id} className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-4 hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <img
                          src={dj.avatarUrl}
                          alt={dj.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{dj.name}</h4>
                          <span className="text-xs text-emerald-400 font-medium block">{dj.handle}</span>
                          <span className="text-[11px] text-zinc-400 block truncate">{dj.currentVenue.name}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Min Track Fee</span>
                          <span className="font-bold text-white">₦{(dj.liveSession?.basePrice || 5000).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Live Passcode</span>
                          <span className="font-mono font-bold text-emerald-400">{dj.liveSession?.passcode || 'LIVE'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Rating</span>
                          <span className="font-bold text-amber-400">★ {dj.rating}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Total Sets</span>
                          <span className="font-bold text-white">{dj.totalSets}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/djs/${dj.id}`}
                          className="flex-1 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-xs font-bold text-white transition-all border border-white/10"
                        >
                          View Public Card
                        </Link>
                        <Link
                          href="/dj/workstation"
                          className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all border border-emerald-500/30"
                        >
                          Open Console
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: VENUES & CLUBS                                       */}
          {/* ========================================================== */}
          {activeTab === 'venues' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Partner Venues &amp; Nightclubs</h2>
                  <p className="text-xs text-zinc-400">Manage clubs, lounges, table groupings, and QR installations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {djs.map((dj) => (
                  <div key={dj.id + '-venue'} className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active Venue
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{dj.currentVenue.name}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{dj.currentVenue.address}</p>
                      <span className="text-[11px] text-zinc-500">{dj.currentVenue.city}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Resident Headliner:</span>
                        <span className="font-bold text-white">{dj.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Table Count:</span>
                        <span className="font-bold text-white">45 VIP Tables</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Venue Passcode:</span>
                        <span className="font-mono font-bold text-emerald-400">{dj.liveSession?.passcode || 'SKY99'}</span>
                      </div>
                    </div>

                    <Link
                      href={`/request/${dj.liveSession?.id || 'session-skyline-friday'}`}
                      className="w-full py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-xs font-bold text-white transition-all border border-white/10 block"
                    >
                      Preview Table Guest Menu &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: LIVE SONG REQUEST AUDIT                             */}
          {/* ========================================================== */}
          {activeTab === 'requests' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Song Request Stream &amp; Audit</h2>
                  <p className="text-xs text-zinc-400">Full audit log of guest bids, tips, DJ decisions, and 100% refund transactions</p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-[#0f1117] p-1 rounded-xl border border-white/[0.08] text-xs font-semibold">
                  {['all', 'playing', 'played', 'refunded'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                        statusFilter === status
                          ? 'bg-emerald-500 text-black font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requests Table */}
              <div className="rounded-2xl bg-[#0f1117] border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] text-zinc-400 border-b border-white/[0.08]">
                      <tr>
                        <th className="py-3.5 px-4 font-bold">Track &amp; Artist</th>
                        <th className="py-3.5 px-4 font-bold">Guest &amp; Venue</th>
                        <th className="py-3.5 px-4 font-bold">Amount</th>
                        <th className="py-3.5 px-4 font-bold">Status</th>
                        <th className="py-3.5 px-4 font-bold">Payment Method</th>
                        <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {uniqueRequests
                        .filter((r) => statusFilter === 'all' || r.status === statusFilter)
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={req.song?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'}
                                  alt={req.song?.title}
                                  className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                />
                                <div>
                                  <span className="font-bold text-white block">{req.song?.title}</span>
                                  <span className="text-[11px] text-zinc-400 block">{req.song?.artist}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-white block">{req.guestName || 'VIP Guest'}</span>
                              <span className="text-[11px] text-zinc-400 block">{req.venueName || 'Skyline Rooftop'}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-emerald-400 font-mono">₦{req.amount.toLocaleString()}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                  req.status === 'playing'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : req.status === 'played'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : req.status === 'refunded' || req.status === 'declined'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-zinc-400">
                              {req.paidVia || 'Paystack Direct'}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/requests/${req.id}`}
                                className="text-emerald-400 hover:underline font-bold"
                              >
                                View Receipt &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 5: PAYOUTS & SETTLEMENTS                                */}
          {/* ========================================================== */}
          {activeTab === 'payouts' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">DJ Earnings &amp; Withdrawal Settlements</h2>
                  <p className="text-xs text-zinc-400">Review payout requests, bank transfers, and automated settlement batches</p>
                </div>

                <button
                  type="button"
                  onClick={() => alert('Paystack Auto-Transfer Batch Initiated')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Process All Pending Batches
                </button>
              </div>

              {/* Payout Queue Cards */}
              <div className="space-y-3">
                {payoutList.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.djName}</span>
                        <span className="font-mono text-xs text-zinc-500">[{item.id}]</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {item.bankName} &bull; Account: {item.accountNumber} &bull; Ref: {item.reference}
                      </p>
                      <span className="text-[11px] text-zinc-500">{item.date}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-white font-mono">
                          ₦{item.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-zinc-400">Net after 15% platform cut</span>
                      </div>

                      {item.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovePayout(item.id)}
                            className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 transition-all cursor-pointer"
                            title="Approve & Send Transfer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPayout(item.id)}
                            className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-black border border-rose-500/40 transition-all cursor-pointer"
                            title="Reject & Refund to DJ Balance"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 6: SETTINGS & CONFIGURATION                            */}
          {/* ========================================================== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white">Platform Settings &amp; Economics</h2>
                <p className="text-xs text-zinc-400">Adjust take-rates, minimum bid limits, and payment gateway configurations</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0f1117] border border-white/[0.08] space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white block">
                    Platform Commission Rate (%)
                  </label>
                  <p className="text-xs text-zinc-400">
                    Percentage retained by QueMyDJ on every accepted song request and tip.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={platformFeePercent}
                      onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-xl bg-black border border-white/20 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                    />
                    <span className="text-sm font-bold text-zinc-400">%</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] pt-5">
                  <label className="text-xs font-bold text-white block">
                    Global Minimum Request Bid (₦ NGN)
                  </label>
                  <p className="text-xs text-zinc-400">
                    The floor price any resident DJ can configure for guest song requests.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-400">₦</span>
                    <input
                      type="number"
                      value={minBasePrice}
                      onChange={(e) => setMinBasePrice(Number(e.target.value))}
                      className="w-32 px-3 py-2 rounded-xl bg-black border border-white/20 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] pt-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto Payout via Paystack Transfers</span>
                    <span className="text-xs text-zinc-400">Automatically disburse DJ balances on Sundays at midnight.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAutoPayoutEnabled}
                    onChange={(e) => setIsAutoPayoutEnabled(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => alert('Platform settings saved successfully!')}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
