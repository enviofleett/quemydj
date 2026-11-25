'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Landmark,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowDownLeft,
  Moon,
  Sun,
  Sliders,
  Check,
  Headphones,
  Lock,
  FileText,
  CreditCard,
  LogOut,
  Power,
  Pencil,
  X,
  ChevronDown,
  Search,
  AlertCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface BankOption {
  name: string;
  code: string;
  slug: string;
}

interface SavedVenueBank {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  verified: boolean;
}

export default function VenueOwnerPortalPage() {
  const router = useRouter();
  const { venues, activeVenue, setActiveVenueId, requests, djs, themeMode, toggleThemeMode } = useCueApp();

  // Active resident DJ for this venue
  const activeDj =
    djs.find((d) => d.id === activeVenue.activeDjId) ||
    djs[0] || {
      id: 'dj-fallback',
      name: 'Resident DJ',
      handle: '@resident',
      avatarUrl:
        'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=300&auto=format&fit=crop&q=80',
      liveSession: {
        id: 'session-skyline',
        passcode: 'SKY99',
        basePrice: 5000,
      },
    };

  // State: Navigation tabs
  const [activeTab, setActiveTab] = useState<'revenue' | 'djs' | 'settlement' | 'settings'>('revenue');

  // State: Time filter for Revenue view ('day' | 'week' | 'month')
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');

  // State: Bank Account & Payout configuration
  const [savedBank, setSavedBank] = useState<SavedVenueBank>({
    bankName: 'Guaranty Trust Bank (GTBank)',
    bankCode: '058',
    accountNumber: '0124859104',
    accountName: 'SKYLINE ROOFTOP ENTERPRISES LTD',
    verified: true,
  });

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState(savedBank.bankCode);
  const [accountNumber, setAccountNumber] = useState(savedBank.accountNumber);
  const [accountName, setAccountName] = useState(savedBank.accountName);
  const [isResolving, setIsResolving] = useState(false);
  const [bankSaveNotice, setBankSaveNotice] = useState<string | null>(null);

  // State: Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // State: Terms & Conditions modal / preview
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Available banks list
  const [banksList, setBanksList] = useState<BankOption[]>([
    { name: 'Access Bank', code: '044', slug: 'access-bank' },
    { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'gtbank' },
    { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
    { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank' },
    { name: 'United Bank for Africa (UBA)', code: '033', slug: 'uba' },
    { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
    { name: 'Opay (Paycom)', code: '999992', slug: 'opay' },
    { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint' },
    { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc' },
  ]);

  // Load banks list dynamically if available
  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((res) => res.json())
      .then((data) => {
        if (data.banks && Array.isArray(data.banks) && data.banks.length > 0) {
          setBanksList(data.banks);
        }
      })
      .catch(() => {});
  }, []);

  // Filter requests based on time filter
  const venueRequests = requests.filter(
    (r) => r.venueName.toLowerCase().includes(activeVenue.name.toLowerCase()) || r.djId === activeDj.id
  );

  // Time filter multipliers / mock slicing for realistic analytics
  const timeFactor = timeFilter === 'day' ? 1 : timeFilter === 'week' ? 4.8 : 18.5;
  const rawTotalSpend = venueRequests.reduce((acc, r) => acc + (r.total || 0), 0);
  const totalGrossSpend = Math.round(rawTotalSpend * timeFactor);

  const venueCut = Math.round(totalGrossSpend * (activeVenue.commissionSplit.venuePercentage / 100));
  const djCut = Math.round(totalGrossSpend * (activeVenue.commissionSplit.djPercentage / 100));
  const platformFee = Math.round(totalGrossSpend * (activeVenue.commissionSplit.platformPercentage / 100));

  const totalRequestsCount = Math.round(venueRequests.length * timeFactor);

  // Handle bank resolution & save
  const handleResolveAndSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    setIsResolving(true);
    setTimeout(() => {
      const bank = banksList.find((b) => b.code === selectedBankCode) || {
        name: 'Verified Commercial Bank',
        code: selectedBankCode,
        slug: 'bank',
      };
      setSavedBank({
        bankName: bank.name,
        bankCode: bank.code,
        accountNumber,
        accountName: accountName.toUpperCase(),
        verified: true,
      });
      setIsResolving(false);
      setIsBankModalOpen(false);
      setBankSaveNotice('Settlement bank account updated successfully.');
      setTimeout(() => setBankSaveNotice(null), 3000);
    }, 600);
  };

  // Handle password change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordNotice('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice('New passwords do not match.');
      return;
    }
    setPasswordNotice('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordNotice(null), 3000);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0c0d10] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] transition-colors duration-200">
      {/* 1. STANDALONE VENUE HEADER (Aligned with DJ Workstation Console Header) */}
      <header className="px-4 sm:px-6 h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#0c0d10]/95 backdrop-blur-xl z-20 transition-colors">
        {/* Left: Brand Identity & Active Venue */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black flex items-center justify-center shadow-xs">
              <Image
                src="/brand-logo-transparent.png"
                alt="QueMyDJ"
                width={28}
                height={28}
                className="object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[14px] tracking-tight text-zinc-950 dark:text-white leading-tight">
                QueMyDJ
              </span>
              <span className="text-[8.5px] font-semibold text-zinc-400 uppercase tracking-wider -mt-0.5">
                Venue Host
              </span>
            </div>
          </Link>

          <span className="hidden sm:block h-3.5 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Venue Selector / Location badge */}
          <div className="flex items-center gap-1.5 min-w-0 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <select
              value={activeVenue.id}
              onChange={(e) => setActiveVenueId(e.target.value)}
              className="bg-transparent border-none text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer truncate max-w-[130px] sm:max-w-[200px]"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {v.name} ({v.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Venue Live Status, Theme Toggle, Profile & Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Revenue Pill */}
          <div className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            <span>₦{venueCut.toLocaleString()}</span>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-zinc-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Profile / Settings Trigger */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title="Venue Settings & Profile"
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Standalone Sign Out Button */}
          <button
            type="button"
            onClick={() => router.push('/login?role=venue')}
            title="Sign Out of Venue Portal"
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. TAB CONTENT */}
      <main className="px-5 pt-3 pb-24 space-y-4">
        {/* TAB 1: REVENUE (Renamed from Live Spend with Day/Week/Month Filter) */}
        {activeTab === 'revenue' && (
          <>
            {/* ATMOSPHERIC EDITORIAL HERO BANNER */}
            <section className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white flex flex-col justify-between p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] min-h-[300px]">
              {/* Full-bleed atmospheric club photography */}
              <div
                className="absolute inset-0 bg-cover bg-center scale-105 pointer-events-none"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop')`,
                }}
              />
              {/* Balanced top & bottom editorial vignette */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/40 to-zinc-950/95 pointer-events-none" />

              {/* Top Bar with Live Tag and Split Pill */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-zinc-950/70 backdrop-blur-md border border-white/15 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{timeFilter === 'day' ? "Tonight's Commission" : `${timeFilter === 'week' ? 'Weekly' : 'Monthly'} Commission`}</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-300 font-semibold bg-zinc-950/70 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-full">
                  {activeVenue.commissionSplit.venuePercentage}% Split
                </span>
              </div>

              {/* Bottom Anchor: Large Host Earnings + 3-way Split Grid */}
              <div className="relative z-10 space-y-3.5 mt-8">
                <div>
                  <div className="text-[11px] text-zinc-300 uppercase tracking-wider font-mono font-medium">
                    {timeFilter === 'day' ? 'Live Venue Earnings' : `Cumulative ${timeFilter.toUpperCase()} Revenue`}
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight tabular-nums mt-0.5">
                    ₦{venueCut.toLocaleString()}
                  </div>
                </div>

                {/* Translucent Frosted Glass Split Breakdown */}
                <div className="pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] text-zinc-400 block font-medium">Gross Room Spend</span>
                    <span className="text-xs font-bold text-white tabular-nums mt-0.5 block">
                      ₦{totalGrossSpend.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] text-zinc-400 block font-medium">DJ Share ({activeVenue.commissionSplit.djPercentage}%)</span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums mt-0.5 block">
                      ₦{djCut.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] text-zinc-400 block font-medium">Platform ({activeVenue.commissionSplit.platformPercentage}%)</span>
                    <span className="text-xs font-bold text-zinc-300 tabular-nums mt-0.5 block">
                      ₦{platformFee.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* TIME RANGE FILTER: Positioned cleanly beneath the banner */}
            <div className="p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-3 gap-1">
              {[
                { id: 'day', label: 'Today (Live)' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTimeFilter(item.id as typeof timeFilter)}
                  className={`h-8 rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center cursor-pointer ${
                    timeFilter === item.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* ACTIVE RESIDENT DJ IN THE BUILDING */}
            <div className="rounded-2xl p-4 bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Active Resident DJ
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  On Deck
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-zinc-900 to-zinc-700 flex items-center justify-center text-white font-bold text-sm ring-1 ring-black/[0.06] dark:ring-white/10 shadow-sm flex-shrink-0">
                    {activeDj.name?.replace(/DJ\s*/i, '').slice(0, 2).toUpperCase() || 'DJ'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {activeDj.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {activeDj.handle} • Booth Code: <strong className="font-mono text-zinc-700 dark:text-zinc-200">{activeDj.liveSession?.passcode || 'SKY99'}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block tabular-nums">
                    ₦{(activeDj.liveSession?.basePrice || 5000).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">base/song</span>
                </div>
              </div>

              <div className="grid grid-cols-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Accepted</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{totalRequestsCount}</span>
                </div>
                <div className="border-x border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Queue</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{venueRequests.filter(r => r.status === 'waiting').length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Fulfillment</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">100%</span>
                </div>
              </div>
            </div>

            {/* LIVE VIP REQUESTS FEED */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Live Table Requests Stream
                </span>
                <span className="text-[11px] text-zinc-400 tabular-nums font-mono">{venueRequests.length} total</span>
              </div>

              {venueRequests.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                  <Headphones className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No requests submitted yet</p>
                  <p className="text-[11px] text-zinc-400">Incoming requests will stream here live as clubgoers place them.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
                  {venueRequests.map((req) => (
                    <div key={req.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                          {req.song?.title || 'Club Anthem'}{' '}
                          <span className="text-xs font-normal text-zinc-400">
                            • {req.song?.artist || activeDj.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                          <span>Guest: <strong className="text-zinc-700 dark:text-zinc-300">{req.guestName || 'VIP Guest'}</strong></span>
                          <span>•</span>
                          <span className={`uppercase font-mono font-semibold text-[10px] ${
                            req.status === 'played' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">
                          ₦{(req.total || req.amount || 5000).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          +₦{Math.round((req.total || req.amount || 5000) * (activeVenue.commissionSplit.venuePercentage / 100)).toLocaleString()} club cut
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: RESIDENT DJS */}
        {activeTab === 'djs' && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Resident DJ Roster</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Review performers scheduled at {activeVenue.name} and their guest satisfaction ratings.
              </p>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              {djs.map((dj) => (
                <div key={dj.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-black/[0.06] dark:ring-white/10 flex-shrink-0">
                      {dj.name?.replace(/DJ\s*/i, '').slice(0, 2).toUpperCase() || 'DJ'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{dj.name}</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{dj.genres.slice(0, 2).join(', ') || 'Afrobeats, Amapiano'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-500 block">★ {dj.rating || '5.0'}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{dj.totalSets || 12} sets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SETTLEMENT & PAYOUT RAILS */}
        {activeTab === 'settlement' && (
          <div className="space-y-4">
            {bankSaveNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{bankSaveNotice}</span>
              </div>
            )}

            {/* BANK ACCOUNT CARD WITH DIRECT EDIT ACTION */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Settlement Bank Account
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Paystack Rail
                </span>
              </div>

              <div className="flex items-start justify-between pt-1 gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {savedBank.bankName}
                  </h4>
                  <p className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                    Account: {savedBank.accountNumber} • {savedBank.accountName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Direct automated settlement every Monday 06:00 AM WAT via Paystack.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Bank</span>
                </button>
              </div>
            </div>

            {/* COMMISSION SPLIT AGREEMENT */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Multi-Party Split Configuration
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Club Venue Cut</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{activeVenue.commissionSplit.venuePercentage}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">Resident DJ Payout</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeVenue.commissionSplit.djPercentage}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">QueMyDJ Platform Maintenance</span>
                  <span className="font-bold text-zinc-500">{activeVenue.commissionSplit.platformPercentage}%</span>
                </div>
              </div>
            </div>

            {/* COMPLIANCE & LEGAL NOTICE */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                All payouts are routed via regulated clearing banks and audited with encrypted HMAC signatures.
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & PROFILE (Standalone Venue Management) */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {passwordNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{passwordNotice}</span>
              </div>
            )}

            {/* VENUE IDENTITY CARD */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white leading-tight">
                    {activeVenue.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {activeVenue.city} • Registered Venue Host Account
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-[11px] text-zinc-400 block font-medium">Operator Portal ID</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{activeVenue.id}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block font-medium">Assigned Subaccount</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">ACCT_VEN_{activeVenue.id.slice(-4).toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* BANK ACCOUNT QUICK EDIT LINK */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Bank Account Information
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {savedBank.bankName} • {savedBank.accountNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  Manage Bank
                </button>
              </div>
            </div>

            {/* PASSWORD UPDATE FORM */}
            <form onSubmit={handleChangePassword} className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Update Account Password
                </h4>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 chars"
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Confirm New
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 text-white dark:text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>

            {/* LEGAL & TERMS AND CONDITIONS */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Terms, Conditions &amp; Policies
                </h4>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Venue Operator Agreement covers standard revenue sharing, dispute arbitrations, non-interference in DJ set selections, and weekly automated settlement terms.
              </p>

              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="w-full py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Read Full Venue Operator Agreement</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            {/* LOG OUT BUTTON */}
            <button
              type="button"
              onClick={() => router.push('/login?role=venue')}
              className="w-full h-11 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Venue Portal</span>
            </button>
          </div>
        )}
      </main>

      {/* 4. MODAL: EDIT BANK ACCOUNT */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Update Payout Bank Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveAndSaveBank} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Select Clearing Bank
                </label>
                <select
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {banksList.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  10-Digit NUBAN Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="0123456789"
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Verified Account Holder / Registered Business Name
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. SKYLINE ROOFTOP ENTERPRISES"
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Account will receive weekly automated Paystack transfers.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving || accountNumber.length < 10}
                  className="flex-1 h-10 rounded-xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isResolving ? 'Verifying...' : 'Save & Confirm Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: FULL TERMS & OPERATOR AGREEMENT */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Venue Operator Terms &amp; Standard Agreement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <p>
                <strong>1. Revenue Split &amp; Platform Clearance:</strong> The Venue agrees to host QueMyDJ as an authorized music request coordination provider. All request fees are split pursuant to the configured agreement (standard 20% Venue / 70% Resident DJ / 10% Platform) and routed via Paystack Dedicated Subaccounts.
              </p>
              <p>
                <strong>2. Unplayed Track Guarantee:</strong> Any guest request declined by the DJ or unplayed before session closure is automatically refunded. The Venue does not accrue earnings on refunded requests.
              </p>
              <p>
                <strong>3. Automated Settlement:</strong> Accrued venue earnings are automatically transferred directly to the verified settlement bank account every Monday at 06:00 AM WAT.
              </p>
              <p>
                <strong>4. Creative Autonomy:</strong> The Resident DJ retains full editorial autonomy to reject off-vibe submissions without penalty.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full h-10 rounded-xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 text-white dark:text-black text-xs font-bold transition-colors cursor-pointer"
            >
              Close &amp; Accept
            </button>
          </div>
        </div>
      )}

      {/* 6. BOTTOM NAVIGATION BAR (Standalone Venue Navigation: Revenue, DJs, Settlement, Profile) */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 dark:bg-[#0c0d10]/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 h-16 px-4 flex items-center justify-around z-30">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'revenue' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span>Revenue</span>
        </button>

        <button
          onClick={() => setActiveTab('djs')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'djs' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Headphones className="w-5 h-5" />
          <span>Resident DJs</span>
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'settlement' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Landmark className="w-5 h-5" />
          <span>Settlement</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'settings' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </footer>
    </div>
  );
}
