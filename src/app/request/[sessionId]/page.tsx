'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCueApp } from '@/context/CueAppContext';
import { Song } from '@/types';
import {
  ChevronLeft,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Sparkles,
  Wallet,
  Zap,
  Lock,
  Music2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RequestFlowPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { 
    djs, 
    searchSongs, 
    createRequest, 
    currentUser, 
    topUpGuestWallet, 
    payWithWallet, 
    registerOrUpdateGuest 
  } = useCueApp();

  // Find target DJ by session (with safe fallback if djs array is still fetching or empty)
  const targetDj =
    djs.find((d) => d.liveSession?.id === resolvedParams.sessionId) ||
    djs[0] || {
      id: 'dj-fallback',
      name: 'Resident DJ',
      handle: '@dj',
      avatarUrl: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=300&auto=format&fit=crop&q=80',
      genres: ['Afrobeats', 'Amapiano'],
      currentVenue: {
        name: 'Live Club Booth',
        city: 'Lagos',
        distance: 'Live',
        address: '',
        lat: 6.4281,
        lng: 3.4219,
      },
      liveSession: {
        id: resolvedParams.sessionId,
        title: 'Live Booth Session',
        isAcceptingRequests: true,
        basePrice: 5000,
        serviceFee: 500,
      },
    };
  const session = targetDj?.liveSession;

  // Step state: 1 = select track, 2 = guest details & tip, 3 = payment authorization
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Guest details & Tip
  const [guestName, setGuestName] = useState(currentUser.name !== 'VIP Club Guest' ? currentUser.name : '');
  const [guestPhoneOrEmail, setGuestPhoneOrEmail] = useState(currentUser.phoneOrEmail || '');
  const [guestNote, setGuestNote] = useState('');
  const [tipAmount, setTipAmount] = useState<number>(0);
  
  // Payment Method choice
  const [paymentMethod, setPaymentMethod] = useState<'Club Night Wallet' | 'Paystack' | 'Apple Pay' | 'Credit Card'>('Club Night Wallet');

  // Wallet top-up upsell state inside checkout
  const [showWalletTopUp, setShowWalletTopUp] = useState(false);
  const [walletTopUpChoice, setWalletTopUpChoice] = useState<number>(20000);
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Simulation status during checkout
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutOutcome, setCheckoutOutcome] = useState<'success' | 'failure' | null>(null);

  const songsList = searchSongs(searchQuery).filter((s) =>
    selectedGenre === 'All' ? true : s.genre.toLowerCase().includes(selectedGenre.toLowerCase())
  );

  const basePrice = session?.basePrice ?? 5000;
  const serviceFee = session?.serviceFee ?? 500;
  const totalAmount = basePrice + tipAmount + serviceFee;

  // Has sufficient wallet balance?
  const hasWalletBalance = currentUser.walletBalance >= totalAmount;

  const handleExecuteWalletTopUp = () => {
    setIsToppingUp(true);
    setTimeout(() => {
      topUpGuestWallet(walletTopUpChoice, 'Quick Checkout Top-Up');
      if (guestName.trim()) {
        registerOrUpdateGuest(guestName.trim(), guestPhoneOrEmail.trim() || undefined);
      }
      setIsToppingUp(false);
      setShowWalletTopUp(false);
      setPaymentMethod('Club Night Wallet');
    }, 500);
  };

  const handleCompletePayment = async (simulateFailure = false) => {
    if (!selectedSong) return;

    setIsProcessing(true);
    setCheckoutOutcome(null);

    if (simulateFailure) {
      setTimeout(() => {
        setIsProcessing(false);
        setCheckoutOutcome('failure');
      }, 700);
      return;
    }

    try {
      const finalGuestName = guestName.trim() || currentUser.name || 'VIP Guest';

      let paymentRef: string | undefined;
      let paymentVerified = false;

      // If user paid with Club Wallet, deduct from wallet and auto-save guest profile
      if (paymentMethod === 'Club Night Wallet') {
        const success = payWithWallet(
          totalAmount, 
          `Song Request: ${selectedSong.title} to ${targetDj.name}`
        );

        if (!success) {
          setIsProcessing(false);
          setCheckoutOutcome('failure');
          return;
        }

        // Auto-register/update guest account on payment so they can track song history
        registerOrUpdateGuest(finalGuestName, guestPhoneOrEmail.trim() || undefined);
      } else {
        // Direct Paystack / Card payment
        const initRes = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: guestPhoneOrEmail.trim() || `${finalGuestName.replace(/\s+/g, '').toLowerCase() || 'guest'}@cuemydj.com`,
            amount: totalAmount,
            sessionId: session?.id || 'session-skyline-friday',
            djId: targetDj.id,
            song: selectedSong,
            guestName: finalGuestName,
            guestNote: guestNote.trim() || undefined,
            currency: 'NGN',
          }),
        });

        const initData = (await initRes.json().catch(() => null)) as {
          status?: string;
          simulated?: boolean;
          reference?: string;
          authorization_url?: string;
        } | null;

        if (!initRes.ok || !initData?.reference) {
          setIsProcessing(false);
          setCheckoutOutcome('failure');
          return;
        }

        paymentRef = initData.reference;

        // Auto register/update guest profile
        registerOrUpdateGuest(finalGuestName, guestPhoneOrEmail.trim() || undefined);

        // If Paystack returns a direct hosted payment URL in live/test mode, redirect user to checkout
        if (initData.authorization_url && !initData.simulated) {
          window.location.href = initData.authorization_url;
          return;
        }

        // For simulated / fallback flow, verify immediately
        const verifyRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(paymentRef)}&simulated=true`);
        const verifyData = await verifyRes.json();
        paymentVerified = verifyData?.verified === true;
      }

      setIsProcessing(false);

      // Create reactive request for the DJ Workstation in real-time
      const created = createRequest({
        sessionId: session?.id || 'session-skyline-friday',
        djId: targetDj.id,
        song: selectedSong,
        guestName: finalGuestName,
        guestNote: guestNote.trim() || undefined,
        amount: basePrice,
        tip: tipAmount,
        paymentMethod: paymentMethod === 'Club Night Wallet' ? 'Demo Wallet' : 'Paystack',
        paymentReference: paymentRef,
        paymentVerifiedServerSide: paymentVerified,
      });

      // Fire celebratory confetti
      try {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#ffffff'],
        });
      } catch {}

      setCheckoutOutcome('success');

      setTimeout(() => {
        router.push(`/requests/${created.id}`);
      }, 1200);
    } catch (err) {
      console.error('Checkout error:', err);
      setIsProcessing(false);
      setCheckoutOutcome('failure');
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 pt-4 pb-24 space-y-4 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] transition-colors duration-200">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (step > 1) {
              setStep((s) => (s - 1) as 1 | 2);
            } else {
              router.push(`/djs/${targetDj.id}`);
            }
          }}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors py-1.5 -ml-1 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{step === 1 ? 'Back' : 'Back'}</span>
        </button>

        {/* Native iOS Segmented Step Indicator */}
        <div
          role="tablist"
          aria-label="Request steps"
          className="grid grid-flow-col auto-cols-fr p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800/80 rounded-xl text-xs gap-0.5"
        >
          {[
            { id: 1, label: '1. Track' },
            { id: 2, label: '2. Details' },
            { id: 3, label: '3. Pay' },
          ].map((tab) => {
            const isCurrent = step === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 1 || (tab.id === 2 && selectedSong)) {
                    setStep(tab.id as 1 | 2 | 3);
                  }
                }}
                className={`h-7 px-2 rounded-[8px] text-[11px] sm:text-[12px] font-medium transition-all flex items-center justify-center whitespace-nowrap ${
                  isCurrent
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target DJ Session Summary Card — Pure Premium Minimalist Card */}
      <div className="rounded-2xl p-4 bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-zinc-800 dark:to-zinc-600 flex items-center justify-center text-white font-bold text-sm ring-1 ring-black/[0.06] dark:ring-white/10 flex-shrink-0 shadow-sm">
            {targetDj.name?.replace(/DJ\s*/i, '').slice(0, 2).toUpperCase() || 'DJ'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate">{targetDj.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
            </div>
            <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {targetDj.currentVenue?.name || 'Live Club Booth'} • {session?.title || 'Live Set'}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Request Base</div>
          <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            ₦{basePrice.toLocaleString()}
          </div>
        </div>
      </div>

      {/* STEP 1: Song Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[20px] font-bold text-zinc-950 dark:text-white tracking-tight leading-tight">
              Select Track to Request
            </h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Choose from verified club heaters matching {targetDj.name}&apos;s set style.
            </p>
          </div>

          {/* Clean Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by track title, artist or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl text-[13px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Genre Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['All', 'Afrobeats', 'Amapiano', 'Dancehall', 'Hip-Hop'].map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === genre
                    ? 'bg-zinc-950 dark:bg-emerald-500 text-white dark:text-black font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Songs List */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {songsList.map((song) => {
              const isSelected = selectedSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => setSelectedSong(song)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/40 ring-1 ring-emerald-500/15 shadow-[0_2px_8px_rgba(16,185,129,0.06)]'
                      : 'bg-white dark:bg-zinc-900/60 border border-black/[0.06] dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/[0.06] dark:ring-white/10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[14px] text-zinc-900 dark:text-white truncate">
                        {song.title}
                      </div>
                      <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {song.artist}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{song.bpm || 110} BPM</span>
                        <span>•</span>
                        <span>{song.musicalKey || '8A'}</span>
                        <span>•</span>
                        <span className="capitalize">{song.genre}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white dark:text-black'
                          : 'border-zinc-300 dark:border-zinc-700 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue Button */}
          <button
            disabled={!selectedSong}
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-black font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Continue to Review Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Review, Guest Info & Priority Tip */}
      {step === 2 && selectedSong && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[20px] font-bold text-zinc-950 dark:text-white tracking-tight leading-tight">
              Review &amp; Guest Details
            </h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Personalize your shoutout and optionally add a tip for priority queue placement.
            </p>
          </div>

          {/* Selected Track Pill */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <img
              src={selectedSong.coverUrl}
              alt={selectedSong.title}
              className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] dark:ring-white/10 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Requested Track</span>
              <div className="text-[15px] font-bold text-zinc-900 dark:text-white truncate">{selectedSong.title}</div>
              <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{selectedSong.artist} • {selectedSong.bpm || 110} BPM</div>
            </div>
          </div>

          {/* Guest Info Form */}
          <div className="rounded-2xl p-5 bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-zinc-900 dark:text-zinc-200 mb-1.5">
                Your Name or VIP Booth Table
              </label>
              <input
                type="text"
                placeholder="e.g. Alex, Table 7, or Birthday Squad"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl text-[13px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-zinc-900 dark:text-zinc-200 mb-1.5">
                Your Email Address (For Song Status &amp; Dashboard Access)
              </label>
              <input
                type="email"
                required
                placeholder="guest@gmail.com"
                value={guestPhoneOrEmail}
                onChange={(e) => setGuestPhoneOrEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl text-[13px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline flex-shrink-0" />
                We will email you a secure link to create a password and access your dashboard.
              </span>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-zinc-900 dark:text-zinc-200 mb-1.5">
                Shoutout Note to DJ (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={120}
                placeholder="e.g. Playing for Sarah's birthday celebration at Table 4!"
                value={guestNote}
                onChange={(e) => setGuestNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl text-[13px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
              />
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block text-right mt-1">
                {120 - guestNote.length} chars left
              </span>
            </div>

            {/* Priority Tip Selector */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <label className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5 flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Priority Queue Boost Tip</span>
                </label>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 text-right">Pushes track to top of DJ screen</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0, 1000, 2000, 5000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTipAmount(amount)}
                    className={`h-9 rounded-xl text-[12px] font-semibold transition-all border ${
                      tipAmount === amount
                        ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-transparent dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {amount === 0 ? 'No tip' : `+₦${amount.toLocaleString()}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="rounded-2xl p-5 bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3 text-[13px]">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Price Transparency &amp; Guarantee</h3>

            <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>DJ Track Request Fee</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200 tabular-nums">₦{basePrice.toLocaleString()}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Priority Boost Tip</span>
                  <span className="font-semibold tabular-nums">+₦{tipAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Venue Platform &amp; Processing</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200 tabular-nums">₦{serviceFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2.5 flex justify-between text-[15px] font-bold text-zinc-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Transparent Refund Guarantee Banner */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>100% DJ Satisfaction Guarantee:</strong> If the DJ declines or the session ends before your song is played, you will be automatically refunded.
              </span>
            </div>
          </div>

          {/* Proceed to Checkout Button */}
          <button
            onClick={() => setStep(3)}
            className="w-full h-12 rounded-xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 text-white dark:text-black font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Proceed to Payment Authorization (₦{totalAmount.toLocaleString()})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: Payment, Wallet Deduction & Top-Up Upsell */}
      {step === 3 && selectedSong && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[20px] font-bold text-zinc-950 dark:text-white tracking-tight leading-tight">
              Authorize Payment
            </h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Confirm your request for {targetDj.name}&apos;s live booth.
            </p>
          </div>

          {/* Club Night Wallet Recommendation */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[14px] font-semibold text-zinc-900 dark:text-white block">
                    Club Night Wallet
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Avoid repeated card charges all night
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">Current Balance</span>
                <span className={`text-[15px] font-bold tabular-nums ${hasWalletBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                  ₦{currentUser.walletBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {hasWalletBalance ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span>Sufficient balance for 1-tap instant request!</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-200">
                  -₦{totalAmount.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[12px] space-y-2">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                  <span>Balance insufficient for ₦{totalAmount.toLocaleString()} request</span>
                  <span className="font-bold">Needs ₦{(totalAmount - currentUser.walletBalance).toLocaleString()} more</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWalletTopUp(true);
                      setWalletTopUpChoice(20000);
                    }}
                    className="flex-1 py-2 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-black font-semibold text-[12px] hover:opacity-90 transition-opacity"
                  >
                    Top-Up ₦20,000 &amp; Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Paystack')}
                    className="flex-1 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[12px] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Pay with Card Instead
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="rounded-2xl p-5 bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
            <h3 className="font-semibold text-[13px] text-zinc-900 dark:text-white">Select Payment Method</h3>

            <div className="space-y-2">
              {[
                { id: 'Club Night Wallet', name: 'Club Night Wallet', desc: 'Instant deduction, zero card delay', icon: Wallet, disabled: !hasWalletBalance },
                { id: 'Paystack', name: 'Paystack / Nigerian Cards', desc: 'Cards, Bank Transfer, USSD (Real & Test)', icon: CreditCard },
                { id: 'Apple Pay', name: 'Apple Pay / Google Pay', desc: 'Instant biometric token payment', icon: Zap },
                { id: 'Credit Card', name: 'International Credit Card', desc: 'Visa, Mastercard, Amex via Stripe rail', icon: CreditCard },
              ].map((method) => {
                const isSelected = paymentMethod === method.id;
                const Icon = method.icon;

                return (
                  <div
                    key={method.id}
                    onClick={() => {
                      if (!method.disabled) setPaymentMethod(method.id as typeof paymentMethod);
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      method.disabled
                        ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800'
                        : isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/15'
                        : 'bg-white dark:bg-zinc-900/60 border-black/[0.06] dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[13px] text-zinc-900 dark:text-white flex items-center gap-2">
                          <span>{method.name}</span>
                          {method.id === 'Paystack' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                              Direct Rail
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{method.desc}</div>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-emerald-500 bg-emerald-500 text-white dark:text-black' : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Wallet Top-Up Sheet if toggled */}
          {showWalletTopUp && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">Choose Top-Up Tier</span>
                <button
                  type="button"
                  onClick={() => setShowWalletTopUp(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[10000, 20000, 50000].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setWalletTopUpChoice(tier)}
                    className={`py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                      walletTopUpChoice === tier
                        ? 'bg-zinc-950 dark:bg-white text-white dark:text-black border-transparent shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    ₦{tier.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={isToppingUp}
                onClick={handleExecuteWalletTopUp}
                className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isToppingUp ? 'Crediting Wallet...' : `Confirm & Top Up ₦${walletTopUpChoice.toLocaleString()}`}
              </button>
            </div>
          )}

          {/* Checkout Outcomes & Execution Button */}
          {checkoutOutcome === 'failure' && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[12px] text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>Payment authorization failed or was declined. Please try another card or wallet.</span>
            </div>
          )}

          {checkoutOutcome === 'success' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>Payment authorized! Redirecting to live request queue...</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              disabled={isProcessing || checkoutOutcome === 'success'}
              onClick={() => handleCompletePayment(false)}
              className="w-full h-12 rounded-xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-black font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                  <span>Processing Authorization...</span>
                </span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ₦{totalAmount.toLocaleString()} via {paymentMethod}</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-500">
              Encrypted 256-bit bank-grade authorization • Instant refund if declined
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
