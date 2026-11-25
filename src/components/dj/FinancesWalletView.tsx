'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { getSupabaseClient } from '@/services/supabaseClient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  RefreshCw,
  RotateCcw,
  Wallet,
  X,
  AlertCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';

interface BankOption {
  name: string;
  code: string;
  slug: string;
}

interface SavedBankAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  recipientCode: string;
  verified: boolean;
  updatedAt: string;
}

const STORAGE_KEY_BANK = 'cuemydj_dj_payout_bank_v1';

export const FinancesWalletView: React.FC = () => {
  const { requests, currentDj } = useCueApp();

  // Saved payout bank state
  const [savedBank, setSavedBank] = useState<SavedBankAccount | null>(null);
  const [paystackMode, setPaystackMode] = useState<'live' | 'test' | 'simulation'>('simulation');
  const [banks, setBanks] = useState<BankOption[]>([]);

  // Modal state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [requiresManualName, setRequiresManualName] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Payout transfer state
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load saved bank from Supabase user metadata (with localStorage fallback) & fetch bank list
  useEffect(() => {
    let cancelled = false;

    const loadSavedBank = async () => {
      try {
        const localRaw = localStorage.getItem(STORAGE_KEY_BANK);
        if (localRaw && !cancelled) {
          setSavedBank(JSON.parse(localRaw));
        }
      } catch {}

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          const remoteBank = data?.user?.user_metadata?.payout_bank as
            | SavedBankAccount
            | undefined;
          if (remoteBank && remoteBank.accountNumber && !cancelled) {
            setSavedBank(remoteBank);
            try {
              localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(remoteBank));
            } catch {}
          }
        } catch {}
      }
    };

    const loadBanks = async () => {
      try {
        const res = await fetch('/api/paystack/banks');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setBanks(data.banks || []);
            if (data.mode) setPaystackMode(data.mode);
          }
        }
      } catch {}
    };

    loadSavedBank();
    loadBanks();

    return () => {
      cancelled = true;
    };
  }, []);

  // Open modal pre-filled if editing
  const openBankModal = () => {
    setModalError(null);
    setBankSearchQuery('');
    setIsBankDropdownOpen(false);
    if (savedBank) {
      setSelectedBankCode(savedBank.bankCode);
      setAccountNumber(savedBank.accountNumber);
      setAccountName(savedBank.accountName);
      setIsAccountVerified(savedBank.verified);
      setRequiresManualName(!savedBank.verified);
    } else {
      setSelectedBankCode('');
      setAccountNumber('');
      setAccountName('');
      setIsAccountVerified(false);
      setRequiresManualName(false);
    }
    setIsBankModalOpen(true);
  };

  // Auto-resolve account name via Paystack when 10-digit NUBAN + Bank Code are entered
  const resolveBankAccount = useCallback(async (acctNum: string, bankCode: string) => {
    if (acctNum.length !== 10 || !bankCode) return;

    setIsResolving(true);
    setModalError(null);
    setIsAccountVerified(false);

    try {
      const res = await fetch('/api/paystack/resolve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: acctNum, bankCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAccountName('');
        setRequiresManualName(false);
        setModalError(data.error || 'Could not verify account number.');
        return;
      }

      if (data.verified && data.accountName) {
        setAccountName(data.accountName);
        setIsAccountVerified(true);
        setRequiresManualName(false);
      } else if (data.requiresManualName) {
        setRequiresManualName(true);
        setIsAccountVerified(false);
      }
    } catch {
      setModalError('Network error while verifying account.');
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handleAccountNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(digits);
    setIsAccountVerified(false);
    setModalError(null);
    if (digits.length === 10 && selectedBankCode) {
      resolveBankAccount(digits, selectedBankCode);
    }
  };

  const handleBankCodeChange = (code: string) => {
    setSelectedBankCode(code);
    setIsAccountVerified(false);
    setModalError(null);
    if (accountNumber.length === 10 && code) {
      resolveBankAccount(accountNumber, code);
    }
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const selectedBank = banks.find((b) => b.code === selectedBankCode);
    if (!selectedBank) {
      setModalError('Please select your bank.');
      return;
    }
    if (accountNumber.length !== 10) {
      setModalError('Account number must be 10 digits.');
      return;
    }
    if (!accountName.trim()) {
      setModalError('Account name is required.');
      return;
    }

    setIsSavingBank(true);
    try {
      // 1. Register Paystack Transfer Recipient
      const res = await fetch('/api/paystack/recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode: selectedBank.code,
          bankName: selectedBank.name,
          accountNumber,
          accountName: accountName.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || 'Could not register payout account.');
        setIsSavingBank(false);
        return;
      }

      const bankRecord: SavedBankAccount = {
        bankName: data.bankName || selectedBank.name,
        bankCode: data.bankCode || selectedBank.code,
        accountNumber: data.accountNumber || accountNumber,
        accountName: data.accountName || accountName.trim(),
        recipientCode: data.recipientCode,
        verified: Boolean(data.verified),
        updatedAt: new Date().toISOString(),
      };

      // 2. Persist to Supabase and update DJ record with Paystack recipient & subaccount
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth
          .updateUser({
            data: { payout_bank: bankRecord },
          })
          .catch(() => {});
      }

      // Also update the active DJ record in backend database
      fetch('/api/djs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDj.id,
          paystackRecipientCode: data.recipientCode,
          paystackSubaccountCode: data.subaccountCode,
          bankDetails: bankRecord,
        }),
      }).catch(() => {});

      // 3. Persist locally for instant hydration
      setSavedBank(bankRecord);
      try {
        localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(bankRecord));
      } catch {}

      setIsBankModalOpen(false);
      setPayoutNotice({
        type: 'success',
        message: `Payout account saved: ${bankRecord.bankName} (•••• ${bankRecord.accountNumber.slice(-4)})`,
      });
      setTimeout(() => setPayoutNotice(null), 5000);
    } catch {
      setModalError('Failed to save bank account. Please try again.');
    } finally {
      setIsSavingBank(false);
    }
  };

  const filteredBanks = banks.filter((b) => {
    if (!bankSearchQuery.trim()) return true;
    const q = bankSearchQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.code.includes(q);
  });

  const selectedBankObj = banks.find((b) => b.code === selectedBankCode);

  // Calculate live earnings from paid requests
  const eligibleRequests = requests.filter(
    (r) =>
      r.status === 'played' ||
      r.status === 'playing' ||
      r.status === 'accepted' ||
      r.status === 'ready_to_play'
  );

  const totalGross = eligibleRequests.reduce((sum, r) => sum + r.amount, 0);
  const netEarnings = totalGross;
  const averageTip =
    eligibleRequests.length > 0 ? Math.round(totalGross / eligibleRequests.length) : 0;
  const highestTip =
    eligibleRequests.length > 0
      ? Math.max(...eligibleRequests.map((r) => r.amount))
      : 0;

  const handleInstantPayout = async () => {
    if (!savedBank) {
      openBankModal();
      return;
    }

    setIsProcessingPayout(true);
    setPayoutNotice(null);

    try {
      const res = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: netEarnings,
          recipientCode: savedBank.recipientCode,
          reason: `QueMyDJ Payout — ${currentDj.name}`,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPayoutNotice({
          type: 'error',
          message: data.error || 'Transfer could not be completed.',
        });
      } else {
        setPayoutNotice({
          type: 'success',
          message:
            data.message ||
            `Transfer of ₦${netEarnings.toLocaleString()} initiated to ${savedBank.bankName}.`,
        });
      }
    } catch {
      setPayoutNotice({
        type: 'error',
        message: 'Network error while initiating transfer.',
      });
    } finally {
      setIsProcessingPayout(false);
      setTimeout(() => setPayoutNotice(null), 7000);
    }
  };

  return (
    <div className="space-y-4 text-[var(--dj-text-primary)]">
      {/* 1. UNIFIED BALANCE & PAYOUT CARD */}
      <div className="bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] overflow-hidden transition-colors">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--dj-text-muted)]">
              <span>Available balance</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {paystackMode === 'live'
                  ? 'Paystack Live'
                  : paystackMode === 'test'
                  ? 'Paystack Test'
                  : 'Test Mode'}
              </span>
            </div>

            <div className="text-[32px] sm:text-[36px] font-semibold tracking-[-0.03em] tabular-nums text-[var(--dj-text-primary)] leading-tight mt-1">
              ₦{netEarnings.toLocaleString()}
            </div>

            {/* Saved Bank Account Row */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[12.5px] text-[var(--dj-text-muted)] mt-2.5">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              {savedBank ? (
                <>
                  <span className="text-[var(--dj-text-secondary)] font-medium truncate">
                    {savedBank.bankName} · •••• {savedBank.accountNumber.slice(-4)}
                  </span>
                  <span className="text-[var(--dj-text-faint)] hidden sm:inline">·</span>
                  <span className="truncate hidden sm:inline">{savedBank.accountName}</span>
                  <button
                    type="button"
                    onClick={openBankModal}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--dj-text-primary)] underline underline-offset-4 hover:opacity-75 transition-opacity ml-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </>
              ) : (
                <>
                  <span>No bank account linked</span>
                  <button
                    type="button"
                    onClick={openBankModal}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--dj-text-primary)] underline underline-offset-4 hover:opacity-75 transition-opacity ml-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add bank account</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessingPayout || (Boolean(savedBank) && netEarnings <= 0)}
            onClick={handleInstantPayout}
            className="h-10 px-4 rounded-xl bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)] hover:opacity-90 disabled:opacity-40 font-medium text-[13px] whitespace-nowrap flex items-center justify-center gap-2 transition-opacity cursor-pointer shrink-0"
          >
            {isProcessingPayout ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Transferring...</span>
              </>
            ) : !savedBank ? (
              <>
                <Plus className="w-4 h-4" />
                <span>Add bank account</span>
              </>
            ) : (
              <>
                <span>Withdraw to bank</span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Status / Error Banner */}
        {payoutNotice && (
          <div
            className={`px-5 py-2.5 border-t text-[12.5px] flex items-center gap-2 ${
              payoutNotice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}
          >
            {payoutNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{payoutNotice.message}</span>
          </div>
        )}

        {/* Compact 3-Column Metrics Strip */}
        <div className="grid grid-cols-3 border-t border-[var(--dj-border)] bg-[var(--dj-bg-card-subtle)] divide-x divide-[var(--dj-border)]">
          <div className="px-4 sm:px-6 py-3.5">
            <div className="text-[11.5px] text-[var(--dj-text-muted)]">Requests</div>
            <div className="text-[16px] font-semibold tabular-nums text-[var(--dj-text-primary)] mt-0.5">
              {eligibleRequests.length}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3.5">
            <div className="text-[11.5px] text-[var(--dj-text-muted)]">Avg. Tip</div>
            <div className="text-[16px] font-semibold tabular-nums text-[var(--dj-text-primary)] mt-0.5">
              ₦{averageTip.toLocaleString()}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3.5">
            <div className="text-[11.5px] text-[var(--dj-text-muted)]">Highest Tip</div>
            <div className="text-[16px] font-semibold tabular-nums text-[var(--dj-text-primary)] mt-0.5">
              ₦{highestTip.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TRANSACTION LEDGER */}
      <div className="bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] overflow-hidden transition-colors">
        <div className="px-5 py-3.5 border-b border-[var(--dj-border)] flex items-center justify-between gap-2">
          <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--dj-text-primary)]">
            Recent Activity
          </h2>
          <span className="text-[11.5px] text-[var(--dj-text-muted)]">
            Verified via Paystack
          </span>
        </div>

        <div className="divide-y divide-[var(--dj-border-subtle)] max-h-[380px] overflow-y-auto">
          {requests.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--dj-bg-control)] border border-[var(--dj-border)] flex items-center justify-center mx-auto mb-3 text-[var(--dj-text-muted)]">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-medium text-[var(--dj-text-primary)]">
                No transactions yet
              </p>
              <p className="text-[12px] text-[var(--dj-text-muted)] max-w-[260px] mx-auto mt-1 leading-relaxed">
                Paid song requests and tips will appear here automatically.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const isRefunded = req.status === 'refunded' || req.status === 'declined';
              const timeStr = new Date(req.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={req.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--dj-bg-card-subtle)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                        isRefunded
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          : 'bg-[var(--dj-bg-control)] border-[var(--dj-border)] text-[var(--dj-text-secondary)]'
                      }`}
                    >
                      {isRefunded ? (
                        <RotateCcw className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-[var(--dj-text-primary)] truncate">
                        {req.song.title}
                      </div>
                      <div className="text-[12px] text-[var(--dj-text-muted)] truncate mt-0.5">
                        {req.song.artist}
                        {req.guestName ? ` · ${req.guestName}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-[13.5px] font-semibold tabular-nums ${
                        isRefunded
                          ? 'text-[var(--dj-text-muted)] line-through'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isRefunded ? '' : '+'}₦{req.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[var(--dj-text-muted)] tabular-nums mt-0.5">
                      {isRefunded ? 'Refunded' : 'Paid'} · {timeStr}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. ADD / EDIT BANK ACCOUNT MODAL */}
      {isBankModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setIsBankModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--dj-bg-card)] border border-[var(--dj-border)] rounded-2xl shadow-2xl overflow-visible text-[var(--dj-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--dj-border)] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em]">
                  {savedBank ? 'Edit payout bank account' : 'Add payout bank account'}
                </h3>
                <p className="text-[12px] text-[var(--dj-text-muted)] mt-0.5">
                  Direct NGN settlement via Paystack Transfer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-lg hover:bg-[var(--dj-bg-control)] text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBankAccount} className="p-5 space-y-4">
              {/* Searchable Bank Selector */}
              <div className="space-y-1.5 relative">
                <label className="block text-[12px] font-medium text-[var(--dj-text-secondary)]">
                  Bank
                </label>

                <button
                  type="button"
                  onClick={() => setIsBankDropdownOpen((prev) => !prev)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] hover:border-[var(--dj-border-highlight)] text-[13px] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span
                    className={
                      selectedBankObj
                        ? 'text-[var(--dj-text-primary)] font-medium truncate'
                        : 'text-[var(--dj-text-muted)]'
                    }
                  >
                    {selectedBankObj ? selectedBankObj.name : 'Select your bank...'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--dj-text-muted)] shrink-0 transition-transform ${
                      isBankDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isBankDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl bg-[var(--dj-bg-card)] border border-[var(--dj-border)] shadow-xl overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-[var(--dj-border)] bg-[var(--dj-bg-card-subtle)]">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[var(--dj-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoFocus
                          value={bankSearchQuery}
                          onChange={(e) => setBankSearchQuery(e.target.value)}
                          placeholder="Search bank (e.g. GTBank, OPay, Kuda)..."
                          className="w-full h-8 pl-8 pr-7 rounded-lg bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] text-[12.5px] text-[var(--dj-text-primary)] placeholder:text-[var(--dj-text-muted)] focus:outline-none focus:border-[var(--dj-border-highlight)]"
                        />
                        {bankSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setBankSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtered Banks List */}
                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredBanks.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[12px] text-[var(--dj-text-muted)]">
                          No banks match “{bankSearchQuery}”
                        </div>
                      ) : (
                        filteredBanks.map((b) => {
                          const isSelected = b.code === selectedBankCode;
                          return (
                            <button
                              key={b.code}
                              type="button"
                              onClick={() => {
                                handleBankCodeChange(b.code);
                                setIsBankDropdownOpen(false);
                                setBankSearchQuery('');
                              }}
                              className={`w-full px-3 py-2 text-left text-[13px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] font-medium'
                                  : 'text-[var(--dj-text-secondary)] hover:bg-[var(--dj-bg-card-subtle)] hover:text-[var(--dj-text-primary)]'
                              }`}
                            >
                              <span className="truncate">{b.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 10-Digit NUBAN Account Number */}
              <div className="space-y-1.5">
                <label
                  htmlFor="payout-account-number"
                  className="block text-[12px] font-medium text-[var(--dj-text-secondary)]"
                >
                  Account Number (NUBAN)
                </label>
                <input
                  id="payout-account-number"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={accountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="0123456789"
                  className="w-full h-10 px-3 rounded-xl bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] text-[13px] font-mono tracking-wider text-[var(--dj-text-primary)] placeholder:text-[var(--dj-text-faint)] focus:outline-none focus:border-[var(--dj-border-highlight)] transition-colors"
                />
              </div>

              {/* Account Name (Auto-resolved via Paystack or manual in simulation mode) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="payout-account-name"
                    className="block text-[12px] font-medium text-[var(--dj-text-secondary)]"
                  >
                    Account Name
                  </label>
                  {isResolving && (
                    <span className="text-[11px] text-[var(--dj-text-muted)] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Verifying...
                    </span>
                  )}
                  {isAccountVerified && !isResolving && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified by Paystack
                    </span>
                  )}
                </div>
                <input
                  id="payout-account-name"
                  type="text"
                  required
                  readOnly={isAccountVerified && !requiresManualName}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={
                    isResolving
                      ? 'Resolving account name...'
                      : requiresManualName
                      ? 'Enter account holder name'
                      : 'Auto-filled after entering 10 digits'
                  }
                  className={`w-full h-10 px-3 rounded-xl border text-[13px] transition-colors focus:outline-none ${
                    isAccountVerified
                      ? 'bg-emerald-500/5 border-emerald-500/30 text-[var(--dj-text-primary)] font-medium'
                      : 'bg-[var(--dj-input-bg)] border-[var(--dj-input-border)] text-[var(--dj-text-primary)] placeholder:text-[var(--dj-text-faint)] focus:border-[var(--dj-border-highlight)]'
                  }`}
                />
                {requiresManualName && (
                  <p className="text-[11px] text-[var(--dj-text-muted)]">
                    Running in test mode (add <code className="font-mono">PAYSTACK_SECRET_KEY</code> for automatic NIBSS verification).
                  </p>
                )}
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[12px] text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-[12.5px] font-medium text-[var(--dj-text-secondary)] hover:bg-[var(--dj-bg-control)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingBank ||
                    isResolving ||
                    !selectedBankCode ||
                    accountNumber.length !== 10 ||
                    !accountName.trim()
                  }
                  className="h-9 px-4 rounded-xl bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)] hover:opacity-90 disabled:opacity-40 text-[12.5px] font-medium flex items-center gap-1.5 transition-opacity cursor-pointer"
                >
                  {isSavingBank ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save bank account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
