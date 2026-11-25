export interface VenueCommissionSplit {
  venuePercentage: number; // e.g. 20 (20%)
  djPercentage: number;    // e.g. 70 (70%)
  platformPercentage: number; // e.g. 10 (10%)
}

export interface ClubVenue {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  coverImage: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  commissionSplit: VenueCommissionSplit;
  activeDjId?: string;
  status: 'active' | 'pending' | 'suspended';
  rating: number;
  totalRevenueGenerated: number;
  totalCommissionPaid: number;
  paystackSubaccountCode?: string;
  paystackSplitCode?: string;
  paystackRecipientCode?: string;
  lastSettledAt?: string;
}

export interface DisputeRecord {
  id: string;
  requestId: string;
  referenceCode: string;
  venueId?: string;
  djId?: string;
  guestName: string;
  djName: string;
  venueName: string;
  songTitle: string;
  amount: number;
  reason: string;
  status: 'open' | 'refunded' | 'resolved_to_dj';
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  refundReference?: string;
}

export interface VenueEarningsReport {
  venueId: string;
  venueName: string;
  tonightGrossRevenue: number;
  tonightVenueCommission: number;
  tonightDjPayout: number;
  tonightPlatformFee: number;
  totalRequestsCount: number;
  acceptedCount: number;
  declinedCount: number;
  activeDjName: string;
  nextPayoutDate: string;
}
