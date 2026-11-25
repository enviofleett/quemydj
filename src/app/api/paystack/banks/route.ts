import { NextResponse } from 'next/server';
import { getPaystackConfig } from '@/services/paystackService';

export interface NigerianBank {
  name: string;
  code: string;
  slug: string;
}

const FALLBACK_NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Access Bank (Diamond)', code: '063', slug: 'access-bank-diamond' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank' },
  { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
  { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint-mfb-ng' },
  { name: 'OPay Digital Services', code: '999992', slug: 'paycom' },
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
  { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'Standard Chartered Bank', code: '068', slug: 'standard-chartered-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
  { name: 'United Bank for Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
  { name: 'Unity Bank', code: '215', slug: 'unity-bank' },
  { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
];

let cachedBanks: { data: NigerianBank[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export async function GET() {
  const { secretKey, mode, isConfigured } = getPaystackConfig();

  if (cachedBanks && Date.now() - cachedBanks.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      banks: cachedBanks.data,
      mode,
      source: isConfigured ? 'paystack' : 'fallback',
    });
  }

  if (isConfigured && secretKey) {
    try {
      const res = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status && Array.isArray(json.data) && json.data.length > 0) {
          const uniqueMap = new Map<string, NigerianBank>();
          for (const item of json.data) {
            if (item.active !== false && item.code && item.name && !uniqueMap.has(item.code)) {
              uniqueMap.set(item.code, {
                name: String(item.name).trim(),
                code: String(item.code).trim(),
                slug: String(item.slug || item.code).trim(),
              });
            }
          }
          const banks = Array.from(uniqueMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          cachedBanks = { data: banks, fetchedAt: Date.now() };
          return NextResponse.json({ banks, mode, source: 'paystack' });
        }
      }
    } catch (err) {
      console.warn('[Paystack Banks] Failed to fetch live bank list, using fallback:', err);
    }
  }

  return NextResponse.json({
    banks: FALLBACK_NIGERIAN_BANKS,
    mode,
    source: 'fallback',
  });
}
