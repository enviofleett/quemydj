'use client';

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, Flashlight } from 'lucide-react';

interface LiveQrCameraScannerProps {
  onScanSuccess: (decodedText: string) => boolean | void;
}

export const LiveQrCameraScanner: React.FC<LiveQrCameraScannerProps> = ({
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<
    'starting' | 'active' | 'denied' | 'detected' | 'invalid'
  >('starting');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
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
        setTorchSupported(false);
        setTorchOn(false);

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

        streamRef.current = stream;

        // Detect hardware flashlight/torch capability for dark clubs
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          const caps = videoTrack.getCapabilities() as MediaTrackCapabilities & {
            torch?: boolean;
          };
          if (caps && caps.torch && isMounted) {
            setTorchSupported(true);
          }
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
          // attemptBoth handles standard dark-on-light AND inverted white-on-black club screen QRs
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data && code.data.trim()) {
            hasScannedRef.current = true;

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try {
                navigator.vibrate(40);
              } catch {}
            }

            const accepted = onScanSuccess(code.data.trim());
            if (accepted === false) {
              setCameraState('invalid');
              setTimeout(() => {
                if (!isMounted) return;
                hasScannedRef.current = false;
                setCameraState('active');
                animationFrameId = requestAnimationFrame(scanFrame);
              }, 1600);
              return;
            }

            setCameraState('detected');
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
      streamRef.current = null;
    };
  }, [facingMode, onScanSuccess]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const next = !torchOn;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {}
  };

  return (
    <div className="aspect-square rounded-2xl bg-zinc-950 relative flex flex-col items-center justify-center overflow-hidden border border-black/10 dark:border-white/10">
      {/* Live Video Element */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          cameraState === 'active' || cameraState === 'detected' || cameraState === 'invalid'
            ? 'opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* Hidden Canvas for jsQR Frame Decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Vignette & Framing Reticle Overlay */}
      <div className="relative z-10 w-52 h-52 flex items-center justify-center pointer-events-none">
        <div
          className={`absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] rounded-tl-xl transition-colors ${
            cameraState === 'detected'
              ? 'border-emerald-400'
              : cameraState === 'invalid'
              ? 'border-rose-400'
              : 'border-white'
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] rounded-tr-xl transition-colors ${
            cameraState === 'detected'
              ? 'border-emerald-400'
              : cameraState === 'invalid'
              ? 'border-rose-400'
              : 'border-white'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] rounded-bl-xl transition-colors ${
            cameraState === 'detected'
              ? 'border-emerald-400'
              : cameraState === 'invalid'
              ? 'border-rose-400'
              : 'border-white'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] rounded-br-xl transition-colors ${
            cameraState === 'detected'
              ? 'border-emerald-400'
              : cameraState === 'invalid'
              ? 'border-rose-400'
              : 'border-white'
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

        {cameraState === 'invalid' && (
          <div className="flex flex-col items-center gap-1.5 bg-zinc-950/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-rose-500/40 text-center">
            <AlertCircle className="w-6 h-6 text-rose-400" />
            <span className="text-[12px] font-semibold text-white">Not a QueMyDJ Booth QR</span>
          </div>
        )}
      </div>

      {/* Bottom Status & Hardware Controls */}
      {cameraState === 'active' && (
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/75 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Point at booth QR code</span>
          </div>

          <div className="flex items-center gap-1.5">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors cursor-pointer ${
                  torchOn
                    ? 'bg-amber-400 text-zinc-950 border-amber-300'
                    : 'bg-zinc-950/75 text-white border-white/15 hover:bg-zinc-900'
                }`}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleCamera}
              aria-label="Flip camera"
              className="w-9 h-9 rounded-full bg-zinc-950/75 hover:bg-zinc-900 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
