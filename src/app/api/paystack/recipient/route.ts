import { NextResponse } from 'next/server';
import { getPaystackConfig } from '@/services/paystackService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountNumber = String(body.accountNumber || '').replace(/\D/g, '');
    const bankCode = String(body.bankCode || '').trim();
    const bankName = String(body.bankName || '').trim();
    const accountName = String(body.accountName || '').trim();

    if (accountNumber.length !== 10 || !bankCode || !accountName) {
      return NextResponse.json(
        { error: 'Valid 10-digit account number, bank, and account name are required.' },
        { status: 400 }
      );
    }

    const { secretKey, mode, isConfigured } = getPaystackConfig();

    if (!isConfigured || !secretKey) {
      return NextResponse.json({
        success: true,
        mode: 'simulation',
        recipientCode: `RCP_SIM_${bankCode}_${accountNumber.slice(-4)}`,
        bankName,
        bankCode,
        accountNumber,
        accountName: accountName.toUpperCase(),
        verified: false,
      });
    }

    const res = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.status || !json.data?.recipient_code) {
      return NextResponse.json(
        {
          error:
            json.message ||
            'Paystack could not register this bank account as a transfer recipient.',
        },
        { status: 400 }
      );
    }

    const recipientCode = json.data.recipient_code;
    let subaccountCode: string | undefined = undefined;

    // Automatically provision or link Paystack Subaccount (ACCT_...) for instant split payments
    try {
      const subRes = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: accountName,
          settlement_bank: bankCode,
          account_number: accountNumber,
          percentage_charge: 10, // Platform retains remainder
          description: `QueMyDJ Payout Subaccount - ${accountName}`,
        }),
      });
      const subData = await subRes.json().catch(() => null);
      if (subRes.ok && subData?.status && subData.data?.subaccount_code) {
        subaccountCode = subData.data.subaccount_code;
      }
    } catch (subErr) {
      console.warn('[Paystack Subaccount] Optional auto-provision error:', subErr);
    }

    return NextResponse.json({
      success: true,
      mode,
      recipientCode,
      subaccountCode,
      bankName: json.data.details?.bank_name || bankName,
      bankCode: json.data.details?.bank_code || bankCode,
      accountNumber: json.data.details?.account_number || accountNumber,
      accountName: json.data.details?.account_name || accountName,
      verified: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register bank account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
