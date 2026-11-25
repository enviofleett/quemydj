import { NextRequest, NextResponse } from 'next/server';
import {
  getAllEditableEmailTemplates,
  getEditableEmailTemplate,
  updateEditableEmailTemplate,
  resetEditableEmailTemplate,
} from '@/utils/emailTemplates';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type) {
    const template = getEditableEmailTemplate(type);
    return NextResponse.json({ success: true, template });
  }

  const templates = getAllEditableEmailTemplates();
  return NextResponse.json({ success: true, templates });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, headline, introText, subjectPattern, ctaText, secondaryNote, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    if (action === 'reset') {
      const reset = resetEditableEmailTemplate(id);
      return NextResponse.json({
        success: true,
        template: reset,
        message: 'Template restored to factory default.',
      });
    }

    const updated = updateEditableEmailTemplate(id, {
      headline,
      introText,
      subjectPattern,
      ctaText,
      secondaryNote,
    });

    return NextResponse.json({
      success: true,
      template: updated,
      message: 'Email template successfully updated.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
