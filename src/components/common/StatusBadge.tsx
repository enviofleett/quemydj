import React from 'react';
import { RequestStatus } from '@/types';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config: Record<
    RequestStatus,
    { label: string; classes: string; dotColor: string; pulse?: boolean }
  > = {
    awaiting_payment: {
      label: 'Awaiting Payment',
      classes: 'bg-zinc-800 text-zinc-400',
      dotColor: 'bg-zinc-500',
    },
    payment_confirmed: {
      label: 'Payment Verified',
      classes: 'bg-emerald-500/15 text-emerald-400 font-medium',
      dotColor: 'bg-emerald-400',
    },
    new_request: {
      label: 'New Request',
      classes: 'bg-amber-500/15 text-amber-300 font-semibold',
      dotColor: 'bg-amber-400',
      pulse: true,
    },
    waiting: {
      label: 'Pending',
      classes: 'bg-amber-500/10 text-amber-800',
      dotColor: 'bg-amber-500',
    },
    accepted: {
      label: 'Accepted',
      classes: 'bg-blue-500/15 text-blue-400 font-medium',
      dotColor: 'bg-blue-500',
    },
    preparing: {
      label: 'Preparing',
      classes: 'bg-purple-500/15 text-purple-400 font-medium',
      dotColor: 'bg-purple-400',
      pulse: true,
    },
    ready_to_play: {
      label: 'Ready to Play',
      classes: 'bg-emerald-500/20 text-emerald-300 font-semibold',
      dotColor: 'bg-emerald-400',
    },
    playing: {
      label: 'Now Playing',
      classes: 'bg-emerald-500/20 text-emerald-400 font-semibold ring-1 ring-emerald-500/30',
      dotColor: 'bg-emerald-400',
      pulse: true,
    },
    played: {
      label: 'Played',
      classes: 'bg-zinc-800 text-zinc-400',
      dotColor: 'bg-zinc-500',
    },
    declined: {
      label: 'Declined',
      classes: 'bg-red-500/15 text-red-400',
      dotColor: 'bg-red-500',
    },
    unavailable: {
      label: 'Unavailable',
      classes: 'bg-rose-500/15 text-rose-400',
      dotColor: 'bg-rose-400',
    },
    refund_pending: {
      label: 'Refund Pending',
      classes: 'bg-orange-500/15 text-orange-400',
      dotColor: 'bg-orange-400',
      pulse: true,
    },
    refunded: {
      label: 'Refunded',
      classes: 'bg-zinc-800 text-zinc-400',
      dotColor: 'bg-zinc-500',
    },
  };

  const item = config[status] || config.waiting;

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-medium tracking-tight whitespace-nowrap ${item.classes}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dotColor} ${
          item.pulse ? 'animate-pulse' : ''
        }`}
      />
      <span>{item.label}</span>
    </span>
  );
};
