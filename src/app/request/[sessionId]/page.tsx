'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCueApp } from '@/context/CueAppContext';
import { Song } from '@/types';
import {
  ChevronLeft,
  Search,
  Music2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Sparkles,
  Info,
  Wallet,
  PlusCircle,
  Zap,
  UserCheck
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

  // Find target DJ by session
  const targetDj =
    djs.find((d) => d.liveSession?.id === resolvedParams.sessionId) || djs[0];
  const session = targetDj.liveSession;

  // Step state: 1 = select song, 2 = review & tip, 3 = checkout simulator
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
        await fetch('/api/paystack/initialize', {
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

        // Also save profile
        registerOrUpdateGuest(finalGuestName, guestPhoneOrEmail.trim() || undefined);
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
        paymentMethod: paymentMethod === 'Club Night Wallet' ? ('Demo Wallet' as any) : ('Paystack' as any),
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-20 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (step > 1) {
              setStep((s) => (s - 1) as 1 | 2);
            } else {
              router.push(`/djs/${targetDj.id}`);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--dj-bg-card,#131b26)] border border-[var(--dj-border-subtle,#233044)] text-xs font-semibold text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{step === 1 ? 'Back to DJ' : 'Previous Step'}</span>
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className={`px-2 py-0.5 rounded-md ${step === 1 ? 'bg-emerald-400 text-black' : 'text-slate-400 bg-[#16202f]'}`}>
            1. Track
          </span>
          <span className="text-slate-600">→</span>
          <span className={`px-2 py-0.5 rounded-md ${step === 2 ? 'bg-emerald-400 text-black' : 'text-slate-400 bg-[#16202f]'}`}>
            2. Details
          </span>
          <span className="text-slate-600">→</span>
          <span className={`px-2 py-0.5 rounded-md ${step === 3 ? 'bg-emerald-400 text-black' : 'text-slate-400 bg-[#16202f]'}`}>
            3. Authorize
          </span>
        </div>
      </div>

      {/* Target DJ Session Summary Card */}
      <div className="bg-[var(--dj-bg-card,#111722)] border border-[var(--dj-border-subtle,#233044)] rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={targetDj.avatarUrl}
            alt={targetDj.name}
            className="w-11 h-11 rounded-full object-cover border border-[#26374f] flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--dj-text-primary,#fff)] truncate">{targetDj.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-[11px] text-[var(--dj-text-muted,#94a3b8)] truncate">
              {targetDj.currentVenue.name} • {session?.title}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-[11px] text-[var(--dj-text-muted,#94a3b8)]">Request Base</div>
          <div className="text-sm font-extrabold text-emerald-400">
            ₦{basePrice.toLocaleString()}
          </div>
        </div>
      </div>

      {/* STEP 1: Song Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-black text-[var(--dj-text-primary,#fff)] tracking-tight">
              Select Track to Request
            </h1>
            <p className="text-xs text-[var(--dj-text-muted,#94a3b8)] mt-0.5">
              Choose from verified club heaters matching {targetDj.name}&apos;s set style.
            </p>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by track title, artist or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--dj-bg-card,#111722)] border border-[var(--dj-border-subtle,#233044)] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Genre chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['All', 'Afrobeats', 'Amapiano', 'Dancehall', 'Hip-Hop'].map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  selectedGenre === genre
                    ? 'bg-emerald-400 text-black'
                    : 'bg-[var(--dj-bg-card,#111722)] text-slate-300 border border-[var(--dj-border-subtle,#233044)] hover:text-white'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Songs list */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {songsList.map((song) => {
              const isSelected = selectedSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => setSelectedSong(song)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-[var(--dj-bg-card,#111722)] border-[var(--dj-border-subtle,#233044)] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">
                        {song.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {song.artist}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono text-emerald-400/90">{song.bpm || 110} BPM</span>
                        <span>•</span>
                        <span>{song.musicalKey || '8A'}</span>
                        <span>•</span>
                        <span className="capitalize">{song.genre}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-400 text-black'
                          : 'border-slate-600 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue button */}
          <button
            disabled={!selectedSong}
            onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.99] transition-all"
          >
            <span>Continue to Review Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Review, Guest Info & Priority Tip */}
      {step === 2 && selectedSong && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-black text-[var(--dj-text-primary,#fff)] tracking-tight">
              Review &amp; Guest Details
            </h1>
            <p className="text-xs text-[var(--dj-text-muted,#94a3b8)] mt-0.5">
              Personalize your shoutout and optionally add a tip for priority queue placement.
            </p>
          </div>

          {/* Selected Track Pill */}
          <div className="bg-[var(--dj-bg-card,#111722)] border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3">
            <img
              src={selectedSong.coverUrl}
              alt={selectedSong.title}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Requested Track</span>
              <div className="text-sm font-black text-white truncate">{selectedSong.title}</div>
              <div className="text-xs text-slate-300 truncate">{selectedSong.artist} • {selectedSong.bpm || 110} BPM</div>
            </div>
          </div>

          {/* Guest Info Form */}
          <div className="bg-[var(--dj-bg-card,#111722)] border border-[var(--dj-border-subtle,#233044)] rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Your Name or VIP Booth Table
              </label>
              <input
                type="text"
                placeholder="e.g. Alex, Table 7, or Birthday Squad"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--dj-bg-chassis-top,#16202f)] border border-[var(--dj-border-subtle,#26354c)] focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Phone Number or Email (For Song Playback Alerts)
              </label>
              <input
                type="text"
                placeholder="08012345678 or guest@gmail.com"
                value={guestPhoneOrEmail}
                onChange={(e) => setGuestPhoneOrEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--dj-bg-chassis-top,#16202f)] border border-[var(--dj-border-subtle,#26354c)] focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Never shared publicly. Used to save your personal song history and wallet receipts.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Shoutout Note to DJ (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={120}
                placeholder="e.g. Playing for Sarah's birthday celebration at Table 4!"
                value={guestNote}
                onChange={(e) => setGuestNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--dj-bg-chassis-top,#16202f)] border border-[var(--dj-border-subtle,#26354c)] focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
              />
              <span className="text-[10px] text-slate-500 block text-right mt-1">
                {120 - guestNote.length} chars left
              </span>
            </div>

            {/* Priority Tip Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Priority Queue Boost Tip</span>
                </label>
                <span className="text-[11px] text-slate-400">Pushes track to top of DJ screen</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0, 1000, 2000, 5000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTipAmount(amount)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      tipAmount === amount
                        ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                        : 'bg-[var(--dj-bg-chassis-top,#16202f)] text-slate-300 border-[var(--dj-border-subtle,#26354c)] hover:border-slate-500'
                    }`}
                  >
                    {amount === 0 ? 'No tip' : `+₦${amount.toLocaleString()}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="bg-[var(--dj-bg-card,#111722)] border border-[var(--dj-border-subtle,#233044)] rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="font-bold text-white">Price Transparency &amp; Guarantee</h3>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>DJ Track Request Fee</span>
                <span className="font-medium text-white">₦{basePrice.toLocaleString()}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Priority Boost Tip</span>
                  <span className="font-semibold">+₦{tipAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Venue Platform &amp; Processing</span>
                <span className="font-medium text-white">₦{serviceFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-[#1e2a3c] pt-2 flex justify-between text-sm font-extrabold text-white">
                <span>Total Amount</span>
                <span className="text-emerald-400">₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Transparent refund guarantee banner */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>100% DJ Satisfaction Guarantee:</strong> If the DJ declines or the session ends before your song is played, you will be automatically refunded.
              </span>
            </div>
          </div>

          {/* Proceed to checkout button */}
          <button
            onClick={() => setStep(3)}
            className="w-full py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.99] transition-all"
          >
            <span>Proceed to Payment Authorization (₦{totalAmount.toLocaleString()})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: Payment, Wallet Deduction & Top-Up Upsell */}
      {step === 3 && selectedSong && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-black text-[var(--dj-text-primary,#fff)] tracking-tight">
              Authorize Payment
            </h1>
            <p className="text-xs text-[var(--dj-text-muted,#94a3b8)] mt-0.5">
              Confirm your request for {targetDj.name}&apos;s live booth.
            </p>
          </div>

          {/* CLUB NIGHT WALLET SMART RECOMMENDATION */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121c29] via-[#0d141e] to-[#080d14] border border-[#233850] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Club Night Wallet
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Avoid repeated card charges all night
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Current Balance</span>
                <span className={`text-sm font-black ${hasWalletBalance ? 'text-emerald-400' : 'text-amber-400'}`}>
                  ₦{currentUser.walletBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {hasWalletBalance ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Sufficient balance for 1-tap instant request!</span>
                </div>
                <span className="font-bold text-white">Remaining: ₦{(currentUser.walletBalance - totalAmount).toLocaleString()}</span>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Club Night Pro-Tip:</strong> Top up once now so you don&apos;t have to keep authorizing payments for every track tonight.
                  </span>
                </div>

                <div className="bg-[#15202e] border border-[#26374f] p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Quick Top Up &amp; Auto-Create Account</span>
                    <span className="text-emerald-400 text-[11px]">Paystack Simulation</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[15000, 30000, 50000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWalletTopUpChoice(amt)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          walletTopUpChoice === amt
                            ? 'bg-emerald-400 text-black border-emerald-400 shadow-md shadow-emerald-400/20'
                            : 'bg-[#1a283b] text-slate-300 border-[#2f425e] hover:border-slate-400'
                        }`}
                      >
                        ₦{(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isToppingUp}
                    onClick={handleExecuteWalletTopUp}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-105 active:scale-[0.99] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {isToppingUp ? (
                      <span>Adding ₦{walletTopUpChoice.toLocaleString()}...</span>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Top Up ₦{walletTopUpChoice.toLocaleString()} &amp; Pay from Wallet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-[var(--dj-bg-card,#111722)] border border-[var(--dj-border-subtle,#233044)] rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-white block">
              Choose Payment Method:
            </span>

            {/* Wallet Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('Club Night Wallet')}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                paymentMethod === 'Club Night Wallet'
                  ? 'bg-emerald-950/50 border-emerald-500 text-white'
                  : 'bg-[var(--dj-bg-chassis-top,#16202f)] border-[var(--dj-border-subtle,#26354c)] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="block font-bold">Club Night Wallet</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Available: ₦{currentUser.walletBalance.toLocaleString()} {hasWalletBalance ? '(Ready)' : '(Top-up required)'}
                  </span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                paymentMethod === 'Club Night Wallet' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
              }`}>
                {paymentMethod === 'Club Night Wallet' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </button>

            {/* Paystack / Instant Cards Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('Paystack')}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                paymentMethod === 'Paystack'
                  ? 'bg-emerald-950/50 border-emerald-500 text-white'
                  : 'bg-[var(--dj-bg-chassis-top,#16202f)] border-[var(--dj-border-subtle,#26354c)] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <span className="block font-bold">Paystack Single Track Payment</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Cards, Bank Transfer, Apple Pay
                  </span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                paymentMethod === 'Paystack' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
              }`}>
                {paymentMethod === 'Paystack' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </button>
          </div>

          {/* Order Summary Confirmation */}
          <div className="bg-[var(--dj-bg-card,#111722)] border border-[var(--dj-border-subtle,#233044)] rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Track:</span>
              <span className="text-white font-bold">{selectedSong.title} — {selectedSong.artist}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Guest / Booth:</span>
              <span className="text-white">{guestName || currentUser.name}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-300">
              <span>DJ &amp; Venue:</span>
              <span className="text-white">{targetDj.name} @ {targetDj.currentVenue.name}</span>
            </div>
            <div className="border-t border-[#1e2a3c] pt-2 flex justify-between font-bold text-sm">
              <span className="text-slate-300">Total Authorization:</span>
              <span className="text-emerald-400 font-black">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Failure Outcome Alert */}
          {checkoutOutcome === 'failure' && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-300">Authorization Failed / Insufficient Funds:</span>
                Please top up your Club Night Wallet or choose another payment method.
              </div>
            </div>
          )}

          {/* Success Outcome Alert */}
          {checkoutOutcome === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-start gap-2.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-300">Payment Authorized!</span>
                Track submitted to {targetDj.name}&apos;s live workstation queue. Redirecting...
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              disabled={isProcessing || (paymentMethod === 'Club Night Wallet' && !hasWalletBalance)}
              onClick={() => handleCompletePayment(false)}
              className="w-full py-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-[0.99] transition-all"
            >
              {isProcessing ? (
                <span>Authorizing Payment...</span>
              ) : (
                <span>
                  {paymentMethod === 'Club Night Wallet' 
                    ? `1-Tap Request (₦${totalAmount.toLocaleString()} from Wallet)` 
                    : `Authorize ₦${totalAmount.toLocaleString()} via ${paymentMethod}`}
                </span>
              )}
            </button>

            <button
              disabled={isProcessing}
              onClick={() => handleCompletePayment(true)}
              className="w-full py-2.5 rounded-xl bg-[var(--dj-bg-card,#16202f)] hover:bg-rose-950/40 border border-[#2a3a52] hover:border-rose-800 text-xs text-slate-400 hover:text-rose-300 transition-colors"
            >
              Simulate Authorization Decline / Bank Network Error
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
