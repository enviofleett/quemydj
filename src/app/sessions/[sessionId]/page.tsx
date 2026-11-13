import { redirect } from 'next/navigation';

export default async function SessionRedirect({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolved = await params;
  // If session is skyline, redirect to DJ Kofi
  if (resolved.sessionId.includes('skyline')) {
    redirect('/djs/dj-kofi');
  } else if (resolved.sessionId.includes('velvet')) {
    redirect('/djs/dj-maya');
  } else if (resolved.sessionId.includes('electric')) {
    redirect('/djs/dj-dre-spinz');
  }
  redirect('/discover');
}
