'use client';

import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  peaks?: number[];
  progress: number; // 0 to 100
  color: string;
  glowColor: string;
  height?: number;
  isLooping?: boolean;
  loopStartPct?: number;
  loopEndPct?: number;
  onSeek?: (percentage: number) => void;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  peaks = [],
  progress,
  color,
  glowColor,
  height = 56,
  isLooping = false,
  loopStartPct = 0,
  loopEndPct = 100,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate synthetic peaks if track doesn't have an extracted array yet
  const effectivePeaks =
    peaks.length > 20
      ? peaks
      : Array.from({ length: 120 }, (_, i) => {
          const sinVal = Math.sin(i * 0.15) * 0.35 + 0.45;
          const noise = ((i * 13) % 19) / 70;
          return Math.min(1.0, Math.max(0.1, sinVal + noise));
        });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    const barCount = effectivePeaks.length;
    const barWidth = width / barCount;
    const currentProgressIdx = Math.floor((progress / 100) * barCount);

    // Loop Region Overlay
    if (isLooping && loopEndPct > loopStartPct) {
      const loopStartX = (loopStartPct / 100) * width;
      const loopEndX = (loopEndPct / 100) * width;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, h);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(loopStartX, 0);
      ctx.lineTo(loopStartX, h);
      ctx.moveTo(loopEndX, 0);
      ctx.lineTo(loopEndX, h);
      ctx.stroke();
    }

    // Draw audio bars
    effectivePeaks.forEach((peak, i) => {
      const barH = Math.max(4, peak * (h - 8));
      const x = i * barWidth;
      const y = (h - barH) / 2;

      const isPlayed = i <= currentProgressIdx;

      if (isPlayed) {
        ctx.fillStyle = color;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 6;
      } else {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        ctx.fillStyle = isLight ? 'rgba(100, 116, 139, 0.35)' : 'rgba(255, 255, 255, 0.18)';
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(x + 1, y, Math.max(1.5, barWidth - 1.5), barH);
    });

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw Needle Scrubber Playhead
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const playheadX = (progress / 100) * width;
    ctx.strokeStyle = isLightMode ? '#0f172a' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // Playhead center pip
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(playheadX, h / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }, [effectivePeaks, progress, color, glowColor, isLooping, loopStartPct, loopEndPct]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onSeek(pct);
  };

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={height}
      onClick={handleCanvasClick}
      className="w-full h-full cursor-pointer rounded-lg bg-[var(--dj-waveform-bg)] border border-[var(--dj-border-subtle)] select-none transition-colors"
    />
  );
};
