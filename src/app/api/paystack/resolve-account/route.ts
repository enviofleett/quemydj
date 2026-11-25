import { NextResponse } from 'next/server';
import { getPaystackConfig } from '@/services/paystackService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountNumber = String(body.accountNumber || '').replace(/\D/g, '');
    const bankCode = String(body.bankCode || '').trim();

    if (accountNumber.length !== 10) {
      return NextResponse.json(
        { error: 'Account number must be exactly 10 digits (NUBAN).' },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        { error: 'Please select a bank.' },
        { status: 400 }
      );
    }

    const { secretKey, mode, isConfigured } = getPaystackConfig();

    if (!isConfigured || !secretKey) {
      return NextResponse.json({
        verified: false,
        mode: 'simulation',
        requiresManualName: true,
        accountNumber,
        bankCode,
        message: 'Paystack secret key not configured. Enter account name manually to test.',
      });
    }

    const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
      accountNumber
    )}&bank_code=${encodeURIComponent(bankCode)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: 'no-store',
    });

    const json = await res.json();

    if (!res.ok || !json.status || !json.data?.account_name) {
      return NextResponse.json(
        {
          error:
            json.message ||
            'Could not verify this account number with the selected bank. Please check and try again.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      mode,
      requiresManualName: false,
      accountNumber: json.data.account_number || accountNumber,
      accountName: json.data.account_name,
      bankCode,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Account verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
