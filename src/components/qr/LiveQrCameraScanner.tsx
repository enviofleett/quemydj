'use client';

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LiveQrCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export const LiveQrCameraScanner: React.FC<LiveQrCameraScannerProps> = ({
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'denied' | 'detected'>(
    'starting'
  );
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const hasScannedRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let isMounted = true;
    hasScannedRef.current = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) setCameraState('denied');
        return;
      }

      try {
        setCameraState('starting');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();
          if (isMounted) setCameraState('active');
          animationFrameId = requestAnimationFrame(scanFrame);
        }
      } catch {
        if (isMounted) setCameraState('denied');
      }
    };

    const scanFrame = () => {
      if (!isMounted || hasScannedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim()) {
            hasScannedRef.current = true;
            setCameraState('detected');

            // Haptic vibration on supported Android devices
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try {
                navigator.vibrate(40);
              } catch {}
            }

            setTimeout(() => {
              if (isMounted) {
                onScanSuccess(code.data.trim());
              }
            }, 250);
            return;
          }
        }
      }

      animationFrameId = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, onScanSuccess]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="aspect-square rounded-2xl bg-zinc-950 relative flex flex-col items-center justify-center overflow-hidden border border-black/10">
      {/* Live Video Element */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          cameraState === 'active' || cameraState === 'detected' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Hidden Canvas for 60fps jsQR Frame Decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Vignette & Framing Reticle Overlay */}
      <div className="relative z-10 w-52 h-52 flex items-center justify-center pointer-events-none">
        <div
          className={`absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] rounded-tl-xl transition-colors ${
            cameraState === 'detected' ? 'border-emerald-400' : 'border-white'
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] rounded-tr-xl transition-colors ${
            cameraState === 'detected' ? 'border-emerald-400' : 'border-white'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] rounded-bl-xl transition-colors ${
            cameraState === 'detected' ? 'border-emerald-400' : 'border-white'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] rounded-br-xl transition-colors ${
            cameraState === 'detected' ? 'border-emerald-400' : 'border-white'
          }`}
        />

        {cameraState === 'starting' && (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <Camera className="w-8 h-8 animate-pulse" />
            <span className="text-[12px] font-medium">Starting camera...</span>
          </div>
        )}

        {cameraState === 'denied' && (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <AlertCircle className="w-8 h-8 text-zinc-400" />
            <span className="text-[13px] font-medium text-white">
              Camera preview unavailable
            </span>
            <span className="text-[11px] text-zinc-400 leading-snug">
              Select a live booth below or enter the table passcode
            </span>
          </div>
        )}

        {cameraState === 'detected' && (
          <div className="flex flex-col items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-500/40">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            <span className="text-[13px] font-semibold text-white">Booth Connected</span>
          </div>
        )}
      </div>

      {/* Bottom Status Pill & Flip Camera Button */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between">
        <span className="h-7 px-3 rounded-full bg-zinc-950/75 backdrop-blur-md text-[12px] font-medium text-white inline-flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cameraState === 'active'
                ? 'bg-emerald-400 animate-pulse'
                : cameraState === 'detected'
                ? 'bg-emerald-400'
                : 'bg-zinc-400'
            }`}
          />
          <span>
            {cameraState === 'active'
              ? 'Point at booth QR code'
              : cameraState === 'detected'
              ? 'QR Code recognized'
              : 'Passcode entry ready'}
          </span>
        </span>

        {cameraState === 'active' && (
          <button
            type="button"
            onClick={toggleCamera}
            aria-label="Flip camera"
            className="w-8 h-8 rounded-full bg-zinc-950/75 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
