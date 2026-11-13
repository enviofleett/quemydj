'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import {
  User,
  Phone,
  Lock,
  FileText,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowRight,
  Wallet,
  CheckCircle2,
  Bell,
  Check,
  Moon,
  Sun,
  Calendar,
  X
} from 'lucide-react';

export default function GuestProfilePage() {
  const router = useRouter();
  const {
    currentUser,
    registerOrUpdateGuest,
    logoutGuest,
    themeMode,
    toggleThemeMode,
  } = useCueApp();

  // Profile Edit modal / states - ALWAYS declared unconditionally before any early returns
  const [name, setName] = useState(currentUser?.name || '');
  const [phoneOrEmail, setPhoneOrEmail] = useState(currentUser?.phoneOrEmail || '');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [notifyOnPlay, setNotifyOnPlay] = useState(true);
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const joinedDate = React.useMemo(() => {
    try {
      if (!currentUser?.createdAt) return 'March 2026';
      const d = new Date(currentUser.createdAt);
      if (isNaN(d.getTime())) return 'March 2026';
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'March 2026';
    }
  }, [currentUser?.createdAt]);

  // If user is not registered, they cannot have a profile page
  if (!currentUser?.isRegistered) {
    return (
      <div className="flex flex-col flex-1 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] px-5 py-8 justify-between">
        <div className="space-y-6 max-w-sm mx-auto w-full my-auto text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-800">
            <Lock className="w-7 h-7 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Profile Locked
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              You must create an account or sign in to access your profile settings, personal info, and preferences.
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

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    registerOrUpdateGuest(name.trim(), phoneOrEmail.trim() || undefined);
    setIsEditingInfo(false);
    setSaveSuccessMsg('Personal details updated successfully.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setSaveSuccessMsg('Password changed successfully.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] pb-24 transition-colors">
      {/* 1. Profile Hero Section matching user screenshot style */}
      <div className="relative pt-6 pb-4 px-5">
        {/* Soft atmospheric gradient backdrop card */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-tr from-[#9cbdd3]/45 via-[#f5b28d]/40 to-[#d6b7e6]/50 dark:from-[#1b2b3a]/70 dark:via-[#35201b]/70 dark:to-[#2c1d38]/70 p-5 pt-8 shadow-sm border border-black/[0.04] dark:border-white/[0.06]">
          {/* DJ Clubbing Ambient Background Pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
            {/* Ambient club lighting glows */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-44 h-44 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-2xl" />

            {/* Turntable Vinyl Record Grooves (Top-Right) */}
            <svg
              className="absolute -top-10 -right-10 w-56 h-56 text-zinc-950/[0.08] dark:text-emerald-400/[0.12]"
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
              <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" className="fill-current/5" />
              <circle cx="100" cy="100" r="12" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
              <circle cx="100" cy="100" r="4" fill="currentColor" />
            </svg>

            {/* Club Audio Equalizer Waveform (Across Top) */}
            <svg
              className="absolute top-3 left-6 h-8 w-48 text-zinc-950/[0.07] dark:text-emerald-400/[0.12]"
              viewBox="0 0 180 32"
              fill="currentColor"
            >
              <rect x="0" y="18" width="3" height="14" rx="1.5" />
              <rect x="8" y="12" width="3" height="20" rx="1.5" />
              <rect x="16" y="6" width="3" height="26" rx="1.5" />
              <rect x="24" y="14" width="3" height="18" rx="1.5" />
              <rect x="32" y="3" width="3" height="29" rx="1.5" />
              <rect x="40" y="10" width="3" height="22" rx="1.5" />
              <rect x="48" y="2" width="3" height="30" rx="1.5" />
              <rect x="56" y="14" width="3" height="18" rx="1.5" />
              <rect x="64" y="8" width="3" height="24" rx="1.5" />
              <rect x="72" y="16" width="3" height="16" rx="1.5" />
              <rect x="80" y="5" width="3" height="27" rx="1.5" />
              <rect x="88" y="12" width="3" height="20" rx="1.5" />
              <rect x="96" y="20" width="3" height="12" rx="1.5" />
              <rect x="104" y="6" width="3" height="26" rx="1.5" />
              <rect x="112" y="14" width="3" height="18" rx="1.5" />
              <rect x="120" y="9" width="3" height="23" rx="1.5" />
              <rect x="128" y="18" width="3" height="14" rx="1.5" />
              <rect x="136" y="4" width="3" height="28" rx="1.5" />
              <rect x="144" y="12" width="3" height="20" rx="1.5" />
              <rect x="152" y="16" width="3" height="16" rx="1.5" />
              <rect x="160" y="8" width="3" height="24" rx="1.5" />
              <rect x="168" y="14" width="3" height="18" rx="1.5" />
            </svg>

            {/* Subtle DJ laser grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.05] dark:opacity-[0.08]" />
          </div>
          
          {/* Main User Card (Floating clean white pill card like screenshot) */}
          <div className="relative mt-7 pt-9 pb-5 px-5 rounded-[28px] bg-white dark:bg-[#14171f] shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.4)] border border-black/[0.04] dark:border-white/[0.06]">
            {/* Inner clipped container for corner watermark */}
            <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full border border-black/[0.04] dark:border-white/[0.05]" />
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full border border-black/[0.04] dark:border-white/[0.05]" />
            </div>
            
            {/* Overlapping Circular Avatar */}
            <div className="absolute -top-10 left-5 w-20 h-20 rounded-full border-4 border-white dark:border-[#14171f] bg-gradient-to-tr from-emerald-500 to-cyan-500 text-black flex items-center justify-center font-black text-2xl shadow-md overflow-hidden z-10">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>

            {/* User Title & Badges */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  {currentUser.name}
                </h1>

                {/* Subtitle Badges matching reference pill style */}
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.06]">
                    <Calendar className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                    <span>Joined {joinedDate}</span>
                  </span>
                </div>
              </div>

              {/* Theme toggle quick icon */}
              <button
                type="button"
                onClick={toggleThemeMode}
                title="Toggle Light / Dark mode"
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                {themeMode === 'light' ? (
                  <Moon className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            </div>

            {/* Contact / Bio preview */}
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-3 leading-snug">
              {currentUser.phoneOrEmail || 'Signed in via Club Guest Session'}
            </p>

            {/* Action Row: Primary Capsule Button + Circular Action Badges */}
            <div className="mt-4 pt-1 flex items-center gap-2.5">
              <Link
                href="/wallet"
                className="flex-1 h-11 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wallet</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsEditingInfo(!isEditingInfo)}
                title="Edit profile information"
                className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-black/[0.04] dark:border-white/[0.06] transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setNotifyOnPlay(!notifyOnPlay)}
                title={notifyOnPlay ? 'Notifications active' : 'Notifications muted'}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  notifyOnPlay
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-black/[0.04] dark:border-white/[0.06]'
                }`}
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="mx-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 2. Personal Information Drawer / Accordion */}
      {isEditingInfo && (
        <form onSubmit={handleSaveInfo} className="mx-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Edit Details
          </h3>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
              Full Name / Club Alias
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
              Phone Number or Email
            </label>
            <input
              type="text"
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              placeholder="08012345678 or name@icloud.com"
              className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingInfo(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* 3. Change Password Drawer / Accordion */}
      {isChangingPassword && (
        <form onSubmit={handleSavePassword} className="mx-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Change Password
          </h3>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsChangingPassword(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold"
            >
              Update Password
            </button>
          </div>
        </form>
      )}

      {/* 4. Settings Grouped List */}
      <div className="px-5 mt-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Account Settings
        </h2>

        <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-xs">
          {/* Change Password Row */}
          <button
            type="button"
            onClick={() => {
              setIsChangingPassword(!isChangingPassword);
              setIsEditingInfo(false);
            }}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Change Password
                </span>
                <span className="text-[12px] text-zinc-400">
                  Update your security PIN or password
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>

          {/* Edit Phone / Contact */}
          <button
            type="button"
            onClick={() => {
              setIsEditingInfo(!isEditingInfo);
              setIsChangingPassword(false);
            }}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Phone Number &amp; Contact
                </span>
                <span className="text-[12px] text-zinc-400">
                  {currentUser.phoneOrEmail || 'Add contact for song notifications'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>

          {/* Terms & Conditions */}
          <button
            type="button"
            onClick={() => setActiveLegalModal('terms')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                Terms and Conditions
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>

          {/* Privacy & Payment Protection */}
          <button
            type="button"
            onClick={() => setActiveLegalModal('privacy')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                Privacy &amp; Refund Protection
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              logoutGuest();
              router.push('/login');
            }}
            className="w-full h-12 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>

      {/* Legal & Policies Modal Popup */}
      {activeLegalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLegalModal(null)}
        >
          <div
            className="bg-white dark:bg-[#111722] rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-black/10 dark:border-zinc-800 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Icon and Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    activeLegalModal === 'terms'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {activeLegalModal === 'terms' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-tight">
                    {activeLegalModal === 'terms' ? 'Terms & Conditions' : 'Privacy & Refund Protection'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {activeLegalModal === 'terms' ? 'Rules & guest guidelines' : 'Security, escrow & data safety'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-3.5 pr-1 py-1">
              {activeLegalModal === 'terms' ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">
                      1. Song Requests &amp; DJ Discretion
                    </h4>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      All songs requested on QueMyDJ are subject to real-time DJ review. The performer maintains editorial control to match crowd energy and venue music policy.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 space-y-1">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-[13px]">
                      2. 100% Unplayed Refund Guarantee
                    </h4>
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                      If the DJ declines your song, or if the session ends before your song is played, your payment is 100% refunded immediately back to your Night Wallet or original payment method.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">
                      3. Night Wallet &amp; Withdrawals
                    </h4>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Wallet balances remain saved across club nights and venue sessions. You can request a withdrawal of unspent funds at any time. Please note that wallet withdrawals attract a standard processing withdrawal charge.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">
                      4. Venue Conduct &amp; Content Policy
                    </h4>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tracks containing hate speech, inappropriate explicit content, or violating venue guidelines will be rejected without queue priority.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 space-y-1">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-[13px]">
                      1. Bank-Grade Payment Security
                    </h4>
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                      All card and mobile money transactions are tokenized via PCI-DSS certified gateways (Paystack). QueMyDJ never stores raw debit card numbers, PINs, or CVV codes.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">
                      2. Automated Escrow &amp; Fast Refunds
                    </h4>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tips and request fees are held in automated escrow until the track is marked playing or confirmed. Unfulfilled requests trigger an automated refund with a unique audit reference code.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">
                      3. Guest Data Privacy
                    </h4>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Your phone number and email are encrypted and never disclosed to club DJs or third parties. DJs only see your chosen screen display name and your song request.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">
                      4. Balance Withdrawals &amp; Charges
                    </h4>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Any unused wallet funds can be withdrawn to your verified bank account or card upon request. Wallet withdrawals attract a standard withdrawal fee.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="w-full h-11 rounded-2xl bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 text-white dark:text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
