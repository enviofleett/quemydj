'use client';

import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { DJ } from '@/types';
import { Download, Share2, Check, Copy } from 'lucide-react';

interface BoothQrPassSheetContentProps {
  dj: DJ;
  onClose?: () => void;
}

export const BoothQrPassSheetContent: React.FC<BoothQrPassSheetContentProps> = ({
  dj,
}) => {
  const session = dj.liveSession;
  const passcode = session?.passcode || 'SKY99';
  const basePrice = session?.basePrice ?? 15;
  const qrCanvasWrapRef = useRef<HTMLDivElement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?booth=${encodeURIComponent(passcode)}`
      : `https://cuemydj.app/?booth=${encodeURIComponent(passcode)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {}
  };

  const handleSharePass = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${dj.name} — Live Song Requests`,
          text: `Request songs live at ${dj.currentVenue.name} using code ${passcode}`,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    handleCopyLink();
  };

  const handleDownloadTableTent = () => {
    setDownloading(true);
    try {
      const sourceQrCanvas = qrCanvasWrapRef.current?.querySelector('canvas');
      if (!sourceQrCanvas) {
        setDownloading(false);
        return;
      }

      // Create high-DPI printable poster canvas (1080 x 1350 px)
      const poster = document.createElement('canvas');
      poster.width = 1080;
      poster.height = 1350;
      const ctx = poster.getContext('2d');
      if (!ctx) {
        setDownloading(false);
        return;
      }

      // 1. Matte Obsidian Background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, poster.width, poster.height);

      // Subtle inner border frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, poster.width - 96, poster.height - 96);

      // 2. Top Brand Pill
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CUEMYDJ · LIVE REQUEST BOOTH', poster.width / 2, 145);

      // 3. DJ Name & Venue Headline
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 68px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(dj.name, poster.width / 2, 245);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '500 34px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(dj.currentVenue.name, poster.width / 2, 305);

      // 4. White Rounded Card for Scannable QR Code
      const qrBoxSize = 540;
      const qrBoxX = (poster.width - qrBoxSize) / 2;
      const qrBoxY = 370;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 44);
      ctx.fill();

      // Draw actual QR code inside white card
      const qrPadding = 48;
      ctx.drawImage(
        sourceQrCanvas,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2
      );

      // 5. Passcode Footer Callout
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '500 30px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('SCAN WITH CAMERA OR ENTER TABLE CODE', poster.width / 2, 1005);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 88px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(passcode, poster.width / 2, 1110);

      ctx.fillStyle = '#71717a';
      ctx.font = '500 28px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(
        `₦${basePrice.toLocaleString()} per request · 100% refunded if not played`,
        poster.width / 2,
        1215
      );

      const dataUrl = poster.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${dj.handle.replace('@', '')}-${passcode}-booth-qr.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setTimeout(() => setDownloading(false), 400);
    }
  };

  return (
    <div className="space-y-4">
      {/* Apple Wallet-Style Booth Pass Card */}
      <div className="rounded-[24px] bg-zinc-950 text-white p-5 border border-white/10 shadow-lg space-y-4 text-center">
        <div className="space-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Live Booth Pass
          </span>
          <h4 className="text-[20px] font-bold tracking-tight text-white">
            {dj.name}
          </h4>
          <p className="text-[13px] text-zinc-400">{dj.currentVenue.name}</p>
        </div>

        {/* Real Scannable High-Contrast QR Code */}
        <div
          ref={qrCanvasWrapRef}
          className="w-48 h-48 rounded-2xl bg-white p-3.5 mx-auto flex items-center justify-center shadow-inner"
        >
          <QRCodeCanvas
            value={shareUrl}
            size={164}
            bgColor="#ffffff"
            fgColor="#09090b"
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Passcode & Rate Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-left px-1">
          <div>
            <span className="text-[11px] text-zinc-400 block">Table Passcode</span>
            <span className="text-[22px] font-mono font-bold text-emerald-400 tracking-tight">
              {passcode}
            </span>
          </div>
          <div className="text-right tabular-nums">
            <span className="text-[11px] text-zinc-400 block">Request Rate</span>
            <span className="text-[18px] font-bold text-white">
              ₦{basePrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Download Table Poster & Share Link */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleDownloadTableTent}
          disabled={downloading}
          className="h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Saving PNG...' : 'Save Table Poster'}</span>
        </button>

        <button
          type="button"
          onClick={handleSharePass}
          className="h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Link Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Booth Link</span>
            </>
          )}
        </button>
      </div>

      {/* Direct Copyable URL Row */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-black/[0.06] flex items-center justify-between text-[12px] text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <span className="font-mono truncate">{shareUrl}</span>
        <Copy className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
      </button>
    </div>
  );
};
