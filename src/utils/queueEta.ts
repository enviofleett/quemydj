import { SongRequest } from '@/types';

/**
 * Calculates estimated wait time for a request based on track durations of preceding songs.
 * Returns human-readable ETA (e.g. "~7 mins away (Est. 10:24 PM)").
 */
export function calculateQueueEta(
  targetRequest: SongRequest,
  allRequests: SongRequest[]
): {
  position: number;
  estimatedMinutes: number;
  formattedEta: string;
  clockTime: string;
} | null {
  if (targetRequest.status === 'playing') {
    return {
      position: 0,
      estimatedMinutes: 0,
      formattedEta: 'Playing right now',
      clockTime: 'Now',
    };
  }

  if (targetRequest.status === 'played' || targetRequest.status === 'declined' || targetRequest.status === 'refunded') {
    return null;
  }

  // Active queue: currently playing first, then accepted, then waiting
  const playing = allRequests.filter((r) => r.status === 'playing');
  const accepted = allRequests.filter((r) => r.status === 'accepted');
  const waiting = allRequests.filter((r) => r.status === 'waiting');

  const orderedQueue = [...playing, ...accepted, ...waiting];
  const targetIndex = orderedQueue.findIndex((r) => r.id === targetRequest.id);

  if (targetIndex === -1) return null;

  // Position in line
  const positionInLine = targetIndex + 1;

  // Sum durations of all songs ahead of this one
  const precedingSongs = orderedQueue.slice(0, targetIndex);
  let totalWaitSeconds = 0;

  precedingSongs.forEach((req) => {
    if (req.song.durationMs) {
      totalWaitSeconds += Math.round(req.song.durationMs / 1000);
    } else {
      // Default to 3.5 minutes if duration is not parsed
      totalWaitSeconds += 210;
    }
  });

  // Add 15s DJ transition buffer between tracks
  totalWaitSeconds += precedingSongs.length * 15;

  const estimatedMinutes = Math.max(1, Math.round(totalWaitSeconds / 60));

  const etaDate = new Date(Date.now() + estimatedMinutes * 60 * 1000);
  const clockTime = etaDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    position: positionInLine,
    estimatedMinutes,
    formattedEta: `~${estimatedMinutes} min${estimatedMinutes === 1 ? '' : 's'} away`,
    clockTime: `Est. ${clockTime}`,
  };
}
