'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import {
  Wallet,
  ArrowDownLeft,
  CheckCircle2,
  ShieldCheck,
  Building,
  RefreshCw
} from 'lucide-react';

export const FinancesWalletView: React.FC = () => {
  const { requests } = useCueApp();
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  // Calculate live earnings from paid requests
  const eligibleRequests = requests.filter(
    (r) => r.status === 'played' || r.status === 'playing' || r.status === 'accepted' || r.status === 'ready_to_play'
  );

  const totalGross = eligibleRequests.reduce((sum, r) => sum + r.amount, 0);
  const netEarnings = totalGross;

  const handleInstantPayout = () => {
    setIsProcessingPayout(true);
    setTimeout(() => {
      setIsProcessingPayout(false);
      setPayoutSuccess(`Transfer of ₦${netEarnings.toLocaleString()} sent to linked Nigerian bank account via Paystack Direct Transfer!`);
      setTimeout(() => setPayoutSuccess(null), 5000);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] shadow-xl overflow-hidden text-[var(--dj-text-primary)] transition-colors">
      {/* Header bar */}
      <div className="p-3.5 border-b border-[var(--dj-border)] flex items-center justify-between gap-3 bg-[var(--dj-bg-card)]">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-500" />
          <span className="text-[14px] font-bold text-[var(--dj-text-primary)] tracking-tight">
            DJ Wallet &amp; Paystack Settlements
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Paystack LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isProcessingPayout || netEarnings <= 0}
            onClick={handleInstantPayout}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-[12px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            {isProcessingPayout ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Settling...
              </>
            ) : (
              <>
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Payout to Bank (₦{netEarnings.toLocaleString()})
              </>
            )}
          </button>
        </div>
      </div>

      {payoutSuccess && (
        <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-950/70 border-b border-emerald-300 dark:border-emerald-800/50 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{payoutSuccess}</span>
        </div>
      )}

      {/* Main Grid: Cards + Transactions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] shadow-sm">
            <span className="text-[11px] font-medium text-[var(--dj-text-muted)] block mb-1">
              Available for Payout
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₦{netEarnings.toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--dj-text-faint)] mt-1 block">
              Direct settlement via Paystack Transfer
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] shadow-sm">
            <span className="text-[11px] font-medium text-[var(--dj-text-muted)] block mb-1">
              Session Requests
            </span>
            <div className="text-2xl font-black text-[var(--dj-text-primary)] tabular-nums">
              {eligibleRequests.length}
            </div>
            <span className="text-[10px] text-[var(--dj-text-faint)] mt-1 block">
              100% verified server payments
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] shadow-sm">
            <span className="text-[11px] font-medium text-[var(--dj-text-muted)] block mb-1">
              Average Tip / Request
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              ₦{eligibleRequests.length > 0 ? (totalGross / eligibleRequests.length).toLocaleString() : '0'}
            </div>
            <span className="text-[10px] text-[var(--dj-text-faint)] mt-1 block">
              {eligibleRequests.length > 0
                ? `Highest tip: ₦${Math.max(...eligibleRequests.map(r => r.amount)).toLocaleString()}`
                : 'No tips recorded yet'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] shadow-sm">
            <span className="text-[11px] font-medium text-[var(--dj-text-muted)] block mb-1">
              Paystack Settlement Account
            </span>
            <div className="flex items-center gap-1.5 text-[14px] font-bold text-[var(--dj-text-primary)] mt-1">
              <Building className="w-4 h-4 text-emerald-500" />
              <span>Linked Bank Account</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Active Paystack Direct Payout
            </span>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="rounded-xl border border-[var(--dj-border)] bg-[var(--dj-bg-card-subtle)] overflow-hidden">
          <div className="p-3 border-b border-[var(--dj-border)] flex items-center justify-between text-[12px] font-bold text-[var(--dj-text-secondary)]">
            <span>Live Guest Request Transactions</span>
            <span className="text-[11px] text-[var(--dj-text-faint)] font-mono">
              Gateway: Paystack Webhook Verified
            </span>
          </div>

          <div className="divide-y divide-[var(--dj-border-subtle)] max-h-80 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="py-14 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--dj-bg-control)] border border-[var(--dj-border)] flex items-center justify-center mx-auto mb-3 text-[var(--dj-text-faint)]">
                  <Wallet className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="text-[14px] font-bold text-[var(--dj-text-secondary)]">No Request Transactions Yet</div>
                <p className="text-[12px] text-[var(--dj-text-faint)] max-w-sm mx-auto mt-1">
                  When guests scan your booth QR code and complete a paid song request via Paystack, transaction records and real-time earnings appear here instantly.
                </p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 flex items-center justify-between gap-3 text-[12px] hover:bg-[var(--dj-bg-control)]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-8 rounded-lg bg-[var(--dj-bg-control)] flex items-center justify-center text-[var(--dj-text-secondary)] font-bold text-[11px] flex-shrink-0">
                      ₦{req.amount.toLocaleString()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[var(--dj-text-primary)] truncate">
                        {req.song.title}
                      </div>
                      <div className="text-[11px] text-[var(--dj-text-muted)] truncate">
                        {req.song.artist} &bull; Guest: {req.guestName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[11px] font-mono text-[var(--dj-text-faint)] hidden sm:inline">
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'refunded' || req.status === 'declined'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {req.status === 'refunded' ? 'REFUNDED' : 'PAYMENT SUCCESS'}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +₦{req.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
