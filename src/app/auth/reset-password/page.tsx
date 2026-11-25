'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Lock, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/services/supabaseClient';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check for email in query params
    const queryEmail = searchParams?.get('email');
    if (queryEmail) {
      setEmail(queryEmail);
    }

    // 2. Listen to Supabase auth state if user came from recovery link hash token
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      }).catch(() => {});

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session?.user?.email) {
          if (session?.user?.email) {
            setEmail(session.user.email);
          }
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      // 1. If active Supabase session from recovery token, update directly via client
      const supabase = getSupabaseClient();
      let clientUpdated = false;

      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const { error: updateErr } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (!updateErr) {
            clientUpdated = true;
          }
        }
      }

      // 2. Also ensure backend service client updates password in all records
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          newPassword,
          userType: 'user',
        }),
      });

      const data = await res.json();

      if (!res.ok && !clientUpdated) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess(true);
      setTimeout(() => {
        // Direct returning guests to requests dashboard or wallet
        const nextUrl = searchParams?.get('redirect') || '/requests';
        router.push(nextUrl);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while updating your password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-black/[0.06] space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-xs border border-zinc-200/40">
              <Image
                src="/brand-logo-transparent.png"
                alt="QueMyDJ"
                width={36}
                height={36}
                priority
                className="object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-zinc-950 group-hover:text-emerald-600 transition-colors leading-tight">
                QueMyDJ
              </span>
              <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider -mt-0.5">
                Powered by Zenbeatz
              </span>
            </div>
          </Link>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            SECURE RESET
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950">
            Set Your New Password
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Please enter and confirm your new secure password below to regain full access to your account.
          </p>
        </div>

        {success ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-emerald-950">Password Updated Successfully!</h2>
              <p className="text-xs text-emerald-700">
                Your new password is now active. Redirecting you to sign in...
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Go to Sign In Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Email Field (prefilled or editable) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-xs font-medium py-2.5 px-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full text-xs font-medium py-2.5 pl-10 pr-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full text-xs font-medium py-2.5 pl-10 pr-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#07241b] hover:bg-[#0c3529] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Save New Password
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-zinc-100">
          <Link
            href="/login"
            className="text-xs font-bold text-zinc-600 hover:text-emerald-700 transition-colors"
          >
            &larr; Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
