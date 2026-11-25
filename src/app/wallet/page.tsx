'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import {
  Wallet,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  ChevronLeft,
  ArrowRight,
  Lock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentUser,
    walletTransactions,
    topUpGuestWallet,
  } = useCueApp();

  const [topUpAmount, setTopUpAmount] = useState<number>(20000);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [verifiedRefs, setVerifiedRefs] = useState<Set<string>>(new Set());

  // Handle return callback from Paystack (e.g. ?reference=WAL-... or ?trxref=WAL-...)
  const handleVerifyCallback = useCallback(
    async (ref: string) => {
      if (verifiedRefs.has(ref)) return;
      setIsToppingUp(true);
      setStatusNotice('Verifying your Paystack payment...');
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(ref)}`);
        const data = await res.json().catch(() => null);

        if (res.ok && data?.verified) {
          const creditedAmount = typeof data.amount === 'number' ? data.amount : topUpAmount;
          topUpGuestWallet(creditedAmount, `Paystack Top-Up (${ref})`);
          setVerifiedRefs((prev) => new Set([...prev, ref]));
          setTopUpSuccess(true);
          setStatusNotice(`Successfully credited ₦${creditedAmount.toLocaleString()} to your wallet!`);

          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#34d399', '#06b6d4', '#f59e0b', '#ffffff'],
            });
          } catch {}

          // Clean query params from URL without refreshing
          router.replace('/wallet');
        } else {
          setErrorMessage(data?.message || 'Payment verification could not be completed.');
        }
      } catch (err) {
        console.error('Wallet callback verification error:', err);
        setErrorMessage('Network error verifying transaction with Paystack.');
      } finally {
        setIsToppingUp(false);
      }
    },
    [router, topUpGuestWallet, topUpAmount, verifiedRefs]
  );

  useEffect(() => {
    const ref = searchParams?.get('reference') || searchParams?.get('trxref');
    if (ref && !verifiedRefs.has(ref)) {
      handleVerifyCallback(ref);
    }
  }, [searchParams, handleVerifyCallback, verifiedRefs]);

  // If user is not registered, encourage account creation
  if (!currentUser?.isRegistered) {
    return (
      <div className="flex flex-col flex-1 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] px-5 py-8 justify-between">
        <div className="space-y-6 max-w-sm mx-auto w-full my-auto text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <Lock className="w-7 h-7 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Activate Club Wallet
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Create an account or sign in to top up your club wallet, eliminate repetitive card fees, and request tracks all night.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link
              href="/login"
              className="w-full h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Sign In / Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full h-11 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Live Paystack Checkout Top-Up
  const handleTopUp = async (amountToCharge: number) => {
    if (isToppingUp || amountToCharge <= 0) return;
    setIsToppingUp(true);
    setTopUpSuccess(false);
    setErrorMessage(null);
    setStatusNotice('Initializing Paystack secure checkout...');

    try {
      const customerEmail =
        currentUser.phoneOrEmail && currentUser.phoneOrEmail.includes('@')
          ? currentUser.phoneOrEmail.trim()
          : `${currentUser.name.replace(/\s+/g, '').toLowerCase() || 'guest'}@cuemydj.com`;

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          amount: amountToCharge,
          type: 'wallet_topup',
          guestName: currentUser.name || 'Guest User',
          currency: 'NGN',
          callbackUrl: `${window.location.origin}/wallet`,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.reference) {
        setErrorMessage(data?.error || data?.message || 'Failed to initialize Paystack checkout.');
        setIsToppingUp(false);
        setStatusNotice(null);
        return;
      }

      // If live or test Paystack gateway returned authorization_url, redirect user to checkout
      if (data.simulated === false && data.authorization_url && data.authorization_url.startsWith('http')) {
        setStatusNotice('Redirecting to Paystack secure checkout...');
        window.location.href = data.authorization_url;
        return;
      }

      // If in test/simulation mode fallback, verify automatically
      setStatusNotice('Verifying payment reference...');
      const verifyRes = await fetch(
        `/api/paystack/verify?reference=${encodeURIComponent(data.reference)}&simulated=true`
      );
      const verifyData = await verifyRes.json().catch(() => null);

      if (verifyRes.ok && verifyData?.verified) {
        topUpGuestWallet(amountToCharge, `Paystack Top-Up (${data.reference})`);
        setTopUpSuccess(true);
        setStatusNotice(`₦${amountToCharge.toLocaleString()} added to your wallet!`);

        try {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#f59e0b', '#ffffff'],
          });
        } catch {}

        setTimeout(() => {
          setTopUpSuccess(false);
          setStatusNotice(null);
        }, 5000);
      } else {
        setErrorMessage(verifyData?.message || 'Verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Wallet top-up error:', err);
      setErrorMessage('A network error occurred while contacting Paystack.');
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] pb-24 transition-colors">
      {/* Sticky Header */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#090a0d]/90 backdrop-blur-xl z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </header>

      <main className="px-5 pt-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Night Wallet Card */}
        <section className="rounded-3xl p-6 bg-gradient-to-br from-[#121c29] via-[#0d141e] to-[#080d14] text-white border border-[#233850] shadow-2xl relative overflow-hidden">
          {/* DJ Clubbing Ambient Background Pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
            {/* Subtle club stage spotlight glows */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute top-1/2 -left-12 w-44 h-44 rounded-full bg-teal-500/10 blur-2xl" />

            {/* Turntable Vinyl Record Grooves (Top-Right) */}
            <svg
              className="absolute -top-14 -right-14 w-64 h-64 text-emerald-400/10"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6 3" />
              <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="64" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 2" />
              <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="0.6" strokeDasharray="8 3" />
              <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" className="fill-emerald-400/[0.04]" />
              <circle cx="100" cy="100" r="12" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
              <circle cx="100" cy="100" r="4" fill="currentColor" />
            </svg>

            {/* Club Soundwave / Audio Equalizer Frequencies */}
            <svg
              className="absolute bottom-1 left-0 right-0 w-full h-16 text-emerald-400/[0.06]"
              viewBox="0 0 320 60"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <rect x="10" y="42" width="3" height="18" rx="1.5" />
              <rect x="18" y="34" width="3" height="26" rx="1.5" />
              <rect x="26" y="24" width="3" height="36" rx="1.5" />
              <rect x="34" y="38" width="3" height="22" rx="1.5" />
              <rect x="42" y="18" width="3" height="42" rx="1.5" />
              <rect x="50" y="28" width="3" height="32" rx="1.5" />
              <rect x="58" y="12" width="3" height="48" rx="1.5" />
              <rect x="66" y="22" width="3" height="38" rx="1.5" />
              <rect x="74" y="32" width="3" height="28" rx="1.5" />
              <rect x="82" y="16" width="3" height="44" rx="1.5" />
              <rect x="90" y="8" width="3" height="52" rx="1.5" />
              <rect x="98" y="26" width="3" height="34" rx="1.5" />
              <rect x="106" y="36" width="3" height="24" rx="1.5" />
              <rect x="114" y="14" width="3" height="46" rx="1.5" />
              <rect x="122" y="20" width="3" height="40" rx="1.5" />
              <rect x="130" y="30" width="3" height="30" rx="1.5" />
              <rect x="138" y="10" width="3" height="50" rx="1.5" />
              <rect x="146" y="24" width="3" height="36" rx="1.5" />
              <rect x="154" y="38" width="3" height="22" rx="1.5" />
              <rect x="162" y="16" width="3" height="44" rx="1.5" />
              <rect x="170" y="6" width="3" height="54" rx="1.5" />
              <rect x="178" y="22" width="3" height="38" rx="1.5" />
              <rect x="186" y="32" width="3" height="28" rx="1.5" />
              <rect x="194" y="14" width="3" height="46" rx="1.5" />
              <rect x="202" y="28" width="3" height="32" rx="1.5" />
              <rect x="210" y="10" width="3" height="50" rx="1.5" />
              <rect x="218" y="20" width="3" height="40" rx="1.5" />
              <rect x="226" y="34" width="3" height="26" rx="1.5" />
              <rect x="234" y="18" width="3" height="42" rx="1.5" />
              <rect x="242" y="8" width="3" height="52" rx="1.5" />
              <rect x="250" y="24" width="3" height="36" rx="1.5" />
              <rect x="258" y="36" width="3" height="24" rx="1.5" />
              <rect x="266" y="16" width="3" height="44" rx="1.5" />
              <rect x="274" y="26" width="3" height="34" rx="1.5" />
              <rect x="282" y="12" width="3" height="48" rx="1.5" />
              <rect x="290" y="30" width="3" height="30" rx="1.5" />
              <rect x="298" y="20" width="3" height="40" rx="1.5" />
              <rect x="306" y="38" width="3" height="22" rx="1.5" />
            </svg>

            {/* Subtle DJ laser grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.035]" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Available Balance
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                READY
              </span>
            </div>

            <div>
              <div className="text-4xl font-black text-white tracking-tight">
                ₦{currentUser.walletBalance.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Top up once to request songs from the DJ all night with 1-tap, avoiding dancefloor transfer delays.
              </p>
            </div>

            {/* Quick Top-up selection */}
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 block">
                Top-Up via Paystack
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[15000, 30000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      topUpAmount === amt
                        ? 'bg-emerald-400 text-black border-emerald-400 shadow-md shadow-emerald-400/20'
                        : 'bg-[#1a283b] text-slate-300 border-[#2f425e] hover:border-slate-400'
                    }`}
                  >
                    ₦{(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              <button
                disabled={isToppingUp}
                onClick={() => handleTopUp(topUpAmount)}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-105 active:scale-[0.99] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isToppingUp ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Connecting Paystack...</span>
                  </span>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Top Up ₦{topUpAmount.toLocaleString()} to Wallet</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback & Error banners */}
            {statusNotice && !errorMessage && !topUpSuccess && (
              <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-800 text-xs text-blue-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                <span>{statusNotice}</span>
              </div>
            )}

            {topUpSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{statusNotice || 'Wallet successfully topped up!'}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </section>

        {/* Unused Credit Protection */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>100% Unspent Balance Guarantee:</strong> Any unused wallet balance stays in your account for subsequent club nights or can be refunded to your card upon request (wallet withdrawals attract a withdrawal charge).
          </span>
        </div>

        {/* Transactions Ledger */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                Transaction Statement
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              {walletTransactions.length} transaction{walletTransactions.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
            {walletTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No wallet transactions recorded yet.
              </div>
            ) : (
              walletTransactions.map((tx) => (
                <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'topup' || tx.type === 'refund'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'topup' || tx.type === 'refund' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                        {tx.description}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-bold tabular-nums flex-shrink-0 ${
                      tx.type === 'topup' || tx.type === 'refund'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {tx.type === 'topup' || tx.type === 'refund' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-[#090a0d] text-zinc-400 text-xs">
          Loading Wallet...
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}
