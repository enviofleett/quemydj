'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import {
  Sliders,
  DollarSign,
  Clock,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  QrCode,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

export default function DJSessionManagementPage() {
  const { currentDj, updateDjSessionDetails, themeMode, toggleThemeMode } = useCueApp();
  const session = currentDj.liveSession!;

  const [title, setTitle] = useState(session.title);
  const [basePrice, setBasePrice] = useState(session.basePrice.toString());
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [announcement, setAnnouncement] = useState(session.announcement || '');
  const [passcode, setPasscode] = useState(session.passcode);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateDjSessionDetails({
      title,
      basePrice: parseFloat(basePrice) || 5000,
      startTime,
      endTime,
      announcement,
      passcode: passcode.toUpperCase(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Session Configuration & Request Rules
          </h1>
          <p className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">
            Adjust live pricing, set time windows, and public venue rules.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleThemeMode}
          title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#111722] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
        >
          {themeMode === 'light' ? (
            <Moon className="w-4 h-4 text-indigo-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Session Meta */}
        <div className="bg-white dark:bg-[#111722] border border-zinc-200 dark:border-[#233044] rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Active Live Session Details</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
                Session Event Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#16202f] border border-zinc-300 dark:border-[#26354c] focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
                  Start Time
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-[#16202f] border border-zinc-300 dark:border-[#26354c] focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
                  End Time
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-[#16202f] border border-zinc-300 dark:border-[#26354c] focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
                  Event Passcode (QR alternative)
                </label>
                <input
                  type="text"
                  value={passcode}
                  maxLength={8}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-[#16202f] border border-zinc-300 dark:border-[#26354c] focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs font-mono font-bold uppercase text-amber-600 dark:text-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Fee Structure */}
        <div className="bg-white dark:bg-[#111722] border border-zinc-200 dark:border-[#233044] rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Request Pricing & Minimums</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
                Base Track Request Price (₦ NGN)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-slate-400 font-bold">
                  ₦
                </span>
                <input
                  type="number"
                  step="500"
                  min="500"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 dark:bg-[#16202f] border border-zinc-300 dark:border-[#26354c] focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Recommended: ₦3,000 - ₦10,000 during peak midnight club sets.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
                Platform Processing Fee (Fixed)
              </label>
              <div className="px-4 py-2.5 bg-zinc-100 dark:bg-[#141b26] border border-zinc-200 dark:border-[#233044] rounded-xl text-xs font-semibold text-zinc-600 dark:text-slate-400">
                ₦{session.serviceFee.toLocaleString()} NGN (Paid by guest)
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Covers Paystack interchange & automated escrow settlement.
              </span>
            </div>
          </div>
        </div>

        {/* Booth Announcement Banner */}
        <div className="bg-white dark:bg-[#111722] border border-zinc-200 dark:border-[#233044] rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <span>Booth Announcement for Guests</span>
          </h2>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-slate-300 block mb-1">
              Public Note on Request Screen
            </label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Taking high-energy tracks only! Keep the dancefloor alive till 3 AM 🚀"
              rows={2}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#16202f] border border-zinc-300 dark:border-[#26354c] focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none resize-none"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Session rules and pricing updated successfully!</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes to Live Session</span>
        </button>
      </form>
    </div>
  );
}
