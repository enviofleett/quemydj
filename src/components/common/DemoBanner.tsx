'use client';

import React from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { Sparkles, RefreshCw, UserCheck, Disc3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const DemoBanner: React.FC = () => {
  const { userRole, setUserRole, resetDemoData } = useCueApp();
  const router = useRouter();

  const handleRoleSwitch = (newRole: 'guest' | 'dj') => {
    setUserRole(newRole);
    if (newRole === 'dj') {
      router.push('/dj/queue');
    } else {
      router.push('/discover');
    }
  };

  return (
    <aside aria-label="Interactive Demo Controls" className="sticky top-0 z-50 bg-[#0d131d]/95 backdrop-blur-md border-b border-[#233044] px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Interactive Demo Mode</span>
        </span>
        <span className="hidden sm:inline text-slate-400">
          Shared state active across Guest & DJ views.
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Switcher Pill */}
        <div className="flex items-center bg-[#182232] rounded-full p-0.5 border border-[#2a3a52]">
          <button
            onClick={() => handleRoleSwitch('guest')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              userRole === 'guest'
                ? 'bg-emerald-500 text-black shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Guest View
          </button>
          <button
            onClick={() => handleRoleSwitch('dj')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              userRole === 'dj'
                ? 'bg-amber-400 text-black shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            DJ Workspace
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset demo state back to default requests and settings?')) {
              resetDemoData();
            }
          }}
          title="Reset sample requests to default"
          className="text-slate-400 hover:text-white p-1 hover:bg-[#1f2c40] rounded transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
