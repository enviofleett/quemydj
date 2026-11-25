'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import { getSupabaseClient } from '@/services/supabaseClient';
import {
  ArrowLeft,
  ArrowRight,
  Disc3,
  LogOut,
  Check,
  Mail,
  Lock,
  User,
  KeyRound,
  X,
  Shield,
  FileText,
  Sliders,
  Music,
  Headphones,
  Sparkles,
  Layers,
  Flame,
  Radio,
  Zap,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const {
    currentUser,
    registerOrUpdateGuest,
    logoutGuest,
    isDjAuthenticated,
    loginAsDj,
    logoutDj,
  } = useCueApp();

  // Screen state: 'welcome' or 'form'
  const [screen, setScreen] = useState<'welcome' | 'form'>('welcome');

  // Form tab: 'login' | 'signup'
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  // Role toggle: 'guest' | 'dj' (Default to 'dj' when accessed on desktop/laptop)
  const [role, setRole] = useState<'guest' | 'dj'>('dj');

  // Terms agreement state for signups
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Terms and Privacy Modal state
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null);

  // Fields
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // High-res atmosphere club image for the background
  const clubImage =
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop';

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authTab === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!emailOrPhone.trim()) {
      setErrorMessage('Please enter your email or phone number');
      return;
    }
    if (authTab === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const emailVal = emailOrPhone.trim();
    const isEmail = emailVal.includes('@');
    const finalName = authTab === 'signup'
      ? name.trim()
      : name.trim() || (isEmail ? emailVal.split('@')[0] : 'Guest');

    const supabase = getSupabaseClient();

    if (authTab === 'signup') {
      if (isEmail && supabase) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailVal,
              password,
              name: finalName,
              role: 'guest',
            }),
          });
          const result = await res.json();
          if (!res.ok) {
            setErrorMessage(result.error || 'Failed to create guest account');
            setIsSubmitting(false);
            return;
          }

          // Sign in user directly with confirmed credentials
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailVal,
            password,
          });

          if (signInError) {
            setErrorMessage(signInError.message);
            setIsSubmitting(false);
            return;
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'Registration failed');
          setIsSubmitting(false);
          return;
        }
      }
      registerOrUpdateGuest(finalName, emailVal);
      setIsSubmitting(false);
      router.push('/profile');
    } else {
      // Login
      if (isEmail && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailVal,
            password,
          });

          if (error) {
            setErrorMessage(error.message);
            setIsSubmitting(false);
            return;
          }

          const loggedInName = data.user?.user_metadata?.name || finalName;
          registerOrUpdateGuest(loggedInName, emailVal);
          setIsSubmitting(false);
          router.push('/profile');
          return;
        } catch (err: any) {
          setErrorMessage(err?.message || 'Login failed');
          setIsSubmitting(false);
          return;
        }
      }

      // Local fallback
      registerOrUpdateGuest(finalName, emailVal);
      setIsSubmitting(false);
      router.push('/profile');
    }
  };

  const handleDjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authTab === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your DJ stage name');
      return;
    }
    if (!emailOrPhone.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (authTab === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const emailVal = emailOrPhone.trim();
    const isEmail = emailVal.includes('@');
    const stageName = authTab === 'signup' ? name.trim() : name.trim() || 'Resident DJ';
    const supabase = getSupabaseClient();

    if (authTab === 'signup') {
      if (isEmail && supabase) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailVal,
              password,
              name: stageName,
              role: 'dj',
            }),
          });
          const result = await res.json();
          if (!res.ok) {
            setErrorMessage(result.error || 'Failed to create DJ account');
            setIsSubmitting(false);
            return;
          }

          // Sign in directly
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailVal,
            password,
          });

          if (signInError) {
            setErrorMessage(signInError.message);
            setIsSubmitting(false);
            return;
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'DJ registration failed');
          setIsSubmitting(false);
          return;
        }
      }
      loginAsDj();
      setIsSubmitting(false);
      router.push('/dj/workstation');
    } else {
      // DJ Login
      if (isEmail && supabase) {
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: emailVal,
            password,
          });

          if (error) {
            setErrorMessage(error.message);
            setIsSubmitting(false);
            return;
          }

          loginAsDj();
          setIsSubmitting(false);
          router.push('/dj/workstation');
          return;
        } catch (err: any) {
          setErrorMessage(err?.message || 'DJ login failed');
          setIsSubmitting(false);
          return;
        }
      }

      // Local fallback
      loginAsDj();
      setIsSubmitting(false);
      router.push('/dj/workstation');
    }
  };

  const handleDemoDjInstantLogin = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      loginAsDj();
      setIsSubmitting(false);
      router.push('/dj/workstation');
    }, 350);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#07090d] text-[#1c2420] flex flex-col justify-center items-center">
      {/* ============================================================== */}
      {/* DESKTOP / LAPTOP EXPERIENCE (Visible on screens md and up)     */}
      {/* Full workstation layout designed specifically for DJs         */}
      {/* ============================================================== */}
      <div className="hidden md:flex w-full min-h-[100dvh] bg-[#07090d] text-white overflow-hidden relative">
        {/* Subtle DJ Turntable & Laser Ambient Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #10b981 1px, transparent 1px), radial-gradient(circle at 75% 75%, #059669 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Cinematic Club Background Glow */}
        <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-emerald-700/10 blur-[140px] pointer-events-none" />

        {/* LEFT COLUMN: Clean Atmospheric DJ Clubbing Background with Light Text & Headline */}
        <div className="relative w-7/12 flex flex-col justify-between p-12 lg:p-16 border-r border-white/10 z-10 overflow-hidden">
          {/* High-res cinematic blurry DJ clubbing background */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 filter blur-[8px] opacity-60"
            style={{ backgroundImage: `url('${clubImage}')` }}
          />
          {/* Subtle dark gradient overlay to ensure perfect contrast and mood */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-[#07090d]/30" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/30 bg-black/60 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center backdrop-blur-md group-hover:border-emerald-400 transition-all">
                <Image
                  src="/brand-logo-transparent.png"
                  alt="QueMyDJ Logo"
                  width={44}
                  height={44}
                  priority
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white block">
                  QueMyDJ
                </span>
                <span className="text-[10px] tracking-widest text-emerald-400 uppercase font-bold block">
                  Live DJ Experience
                </span>
              </div>
            </Link>

            <Link
              href="/"
              className="text-xs font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
            >
              Skip as guest &rarr;
            </Link>
          </div>

          {/* Center Minimal Typography: Main Header and Subtext */}
          <div className="relative z-10 max-w-xl my-auto py-12 space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-md">
              Control the vibe, connect with the crowd.
            </h1>

            <p className="text-base text-white/80 font-normal leading-relaxed max-w-md drop-shadow">
              Real-time crowd requests, seamless live music rotation, and direct performer tips in one unified console.
            </p>
          </div>

          {/* Footer note */}
          <div className="relative z-10 text-xs text-white/40 flex items-center justify-between">
            <span>&copy; {new Date().getFullYear()} QueMyDJ &bull; Powered by Zenbeatz. All rights reserved.</span>
            <span>Club Night Requests &amp; Live Console</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Form Card */}
        <div className="relative w-5/12 flex items-center justify-center p-8 lg:p-12 bg-[#efece4] text-[#111915]">
          <div className="w-full max-w-md space-y-6">
            {/* Top Switcher: DJ Booth Console vs Club Guest */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#0a1a14]">
                  {role === 'dj' ? 'DJ Booth Sign In' : 'Guest Account'}
                </h2>
                <p className="text-xs text-[#6e685b] mt-0.5">
                  {role === 'dj'
                    ? 'Enter your resident credentials to manage the queue'
                    : 'Sign in to request songs and tip the DJ'}
                </p>
              </div>

              {/* Role Toggle Pill */}
              <div className="flex bg-[#ded9cb] p-1 rounded-2xl border border-black/5 text-xs font-bold text-[#443f34]">
                <button
                  type="button"
                  onClick={() => {
                    setRole('dj');
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    role === 'dj'
                      ? 'bg-[#07241b] text-white shadow-sm'
                      : 'hover:text-[#07241b]'
                  }`}
                >
                  DJ Booth
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('guest');
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    role === 'guest'
                      ? 'bg-[#07241b] text-white shadow-sm'
                      : 'hover:text-[#07241b]'
                  }`}
                >
                  Guest
                </button>
              </div>
            </div>

            {/* Elevated Form Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.08)] border border-black/[0.08] space-y-5">
              {/* Segmented Pill Tab Selector: Login | Signup */}
              <div className="grid grid-cols-2 p-1 bg-[#f4f2ec] rounded-2xl border border-[#e5e1d6]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-[#07241b] text-white shadow-sm'
                      : 'text-[#605a4d] hover:text-[#07241b]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signup');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    authTab === 'signup'
                      ? 'bg-[#07241b] text-white shadow-sm'
                      : 'text-[#605a4d] hover:text-[#07241b]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form Content */}
              {role === 'dj' ? (
                <form onSubmit={handleDjSubmit} className="space-y-4">
                  {authTab === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a2520] block">
                        DJ Stage Name
                      </label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="DJ Spinall / Kofi Beats"
                          className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1a2520] block">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                      <input
                        type="email"
                        required
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        placeholder="dj@quemydj.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1a2520] block">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {authTab === 'signup' && (
                    <div className="pt-1 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="terms-dj-desktop"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#07241b] focus:ring-[#07241b] border-gray-300 accent-[#07241b] cursor-pointer"
                      />
                      <label htmlFor="terms-dj-desktop" className="text-[11px] text-[#4a4539] leading-tight select-none">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowLegalModal('terms')}
                          className="text-[#07241b] font-bold underline hover:opacity-80"
                        >
                          DJ Performer Agreement
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => setShowLegalModal('privacy')}
                          className="text-[#07241b] font-bold underline hover:opacity-80"
                        >
                          Privacy Policy
                        </button>.
                      </label>
                    </div>
                  )}

                  {authTab === 'login' && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(emailOrPhone);
                          setShowForgotModal(true);
                          setForgotSubmitted(false);
                        }}
                        className="text-[11px] font-bold text-[#0d281f] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || (authTab === 'signup' && !agreedToTerms)}
                    className="w-full h-12 rounded-xl bg-[#07241b] hover:bg-[#0c3529] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                  >
                    {isSubmitting
                      ? 'Please wait...'
                      : authTab === 'login'
                      ? 'SIGN IN TO BOOTH CONSOLE'
                      : 'CREATE DJ ACCOUNT'}
                  </button>
                </form>
              ) : (
                /* Guest form on desktop */
                <form onSubmit={handleGuestSubmit} className="space-y-4">
                  {authTab === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a2520] block">
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Rivers"
                          className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1a2520] block">
                      Email or Phone
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                      <input
                        type="text"
                        required
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        placeholder="alex.rivers@icloud.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1a2520] block">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {authTab === 'signup' && (
                    <div className="pt-1 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="terms-guest-desktop"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#07241b] focus:ring-[#07241b] border-gray-300 accent-[#07241b] cursor-pointer"
                      />
                      <label htmlFor="terms-guest-desktop" className="text-[11px] text-[#4a4539] leading-tight select-none">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowLegalModal('terms')}
                          className="text-[#07241b] font-bold underline hover:opacity-80"
                        >
                          Terms of Service
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => setShowLegalModal('privacy')}
                          className="text-[#07241b] font-bold underline hover:opacity-80"
                        >
                          Privacy Policy
                        </button>.
                      </label>
                    </div>
                  )}

                  {authTab === 'login' && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(emailOrPhone);
                          setShowForgotModal(true);
                          setForgotSubmitted(false);
                        }}
                        className="text-[11px] font-bold text-[#0d281f] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || (authTab === 'signup' && !agreedToTerms)}
                    className="w-full h-12 rounded-xl bg-[#07241b] hover:bg-[#0c3529] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                  >
                    {isSubmitting
                      ? 'Please wait...'
                      : authTab === 'login'
                      ? 'SIGN IN AS GUEST'
                      : 'CREATE GUEST ACCOUNT'}
                  </button>
                </form>
              )}

              {/* Demo DJ Direct Access */}
              <div className="pt-2 border-t border-black/5 text-center">
                <button
                  type="button"
                  onClick={handleDemoDjInstantLogin}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Disc3 className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>One-Click Demo Resident DJ (Kofi Beats)</span>
                </button>
              </div>
            </div>

            {/* Quick Guest Skip */}
            <div className="text-center">
              <Link
                href="/"
                className="text-xs text-[#5e584a] hover:text-[#07241b] font-medium underline transition-colors"
              >
                Skip sign in and explore as guest &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE EXPERIENCE (Visible on screens smaller than md)         */}
      {/* Retains the sleek mobile phone mockup flow                     */}
      {/* ============================================================== */}
      <div className="md:hidden relative w-full h-[100dvh] overflow-hidden flex flex-col justify-between select-none">
        {/* VIEW 1: WELCOME SCREEN (IMAGE 1 IN REFERENCE) */}
        {screen === 'welcome' && (
          <div className="relative w-full h-full flex flex-col justify-between text-white p-7">
            {/* Background Club Image with cinematic mood overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center scale-105"
              style={{
                backgroundImage: `url('${clubImage}')`,
              }}
            />
            {/* Dark green-tinted clubbing vignette gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#061814]/75 to-[#031510]/95" />

            {/* Top Bar */}
            <div className="relative z-10 pt-2 flex items-center justify-between">
              <span className="text-[11px] tracking-widest uppercase font-medium text-white/50">
                QueMyDJ
              </span>
              <Link
                href="/"
                className="text-xs font-medium text-white/70 hover:text-white transition-colors"
              >
                Skip as guest
              </Link>
            </div>

            {/* Center Brand Badge */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/60 shadow-[0_0_35px_rgba(16,185,129,0.35)] bg-black/60 flex items-center justify-center backdrop-blur-md">
                <Image
                  src="/brand-logo-transparent.png"
                  alt="QueMyDJ Logo"
                  width={96}
                  height={96}
                  priority
                  className="object-contain p-1"
                />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                  QueMyDJ
                </h1>
                <p className="text-xs italic font-normal text-white/85 tracking-wide max-w-[260px] mx-auto">
                  Club music requests &amp; live DJ interactions brought to you.
                </p>
              </div>
            </div>

            {/* Bottom Action Area: Pill Button to Open Login */}
            <div className="relative z-10 pb-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup');
                  setScreen('form');
                }}
                className="w-full h-13 rounded-full bg-[#e8e4d9] hover:bg-white text-[#0f241d] font-bold text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
              >
                Create Account
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setScreen('form');
                  }}
                  className="text-xs text-white/80 hover:text-white transition-colors font-medium tracking-wide"
                >
                  Already have an account? <span className="underline font-semibold">Sign In</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: AUTH SCREEN (IMAGE 2 IN REFERENCE) */}
        {screen === 'form' && (
          <div className="relative w-full h-full flex flex-col justify-between bg-[#efece4]">
            {/* Top Atmospheric Half */}
            <div className="relative h-[38%] w-full flex flex-col justify-between p-6">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${clubImage}')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#081b16]/75 to-[#efece4]" />

              {/* Back navigation */}
              <div className="relative z-10 pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScreen('welcome')}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Role Switcher Pill: Guest vs DJ */}
                <div className="flex bg-black/40 backdrop-blur-md p-0.5 rounded-full border border-white/10 text-[11px] font-semibold text-white/80">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('guest');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      role === 'guest'
                        ? 'bg-white text-zinc-950 font-bold shadow-sm'
                        : 'hover:text-white'
                    }`}
                  >
                    Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('dj');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      role === 'dj'
                        ? 'bg-white text-zinc-950 font-bold shadow-sm'
                        : 'hover:text-white'
                    }`}
                  >
                    DJ Booth
                  </button>
                </div>
              </div>

              {/* Brand Center Emblem */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center mt-auto pb-2">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/60 shadow-lg bg-black/60 flex items-center justify-center mb-1.5 backdrop-blur-md">
                  <Image
                    src="/brand-logo-transparent.png"
                    alt="QueMyDJ Logo"
                    width={56}
                    height={56}
                    className="object-contain p-1"
                  />
                </div>
                <h2 className="text-base font-extrabold tracking-tight text-white drop-shadow">
                  QueMyDJ
                </h2>
                <span className="text-[11px] text-white/85 font-medium">
                  {role === 'guest' ? 'Club Guest App' : 'Resident Booth Console'}
                </span>
              </div>
            </div>

            {/* Bottom Form Sheet */}
            <div className="flex-1 px-5 pt-3 pb-6 flex flex-col justify-between">
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-black/[0.06] my-auto">
                {/* Segmented Pill Tab Selector: Login | Signup */}
                <div className="grid grid-cols-2 p-1 bg-[#f4f2ec] rounded-2xl mb-5 border border-[#e5e1d6]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setErrorMessage(null);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'login'
                        ? 'bg-[#07241b] text-white shadow-sm'
                        : 'text-[#605a4d] hover:text-[#07241b]'
                    }`}
                  >
                    Login
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('signup');
                      setErrorMessage(null);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'signup'
                        ? 'bg-[#07241b] text-white shadow-sm'
                        : 'text-[#605a4d] hover:text-[#07241b]'
                    }`}
                  >
                    Signup
                  </button>
                </div>

                {role === 'guest' ? (
                  <form onSubmit={handleGuestSubmit} className="space-y-3.5">
                    {authTab === 'signup' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1a2520] block">
                          Full Name
                        </label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Alex Rivers"
                            className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a2520] block">
                        E-mail Address or Phone
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                        <input
                          type="text"
                          required
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          placeholder="alex.rivers@icloud.com"
                          className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a2520] block">
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    {authTab === 'signup' && (
                      <div className="pt-1 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="terms-guest-mobile"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#07241b] focus:ring-[#07241b] border-gray-300 accent-[#07241b] cursor-pointer"
                        />
                        <label htmlFor="terms-guest-mobile" className="text-[11px] text-[#4a4539] leading-tight select-none">
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setShowLegalModal('terms')}
                            className="text-[#07241b] font-bold underline hover:opacity-80"
                          >
                            Terms of Service
                          </button>{' '}
                          and{' '}
                          <button
                            type="button"
                            onClick={() => setShowLegalModal('privacy')}
                            className="text-[#07241b] font-bold underline hover:opacity-80"
                          >
                            Privacy Policy
                          </button>.
                        </label>
                      </div>
                    )}

                    {authTab === 'login' && (
                      <div className="text-right pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(emailOrPhone);
                            setShowForgotModal(true);
                            setForgotSubmitted(false);
                          }}
                          className="text-[11px] font-bold text-[#0d281f] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                        {errorMessage}
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || (authTab === 'signup' && !agreedToTerms)}
                        className="w-full h-12 rounded-xl bg-[#07241b] hover:bg-[#0c3529] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                      >
                        {isSubmitting ? 'Please wait...' : authTab === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleDjSubmit} className="space-y-3.5">
                    {authTab === 'signup' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1a2520] block">
                          DJ Stage Name
                        </label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="DJ Spinall"
                            className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a2520] block">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                        <input
                          type="email"
                          required
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          placeholder="kofi@dj.com"
                          className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a2520] block">
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 w-4 h-4 text-[#8a8475]" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-4 py-3 bg-[#fbfaf7] hover:bg-white focus:bg-white border border-[#dcd7cb] focus:border-[#07241b] focus:ring-2 focus:ring-[#07241b]/15 rounded-xl text-xs font-semibold text-[#111915] placeholder:text-[#9e988a] focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    {authTab === 'signup' && (
                      <div className="pt-1 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="terms-dj-mobile"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#07241b] focus:ring-[#07241b] border-gray-300 accent-[#07241b] cursor-pointer"
                        />
                        <label htmlFor="terms-dj-mobile" className="text-[11px] text-[#4a4539] leading-tight select-none">
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setShowLegalModal('terms')}
                            className="text-[#07241b] font-bold underline hover:opacity-80"
                          >
                            DJ Performer Agreement
                          </button>{' '}
                          and{' '}
                          <button
                            type="button"
                            onClick={() => setShowLegalModal('privacy')}
                            className="text-[#07241b] font-bold underline hover:opacity-80"
                          >
                            Privacy Policy
                          </button>.
                        </label>
                      </div>
                    )}

                    {authTab === 'login' && (
                      <div className="text-right pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(emailOrPhone);
                            setShowForgotModal(true);
                            setForgotSubmitted(false);
                          }}
                          className="text-[11px] font-bold text-[#0d281f] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                        {errorMessage}
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || (authTab === 'signup' && !agreedToTerms)}
                        className="w-full h-12 rounded-xl bg-[#07241b] hover:bg-[#0c3529] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                      >
                        {isSubmitting
                          ? 'Please wait...'
                          : authTab === 'login'
                          ? 'SIGN IN AS DJ'
                          : 'CREATE DJ ACCOUNT'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom minimal brand footnote */}
              <div className="text-center pt-2">
                <span className="text-[10px] text-[#8e8778] font-medium">
                  QueMyDJ &bull; Powered by Zenbeatz &bull; Night Club Requests
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: FORGOT PASSWORD (FOR BOTH USERS & DJS)               */}
      {/* ============================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-black/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-[#f4f2ec] text-[#07241b] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-950">
                Reset Password
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Enter your registered email address and we&apos;ll send you a secure link to create a new password.
              </p>
            </div>

            {forgotSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-950">
                  Reset Link Dispatched
                </p>
                <p className="text-[11px] text-emerald-800">
                  Check <span className="font-semibold">{forgotEmail || 'your email'}</span> for instructions to reset your account credentials.
                </p>
                <div className="pt-2">
                  <a
                    href={`/auth/reset-password?email=${encodeURIComponent(forgotEmail.trim())}`}
                    className="inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                  >
                    Set New Password Directly <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-1.5 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmail.trim()) return;
                  
                  // 1. Call backend reset-password endpoint to generate branded email & token link
                  try {
                    await fetch('/api/auth/reset-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: forgotEmail.trim() }),
                    });
                  } catch (err) {
                    console.warn('[ForgotPassword] API call error:', err);
                  }

                  // 2. Also trigger Supabase client recovery request with redirect_to
                  const supabase = getSupabaseClient();
                  if (supabase && forgotEmail.includes('@')) {
                    try {
                      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
                        redirectTo: `${window.location.origin}/auth/reset-password`,
                      });
                    } catch {}
                  }

                  setForgotSubmitted(true);
                }}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800 block">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#fbfaf7] border border-[#dcd7cb] focus:border-[#07241b] rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#07241b] hover:bg-[#0c3529] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: TERMS OF SERVICE & PRIVACY POLICY                     */}
      {/* ============================================================== */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-black/10 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-[#f4f2ec] text-[#07241b] flex items-center justify-center">
                {showLegalModal === 'terms' ? <FileText className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <button
                type="button"
                onClick={() => setShowLegalModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-950">
                {showLegalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <p className="text-xs text-zinc-500">
                Last updated November 2026
              </p>
            </div>

            <div className="overflow-y-auto text-xs text-zinc-600 leading-relaxed space-y-2.5 pr-1">
              {showLegalModal === 'terms' ? (
                <>
                  <p className="font-semibold text-zinc-800">1. Music Requests &amp; Queue Management</p>
                  <p>
                    All songs requested on QueMyDJ are subject to DJ queue discretion and venue programming. If a request cannot be played or is declined by the DJ, 100% of the funds are credited back to the guest wallet or refunded immediately.
                  </p>
                  <p className="font-semibold text-zinc-800">2. Night Wallets &amp; Tipping</p>
                  <p>
                    Credits deposited into your club night wallet remain active across venue sessions. Tipping is non-reversible once the song begins airplay.
                  </p>
                  <p className="font-semibold text-zinc-800">3. DJ Conduct &amp; Performer Terms</p>
                  <p>
                    Resident DJs agree to review queue items in a timely fashion and maintain the venue atmosphere standards.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-zinc-800">1. Data Privacy</p>
                  <p>
                    QueMyDJ values your privacy. We collect your phone number and email solely for song receipt notifications, wallet management, and account recovery.
                  </p>
                  <p className="font-semibold text-zinc-800">2. Payment Security</p>
                  <p>
                    All credit/debit transactions and Paystack deposits are processed with PCI-DSS banking level encryption. QueMyDJ never stores raw card details.
                  </p>
                  <p className="font-semibold text-zinc-800">3. Song Request History</p>
                  <p>
                    Your music requests and venue check-ins are private to your registered account unless you choose to share your playlist publicly.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowLegalModal(null)}
              className="w-full h-11 rounded-xl bg-[#07241b] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
