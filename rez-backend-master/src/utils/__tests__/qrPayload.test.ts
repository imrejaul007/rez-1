/**
 * Unit tests for the QR payload parser.
 *
 * Pure helper — no mocks. Covers every intent happy path, the short-
 * URL path, and every error reason.
 */

import { parseQrPayload, SHORT_URL_HOSTS } from '../qrPayload';

describe('parseQrPayload — errors', () => {
  it('empty string → reason=empty', () => {
    expect(parseQrPayload('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseQrPayload('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('null / undefined / non-strings → reason=empty', () => {
    expect(parseQrPayload(null)).toEqual({ ok: false, reason: 'empty' });
    expect(parseQrPayload(undefined)).toEqual({ ok: false, reason: 'empty' });
    expect(parseQrPayload(42 as unknown as string)).toEqual({ ok: false, reason: 'empty' });
  });

  it('non-JSON non-URL → reason=not-json', () => {
    expect(parseQrPayload('hello world').ok).toBe(false);
    const r = parseQrPayload('hello world');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not-json');
  });

  it('valid JSON but wrong shape → reason=invalid-schema', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'store-visit', v: 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid-schema');
      if (r.reason === 'invalid-schema') {
        expect(r.issues.length).toBeGreaterThan(0);
      }
    }
  });

  it('valid JSON with unknown intent → reason=invalid-schema', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'who-knows', v: 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-schema');
  });

  it('v:2 → reason=unsupported-version (not invalid-schema)', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'store-visit', v: 2, storeId: 'abc' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'unsupported-version') {
      expect(r.version).toBe(2);
    } else {
      throw new Error('expected unsupported-version');
    }
  });
});

describe('parseQrPayload — every intent happy path', () => {
  it('store-visit', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'store-visit', v: 1, storeId: 's1' }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'store-visit') {
      expect(r.payload.storeId).toBe('s1');
    }
  });

  it('store-visit with optional slug', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'store-visit', v: 1, storeId: 's1', storeSlug: 'my-store' }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'store-visit') {
      expect(r.payload.storeSlug).toBe('my-store');
    }
  });

  it('pay-bill', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'pay-bill', v: 1, storeId: 's1', billId: 'b1', amount: 500 }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'pay-bill') {
      expect(r.payload.amount).toBe(500);
      expect(r.payload.billId).toBe('b1');
    }
  });

  it('pay-bill without amount or billId', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'pay-bill', v: 1, storeId: 's1' }));
    expect(r.ok).toBe(true);
  });

  it('redeem-deal', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'redeem-deal', v: 1, dealId: 'd1' }),
    );
    expect(r.ok).toBe(true);
  });

  it('redeem-voucher', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'redeem-voucher', v: 1, voucherId: 'v1' }),
    );
    expect(r.ok).toBe(true);
  });

  it('claim-stamp', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'claim-stamp', v: 1, stampCardId: 'sc1', storeId: 's1' }),
    );
    expect(r.ok).toBe(true);
  });

  it('event-checkin', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'event-checkin', v: 1, eventId: 'e1' }));
    expect(r.ok).toBe(true);
  });

  it('referral', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'referral', v: 1, referralCode: 'ABC123' }),
    );
    expect(r.ok).toBe(true);
  });

  it('wallet-transfer', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'wallet-transfer', v: 1, toUserId: 'u1', amount: 100 }),
    );
    expect(r.ok).toBe(true);
  });
});

describe('parseQrPayload — short URLs', () => {
  it.each(SHORT_URL_HOSTS)('accepts %s', (host) => {
    const r = parseQrPayload(`https://${host}/q/abc123`);
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'short-url') {
      expect(r.payload.token).toBe('abc123');
    }
  });

  it('strips a trailing slash from the token', () => {
    const r = parseQrPayload('https://rez.money/q/token-with-slash/');
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'short-url') {
      expect(r.payload.token).toBe('token-with-slash');
    }
  });

  it('http is accepted too (downgrade attack is the browser\'s problem)', () => {
    const r = parseQrPayload('http://rez.money/q/abc');
    expect(r.ok).toBe(true);
  });

  it('ignores unknown hostnames', () => {
    const r = parseQrPayload('https://evil.example/q/bad');
    expect(r.ok).toBe(false);
  });

  it('ignores rez.money URLs that are not under /q/', () => {
    const r = parseQrPayload('https://rez.money/about');
    expect(r.ok).toBe(false);
  });

  it('ignores rez.money/q/ with empty token', () => {
    const r = parseQrPayload('https://rez.money/q/');
    expect(r.ok).toBe(false);
  });
});

describe('parseQrPayload — edge cases', () => {
  it('leading/trailing whitespace is trimmed before parsing', () => {
    const r = parseQrPayload(
      '  ' + JSON.stringify({ intent: 'store-visit', v: 1, storeId: 's1' }) + '  \n',
    );
    expect(r.ok).toBe(true);
  });

  it('rejects empty storeId even when schema-shaped', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'store-visit', v: 1, storeId: '' }));
    expect(r.ok).toBe(false);
  });

  it('rejects whitespace-only storeId (parity with consumer NonBlankString)', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'store-visit', v: 1, storeId: '   ' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-schema');
  });

  it('rejects whitespace-only voucherId / eventId / referralCode', () => {
    expect(
      parseQrPayload(JSON.stringify({ intent: 'redeem-voucher', v: 1, voucherId: '  \t  ' })).ok,
    ).toBe(false);
    expect(
      parseQrPayload(JSON.stringify({ intent: 'event-checkin', v: 1, eventId: ' \n ' })).ok,
    ).toBe(false);
    expect(
      parseQrPayload(JSON.stringify({ intent: 'referral', v: 1, referralCode: '   ' })).ok,
    ).toBe(false);
  });

  it('rejects negative amount on pay-bill', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'pay-bill', v: 1, storeId: 's1', amount: -5 }),
    );
    expect(r.ok).toBe(false);
  });
});
