'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import { ArrowLeft, ArrowRight, Disc3, LogOut, Check, Mail, Lock, User, KeyRound, X, Shield, FileText } from 'lucide-react';

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

  // Screen state: 'welcome' (screen 1 in reference) or 'form' (screen 2 in reference)
  const [screen, setScreen] = useState<'welcome' | 'form'>('welcome');

  // Form tab: 'login' | 'signup'
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  // Role toggle: 'guest' | 'dj'
  const [role, setRole] = useState<'guest' | 'dj'>('guest');

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

  const handleGuestSubmit = (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    setTimeout(() => {
      const finalName =
        authTab === 'signup'
          ? name.trim()
          : name.trim() || emailOrPhone.split('@')[0] || 'Guest';

      registerOrUpdateGuest(finalName, emailOrPhone.trim());
      setIsSubmitting(false);
      router.push('/profile');
    }, 400);
  };

  const handleDjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    setTimeout(() => {
      loginAsDj();
      setIsSubmitting(false);
      router.push('/dj/workstation');
    }, 450);
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-0 sm:p-6 lg:p-10 bg-[#07090d] text-[#1c2420]">
      {/* 
        Container phone shell:
        - On mobile: full bleed 100vw x 100dvh
        - On desktop: elegant centered device viewport with subtle shadow, matching the design showcase
      */}
      <div className="relative w-full sm:max-w-[420px] h-[100dvh] sm:h-[844px] sm:max-h-[92vh] sm:rounded-[44px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-0 sm:border sm:border-white/10 flex flex-col justify-between select-none">
        
        {/* ============================================================== */}
        {/* VIEW 1: WELCOME SCREEN (IMAGE 1 IN REFERENCE)                  */}
        {/* ============================================================== */}
        {screen === 'welcome' && (
          <div className="relative w-full h-full flex flex-col justify-between text-white p-7 sm:p-8">
            {/* Background Club Image with cinematic mood overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center scale-105"
              style={{
                backgroundImage: `url('${clubImage}')`,
              }}
            />
            {/* Dark green-tinted clubbing vignette gradient like reference */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#061814]/75 to-[#031510]/95" />

            {/* Top Bar minimal notch space */}
            <div className="relative z-10 pt-2 flex items-center justify-between">
              <span className="text-[11px] tracking-widest uppercase font-medium text-white/50">
                QUEMYDJ
              </span>
              <Link
                href="/"
                className="text-xs font-medium text-white/70 hover:text-white transition-colors"
              >
                Skip as guest
              </Link>
            </div>

            {/* Center Brand Badge (Circular Emblem + Brand Typography) */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-4">
              {/* Brand Logo Emblem */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/60 shadow-[0_0_35px_rgba(16,185,129,0.35)] bg-black/60 flex items-center justify-center backdrop-blur-md">
                <Image
                  src="/brand-logo-transparent.png"
                  alt="QUEMYDJ Logo"
                  width={96}
                  height={96}
                  priority
                  className="object-contain p-1"
                />
              </div>

              {/* Title & Tagline */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white drop-shadow-md">
                  QUEMYDJ
                </h1>
                <p className="text-xs sm:text-sm italic font-normal text-white/85 tracking-wide max-w-[260px] mx-auto">
                  Club music requests &amp; live DJ interactions brought to you.
                </p>
              </div>
            </div>

            {/* Bottom Action Area: Pill Button to Open Login */}
            <div className="relative z-10 pb-6 sm:pb-4 space-y-3">
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

        {/* ============================================================== */}
        {/* VIEW 2: AUTH SCREEN (IMAGE 2 IN REFERENCE)                     */}
        {/* ============================================================== */}
        {screen === 'form' && (
          <div className="relative w-full h-full flex flex-col justify-between bg-[#efece4]">
            
            {/* Top Atmospheric Half: Club Photo + Center Brand Logo with soft fade */}
            <div className="relative h-[38%] w-full flex flex-col justify-between p-6">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${clubImage}')`,
                }}
              />
              {/* Fade out smoothly from photo to warm cream bottom */}
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

              {/* Brand Center Emblem matching screenshot */}
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
                <h2 className="text-base font-extrabold tracking-wider uppercase text-white drop-shadow">
                  QUEMYDJ
                </h2>
                <span className="text-[11px] text-white/85 font-medium">
                  {role === 'guest' ? 'Club Guest App' : 'Resident Booth Console'}
                </span>
              </div>
            </div>

            {/* Bottom Form Sheet: High-contrast elevated card container */}
            <div className="flex-1 px-5 sm:px-6 pt-3 pb-6 flex flex-col justify-between">
              
              {/* Elevated Card Form Container */}
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-black/[0.06] my-auto">
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

                {/* FORM FIELDS (High-contrast clean rounded input containers) */}
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

                    {/* Terms & Privacy Checkbox for Signup */}
                    {authTab === 'signup' && (
                      <div className="pt-1 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="terms-guest"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#07241b] focus:ring-[#07241b] border-gray-300 accent-[#07241b] cursor-pointer"
                        />
                        <label htmlFor="terms-guest" className="text-[11px] text-[#4a4539] leading-tight select-none">
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

                    {/* Forgot Password link */}
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

                    {/* Submit Button */}
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
                  /* DJ ACCOUNT FORM (Clean Email & Password, No Strange Jargon) */
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

                    {/* DJ Terms & Privacy Agreement on Signup */}
                    {authTab === 'signup' && (
                      <div className="pt-1 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="terms-dj"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#07241b] focus:ring-[#07241b] border-gray-300 accent-[#07241b] cursor-pointer"
                        />
                        <label htmlFor="terms-dj" className="text-[11px] text-[#4a4539] leading-tight select-none">
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
                  QUEMYDJ &bull; Night Club Requests &amp; Live Console
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 1: FORGOT PASSWORD (FOR BOTH USERS & DJS)               */}
        {/* ============================================================== */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                  Enter your registered email address and we'll send you a secure link to create a new password.
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
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full mt-2 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!forgotEmail.trim()) return;
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
                    className="w-full h-11 rounded-xl bg-[#07241b] hover:bg-[#0c3529] text-white font-bold text-xs uppercase tracking-wider transition-all"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                      All songs requested on QUEMYDJ are subject to DJ queue discretion and venue programming. If a request cannot be played or is declined by the DJ, 100% of the funds are credited back to the guest wallet or refunded immediately.
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
                      QUEMYDJ values your privacy. We collect your phone number and email solely for song receipt notifications, wallet management, and account recovery.
                    </p>
                    <p className="font-semibold text-zinc-800">2. Payment Security</p>
                    <p>
                      All credit/debit transactions and Paystack deposits are processed with PCI-DSS banking level encryption. QUEMYDJ never stores raw card details.
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
    </div>
  );
}
