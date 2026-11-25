import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPaystackConfig } from '@/services/paystackService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amountNaira = Number(body.amount);
    const recipientCode = String(body.recipientCode || '').trim();
    const reason = String(body.reason || 'QueMyDJ Booth Payout').trim();

    if (!Number.isFinite(amountNaira) || amountNaira < 100) {
      return NextResponse.json(
        { error: 'Minimum payout amount is ₦100.' },
        { status: 400 }
      );
    }

    if (!recipientCode) {
      return NextResponse.json(
        { error: 'No verified bank recipient linked. Please add a bank account first.' },
        { status: 400 }
      );
    }

    const reference = `CMDJ-PAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const { secretKey, mode, isConfigured } = getPaystackConfig();

    if (!isConfigured || !secretKey || recipientCode.startsWith('RCP_SIM_')) {
      return NextResponse.json({
        success: true,
        mode: 'simulation',
        reference,
        status: 'simulated_success',
        amount: amountNaira,
        message: `Simulated payout of ₦${amountNaira.toLocaleString()} (configure PAYSTACK_SECRET_KEY in .env.local for live bank transfers).`,
      });
    }

    const res = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amountNaira * 100), // kobo
        recipient: recipientCode,
        reason,
        reference,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.status) {
      return NextResponse.json(
        {
          error:
            json.message ||
            'Paystack transfer could not be initiated. Verify your Paystack balance and transfer settings.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      reference: json.data?.reference || reference,
      transferCode: json.data?.transfer_code,
      status: json.data?.status || 'pending',
      amount: amountNaira,
      message: `Transfer of ₦${amountNaira.toLocaleString()} initiated via Paystack (Ref: ${
        json.data?.reference || reference
      }).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transfer request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
