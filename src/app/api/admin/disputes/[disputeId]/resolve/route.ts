import { NextRequest, NextResponse } from 'next/server';
import { DisputeAction, resolveDisputeUseCase } from '@/services/disputeService';

async function handleResolve(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const { disputeId } = await context.params;
    let body: {
      action?: DisputeAction;
      resolutionNote?: string;
      resolvedBy?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    if (!body.action) {
      return NextResponse.json(
        { error: "Missing required field 'action' ('refund_guest' or 'release_to_dj')" },
        { status: 400 }
      );
    }

    const result = await resolveDisputeUseCase({
      disputeId,
      action: body.action,
      resolutionNote: body.resolutionNote,
      resolvedBy: body.resolvedBy,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json(
      {
        status: 'resolved',
        idempotent: Boolean(result.idempotent),
        dispute: result.dispute,
        splitBreakdown: result.splitBreakdown,
        refundResult: result.refundResult,
      },
      { status: result.httpStatus }
    );
  } catch (err) {
    console.error('[Dispute Resolve API] error:', err);
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  return handleResolve(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  return handleResolve(request, context);
}
