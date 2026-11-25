import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();

// Register lightweight TypeScript + `@/` path alias loader for unit testing Next.js services & route handlers
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  let target = request;
  if (target.startsWith('@/')) {
    target = path.join(projectRoot, 'src', target.slice(2));
  }
  return originalResolveFilename.call(this, target, parent, isMain, options);
};

require.extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  return module._compile(transpiled.outputText, filename);
};

const { NextRequest } = require('next/server');
const financeService = require('@/services/financeService');
const paystackService = require('@/services/paystackService');
const supabaseClient = require('@/services/supabaseClient');
const realtimeSync = require('@/services/realtimeSyncService');
const serverDataStore = require('@/services/serverDataStore');
const disputeService = require('@/services/disputeService');
const settlementService = require('@/services/settlementService');
const paystackInitRoute = require('@/app/api/paystack/initialize/route');
const paystackVerifyRoute = require('@/app/api/paystack/verify/route');
const musicSearchRoute = require('@/app/api/music/search/route');

function withEnv(vars, fn) {
  const previous = {};
  for (const [k, v] of Object.entries(vars)) {
    previous[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) {
          delete process.env[k];
        } else {
          process.env[k] = v;
        }
      }
    });
}

test('Unit 1: Venue commission split math conserves integer Naira & kobo across odd & fractional splits', () => {
  assert.equal(financeService.validateCommissionSplit({ venuePercentage: 20, djPercentage: 70, platformPercentage: 10 }).valid, true);
  assert.equal(financeService.validateCommissionSplit({ venuePercentage: 30, djPercentage: 70, platformPercentage: 10 }).valid, false);
  assert.equal(financeService.validateCommissionSplit({ venuePercentage: -5, djPercentage: 95, platformPercentage: 10 }).valid, false);

  // Odd gross amount ₦5,555 at 20/70/10
  const oddSplit = financeService.calculateCommissionSplit(5555, {
    venuePercentage: 20,
    djPercentage: 70,
    platformPercentage: 10,
  });
  assert.equal(oddSplit.venueAmount + oddSplit.djAmount + oddSplit.platformAmount, 5555);
  assert.equal(oddSplit.venueKobo + oddSplit.djKobo + oddSplit.platformKobo, 555500);

  // Fractional split 33.33 / 33.34 / 33.33 on ₦1,001
  const fracSplit = financeService.calculateCommissionSplit(1001, {
    venuePercentage: 33.33,
    djPercentage: 33.34,
    platformPercentage: 33.33,
  });
  assert.equal(fracSplit.venueAmount + fracSplit.djAmount + fracSplit.platformAmount, 1001);
  assert.equal(fracSplit.venueKobo + fracSplit.djKobo + fracSplit.platformKobo, 100100);
});

test('Unit 2: Supabase client rejects placeholder/missing credentials and realtimeSyncService falls back gracefully', async () => {
  await withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://your-project-id.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder_anon_key',
      SUPABASE_SERVICE_ROLE_KEY: 'placeholder_service_role_key',
    },
    async () => {
      assert.equal(supabaseClient.isSupabaseConfigured(), false);
      assert.equal(supabaseClient.isSupabaseServiceConfigured(), false);
      assert.equal(supabaseClient.getSupabaseClient(), null);
      assert.equal(supabaseClient.getSupabaseServiceClient(), null);
      assert.equal(supabaseClient.getSupabaseConfigStatus().mode, 'local_fallback');

      const fetched = await realtimeSync.fetchSessionRequestsFromDb('session-skyline-friday');
      assert.equal(fetched, null);

      const unsub = realtimeSync.subscribeToSessionRealtime('session-skyline-friday', () => {}, () => {});
      assert.equal(typeof unsub, 'function');
      unsub();
    }
  );
});

test('Unit 3: Paystack configuration, HMAC signature, subaccount split routing, live/test initialize & verify', async () => {
  await withEnv(
    {
      PAYSTACK_SECRET_KEY: 'sk_live_unit_test_secret_999',
      PAYSTACK_PLATFORM_SPLIT_CODE: undefined,
      PAYSTACK_DEFAULT_VENUE_SUBACCOUNT: undefined,
      PAYSTACK_DEFAULT_DJ_SUBACCOUNT: undefined,
    },
    async () => {
      serverDataStore.resetServerDataStore();

      const liveConfig = paystackService.getPaystackConfig();
      assert.equal(liveConfig.mode, 'live');
      assert.equal(liveConfig.isConfigured, true);

      // HMAC-SHA512 verification
      const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'CMDJ-1' } });
      const sig = crypto.createHmac('sha512', 'sk_live_unit_test_secret_999').update(raw).digest('hex');
      assert.equal(paystackService.verifyPaystackSignature(raw, sig, 'sk_live_unit_test_secret_999'), true);
      assert.equal(paystackService.verifyPaystackSignature(raw + ' ', sig, 'sk_live_unit_test_secret_999'), false);
      assert.equal(paystackService.verifyPaystackSignature(raw, 'not-hex!', 'sk_live_unit_test_secret_999'), false);

      // Subaccount split modes
      const bySplitCode = paystackService.buildPaystackSplitConfig({
        amountMajor: 10000,
        overrideSplitCode: 'SPL_quemydj_001',
      });
      assert.equal(bySplitCode.routingMode, 'split_code');
      assert.equal(bySplitCode.paystackFields.split_code, 'SPL_quemydj_001');

      const byDualSub = paystackService.buildPaystackSplitConfig({
        amountMajor: 10000,
        currency: 'GHS',
        overrideVenueSubaccount: 'ACCT_venue_123',
        overrideDjSubaccount: 'ACCT_dj_456',
      });
      assert.equal(byDualSub.routingMode, 'dynamic_multi_split');
      assert.equal(byDualSub.paystackFields.split.currency, 'GHS');
      assert.equal(byDualSub.paystackFields.split.subaccounts.length, 2);

      const bySingleSub = paystackService.buildPaystackSplitConfig({
        amountMajor: 10000,
        overrideDjSubaccount: 'ACCT_dj_456',
      });
      assert.equal(bySingleSub.routingMode, 'single_subaccount');
      assert.equal(bySingleSub.paystackFields.subaccount, 'ACCT_dj_456');
      assert.equal(bySingleSub.paystackFields.transaction_charge, 300000); // 30% retention in kobo

      // Mock fetch for /api/paystack/initialize in live mode with dual subaccounts
      const originalFetch = globalThis.fetch;
      let capturedInitBody = null;

      globalThis.fetch = async (url, options = {}) => {
        const strUrl = String(url);
        if (strUrl === 'https://api.paystack.co/transaction/initialize') {
          capturedInitBody = JSON.parse(options.body);
          return new Response(
            JSON.stringify({
              status: true,
              message: 'Authorization URL created',
              data: {
                authorization_url: 'https://checkout.paystack.com/live-unit-auth',
                access_code: 'ac_live_unit_01',
                reference: capturedInitBody.reference,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (strUrl.startsWith('https://api.paystack.co/transaction/verify/')) {
          const ref = strUrl.split('/').pop();
          return new Response(
            JSON.stringify({
              status: true,
              data: {
                reference: ref,
                amount: 1000000,
                currency: 'NGN',
                status: 'success',
                channel: 'card',
                customer: { email: 'guest@quemydj.com' },
                metadata: capturedInitBody?.metadata,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Unexpected URL ${strUrl}`);
      };

      try {
        const initReq = new NextRequest('http://localhost:3000/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'vip@quemydj.com',
            amount: 10000,
            sessionId: 'session-skyline-friday',
            djId: 'dj-kofi',
            venueSubaccountCode: 'ACCT_skyline_01',
            djSubaccountCode: 'ACCT_kofi_01',
            song: { id: 'afro-1', title: 'Last Last', artist: 'Burna Boy' },
          }),
        });

        const initRes = await paystackInitRoute.POST(initReq);
        assert.equal(initRes.status, 200);
        const initJson = await initRes.json();
        assert.equal(initJson.mode, 'live');
        assert.equal(initJson.simulated, false);
        assert.equal(initJson.routingMode, 'dynamic_multi_split');
        assert.equal(initJson.authorization_url, 'https://checkout.paystack.com/live-unit-auth');
        assert.equal(capturedInitBody.amount, 1000000);
        assert.equal(capturedInitBody.split.subaccounts[0].subaccount, 'ACCT_skyline_01');
        assert.equal(capturedInitBody.split.subaccounts[1].subaccount, 'ACCT_kofi_01');

        // Verify via /api/paystack/verify against mocked Paystack verify endpoint
        const verifyReq = new NextRequest(
          `http://localhost:3000/api/paystack/verify?reference=${encodeURIComponent(initJson.reference)}`
        );
        const verifyRes = await paystackVerifyRoute.GET(verifyReq);
        assert.equal(verifyRes.status, 200);
        const verifyJson = await verifyRes.json();
        assert.equal(verifyJson.verified, true);
        assert.equal(verifyJson.mode, 'live');
        assert.equal(verifyJson.amount, 10000);
        assert.equal(verifyJson.request.paymentVerifiedServerSide, true);

        // Network failure during live initialize returns clean 502 instead of 500
        globalThis.fetch = async () => {
          throw new Error('ECONNREFUSED');
        };
        const failReq = new NextRequest('http://localhost:3000/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 5500,
            sessionId: 'session-skyline-friday',
            song: { id: 'afro-1', title: 'Last Last', artist: 'Burna Boy' },
          }),
        });
        const failRes = await paystackInitRoute.POST(failReq);
        assert.equal(failRes.status, 502);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test('Unit 4: Music search survives 429 rate-limits & total network outage via fallback without crashing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.__quemydjSearchCache?.clear();
  globalThis.__quemydjProviderCooldowns = { audius: 0, itunes: 0, youtube: 0 };

  let itunesCalls = 0;
  globalThis.fetch = async (url) => {
    const str = String(url);
    if (str.includes('itunes.apple.com')) {
      itunesCalls += 1;
      return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
    }
    throw new Error('Network offline');
  };

  try {
    const req1 = new NextRequest('http://localhost:3000/api/music/search?q=Burna%20Boy&type=all');
    const res1 = await musicSearchRoute.GET(req1);
    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.equal(json1.degraded, true);
    assert.equal(json1.fallback, 'local_catalog');
    assert.ok(json1.results.some((s) => s.artist.includes('Burna Boy')));
    assert.equal(itunesCalls, 1);

    // Second search while iTunes is in 429 cooldown skips iTunes upstream call cleanly
    const req2 = new NextRequest('http://localhost:3000/api/music/search?q=Tyla&type=itunes');
    const res2 = await musicSearchRoute.GET(req2);
    assert.equal(res2.status, 200);
    assert.equal(itunesCalls, 1, 'Cooling-down provider should not be called repeatedly');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.__quemydjSearchCache?.clear();
    globalThis.__quemydjProviderCooldowns = { audius: 0, itunes: 0, youtube: 0 };
  }
});

test('Unit 5: Settlement and Dispute ledger accounting creates balanced multi-party transactions', async () => {
  serverDataStore.resetServerDataStore();

  const now = new Date().toISOString();
  await serverDataStore.upsertSongRequest({
    id: 'req-unit-stl-1',
    referenceCode: 'CMDJ-UNIT-STL-1',
    sessionId: 'session-skyline-friday',
    venueId: 'venue-skyline',
    djId: 'dj-kofi',
    djName: 'DJ Kofi Beats',
    djAvatar: '',
    venueName: 'Skyline Rooftop Lounge',
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
    guestName: 'Ada',
    amount: 9500,
    serviceFee: 500,
    total: 10000,
    status: 'played',
    paidVia: 'Paystack',
    paymentReference: 'CMDJ-UNIT-STL-1',
    paymentVerifiedServerSide: true,
    createdAt: now,
    updatedAt: now,
  });

  // Execute settlement for Skyline Rooftop Lounge (20 / 70 / 10 split -> 2000 / 7000 / 1000)
  const stl = await settlementService.executeVenueSettlementUseCase({
    venueId: 'venue-skyline',
    idempotencyKey: 'STL-UNIT-KEY-01',
    initiatedBy: 'unit_test',
  });
  assert.equal(stl.httpStatus, 200);
  assert.equal(stl.settled, true);
  const { splitBreakdown } = stl.settlement;
  assert.equal(splitBreakdown.grossAmount, 10000);
  assert.equal(splitBreakdown.venueAmount, 2000);
  assert.equal(splitBreakdown.djAmount, 7000);
  assert.equal(splitBreakdown.platformAmount, 1000);
  assert.equal(
    splitBreakdown.venueAmount + splitBreakdown.djAmount + splitBreakdown.platformAmount,
    splitBreakdown.grossAmount
  );

  const txs = await serverDataStore.listWalletTransactions({ venueId: 'venue-skyline' });
  const venueTx = txs.find((t) => t.type === 'venue_settlement');
  const djTx = txs.find((t) => t.type === 'dj_settlement');
  const platTx = txs.find((t) => t.type === 'platform_fee');
  assert.ok(venueTx && djTx && platTx, 'All three settlement ledger rows must exist');
  assert.equal(venueTx.amount + djTx.amount + platTx.amount, splitBreakdown.grossAmount);

  // Replay with same idempotencyKey must be a no-op
  const replay = await settlementService.executeVenueSettlementUseCase({
    venueId: 'venue-skyline',
    idempotencyKey: 'STL-UNIT-KEY-01',
  });
  assert.equal(replay.idempotent, true);

  // Conflicting resolution on already-refunded disp-002 must return 409 Conflict
  const conflictRes = await disputeService.resolveDisputeUseCase({
    disputeId: 'disp-002',
    action: 'release_to_dj',
    resolvedBy: 'unit_test_umpire',
  });
  assert.equal(conflictRes.httpStatus, 409);

  // Resolve open disp-001 in DJ favor (20/70/10 split of ₦10,000 -> 2000 / 7000 / 1000)
  const res = await disputeService.resolveDisputeUseCase({
    disputeId: 'disp-001',
    action: 'release_to_dj',
    resolvedBy: 'unit_test_umpire',
  });
  assert.equal(res.httpStatus, 200);
  assert.equal(res.dispute?.status, 'resolved_to_dj');
  assert.equal(res.splitBreakdown.venueAmount, 2000);
  assert.equal(res.splitBreakdown.djAmount, 7000);
  assert.equal(res.splitBreakdown.platformAmount, 1000);
  assert.equal(
    res.splitBreakdown.venueAmount + res.splitBreakdown.djAmount + res.splitBreakdown.platformAmount,
    res.splitBreakdown.grossAmount
  );
});
