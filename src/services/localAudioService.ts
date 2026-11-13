import { Song, AudioMetadata } from '@/types';
import { evaluateAudioQuality } from './smartQueueService';

/**
 * Extracts audio waveform peaks, duration, sample rate, channels,
 * and detects approximate BPM using peak energy autocorrelation.
 */
export async function analyzeLocalAudioFile(
  file: File,
  audioContext: AudioContext
): Promise<{
  metadata: AudioMetadata;
  durationFormatted: string;
  durationMs: number;
  waveformPeaks: number[];
  detectedBpm?: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const durationSec = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;

  // Approximate bitrate calculation from file size and duration:
  // Bitrate (bps) = (file.size * 8) / duration
  const calculatedBitrateKbps = Math.round((file.size * 8) / durationSec / 1000);
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'audio';
  const qualityTier = evaluateAudioQuality(calculatedBitrateKbps, fileExt);

  // Extract 100 normalized waveform peaks for Canvas rendering
  const rawData = audioBuffer.getChannelData(0);
  const totalSamples = rawData.length;
  const step = Math.floor(totalSamples / 100);
  const waveformPeaks: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j += 10) {
      const val = Math.abs(rawData[start + j] || 0);
      if (val > max) max = val;
    }
    waveformPeaks.push(Math.min(1.0, max));
  }

  // Basic BPM estimation via peak thresholding & energy intervals
  const detectedBpm = estimateBpmFromBuffer(audioBuffer);

  const mins = Math.floor(durationSec / 60);
  const secs = Math.floor(durationSec % 60);
  const durationFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return {
    metadata: {
      bitrate: calculatedBitrateKbps,
      sampleRate,
      format: fileExt.toUpperCase(),
      qualityTier,
      bpm: detectedBpm,
      energy: Math.min(10, Math.round((waveformPeaks.reduce((a, b) => a + b, 0) / 100) * 15)),
    },
    durationFormatted,
    durationMs: Math.round(durationSec * 1000),
    waveformPeaks,
    detectedBpm,
  };
}

/**
 * Heuristic BPM estimation by analyzing peak intervals in downsampled audio.
 */
function estimateBpmFromBuffer(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  // Scan a 20-second window in the middle of the track
  const startOffset = Math.floor(data.length * 0.25);
  const scanSamples = Math.min(data.length - startOffset, sampleRate * 20);

  const threshold = 0.65;
  const peaks: number[] = [];

  for (let i = 0; i < scanSamples; i += 200) {
    const val = Math.abs(data[startOffset + i]);
    if (val > threshold) {
      peaks.push((startOffset + i) / sampleRate);
      i += Math.floor(sampleRate * 0.2); // Skip 200ms to avoid re-triggering on same beat
    }
  }

  if (peaks.length < 4) return 120; // Default fallback

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  let rawBpm = Math.round(60 / avgInterval);

  // Normalize into standard DJ range (85 - 165 BPM)
  while (rawBpm < 85) rawBpm *= 2;
  while (rawBpm > 165) rawBpm = Math.round(rawBpm / 2);

  return rawBpm || 124;
}

/**
 * Creates a playable local Song record from an uploaded user File
 */
export async function createLocalSongFromFile(
  file: File,
  audioContext: AudioContext
): Promise<Song> {
  const analysis = await analyzeLocalAudioFile(file, audioContext);
  const objectUrl = URL.createObjectURL(file);

  // Clean filename for artist / title heuristic (e.g. "Drake - God's Plan.mp3")
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const parts = baseName.split(' - ');
  const artist = parts.length > 1 ? parts[0].trim() : 'Local Artist';
  const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : baseName;

  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    artist,
    album: 'Imported Library',
    duration: analysis.durationFormatted,
    durationMs: analysis.durationMs,
    coverUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    genre: 'DJ Crate',
    releaseYear: new Date().getFullYear(),
    bpm: analysis.detectedBpm || 124,
    previewUrl: objectUrl,
    source: 'local_library',
    availability: 'in_library',
    audioMetadata: analysis.metadata,
    audioFile: file,
    waveformPeaks: analysis.waveformPeaks,
  };
}
