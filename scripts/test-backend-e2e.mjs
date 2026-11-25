import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import test, { after, before } from 'node:test';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : 4099;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(baseUrl, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/sessions`);
      if (res.ok) return;
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${baseUrl} did not become ready within ${timeoutMs}ms`);
}

function startNextServer(port, extraEnv = {}) {
  const nextBin = './node_modules/.bin/next';
  const child = spawn(nextBin, ['start', '-H', '127.0.0.1', '-p', String(port)], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://your-project-id.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder_anon_key',
      SUPABASE_SERVICE_ROLE_KEY: 'placeholder_service_role_key',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  return {
    child,
    getLogs: () => logs,
    stop: () =>
      new Promise((resolve) => {
        if (child.killed || child.exitCode !== null) {
          resolve();
          return;
        }
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
        setTimeout(() => {
          if (child.exitCode === null) child.kill('SIGKILL');
          resolve();
        }, 3000);
      }),
  };
}

let simServer;
let simBaseUrl;
let signedServer;
let signedBaseUrl;
const TEST_WEBHOOK_SECRET = 'sk_test_quemydj_webhook_ci_secret_987654';

before(async () => {
  const [simPort, signedPort] = await Promise.all([getFreePort(), getFreePort()]);
  simBaseUrl = `http://127.0.0.1:${simPort}`;
  signedBaseUrl = `http://127.0.0.1:${signedPort}`;

  simServer = startNextServer(simPort, {
    PAYSTACK_SECRET_KEY: 'sk_test_sample_key_placeholder',
  });
  signedServer = startNextServer(signedPort, {
    PAYSTACK_SECRET_KEY: TEST_WEBHOOK_SECRET,
  });

  await Promise.all([waitForServer(simBaseUrl), waitForServer(signedBaseUrl)]);
});

after(async () => {
  await Promise.all([simServer?.stop(), signedServer?.stop()]);
});

test('1. Music Search API (/api/music/search) searches, caches, and handles all tabs cleanly', async () => {
  const res1 = await fetch(`${simBaseUrl}/api/music/search?q=Burna+Boy`);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.ok(Array.isArray(data1.results), 'results should be an array');
  assert.ok(data1.results.length > 0, 'should return Burna Boy tracks');
  assert.ok(data1.results[0].title && data1.results[0].artist, 'track should include title and artist');

  // Second identical request should hit TTL cache
  const res2 = await fetch(`${simBaseUrl}/api/music/search?q=Burna+Boy`);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.cached, true, 'second identical query should be served from cache');
  assert.equal(data2.results.length, data1.results.length);

  // Official streaming tab filter
  const officialRes = await fetch(`${simBaseUrl}/api/music/search?q=Burna+Boy&type=official`);
  assert.equal(officialRes.status, 200);
  const officialData = await officialRes.json();
  assert.ok(Array.isArray(officialData.results));

  // YouTube tab filter
  const ytRes = await fetch(`${simBaseUrl}/api/music/search?q=Burna+Boy&type=youtube`);
  assert.equal(ytRes.status, 200);
  const ytData = await ytRes.json();
  assert.ok(Array.isArray(ytData.results));

  // Empty query returns empty results without error
  const emptyRes = await fetch(`${simBaseUrl}/api/music/search?q=`);
  assert.equal(emptyRes.status, 200);
  const emptyData = await emptyRes.json();
  assert.deepEqual(emptyData.results, []);
});

test('2. Paystack Initialize (/api/paystack/initialize) validates input, computes split math, and runs simulation fallback', async () => {
  // Invalid payload rejected cleanly
  const badRes = await fetch(`${simBaseUrl}/api/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: -50 }),
  });
  assert.equal(badRes.status, 400);

  // Invalid split percentage sum rejected
  const badSplitRes = await fetch(`${simBaseUrl}/api/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 5500,
      sessionId: 'session-skyline-friday',
      djId: 'dj-kofi',
      song: { id: 'afro-1', title: 'Last Last', artist: 'Burna Boy' },
      split: { venuePercentage: 20, djPercentage: 65, platformPercentage: 10 },
    }),
  });
  assert.equal(badSplitRes.status, 400);

  // Valid request with odd amount to test integer-conserving split math
  const initRes = await fetch(`${simBaseUrl}/api/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'guest@quemydj.com',
      amount: 5555,
      sessionId: 'session-skyline-friday',
      djId: 'dj-kofi',
      guestName: 'Chidi',
      song: {
        id: 'afro-1',
        title: 'Last Last',
        artist: 'Burna Boy',
        album: 'Love, Damini',
        duration: '2:52',
        coverUrl: 'https://example.com/cover.jpg',
        genre: 'Afrobeats',
        releaseYear: 2022,
      },
    }),
  });

  assert.equal(initRes.status, 200);
  const initData = await initRes.json();
  assert.equal(initData.status, 'success');
  assert.equal(initData.mode, 'simulation');
  assert.equal(initData.simulated, true);
  assert.ok(initData.reference.startsWith('CMDJ-'));
  assert.ok(initData.authorization_url.includes('simulated_payment=true'));

  const split = initData.splitBreakdown;
  assert.equal(split.grossAmount, 5555);
  assert.equal(
    split.venueAmount + split.djAmount + split.platformAmount,
    5555,
    'Split amounts must conserve total without rounding loss'
  );
  assert.equal(
    split.venueKobo + split.djKobo + split.platformKobo,
    555500,
    'Kobo split amounts must conserve total kobo'
  );

  // Verify transaction on /api/paystack/verify
  const verifyRes = await fetch(
    `${simBaseUrl}/api/paystack/verify?reference=${encodeURIComponent(initData.reference)}`
  );
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.verified, true);
  assert.equal(verifyData.reference, initData.reference);
  assert.equal(verifyData.request.status, 'waiting');
  assert.equal(verifyData.request.paymentVerifiedServerSide, true);

  // Re-verify is idempotent
  const verifyAgainRes = await fetch(`${simBaseUrl}/api/paystack/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: initData.reference }),
  });
  assert.equal(verifyAgainRes.status, 200);
  const verifyAgainData = await verifyAgainRes.json();
  assert.equal(verifyAgainData.verified, true);
  assert.equal(verifyAgainData.idempotent, true);
});

test('3. Paystack Webhook (/api/paystack/webhook) verifies HMAC-SHA512 signature, persists request, and enforces idempotency', async () => {
  const webhookPayload = JSON.stringify({
    event: 'charge.success',
    data: {
      reference: 'CMDJ-WH-TEST-1001',
      amount: 1000000, // 10,000 NGN in kobo
      currency: 'NGN',
      status: 'success',
      channel: 'card',
      customer: { email: 'vip@lagos.ng' },
      metadata: {
        sessionId: 'session-skyline-friday',
        djId: 'dj-kofi',
        djName: 'DJ Kofi Beats',
        venueName: 'Skyline Rooftop Lounge',
        guestName: 'Tunde',
        guestNote: 'Birthday shoutout!',
        serviceFee: 500,
        song: {
          id: 'afro-2',
          title: 'City Boys',
          artist: 'Burna Boy',
          album: 'I Told Them...',
          duration: '2:33',
          coverUrl: 'https://example.com/city.jpg',
          genre: 'Afrobeats',
          releaseYear: 2023,
        },
      },
    },
  });

  // Missing signature must be rejected (401)
  const noSigRes = await fetch(`${signedBaseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: webhookPayload,
  });
  assert.equal(noSigRes.status, 401);

  // Tampered signature must be rejected (401)
  const badSigRes = await fetch(`${signedBaseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': 'deadbeef123456',
    },
    body: webhookPayload,
  });
  assert.equal(badSigRes.status, 401);

  // Valid signed payload must succeed (200)
  const validSignature = crypto
    .createHmac('sha512', TEST_WEBHOOK_SECRET)
    .update(webhookPayload)
    .digest('hex');

  const okRes = await fetch(`${signedBaseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': validSignature,
    },
    body: webhookPayload,
  });
  assert.equal(okRes.status, 200);
  const okData = await okRes.json();
  assert.equal(okData.received, true);
  assert.equal(okData.status, 'payment_verified');
  assert.equal(okData.idempotent, false);
  assert.equal(okData.amountMajor, 10000);
  assert.equal(okData.splitBreakdown.venueAmount, 2000);
  assert.equal(okData.splitBreakdown.djAmount, 7000);
  assert.equal(okData.splitBreakdown.platformAmount, 1000);

  // Duplicate webhook delivery must be idempotent
  const replayRes = await fetch(`${signedBaseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': validSignature,
    },
    body: webhookPayload,
  });
  assert.equal(replayRes.status, 200);
  const replayData = await replayRes.json();
  assert.equal(replayData.idempotent, true);
  assert.equal(replayData.alreadyProcessed, true);

  // Confirm request is persisted and queryable via REST /api/requests
  const listRes = await fetch(`${signedBaseUrl}/api/requests?referenceCode=CMDJ-WH-TEST-1001`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.count, 1);
  assert.equal(listData.requests[0].paymentVerifiedServerSide, true);
});

test('4. Sessions, Requests, Venue Split Math, and Revenue Settlement endpoints', async () => {
  // Check sessions list (Supabase returns 'supabase' when configured, or 'local_fallback')
  const sessionsRes = await fetch(`${simBaseUrl}/api/sessions`);
  assert.equal(sessionsRes.status, 200);
  const sessionsData = await sessionsRes.json();
  assert.ok(sessionsData.realtimeMode === 'supabase' || sessionsData.realtimeMode === 'local_fallback');
  assert.ok(sessionsData.sessions.length >= 3);

  // Fetch specific session
  const sessionRes = await fetch(`${simBaseUrl}/api/sessions/session-skyline-friday`);
  assert.equal(sessionRes.status, 200);
  const sessionData = await sessionRes.json();
  assert.equal(sessionData.dj.id, 'dj-kofi');

  // Submit external client request
  const createRes = await fetch(`${simBaseUrl}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'session-skyline-friday',
      djId: 'dj-kofi',
      guestName: 'Amaka',
      amount: 9500,
      song: {
        id: 'ama-2',
        title: 'Water',
        artist: 'Tyla',
        album: 'TYLA',
        duration: '3:20',
        coverUrl: 'https://example.com/water.jpg',
        genre: 'Amapiano',
        releaseYear: 2023,
      },
    }),
  });
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  const createdReqId = createData.request.id;
  assert.equal(createData.request.total, 10000); // 9500 + 500 serviceFee

  // Transition request to played
  const patchRes = await fetch(`${simBaseUrl}/api/requests/${encodeURIComponent(createdReqId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'played' }),
  });
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.request.status, 'played');

  // Invalid split percentage must return 400
  const invalidSplitRes = await fetch(`${simBaseUrl}/api/admin/venues/splits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: 'venue-skyline',
      commissionSplit: { venuePercentage: 30, djPercentage: 70, platformPercentage: 10 },
    }),
  });
  assert.equal(invalidSplitRes.status, 400);

  // Update Skyline venue split to 25 / 65 / 10
  const updateSplitRes = await fetch(`${simBaseUrl}/api/admin/venues/splits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: 'venue-skyline',
      commissionSplit: { venuePercentage: 25, djPercentage: 65, platformPercentage: 10 },
    }),
  });
  assert.equal(updateSplitRes.status, 200);
  const updateSplitData = await updateSplitRes.json();
  assert.deepEqual(updateSplitData.commissionSplit, {
    venuePercentage: 25,
    djPercentage: 65,
    platformPercentage: 10,
  });

  // Check settlement preview before settling
  const previewRes = await fetch(`${simBaseUrl}/api/venue/settlement?venueId=venue-skyline`);
  assert.equal(previewRes.status, 200);
  const previewData = await previewRes.json();
  assert.equal(previewData.report.unsettledGrossRevenue, 10000);
  assert.equal(previewData.report.unsettledVenueCommission, 2500);
  assert.equal(previewData.report.unsettledDjPayout, 6500);
  assert.equal(previewData.report.unsettledPlatformFee, 1000);

  // Execute settlement
  const settleRes = await fetch(`${simBaseUrl}/api/venue/settlement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: 'venue-skyline',
      initiatedBy: 'test_runner',
    }),
  });
  assert.equal(settleRes.status, 200);
  const settleData = await settleRes.json();
  assert.equal(settleData.settled, true);
  assert.equal(settleData.settlement.splitBreakdown.venueAmount, 2500);
  assert.equal(settleData.settlement.splitBreakdown.djAmount, 6500);
  assert.equal(settleData.settlement.splitBreakdown.platformAmount, 1000);

  // Second settlement call must not double-settle already settled requests
  const settleAgainRes = await fetch(`${simBaseUrl}/api/venue/settlement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venueId: 'venue-skyline' }),
  });
  assert.equal(settleAgainRes.status, 200);
  const settleAgainData = await settleAgainRes.json();
  assert.equal(settleAgainData.settled, false);
});

test('5. Admin Dispute Arbitration (/api/admin/disputes) enforces refund, DJ release split, and conflict guards', async () => {
  // List seeded disputes
  const listRes = await fetch(`${simBaseUrl}/api/admin/disputes`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.disputes.some((d) => d.id === 'disp-001' && d.status === 'open'));

  // Invalid action rejected
  const badActionRes = await fetch(`${simBaseUrl}/api/admin/disputes/disp-001/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_all' }),
  });
  assert.equal(badActionRes.status, 400);

  // Force guest refund on disp-001
  const refundRes = await fetch(`${simBaseUrl}/api/admin/disputes/disp-001/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refund_guest',
      resolutionNote: 'Verified skip in booth log.',
    }),
  });
  assert.equal(refundRes.status, 200);
  const refundData = await refundRes.json();
  assert.equal(refundData.dispute.status, 'refunded');
  assert.equal(refundData.refundResult.refunded, true);

  // Re-submitting same resolution is idempotent
  const replayRefundRes = await fetch(`${simBaseUrl}/api/admin/disputes/disp-001/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refund_guest' }),
  });
  assert.equal(replayRefundRes.status, 200);
  const replayRefundData = await replayRefundRes.json();
  assert.equal(replayRefundData.idempotent, true);

  // Conflicting action on finalized dispute returns 409 Conflict
  const conflictRes = await fetch(`${simBaseUrl}/api/admin/disputes/disp-001/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'release_to_dj' }),
  });
  assert.equal(conflictRes.status, 409);

  // Open a new dispute for The Velvet Basement (25/65/10 split) and release to DJ
  const newDispRes = await fetch(`${simBaseUrl}/api/admin/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: 'req-velvet-999',
      referenceCode: 'CMDJ-9991',
      venueId: 'venue-velvet',
      djId: 'dj-maya',
      guestName: 'Kemi',
      djName: 'DJ Maya Sol',
      venueName: 'The Velvet Basement',
      songTitle: 'Mnike (Tyler ICU)',
      amount: 12000,
      reason: 'Guest left venue early before song queued',
    }),
  });
  assert.equal(newDispRes.status, 201);
  const newDispData = await newDispRes.json();

  const releaseRes = await fetch(
    `${simBaseUrl}/api/admin/disputes/${encodeURIComponent(newDispData.dispute.id)}/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release_to_dj' }),
    }
  );
  assert.equal(releaseRes.status, 200);
  const releaseData = await releaseRes.json();
  assert.equal(releaseData.dispute.status, 'resolved_to_dj');
  assert.equal(releaseData.splitBreakdown.venueAmount, 3000);
  assert.equal(releaseData.splitBreakdown.djAmount, 7800);
  assert.equal(releaseData.splitBreakdown.platformAmount, 1200);
});

test('6. Session booth controls, guest reported_problem auto-dispute, and /api/venue reporting', async () => {
  // Pause requests for Skyline session
  const pauseRes = await fetch(`${simBaseUrl}/api/sessions/session-skyline-friday`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAcceptingRequests: false }),
  });
  assert.equal(pauseRes.status, 200);
  const pauseData = await pauseRes.json();
  assert.equal(pauseData.liveSession.isAcceptingRequests, false);

  // External submission while paused must return 409 Conflict
  const blockedReqRes = await fetch(`${simBaseUrl}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'session-skyline-friday',
      djId: 'dj-kofi',
      guestName: 'Blocked Guest',
      song: {
        id: 'afro-test-99',
        title: 'Unavailable',
        artist: 'Davido',
        album: 'Timeless',
        duration: '2:49',
        coverUrl: 'https://example.com/davido.jpg',
        genre: 'Afrobeats',
        releaseYear: 2023,
      },
    }),
  });
  assert.equal(blockedReqRes.status, 409);

  // Re-open booth
  const resumeRes = await fetch(`${simBaseUrl}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'session-skyline-friday', isAcceptingRequests: true }),
  });
  assert.equal(resumeRes.status, 200);

  // Submit a fresh request, then report playback problem to trigger auto-dispute creation
  const submitRes = await fetch(`${simBaseUrl}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'session-skyline-friday',
      djId: 'dj-kofi',
      guestName: 'Seyi',
      amount: 6000,
      song: {
        id: 'afro-test-100',
        title: 'Feel',
        artist: 'Davido',
        album: 'Timeless',
        duration: '2:35',
        coverUrl: 'https://example.com/feel.jpg',
        genre: 'Afrobeats',
        releaseYear: 2023,
      },
    }),
  });
  assert.equal(submitRes.status, 201);
  const submitData = await submitRes.json();

  const reportRes = await fetch(
    `${simBaseUrl}/api/requests/${encodeURIComponent(submitData.request.id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackGiven: 'reported_problem',
        feedbackNote: 'DJ skipped my song before drop',
      }),
    }
  );
  assert.equal(reportRes.status, 200);
  const reportData = await reportRes.json();
  assert.ok(reportData.dispute, 'Reporting problem should automatically file a dispute');
  assert.equal(reportData.dispute.status, 'open');
  assert.equal(reportData.dispute.requestId, submitData.request.id);

  // Verify /api/venue report reflects live totals
  const venueRes = await fetch(`${simBaseUrl}/api/venue?venueId=venue-skyline`);
  assert.equal(venueRes.status, 200);
  const venueData = await venueRes.json();
  assert.equal(venueData.count, 1);
  assert.ok(venueData.venues[0].earningsReport);
  assert.equal(venueData.venues[0].earningsReport.venueId, 'venue-skyline');
});
