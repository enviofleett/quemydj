'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import {
  QrCode,
  Camera,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export default function QRScannerPage() {
  const router = useRouter();
  const { djs } = useCueApp();

  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Available live sessions
  const availableSessions = djs
    .filter((d) => d.liveSession)
    .map((d) => ({
      code: d.liveSession!.passcode,
      dj: d,
      session: d.liveSession!,
    }));

  const handleResolveCode = (codeToTest: string) => {
    const cleanCode = codeToTest.trim().toUpperCase();
    const matched = availableSessions.find(
      (s) => s.code.toUpperCase() === cleanCode
    );

    if (matched) {
      setErrorMessage('');
      router.push(`/sessions/${matched.session.id}`);
    } else {
      setErrorMessage(
        `Code "${cleanCode}" was not recognized. Try one of the active venue codes below.`
      );
    }
  };

  const simulateCameraScan = (code: string) => {
    setIsScanning(false);
    setTimeout(() => {
      handleResolveCode(code);
    }, 400);
  };

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/discover"
          className="p-2 rounded-xl bg-[#131b26] border border-[#233044] text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Event QR Access</h1>
          <p className="text-xs text-slate-400">
            Scan booth QR or enter event access code
          </p>
        </div>
      </div>

      {/* Simulated Scanner Viewport */}
      <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/40 shadow-2xl flex flex-col items-center justify-between p-6">
        {/* Background scanning simulation graphic */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        {/* Animated Scanner Laser */}
        <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse" />

        {/* Corner Targeting Brackets */}
        <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
        <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

        {/* Scanning status banner */}
        <div className="relative z-10 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-emerald-400" />
          <span>Point camera at DJ booth QR</span>
        </div>

        {/* Center Mock QR Target */}
        <div className="relative z-10 w-44 h-44 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-4 text-center">
          <QrCode className="w-20 h-20 text-emerald-400/80 mb-2 animate-pulse" />
          <p className="text-[11px] text-slate-300">
            Auto-detecting QR watermark
          </p>
        </div>

        {/* Quick tap mock action */}
        <div className="relative z-10 w-full space-y-1">
          <button
            onClick={() => simulateCameraScan('SKY99')}
            className="w-full py-2 bg-emerald-500/90 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            [Simulate Scan: Skyline Rooftop]
          </button>
        </div>
      </div>

      {/* Manual Code Entry Form */}
      <div className="bg-[#111722] border border-[#233044] rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Or enter DJ Event Code manually</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Event passcodes are shown on table tents and projector screens.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleResolveCode(manualCode);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="e.g. SKY99 or PULSE"
            maxLength={10}
            className="flex-1 px-4 py-2.5 bg-[#161f2e] border border-[#26354c] focus:border-emerald-500 rounded-xl text-sm font-mono uppercase tracking-widest text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="px-5 py-2.5 bg-emerald-500 disabled:opacity-50 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <span>Enter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Sample QR Codes for Prototype Demo Reviewers */}
      <div className="bg-[#0f1520] border border-[#233044] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Demo Event Codes for Instant Testing:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {availableSessions.map(({ code, dj, session }) => (
            <button
              key={code}
              onClick={() => handleResolveCode(code)}
              className="text-left p-3 rounded-xl bg-[#151e2b] hover:bg-[#1a2637] border border-[#25344a] flex items-center justify-between group transition-all"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {code}
                  </span>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                    {dj.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate max-w-[200px]">
                  {session.title}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
