export type RequestStatus =
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'new_request'
  | 'accepted'
  | 'preparing'
  | 'ready_to_play'
  | 'playing'
  | 'played'
  | 'declined'
  | 'unavailable'
  | 'refund_pending'
  | 'refunded'
  // Backward compatibility alias:
  | 'waiting';

export type TrackAvailability =
  | 'in_library' // Stored in DJ's local audio crate
  | 'authorized_provider' // Playable streaming preview/authorized audio
  | 'discovery_only' // Metadata only / requires local import
  | 'unavailable'; // Restricted or licensing violation

export type AudioQualityTier = 'High' | 'Standard' | 'Low' | 'Unknown';

export interface AudioMetadata {
  bitrate?: number; // kbps (e.g., 320, 256, 128)
  sampleRate?: number; // Hz (e.g., 44100, 48000)
  format?: string; // mp3, wav, flac, aac
  qualityTier: AudioQualityTier;
  bpm?: number;
  key?: string; // e.g. "8A", "11B", "C Minor"
  energy?: number; // 1 to 10
  isVBR?: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationMs?: number;
  coverUrl: string;
  genre: string;
  releaseYear: number;
  bpm?: number;
  musicalKey?: string;
  previewUrl?: string; // Playable audio stream / object URL
  source?: 'catalog' | 'itunes' | 'youtube' | 'local_library';
  externalUrl?: string;
  youtubeVideoId?: string;
  availability?: TrackAvailability;
  audioMetadata?: AudioMetadata;
  audioFile?: File; // Local imported file if available
  waveformPeaks?: number[]; // Normalized waveform peak array
}

export interface DJ {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  genres: string[];
  rating: number;
  totalSets: number;
  instagram?: string;
  currentVenue: {
    name: string;
    city: string;
    distance: string;
    address: string;
    lat: number;
    lng: number;
  };
  liveSession?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    isAcceptingRequests: boolean;
    basePrice: number; // in NGN (Naira ₦)
    serviceFee: number; // in NGN (Naira ₦)
    minimumVibeBPM?: number;
    requestRules: string[];
    passcode: string;
    announcement?: string;
  };
}

export interface SongRequest {
  id: string;
  referenceCode: string; // e.g. CMDJ-8821
  sessionId: string;
  djId: string;
  djName: string;
  djAvatar: string;
  venueName: string;
  song: Song;
  guestName: string;
  guestNote?: string;
  amount: number;
  serviceFee: number;
  total: number;
  status: RequestStatus;
  createdAt: string; // ISO string
  updatedAt: string;
  declineReason?: string;
  refundTxId?: string;
  refundedAt?: string;
  feedbackGiven?: 'played_confirmed' | 'reported_problem';
  feedbackNote?: string;
  paidVia: 'Apple Pay' | 'Credit Card' | 'Cash App' | 'Demo Wallet';
  paymentVerifiedServerSide?: boolean;
}

export type QueueRecommendationMatch = 'Excellent Match' | 'Good Match' | 'Possible Transition' | 'Requires DJ Review';

export interface SmartQueueRecommendation {
  requestId: string;
  matchScore: number; // 0 to 100
  matchTier: QueueRecommendationMatch;
  bpmDelta: number;
  isHarmonicKey: boolean;
  qualityWarning?: string;
  reason: string;
}

export interface DJEarningsSummary {
  todayTotal: number;
  sessionTotal: number;
  pendingPayout: number;
  completedPayouts: number;
  totalRequestsCount: number;
  acceptedCount: number;
  declinedCount: number;
  recentTransactions: {
    id: string;
    ref: string;
    amount: number;
    fee: number;
    net: number;
    time: string;
    status: 'completed' | 'refunded';
    songTitle: string;
  }[];
}

export interface GuestUser {
  id: string;
  name: string;
  phoneOrEmail: string;
  isRegistered: boolean;
  walletBalance: number; // in NGN (₦)
  createdAt: string;
}

export interface AuthSession {
  userType: 'guest' | 'dj' | null;
  djId?: string;
  guestId?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'request_payment' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
  reference: string;
}
