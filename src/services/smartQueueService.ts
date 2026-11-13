import { Song, SongRequest, SmartQueueRecommendation, AudioQualityTier } from '@/types';
import { areKeysHarmonic, normalizeCamelotKey } from '@/utils/harmonicKeys';

/**
 * Evaluates audio quality tier based on format and bitrate.
 * Configurable thresholds rather than static assumptions.
 */
export function evaluateAudioQuality(bitrate?: number, format?: string): AudioQualityTier {
  if (!bitrate && !format) return 'Unknown';

  const fmt = (format || '').toLowerCase();
  // Lossless formats (WAV, FLAC, AIFF)
  if (fmt.includes('wav') || fmt.includes('flac') || fmt.includes('aiff')) {
    return 'High';
  }

  // Lossy formats (MP3, AAC, M4A)
  if (bitrate) {
    if (bitrate >= 256) return 'High';
    if (bitrate >= 192) return 'Standard';
    return 'Low';
  }

  return 'Standard';
}

/**
 * Analyzes an accepted customer request against the currently active playing track
 * and generates multi-dimensional compatibility recommendations for Smart Queue.
 */
export function analyzeTrackCompatibility(
  currentTrack: Song | null,
  candidateRequest: SongRequest
): SmartQueueRecommendation {
  const candidateSong = candidateRequest.song;

  // Base state if no track is currently playing
  if (!currentTrack) {
    return {
      requestId: candidateRequest.id,
      matchScore: 80,
      matchTier: 'Good Match',
      bpmDelta: 0,
      isHarmonicKey: true,
      reason: 'No active track playing. Eligible to start your set.',
    };
  }

  let score = 50;
  const reasons: string[] = [];

  // 1. Availability gatekeeper
  const isAvailable =
    candidateSong.availability === 'in_library' ||
    candidateSong.availability === 'authorized_provider' ||
    Boolean(candidateSong.previewUrl);

  if (!isAvailable) {
    return {
      requestId: candidateRequest.id,
      matchScore: 10,
      matchTier: 'Requires DJ Review',
      bpmDelta: 0,
      isHarmonicKey: false,
      reason: 'Track is Discovery Only. Import audio file into DJ library before loading.',
    };
  }

  // 2. BPM Matching
  let bpmDelta = 0;
  if (currentTrack.bpm && candidateSong.bpm) {
    bpmDelta = Math.abs(currentTrack.bpm - candidateSong.bpm);
    if (bpmDelta <= 2) {
      score += 25;
      reasons.push(`Exact BPM match (Δ${bpmDelta.toFixed(1)})`);
    } else if (bpmDelta <= 6) {
      score += 15;
      reasons.push(`Tight BPM match (Δ${bpmDelta.toFixed(1)})`);
    } else if (bpmDelta <= 12) {
      score += 5;
      reasons.push(`Blendable with pitch adjustment (Δ${bpmDelta.toFixed(1)})`);
    } else {
      score -= 10;
      reasons.push(`Tempo jump (Δ${bpmDelta.toFixed(1)} BPM)`);
    }
  }

  // 3. Harmonic Key Compatibility
  const keyA = currentTrack.musicalKey || currentTrack.audioMetadata?.key;
  const keyB = candidateSong.musicalKey || candidateSong.audioMetadata?.key;
  const isHarmonic = areKeysHarmonic(keyA, keyB);

  if (isHarmonic && keyA && keyB) {
    score += 20;
    const normA = normalizeCamelotKey(keyA);
    const normB = normalizeCamelotKey(keyB);
    reasons.push(`Harmonic key match (${normA} ➜ ${normB})`);
  } else if (keyA && keyB) {
    reasons.push(`Non-harmonic key shift (${keyA} to ${keyB})`);
  }

  // 4. Genre Continuity
  if (
    currentTrack.genre &&
    candidateSong.genre &&
    currentTrack.genre.toLowerCase() === candidateSong.genre.toLowerCase()
  ) {
    score += 10;
    reasons.push(`Consistent ${currentTrack.genre} groove`);
  }

  // 5. Audio Quality Assessment (Avoid jarring quality drops)
  const currentQuality = currentTrack.audioMetadata?.qualityTier || 'Standard';
  const candidateQuality = candidateSong.audioMetadata?.qualityTier || 'Standard';
  let qualityWarning: string | undefined;

  if (currentQuality === 'High' && candidateQuality === 'Low') {
    score -= 15;
    qualityWarning = 'Lower audio bitrate detected. Consider leveling master gain.';
    reasons.push('Audio fidelity step-down');
  } else if (candidateQuality === 'High') {
    score += 5;
    reasons.push('High fidelity audio file');
  }

  // 6. Request Tip / Priority weighting (Minor boost, does NOT override musical compatibility)
  if (candidateRequest.amount >= 20) {
    score += 8;
  } else if (candidateRequest.amount >= 10) {
    score += 4;
  }

  // Determine Match Tier
  const finalScore = Math.max(0, Math.min(100, score));
  let matchTier: SmartQueueRecommendation['matchTier'];

  if (finalScore >= 80) {
    matchTier = 'Excellent Match';
  } else if (finalScore >= 65) {
    matchTier = 'Good Match';
  } else if (finalScore >= 45) {
    matchTier = 'Possible Transition';
  } else {
    matchTier = 'Requires DJ Review';
  }

  return {
    requestId: candidateRequest.id,
    matchScore: finalScore,
    matchTier,
    bpmDelta,
    isHarmonicKey: isHarmonic,
    qualityWarning,
    reason: reasons.length > 0 ? reasons.join(' · ') : 'Compatible transition',
  };
}
